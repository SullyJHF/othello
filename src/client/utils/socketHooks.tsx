import React, { createContext, useContext, useEffect, useState } from 'react';
import socketIOClient, { Socket } from 'socket.io-client';
import { v4 as uuid4 } from 'uuid';
import { SocketEvents } from '../../shared/SocketEvents';
import { useLocalStorage } from './hooks';

type SocketContext = {
  socket: Socket;
  localId: string;
};

const useSocketConnection = () => {
  const [socket, setSocket] = useState<Socket>(null);
  const [localId, setLocalId] = useLocalStorage('player-id', null);
  useEffect(() => {
    setSocket(socketIOClient('/', { path: '/socket' }));
  }, []);
  useEffect(() => {
    if (socket === null) return undefined;
    socket.on('connect', () => {
      let uuid = localId;
      if (localId === null) {
        uuid = uuid4();
        setLocalId(uuid);
      }
      socket.emit(SocketEvents.UserJoined, uuid);
    });
    return () => {
      socket.disconnect();
      setSocket(null);
    };
  }, [socket]);
  return { socket, localId };
};

const socketContext = createContext<SocketContext>(null);

export const ProvideSocket = ({ children }) => (
  <socketContext.Provider value={useSocketConnection()}>{children}</socketContext.Provider>
);

export const useSocket = () => useContext(socketContext);

export const useSubscribeEffect = (subscribe: () => void, unsubscribe: () => void, ...extraArgs: unknown[]) => {
  const { socket } = useSocket();
  useEffect(() => {
    subscribe();
    return () => {
      unsubscribe();
    };
  }, [socket, ...extraArgs]);
};
