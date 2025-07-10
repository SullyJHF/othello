import { useState, useEffect } from 'react';
import { Player, PlayerTimerState } from '../../../server/models/Game';
import { SocketEvents } from '../../../shared/SocketEvents';
import { boardStringToArray } from '../../../shared/utils/boardUtils';
import { autoPlayService } from '../../services/autoPlayService';
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

  // Check if this is a single player game (has fake opponent)
  const isSinglePlayerGame =
    (black?.userId?.startsWith('fake-opponent-') ?? false) || (white?.userId?.startsWith('fake-opponent-') ?? false);

  // Get AI opponent difficulty from opponent name pattern
  const getAIDifficultyFromOpponent = (): 'beginner' | 'intermediate' | 'advanced' | 'expert' | null => {
    const fakeOpponent = black?.userId?.startsWith('fake-opponent-')
      ? black
      : white?.userId?.startsWith('fake-opponent-')
        ? white
        : null;

    if (!fakeOpponent?.name) return null;

    const name = fakeOpponent.name.toLowerCase();
    if (name.includes('rookie') || name.includes('student') || name.includes('learning') || name.includes('friendly')) {
      return 'beginner';
    } else if (
      name.includes('clever') ||
      name.includes('tactical') ||
      name.includes('smart') ||
      name.includes('balanced')
    ) {
      return 'intermediate';
    } else if (
      name.includes('strategic') ||
      name.includes('master') ||
      name.includes('expert') ||
      name.includes('wise')
    ) {
      return 'advanced';
    } else if (
      name.includes('grandmaster') ||
      name.includes('perfect') ||
      name.includes('champion') ||
      name.includes('elite')
    ) {
      return 'expert';
    }
    return 'intermediate'; // Default fallback
  };

  // Auto-configure AI for single player games
  useEffect(() => {
    if (isSinglePlayerGame && boardState) {
      const difficulty = getAIDifficultyFromOpponent();

      if (difficulty) {
        // Configure autoPlay with the appropriate difficulty
        autoPlayService.initialize({
          enabled: true,
          speed: 2, // Moderate speed for good user experience
          algorithm: difficulty,
          playBothSides: false,
          stopConditions: {
            nearEndGame: false,
            specificScore: null,
            moveCount: null,
          },
        });

        // Set mode to AI-only (only plays for fake opponents)
        setAutoPlayMode('ai-only');

        // Start autoPlay
        autoPlayService.start();

        console.log(`Single player game detected - AI configured with ${difficulty} difficulty`);
      }
    }
  }, [isSinglePlayerGame, boardState]);

  // Handle auto-play moves for single player games
  useEffect(() => {
    if (!isSinglePlayerGame || !boardState || gameFinished) return;

    const autoPlayState = autoPlayService.getState();
    if (!autoPlayState.isActive || autoPlayMode !== 'ai-only') return;

    // Only auto-play when it's the AI opponent's turn
    const shouldMakeMove = currentPlayerId?.startsWith('fake-opponent-') ?? false;

    if (shouldMakeMove && autoPlayService.canMakeMove()) {
      // Extract valid moves from board state
      const boardArray = boardStringToArray(boardState);
      const validMoves = boardArray.map((cell, index) => (cell === '0' ? index : -1)).filter((index) => index !== -1);
      const currentPlayerPiece =
        Object.values({ black, white }).find((player) => player?.userId === currentPlayerId)?.piece || 'B';

      const move = autoPlayService.generateMove(boardState, validMoves, currentPlayerPiece, score || { B: 0, W: 0 });

      if (move !== null) {
        // Use moderate timing for single player games (not instant, not too slow)
        const scheduledPlayerId = currentPlayerId;
        autoPlayService.scheduleMove(() => {
          if (!gameFinished && currentPlayerId === scheduledPlayerId && autoPlayService.canMakeMove()) {
            autoPlayService.setPendingMove();
            handleDebugMove(move);
          }
        });
      }
    }
  }, [isSinglePlayerGame, boardState, currentPlayerId, gameFinished, autoPlayMode, black, white, score]);

  // Clean up autoPlay when component unmounts or game ends
  useEffect(() => {
    return () => {
      if (autoPlayService.getState().isActive) {
        autoPlayService.stop();
      }
    };
  }, []);

  // Clear pending move when game state updates
  useEffect(() => {
    autoPlayService.clearPendingMove();
  }, [boardState]);

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
