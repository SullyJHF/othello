import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';
import { emit } from './sockets';

export const registerGameHandlers = (io: Server, socket: Socket): void => {
  const onPiecePlaced = (userId: string, placeId: number) => {
    const user = UserManager.getUserById(userId);
    GameManager.getGame('test').placePiece(user, placeId);
    emit(SocketEvents.GameUpdated, GameManager.getGame('test'));
  };

  socket.on(SocketEvents.PlacePiece, onPiecePlaced);
};
