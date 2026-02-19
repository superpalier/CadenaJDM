import type { Card, CardType, GameState, Player, Preference } from '../types';

// ===== BALANCE CONSTANTS =====
const HAND_SIZE = 5;
const WIN_SCORE = 100;
const OBJECTIVE_BONUS = 3;
const DRAW_ON_PLAY = 1;
const DRAW_ON_CLOSE = 2;

export const createDeck = (): Card[] => {
    const cards: Card[] = [];
    const values: (1 | 2 | 3)[] = [1, 2, 3];
    const typeCounts: { type: CardType; count: number }[] = [
        { type: 'START', count: 4 },
        { type: 'EXTENSION', count: 10 },
        { type: 'END', count: 4 },
    ];
    let idCounter = 0;
    typeCounts.forEach(({ type, count }) => {
        values.forEach(value => {
            for (let i = 0; i < count; i++) {
                cards.push({ id: `card-${idCounter++}`, type, value });
            }
        });
    });
    return shuffle(cards);
};

export const shuffle = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export const PREFERENCES: Preference[] = [
    { id: 'p1', description: 'Combo de 3+ cartas', check: (chain) => chain.length >= 3 },
    { id: 'p2', description: 'Combo de 4+ cartas', check: (chain) => chain.length >= 4 },
    { id: 'p3', description: 'Al menos 2 Extensiones', check: (chain) => chain.filter(c => c.type === 'EXTENSION').length >= 2 },
    { id: 'p4', description: 'Todos los valores iguales', check: (chain) => chain.length >= 2 && new Set(chain.map(c => c.value)).size === 1 },
    { id: 'p5', description: 'Empezar con valor 1', check: (chain) => chain.length > 0 && chain[0].value === 1 },
    { id: 'p6', description: 'Solo valores bajos (1 o 2)', check: (chain) => chain.every(c => c.value <= 2) },
];

// Validate against the COMMUNITY combo
export const isValidMove = (communityCombo: Card[], card: Card): boolean => {
    if (communityCombo.length === 0) return card.type === 'START';
    if (card.type === 'START') return false;
    if (card.type === 'END') return communityCombo.length > 0;
    // EXTENSION: value >= last card
    const lastCard = communityCombo[communityCombo.length - 1];
    return card.value >= lastCard.value;
};

export const calculateComboScore = (combo: Card[], metObjective: boolean): number => {
    const baseScore = combo.reduce((sum, _, idx) => sum + (idx + 1), 0);
    return baseScore + (metObjective ? OBJECTIVE_BONUS : 0);
};

// Reshuffle discard pile into deck when deck is empty
const reshuffleDeck = (state: GameState): void => {
    if (state.deck.length === 0 && state.discardPile.length > 0) {
        state.deck = shuffle(state.discardPile);
        state.discardPile = [];
        state.log.push('♻️ ¡Mazo agotado! Se revolvió la pila de descarte.');
    }
};

// Draw cards, reshuffling discard pile if needed
const drawCards = (player: Player, state: GameState, count: number): void => {
    for (let i = 0; i < count; i++) {
        reshuffleDeck(state);
        if (state.deck.length > 0) {
            const drawn = state.deck.shift();
            if (drawn) player.hand.push(drawn);
        }
    }
};

// Check if player must discard (hand > HAND_SIZE)
const checkMustDiscard = (state: GameState): void => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    state.mustDiscard = currentPlayer.hand.length > HAND_SIZE;
};

// Start new round: reset combo, rotate objectives
const advanceRound = (state: GameState): void => {
    state.log.push('🔄 ¡Nueva ronda! Objetivo cambia para todos.');
    state.communityCombo = [];
    state.players.forEach(player => {
        player.preference = PREFERENCES[Math.floor(Math.random() * PREFERENCES.length)];
    });
};

export const initializeGame = (humanName: string = "Player 1", playerCount: number = 2): GameState => {
    const deck = createDeck();
    const aiNames = ["Rojo", "Azul", "Verde", "Morado"];
    const players: Player[] = [];

    players.push({
        id: 'human',
        name: humanName,
        isAI: false,
        hand: deck.splice(0, HAND_SIZE),
        preference: PREFERENCES[Math.floor(Math.random() * PREFERENCES.length)],
        score: 0,
        closedChains: []
    });

    for (let i = 0; i < playerCount - 1; i++) {
        players.push({
            id: `ai-${i}`,
            name: `IA ${aiNames[i]}`,
            isAI: true,
            hand: deck.splice(0, HAND_SIZE),
            preference: PREFERENCES[Math.floor(Math.random() * PREFERENCES.length)],
            score: 0,
            closedChains: []
        });
    }

    return {
        deck,
        discardPile: [],
        players,
        currentPlayerIndex: Math.floor(Math.random() * playerCount),
        winner: null,
        log: ["¡Juego iniciado!"],
        tutorialStep: 'WELCOME',
        isTutorialActive: true,
        communityCombo: [],
        mustDiscard: false,
    };
};

export const playCard = (state: GameState, cardIndex: number): GameState => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const card = currentPlayer.hand[cardIndex];
    if (!card) return state;

    const newState: GameState = {
        ...state,
        players: state.players.map(p => ({
            ...p,
            hand: [...p.hand],
            closedChains: [...p.closedChains]
        })),
        deck: [...state.deck],
        discardPile: [...state.discardPile],
        log: [...state.log],
        communityCombo: [...state.communityCombo],
    };
    const playerIndex = state.currentPlayerIndex;
    const newPlayer = newState.players[playerIndex];

    // Validate against community combo
    if (!isValidMove(state.communityCombo, card)) {
        return state;
    }

    // Remove card from hand
    newPlayer.hand.splice(cardIndex, 1);

    if (card.type === 'END') {
        // CLOSE THE COMMUNITY COMBO — this player scores!
        const combo = [...newState.communityCombo, card];
        const metObjective = currentPlayer.preference.check(combo);
        const points = calculateComboScore(combo, metObjective);

        newPlayer.score += points;
        newPlayer.closedChains.push(combo);

        newState.log.push(`🏆 ${currentPlayer.name} cerró el combo (${combo.length} cartas) = ${points} pts!`);
        if (metObjective) {
            newState.log.push(`✨ ¡Bonus objetivo: +${OBJECTIVE_BONUS} pts!`);
        }

        // Draw cards for closing
        drawCards(newPlayer, newState, DRAW_ON_CLOSE);

        if (newPlayer.score >= WIN_SCORE) {
            newState.winner = currentPlayer.id;
            newState.log.push(`🏆 ¡${currentPlayer.name} GANA con ${newPlayer.score} pts!`);
            return newState;
        }

        // COMBO CLOSE = IMMEDIATE NEW ROUND
        advanceRound(newState);
    } else {
        // ADD TO COMMUNITY COMBO (START or EXTENSION)
        newState.communityCombo.push(card);
        newState.log.push(`${currentPlayer.name} +${card.type}(${card.value}) → combo: ${newState.communityCombo.length} cartas`);
        drawCards(newPlayer, newState, DRAW_ON_PLAY);
    }

    // Check if player must discard before turn ends
    checkMustDiscard(newState);

    if (!newState.mustDiscard && !newState.winner) {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }

    return newState;
};

// Discard a card from hand (when hand > HAND_SIZE)
export const discardCard = (state: GameState, cardIndex: number): GameState => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.hand.length <= HAND_SIZE) return state;

    const newState: GameState = {
        ...state,
        players: state.players.map(p => ({
            ...p,
            hand: [...p.hand],
            closedChains: [...p.closedChains]
        })),
        deck: [...state.deck],
        discardPile: [...state.discardPile],
        log: [...state.log],
        communityCombo: [...state.communityCombo],
    };
    const newPlayer = newState.players[state.currentPlayerIndex];
    const card = newPlayer.hand.splice(cardIndex, 1)[0];
    if (card) {
        newState.discardPile.push(card);
        newState.log.push(`🗑️ ${currentPlayer.name} descartó ${card.type}(${card.value})`);
    }

    // Check if still needs to discard more
    checkMustDiscard(newState);

    // If done discarding, advance turn
    if (!newState.mustDiscard) {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }

    return newState;
};

export const passTurn = (state: GameState): GameState => {
    const newState: GameState = {
        ...state,
        players: state.players.map(p => ({
            ...p,
            hand: [...p.hand],
            closedChains: [...p.closedChains]
        })),
        deck: [...state.deck],
        discardPile: [...state.discardPile],
        log: [...state.log],
        communityCombo: [...state.communityCombo],
    };
    const playerIndex = newState.currentPlayerIndex;
    const currentPlayer = newState.players[playerIndex];

    // Draw 1 card when passing
    drawCards(currentPlayer, newState, 1);
    newState.log.push(`${currentPlayer.name} pasó y robó 1 carta.`);

    // Check if must discard
    checkMustDiscard(newState);

    if (!newState.mustDiscard) {
        // Check stalemate: if deck AND discard pile empty and nobody can play
        if (newState.deck.length === 0 && newState.discardPile.length === 0) {
            const allStuck = newState.players.every(player =>
                !player.hand.some(card => isValidMove(newState.communityCombo, card))
            );
            if (allStuck) {
                const sorted = [...newState.players].sort((a, b) => b.score - a.score);
                newState.winner = sorted[0].id;
                newState.log.push(`🏁 ¡No quedan cartas! ${sorted[0].name} gana con ${sorted[0].score} pts!`);
                return newState;
            }
        }

        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }

    return newState;
};

export { WIN_SCORE, HAND_SIZE };
