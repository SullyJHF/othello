import { boardStringToArray } from '../../../shared/utils/boardUtils';
import { Board, OPPOSITE_PIECE } from '../../models/Board';
import { IAIStrategy, AIStrategy, AIMoveResult, Piece } from '../AIEngine';
import { BoardEvaluator } from '../evaluation/BoardEvaluator';

/**
 * Alpha-Beta pruning algorithm implementation for Othello AI
 * Ported from Python alphabeta_ai.py with enhanced TypeScript optimizations
 */
export class AlphaBetaStrategy implements IAIStrategy {
  private nodesSearched = 0;
  private startTime = 0;
  private maxTimeMs = 2000;
  private pruneCount = 0;

  getName(): AIStrategy {
    return 'alphabeta';
  }

  /**
   * Get the best move using alpha-beta pruning with time limit
   */
  async getBestMove(board: Board, player: Piece, depth: number, maxTime: number): Promise<AIMoveResult> {
    this.nodesSearched = 0;
    this.pruneCount = 0;
    this.startTime = Date.now();
    this.maxTimeMs = maxTime;

    const validMoves = this.getValidMoves(board, player);

    if (validMoves.length === 0) {
      throw new Error('No valid moves available');
    }

    if (validMoves.length === 1) {
      return {
        move: validMoves[0],
        evaluation: this.evaluatePosition(board, player),
        searchDepth: 0,
        nodesSearched: 1,
        timeElapsed: Date.now() - this.startTime,
        strategy: 'alphabeta',
      };
    }

    let bestMove = validMoves[0];
    let bestValue = -Infinity;
    let actualDepth = 0;

    // Order moves for better alpha-beta pruning
    const orderedMoves = this.orderMoves(validMoves);

    try {
      // Iterative deepening with time management
      for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
        if (this.isTimeUp()) break;

        let moveValue = -Infinity;
        let currentBestMove = orderedMoves[0];
        let alpha = -Infinity;
        const beta = Infinity;

        for (const move of orderedMoves) {
          if (this.isTimeUp()) break;

          const newBoard = this.makeMove(board, move, player);
          const value = this.alphaBeta(newBoard, currentDepth - 1, alpha, beta, false, player);

          if (value > moveValue) {
            moveValue = value;
            currentBestMove = move;
          }

          alpha = Math.max(alpha, value);
          if (alpha >= beta) {
            this.pruneCount++;
            break; // Beta cutoff
          }
        }

        // Only update if we completed this depth level
        if (!this.isTimeUp()) {
          bestMove = currentBestMove;
          bestValue = moveValue;
          actualDepth = currentDepth;
        }
      }
    } catch (error) {
      // Timeout occurred, use best move found so far
      console.warn('Alpha-beta search timeout, using best move found so far');
    }

    return {
      move: bestMove,
      evaluation: bestValue,
      searchDepth: actualDepth,
      nodesSearched: this.nodesSearched,
      timeElapsed: Date.now() - this.startTime,
      strategy: 'alphabeta',
    };
  }

  /**
   * Alpha-Beta pruning algorithm recursive implementation
   */
  private alphaBeta(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    originalPlayer: Piece,
  ): number {
    this.nodesSearched++;

    // Check for timeout
    if (this.isTimeUp()) {
      throw new Error('Search timeout');
    }

    // Base case: leaf node or maximum depth reached
    if (depth === 0 || this.isGameOver(board)) {
      return this.evaluatePosition(board, originalPlayer);
    }

    const currentPlayer = isMaximizing ? originalPlayer : OPPOSITE_PIECE[originalPlayer];
    const validMoves = this.getValidMoves(board, currentPlayer);

    // No valid moves available - pass turn
    if (validMoves.length === 0) {
      const opponentPlayer = OPPOSITE_PIECE[currentPlayer];
      const opponentMoves = this.getValidMoves(board, opponentPlayer);

      if (opponentMoves.length === 0) {
        // Game over - no moves for either player
        return this.evaluatePosition(board, originalPlayer);
      }

      // Pass turn to opponent
      return this.alphaBeta(board, depth - 1, alpha, beta, !isMaximizing, originalPlayer);
    }

    // Order moves for better pruning efficiency
    const orderedMoves = this.orderMoves(validMoves);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of orderedMoves) {
        if (this.isTimeUp()) break;

        const newBoard = this.makeMove(board, move, currentPlayer);
        const eval_score = this.alphaBeta(newBoard, depth - 1, alpha, beta, false, originalPlayer);
        maxEval = Math.max(maxEval, eval_score);
        alpha = Math.max(alpha, eval_score);

        if (beta <= alpha) {
          this.pruneCount++;
          break; // Beta cutoff (prune)
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of orderedMoves) {
        if (this.isTimeUp()) break;

        const newBoard = this.makeMove(board, move, currentPlayer);
        const eval_score = this.alphaBeta(newBoard, depth - 1, alpha, beta, true, originalPlayer);
        minEval = Math.min(minEval, eval_score);
        beta = Math.min(beta, eval_score);

        if (beta <= alpha) {
          this.pruneCount++;
          break; // Alpha cutoff (prune)
        }
      }
      return minEval;
    }
  }

  /**
   * Evaluate board position for the given player
   */
  evaluatePosition(board: Board, player: Piece): number {
    return BoardEvaluator.evaluate(board, player);
  }

  /**
   * Get all valid moves for a player
   */
  private getValidMoves(board: Board, player: Piece): number[] {
    const validMoves: number[] = [];

    for (let i = 0; i < 64; i++) {
      if (board.canPlacePiece(i, player)) {
        validMoves.push(i);
      }
    }

    return validMoves;
  }

  /**
   * Create a new board with the move applied
   */
  private makeMove(board: Board, move: number, player: Piece): Board {
    const newBoard = new Board(board.boardState);
    newBoard.placePiece(move, player);
    return newBoard;
  }

  /**
   * Check if the game is over (no valid moves for either player)
   */
  private isGameOver(board: Board): boolean {
    const whiteMovesCount = this.getValidMoves(board, 'W').length;
    const blackMovesCount = this.getValidMoves(board, 'B').length;

    return whiteMovesCount === 0 && blackMovesCount === 0;
  }

  /**
   * Check if maximum thinking time has been exceeded
   */
  private isTimeUp(): boolean {
    return Date.now() - this.startTime >= this.maxTimeMs;
  }

  /**
   * Advanced move ordering heuristic for better alpha-beta pruning
   * Better move ordering leads to more pruning opportunities
   */
  private orderMoves(moves: number[]): number[] {
    const corners = [0, 7, 56, 63];
    const xSquares = [1, 6, 8, 15, 48, 55, 57, 62]; // Dangerous squares adjacent to corners
    const cSquares = [9, 14, 49, 54]; // Edge squares adjacent to corners
    const edges = [2, 3, 4, 5, 16, 23, 24, 31, 32, 39, 40, 47, 58, 59, 60, 61];

    return moves.sort((a, b) => {
      // Priority 1: Corners (highest priority)
      if (corners.includes(a) && !corners.includes(b)) return -1;
      if (!corners.includes(a) && corners.includes(b)) return 1;

      // Priority 2: Avoid X-squares and C-squares (dangerous moves)
      if ((xSquares.includes(a) || cSquares.includes(a)) && !(xSquares.includes(b) || cSquares.includes(b))) return 1;
      if (!(xSquares.includes(a) || cSquares.includes(a)) && (xSquares.includes(b) || cSquares.includes(b))) return -1;

      // Priority 3: Prefer edges
      if (edges.includes(a) && !edges.includes(b)) return -1;
      if (!edges.includes(a) && edges.includes(b)) return 1;

      // Priority 4: Center positions (for early game)
      const aCenterDistance = this.getCenterDistance(a);
      const bCenterDistance = this.getCenterDistance(b);

      return aCenterDistance - bCenterDistance;
    });
  }

  /**
   * Calculate distance from center for move ordering
   */
  private getCenterDistance(position: number): number {
    const row = Math.floor(position / 8);
    const col = position % 8;
    const centerRow = 3.5;
    const centerCol = 3.5;

    return Math.abs(row - centerRow) + Math.abs(col - centerCol);
  }

  /**
   * Get pruning statistics for performance analysis
   */
  getPruningStats(): { nodesSearched: number; pruneCount: number; pruningEfficiency: number } {
    const pruningEfficiency = this.nodesSearched > 0 ? this.pruneCount / this.nodesSearched : 0;
    return {
      nodesSearched: this.nodesSearched,
      pruneCount: this.pruneCount,
      pruningEfficiency,
    };
  }
}
