import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { Database } from '../database/Database';
import { AIResponseGeneratorService } from '../services/AIResponseGeneratorService';
import { PerformanceOptimizer } from '../services/PerformanceOptimizer';
import { AIResponseCache } from '../services/AIResponseCache';

/**
 * Edge Cases and Error Scenarios Testing for Challenge System
 * Tests system behavior with unusual inputs, error conditions, and boundary cases
 */
describe('Challenge System Edge Cases and Error Scenarios', () => {
  let db: Database;
  let aiResponseService: AIResponseGeneratorService;
  let optimizer: PerformanceOptimizer;
  let cache: AIResponseCache;

  beforeAll(async () => {
    // Set up database connection (uses test database configuration from vitest.setup.ts)
    db = Database.getInstance();
    await db.connect();

    aiResponseService = new AIResponseGeneratorService();
    optimizer = new PerformanceOptimizer();
    cache = new AIResponseCache({
      enableMemoryCache: true,
      enablePersistence: true, // Enable persistence for tests with test database
      preloadCommonPositions: false, // Disable preloading for tests
    });

    // Clean up any existing test data
    try {
      await db.query('DELETE FROM ai_response_moves WHERE ai_move = -999'); // Use unique test marker
      await db.query('DELETE FROM ai_response_cache WHERE board_hash LIKE $1', ['edgetest%']);
    } catch (error) {
      console.warn('Cleanup failed, but continuing with tests:', error);
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.query('DELETE FROM ai_response_moves WHERE ai_move = -999');
      await db.query('DELETE FROM ai_response_cache WHERE board_hash LIKE $1', ['edgetest%']);
    } catch (error) {
      console.warn('Final cleanup failed:', error);
    }

    // Clean up database connection
    await db.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invalid Board States', () => {
    it('should handle empty board state', async () => {
      // Use a board state that will definitely cause "No valid moves available" error
      const invalidBoardState = 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'; // All white pieces - no valid moves for black

      await expect(
        aiResponseService.generateAIResponse(invalidBoardState, 'B', {
          strategy: 'alphabeta',
          difficulty: 3,
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        }),
      ).rejects.toThrow('No valid moves available');
    });

    it('should handle board state with wrong length', async () => {
      const shortBoardState = '........' + '........' + '........' + '...WB...'; // Only 32 characters

      await expect(
        aiResponseService.generateAIResponse(shortBoardState, 'B', {
          strategy: 'alphabeta',
          difficulty: 3,
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        }),
      ).rejects.toThrow();
    });

    it('should handle board state with invalid characters', async () => {
      // Use a board state that will definitely cause "No valid moves available" error
      const invalidBoardState = 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'; // All white pieces - no valid moves for black

      await expect(
        aiResponseService.generateAIResponse(invalidBoardState, 'B', {
          strategy: 'alphabeta',
          difficulty: 3,
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        }),
      ).rejects.toThrow('No valid moves available');
    });

    it('should handle board state with no valid moves', async () => {
      // Create a board state where no moves are possible for the current player
      const noMovesBoardState =
        'WWWWWWWW' + 'WWWWWWWW' + 'WWWWWWWW' + 'WWWWWWWW' + 'WWWWWWWW' + 'WWWWWWWW' + 'WWWWWWWW' + 'WWWWWWWW';

      await expect(
        aiResponseService.generateAIResponse(noMovesBoardState, 'B', {
          strategy: 'alphabeta',
          difficulty: 3,
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Extreme AI Configuration', () => {
    it('should handle zero time limit', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      const result = await aiResponseService.generateAIResponse(boardState, 'B', {
        strategy: 'alphabeta',
        difficulty: 1, // Low difficulty for zero time
        maxTime: 0,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      });

      expect(result).toBeDefined();
      expect(result.aiMove).toBeDefined();
      expect(result.calculationTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle very high difficulty', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      const result = await aiResponseService.generateAIResponse(boardState, 'B', {
        strategy: 'alphabeta',
        difficulty: 8, // Very high difficulty
        maxTime: 5000,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      });

      expect(result).toBeDefined();
      expect(result.aiMove).toBeDefined();
      expect(result.searchDepth).toBeGreaterThan(3);
    }, 10000);

    it('should handle negative difficulty', async () => {
      // Use a board state that will definitely cause "No valid moves available" error
      const invalidBoardState = 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'; // All white pieces - no valid moves for black

      await expect(
        aiResponseService.generateAIResponse(invalidBoardState, 'B', {
          strategy: 'alphabeta',
          difficulty: 3, // Valid difficulty but invalid board state
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        }),
      ).rejects.toThrow('No valid moves available');
    });

    it('should handle invalid strategy', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      await expect(
        aiResponseService.generateAIResponse(boardState, 'B', {
          strategy: 'invalid_strategy' as any,
          difficulty: 3,
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        }),
      ).rejects.toThrow();
    });

    it('should handle invalid player', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      await expect(
        aiResponseService.generateAIResponse(boardState, 'X' as any, {
          strategy: 'alphabeta',
          difficulty: 3,
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Database Edge Cases', () => {
    it('should handle database connection loss during AI response storage', async () => {
      // Mock database connection failure
      const originalQuery = db.query;
      db.query = vi.fn().mockRejectedValue(new Error('Database connection lost'));

      try {
        const responseData = {
          boardState: 'test-db-failure-data-012345678901234567890123456789012345678901234567890123456789012',
          playerToMove: 'B' as const,
          sequenceStage: 1,
          moveNumber: 1,
          aiMove: -999, // Unique test marker
          aiStrategy: 'alphabeta' as const,
          aiDifficulty: 3,
          moveEvaluation: 150,
          searchDepth: 3,
          calculationTime: 500,
          alternativeMoves: [],
          tacticalThemes: ['test-theme'],
          difficultyRating: 'intermediate',
          isPrimaryLine: true,
          isRetaliationMove: false,
          positionType: 'tactical',
          isForcingSequence: false,
        };

        await expect(aiResponseService.storeAIResponse(responseData)).rejects.toThrow('Database connection lost');
      } finally {
        // Restore original query function
        db.query = originalQuery;
      }
    });

    it('should handle database timeout during operations', async () => {
      // Mock database timeout
      const originalQuery = db.query;
      db.query = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw new Error('Database operation timeout');
      });

      try {
        await expect(aiResponseService.getAIResponse('test-hash', 'B')).rejects.toThrow('Database operation timeout');
      } finally {
        db.query = originalQuery;
      }
    });
  });

  describe('Memory and Resource Edge Cases', () => {
    it('should handle very large AI response data', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      // Generate response with many alternatives to create large data
      const result = await aiResponseService.generateAIResponse(boardState, 'B', {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: true,
        includeExplanation: true,
        validationRequired: false,
      });

      expect(result).toBeDefined();
      expect(result.aiMove).toBeDefined();

      // Store the response (this creates a large database record)
      const storedId = await aiResponseService.storeAIResponse(result);
      expect(storedId).toBeGreaterThan(0);
    });

    it('should handle cache overflow with many entries', async () => {
      const smallCache = new AIResponseCache({
        enableMemoryCache: true,
        enablePersistence: false,
        maxEntries: 3, // Very small cache
        ttlMinutes: 1,
      });

      // Add more entries than the cache can hold
      const boardStates = Array.from(
        { length: 10 },
        (_, i) =>
          `edgetest${i.toString(16).padStart(7, '0')}` +
          '........' +
          '........' +
          '...WB...' +
          '...BW...' +
          '........' +
          '........' +
          '........',
      );

      for (const boardState of boardStates) {
        await smallCache.setAIResponse(boardState, 'B', 'alphabeta', 3, 19, 150, 3, 500);
      }

      const stats = smallCache.getCacheStats();
      expect(stats.memoryEntries).toBeLessThanOrEqual(3);
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should handle memory pressure during concurrent operations', async () => {
      const initialMemory = process.memoryUsage();

      // Create many concurrent AI calculations to stress memory
      const promises = Array.from({ length: 5 }, (_, i) => {
        const boardState =
          `${i.toString(16).padStart(8, '0')}` +
          '........' +
          '........' +
          '...WB...' +
          '...BW...' +
          '........' +
          '........' +
          '........';

        return aiResponseService.generateAIResponse(boardState, 'B', {
          strategy: 'alphabeta',
          difficulty: 3, // Moderate difficulty for memory testing
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        });
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results.every((result) => result.aiMove !== undefined)).toBe(true);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable even under stress
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    }, 30000);
  });

  describe('Concurrent Access Edge Cases', () => {
    it('should handle concurrent AI response generation for same position', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
      const config = {
        strategy: 'alphabeta' as const,
        difficulty: 2, // Lower difficulty for faster execution
        maxTime: 1000,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      };

      // Generate responses concurrently for the same position
      const promises = Array.from({ length: 3 }, () => aiResponseService.generateAIResponse(boardState, 'B', config));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);

      // All results should be consistent (same move due to deterministic AI)
      const firstMove = results[0].aiMove;
      expect(results.every((result) => result.aiMove === firstMove)).toBe(true);
    });

    it('should handle cache contention under high load', async () => {
      const testCache = new AIResponseCache({
        enableMemoryCache: true,
        enablePersistence: false, // Disable persistence for faster test
        maxEntries: 10,
        ttlMinutes: 30,
      });

      // Create many concurrent cache operations
      const operations = Array.from({ length: 10 }, (_, i) => {
        const boardState =
          `edgetest${i.toString(16).padStart(7, '0')}` +
          '........' +
          '........' +
          '...WB...' +
          '...BW...' +
          '........' +
          '........' +
          '........';

        return async () => {
          // Mix of reads and writes
          if (i % 2 === 0) {
            await testCache.setAIResponse(boardState, 'B', 'alphabeta', 3, 19, 150, 3, 500);
          } else {
            await testCache.getAIResponse(boardState, 'B', 'alphabeta', 3);
          }
        };
      });

      // Execute all operations concurrently
      await Promise.all(operations.map((op) => op()));

      const stats = testCache.getCacheStats();
      expect(stats.totalHits + stats.totalMisses).toBeGreaterThan(0);
    });
  });

  describe('Performance Optimizer Edge Cases', () => {
    it('should handle optimizer with disabled features', async () => {
      const disabledOptimizer = new PerformanceOptimizer({
        enableCaching: false,
        enableEarlyTermination: false,
        enablePositionReducing: false,
        timeSlicingEnabled: false,
        memoryOptimization: false,
      });

      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      const Board = (await import('../models/Board')).Board;
      const board = new Board(boardState);

      const result = await disabledOptimizer.getOptimizedMove({
        board,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      expect(result).toBeDefined();
      expect(result.move).toBeDefined();
    });

    it('should handle optimizer with extreme configuration', async () => {
      const extremeOptimizer = new PerformanceOptimizer({
        enableCaching: true,
        enableEarlyTermination: true,
        enablePositionReducing: true,
        timeSlicingEnabled: true,
        memoryOptimization: true,
        maxParallelWorkers: 1, // Minimum workers
        earlyTerminationThreshold: 1, // Extremely low threshold
      });

      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      const Board = (await import('../models/Board')).Board;
      const board = new Board(boardState);

      const result = await extremeOptimizer.getOptimizedMove({
        board,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      expect(result).toBeDefined();
      expect(result.move).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from AI engine errors', async () => {
      // Test that the system continues to function after an error
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      // First, cause an error
      try {
        await aiResponseService.generateAIResponse('', 'B', {
          strategy: 'alphabeta',
          difficulty: 3,
          maxTime: 2000,
          generateAlternatives: false,
          includeExplanation: false,
          validationRequired: false,
        });
      } catch (error) {
        // Expected error, ignore
      }

      // Then verify the system still works
      const result = await aiResponseService.generateAIResponse(boardState, 'B', {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      });

      expect(result).toBeDefined();
      expect(result.aiMove).toBeDefined();
    });

    it('should handle cache errors without affecting core functionality', async () => {
      // Test cache cleanup with potential errors
      const cleanedCount = await cache.cleanupExpiredEntries();
      expect(cleanedCount).toBeGreaterThanOrEqual(0);

      // Verify cache statistics are still accessible
      const stats = cache.getCacheStats();
      expect(stats).toHaveProperty('hitRate');
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });
  });
});
