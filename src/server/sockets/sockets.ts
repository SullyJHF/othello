import http from 'http';
import { Server, Socket } from 'socket.io';
import { registerGameHandlers } from './gameHandlers';
import { registerGameListHandlers } from './gameListHandlers';
import { registerUserHandlers } from './userHandlers';

let io: Server;

export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
};

export const initSocketIO = (httpServer: http.Server) => {
  console.log('Initting socket io');
  io = new Server(httpServer, { path: '/socket' });

  const onConnection = (socket: Socket) => {
    registerUserHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerGameListHandlers(io, socket);
  };

  io.on(SOCKET_EVENTS.CONNECTION, onConnection);
};

export const emit = (event: string, data: unknown, to = null) => {
  if (io == null) throw new Error('SocketIO must be initialised first!');

  if (to === null) io.emit(event, data);
  else io.to(to).emit(event, data);
};

export const broadcast = (socket: Socket, event: string, data: unknown, to = null) => {
  if (socket == null) throw new Error('SocketIO must be initialised first!');

  if (to === null) socket.broadcast.emit(event, data);
  else socket.broadcast.to(to).emit(event, data);
};

export const isIoInitialised = () => io != null;
