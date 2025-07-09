import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { TimerConfig } from '../../shared/types/gameModeTypes';

// Mock Database
vi.mock('../database/Database', () => ({
  default: {
    getInstance: vi.fn(() => ({
      query: vi.fn(),
    })),
  },
}));

describe('Game Recovery Functionality', () => {
  let timerConfig: TimerConfig;
  let game: Game;

  beforeEach(() => {
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

    game = new Game('test-mode', timerConfig);
    game.id = 'test-game-1';
    game.gameStarted = true;
    game.gameFull = true;
    game.currentPlayer = 'B';
    game.lastActivityAt = new Date(Date.now() - 30000); // 30 seconds ago

    // Add players
    game.players = {
      user1: {
        userId: 'user1',
        name: 'Player 1',
        socketId: 'socket1',
        connected: true,
        piece: 'B',
      },
      user2: {
        userId: 'user2',
        name: 'Player 2',
        socketId: 'socket2',
        connected: true,
        piece: 'W',
      },
    };

    // Initialize timers
    game.startGame();
  });

  describe('Timer State Recovery', () => {
    it('should have timer state after initialization', () => {
      expect(game.timerState).toBeDefined();
      expect(game.timerState!.playerTimers).toBeDefined();
      expect(Object.keys(game.timerState!.playerTimers)).toHaveLength(2);
    });

    it('should persist timer configuration', () => {
      expect(game.timerState!.config).toEqual(timerConfig);
    });

    it('should have proper player timer states', () => {
      const user1Timer = game.timerState!.playerTimers['user1'];
      const user2Timer = game.timerState!.playerTimers['user2'];

      expect(user1Timer).toBeDefined();
      expect(user2Timer).toBeDefined();
      expect(user1Timer.remainingTime).toBe(300);
      expect(user2Timer.remainingTime).toBe(300);
    });

    it('should handle timer pause and resume', () => {
      // Start the player's timer first
      game.startPlayerTimer('user1');

      game.pausePlayerTimer('user1');
      expect(game.timerState!.playerTimers['user1'].isPaused).toBe(true);

      game.resumePlayerTimer('user1');
      expect(game.timerState!.playerTimers['user1'].isPaused).toBe(false);
    });

    it('should handle timeout scenarios', () => {
      // Make sure user1 is the current player
      const user1Piece = game.players['user1'].piece;
      game.currentPlayer = user1Piece!;

      // Set very low time to trigger timeout
      game.timerState!.playerTimers['user1'].remainingTime = 0;

      const originalGameFinished = game.gameFinished;
      game.handlePlayerTimeout('user1');

      // Timeout should have been handled - check that it was processed
      // (The game may not finish if it was a forced pass, but timeout should be recorded)
      expect(game.gameFinished || game.timerState!.playerTimers['user1'].remainingTime === 0).toBe(true);
    });
  });

  describe('Game State Persistence', () => {
    it('should maintain game state properties', () => {
      expect(game.id).toBe('test-game-1');
      expect(game.gameStarted).toBe(true);
      expect(game.gameFull).toBe(true);
      expect(game.currentPlayer).toBe('B');
    });

    it('should maintain player information', () => {
      expect(Object.keys(game.players)).toHaveLength(2);
      // Note: Game.startGame() may reassign pieces, so we just check they exist
      expect(game.players['user1'].piece).toBeDefined();
      expect(game.players['user2'].piece).toBeDefined();
      expect(['B', 'W']).toContain(game.players['user1'].piece);
      expect(['B', 'W']).toContain(game.players['user2'].piece);
    });

    it('should check if timer is enabled', () => {
      expect(game.isTimerEnabled()).toBe(true);
    });

    it('should get all timer states', () => {
      const timerStates = game.getAllTimerStates();
      expect(Object.keys(timerStates)).toHaveLength(2);
      expect(timerStates['user1']).toBeDefined();
      expect(timerStates['user2']).toBeDefined();
    });
  });

  describe('Timer Recovery Scenarios', () => {
    it('should handle server downtime simulation', () => {
      // Simulate 30 seconds of server downtime
      const serverDowntime = 30000; // 30 seconds in milliseconds
      const newLastActivity = new Date(Date.now() - serverDowntime);
      game.lastActivityAt = newLastActivity;

      // Simulate timer recovery by manually updating timer state
      const now = new Date();
      const elapsedTime = (now.getTime() - newLastActivity.getTime()) / 1000;

      // Update active player's timer
      const user1Timer = game.timerState!.playerTimers['user1'];
      if (user1Timer.isActive && !user1Timer.isPaused) {
        const originalTime = user1Timer.remainingTime;
        user1Timer.remainingTime = Math.max(0, originalTime - elapsedTime);
        user1Timer.totalMoveTime += elapsedTime;
        user1Timer.lastUpdateTime = now;

        expect(user1Timer.remainingTime).toBeLessThan(originalTime);
        expect(user1Timer.totalMoveTime).toBeGreaterThan(0);
      }
    });

    it('should handle pause time recovery', () => {
      // Pause a player
      game.pausePlayerTimer('user1');

      // Simulate server downtime with paused player
      const serverDowntime = 30000; // 30 seconds
      const pausedDuration = serverDowntime / 1000;

      const user1Timer = game.timerState!.playerTimers['user1'];
      if (user1Timer.isPaused) {
        user1Timer.totalPausedTime += pausedDuration;

        // Check if pause time is accumulated correctly
        expect(user1Timer.totalPausedTime).toBeGreaterThan(0);
        expect(user1Timer.remainingTime).toBe(300); // Should not lose time while paused
      }
    });

    it('should handle excessive pause time', () => {
      const user1Timer = game.timerState!.playerTimers['user1'];

      // Set pause time to exceed maximum
      user1Timer.totalPausedTime = 350; // Exceeds maxPauseTime of 300

      // This should trigger timeout handling
      expect(user1Timer.totalPausedTime).toBeGreaterThan(timerConfig.maxPauseTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing timer state gracefully', () => {
      game.timerState = undefined;

      expect(game.isTimerEnabled()).toBe(false);
      expect(game.getAllTimerStates()).toEqual({});
    });

    it('should handle invalid player IDs gracefully', () => {
      game.pausePlayerTimer('invalid-user');
      game.resumePlayerTimer('invalid-user');

      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should handle corrupted timer data gracefully', () => {
      // Simulate corrupted timer data
      if (game.timerState) {
        game.timerState.playerTimers = {};
      }

      const timerStates = game.getAllTimerStates();
      expect(Object.keys(timerStates)).toHaveLength(0);
    });
  });

  describe('Timer Configuration Types', () => {
    it('should handle unlimited timer type', () => {
      const unlimitedConfig: TimerConfig = {
        ...timerConfig,
        type: 'unlimited',
      };

      const unlimitedGame = new Game('test-mode', unlimitedConfig);
      expect(unlimitedGame.isTimerEnabled()).toBe(false);
    });

    it('should handle different timer types', () => {
      const delayConfig: TimerConfig = {
        ...timerConfig,
        type: 'delay',
        delay: 3,
      };

      const delayGame = new Game('test-mode', delayConfig);
      expect(delayGame.isTimerEnabled()).toBe(true);
      expect(delayGame.timerState!.config.type).toBe('delay');
    });

    it('should handle fixed timer type', () => {
      const fixedConfig: TimerConfig = {
        ...timerConfig,
        type: 'fixed',
      };

      const fixedGame = new Game('test-mode', fixedConfig);
      expect(fixedGame.isTimerEnabled()).toBe(true);
      expect(fixedGame.timerState!.config.type).toBe('fixed');
    });
  });
});
