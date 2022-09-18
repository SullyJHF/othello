import React from 'react';
import { Player } from '../../../server/models/Game';
import { Board } from '../Board/Board';
import { PlayerComponent } from '../Players/Players';

interface GameBoardProps {
  gameId: string;
  boardState: string;
  black: Player;
  white: Player;
  localUserId: string;
  currentPlayerId: string;
  isCurrentPlayer: boolean;
}

export const GameBoard = ({
  gameId,
  boardState,
  black,
  white,
  localUserId,
  currentPlayerId,
  isCurrentPlayer,
}: GameBoardProps) => {
  return (
    <div id="app">
      <PlayerComponent
        player={black}
        piece="B"
        isLocalUser={black?.userId === localUserId}
        isCurrentPlayer={currentPlayerId === black?.userId}
        top
      />
      <Board gameId={gameId} boardState={boardState} isCurrentPlayer={isCurrentPlayer} />
      <PlayerComponent
        player={white}
        piece="W"
        isLocalUser={white?.userId === localUserId}
        isCurrentPlayer={currentPlayerId === white?.userId}
      />
    </div>
  );
};
