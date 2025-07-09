import { useState } from 'react';
import { Player, PlayerTimerState } from '../../../server/models/Game';
import { SocketEvents } from '../../../shared/SocketEvents';
import { boardStringToArray } from '../../../shared/utils/boardUtils';
import { useSocket } from '../../utils/socketHooks';
import { Board } from '../Board/Board';
import { DebugPanel } from '../DebugPanel/DebugPanel';
import { GameOverModal } from '../GameOverModal/GameOverModal';
import { PlayerComponent } from '../Players/Players';

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
  timerStates: { [userId: string]: PlayerTimerState };
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
  timerStates,
}: GameBoardProps) => {
  const { socket } = useSocket();
  const [autoPlayMode, setAutoPlayMode] = useState<'off' | 'ai-only' | 'manual-control' | 'full-auto'>('off');

  // Extract valid moves from board state (positions marked with '0')
  const boardArray = boardStringToArray(boardState || '');
  const validMoves = boardArray.map((cell, index) => (cell === '0' ? index : -1)).filter((index) => index !== -1);

  // Determine current player piece
  const currentPlayerPiece =
    Object.values({ black, white }).find((player) => player?.userId === currentPlayerId)?.piece || 'B';

  // Handle move from debug panel - use current player's ID for auto-play
  const handleDebugMove = (position: number) => {
    if (socket && gameId && !gameFinished && currentPlayerId) {
      // Additional validation: verify the current player piece matches the expected turn
      const currentPlayer = Object.values({ black, white }).find((player) => player?.userId === currentPlayerId);

      if (currentPlayer && currentPlayer.piece === currentPlayerPiece) {
        socket.emit(SocketEvents.PlacePiece, gameId, currentPlayerId, position);
      } else {
        console.warn('Skipping move: player turn mismatch', {
          currentPlayerId,
          expectedPiece: currentPlayerPiece,
          actualPlayer: currentPlayer,
        });
      }
    }
  };

  return (
    <div id="app" data-testid="game-board-container">
      <GameOverModal gameFinished={gameFinished} score={score} localUserId={localUserId} black={black} white={white} />
      <div className="game-container" data-testid="game-container">
        <PlayerComponent
          player={black}
          piece="B"
          isLocalUser={black?.userId === localUserId}
          isCurrentPlayer={currentPlayerId === black?.userId}
          timerState={black?.userId ? timerStates[black.userId] : null}
          top
        />
        <Board
          gameId={gameId}
          boardState={boardState}
          isCurrentPlayer={isCurrentPlayer}
          manualControlMode={autoPlayMode === 'manual-control'}
          currentPlayerId={currentPlayerId}
        />
        <PlayerComponent
          player={white}
          piece="W"
          isLocalUser={white?.userId === localUserId}
          isCurrentPlayer={currentPlayerId === white?.userId}
          timerState={white?.userId ? timerStates[white.userId] : null}
        />
      </div>

      {/* Debug Panel - only show for actual debug games */}
      <DebugPanel
        gameId={gameId}
        currentPlayer={currentPlayerPiece}
        currentPlayerId={currentPlayerId}
        gameStarted={!!boardState}
        gameFinished={gameFinished}
        validMoves={validMoves}
        boardState={boardState || ''}
        scores={{ black: score?.B || 0, white: score?.W || 0 }}
        onMakeMove={handleDebugMove}
        autoPlayMode={autoPlayMode}
        onAutoPlayModeChange={setAutoPlayMode}
        players={{ black, white }}
        timerStates={timerStates}
      />
    </div>
  );
};
