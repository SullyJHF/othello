import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import socketIOClient, { Socket } from 'socket.io-client';
import { v4 as uuid4 } from 'uuid';
import { SocketEvents } from '../../shared/SocketEvents';
import { useLocalStorage } from './hooks';

type SocketContext = {
  socket: Socket | null;
  localUserId: string | null;
};

interface ProvideSocketProps {
  children: ReactNode;
}

const useSocketConnection = (): SocketContext => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localUserId, setLocalId] = useLocalStorage('player-id', null);
  useEffect(() => {
    setSocket(socketIOClient('/', { path: '/socket' }));
  }, []);
  useEffect(() => {
    if (socket === null) return undefined;
    socket.on('connect', () => {
      let uuid = localUserId;
      if (localUserId === null) {
        uuid = uuid4();
        setLocalId(uuid);
      }
      socket.emit(SocketEvents.UserJoined, uuid);
    });
    return () => {
      if (socket) {
        socket.disconnect();
      }
      setSocket(null);
    };
  }, [socket]);
  return { socket, localUserId };
};

const socketContext = createContext<SocketContext>({
  socket: null,
  localUserId: null,
});

export const ProvideSocket = ({ children }: ProvideSocketProps) => (
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
