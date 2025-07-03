import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';
import { emit } from './sockets';

export const registerUserHandlers = (io: Server, socket: Socket): void => {
  const userJoin = (userId: string) => {
    const user = UserManager.userConnected(userId, socket.id);
    const games = GameManager.getGameIdsUserIsIn(user);
    console.log(`${userId} joined`);
    console.log(games);
    for (const gameId of games) {
      const game = GameManager.getGame(gameId);
      if (game) {
        game.addOrUpdatePlayer(user);
        emit(SocketEvents.GameUpdated(gameId), game);
      }
    }
  };
  const userLeave = () => {
    const user = UserManager.userDisconnected(socket.id);
    const games = GameManager.getGameIdsUserIsIn(user);
    for (const gameId of games) {
      const game = GameManager.getGame(gameId);
      if (game) {
        game.removePlayer(user);
        emit(SocketEvents.GameUpdated(gameId), game);
      }
    }
  };

  socket.on(SocketEvents.UserJoined, userJoin);
  socket.on(SocketEvents.Disconnected, userLeave);
};
