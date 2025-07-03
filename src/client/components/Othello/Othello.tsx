import React from 'react';
import { useParams } from 'react-router-dom';
import '../App/app.scss';
import { GameBoard } from './GameBoard';
import { useGameEffects } from './gameEffects';
import { Lobby } from './Lobby/Lobby';

export const Othello = () => {
  const { gameId } = useParams<{ gameId: string }>();

  const {
    gameStarted,
    gameFull,
    gameFinished,
    score,
    startGame,
    joinUrl,
    localUserId,
    boardState,
    players,
    isCurrentPlayer,
    black,
    white,
    currentPlayerId,
  } = useGameEffects(gameId || '');

  if (!gameId) {
    return <div>Error: Game ID not found</div>;
  }

  if (gameStarted && localUserId && currentPlayerId && black && white)
    return (
      <GameBoard
        gameId={gameId}
        boardState={boardState}
        black={black}
        white={white}
        localUserId={localUserId}
        currentPlayerId={currentPlayerId}
        isCurrentPlayer={isCurrentPlayer}
        gameFinished={gameFinished}
        score={score}
      />
    );

  return <Lobby joinUrl={joinUrl} players={players} gameFull={gameFull} onStartGameClicked={startGame} />;
};
