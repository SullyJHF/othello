import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Game } from '../../../server/models/Game';
import { GameMap } from '../../../server/models/GameManager';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useSocket, useSubscribeEffect } from '../../utils/socketHooks';
import { LobbyPlayer } from '../Othello/Lobby/LobbyPlayers';
import './current-games-list.scss';

const GameListItem = ({ game }: { game: Game }) => {
  return (
    <div className="game">
      <Link to={`/games/${game.id}`}>{game.id}</Link>
      <div className="players">
        {Object.keys(game.players).map((playerId) => (
          <LobbyPlayer key={playerId} player={game.players[playerId]} showConnected={false} />
        ))}
      </div>
    </div>
  );
};

export const CurrentGamesList = () => {
  const { socket, localUserId } = useSocket();
  const [allGames, setAllGames] = useState<GameMap>({});
  const subscribe = () => {
    socket?.emit(SocketEvents.ViewGameList, localUserId, (games: GameMap) => {
      setAllGames(games);
    });
    socket?.on(SocketEvents.GameListUpdated, (addedGame: Game) => {
      setAllGames((prevAllGames) => ({ ...prevAllGames, [addedGame.id]: addedGame }));
    });
  };
  const unsubscribe = () => {
    socket?.off(SocketEvents.GameListUpdated);
  };
  useSubscribeEffect(subscribe, unsubscribe, localUserId);

  return (
    <div id="games-list">
      <div className="card">
        <h1 className="title">Current Games</h1>
        <div className="games">
          {Object.keys(allGames).map((gameId) => (
            <GameListItem key={gameId} game={allGames[gameId]} />
          ))}
        </div>
      </div>
    </div>
  );
};
