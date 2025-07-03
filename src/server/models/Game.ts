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
  gameFinished: boolean;

  board: Board;

  constructor() {
    this.id = crypto.randomBytes(3).toString('hex');
    this.joinUrl = `${HOST}/join/${this.id}`;
    this.currentPlayer = 'B';
    this.players = {};
    this.gameFull = false;
    this.gameStarted = false;
    this.gameFinished = false;
    this.board = new Board();
  }

  startGame() {
    const pieces: ('W' | 'B')[] = ['W', 'B'];
    const firstPiece = Math.floor(Math.random() * 2);
    const secondPiece = (firstPiece + 1) % 2;
    const userIds = Object.keys(this.players);

    if (userIds.length >= 2) {
      const userId1 = userIds[0];
      const userId2 = userIds[1];

      if (userId1 && userId2) {
        const player1 = this.players[userId1];
        const player2 = this.players[userId2];

        if (player1 && player2) {
          const piece1 = pieces[firstPiece];
          const piece2 = pieces[secondPiece];
          if (piece1 && piece2) {
            player1.piece = piece1;
            player2.piece = piece2;
          }
        }
      }
    }

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
    const player = this.players[userId];
    if (player) {
      player.connected = false;
    }
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

    let canNextPlayerMove = this.board.updateBoard(placeId, player.piece);
    this.switchPlayer();
    if (!canNextPlayerMove) {
      canNextPlayerMove = this.board.updateNextMoves(this.currentPlayer);
      this.switchPlayer();
    }
    if (!canNextPlayerMove) {
      this.gameFinished = true;
    }
  }
}
