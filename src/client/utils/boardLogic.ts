import { boardStringToArray, boardArrayToString } from '../../shared/utils/boardUtils';

const WIDTH = 8;
const HEIGHT = 8;

export const OPPOSITE_PIECE: { W: 'B'; B: 'W' } = {
  W: 'B',
  B: 'W',
};

const ALL_DIRECTIONS: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * Client-side board logic for challenges - mirrors server-side Board class
 */
export class ClientBoardLogic {
  /**
   * Check if placing a piece in a direction would capture opponent pieces
   */
  static checkDirection(boardArray: string[], placeId: number, direction: [number, number], piece: 'W' | 'B'): boolean {
    let seenOneOpposite = false;
    let x = placeId % WIDTH;
    let y = Math.floor(placeId / WIDTH);
    x += direction[0];
    y += direction[1];

    while (x < WIDTH && y < HEIGHT && x >= 0 && y >= 0) {
      const currentCell = boardArray[x + WIDTH * y];

      if (currentCell === piece && !seenOneOpposite) return false;
      if (currentCell === piece && seenOneOpposite) return true;
      if (currentCell === OPPOSITE_PIECE[piece]) {
        seenOneOpposite = true;
        x += direction[0];
        y += direction[1];
        continue;
      }
      if (currentCell === '.' || currentCell === '0') return false;

      x += direction[0];
      y += direction[1];
    }

    return false;
  }

  /**
   * Set pieces in a direction (flip captured pieces)
   */
  static setDirection(boardArray: string[], placeId: number, direction: [number, number], piece: 'W' | 'B'): void {
    let x = placeId % WIDTH;
    let y = Math.floor(placeId / WIDTH);

    while (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      x += direction[0];
      y += direction[1];

      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
        break;
      }

      const currentIndex = x + WIDTH * y;
      if (boardArray[currentIndex] === piece) {
        return;
      }

      boardArray[currentIndex] = piece;
    }
  }

  /**
   * Check if a piece can be placed at a position
   */
  static canPlacePiece(boardArray: string[], placeId: number, piece: 'W' | 'B'): boolean {
    // Check if the position is empty or marked as a valid move
    if (boardArray[placeId] !== '.' && boardArray[placeId] !== '0') {
      return false;
    }

    // Check if placing this piece would capture any opponent pieces
    for (const direction of ALL_DIRECTIONS) {
      if (this.checkDirection(boardArray, placeId, direction, piece)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Place a piece and flip captured pieces
   */
  static placePiece(boardState: string, placeId: number, piece: 'W' | 'B'): string | null {
    const boardArray = boardStringToArray(boardState);

    // Validate the move first
    if (!this.canPlacePiece(boardArray, placeId, piece)) {
      return null; // Invalid move
    }

    // Place the piece
    boardArray[placeId] = piece;

    // Flip captured pieces in all directions
    for (const direction of ALL_DIRECTIONS) {
      if (this.checkDirection(boardArray, placeId, direction, piece)) {
        this.setDirection(boardArray, placeId, direction, piece);
      }
    }

    return boardArrayToString(boardArray);
  }

  /**
   * Calculate valid moves for a player
   */
  static calculateValidMoves(boardState: string, piece: 'W' | 'B'): number[] {
    const boardArray = boardStringToArray(boardState);
    const validMoves: number[] = [];

    for (let index = 0; index < boardArray.length; index++) {
      if (this.canPlacePiece(boardArray, index, piece)) {
        validMoves.push(index);
      }
    }

    return validMoves;
  }

  /**
   * Update board state with valid move markers
   */
  static updateValidMoves(boardState: string, piece: 'W' | 'B'): string {
    const boardArray = boardStringToArray(boardState);

    // Clear existing move markers
    boardArray.forEach((cell, index) => {
      if (cell === '0') boardArray[index] = '.';
    });

    // Calculate valid moves directly from the array instead of converting back to string
    const validMoves: number[] = [];
    for (let index = 0; index < boardArray.length; index++) {
      if (this.canPlacePiece(boardArray, index, piece)) {
        validMoves.push(index);
      }
    }

    // Mark valid moves
    for (const placeId of validMoves) {
      boardArray[placeId] = '0';
    }

    return boardArrayToString([...boardArray]); // Use spread to avoid modifying original array
  }

  /**
   * Calculate score from board state
   */
  static calculateScore(boardState: string): { B: number; W: number } {
    const boardArray = boardStringToArray(boardState);
    return boardArray.reduce(
      (acc, piece) => {
        if (piece === 'B' || piece === 'W') {
          acc[piece]++;
        }
        return acc;
      },
      { B: 0, W: 0 },
    );
  }
}
