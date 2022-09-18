import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';

export const HostGameMenu = () => {
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const onHostClicked = () => {
    setUsername(localUserName);
    socket.emit(SocketEvents.HostNewGame, localUserId, localUserName, (gameId: string) => {
      console.log(`Game created, ${gameId}`);
      navigate(`/game/${gameId}`);
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
      <button onClick={onHostClicked}>Start Game</button>
    </div>
  );
};
