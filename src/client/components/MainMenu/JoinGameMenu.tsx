import React, { useState } from 'react';

export const JoinGameMenu = () => {
  const [gameId, setGameId] = useState('');
  return (
    <div id="host-menu">
      <input type="text" placeholder="Game ID" value={gameId} onChange={(e) => setGameId(e.target.value)} />
      <button
        onClick={(e) => {
          console.log(`Attempting to join game ${gameId}`);
        }}
      >
        Join Game
      </button>
    </div>
  );
};
