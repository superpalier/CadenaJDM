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
                    minWidth: '250px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#FFD700', fontSize: '14px' }}>
                        📜 Historial de Combos
                    </div>
                    {closedChains.map((chain, i) => {
                        const valuesSum = chain.reduce((s, c) => s + c.value, 0);
                        return (
                            <div key={i} style={{ marginBottom: '10px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                                <div style={{ color: '#ccc', fontWeight: 'bold' }}>Combo #{i + 1}</div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    {chain.map((card, j) => (
                                        <div key={card.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '2px'
                                        }}>
                                            <div style={{
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
                                            {j < chain.length - 1 && <span style={{ color: '#666', fontSize: '10px' }}>+</span>}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '4px', color: '#aaa', fontSize: '11px' }}>
                                    {chain.map(c => c.value).join(' + ')} = <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{valuesSum} pts</span>
                                </div>
                            </div>
                        );
                    })}
                    <div style={{ borderTop: '1px solid #FFD700', paddingTop: '6px', color: '#FFD700', fontWeight: 'bold', fontSize: '13px' }}>
                        Total: {score} / {WIN_SCORE}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScoreDisplay;
