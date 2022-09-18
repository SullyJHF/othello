import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JoinGameResponse } from '../../../server/sockets/gameHandlers';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';

export const JoinGameMenu = () => {
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState('');
  const [joining, setJoining] = useState(false);
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const onJoinGameClicked = () => {
    setUsername(localUserName);
    setJoining(true);
    socket.emit(SocketEvents.JoinGame, localUserId, localUserName, gameId, (response: JoinGameResponse) => {
      setJoining(false);
      if (response.error) {
        console.log(`An error occurred joining game: `);
        console.error(response.error);
      } else {
        navigate(`/game/${gameId}`);
      }
    });
  };
  return (
    <div id="host-menu">
      <input
        type="text"
        placeholder="Username"
        value={localUserName}
        onChange={(e) => setLocalUserName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Game ID"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        disabled={joining}
      />
      <button onClick={onJoinGameClicked} disabled={joining}>
        Join Game
      </button>
    </div>
  );
};
