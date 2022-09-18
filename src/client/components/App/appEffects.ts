import { useState } from 'react';
import { Game, Player } from '../../../server/models/Game';
import { useSocket, useSubscribeEffect } from '../../utils/socketHooks';
import { SocketEvents } from './../../../shared/SocketEvents';
export const useAppEffects = () => {
  const { socket, localUserId } = useSocket();
  const [boardState, setBoardState] = useState<string>('');
  const [players, setPlayers] = useState<{ [userId: string]: Player }>({});
  const [currentPlayer, setCurrentPlayer] = useState<'W' | 'B'>(null);
  const isCurrentPlayer = currentPlayer === players[localUserId]?.piece;

  const subscribe = () => {
    socket?.on(SocketEvents.GameUpdated, (gameData: Game) => {
      console.log('Game updated');
      console.log(gameData);
      setBoardState(gameData.board.boardState);
      setPlayers(gameData.players);
      setCurrentPlayer(gameData.currentPlayer);
    });
  };
  const unsubscribe = () => {
    socket?.off(SocketEvents.GameUpdated);
  };

  useSubscribeEffect(subscribe, unsubscribe);
  return { localUserId, boardState, players, currentPlayer, isCurrentPlayer };
};
