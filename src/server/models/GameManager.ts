import { SocketEvents } from '../../shared/SocketEvents';
import { GameListRoom } from '../sockets/gameListHandlers';
import { emit } from './../sockets/sockets';
import { Game } from './Game';
import { ConnectedUser } from './UserManager';

export type GameMap = {
  [id: string]: Game;
};

class GameManager {
  static instance: GameManager;
  private _games: GameMap;

  constructor() {
    this._games = {};
  }

  static getInstance() {
    if (!this.instance) this.instance = new GameManager();
    return this.instance;
  }

  createGame() {
    console.log('Creating game.');
    const game = new Game();
    this._games[game.id] = game;
    console.log(`Game ${game.id} created.`);
    this.onGameCreated(game);
    return game;
  }

  onGameCreated(game: Game) {
    emit(SocketEvents.GameListUpdated, game, GameListRoom);
  }

  getGame(id: string) {
    return this._games[id];
  }

  getGameIdsUserIsIn(user: ConnectedUser) {
    return Object.keys(this._games).filter((gameId) => this._games[gameId].hasPlayer(user));
  }

  public get allGameIds(): string[] {
    return Object.keys(this._games);
  }

  public get games(): GameMap {
    return this._games;
  }

  // on(event: string, cb: Function) {
  //   console.log('Registering handler');
  //   console.log(event);
  //   this.events[event] ||= [];
  //   this.events[event].push(cb);
  //   console.log(this.events[event]);
  // }

  // async callHandlers(event: string, ...args: any[]) {
  //   console.log(`Calling all ${event} handlers:`);
  //   console.log(this.events[event].length);
  //   this.events[event].forEach((ev) => {
  //     ev(...args);
  //   });
  // }
}

export default GameManager.getInstance();
