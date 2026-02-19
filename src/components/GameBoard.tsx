import React, { useEffect, useState } from 'react';
import type { GameState, TutorialStep } from '../types';
import { initializeGame, playCard, passTurn, discardCard, isValidMove, calculateComboScore, WIN_SCORE, HAND_SIZE, PREFERENCES } from '../logic/gameEngine';
import { calculateBestMove } from '../logic/ai';
import type { AIDifficulty } from '../logic/ai';
import Card from './Card';
import TutorialOverlay from './TutorialOverlay';
import ScoreDisplay from './ScoreDisplay';

interface GameBoardProps {
    onEndGame: (winner: string) => void;
    onBackToMenu: () => void;
    playerCount: number;
    difficulty: AIDifficulty;
    mode: 'local' | 'online';
    onlineState?: GameState | null;
    onlinePlayerId?: string | null;
    onPlayCard?: (cardIndex: number) => void;
    onPassTurn?: () => void;
}

const PLAYER_COLORS = ['#c62828', '#1565C0', '#2E7D32', '#6A1B9A', '#E65100'];

const GameBoard: React.FC<GameBoardProps> = ({
    onEndGame, onBackToMenu, playerCount, difficulty, mode,
    onlineState, onlinePlayerId, onPlayCard, onPassTurn
}) => {
    const [localState, setLocalState] = useState<GameState | null>(null);
    const gameState = mode === 'online' ? onlineState ?? null : localState;

    useEffect(() => {
        if (mode === 'local') setLocalState(initializeGame("Tú", playerCount));
    }, [mode, playerCount]);

    // AI turns (local only)
    useEffect(() => {
        if (mode !== 'local' || !gameState) return;
        if (gameState.winner) { setTimeout(() => onEndGame(gameState.winner!), 2000); return; }
        const cp = gameState.players[gameState.currentPlayerIndex];
        if (cp.isAI) {
            const timer = setTimeout(() => {
                // AI must discard first if hand > HAND_SIZE
                if (gameState.mustDiscard && cp.hand.length > HAND_SIZE) {
                    // AI discards lowest value non-strategic card
                    const worst = cp.hand.reduce((best, c, i) => c.value < cp.hand[best].value ? i : best, 0);
                    setLocalState(prev => prev ? discardCard(prev, worst) : null);
                    return;
                }
                const moveIndex = calculateBestMove(gameState, difficulty);
                if (moveIndex !== null && moveIndex !== -1) {
                    setLocalState(prev => prev ? playCard(prev, moveIndex) : null);
                } else {
                    setLocalState(prev => prev ? passTurn(prev) : null);
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [gameState, onEndGame, mode, difficulty]);

    // Online winner detection
    useEffect(() => {
        if (mode === 'online' && gameState?.winner) setTimeout(() => onEndGame(gameState.winner!), 2000);
    }, [mode, gameState?.winner, onEndGame]);

    const handleTutorialNext = () => {
        if (!gameState || mode === 'online') return;
        const steps: TutorialStep[] = ['WELCOME', 'EXPLAIN_HAND', 'PLAY_START', 'EXPLAIN_VALUE', 'PLAY_LINK', 'EXPLAIN_END', 'COMPLETED'];
        const idx = steps.indexOf(gameState.tutorialStep);
        if (idx < steps.length - 1) setLocalState(prev => prev ? { ...prev, tutorialStep: steps[idx + 1] } : null);
        else setLocalState(prev => prev ? { ...prev, isTutorialActive: false } : null);
    };

    const handleTutorialSkip = () => {
        if (mode === 'online') return;
        setLocalState(prev => prev ? { ...prev, isTutorialActive: false, tutorialStep: 'COMPLETED' } : null);
    };

    const handleCardClick = (index: number) => {
        if (!gameState) return;
        if (mode === 'online') { onPlayCard?.(index); return; }
        const myPlayer = gameState.players.find(p => !p.isAI)!;
        const myIdx = gameState.players.indexOf(myPlayer);
        if (gameState.currentPlayerIndex !== myIdx) return;

        // If must discard, clicking a card discards it
        if (gameState.mustDiscard) {
            setLocalState(prev => prev ? discardCard(prev, index) : null);
            return;
        }

        setLocalState(prev => prev ? playCard(prev, index) : null);
    };

    const handlePass = () => {
        if (!gameState) return;
        if (mode === 'online') { onPassTurn?.(); return; }
        setLocalState(prev => prev ? passTurn(prev) : null);
    };

    if (!gameState) return null;

    const myPlayer = mode === 'online'
        ? gameState.players.find(p => p.id === onlinePlayerId)!
        : gameState.players.find(p => !p.isAI)!;
    if (!myPlayer) return null;

    const myIndex = gameState.players.indexOf(myPlayer);
    const opponents = gameState.players.filter(p => p.id !== myPlayer.id);
    const isMyTurn = gameState.currentPlayerIndex === myIndex;
    const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];

    const combo = gameState.communityCombo;

    // In online mode, preference.check is not serialized (functions can't be sent via JSON).
    // Look up the real check function from PREFERENCES using the preference id.
    const prefId = myPlayer.preference?.id;
    const realPref = PREFERENCES.find(p => p.id === prefId);
    const checkFn = realPref?.check ?? myPlayer.preference?.check;

    const metObjective = combo.length > 0 && checkFn
        ? checkFn([...combo])
        : false;
    const bonusAmt = realPref?.bonus ?? 3;
    const potentialScore = combo.length > 0
        ? calculateComboScore([...combo, { id: 'temp', type: 'END', value: 1 }], metObjective, bonusAmt)
        : 0;

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {mode === 'local' && gameState.isTutorialActive && (
                <TutorialOverlay step={gameState.tutorialStep} onNext={handleTutorialNext} onSkip={handleTutorialSkip} />
            )}

            {/* ===== ROW 1: OPPONENTS ===== */}
            <div style={{ display: 'flex', gap: '1px', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
                {opponents.map((opp, i) => {
                    const oppIdx = gameState.players.indexOf(opp);
                    const isTheirTurn = gameState.currentPlayerIndex === oppIdx;
                    const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                    return (
                        <div key={opp.id} style={{
                            flex: 1, padding: '8px 12px',
                            background: isTheirTurn ? 'rgba(255,215,0,0.1)' : 'rgba(0,0,0,0.35)',
                            borderBottom: isTheirTurn ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.1)',
                            borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: color, marginRight: '6px' }} />
                                    {opp.name}
                                    {isTheirTurn && <span style={{ color: '#FFD700', marginLeft: '6px', fontSize: '12px' }}>▶</span>}
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#FFD700' }}>{opp.score}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                                {Array.from({ length: opp.hand.length }).map((_, j) => (
                                    <div key={j} style={{ width: '14px', height: '20px', background: color, border: '1px solid rgba(255,255,255,0.3)', borderRadius: '2px' }} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ===== ROW 2: CENTER ===== */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>

                {/* LEFT: Info */}
                <div style={{ width: '190px', flexShrink: 0, padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', overflowY: 'auto' }}>
                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
                        <div>Mazo: {gameState.deck.length} | Descarte: {gameState.discardPile?.length ?? 0}</div>
                        <div style={{ color: isMyTurn ? '#FFD700' : '#999', fontWeight: 'bold', marginTop: '4px' }}>
                            {isMyTurn && gameState.mustDiscard ? '🗑️ DESCARTA' : isMyTurn ? '🎴 TU TURNO' : `⏳ ${currentTurnPlayer.name}...`}
                        </div>
                        {mode === 'online' && <div style={{ fontSize: '10px', color: '#4CAF50', marginTop: '4px' }}>🌐 Online</div>}
                        {isMyTurn && gameState.mustDiscard && (
                            <div style={{ marginTop: '6px', padding: '4px', background: 'rgba(255,152,0,0.3)', border: '1px solid #FF9800', borderRadius: '4px', fontSize: '10px', textAlign: 'center', color: '#FFB74D', fontWeight: 'bold' }}>
                                Elegí una carta para descartar (máx {HAND_SIZE} en mano)
                            </div>
                        )}
                    </div>

                    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '10px', borderRadius: '10px', fontSize: '12px', border: '2px solid #FFD700' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                            🎯 TU OBJETIVO
                            {realPref && (
                                <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: realPref.difficulty === 'hard' ? '#F44336' : realPref.difficulty === 'normal' ? '#FF9800' : '#4CAF50', color: 'white' }}>
                                    +{realPref.bonus}
                                </span>
                            )}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                            "{myPlayer.preference?.description || '...'}"
                        </div>
                        {combo.length > 0 && (
                            <div style={{ marginTop: '6px', fontSize: '11px', padding: '4px', background: metObjective ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)', borderRadius: '4px', textAlign: 'center', border: `1px solid ${metObjective ? '#4CAF50' : '#F44336'}` }}>
                                {metObjective ? `✅ ¡+${bonusAmt} bonus!` : '❌ No cumplido'}
                            </div>
                        )}
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px', fontSize: '11px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>🏆 Puntajes</div>
                        {gameState.players.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: p.id === myPlayer.id ? '#FFD700' : '#ccc', fontWeight: p.id === myPlayer.id ? 'bold' : 'normal' }}>
                                <span>{p.id === myPlayer.id ? 'Tú' : p.name}</span>
                                <span>{p.score}/{WIN_SCORE}</span>
                            </div>
                        ))}
                    </div>

                    {isMyTurn && (
                        <button onClick={handlePass} style={{ padding: '8px', background: '#FFD700', color: '#000', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                            PASAR TURNO
                        </button>
                    )}

                    <button onClick={() => { if (confirm('¿Seguro que querés salir de la partida?')) onBackToMenu(); }} style={{ padding: '6px', background: 'rgba(255,255,255,0.08)', color: '#999', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', width: '100%', marginTop: 'auto' }}>
                        ← Salir al Menú
                    </button>
                </div>

                {/* CENTER: COMMUNITY COMBO */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#FFD700', textAlign: 'center' }}>
                        🃏 COMBO COMUNITARIO
                    </div>
                    <div style={{
                        display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
                        minHeight: '130px', padding: '16px',
                        border: combo.length === 0 ? '3px dashed rgba(255,255,255,0.2)' : '3px solid rgba(255,215,0,0.5)',
                        borderRadius: '14px',
                        background: combo.length > 0 ? 'rgba(255,215,0,0.06)' : 'transparent',
                        width: '100%', maxWidth: '550px',
                        boxShadow: combo.length > 0 ? '0 0 20px rgba(255,215,0,0.1)' : 'none'
                    }}>
                        {combo.length === 0 ? (
                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                                Juega una carta START para abrir el combo
                            </div>
                        ) : (
                            combo.map(card => <Card key={card.id} card={card} disabled={true} />)
                        )}
                    </div>
                    {combo.length > 0 && (
                        <div style={{ marginTop: '10px', fontSize: '14px', color: '#FFD700', fontWeight: 'bold', textAlign: 'center' }}>
                            {combo.length} cartas → <strong>{potentialScore} pts</strong> si cierras con END
                        </div>
                    )}
                    {combo.length >= 3 && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#FF9800' }}>
                            ⚠️ ¡Cuidado! Otro jugador podría cerrarlo primero
                        </div>
                    )}
                </div>

                {/* RIGHT: Deck and Discard */}
                <div style={{ width: '100px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', borderLeft: '1px solid rgba(255,255,255,0.1)', gap: '15px' }}>

                    {/* Deck */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '10px', marginBottom: '4px', opacity: 0.6 }}>MAZO</div>
                        <div style={{ width: '50px', height: '70px', background: '#c62828', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', boxShadow: '2px 2px 6px rgba(0,0,0,0.3)', border: '2px solid #fff' }}>
                            {gameState.deck.length}
                        </div>
                    </div>

                    {/* Discard Pile */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '10px', marginBottom: '4px', opacity: 0.6 }}>DESCARTE</div>
                        {gameState.discardPile && gameState.discardPile.length > 0 ? (
                            <div style={{ position: 'relative', width: '50px', height: '70px' }}>
                                <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
                                    <Card card={gameState.discardPile[gameState.discardPile.length - 1]} disabled={true} />
                                </div>
                                <div style={{
                                    position: 'absolute', bottom: -5, right: -5,
                                    background: '#333', color: '#fff',
                                    fontSize: '10px', padding: '1px 5px',
                                    borderRadius: '10px', fontWeight: 'bold',
                                    border: '1px solid #777'
                                }}>
                                    {gameState.discardPile.length}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                width: '50px', height: '70px',
                                border: '2px dashed rgba(255,255,255,0.2)',
                                borderRadius: '6px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px', opacity: 0.3
                            }}>
                                🗑️
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== ROW 3: MY HAND ===== */}
            <div style={{ padding: '10px 16px', background: 'rgba(62,39,35,0.8)', borderTop: '3px solid #6d4c41', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {isMyTurn && gameState.mustDiscard ? <span style={{ color: '#FF9800' }}>🗑️ DESCARTÁ UNA CARTA</span> : isMyTurn ? <span style={{ color: '#FFD700' }}>← TU TURNO</span> : <span style={{ color: '#999' }}>Esperando...</span>}
                    </div>
                    <ScoreDisplay score={myPlayer.score} closedChains={myPlayer.closedChains} />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {myPlayer.hand.map((card, index) => (
                        <Card key={card.id} card={card}
                            isPlayable={isMyTurn && (gameState.mustDiscard || isValidMove(combo, card))}
                            onClick={() => handleCardClick(index)}
                            disabled={!isMyTurn}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GameBoard;
