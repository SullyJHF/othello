import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGameView } from '../../contexts/GameViewContext';
import { GameActionButtons } from '../GameActionButtons/GameActionButtons';
import './main-menu.scss';

export const MainMenu = () => {
  const { setCurrentView } = useGameView();

  useEffect(() => {
    setCurrentView('menu');
  }, [setCurrentView]);

  return (
    <div id="main-menu" data-testid="main-menu" className="menu-container">
      <div className="menu-header">
        <h1 className="menu-title" data-testid="game-title">
          Othello
        </h1>
        <p className="menu-subtitle">Classic strategy game for two players</p>
      </div>

      <div className="menu-actions">
        <GameActionButtons />
        <Link className="menu-button secondary" to="/my-games" data-testid="my-games-button">
          📋 My Active Games
        </Link>
        <Link className="menu-button secondary" to="/settings" data-testid="settings-button">
          ⚙️ Settings
        </Link>
      </div>
    </div>
  );
};
