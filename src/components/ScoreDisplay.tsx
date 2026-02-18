import React, { useState } from 'react';
import type { Card } from '../types';
import { WIN_SCORE } from '../logic/gameEngine';

interface ScoreDisplayProps {
    score: number;
    closedChains: Card[][];
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, closedChains }) => {
    const [showHistory, setShowHistory] = useState(false);

    if (closedChains.length === 0) {
        return <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFD700' }}>{score} / {WIN_SCORE}</div>;
    }

    return (
        <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setShowHistory(true)}
            onMouseLeave={() => setShowHistory(false)}
        >
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFD700', cursor: 'pointer' }}>
                {score} / {WIN_SCORE}
            </div>

            {showHistory && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    background: 'rgba(0,0,0,0.95)',
                    border: '2px solid #FFD700',
                    borderRadius: '8px',
                    padding: '12px',
                    minWidth: '200px',
                    zIndex: 1000
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#FFD700', fontSize: '14px' }}>
                        📜 Historial de Combos
                    </div>
                    {closedChains.map((chain, i) => (
                        <div key={i} style={{ marginBottom: '8px', fontSize: '12px' }}>
                            <div style={{ color: '#aaa' }}>Combo #{i + 1} — {chain.length} cartas</div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                {chain.map(card => (
                                    <div key={card.id} style={{
                                        width: '28px',
                                        height: '36px',
                                        background: card.type === 'START' ? '#1565C0' : card.type === 'EXTENSION' ? '#E65100' : '#C62828',
                                        borderRadius: '3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: 'white'
                                    }}>
                                        {card.value}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScoreDisplay;
