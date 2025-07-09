import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Game } from './Game';
import { TimerConfig } from '../../shared/types/gameModeTypes';
import { ConnectedUser } from './UserManager';
import { latencyCompensation } from '../services/LatencyCompensation';

// Mock the latency compensation service
vi.mock('../services/LatencyCompensation', () => ({
  latencyCompensation: {
    getLatencyEstimate: vi.fn(() => 100),
    getNetworkQuality: vi.fn(() => 'good'),
    clearUserMeasurements: vi.fn(),
  },
}));

describe('Game Timer Functionality', () => {
  let game: Game;
  let timerConfig: TimerConfig;
  let mockUser1: ConnectedUser;
  let mockUser2: ConnectedUser;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    timerConfig = {
      type: 'increment',
      initialTime: 300, // 5 minutes
      increment: 5,
      delay: 0,
      maxTime: 600,
      lowTimeWarning: 60,
      criticalTimeWarning: 15,
      autoFlagOnTimeout: true,
      pauseOnDisconnect: true,
      maxPauseTime: 300,
      timeoutAction: 'forfeit',
    };

    mockUser1 = {
      userId: 'user1',
      name: 'Player 1',
      connected: true,
    };

    mockUser2 = {
      userId: 'user2',
      name: 'Player 2',
      connected: true,
    };

    game = new Game('test-mode', timerConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Timer Initialization', () => {
    it('should initialize with timer state when config provided', () => {
      expect(game.timerState).toBeDefined();
      expect(game.timerState?.config).toEqual(timerConfig);
      expect(game.timerState?.playerTimers).toEqual({});
      expect(game.timerState?.isGamePaused).toBe(false);
    });

    it('should not initialize timer state without config', () => {
      const gameWithoutTimer = new Game();
      expect(gameWithoutTimer.timerState).toBeUndefined();
    });

    it('should initialize player timers when game starts', () => {
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();

      expect(game.timerState?.playerTimers.user1).toBeDefined();
      expect(game.timerState?.playerTimers.user2).toBeDefined();
      expect(game.timerState?.playerTimers.user1.remainingTime).toBe(300);
      expect(game.timerState?.playerTimers.user2.remainingTime).toBe(300);
    });
  });

  describe('Timer State Management', () => {
    beforeEach(() => {
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();
    });

    it('should start timer for current player', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      expect(currentPlayerUserId).toBeDefined();
      expect(game.timerState?.playerTimers[currentPlayerUserId!].isActive).toBe(true);
    });

    it('should update timer state correctly', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);
      game.updatePlayerTimerState(currentPlayerUserId!, new Date());

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      expect(playerTimer?.remainingTime).toBeLessThan(300);
      expect(playerTimer?.totalMoveTime).toBeGreaterThan(0);
    });

    it('should pause timer on disconnect', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      game.pausePlayerTimer(currentPlayerUserId!);

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      expect(playerTimer?.isPaused).toBe(true);
      expect(playerTimer?.pausedAt).toBeDefined();
    });

    it('should resume timer on reconnection', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      game.pausePlayerTimer(currentPlayerUserId!);
      vi.advanceTimersByTime(2000);
      game.resumePlayerTimer(currentPlayerUserId!);

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      expect(playerTimer?.isPaused).toBe(false);
      expect(playerTimer?.pausedAt).toBeUndefined();
      expect(playerTimer?.totalPausedTime).toBe(2);
    });
  });

  describe('Timer Warnings', () => {
    beforeEach(() => {
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();
    });

    it('should track low time warnings', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Manually set remaining time to trigger low warning
      if (game.timerState?.playerTimers[currentPlayerUserId!]) {
        game.timerState.playerTimers[currentPlayerUserId!].remainingTime = 50;
      }

      game.checkTimeWarnings(currentPlayerUserId!);

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      expect(playerTimer?.timeWarnings).toContain('low');
    });

    it('should track critical time warnings', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Manually set remaining time to trigger critical warning
      if (game.timerState?.playerTimers[currentPlayerUserId!]) {
        game.timerState.playerTimers[currentPlayerUserId!].remainingTime = 10;
      }

      game.checkTimeWarnings(currentPlayerUserId!);

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      expect(playerTimer?.timeWarnings).toContain('critical');
    });

    it('should not duplicate warnings', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Manually set remaining time to trigger low warning
      if (game.timerState?.playerTimers[currentPlayerUserId!]) {
        game.timerState.playerTimers[currentPlayerUserId!].remainingTime = 50;
      }

      game.checkTimeWarnings(currentPlayerUserId!);
      game.checkTimeWarnings(currentPlayerUserId!);

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      expect(playerTimer?.timeWarnings.filter((w) => w === 'low')).toHaveLength(1);
    });
  });

  describe('Timer Expiration and Timeout Handling', () => {
    beforeEach(() => {
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();
    });

    it('should handle timeout with forfeit action', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Set up timeout conditions
      if (game.timerState?.playerTimers[currentPlayerUserId!]) {
        game.timerState.playerTimers[currentPlayerUserId!].remainingTime = 0;
      }

      game.handlePlayerTimeout(currentPlayerUserId!);

      expect(game.gameFinished).toBe(true);
    });

    it('should handle timeout with auto_pass action', () => {
      timerConfig.timeoutAction = 'auto_pass';
      game = new Game('test-mode', timerConfig);
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();

      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Mock board to have no valid moves
      game.board.updateNextMoves = vi.fn().mockReturnValue(false);

      game.handlePlayerTimeout(currentPlayerUserId!);

      expect(game.gameFinished).toBe(true);
    });

    it('should handle timeout with auto_move action', () => {
      timerConfig.timeoutAction = 'auto_move';
      timerConfig.autoMoveStrategy = 'random';
      game = new Game('test-mode', timerConfig);
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();

      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Mock board to have valid moves by setting board state with '0' positions
      game.board.canPlacePiece = vi.fn().mockReturnValue(true);
      // Mock nextMoves by modifying board state to have '0' at specific positions
      const originalBoardState = game.board.boardState;
      const boardArray = originalBoardState.split('\n').join('').split('');
      boardArray[10] = '0';
      boardArray[20] = '0';
      boardArray[30] = '0';
      game.board.boardState = boardArray
        .join('')
        .match(/.{1,8}/g)!
        .join('\n');

      const originalPlacePiece = game.placePiece;
      game.placePiece = vi.fn().mockReturnValue({ success: true });

      game.handlePlayerTimeout(currentPlayerUserId!);

      expect(game.placePiece).toHaveBeenCalled();
    });
  });

  describe('Time Increment', () => {
    beforeEach(() => {
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();
    });

    it('should apply time increment after move', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      const initialTime = game.timerState?.playerTimers[currentPlayerUserId!].remainingTime;

      game.applyTimeIncrement(currentPlayerUserId!);

      const newTime = game.timerState?.playerTimers[currentPlayerUserId!].remainingTime;
      expect(newTime).toBe(initialTime! + 5); // increment
    });

    it('should not exceed max time with increment', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Set time close to max
      if (game.timerState?.playerTimers[currentPlayerUserId!]) {
        game.timerState.playerTimers[currentPlayerUserId!].remainingTime = 599;
      }

      game.applyTimeIncrement(currentPlayerUserId!);

      const newTime = game.timerState?.playerTimers[currentPlayerUserId!].remainingTime;
      expect(newTime).toBe(600); // Should cap at maxTime
    });

    it('should increment move count', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      game.applyTimeIncrement(currentPlayerUserId!);

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      expect(playerTimer?.moveCount).toBe(1);
    });
  });

  describe('Latency Compensation', () => {
    beforeEach(() => {
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();
    });

    it('should apply latency compensation to timer updates', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Mock latency compensation to return specific values
      (latencyCompensation.getLatencyEstimate as any).mockReturnValue(100);
      (latencyCompensation.getNetworkQuality as any).mockReturnValue('good');

      vi.advanceTimersByTime(5000);
      game.updatePlayerTimerState(currentPlayerUserId!, new Date());

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      // Should have applied latency compensation
      expect(playerTimer?.remainingTime).toBeGreaterThan(295 - 0.1); // 5 seconds - 100ms latency compensation
    });

    it('should provide compensated timer state', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      const compensatedState = game.getCompensatedTimerState(currentPlayerUserId!);

      expect(compensatedState).toBeDefined();
      expect(compensatedState?.userId).toBe(currentPlayerUserId);
      expect(compensatedState?.remainingTime).toBeDefined();
    });

    it('should clear latency data on player disconnect', () => {
      game.removePlayer(mockUser1);

      expect(latencyCompensation.clearUserMeasurements).toHaveBeenCalledWith(mockUser1.userId);
    });
  });

  describe('Timer Utilities', () => {
    beforeEach(() => {
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();
    });

    it('should check if timer is enabled', () => {
      expect(game.isTimerEnabled()).toBe(true);
    });

    it('should return false for unlimited timer', () => {
      timerConfig.type = 'unlimited';
      const unlimitedGame = new Game('test-mode', timerConfig);
      expect(unlimitedGame.isTimerEnabled()).toBe(false);
    });

    it('should get all timer states', () => {
      const timerStates = game.getAllTimerStates();

      expect(timerStates.user1).toBeDefined();
      expect(timerStates.user2).toBeDefined();
    });

    it('should handle pause time exceeded', () => {
      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // First pause the player
      game.pausePlayerTimer(currentPlayerUserId!);

      // Set total paused time to exceed limit (400 > 300 max)
      if (game.timerState?.playerTimers[currentPlayerUserId!]) {
        game.timerState.playerTimers[currentPlayerUserId!].totalPausedTime = 400;
      }

      // Resume should trigger timeout due to exceeded pause time
      game.resumePlayerTimer(currentPlayerUserId!);

      expect(game.gameFinished).toBe(true);
    });
  });

  describe('Automatic Move Strategies', () => {
    beforeEach(() => {
      timerConfig.timeoutAction = 'auto_move';
      game = new Game('test-mode', timerConfig);
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();
    });

    it('should select random move', () => {
      const validMoves = [10, 20, 30, 40];
      const selected = game['selectRandomMove'](validMoves);

      expect(validMoves).toContain(selected);
    });

    it('should prefer corner moves in best_corner strategy', () => {
      const validMoves = [0, 7, 10, 56, 63]; // Include corners (0, 7, 56, 63)
      const selected = game['selectBestCornerMove'](validMoves);

      expect([0, 7, 56, 63]).toContain(selected);
    });

    it('should prefer edge moves in best_edge strategy', () => {
      const validMoves = [1, 8, 15, 48, 55]; // Edge moves
      const selected = game['selectBestEdgeMove'](validMoves);

      expect(validMoves).toContain(selected);
    });

    it('should identify edge moves correctly', () => {
      expect(game['isEdgeMove'](0, 8)).toBe(true); // Top-left corner
      expect(game['isEdgeMove'](7, 8)).toBe(true); // Top-right corner
      expect(game['isEdgeMove'](1, 8)).toBe(true); // Top edge
      expect(game['isEdgeMove'](8, 8)).toBe(true); // Left edge
      expect(game['isEdgeMove'](27, 8)).toBe(false); // Center
    });
  });

  describe('Edge Cases', () => {
    it('should handle timer operations when timer is disabled', () => {
      const gameWithoutTimer = new Game();
      gameWithoutTimer.addOrUpdatePlayer(mockUser1);
      gameWithoutTimer.addOrUpdatePlayer(mockUser2);
      gameWithoutTimer.startGame();

      // Should not throw errors
      expect(() => gameWithoutTimer.startPlayerTimer(mockUser1.userId)).not.toThrow();
      expect(() => gameWithoutTimer.pausePlayerTimer(mockUser1.userId)).not.toThrow();
      expect(() => gameWithoutTimer.resumePlayerTimer(mockUser1.userId)).not.toThrow();
    });

    it('should handle timer operations with invalid user', () => {
      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();

      // Should not throw errors
      expect(() => game.startPlayerTimer('invalid-user')).not.toThrow();
      expect(() => game.pausePlayerTimer('invalid-user')).not.toThrow();
      expect(() => game.resumePlayerTimer('invalid-user')).not.toThrow();
    });

    it('should handle compensation for unknown network quality', () => {
      (latencyCompensation.getNetworkQuality as any).mockReturnValue('unknown');

      game.addOrUpdatePlayer(mockUser1);
      game.addOrUpdatePlayer(mockUser2);
      game.startGame();

      const currentPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );

      // Should use raw elapsed time without compensation
      vi.advanceTimersByTime(5000);
      game.updatePlayerTimerState(currentPlayerUserId!, new Date());

      const playerTimer = game.timerState?.playerTimers[currentPlayerUserId!];
      expect(playerTimer?.remainingTime).toBe(295); // 5 seconds without compensation
    });
  });
});
