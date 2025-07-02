import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDebugMode } from '../../hooks/useDebugMode';
import { useSocket } from '../../utils/socketHooks';
import { SocketEvents } from '../../../shared/SocketEvents';
import { DummyGameOptions } from '../../../shared/types/debugTypes';
import './main-menu.scss';

export const MainMenu = () => {
  const { isDebugEnabled, isDummyGameEnabled, logDebug, addAction } = useDebugMode();
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const handleDebugGameClick = async () => {
    if (!socket || !localUserId) {
      logDebug('Socket or user ID not available');
      alert('Connection not ready. Please wait and try again.');
      return;
    }

    setIsCreatingGame(true);
    logDebug('Creating debug game', { userId: localUserId });

    const options: Partial<DummyGameOptions> = {
      playerNames: {
        user: 'You',
        opponent: 'Debug AI',
      },
      userPiece: 'random',
      opponentBehavior: 'random',
      startImmediately: true,
    };

    try {
      socket.emit(
        SocketEvents.CreateDummyGame,
        localUserId,
        options,
        (response: { success: boolean; gameId?: string; error?: string }) => {
          setIsCreatingGame(false);
          
          if (response.success) {
            logDebug('Debug game created successfully', { gameId: response.gameId });
            addAction({
              type: 'dummy-game',
              payload: { gameId: response.gameId, options },
              result: 'success',
            });
            
            // Navigate to the game
            navigate(`/game/${response.gameId}`);
          } else {
            logDebug('Failed to create debug game', { error: response.error });
            addAction({
              type: 'dummy-game',
              payload: { options },
              result: 'error',
              error: response.error,
            });
            
            alert(`Failed to create debug game: ${response.error}`);
          }
        }
      );
    } catch (error) {
      setIsCreatingGame(false);
      logDebug('Error creating debug game', { error: error.message });
      alert(`Error: ${error.message}`);
    }
  };

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
            <button 
              className="link debug-button" 
              onClick={handleDebugGameClick}
              disabled={isCreatingGame}
              data-testid="debug-game-button"
            >
              {isCreatingGame ? '⏳ Creating...' : '🛠️ Start Debug Game'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
