import { boardStringToArray } from '../../../shared/utils/boardUtils';
import { Board, OPPOSITE_PIECE } from '../../models/Board';
import { IAIStrategy, AIStrategy, AIMoveResult, Piece } from '../AIEngine';
import { BoardEvaluator } from '../evaluation/BoardEvaluator';

/**
 * Minimax algorithm implementation for Othello AI
 * Ported from Python minimax_ai.py with TypeScript optimizations
 */
export class MinimaxStrategy implements IAIStrategy {
  private nodesSearched = 0;
  private startTime = 0;
  private maxTimeMs = 2000;

  getName(): AIStrategy {
    return 'minimax';
  }

  /**
   * Get the best move using minimax algorithm with time limit
   */
  async getBestMove(board: Board, player: Piece, depth: number, maxTime: number): Promise<AIMoveResult> {
    this.nodesSearched = 0;
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
        strategy: 'minimax',
      };
    }

    let bestMove = validMoves[0];
    let bestValue = -Infinity;
    let actualDepth = 0;

    try {
      // Iterative deepening with time management
      for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
        if (this.isTimeUp()) break;

        let moveValue = -Infinity;
        let currentBestMove = validMoves[0];

        for (const move of validMoves) {
          if (this.isTimeUp()) break;

          const newBoard = this.makeMove(board, move, player);
          const value = this.minimax(newBoard, currentDepth - 1, false, player);

          if (value > moveValue) {
            moveValue = value;
            currentBestMove = move;
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
      console.warn('Minimax search timeout, using best move found so far');
    }

    return {
      move: bestMove,
      evaluation: bestValue,
      searchDepth: actualDepth,
      nodesSearched: this.nodesSearched,
      timeElapsed: Date.now() - this.startTime,
      strategy: 'minimax',
    };
  }

  /**
   * Minimax algorithm recursive implementation
   */
  private minimax(board: Board, depth: number, isMaximizing: boolean, originalPlayer: Piece): number {
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
      return this.minimax(board, depth - 1, !isMaximizing, originalPlayer);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of validMoves) {
        if (this.isTimeUp()) break;

        const newBoard = this.makeMove(board, move, currentPlayer);
        const eval_score = this.minimax(newBoard, depth - 1, false, originalPlayer);
        maxEval = Math.max(maxEval, eval_score);
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of validMoves) {
        if (this.isTimeUp()) break;

        const newBoard = this.makeMove(board, move, currentPlayer);
        const eval_score = this.minimax(newBoard, depth - 1, true, originalPlayer);
        minEval = Math.min(minEval, eval_score);
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
    const boardArray = boardStringToArray(board.boardState);

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
   * Move ordering heuristic - prioritize corner and edge moves
   */
  private orderMoves(moves: number[]): number[] {
    const corners = [0, 7, 56, 63];
    const edges = [1, 2, 3, 4, 5, 6, 8, 15, 16, 23, 24, 31, 32, 39, 40, 47, 48, 55, 57, 58, 59, 60, 61, 62];

    return moves.sort((a, b) => {
      // Prioritize corners
      if (corners.includes(a) && !corners.includes(b)) return -1;
      if (!corners.includes(a) && corners.includes(b)) return 1;

      // Then prioritize edges
      if (edges.includes(a) && !edges.includes(b)) return -1;
      if (!edges.includes(a) && edges.includes(b)) return 1;

      return 0;
    });
  }
}
