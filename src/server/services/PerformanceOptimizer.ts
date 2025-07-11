import { AIEngine, AIStrategy, Piece, AIMoveResult } from '../ai/AIEngine';
import { Board } from '../models/Board';
import { AIResponseCache, aiResponseCache } from './AIResponseCache';
import { Database } from '../database/Database';

/**
 * Configuration for performance optimization
 */
export interface PerformanceConfig {
  enableCaching: boolean;
  enableParallelProcessing: boolean;
  enableEarlyTermination: boolean;
  enablePositionReducing: boolean;
  maxParallelWorkers: number;
  earlyTerminationThreshold: number;
  timeSlicingEnabled: boolean;
  memoryOptimization: boolean;
}

/**
 * Metrics for performance monitoring
 */
export interface PerformanceMetrics {
  cacheHitRate: number;
  averageCalculationTime: number;
  totalCalculations: number;
  parallelCalculations: number;
  earlyTerminations: number;
  memoryUsage: number;
  databaseQueryTime: number;
}

/**
 * Enhanced AI move calculation request
 */
export interface OptimizedMoveRequest {
  board: Board;
  player: Piece;
  strategy: AIStrategy;
  difficulty: number;
  maxTime: number;
  enableCache?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Performance Optimizer Service
 * Provides performance enhancements for AI calculations including caching,
 * parallel processing, and memory optimization
 */
export class PerformanceOptimizer {
  private aiEngine: AIEngine;
  private cache: AIResponseCache;
  private db: Database;
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private calculationQueue: OptimizedMoveRequest[] = [];
  private activeCalculations = new Set<string>();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.aiEngine = new AIEngine();
    this.cache = aiResponseCache;
    this.db = Database.getInstance();
    this.config = {
      enableCaching: true,
      enableParallelProcessing: true,
      enableEarlyTermination: true,
      enablePositionReducing: true,
      maxParallelWorkers: 4,
      earlyTerminationThreshold: 2000, // ms
      timeSlicingEnabled: true,
      memoryOptimization: true,
      ...config,
    };

    this.metrics = {
      cacheHitRate: 0,
      averageCalculationTime: 0,
      totalCalculations: 0,
      parallelCalculations: 0,
      earlyTerminations: 0,
      memoryUsage: 0,
      databaseQueryTime: 0,
    };

    // Start background optimization tasks
    this.startBackgroundOptimization();
  }

  /**
   * Get optimized AI move with performance enhancements
   */
  async getOptimizedMove(request: OptimizedMoveRequest): Promise<AIMoveResult> {
    const startTime = Date.now();
    const boardState = this.getBoardStateString(request.board);

    try {
      // Step 1: Check cache if enabled
      if (this.config.enableCaching && request.enableCache !== false) {
        try {
          const cached = await this.cache.getAIResponse(
            boardState,
            request.player,
            request.strategy,
            request.difficulty,
          );

          if (cached) {
            this.updateMetrics('cacheHit', Date.now() - startTime);
            return {
              move: cached.move,
              evaluation: cached.evaluation,
              searchDepth: cached.searchDepth,
              nodesSearched: 0, // Not stored in cache
              timeElapsed: cached.calculationTime,
              strategy: request.strategy,
              fromCache: true,
            };
          }
        } catch (cacheError) {
          // Cache error - continue to calculation
          console.warn('Cache error, falling back to calculation:', cacheError);
        }
      }

      // Step 2: Check if similar calculation is already in progress
      const calculationKey = this.generateCalculationKey(request);
      if (this.activeCalculations.has(calculationKey)) {
        // Wait for existing calculation or start new one with lower priority
        return await this.handleConcurrentCalculation(request, calculationKey);
      }

      this.activeCalculations.add(calculationKey);

      try {
        // Step 3: Optimize board representation if enabled
        const optimizedBoard = this.config.enablePositionReducing
          ? this.optimizeBoardRepresentation(request.board)
          : request.board;

        // Step 4: Calculate move with optimizations
        const result = await this.calculateOptimizedMove(
          optimizedBoard,
          request.player,
          request.strategy,
          request.difficulty,
          request.maxTime,
        );

        // Step 5: Cache result if enabled
        if (this.config.enableCaching && request.enableCache !== false) {
          await this.cache.setAIResponse(
            boardState,
            request.player,
            request.strategy,
            request.difficulty,
            result.move,
            result.evaluation,
            result.searchDepth,
            result.timeElapsed,
          );
        }

        this.updateMetrics('calculation', Date.now() - startTime);
        return result;
      } finally {
        this.activeCalculations.delete(calculationKey);
      }
    } catch (error) {
      this.updateMetrics('error', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Calculate move with performance optimizations
   */
  private async calculateOptimizedMove(
    board: Board,
    player: Piece,
    strategy: AIStrategy,
    difficulty: number,
    maxTime: number,
  ): Promise<AIMoveResult> {
    const startTime = Date.now();

    // Early termination for simple positions
    if (this.config.enableEarlyTermination) {
      const simpleResult = this.checkForSimplePosition(board, player);
      if (simpleResult) {
        return {
          ...simpleResult,
          timeElapsed: Date.now() - startTime,
          strategy,
          earlyTermination: true,
        };
      }
    }

    // Time slicing for better responsiveness
    if (this.config.timeSlicingEnabled && maxTime > this.config.earlyTerminationThreshold) {
      return await this.calculateWithTimeSlicing(board, player, strategy, difficulty, maxTime);
    }

    // Standard calculation with optimizations
    return await this.aiEngine.getBestMove(board, player, strategy, difficulty, maxTime);
  }

  /**
   * Check for simple positions that can be solved quickly
   */
  private checkForSimplePosition(board: Board, player: Piece): Partial<AIMoveResult> | null {
    const validMoves = this.getValidMoves(board, player);

    // Only one move available
    if (validMoves.length === 1) {
      return {
        move: validMoves[0],
        evaluation: this.aiEngine.evaluatePosition(board, player),
        searchDepth: 1,
        nodesSearched: 1,
      };
    }

    // Check for obvious corner moves - prioritize corner if multiple corners available
    const cornerMoves = validMoves.filter((move) => this.isCornerMove(move));
    if (cornerMoves.length > 0) {
      // Take the first available corner (lowest index for consistency)
      const cornerMove = Math.min(...cornerMoves);
      return {
        move: cornerMove,
        evaluation: this.aiEngine.evaluatePosition(board, player) + 1000, // Corner bonus
        searchDepth: 1,
        nodesSearched: validMoves.length,
      };
    }

    return null;
  }

  /**
   * Calculate move with time slicing for better responsiveness
   */
  private async calculateWithTimeSlicing(
    board: Board,
    player: Piece,
    strategy: AIStrategy,
    difficulty: number,
    maxTime: number,
  ): Promise<AIMoveResult> {
    const timeSlice = Math.min(maxTime / 4, 1000); // Max 1 second per slice
    const maxSlices = Math.ceil(maxTime / timeSlice);

    let bestResult: AIMoveResult | null = null;
    let currentDepth = 1;

    for (let slice = 0; slice < maxSlices && currentDepth <= difficulty; slice++) {
      const sliceStartTime = Date.now();

      try {
        const result = await this.aiEngine.getBestMove(board, player, strategy, currentDepth, timeSlice);

        bestResult = result;
        currentDepth++;

        // Check if we should continue
        const elapsedTime = Date.now() - sliceStartTime;
        if (elapsedTime < timeSlice / 2) {
          // We finished quickly, try next depth
          continue;
        }
      } catch (error) {
        // Time limit reached, return best result so far
        break;
      }
    }

    return bestResult || (await this.aiEngine.getBestMove(board, player, strategy, 1, maxTime));
  }

  /**
   * Optimize board representation for faster processing
   */
  private optimizeBoardRepresentation(board: Board): Board {
    if (!this.config.memoryOptimization) {
      return board;
    }

    // Create a lightweight board copy with only essential data
    const optimizedBoard = new Board(board.boardState);
    // Don't call updateNextMoves here as it might modify the board state

    return optimizedBoard;
  }

  /**
   * Handle concurrent calculations
   */
  private async handleConcurrentCalculation(
    request: OptimizedMoveRequest,
    calculationKey: string,
  ): Promise<AIMoveResult> {
    // Wait for a short time for existing calculation to complete
    const waitTime = Math.min(request.maxTime / 4, 500);
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // If still running, proceed with new calculation with reduced difficulty
    if (this.activeCalculations.has(calculationKey)) {
      return await this.aiEngine.getBestMove(
        request.board,
        request.player,
        request.strategy,
        Math.max(1, request.difficulty - 1), // Reduce difficulty to avoid duplication
        request.maxTime,
      );
    }

    // Try cache again in case the other calculation completed
    const boardState = this.getBoardStateString(request.board);
    const cached = await this.cache.getAIResponse(boardState, request.player, request.strategy, request.difficulty);

    if (cached) {
      return {
        move: cached.move,
        evaluation: cached.evaluation,
        searchDepth: cached.searchDepth,
        nodesSearched: 0,
        timeElapsed: cached.calculationTime,
        strategy: request.strategy,
        fromCache: true,
      };
    }

    // Fallback to standard calculation
    return await this.calculateOptimizedMove(
      request.board,
      request.player,
      request.strategy,
      request.difficulty,
      request.maxTime,
    );
  }

  /**
   * Helper methods
   */
  private getBoardStateString(board: Board): string {
    return board.boardState;
  }

  private generateCalculationKey(request: OptimizedMoveRequest): string {
    return `${this.getBoardStateString(request.board)}-${request.player}-${request.strategy}-${request.difficulty}`;
  }

  private getValidMoves(board: Board, player: Piece): number[] {
    const moves: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (board.canPlacePiece(i, player)) {
        moves.push(i);
      }
    }
    return moves;
  }

  private isCornerMove(move: number): boolean {
    return [0, 7, 56, 63].includes(move);
  }

  private updateMetrics(type: 'cacheHit' | 'calculation' | 'error', duration: number): void {
    this.metrics.totalCalculations++;

    if (type === 'cacheHit') {
      this.metrics.cacheHitRate = this.cache.getCacheStats().hitRate;
    } else if (type === 'calculation') {
      this.metrics.averageCalculationTime =
        (this.metrics.averageCalculationTime * (this.metrics.totalCalculations - 1) + duration) /
        this.metrics.totalCalculations;
    }
  }

  /**
   * Start background optimization tasks
   */
  private startBackgroundOptimization(): void {
    // Clean up cache periodically
    setInterval(async () => {
      try {
        await this.cache.cleanupExpiredEntries();
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    }, 60000); // Every minute

    // Update metrics periodically
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const cacheStats = this.cache.getCacheStats();
    this.metrics.cacheHitRate = cacheStats.hitRate;

    // Update memory usage if available
    if (process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = memUsage.heapUsed / (1024 * 1024); // MB
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      cacheHitRate: 0,
      averageCalculationTime: 0,
      totalCalculations: 0,
      parallelCalculations: 0,
      earlyTerminations: 0,
      memoryUsage: 0,
      databaseQueryTime: 0,
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.cacheHitRate < 0.3) {
      recommendations.push('Consider preloading more common positions to improve cache hit rate');
    }

    if (metrics.averageCalculationTime > 5000) {
      recommendations.push(
        'Average calculation time is high, consider reducing AI difficulty or enabling early termination',
      );
    }

    if (metrics.memoryUsage > 100) {
      recommendations.push('Memory usage is high, enable memory optimization features');
    }

    if (this.activeCalculations.size > this.config.maxParallelWorkers) {
      recommendations.push('Consider increasing parallel worker limit or implementing request queuing');
    }

    return recommendations;
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();
