import React from 'react';
import { Link } from 'react-router-dom';
import { useDebugMode } from '../../hooks/useDebugMode';
import { StartDebugGameButton } from '../StartDebugGameButton/StartDebugGameButton';
import './main-menu.scss';

export const MainMenu = () => {
  const { isDebugEnabled, isDummyGameEnabled } = useDebugMode();

  return (
    <div id="main-menu">
      <div className="menu-wrapper card">
        <h1 className="title">Othello</h1>
        <Link className="link" to="/host">
          Host Game
        </Link>
        <Link className="link" to="/join">
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
