/**
 * Reusable Start Debug Game button component
 * Shows only when debug mode and dummy game features are enabled
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { DummyGameOptions } from '../../../shared/types/debugTypes';
import { useDebugMode } from '../../hooks/useDebugMode';
import { useSocket } from '../../utils/socketHooks';
import './start-debug-game-button.scss';

interface StartDebugGameButtonProps {
  className?: string;
  variant?: 'default' | 'modal';
}

export const StartDebugGameButton = ({ className = '', variant = 'default' }: StartDebugGameButtonProps) => {
  const { isDebugEnabled, isDummyGameEnabled, logDebug, addAction } = useDebugMode();
  const { socket, localUserId } = useSocket();
  const navigate = useNavigate();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  // Don't render if debug features are not enabled
  if (!isDebugEnabled || !isDummyGameEnabled) {
    return null;
  }

  const handleDebugGameClick = async () => {
    if (!socket || !localUserId) {
      logDebug('Socket or user ID not available');
      alert('Connection not ready. Please wait and try again.');
      return;
    }

    setIsCreatingGame(true);
    logDebug('Creating debug game', { userId: localUserId, variant });

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
            logDebug('Debug game created successfully', { gameId: response.gameId, variant });
            addAction({
              type: 'dummy-game',
              payload: { gameId: response.gameId, options },
              result: 'success',
            });

            // Navigate to the game
            navigate(`/game/${response.gameId}`);
          } else {
            logDebug('Failed to create debug game', { error: response.error, variant });
            addAction({
              type: 'dummy-game',
              payload: { options },
              result: 'error',
              error: response.error || 'Unknown error',
            });

            alert(`Failed to create debug game: ${response.error}`);
          }
        },
      );
    } catch (error) {
      setIsCreatingGame(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logDebug('Error creating debug game', { error: errorMessage, variant });
      alert(`Error: ${errorMessage}`);
    }
  };

  return (
    <button
      className={`debug-button ${className}`}
      onClick={handleDebugGameClick}
      disabled={isCreatingGame}
      data-testid="debug-game-button"
    >
      {isCreatingGame ? '⏳ Creating...' : '🛠️ Start Debug Game'}
    </button>
  );
};
