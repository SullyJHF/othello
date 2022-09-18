import { boardArrayToString, boardStringToArray } from '../../shared/utils/boardUtils';

const WIDTH = 8;
const OPPOSITE_PIECE: { W: 'B'; B: 'W' } = {
  W: 'B',
  B: 'W',
};

export class Board {
  boardState: string;

  constructor() {
    this.boardState = `........
........
...0....
..0WB...
...BW0..
....0...
........
........`;
  }
  checkDirection(boardArray: string[], placeId: number, direction: number[], piece: 'W' | 'B') {
    let seenOneOpposite = false;
    let x = placeId % WIDTH;
    let y = Math.floor(placeId / WIDTH);
    x += direction[0];
    y += direction[1];
    while (x < boardArray.length && y < boardArray.length && x >= 0 && y >= 0) {
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
  setDirection(boardArray: string[], placeId: number, direction: number[], piece: 'W' | 'B') {
    let x = placeId % WIDTH;
    let y = Math.floor(placeId / WIDTH);
    while (true) {
      x += direction[0];
      y += direction[1];
      if (boardArray[x + WIDTH * y] === piece) {
        return;
      }
      boardArray[x + WIDTH * y] = piece;
    }
  }
  canGoHere(boardArray: string[], placeId: number, piece: 'W' | 'B') {
    if (boardArray[placeId] !== '.') return false;
    if (this.checkDirection(boardArray, placeId, [1, 0], piece)) return true;
    if (this.checkDirection(boardArray, placeId, [1, 1], piece)) return true;
    if (this.checkDirection(boardArray, placeId, [0, 1], piece)) return true;
    if (this.checkDirection(boardArray, placeId, [-1, 1], piece)) return true;
    if (this.checkDirection(boardArray, placeId, [-1, 0], piece)) return true;
    if (this.checkDirection(boardArray, placeId, [-1, -1], piece)) return true;
    if (this.checkDirection(boardArray, placeId, [0, -1], piece)) return true;
    if (this.checkDirection(boardArray, placeId, [1, -1], piece)) return true;
    return false;
  }
  calcNextMoves(boardArray: string[], nextPiece: 'W' | 'B') {
    const possiblePlaces = [];
    for (let index = 0; index < boardArray.length; index++) {
      if (this.canGoHere(boardArray, index, nextPiece)) possiblePlaces.push(index);
    }
    return possiblePlaces;
  }

  updateBoard(placeId: number, piece: 'W' | 'B') {
    const boardArray = boardStringToArray(this.boardState);
    boardArray[placeId] = piece;
    if (this.checkDirection(boardArray, placeId, [1, 0], piece)) {
      this.setDirection(boardArray, placeId, [1, 0], piece);
    }
    if (this.checkDirection(boardArray, placeId, [1, 1], piece)) {
      this.setDirection(boardArray, placeId, [1, 1], piece);
    }
    if (this.checkDirection(boardArray, placeId, [0, 1], piece)) {
      this.setDirection(boardArray, placeId, [0, 1], piece);
    }
    if (this.checkDirection(boardArray, placeId, [-1, 1], piece)) {
      this.setDirection(boardArray, placeId, [-1, 1], piece);
    }
    if (this.checkDirection(boardArray, placeId, [-1, 0], piece)) {
      this.setDirection(boardArray, placeId, [-1, 0], piece);
    }
    if (this.checkDirection(boardArray, placeId, [-1, -1], piece)) {
      this.setDirection(boardArray, placeId, [-1, -1], piece);
    }
    if (this.checkDirection(boardArray, placeId, [0, -1], piece)) {
      this.setDirection(boardArray, placeId, [0, -1], piece);
    }
    if (this.checkDirection(boardArray, placeId, [1, -1], piece)) {
      this.setDirection(boardArray, placeId, [1, -1], piece);
    }
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
}
