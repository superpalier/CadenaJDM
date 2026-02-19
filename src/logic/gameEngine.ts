import type { Card, CardType, GameState, Player, Preference } from '../types';

// ===== BALANCE CONSTANTS =====
const HAND_SIZE = 5;
const WIN_SCORE = 100;

export const createDeck = (): Card[] => {
    const cards: Card[] = [];
    // counts handled manually below
    let idCounter = 0;
    const addCards = (type: CardType, total: number) => {
        for (let i = 0; i < total; i++) {
            // Distribute values 1, 2, 3
            const value = (i % 3) + 1 as 1 | 2 | 3;
            cards.push({ id: `card-${idCounter++}`, type, value });
        }
    };

    addCards('START', 25);
    addCards('EXTENSION', 50);
    addCards('END', 25);

    // 3 Tombola cards (Value 5, but special scoring logic)
    for (let i = 0; i < 3; i++) {
        cards.push({ id: `card-${idCounter++}`, type: 'TOMBOLA', value: 3 });
    }

    // 2 Wildcards (Comodines) - Value 1 (bridge)
    for (let i = 0; i < 2; i++) {
        cards.push({ id: `card-${idCounter++}`, type: 'WILDCARD', value: 1 });
    }

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

// ===== OBJECTIVES — tiered by difficulty =====
// bonus: points awarded for meeting it. difficulty: 'easy' | 'normal' | 'hard'
export const PREFERENCES: Preference[] = [
    // ----- EASY (bonus +2) -----
    { id: 'e1', description: 'Combo de 3+ cartas', bonus: 2, difficulty: 'easy', check: (c) => c.length >= 3 },
    { id: 'e2', description: 'Empezar con valor 1', bonus: 2, difficulty: 'easy', check: (c) => c.length > 0 && c[0].value === 1 },
    { id: 'e3', description: 'Terminar con valor 3', bonus: 2, difficulty: 'easy', check: (c) => c.length > 0 && c[c.length - 1].value === 3 },
    { id: 'e4', description: 'Al menos 1 Extensión', bonus: 2, difficulty: 'easy', check: (c) => c.filter(x => x.type === 'EXTENSION').length >= 1 },

    // ----- NORMAL (bonus +4) -----
    { id: 'n1', description: 'Combo de 4+ cartas', bonus: 4, difficulty: 'normal', check: (c) => c.length >= 4 },
    { id: 'n2', description: 'Al menos 2 Extensiones', bonus: 4, difficulty: 'normal', check: (c) => c.filter(x => x.type === 'EXTENSION').length >= 2 },
    { id: 'n3', description: 'Solo valores bajos (1-2)', bonus: 4, difficulty: 'normal', check: (c) => c.length >= 2 && c.every(x => x.value <= 2) },
    { id: 'n4', description: 'Suma de valores ≥ 8', bonus: 4, difficulty: 'normal', check: (c) => c.reduce((s, x) => s + x.value, 0) >= 8 },
    { id: 'n5', description: 'Contiene un 1, un 2 y un 3', bonus: 4, difficulty: 'normal', check: (c) => [1, 2, 3].every(v => c.some(x => x.value === v)) },

    // ----- HARD (bonus +7) -----
    { id: 'h1', description: 'Todos los valores iguales', bonus: 7, difficulty: 'hard', check: (c) => c.length >= 3 && new Set(c.map(x => x.value)).size === 1 },
    { id: 'h2', description: 'Combo de 5+ cartas', bonus: 7, difficulty: 'hard', check: (c) => c.length >= 5 },
    {
        id: 'h3', description: 'Escalera: 1→2→3', bonus: 7, difficulty: 'hard', check: (c) => {
            const vals = c.map(x => x.value);
            for (let i = 0; i <= vals.length - 3; i++) {
                if (vals[i] === 1 && vals[i + 1] === 2 && vals[i + 2] === 3) return true;
            }
            return false;
        }
    },
    { id: 'h4', description: 'Suma de valores ≥ 12', bonus: 7, difficulty: 'hard', check: (c) => c.reduce((s, x) => s + x.value, 0) >= 12 },
    { id: 'h5', description: 'Exactamente 3 treses', bonus: 7, difficulty: 'hard', check: (c) => c.filter(x => x.value === 3).length >= 3 },
];

// Pick a random objective weighted by difficulty (easier = more likely)
export function randomPreference(): Preference {
    const weights = { easy: 3, normal: 2, hard: 1 };
    const pool: Preference[] = [];
    PREFERENCES.forEach(p => {
        const w = weights[p.difficulty];
        for (let i = 0; i < w; i++) pool.push(p);
    });
    return pool[Math.floor(Math.random() * pool.length)];
}

// Validate against the COMMUNITY combo
// Validate against the COMMUNITY combo
export const isValidMove = (communityCombo: Card[], card: Card): boolean => {
    if (card.type === 'TOMBOLA') return communityCombo.length > 0; // Cut ONLY if there's something to cut
    if (card.type === 'WILDCARD') return communityCombo.length > 0; // Wildcard needs a base

    if (communityCombo.length === 0) return card.type === 'START';
    if (card.type === 'START') return false;
    if (card.type === 'END') return communityCombo.length > 0;

    const lastCard = communityCombo[communityCombo.length - 1];
    if (lastCard.type === 'WILDCARD') return true; // Anything can follow a Wildcard

    return card.value >= lastCard.value;
};

// SCORING: sum of all card values in the combo (including END) + objective bonus
// SCORING: sum of all card values + Tombola value (5) + objective bonus
export const calculateComboScore = (combo: Card[], metObjective: boolean, bonusAmount: number): number => {
    const baseScore = combo.reduce((sum, card) => sum + (card.type === 'TOMBOLA' ? 5 : card.type === 'WILDCARD' ? 1 : card.value), 0);
    return baseScore + (metObjective ? bonusAmount : 0);
};

// Reshuffle discard pile into deck when deck is empty
const reshuffleDeck = (state: GameState): void => {
    if (state.deck.length === 0 && state.discardPile.length > 0) {
        state.deck = shuffle(state.discardPile);
        state.discardPile = [];
        state.log.push('♻️ ¡Mazo agotado! Se revolvió la pila de descarte.');
    }
};

const drawCards = (player: Player, state: GameState, count: number): void => {
    for (let i = 0; i < count; i++) {
        reshuffleDeck(state);
        if (state.deck.length > 0) {
            const drawn = state.deck.shift();
            if (drawn) player.hand.push(drawn);
        }
    }
};

const checkMustDiscard = (state: GameState): void => {
    const currentPlayer = state.players[state.currentPlayerIndex];
    state.mustDiscard = currentPlayer.hand.length > HAND_SIZE;
};

const advanceRound = (state: GameState): void => {
    state.log.push('🔄 ¡Nueva ronda! Objetivo cambia para todos.');
    state.communityCombo = [];
    state.players.forEach(player => {
        player.preference = randomPreference();
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
        preference: randomPreference(),
        score: 0,
        closedChains: []
    });

    for (let i = 0; i < playerCount - 1; i++) {
        players.push({
            id: `ai-${i}`,
            name: `IA ${aiNames[i]}`,
            isAI: true,
            hand: deck.splice(0, HAND_SIZE),
            preference: randomPreference(),
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
        accumulatedCards: [],
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

    if (!isValidMove(state.communityCombo, card)) {
        return state;
    }

    newPlayer.hand.splice(cardIndex, 1);

    if (card.type === 'TOMBOLA') {
        // Cut the combo!
        const cutCards = [...newState.communityCombo, card]; // Include Tombola
        newState.accumulatedCards.push(...cutCards);
        newState.communityCombo = [];

        newState.log.push(`✨ ¡${currentPlayer.name} jugó TOMBOLA! Combo cortado y acumulado (${newState.accumulatedCards.length} cartas en el bote).`);

        // Refill hand
        const cardsToDraw = Math.max(0, HAND_SIZE - newPlayer.hand.length);
        if (cardsToDraw > 0) drawCards(newPlayer, newState, cardsToDraw);

        // Turn passes
        checkMustDiscard(newState);
        if (!newState.mustDiscard) {
            newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
        }
        return newState;
    }

    if (card.type === 'END') {
        // Combine accumulated + current + end
        const totalChain = [...newState.accumulatedCards, ...newState.communityCombo, card];

        // Check objective against TOTAL chain
        const pref = currentPlayer.preference;
        const checkFn = PREFERENCES.find(p => p.id === pref.id)?.check ?? pref.check;
        const metObjective = checkFn(totalChain);
        const bonus = PREFERENCES.find(p => p.id === pref.id)?.bonus ?? 3;

        const points = calculateComboScore(totalChain, metObjective, bonus);

        newPlayer.score += points;
        // Save copy for history
        newPlayer.closedChains.push(JSON.parse(JSON.stringify(totalChain)));

        // RECYCLE EVERYTHING (Accumulated + Current + End)
        newState.discardPile.push(...totalChain);

        // Clear all
        newState.accumulatedCards = [];
        newState.communityCombo = [];

        const valuesStr = totalChain.map(c => c.type === 'TOMBOLA' ? '★(5)' : c.value).join('+');
        newState.log.push(`🏆 ${currentPlayer.name} cerró (${valuesStr}${metObjective ? ` +${bonus} bonus` : ''}) = ${points} pts!`);

        // Refill hand to HAND_SIZE (5)
        const cardsToDraw = Math.max(0, HAND_SIZE - newPlayer.hand.length);
        if (cardsToDraw > 0) drawCards(newPlayer, newState, cardsToDraw);

        if (newPlayer.score >= WIN_SCORE) {
            newState.winner = currentPlayer.id;
            // newState.log.push(`🏆 ¡${currentPlayer.name} GANA con ${newPlayer.score} pts!`); // Handled in UI overlay
            return newState;
        }

        advanceRound(newState);
    } else {
        newState.communityCombo.push(card);
        newState.log.push(`${currentPlayer.name} +${card.type}(${card.value}) → combo: ${newState.communityCombo.length} cartas`);
        // Refill hand to HAND_SIZE (5)
        const cardsToDraw = Math.max(0, HAND_SIZE - newPlayer.hand.length);
        if (cardsToDraw > 0) drawCards(newPlayer, newState, cardsToDraw);
    }

    checkMustDiscard(newState);

    if (!newState.mustDiscard && !newState.winner) {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }

    return newState;
};

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

    checkMustDiscard(newState);

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

    drawCards(currentPlayer, newState, 1);
    newState.log.push(`${currentPlayer.name} pasó y robó 1 carta.`);

    checkMustDiscard(newState);

    if (!newState.mustDiscard) {
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
