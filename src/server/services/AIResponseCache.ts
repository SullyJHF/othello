import { createHash } from 'crypto';
import { AIStrategy, Piece } from '../ai/AIEngine';
import { Database } from '../database/Database';

/**
 * Cache entry for AI responses
 */
export interface AIResponseCacheEntry {
  boardHash: string;
  playerToMove: Piece;
  strategy: AIStrategy;
  difficulty: number;
  move: number;
  evaluation: number;
  searchDepth: number;
  calculationTime: number;
  timestamp: Date;
  hitCount: number;
  lastAccessed: Date;
}

/**
 * Configuration for cache behavior
 */
export interface CacheConfig {
  maxEntries: number;
  ttlMinutes: number;
  enablePersistence: boolean;
  enableMemoryCache: boolean;
  preloadCommonPositions: boolean;
}

/**
 * AI Response Cache Service for performance optimization
 * Implements both in-memory and persistent caching strategies
 */
export class AIResponseCache {
  private memoryCache = new Map<string, AIResponseCacheEntry>();
  private db: Database;
  private config: CacheConfig;
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    dbHits: 0,
    dbMisses: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.db = Database.getInstance();
    this.config = {
      maxEntries: 10000,
      ttlMinutes: 60,
      enablePersistence: true,
      enableMemoryCache: true,
      preloadCommonPositions: true,
      ...config,
    };

    // Don't preload during tests unless explicitly enabled and database is available
    if (this.config.preloadCommonPositions && !(process.env.NODE_ENV === 'test' && !process.env.DATABASE_TEST_MODE)) {
      this.preloadCommonPositions().catch(console.error);
    }
  }

  /**
   * Generate cache key for a position
   */
  private generateCacheKey(boardState: string, playerToMove: Piece, strategy: AIStrategy, difficulty: number): string {
    const data = `${boardState}-${playerToMove}-${strategy}-${difficulty}`;
    return createHash('md5').update(data).digest('hex');
  }

  /**
   * Generate board hash for faster lookups
   */
  private generateBoardHash(boardState: string): string {
    return createHash('sha256').update(boardState).digest('hex').substring(0, 16);
  }

  /**
   * Get cached AI response
   */
  async getAIResponse(
    boardState: string,
    playerToMove: Piece,
    strategy: AIStrategy,
    difficulty: number,
  ): Promise<AIResponseCacheEntry | null> {
    const cacheKey = this.generateCacheKey(boardState, playerToMove, strategy, difficulty);

    // Check memory cache first
    if (this.config.enableMemoryCache) {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        memoryEntry.hitCount++;
        memoryEntry.lastAccessed = new Date();
        this.cacheStats.hits++;
        return memoryEntry;
      }
    }

    // Check persistent cache
    if (this.config.enablePersistence) {
      try {
        const boardHash = this.generateBoardHash(boardState);
        const query = `
          SELECT * FROM ai_response_cache 
          WHERE board_hash = $1 AND player_to_move = $2 AND strategy = $3 AND difficulty = $4
          AND created_at > NOW() - INTERVAL '${this.config.ttlMinutes} minutes'
          ORDER BY hit_count DESC, last_accessed DESC
          LIMIT 1
        `;

        const result = await this.db.query(query, [boardHash, playerToMove, strategy, difficulty]);

        if (result.rows.length > 0) {
          const dbEntry = this.mapDbRowToEntry(result.rows[0]);

          // Update access statistics
          await this.updateCacheStatistics(cacheKey, dbEntry.hitCount + 1);

          // Store in memory cache for faster future access
          if (this.config.enableMemoryCache) {
            this.setMemoryCache(cacheKey, dbEntry);
          }

          this.cacheStats.dbHits++;
          this.cacheStats.hits++; // Count database hits as overall hits
          return dbEntry;
        }

        this.cacheStats.dbMisses++;
      } catch (error) {
        console.error('Error querying cache database:', error);
      }
    }

    this.cacheStats.misses++;
    return null;
  }

  /**
   * Store AI response in cache
   */
  async setAIResponse(
    boardState: string,
    playerToMove: Piece,
    strategy: AIStrategy,
    difficulty: number,
    move: number,
    evaluation: number,
    searchDepth: number,
    calculationTime: number,
  ): Promise<void> {
    // Validate evaluation value - skip caching if invalid
    if (!isFinite(evaluation) || isNaN(evaluation)) {
      console.warn('Skipping cache entry due to invalid evaluation value:', evaluation);
      return;
    }

    const cacheKey = this.generateCacheKey(boardState, playerToMove, strategy, difficulty);
    const boardHash = this.generateBoardHash(boardState);

    const entry: AIResponseCacheEntry = {
      boardHash,
      playerToMove,
      strategy,
      difficulty,
      move,
      evaluation,
      searchDepth,
      calculationTime,
      timestamp: new Date(),
      hitCount: 0,
      lastAccessed: new Date(),
    };

    // Store in memory cache
    if (this.config.enableMemoryCache) {
      this.setMemoryCache(cacheKey, entry);
    }

    // Store in persistent cache
    if (this.config.enablePersistence) {
      try {
        const query = `
          INSERT INTO ai_response_cache (
            cache_key, board_hash, board_state, player_to_move, strategy, difficulty,
            ai_move, evaluation, search_depth, calculation_time, hit_count, created_at, last_accessed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (cache_key) DO UPDATE SET
            ai_move = EXCLUDED.ai_move,
            evaluation = EXCLUDED.evaluation,
            search_depth = EXCLUDED.search_depth,
            calculation_time = EXCLUDED.calculation_time,
            last_accessed = EXCLUDED.last_accessed
        `;

        await this.db.query(query, [
          cacheKey,
          boardHash,
          boardState.replace(/\n/g, ''), // Remove newlines for database storage
          playerToMove,
          strategy,
          difficulty,
          move,
          evaluation,
          searchDepth,
          calculationTime,
          0,
          entry.timestamp,
          entry.lastAccessed,
        ]);
      } catch (error) {
        console.error('Error storing cache entry:', error);
      }
    }
  }

  /**
   * Store entry in memory cache with LRU eviction
   */
  private setMemoryCache(cacheKey: string, entry: AIResponseCacheEntry): void {
    // Remove existing entry if it exists (for updates)
    if (this.memoryCache.has(cacheKey)) {
      this.memoryCache.delete(cacheKey);
    }

    // Implement LRU eviction if cache would exceed limit
    while (this.memoryCache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    this.memoryCache.set(cacheKey, entry);
  }

  /**
   * Evict least recently used entries from memory cache
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.cacheStats.evictions++;
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isEntryValid(entry: AIResponseCacheEntry): boolean {
    const now = new Date();
    const ttlMs = this.config.ttlMinutes * 60 * 1000;
    return now.getTime() - entry.timestamp.getTime() < ttlMs;
  }

  /**
   * Update cache statistics in database
   */
  private async updateCacheStatistics(cacheKey: string, newHitCount: number): Promise<void> {
    try {
      const query = `
        UPDATE ai_response_cache 
        SET hit_count = $1, last_accessed = $2 
        WHERE cache_key = $3
      `;
      await this.db.query(query, [newHitCount, new Date(), cacheKey]);
    } catch (error) {
      console.error('Error updating cache statistics:', error);
    }
  }

  /**
   * Map database row to cache entry
   */
  private mapDbRowToEntry(row: any): AIResponseCacheEntry {
    return {
      boardHash: row.board_hash,
      playerToMove: row.player_to_move,
      strategy: row.strategy,
      difficulty: row.difficulty,
      move: row.ai_move,
      evaluation: row.evaluation,
      searchDepth: row.search_depth,
      calculationTime: row.calculation_time,
      timestamp: row.created_at,
      hitCount: row.hit_count,
      lastAccessed: row.last_accessed,
    };
  }

  /**
   * Preload common positions into cache
   */
  private async preloadCommonPositions(): Promise<void> {
    try {
      // Load frequently accessed positions from database
      const query = `
        SELECT * FROM ai_response_cache 
        WHERE hit_count > 5 
        AND created_at > NOW() - INTERVAL '7 days'
        ORDER BY hit_count DESC 
        LIMIT 1000
      `;

      const result = await this.db.query(query);

      for (const row of result.rows) {
        const entry = this.mapDbRowToEntry(row);
        const cacheKey = this.generateCacheKey(row.board_state, entry.playerToMove, entry.strategy, entry.difficulty);
        this.memoryCache.set(cacheKey, entry);
      }

      console.log(`Preloaded ${result.rows.length} common positions into cache`);
    } catch (error) {
      console.error('Error preloading common positions:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    let cleanedMemory = 0;
    let cleanedDatabase = 0;

    // Clean memory cache
    const now = new Date();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isEntryValid(entry)) {
        this.memoryCache.delete(key);
        cleanedMemory++;
      }
    }

    // Clean database cache
    if (this.config.enablePersistence) {
      try {
        const query = `
          DELETE FROM ai_response_cache 
          WHERE created_at < NOW() - INTERVAL '${this.config.ttlMinutes} minutes'
        `;
        const result = await this.db.query(query);
        cleanedDatabase = result.rowCount || 0;
      } catch (error) {
        console.error('Error cleaning database cache:', error);
      }
    }

    return cleanedMemory + cleanedDatabase;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryEntries: number;
    hitRate: number;
    dbHitRate: number;
    totalHits: number;
    totalMisses: number;
    evictions: number;
  } {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const totalDbRequests = this.cacheStats.dbHits + this.cacheStats.dbMisses;

    return {
      memoryEntries: this.memoryCache.size,
      hitRate: totalRequests > 0 ? this.cacheStats.hits / totalRequests : 0,
      dbHitRate: totalDbRequests > 0 ? this.cacheStats.dbHits / totalDbRequests : 0,
      totalHits: this.cacheStats.hits,
      totalMisses: this.cacheStats.misses,
      evictions: this.cacheStats.evictions,
    };
  }

  /**
   * Clear all cached entries
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();

    if (this.config.enablePersistence) {
      try {
        await this.db.query('DELETE FROM ai_response_cache');
      } catch (error) {
        console.error('Error clearing database cache:', error);
      }
    }

    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      dbHits: 0,
      dbMisses: 0,
    };
  }
}

// Singleton instance
export const aiResponseCache = new AIResponseCache();
