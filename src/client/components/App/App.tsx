import React from 'react';
import { generateRandomBoard } from '../../utils';
import { Board } from '../Board/Board';
import { useAppEffects } from './appEffects';

const App = () => {
  useAppEffects();
  const boardState = generateRandomBoard();
  return (
    <div id="app">
      <Board boardState={boardState} />
    </div>
  );
};

export default App;
