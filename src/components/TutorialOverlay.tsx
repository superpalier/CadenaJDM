import React from 'react';
import type { TutorialStep } from '../types';

interface TutorialOverlayProps {
    step: TutorialStep;
    onNext: () => void;
    onSkip: () => void;
}

const stepsContent: Record<TutorialStep, string> = {
    'WELCOME': 'Bienvenido. Llega a 12 puntos para ganar.',
    'EXPLAIN_HAND': 'Estas son tus cartas. AZUL inicia, NARANJA enlaza, ROJO termina.',
    'PLAY_START': 'Juega una carta AZUL (START) para empezar.',
    'EXPLAIN_VALUE': 'Las cartas deben ser IGUALES o MAYORES que la anterior.',
    'PLAY_LINK': 'Juega una carta NARANJA (EXTENSION) para continuar.',
    'EXPLAIN_END': 'Juega una carta ROJA (END) para obtener puntos.',
    'COMPLETED': 'Listo. ¡Buena suerte!'
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
                maxWidth: '350px',
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

                <p style={{ fontSize: '15px', color: '#333', marginBottom: '16px', lineHeight: '1.4' }}>{text}</p>

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
                            👆 Juega una carta
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TutorialOverlay;
