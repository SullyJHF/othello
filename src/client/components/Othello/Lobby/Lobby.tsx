import React from 'react';
import { Player } from '../../../../server/models/Game';
import { CopyTextButton } from '../../CopyTextButton/CopyTextButton';
import './lobby.scss';
import { LobbyPlayers } from './LobbyPlayers';

interface LobbyProps {
  joinUrl: string;
  players: { [userId: string]: Player };
  gameFull: boolean;
  onStartGameClicked: () => void;
}

export const Lobby = ({ joinUrl, players, gameFull, onStartGameClicked }: LobbyProps) => {
  return (
    <div id="lobby">
      <CopyTextButton text={joinUrl} />
      <LobbyPlayers players={players} />
      {gameFull && (
        <div className="button-wrapper">
          <button className="start-button link" onClick={onStartGameClicked}>
            Start Game!
          </button>
        </div>
      )}
    </div>
  );
};
