import React from 'react';
import { Link } from 'react-router-dom';
import { useDebugMode } from '../../hooks/useDebugMode';
import { DebugSeparator } from '../DebugSeparator/DebugSeparator';
import { StartDebugGameButton } from '../StartDebugGameButton/StartDebugGameButton';
import './game-action-buttons.scss';

interface GameActionButtonsProps {
  showBackToMenu?: boolean;
  showDebugOptions?: boolean;
  variant?: 'default' | 'modal' | 'empty-state';
  className?: string;
}

export const GameActionButtons = ({
  showBackToMenu = false,
  showDebugOptions = true,
  variant = 'default',
  className = '',
}: GameActionButtonsProps) => {
  const { isDebugEnabled, isDummyGameEnabled } = useDebugMode();

  return (
    <div className={`game-action-buttons ${variant} ${className}`}>
      {showBackToMenu && (
        <Link 
          className="game-action-button back-button" 
          to="/"
          data-testid="back-to-menu-button"
        >
          ← Back to Main Menu
        </Link>
      )}
      
      <Link 
        className="game-action-button primary" 
        to="/host"
        data-testid="host-game-button"
      >
        🎮 Host Game
      </Link>
      
      <Link 
        className="game-action-button primary" 
        to="/join"
        data-testid="join-game-button"
      >
        🤝 Join Game
      </Link>

      {showDebugOptions && isDebugEnabled && isDummyGameEnabled && (
        <div className="debug-section">
          <DebugSeparator />
          <StartDebugGameButton />
        </div>
      )}
    </div>
  );
};