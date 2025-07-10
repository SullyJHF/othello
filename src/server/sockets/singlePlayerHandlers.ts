/**
 * Socket handlers for single player games
 */

import { Server, Socket } from 'socket.io';
import { debugLog } from '../../shared/config/debugConfig';
import { SocketEvents } from '../../shared/SocketEvents';
import UserManager from '../models/UserManager';
import {
  createSinglePlayerGame,
  createPracticeGame,
  getAvailableAIDifficulties,
  getAvailableAIPersonalities,
  SinglePlayerGameOptions,
} from '../services/SinglePlayerService';

export const registerSinglePlayerHandlers = (io: Server, socket: Socket): void => {
  /**
   * Create a new single player game against AI
   */
  const onCreateSinglePlayerGame = (
    userId: string,
    userName: string,
    options: SinglePlayerGameOptions,
    callback: (response: { success: boolean; gameId?: string; error?: string; aiOpponentName?: string }) => void,
  ) => {
    try {
      debugLog('Creating single player game', { userId, userName, options });

      // Update user name and get user object
      UserManager.updateUserName(userId, userName);
      const user = UserManager.getUserById(userId);

      if (!user) {
        callback({ success: false, error: 'User not found' });
        return;
      }

      // Create the single player game
      const result = createSinglePlayerGame(user, options);

      if (result.success) {
        debugLog('Single player game created successfully', {
          gameId: result.gameId,
          aiOpponent: result.aiOpponentName,
          difficulty: result.difficulty,
        });

        callback({
          success: true,
          gameId: result.gameId,
          aiOpponentName: result.aiOpponentName,
        });
      } else {
        debugLog('Failed to create single player game', { error: result.error });
        callback({ success: false, error: result.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLog('Error in onCreateSinglePlayerGame', { error: errorMessage });
      callback({ success: false, error: `Failed to create single player game: ${errorMessage}` });
    }
  };

  /**
   * Create a practice game (no rating impact)
   */
  const onCreatePracticeGame = (
    userId: string,
    userName: string,
    options: Omit<SinglePlayerGameOptions, 'isChallenge' | 'challengeId'>,
    callback: (response: { success: boolean; gameId?: string; error?: string; aiOpponentName?: string }) => void,
  ) => {
    try {
      debugLog('Creating practice game', { userId, userName, options });

      UserManager.updateUserName(userId, userName);
      const user = UserManager.getUserById(userId);

      if (!user) {
        callback({ success: false, error: 'User not found' });
        return;
      }

      const result = createPracticeGame(user, options);

      if (result.success) {
        debugLog('Practice game created successfully', {
          gameId: result.gameId,
          aiOpponent: result.aiOpponentName,
        });

        callback({
          success: true,
          gameId: result.gameId,
          aiOpponentName: result.aiOpponentName,
        });
      } else {
        callback({ success: false, error: result.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLog('Error in onCreatePracticeGame', { error: errorMessage });
      callback({ success: false, error: `Failed to create practice game: ${errorMessage}` });
    }
  };

  /**
   * Get available AI difficulties and personalities for the UI
   */
  const onGetAIOptions = (
    callback: (response: {
      difficulties: ReturnType<typeof getAvailableAIDifficulties>;
      personalities: ReturnType<typeof getAvailableAIPersonalities>;
    }) => void,
  ) => {
    try {
      const difficulties = getAvailableAIDifficulties();
      const personalities = getAvailableAIPersonalities();

      callback({ difficulties, personalities });
    } catch (error) {
      debugLog('Error getting AI options', { error });
      callback({ difficulties: [], personalities: [] });
    }
  };

  // Register socket event handlers
  socket.on(SocketEvents.CreateSinglePlayerGame, onCreateSinglePlayerGame);
  socket.on(SocketEvents.CreatePracticeGame, onCreatePracticeGame);
  socket.on(SocketEvents.GetAIOptions, onGetAIOptions);

  debugLog('Single player socket handlers registered', { socketId: socket.id });
};
