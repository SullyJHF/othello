// Base game mode interface
export interface GameMode {
  id: string; // Unique identifier (e.g., 'blitz-3-0', 'classic-8x8')
  name: string; // Display name (e.g., 'Blitz 3+0')
  description: string; // User-friendly description
  category: GameModeCategory; // Category for UI organization
  config: GameModeConfig; // Mode-specific configuration
  isActive: boolean; // Whether mode is available for selection
  isDefault: boolean; // Whether this is the default mode
  minimumPlayers: number; // Always 2 for Othello
  maximumPlayers: number; // Always 2 for Othello
  estimatedDuration: number; // Estimated game duration in minutes
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags: string[]; // For filtering and search
  createdAt: Date;
  updatedAt: Date;
}

export type GameModeCategory =
  | 'timer' // Chess-style time controls
  | 'board-variant' // Different board sizes
  | 'special' // Special rules or win conditions
  | 'daily-challenge' // Daily puzzles and challenges
  | 'tournament'; // Tournament-style play

// Comprehensive configuration object
export interface GameModeConfig {
  timer?: TimerConfig;
  board?: BoardConfig;
  rules?: RulesConfig;
  challenge?: ChallengeConfig;
  tournament?: TournamentConfig;
  ui?: UIConfig;
}

// Timer configuration for chess-style games
export interface TimerConfig {
  type: 'increment' | 'delay' | 'fixed' | 'correspondence' | 'unlimited';
  initialTime: number; // Initial time in seconds
  increment: number; // Increment per move in seconds
  delay: number; // Delay before timer starts (Fischer delay)
  maxTime: number; // Maximum time that can be accumulated
  lowTimeWarning: number; // Seconds at which to show warning
  criticalTimeWarning: number; // Seconds at which to show critical warning
  autoFlagOnTimeout: boolean; // Whether to auto-end game on timeout
  pauseOnDisconnect: boolean; // Whether to pause timer on disconnect
  maxPauseTime: number; // Maximum pause time allowed
  timeoutAction: 'forfeit' | 'auto_pass' | 'auto_move'; // What to do when time runs out
  autoMoveStrategy?: 'random' | 'best_corner' | 'best_edge'; // Strategy for auto moves
}

// Board configuration for different variants
export interface BoardConfig {
  width: number; // Board width (6-12)
  height: number; // Board height (6-12)
  startingPosition: string; // Custom starting position (optional)
  validSizes: number[]; // Valid board sizes for this mode
  customRules: BoardRule[]; // Custom board rules
}

export interface BoardRule {
  id: string;
  name: string;
  description: string;
  affects: 'placement' | 'scoring' | 'movement' | 'victory';
  implementation: string; // Code or config for rule implementation
}

// Game rules configuration
export interface RulesConfig {
  allowPass: boolean; // Whether passing is allowed
  passConsumesTime: boolean; // Whether passing uses time
  maxPasses: number; // Maximum consecutive passes before game ends
  scoringMethod: 'standard' | 'territory' | 'captures' | 'custom';
  winCondition: 'most-pieces' | 'first-to-score' | 'control-center' | 'custom';
  customWinCondition?: {
    type: string;
    parameters: Record<string, string | number | boolean>;
  };
}

// Challenge configuration for daily puzzles
export interface ChallengeConfig {
  type: 'tactical' | 'endgame' | 'opening' | 'puzzle' | 'scenario';
  difficulty: 1 | 2 | 3 | 4 | 5;
  maxAttempts: number;
  timeLimit?: number; // Time limit in seconds (optional)
  hints: ChallengeHint[];
  solution: ChallengeSolution;
  tags: string[];
}

export interface ChallengeHint {
  order: number;
  text: string;
  cost: number; // Points deducted for using hint
}

export interface ChallengeSolution {
  moves: number[]; // Sequence of moves that solve the puzzle
  explanation: string; // Explanation of the solution
  alternativeSolutions?: number[][]; // Alternative correct solutions
}

// Tournament configuration
export interface TournamentConfig {
  format: 'single-elimination' | 'double-elimination' | 'round-robin' | 'swiss';
  rounds: number;
  timePerRound: number;
  bracketSize: number;
  advancementRules: string;
}

// UI configuration for mode-specific display
export interface UIConfig {
  theme: 'default' | 'blitz' | 'classical' | 'puzzle' | 'tournament';
  showTimer: boolean;
  showMoveHistory: boolean;
  showEvaluation: boolean;
  customStyles?: Record<string, string>;
}

// Predefined game mode templates
export const GAME_MODE_TEMPLATES = {
  // Timer-based modes
  BULLET: {
    category: 'timer' as GameModeCategory,
    config: {
      timer: {
        type: 'increment' as const,
        initialTime: 60, // 1 minute
        increment: 1,
        delay: 0,
        maxTime: 180,
        lowTimeWarning: 10,
        criticalTimeWarning: 5,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: false,
        maxPauseTime: 0,
        timeoutAction: 'forfeit' as const,
      },
      ui: {
        theme: 'blitz' as const,
        showTimer: true,
        showMoveHistory: false,
        showEvaluation: false,
      },
    },
  },
  BLITZ: {
    category: 'timer' as GameModeCategory,
    config: {
      timer: {
        type: 'increment' as const,
        initialTime: 180, // 3 minutes
        increment: 2,
        delay: 0,
        maxTime: 300,
        lowTimeWarning: 30,
        criticalTimeWarning: 10,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: true,
        maxPauseTime: 60,
        timeoutAction: 'forfeit' as const,
      },
      ui: {
        theme: 'blitz' as const,
        showTimer: true,
        showMoveHistory: true,
        showEvaluation: false,
      },
    },
  },
  RAPID: {
    category: 'timer' as GameModeCategory,
    config: {
      timer: {
        type: 'increment' as const,
        initialTime: 600, // 10 minutes
        increment: 5,
        delay: 0,
        maxTime: 900,
        lowTimeWarning: 60,
        criticalTimeWarning: 30,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: true,
        maxPauseTime: 300,
        timeoutAction: 'auto_pass' as const,
      },
      ui: {
        theme: 'default' as const,
        showTimer: true,
        showMoveHistory: true,
        showEvaluation: true,
      },
    },
  },
  CLASSICAL: {
    category: 'timer' as GameModeCategory,
    config: {
      timer: {
        type: 'increment' as const,
        initialTime: 1800, // 30 minutes
        increment: 30,
        delay: 0,
        maxTime: 3600,
        lowTimeWarning: 300,
        criticalTimeWarning: 60,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: true,
        maxPauseTime: 600,
        timeoutAction: 'auto_move' as const,
        autoMoveStrategy: 'best_corner' as const,
      },
      ui: {
        theme: 'classical' as const,
        showTimer: true,
        showMoveHistory: true,
        showEvaluation: true,
      },
    },
  },
  // Board variant modes
  MINI_BOARD: {
    category: 'board-variant' as GameModeCategory,
    config: {
      board: {
        width: 6,
        height: 6,
        startingPosition: '......\n......\n..0...\n..WB..\n..BW..\n...0..\n......\n......',
        validSizes: [6],
        customRules: [],
      },
      ui: {
        theme: 'default' as const,
        showTimer: false,
        showMoveHistory: true,
        showEvaluation: false,
      },
    },
  },
  LARGE_BOARD: {
    category: 'board-variant' as GameModeCategory,
    config: {
      board: {
        width: 10,
        height: 10,
        startingPosition:
          '..........\n..........\n..........\n..........\n....0.....\n...0WB....\n....BW0...\n.....0....\n..........\n..........',
        validSizes: [10],
        customRules: [],
      },
      ui: {
        theme: 'default' as const,
        showTimer: false,
        showMoveHistory: true,
        showEvaluation: false,
      },
    },
  },
  // Daily challenge template
  DAILY_CHALLENGE: {
    category: 'daily-challenge' as GameModeCategory,
    config: {
      challenge: {
        type: 'tactical' as const,
        difficulty: 3,
        maxAttempts: 3,
        timeLimit: 300, // 5 minutes
        hints: [],
        solution: {
          moves: [],
          explanation: '',
        },
        tags: ['daily', 'tactical'],
      },
      ui: {
        theme: 'puzzle' as const,
        showTimer: true,
        showMoveHistory: true,
        showEvaluation: false,
      },
    },
  },
} as const;

// Type guards for game mode configuration
export const isTimerMode = (config: GameModeConfig): config is GameModeConfig & { timer: TimerConfig } => {
  return config.timer !== undefined;
};

export const isBoardVariantMode = (config: GameModeConfig): config is GameModeConfig & { board: BoardConfig } => {
  return config.board !== undefined;
};

export const isChallengeMode = (config: GameModeConfig): config is GameModeConfig & { challenge: ChallengeConfig } => {
  return config.challenge !== undefined;
};

export const isTournamentMode = (
  config: GameModeConfig,
): config is GameModeConfig & { tournament: TournamentConfig } => {
  return config.tournament !== undefined;
};

// Helper functions for game mode validation
export const validateGameMode = (gameMode: Partial<GameMode>): string[] => {
  const errors: string[] = [];

  if (!gameMode.id) errors.push('Game mode ID is required');
  if (!gameMode.name) errors.push('Game mode name is required');
  if (!gameMode.description) errors.push('Game mode description is required');
  if (!gameMode.category) errors.push('Game mode category is required');
  if (!gameMode.config) errors.push('Game mode config is required');

  if (gameMode.minimumPlayers !== 2) errors.push('Minimum players must be 2 for Othello');
  if (gameMode.maximumPlayers !== 2) errors.push('Maximum players must be 2 for Othello');

  if (gameMode.estimatedDuration && gameMode.estimatedDuration <= 0) {
    errors.push('Estimated duration must be positive');
  }

  return errors;
};

export const createGameModeFromTemplate = (
  template: (typeof GAME_MODE_TEMPLATES)[keyof typeof GAME_MODE_TEMPLATES],
  overrides: Partial<GameMode> = {},
): Partial<GameMode> => {
  return {
    category: template.category,
    config: template.config,
    minimumPlayers: 2,
    maximumPlayers: 2,
    isActive: true,
    isDefault: false,
    tags: [],
    ...overrides,
  };
};
