import { boardArrayToString, boardStringToArray } from '../../shared/utils/boardUtils';

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

export class Board {
  boardState: string;
  score: { B: number; W: number };

  constructor() {
    this.boardState = `........
........
...0....
..0WB...
...BW0..
....0...
........
........`;
    this.score = this.calculateScore();
  }
  checkDirection(boardArray: string[], placeId: number, direction: [number, number], piece: 'W' | 'B') {
    let seenOneOpposite = false;
    let x = placeId % WIDTH;
    let y = Math.floor(placeId / WIDTH);
    x += direction[0];
    y += direction[1];
    while (x < WIDTH && y < WIDTH && x >= 0 && y >= 0) {
      if (boardArray[x + WIDTH * y] === piece && !seenOneOpposite) return false;
      if (boardArray[x + WIDTH * y] === piece && seenOneOpposite) return true;
      if (boardArray[x + WIDTH * y] === OPPOSITE_PIECE[piece]) {
        seenOneOpposite = true;
        x += direction[0];
        y += direction[1];
        continue;
      }
      if (boardArray[x + WIDTH * y] === '.' || boardArray[x + WIDTH * y] === '0') return false;
      x += direction[0];
      y += direction[1];
    }
    return false;
  }
  setDirection(boardArray: string[], placeId: number, direction: [number, number], piece: 'W' | 'B') {
    let x = placeId % WIDTH;
    let y = Math.floor(placeId / WIDTH);
    while (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      x += direction[0];
      y += direction[1];
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
        break;
      }
      if (boardArray[x + WIDTH * y] === piece) {
        return;
      }
      boardArray[x + WIDTH * y] = piece;
    }
  }
  canGoHere(boardArray: string[], placeId: number, piece: 'W' | 'B') {
    if (boardArray[placeId] !== '.') return false;
    for (const direction of ALL_DIRECTIONS) {
      if (this.checkDirection(boardArray, placeId, direction, piece)) return true;
    }
    return false;
  }
  calcNextMoves(boardArray: string[], nextPiece: 'W' | 'B') {
    const possiblePlaces = [];
    for (let index = 0; index < boardArray.length; index++) {
      if (this.canGoHere(boardArray, index, nextPiece)) possiblePlaces.push(index);
    }
    return possiblePlaces;
  }

  placePiece(placeId: number, piece: 'W' | 'B') {
    const boardArray = boardStringToArray(this.boardState);
    boardArray[placeId] = piece;
    for (const direction of ALL_DIRECTIONS) {
      if (this.checkDirection(boardArray, placeId, direction, piece)) {
        this.setDirection(boardArray, placeId, direction, piece);
      }
    }
    this.boardState = boardArrayToString(boardArray);
    this.score = this.calculateScore();
  }

  updateNextMoves(piece: 'W' | 'B') {
    const boardArray = boardStringToArray(this.boardState);
    boardArray.forEach((innerPiece, index) => {
      if (innerPiece === '0') boardArray[index] = '.';
    });
    const nextMoves = this.calcNextMoves(boardArray, OPPOSITE_PIECE[piece]);
    for (const placeId of nextMoves) {
      boardArray[placeId] = '0';
    }
    this.boardState = boardArrayToString(boardArray);
    console.log(this.boardState);
    // returns whether the next player can move
    return nextMoves.length > 0;
  }

  updateBoard(placeId: number, piece: 'W' | 'B') {
    this.placePiece(placeId, piece);
    return this.updateNextMoves(piece);
  }

  calculateScore() {
    const { B, W } = boardStringToArray(this.boardState).reduce(
      (acc, cur) => {
        if (cur === 'B' || cur === 'W') {
          acc[cur]++;
        }
        return acc;
      },
      { B: 0, W: 0 },
    );
    return { B, W };
  }
}
