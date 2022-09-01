import { randomUUID } from 'crypto';
import { ConnectedUser } from './UserManager';

interface Player extends ConnectedUser {
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
    this.currentPlayer = 'W';
    this.players = {};
    this.gameFull = false;

    this.boardState = Game.newBoard();
  }

  static newBoard() {
    return `........
........
........
...WB...
...BW...
........
........
........`;
  }

  getGameData() {
    return this;
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }

  addPlayer(user: ConnectedUser) {
    if (this.gameFull) return;
    this.players[user.userId] = user;
  }
  removePlayer(user: ConnectedUser) {
    const { userId } = user;
    this.players[userId].connected = false;
  }
}
