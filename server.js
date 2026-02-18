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

const HAND_SIZE = 7;
const WIN_SCORE = 100;
const OBJECTIVE_BONUS = 3;
const DRAW_ON_PLAY = 1;
const DRAW_ON_CLOSE = 3;

const PREFERENCES = [
    { id: 'p1', description: 'Combo de 3+ cartas', check: (chain) => chain.length >= 3 },
    { id: 'p2', description: 'Combo de 4+ cartas', check: (chain) => chain.length >= 4 },
    { id: 'p3', description: 'Al menos 2 Extensiones', check: (chain) => chain.filter(c => c.type === 'EXTENSION').length >= 2 },
    { id: 'p4', description: 'Todos los valores iguales', check: (chain) => chain.length >= 2 && new Set(chain.map(c => c.value)).size === 1 },
    { id: 'p5', description: 'Empezar con valor 1', check: (chain) => chain.length > 0 && chain[0].value === 1 },
    { id: 'p6', description: 'Solo valores bajos (1 o 2)', check: (chain) => chain.every(c => c.value <= 2) },
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

function randomPref() {
    return PREFERENCES[Math.floor(Math.random() * PREFERENCES.length)];
}

// Validate against COMMUNITY combo
function isValidMove(combo, card) {
    if (combo.length === 0) return card.type === 'START';
    if (card.type === 'START') return false;
    if (card.type === 'END') return combo.length > 0;
    const last = combo[combo.length - 1];
    return card.value >= last.value;
}

function calcComboScore(combo, metObjective) {
    const base = combo.reduce((sum, _, idx) => sum + (idx + 1), 0);
    return base + (metObjective ? OBJECTIVE_BONUS : 0);
}

function drawCards(player, deck, count) {
    for (let i = 0; i < count; i++) {
        if (deck.length > 0) player.hand.push(deck.shift());
    }
}

function advanceRound(state) {
    state.log.push('🔄 ¡Nueva ronda! Objetivo cambia para todos.');
    state.communityCombo = [];
    state.players.forEach(p => {
        const pref = randomPref();
        p.preference = { id: pref.id, description: pref.description };
    });
    state.roundPhase = 'playing';
    state.roundCloserId = null;
    state.playersToFinish = [];
}

function playCard(state, cardIndex) {
    const cp = state.players[state.currentPlayerIndex];
    const card = cp.hand[cardIndex];
    if (!card) return state;
    if (!isValidMove(state.communityCombo, card)) return state;

    cp.hand.splice(cardIndex, 1);

    if (card.type === 'END') {
        // CLOSE the community combo — this player scores!
        const combo = [...state.communityCombo, card];
        const pref = PREFERENCES.find(p => p.id === cp.preference.id);
        const met = pref ? pref.check(combo) : false;
        const pts = calcComboScore(combo, met);
        cp.score += pts;
        cp.closedChains.push(combo);
        state.communityCombo = [];
        state.log.push(`🏆 ${cp.name} cerró el combo comunitario (${combo.length} cartas) = ${pts} pts!`);
        if (met) state.log.push(`✨ ¡Bonus objetivo: +${OBJECTIVE_BONUS} pts!`);
        drawCards(cp, state.deck, DRAW_ON_CLOSE);
        if (cp.score >= WIN_SCORE) {
            state.winner = cp.id;
            state.log.push(`🏆 ¡${cp.name} GANA con ${cp.score} pts!`);
            return state;
        }
        if (state.roundPhase === 'playing') {
            state.roundPhase = 'closing';
            state.roundCloserId = cp.id;
            state.playersToFinish = state.players.filter(p => p.id !== cp.id).map(p => p.id);
            state.log.push(`⏰ Los demás tienen 1 turno antes de nueva ronda.`);
        }
    } else {
        // ADD to community combo
        state.communityCombo.push(card);
        state.log.push(`${cp.name} +${card.type}(${card.value}) → combo comunitario: ${state.communityCombo.length} cartas`);
        drawCards(cp, state.deck, DRAW_ON_PLAY);
    }

    if (state.roundPhase === 'closing') {
        state.playersToFinish = state.playersToFinish.filter(id => id !== cp.id);
        if (state.playersToFinish.length === 0) advanceRound(state);
    }

    if (!state.winner) {
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }
    return state;
}

function passTurn(state) {
    const cp = state.players[state.currentPlayerIndex];
    if (state.deck.length > 0) {
        cp.hand.push(state.deck.shift());
        state.log.push(`${cp.name} pasó y robó 1 carta.`);
    } else {
        state.log.push(`${cp.name} pasó (mazo vacío).`);
    }

    if (state.roundPhase === 'closing') {
        state.playersToFinish = state.playersToFinish.filter(id => id !== cp.id);
        if (state.playersToFinish.length === 0) advanceRound(state);
    }

    if (state.deck.length === 0) {
        const allStuck = state.players.every(p => !p.hand.some(c => isValidMove(state.communityCombo, c)));
        if (allStuck) {
            const sorted = [...state.players].sort((a, b) => b.score - a.score);
            state.winner = sorted[0].id;
            state.log.push(`🏁 ¡Mazo agotado! ${sorted[0].name} gana con ${sorted[0].score} pts!`);
            return state;
        }
    }

    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    return state;
}

// ===== AI LOGIC (community combo aware) =====
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

    // Check for win
    for (const { idx, card } of valid) {
        if (card.type === 'END') {
            const pc = [...combo, card];
            const pref = PREFERENCES.find(p => p.id === ai.preference.id);
            const met = pref ? pref.check(pc) : false;
            const pts = calcComboScore(pc, met);
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
            const pts = calcComboScore(pc, met);
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
            preference: { id: pref.id, description: pref.description },
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
            preference: { id: pref.id, description: pref.description },
            score: 0,
            closedChains: []
        });
    }

    return {
        deck,
        players,
        currentPlayerIndex: Math.floor(Math.random() * players.length),
        winner: null,
        log: ['¡Juego iniciado!'],
        communityCombo: [],
        roundPhase: 'playing',
        roundCloserId: null,
        playersToFinish: []
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
        playCard(room.state, cardIndex);
        broadcastState(room);
        runAITurns(room);
    });

    socket.on('pass-turn', () => {
        const room = rooms.get(socket.roomCode);
        if (!room || !room.state || room.state.winner) return;
        const cp = room.state.players[room.state.currentPlayerIndex];
        if (cp.id !== socket.playerId) return;
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
