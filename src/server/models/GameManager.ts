import { TimerConfig } from '../../shared/types/gameModeTypes';
import { GamePersistence } from '../services/GamePersistence';
import { Game } from './Game';
import { ConnectedUser } from './UserManager';

class GameManager {
  static instance: GameManager;
  games: {
    [id: string]: Game;
  };
  private persistence: GamePersistence;
  private autoSaveEnabled: boolean = true;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.games = {};
    this.persistence = GamePersistence.getInstance();
    this.startAutoSave();
  }

  static getInstance() {
    if (!this.instance) this.instance = new GameManager();
    return this.instance;
  }

  createGame(gameModeId?: string, timerConfig?: TimerConfig) {
    console.log('Creating game.');
    const game = new Game(gameModeId, timerConfig);
    this.games[game.id] = game;
    console.log(`Game ${game.id} created.`);

    // Auto-save new game if persistence is enabled
    if (this.autoSaveEnabled) {
      this.saveGame(game.id).catch((error) => {
        console.error(`Failed to auto-save new game ${game.id}:`, error);
      });
    }

    return game;
  }

  getGame(id: string) {
    return this.games[id];
  }

  getGameIdsUserIsIn(user: ConnectedUser) {
    return Object.keys(this.games).filter((gameId) => {
      const game = this.games[gameId];
      return game?.hasPlayer(user);
    });
  }

  // Persistence methods
  async saveGame(gameId: string): Promise<void> {
    const game = this.games[gameId];
    if (game) {
      await this.persistence.saveGame(game);
      console.log(`Game ${gameId} saved to database.`);
    }
  }

  async loadGame(gameId: string): Promise<Game | null> {
    try {
      const game = await this.persistence.loadGame(gameId);
      if (game) {
        this.games[game.id] = game;
        console.log(`Game ${gameId} loaded from database.`);
        return game;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load game ${gameId}:`, error);
      return null;
    }
  }

  async loadActiveGames(): Promise<Game[]> {
    try {
      const games = await this.persistence.loadActiveGames();
      console.log(`Loading ${games.length} active games from database.`);

      // Add loaded games to memory and recover timers
      for (const game of games) {
        this.games[game.id] = game;

        // Recover timer state if the game has timers enabled
        if (game.timerState && game.isTimerEnabled()) {
          this.recoverGameTimers(game);
        }
      }

      console.log(`Successfully recovered ${games.length} active games with timer states.`);
      return games;
    } catch (error) {
      console.error('Failed to load active games:', error);
      return [];
    }
  }

  async deleteGame(gameId: string): Promise<boolean> {
    try {
      const success = await this.persistence.deleteGame(gameId);
      if (success && this.games[gameId]) {
        delete this.games[gameId];
        console.log(`Game ${gameId} deleted from memory and database.`);
      }
      return success;
    } catch (error) {
      console.error(`Failed to delete game ${gameId}:`, error);
      return false;
    }
  }

  async markGameFinished(gameId: string, winner?: 'W' | 'B', finishReason?: string): Promise<void> {
    const game = this.games[gameId];
    if (game) {
      game.gameFinished = true;
      await this.persistence.markGameFinished(gameId, winner, finishReason);
      await this.saveGame(gameId);
      console.log(`Game ${gameId} marked as finished.`);
    }
  }

  // Auto-save functionality
  private startAutoSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    // Auto-save all active games every 30 seconds
    this.saveInterval = setInterval(() => {
      this.autoSaveActiveGames();
    }, 30000);
  }

  private async autoSaveActiveGames(): Promise<void> {
    if (!this.autoSaveEnabled) return;

    const activeGames = Object.values(this.games).filter((game) => game.gameStarted && !game.gameFinished);

    for (const game of activeGames) {
      try {
        await this.persistence.saveGame(game);
      } catch (error) {
        console.error(`Auto-save failed for game ${game.id}:`, error);
      }
    }

    if (activeGames.length > 0) {
      console.log(`Auto-saved ${activeGames.length} active games.`);
    }
  }

  /**
   * Recover timer states for a loaded game
   * This ensures timers continue counting from where they left off
   */
  private recoverGameTimers(game: Game): void {
    if (!game.timerState || !game.gameStarted) return;

    console.log(`Recovering timer state for game ${game.id}`);

    try {
      const now = new Date();
      const serverDowntime = now.getTime() - game.lastActivityAt.getTime();

      // Update player timer states to account for server downtime
      Object.keys(game.timerState.playerTimers).forEach((userId) => {
        const playerTimer = game.timerState!.playerTimers[userId];

        // If the player's timer was active when server went down
        if (playerTimer.isActive && !playerTimer.isPaused) {
          // Subtract the elapsed time from remaining time
          const elapsedTime = serverDowntime / 1000; // Convert to seconds
          playerTimer.remainingTime = Math.max(0, playerTimer.remainingTime - elapsedTime);
          playerTimer.totalMoveTime += elapsedTime;
          playerTimer.lastUpdateTime = now;

          console.log(`Updated timer for player ${userId}: ${playerTimer.remainingTime}s remaining`);

          // Check if player timed out during server downtime
          if (playerTimer.remainingTime <= 0) {
            console.log(`Player ${userId} timed out during server downtime`);
            game.handlePlayerTimeout(userId);
          }
        }

        // Update pause time if player was paused
        if (playerTimer.isPaused && playerTimer.pausedAt) {
          const pausedDuration = serverDowntime / 1000;
          playerTimer.totalPausedTime += pausedDuration;

          // Check if pause time exceeded maximum
          if (playerTimer.totalPausedTime > game.timerState!.config.maxPauseTime) {
            console.log(`Player ${userId} exceeded max pause time during server downtime`);
            game.handlePlayerTimeout(userId);
          }
        }
      });

      // Update game timer state
      game.timerState.totalGameTime += serverDowntime / 1000;

      // If the game was active and not finished, resume the current player's timer
      if (!game.gameFinished && game.currentPlayer) {
        const currentPlayerUserId = Object.keys(game.players).find(
          (userId) => game.players[userId].piece === game.currentPlayer,
        );

        if (currentPlayerUserId && game.timerState.playerTimers[currentPlayerUserId]) {
          const currentPlayerTimer = game.timerState.playerTimers[currentPlayerUserId];
          if (!currentPlayerTimer.isPaused) {
            currentPlayerTimer.isActive = true;
            currentPlayerTimer.lastUpdateTime = now;
            console.log(`Resumed timer for current player ${currentPlayerUserId}`);
          }
        }
      }

      console.log(`Successfully recovered timer state for game ${game.id}`);
    } catch (error) {
      console.error(`Failed to recover timer state for game ${game.id}:`, error);
    }
  }

  /**
   * Handle player reconnection after server restart
   * This ensures the player's connection state is properly updated
   */
  handlePlayerReconnection(gameId: string, userId: string, playerName: string, socketId: string): Game | null {
    const game = this.games[gameId];
    if (!game?.players[userId]) {
      return null;
    }

    // Update player connection information
    game.players[userId].name = playerName;
    game.players[userId].socketId = socketId;
    game.players[userId].connected = true;

    // Update last activity time
    game.lastActivityAt = new Date();

    // If the player was paused due to disconnection, resume their timer
    if (game.timerState?.playerTimers[userId]) {
      const playerTimer = game.timerState.playerTimers[userId];
      if (playerTimer.isPaused && game.timerState.config.pauseOnDisconnect) {
        console.log(`Auto-resuming timer for reconnected player ${userId} in game ${gameId}`);
        game.resumePlayerTimer(userId);
      }
    }

    console.log(`Player ${userId} reconnected to game ${gameId}`);
    return game;
  }

  // Initialize from database on server start
  async initialize(): Promise<void> {
    console.log('Initializing GameManager from database...');
    try {
      await this.loadActiveGames();
      console.log('GameManager initialization complete.');
    } catch (error) {
      console.error('Failed to initialize GameManager:', error);
    }
  }

  // Cleanup methods
  async shutdown(): Promise<void> {
    console.log('Shutting down GameManager...');

    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    // Save all active games before shutdown
    const activeGames = Object.values(this.games).filter((game) => game.gameStarted && !game.gameFinished);

    for (const game of activeGames) {
      try {
        await this.persistence.saveGame(game);
      } catch (error) {
        console.error(`Failed to save game ${game.id} during shutdown:`, error);
      }
    }

    console.log(`Saved ${activeGames.length} active games during shutdown.`);
  }

  setAutoSave(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    if (enabled) {
      this.startAutoSave();
    } else if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  // Statistics
  async getGameStats() {
    return await this.persistence.getGameStats();
  }

  // User-specific methods
  async getUserGames(userId: string, includeFinished: boolean = false): Promise<Game[]> {
    return await this.persistence.getUserGames(userId, includeFinished);
  }
}

export default GameManager.getInstance();
