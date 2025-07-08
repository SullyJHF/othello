import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGameView } from '../../contexts/GameViewContext';
import { useDebugMode } from '../../hooks/useDebugMode';
import { DebugSeparator } from '../DebugSeparator/DebugSeparator';
import { StartDebugGameButton } from '../StartDebugGameButton/StartDebugGameButton';
import './main-menu.scss';

export const MainMenu = () => {
  const { isDebugEnabled, isDummyGameEnabled } = useDebugMode();
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
        <Link className="menu-button primary" to="/host" data-testid="host-game-button">
          🎮 Host Game
        </Link>
        <Link className="menu-button primary" to="/join" data-testid="join-game-button">
          🤝 Join Game
        </Link>
        <Link className="menu-button secondary" to="/my-games" data-testid="my-games-button">
          📋 My Active Games
        </Link>

        {isDebugEnabled && isDummyGameEnabled && (
          <div className="debug-section">
            <DebugSeparator />
            <StartDebugGameButton />
          </div>
        )}
      </div>
    </div>
  );
};
