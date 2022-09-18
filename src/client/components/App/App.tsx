import React from 'react';
import { Board } from '../Board/Board';
import { PlayerComponent } from '../Players/Players';
import './app.scss';
import { useAppEffects } from './appEffects';

const App = () => {
  const { black, white, localUserId, boardState, players, currentPlayerId, isCurrentPlayer } = useAppEffects();
  return (
    <div id="app">
      <PlayerComponent
        player={black}
        piece="B"
        isLocalUser={black?.userId === localUserId}
        isCurrentPlayer={currentPlayerId === black?.userId}
        top
      />
      <Board boardState={boardState} isCurrentPlayer={isCurrentPlayer} />
      <PlayerComponent
        player={white}
        piece="W"
        isLocalUser={white?.userId === localUserId}
        isCurrentPlayer={currentPlayerId === white?.userId}
      />
    </div>
  );
};

export default App;
