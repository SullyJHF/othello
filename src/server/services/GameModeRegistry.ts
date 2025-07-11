import {
  GameMode,
  GameModeCategory,
  GameModeConfig,
  validateGameMode,
  GAME_MODE_TEMPLATES,
} from '../../shared/types/gameModeTypes';
import { Database } from '../database/Database';

export interface GameModeQuery {
  category?: GameModeCategory;
  isActive?: boolean;
  isDefault?: boolean;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface GameModeCreateData {
  id: string;
  name: string;
  description: string;
  category: GameModeCategory;
  config: GameModeConfig;
  isActive?: boolean;
  isDefault?: boolean;
  estimatedDuration?: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags?: string[];
}

export interface GameModeUpdateData {
  name?: string;
  description?: string;
  category?: GameModeCategory;
  config?: GameModeConfig;
  isActive?: boolean;
  isDefault?: boolean;
  estimatedDuration?: number;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags?: string[];
}

export class GameModeRegistry {
  private static instance: GameModeRegistry;
  private db: Database;

  private constructor() {
    this.db = Database.getInstance();
  }

  public static getInstance(): GameModeRegistry {
    if (!GameModeRegistry.instance) {
      GameModeRegistry.instance = new GameModeRegistry();
    }
    return GameModeRegistry.instance;
  }

  /**
   * Create a new game mode
   */
  async createGameMode(data: GameModeCreateData): Promise<GameMode> {
    // Validate the game mode data
    const validationErrors = validateGameMode({
      ...data,
      minimumPlayers: 2,
      maximumPlayers: 2,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
      tags: data.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (validationErrors.length > 0) {
      throw new Error(`Invalid game mode data: ${validationErrors.join(', ')}`);
    }

    // Basic validation for game mode configuration
    if (!data.config) {
      throw new Error('Game mode configuration is required');
    }

    // Validate timer configuration if present
    if (data.config.timer) {
      const timer = data.config.timer;
      if (timer.initialTime < 0) {
        throw new Error('Invalid game mode configuration: Timer initial time must be non-negative');
      }
      if (timer.increment < 0) {
        throw new Error('Invalid game mode configuration: Timer increment must be non-negative');
      }
      if (timer.warningTime < 0) {
        throw new Error('Invalid game mode configuration: Timer warning time must be non-negative');
      }
      if (timer.criticalTime < 0) {
        throw new Error('Invalid game mode configuration: Timer critical time must be non-negative');
      }
    }

    // Check if a game mode with this ID already exists
    const existingGameMode = await this.getGameModeById(data.id);
    if (existingGameMode) {
      throw new Error(`Game mode with ID '${data.id}' already exists`);
    }

    // If this is set as default, ensure no other game mode in the same category is default
    if (data.isDefault) {
      await this.clearDefaultForCategory(data.category);
    }

    const query = `
      INSERT INTO game_modes (
        id, name, description, category, config, is_active, is_default,
        minimum_players, maximum_players, estimated_duration, difficulty_level, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      data.id,
      data.name,
      data.description,
      data.category,
      JSON.stringify(data.config),
      data.isActive ?? true,
      data.isDefault ?? false,
      2, // minimum_players
      2, // maximum_players
      data.estimatedDuration,
      data.difficultyLevel,
      data.tags ?? [],
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToGameMode(result.rows[0]);
  }

  /**
   * Get a game mode by ID
   */
  async getGameModeById(id: string): Promise<GameMode | null> {
    const query = 'SELECT * FROM game_modes WHERE id = $1';
    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGameMode(result.rows[0]);
  }

  /**
   * Get multiple game modes based on query criteria
   */
  async getGameModes(query: GameModeQuery = {}): Promise<GameMode[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (query.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(query.category);
    }

    if (query.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(query.isActive);
    }

    if (query.isDefault !== undefined) {
      conditions.push(`is_default = $${paramIndex++}`);
      values.push(query.isDefault);
    }

    if (query.difficultyLevel) {
      conditions.push(`difficulty_level = $${paramIndex++}`);
      values.push(query.difficultyLevel);
    }

    if (query.tags && query.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      values.push(query.tags);
    }

    let sql = 'SELECT * FROM game_modes';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY created_at DESC';

    if (query.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      values.push(query.limit);
    }

    if (query.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      values.push(query.offset);
    }

    const result = await this.db.query(sql, values);
    return result.rows.map(this.mapRowToGameMode);
  }

  /**
   * Update a game mode
   */
  async updateGameMode(id: string, data: GameModeUpdateData): Promise<GameMode> {
    const existingGameMode = await this.getGameModeById(id);
    if (!existingGameMode) {
      throw new Error(`Game mode with ID '${id}' not found`);
    }

    // If this is being set as default, ensure no other game mode in the same category is default
    if (data.isDefault && data.category) {
      await this.clearDefaultForCategory(data.category);
    } else if (data.isDefault) {
      await this.clearDefaultForCategory(existingGameMode.category);
    }

    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.category) {
      updateFields.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }

    if (data.config) {
      // Basic validation for configuration
      if (typeof data.config !== 'object') {
        throw new Error('Game mode configuration must be an object');
      }

      updateFields.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(data.config));
    }

    if (data.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    if (data.isDefault !== undefined) {
      updateFields.push(`is_default = $${paramIndex++}`);
      values.push(data.isDefault);
    }

    if (data.estimatedDuration !== undefined) {
      updateFields.push(`estimated_duration = $${paramIndex++}`);
      values.push(data.estimatedDuration);
    }

    if (data.difficultyLevel) {
      updateFields.push(`difficulty_level = $${paramIndex++}`);
      values.push(data.difficultyLevel);
    }

    if (data.tags) {
      updateFields.push(`tags = $${paramIndex++}`);
      values.push(data.tags);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE game_modes 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);
    return this.mapRowToGameMode(result.rows[0]);
  }

  /**
   * Delete a game mode
   */
  async deleteGameMode(id: string): Promise<boolean> {
    // Check if the game mode exists
    const existingGameMode = await this.getGameModeById(id);
    if (!existingGameMode) {
      return false;
    }

    // Check if there are any active games using this game mode
    const gamesQuery = 'SELECT COUNT(*) as count FROM games WHERE game_mode_id = $1 AND game_finished = false';
    const gamesResult = await this.db.query(gamesQuery, [id]);

    if (parseInt(gamesResult.rows[0].count) > 0) {
      throw new Error(`Cannot delete game mode '${id}' because it is being used by active games`);
    }

    const query = 'DELETE FROM game_modes WHERE id = $1';
    const result = await this.db.query(query, [id]);

    return result.rowCount > 0;
  }

  /**
   * Get the default game mode for a category
   */
  async getDefaultGameMode(category: GameModeCategory): Promise<GameMode | null> {
    const query = 'SELECT * FROM game_modes WHERE category = $1 AND is_default = true LIMIT 1';
    const result = await this.db.query(query, [category]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGameMode(result.rows[0]);
  }

  /**
   * Get all active game modes
   */
  async getActiveGameModes(): Promise<GameMode[]> {
    return this.getGameModes({ isActive: true });
  }

  /**
   * Get game modes by category
   */
  async getGameModesByCategory(category: GameModeCategory): Promise<GameMode[]> {
    return this.getGameModes({ category });
  }

  /**
   * Get game modes by difficulty level
   */
  async getGameModesByDifficulty(
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert',
  ): Promise<GameMode[]> {
    return this.getGameModes({ difficultyLevel });
  }

  /**
   * Search game modes by tags
   */
  async searchGameModesByTags(tags: string[]): Promise<GameMode[]> {
    return this.getGameModes({ tags });
  }

  /**
   * Initialize default game modes from templates
   */
  async initializeDefaultGameModes(): Promise<void> {
    const existingModes = await this.getGameModes();

    // Only initialize if no game modes exist
    if (existingModes.length > 0) {
      return;
    }

    // Create default game modes from templates
    for (const template of GAME_MODE_TEMPLATES) {
      try {
        await this.createGameMode({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          config: template.config,
          isActive: template.isActive,
          isDefault: template.isDefault,
          estimatedDuration: template.estimatedDuration,
          difficultyLevel: template.difficultyLevel,
          tags: template.tags,
        });
      } catch (error) {
        console.error(`Error creating default game mode '${template.id}':`, error);
      }
    }
  }

  /**
   * Clear default status for all game modes in a category
   */
  private async clearDefaultForCategory(category: GameModeCategory): Promise<void> {
    const query = 'UPDATE game_modes SET is_default = false WHERE category = $1 AND is_default = true';
    await this.db.query(query, [category]);
  }

  /**
   * Map database row to GameMode object
   */
  private mapRowToGameMode(row: any): GameMode {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      config: row.config,
      isActive: row.is_active,
      isDefault: row.is_default,
      minimumPlayers: row.minimum_players,
      maximumPlayers: row.maximum_players,
      estimatedDuration: row.estimated_duration,
      difficultyLevel: row.difficulty_level,
      tags: row.tags,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
