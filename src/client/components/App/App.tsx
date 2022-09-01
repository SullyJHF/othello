import React from 'react';
import { Board } from '../Board/Board';

const testState = `........
........
B....W..
B..W....
..W..B..
........
........
B....W..`;

const App = () => {
  return (
    <div id="app">
      <Board boardState={testState} />
    </div>
  );
};

export default App;
