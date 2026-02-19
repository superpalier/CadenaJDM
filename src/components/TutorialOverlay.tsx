import React from 'react';
import type { TutorialStep } from '../types';

interface TutorialOverlayProps {
    step: TutorialStep;
    onNext: () => void;
    onSkip: () => void;
}

const stepsContent: Record<TutorialStep, string> = {
    'WELCOME': '¡Bienvenido a Cadena JDM! Primer jugador en llegar a 100 puntos gana. Construyan el combo comunitario entre todos, ¡y el que lo cierre se lleva los puntos!',
    'EXPLAIN_HAND': 'Tenés 5 cartas. AZUL (START) inicia un combo, NARANJA (EXTENSION) lo agranda, y ROJO (END) lo cierra. Los valores van del 1 al 3.',
    'PLAY_START': '👆 Jugá una carta AZUL (START) para iniciar el combo comunitario.',
    'EXPLAIN_VALUE': 'Cada carta que agregues debe tener un valor IGUAL o MAYOR a la anterior. ¡Armá un combo largo para más puntos!',
    'PLAY_LINK': '👆 Jugá una carta NARANJA (EXTENSION) para agrandar el combo.',
    'EXPLAIN_END': 'Jugá una carta ROJA (END) para cerrar el combo. Sumás los valores de todas las cartas + bonus si cumpliste tu objetivo secreto. ¡Cerrar = nueva ronda!',
    'COMPLETED': '¡Listo! Si tenés más de 5 cartas, descartá una. Si el mazo se acaba, se mezcla la pila de descarte. ¡Buena suerte!'
};

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onSkip }) => {
    const text = stepsContent[step];
    if (!text) return null;

    const needsInput = step === 'PLAY_START' || step === 'PLAY_LINK';

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
            pointerEvents: 'auto'
        }}>
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                maxWidth: '380px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                border: '3px solid #FFD700'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '18px', color: '#000', margin: 0, fontWeight: 'bold' }}>Tutorial</h3>
                    <button
                        onClick={onSkip}
                        style={{
                            padding: '6px 12px',
                            background: '#e0e0e0',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Cerrar
                    </button>
                </div>

                <p style={{ fontSize: '14px', color: '#333', marginBottom: '16px', lineHeight: '1.5' }}>{text}</p>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {!needsInput && step !== 'COMPLETED' && (
                        <button
                            onClick={onNext}
                            style={{
                                padding: '10px 20px',
                                background: '#1976D2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Siguiente →
                        </button>
                    )}

                    {step === 'COMPLETED' && (
                        <button
                            onClick={onNext}
                            style={{
                                padding: '10px 20px',
                                background: '#4CAF50',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ¡Empezar!
                        </button>
                    )}

                    {needsInput && (
                        <div style={{
                            padding: '10px 20px',
                            background: '#e3f2fd',
                            color: '#1976D2',
                            border: '2px solid #1976D2',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}>
                            👆 Jugá una carta
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TutorialOverlay;
