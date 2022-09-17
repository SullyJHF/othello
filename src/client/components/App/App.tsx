import React from 'react';
import { Board } from '../Board/Board';
import { Players } from '../Players/Players';
import { useAppEffects } from './appEffects';

const App = () => {
  const { boardState, players, isCurrentPlayer } = useAppEffects();
  return (
    <div id="app">
      <Players players={players} isCurrentPlayer={isCurrentPlayer} />
      <Board boardState={boardState} isCurrentPlayer={isCurrentPlayer} />
    </div>
  );
};

export default App;
