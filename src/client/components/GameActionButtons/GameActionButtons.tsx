import { Link } from 'react-router-dom';
import './game-action-buttons.scss';

interface GameActionButtonsProps {
  showBackToMenu?: boolean;
  variant?: 'default' | 'modal' | 'empty-state';
  className?: string;
}

export const GameActionButtons = ({
  showBackToMenu = false,
  variant = 'default',
  className = '',
}: GameActionButtonsProps) => {
  return (
    <div className={`game-action-buttons ${variant} ${className}`}>
      {showBackToMenu && (
        <Link className="game-action-button back-button" to="/" data-testid="back-to-menu-button">
          ← Back to Main Menu
        </Link>
      )}

      <Link className="game-action-button primary" to="/host" data-testid="host-game-button">
        🎮 Host Game
      </Link>

      <Link className="game-action-button primary" to="/join" data-testid="join-game-button">
        🤝 Join Game
      </Link>
    </div>
  );
};
