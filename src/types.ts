export type CardType = 'START' | 'EXTENSION' | 'END';

export interface Card {
    id: string;
    type: CardType;
    value: 1 | 2 | 3;
}

export interface Preference {
    id: string;
    description: string;
    check: (chain: Card[]) => boolean;
}

export interface Player {
    id: string;
    name: string;
    isAI: boolean;
    hand: Card[];
    preference: Preference;
    score: number;
    closedChains: Card[][];
}

export interface GameState {
    deck: Card[];
    players: Player[];
    currentPlayerIndex: number;
    winner: string | null;
    log: string[];
    tutorialStep: TutorialStep;
    isTutorialActive: boolean;
    communityCombo: Card[];                // Shared combo all players build on
    roundPhase: 'playing' | 'closing';
    roundCloserId: string | null;
    playersToFinish: string[];
}

export type TutorialStep =
    | 'WELCOME'
    | 'EXPLAIN_HAND'
    | 'PLAY_START'
    | 'EXPLAIN_VALUE'
    | 'PLAY_LINK'
    | 'EXPLAIN_END'
    | 'COMPLETED';
