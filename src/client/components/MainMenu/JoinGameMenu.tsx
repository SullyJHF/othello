import React, { FormEventHandler, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { JoinGameResponse } from '../../../server/sockets/gameHandlers';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';
import { useGameView } from '../../contexts/GameViewContext';

export const JoinGameMenu = () => {
  const { socket, localUserId } = useSocket();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [localGameId, setLocalGameId] = useState(gameId);
  const [joining, setJoining] = useState(false);
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const { setCurrentView } = useGameView();
  
  useEffect(() => {
    setCurrentView('form');
  }, [setCurrentView]);
  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!socket) {
      console.error('Socket not available');
      return;
    }
    setUsername(localUserName);
    setJoining(true);
    socket.emit(SocketEvents.JoinGame, localUserId, localUserName, localGameId, (response: JoinGameResponse) => {
      setJoining(false);
      if (response.error) {
        console.log(`An error occurred joining game: `);
        console.error(response.error);
      } else {
        navigate(`/game/${localGameId}`);
      }
    });
  };
  return (
    <div id="host-menu">
      <div className="join-wrapper">
        <form onSubmit={onSubmit} className="form">
          <h1 className="title">Join Game</h1>
          <input
            type="text"
            placeholder="Username"
            value={localUserName}
            onChange={(e) => setLocalUserName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Game ID"
            value={localGameId}
            onChange={(e) => setLocalGameId(e.target.value)}
            disabled={joining}
          />
          <button type="submit" disabled={joining} className="link">
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
};
