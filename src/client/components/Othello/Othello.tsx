import React from 'react';
import { useParams } from 'react-router-dom';
import { Player } from '../../../server/models/Game';
import '../App/app.scss';
import { useAppEffects } from '../App/appEffects';
import { Board } from '../Board/Board';
import { PlayerComponent } from '../Players/Players';

interface LobbyProps {
  gameId: string;
  players: { [userId: string]: Player };
  gameFull: boolean;
  onStartGameClicked: () => void;
}

const Lobby = ({ gameId, players, gameFull, onStartGameClicked }: LobbyProps) => {
  return (
    <div id="lobby">
      {gameId}
      {Object.keys(players).map((userId) => (
        <div key={userId}>{players[userId].name}</div>
      ))}
      {gameFull && <button onClick={onStartGameClicked}>Start Game!</button>}
    </div>
  );
};

interface GameBoardProps {
  gameId: string;
  boardState: string;
  black: Player;
  white: Player;
  localUserId: string;
  currentPlayerId: string;
  isCurrentPlayer: boolean;
}

const GameBoard = ({
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
  } = useAppEffects(gameId);

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
