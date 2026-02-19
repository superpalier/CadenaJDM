import { useRef, useState, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from '../types';

// Locally: connect to port 3001. On Render: connect to same origin (Render handles the port)
const SERVER_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin;

interface RoomPlayer {
    name: string;
    id: string;
}

interface MultiplayerState {
    connected: boolean;
    roomCode: string | null;
    playerId: string | null;
    players: RoomPlayer[];
    aiCount: number;
    difficulty: string;
    isHost: boolean;
    gameState: GameState | null;
    error: string | null;
}

export function useMultiplayer() {
    const socketRef = useRef<Socket | null>(null);
    const [state, setState] = useState<MultiplayerState>({
        connected: false,
        roomCode: null,
        playerId: null,
        players: [],
        aiCount: 0,
        difficulty: 'normal',
        isHost: false,
        gameState: null,
        error: null,
    });

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            setState(s => ({ ...s, connected: true, error: null }));
        });

        socket.on('disconnect', () => {
            setState(s => ({ ...s, connected: false }));
        });

        socket.on('room-update', ({ players, aiCount }: { players: RoomPlayer[]; aiCount: number }) => {
            setState(s => ({ ...s, players, aiCount }));
        });

        socket.on('difficulty-update', ({ difficulty }: { difficulty: string }) => {
            setState(s => ({ ...s, difficulty }));
        });

        socket.on('game-state', (gameState: GameState) => {
            // Re-attach preference check functions from descriptions
            gameState.players.forEach(p => {
                if (p.preference && !p.preference.check) {
                    p.preference = {
                        ...p.preference,
                        check: () => false // Will be re-evaluated properly
                    };
                }
            });
            setState(s => ({ ...s, gameState }));
        });

        socket.on('connect_error', () => {
            setState(s => ({ ...s, error: 'No se pudo conectar al servidor' }));
        });
    }, []);

    const disconnect = useCallback(() => {
        socketRef.current?.disconnect();
        socketRef.current = null;
        setState({
            connected: false,
            roomCode: null,
            playerId: null,
            players: [],
            aiCount: 0,
            difficulty: 'normal',
            isHost: false,
            gameState: null,
            error: null,
        });
    }, []);

    const createRoom = useCallback((playerName: string) => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.emit('create-room', { playerName }, (res: { code: string; playerId: string; players: RoomPlayer[] }) => {
            setState(s => ({
                ...s,
                roomCode: res.code,
                playerId: res.playerId,
                players: res.players,
                isHost: true,
                error: null,
            }));
        });
    }, []);

    const joinRoom = useCallback((code: string, playerName: string) => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.emit('join-room', { code: code.toUpperCase(), playerName }, (res: { error?: string; playerId?: string; players?: RoomPlayer[] }) => {
            if (res.error) {
                setState(s => ({ ...s, error: res.error ?? null }));
            } else {
                setState(s => ({
                    ...s,
                    roomCode: code.toUpperCase(),
                    playerId: res.playerId ?? null,
                    players: res.players ?? [],
                    isHost: false,
                    error: null,
                }));
            }
        });
    }, []);

    const setAICount = useCallback((count: number) => {
        socketRef.current?.emit('set-ai-count', { count });
    }, []);

    const setDifficulty = useCallback((difficulty: string) => {
        socketRef.current?.emit('set-difficulty', { difficulty });
    }, []);

    const startGame = useCallback(() => {
        socketRef.current?.emit('start-game');
    }, []);

    const sendPlayCard = useCallback((cardIndex: number, options: { asCloser?: boolean } = {}) => {
        socketRef.current?.emit('play-card', { cardIndex, options });
    }, []);

    const sendPassTurn = useCallback(() => {
        socketRef.current?.emit('pass-turn');
    }, []);

    const restartGame = useCallback(() => {
        socketRef.current?.emit('restart-game');
    }, []);

    useEffect(() => {
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    return {
        connected: state.connected,
        roomCode: state.roomCode,
        playerId: state.playerId,
        players: state.players,
        aiCount: state.aiCount,
        difficulty: state.difficulty,
        isHost: state.isHost,
        gameState: state.gameState,
        error: state.error,
        connect,
        createRoom,
        joinRoom,
        setAICount,
        setDifficulty,
        startGame,
        restartGame,
        disconnect,
        playCard: sendPlayCard, // Renamed from sendPlayCard
        passTurn: sendPassTurn // Renamed from sendPassTurn
    };
}
