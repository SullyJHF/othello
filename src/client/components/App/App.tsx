import React from 'react';
import { Board } from '../Board/Board';
import { Players } from '../Players/Players';
import { useAppEffects } from './appEffects';

const App = () => {
  const { localUserId, boardState, players, currentPlayer } = useAppEffects();
  return (
    <div id="app">
      <Players localUserId={localUserId} players={players} currentPlayer={currentPlayer} />
      <Board boardState={boardState} />
    </div>
  );
};

export default App;
