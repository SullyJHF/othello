/**
 * Debug control panel for auto-play and game testing utilities
 * Floating panel that appears during gameplay when debug mode is enabled
 */

import { useState, useEffect } from 'react';
import { AutoPlayState, AutoPlayConfig } from '../../../shared/types/debugTypes';
import { PlayerTimerState } from '../../../server/models/Game';
import { useDebugMode } from '../../hooks/useDebugMode';
import { autoPlayService, MoveAlgorithm } from '../../services/autoPlayService';
import './debug-panel.scss';

interface DebugPanelProps {
  gameId: string;
  currentPlayer: 'B' | 'W';
  currentPlayerId: string;
  gameStarted: boolean;
  gameFinished: boolean;
  validMoves: number[];
  boardState: string;
  scores: { black: number; white: number };
  onMakeMove: (position: number) => void;
  autoPlayMode: 'off' | 'ai-only' | 'manual-control' | 'full-auto';
  onAutoPlayModeChange: (mode: 'off' | 'ai-only' | 'manual-control' | 'full-auto') => void;
  players: {
    black?: { userId: string; piece?: 'B' | 'W'; name?: string };
    white?: { userId: string; piece?: 'B' | 'W'; name?: string };
  };
  timerStates?: { [userId: string]: PlayerTimerState };
}

export const DebugPanel = ({
  gameId: _gameId,
  currentPlayer,
  currentPlayerId,
  gameStarted,
  gameFinished,
  validMoves,
  boardState,
  scores,
  onMakeMove,
  autoPlayMode,
  onAutoPlayModeChange,
  players,
  timerStates,
}: DebugPanelProps) => {
  const { isDebugEnabled, isAutoPlayEnabled, panelState, togglePanel, setPanelTab: _setPanelTab } = useDebugMode();
  const [autoPlayState, setAutoPlayState] = useState<AutoPlayState>(autoPlayService.getState());
  const [isInstant, setIsInstant] = useState<boolean>(false);

  // Stable check for debug game - only calculate once when players change
  const [isDebugGame, setIsDebugGame] = useState(false);

  useEffect(() => {
    const debugGame =
      (players.black?.userId?.startsWith('fake-opponent-') ?? false) ||
      (players.white?.userId?.startsWith('fake-opponent-') ?? false);
    setIsDebugGame(debugGame);
  }, [players.black?.userId, players.white?.userId]);

  // Subscribe to auto-play state changes
  useEffect(() => {
    const unsubscribe = autoPlayService.subscribe(setAutoPlayState);
    return unsubscribe;
  }, []);

  // Handle auto-play moves
  useEffect(() => {
    if (!gameStarted || gameFinished || !autoPlayState.isActive) return;

    const shouldMakeMove = () => {
      switch (autoPlayMode) {
        case 'ai-only':
          // Only auto-play for the fake opponent (AI player)
          return currentPlayerId.startsWith('fake-opponent-');
        case 'full-auto':
          // Auto-play for both players
          return true;
        case 'manual-control':
        case 'off':
        default:
          return false;
      }
    };

    if (
      shouldMakeMove() &&
      autoPlayService.shouldMakeMove(currentPlayer, gameStarted, gameFinished) &&
      autoPlayService.canMakeMove()
    ) {
      const move = autoPlayService.generateMove(boardState, validMoves, currentPlayer, scores);

      if (move !== null) {
        if (isInstant) {
          // Make instant moves without delay, but double-check game state
          if (!gameFinished && gameStarted && autoPlayService.canMakeMove()) {
            autoPlayService.setPendingMove();
            onMakeMove(move);
          }
        } else {
          // Use normal timing from speed slider
          // Capture current player state when scheduling the move
          const scheduledPlayer = currentPlayer;
          const scheduledPlayerId = currentPlayerId;

          autoPlayService.scheduleMove(() => {
            // Double-check game state, player turn, and pending state before making the move
            if (
              !gameFinished &&
              gameStarted &&
              currentPlayer === scheduledPlayer &&
              currentPlayerId === scheduledPlayerId &&
              autoPlayService.canMakeMove()
            ) {
              autoPlayService.setPendingMove();
              onMakeMove(move);
            } else {
              // Skip scheduled move: game state changed or move pending
              // Debug info available: originalPlayer, currentPlayer, originalPlayerId, currentPlayerId, gameFinished, gameStarted, canMakeMove
            }
          });
        }
      } else {
        autoPlayService.recordError('No valid move generated');
      }
    }
  }, [
    currentPlayer,
    currentPlayerId,
    gameStarted,
    gameFinished,
    validMoves,
    boardState,
    scores,
    autoPlayState.isActive,
    autoPlayMode,
    onMakeMove,
    isInstant,
  ]);

  // Stop auto-play immediately when game finishes
  useEffect(() => {
    if (gameFinished && autoPlayState.isActive) {
      autoPlayService.stop();
    }
  }, [gameFinished, autoPlayState.isActive]);

  // Don't render if debug mode is not enabled OR if this is not a debug game
  if (!isDebugEnabled || !isAutoPlayEnabled || !isDebugGame) {
    return null;
  }

  const handleAutoPlayModeChange = (mode: typeof autoPlayMode) => {
    onAutoPlayModeChange(mode);

    if (mode === 'off') {
      autoPlayService.stop();
    } else {
      const config: Partial<AutoPlayConfig> = {
        enabled: true,
        speed: autoPlayState.config.speed,
        algorithm: autoPlayState.config.algorithm,
        playBothSides: mode === 'full-auto',
      };

      autoPlayService.initialize(config);
      autoPlayService.start();
    }
  };

  const handleSpeedChange = (speed: number) => {
    autoPlayService.updateConfig({ speed });
  };

  const handleAlgorithmChange = (algorithm: MoveAlgorithm) => {
    autoPlayService.updateConfig({ algorithm });
  };

  const getStatusText = () => {
    if (!gameStarted) return 'Game not started';
    if (gameFinished) return 'Game finished';

    // Show current mode and activity status
    const modeText = {
      off: 'Manual Mode',
      'ai-only': 'AI Auto Play',
      'manual-control': 'Manual Control Mode',
      'full-auto': 'Full Auto Play',
    }[autoPlayMode];

    if (autoPlayState.isActive) {
      return `${modeText} - Active (${autoPlayState.moveCount} moves)`;
    }

    return `${modeText} - Ready`;
  };

  const getStatusColor = () => {
    if (!gameStarted || gameFinished) return 'inactive';
    if (autoPlayState.isActive) return 'active';
    return 'ready';
  };

  return (
    <div className={`debug-panel ${panelState.position} ${panelState.size} ${panelState.isOpen ? 'open' : 'closed'}`}>
      {/* Panel Header */}
      <div
        className="panel-header"
        onClick={togglePanel}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePanel();
          }
        }}
        aria-label="Toggle debug panel"
      >
        <div className="header-top-row">
          <span className="panel-title">🛠️ Debug Controls</span>
          <button className="toggle-button" aria-label="Toggle debug panel">
            {panelState.isOpen ? '▼' : '▲'}
          </button>
        </div>
        <div className="header-status-row">
          <span className={`status-indicator ${getStatusColor()}`}>{getStatusText()}</span>
        </div>
      </div>

      {/* Panel Content */}
      <div className="panel-content">
        {panelState.isOpen && (
          <>
            {/* Auto-Play Mode Controls */}
            <div className="control-section">
              <h4>Auto-Play Mode</h4>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="autoPlayMode"
                    value="off"
                    checked={autoPlayMode === 'off'}
                    onChange={() => handleAutoPlayModeChange('off')}
                  />
                  <span className="radio-label">🚫 Off</span>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="autoPlayMode"
                    value="ai-only"
                    checked={autoPlayMode === 'ai-only'}
                    onChange={() => handleAutoPlayModeChange('ai-only')}
                  />
                  <span className="radio-label">🤖 AI Auto-Play</span>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="autoPlayMode"
                    value="manual-control"
                    checked={autoPlayMode === 'manual-control'}
                    onChange={() => handleAutoPlayModeChange('manual-control')}
                  />
                  <span className="radio-label">🎮 Manual Control</span>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="autoPlayMode"
                    value="full-auto"
                    checked={autoPlayMode === 'full-auto'}
                    onChange={() => handleAutoPlayModeChange('full-auto')}
                  />
                  <span className="radio-label">⚡ Full Auto-Play</span>
                </label>
              </div>
            </div>

            {/* Speed Control */}
            {autoPlayMode !== 'off' && (
              <div className="control-section">
                <h4>Speed: {isInstant ? 'Instant' : `${autoPlayState.config.speed}x`}</h4>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={autoPlayState.config.speed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="speed-slider"
                  disabled={isInstant}
                />
                <div className="speed-labels">
                  <span>0.5x</span>
                  <span>5x</span>
                  <span>10x</span>
                </div>

                {/* Instant Mode Checkbox */}
                <label className="radio-option" style={{ marginTop: '8px' }}>
                  <input type="checkbox" checked={isInstant} onChange={(e) => setIsInstant(e.target.checked)} />
                  <span className="radio-label">⚡ Instant moves</span>
                </label>
              </div>
            )}

            {/* Algorithm Selection */}
            {autoPlayMode !== 'off' && autoPlayMode !== 'manual-control' && (
              <div className="control-section">
                <h4>Algorithm</h4>
                <select
                  value={autoPlayState.config.algorithm}
                  onChange={(e) => handleAlgorithmChange(e.target.value as MoveAlgorithm)}
                  className="algorithm-select"
                >
                  <option value="random">🎲 Random</option>
                  <option value="greedy">🥇 Greedy (Most Captures)</option>
                  <option value="corner-seeking">🏰 Corner-Seeking</option>
                  <option value="strategic">🧠 Strategic</option>
                </select>
              </div>
            )}

            {/* Game Info */}
            <div className="control-section">
              <h4>Game Info</h4>
              <div className="game-info">
                <div className="info-row">
                  <span>Current Player:</span>
                  <span className={`player-indicator ${currentPlayer.toLowerCase()}`}>
                    {currentPlayer === 'B' ? 'Black' : 'White'}
                  </span>
                </div>
                <div className="info-row">
                  <span>Valid Moves:</span>
                  <span>{validMoves.length}</span>
                </div>
                <div className="info-row">
                  <span>Score:</span>
                  <span>
                    B: {scores.black} | W: {scores.white}
                  </span>
                </div>
                {autoPlayState.isActive && (
                  <div className="info-row">
                    <span>Moves Made:</span>
                    <span>{autoPlayState.moveCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timer Controls */}
            {timerStates && Object.keys(timerStates).length > 0 && (
              <div className="control-section">
                <h4>⏰ Timer Controls</h4>
                <div className="timer-info">
                  {Object.entries(timerStates).map(([userId, timerState]) => {
                    const player = players.black?.userId === userId ? players.black : players.white;
                    const playerName = player?.name || userId;
                    const piece = player?.piece || 'Unknown';
                    const isCurrentPlayer = currentPlayerId === userId;

                    return (
                      <div key={userId} className="timer-player-info">
                        <div className="timer-player-header">
                          <span className={`player-indicator ${piece.toLowerCase()}`}>
                            {piece === 'B' ? 'Black' : 'White'} - {playerName}
                          </span>
                          {isCurrentPlayer && <span className="current-turn">●</span>}
                        </div>
                        <div className="timer-details">
                          <div className="timer-stat">
                            <span>Remaining:</span>
                            <span>
                              {Math.floor(timerState.remainingTime / 60)}:
                              {(timerState.remainingTime % 60).toFixed(0).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="timer-stat">
                            <span>Total Move Time:</span>
                            <span>
                              {Math.floor(timerState.totalMoveTime / 60)}:
                              {(timerState.totalMoveTime % 60).toFixed(0).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="timer-stat">
                            <span>Moves:</span>
                            <span>{timerState.moveCount}</span>
                          </div>
                          <div className="timer-stat">
                            <span>Status:</span>
                            <span
                              className={`timer-status ${timerState.isPaused ? 'paused' : timerState.isActive ? 'active' : 'inactive'}`}
                            >
                              {timerState.isPaused ? 'Paused' : timerState.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Display */}
            {autoPlayState.errors.length > 0 && (
              <div className="control-section error-section">
                <h4>⚠️ Errors ({autoPlayState.errors.length})</h4>
                <div className="error-list">
                  {autoPlayState.errors.slice(-3).map((error, index) => (
                    <div key={index} className="error-message">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
