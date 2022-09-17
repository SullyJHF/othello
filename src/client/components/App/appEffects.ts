import { useState } from 'react';
import { Game } from '../../../server/models/Game';
import { useSocket, useSubscribeEffect } from '../../utils/socketHooks';
import { SocketEvents } from './../../../shared/SocketEvents';
export const useAppEffects = () => {
  const { socket, localUserId } = useSocket();
  const [boardState, setBoardState] = useState('');
  const [players, setPlayers] = useState({});
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const subscribe = () => {
    socket?.on(SocketEvents.GameUpdated, (gameData: Game) => {
      console.log('Game updated');
      console.log(gameData);
      setBoardState(gameData.boardState);
      setPlayers(gameData.players);
      setCurrentPlayer(gameData.currentPlayer);
    });
  };
  const unsubscribe = () => {
    socket?.off(SocketEvents.GameUpdated);
  };
  useSubscribeEffect(subscribe, unsubscribe);
  return { localUserId, boardState, players, currentPlayer };
};
