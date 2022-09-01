import { Game } from '../../../server/models/Game';
import { useSocket, useSubscribeEffect } from '../../utils/socketHooks';
import { SocketEvents } from './../../../shared/SocketEvents';
export const useAppEffects = () => {
  const { socket } = useSocket();
  const subscribe = () => {
    socket?.on(SocketEvents.GameUpdated, (gameData: Game) => {
      console.log('Game updated');
      console.log(gameData);
    });
  };
  const unsubscribe = () => {
    socket?.off(SocketEvents.GameUpdated);
  };
  useSubscribeEffect(subscribe, unsubscribe);
};
