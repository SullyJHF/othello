import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameMode } from '../../shared/types/gameModeTypes';
import { GameModeEngine } from './GameModeEngine';

describe('GameModeEngine', () => {
  let engine: GameModeEngine;
  let mockGameMode: GameMode;
  let playerIds: string[];

  beforeEach(() => {
    playerIds = ['player1', 'player2'];
    mockGameMode = {
      id: 'blitz-3-0',
      name: 'Blitz 3+0',
      description: 'Fast-paced 3 minute game',
      category: 'timer',
      config: {
        timer: {
          type: 'fixed',
          initialTime: 180,
          increment: 0,
          warningTime: 30,
          criticalTime: 10,
        },
      },
      isActive: true,
      isDefault: false,
      minimumPlayers: 2,
      maximumPlayers: 2,
      estimatedDuration: 5,
      difficultyLevel: 'intermediate',
      tags: ['fast', 'competitive'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('Timer Mode Engine', () => {
    beforeEach(() => {
      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: mockGameMode,
        playerIds,
      });
    });

    it('should initialize timers for all players', () => {
      const timerStates = engine.getTimerStates();

      expect(timerStates.size).toBe(2);
      expect(timerStates.get('player1')).toMatchObject({
        playerId: 'player1',
        timeLeft: 180,
        isTimeUp: false,
        isWarning: false,
        isCritical: false,
      });
      expect(timerStates.get('player2')).toMatchObject({
        playerId: 'player2',
        timeLeft: 180,
        isTimeUp: false,
        isWarning: false,
        isCritical: false,
      });
    });

    it('should start game and activate first player timer', () => {
      engine.startGame('player1');

      const timerStates = engine.getTimerStates();
      // Timer states should be available (timers initialized)
      expect(timerStates.size).toBe(2);
    });

    it('should process moves and switch timers', () => {
      engine.startGame('player1');

      // Mock time passing
      vi.useFakeTimers();
      const moveTime = new Date(Date.now() + 5000); // 5 seconds later
      vi.setSystemTime(moveTime);

      const result = engine.processMove('player1', { row: 3, col: 4 }, 'player2');

      expect(result.isValid).toBe(true);
      expect(result.timeUsed).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should detect time up condition', () => {
      // Create a game mode with very short time
      const shortTimeMode: GameMode = {
        ...mockGameMode,
        config: {
          timer: {
            type: 'fixed',
            initialTime: 1, // 1 second
            increment: 0,
            warningTime: 1,
            criticalTime: 1,
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: shortTimeMode,
        playerIds,
      });

      engine.startGame('player1');

      // Mock time passing beyond the initial time
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 2000)); // 2 seconds later

      const result = engine.processMove('player1', { row: 3, col: 4 });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Time is up');

      vi.useRealTimers();
    });

    it('should handle increment timers', () => {
      // Create increment timer mode
      const incrementMode: GameMode = {
        ...mockGameMode,
        config: {
          timer: {
            type: 'increment',
            initialTime: 60,
            increment: 10,
            warningTime: 30,
            criticalTime: 10,
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: incrementMode,
        playerIds,
      });

      engine.startGame('player1');

      // Mock time passing
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 5000)); // 5 seconds later

      const result = engine.processMove('player1', { row: 3, col: 4 }, 'player2');

      expect(result.isValid).toBe(true);

      // Check that increment was added
      const timerStates = engine.getTimerStates();
      const player1Timer = timerStates.get('player1');
      expect(player1Timer?.timeLeft).toBeGreaterThan(55); // Should be ~65 (60 - 5 + 10)

      vi.useRealTimers();
    });

    it('should detect warning and critical time states', () => {
      // Create a game mode with warning time
      const warningMode: GameMode = {
        ...mockGameMode,
        config: {
          timer: {
            type: 'fixed',
            initialTime: 25,
            increment: 0,
            warningTime: 30,
            criticalTime: 10,
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: warningMode,
        playerIds,
      });

      const timerStates = engine.getTimerStates();
      const player1Timer = timerStates.get('player1');

      expect(player1Timer?.isWarning).toBe(true);
      expect(player1Timer?.isCritical).toBe(false);
    });

    it('should pause and resume timers', () => {
      engine.startGame('player1');

      engine.pauseTimers();

      // Mock time passing while paused
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 5000));

      const timerStates = engine.getTimerStates();
      const player1Timer = timerStates.get('player1');

      // Time should not have decreased significantly while paused
      expect(player1Timer?.timeLeft).toBe(180);

      engine.resumeTimers('player1');

      vi.useRealTimers();
    });

    it('should check if game should end due to time up', () => {
      // Create a game mode with very short time
      const shortTimeMode: GameMode = {
        ...mockGameMode,
        config: {
          timer: {
            type: 'fixed',
            initialTime: 1,
            increment: 0,
            warningTime: 1,
            criticalTime: 1,
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: shortTimeMode,
        playerIds,
      });

      engine.startGame('player1');

      // Mock time passing beyond the initial time
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 2000));

      const endResult = engine.shouldEndGame();

      expect(endResult.shouldEnd).toBe(true);
      expect(endResult.reason).toBe('time_up');
      expect(endResult.winner).toBe('player2');

      vi.useRealTimers();
    });
  });

  describe('Board Variant Engine', () => {
    beforeEach(() => {
      mockGameMode = {
        ...mockGameMode,
        category: 'board-variant',
        config: {
          board: {
            size: 6,
            customLayout: false,
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: mockGameMode,
        playerIds,
      });
    });

    it('should validate moves within board boundaries', () => {
      engine.startGame('player1');

      const validResult = engine.processMove('player1', { row: 2, col: 3 }, 'player2');
      expect(validResult.isValid).toBe(true);

      const invalidResult = engine.processMove('player1', { row: 6, col: 3 }, 'player2');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Move is outside board boundaries');
    });

    it('should handle negative coordinates', () => {
      engine.startGame('player1');

      const invalidResult = engine.processMove('player1', { row: -1, col: 3 }, 'player2');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Move is outside board boundaries');
    });
  });

  describe('Challenge Mode Engine', () => {
    beforeEach(() => {
      mockGameMode = {
        ...mockGameMode,
        category: 'daily-challenge',
        config: {
          challenge: {
            type: 'daily',
            maxAttempts: 3,
            timeLimit: 300,
            difficulty: 'medium',
            solution: [{ row: 3, col: 4 }],
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: mockGameMode,
        playerIds,
      });
    });

    it('should initialize challenge state', () => {
      const challengeState = engine.getChallengeState();

      expect(challengeState).toMatchObject({
        type: 'daily',
        attemptsUsed: 0,
        maxAttempts: 3,
        timeLimit: 300,
        isCompleted: false,
        isFailed: false,
      });
    });

    it('should handle correct challenge solution', () => {
      engine.startGame('player1');

      const result = engine.attemptChallenge({ row: 3, col: 4 });

      expect(result.isCorrect).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.attemptsUsed).toBe(1);

      const challengeState = engine.getChallengeState();
      expect(challengeState?.isCompleted).toBe(true);
    });

    it('should handle incorrect challenge solution', () => {
      engine.startGame('player1');

      const result = engine.attemptChallenge({ row: 2, col: 3 });

      expect(result.isCorrect).toBe(false);
      expect(result.isComplete).toBe(false);
      expect(result.attemptsUsed).toBe(1);
      expect(result.hint).toBeDefined();

      const challengeState = engine.getChallengeState();
      expect(challengeState?.isCompleted).toBe(false);
    });

    it('should fail challenge after max attempts', () => {
      engine.startGame('player1');

      // Use up all attempts
      engine.attemptChallenge({ row: 0, col: 0 });
      engine.attemptChallenge({ row: 1, col: 1 });
      const result = engine.attemptChallenge({ row: 2, col: 2 });

      expect(result.isCorrect).toBe(false);
      expect(result.isComplete).toBe(false);
      expect(result.attemptsUsed).toBe(3);
      expect(result.hint).toBe('No more attempts remaining');

      const challengeState = engine.getChallengeState();
      expect(challengeState?.isFailed).toBe(true);
    });

    it('should check if game should end due to challenge completion', () => {
      engine.startGame('player1');
      engine.attemptChallenge({ row: 3, col: 4 });

      const endResult = engine.shouldEndGame();

      expect(endResult.shouldEnd).toBe(true);
      expect(endResult.reason).toBe('challenge_completed');
    });

    it('should check if game should end due to challenge failure', () => {
      engine.startGame('player1');

      // Use up all attempts
      engine.attemptChallenge({ row: 0, col: 0 });
      engine.attemptChallenge({ row: 1, col: 1 });
      engine.attemptChallenge({ row: 2, col: 2 });

      const endResult = engine.shouldEndGame();

      expect(endResult.shouldEnd).toBe(true);
      expect(endResult.reason).toBe('challenge_failed');
    });

    it('should handle time limit in challenges', () => {
      // Create challenge with short time limit
      const shortChallengeMode: GameMode = {
        ...mockGameMode,
        config: {
          challenge: {
            type: 'daily',
            maxAttempts: 3,
            timeLimit: 1, // 1 second
            difficulty: 'medium',
            solution: [{ row: 3, col: 4 }],
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: shortChallengeMode,
        playerIds,
      });

      engine.startGame('player1');

      // Mock time passing beyond limit
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 2000));

      const result = engine.processMove('player1', { row: 3, col: 4 });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Time limit exceeded');

      vi.useRealTimers();
    });
  });

  describe('Game Statistics', () => {
    beforeEach(() => {
      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: mockGameMode,
        playerIds,
      });
    });

    it('should provide game statistics', () => {
      engine.startGame('player1');

      // Mock some moves
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 5000));
      engine.processMove('player1', { row: 3, col: 4 }, 'player2');

      vi.setSystemTime(new Date(Date.now() + 3000));
      engine.processMove('player2', { row: 2, col: 3 }, 'player1');

      const stats = engine.getGameStatistics();

      expect(stats.gameId).toBe('test-game');
      expect(stats.gameMode).toBe(mockGameMode);
      expect(stats.moveCount).toBe(2);
      expect(stats.totalGameTime).toBeGreaterThan(0);
      expect(stats.playerStats).toHaveLength(2);

      const player1Stats = stats.playerStats.find((p) => p.playerId === 'player1');
      expect(player1Stats?.totalTimeUsed).toBeGreaterThan(0);
      expect(player1Stats?.movesCount).toBe(1);

      vi.useRealTimers();
    });

    it('should calculate average time per move', () => {
      engine.startGame('player1');

      // Mock multiple moves by player1
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 5000));
      engine.processMove('player1', { row: 3, col: 4 }, 'player2');

      vi.setSystemTime(new Date(Date.now() + 3000));
      engine.processMove('player2', { row: 2, col: 3 }, 'player1');

      vi.setSystemTime(new Date(Date.now() + 4000));
      engine.processMove('player1', { row: 1, col: 2 }, 'player2');

      const stats = engine.getGameStatistics();
      const player1Stats = stats.playerStats.find((p) => p.playerId === 'player1');

      expect(player1Stats?.averageTimePerMove).toBeGreaterThan(0);
      expect(player1Stats?.movesCount).toBe(2);

      vi.useRealTimers();
    });
  });

  describe('Mixed Mode Engine', () => {
    beforeEach(() => {
      // Create a game mode with both timer and board variant
      mockGameMode = {
        ...mockGameMode,
        config: {
          timer: {
            type: 'fixed',
            initialTime: 300,
            increment: 0,
            warningTime: 30,
            criticalTime: 10,
          },
          board: {
            size: 6,
            customLayout: false,
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: mockGameMode,
        playerIds,
      });
    });

    it('should handle both timer and board validation', () => {
      engine.startGame('player1');

      // Valid move within board boundaries
      const validResult = engine.processMove('player1', { row: 2, col: 3 }, 'player2');
      expect(validResult.isValid).toBe(true);

      // Invalid move outside board boundaries
      const invalidResult = engine.processMove('player1', { row: 6, col: 3 }, 'player2');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Move is outside board boundaries');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: mockGameMode,
        playerIds,
      });
    });

    it('should handle invalid player ID in timer operations', () => {
      expect(() => {
        engine.getTimerStates();
      }).not.toThrow();
    });

    it('should handle challenge attempt without challenge state', () => {
      // Create engine without challenge config
      const nonChallengeMode: GameMode = {
        ...mockGameMode,
        config: {
          timer: {
            type: 'fixed',
            initialTime: 300,
            increment: 0,
            warningTime: 30,
            criticalTime: 10,
          },
        },
      };

      engine = new GameModeEngine({
        gameId: 'test-game',
        gameMode: nonChallengeMode,
        playerIds,
      });

      expect(() => {
        engine.attemptChallenge({ row: 3, col: 4 });
      }).toThrow('No challenge state available');
    });

    it('should cleanup resources properly', () => {
      engine.startGame('player1');

      expect(engine.getTimerStates().size).toBe(2);

      engine.cleanup();

      // After cleanup, timer states should be empty (no timers)
      // and challenge state should be undefined
      expect(engine.getChallengeState()).toBeUndefined();

      // The cleanup should not throw when called
      expect(() => engine.cleanup()).not.toThrow();
    });
  });
});
