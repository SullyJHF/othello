/**
 * Debug game service for creating dummy games and fake opponents
 */

import { getServerDebugConfigInstance, debugLog } from '../../shared/config/debugConfig';
import { DummyGameOptions } from '../../shared/types/debugTypes';
import GameManager from '../models/GameManager';
import UserManager, { ConnectedUser } from '../models/UserManager';
import { Game, Piece } from '../models/Game';

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
    name: name,
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
export function createDummyGame(
  realUser: ConnectedUser, 
  options: DummyGameOptions
): CreateDummyGameResponse {
  const debugConfig = getServerDebugConfigInstance();
  
  if (!debugConfig.enabled || !debugConfig.features.dummyGame) {
    return {
      success: false,
      error: 'Dummy game creation is not enabled',
    };
  }
  
  try {
    debugLog('Creating dummy game', { realUser: realUser.userId, options });
    
    // Create the game
    const game = GameManager.createGame();
    
    // Add the real user with their specified name
    const updatedRealUser = { ...realUser, name: options.playerNames.user };
    UserManager.updateUserName(realUser.userId, options.playerNames.user);
    game.addOrUpdatePlayer(updatedRealUser);
    
    // Create and add fake opponent
    const fakeOpponent = createFakeOpponent(game.id, options.playerNames.opponent);
    game.addOrUpdatePlayer(fakeOpponent);
    
    // Set pieces if specified
    if (options.userPiece !== 'random') {
      const userIds = Object.keys(game.players);
      const realUserId = realUser.userId;
      const fakeOpponentId = fakeOpponent.userId;
      
      game.players[realUserId].piece = options.userPiece;
      game.players[fakeOpponentId].piece = options.userPiece === 'B' ? 'W' : 'B';
      
      debugLog('Set specific pieces', { 
        realUser: options.userPiece, 
        opponent: game.players[fakeOpponentId].piece 
      });
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
    });
    
    return {
      success: true,
      gameId: game.id,
    };
    
  } catch (error) {
    debugLog('Error creating dummy game', { error: error.message, stack: error.stack });
    return {
      success: false,
      error: `Failed to create dummy game: ${error.message}`,
    };
  }
}

/**
 * Get all fake opponents in active games (for cleanup)
 */
export function getFakeOpponents(): ConnectedUser[] {
  const allUsers = UserManager.getUsers();
  return Object.values(allUsers).filter(user => 
    user.userId.startsWith('fake-opponent-') && user.connected
  );
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
export function getFakeOpponentBehavior(gameId: string): 'random' | 'smart' | 'passive' {
  // For now, return random - this can be enhanced in the future
  return 'random';
}