import React, { useState, useEffect } from 'react';
import type { AIDifficulty } from '../logic/ai';

interface LobbyProps {
    connected: boolean;
    roomCode: string | null;
    playerId: string | null;
    players: { name: string; id: string }[];
    aiCount: number;
    difficulty: string;
    isHost: boolean;
    error: string | null;
    onConnect: () => void;
    onCreateRoom: (name: string) => void;
    onJoinRoom: (code: string, name: string) => void;
    onSetAICount: (count: number) => void;
    onSetDifficulty: (diff: string) => void;
    onStartGame: () => void;
    onBack: () => void;
}

const DIFFICULTIES: { key: AIDifficulty; label: string; emoji: string }[] = [
    { key: 'facil', label: 'Fácil', emoji: '😊' },
    { key: 'normal', label: 'Normal', emoji: '🧠' },
    { key: 'experta', label: 'Experta', emoji: '🔥' },
];

const Lobby: React.FC<LobbyProps> = ({
    connected, roomCode, players, aiCount, difficulty, isHost, error,
    onConnect, onCreateRoom, onJoinRoom, onSetAICount, onSetDifficulty, onStartGame, onBack
}) => {
    const [playerName, setPlayerName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [view, setView] = useState<'choice' | 'creating' | 'joining' | 'waiting'>('choice');
    const [nameError, setNameError] = useState('');
    const [codeError, setCodeError] = useState('');
    const [nameTouched, setNameTouched] = useState(false);
    const [codeTouched, setCodeTouched] = useState(false);

    useEffect(() => {
        onConnect();
    }, [onConnect]);

    // Validate name
    const validateName = (name: string): string => {
        if (!name.trim()) return 'Ingresá tu nombre';
        if (name.trim().length < 2) return 'Mínimo 2 caracteres';
        if (name.trim().length > 15) return 'Máximo 15 caracteres';
        return '';
    };

    // Validate code
    const validateCode = (code: string): string => {
        if (!code.trim()) return 'Ingresá el código de sala';
        if (code.length < 4) return 'El código tiene 4 caracteres';
        if (!/^[A-Z0-9]{4}$/.test(code)) return 'Solo letras y números';
        return '';
    };

    const handleNameChange = (val: string) => {
        // Only allow letters, numbers and spaces
        const clean = val.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9 ]/g, '');
        setPlayerName(clean);
        if (nameTouched) setNameError(validateName(clean));
    };

    const handleCodeChange = (val: string) => {
        // Only allow alphanumeric, uppercase
        const clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
        setJoinCode(clean);
        if (codeTouched) setCodeError(validateCode(clean));
    };

    const handleCreate = () => {
        setNameTouched(true);
        const err = validateName(playerName);
        setNameError(err);
        if (err) return;
        onCreateRoom(playerName.trim());
        setView('waiting');
    };

    const handleJoin = () => {
        setNameTouched(true);
        setCodeTouched(true);
        const nErr = validateName(playerName);
        const cErr = validateCode(joinCode);
        setNameError(nErr);
        setCodeError(cErr);
        if (nErr || cErr) return;
        onJoinRoom(joinCode.trim(), playerName.trim());
        setView('waiting');
    };

    const totalPlayers = players.length + aiCount;
    const canStart = isHost && totalPlayers >= 2 && totalPlayers <= 5;
    const maxAI = Math.max(0, 5 - players.length);

    const boxStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.06)',
        padding: '20px',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.12)',
        width: '100%',
        maxWidth: '400px',
    };

    const inputStyle = (hasError: boolean): React.CSSProperties => ({
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        borderRadius: '8px',
        border: `2px solid ${hasError ? '#F44336' : 'rgba(255,255,255,0.2)'}`,
        background: 'rgba(0,0,0,0.3)',
        color: '#fff',
        outline: 'none',
        textAlign: 'center',
        transition: 'border-color 0.2s',
    });

    const errMsgStyle: React.CSSProperties = {
        fontSize: '12px', color: '#EF9A9A', marginTop: '6px', textAlign: 'center',
    };

    const btnStyle = (primary = false): React.CSSProperties => ({
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: 'bold',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        background: primary ? '#FFD700' : 'rgba(255,255,255,0.1)',
        color: primary ? '#000' : '#fff',
        width: '100%',
        transition: 'all 0.2s',
    });

    return (
        <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '20px'
        }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>CADENA JDM</h1>
            <p style={{ fontSize: '16px', color: '#FFD700', fontWeight: 'bold' }}>Modo Online</p>

            {!connected && (
                <div style={boxStyle}>
                    <div style={{ textAlign: 'center', color: '#FF9800', fontSize: '14px' }}>
                        ⏳ Conectando al servidor...
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    background: 'rgba(244,67,54,0.2)', border: '1px solid #F44336',
                    padding: '10px 16px', borderRadius: '8px', fontSize: '14px', color: '#EF9A9A',
                    maxWidth: '400px', width: '100%', textAlign: 'center'
                }}>
                    ❌ {error}
                </div>
            )}

            {connected && view === 'choice' && (
                <>
                    <div style={boxStyle}>
                        <label style={{ fontSize: '12px', opacity: 0.6, marginBottom: '6px', display: 'block', textAlign: 'center' }}>
                            TU NOMBRE
                        </label>
                        <input
                            placeholder="Ej: Juan, Cata..."
                            value={playerName}
                            onChange={e => handleNameChange(e.target.value)}
                            onBlur={() => { setNameTouched(true); setNameError(validateName(playerName)); }}
                            style={inputStyle(!!nameError && nameTouched)}
                            maxLength={15}
                        />
                        {nameError && nameTouched && <div style={errMsgStyle}>⚠ {nameError}</div>}
                    </div>

                    <button
                        onClick={handleCreate}
                        style={{ ...btnStyle(true), maxWidth: '400px', opacity: !playerName.trim() ? 0.5 : 1 }}
                    >
                        🏠 CREAR SALA
                    </button>

                    <div style={{ fontSize: '14px', opacity: 0.5 }}>— o unirse a una sala —</div>

                    <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontSize: '12px', opacity: 0.6, textAlign: 'center' }}>
                            CÓDIGO DE SALA
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    placeholder="ABCD"
                                    value={joinCode}
                                    onChange={e => handleCodeChange(e.target.value)}
                                    onBlur={() => { setCodeTouched(true); setCodeError(validateCode(joinCode)); }}
                                    style={{ ...inputStyle(!!codeError && codeTouched), letterSpacing: '6px', fontFamily: 'monospace', fontSize: '22px' }}
                                    maxLength={4}
                                />
                            </div>
                            <button
                                onClick={handleJoin}
                                style={{ ...btnStyle(true), width: 'auto', minWidth: '90px', opacity: (!playerName.trim() || joinCode.length < 4) ? 0.5 : 1 }}
                            >
                                UNIRSE
                            </button>
                        </div>
                        {codeError && codeTouched && <div style={errMsgStyle}>⚠ {codeError}</div>}
                    </div>

                    <button onClick={onBack} style={{ ...btnStyle(), maxWidth: '200px' }}>
                        ← Volver
                    </button>
                </>
            )}

            {connected && view === 'waiting' && roomCode && (
                <>
                    {/* Room Code Display */}
                    <div style={{ ...boxStyle, textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', opacity: 0.6, marginBottom: '8px' }}>CÓDIGO DE SALA</div>
                        <div style={{
                            fontSize: '48px', fontWeight: 'bold', letterSpacing: '8px',
                            fontFamily: 'monospace', color: '#FFD700',
                            background: 'rgba(255,215,0,0.1)', padding: '8px 16px', borderRadius: '10px',
                            userSelect: 'all', cursor: 'pointer'
                        }}>
                            {roomCode}
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '6px' }}>
                            📋 Click para seleccionar y compartir
                        </div>
                    </div>

                    {/* Connected Players */}
                    <div style={boxStyle}>
                        <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
                            👥 Jugadores ({totalPlayers}/5)
                        </div>
                        {players.map(p => (
                            <div key={p.id} style={{
                                padding: '6px 10px', background: 'rgba(255,255,255,0.05)',
                                borderRadius: '6px', marginBottom: '4px', fontSize: '14px',
                                display: 'flex', justifyContent: 'space-between'
                            }}>
                                <span>🟢 {p.name}</span>
                                {p.id === players[0]?.id && <span style={{ color: '#FFD700', fontSize: '12px' }}>HOST</span>}
                            </div>
                        ))}
                        {Array.from({ length: aiCount }).map((_, i) => (
                            <div key={`ai-${i}`} style={{
                                padding: '6px 10px', background: 'rgba(255,255,255,0.03)',
                                borderRadius: '6px', marginBottom: '4px', fontSize: '14px', color: '#999'
                            }}>
                                🤖 IA {['Rojo', 'Azul', 'Verde', 'Morado'][i]}
                            </div>
                        ))}
                        {totalPlayers < 2 && (
                            <div style={{ fontSize: '12px', color: '#FF9800', marginTop: '8px', textAlign: 'center' }}>
                                ⚠ Se necesitan al menos 2 jugadores
                            </div>
                        )}
                    </div>

                    {/* Host Controls */}
                    {isHost && (
                        <>
                            <div style={boxStyle}>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>🤖 IAs</div>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                    {[0, 1, 2, 3].filter(n => n <= maxAI).map(n => (
                                        <button key={n} onClick={() => onSetAICount(n)} style={{
                                            width: '42px', height: '42px', fontSize: '18px', fontWeight: 'bold',
                                            borderRadius: '8px', cursor: 'pointer',
                                            border: aiCount === n ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.15)',
                                            background: aiCount === n ? 'rgba(255,215,0,0.15)' : 'transparent',
                                            color: aiCount === n ? '#FFD700' : '#aaa'
                                        }}>{n}</button>
                                    ))}
                                </div>
                            </div>

                            {aiCount > 0 && (
                                <div style={boxStyle}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>🎯 Nivel IA</div>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                        {DIFFICULTIES.map(d => (
                                            <button key={d.key} onClick={() => onSetDifficulty(d.key)} style={{
                                                padding: '8px 14px', fontSize: '12px', fontWeight: 'bold',
                                                borderRadius: '8px', cursor: 'pointer',
                                                border: difficulty === d.key ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.15)',
                                                background: difficulty === d.key ? 'rgba(255,215,0,0.15)' : 'transparent',
                                                color: difficulty === d.key ? '#FFD700' : '#aaa'
                                            }}>
                                                {d.emoji} {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onStartGame}
                                disabled={!canStart}
                                style={{
                                    ...btnStyle(true), maxWidth: '300px',
                                    opacity: canStart ? 1 : 0.4, fontSize: '20px', padding: '14px'
                                }}
                            >
                                🎮 INICIAR PARTIDA
                            </button>
                            {!canStart && (
                                <div style={{ fontSize: '12px', color: '#FF9800', textAlign: 'center' }}>
                                    Necesitás al menos 2 jugadores (humanos + IAs)
                                </div>
                            )}
                        </>
                    )}

                    {!isHost && (
                        <div style={{ fontSize: '14px', color: '#FFD700', textAlign: 'center' }}>
                            ⏳ Esperando que el Host inicie la partida...
                        </div>
                    )}

                    <button onClick={() => { onBack(); }} style={{ ...btnStyle(), maxWidth: '200px' }}>
                        ← Salir
                    </button>
                </>
            )}
        </div>
    );
};

export default Lobby;
