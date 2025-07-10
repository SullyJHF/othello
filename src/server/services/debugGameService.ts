/**
 * Debug game service for creating dummy games and fake opponents
 */

import { getServerDebugConfigInstance, debugLog } from '../../shared/config/debugConfig';
import { DummyGameOptions } from '../../shared/types/debugTypes';
import { Game, Piece } from '../models/Game';
import GameManager from '../models/GameManager';
import UserManager, { ConnectedUser } from '../models/UserManager';

export interface CreateDummyGameResponse {
  success: boolean;
  gameId?: string;
  error?: string;
}

/**
 * Create a fake opponent user for dummy games
 */
function createFakeOpponent(gameId: string, name: string): ConnectedUser {
  const fakeUserId = `fake-opponent-${gameId}`;
  const fakeSocketId = `fake-socket-${gameId}`;

  const fakeUser: ConnectedUser = {
    userId: fakeUserId,
    socketId: fakeSocketId,
    connected: true,
    name,
  };

  // Add to UserManager but mark as fake
  UserManager.users[fakeUserId] = fakeUser;
  UserManager.usersGames[fakeUserId] = [gameId];

  debugLog('Created fake opponent', { fakeUserId, name, gameId });

  return fakeUser;
}

/**
 * Create a dummy game with a fake opponent for development/testing
 */
export function createDummyGame(realUser: ConnectedUser, options: DummyGameOptions): CreateDummyGameResponse {
  const debugConfig = getServerDebugConfigInstance();

  if (!debugConfig.enabled || !debugConfig.features.dummyGame) {
    return {
      success: false,
      error: 'Dummy game creation is not enabled',
    };
  }

  try {
    debugLog('Creating dummy game', {
      realUser: realUser.userId,
      options,
      gameMode: options.gameMode?.name || 'default',
    });

    // Create the game with game mode if specified
    const gameModeId = options.gameMode?.id;
    const timerConfig = options.gameMode?.config?.timer;
    const game = GameManager.createGame(gameModeId, timerConfig);

    // Add the real user with their specified name
    const updatedRealUser = { ...realUser, name: options.playerNames.user };
    UserManager.updateUserName(realUser.userId, options.playerNames.user);
    const realUserResult = game.addOrUpdatePlayer(updatedRealUser);
    if (!realUserResult.success) {
      return {
        success: false,
        error: `Failed to add real user to dummy game: ${realUserResult.error}`,
      };
    }

    // Create and add fake opponent
    const fakeOpponent = createFakeOpponent(game.id, options.playerNames.opponent);
    const fakeOpponentResult = game.addOrUpdatePlayer(fakeOpponent);
    if (!fakeOpponentResult.success) {
      return {
        success: false,
        error: `Failed to add fake opponent to dummy game: ${fakeOpponentResult.error}`,
      };
    }

    // Set pieces if specified
    if (options.userPiece !== 'random') {
      const userIds = Object.keys(game.players);
      const realUserId = realUser.userId;
      const fakeOpponentId = fakeOpponent.userId;

      const realPlayer = game.players[realUserId];
      const fakePlayer = game.players[fakeOpponentId];

      if (realPlayer && fakePlayer) {
        realPlayer.piece = options.userPiece;
        fakePlayer.piece = options.userPiece === 'B' ? 'W' : 'B';

        debugLog('Set specific pieces', {
          realUser: options.userPiece,
          opponent: fakePlayer.piece,
        });
      }
    }

    // Start game immediately if requested
    if (options.startImmediately) {
      game.startGame();
      debugLog('Started dummy game immediately', { gameId: game.id });
    }

    // Add both users to game tracking
    UserManager.addUserToGame(updatedRealUser, game);
    UserManager.addUserToGame(fakeOpponent, game);

    debugLog('Dummy game created successfully', {
      gameId: game.id,
      players: Object.keys(game.players),
      gameStarted: game.gameStarted,
      gameMode: options.gameMode?.name || 'default',
      gameModeId: options.gameMode?.id || null,
    });

    return {
      success: true,
      gameId: game.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    debugLog('Error creating dummy game', { error: errorMessage, stack: errorStack });
    return {
      success: false,
      error: `Failed to create dummy game: ${errorMessage}`,
    };
  }
}

/**
 * Get all fake opponents in active games (for cleanup)
 */
export function getFakeOpponents(): ConnectedUser[] {
  const allUsers = UserManager.getUsers();
  return Object.values(allUsers).filter((user) => user.userId.startsWith('fake-opponent-') && user.connected);
}

/**
 * Clean up a fake opponent from the system
 */
export function cleanupFakeOpponent(gameId: string): void {
  const fakeUserId = `fake-opponent-${gameId}`;
  const fakeUser = UserManager.getUserById(fakeUserId);

  if (fakeUser) {
    // Mark as disconnected
    fakeUser.connected = false;

    // Remove from games tracking
    delete UserManager.usersGames[fakeUserId];

    debugLog('Cleaned up fake opponent', { fakeUserId, gameId });
  }
}

/**
 * Check if a user is a fake opponent
 */
export function isFakeOpponent(userId: string): boolean {
  return userId.startsWith('fake-opponent-');
}

/**
 * Get fake opponent behavior configuration
 */
export function getFakeOpponentBehavior(
  gameId: string,
  options?: DummyGameOptions,
): 'random' | 'smart' | 'passive' | 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  // Return the specified behavior or default to random
  return options?.opponentBehavior || 'random';
}
