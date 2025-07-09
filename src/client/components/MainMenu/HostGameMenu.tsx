import { FormEventHandler, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { GameMode } from '../../../shared/types/gameModeTypes';
import { useGameModes } from '../../contexts/GameModeContext';
import { useGameView } from '../../contexts/GameViewContext';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';
import { validateTimerConfig, TimerValidationResult } from '../../utils/timerValidation';
import { GameModeSelector } from '../GameModeSelector/GameModeSelector';
import './game-forms.scss';

const getEstimatedDurationText = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
};

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'beginner':
      return '#4CAF50';
    case 'intermediate':
      return '#FF9800';
    case 'advanced':
      return '#F44336';
    case 'expert':
      return '#9C27B0';
    default:
      return '#757575';
  }
};

const getTimerDisplayText = (timer: NonNullable<GameMode['config']['timer']>): string => {
  if (timer.type === 'unlimited') {
    return 'No time limit';
  } else if (timer.type === 'fixed') {
    return `${timer.initialTime}s per move`;
  } else if (timer.type === 'increment') {
    return `${timer.initialTime}s + ${timer.increment}s`;
  } else if (timer.type === 'delay') {
    return `${timer.initialTime}s + ${timer.delay}s delay`;
  } else {
    return `${timer.initialTime}s + ${timer.increment}s`;
  }
};

const getTimerIcon = (timer: NonNullable<GameMode['config']['timer']>): string => {
  switch (timer.type) {
    case 'unlimited':
      return '∞';
    case 'fixed':
      return '⏱️';
    case 'increment':
      return '⏰';
    case 'delay':
      return '⏳';
    default:
      return '⏰';
  }
};

export const HostGameMenu = () => {
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [timerValidation, setTimerValidation] = useState<TimerValidationResult | null>(null);
  const { setCurrentView } = useGameView();
  const { gameModes, getDefaultGameMode } = useGameModes();

  useEffect(() => {
    setCurrentView('form');
  }, [setCurrentView]);

  // Auto-select default game mode when component mounts
  useEffect(() => {
    if (gameModes.length > 0 && !selectedGameMode) {
      const defaultMode = getDefaultGameMode();
      if (defaultMode) {
        setSelectedGameMode(defaultMode);
      }
    }
  }, [gameModes, selectedGameMode, getDefaultGameMode]);

  // Validate timer configuration when game mode changes
  useEffect(() => {
    if (selectedGameMode?.config?.timer) {
      const validation = validateTimerConfig(selectedGameMode.config.timer);
      setTimerValidation(validation);
    } else {
      setTimerValidation(null);
    }
  }, [selectedGameMode]);
  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!socket || !localUserName.trim() || !selectedGameMode) {
      return;
    }

    // Check timer validation before creating game
    if (timerValidation && !timerValidation.isValid) {
      console.error('Timer configuration is invalid:', timerValidation.errors);
      return;
    }

    setIsCreating(true);
    setUsername(localUserName);

    socket.emit(
      SocketEvents.HostNewGameWithMode,
      localUserId,
      localUserName.trim(),
      selectedGameMode.id,
      (response: { success: boolean; gameId?: string; error?: string }) => {
        setIsCreating(false);

        if (response.success) {
          console.log(`Game created with mode ${selectedGameMode.name}:`, response.gameId);
          navigate(`/game/${response.gameId}`);
        } else {
          console.error('Failed to create game:', response.error);
          // TODO: Show error message to user
        }
      },
    );
  };

  const handleModeSelect = (mode: GameMode) => {
    setSelectedGameMode(mode);
    setShowModeSelector(false);
  };
  return (
    <div id="host-game-menu" className="game-form-container">
      <div className="form-header">
        <h1 className="form-title">Host New Game</h1>
        <p className="form-subtitle">Create a game and invite a friend to play</p>
      </div>

      <form className="game-form" onSubmit={onSubmit}>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          value={localUserName}
          onChange={(e) => setLocalUserName(e.target.value)}
          disabled={isCreating}
          required
          minLength={1}
          maxLength={20}
        />

        {/* Game Mode Selection */}
        <div className="game-mode-selection">
          <label htmlFor="game-mode">Game Mode:</label>
          <div className="selected-mode-display">
            {selectedGameMode ? (
              <div className="mode-preview-card">
                <div className="mode-header">
                  <h4 className="mode-name">{selectedGameMode.name}</h4>
                  <div className="mode-badges">
                    {selectedGameMode.isDefault && <span className="badge default">⭐ Default</span>}
                    <span
                      className="badge difficulty"
                      style={{ backgroundColor: getDifficultyColor(selectedGameMode.difficultyLevel) }}
                    >
                      {selectedGameMode.difficultyLevel}
                    </span>
                  </div>
                </div>

                <p className="mode-description">{selectedGameMode.description}</p>

                <div className="mode-details">
                  <div className="detail-row">
                    <span className="detail-label">
                      <span className="detail-icon">🕐</span>
                      Duration:
                    </span>
                    <span className="detail-value">
                      {selectedGameMode.estimatedDuration
                        ? getEstimatedDurationText(selectedGameMode.estimatedDuration)
                        : 'Variable'}
                    </span>
                  </div>

                  {selectedGameMode.config.timer && (
                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">{getTimerIcon(selectedGameMode.config.timer)}</span>
                        Timer:
                      </span>
                      <span className="detail-value">{getTimerDisplayText(selectedGameMode.config.timer)}</span>
                    </div>
                  )}

                  {selectedGameMode.config.board && (
                    <div className="detail-row">
                      <span className="detail-label">
                        <span className="detail-icon">🎯</span>
                        Board:
                      </span>
                      <span className="detail-value">
                        {selectedGameMode.config.board.width}x{selectedGameMode.config.board.height}
                      </span>
                    </div>
                  )}

                  {selectedGameMode.tags.length > 0 && (
                    <div className="mode-tags">
                      {selectedGameMode.tags.map((tag) => (
                        <span key={tag} className="tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timer validation display */}
                {timerValidation && (
                  <div className="timer-validation">
                    {timerValidation.errors.length > 0 && (
                      <div className="validation-errors">
                        <h5>⚠️ Timer Configuration Errors:</h5>
                        <ul>
                          {timerValidation.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {timerValidation.warnings.length > 0 && (
                      <div className="validation-warnings">
                        <h5>⚠️ Timer Configuration Warnings:</h5>
                        <ul>
                          {timerValidation.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="no-mode-selected">No game mode selected</div>
            )}
            <button
              type="button"
              className="change-mode-btn"
              onClick={() => setShowModeSelector(true)}
              disabled={isCreating}
            >
              {selectedGameMode ? 'Change Mode' : 'Select Mode'}
            </button>
          </div>
        </div>

        <button
          className="submit-button"
          type="submit"
          disabled={
            isCreating || !localUserName.trim() || !selectedGameMode || (timerValidation && !timerValidation.isValid)
          }
        >
          {isCreating ? 'Creating Game...' : 'Create & Host Game'}
        </button>
      </form>

      {/* Game Mode Selector Modal */}
      {showModeSelector && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Select Game Mode</h2>
              <button className="close-btn" onClick={() => setShowModeSelector(false)}>
                ×
              </button>
            </div>
            <GameModeSelector
              onModeSelect={handleModeSelect}
              selectedModeId={selectedGameMode?.id}
              showDescription={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
