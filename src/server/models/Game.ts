import crypto from 'crypto';
import { HOST } from '../env';
import { Board, OPPOSITE_PIECE } from './Board';
import { ConnectedUser } from './UserManager';

export type Piece = 'W' | 'B';

export interface Player extends ConnectedUser {
  piece?: Piece;
}
export class Game {
  id: string;
  joinUrl: string;
  currentPlayer: Piece;
  players: { [userId: string]: Player };
  gameStarted: boolean;
  gameFull: boolean;

  board: Board;

  constructor() {
    this.id = crypto.randomBytes(3).toString('hex');
    this.joinUrl = HOST + `/join/${this.id}`;
    this.currentPlayer = 'B';
    this.players = {};
    this.gameFull = false;
    this.gameStarted = false;
  }

  startGame() {
    const pieces: ('W' | 'B')[] = ['W', 'B'];
    const firstPiece = Math.floor(Math.random() * 2);
    const secondPiece = (firstPiece + 1) % 2;
    const userIds = Object.keys(this.players);
    this.players[userIds[0]].piece = pieces[firstPiece];
    this.players[userIds[1]].piece = pieces[secondPiece];
    this.board = new Board();
    this.gameStarted = true;
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

  hasPlayer(user: ConnectedUser) {
    if (!user) return false;
    if (this.players[user.userId]) {
      this.addOrUpdatePlayer(user);
      return true;
    }
    return false;
  }

  switchPlayer() {
    this.currentPlayer = OPPOSITE_PIECE[this.currentPlayer];
  }

  placePiece(user: ConnectedUser, placeId: number) {
    const player = this.players[user.userId];
    if (!player) throw new Error('Player not found!');
    if (player.piece !== this.currentPlayer) throw new Error('Wrong player tried to place a piece!');

    const canNextPlayerMove = this.board.updateBoard(placeId, player.piece);
    this.switchPlayer();
  }
}
