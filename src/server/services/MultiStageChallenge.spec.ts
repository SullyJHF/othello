import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Database } from '../database/Database';
import { AIResponseGeneratorService } from './AIResponseGeneratorService';
import { MultiStageChallenge, MultiStageChallengeConfig, StageConfig } from './MultiStageChallenge';

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

vi.mock('./AIResponseGeneratorService', () => ({
  AIResponseGeneratorService: vi.fn(() => ({
    getAIResponse: vi.fn(),
    generateAIResponse: vi.fn(),
  })),
}));

vi.mock('../ai/AIEngine', () => ({
  AIEngine: vi.fn(() => ({
    getBestMove: vi.fn(),
  })),
}));

describe('MultiStageChallenge', () => {
  let multiStageChallenge: MultiStageChallenge;
  let mockDb: any;
  let mockAIResponseService: any;
  let mockAIEngine: any;

  beforeEach(() => {
    vi.clearAllMocks();

    multiStageChallenge = new MultiStageChallenge();
    mockDb = (multiStageChallenge as any).db;
    mockAIResponseService = (multiStageChallenge as any).aiResponseService;
    mockAIEngine = (multiStageChallenge as any).aiEngine;

    // Default mock responses
    mockDb.query.mockResolvedValue({ rows: [] });
    mockAIResponseService.getAIResponse.mockResolvedValue(null);
    mockAIResponseService.generateAIResponse.mockResolvedValue({
      aiMove: 19,
      moveEvaluation: 150,
    });
    mockAIEngine.getBestMove.mockResolvedValue({
      move: 19,
      evaluation: 150,
    });
  });

  afterEach(() => {
    // Clear active sessions
    (multiStageChallenge as any).activeSessions.clear();
  });

  describe('initializeChallengeSession', () => {
    it('should initialize a new challenge session', async () => {
      const config: MultiStageChallengeConfig = {
        challengeId: 123,
        totalStages: 3,
        stageConfigs: [createMockStageConfig(1), createMockStageConfig(2), createMockStageConfig(3)],
        progressionRules: {
          type: 'linear',
          allowSkipOnExcellence: false,
          requirePerfectCompletion: false,
          difficultyAdjustment: 'static',
          retryPolicy: {
            maxAttemptsPerStage: 3,
            cooldownBetweenAttempts: 0,
            resetOnFailure: false,
            provideDiagnostics: true,
          },
        },
        errorRecovery: {
          saveProgressOnError: true,
          allowResumeFromFailure: true,
          maxRecoveryAttempts: 3,
          fallbackToManualMode: false,
        },
        performanceTracking: true,
      };

      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('challenge_123_user_user1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO challenge_sessions'),
        expect.arrayContaining([sessionId, 123, 'user1']),
      );
    });

    it('should reset existing session when configured', async () => {
      const config = createMockConfig();
      config.progressionRules.retryPolicy.resetOnFailure = true;

      // Mock existing session
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            session_id: 'existing_session',
            challenge_id: 123,
            user_id: 'user1',
            current_stage: 2,
            total_stages: 3,
            attempts: '[]',
            start_time: new Date(),
            last_activity: new Date(),
            is_active: true,
            is_completed: false,
            overall_accuracy: 50,
            total_time_spent: 1000,
            total_hints_used: 1,
            final_score: 0,
          },
        ],
      });

      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      expect(sessionId).toBeDefined();
      // Should create new session, not reuse existing
      expect(sessionId).not.toBe('existing_session');
    });

    it('should precompute stage responses', async () => {
      const config = createMockConfig();

      await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      expect(mockAIResponseService.getAIResponse).toHaveBeenCalledTimes(3); // 3 stages
      expect(mockAIResponseService.generateAIResponse).toHaveBeenCalledTimes(3); // No existing responses
    });
  });

  describe('processPlayerMove', () => {
    it('should process valid player move successfully', async () => {
      const config = createMockConfig();
      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      // Mock successful move validation
      vi.spyOn(multiStageChallenge as any, 'validatePlayerMove').mockResolvedValue(true);
      vi.spyOn(multiStageChallenge as any, 'evaluateStageCompletion').mockResolvedValue({
        completed: true,
        feedback: 'Perfect move!',
      });

      const result = await multiStageChallenge.processPlayerMove(sessionId, 1, 19, config);

      expect(result.success).toBe(true);
      expect(result.stageCompleted).toBe(true);
      expect(result.challengeCompleted).toBe(false);
      expect(result.feedback).toBe('Perfect move!');
      expect(result.aiResponse).toBe(19);
      expect(result.nextStage).toBe(2);
    });

    it('should handle invalid session', async () => {
      const config = createMockConfig();

      const result = await multiStageChallenge.processPlayerMove('invalid_session', 1, 19, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or inactive session');
    });

    it('should handle wrong stage number', async () => {
      const config = createMockConfig();
      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      const result = await multiStageChallenge.processPlayerMove(sessionId, 2, 19, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Expected stage 1, got 2');
    });

    it('should handle invalid move', async () => {
      const config = createMockConfig();
      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      vi.spyOn(multiStageChallenge as any, 'validatePlayerMove').mockResolvedValue(false);

      const result = await multiStageChallenge.processPlayerMove(sessionId, 1, 99, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid move');
    });

    it('should complete challenge when all stages completed', async () => {
      const config = createMockConfig();
      config.totalStages = 1; // Single stage challenge

      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      vi.spyOn(multiStageChallenge as any, 'validatePlayerMove').mockResolvedValue(true);
      vi.spyOn(multiStageChallenge as any, 'evaluateStageCompletion').mockResolvedValue({
        completed: true,
        feedback: 'Challenge completed!',
      });

      const result = await multiStageChallenge.processPlayerMove(sessionId, 1, 19, config);

      expect(result.success).toBe(true);
      expect(result.stageCompleted).toBe(true);
      expect(result.challengeCompleted).toBe(true);
      expect(result.nextStage).toBeUndefined();
    });

    it('should handle stage failure with retry allowed', async () => {
      const config = createMockConfig();
      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      vi.spyOn(multiStageChallenge as any, 'validatePlayerMove').mockResolvedValue(true);
      vi.spyOn(multiStageChallenge as any, 'evaluateStageCompletion').mockResolvedValue({
        completed: false,
        feedback: 'Try again',
      });

      const result = await multiStageChallenge.processPlayerMove(sessionId, 1, 19, config);

      expect(result.success).toBe(false);
      expect(result.stageCompleted).toBe(false);
      expect(result.feedback).toContain('Try again');
    });
  });

  describe('getHint', () => {
    it('should provide hint when available', async () => {
      const config = createMockConfig();
      config.stageConfigs[0].hintsAvailable = ['Look for corners', 'Check edges', 'Consider mobility'];

      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      // Start an attempt
      vi.spyOn(multiStageChallenge as any, 'validatePlayerMove').mockResolvedValue(true);
      vi.spyOn(multiStageChallenge as any, 'evaluateStageCompletion').mockResolvedValue({
        completed: false,
        feedback: 'Try again',
      });

      // Process a move to create an active attempt
      await multiStageChallenge.processPlayerMove(sessionId, 1, 19, config);

      const hintResult = await multiStageChallenge.getHint(sessionId, 1, config);

      expect(hintResult.hint).toBe('Look for corners');
      expect(hintResult.cost).toBe(10);
      expect(hintResult.hintsRemaining).toBe(2);
      expect(hintResult.error).toBeUndefined();
    });

    it('should handle session not found', async () => {
      const config = createMockConfig();

      const hintResult = await multiStageChallenge.getHint('invalid_session', 1, config);

      expect(hintResult.error).toBe('Session not found');
      expect(hintResult.hint).toBeUndefined();
    });

    it('should handle no hints available', async () => {
      const config = createMockConfig();
      config.stageConfigs[0].hintsAvailable = undefined;

      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      const hintResult = await multiStageChallenge.getHint(sessionId, 1, config);

      expect(hintResult.error).toBe('No hints available for this stage');
    });

    it('should handle all hints used', async () => {
      const config = createMockConfig();
      config.stageConfigs[0].hintsAvailable = ['Hint 1'];

      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      // Start attempt and use hint
      vi.spyOn(multiStageChallenge as any, 'validatePlayerMove').mockResolvedValue(true);
      vi.spyOn(multiStageChallenge as any, 'evaluateStageCompletion').mockResolvedValue({
        completed: false,
        feedback: 'Try again',
      });

      // Process a move to create an active attempt
      await multiStageChallenge.processPlayerMove(sessionId, 1, 19, config);

      // Use the first hint
      await multiStageChallenge.getHint(sessionId, 1, config);

      // Try to get another hint (should fail since only 1 hint available)
      const hintResult = await multiStageChallenge.getHint(sessionId, 1, config);

      expect(hintResult.error).toBe('All hints already used');
    });
  });

  describe('resetSession', () => {
    it('should reset session successfully', async () => {
      const config = createMockConfig();
      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      const result = await multiStageChallenge.resetSession(sessionId);

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO challenge_sessions'),
        expect.arrayContaining([sessionId]),
      );
    });

    it('should handle invalid session', async () => {
      const result = await multiStageChallenge.resetSession('invalid_session');

      expect(result).toBe(false);
    });
  });

  describe('getSessionProgress', () => {
    it('should return session progress', async () => {
      const config = createMockConfig();
      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      const progress = await multiStageChallenge.getSessionProgress(sessionId);

      expect(progress.session).toBeDefined();
      expect(progress.stageProgress).toHaveLength(3);
      expect(progress.stageProgress[0]).toEqual({
        stageNumber: 1,
        completed: false,
        attempts: 0,
        accuracy: 0,
        timeSpent: 0,
      });
    });

    it('should handle session not found', async () => {
      const progress = await multiStageChallenge.getSessionProgress('invalid_session');

      expect(progress.session).toBeUndefined();
      expect(progress.error).toBe('Session not found');
    });
  });

  describe('helper methods', () => {
    it('should validate board state conversion', () => {
      const challenge = new MultiStageChallenge();

      const stringState = `WWWWWWWWBBBBBBBB${'.'.repeat(48)}`;
      expect((challenge as any).boardStateToString(stringState)).toBe(stringState);

      const arrayState = ['W', 'W', 'B', 'B'];
      expect((challenge as any).boardStateToString(arrayState)).toBe('WWBB');

      const objectState = { state: stringState };
      expect((challenge as any).boardStateToString(objectState)).toBe(stringState);
    });

    it('should hash board states consistently', () => {
      const challenge = new MultiStageChallenge();

      const state1 = `WWWWWWWWBBBBBBBB${'.'.repeat(48)}`;
      const state2 = `WWWWWWWWBBBBBBBB${'.'.repeat(48)}`;
      const state3 = `BBBBBBBBWWWWWWWW${'.'.repeat(48)}`;

      const hash1 = (challenge as any).hashBoardState(state1);
      const hash2 = (challenge as any).hashBoardState(state2);
      const hash3 = (challenge as any).hashBoardState(state3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('should calculate move accuracy correctly', () => {
      const challenge = new MultiStageChallenge();

      // Perfect match
      expect((challenge as any).calculateMoveAccuracy([1, 2, 3], [1, 2, 3])).toBe(100);

      // Partial match
      expect((challenge as any).calculateMoveAccuracy([1, 2, 5], [1, 2, 3])).toBe(67);

      // No match
      expect((challenge as any).calculateMoveAccuracy([4, 5, 6], [1, 2, 3])).toBe(0);

      // Different lengths
      expect((challenge as any).calculateMoveAccuracy([1, 2], [1, 2, 3])).toBe(67);
    });

    it('should check move sequence matching', () => {
      const challenge = new MultiStageChallenge();

      expect((challenge as any).movesMatchSequence([1, 2, 3], [1, 2, 3])).toBe(true);
      expect((challenge as any).movesMatchSequence([1, 2, 5], [1, 2, 3])).toBe(false);
      expect((challenge as any).movesMatchSequence([1, 2], [1, 2, 3])).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle AI engine failures gracefully', async () => {
      const config = createMockConfig();
      const sessionId = await multiStageChallenge.initializeChallengeSession(123, 'user1', config);

      mockAIEngine.getBestMove.mockRejectedValue(new Error('AI failure'));
      vi.spyOn(multiStageChallenge as any, 'validatePlayerMove').mockResolvedValue(true);

      const result = await multiStageChallenge.processPlayerMove(sessionId, 1, 19, config);

      // Should not crash, should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle database failures gracefully', async () => {
      const config = createMockConfig();

      mockDb.query.mockRejectedValue(new Error('Database failure'));

      // Should not crash
      await expect(multiStageChallenge.initializeChallengeSession(123, 'user1', config)).rejects.toThrow(
        'Database failure',
      );
    });
  });
});

// Helper functions
function createMockStageConfig(stageNumber: number): StageConfig {
  return {
    stageNumber,
    name: `Stage ${stageNumber}`,
    description: `Test stage ${stageNumber}`,
    boardState: '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
    playerToMove: 'B',
    aiConfig: {
      strategy: 'alphabeta',
      difficulty: 3,
      maxTime: 2000,
      generateAlternatives: false,
      includeExplanation: false,
      validationRequired: false,
    },
    successCriteria: {
      requiredMoves: [19, 26, 37],
      accuracyThreshold: 80,
      allowHints: true,
    },
    failureHandling: {
      allowRetry: true,
      maxRetries: 3,
      provideFeedback: true,
      showSolution: false,
    },
    hintsAvailable: ['Look for corners', 'Check edges'],
  };
}

function createMockConfig(): MultiStageChallengeConfig {
  return {
    challengeId: 123,
    totalStages: 3,
    stageConfigs: [createMockStageConfig(1), createMockStageConfig(2), createMockStageConfig(3)],
    progressionRules: {
      type: 'linear',
      allowSkipOnExcellence: false,
      requirePerfectCompletion: false,
      difficultyAdjustment: 'static',
      retryPolicy: {
        maxAttemptsPerStage: 3,
        cooldownBetweenAttempts: 0,
        resetOnFailure: false,
        provideDiagnostics: true,
      },
    },
    errorRecovery: {
      saveProgressOnError: true,
      allowResumeFromFailure: true,
      maxRecoveryAttempts: 3,
      fallbackToManualMode: false,
    },
    performanceTracking: true,
  };
}
