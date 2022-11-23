import React from 'react';
import { Player } from '../../../../server/models/Game';
import { ConnectedPip } from '../../Players/ConnectedPip';

const LobbyPlayer = ({ player }: { player: Player }) => {
  return (
    <div className="lobby-player">
      <div className="name">{player.name}</div>
      <ConnectedPip connected={player.connected} small />
    </div>
  );
};

interface LobbyPlayersProps {
  players: { [userId: string]: Player };
}
export const LobbyPlayers = ({ players }: LobbyPlayersProps) => {
  return (
    <div className="player-wrapper">
      <h2>Players:</h2>
      {Object.keys(players).map((userId) => (
        <LobbyPlayer key={userId} player={players[userId]} />
      ))}
    </div>
  );
};
