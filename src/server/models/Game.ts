import { randomUUID } from 'crypto';
import { ConnectedUser } from './UserManager';

export interface Player extends ConnectedUser {
  piece?: 'W' | 'B';
}

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
}
