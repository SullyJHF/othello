import React from 'react';
import { Link } from 'react-router-dom';
import { useDebugMode } from '../../hooks/useDebugMode';
import { StartDebugGameButton } from '../StartDebugGameButton/StartDebugGameButton';
import VersionInfo from '../VersionInfo/VersionInfo';
import './main-menu.scss';

export const MainMenu = () => {
  const { isDebugEnabled, isDummyGameEnabled } = useDebugMode();

  return (
    <div id="main-menu" data-testid="main-menu">
      <VersionInfo className="main-menu__version" />
      <div className="menu-wrapper card">
        <h1 className="title" data-testid="game-title">
          Othello
        </h1>
        <Link className="link" to="/host" data-testid="host-game-button">
          Host Game
        </Link>
        <Link className="link" to="/join" data-testid="join-game-button">
          Join Game
        </Link>
        {isDebugEnabled && isDummyGameEnabled && (
          <>
            <div className="debug-separator">
              <span className="debug-label">Debug Mode</span>
            </div>
            <StartDebugGameButton variant="default" />
          </>
        )}
      </div>
    </div>
  );
};
