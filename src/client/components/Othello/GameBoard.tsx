import { useState, useEffect } from 'react';
import { Player, PlayerTimerState, Game } from '../../../server/models/Game';
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
  game?: Game | null;
  challengeState?: {
    attemptsUsed: number;
    attemptsRemaining: number;
    hintsUsed: number[];
    moveHistory: number[];
    isCompleted: boolean;
    lastMoveResult?: {
      success: boolean;
      isSolution: boolean;
      isPartialSolution: boolean;
      challengeComplete: boolean;
      explanation?: string;
      error?: string;
    };
    completionData?: {
      success: boolean;
      score: number;
      timeSpent: number;
      hintsUsed: number;
      explanation?: string;
      moves: number[];
    };
  } | null;
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
  game,
  challengeState,
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

        {/* Challenge UI - only show for challenge games */}
        {game?.isChallenge && challengeState && (
          <div
            className="challenge-controls"
            style={{
              padding: '1rem',
              margin: '1rem 0',
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              border: '2px solid #d4af37',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ color: '#d4af37', margin: '0 0 1rem 0' }}>Daily Challenge</h3>

            <div
              className="challenge-status"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                fontSize: '0.9rem',
                color: '#666',
              }}
            >
              <span>
                Attempts: {challengeState.attemptsUsed} /{' '}
                {challengeState.attemptsUsed + challengeState.attemptsRemaining}
              </span>
              <span>Moves Made: {challengeState.moveHistory.length}</span>
              <span>Hints Used: {challengeState.hintsUsed.length}</span>
            </div>

            {challengeState.lastMoveResult && (
              <div
                className="last-move-feedback"
                style={{
                  padding: '0.5rem',
                  margin: '0.5rem 0',
                  borderRadius: '4px',
                  backgroundColor: challengeState.lastMoveResult.isSolution ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${challengeState.lastMoveResult.isSolution ? '#c3e6cb' : '#f5c6cb'}`,
                  color: challengeState.lastMoveResult.isSolution ? '#155724' : '#721c24',
                }}
              >
                {challengeState.lastMoveResult.isSolution
                  ? '✅ Correct move!'
                  : challengeState.lastMoveResult.error || '❌ Try again!'}
              </div>
            )}

            {challengeState.completionData && (
              <div
                className="completion-modal"
                style={{
                  position: 'fixed',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    maxWidth: '500px',
                    width: '90%',
                    textAlign: 'center',
                  }}
                >
                  <h2 style={{ color: '#d4af37', marginBottom: '1rem' }}>🏆 Challenge Complete!</h2>
                  <p style={{ marginBottom: '1rem' }}>
                    <strong>Score:</strong> {challengeState.completionData.score} points
                    <br />
                    <strong>Time:</strong> {challengeState.completionData.timeSpent} seconds
                    <br />
                    <strong>Hints Used:</strong> {challengeState.completionData.hintsUsed}
                  </p>
                  {challengeState.completionData.explanation && (
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        color: '#555',
                      }}
                    >
                      <strong>Explanation:</strong>
                      <br />
                      {challengeState.completionData.explanation}
                    </div>
                  )}
                  <button
                    onClick={() => (window.location.href = '/single-player')}
                    style={{
                      background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                      color: 'white',
                      border: 'none',
                      padding: '0.8rem 2rem',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Back to Menu
                  </button>
                </div>
              </div>
            )}

            <div
              className="challenge-actions"
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                marginTop: '1rem',
              }}
            >
              <button
                disabled={challengeState.isCompleted || challengeState.attemptsRemaining <= 0}
                style={{
                  background: challengeState.isCompleted ? '#ccc' : 'linear-gradient(135deg, #28a745, #20a139)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: challengeState.isCompleted ? 'not-allowed' : 'pointer',
                }}
              >
                Submit Solution
              </button>
              <button
                style={{
                  background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Undo Last Move
              </button>
              <button
                style={{
                  background: 'linear-gradient(135deg, #17a2b8, #138496)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Get Hint
              </button>
            </div>
          </div>
        )}

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
