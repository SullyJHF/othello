/**
 * Debug-specific socket handlers for development and testing utilities
 */

import { Server, Socket } from 'socket.io';
import { getServerDebugConfigInstance, debugLog } from '../../shared/config/debugConfig';
import { SocketEvents } from '../../shared/SocketEvents';
import { DummyGameOptions } from '../../shared/types/debugTypes';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';
import { createDummyGame, CreateDummyGameResponse } from '../services/debugGameService';
import { emit } from '../sockets/sockets';

export const registerDebugHandlers = (io: Server, socket: Socket): void => {
  const debugConfig = getServerDebugConfigInstance();

  // Only register debug handlers if debug mode is enabled
  if (!debugConfig.enabled) {
    return;
  }

  debugLog('Registering debug handlers for socket', { socketId: socket.id });

  /**
   * Handle dummy game creation
   */
  const onCreateDummyGame = (
    userId: string,
    options: Partial<DummyGameOptions>,
    callback: (response: CreateDummyGameResponse) => void,
  ) => {
    debugLog('CreateDummyGame event received', { userId, options });

    if (!debugConfig.features.dummyGame) {
      callback({
        success: false,
        error: 'Dummy game feature is not enabled',
      });
      return;
    }

    const user = UserManager.getUserById(userId);
    if (!user) {
      callback({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Set default options
    const defaultOptions: DummyGameOptions = {
      playerNames: {
        user: user.name || 'Player',
        opponent: 'AI Opponent',
      },
      userPiece: 'random',
      opponentBehavior: 'random',
      startImmediately: true,
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const result = createDummyGame(user, finalOptions);

      if (result.success && result.gameId) {
        // Emit game update to notify all clients in the game
        const game = GameManager.getGame(result.gameId);
        emit(SocketEvents.GameUpdated(result.gameId), game);

        debugLog('Dummy game created and broadcasted', {
          gameId: result.gameId,
          userId: user.userId,
        });
      }

      callback(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLog('Error in onCreateDummyGame', { error: errorMessage });
      callback({
        success: false,
        error: `Unexpected error: ${errorMessage}`,
      });
    }
  };

  // Register the event handler
  socket.on(SocketEvents.CreateDummyGame, onCreateDummyGame);

  debugLog('Debug handlers registered successfully', {
    socketId: socket.id,
    enabledFeatures: debugConfig.features,
  });
};
