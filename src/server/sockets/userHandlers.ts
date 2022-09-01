import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';
import { emit } from './sockets';

export const registerUserHandlers = (io: Server, socket: Socket): void => {
  const userJoin = (userId: string) => {
    console.log(`${userId} joined`);
    const user = UserManager.userConnected(userId, socket.id);
    GameManager.getGame('test').addPlayer(user);
    emit(SocketEvents.GameUpdated, GameManager.getGame('test'));
  };
  const userLeave = () => {
    const user = UserManager.userDisconnected(socket.id);
    GameManager.getGame('test').removePlayer(user);
    emit(SocketEvents.GameUpdated, GameManager.getGame('test'));
  };

  socket.on(SocketEvents.UserJoined, userJoin);
  socket.on(SocketEvents.Disconnected, userLeave);
};
