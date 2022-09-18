import React from 'react';
import { useParams } from 'react-router-dom';
import '../App/app.scss';
import { GameBoard } from './GameBoard';
import { useGameEffects } from './gameEffects';
import { Lobby } from './Lobby';

export const Othello = () => {
  const { gameId } = useParams();
  const {
    gameStarted,
    gameFull,
    startGame,
    localUserId,
    boardState,
    players,
    isCurrentPlayer,
    black,
    white,
    currentPlayerId,
  } = useGameEffects(gameId);

  return (
    <div id="game">
      {!gameStarted ? (
        <Lobby gameId={gameId} players={players} gameFull={gameFull} onStartGameClicked={startGame} />
      ) : (
        <GameBoard
          gameId={gameId}
          boardState={boardState}
          black={black}
          white={white}
          localUserId={localUserId}
          currentPlayerId={currentPlayerId}
          isCurrentPlayer={isCurrentPlayer}
        />
      )}
    </div>
  );
};
