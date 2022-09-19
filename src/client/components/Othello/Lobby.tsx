import React from 'react';
import { Player } from '../../../server/models/Game';
import { CopyTextButton } from '../CopyTextButton/CopyTextButton';

interface LobbyProps {
  gameId: string;
  joinUrl: string;
  players: { [userId: string]: Player };
  gameFull: boolean;
  onStartGameClicked: () => void;
}

export const Lobby = ({ gameId, joinUrl, players, gameFull, onStartGameClicked }: LobbyProps) => {
  return (
    <div id="lobby">
      <CopyTextButton text={joinUrl} />
      {Object.keys(players).map((userId) => (
        <div key={userId}>{players[userId].name}</div>
      ))}
      {gameFull && <button onClick={onStartGameClicked}>Start Game!</button>}
    </div>
  );
};
