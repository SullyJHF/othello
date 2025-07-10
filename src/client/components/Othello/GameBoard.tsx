import { useState, useEffect } from 'react';
import { Player, PlayerTimerState, Game } from '../../../server/models/Game';
import { SocketEvents } from '../../../shared/SocketEvents';
import { boardStringToArray } from '../../../shared/utils/boardUtils';
import { autoPlayService } from '../../services/autoPlayService';
import { useSocket } from '../../utils/socketHooks';
import { ClientBoardLogic } from '../../utils/boardLogic';
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
    // Enhanced multi-stage challenge state
    currentMoveIndex: number;
    totalMoves: number;
    temporaryMoves: number[];
    canUndo: boolean;
    sequenceComplete: boolean;
    lastMoveResult?: {
      success: boolean;
      isSolution: boolean;
      isPartialSolution: boolean;
      challengeComplete: boolean;
      currentMoveIndex: number;
      totalMoves: number;
      temporaryMoves: number[];
      canUndo: boolean;
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

  // Local challenge state for client-side move handling
  const [localChallengeBoardState, setLocalChallengeBoardState] = useState<string>(boardState);
  const [localChallengeMoves, setLocalChallengeMoves] = useState<number[]>([]);

  // Reset local challenge state when board state changes (new challenge or reset)
  useEffect(() => {
    if (game?.isChallenge) {
      setLocalChallengeBoardState(boardState);
      setLocalChallengeMoves([]);
    }
  }, [boardState, game?.isChallenge]);

  // Handle challenge moves locally
  const handleChallengeMove = (placeId: number, newBoardState: string) => {
    console.log('🎯 Client-side challenge move:', placeId, 'new state length:', newBoardState.length);
    setLocalChallengeBoardState(newBoardState);
    setLocalChallengeMoves((prev) => [...prev, placeId]);
  };

  // Rebuild board state by replaying moves from original state
  const rebuildBoardState = (moves: number[]) => {
    let currentBoardState = boardState; // Start with original challenge board state

    for (const move of moves) {
      const newState = ClientBoardLogic.placePiece(currentBoardState, move, 'B');
      if (newState) {
        // Update with valid moves for next turn (alternate between B and W)
        const nextPlayer = 'W'; // In challenges, user is always B, AI is W
        currentBoardState = ClientBoardLogic.updateValidMoves(newState, nextPlayer);
      } else {
        console.error('Failed to replay move during rebuild:', move);
        break;
      }
    }

    return currentBoardState;
  };

  // Handle challenge undo
  const handleChallengeUndo = () => {
    if (localChallengeMoves.length === 0) return;

    console.log('⏪ Client-side challenge undo');
    const newMoves = localChallengeMoves.slice(0, -1);
    setLocalChallengeMoves(newMoves);

    // Rebuild board state from original + remaining moves
    const reconstructedState = rebuildBoardState(newMoves);
    setLocalChallengeBoardState(reconstructedState);
  };

  // Handle challenge submission
  const handleChallengeSubmit = () => {
    if (socket && localChallengeMoves.length > 0) {
      console.log('📝 Submitting challenge solution:', localChallengeMoves);
      socket.emit(SocketEvents.SubmitChallengeAttempt, gameId, localUserId, localChallengeMoves);
    }
  };

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
          boardState={game?.isChallenge ? localChallengeBoardState : boardState}
          isCurrentPlayer={isCurrentPlayer}
          manualControlMode={autoPlayMode === 'manual-control'}
          currentPlayerId={currentPlayerId}
          isChallenge={game?.isChallenge}
          onChallengeMove={handleChallengeMove}
        />

        {/* Enhanced Multi-Stage Challenge UI - always show for challenge games */}
        {game?.isChallenge && (
          <div
            className="enhanced-challenge-controls"
            style={{
              padding: '1.5rem',
              margin: '1rem 0',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              border: '2px solid #d4af37',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ color: '#d4af37', margin: '0 0 1.5rem 0', fontSize: '1.4rem' }}>🎯 Daily Challenge</h3>

            {/* Multi-stage progress indicators */}
            <div
              className="challenge-progress-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.8rem',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#d4af37', fontWeight: 'bold' }}>Move Progress</div>
                <div style={{ color: '#333', fontSize: '1.1rem' }}>
                  {challengeState?.currentMoveIndex || 0} / {challengeState?.totalMoves || 1}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#d4af37', fontWeight: 'bold' }}>Attempts</div>
                <div style={{ color: '#333', fontSize: '1.1rem' }}>
                  {challengeState?.attemptsUsed || 0} /{' '}
                  {(challengeState?.attemptsUsed || 0) + (challengeState?.attemptsRemaining || 0)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#d4af37', fontWeight: 'bold' }}>Local Moves</div>
                <div style={{ color: '#333', fontSize: '1.1rem' }}>{localChallengeMoves.length}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#d4af37', fontWeight: 'bold' }}>Hints Used</div>
                <div style={{ color: '#333', fontSize: '1.1rem' }}>{challengeState?.hintsUsed?.length || 0}</div>
              </div>
            </div>

            {/* Sequence progress bar */}
            {challengeState && challengeState.totalMoves > 1 && (
              <div
                className="sequence-progress"
                style={{
                  marginBottom: '1.5rem',
                  padding: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Multi-Stage Progress</div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(challengeState.currentMoveIndex / challengeState.totalMoves) * 100}%`,
                      height: '100%',
                      backgroundColor: challengeState.sequenceComplete ? '#28a745' : '#d4af37',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.3rem' }}>
                  {challengeState.sequenceComplete
                    ? '🎉 Sequence Complete!'
                    : challengeState.currentMoveIndex === 0
                      ? 'Ready to start...'
                      : `Move ${challengeState.currentMoveIndex} of ${challengeState.totalMoves} completed`}
                </div>
              </div>
            )}

            {/* Real-time move feedback */}
            {challengeState?.lastMoveResult && (
              <div
                className="enhanced-move-feedback"
                style={{
                  padding: '0.8rem',
                  margin: '0.8rem 0',
                  borderRadius: '8px',
                  backgroundColor: challengeState.lastMoveResult.isSolution ? '#d4edda' : '#f8d7da',
                  border: `2px solid ${challengeState.lastMoveResult.isSolution ? '#c3e6cb' : '#f5c6cb'}`,
                  color: challengeState.lastMoveResult.isSolution ? '#155724' : '#721c24',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  {challengeState.lastMoveResult.isSolution ? '✅ Correct Move!' : '❌ Incorrect Move'}
                </div>
                {challengeState.lastMoveResult.isPartialSolution && (
                  <div style={{ fontSize: '0.9rem' }}>🔄 Continue with the next move...</div>
                )}
                {challengeState.lastMoveResult.challengeComplete && (
                  <div style={{ fontSize: '0.9rem', color: '#28a745', fontWeight: 'bold' }}>
                    🎉 All moves complete! Ready to submit.
                  </div>
                )}
                {challengeState.lastMoveResult.error && (
                  <div style={{ fontSize: '0.9rem' }}>{challengeState.lastMoveResult.error}</div>
                )}
              </div>
            )}

            {/* Enhanced action buttons */}
            <div
              className="enhanced-challenge-actions"
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                marginTop: '1.5rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={handleChallengeSubmit}
                disabled={localChallengeMoves.length === 0}
                style={{
                  background: localChallengeMoves.length > 0 ? 'linear-gradient(135deg, #28a745, #20a139)' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '6px',
                  cursor: localChallengeMoves.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  minWidth: '140px',
                }}
              >
                🏆 Submit Solution
              </button>

              <button
                onClick={handleChallengeUndo}
                disabled={localChallengeMoves.length === 0}
                style={{
                  background: localChallengeMoves.length > 0 ? 'linear-gradient(135deg, #ffc107, #e0a800)' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '6px',
                  cursor: localChallengeMoves.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  minWidth: '140px',
                }}
              >
                ⏪ Undo Move
              </button>

              <button
                disabled={challengeState?.isCompleted}
                style={{
                  background: !challengeState?.isCompleted ? 'linear-gradient(135deg, #6c757d, #5a6268)' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '6px',
                  cursor: !challengeState?.isCompleted ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  minWidth: '140px',
                }}
              >
                💡 Get Hint
              </button>
            </div>

            {/* Completion modal */}
            {challengeState?.completionData && (
              <div
                className="enhanced-completion-modal"
                style={{
                  position: 'fixed',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '2.5rem',
                    borderRadius: '16px',
                    maxWidth: '600px',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <h2 style={{ color: '#d4af37', marginBottom: '1.5rem', fontSize: '2rem' }}>🏆 Challenge Complete!</h2>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <div>
                      <div style={{ color: '#d4af37', fontWeight: 'bold' }}>Score</div>
                      <div style={{ fontSize: '1.5rem', color: '#333' }}>{challengeState.completionData.score}</div>
                    </div>
                    <div>
                      <div style={{ color: '#d4af37', fontWeight: 'bold' }}>Time</div>
                      <div style={{ fontSize: '1.5rem', color: '#333' }}>
                        {challengeState.completionData.timeSpent}s
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#d4af37', fontWeight: 'bold' }}>Hints</div>
                      <div style={{ fontSize: '1.5rem', color: '#333' }}>{challengeState.completionData.hintsUsed}</div>
                    </div>
                  </div>
                  {challengeState.completionData.explanation && (
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        fontSize: '1rem',
                        color: '#555',
                        textAlign: 'left',
                      }}
                    >
                      <strong style={{ color: '#d4af37' }}>Solution Explanation:</strong>
                      <br />
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
                      padding: '1rem 2.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                    }}
                  >
                    🎮 Back to Single Player
                  </button>
                </div>
              </div>
            )}
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
