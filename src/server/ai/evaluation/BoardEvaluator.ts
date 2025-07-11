import { boardStringToArray } from '../../../shared/utils/boardUtils';
import { Board, OPPOSITE_PIECE } from '../../models/Board';
import { Piece } from '../AIEngine';

/**
 * Advanced board evaluation for Othello positions
 * Based on multiple strategic factors beyond simple piece counting
 */
export class BoardEvaluator {
  // Position weight matrix - corners and edges are most valuable
  private static readonly POSITION_WEIGHTS = [
    100, -20, 10, 5, 5, 10, -20, 100, -20, -40, -5, -5, -5, -5, -40, -20, 10, -5, -1, -1, -1, -1, -5, 10, 5, -5, -1, -1,
    -1, -1, -5, 5, 5, -5, -1, -1, -1, -1, -5, 5, 10, -5, -1, -1, -1, -1, -5, 10, -20, -40, -5, -5, -5, -5, -40, -20,
    100, -20, 10, 5, 5, 10, -20, 100,
  ];

  // Corner positions
  private static readonly CORNERS = [0, 7, 56, 63];

  // Edge positions
  private static readonly EDGES = [
    1,
    2,
    3,
    4,
    5,
    6, // Top edge
    8,
    16,
    24,
    32,
    40,
    48, // Left edge
    15,
    23,
    31,
    39,
    47,
    55, // Right edge
    57,
    58,
    59,
    60,
    61,
    62, // Bottom edge
  ];

  // X-squares (dangerous positions adjacent to corners)
  private static readonly X_SQUARES = [1, 6, 8, 15, 48, 55, 57, 62];

  // C-squares (edge positions adjacent to corners)
  private static readonly C_SQUARES = [9, 14, 49, 54];

  /**
   * Comprehensive board evaluation combining multiple factors
   */
  static evaluate(board: Board, player: Piece): number {
    const boardArray = boardStringToArray(board.boardState);

    let evaluation = 0;

    // 1. Piece count differential (basic)
    evaluation += this.evaluatePieceCount(boardArray, player) * 1;

    // 2. Position weights (strategic squares)
    evaluation += this.evaluatePositionWeights(boardArray, player) * 3;

    // 3. Corner control (very important)
    evaluation += this.evaluateCorners(boardArray, player) * 25;

    // 4. Edge control (important)
    evaluation += this.evaluateEdges(boardArray, player) * 5;

    // 5. Mobility (available moves)
    evaluation += this.evaluateMobility(board, player) * 10;

    // 6. Stability (pieces that can't be flipped)
    evaluation += this.evaluateStability(boardArray, player) * 15;

    // 7. Dangerous squares penalty
    evaluation += this.evaluateDangerousSquares(boardArray, player) * 8;

    return evaluation;
  }

  /**
   * Simple piece count evaluation (player pieces - opponent pieces)
   */
  private static evaluatePieceCount(boardArray: string[], player: Piece): number {
    const opponent = OPPOSITE_PIECE[player];
    let playerCount = 0;
    let opponentCount = 0;

    for (const piece of boardArray) {
      if (piece === player) playerCount++;
      else if (piece === opponent) opponentCount++;
    }

    return playerCount - opponentCount;
  }

  /**
   * Evaluate based on strategic position weights
   */
  private static evaluatePositionWeights(boardArray: string[], player: Piece): number {
    const opponent = OPPOSITE_PIECE[player];
    let score = 0;

    for (let i = 0; i < 64; i++) {
      if (boardArray[i] === player) {
        score += this.POSITION_WEIGHTS[i];
      } else if (boardArray[i] === opponent) {
        score -= this.POSITION_WEIGHTS[i];
      }
    }

    return score;
  }

  /**
   * Corner control evaluation - corners are extremely valuable
   */
  private static evaluateCorners(boardArray: string[], player: Piece): number {
    const opponent = OPPOSITE_PIECE[player];
    let score = 0;

    for (const corner of this.CORNERS) {
      if (boardArray[corner] === player) {
        score += 100;
      } else if (boardArray[corner] === opponent) {
        score -= 100;
      }
    }

    return score;
  }

  /**
   * Edge control evaluation
   */
  private static evaluateEdges(boardArray: string[], player: Piece): number {
    const opponent = OPPOSITE_PIECE[player];
    let score = 0;

    for (const edge of this.EDGES) {
      if (boardArray[edge] === player) {
        score += 5;
      } else if (boardArray[edge] === opponent) {
        score -= 5;
      }
    }

    return score;
  }

  /**
   * Mobility evaluation - more moves available is better
   */
  private static evaluateMobility(board: Board, player: Piece): number {
    const opponent = OPPOSITE_PIECE[player];

    // Count valid moves for player
    const playerMoves = this.countValidMoves(board, player);

    // Count valid moves for opponent (need to create temporary board)
    const tempBoard = new Board(board.boardState);
    tempBoard.updateNextMoves(opponent);
    const opponentMoves = this.countValidMoves(tempBoard, opponent);

    return playerMoves - opponentMoves;
  }

  /**
   * Count valid moves for a player
   */
  private static countValidMoves(board: Board, player: Piece): number {
    const boardArray = boardStringToArray(board.boardState);
    return boardArray.filter((cell) => cell === '0').length;
  }

  /**
   * Stability evaluation - pieces that can't be flipped are valuable
   */
  private static evaluateStability(boardArray: string[], player: Piece): number {
    const opponent = OPPOSITE_PIECE[player];
    let score = 0;

    // Check corner stability (corners are always stable)
    for (const corner of this.CORNERS) {
      if (boardArray[corner] === player) {
        score += 50;
      } else if (boardArray[corner] === opponent) {
        score -= 50;
      }
    }

    // Check edge stability (edges connected to controlled corners)
    score += this.evaluateEdgeStability(boardArray, player);

    return score;
  }

  /**
   * Edge stability evaluation
   */
  private static evaluateEdgeStability(boardArray: string[], player: Piece): number {
    let score = 0;

    // Top edge (if corners 0 or 7 are controlled)
    if (boardArray[0] === player || boardArray[7] === player) {
      for (let i = 1; i < 7; i++) {
        if (boardArray[i] === player) score += 10;
      }
    }

    // Bottom edge (if corners 56 or 63 are controlled)
    if (boardArray[56] === player || boardArray[63] === player) {
      for (let i = 57; i < 63; i++) {
        if (boardArray[i] === player) score += 10;
      }
    }

    // Left edge (if corners 0 or 56 are controlled)
    if (boardArray[0] === player || boardArray[56] === player) {
      for (let i = 8; i < 56; i += 8) {
        if (boardArray[i] === player) score += 10;
      }
    }

    // Right edge (if corners 7 or 63 are controlled)
    if (boardArray[7] === player || boardArray[63] === player) {
      for (let i = 15; i < 63; i += 8) {
        if (boardArray[i] === player) score += 10;
      }
    }

    return score;
  }

  /**
   * Penalty for occupying dangerous squares (X-squares and C-squares)
   */
  private static evaluateDangerousSquares(boardArray: string[], player: Piece): number {
    const opponent = OPPOSITE_PIECE[player];
    let penalty = 0;

    // X-squares penalty (very dangerous - give opponent access to corners)
    for (const xSquare of this.X_SQUARES) {
      if (boardArray[xSquare] === player) {
        // Only penalize if adjacent corner is empty
        const adjacentCorners = this.getAdjacentCorners(xSquare);
        for (const corner of adjacentCorners) {
          if (boardArray[corner] === '.' || boardArray[corner] === '0') {
            penalty -= 50;
          }
        }
      }
    }

    // C-squares penalty (moderately dangerous)
    for (const cSquare of this.C_SQUARES) {
      if (boardArray[cSquare] === player) {
        penalty -= 20;
      }
    }

    return penalty;
  }

  /**
   * Get corners adjacent to an X-square
   */
  private static getAdjacentCorners(xSquare: number): number[] {
    const adjacentCorners: Record<number, number[]> = {
      1: [0], // X-square 1 is adjacent to corner 0
      6: [7], // X-square 6 is adjacent to corner 7
      8: [0], // X-square 8 is adjacent to corner 0
      15: [7], // X-square 15 is adjacent to corner 7
      48: [56], // X-square 48 is adjacent to corner 56
      55: [63], // X-square 55 is adjacent to corner 63
      57: [56], // X-square 57 is adjacent to corner 56
      62: [63], // X-square 62 is adjacent to corner 63
    };

    return adjacentCorners[xSquare] || [];
  }

  /**
   * Simple evaluation for testing (just piece count)
   */
  static simpleEvaluate(board: Board, player: Piece): number {
    const boardArray = boardStringToArray(board.boardState);
    return this.evaluatePieceCount(boardArray, player);
  }
}
