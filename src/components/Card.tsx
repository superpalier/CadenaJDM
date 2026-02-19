import React from 'react';
import type { Card as CardType } from '../types';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    disabled?: boolean;
    isPlayable?: boolean;
    small?: boolean;
}

const Card: React.FC<CardProps> = ({ card, onClick, disabled, isPlayable, small }) => {
    let borderColor = '#333';
    if (card.type === 'START') borderColor = '#2196F3';
    if (card.type === 'EXTENSION') borderColor = '#FF9800';
    if (card.type === 'END') borderColor = '#F44336';
    if (card.type === 'TOMBOLA') borderColor = '#9C27B0'; // Purple for Tombola

    const canClick = !disabled && isPlayable;

    const finalBorder = canClick
        ? (small ? '3px solid #FFD700' : '6px solid #FFD700')
        : `${small ? 2 : 4}px solid ${borderColor}`;

    const finalShadow = canClick
        ? '0 0 25px rgba(255, 215, 0, 0.9), 0 0 15px rgba(255, 215, 0, 0.6), 2px 2px 8px rgba(0,0,0,0.3)'
        : '2px 2px 8px rgba(0,0,0,0.3)';

    const w = small ? '45px' : '90px';
    const h = small ? '65px' : '130px';

    return (
        <div
            onClick={canClick ? onClick : undefined}
            style={{
                width: w,
                height: h,
                background: disabled
                    ? '#e0e0e0'
                    : card.type === 'TOMBOLA'
                        ? 'linear-gradient(135deg, #fff 0%, #ffd700 50%, #fff 100%)' // Shiny Gold
                        : canClick ? '#fffef0' : 'white',
                border: finalBorder,
                borderRadius: small ? '4px' : '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: small ? '3px' : '8px',
                cursor: canClick ? 'pointer' : 'default',
                opacity: disabled ? 0.7 : 1,
                boxShadow: small ? '1px 1px 4px rgba(0,0,0,0.3)' : finalShadow,
                transition: 'all 0.2s',
                transform: canClick ? 'scale(1.05)' : 'scale(1)',
            }}
            onMouseEnter={(e) => canClick && (e.currentTarget.style.transform = 'translateY(-15px) scale(1.1)')}
            onMouseLeave={(e) => canClick && (e.currentTarget.style.transform = 'translateY(0) scale(1.05)')}
        >
            <div style={{ fontSize: small ? '14px' : '28px', fontWeight: 'bold', color: '#000' }}>
                {card.value}
            </div>
            <div style={{ fontSize: small ? '7px' : '10px', fontWeight: 'bold', color: borderColor, textAlign: 'center' }}>
                {card.type}
            </div>
            {!small && (
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#000', transform: 'rotate(180deg)' }}>
                    {card.value}
                </div>
            )}
        </div>
    );
};

export default Card;
