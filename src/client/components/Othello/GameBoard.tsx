import React from 'react';
import { Player } from '../../../server/models/Game';
import { Board } from '../Board/Board';
import { GameOverModal } from '../GameOverModal/GameOverModal';
import { PlayerComponent } from '../Players/Players';
import { DebugPanel } from '../DebugPanel/DebugPanel';
import { useSocket } from '../../utils/socketHooks';
import { SocketEvents } from '../../../shared/SocketEvents';
import { boardStringToArray } from '../../../shared/utils/boardUtils';

interface GameBoardProps {
  gameId: string;
  boardState: string;
  black: Player;
  white: Player;
  localUserId: string;
  currentPlayerId: string;
  isCurrentPlayer: boolean;
  gameFinished: boolean;
  score: { B: number; W: number };
}

export const GameBoard = ({
  gameId,
  boardState,
  black,
  white,
  localUserId,
  currentPlayerId,
  isCurrentPlayer,
  gameFinished,
  score,
}: GameBoardProps) => {
  const { socket } = useSocket();

  // Extract valid moves from board state (positions marked with '0')
  const boardArray = boardStringToArray(boardState || '');
  const validMoves = boardArray.map((cell, index) => cell === '0' ? index : -1).filter(index => index !== -1);
  
  // Determine current player piece
  const currentPlayerPiece = Object.values({ black, white }).find(player => player?.userId === currentPlayerId)?.piece || 'B';
  
  // Handle move from debug panel - always use the local user ID for moves
  const handleDebugMove = (position: number) => {
    if (socket && gameId && localUserId) {
      // In debug mode, we always make moves as the local user
      // This allows controlling both players in manual mode
      socket.emit(SocketEvents.PlacePiece, gameId, localUserId, position);
    }
  };

  return (
    <div id="app">
      <GameOverModal gameFinished={gameFinished} score={score} localUserId={localUserId} black={black} white={white} />
      <div className="game-container">
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
      
      {/* Debug Panel */}
      <DebugPanel
        gameId={gameId}
        currentPlayer={currentPlayerPiece}
        gameStarted={!!boardState}
        gameFinished={gameFinished}
        validMoves={validMoves}
        boardState={boardState || ''}
        scores={{ black: score?.B || 0, white: score?.W || 0 }}
        onMakeMove={handleDebugMove}
      />
    </div>
  );
};
