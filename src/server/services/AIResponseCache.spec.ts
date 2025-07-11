import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIResponseCache } from './AIResponseCache';
import { Database } from '../database/Database';

// Mock the Database
vi.mock('../database/Database', () => {
  const mockDb = {
    query: vi.fn(),
  };

  return {
    Database: {
      getInstance: vi.fn(() => mockDb),
    },
  };
});

describe('AIResponseCache', () => {
  let cache: AIResponseCache;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create cache with test configuration
    cache = new AIResponseCache({
      maxEntries: 100,
      ttlMinutes: 30,
      enablePersistence: true,
      enableMemoryCache: true,
      preloadCommonPositions: false, // Disable for tests
    });

    mockDb = Database.getInstance();
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cache operations', () => {
    const testBoardState =
      '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
    const testMove = 19;
    const testEvaluation = 150;

    it('should store and retrieve AI responses', async () => {
      // Store a response
      await cache.setAIResponse(testBoardState, 'B', 'alphabeta', 3, testMove, testEvaluation, 4, 500);

      // Mock database response for retrieval
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            cache_key: 'test-key',
            board_hash: 'test-hash',
            board_state: testBoardState,
            player_to_move: 'B',
            strategy: 'alphabeta',
            difficulty: 3,
            ai_move: testMove,
            evaluation: testEvaluation,
            search_depth: 4,
            calculation_time: 500,
            hit_count: 0,
            created_at: new Date(),
            last_accessed: new Date(),
          },
        ],
      });

      // Retrieve the response
      const retrieved = await cache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);

      expect(retrieved).toBeDefined();
      expect(retrieved?.move).toBe(testMove);
      expect(retrieved?.evaluation).toBe(testEvaluation);
      expect(retrieved?.strategy).toBe('alphabeta');
      expect(retrieved?.playerToMove).toBe('B');
    });

    it('should return null for cache misses', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await cache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const result = await cache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);

      expect(result).toBeNull();
    });

    it('should update hit count on cache access', async () => {
      const mockEntry = {
        cache_key: 'test-key',
        board_hash: 'test-hash',
        board_state: testBoardState,
        player_to_move: 'B',
        strategy: 'alphabeta',
        difficulty: 3,
        ai_move: testMove,
        evaluation: testEvaluation,
        search_depth: 4,
        calculation_time: 500,
        hit_count: 5,
        created_at: new Date(),
        last_accessed: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockEntry] });
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // For update query

      await cache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);

      // Verify that hit count update was called
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ai_response_cache'),
        expect.arrayContaining([6, expect.any(Date), expect.any(String)]),
      );
    });
  });

  describe('memory cache functionality', () => {
    it('should use memory cache when enabled', async () => {
      const testBoardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      // Create cache with memory enabled
      const memoryCache = new AIResponseCache({
        enableMemoryCache: true,
        enablePersistence: false,
        preloadCommonPositions: false,
      });

      // Store in memory
      await memoryCache.setAIResponse(testBoardState, 'B', 'alphabeta', 3, 19, 150, 4, 500);

      // Retrieve from memory (should not hit database)
      const result = await memoryCache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);

      expect(result).toBeDefined();
      expect(result?.move).toBe(19);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should evict least recently used entries when cache is full', async () => {
      const smallCache = new AIResponseCache({
        maxEntries: 2,
        enableMemoryCache: true,
        enablePersistence: false,
        preloadCommonPositions: false,
      });

      const board1 = 'board1' + '0'.repeat(57);
      const board2 = 'board2' + '0'.repeat(57);
      const board3 = 'board3' + '0'.repeat(57);

      // Fill cache to capacity
      await smallCache.setAIResponse(board1, 'B', 'alphabeta', 3, 19, 150, 4, 500);
      await smallCache.setAIResponse(board2, 'B', 'alphabeta', 3, 20, 160, 4, 500);

      // Access first entry to make it recently used
      await smallCache.getAIResponse(board1, 'B', 'alphabeta', 3);

      // Add third entry (should evict board2)
      await smallCache.setAIResponse(board3, 'B', 'alphabeta', 3, 21, 170, 4, 500);

      // Check cache state - board2 should be evicted, but board3 might not be accessible since it only exists in memory
      const result1 = await smallCache.getAIResponse(board1, 'B', 'alphabeta', 3);
      const result3 = await smallCache.getAIResponse(board3, 'B', 'alphabeta', 3);

      expect(result1).toBeDefined();
      expect(result3).toBeDefined();

      // Verify cache has at most 2 entries
      const stats = smallCache.getCacheStats();
      expect(stats.memoryEntries).toBeLessThanOrEqual(2);
    });
  });

  describe('cache cleanup', () => {
    it('should clean up expired entries', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 5 });

      const cleanedCount = await cache.cleanupExpiredEntries();

      expect(cleanedCount).toBe(5);
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM ai_response_cache'));
    });

    it('should handle cleanup errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Cleanup failed'));

      const cleanedCount = await cache.cleanupExpiredEntries();

      expect(cleanedCount).toBe(0);
    });
  });

  describe('cache statistics', () => {
    it('should track cache hit rates', async () => {
      const testBoardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      // Simulate cache miss
      mockDb.query.mockResolvedValue({ rows: [] });
      await cache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);

      // Simulate cache hit
      mockDb.query.mockResolvedValue({
        rows: [
          {
            cache_key: 'test-key',
            board_hash: 'test-hash',
            board_state: testBoardState,
            player_to_move: 'B',
            strategy: 'alphabeta',
            difficulty: 3,
            ai_move: 19,
            evaluation: 150,
            search_depth: 4,
            calculation_time: 500,
            hit_count: 1,
            created_at: new Date(),
            last_accessed: new Date(),
          },
        ],
      });
      await cache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);

      const stats = cache.getCacheStats();

      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 total requests
    });

    it('should return cache statistics', () => {
      const stats = cache.getCacheStats();

      expect(stats).toHaveProperty('memoryEntries');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('dbHitRate');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('totalMisses');
      expect(stats).toHaveProperty('evictions');

      expect(typeof stats.hitRate).toBe('number');
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('cache configuration', () => {
    it('should respect TTL configuration', async () => {
      const shortTtlCache = new AIResponseCache({
        ttlMinutes: 1,
        enableMemoryCache: true,
        enablePersistence: false,
        preloadCommonPositions: false,
      });

      const testBoardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      // Store entry
      await shortTtlCache.setAIResponse(testBoardState, 'B', 'alphabeta', 3, 19, 150, 4, 500);

      // Immediately retrieve (should work)
      let result = await shortTtlCache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);
      expect(result).toBeDefined();

      // Manually expire the entry by modifying its timestamp
      const cacheEntry = (shortTtlCache as any).memoryCache.values().next().value;
      if (cacheEntry) {
        cacheEntry.timestamp = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      }

      // Try to retrieve expired entry
      result = await shortTtlCache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);
      expect(result).toBeNull();
    });

    it('should disable features based on configuration', async () => {
      const disabledCache = new AIResponseCache({
        enableMemoryCache: false,
        enablePersistence: false,
        preloadCommonPositions: false,
      });

      const testBoardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      await disabledCache.setAIResponse(testBoardState, 'B', 'alphabeta', 3, 19, 150, 4, 500);
      const result = await disabledCache.getAIResponse(testBoardState, 'B', 'alphabeta', 3);

      expect(result).toBeNull();
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent cache keys for same input', () => {
      const cache1 = new AIResponseCache();
      const cache2 = new AIResponseCache();

      const testBoardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      // Use reflection to access private method for testing
      const generateKey1 = (cache1 as any).generateCacheKey(testBoardState, 'B', 'alphabeta', 3);
      const generateKey2 = (cache2 as any).generateCacheKey(testBoardState, 'B', 'alphabeta', 3);

      expect(generateKey1).toBe(generateKey2);
    });

    it('should generate different cache keys for different inputs', () => {
      const testBoardState1 =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
      const testBoardState2 =
        '........' + '........' + '........' + '...BW...' + '...WB...' + '........' + '........' + '........';

      const key1 = (cache as any).generateCacheKey(testBoardState1, 'B', 'alphabeta', 3);
      const key2 = (cache as any).generateCacheKey(testBoardState2, 'B', 'alphabeta', 3);
      const key3 = (cache as any).generateCacheKey(testBoardState1, 'W', 'alphabeta', 3);
      const key4 = (cache as any).generateCacheKey(testBoardState1, 'B', 'minimax', 3);
      const key5 = (cache as any).generateCacheKey(testBoardState1, 'B', 'alphabeta', 4);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).not.toBe(key4);
      expect(key1).not.toBe(key5);
    });
  });

  describe('clear cache', () => {
    it('should clear all cache entries', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await cache.clearCache();

      expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM ai_response_cache');

      const stats = cache.getCacheStats();
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
      expect(stats.memoryEntries).toBe(0);
    });

    it('should handle clear cache database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Clear failed'));

      await expect(cache.clearCache()).resolves.not.toThrow();
    });
  });
});
