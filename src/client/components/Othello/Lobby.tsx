import React from 'react';
import { Player } from '../../../server/models/Game';
import { CopyTextButton } from '../CopyTextButton/CopyTextButton';
import { ConnectedPip } from '../Players/ConnectedPip';
import './lobby.scss';

const LobbyPlayer = ({ player }: { player: Player }) => {
  return (
    <div className="lobby-player">
      <div className="name">{player.name}</div>
      <ConnectedPip connected={player.connected} small />
    </div>
  );
};

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
      <div className="player-wrapper">
        <h2>Players:</h2>
        {Object.keys(players).map((userId) => (
          <LobbyPlayer player={players[userId]} />
        ))}
      </div>
      {gameFull && (
        <div className="button-wrapper">
          <button className="start-button" onClick={onStartGameClicked}>
            Start Game!
          </button>
        </div>
      )}
    </div>
  );
};
