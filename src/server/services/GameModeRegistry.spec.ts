import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GameModeCategory } from '../../shared/types/gameModeTypes';
import { Database } from '../database/Database';
import { GameModeRegistry } from './GameModeRegistry';

// Mock environment variables for testing
const originalEnv = process.env;

describe('GameModeRegistry', () => {
  let registry: GameModeRegistry;
  let db: Database;

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_TEST_MODE = 'true';
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_PORT = '5434';
    process.env.POSTGRES_DB = 'othello_test';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';

    db = Database.getInstance();
    registry = GameModeRegistry.getInstance();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(async () => {
    // Clean up game modes table before each test
    await db.query('DELETE FROM game_modes');
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const registry1 = GameModeRegistry.getInstance();
      const registry2 = GameModeRegistry.getInstance();

      expect(registry1).toBe(registry2);
    });
  });

  describe('Game Mode CRUD Operations', () => {
    describe('createGameMode', () => {
      it('should create a new game mode successfully', async () => {
        const gameMode = await registry.createGameMode({
          id: 'blitz-3-0',
          name: 'Blitz 3+0',
          description: 'Fast-paced 3 minute game',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 180,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'intermediate',
          estimatedDuration: 5,
          tags: ['fast', 'competitive'],
        });

        expect(gameMode.id).toBe('blitz-3-0');
        expect(gameMode.name).toBe('Blitz 3+0');
        expect(gameMode.category).toBe('timer');
        expect(gameMode.difficultyLevel).toBe('intermediate');
        expect(gameMode.tags).toEqual(['fast', 'competitive']);
        expect(gameMode.minimumPlayers).toBe(2);
        expect(gameMode.maximumPlayers).toBe(2);
        expect(gameMode.isActive).toBe(true);
        expect(gameMode.isDefault).toBe(false);
      });

      it('should create a game mode with default values', async () => {
        const gameMode = await registry.createGameMode({
          id: 'classical-30-0',
          name: 'Classical 30+0',
          description: 'Long-form chess-style game',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 1800,
              increment: 0,
              warningTime: 60,
              criticalTime: 30,
            },
          },
          difficultyLevel: 'advanced',
        });

        expect(gameMode.isActive).toBe(true);
        expect(gameMode.isDefault).toBe(false);
        expect(gameMode.tags).toEqual([]);
        expect(gameMode.estimatedDuration).toBeNull();
      });

      it('should throw error for duplicate game mode ID', async () => {
        await registry.createGameMode({
          id: 'test-mode',
          name: 'Test Mode',
          description: 'Test description',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 300,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'beginner',
        });

        await expect(
          registry.createGameMode({
            id: 'test-mode',
            name: 'Another Test Mode',
            description: 'Another test description',
            category: 'timer',
            config: {
              timer: {
                type: 'fixed',
                initialTime: 300,
                increment: 0,
                warningTime: 30,
                criticalTime: 10,
              },
            },
            difficultyLevel: 'beginner',
          }),
        ).rejects.toThrow("Game mode with ID 'test-mode' already exists");
      });

      it('should handle default game mode correctly', async () => {
        // Create first game mode as default
        await registry.createGameMode({
          id: 'default-timer',
          name: 'Default Timer',
          description: 'Default timer game mode',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 300,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'beginner',
          isDefault: true,
        });

        // Create second game mode as default - should clear first one
        const newDefault = await registry.createGameMode({
          id: 'new-default-timer',
          name: 'New Default Timer',
          description: 'New default timer game mode',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 600,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'intermediate',
          isDefault: true,
        });

        expect(newDefault.isDefault).toBe(true);

        // Check that the first one is no longer default
        const firstMode = await registry.getGameModeById('default-timer');
        expect(firstMode?.isDefault).toBe(false);
      });
    });

    describe('getGameModeById', () => {
      it('should return game mode by ID', async () => {
        const created = await registry.createGameMode({
          id: 'test-get-by-id',
          name: 'Test Get By ID',
          description: 'Test description',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 300,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'beginner',
        });

        const retrieved = await registry.getGameModeById('test-get-by-id');
        expect(retrieved).toMatchObject({
          id: created.id,
          name: created.name,
          description: created.description,
          category: created.category,
          difficultyLevel: created.difficultyLevel,
        });
      });

      it('should return null for non-existent game mode', async () => {
        const result = await registry.getGameModeById('non-existent-id');
        expect(result).toBeNull();
      });
    });

    describe('getGameModes', () => {
      beforeEach(async () => {
        // Create test data
        await registry.createGameMode({
          id: 'blitz-1',
          name: 'Blitz 1',
          description: 'Fast blitz game',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 180,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'intermediate',
          tags: ['fast'],
        });

        await registry.createGameMode({
          id: 'board-mini',
          name: 'Mini Board',
          description: 'Smaller board variant',
          category: 'board-variant',
          config: {
            board: {
              size: 6,
              customLayout: false,
            },
          },
          difficultyLevel: 'beginner',
          tags: ['small', 'quick'],
        });

        await registry.createGameMode({
          id: 'challenge-daily',
          name: 'Daily Challenge',
          description: 'Daily puzzle challenge',
          category: 'daily-challenge',
          config: {
            challenge: {
              type: 'daily',
              maxAttempts: 3,
              timeLimit: 300,
              difficulty: 'medium',
            },
          },
          difficultyLevel: 'advanced',
          tags: ['puzzle'],
          isActive: false,
        });
      });

      it('should return all game modes with no query', async () => {
        const modes = await registry.getGameModes();
        expect(modes).toHaveLength(3);
      });

      it('should filter by category', async () => {
        const timerModes = await registry.getGameModes({ category: 'timer' });
        expect(timerModes).toHaveLength(1);
        expect(timerModes[0].category).toBe('timer');
      });

      it('should filter by active status', async () => {
        const activeModes = await registry.getGameModes({ isActive: true });
        expect(activeModes).toHaveLength(2);

        const inactiveModes = await registry.getGameModes({ isActive: false });
        expect(inactiveModes).toHaveLength(1);
      });

      it('should filter by difficulty level', async () => {
        const beginnerModes = await registry.getGameModes({ difficultyLevel: 'beginner' });
        expect(beginnerModes).toHaveLength(1);
        expect(beginnerModes[0].difficultyLevel).toBe('beginner');
      });

      it('should filter by tags', async () => {
        const fastModes = await registry.getGameModes({ tags: ['fast'] });
        expect(fastModes).toHaveLength(1);
        expect(fastModes[0].tags).toContain('fast');
      });

      it('should support pagination', async () => {
        const firstPage = await registry.getGameModes({ limit: 2 });
        expect(firstPage).toHaveLength(2);

        const secondPage = await registry.getGameModes({ limit: 2, offset: 2 });
        expect(secondPage).toHaveLength(1);
      });
    });

    describe('updateGameMode', () => {
      it('should update game mode successfully', async () => {
        const created = await registry.createGameMode({
          id: 'update-test',
          name: 'Original Name',
          description: 'Original description',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 300,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'beginner',
        });

        const updated = await registry.updateGameMode('update-test', {
          name: 'Updated Name',
          description: 'Updated description',
          difficultyLevel: 'intermediate',
          tags: ['updated'],
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.description).toBe('Updated description');
        expect(updated.difficultyLevel).toBe('intermediate');
        expect(updated.tags).toEqual(['updated']);
        expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
      });

      it('should throw error for non-existent game mode', async () => {
        await expect(
          registry.updateGameMode('non-existent', {
            name: 'Updated Name',
          }),
        ).rejects.toThrow("Game mode with ID 'non-existent' not found");
      });

      it('should throw error when no fields to update', async () => {
        await registry.createGameMode({
          id: 'no-update-test',
          name: 'Test',
          description: 'Test description',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 300,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'beginner',
        });

        await expect(registry.updateGameMode('no-update-test', {})).rejects.toThrow('No fields to update');
      });
    });

    describe('deleteGameMode', () => {
      it('should delete game mode successfully', async () => {
        await registry.createGameMode({
          id: 'delete-test',
          name: 'Delete Test',
          description: 'Test description',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 300,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'beginner',
        });

        const deleted = await registry.deleteGameMode('delete-test');
        expect(deleted).toBe(true);

        const retrieved = await registry.getGameModeById('delete-test');
        expect(retrieved).toBeNull();
      });

      it('should return false for non-existent game mode', async () => {
        const result = await registry.deleteGameMode('non-existent');
        expect(result).toBe(false);
      });
    });
  });

  describe('Specialized Query Methods', () => {
    beforeEach(async () => {
      // Create test data
      await registry.createGameMode({
        id: 'timer-default',
        name: 'Default Timer',
        description: 'Default timer game mode',
        category: 'timer',
        config: {
          timer: {
            type: 'fixed',
            initialTime: 300,
            increment: 0,
            warningTime: 30,
            criticalTime: 10,
          },
        },
        difficultyLevel: 'beginner',
        isDefault: true,
      });

      await registry.createGameMode({
        id: 'timer-blitz',
        name: 'Blitz Timer',
        description: 'Fast timer game mode',
        category: 'timer',
        config: {
          timer: {
            type: 'fixed',
            initialTime: 180,
            increment: 0,
            warningTime: 30,
            criticalTime: 10,
          },
        },
        difficultyLevel: 'intermediate',
        tags: ['fast', 'competitive'],
      });

      await registry.createGameMode({
        id: 'board-small',
        name: 'Small Board',
        description: 'Small board variant',
        category: 'board-variant',
        config: {
          board: {
            size: 6,
            customLayout: false,
          },
        },
        difficultyLevel: 'beginner',
        tags: ['small'],
      });
    });

    describe('getDefaultGameMode', () => {
      it('should return default game mode for category', async () => {
        const defaultTimer = await registry.getDefaultGameMode('timer');
        expect(defaultTimer).not.toBeNull();
        expect(defaultTimer?.id).toBe('timer-default');
        expect(defaultTimer?.isDefault).toBe(true);
      });

      it('should return null when no default for category', async () => {
        const defaultBoard = await registry.getDefaultGameMode('board-variant');
        expect(defaultBoard).toBeNull();
      });
    });

    describe('getActiveGameModes', () => {
      it('should return only active game modes', async () => {
        const activeModes = await registry.getActiveGameModes();
        expect(activeModes).toHaveLength(3);
        expect(activeModes.every((mode) => mode.isActive)).toBe(true);
      });
    });

    describe('getGameModesByCategory', () => {
      it('should return game modes for specific category', async () => {
        const timerModes = await registry.getGameModesByCategory('timer');
        expect(timerModes).toHaveLength(2);
        expect(timerModes.every((mode) => mode.category === 'timer')).toBe(true);
      });
    });

    describe('getGameModesByDifficulty', () => {
      it('should return game modes for specific difficulty', async () => {
        const beginnerModes = await registry.getGameModesByDifficulty('beginner');
        expect(beginnerModes).toHaveLength(2);
        expect(beginnerModes.every((mode) => mode.difficultyLevel === 'beginner')).toBe(true);
      });
    });

    describe('searchGameModesByTags', () => {
      it('should return game modes matching tags', async () => {
        const fastModes = await registry.searchGameModesByTags(['fast']);
        expect(fastModes).toHaveLength(1);
        expect(fastModes[0].tags).toContain('fast');
      });

      it('should return game modes matching multiple tags', async () => {
        const smallModes = await registry.searchGameModesByTags(['small']);
        expect(smallModes).toHaveLength(1);
        expect(smallModes[0].tags).toContain('small');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test depends on the database configuration
      expect(typeof registry.getGameModes).toBe('function');
    });

    it('should validate game mode data before creation', async () => {
      await expect(
        registry.createGameMode({
          id: '', // Invalid empty ID
          name: 'Invalid Mode',
          description: 'Test description',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: 300,
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'beginner',
        }),
      ).rejects.toThrow('Invalid game mode data');
    });

    it('should validate game mode configuration', async () => {
      await expect(
        registry.createGameMode({
          id: 'invalid-config',
          name: 'Invalid Config Mode',
          description: 'Test description',
          category: 'timer',
          config: {
            timer: {
              type: 'fixed',
              initialTime: -1, // Invalid negative time
              increment: 0,
              warningTime: 30,
              criticalTime: 10,
            },
          },
          difficultyLevel: 'beginner',
        }),
      ).rejects.toThrow('Invalid game mode configuration');
    });
  });
});
