import { randomUUID } from 'crypto';
import { boardArrayToString, boardStringToArray } from '../../shared/utils/boardUtils';
import { ConnectedUser } from './UserManager';

export interface Player extends ConnectedUser {
  piece?: 'W' | 'B';
}

const WIDTH = 8;
const OPPOSITE_PIECE: { W: 'B'; B: 'W' } = {
  W: 'B',
  B: 'W',
};
export class Game {
  id: string;
  currentPlayer: 'W' | 'B';
  players: { [userId: string]: Player };
  gameFull: boolean;

  boardState: string;

  constructor() {
    this.id = randomUUID();
    this.currentPlayer = 'B';
    this.players = {};
    this.gameFull = false;

    this.boardState = Game.newBoard();
  }

  static newBoard() {
    return `........
........
...0....
..0WB...
...BW0..
....0...
........
........`;
  }

  getGameData() {
    return this;
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }

  addOrUpdatePlayer(user: ConnectedUser) {
    if (this.players[user.userId]) {
      this.players[user.userId] = { ...this.players[user.userId], ...user };
      return;
    }

    if (this.gameFull) return;
    if (this.getPlayerCount() === 0) {
      this.players[user.userId] = { ...user, piece: 'B' };
    } else {
      this.players[user.userId] = { ...user, piece: 'W' };
      this.gameFull = true;
    }
  }
  removePlayer(user: ConnectedUser) {
    const { userId } = user;
    this.players[userId].connected = false;
  }
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'W' ? 'B' : 'W';
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
      console.log('Can go west');
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
    this.switchPlayer();
  }
  placePiece(user: ConnectedUser, placeId: number) {
    const player = this.players[user.userId];
    if (!player) throw new Error('Player not found!');
    if (player.piece !== this.currentPlayer) throw new Error('Wrong player tried to place a piece!');
    this.updateBoard(placeId, player.piece);
  }
}
