import React, { FormEventHandler, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';

export const HostGameMenu = () => {
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!socket) {
      console.error('Socket not available');
      return;
    }
    setUsername(localUserName);
    socket.emit(SocketEvents.HostNewGame, localUserId, localUserName, (gameId: string) => {
      console.log(`Game created, ${gameId}`);
      navigate(`/game/${gameId}`);
    });
  };
  return (
    <div id="host-menu">
      <div className="card host-wrapper">
        <form className="form" onSubmit={onSubmit}>
          <h1 className="title">Host Game</h1>
          <input
            id="username"
            type="text"
            placeholder="Username"
            value={localUserName}
            onChange={(e) => setLocalUserName(e.target.value)}
          />
          <button className="link" type="submit">
            Start Game
          </button>
        </form>
      </div>
    </div>
  );
};
