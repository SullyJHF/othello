import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { Database } from '../database/Database';
import { Board } from '../models/Board';
import { AIResponseGeneratorService, AIResponseConfig } from './AIResponseGeneratorService';

// Mock the Database and AI Engine
vi.mock('../database/Database', () => {
  const mockDb = {
    query: vi.fn(),
    transaction: vi.fn(),
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

describe('AIResponseGeneratorService', () => {
  let service: AIResponseGeneratorService;
  let mockAIEngine: any;
  let mockDb: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create service instance
    service = new AIResponseGeneratorService();

    // Get mock instances
    mockAIEngine = (service as any).aiEngine;
    mockDb = (service as any).db;

    // Setup default mock responses
    mockDb.query.mockResolvedValue({ rows: [] });
    mockAIEngine.getBestMove.mockResolvedValue({
      move: 19, // D3 position
      evaluation: 150,
      searchDepth: 3,
      nodesSearched: 1234,
      timeElapsed: 500,
      strategy: 'alphabeta',
    });
    mockAIEngine.evaluatePosition.mockReturnValue(100);
  });

  describe('generateAIResponse', () => {
    it('should generate AI response for basic position', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
      const config: AIResponseConfig = {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      };

      const response = await service.generateAIResponse(boardState, 'B', config);

      expect(response).toBeDefined();
      expect(response.aiMove).toBe(19);
      expect(response.aiStrategy).toBe('alphabeta');
      expect(response.aiDifficulty).toBe(3);
      expect(response.moveEvaluation).toBe(150);
      expect(response.playerToMove).toBe('B');
      expect(response.sequenceStage).toBe(1);
      expect(response.moveNumber).toBe(1);
      expect(response.isPrimaryLine).toBe(true);
      expect(response.isRetaliationMove).toBe(false);
    });

    it('should generate alternatives when requested', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
      const config: AIResponseConfig = {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: true,
        includeExplanation: false,
        validationRequired: false,
      };

      // Mock valid moves for the board
      const validMoves = [18, 19, 20, 26, 29, 34, 37, 43, 44, 45];
      vi.spyOn(service as any, 'getValidMoves').mockReturnValue(validMoves);

      const response = await service.generateAIResponse(boardState, 'B', config);

      expect(response.alternativeMoves).toBeDefined();
      expect(Array.isArray(response.alternativeMoves)).toBe(true);
    });

    it('should generate move explanation when requested', async () => {
      const boardState =
        'W.......' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
      const config: AIResponseConfig = {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: false,
        includeExplanation: true,
        validationRequired: false,
      };

      // Mock corner move
      mockAIEngine.getBestMove.mockResolvedValue({
        move: 0, // Corner move
        evaluation: 500,
        searchDepth: 3,
        nodesSearched: 1234,
        timeElapsed: 500,
        strategy: 'alphabeta',
      });

      const response = await service.generateAIResponse(boardState, 'B', config);

      expect(response.moveExplanation).toBeDefined();
      expect(response.tacticalThemes).toBeDefined();
      expect(response.tacticalThemes).toContain('corner-control');
    });

    it('should classify position types correctly', async () => {
      const earlyGameBoard =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';

      const config: AIResponseConfig = {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      };

      const response = await service.generateAIResponse(earlyGameBoard, 'B', config);

      expect(response.positionType).toBe('opening');
    });

    it('should handle challenge and game associations', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
      const config: AIResponseConfig = {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      };

      const response = await service.generateAIResponse(boardState, 'B', config, 123, 'game-456', 2, 3);

      expect(response.challengeId).toBe(123);
      expect(response.gameId).toBe('game-456');
      expect(response.sequenceStage).toBe(2);
      expect(response.moveNumber).toBe(3);
    });
  });

  describe('storeAIResponse', () => {
    it('should store AI response in database', async () => {
      const responseData = {
        challengeId: 123,
        gameId: 'game-456',
        boardState: { state: 'test-board' },
        playerToMove: 'B' as const,
        sequenceStage: 1,
        moveNumber: 1,
        aiMove: 19,
        aiStrategy: 'alphabeta' as const,
        aiDifficulty: 3,
        moveEvaluation: 150,
        searchDepth: 3,
        nodesSearched: 1234,
        calculationTime: 500,
        alternativeMoves: [],
        tacticalThemes: ['corner-control'],
        difficultyRating: 'intermediate',
        isPrimaryLine: true,
        isRetaliationMove: false,
        positionType: 'tactical',
        isForcingSequence: false,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 789 }] });

      const resultId = await service.storeAIResponse(responseData);

      expect(resultId).toBe(789);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_response_moves'),
        expect.arrayContaining([
          123,
          'game-456',
          JSON.stringify({ state: 'test-board' }),
          'B',
          1,
          1,
          19,
          'alphabeta',
          3,
          150,
          3,
          1234,
          500,
          JSON.stringify([]),
          null,
          null,
          null,
          ['corner-control'],
          'intermediate',
          true,
          false,
          null,
          'tactical',
          false,
        ]),
      );
    });

    it('should store alternative moves when provided', async () => {
      const responseData = {
        challengeId: 123,
        boardState: { state: 'test-board' },
        playerToMove: 'B' as const,
        sequenceStage: 1,
        moveNumber: 1,
        aiMove: 19,
        aiStrategy: 'alphabeta' as const,
        aiDifficulty: 3,
        moveEvaluation: 150,
        searchDepth: 3,
        calculationTime: 500,
        alternativeMoves: [
          {
            move: 18,
            evaluation: 120,
            difference: 30,
            classification: 'good',
            explanation: 'Good alternative move',
          },
        ],
        tacticalThemes: [],
        difficultyRating: 'intermediate',
        isPrimaryLine: true,
        isRetaliationMove: false,
        positionType: 'tactical',
        isForcingSequence: false,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 789 }] }).mockResolvedValueOnce({ rows: [] });

      await service.storeAIResponse(responseData);

      // Should call query twice: once for main response, once for alternatives
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO ai_move_alternatives'),
        expect.arrayContaining([789, 18, 120, 30, 'good', 'Good alternative move']),
      );
    });
  });

  describe('generateChallengeResponses', () => {
    it('should generate complete challenge responses', async () => {
      const challengeData = {
        id: 123,
        initialBoardState:
          '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
        currentPlayer: 'B',
      };

      const config: AIResponseConfig = {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: true,
        includeExplanation: true,
        validationRequired: false,
      };

      // Mock challenge lookup
      vi.spyOn(service as any, 'getChallengeById').mockResolvedValue(challengeData);

      // Mock store methods
      vi.spyOn(service, 'storeAIResponse').mockResolvedValue(789);

      // Mock retaliation moves generation
      vi.spyOn(service as any, 'generateRetaliationMoves').mockResolvedValue([
        {
          challengeId: 123,
          boardState: challengeData.initialBoardState,
          playerToMove: 'W',
          aiMove: 20,
          isRetaliationMove: true,
          triggersOnPlayerMove: 18,
        },
      ]);

      const responseIds = await service.generateChallengeResponses(123, config);

      expect(responseIds).toHaveLength(2); // Initial + 1 retaliation
      expect(responseIds).toContain(789);
    });

    it('should throw error for non-existent challenge', async () => {
      const config: AIResponseConfig = {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      };

      // Mock challenge lookup to return null
      vi.spyOn(service as any, 'getChallengeById').mockResolvedValue(null);

      await expect(service.generateChallengeResponses(999, config)).rejects.toThrow('Challenge with ID 999 not found');
    });
  });

  describe('getAIResponse', () => {
    it('should retrieve AI response by board hash', async () => {
      const mockResponse = {
        id: 123,
        ai_move: 19,
        move_evaluation: 150,
        board_state: '{"state":"test"}',
      };

      mockDb.query.mockResolvedValue({ rows: [mockResponse] });

      const response = await service.getAIResponse('test-hash', 'B');

      expect(response).toEqual(mockResponse);
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM ai_response_moves'), [
        'test-hash',
        'B',
      ]);
    });

    it('should filter by challenge and sequence stage', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await service.getAIResponse('test-hash', 'B', 123, 2);

      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('challenge_id = $3'), [
        'test-hash',
        'B',
        123,
        2,
      ]);
    });

    it('should return null when no response found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const response = await service.getAIResponse('nonexistent-hash', 'B');

      expect(response).toBeNull();
    });
  });

  describe('validateStoredResponses', () => {
    it('should validate and update stored responses', async () => {
      const mockStoredResponses = [
        {
          id: 1,
          board_state: '{"state":"test"}',
          player_to_move: 'B',
          ai_strategy: 'alphabeta',
          ai_difficulty: 3,
          ai_move: 19,
          move_evaluation: 150,
        },
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockStoredResponses }).mockResolvedValueOnce({ rows: [] });

      // Mock recalculation to match stored values
      mockAIEngine.getBestMove.mockResolvedValue({
        move: 19,
        evaluation: 150,
        searchDepth: 3,
        nodesSearched: 1234,
        timeElapsed: 500,
        strategy: 'alphabeta',
      });

      const result = await service.validateStoredResponses();

      expect(result.validated).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ai_response_moves SET validation_score'),
        expect.arrayContaining([10, 1]), // Perfect validation score
      );
    });

    it('should handle validation failures gracefully', async () => {
      const mockStoredResponses = [
        {
          id: 1,
          board_state: '{"state":"test"}',
          player_to_move: 'B',
          ai_strategy: 'alphabeta',
          ai_difficulty: 3,
          ai_move: 19,
          move_evaluation: 150,
        },
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockStoredResponses });

      // Mock AI engine to throw error
      mockAIEngine.getBestMove.mockRejectedValue(new Error('AI calculation failed'));

      const result = await service.validateStoredResponses();

      expect(result.validated).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('helper methods', () => {
    it('should classify position types correctly', () => {
      const service = new AIResponseGeneratorService();

      // Mock board with different piece counts
      const earlyGameBoard = new Board(
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
      );

      const midGameBoard = new Board(
        '........' + '.WWWWW..' + '.WBBBB..' + '.WBWWB..' + '.WBWWB..' + '.WBBBB..' + '.WWWWW..' + '........',
      );

      const aiResult = { move: 19, evaluation: 150 } as any;

      expect((service as any).classifyPosition(earlyGameBoard, aiResult)).toBe('opening');
      expect((service as any).classifyPosition(midGameBoard, aiResult)).toBe('midgame');
    });

    it('should determine difficulty ratings correctly', () => {
      const service = new AIResponseGeneratorService();

      const aiResult = { evaluation: 150 } as any;
      const alternatives: any[] = [];

      expect((service as any).determineDifficultyRating(aiResult, alternatives, 1)).toBe('beginner');
      expect((service as any).determineDifficultyRating(aiResult, alternatives, 3)).toBe('intermediate');
      expect((service as any).determineDifficultyRating(aiResult, alternatives, 5)).toBe('advanced');
      expect((service as any).determineDifficultyRating(aiResult, alternatives, 6)).toBe('expert');
    });

    it('should generate move explanations with themes', () => {
      const service = new AIResponseGeneratorService();
      const board = new Board(
        'W.......' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
      );

      const aiResult = {
        move: 0, // Corner move
        evaluation: 500,
      } as any;

      const result = (service as any).generateMoveExplanation(board, aiResult, 'B');

      expect(result.explanation).toContain('corner');
      expect(result.themes).toContain('corner-control');
    });

    it('should convert board states correctly', () => {
      const service = new AIResponseGeneratorService();

      const stringState = `WWWWWWWWBBBBBBBB${'0'.repeat(48)}`;
      expect((service as any).boardStateToString(stringState)).toBe(stringState);

      const arrayState = ['W', 'W', 'B', 'B'];
      expect((service as any).boardStateToString(arrayState)).toBe('WWBB');

      const objectState = { state: stringState };
      expect((service as any).boardStateToString(objectState)).toBe(stringState);
    });
  });

  describe('error handling', () => {
    it('should handle AI engine failures gracefully', async () => {
      const boardState =
        '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........';
      const config: AIResponseConfig = {
        strategy: 'alphabeta',
        difficulty: 3,
        maxTime: 2000,
        generateAlternatives: false,
        includeExplanation: false,
        validationRequired: false,
      };

      mockAIEngine.getBestMove.mockRejectedValue(new Error('AI calculation failed'));

      await expect(service.generateAIResponse(boardState, 'B', config)).rejects.toThrow('AI calculation failed');
    });

    it('should handle database failures gracefully', async () => {
      const responseData = {
        boardState: { state: 'test-board' },
        playerToMove: 'B' as const,
        sequenceStage: 1,
        moveNumber: 1,
        aiMove: 19,
        aiStrategy: 'alphabeta' as const,
        aiDifficulty: 3,
        moveEvaluation: 150,
        searchDepth: 3,
        calculationTime: 500,
        tacticalThemes: [],
        difficultyRating: 'intermediate',
        isPrimaryLine: true,
        isRetaliationMove: false,
        positionType: 'tactical',
        isForcingSequence: false,
      };

      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(service.storeAIResponse(responseData)).rejects.toThrow('Database error');
    });
  });
});
