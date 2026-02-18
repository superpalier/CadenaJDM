import type { Card, CardType, GameState, Player, Preference } from '../types';

// ===== BALANCE CONSTANTS =====
const HAND_SIZE = 7;
const WIN_SCORE = 100;
const OBJECTIVE_BONUS = 3;
const DRAW_ON_PLAY = 1;
const DRAW_ON_CLOSE = 3;

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
        players,
        currentPlayerIndex: Math.floor(Math.random() * playerCount),
        winner: null,
        log: ["¡Juego iniciado!"],
        tutorialStep: 'WELCOME',
        isTutorialActive: true,
        communityCombo: [],
        roundPhase: 'playing',
        roundCloserId: null,
        playersToFinish: []
    };
};

const advanceRound = (state: GameState): void => {
    state.log.push('🔄 ¡Nueva ronda! Objetivo cambia para todos.');
    state.communityCombo = [];
    state.players.forEach(player => {
        player.preference = PREFERENCES[Math.floor(Math.random() * PREFERENCES.length)];
    });
    state.roundPhase = 'playing';
    state.roundCloserId = null;
    state.playersToFinish = [];
};

const drawCards = (player: Player, deck: Card[], count: number): void => {
    for (let i = 0; i < count; i++) {
        if (deck.length > 0) {
            const drawn = deck.shift();
            if (drawn) player.hand.push(drawn);
        }
    }
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
        log: [...state.log],
        communityCombo: [...state.communityCombo],
        playersToFinish: [...state.playersToFinish]
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
        newState.communityCombo = [];

        newState.log.push(`🏆 ${currentPlayer.name} cerró el combo comunitario (${combo.length} cartas) = ${points} pts!`);
        if (metObjective) {
            newState.log.push(`✨ ¡Bonus objetivo: +${OBJECTIVE_BONUS} pts!`);
        }

        drawCards(newPlayer, newState.deck, DRAW_ON_CLOSE);

        if (newPlayer.score >= WIN_SCORE) {
            newState.winner = currentPlayer.id;
            newState.log.push(`🏆 ¡${currentPlayer.name} GANA con ${newPlayer.score} pts!`);
            return newState;
        }

        // Trigger round closing: others get 1 turn then objectives change
        if (newState.roundPhase === 'playing') {
            newState.roundPhase = 'closing';
            newState.roundCloserId = currentPlayer.id;
            newState.playersToFinish = newState.players
                .filter(p => p.id !== currentPlayer.id)
                .map(p => p.id);
            newState.log.push(`⏰ Los demás tienen 1 turno antes de nueva ronda.`);
        }
    } else {
        // ADD TO COMMUNITY COMBO (START or EXTENSION)
        newState.communityCombo.push(card);
        newState.log.push(`${currentPlayer.name} +${card.type}(${card.value}) → combo comunitario: ${newState.communityCombo.length} cartas`);
        drawCards(newPlayer, newState.deck, DRAW_ON_PLAY);
    }

    // Track round closing
    if (newState.roundPhase === 'closing') {
        newState.playersToFinish = newState.playersToFinish.filter(id => id !== currentPlayer.id);
        if (newState.playersToFinish.length === 0) {
            advanceRound(newState);
        }
    }

    if (!newState.winner) {
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
        log: [...state.log],
        communityCombo: [...state.communityCombo],
        playersToFinish: [...state.playersToFinish]
    };
    const playerIndex = newState.currentPlayerIndex;
    const currentPlayer = newState.players[playerIndex];

    if (newState.deck.length > 0) {
        const drawn = newState.deck.shift();
        if (drawn) {
            currentPlayer.hand.push(drawn);
            newState.log.push(`${currentPlayer.name} pasó y robó 1 carta.`);
        }
    } else {
        newState.log.push(`${currentPlayer.name} pasó (mazo vacío).`);
    }

    if (newState.roundPhase === 'closing') {
        newState.playersToFinish = newState.playersToFinish.filter(id => id !== currentPlayer.id);
        if (newState.playersToFinish.length === 0) {
            advanceRound(newState);
        }
    }

    if (newState.deck.length === 0) {
        const allStuck = newState.players.every(player =>
            !player.hand.some(card => isValidMove(newState.communityCombo, card))
        );
        if (allStuck) {
            const sorted = [...newState.players].sort((a, b) => b.score - a.score);
            newState.winner = sorted[0].id;
            newState.log.push(`🏁 ¡Mazo agotado! ${sorted[0].name} gana con ${sorted[0].score} pts!`);
            return newState;
        }
    }

    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    return newState;
};

export { WIN_SCORE };
