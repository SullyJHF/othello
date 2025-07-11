import { Board } from '../models/Board';
import { AlphaBetaStrategy } from './strategies/AlphaBetaStrategy';
import { MinimaxStrategy } from './strategies/MinimaxStrategy';

export type Piece = 'W' | 'B';
export type AIStrategy = 'minimax' | 'alphabeta' | 'random';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * AI move result with evaluation details
 */
export interface AIMoveResult {
  move: number; // Board position (0-63)
  evaluation: number; // Position evaluation score
  searchDepth: number; // Depth searched
  nodesSearched: number; // Performance metric
  timeElapsed: number; // Computation time in ms
  strategy: AIStrategy; // Algorithm used
}

/**
 * AI configuration for strategy selection
 */
export interface AIConfig {
  strategy: AIStrategy;
  difficulty: DifficultyLevel; // Maps to search depth
  maxThinkingTime: number; // Max computation time in ms
  randomness: number; // 0-1, adds variation to moves
}

/**
 * Interface for AI strategy implementations
 */
export interface IAIStrategy {
  /**
   * Calculate the best move for the given position
   */
  getBestMove(board: Board, player: Piece, depth: number, maxTime: number): Promise<AIMoveResult>;

  /**
   * Evaluate a board position for the given player
   */
  evaluatePosition(board: Board, player: Piece): number;

  /**
   * Get strategy name
   */
  getName(): AIStrategy;
}

/**
 * Main AI Engine class that manages different strategies
 */
export class AIEngine {
  private strategies: Map<AIStrategy, IAIStrategy> = new Map();
  private defaultConfig: AIConfig = {
    strategy: 'alphabeta',
    difficulty: 4,
    maxThinkingTime: 2000, // 2 seconds
    randomness: 0.1, // Slight variation
  };

  constructor() {
    // Register default strategies
    this.registerStrategy(new MinimaxStrategy());
    this.registerStrategy(new AlphaBetaStrategy());
  }

  /**
   * Register an AI strategy
   */
  registerStrategy(strategy: IAIStrategy): void {
    this.strategies.set(strategy.getName(), strategy);
  }

  /**
   * Get the best move using specified configuration
   */
  async getBestMove(boardState: string, player: Piece, config: Partial<AIConfig> = {}): Promise<AIMoveResult> {
    const aiConfig = { ...this.defaultConfig, ...config };
    const board = new Board(boardState);

    const strategy = this.strategies.get(aiConfig.strategy);
    if (!strategy) {
      throw new Error(`AI Strategy '${aiConfig.strategy}' not found`);
    }

    const depth = this.difficultyToDepth(aiConfig.difficulty);
    const result = await strategy.getBestMove(board, player, depth, aiConfig.maxThinkingTime);

    // Apply randomness if configured
    if (aiConfig.randomness > 0 && Math.random() < aiConfig.randomness) {
      const validMoves = this.getValidMoves(board, player);
      if (validMoves.length > 1) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        result.move = randomMove;
        result.evaluation = strategy.evaluatePosition(board, player);
      }
    }

    return result;
  }

  /**
   * Evaluate a position without making a move
   */
  evaluatePosition(boardState: string, player: Piece, strategy: AIStrategy = 'alphabeta'): number {
    const board = new Board(boardState);
    const aiStrategy = this.strategies.get(strategy);

    if (!aiStrategy) {
      throw new Error(`AI Strategy '${strategy}' not found`);
    }

    return aiStrategy.evaluatePosition(board, player);
  }

  /**
   * Get all valid moves for a player
   */
  private getValidMoves(board: Board, player: Piece): number[] {
    const boardArray = board.boardState.replace(/\n/g, '').split('');
    const validMoves: number[] = [];

    for (let i = 0; i < 64; i++) {
      if (boardArray[i] === '0') {
        validMoves.push(i);
      }
    }

    return validMoves;
  }

  /**
   * Convert difficulty level to search depth
   */
  private difficultyToDepth(difficulty: DifficultyLevel): number {
    const depthMap: Record<DifficultyLevel, number> = {
      1: 2, // Beginner
      2: 3, // Easy
      3: 4, // Medium
      4: 5, // Hard
      5: 6, // Expert
      6: 7, // Master
    };
    return depthMap[difficulty];
  }

  /**
   * Get available AI strategies
   */
  getAvailableStrategies(): AIStrategy[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if a strategy is available
   */
  hasStrategy(strategy: AIStrategy): boolean {
    return this.strategies.has(strategy);
  }
}

/**
 * Singleton AI Engine instance
 */
export const aiEngine = new AIEngine();
