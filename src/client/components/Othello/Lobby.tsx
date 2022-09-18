import React from 'react';
import { Player } from '../../../server/models/Game';

interface LobbyProps {
  gameId: string;
  players: { [userId: string]: Player };
  gameFull: boolean;
  onStartGameClicked: () => void;
}

export const Lobby = ({ gameId, players, gameFull, onStartGameClicked }: LobbyProps) => {
  return (
    <div id="lobby">
      {gameId}
      {Object.keys(players).map((userId) => (
        <div key={userId}>{players[userId].name}</div>
      ))}
      {gameFull && <button onClick={onStartGameClicked}>Start Game!</button>}
    </div>
  );
};
