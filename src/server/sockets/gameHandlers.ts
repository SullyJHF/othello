import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';
import { emit } from './sockets';

export type JoinGameResponse = {
  error: string | null;
};

export const registerGameHandlers = (io: Server, socket: Socket): void => {
  // used when hosting a new game
  const onHostNewGame = (userId: string, userName: string, callback: (gameId: string) => void) => {
    UserManager.updateUserName(userId, userName);
    const user = UserManager.getUserById(userId);
    const game = GameManager.createGame(user);
    callback(game.id);
  };

  // used when joining a game for the first time
  const onJoinGame = (
    userId: string,
    userName: string,
    gameId: string,
    callback: (response: JoinGameResponse) => void
  ) => {
    const game = GameManager.getGame(gameId);
    if (!game) {
      callback({ error: `Game with ID ${gameId} not found.` });
      return;
    }

    UserManager.updateUserName(userId, userName);
    const user = UserManager.getUserById(userId);
    game.addOrUpdatePlayer(user);
    callback({ error: null });
  };

  // used for after a player has actually joined, they just refresh or somehow quit and rejoin the lobby page
  // basically to give the user the initial game data when they load the page
  const onGameJoined = (userId: string, gameId: string, callback: (response: JoinGameResponse) => void) => {
    const user = UserManager.getUserById(userId);
    const game = GameManager.getGame(gameId);
    if (!game) {
      callback({ error: 'Game does not exist!' });
      return;
    }
    if (game.hasPlayer(user)) {
      game.addOrUpdatePlayer(user);
      emit(SocketEvents.GameUpdated(gameId), GameManager.getGame(gameId));
      return;
    }
    console.error('This user is not part of this game!');
    callback({ error: 'User not part of this game!' });
  };

  const onGameStart = (gameId: string) => {
    const game = GameManager.getGame(gameId);
    game.startGame();
    emit(SocketEvents.GameUpdated(gameId), game);
  };

  const onPiecePlaced = (gameId: string, userId: string, placeId: number) => {
    const user = UserManager.getUserById(userId);
    GameManager.getGame(gameId).placePiece(user, placeId);
    emit(SocketEvents.GameUpdated(gameId), GameManager.getGame(gameId));
  };

  socket.on(SocketEvents.PlacePiece, onPiecePlaced);
  socket.on(SocketEvents.HostNewGame, onHostNewGame);
  socket.on(SocketEvents.JoinGame, onJoinGame);
  socket.on(SocketEvents.JoinedGame, onGameJoined);
  socket.on(SocketEvents.StartGame, onGameStart);
};
