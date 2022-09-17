import React from 'react';
import { Player } from '../../../server/models/Game';

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
  localUserId: string;
  players: { [userId: string]: Player };
  currentPlayer: 'W' | 'B';
}

export const Players = ({ localUserId, players, currentPlayer }: PlayersProps) => {
  return (
    <div id="players">
      {Object.keys(players).map((userId) => (
        <PlayerComponent
          key={userId}
          player={players[userId]}
          isLocalUser={userId === localUserId}
          isCurrentPlayer={players[userId].piece === currentPlayer}
        />
      ))}
    </div>
  );
};
