import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

// Serve the built frontend
app.use(express.static(join(__dirname, 'dist')));
app.get('/{*path}', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ===== GAME LOGIC (server-side, community combo) =====

const HAND_SIZE = 5;
const WIN_SCORE = 100;
const DRAW_ON_PLAY = 1;
const DRAW_ON_CLOSE = 2;

// 14 objectives across 3 difficulty tiers
const PREFERENCES = [
    // EASY (+2)
    { id: 'e1', description: 'Combo de 3+ cartas', bonus: 2, difficulty: 'easy', check: (c) => c.length >= 3 },
    { id: 'e2', description: 'Empezar con valor 1', bonus: 2, difficulty: 'easy', check: (c) => c.length > 0 && c[0].value === 1 },
    { id: 'e3', description: 'Terminar con valor 3', bonus: 2, difficulty: 'easy', check: (c) => c.length > 0 && c[c.length - 1].value === 3 },
    { id: 'e4', description: 'Al menos 1 Extensión', bonus: 2, difficulty: 'easy', check: (c) => c.filter(x => x.type === 'EXTENSION').length >= 1 },
    // NORMAL (+4)
    { id: 'n1', description: 'Combo de 4+ cartas', bonus: 4, difficulty: 'normal', check: (c) => c.length >= 4 },
    { id: 'n2', description: 'Al menos 2 Extensiones', bonus: 4, difficulty: 'normal', check: (c) => c.filter(x => x.type === 'EXTENSION').length >= 2 },
    { id: 'n3', description: 'Solo valores bajos (1-2)', bonus: 4, difficulty: 'normal', check: (c) => c.length >= 2 && c.every(x => x.value <= 2) },
    { id: 'n4', description: 'Suma de valores ≥ 8', bonus: 4, difficulty: 'normal', check: (c) => c.reduce((s, x) => s + x.value, 0) >= 8 },
    { id: 'n5', description: 'Contiene un 1, un 2 y un 3', bonus: 4, difficulty: 'normal', check: (c) => [1, 2, 3].every(v => c.some(x => x.value === v)) },
    // HARD (+7)
    { id: 'h1', description: 'Todos los valores iguales', bonus: 7, difficulty: 'hard', check: (c) => c.length >= 3 && new Set(c.map(x => x.value)).size === 1 },
    { id: 'h2', description: 'Combo de 5+ cartas', bonus: 7, difficulty: 'hard', check: (c) => c.length >= 5 },
    {
        id: 'h3', description: 'Escalera: 1→2→3', bonus: 7, difficulty: 'hard', check: (c) => {
            const vals = c.map(x => x.value);
            for (let i = 0; i <= vals.length - 3; i++) { if (vals[i] === 1 && vals[i + 1] === 2 && vals[i + 2] === 3) return true; }
            return false;
        }
    },
    { id: 'h4', description: 'Suma de valores ≥ 12', bonus: 7, difficulty: 'hard', check: (c) => c.reduce((s, x) => s + x.value, 0) >= 12 },
    { id: 'h5', description: 'Exactamente 3 treses', bonus: 7, difficulty: 'hard', check: (c) => c.filter(x => x.value === 3).length >= 3 },
];

function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function createDeck() {
    const cards = [];
    const values = [1, 2, 3];
    const typeCounts = [
        { type: 'START', count: 4 },
        { type: 'EXTENSION', count: 10 },
        { type: 'END', count: 4 },
    ];
    let id = 0;
    typeCounts.forEach(({ type, count }) => {
        values.forEach(value => {
            for (let i = 0; i < count; i++) {
                cards.push({ id: `card-${id++}`, type, value });
            }
        });
    });
    return shuffle(cards);
}

// Weighted random: easy 3x, normal 2x, hard 1x
function randomPref() {
    const weights = { easy: 3, normal: 2, hard: 1 };
    const pool = [];
    PREFERENCES.forEach(p => { for (let i = 0; i < weights[p.difficulty]; i++) pool.push(p); });
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return { id: chosen.id, description: chosen.description, bonus: chosen.bonus, difficulty: chosen.difficulty };
}

function isValidMove(combo, card) {
    if (combo.length === 0) return card.type === 'START';
    if (card.type === 'START') return false;
    if (card.type === 'END') return combo.length > 0;
    const last = combo[combo.length - 1];
    return card.value >= last.value;
}

// SCORING: sum of all card values + bonus
function calcComboScore(combo, metObjective, bonusAmount) {
    const base = combo.reduce((sum, c) => sum + c.value, 0);
    return base + (metObjective ? bonusAmount : 0);
}

function reshuffleDeck(state) {
    if (state.deck.length === 0 && state.discardPile.length > 0) {
        state.deck = shuffle(state.discardPile);
        state.discardPile = [];
        state.log.push('♻️ ¡Mazo agotado! Se revolvió la pila de descarte.');
    }
}

function drawCards(player, state, count) {
    for (let i = 0; i < count; i++) {
        reshuffleDeck(state);
        if (state.deck.length > 0) player.hand.push(state.deck.shift());
    }
}

function checkMustDiscard(state) {
    const cp = state.players[state.currentPlayerIndex];
    state.mustDiscard = cp.hand.length > HAND_SIZE;
}

function advanceRound(state) {
    state.log.push('🔄 ¡Nueva ronda! Objetivo cambia para todos.');
    state.communityCombo = [];
    state.players.forEach(p => {
        const pref = randomPref();
        p.preference = pref;
    });
}

function playCard(state, cardIndex) {
    const cp = state.players[state.currentPlayerIndex];
    const card = cp.hand[cardIndex];
    if (!card) return state;
    if (!isValidMove(state.communityCombo, card)) return state;

    cp.hand.splice(cardIndex, 1);

    if (card.type === 'END') {
        const combo = [...state.communityCombo, card];
        const pref = PREFERENCES.find(p => p.id === cp.preference.id);
        const met = pref ? pref.check(combo) : false;
        const bonus = pref ? pref.bonus : 3;
        const pts = calcComboScore(combo, met, bonus);
        cp.score += pts;
        cp.closedChains.push(combo);

        const valuesStr = combo.map(c => c.value).join('+');
        const valuesSum = combo.reduce((s, c) => s + c.value, 0);
        state.log.push(`🏆 ${cp.name} cerró (${valuesStr} = ${valuesSum}${met ? ` +${bonus} bonus` : ''}) = ${pts} pts!`);

        drawCards(cp, state, DRAW_ON_CLOSE);
        if (cp.score >= WIN_SCORE) {
            state.winner = cp.id;
            state.log.push(`🏆 ¡${cp.name} GANA con ${cp.score} pts!`);
            return state;
        }
        advanceRound(state);
    } else {
        state.communityCombo.push(card);
        state.log.push(`${cp.name} +${card.type}(${card.value}) → combo: ${state.communityCombo.length} cartas`);
        drawCards(cp, state, DRAW_ON_PLAY);
    }

    checkMustDiscard(state);
    if (!state.mustDiscard && !state.winner) {
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }
    return state;
}

function discardCard(state, cardIndex) {
    const cp = state.players[state.currentPlayerIndex];
    if (!cp || cp.hand.length <= HAND_SIZE) return state;
    const card = cp.hand.splice(cardIndex, 1)[0];
    if (card) {
        state.discardPile.push(card);
        state.log.push(`🗑️ ${cp.name} descartó ${card.type}(${card.value})`);
    }
    checkMustDiscard(state);
    if (!state.mustDiscard) {
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }
    return state;
}

function passTurn(state) {
    const cp = state.players[state.currentPlayerIndex];
    drawCards(cp, state, 1);
    state.log.push(`${cp.name} pasó y robó 1 carta.`);

    checkMustDiscard(state);
    if (!state.mustDiscard) {
        if (state.deck.length === 0 && state.discardPile.length === 0) {
            const allStuck = state.players.every(p => !p.hand.some(c => isValidMove(state.communityCombo, c)));
            if (allStuck) {
                const sorted = [...state.players].sort((a, b) => b.score - a.score);
                state.winner = sorted[0].id;
                state.log.push(`🏁 ¡No quedan cartas! ${sorted[0].name} gana con ${sorted[0].score} pts!`);
                return state;
            }
        }
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }
    return state;
}

// ===== AI LOGIC =====
function aiBestMove(state, difficulty = 'normal') {
    const ai = state.players[state.currentPlayerIndex];
    const combo = state.communityCombo;
    const hand = ai.hand;
    const valid = [];
    hand.forEach((card, idx) => { if (isValidMove(combo, card)) valid.push({ idx, card }); });
    if (valid.length === 0) return null;

    if (difficulty === 'facil') {
        if (Math.random() < 0.4) return valid[Math.floor(Math.random() * valid.length)].idx;
        const end = valid.find(m => m.card.type === 'END' && combo.length >= 2);
        if (end && Math.random() < 0.5) return end.idx;
        return valid[0].idx;
    }

    for (const { idx, card } of valid) {
        if (card.type === 'END') {
            const pc = [...combo, card];
            const pref = PREFERENCES.find(p => p.id === ai.preference.id);
            const met = pref ? pref.check(pc) : false;
            const bonus = pref ? pref.bonus : 3;
            const pts = calcComboScore(pc, met, bonus);
            if (ai.score + pts >= WIN_SCORE) return idx;
        }
    }

    let bestIdx = -1, bestS = -Infinity;
    const isExperta = difficulty === 'experta';

    for (const { idx, card } of valid) {
        let s = 0;
        if (combo.length === 0) {
            if (card.type === 'START') { s += 100; s += (4 - card.value) * (isExperta ? 10 : 3); }
        } else if (card.type === 'END') {
            const pc = [...combo, card];
            const pref = PREFERENCES.find(p => p.id === ai.preference.id);
            const met = pref ? pref.check(pc) : false;
            const bonus = pref ? pref.bonus : 3;
            const pts = calcComboScore(pc, met, bonus);
            if (combo.length >= 4) s += isExperta ? 80 : 50;
            else if (combo.length >= 3) s += isExperta ? 55 : 35;
            else if (combo.length >= 2) s += 20;
            else s += 5;
            if (met) s += isExperta ? 40 : 25;
            if (ai.score + pts >= WIN_SCORE - 5) s += isExperta ? 60 : 30;
            if (isExperta && combo.length >= 3) s += 15;
            s += pts * (isExperta ? 2 : 1);
        } else if (card.type === 'EXTENSION') {
            if (isExperta) {
                if (combo.length <= 1) s += 20;
                if (combo.length === 2) s += 12;
                if (combo.length >= 3) s += 3;
                const hasEnd = hand.some(c => c.type === 'END');
                if (hasEnd) s += 15;
                else s -= 10;
                s += (4 - card.value) * 4;
            } else {
                if (combo.length <= 1) s += 20;
                if (combo.length === 2) s += 15;
                if (combo.length >= 3) s += 8;
                if (card.value <= 2) s += 5;
            }
        }
        if (s > bestS) { bestS = s; bestIdx = idx; }
    }

    if (difficulty === 'normal' && Math.random() < 0.15 && valid.length > 1) {
        return valid[Math.floor(Math.random() * valid.length)].idx;
    }
    return bestIdx >= 0 ? bestIdx : null;
}

// ===== ROOM MANAGEMENT =====
const rooms = new Map();

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    } while (rooms.has(code));
    return code;
}

function createGameState(room) {
    const deck = createDeck();
    const players = [];

    room.players.forEach(p => {
        const pref = randomPref();
        players.push({
            id: p.playerId,
            name: p.name,
            isAI: false,
            hand: deck.splice(0, HAND_SIZE),
            preference: pref,
            score: 0,
            closedChains: []
        });
    });

    const aiNames = ['Rojo', 'Azul', 'Verde', 'Morado'];
    for (let i = 0; i < (room.aiCount || 0); i++) {
        const pref = randomPref();
        players.push({
            id: `ai-${i}`,
            name: `IA ${aiNames[i]}`,
            isAI: true,
            hand: deck.splice(0, HAND_SIZE),
            preference: pref,
            score: 0,
            closedChains: []
        });
    }

    return {
        deck,
        discardPile: [],
        players,
        currentPlayerIndex: Math.floor(Math.random() * players.length),
        winner: null,
        log: ['¡Juego iniciado!'],
        communityCombo: [],
        mustDiscard: false,
    };
}

function playerView(state, playerId) {
    return {
        ...state,
        players: state.players.map(p => {
            if (p.id === playerId || p.isAI) return p;
            return { ...p, hand: p.hand.map(() => ({ id: 'hidden', type: 'HIDDEN', value: 0 })) };
        })
    };
}

function runAITurns(room) {
    const state = room.state;
    if (!state || state.winner) return;
    const cp = state.players[state.currentPlayerIndex];
    if (!cp.isAI) return;

    setTimeout(() => {
        if (state.mustDiscard && cp.hand.length > HAND_SIZE) {
            const worst = cp.hand.reduce((best, c, i) => c.value < cp.hand[best].value ? i : best, 0);
            discardCard(state, worst);
            broadcastState(room);
            runAITurns(room);
            return;
        }

        const moveIdx = aiBestMove(state, room.difficulty || 'normal');
        if (moveIdx !== null && moveIdx >= 0) {
            playCard(state, moveIdx);
        } else {
            passTurn(state);
        }
        broadcastState(room);
        if (!state.winner) runAITurns(room);
    }, 800);
}

function broadcastState(room) {
    room.players.forEach(p => {
        const view = playerView(room.state, p.playerId);
        io.to(p.socketId).emit('game-state', view);
    });
}

// ===== SOCKET EVENTS =====
io.on('connection', (socket) => {
    console.log(`✅ Connected: ${socket.id}`);

    socket.on('create-room', ({ playerName }, callback) => {
        const code = generateCode();
        const playerId = `player-${socket.id}`;
        rooms.set(code, {
            players: [{ socketId: socket.id, playerId, name: playerName || 'Host' }],
            host: socket.id, state: null, difficulty: 'normal', aiCount: 0
        });
        socket.join(code);
        socket.roomCode = code;
        socket.playerId = playerId;
        console.log(`🏠 Room ${code} created by ${playerName}`);
        callback({ code, playerId, players: rooms.get(code).players.map(p => ({ name: p.name, id: p.playerId })) });
    });

    socket.on('join-room', ({ code, playerName }, callback) => {
        const room = rooms.get(code?.toUpperCase());
        if (!room) return callback({ error: 'Sala no encontrada' });
        if (room.state) return callback({ error: 'Juego ya iniciado' });
        if (room.players.length >= 5) return callback({ error: 'Sala llena (máx 5)' });

        const playerId = `player-${socket.id}`;
        room.players.push({ socketId: socket.id, playerId, name: playerName || `Player ${room.players.length + 1}` });
        socket.join(code.toUpperCase());
        socket.roomCode = code.toUpperCase();
        socket.playerId = playerId;

        const playerList = room.players.map(p => ({ name: p.name, id: p.playerId }));
        io.to(code.toUpperCase()).emit('room-update', { players: playerList, aiCount: room.aiCount });
        console.log(`👤 ${playerName} joined room ${code}`);
        callback({ playerId, players: playerList });
    });

    socket.on('set-ai-count', ({ count }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.host !== socket.id) return;
        room.aiCount = Math.max(0, Math.min(4 - room.players.length, count));
        const playerList = room.players.map(p => ({ name: p.name, id: p.playerId }));
        io.to(socket.roomCode).emit('room-update', { players: playerList, aiCount: room.aiCount });
    });

    socket.on('set-difficulty', ({ difficulty }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.host !== socket.id) return;
        room.difficulty = difficulty;
        io.to(socket.roomCode).emit('difficulty-update', { difficulty });
    });

    socket.on('start-game', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.host !== socket.id) return;
        if (room.players.length + room.aiCount < 2) return;
        room.state = createGameState(room);
        console.log(`🎮 Game started in room ${socket.roomCode}`);
        broadcastState(room);
        runAITurns(room);
    });

    socket.on('play-card', ({ cardIndex }) => {
        const room = rooms.get(socket.roomCode);
        if (!room || !room.state || room.state.winner) return;
        const cp = room.state.players[room.state.currentPlayerIndex];
        if (cp.id !== socket.playerId) return;

        if (room.state.mustDiscard) {
            discardCard(room.state, cardIndex);
        } else {
            playCard(room.state, cardIndex);
        }
        broadcastState(room);
        runAITurns(room);
    });

    socket.on('pass-turn', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || !room.state || room.state.winner) return;
        const cp = room.state.players[room.state.currentPlayerIndex];
        if (cp.id !== socket.playerId) return;
        if (room.state.mustDiscard) return;
        passTurn(room.state);
        broadcastState(room);
        runAITurns(room);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                room.players = room.players.filter(p => p.socketId !== socket.id);
                if (room.players.length === 0) {
                    rooms.delete(socket.roomCode);
                    console.log(`🗑️ Room ${socket.roomCode} deleted`);
                } else {
                    const playerList = room.players.map(p => ({ name: p.name, id: p.playerId }));
                    io.to(socket.roomCode).emit('room-update', { players: playerList, aiCount: room.aiCount });
                    if (room.host === socket.id) room.host = room.players[0].socketId;
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🌐 Cadena JDM Server running on port ${PORT}`);
});
