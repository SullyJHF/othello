import React from 'react';
import { Player } from '../../../server/models/Game';
import { useSocket } from '../../utils/socketHooks';

interface PlayerProps {
  player: Player;
  isLocalUser: boolean;
  isCurrentPlayer: boolean;
}

const PlayerComponent = ({ player, isLocalUser, isCurrentPlayer }: PlayerProps) => {
  return (
    <div className="player">
      {isLocalUser ? 'Me' : player.userId} - {player.connected ? 'Connected' : 'Disconnected'}
      {isCurrentPlayer ? ' - Current Player' : ''}
    </div>
  );
};

interface PlayersProps {
  players: { [userId: string]: Player };
  isCurrentPlayer: boolean;
}

export const Players = ({ players, isCurrentPlayer }: PlayersProps) => {
  const { localUserId } = useSocket();
  return (
    <div id="players">
      {Object.keys(players).map((userId) => (
        <PlayerComponent
          key={userId}
          player={players[userId]}
          isLocalUser={userId === localUserId}
          isCurrentPlayer={isCurrentPlayer}
        />
      ))}
    </div>
  );
};
