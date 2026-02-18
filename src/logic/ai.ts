import type { GameState, Card } from '../types';
import { isValidMove, calculateComboScore, WIN_SCORE } from './gameEngine';

export type AIDifficulty = 'facil' | 'normal' | 'experta';

export const calculateBestMove = (state: GameState, difficulty: AIDifficulty = 'normal'): number | null => {
    const aiPlayer = state.players[state.currentPlayerIndex];
    const hand = aiPlayer.hand;
    const combo = state.communityCombo; // SHARED combo

    // Filter valid moves
    const validMoves: { index: number; card: Card }[] = [];
    hand.forEach((card, index) => {
        if (isValidMove(combo, card)) {
            validMoves.push({ index, card });
        }
    });

    if (validMoves.length === 0) return null;

    // FACIL: mostly random
    if (difficulty === 'facil') {
        if (Math.random() < 0.4) {
            return validMoves[Math.floor(Math.random() * validMoves.length)].index;
        }
        const endMove = validMoves.find(m => m.card.type === 'END' && combo.length >= 2);
        if (endMove && Math.random() < 0.5) return endMove.index;
        return validMoves[0].index;
    }

    // Check for immediate win
    for (const { index, card } of validMoves) {
        if (card.type === 'END') {
            const pc = [...combo, card];
            const met = aiPlayer.preference.check(pc);
            const pts = calculateComboScore(pc, met);
            if (aiPlayer.score + pts >= WIN_SCORE) return index;
        }
    }

    // Score each move
    let bestMoveIndex = -1;
    let bestScore = -Infinity;
    const isExperta = difficulty === 'experta';

    for (const { index, card } of validMoves) {
        let score = 0;

        if (combo.length === 0) {
            // Must play START
            if (card.type === 'START') {
                score += 100;
                score += (4 - card.value) * (isExperta ? 10 : 3);
            }
        } else if (card.type === 'END') {
            // CLOSE the community combo and steal the points!
            const pc = [...combo, card];
            const met = aiPlayer.preference.check(pc);
            const pts = calculateComboScore(pc, met);

            // Bigger combo = more tempting to close
            if (combo.length >= 4) score += isExperta ? 80 : 50;
            else if (combo.length >= 3) score += isExperta ? 55 : 35;
            else if (combo.length >= 2) score += 20;
            else score += 5;

            if (met) score += isExperta ? 40 : 25;
            if (aiPlayer.score + pts >= WIN_SCORE - 5) score += isExperta ? 60 : 30;

            // Experta: consider that others might close first
            if (isExperta && combo.length >= 3) score += 15; // Don't wait too long

            score += pts * (isExperta ? 2 : 1);
        } else if (card.type === 'EXTENSION') {
            // Extend the community combo (risky: others might close it!)
            if (isExperta) {
                // Be careful: extending helps everyone
                if (combo.length <= 1) score += 20; // Still small, safe to extend
                if (combo.length === 2) score += 12; // Getting risky
                if (combo.length >= 3) score += 3;   // Very risky, someone will close

                // Do I have an END card to close next turn?
                const hasEnd = hand.some(c => c.type === 'END');
                if (hasEnd) score += 15; // I can close next turn
                else score -= 10; // Risky to extend without END

                score += (4 - card.value) * 4;
            } else {
                if (combo.length <= 1) score += 20;
                if (combo.length === 2) score += 15;
                if (combo.length >= 3) score += 8;
                if (card.value <= 2) score += 5;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMoveIndex = index;
        }
    }

    // Normal: 15% random mistake
    if (difficulty === 'normal' && Math.random() < 0.15 && validMoves.length > 1) {
        return validMoves[Math.floor(Math.random() * validMoves.length)].index;
    }

    return bestMoveIndex >= 0 ? bestMoveIndex : null;
};
