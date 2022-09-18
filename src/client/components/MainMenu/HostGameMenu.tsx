import React, { useState } from 'react';
import { useLocalStorage } from '../../utils/hooks';

export const HostGameMenu = () => {
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  return (
    <div id="host-menu">
      <input
        type="text"
        placeholder="Username"
        value={localUserName}
        onChange={(e) => setLocalUserName(e.target.value)}
      />
      <button
        onClick={(e) => {
          setUsername(localUserName);
        }}
      >
        Start Game
      </button>
    </div>
  );
};
