import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChallengeBuilder, ChallengeTemplate, ValidationConfig } from './ChallengeBuilder';
import { Database } from '../database/Database';
import { AIEngine } from '../ai/AIEngine';
import { AIResponseGeneratorService } from '../services/AIResponseGeneratorService';
import { MultiStageChallenge } from '../services/MultiStageChallenge';

// Mock dependencies
vi.mock('../database/Database', () => {
  const mockDb = {
    query: vi.fn(),
  };

  return {
    Database: {
      getInstance: vi.fn(() => mockDb),
    },
  };
});

vi.mock('../ai/AIEngine', () => ({
  AIEngine: vi.fn(() => ({
    getBestMove: vi.fn(),
    evaluatePosition: vi.fn(),
  })),
}));

vi.mock('../services/AIResponseGeneratorService', () => ({
  AIResponseGeneratorService: vi.fn(() => ({
    generateChallengeResponses: vi.fn(),
  })),
}));

vi.mock('../services/MultiStageChallenge', () => ({
  MultiStageChallenge: vi.fn(() => ({
    initializeChallengeSession: vi.fn(),
  })),
}));

describe('ChallengeBuilder', () => {
  let challengeBuilder: ChallengeBuilder;
  let mockDb: any;
  let mockAIEngine: any;
  let mockAIResponseService: any;
  let mockMultiStageEngine: any;

  beforeEach(() => {
    vi.clearAllMocks();

    challengeBuilder = new ChallengeBuilder();
    mockDb = (challengeBuilder as any).db;
    mockAIEngine = (challengeBuilder as any).aiEngine;
    mockAIResponseService = (challengeBuilder as any).aiResponseService;
    mockMultiStageEngine = (challengeBuilder as any).multiStageEngine;

    // Default mock responses
    mockDb.query.mockResolvedValue({ rows: [{ id: 123 }] });
    mockAIEngine.getBestMove.mockResolvedValue({
      move: 19,
      evaluation: 150,
      searchDepth: 3,
      nodesSearched: 1234,
      timeElapsed: 500,
      strategy: 'alphabeta',
    });
    mockAIEngine.evaluatePosition.mockReturnValue(100);
    mockAIResponseService.generateChallengeResponses.mockResolvedValue([1, 2, 3]);
    mockMultiStageEngine.initializeChallengeSession.mockResolvedValue('session-123');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createChallengeFromTemplate', () => {
    let basicTemplate: ChallengeTemplate;

    beforeEach(() => {
      basicTemplate = {
        name: 'Basic Tactical Challenge',
        description: 'A simple tactical challenge for beginners',
        category: 'tactical',
        difficulty: 2,
        estimatedTime: 5,
        tags: ['tactical', 'beginner'],
        boardSetup: {
          size: 8,
          initialState:
            '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
          currentPlayer: 'B',
        },
        objectives: {
          primary: 'Find the best tactical move',
          successCriteria: {
            requiredMoves: [19, 26],
            minimumAccuracy: 80,
          },
        },
        hints: [
          { text: 'Look for corner opportunities', cost: 10 },
          { text: 'Consider edge control', cost: 15 },
        ],
      };
    });

    it('should create a single-stage challenge successfully', async () => {
      const result = await challengeBuilder.createChallengeFromTemplate(basicTemplate);

      expect(result.success).toBe(true);
      expect(result.challengeId).toBe(123);
      expect(result.validation.boardValid).toBe(true);
      expect(result.validation.solutionValid).toBe(true);
      expect(result.validation.aiResponsesGenerated).toBe(3);
      expect(result.validation.validationScore).toBeGreaterThan(70);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO daily_challenges'),
        expect.arrayContaining([
          expect.any(String), // date
          'Basic Tactical Challenge',
          'A simple tactical challenge for beginners',
          2,
          'tactical',
        ]),
      );
    });

    it('should create a multi-stage challenge successfully', async () => {
      const multiStageTemplate: ChallengeTemplate = {
        ...basicTemplate,
        progression: {
          isMultiStage: true,
          totalStages: 2,
          stageConfigs: [
            {
              name: 'Stage 1',
              description: 'First stage',
              boardState: basicTemplate.boardSetup.initialState,
              playerToMove: 'B',
              successCriteria: {
                requiredMoves: [19],
                accuracyThreshold: 80,
                allowHints: true,
              },
              failureHandling: {
                allowRetry: true,
                maxRetries: 3,
                provideFeedback: true,
                showSolution: false,
              },
            },
            {
              name: 'Stage 2',
              description: 'Second stage',
              boardState:
                '........' + '........' + '...B....' + '...BB...' + '...BW...' + '........' + '........' + '........',
              playerToMove: 'W',
              successCriteria: {
                requiredMoves: [26],
                accuracyThreshold: 80,
                allowHints: true,
              },
              failureHandling: {
                allowRetry: true,
                maxRetries: 3,
                provideFeedback: true,
                showSolution: false,
              },
            },
          ],
        },
      };

      const result = await challengeBuilder.createChallengeFromTemplate(multiStageTemplate);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session-123');
      expect(mockMultiStageEngine.initializeChallengeSession).toHaveBeenCalledWith(
        123,
        'builder_session',
        expect.objectContaining({
          challengeId: 123,
          totalStages: 2,
          stageConfigs: expect.arrayContaining([
            expect.objectContaining({
              stageNumber: 1,
              name: 'Stage 1',
            }),
            expect.objectContaining({
              stageNumber: 2,
              name: 'Stage 2',
            }),
          ]),
        }),
      );
    });

    it('should fail with invalid board setup', async () => {
      const invalidTemplate: ChallengeTemplate = {
        ...basicTemplate,
        boardSetup: {
          size: 8,
          initialState: 'invalid-board-state',
          currentPlayer: 'B',
        },
      };

      const result = await challengeBuilder.createChallengeFromTemplate(invalidTemplate);

      expect(result.success).toBe(false);
      expect(result.validation.boardValid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should apply custom validation config', async () => {
      const customValidation: ValidationConfig = {
        strategy: 'minimax',
        difficulty: 5,
        maxCalculationTime: 10000,
        requireOptimal: false,
        toleranceThreshold: 100,
      };

      const result = await challengeBuilder.createChallengeFromTemplate(basicTemplate, customValidation);

      expect(mockAIEngine.getBestMove).toHaveBeenCalledWith(expect.any(Object), 'B', 'minimax', 5, 10000);
    });

    it('should handle AI engine failures gracefully', async () => {
      mockAIEngine.getBestMove.mockRejectedValue(new Error('AI calculation failed'));

      const result = await challengeBuilder.createChallengeFromTemplate(basicTemplate);

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle database failures gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const result = await challengeBuilder.createChallengeFromTemplate(basicTemplate);

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('calibrateDifficulty', () => {
    const boardSetup = {
      size: 8 as const,
      initialState:
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
      currentPlayer: 'B' as const,
    };

    it('should recommend appropriate difficulty for simple position', async () => {
      const solution = [19]; // Single move solution

      const calibration = await challengeBuilder.calibrateDifficulty(boardSetup, solution);

      expect(calibration.recommendedDifficulty).toBeGreaterThanOrEqual(1);
      expect(calibration.recommendedDifficulty).toBeLessThanOrEqual(5);
      expect(calibration.analysisMetrics.solutionDepth).toBe(1);
      expect(calibration.analysisMetrics.timeEstimate).toBeGreaterThan(0);
      expect(calibration.adjustmentReasons).toBeInstanceOf(Array);
    });

    it('should recommend higher difficulty for complex position', async () => {
      const complexSolution = [19, 26, 37, 44, 51]; // Multi-move solution

      const calibration = await challengeBuilder.calibrateDifficulty(boardSetup, complexSolution);

      expect(calibration.recommendedDifficulty).toBeGreaterThan(2);
      expect(calibration.analysisMetrics.solutionDepth).toBe(5);
      expect(calibration.adjustmentReasons.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const invalidBoardSetup = {
        size: 8 as const,
        initialState: 'invalid',
        currentPlayer: 'B' as const,
      };

      const calibration = await challengeBuilder.calibrateDifficulty(invalidBoardSetup, [19]);

      expect(calibration.recommendedDifficulty).toBeGreaterThanOrEqual(1); // Default value
      expect(calibration.analysisMetrics.positionComplexity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateSolution', () => {
    const boardSetup = {
      size: 8 as const,
      initialState:
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
      currentPlayer: 'B' as const,
    };

    const validationConfig: ValidationConfig = {
      strategy: 'alphabeta',
      difficulty: 3,
      maxCalculationTime: 2000,
      requireOptimal: true,
      toleranceThreshold: 50,
    };

    it('should validate optimal solution', async () => {
      const successCriteria = {
        requiredMoves: [19],
        minimumAccuracy: 80,
      };

      // Mock AI to return the same move as required
      mockAIEngine.getBestMove.mockResolvedValue({
        move: 19,
        evaluation: 150,
      });

      const result = await challengeBuilder.validateSolution(boardSetup, successCriteria, validationConfig);

      expect(result.valid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.errors).toHaveLength(0);
      expect(result.aiAnalysis?.bestMove).toBe(19);
    });

    it('should flag non-optimal solution when required', async () => {
      const successCriteria = {
        requiredMoves: [18], // Different from AI best move
        minimumAccuracy: 80,
      };

      // Mock AI to return different move
      mockAIEngine.getBestMove.mockResolvedValue({
        move: 19,
        evaluation: 150,
      });

      // Mock evaluation for the required move to be significantly worse
      vi.spyOn(challengeBuilder as any, 'evaluateMove').mockReturnValue(50);

      const result = await challengeBuilder.validateSolution(boardSetup, successCriteria, validationConfig);

      expect(result.valid).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept near-optimal solution within tolerance', async () => {
      const successCriteria = {
        requiredMoves: [18],
        minimumAccuracy: 80,
      };

      mockAIEngine.getBestMove.mockResolvedValue({
        move: 19,
        evaluation: 150,
      });

      // Mock evaluation for required move to be within tolerance
      vi.spyOn(challengeBuilder as any, 'evaluateMove').mockReturnValue(140);

      const result = await challengeBuilder.validateSolution(boardSetup, successCriteria, {
        ...validationConfig,
        toleranceThreshold: 50,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate alternative solutions', async () => {
      const successCriteria = {
        requiredMoves: [19],
        alternativeSolutions: [[18], [20]],
        minimumAccuracy: 80,
      };

      vi.spyOn(challengeBuilder as any, 'evaluateMoveSequence').mockReturnValue(130);

      const result = await challengeBuilder.validateSolution(boardSetup, successCriteria, validationConfig);

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });
  });

  describe('testChallenge', () => {
    beforeEach(() => {
      // Mock challenge data
      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 123,
            board_state:
              '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
            current_player: 'B',
            solution: { moves: [19] },
          },
        ],
      });
    });

    it('should test challenge with different configurations', async () => {
      const testConfig = {
        iterations: 2,
        strategies: ['alphabeta' as const, 'minimax' as const],
        difficulties: [3, 4],
        timeouts: [1000, 2000],
      };

      // Mock AI to return the correct move
      mockAIEngine.getBestMove.mockResolvedValue({
        move: 19,
        evaluation: 150,
      });

      const result = await challengeBuilder.testChallenge(123, testConfig);

      expect(result.results).toHaveLength(16); // 2 iterations * 2 strategies * 2 difficulties * 2 timeouts = 16 combinations
      expect(result.summary.averageAccuracy).toBe(100);
      expect(result.summary.successRate).toBe(1);
      expect(result.summary.recommendedSettings.strategy).toBeDefined();
      expect(result.summary.recommendedSettings.difficulty).toBeDefined();
      expect(result.summary.recommendedSettings.timeout).toBeDefined();
    });

    it('should handle AI failures in testing', async () => {
      const testConfig = {
        iterations: 1,
        strategies: ['alphabeta' as const],
        difficulties: [3],
        timeouts: [1000],
      };

      mockAIEngine.getBestMove.mockRejectedValue(new Error('AI failure'));

      const result = await challengeBuilder.testChallenge(123, testConfig);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].accuracy).toBe(0);
      expect(result.summary.successRate).toBe(0);
    });

    it('should throw error for non-existent challenge', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(
        challengeBuilder.testChallenge(999, {
          iterations: 1,
          strategies: ['alphabeta'],
          difficulties: [3],
          timeouts: [1000],
        }),
      ).rejects.toThrow('Challenge 999 not found');
    });
  });

  describe('helper methods', () => {
    it('should validate board setup correctly', async () => {
      const validSetup = {
        size: 8 as const,
        initialState:
          '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
        currentPlayer: 'B' as const,
      };

      const result = await (challengeBuilder as any).validateBoardSetup(validSetup);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid board setup', async () => {
      const invalidSetup = {
        size: 8 as const,
        initialState: 'too-short',
        currentPlayer: 'B' as const,
      };

      const result = await (challengeBuilder as any).validateBoardSetup(invalidSetup);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should evaluate move correctly', () => {
      const board = { boardState: 'test-board', pieces: [] };

      // Mock the aiEngine.evaluatePosition method
      mockAIEngine.evaluatePosition.mockReturnValue(100);

      const evaluation = (challengeBuilder as any).evaluateMove(board, 19, 'B');

      expect(evaluation).toBeDefined();
    });

    it('should get valid moves correctly', () => {
      const mockBoard = {
        canPlacePiece: vi.fn((i, player) => [18, 19, 26, 27].includes(i)),
      };

      const validMoves = (challengeBuilder as any).getValidMoves(mockBoard, 'B');

      expect(validMoves).toEqual([18, 19, 26, 27]);
    });

    it('should count pieces correctly', () => {
      const mockBoard = {
        pieces: ['W', 'W', 'B', 'B', '.', '.', 'W', 'B'],
      };

      const count = (challengeBuilder as any).getTotalPieceCount(mockBoard);

      expect(count).toBe(6); // 3 W + 3 B
    });

    it('should evaluate position complexity', () => {
      const mockBoard = {
        pieces: Array(64).fill('.'),
      };
      // Set up some pieces
      mockBoard.pieces[0] = 'W'; // Corner
      mockBoard.pieces[7] = 'B'; // Corner
      mockBoard.pieces[27] = 'W';
      mockBoard.pieces[36] = 'B';

      const complexity = (challengeBuilder as any).evaluatePositionComplexity(mockBoard);

      expect(complexity).toBeGreaterThan(0);
    });

    it('should calculate validation score correctly', () => {
      const validation = {
        boardValid: true,
        solutionValid: true,
        aiResponsesGenerated: 3,
        validationScore: 0,
      };

      const score = (challengeBuilder as any).calculateValidationScore(validation, 90);

      expect(score).toBe(99); // 30 + 40 + 20 + 9 = 99
    });

    it('should find optimal settings from results', () => {
      const results = [
        {
          strategy: 'alphabeta' as const,
          difficulty: 3,
          timeout: 1000,
          success: true,
          accuracy: 95,
          timeSpent: 800,
        },
        {
          strategy: 'minimax' as const,
          difficulty: 4,
          timeout: 2000,
          success: true,
          accuracy: 90,
          timeSpent: 1500,
        },
      ];

      const optimal = (challengeBuilder as any).findOptimalSettings(results);

      expect(optimal.strategy).toBe('alphabeta');
      expect(optimal.difficulty).toBe(3);
      expect(optimal.timeout).toBe(1000);
    });

    it('should return default settings when no successful results', () => {
      const results = [
        {
          strategy: 'alphabeta' as const,
          difficulty: 3,
          timeout: 1000,
          success: false,
          accuracy: 0,
          timeSpent: 1000,
        },
      ];

      const optimal = (challengeBuilder as any).findOptimalSettings(results);

      expect(optimal.strategy).toBe('alphabeta');
      expect(optimal.difficulty).toBe(3);
      expect(optimal.timeout).toBe(2000);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Connection failed'));

      const template: ChallengeTemplate = {
        name: 'Test Challenge',
        description: 'Test',
        category: 'tactical',
        difficulty: 2,
        estimatedTime: 5,
        tags: ['test'],
        boardSetup: {
          size: 8,
          initialState:
            '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
          currentPlayer: 'B',
        },
        objectives: {
          primary: 'Test objective',
          successCriteria: {
            requiredMoves: [19],
            minimumAccuracy: 80,
          },
        },
      };

      const result = await challengeBuilder.createChallengeFromTemplate(template);

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle multi-stage configuration errors', async () => {
      const invalidMultiStageTemplate: ChallengeTemplate = {
        name: 'Invalid Multi-Stage',
        description: 'Test',
        category: 'tactical',
        difficulty: 2,
        estimatedTime: 5,
        tags: ['test'],
        boardSetup: {
          size: 8,
          initialState:
            '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
          currentPlayer: 'B',
        },
        objectives: {
          primary: 'Test objective',
          successCriteria: {
            requiredMoves: [19],
            minimumAccuracy: 80,
          },
        },
        progression: {
          isMultiStage: true,
          totalStages: 2,
          // Missing stageConfigs
        },
      };

      mockMultiStageEngine.initializeChallengeSession.mockRejectedValue(
        new Error('Multi-stage challenge requires stage configurations'),
      );

      const result = await challengeBuilder.createChallengeFromTemplate(invalidMultiStageTemplate);

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });
});
