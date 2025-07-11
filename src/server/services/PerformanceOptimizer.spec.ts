import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { AIEngine } from '../ai/AIEngine';
import { Board } from '../models/Board';
import { AIResponseCache } from './AIResponseCache';
import { Database } from '../database/Database';

// Mock dependencies
vi.mock('../ai/AIEngine', () => ({
  AIEngine: vi.fn(() => ({
    getBestMove: vi.fn(),
    evaluatePosition: vi.fn(),
  })),
}));

vi.mock('./AIResponseCache', () => ({
  AIResponseCache: vi.fn(() => ({
    getAIResponse: vi.fn(),
    setAIResponse: vi.fn(),
    getCacheStats: vi.fn(() => ({
      hitRate: 0.5,
      memoryEntries: 10,
      totalHits: 50,
      totalMisses: 50,
      evictions: 5,
    })),
    cleanupExpiredEntries: vi.fn(),
  })),
  aiResponseCache: {
    getAIResponse: vi.fn(),
    setAIResponse: vi.fn(),
    getCacheStats: vi.fn(() => ({
      hitRate: 0.5,
      memoryEntries: 10,
      totalHits: 50,
      totalMisses: 50,
      evictions: 5,
    })),
    cleanupExpiredEntries: vi.fn(),
  },
}));

vi.mock('../database/Database', () => ({
  Database: {
    getInstance: vi.fn(() => ({
      query: vi.fn(),
    })),
  },
}));

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;
  let mockAIEngine: any;
  let mockCache: any;
  let testBoard: Board;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create test board
    const boardState =
      '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
    testBoard = new Board(boardState);
    testBoard.updateNextMoves('B');

    // Create optimizer with test configuration
    optimizer = new PerformanceOptimizer({
      enableCaching: true,
      enableParallelProcessing: true,
      enableEarlyTermination: true,
      enablePositionReducing: true,
      maxParallelWorkers: 2,
      earlyTerminationThreshold: 1000,
      timeSlicingEnabled: true,
      memoryOptimization: true,
    });

    // Get mock instances
    mockAIEngine = (optimizer as any).aiEngine;
    mockCache = (optimizer as any).cache;

    // Setup default mocks
    mockAIEngine.getBestMove.mockResolvedValue({
      move: 19,
      evaluation: 150,
      searchDepth: 3,
      nodesSearched: 1234,
      timeElapsed: 500,
      strategy: 'alphabeta',
    });

    mockAIEngine.evaluatePosition.mockReturnValue(100);

    mockCache.getAIResponse.mockResolvedValue(null); // Cache miss by default
    mockCache.setAIResponse.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('optimized move calculation', () => {
    it('should return cached result when available', async () => {
      const cachedResponse = {
        move: 26,
        evaluation: 200,
        searchDepth: 4,
        calculationTime: 300,
      };

      mockCache.getAIResponse.mockResolvedValue(cachedResponse);

      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      expect(result.move).toBe(26);
      expect(result.evaluation).toBe(200);
      expect(result.fromCache).toBe(true);
      expect(mockAIEngine.getBestMove).not.toHaveBeenCalled();
    });

    it('should calculate new move when cache miss', async () => {
      mockCache.getAIResponse.mockResolvedValue(null);

      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      expect(result.move).toBe(19);
      expect(result.evaluation).toBe(150);
      expect(mockAIEngine.getBestMove).toHaveBeenCalled();
      expect(mockCache.setAIResponse).toHaveBeenCalled();
    });

    it('should handle cache disabled', async () => {
      // Temporarily disable caching on existing optimizer
      const originalConfig = (optimizer as any).config;
      (optimizer as any).config = { ...originalConfig, enableCaching: false };

      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        enableCache: false,
      });

      // Restore original config
      (optimizer as any).config = originalConfig;

      expect(result.move).toBe(19);
      expect(mockAIEngine.getBestMove).toHaveBeenCalled();
    });
  });

  describe('early termination optimization', () => {
    it('should use early termination for single valid move', async () => {
      // Mock board with only one valid move
      const singleMoveBoard = new Board('WWWWWWWWWWWWWWWWWWWWWWWWWWWWBWWWBW0WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW');
      vi.spyOn(singleMoveBoard, 'canPlacePiece').mockImplementation((i, player) => i === 29);

      // Also mock the optimizer's getValidMoves to return only position 29
      vi.spyOn(optimizer as any, 'getValidMoves').mockReturnValue([29]);

      const result = await optimizer.getOptimizedMove({
        board: singleMoveBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      expect(result.move).toBe(29);
      expect(result.searchDepth).toBe(1);
      expect(result.earlyTermination).toBe(true);
    });

    it('should use early termination for obvious corner moves', async () => {
      // Mock board where corner move is available
      vi.spyOn(testBoard, 'canPlacePiece').mockImplementation((i, player) => {
        return [0, 19, 26].includes(i); // Include corner move 0
      });

      // Also mock the optimizer's getValidMoves to return the corner move options
      vi.spyOn(optimizer as any, 'getValidMoves').mockReturnValue([0, 19, 26]);

      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      expect(result.move).toBe(0); // Should choose corner
      expect(result.evaluation).toBeGreaterThan(1000); // Corner bonus
      expect(result.earlyTermination).toBe(true);
    });
  });

  describe('time slicing optimization', () => {
    it('should use time slicing for long calculations', async () => {
      let callCount = 0;
      mockAIEngine.getBestMove.mockImplementation(async (board, player, strategy, depth, maxTime) => {
        callCount++;
        if (callCount === 1) {
          return {
            move: 19,
            evaluation: 100,
            searchDepth: 1,
            nodesSearched: 100,
            timeElapsed: 200,
            strategy: 'alphabeta',
          };
        }
        return {
          move: 26,
          evaluation: 150,
          searchDepth: 2,
          nodesSearched: 500,
          timeElapsed: 400,
          strategy: 'alphabeta',
        };
      });

      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 4,
        maxTime: 5000, // Long enough to trigger time slicing
      });

      expect(callCount).toBeGreaterThan(1); // Should be called multiple times
      expect(result.move).toBeDefined();
    });

    it('should disable time slicing for short calculations', async () => {
      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 500, // Short time, no slicing
      });

      expect(mockAIEngine.getBestMove).toHaveBeenCalledTimes(1);
      expect(result.move).toBe(19);
    });
  });

  describe('concurrent calculation handling', () => {
    it('should handle concurrent calculations', async () => {
      // Mock that a calculation is already in progress
      (optimizer as any).activeCalculations.add(
        (optimizer as any).generateCalculationKey({
          board: testBoard,
          player: 'B',
          strategy: 'alphabeta',
          difficulty: 3,
        }),
      );

      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      // Should reduce difficulty to avoid duplication
      expect(mockAIEngine.getBestMove).toHaveBeenCalledWith(
        expect.any(Object),
        'B',
        'alphabeta',
        2, // Reduced from 3
        2000,
      );
    });
  });

  describe('memory optimization', () => {
    it('should optimize board representation when enabled', async () => {
      const optimizedBoard = (optimizer as any).optimizeBoardRepresentation(testBoard);

      expect(optimizedBoard).toBeInstanceOf(Board);
      expect(optimizedBoard.boardState).toBe(testBoard.boardState);
    });

    it('should skip optimization when disabled', () => {
      const noOptimizationOptimizer = new PerformanceOptimizer({
        memoryOptimization: false,
      });

      const result = (noOptimizationOptimizer as any).optimizeBoardRepresentation(testBoard);
      expect(result).toBe(testBoard); // Same reference
    });
  });

  describe('helper methods', () => {
    it('should identify corner moves correctly', () => {
      expect((optimizer as any).isCornerMove(0)).toBe(true);
      expect((optimizer as any).isCornerMove(7)).toBe(true);
      expect((optimizer as any).isCornerMove(56)).toBe(true);
      expect((optimizer as any).isCornerMove(63)).toBe(true);
      expect((optimizer as any).isCornerMove(19)).toBe(false);
      expect((optimizer as any).isCornerMove(32)).toBe(false);
    });

    it('should get valid moves correctly', () => {
      vi.spyOn(testBoard, 'canPlacePiece').mockImplementation((i, player) => {
        return [18, 19, 26, 27].includes(i);
      });

      const validMoves = (optimizer as any).getValidMoves(testBoard, 'B');
      expect(validMoves).toEqual([18, 19, 26, 27]);
    });

    it('should generate consistent calculation keys', () => {
      const key1 = (optimizer as any).generateCalculationKey({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
      });

      const key2 = (optimizer as any).generateCalculationKey({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
      });

      expect(key1).toBe(key2);
    });
  });

  describe('performance metrics', () => {
    it('should track performance metrics', async () => {
      await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      const metrics = optimizer.getMetrics();

      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('averageCalculationTime');
      expect(metrics).toHaveProperty('totalCalculations');
      expect(metrics.totalCalculations).toBeGreaterThan(0);
    });

    it('should reset metrics', () => {
      optimizer.resetMetrics();

      const metrics = optimizer.getMetrics();
      expect(metrics.totalCalculations).toBe(0);
      expect(metrics.averageCalculationTime).toBe(0);
    });

    it('should provide optimization recommendations', async () => {
      // Simulate poor cache performance
      mockCache.getCacheStats.mockReturnValue({
        hitRate: 0.1, // Low hit rate
        memoryEntries: 5,
        totalHits: 10,
        totalMisses: 90,
        evictions: 0,
      });

      // Update the optimizer's cache reference to use the mocked stats
      (optimizer as any).cache = mockCache;

      const recommendations = optimizer.getOptimizationRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toContain('cache hit rate');
    });
  });

  describe('error handling', () => {
    it('should handle AI engine errors gracefully', async () => {
      mockAIEngine.getBestMove.mockRejectedValue(new Error('AI calculation failed'));

      await expect(
        optimizer.getOptimizedMove({
          board: testBoard,
          player: 'B',
          strategy: 'alphabeta',
          difficulty: 3,
          maxTime: 2000,
        }),
      ).rejects.toThrow('AI calculation failed');
    });

    it('should handle cache errors gracefully', async () => {
      mockCache.getAIResponse.mockRejectedValue(new Error('Cache error'));

      // Should still work by falling back to calculation
      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      expect(result.move).toBe(19);
      expect(mockAIEngine.getBestMove).toHaveBeenCalled();
    });
  });

  describe('configuration options', () => {
    it('should respect disabled features', async () => {
      // Temporarily disable all optimizations on existing optimizer
      const originalConfig = (optimizer as any).config;
      (optimizer as any).config = {
        ...originalConfig,
        enableCaching: false,
        enableEarlyTermination: false,
        enablePositionReducing: false,
        timeSlicingEnabled: false,
      };

      const result = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
      });

      // Restore original config
      (optimizer as any).config = originalConfig;

      expect(result.move).toBe(19);
      // Should use standard calculation path
    });

    it('should handle different priority levels', async () => {
      const highPriorityResult = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        priority: 'high',
      });

      const lowPriorityResult = await optimizer.getOptimizedMove({
        board: testBoard,
        player: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        priority: 'low',
      });

      expect(highPriorityResult.move).toBeDefined();
      expect(lowPriorityResult.move).toBeDefined();
    });
  });

  describe('background optimization', () => {
    it('should update performance metrics periodically', () => {
      // Test that background optimization starts
      expect((optimizer as any).startBackgroundOptimization).toBeDefined();

      // Test metric updates
      (optimizer as any).updatePerformanceMetrics();
      const metrics = optimizer.getMetrics();
      expect(metrics.cacheHitRate).toBe(0.5); // From mock
    });
  });
});
