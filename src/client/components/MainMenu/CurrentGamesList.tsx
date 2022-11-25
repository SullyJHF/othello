import { useState } from 'react';
import { Game } from '../../../server/models/Game';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useSocket, useSubscribeEffect } from '../../utils/socketHooks';

export const CurrentGamesList = () => {
  const { socket, localUserId } = useSocket();
  const [allGames, setAllGames] = useState<string[]>([]);
  const subscribe = () => {
    socket?.emit(SocketEvents.ViewGameList, localUserId, (allGames: string[]) => {
      setAllGames(allGames);
    });
    socket?.on(SocketEvents.GameListUpdated, (addedGame: Game) => {
      allGames.push(addedGame.id);
    });
  };
  const unsubscribe = () => {
    socket?.off(SocketEvents.GameListUpdated);
  };
  useSubscribeEffect(subscribe, unsubscribe, localUserId);

  return (
    <div>
      Current Games:
      {allGames.map((gameId) => (
        <div key={gameId}>{gameId}</div>
      ))}
    </div>
  );
};
