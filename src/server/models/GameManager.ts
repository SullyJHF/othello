import { Game } from './Game';
import { ConnectedUser } from './UserManager';

class GameManager {
  static instance: GameManager;
  games: {
    [id: string]: Game;
  };

  constructor() {
    this.games = {};
  }

  static getInstance() {
    if (!this.instance) this.instance = new GameManager();
    return this.instance;
  }

  createGame() {
    console.log('Creating game.');
    const game = new Game();
    this.games[game.id] = game;
    console.log(`Game ${game.id} created.`);
    return game;
  }

  getGame(id: string) {
    return this.games[id];
  }

  getGameIdsUserIsIn(user: ConnectedUser) {
    return Object.keys(this.games).filter((gameId) => {
      const game = this.games[gameId];
      return game?.hasPlayer(user);
    });
  }
}

export default GameManager.getInstance();
