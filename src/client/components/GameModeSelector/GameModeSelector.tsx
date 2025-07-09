import { useState, useEffect } from 'react';
import { GameMode, GameModeCategory } from '../../../shared/types/gameModeTypes';
import { useGameModes } from '../../contexts/GameModeContext';
import './game-mode-selector.scss';

interface GameModeSelectorProps {
  onModeSelect: (mode: GameMode) => void;
  selectedModeId?: string;
  showDescription?: boolean;
  compact?: boolean;
}

export const GameModeSelector = ({
  onModeSelect,
  selectedModeId,
  showDescription = true,
  compact = false,
}: GameModeSelectorProps) => {
  const { gameModes, loading, error } = useGameModes();
  const [selectedCategory, setSelectedCategory] = useState<GameModeCategory | 'all'>('all');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  // Set initial selected mode
  useEffect(() => {
    if (selectedModeId && gameModes.length > 0) {
      const mode = gameModes.find((m) => m.id === selectedModeId);
      if (mode) {
        setSelectedMode(mode);
      }
    } else if (gameModes.length > 0 && !selectedMode) {
      const defaultMode = gameModes.find((m) => m.isDefault);
      if (defaultMode) {
        setSelectedMode(defaultMode);
        onModeSelect(defaultMode);
      }
    }
  }, [selectedModeId, gameModes, selectedMode, onModeSelect]);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    onModeSelect(mode);
  };

  const filteredModes =
    selectedCategory === 'all' ? gameModes : gameModes.filter((mode) => mode.category === selectedCategory);

  const categories: Array<{ id: GameModeCategory | 'all'; name: string; icon: string }> = [
    { id: 'all', name: 'All Modes', icon: '🎮' },
    { id: 'timer', name: 'Timer Games', icon: '⏰' },
    { id: 'board-variant', name: 'Board Variants', icon: '🎲' },
    { id: 'special', name: 'Special Rules', icon: '⭐' },
    { id: 'daily-challenge', name: 'Daily Challenge', icon: '🏆' },
  ];

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
      return `${timer.initialTime}s`;
    } else {
      return `${timer.initialTime}s + ${timer.increment}s`;
    }
  };

  if (loading) {
    return (
      <div className="game-mode-selector loading">
        <div className="loading-spinner">Loading game modes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-mode-selector error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>Error loading game modes: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`game-mode-selector ${compact ? 'compact' : ''}`}>
      {/* Category Filter */}
      <div className="category-filter">
        <h3>Game Mode Categories</h3>
        <div className="category-buttons">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Game Mode Grid */}
      <div className="game-modes-grid">
        {filteredModes.map((mode) => (
          <div
            key={mode.id}
            className={`game-mode-card ${selectedMode?.id === mode.id ? 'selected' : ''}`}
            onClick={() => handleModeSelect(mode)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleModeSelect(mode);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="mode-header">
              <h4 className="mode-name">{mode.name}</h4>
              <div className="mode-badges">
                {mode.isDefault && <span className="badge default">Default</span>}
                <span
                  className="badge difficulty"
                  style={{ backgroundColor: getDifficultyColor(mode.difficultyLevel) }}
                >
                  {mode.difficultyLevel}
                </span>
              </div>
            </div>

            {showDescription && <p className="mode-description">{mode.description}</p>}

            <div className="mode-info">
              <div className="info-row">
                <span className="info-label">Duration:</span>
                <span className="info-value">
                  {mode.estimatedDuration ? getEstimatedDurationText(mode.estimatedDuration) : 'Variable'}
                </span>
              </div>

              {mode.config.timer && (
                <div className="info-row">
                  <span className="info-label">Timer:</span>
                  <span className="info-value">{getTimerDisplayText(mode.config.timer)}</span>
                </div>
              )}

              {mode.config.board && (
                <div className="info-row">
                  <span className="info-label">Board:</span>
                  <span className="info-value">
                    {mode.config.board.width}x{mode.config.board.height}
                  </span>
                </div>
              )}

              {mode.tags.length > 0 && (
                <div className="mode-tags">
                  {mode.tags.map((tag) => (
                    <span key={tag} className="tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredModes.length === 0 && (
        <div className="no-modes">
          <span className="no-modes-icon">🎮</span>
          <p>No game modes available in this category.</p>
        </div>
      )}
    </div>
  );
};
