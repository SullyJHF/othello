import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDebugMode } from '../../hooks/useDebugMode';
import { DebugSeparator } from '../DebugSeparator/DebugSeparator';
import { StartDebugGameButton } from '../StartDebugGameButton/StartDebugGameButton';
import VersionInfo from '../VersionInfo/VersionInfo';
import { useGameView } from '../../contexts/GameViewContext';
import './main-menu.scss';

export const MainMenu = () => {
  const { isDebugEnabled, isDummyGameEnabled } = useDebugMode();
  const { setCurrentView } = useGameView();
  
  useEffect(() => {
    setCurrentView('menu');
  }, [setCurrentView]);

  return (
    <div id="main-menu" data-testid="main-menu">
      <VersionInfo className="main-menu__version" />
      <div className="menu-wrapper">
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
            <DebugSeparator />
            <StartDebugGameButton />
          </>
        )}
      </div>
    </div>
  );
};
