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

type SelectionStep = 'category' | 'modes' | 'preview';

interface CategoryInfo {
  id: GameModeCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const GameModeSelector = ({
  onModeSelect,
  selectedModeId,
  showDescription = true,
  compact = false,
}: GameModeSelectorProps) => {
  const { gameModes, loading, error } = useGameModes();
  const [currentStep, setCurrentStep] = useState<SelectionStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<GameModeCategory | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  // Set initial selected mode (only for display purposes, not for multi-step selection)
  useEffect(() => {
    if (selectedModeId && gameModes.length > 0) {
      const mode = gameModes.find((m) => m.id === selectedModeId);
      if (mode) {
        // Only set the selected mode if we're not in the multi-step modal flow
        if (currentStep === 'category') {
          setSelectedMode(mode);
        }
      }
    }
  }, [selectedModeId, gameModes, currentStep]);

  const categories: CategoryInfo[] = [
    {
      id: 'timer',
      name: 'Timed Games',
      icon: '⏰',
      description: 'Games with time controls - from blitz to classical',
      color: '#FF6B6B',
    },
    {
      id: 'board-variant',
      name: 'Board Sizes',
      icon: '🎯',
      description: 'Different board dimensions for varied gameplay',
      color: '#4ECDC4',
    },
    {
      id: 'special',
      name: 'Special Rules',
      icon: '⭐',
      description: 'Unique game mechanics and rule variations',
      color: '#45B7D1',
    },
    {
      id: 'daily-challenge',
      name: 'Daily Challenge',
      icon: '🏆',
      description: "Today's featured challenge mode",
      color: '#F9CA24',
    },
  ];

  const handleCategorySelect = (category: GameModeCategory) => {
    setSelectedCategory(category);
    setBreadcrumb([categories.find((c) => c.id === category)?.name || category]);
    setCurrentStep('modes');
  };

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    setBreadcrumb([...breadcrumb, mode.name]);
    setCurrentStep('preview');
  };

  const handleFinalSelect = () => {
    if (selectedMode) {
      onModeSelect(selectedMode);
    }
  };

  const handleBack = () => {
    if (currentStep === 'preview') {
      setCurrentStep('modes');
      setBreadcrumb(breadcrumb.slice(0, -1));
      setSelectedMode(null);
    } else if (currentStep === 'modes') {
      setCurrentStep('category');
      setSelectedCategory(null);
      setBreadcrumb([]);
    }
  };

  const filteredModes = selectedCategory ? gameModes.filter((mode) => mode.category === selectedCategory) : [];

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
      {/* Navigation Header */}
      <div className="selector-header">
        {breadcrumb.length > 0 && (
          <div className="breadcrumb">
            <button className="back-btn" onClick={handleBack}>
              ← Back
            </button>
            <span className="breadcrumb-path">{breadcrumb.join(' > ')}</span>
          </div>
        )}
        <div className="step-indicator">
          <span className={`step ${currentStep === 'category' ? 'active' : ''}`}>1</span>
          <span className={`step ${currentStep === 'modes' ? 'active' : ''}`}>2</span>
          <span className={`step ${currentStep === 'preview' ? 'active' : ''}`}>3</span>
        </div>
      </div>

      {/* Step 1: Category Selection */}
      {currentStep === 'category' && (
        <div className="category-selection">
          <h3>Choose Game Type</h3>
          <p className="step-description">What type of game would you like to play?</p>

          <div className="category-grid">
            {categories.map((category) => (
              <div
                key={category.id}
                className="category-card"
                onClick={() => handleCategorySelect(category.id)}
                style={{ '--category-color': category.color } as React.CSSProperties}
              >
                <div className="category-icon">{category.icon}</div>
                <h4 className="category-name">{category.name}</h4>
                <p className="category-description">{category.description}</p>
                <div className="category-count">
                  {gameModes.filter((mode) => mode.category === category.id).length} options
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Mode Selection */}
      {currentStep === 'modes' && (
        <div className="mode-selection">
          <h3>Select Specific Mode</h3>
          <p className="step-description">Choose from available {selectedCategory} options:</p>

          <div className="modes-grid">
            {filteredModes.map((mode) => (
              <div key={mode.id} className="mode-card" onClick={() => handleModeSelect(mode)}>
                <div className="mode-header">
                  <h4 className="mode-name">{mode.name}</h4>
                  {mode.config.timer && <span className="timer-icon">{getTimerIcon(mode.config.timer)}</span>}
                </div>

                <div className="mode-quick-info">
                  {mode.config.timer && (
                    <span className="quick-info-item">{getTimerDisplayText(mode.config.timer)}</span>
                  )}
                  {mode.config.board && (
                    <span className="quick-info-item">
                      {mode.config.board.width}x{mode.config.board.height}
                    </span>
                  )}
                  <span
                    className="quick-info-item difficulty"
                    style={{ color: getDifficultyColor(mode.difficultyLevel) }}
                  >
                    {mode.difficultyLevel}
                  </span>
                </div>

                {showDescription && <p className="mode-description">{mode.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Preview & Confirm */}
      {currentStep === 'preview' && selectedMode && (
        <div className="mode-preview">
          <h3>Confirm Selection</h3>
          <p className="step-description">Review your game mode choice:</p>

          <div className="preview-card">
            <div className="preview-header">
              <h4 className="preview-name">{selectedMode.name}</h4>
              <div className="preview-badges">
                {selectedMode.isDefault && <span className="badge default">⭐ Default</span>}
                <span
                  className="badge difficulty"
                  style={{ backgroundColor: getDifficultyColor(selectedMode.difficultyLevel) }}
                >
                  {selectedMode.difficultyLevel}
                </span>
              </div>
            </div>

            <p className="preview-description">{selectedMode.description}</p>

            <div className="preview-details">
              <div className="detail-row">
                <span className="detail-label">
                  <span className="detail-icon">🕐</span>
                  Duration:
                </span>
                <span className="detail-value">
                  {selectedMode.estimatedDuration
                    ? getEstimatedDurationText(selectedMode.estimatedDuration)
                    : 'Variable'}
                </span>
              </div>

              {selectedMode.config.timer && (
                <div className="detail-row">
                  <span className="detail-label">
                    <span className="detail-icon">{getTimerIcon(selectedMode.config.timer)}</span>
                    Timer:
                  </span>
                  <span className="detail-value">{getTimerDisplayText(selectedMode.config.timer)}</span>
                </div>
              )}

              {selectedMode.config.board && (
                <div className="detail-row">
                  <span className="detail-label">
                    <span className="detail-icon">🎯</span>
                    Board:
                  </span>
                  <span className="detail-value">
                    {selectedMode.config.board.width}x{selectedMode.config.board.height}
                  </span>
                </div>
              )}

              {selectedMode.tags.length > 0 && (
                <div className="preview-tags">
                  {selectedMode.tags.map((tag) => (
                    <span key={tag} className="tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button className="confirm-btn" onClick={handleFinalSelect}>
              Select This Mode
            </button>
          </div>
        </div>
      )}

      {/* No modes found */}
      {currentStep === 'modes' && filteredModes.length === 0 && (
        <div className="no-modes">
          <span className="no-modes-icon">🎮</span>
          <p>No game modes available in this category.</p>
        </div>
      )}
    </div>
  );
};
