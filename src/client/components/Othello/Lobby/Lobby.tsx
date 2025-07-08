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
  const playerCount = Object.keys(players).length;

  return (
    <div id="lobby">
      <div className="lobby-header">
        <h1 className="lobby-title">Game Lobby</h1>
        <p className="lobby-subtitle">
          {playerCount === 0 && 'Waiting for players to join...'}
          {playerCount === 1 && 'Waiting for one more player...'}
          {playerCount === 2 && gameFull && 'Ready to start!'}
        </p>
      </div>

      <div className="join-url-section">
        <h3>Share this link to invite a friend:</h3>
        <CopyTextButton text={joinUrl} />
      </div>

      <LobbyPlayers players={players} />

      {gameFull && (
        <div className="button-wrapper">
          <button className="start-button link" onClick={onStartGameClicked}>
            🎮 Start Game!
          </button>
        </div>
      )}
    </div>
  );
};
