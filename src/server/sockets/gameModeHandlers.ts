import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';
import { GameModeEngine } from '../services/GameModeEngine';
import { GameModeRegistry } from '../services/GameModeRegistry';
import { emit } from './sockets';

const registry = GameModeRegistry.getInstance();
const gameManager = GameManager;
const userManager = UserManager;

export const registerGameModeHandlers = (io: Server, socket: Socket): void => {
  /**
   * Handle getting available game modes
   */
  const onGetGameModes = async (query: any, callback: (response: any) => void) => {
    try {
      const gameModes = await registry.getGameModes(query);
      callback({
        success: true,
        data: gameModes,
        total: gameModes.length,
      });
    } catch (error) {
      console.error('Error fetching game modes:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch game modes',
      });
    }
  };

  /**
   * Handle hosting a new game with a specific mode
   */
  const onHostNewGameWithMode = async (
    userId: string,
    userName: string,
    gameModeId: string,
    callback: (response: any) => void,
  ) => {
    try {
      // Get the game mode
      const gameMode = await registry.getGameModeById(gameModeId);
      if (!gameMode) {
        callback({ success: false, error: 'Invalid game mode' });
        return;
      }

      // Update user information
      userManager.updateUserName(userId, userName);
      const user = userManager.getUserById(userId);
      if (!user) {
        callback({ success: false, error: 'User not found' });
        return;
      }

      // Create the game with timer config from the game mode
      const game = gameManager.createGame(gameMode.id, gameMode.config.timer);
      const result = game.addOrUpdatePlayer(user);

      if (result.success) {
        // Set the game mode on the game
        game.gameMode = gameMode;

        // Initialize game mode engine for this game
        const engine = new GameModeEngine({
          gameId: game.id,
          gameMode,
          playerIds: [userId],
        });

        // Store the engine reference on the game for later use
        (game as any).gameModeEngine = engine;

        userManager.addUserToGame(user, game);

        callback({
          success: true,
          gameId: game.id,
          gameMode,
        });

        // Emit game modes update to all clients
        const gameModes = await registry.getGameModes();
        io.emit(SocketEvents.GameModesUpdated, gameModes);
      } else {
        callback({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error hosting game with mode:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to host game with mode',
      });
    }
  };

  /**
   * Handle joining a game with mode support
   */
  const onJoinGameWithMode = async (
    userId: string,
    userName: string,
    gameId: string,
    callback: (response: any) => void,
  ) => {
    try {
      const game = gameManager.getGame(gameId);
      if (!game) {
        callback({ success: false, error: `Game with ID ${gameId} not found.` });
        return;
      }

      userManager.updateUserName(userId, userName);
      const user = userManager.getUserById(userId);
      if (!user) {
        callback({ success: false, error: 'User not found' });
        return;
      }

      const result = game.addOrUpdatePlayer(user);
      if (!result.success) {
        callback({ success: false, error: result.error || 'Failed to join game' });
        return;
      }

      userManager.addUserToGame(user, game);

      // Update game mode engine with new player
      const engine = game.gameModeEngine;
      if (engine) {
        engine.playerIds.push(userId);
      }

      callback({
        success: true,
        gameId: game.id,
        gameMode: game.gameMode,
      });

      // Emit game update to all players in the game
      emit(SocketEvents.GameUpdated(gameId), game);
    } catch (error) {
      console.error('Error joining game with mode:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join game with mode',
      });
    }
  };

  /**
   * Handle challenge attempt submission
   */
  const onSubmitChallengeAttempt = async (
    gameId: string,
    userId: string,
    move: any,
    callback: (response: any) => void,
  ) => {
    try {
      const game = gameManager.getGame(gameId);
      if (!game) {
        callback({ success: false, error: 'Game not found' });
        return;
      }

      const engine = game.gameModeEngine;
      if (!engine) {
        callback({ success: false, error: 'Game mode engine not found' });
        return;
      }

      // Attempt the challenge
      const result = engine.attemptChallenge(move);

      callback({
        success: true,
        data: result,
      });

      // Emit challenge update to all players
      emit(SocketEvents.ChallengeUpdated, {
        gameId,
        challengeState: engine.getChallengeState(),
        result,
      });
    } catch (error) {
      console.error('Error submitting challenge attempt:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit challenge attempt',
      });
    }
  };

  /**
   * Handle creating a new game mode (admin only)
   */
  const onCreateGameMode = async (gameModeData: any, callback: (response: any) => void) => {
    try {
      // TODO: Add admin authentication
      const gameMode = await registry.createGameMode(gameModeData);

      callback({
        success: true,
        data: gameMode,
      });

      // Emit game modes update to all clients
      const gameModes = await registry.getGameModes();
      io.emit(SocketEvents.GameModesUpdated, gameModes);
    } catch (error) {
      console.error('Error creating game mode:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create game mode',
      });
    }
  };

  /**
   * Handle updating a game mode (admin only)
   */
  const onUpdateGameMode = async (gameModeId: string, updates: any, callback: (response: any) => void) => {
    try {
      // TODO: Add admin authentication
      const gameMode = await registry.updateGameMode(gameModeId, updates);

      callback({
        success: true,
        data: gameMode,
      });

      // Emit game modes update to all clients
      const gameModes = await registry.getGameModes();
      io.emit(SocketEvents.GameModesUpdated, gameModes);
    } catch (error) {
      console.error('Error updating game mode:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update game mode',
      });
    }
  };

  /**
   * Handle deleting a game mode (admin only)
   */
  const onDeleteGameMode = async (gameModeId: string, callback: (response: any) => void) => {
    try {
      // TODO: Add admin authentication
      const result = await registry.deleteGameMode(gameModeId);

      callback({
        success: true,
        message: result ? 'Game mode deleted successfully' : 'Game mode not found',
      });

      // Emit game modes update to all clients
      const gameModes = await registry.getGameModes();
      io.emit(SocketEvents.GameModesUpdated, gameModes);
    } catch (error) {
      console.error('Error deleting game mode:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete game mode',
      });
    }
  };

  /**
   * Handle getting game mode statistics (admin only)
   */
  const onGetGameModeStats = async (callback: (response: any) => void) => {
    try {
      // TODO: Add admin authentication
      // For now, return basic stats about game modes
      const allModes = await registry.getGameModes();
      const activeModes = await registry.getActiveGameModes();

      const stats = {
        totalGameModes: allModes.length,
        activeGameModes: activeModes.length,
        categoryCounts: allModes.reduce(
          (acc, mode) => {
            acc[mode.category] = (acc[mode.category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        difficultyDistribution: allModes.reduce(
          (acc, mode) => {
            acc[mode.difficultyLevel] = (acc[mode.difficultyLevel] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };

      callback({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting game mode stats:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get game mode stats',
      });
    }
  };

  // Register all the handlers
  socket.on(SocketEvents.GetGameModes, onGetGameModes);
  socket.on(SocketEvents.HostNewGameWithMode, onHostNewGameWithMode);
  socket.on(SocketEvents.JoinGameWithMode, onJoinGameWithMode);
  // GetDailyChallenge handler moved to challengeHandlers.ts
  socket.on(SocketEvents.SubmitChallengeAttempt, onSubmitChallengeAttempt);
  socket.on(SocketEvents.CreateGameMode, onCreateGameMode);
  socket.on(SocketEvents.UpdateGameMode, onUpdateGameMode);
  socket.on(SocketEvents.DeleteGameMode, onDeleteGameMode);
  socket.on(SocketEvents.GetGameModeStats, onGetGameModeStats);
};
