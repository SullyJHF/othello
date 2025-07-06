import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../App/app.scss';
import { useGameView } from '../../contexts/GameViewContext';
import { GameBoard } from './GameBoard';
import { useGameEffects } from './gameEffects';
import { Lobby } from './Lobby/Lobby';

export const Othello = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { setCurrentView } = useGameView();

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

  // Update view based on game state - only when gameStarted changes
  useEffect(() => {
    if (gameStarted) {
      setCurrentView('game');
    } else {
      setCurrentView('lobby');
    }
  }, [gameStarted, setCurrentView]);

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
