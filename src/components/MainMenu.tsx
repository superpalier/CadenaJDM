import React, { useState } from 'react';
import type { AIDifficulty } from '../logic/ai';

interface MainMenuProps {
    onStartGame: (playerCount: number, difficulty: AIDifficulty) => void;
    onGoOnline: () => void;
}

const DIFFICULTIES: { key: AIDifficulty; label: string; emoji: string; desc: string }[] = [
    { key: 'facil', label: 'Fácil', emoji: '😊', desc: 'IA despistada' },
    { key: 'normal', label: 'Normal', emoji: '🧠', desc: 'IA estratégica' },
    { key: 'experta', label: 'Experta', emoji: '🔥', desc: 'IA implacable' },
];

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onGoOnline }) => {
    const [playerCount, setPlayerCount] = useState(2);
    const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '64px', fontWeight: 'bold', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    CADENA JDM
                </h1>
                <p style={{ fontSize: '18px', opacity: 0.9, marginTop: '6px', color: '#FFD700', fontWeight: 'bold' }}>
                    Combo Builder
                </p>
                <p style={{ fontSize: '12px', opacity: 0.4, marginTop: '4px' }}>
                    v4.0 — Multijugador · IA con niveles · Combos visibles
                </p>
            </div>

            {/* Player Count */}
            <div style={{
                background: 'rgba(255,255,255,0.06)',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                    👥 Jugadores
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {[2, 3, 4, 5].map(n => (
                        <button
                            key={n}
                            onClick={() => setPlayerCount(n)}
                            style={{
                                width: '50px',
                                height: '50px',
                                fontSize: '22px',
                                fontWeight: 'bold',
                                borderRadius: '10px',
                                border: playerCount === n ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.15)',
                                background: playerCount === n ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                                color: playerCount === n ? '#FFD700' : '#aaa',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {n}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '6px' }}>
                    Tú + {playerCount - 1} IA{playerCount > 2 ? 's' : ''}
                </div>
            </div>

            {/* Difficulty */}
            <div style={{
                background: 'rgba(255,255,255,0.06)',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                    🤖 Nivel de IA
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {DIFFICULTIES.map(d => (
                        <button
                            key={d.key}
                            onClick={() => setDifficulty(d.key)}
                            style={{
                                padding: '10px 16px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                borderRadius: '10px',
                                border: difficulty === d.key ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.15)',
                                background: difficulty === d.key ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                                color: difficulty === d.key ? '#FFD700' : '#aaa',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '20px' }}>{d.emoji}</div>
                            <div style={{ fontSize: '12px', marginTop: '2px' }}>{d.label}</div>
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '6px' }}>
                    {DIFFICULTIES.find(d => d.key === difficulty)?.desc}
                </div>
            </div>

            <button
                onClick={() => onStartGame(playerCount, difficulty)}
                style={{
                    padding: '16px 50px',
                    fontSize: '22px',
                    fontWeight: 'bold',
                    background: '#FFD700',
                    color: '#000',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                JUGAR LOCAL
            </button>

            <button
                onClick={onGoOnline}
                style={{
                    padding: '14px 50px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: 'transparent',
                    color: '#FFD700',
                    border: '2px solid #FFD700',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,215,0,0.1)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
                🌐 ONLINE
            </button>
        </div>
    );
};

export default MainMenu;
