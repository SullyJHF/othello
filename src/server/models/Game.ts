import { randomUUID } from 'crypto';
import { Board } from './Board';
import { ConnectedUser } from './UserManager';

export interface Player extends ConnectedUser {
  piece?: 'W' | 'B';
}
export class Game {
  id: string;
  currentPlayer: 'W' | 'B';
  players: { [userId: string]: Player };
  gameFull: boolean;

  board: Board;

  boardState: string;

  constructor() {
    this.id = randomUUID();
    this.currentPlayer = 'B';
    this.players = {};
    this.gameFull = false;

    this.board = new Board();
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

  placePiece(user: ConnectedUser, placeId: number) {
    const player = this.players[user.userId];
    if (!player) throw new Error('Player not found!');
    if (player.piece !== this.currentPlayer) throw new Error('Wrong player tried to place a piece!');
    const canNextPlayerMove = this.board.updateBoard(placeId, player.piece);
    console.log(canNextPlayerMove);
    this.switchPlayer();
  }
}
