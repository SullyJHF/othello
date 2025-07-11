import { TimerConfig } from '../../shared/types/gameModeTypes';
import { Database } from '../database/Database';
import { Board } from '../models/Board';
import { Game, Player } from '../models/Game';

interface PersistedGameData {
  id: string;
  joinUrl: string;
  currentPlayer: 'W' | 'B';
  gameStarted: boolean;
  gameFull: boolean;
  gameFinished: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  gameModeId?: string;
  gameModeConfig: Record<string, any>;
  playerTimers: Record<string, any>;
  timerState: Record<string, any>;
  boardState: Record<string, any>;
  boardSize: number;
  finalScore: Record<string, number>;
  winner?: 'W' | 'B';
  finishReason?: string;
  moveCount: number;
  challengeType?: string;
  challengeAttempts: number;
  challengeMaxAttempts?: number;
  challengeSolved: boolean;
  metadata: Record<string, any>;
}

interface PersistedPlayerData {
  gameId: string;
  userId: string;
  piece?: 'W' | 'B';
  joinedAt: Date;
  isConnected: boolean;
  lastSeenAt: Date;
  playerConfig: Record<string, any>;
  movesMade: number;
  timeUsed: number;
}

export class GamePersistence {
  private static instance: GamePersistence;
  private db: Database;

  private constructor() {
    this.db = Database.getInstance();
  }

  static getInstance(): GamePersistence {
    if (!GamePersistence.instance) {
      GamePersistence.instance = new GamePersistence();
    }
    return GamePersistence.instance;
  }

  /**
   * Save a game to the database
   */
  async saveGame(game: Game): Promise<void> {
    try {
      // Prepare game data
      const gameData: Partial<PersistedGameData> = {
        id: game.id,
        joinUrl: game.joinUrl,
        currentPlayer: game.currentPlayer,
        gameStarted: game.gameStarted,
        gameFull: game.gameFull,
        gameFinished: game.gameFinished,
        createdAt: game.createdAt,
        lastActivityAt: game.lastActivityAt,
        gameModeId: game.gameModeId || 'default',
        gameModeConfig: {},
        playerTimers: game.timerState?.playerTimers || {},
        timerState: game.timerState
          ? {
              config: game.timerState.config,
              gameStartTime: game.timerState.gameStartTime,
              currentPlayerStartTime: game.timerState.currentPlayerStartTime,
              isGamePaused: game.timerState.isGamePaused,
              totalGameTime: game.timerState.totalGameTime,
            }
          : {},
        boardState: {
          pieces: game.board.pieces,
          nextMoves: game.board.nextMoves,
          size: game.board.size,
        },
        boardSize: game.board.size,
        finalScore: game.board.getScore(),
        moveCount: 0, // Will be calculated from board state
        challengeAttempts: 0,
        challengeSolved: false,
        metadata: {},
      };

      // Insert or update game
      await this.db.query(
        `
        INSERT INTO games (
          id, join_url, current_player, game_started, game_full, game_finished,
          created_at, last_activity_at, game_mode_id, game_mode_config,
          player_timers, timer_state, board_state, board_size, final_score,
          winner, finish_reason, move_count, challenge_type, challenge_attempts,
          challenge_max_attempts, challenge_solved, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) ON CONFLICT (id) DO UPDATE SET
          current_player = EXCLUDED.current_player,
          game_started = EXCLUDED.game_started,
          game_full = EXCLUDED.game_full,
          game_finished = EXCLUDED.game_finished,
          last_activity_at = EXCLUDED.last_activity_at,
          player_timers = EXCLUDED.player_timers,
          timer_state = EXCLUDED.timer_state,
          board_state = EXCLUDED.board_state,
          final_score = EXCLUDED.final_score,
          winner = EXCLUDED.winner,
          finish_reason = EXCLUDED.finish_reason,
          move_count = EXCLUDED.move_count,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
          gameData.id,
          gameData.joinUrl,
          gameData.currentPlayer,
          gameData.gameStarted,
          gameData.gameFull,
          gameData.gameFinished,
          gameData.createdAt,
          gameData.lastActivityAt,
          gameData.gameModeId,
          JSON.stringify(gameData.gameModeConfig),
          JSON.stringify(gameData.playerTimers),
          JSON.stringify(gameData.timerState),
          JSON.stringify(gameData.boardState),
          gameData.boardSize,
          JSON.stringify(gameData.finalScore),
          gameData.winner,
          gameData.finishReason,
          gameData.moveCount,
          gameData.challengeType,
          gameData.challengeAttempts,
          gameData.challengeMaxAttempts,
          gameData.challengeSolved,
          JSON.stringify(gameData.metadata),
        ],
      );

      // Save players
      await this.savePlayers(game.id, Object.values(game.players));
    } catch (error) {
      console.error('Failed to save game:', error);
      throw new Error(`Failed to save game ${game.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a game from the database
   */
  async loadGame(gameId: string): Promise<Game | null> {
    try {
      // Load game data
      const gameResult = await this.db.query('SELECT * FROM games WHERE id = $1', [gameId]);

      if (gameResult.rows.length === 0) {
        return null;
      }

      const gameData = gameResult.rows[0] as PersistedGameData;

      // Load players
      const playersResult = await this.db.query('SELECT * FROM game_players WHERE game_id = $1', [gameId]);

      const playerData = playersResult.rows as PersistedPlayerData[];

      // Reconstruct game object
      const timerConfig = gameData.timerState?.config as TimerConfig | undefined;
      const game = new Game(gameData.gameModeId, timerConfig);

      // Set basic properties
      game.id = gameData.id;
      game.joinUrl = gameData.joinUrl;
      game.currentPlayer = gameData.currentPlayer;
      game.gameStarted = gameData.gameStarted;
      game.gameFull = gameData.gameFull;
      game.gameFinished = gameData.gameFinished;
      game.createdAt = gameData.createdAt;
      game.lastActivityAt = gameData.lastActivityAt;
      game.gameModeId = gameData.gameModeId;

      // Reconstruct timer state
      if (gameData.timerState && Object.keys(gameData.timerState).length > 0) {
        game.timerState = {
          config: gameData.timerState.config,
          playerTimers: gameData.playerTimers || {},
          gameStartTime: new Date(gameData.timerState.gameStartTime),
          currentPlayerStartTime: gameData.timerState.currentPlayerStartTime
            ? new Date(gameData.timerState.currentPlayerStartTime)
            : undefined,
          isGamePaused: gameData.timerState.isGamePaused || false,
          totalGameTime: gameData.timerState.totalGameTime || 0,
        };
      }

      // Reconstruct board
      if (gameData.boardState?.pieces) {
        game.board = new Board();
        game.board.pieces = gameData.boardState.pieces;
        game.board.nextMoves = gameData.boardState.nextMoves || [];
        game.board.size = gameData.boardState.size || 8;
      }

      // Reconstruct players
      game.players = {};
      for (const playerRow of playerData) {
        const player: Player = {
          userId: playerRow.userId,
          name: '', // Will be updated when player reconnects
          socketId: '', // Will be updated when player reconnects
          connected: false, // Will be updated when player reconnects
          piece: playerRow.piece,
        };
        game.players[playerRow.userId] = player;
      }

      return game;
    } catch (error) {
      console.error('Failed to load game:', error);
      throw new Error(`Failed to load game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load all active games (games that are started but not finished)
   */
  async loadActiveGames(): Promise<Game[]> {
    try {
      const result = await this.db.query(`
        SELECT id FROM games 
        WHERE game_started = true AND game_finished = false
        ORDER BY last_activity_at DESC
      `);

      const games: Game[] = [];
      for (const row of result.rows) {
        const game = await this.loadGame(row.id);
        if (game) {
          games.push(game);
        }
      }

      return games;
    } catch (error) {
      console.error('Failed to load active games:', error);
      throw new Error(`Failed to load active games: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a game from the database
   */
  async deleteGame(gameId: string): Promise<boolean> {
    try {
      const result = await this.db.query('DELETE FROM games WHERE id = $1', [gameId]);

      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete game:', error);
      throw new Error(`Failed to delete game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark a game as finished
   */
  async markGameFinished(gameId: string, winner?: 'W' | 'B', finishReason?: string): Promise<void> {
    try {
      await this.db.query(
        `
        UPDATE games 
        SET game_finished = true, winner = $2, finish_reason = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [gameId, winner, finishReason],
      );
    } catch (error) {
      console.error('Failed to mark game as finished:', error);
      throw new Error(
        `Failed to mark game ${gameId} as finished: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Clean up old finished games
   */
  async cleanupOldGames(olderThanDays: number = 30): Promise<number> {
    try {
      const result = await this.db.query(`
        DELETE FROM games 
        WHERE game_finished = true 
        AND last_activity_at < NOW() - INTERVAL '${olderThanDays} days'
      `);

      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old games:', error);
      throw new Error(`Failed to cleanup old games: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get game statistics
   */
  async getGameStats(): Promise<{
    totalGames: number;
    activeGames: number;
    finishedGames: number;
    averageGameDuration: number;
  }> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_games,
          COUNT(CASE WHEN game_started = true AND game_finished = false THEN 1 END) as active_games,
          COUNT(CASE WHEN game_finished = true THEN 1 END) as finished_games,
          AVG(EXTRACT(EPOCH FROM (COALESCE(updated_at, CURRENT_TIMESTAMP) - created_at))) as avg_duration
        FROM games
      `);

      const stats = result.rows[0];
      return {
        totalGames: parseInt(stats.total_games),
        activeGames: parseInt(stats.active_games),
        finishedGames: parseInt(stats.finished_games),
        averageGameDuration: parseFloat(stats.avg_duration) || 0,
      };
    } catch (error) {
      console.error('Failed to get game stats:', error);
      throw new Error(`Failed to get game stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save players for a game
   */
  private async savePlayers(gameId: string, players: Player[]): Promise<void> {
    try {
      // Delete existing players for this game
      await this.db.query('DELETE FROM game_players WHERE game_id = $1', [gameId]);

      // Insert current players
      for (const player of players) {
        await this.db.query(
          `
          INSERT INTO game_players (
            game_id, user_id, piece, joined_at, is_connected, last_seen_at,
            player_config, moves_made, time_used
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
          [
            gameId,
            player.userId,
            player.piece,
            new Date(), // Default to current time for joined_at
            player.connected,
            new Date(), // Default to current time for last_seen_at
            JSON.stringify({}), // Default empty player config
            0, // Default moves made
            0, // Default time used
          ],
        );
      }
    } catch (error) {
      console.error('Failed to save players:', error);
      throw new Error(
        `Failed to save players for game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update player connection status
   */
  async updatePlayerConnection(gameId: string, userId: string, connected: boolean): Promise<void> {
    try {
      await this.db.query(
        `
        UPDATE game_players 
        SET is_connected = $3, last_seen_at = CURRENT_TIMESTAMP
        WHERE game_id = $1 AND user_id = $2
      `,
        [gameId, userId, connected],
      );
    } catch (error) {
      console.error('Failed to update player connection:', error);
      throw new Error(
        `Failed to update player connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get games for a specific user
   */
  async getUserGames(userId: string, includeFinished: boolean = false): Promise<Game[]> {
    try {
      const finishedCondition = includeFinished ? '' : 'AND g.game_finished = false';

      const result = await this.db.query(
        `
        SELECT DISTINCT g.id
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        WHERE gp.user_id = $1 ${finishedCondition}
        ORDER BY g.last_activity_at DESC
      `,
        [userId],
      );

      const games: Game[] = [];
      for (const row of result.rows) {
        const game = await this.loadGame(row.id);
        if (game) {
          games.push(game);
        }
      }

      return games;
    } catch (error) {
      console.error('Failed to get user games:', error);
      throw new Error(
        `Failed to get games for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
