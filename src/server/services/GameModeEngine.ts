import { GameMode, GameModeConfig, TimerConfig, BoardConfig, ChallengeConfig } from '../../shared/types/gameModeTypes';
import { GameState, PlayerTimer, ChallengeState } from '../../shared/types/gameStateTypes';
import { GameModeRegistry } from './GameModeRegistry';

export interface GameModeEngineConfig {
  gameId: string;
  gameMode: GameMode;
  playerIds: string[];
}

export interface TimerUpdateResult {
  playerId: string;
  timeLeft: number;
  isTimeUp: boolean;
  isWarning: boolean;
  isCritical: boolean;
}

export interface MoveValidationResult {
  isValid: boolean;
  error?: string;
  timeUsed?: number;
}

export interface ChallengeValidationResult {
  isCorrect: boolean;
  isComplete: boolean;
  attemptsUsed: number;
  timeUsed: number;
  hint?: string;
}

export class GameModeEngine {
  private gameId: string;
  private gameMode: GameMode;
  private playerIds: string[];
  private timers: Map<string, PlayerTimer> = new Map();
  private challengeState?: ChallengeState;
  private gameStartTime?: Date;
  private lastMoveTime?: Date;
  private moveCount: number = 0;

  constructor(config: GameModeEngineConfig) {
    this.gameId = config.gameId;
    this.gameMode = config.gameMode;
    this.playerIds = config.playerIds;
    this.initializeEngine();
  }

  /**
   * Initialize the game mode engine based on the game mode configuration
   */
  private initializeEngine(): void {
    // Initialize timers if this is a timer-based game mode
    if (this.gameMode.config.timer) {
      this.initializeTimers();
    }

    // Initialize challenge state if this is a challenge mode
    if (this.gameMode.config.challenge) {
      this.initializeChallengeState();
    }
  }

  /**
   * Initialize timers for all players
   */
  private initializeTimers(): void {
    const timerConfig = this.gameMode.config.timer!;

    for (const playerId of this.playerIds) {
      const timer: PlayerTimer = {
        playerId,
        timeLeft: timerConfig.initialTime,
        increment: timerConfig.increment || 0,
        isActive: false,
        lastUpdateTime: new Date(),
        totalTimeUsed: 0,
        movesCount: 0,
        warningTime: timerConfig.warningTime || 30,
        criticalTime: timerConfig.criticalTime || 10,
        isTimeUp: false,
      };
      this.timers.set(playerId, timer);
    }
  }

  /**
   * Initialize challenge state
   */
  private initializeChallengeState(): void {
    const challengeConfig = this.gameMode.config.challenge!;

    this.challengeState = {
      type: challengeConfig.type,
      attemptsUsed: 0,
      maxAttempts: challengeConfig.maxAttempts || 3,
      timeLimit: challengeConfig.timeLimit,
      startTime: new Date(),
      isCompleted: false,
      isFailed: false,
      currentHint: challengeConfig.difficulty === 'easy' ? 'Look for the best move' : undefined,
      solution: challengeConfig.solution || [],
    };
  }

  /**
   * Start the game and activate appropriate timers
   */
  startGame(currentPlayerId: string): void {
    this.gameStartTime = new Date();
    this.lastMoveTime = new Date();

    // Start timer for the current player if timer mode is enabled
    if (this.gameMode.config.timer) {
      this.activatePlayerTimer(currentPlayerId);
    }
  }

  /**
   * Process a move in the context of the current game mode
   */
  processMove(playerId: string, move: any, nextPlayerId?: string): MoveValidationResult {
    const moveTime = new Date();
    let timeUsed = 0;

    // Handle timer logic
    if (this.gameMode.config.timer) {
      const timerResult = this.updatePlayerTimer(playerId, moveTime);
      timeUsed = timerResult.timeUsed || 0;

      // Check if time is up
      if (timerResult.isTimeUp) {
        return {
          isValid: false,
          error: 'Time is up',
          timeUsed,
        };
      }

      // Switch timers if there's a next player
      if (nextPlayerId) {
        this.deactivatePlayerTimer(playerId);
        this.activatePlayerTimer(nextPlayerId);
      }
    }

    // Handle challenge logic
    if (this.gameMode.config.challenge) {
      const challengeResult = this.validateChallengeMove(move);
      if (!challengeResult.isValid) {
        return {
          isValid: false,
          error: challengeResult.error,
          timeUsed,
        };
      }
    }

    // Handle board variant logic
    if (this.gameMode.config.board) {
      const boardResult = this.validateBoardMove(move);
      if (!boardResult.isValid) {
        return {
          isValid: false,
          error: boardResult.error,
          timeUsed,
        };
      }
    }

    this.moveCount++;
    this.lastMoveTime = moveTime;

    return {
      isValid: true,
      timeUsed,
    };
  }

  /**
   * Activate timer for a specific player
   */
  private activatePlayerTimer(playerId: string): void {
    const timer = this.timers.get(playerId);
    if (timer) {
      timer.isActive = true;
      timer.lastUpdateTime = new Date();
    }
  }

  /**
   * Deactivate timer for a specific player
   */
  private deactivatePlayerTimer(playerId: string): void {
    const timer = this.timers.get(playerId);
    if (timer) {
      timer.isActive = false;
      // Update time left based on time elapsed
      this.updatePlayerTimer(playerId);
    }
  }

  /**
   * Update a player's timer and return the current state
   */
  private updatePlayerTimer(playerId: string, currentTime: Date = new Date()): TimerUpdateResult {
    const timer = this.timers.get(playerId);
    if (!timer) {
      throw new Error(`Timer not found for player ${playerId}`);
    }

    const timeElapsed = Math.floor((currentTime.getTime() - timer.lastUpdateTime.getTime()) / 1000);
    let timeUsed = 0;

    if (timer.isActive) {
      timeUsed = timeElapsed;
      timer.timeLeft = Math.max(0, timer.timeLeft - timeElapsed);
      timer.totalTimeUsed += timeElapsed;
      timer.movesCount++;

      // Add increment after move (for increment timer types)
      if (this.gameMode.config.timer?.type === 'increment') {
        timer.timeLeft += timer.increment;
      }
    }

    timer.lastUpdateTime = currentTime;
    timer.isTimeUp = timer.timeLeft <= 0;

    return {
      playerId,
      timeLeft: timer.timeLeft,
      isTimeUp: timer.isTimeUp,
      isWarning: timer.timeLeft <= timer.warningTime && timer.timeLeft > timer.criticalTime,
      isCritical: timer.timeLeft <= timer.criticalTime && timer.timeLeft > 0,
      timeUsed,
    };
  }

  /**
   * Validate a move in challenge mode
   */
  private validateChallengeMove(move: any): { isValid: boolean; error?: string } {
    if (!this.challengeState) {
      return { isValid: true };
    }

    // Check if challenge is already completed or failed
    if (this.challengeState.isCompleted || this.challengeState.isFailed) {
      return { isValid: false, error: 'Challenge already completed or failed' };
    }

    // Check time limit
    if (this.challengeState.timeLimit) {
      const timeElapsed = Math.floor((new Date().getTime() - this.challengeState.startTime.getTime()) / 1000);
      if (timeElapsed > this.challengeState.timeLimit) {
        this.challengeState.isFailed = true;
        return { isValid: false, error: 'Time limit exceeded' };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate a move for board variants
   */
  private validateBoardMove(move: any): { isValid: boolean; error?: string } {
    const boardConfig = this.gameMode.config.board;
    if (!boardConfig) {
      return { isValid: true };
    }

    // Check if move is within board boundaries
    if (move.row < 0 || move.row >= boardConfig.size || move.col < 0 || move.col >= boardConfig.size) {
      return { isValid: false, error: 'Move is outside board boundaries' };
    }

    return { isValid: true };
  }

  /**
   * Get current timer states for all players
   */
  getTimerStates(): Map<string, TimerUpdateResult> {
    const states = new Map<string, TimerUpdateResult>();

    for (const playerId of this.playerIds) {
      const result = this.updatePlayerTimer(playerId);
      states.set(playerId, result);
    }

    return states;
  }

  /**
   * Get current challenge state
   */
  getChallengeState(): ChallengeState | undefined {
    return this.challengeState;
  }

  /**
   * Handle challenge attempt
   */
  attemptChallenge(move: any): ChallengeValidationResult {
    if (!this.challengeState) {
      throw new Error('No challenge state available');
    }

    this.challengeState.attemptsUsed++;
    const timeUsed = Math.floor((new Date().getTime() - this.challengeState.startTime.getTime()) / 1000);

    // Check if this is the correct solution
    const isCorrect = this.validateChallengeSolution(move);

    if (isCorrect) {
      this.challengeState.isCompleted = true;
      return {
        isCorrect: true,
        isComplete: true,
        attemptsUsed: this.challengeState.attemptsUsed,
        timeUsed,
      };
    }

    // Check if attempts are exhausted
    if (this.challengeState.attemptsUsed >= this.challengeState.maxAttempts) {
      this.challengeState.isFailed = true;
      return {
        isCorrect: false,
        isComplete: false,
        attemptsUsed: this.challengeState.attemptsUsed,
        timeUsed,
        hint: 'No more attempts remaining',
      };
    }

    // Provide hint based on attempt number
    let hint: string | undefined;
    if (this.challengeState.attemptsUsed === 1) {
      hint = 'Consider corner moves for better position';
    } else if (this.challengeState.attemptsUsed === 2) {
      hint = 'Look for moves that flip the most pieces';
    }

    return {
      isCorrect: false,
      isComplete: false,
      attemptsUsed: this.challengeState.attemptsUsed,
      timeUsed,
      hint,
    };
  }

  /**
   * Validate if the attempted move matches the challenge solution
   */
  private validateChallengeSolution(move: any): boolean {
    if (!this.challengeState?.solution || this.challengeState.solution.length === 0) {
      return false;
    }

    // Simple validation - check if move matches the expected solution
    const expectedMove = this.challengeState.solution[0];
    return move.row === expectedMove.row && move.col === expectedMove.col;
  }

  /**
   * Pause all timers
   */
  pauseTimers(): void {
    for (const [playerId, timer] of this.timers) {
      if (timer.isActive) {
        this.updatePlayerTimer(playerId);
        timer.isActive = false;
      }
    }
  }

  /**
   * Resume timers for the current player
   */
  resumeTimers(currentPlayerId: string): void {
    this.activatePlayerTimer(currentPlayerId);
  }

  /**
   * Get game statistics
   */
  getGameStatistics(): {
    gameId: string;
    gameMode: GameMode;
    gameStartTime?: Date;
    lastMoveTime?: Date;
    moveCount: number;
    totalGameTime: number;
    playerStats: Array<{
      playerId: string;
      totalTimeUsed: number;
      movesCount: number;
      averageTimePerMove: number;
      timeLeft: number;
    }>;
  } {
    const currentTime = new Date();
    const totalGameTime = this.gameStartTime
      ? Math.floor((currentTime.getTime() - this.gameStartTime.getTime()) / 1000)
      : 0;

    const playerStats = this.playerIds.map((playerId) => {
      const timer = this.timers.get(playerId);
      return {
        playerId,
        totalTimeUsed: timer?.totalTimeUsed || 0,
        movesCount: timer?.movesCount || 0,
        averageTimePerMove: timer?.movesCount ? timer.totalTimeUsed / timer.movesCount : 0,
        timeLeft: timer?.timeLeft || 0,
      };
    });

    return {
      gameId: this.gameId,
      gameMode: this.gameMode,
      gameStartTime: this.gameStartTime,
      lastMoveTime: this.lastMoveTime,
      moveCount: this.moveCount,
      totalGameTime,
      playerStats,
    };
  }

  /**
   * Check if the game should end based on game mode rules
   */
  shouldEndGame(): { shouldEnd: boolean; reason?: string; winner?: string } {
    // Check timer conditions if timers are enabled
    if (this.gameMode.config.timer && this.timers.size > 0) {
      const timerStates = this.getTimerStates();
      for (const [playerId, timerState] of timerStates) {
        if (timerState.isTimeUp) {
          const otherPlayerId = this.playerIds.find((id) => id !== playerId);
          return {
            shouldEnd: true,
            reason: 'time_up',
            winner: otherPlayerId,
          };
        }
      }
    }

    // Check challenge conditions
    if (this.challengeState?.isFailed) {
      return {
        shouldEnd: true,
        reason: 'challenge_failed',
      };
    }

    if (this.challengeState?.isCompleted) {
      return {
        shouldEnd: true,
        reason: 'challenge_completed',
      };
    }

    return { shouldEnd: false };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.timers.clear();
    this.challengeState = undefined;
  }
}
