import { FormEventHandler, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { JoinGameResponse } from '../../../server/sockets/gameHandlers';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useGameView } from '../../contexts/GameViewContext';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';
import './game-forms.scss';

export const JoinGameMenu = () => {
  const { socket, localUserId } = useSocket();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [localGameId, setLocalGameId] = useState(gameId || '');
  const [joining, setJoining] = useState(false);
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const [error, setError] = useState<string>('');
  const { setCurrentView } = useGameView();

  const hasPrefilledGameId = Boolean(gameId);

  useEffect(() => {
    setCurrentView('form');
  }, [setCurrentView]);
  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!socket || !localUserName.trim() || !localGameId.trim()) {
      return;
    }

    setError('');
    setJoining(true);
    setUsername(localUserName);

    socket.emit(
      SocketEvents.JoinGame,
      localUserId,
      localUserName.trim(),
      localGameId.trim(),
      (response: JoinGameResponse) => {
        setJoining(false);
        if (response.error) {
          setError(response.error);
          console.error('Join game error:', response.error);
        } else {
          navigate(`/game/${localGameId}`);
        }
      },
    );
  };
  return (
    <div id="join-game-menu" className="game-form-container">
      <div className="form-header">
        <h1 className="form-title">Join Game</h1>
        <p className="form-subtitle">Enter your details to join an existing game</p>
      </div>

      <form className="game-form" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Enter your username"
          value={localUserName}
          onChange={(e) => setLocalUserName(e.target.value)}
          disabled={joining}
          required
          minLength={1}
          maxLength={20}
        />

        {hasPrefilledGameId && (
          <div className="game-id-info">
            Game ID <strong>{gameId}</strong> detected from invite link
          </div>
        )}

        <input
          type="text"
          placeholder={hasPrefilledGameId ? `Game ID: ${gameId}` : 'Enter Game ID'}
          value={localGameId}
          onChange={(e) => setLocalGameId(e.target.value)}
          disabled={joining}
          required
          minLength={6}
          maxLength={6}
        />

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          disabled={joining || !localUserName.trim() || !localGameId.trim()}
          className="submit-button"
        >
          {joining ? 'Joining Game...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
};
