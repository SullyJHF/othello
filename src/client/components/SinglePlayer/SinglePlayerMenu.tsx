import { FormEventHandler, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { GameMode } from '../../../shared/types/gameModeTypes';
import { useGameModes } from '../../contexts/GameModeContext';
import { useGameView } from '../../contexts/GameViewContext';
import { useLocalStorage } from '../../utils/hooks';
import { useSocket } from '../../utils/socketHooks';
import '../MainMenu/game-forms.scss';
import './single-player-menu.scss';

interface AIDifficulty {
  id: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  name: string;
  description: string;
  icon: string;
  estimatedRating: string;
}

interface AIPersonality {
  id: 'aggressive' | 'defensive' | 'balanced' | 'unpredictable';
  name: string;
  description: string;
  icon: string;
}

export const SinglePlayerMenu = () => {
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [userName, setUsername] = useLocalStorage('username', '');
  const [localUserName, setLocalUserName] = useState(userName);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty | null>(null);
  const [selectedPersonality, setSelectedPersonality] = useState<AIPersonality | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [userPiece, setUserPiece] = useState<'B' | 'W' | 'random'>('random');
  const [gameType, setGameType] = useState<'practice' | 'challenge'>('practice');
  const [isCreating, setIsCreating] = useState(false);
  const [availableDifficulties, setAvailableDifficulties] = useState<AIDifficulty[]>([]);
  const [availablePersonalities, setAvailablePersonalities] = useState<AIPersonality[]>([]);
  const { setCurrentView } = useGameView();
  const { gameModes, getDefaultGameMode } = useGameModes();

  useEffect(() => {
    setCurrentView('form');
  }, [setCurrentView]);

  // Load AI options when component mounts
  useEffect(() => {
    if (socket) {
      socket.emit(
        SocketEvents.GetAIOptions,
        (response: { difficulties: AIDifficulty[]; personalities: AIPersonality[] }) => {
          setAvailableDifficulties(response.difficulties);
          setAvailablePersonalities(response.personalities);

          // Auto-select beginner difficulty and balanced personality
          if (response.difficulties.length > 0) {
            const beginner = response.difficulties.find((d) => d.id === 'beginner') || response.difficulties[0];
            setSelectedDifficulty(beginner);
          }
          if (response.personalities.length > 0) {
            const balanced = response.personalities.find((p) => p.id === 'balanced') || response.personalities[0];
            setSelectedPersonality(balanced);
          }
        },
      );
    }
  }, [socket]);

  // Auto-select default game mode when available
  useEffect(() => {
    if (gameModes.length > 0 && !selectedGameMode) {
      const defaultMode = getDefaultGameMode();
      if (defaultMode) {
        setSelectedGameMode(defaultMode);
      }
    }
  }, [gameModes, selectedGameMode, getDefaultGameMode]);

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

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    // Handle daily challenge navigation
    if (gameType === 'challenge') {
      navigate('/daily-challenge');
      return;
    }

    if (!localUserId || !selectedDifficulty || !selectedPersonality || !selectedGameMode) {
      return;
    }

    setIsCreating(true);
    setUsername(localUserName);

    const options = {
      userPiece,
      aiDifficulty: selectedDifficulty.id,
      aiPersonality: selectedPersonality.id,
      gameMode: selectedGameMode,
    };

    const eventName = gameType === 'practice' ? SocketEvents.CreatePracticeGame : SocketEvents.CreateSinglePlayerGame;

    socket?.emit(
      eventName,
      localUserId,
      localUserName,
      options,
      (response: { success: boolean; gameId?: string; error?: string; aiOpponentName?: string }) => {
        setIsCreating(false);

        if (response.success && response.gameId) {
          console.log(`${gameType === 'practice' ? 'Practice' : 'Single player'} game created:`, response.gameId);
          navigate(`/game/${response.gameId}`);
        } else {
          console.error('Failed to create single player game:', response.error);
        }
      },
    );
  };

  const canSubmit =
    gameType === 'challenge'
      ? localUserName.trim() && !isCreating
      : localUserName.trim() && selectedDifficulty && selectedPersonality && selectedGameMode && !isCreating;

  return (
    <div className="game-form-container single-player-menu">
      <div className="form-header">
        <h1 className="form-title">🤖 Single Player</h1>
        <p className="form-subtitle">Challenge AI opponents of different skill levels</p>
      </div>

      <form onSubmit={onSubmit} className="game-form">
        {/* Game Type Selection */}
        <div className="form-section compact">
          <h3 className="section-title">Game Type</h3>
          <div className="radio-group">
            <label
              className={`radio-option ${gameType === 'practice' ? 'selected' : ''}`}
              htmlFor="gameType-practice"
              aria-label="Practice Game - No rating impact, just for fun and learning"
            >
              <input
                id="gameType-practice"
                type="radio"
                name="gameType"
                value="practice"
                checked={gameType === 'practice'}
                onChange={(e) => setGameType(e.target.value as 'practice' | 'challenge')}
              />
              <div className="radio-content">
                <span className="radio-icon">🎯</span>
                <div className="radio-text">
                  <span className="radio-label">Practice Game</span>
                  <span className="radio-description">No rating impact, just for fun and learning</span>
                </div>
              </div>
            </label>

            <label
              className={`radio-option ${gameType === 'challenge' ? 'selected' : ''}`}
              htmlFor="gameType-challenge"
              aria-label="Daily Challenge - Solve today's puzzle and earn points"
            >
              <input
                id="gameType-challenge"
                type="radio"
                name="gameType"
                value="challenge"
                checked={gameType === 'challenge'}
                onChange={(e) => setGameType(e.target.value as 'practice' | 'challenge')}
              />
              <div className="radio-content">
                <span className="radio-icon">🏆</span>
                <div className="radio-text">
                  <span className="radio-label">Daily Challenge</span>
                  <span className="radio-description">Solve today&apos;s puzzle and earn points</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Player Name */}
        <div className="form-section compact">
          <h3 className="section-title">Your Name</h3>
          <input
            type="text"
            placeholder="Enter your name"
            value={localUserName}
            onChange={(e) => setLocalUserName(e.target.value)}
            className="form-input"
            maxLength={20}
            required
          />
        </div>

        {/* Show AI options only for practice games */}
        {gameType === 'practice' && (
          <>
            {/* AI Difficulty Selection */}
            <div className="form-section">
              <h3 className="section-title">AI Difficulty</h3>
              <div className="difficulty-grid">
                {availableDifficulties.map((difficulty) => (
                  <button
                    key={difficulty.id}
                    type="button"
                    className={`difficulty-card ${selectedDifficulty?.id === difficulty.id ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    style={{ '--difficulty-color': getDifficultyColor(difficulty.id) } as React.CSSProperties}
                  >
                    <div className="difficulty-icon">{difficulty.icon}</div>
                    <div className="difficulty-info">
                      <h4 className="difficulty-name">{difficulty.name}</h4>
                      <p className="difficulty-rating">{difficulty.estimatedRating}</p>
                      <p className="difficulty-description">{difficulty.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Personality Selection */}
            <div className="form-section">
              <h3 className="section-title">AI Personality</h3>
              <div className="personality-grid">
                {availablePersonalities.map((personality) => (
                  <button
                    key={personality.id}
                    type="button"
                    className={`personality-card ${selectedPersonality?.id === personality.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPersonality(personality)}
                  >
                    <div className="personality-icon">{personality.icon}</div>
                    <div className="personality-info">
                      <h4 className="personality-name">{personality.name}</h4>
                      <p className="personality-description">{personality.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Piece Color Selection */}
            <div className="form-section compact">
              <h3 className="section-title">Your Color</h3>
              <div className="radio-group horizontal">
                <label
                  className={`radio-option ${userPiece === 'B' ? 'selected' : ''}`}
                  htmlFor="userPiece-B"
                  aria-label="Black piece - goes first"
                >
                  <input
                    id="userPiece-B"
                    type="radio"
                    name="userPiece"
                    value="B"
                    checked={userPiece === 'B'}
                    onChange={(e) => setUserPiece(e.target.value as 'B' | 'W' | 'random')}
                  />
                  <div className="radio-content">
                    <span className="radio-icon">⚫</span>
                    <span className="radio-label">Black (goes first)</span>
                  </div>
                </label>

                <label
                  className={`radio-option ${userPiece === 'W' ? 'selected' : ''}`}
                  htmlFor="userPiece-W"
                  aria-label="White piece"
                >
                  <input
                    id="userPiece-W"
                    type="radio"
                    name="userPiece"
                    value="W"
                    checked={userPiece === 'W'}
                    onChange={(e) => setUserPiece(e.target.value as 'B' | 'W' | 'random')}
                  />
                  <div className="radio-content">
                    <span className="radio-icon">⚪</span>
                    <span className="radio-label">White</span>
                  </div>
                </label>

                <label
                  className={`radio-option ${userPiece === 'random' ? 'selected' : ''}`}
                  htmlFor="userPiece-random"
                  aria-label="Random piece color"
                >
                  <input
                    id="userPiece-random"
                    type="radio"
                    name="userPiece"
                    value="random"
                    checked={userPiece === 'random'}
                    onChange={(e) => setUserPiece(e.target.value as 'B' | 'W' | 'random')}
                  />
                  <div className="radio-content">
                    <span className="radio-icon">🎲</span>
                    <span className="radio-label">Random</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Game Mode Selection */}
            {selectedGameMode && (
              <div className="form-section">
                <h3 className="section-title">Game Mode</h3>
                <div className="selected-mode-display">
                  <div className="mode-info">
                    <h4 className="mode-name">{selectedGameMode.name}</h4>
                    <p className="mode-description">{selectedGameMode.description}</p>
                    {selectedGameMode.config.timer && (
                      <div className="mode-timer">
                        <span className="timer-icon">⏰</span>
                        <span className="timer-text">
                          {selectedGameMode.config.timer.type === 'unlimited'
                            ? 'No time limit'
                            : `${selectedGameMode.config.timer.initialTime}s + ${selectedGameMode.config.timer.increment}s`}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="change-mode-button"
                    onClick={() => {
                      /* TODO: Open game mode selector */
                    }}
                  >
                    Change Mode
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Show daily challenge info when selected */}
        {gameType === 'challenge' && (
          <div className="form-section">
            <div className="challenge-info-preview">
              <h3 className="section-title">🌟 Daily Challenge</h3>
              <div className="challenge-preview-card">
                <div className="preview-content">
                  <div className="preview-icon">🏆</div>
                  <div className="preview-text">
                    <h4>Ready for today&apos;s challenge?</h4>
                    <p>Test your skills with a specially crafted puzzle, earn points, and climb the leaderboard!</p>
                    <ul className="challenge-features">
                      <li>🎯 Unique daily puzzles</li>
                      <li>⭐ Earn points and achievements</li>
                      <li>🔥 Build your winning streak</li>
                      <li>📊 Track your progress</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button type="submit" className={`form-submit ${canSubmit ? 'enabled' : 'disabled'}`} disabled={!canSubmit}>
            {isCreating ? (
              <>
                <span className="loading-spinner">⏳</span>
                Creating Game...
              </>
            ) : gameType === 'challenge' ? (
              <>
                <span className="submit-icon">🌟</span>
                View Daily Challenge
              </>
            ) : (
              <>
                <span className="submit-icon">🚀</span>
                Start Practice Game
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
