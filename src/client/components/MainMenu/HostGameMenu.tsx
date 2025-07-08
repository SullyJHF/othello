import { FormEventHandler, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useGameView } from '../../contexts/GameViewContext';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';
import './game-forms.scss';

export const HostGameMenu = () => {
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const [isCreating, setIsCreating] = useState(false);
  const { setCurrentView } = useGameView();

  useEffect(() => {
    setCurrentView('form');
  }, [setCurrentView]);
  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!socket || !localUserName.trim()) {
      return;
    }

    setIsCreating(true);
    setUsername(localUserName);

    socket.emit(SocketEvents.HostNewGame, localUserId, localUserName.trim(), (gameId: string) => {
      console.log(`Game created, ${gameId}`);
      navigate(`/game/${gameId}`);
    });
  };
  return (
    <div id="host-game-menu" className="game-form-container">
      <div className="form-header">
        <h1 className="form-title">Host New Game</h1>
        <p className="form-subtitle">Create a game and invite a friend to play</p>
      </div>

      <form className="game-form" onSubmit={onSubmit}>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          value={localUserName}
          onChange={(e) => setLocalUserName(e.target.value)}
          disabled={isCreating}
          required
          minLength={1}
          maxLength={20}
        />
        <button className="submit-button" type="submit" disabled={isCreating || !localUserName.trim()}>
          {isCreating ? 'Creating Game...' : 'Create & Host Game'}
        </button>
      </form>
    </div>
  );
};
