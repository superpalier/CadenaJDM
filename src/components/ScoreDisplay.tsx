import React, { useState } from 'react';
import type { ClosedChain } from '../types';
import { WIN_SCORE } from '../logic/gameEngine';

interface ScoreDisplayProps {
    score: number;
    closedChains: ClosedChain[];
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
                    {closedChains.map((chainData, i) => {
                        return (
                            <div key={i} style={{ marginBottom: '12px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                                <div style={{ color: '#aaa', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Combo #{i + 1}</span>
                                    <span style={{ fontSize: '10px', opacity: 0.7 }}>{new Date(chainData.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {chainData.cards.map((card, j) => {
                                        let bg = '#fff';
                                        let col = '#000';
                                        let txt = `${card.value}`;
                                        if (card.type === 'START') { bg = '#1565C0'; col = '#fff'; }
                                        if (card.type === 'EXTENSION') { bg = '#E65100'; col = '#fff'; }
                                        if (card.type === 'END') { bg = '#C62828'; col = '#fff'; }
                                        if (card.type === 'TOMBOLA') { bg = '#9C27B0'; col = '#fff'; txt = '★'; }
                                        if (card.type === 'WILDCARD') { bg = 'linear-gradient(45deg, #FFEB3B, #00BCD4)'; col = '#000'; txt = '🃏'; }

                                        return (
                                            <div key={j} style={{
                                                width: '20px', height: '28px',
                                                background: bg, color: col,
                                                borderRadius: '3px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 'bold', fontSize: '12px',
                                                border: '1px solid #777'
                                            }}>
                                                {txt}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: '6px', color: '#ccc', fontSize: '11px', fontFamily: 'monospace' }}>
                                    Base: <span style={{ color: '#fff' }}>{chainData.baseScore}</span>
                                    {chainData.bonusScore > 0 && (
                                        <> + Bonus <span style={{ color: '#4CAF50' }}>{chainData.bonusScore}</span> <span style={{ fontSize: '9px', fontStyle: 'italic' }}>({chainData.objectiveDescription})</span></>
                                    )}
                                    {' = '}
                                    <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '13px' }}>
                                        {chainData.baseScore + chainData.bonusScore} pts
                                    </span>
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
