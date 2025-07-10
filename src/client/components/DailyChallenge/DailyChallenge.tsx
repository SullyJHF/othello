import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useGameView } from '../../contexts/GameViewContext';
import { useSocket } from '../../utils/socketHooks';
import './daily-challenge.scss';

interface DailyChallenge {
  id: string;
  date: string;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: 'tactical' | 'endgame' | 'opening' | 'puzzle' | 'scenario';
  boardState: string;
  currentPlayer: 'B' | 'W';
  hints: Array<{
    order: number;
    text: string;
    cost: number;
  }>;
  points: number;
  timeBonus: number;
  config: {
    maxAttempts: number;
    timeLimit?: number;
  };
}

interface UserStats {
  totalChallengesCompleted: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  averageTime: number;
}

export const DailyChallenge = () => {
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const { setCurrentView } = useGameView();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [usedHints, setUsedHints] = useState<number[]>([]);

  useEffect(() => {
    setCurrentView('form');
  }, [setCurrentView]);

  const loadTodaysChallenge = useCallback(() => {
    if (!socket) return;

    setLoading(true);
    setError(null);

    socket.emit(
      SocketEvents.GetDailyChallenge,
      (response: {
        success: boolean;
        challenge?: DailyChallenge;
        userStats?: UserStats;
        hasCompleted?: boolean;
        remainingAttempts?: number;
        error?: string;
      }) => {
        setLoading(false);

        if (response.success) {
          setChallenge(response.challenge ?? null);
          setUserStats(response.userStats ?? null);
          setHasCompleted(response.hasCompleted ?? false);
          setRemainingAttempts(response.remainingAttempts ?? 0);
        } else {
          setError(response.error ?? 'Failed to load daily challenge');
        }
      },
    );
  }, [socket]);

  // Load today's challenge when component mounts and socket is connected
  useEffect(() => {
    if (socket && localUserId && socket.connected) {
      // Small delay to ensure UserJoined event has been processed
      const timer = setTimeout(() => {
        loadTodaysChallenge();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [socket, localUserId, loadTodaysChallenge]);

  const startChallenge = () => {
    if (!challenge) return;

    // Create a special game for the daily challenge
    // This would create a puzzle/challenge game mode rather than a regular game
    navigate(`/challenge/${challenge.id}`);
  };

  const getDifficultyStars = (difficulty: number): string => {
    return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  };

  const getDifficultyColor = (difficulty: number): string => {
    const colors = ['#4CAF50', '#8BC34A', '#FF9800', '#F44336', '#9C27B0'];
    return colors[difficulty - 1] || '#757575';
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'tactical':
        return '⚔️';
      case 'endgame':
        return '🎯';
      case 'opening':
        return '🚀';
      case 'puzzle':
        return '🧩';
      case 'scenario':
        return '🎭';
      default:
        return '🎮';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleHints = () => {
    setShowHints(!showHints);
  };

  const handleUseHint = (hintIndex: number) => {
    if (!usedHints.includes(hintIndex)) {
      setUsedHints([...usedHints, hintIndex]);
    }
  };

  if (loading) {
    return (
      <div className="daily-challenge-container">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Loading today&apos;s challenge...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="daily-challenge-container">
        <div className="error-state">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={loadTodaysChallenge} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="daily-challenge-container">
        <div className="no-challenge-state">
          <h2>📅 No Challenge Available</h2>
          <p>No daily challenge found for today. Check back later!</p>
          <button onClick={() => navigate('/single-player')} className="back-button">
            Back to Single Player
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-challenge-container">
      <div className="challenge-header">
        <button onClick={() => navigate('/single-player')} className="back-button">
          ← Back
        </button>
        <div className="header-content">
          <h1 className="challenge-title">🌟 Daily Challenge</h1>
          <p className="challenge-date">
            {new Date(challenge.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="challenge-content">
        {/* Challenge Info Card */}
        <div className="challenge-card">
          <div className="challenge-meta">
            <div className="challenge-type">
              <span className="type-icon">{getTypeIcon(challenge.type)}</span>
              <span className="type-name">{challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}</span>
            </div>
            <div
              className="challenge-difficulty"
              style={{ '--difficulty-color': getDifficultyColor(challenge.difficulty) } as React.CSSProperties}
            >
              <span className="difficulty-stars">{getDifficultyStars(challenge.difficulty)}</span>
              <span className="difficulty-label">
                {challenge.difficulty} Star{challenge.difficulty !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <h2 className="challenge-name">{challenge.title}</h2>
          <p className="challenge-description">{challenge.description}</p>

          <div className="challenge-details">
            <div className="detail-item">
              <span className="detail-icon">🏆</span>
              <span className="detail-text">{challenge.points} base points</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">⚡</span>
              <span className="detail-text">+{challenge.timeBonus} time bonus</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">🎯</span>
              <span className="detail-text">
                {challenge.config.maxAttempts} attempt{challenge.config.maxAttempts !== 1 ? 's' : ''}
              </span>
            </div>
            {challenge.config.timeLimit && (
              <div className="detail-item">
                <span className="detail-icon">⏰</span>
                <span className="detail-text">{formatTime(challenge.config.timeLimit)} time limit</span>
              </div>
            )}
          </div>
        </div>

        {/* User Stats Card */}
        {userStats && (
          <div className="stats-card">
            <h3 className="stats-title">📊 Your Progress</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{userStats.currentStreak}</span>
                <span className="stat-label">Current Streak</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{userStats.totalPoints.toLocaleString()}</span>
                <span className="stat-label">Total Points</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{userStats.totalChallengesCompleted}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{userStats.longestStreak}</span>
                <span className="stat-label">Best Streak</span>
              </div>
            </div>
          </div>
        )}

        {/* Status and Actions */}
        <div className="challenge-status">
          {hasCompleted ? (
            <div className="completed-status">
              <h3 className="status-title">✅ Challenge Completed!</h3>
              <p className="status-message">Great job! You&apos;ve already completed today&apos;s challenge.</p>
              <p className="status-detail">Come back tomorrow for a new challenge!</p>
            </div>
          ) : (
            <div className="available-status">
              <h3 className="status-title">🎮 Ready to Play</h3>
              <p className="status-message">
                You have <strong>{remainingAttempts}</strong> attempt{remainingAttempts !== 1 ? 's' : ''} remaining
              </p>

              {challenge.hints.length > 0 && (
                <div className="hints-section">
                  <button onClick={toggleHints} className={`hints-toggle ${showHints ? 'expanded' : ''}`}>
                    💡 Hints Available ({challenge.hints.length})
                    <span className="toggle-icon">{showHints ? '▼' : '▶'}</span>
                  </button>

                  {showHints && (
                    <div className="hints-list">
                      {challenge.hints.map((hint, index) => (
                        <div key={hint.order} className={`hint-item ${usedHints.includes(index) ? 'revealed' : ''}`}>
                          <div className="hint-header">
                            <span className="hint-number">Hint {hint.order}</span>
                            <span className="hint-cost">-{hint.cost} points</span>
                          </div>
                          {usedHints.includes(index) ? (
                            <p className="hint-text">{hint.text}</p>
                          ) : (
                            <button onClick={() => handleUseHint(index)} className="reveal-hint-button">
                              Reveal Hint (-{hint.cost} points)
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="action-buttons">
                <button onClick={startChallenge} className="start-challenge-button" disabled={remainingAttempts <= 0}>
                  <span className="button-icon">🚀</span>
                  Start Challenge
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
