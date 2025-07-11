import { Router } from 'express';
import { GameModeCategory } from '../../shared/types/gameModeTypes';
import GameManager from '../models/GameManager';
import { GameModeEngine } from '../services/GameModeEngine';
import { GameModeRegistry } from '../services/GameModeRegistry';

const router = Router();
const registry = GameModeRegistry.getInstance();
const gameManager = GameManager;

/**
 * GET /api/game-modes
 * Get all available game modes, optionally filtered by category
 */
router.get('/game-modes', async (req, res) => {
  try {
    const category = req.query.category as GameModeCategory;
    const isActive = req.query.isActive === 'true';
    const difficultyLevel = req.query.difficultyLevel as 'beginner' | 'intermediate' | 'advanced' | 'expert';
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const gameModes = await registry.getGameModes({
      category,
      isActive,
      difficultyLevel,
      tags,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: gameModes,
      total: gameModes.length,
    });
  } catch (error) {
    console.error('Error fetching game modes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game modes',
    });
  }
});

/**
 * GET /api/game-modes/:id
 * Get a specific game mode by ID
 */
router.get('/game-modes/:id', async (req, res) => {
  try {
    const gameMode = await registry.getGameModeById(req.params.id);

    if (!gameMode) {
      return res.status(404).json({
        success: false,
        error: 'Game mode not found',
      });
    }

    res.json({
      success: true,
      data: gameMode,
    });
  } catch (error) {
    console.error('Error fetching game mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game mode',
    });
  }
});

/**
 * GET /api/game-modes/category/:category
 * Get game modes for a specific category
 */
router.get('/game-modes/category/:category', async (req, res) => {
  try {
    const category = req.params.category as GameModeCategory;
    const gameModes = await registry.getGameModesByCategory(category);

    res.json({
      success: true,
      data: gameModes,
      total: gameModes.length,
    });
  } catch (error) {
    console.error('Error fetching game modes by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game modes by category',
    });
  }
});

/**
 * GET /api/game-modes/default/:category
 * Get the default game mode for a category
 */
router.get('/game-modes/default/:category', async (req, res) => {
  try {
    const category = req.params.category as GameModeCategory;
    const defaultMode = await registry.getDefaultGameMode(category);

    res.json({
      success: true,
      data: defaultMode,
    });
  } catch (error) {
    console.error('Error fetching default game mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default game mode',
    });
  }
});

/**
 * GET /api/game-modes/active
 * Get all active game modes
 */
router.get('/game-modes/active', async (req, res) => {
  try {
    const gameModes = await registry.getActiveGameModes();

    res.json({
      success: true,
      data: gameModes,
      total: gameModes.length,
    });
  } catch (error) {
    console.error('Error fetching active game modes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active game modes',
    });
  }
});

/**
 * POST /api/game-modes
 * Create a new game mode (admin only)
 */
router.post('/game-modes', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const gameMode = await registry.createGameMode(req.body);

    res.status(201).json({
      success: true,
      data: gameMode,
    });
  } catch (error) {
    console.error('Error creating game mode:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create game mode',
    });
  }
});

/**
 * PUT /api/game-modes/:id
 * Update an existing game mode (admin only)
 */
router.put('/game-modes/:id', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const gameMode = await registry.updateGameMode(req.params.id, req.body);

    res.json({
      success: true,
      data: gameMode,
    });
  } catch (error) {
    console.error('Error updating game mode:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update game mode',
    });
  }
});

/**
 * DELETE /api/game-modes/:id
 * Delete a game mode (admin only)
 */
router.delete('/game-modes/:id', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const result = await registry.deleteGameMode(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Game mode not found',
      });
    }

    res.json({
      success: true,
      message: 'Game mode deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting game mode:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete game mode',
    });
  }
});

/**
 * GET /api/game-modes/difficulty/:level
 * Get game modes by difficulty level
 */
router.get('/game-modes/difficulty/:level', async (req, res) => {
  try {
    const level = req.params.level as 'beginner' | 'intermediate' | 'advanced' | 'expert';
    const gameModes = await registry.getGameModesByDifficulty(level);

    res.json({
      success: true,
      data: gameModes,
      total: gameModes.length,
    });
  } catch (error) {
    console.error('Error fetching game modes by difficulty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game modes by difficulty',
    });
  }
});

/**
 * GET /api/game-modes/search
 * Search game modes by tags
 */
router.get('/game-modes/search', async (req, res) => {
  try {
    const tags = req.query.tags ? (req.query.tags as string).split(',') : [];
    const gameModes = await registry.searchGameModesByTags(tags);

    res.json({
      success: true,
      data: gameModes,
      total: gameModes.length,
    });
  } catch (error) {
    console.error('Error searching game modes by tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search game modes by tags',
    });
  }
});

/**
 * POST /api/game-modes/initialize
 * Initialize default game modes (admin only)
 */
router.post('/game-modes/initialize', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    await registry.initializeDefaultGameModes();

    res.json({
      success: true,
      message: 'Default game modes initialized successfully',
    });
  } catch (error) {
    console.error('Error initializing default game modes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize default game modes',
    });
  }
});

export default router;
