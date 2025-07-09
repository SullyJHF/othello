import { describe, it, expect } from 'vitest';
import {
  GameMode,
  GameModeCategory,
  TimerConfig,
  BoardConfig,
  ChallengeConfig,
  GAME_MODE_TEMPLATES,
  validateGameMode,
  createGameModeFromTemplate,
  isTimerMode,
  isBoardVariantMode,
  isChallengeMode,
  isTournamentMode,
} from './gameModeTypes';

describe('Game Mode Types', () => {
  describe('GameMode interface', () => {
    it('should validate a complete GameMode object', () => {
      const gameMode: GameMode = {
        id: 'test-mode',
        name: 'Test Mode',
        description: 'A test game mode',
        category: 'timer',
        config: {
          timer: {
            type: 'increment',
            initialTime: 300,
            increment: 5,
            delay: 0,
            maxTime: 600,
            lowTimeWarning: 30,
            criticalTimeWarning: 10,
            autoFlagOnTimeout: true,
            pauseOnDisconnect: true,
            maxPauseTime: 60,
          },
        },
        isActive: true,
        isDefault: false,
        minimumPlayers: 2,
        maximumPlayers: 2,
        estimatedDuration: 15,
        difficultyLevel: 'intermediate',
        tags: ['test', 'timer'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(gameMode.id).toBe('test-mode');
      expect(gameMode.minimumPlayers).toBe(2);
      expect(gameMode.maximumPlayers).toBe(2);
      expect(gameMode.category).toBe('timer');
    });

    it('should support all GameModeCategory values', () => {
      const categories: GameModeCategory[] = ['timer', 'board-variant', 'special', 'daily-challenge', 'tournament'];

      categories.forEach((category) => {
        expect(typeof category).toBe('string');
      });
    });
  });

  describe('TimerConfig', () => {
    it('should validate timer configuration', () => {
      const timerConfig: TimerConfig = {
        type: 'increment',
        initialTime: 180,
        increment: 2,
        delay: 0,
        maxTime: 300,
        lowTimeWarning: 30,
        criticalTimeWarning: 10,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: true,
        maxPauseTime: 60,
      };

      expect(timerConfig.type).toBe('increment');
      expect(timerConfig.initialTime).toBe(180);
      expect(timerConfig.increment).toBe(2);
      expect(timerConfig.autoFlagOnTimeout).toBe(true);
    });

    it('should support all timer types', () => {
      const types: TimerConfig['type'][] = ['increment', 'delay', 'fixed', 'correspondence', 'unlimited'];

      types.forEach((type) => {
        const config: TimerConfig = {
          type,
          initialTime: 300,
          increment: 5,
          delay: 0,
          maxTime: 600,
          lowTimeWarning: 30,
          criticalTimeWarning: 10,
          autoFlagOnTimeout: true,
          pauseOnDisconnect: false,
          maxPauseTime: 0,
        };

        expect(config.type).toBe(type);
      });
    });
  });

  describe('BoardConfig', () => {
    it('should validate board configuration', () => {
      const boardConfig: BoardConfig = {
        width: 8,
        height: 8,
        startingPosition: '........\n........\n...0....\n..0WB...\n...BW0..\n....0...\n........\n........',
        validSizes: [6, 8, 10],
        customRules: [],
      };

      expect(boardConfig.width).toBe(8);
      expect(boardConfig.height).toBe(8);
      expect(boardConfig.validSizes).toContain(8);
      expect(Array.isArray(boardConfig.customRules)).toBe(true);
    });

    it('should support custom board rules', () => {
      const boardConfig: BoardConfig = {
        width: 8,
        height: 8,
        startingPosition: '',
        validSizes: [8],
        customRules: [
          {
            id: 'test-rule',
            name: 'Test Rule',
            description: 'A test rule',
            affects: 'placement',
            implementation: 'test-implementation',
          },
        ],
      };

      expect(boardConfig.customRules).toHaveLength(1);
      expect(boardConfig.customRules[0].affects).toBe('placement');
    });
  });

  describe('ChallengeConfig', () => {
    it('should validate challenge configuration', () => {
      const challengeConfig: ChallengeConfig = {
        type: 'tactical',
        difficulty: 3,
        maxAttempts: 3,
        timeLimit: 300,
        hints: [
          {
            order: 1,
            text: 'Look for corner moves',
            cost: 10,
          },
        ],
        solution: {
          moves: [19, 26, 44],
          explanation: 'Control the corner by placing at these positions',
          alternativeSolutions: [
            [19, 26],
            [44, 35],
          ],
        },
        tags: ['tactical', 'corner'],
      };

      expect(challengeConfig.type).toBe('tactical');
      expect(challengeConfig.difficulty).toBe(3);
      expect(challengeConfig.maxAttempts).toBe(3);
      expect(challengeConfig.hints).toHaveLength(1);
      expect(challengeConfig.solution.moves).toHaveLength(3);
    });

    it('should support all challenge types', () => {
      const types: ChallengeConfig['type'][] = ['tactical', 'endgame', 'opening', 'puzzle', 'scenario'];

      types.forEach((type) => {
        const config: ChallengeConfig = {
          type,
          difficulty: 2,
          maxAttempts: 3,
          hints: [],
          solution: {
            moves: [],
            explanation: '',
          },
          tags: [],
        };

        expect(config.type).toBe(type);
      });
    });

    it('should support difficulty levels 1-5', () => {
      const difficulties: ChallengeConfig['difficulty'][] = [1, 2, 3, 4, 5];

      difficulties.forEach((difficulty) => {
        const config: ChallengeConfig = {
          type: 'tactical',
          difficulty,
          maxAttempts: 3,
          hints: [],
          solution: {
            moves: [],
            explanation: '',
          },
          tags: [],
        };

        expect(config.difficulty).toBe(difficulty);
      });
    });
  });

  describe('GAME_MODE_TEMPLATES', () => {
    it('should have all expected template modes', () => {
      expect(GAME_MODE_TEMPLATES.BULLET).toBeDefined();
      expect(GAME_MODE_TEMPLATES.BLITZ).toBeDefined();
      expect(GAME_MODE_TEMPLATES.RAPID).toBeDefined();
      expect(GAME_MODE_TEMPLATES.CLASSICAL).toBeDefined();
      expect(GAME_MODE_TEMPLATES.MINI_BOARD).toBeDefined();
      expect(GAME_MODE_TEMPLATES.LARGE_BOARD).toBeDefined();
      expect(GAME_MODE_TEMPLATES.DAILY_CHALLENGE).toBeDefined();
    });

    it('should validate BULLET template', () => {
      const bullet = GAME_MODE_TEMPLATES.BULLET;

      expect(bullet.category).toBe('timer');
      expect(bullet.config.timer).toBeDefined();
      expect(bullet.config.timer.initialTime).toBe(60);
      expect(bullet.config.timer.increment).toBe(1);
      expect(bullet.config.ui?.theme).toBe('blitz');
    });

    it('should validate BLITZ template', () => {
      const blitz = GAME_MODE_TEMPLATES.BLITZ;

      expect(blitz.category).toBe('timer');
      expect(blitz.config.timer).toBeDefined();
      expect(blitz.config.timer.initialTime).toBe(180);
      expect(blitz.config.timer.increment).toBe(2);
      expect(blitz.config.ui?.showTimer).toBe(true);
    });

    it('should validate MINI_BOARD template', () => {
      const miniBoard = GAME_MODE_TEMPLATES.MINI_BOARD;

      expect(miniBoard.category).toBe('board-variant');
      expect(miniBoard.config.board).toBeDefined();
      expect(miniBoard.config.board.width).toBe(6);
      expect(miniBoard.config.board.height).toBe(6);
      expect(miniBoard.config.board.validSizes).toContain(6);
    });

    it('should validate LARGE_BOARD template', () => {
      const largeBoard = GAME_MODE_TEMPLATES.LARGE_BOARD;

      expect(largeBoard.category).toBe('board-variant');
      expect(largeBoard.config.board).toBeDefined();
      expect(largeBoard.config.board.width).toBe(10);
      expect(largeBoard.config.board.height).toBe(10);
      expect(largeBoard.config.board.validSizes).toContain(10);
    });

    it('should validate DAILY_CHALLENGE template', () => {
      const dailyChallenge = GAME_MODE_TEMPLATES.DAILY_CHALLENGE;

      expect(dailyChallenge.category).toBe('daily-challenge');
      expect(dailyChallenge.config.challenge).toBeDefined();
      expect(dailyChallenge.config.challenge.type).toBe('tactical');
      expect(dailyChallenge.config.challenge.difficulty).toBe(3);
      expect(dailyChallenge.config.challenge.maxAttempts).toBe(3);
    });
  });

  describe('Type guards', () => {
    it('should correctly identify timer modes', () => {
      const timerConfig = { timer: GAME_MODE_TEMPLATES.BLITZ.config.timer };
      const nonTimerConfig = { board: GAME_MODE_TEMPLATES.MINI_BOARD.config.board };

      expect(isTimerMode(timerConfig)).toBe(true);
      expect(isTimerMode(nonTimerConfig)).toBe(false);
    });

    it('should correctly identify board variant modes', () => {
      const boardConfig = { board: GAME_MODE_TEMPLATES.MINI_BOARD.config.board };
      const nonBoardConfig = { timer: GAME_MODE_TEMPLATES.BLITZ.config.timer };

      expect(isBoardVariantMode(boardConfig)).toBe(true);
      expect(isBoardVariantMode(nonBoardConfig)).toBe(false);
    });

    it('should correctly identify challenge modes', () => {
      const challengeConfig = { challenge: GAME_MODE_TEMPLATES.DAILY_CHALLENGE.config.challenge };
      const nonChallengeConfig = { timer: GAME_MODE_TEMPLATES.BLITZ.config.timer };

      expect(isChallengeMode(challengeConfig)).toBe(true);
      expect(isChallengeMode(nonChallengeConfig)).toBe(false);
    });

    it('should correctly identify tournament modes', () => {
      const tournamentConfig = {
        tournament: {
          format: 'single-elimination' as const,
          rounds: 4,
          timePerRound: 30,
          bracketSize: 16,
          advancementRules: 'standard',
        },
      };
      const nonTournamentConfig = { timer: GAME_MODE_TEMPLATES.BLITZ.config.timer };

      expect(isTournamentMode(tournamentConfig)).toBe(true);
      expect(isTournamentMode(nonTournamentConfig)).toBe(false);
    });
  });

  describe('Validation functions', () => {
    it('should validate complete game mode without errors', () => {
      const gameMode: Partial<GameMode> = {
        id: 'test-mode',
        name: 'Test Mode',
        description: 'A test game mode',
        category: 'timer',
        config: { timer: GAME_MODE_TEMPLATES.BLITZ.config.timer },
        minimumPlayers: 2,
        maximumPlayers: 2,
        estimatedDuration: 15,
      };

      const errors = validateGameMode(gameMode);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for incomplete game mode', () => {
      const gameMode: Partial<GameMode> = {
        id: '',
        name: '',
        description: '',
        minimumPlayers: 3,
        maximumPlayers: 4,
        estimatedDuration: -5,
      };

      const errors = validateGameMode(gameMode);
      expect(errors).toContain('Game mode ID is required');
      expect(errors).toContain('Game mode name is required');
      expect(errors).toContain('Game mode description is required');
      expect(errors).toContain('Game mode category is required');
      expect(errors).toContain('Game mode config is required');
      expect(errors).toContain('Minimum players must be 2 for Othello');
      expect(errors).toContain('Maximum players must be 2 for Othello');
      expect(errors).toContain('Estimated duration must be positive');
    });

    it('should create game mode from template', () => {
      const gameMode = createGameModeFromTemplate(GAME_MODE_TEMPLATES.BLITZ, {
        id: 'custom-blitz',
        name: 'Custom Blitz',
        description: 'A custom blitz mode',
      });

      expect(gameMode.id).toBe('custom-blitz');
      expect(gameMode.name).toBe('Custom Blitz');
      expect(gameMode.description).toBe('A custom blitz mode');
      expect(gameMode.category).toBe('timer');
      expect(gameMode.config.timer).toBeDefined();
      expect(gameMode.minimumPlayers).toBe(2);
      expect(gameMode.maximumPlayers).toBe(2);
      expect(gameMode.isActive).toBe(true);
      expect(gameMode.isDefault).toBe(false);
    });

    it('should create game mode from template with overrides', () => {
      const gameMode = createGameModeFromTemplate(GAME_MODE_TEMPLATES.MINI_BOARD, {
        id: 'custom-mini',
        name: 'Custom Mini Board',
        description: 'A custom mini board mode',
        isDefault: true,
        tags: ['custom', 'mini'],
      });

      expect(gameMode.id).toBe('custom-mini');
      expect(gameMode.name).toBe('Custom Mini Board');
      expect(gameMode.isDefault).toBe(true);
      expect(gameMode.tags).toEqual(['custom', 'mini']);
      expect(gameMode.category).toBe('board-variant');
      expect(gameMode.config.board).toBeDefined();
    });
  });
});
