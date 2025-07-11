import { GameMode } from './gameModeTypes';

// Import existing types from the current game structure
export type Piece = 'B' | 'W';

export interface Player {
  userId: string;
  username: string;
  piece: Piece;
  isHost: boolean;
  isReady: boolean;
  connectedAt: Date;
  lastActiveAt: Date;
}

export interface Board {
  boardState: string;
  score: { B: number; W: number };
  currentPlayer: Piece;
  gameStarted: boolean;
  gameFinished: boolean;
  lastMove?: {
    position: number;
    piece: Piece;
    timestamp: Date;
  };
}

// Extended game state to include mode information
export interface GameState {
  // Existing game state properties
  id: string;
  currentPlayer: Piece;
  players: { [userId: string]: Player };
  gameStarted: boolean;
  gameFull: boolean;
  gameFinished: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  board: Board;
  joinUrl: string;

  // New game mode properties
  gameMode: GameMode;
  gameModeState: GameModeState;
  timers?: PlayerTimers;
  challengeState?: ChallengeState;
  tournamentState?: TournamentState;
}

export interface GameModeState {
  phase: 'setup' | 'active' | 'paused' | 'finished';
  startTime: Date;
  endTime?: Date;
  pausedTime?: number;
  moveCount: number;
  lastMoveTime: Date;
  specialConditions: Record<string, any>;
}

export interface PlayerTimers {
  [userId: string]: {
    remainingTime: number; // Time remaining in seconds
    isActive: boolean; // Whether this player's timer is running
    lastMoveTime: Date; // When the last move was made
    totalMoveTime: number; // Total time spent on moves
    moveCount: number; // Number of moves made
    timeWarnings: ('low' | 'critical')[];
  };
}

export interface ChallengeState {
  attemptNumber: number;
  hintsUsed: number;
  score: number;
  startTime: Date;
  moves: number[];
  isCompleted: boolean;
  isFailed: boolean;
}

export interface TournamentState {
  bracketId: string;
  round: number;
  position: number;
  advancement: 'pending' | 'advanced' | 'eliminated';
}

// Game mode specific events for real-time updates
export interface GameModeEvent {
  type: GameModeEventType;
  gameId: string;
  userId?: string;
  timestamp: Date;
  data: any;
}

export type GameModeEventType =
  | 'timer-update'
  | 'timer-warning'
  | 'timer-expired'
  | 'timer-paused'
  | 'timer-resumed'
  | 'challenge-hint-used'
  | 'challenge-attempt-failed'
  | 'challenge-completed'
  | 'board-variant-applied'
  | 'special-rule-triggered'
  | 'tournament-bracket-updated';

// Timer-specific events
export interface TimerUpdateEvent extends GameModeEvent {
  type: 'timer-update';
  data: {
    userId: string;
    remainingTime: number;
    isActive: boolean;
  };
}

export interface TimerWarningEvent extends GameModeEvent {
  type: 'timer-warning';
  data: {
    userId: string;
    warningType: 'low' | 'critical';
    remainingTime: number;
  };
}

export interface TimerExpiredEvent extends GameModeEvent {
  type: 'timer-expired';
  data: {
    userId: string;
    gameResult: 'timeout' | 'forfeit';
  };
}

// Challenge-specific events
export interface ChallengeHintUsedEvent extends GameModeEvent {
  type: 'challenge-hint-used';
  data: {
    hintNumber: number;
    pointsDeducted: number;
    totalHintsUsed: number;
  };
}

export interface ChallengeAttemptFailedEvent extends GameModeEvent {
  type: 'challenge-attempt-failed';
  data: {
    attemptNumber: number;
    remainingAttempts: number;
    failureReason: string;
  };
}

export interface ChallengeCompletedEvent extends GameModeEvent {
  type: 'challenge-completed';
  data: {
    attemptNumber: number;
    hintsUsed: number;
    finalScore: number;
    completionTime: number;
  };
}

// Helper functions for game mode state management
export const createInitialGameModeState = (gameMode: GameMode): GameModeState => {
  return {
    phase: 'setup',
    startTime: new Date(),
    moveCount: 0,
    lastMoveTime: new Date(),
    specialConditions: {},
  };
};

export const createInitialPlayerTimers = (
  players: { [userId: string]: Player },
  gameMode: GameMode,
): PlayerTimers | undefined => {
  if (!gameMode.config.timer) return undefined;

  const timers: PlayerTimers = {};

  Object.keys(players).forEach((userId) => {
    timers[userId] = {
      remainingTime: gameMode.config.timer!.initialTime,
      isActive: false,
      lastMoveTime: new Date(),
      totalMoveTime: 0,
      moveCount: 0,
      timeWarnings: [],
    };
  });

  return timers;
};

export const createInitialChallengeState = (gameMode: GameMode): ChallengeState | undefined => {
  if (!gameMode.config.challenge) return undefined;

  return {
    attemptNumber: 1,
    hintsUsed: 0,
    score: 0,
    startTime: new Date(),
    moves: [],
    isCompleted: false,
    isFailed: false,
  };
};

export const createInitialTournamentState = (gameMode: GameMode): TournamentState | undefined => {
  if (!gameMode.config.tournament) return undefined;

  return {
    bracketId: '',
    round: 1,
    position: 0,
    advancement: 'pending',
  };
};

// Game mode state update functions
export const updateGameModeState = (currentState: GameModeState, update: Partial<GameModeState>): GameModeState => {
  return {
    ...currentState,
    ...update,
    lastMoveTime: new Date(),
  };
};

export const updatePlayerTimer = (
  timers: PlayerTimers,
  userId: string,
  update: Partial<PlayerTimers[string]>,
): PlayerTimers => {
  return {
    ...timers,
    [userId]: {
      ...timers[userId],
      ...update,
    },
  };
};

export const updateChallengeState = (currentState: ChallengeState, update: Partial<ChallengeState>): ChallengeState => {
  return {
    ...currentState,
    ...update,
  };
};

// Game mode state validation functions
export const validateGameModeState = (state: GameModeState): string[] => {
  const errors: string[] = [];

  if (!state.phase) errors.push('Game mode phase is required');
  if (!state.startTime) errors.push('Start time is required');
  if (state.moveCount < 0) errors.push('Move count cannot be negative');
  if (state.pausedTime && state.pausedTime < 0) errors.push('Paused time cannot be negative');

  return errors;
};

export const validatePlayerTimers = (timers: PlayerTimers): string[] => {
  const errors: string[] = [];

  Object.entries(timers).forEach(([userId, timer]) => {
    if (timer.remainingTime < 0) {
      errors.push(`Timer for player ${userId} cannot have negative remaining time`);
    }
    if (timer.totalMoveTime < 0) {
      errors.push(`Timer for player ${userId} cannot have negative total move time`);
    }
    if (timer.moveCount < 0) {
      errors.push(`Timer for player ${userId} cannot have negative move count`);
    }
  });

  return errors;
};

export const validateChallengeState = (state: ChallengeState): string[] => {
  const errors: string[] = [];

  if (state.attemptNumber < 1) errors.push('Attempt number must be at least 1');
  if (state.hintsUsed < 0) errors.push('Hints used cannot be negative');
  if (state.score < 0) errors.push('Score cannot be negative');
  if (!state.startTime) errors.push('Start time is required');
  if (!Array.isArray(state.moves)) errors.push('Moves must be an array');

  return errors;
};

// Game mode state query functions
export const isTimerActive = (timers: PlayerTimers, userId: string): boolean => {
  return timers[userId]?.isActive || false;
};

export const getRemainingTime = (timers: PlayerTimers, userId: string): number => {
  return timers[userId]?.remainingTime || 0;
};

export const hasTimerWarning = (timers: PlayerTimers, userId: string, warningType: 'low' | 'critical'): boolean => {
  return timers[userId]?.timeWarnings.includes(warningType) || false;
};

export const isChallengeCompleted = (challengeState: ChallengeState): boolean => {
  return challengeState.isCompleted;
};

export const isChallengeFailed = (challengeState: ChallengeState): boolean => {
  return challengeState.isFailed;
};

export const getRemainingAttempts = (challengeState: ChallengeState, maxAttempts: number): number => {
  return Math.max(0, maxAttempts - challengeState.attemptNumber);
};

export const getGameDuration = (gameModeState: GameModeState): number => {
  const endTime = gameModeState.endTime || new Date();
  const startTime = gameModeState.startTime;
  const pausedTime = gameModeState.pausedTime || 0;

  return Math.max(0, endTime.getTime() - startTime.getTime() - pausedTime);
};

export const isGameModePhase = (gameModeState: GameModeState, phase: GameModeState['phase']): boolean => {
  return gameModeState.phase === phase;
};

// Game mode state serialization helpers
export const serializeGameModeState = (state: GameModeState): string => {
  return JSON.stringify({
    ...state,
    startTime: state.startTime.toISOString(),
    endTime: state.endTime?.toISOString(),
    lastMoveTime: state.lastMoveTime.toISOString(),
  });
};

export const deserializeGameModeState = (serializedState: string): GameModeState => {
  const parsed = JSON.parse(serializedState);
  return {
    ...parsed,
    startTime: new Date(parsed.startTime),
    endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
    lastMoveTime: new Date(parsed.lastMoveTime),
  };
};

export const serializePlayerTimers = (timers: PlayerTimers): string => {
  const serializable = Object.entries(timers).reduce((acc, [userId, timer]) => {
    acc[userId] = {
      ...timer,
      lastMoveTime: timer.lastMoveTime.toISOString(),
    };
    return acc;
  }, {} as any);

  return JSON.stringify(serializable);
};

export const deserializePlayerTimers = (serializedTimers: string): PlayerTimers => {
  const parsed = JSON.parse(serializedTimers);

  return Object.entries(parsed).reduce((acc, [userId, timer]: [string, any]) => {
    acc[userId] = {
      ...timer,
      lastMoveTime: new Date(timer.lastMoveTime),
    };
    return acc;
  }, {} as PlayerTimers);
};

export const serializeChallengeState = (state: ChallengeState): string => {
  return JSON.stringify({
    ...state,
    startTime: state.startTime.toISOString(),
  });
};

export const deserializeChallengeState = (serializedState: string): ChallengeState => {
  const parsed = JSON.parse(serializedState);
  return {
    ...parsed,
    startTime: new Date(parsed.startTime),
  };
};
