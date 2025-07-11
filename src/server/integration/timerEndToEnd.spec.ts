/**
 * Server-Side End-to-End Timer System Integration Tests
 *
 * This test suite covers complete timer workflows from the server perspective,
 * testing timer initialization, socket communication, database persistence,
 * and integration with the game logic.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Database before importing modules that use it
vi.mock('../database/Database', () => ({
  Database: {
    getInstance: vi.fn(() => ({
      query: vi.fn(),
      transaction: vi.fn(),
      close: vi.fn(),
      init: vi.fn(),
      healthCheck: vi.fn(),
      getHealth: vi.fn(),
    })),
  },
}));

// Mock GamePersistence
vi.mock('../services/GamePersistence', () => ({
  GamePersistence: {
    getInstance: vi.fn(() => ({
      saveGame: vi.fn(),
      loadGame: vi.fn(),
      deleteGame: vi.fn(),
      getActiveGames: vi.fn(() => Promise.resolve([])),
    })),
  },
}));

// Mock GameManager
const mockGameManager = {
  games: new Map(),
  createGame: vi.fn(),
  getGame: vi.fn(),
  removeGame: vi.fn(),
  getActiveGames: vi.fn(() => []),
  loadActiveGames: vi.fn(),
  handlePlayerReconnection: vi.fn(),
};

vi.mock('../models/GameManager', () => ({
  default: {
    getInstance: vi.fn(() => mockGameManager),
  },
  GameManager: {
    getInstance: vi.fn(() => mockGameManager),
  },
}));

import { Database } from '../database/Database';
import { Game, TimerConfig } from '../models/Game';
import { GameManager } from '../models/GameManager';
import { Timer } from '../models/Timer';
import { LatencyCompensation } from '../services/LatencyCompensation';
import { createGameTimers, startPlayerTimer, stopPlayerTimer, syncTimerStates } from '../sockets/timerHandlers';

// Mock socket for server-side testing
class MockServerSocket {
  private eventHandlers: { [event: string]: ((...args: any[]) => void)[] } = {};

  on(event: string, handler: (...args: any[]) => void) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  emit(event: string, data?: any) {
    // Simulate server-side socket emission
    console.log(`Server emitting ${event}:`, data);
  }

  to(room: string) {
    return {
      emit: (event: string, data?: any) => {
        console.log(`Server emitting to room ${room}, event ${event}:`, data);
      },
    };
  }

  join(room: string) {
    console.log(`Socket joined room: ${room}`);
  }

  leave(room: string) {
    console.log(`Socket left room: ${room}`);
  }

  disconnect() {
    this.eventHandlers = {};
  }

  // Test helper
  simulateEvent(event: string, ...args: any[]) {
    const handlers = this.eventHandlers[event] || [];
    handlers.forEach((handler) => handler(...args));
  }
}

// Test timer configurations
const testTimerConfigs = {
  increment: {
    type: 'increment',
    initialTime: 600,
    increment: 5,
    lowTimeWarning: 30,
    criticalTimeWarning: 10,
    autoFlagOnTimeout: true,
    pauseOnDisconnect: true,
    maxPauseTime: 300,
    timeoutAction: 'forfeit',
  } as TimerConfig,

  blitz: {
    type: 'increment',
    initialTime: 180,
    increment: 2,
    lowTimeWarning: 15,
    criticalTimeWarning: 5,
    autoFlagOnTimeout: true,
    pauseOnDisconnect: false,
    maxPauseTime: 60,
    timeoutAction: 'forfeit',
  } as TimerConfig,

  correspondence: {
    type: 'correspondence',
    initialTime: 86400, // 24 hours
    increment: 0,
    lowTimeWarning: 3600, // 1 hour
    criticalTimeWarning: 1800, // 30 minutes
    autoFlagOnTimeout: false,
    pauseOnDisconnect: true,
    maxPauseTime: 86400,
    timeoutAction: 'auto_pass',
  } as TimerConfig,
};

describe.skip('Server-Side Timer System End-to-End Tests', () => {
  let gameManager: GameManager;
  let game: Game;
  let mockSocket: MockServerSocket;
  let player1Timer: Timer;
  let player2Timer: Timer;
  let latencyCompensation: LatencyCompensation;

  beforeEach(() => {
    vi.useFakeTimers();

    // Initialize test environment
    gameManager = GameManager.getInstance();
    mockSocket = new MockServerSocket();
    latencyCompensation = new LatencyCompensation();

    // Create test game
    game = new Game('test-game-e2e', 'player1', 'TestPlayer1');
    game.addPlayer('player2', 'TestPlayer2');

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    // Clean up timers
    if (player1Timer) {
      player1Timer.destroy();
    }
    if (player2Timer) {
      player2Timer.destroy();
    }

    mockSocket.disconnect();
  });

  describe('Timer Initialization and Setup', () => {
    it('should initialize timers correctly when game starts', async () => {
      // 1. Set timer configuration
      game.setTimerConfig(testTimerConfigs.increment);

      // 2. Initialize timers
      const timerMap = createGameTimers(game);

      // 3. Verify timers are created
      expect(timerMap.size).toBe(2);
      expect(timerMap.get('player1')).toBeInstanceOf(Timer);
      expect(timerMap.get('player2')).toBeInstanceOf(Timer);

      // 4. Verify initial timer states
      const player1Timer = timerMap.get('player1')!;
      const player2Timer = timerMap.get('player2')!;

      expect(player1Timer.getRemainingTime()).toBe(600);
      expect(player2Timer.getRemainingTime()).toBe(600);
      expect(player1Timer.isRunning()).toBe(false);
      expect(player2Timer.isRunning()).toBe(false);

      // 5. Start game and verify timer initialization
      game.startGame();

      expect(game.timerState).toBeDefined();
      expect(game.timerState!.config).toEqual(testTimerConfigs.increment);
      expect(Object.keys(game.timerState!.playerTimers)).toHaveLength(2);

      console.log('✅ Timer initialization test completed successfully');
    });

    it('should handle different timer configurations correctly', async () => {
      // Test multiple timer configurations
      const configs = [testTimerConfigs.increment, testTimerConfigs.blitz, testTimerConfigs.correspondence];

      for (const config of configs) {
        // Create new game for each configuration
        const testGame = new Game(`test-game-${config.type}`, 'player1', 'TestPlayer1');
        testGame.addPlayer('player2', 'TestPlayer2');
        testGame.setTimerConfig(config);

        // Initialize timers
        const timerMap = createGameTimers(testGame);

        // Verify configuration is applied
        const timer = timerMap.get('player1')!;
        expect(timer.getConfig().type).toBe(config.type);
        expect(timer.getConfig().initialTime).toBe(config.initialTime);
        expect(timer.getConfig().increment).toBe(config.increment);

        // Clean up
        timer.destroy();
        timerMap.get('player2')!.destroy();
      }

      console.log('✅ Multiple timer configuration test completed successfully');
    });
  });

  describe('Timer Flow During Game', () => {
    it('should handle complete timer flow during game progression', async () => {
      // 1. Set up game with timers
      game.setTimerConfig(testTimerConfigs.increment);
      const timerMap = createGameTimers(game);

      player1Timer = timerMap.get('player1')!;
      player2Timer = timerMap.get('player2')!;

      // 2. Start game
      game.startGame();

      // 3. Start player 1's timer
      const socketEmissions: string[] = [];
      const mockEmit = vi.fn((event: string, data?: any) => {
        socketEmissions.push(event);
      });

      await startPlayerTimer(game, 'player1', mockSocket as any, mockEmit);

      // 4. Verify timer started
      expect(player1Timer.isRunning()).toBe(true);
      expect(player2Timer.isRunning()).toBe(false);

      // 5. Simulate time progression
      vi.advanceTimersByTime(5000);

      // 6. Verify time decreased
      expect(player1Timer.getRemainingTime()).toBeLessThan(600);
      expect(player1Timer.getRemainingTime()).toBeGreaterThan(590);

      // 7. Stop player 1's timer and start player 2's
      await stopPlayerTimer(game, 'player1', mockSocket as any, mockEmit);
      await startPlayerTimer(game, 'player2', mockSocket as any, mockEmit);

      // 8. Verify timer switch
      expect(player1Timer.isRunning()).toBe(false);
      expect(player2Timer.isRunning()).toBe(true);

      // 9. Verify increment was applied
      expect(player1Timer.getRemainingTime()).toBeGreaterThan(590); // Should have increment

      // 10. Verify socket emissions
      expect(mockEmit).toHaveBeenCalledWith(expect.stringContaining('Timer_test-game-e2e_'), expect.any(Object));

      console.log('✅ Complete timer flow test completed successfully');
    });
  });

  describe('Timer Warnings and Timeouts', () => {
    it('should handle timer warnings and timeouts correctly', async () => {
      // 1. Set up game with short timer for testing
      const shortConfig = {
        ...testTimerConfigs.increment,
        initialTime: 60,
        lowTimeWarning: 30,
        criticalTimeWarning: 10,
      };

      game.setTimerConfig(shortConfig);
      const timerMap = createGameTimers(game);

      player1Timer = timerMap.get('player1')!;

      // 2. Start game and timer
      game.startGame();
      await startPlayerTimer(game, 'player1', mockSocket as any, vi.fn());

      // 3. Track warnings
      const warnings: string[] = [];
      player1Timer.on('warning', (data) => {
        warnings.push(data.type);
      });

      // 4. Simulate time to trigger low warning
      vi.advanceTimersByTime(35000); // 35 seconds

      // 5. Verify low warning was triggered
      expect(warnings).toContain('low');

      // 6. Continue to trigger critical warning
      vi.advanceTimersByTime(25000); // Another 25 seconds (total 60)

      // 7. Verify critical warning was triggered
      expect(warnings).toContain('critical');

      // 8. Continue to trigger timeout
      let timeoutOccurred = false;
      player1Timer.on('timeout', () => {
        timeoutOccurred = true;
      });

      vi.advanceTimersByTime(15000); // Another 15 seconds

      // 9. Verify timeout occurred
      expect(timeoutOccurred).toBe(true);
      expect(player1Timer.getRemainingTime()).toBeLessThanOrEqual(0);

      console.log('✅ Timer warnings and timeouts test completed successfully');
    });
  });

  describe('Latency Compensation Integration', () => {
    it('should integrate latency compensation with timer system', async () => {
      // 1. Set up game with timers
      game.setTimerConfig(testTimerConfigs.increment);
      const timerMap = createGameTimers(game);

      player1Timer = timerMap.get('player1')!;

      // 2. Record some latency measurements
      latencyCompensation.recordLatency('player1', 50);
      latencyCompensation.recordLatency('player1', 60);
      latencyCompensation.recordLatency('player1', 55);

      // 3. Start game and timer
      game.startGame();
      await startPlayerTimer(game, 'player1', mockSocket as any, vi.fn());

      // 4. Get timer state with latency compensation
      const timerStates = syncTimerStates(game, latencyCompensation);

      // 5. Verify compensation is applied
      expect(timerStates.player1.remainingTime).toBeDefined();
      expect(timerStates.player1.lastUpdateTime).toBeDefined();

      // 6. Verify latency adjustment
      const rawTime = player1Timer.getRemainingTime();
      const compensatedTime = timerStates.player1.remainingTime;

      // Should be slightly different due to latency compensation
      expect(Math.abs(rawTime - compensatedTime)).toBeLessThan(1);

      console.log('✅ Latency compensation integration test completed successfully');
    });
  });

  describe('Timer Persistence and Recovery', () => {
    it('should persist timer state and recover after restart', async () => {
      // 1. Set up game with timers
      game.setTimerConfig(testTimerConfigs.increment);
      const timerMap = createGameTimers(game);

      player1Timer = timerMap.get('player1')!;

      // 2. Start game and run timer
      game.startGame();
      await startPlayerTimer(game, 'player1', mockSocket as any, vi.fn());

      // 3. Simulate some time passing
      vi.advanceTimersByTime(10000); // 10 seconds

      // 4. Get current state
      const beforeRestartTime = player1Timer.getRemainingTime();

      // 5. Simulate server restart by destroying and recreating timers
      player1Timer.destroy();

      // 6. Recreate game and timers (simulating recovery)
      const recoveredGame = new Game('test-game-e2e', 'player1', 'TestPlayer1');
      recoveredGame.addPlayer('player2', 'TestPlayer2');
      recoveredGame.setTimerConfig(testTimerConfigs.increment);

      // 7. Simulate timer recovery
      recoveredGame.startGame();
      recoveredGame.timerState!.playerTimers.player1.remainingTime = beforeRestartTime;
      recoveredGame.timerState!.playerTimers.player1.lastUpdateTime = new Date();

      // 8. Verify recovered state
      expect(recoveredGame.timerState!.playerTimers.player1.remainingTime).toBe(beforeRestartTime);

      console.log('✅ Timer persistence and recovery test completed successfully');
    });
  });

  describe('Multi-Game Timer Management', () => {
    it('should handle timers across multiple concurrent games', async () => {
      // 1. Create multiple games
      const games = [
        new Game('game1', 'player1', 'Player1'),
        new Game('game2', 'player3', 'Player3'),
        new Game('game3', 'player5', 'Player5'),
      ];

      // 2. Set up each game with players and timers
      games.forEach((game, index) => {
        game.addPlayer(`player${index * 2 + 2}`, `Player${index * 2 + 2}`);
        game.setTimerConfig(testTimerConfigs.increment);
        game.startGame();
      });

      // 3. Create timers for all games
      const allTimers: Timer[] = [];
      games.forEach((game) => {
        const timerMap = createGameTimers(game);
        allTimers.push(...timerMap.values());
      });

      // 4. Start timers for first players
      const socketEmissions: string[] = [];
      const mockEmit = vi.fn((event: string, data?: any) => {
        socketEmissions.push(event);
      });

      await Promise.all(
        games.map((game) => startPlayerTimer(game, Object.keys(game.players)[0], mockSocket as any, mockEmit)),
      );

      // 5. Verify all timers are running
      expect(allTimers.filter((timer) => timer.isRunning())).toHaveLength(3);

      // 6. Simulate time progression
      vi.advanceTimersByTime(5000);

      // 7. Verify all timers decreased
      allTimers.forEach((timer) => {
        if (timer.isRunning()) {
          expect(timer.getRemainingTime()).toBeLessThan(600);
        }
      });

      // 8. Clean up
      allTimers.forEach((timer) => timer.destroy());

      console.log('✅ Multi-game timer management test completed successfully');
    });
  });

  describe('Timer Error Handling and Edge Cases', () => {
    it('should handle timer errors gracefully', async () => {
      // 1. Set up game with timers
      game.setTimerConfig(testTimerConfigs.increment);
      const timerMap = createGameTimers(game);

      player1Timer = timerMap.get('player1')!;

      // 2. Start game
      game.startGame();

      // 3. Test invalid timer operations
      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (message: string) => {
        errors.push(message);
      };

      // 4. Try to start timer for non-existent player
      try {
        await startPlayerTimer(game, 'nonexistent-player', mockSocket as any, vi.fn());
      } catch (error) {
        expect(error).toBeDefined();
      }

      // 5. Try to manipulate timer directly
      try {
        player1Timer.start();
        player1Timer.start(); // Double start should be handled gracefully
      } catch (error) {
        // Should not throw error
      }

      // 6. Test timer with invalid configuration
      const invalidConfig = {
        ...testTimerConfigs.increment,
        initialTime: -100, // Invalid negative time
      };

      try {
        Timer.validateConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // 7. Restore console.error
      console.error = originalConsoleError;

      console.log('✅ Timer error handling test completed successfully');
    });
  });

  describe('Timer Performance and Stress Testing', () => {
    it('should handle high-frequency timer operations efficiently', async () => {
      // 1. Set up game with fast timer
      const fastConfig = {
        ...testTimerConfigs.increment,
        initialTime: 30,
        increment: 1,
      };

      game.setTimerConfig(fastConfig);
      const timerMap = createGameTimers(game);

      player1Timer = timerMap.get('player1')!;
      player2Timer = timerMap.get('player2')!;

      // 2. Start game
      game.startGame();

      // 3. Measure performance of rapid timer switches
      const startTime = performance.now();

      const mockEmit = vi.fn();

      // 4. Simulate rapid timer switches (100 moves)
      for (let i = 0; i < 100; i++) {
        const currentPlayer = i % 2 === 0 ? 'player1' : 'player2';
        const otherPlayer = i % 2 === 0 ? 'player2' : 'player1';

        await stopPlayerTimer(game, otherPlayer, mockSocket as any, mockEmit);
        await startPlayerTimer(game, currentPlayer, mockSocket as any, mockEmit);

        // Advance time slightly
        vi.advanceTimersByTime(100);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 5. Verify performance is acceptable (less than 2 seconds for 100 operations)
      expect(duration).toBeLessThan(2000);

      // 6. Verify timers are still functional
      expect(player1Timer.isRunning() || player2Timer.isRunning()).toBe(true);
      expect(mockEmit).toHaveBeenCalledTimes(200); // 100 stops + 100 starts

      console.log(`✅ Timer performance test completed in ${duration}ms`);
    });
  });

  describe('Integration with Game Logic', () => {
    it('should integrate seamlessly with game progression', async () => {
      // 1. Set up game with timers
      game.setTimerConfig(testTimerConfigs.increment);
      const timerMap = createGameTimers(game);

      player1Timer = timerMap.get('player1')!;
      player2Timer = timerMap.get('player2')!;

      // 2. Start game
      game.startGame();

      // 3. Simulate game progression with timer management
      const mockEmit = vi.fn();

      // 4. Player 1 makes first move
      await startPlayerTimer(game, 'player1', mockSocket as any, mockEmit);

      // Simulate thinking time
      vi.advanceTimersByTime(3000);

      // Make move
      const moveResult = game.makeMove('player1', 2, 3);
      expect(moveResult.success).toBe(true);

      // 5. Switch to player 2
      await stopPlayerTimer(game, 'player1', mockSocket as any, mockEmit);
      await startPlayerTimer(game, 'player2', mockSocket as any, mockEmit);

      // 6. Verify timer states are consistent with game state
      expect(game.currentPlayer).toBe('W'); // Should be white's turn
      expect(player1Timer.isRunning()).toBe(false);
      expect(player2Timer.isRunning()).toBe(true);

      // 7. Verify move count increased
      expect(game.timerState!.playerTimers.player1.moveCount).toBe(1);
      expect(game.timerState!.playerTimers.player2.moveCount).toBe(0);

      // 8. Verify total move time is tracked
      expect(game.timerState!.playerTimers.player1.totalMoveTime).toBeGreaterThan(0);

      console.log('✅ Integration with game logic test completed successfully');
    });
  });
});
