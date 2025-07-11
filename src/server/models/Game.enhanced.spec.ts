import { describe, it, expect, beforeEach } from 'vitest';
import { ChallengeConfig } from '../../shared/types/gameModeTypes';
import { Game } from './Game';

describe('Game - Enhanced AI Integration', () => {
  let game: Game;
  let challengeOptions: any;

  beforeEach(() => {
    const challengeConfig: ChallengeConfig = {
      type: 'tactical',
      difficulty: 3,
      maxAttempts: 5,
      timeLimit: 300,
      hints: [
        { order: 1, text: 'Look for corners', cost: 10 },
        { order: 2, text: 'Consider edges', cost: 15 },
      ],
      solution: {
        moves: [19, 26, 37],
        explanation: 'This tactical sequence demonstrates optimal corner control.',
        alternativeSolutions: [[18, 25, 36]],
      },
      tags: ['tactical', 'corners'],
    };

    challengeOptions = {
      boardState: '........' + '........' + '........' + '...WB...' + '...BW...' + '........' + '........' + '........',
      currentPlayer: 'B' as const,
      challengeId: 'test-challenge-123',
      challengeConfig,
    };

    game = new Game(undefined, undefined, challengeOptions);
  });

  describe('Basic AI Integration', () => {
    it('should initialize challenge with AI configuration', () => {
      expect(game.isChallenge).toBe(true);
      expect(game.challengeData).toBeDefined();
      expect(game.challengeData?.aiStrategy).toBe('alphabeta');
      expect(game.challengeData?.aiDifficulty).toBe(3);
      expect(game.challengeData?.currentStage).toBe(1);
      expect(game.challengeData?.totalStages).toBe(1);
      expect(game.challengeData?.isMultiStage).toBe(false);
      expect(game.challengeData?.moveSequences).toEqual([]);
      expect(game.challengeData?.overallAccuracy).toBe(0);
      expect(game.challengeData?.totalTimeSpent).toBe(0);
    });

    it('should get AI configuration', () => {
      const aiConfig = game.getAIConfiguration();

      expect(aiConfig).toEqual({
        strategy: 'alphabeta',
        difficulty: 3,
      });
    });

    it('should update AI configuration', () => {
      game.updateAIConfiguration('minimax', 5);

      const aiConfig = game.getAIConfiguration();
      expect(aiConfig?.strategy).toBe('minimax');
      expect(aiConfig?.difficulty).toBe(5);
    });

    it('should clamp AI difficulty to valid range', () => {
      game.updateAIConfiguration('alphabeta', 10);
      expect(game.getAIConfiguration()?.difficulty).toBe(6);

      game.updateAIConfiguration('alphabeta', -1);
      expect(game.getAIConfiguration()?.difficulty).toBe(1);
    });

    it('should include AI configuration in challenge status', () => {
      const status = game.getChallengeStatus();

      expect(status).toBeDefined();
      expect(status?.aiStrategy).toBe('alphabeta');
      expect(status?.aiDifficulty).toBe(3);
      expect(status?.currentStage).toBe(1);
      expect(status?.totalStages).toBe(1);
      expect(status?.isMultiStage).toBe(false);
      expect(status?.sessionId).toBeUndefined();
    });
  });

  describe('Multi-Stage Challenge Support', () => {
    it('should initialize multi-stage challenge', () => {
      const sessionId = 'test-session-123';

      game.initializeMultiStageChallenge(sessionId, 3, 'minimax', 4);

      expect(game.challengeData?.sessionId).toBe(sessionId);
      expect(game.challengeData?.totalStages).toBe(3);
      expect(game.challengeData?.isMultiStage).toBe(true);
      expect(game.challengeData?.aiStrategy).toBe('minimax');
      expect(game.challengeData?.aiDifficulty).toBe(4);
      expect(game.challengeData?.currentStage).toBe(1);
    });

    it('should throw error when initializing multi-stage on non-challenge game', () => {
      const regularGame = new Game();

      expect(() => {
        regularGame.initializeMultiStageChallenge('session-123', 3);
      }).toThrow('Cannot initialize multi-stage challenge on non-challenge game');
    });

    it('should advance to next stage', () => {
      game.initializeMultiStageChallenge('session-123', 3);

      expect(game.challengeData?.currentStage).toBe(1);

      const advanced = game.advanceToNextStage();
      expect(advanced).toBe(true);
      expect(game.challengeData?.currentStage).toBe(2);

      game.advanceToNextStage();
      expect(game.challengeData?.currentStage).toBe(3);

      // Cannot advance beyond total stages
      const cannotAdvance = game.advanceToNextStage();
      expect(cannotAdvance).toBe(false);
      expect(game.challengeData?.currentStage).toBe(3);
    });

    it('should check multi-stage challenge completion', () => {
      game.initializeMultiStageChallenge('session-123', 2);

      expect(game.isMultiStageChallengeCompleted()).toBe(false);

      game.advanceToNextStage(); // Stage 2
      expect(game.isMultiStageChallengeCompleted()).toBe(false);

      game.advanceToNextStage(); // Try to go beyond last stage (this returns false)

      // Manually set to completed state for testing
      if (game.challengeData) {
        game.challengeData.currentStage = 3; // Beyond totalStages (2)
      }
      expect(game.isMultiStageChallengeCompleted()).toBe(true);
    });

    it('should get current stage progress', () => {
      game.initializeMultiStageChallenge('session-123', 3);

      const progress = game.getCurrentStageProgress();

      expect(progress).toEqual({
        currentStage: 1,
        totalStages: 3,
        currentStageSequences: [],
        stageProgress: 0,
        stageCompleted: false,
      });
    });
  });

  describe('Move Sequence Recording', () => {
    beforeEach(() => {
      game.initializeMultiStageChallenge('session-123', 2);
    });

    it('should record move sequence without AI response', () => {
      game.recordMoveSequence(1, 19, undefined, 85, 1500, 1);

      expect(game.challengeData?.moveSequences).toHaveLength(1);

      const sequence = game.challengeData?.moveSequences[0];
      expect(sequence?.stageNumber).toBe(1);
      expect(sequence?.playerMove).toBe(19);
      expect(sequence?.aiResponse).toBeUndefined();
      expect(sequence?.completed).toBe(false);
      expect(sequence?.accuracy).toBe(85);
      expect(sequence?.timeSpent).toBe(1500);
      expect(sequence?.hintsUsed).toBe(1);
      expect(sequence?.boardAfterPlayer).toBeDefined();
      expect(sequence?.boardAfterAI).toBeUndefined();
    });

    it('should record complete move sequence with AI response', () => {
      game.recordMoveSequence(1, 19, 26, 90, 2000, 0);

      const sequence = game.challengeData?.moveSequences[0];
      expect(sequence?.aiResponse).toBe(26);
      expect(sequence?.completed).toBe(true);
      expect(sequence?.boardAfterAI).toBeDefined();
    });

    it('should update overall metrics when recording sequences', () => {
      game.recordMoveSequence(1, 19, 26, 85, 1500, 1);
      game.recordMoveSequence(1, 18, 25, 95, 1000, 0);

      expect(game.challengeData?.totalTimeSpent).toBe(2500);
      expect(game.challengeData?.overallAccuracy).toBe(90); // (85 + 95) / 2
      expect(game.challengeData?.currentSequenceStep).toBe(2);
    });

    it('should filter sequences by stage for progress tracking', () => {
      game.recordMoveSequence(1, 19, 26, 85, 1500, 1);
      game.recordMoveSequence(1, 18, 25, 95, 1000, 0);
      game.advanceToNextStage();
      game.recordMoveSequence(2, 37, 44, 80, 2000, 2);

      const progress = game.getCurrentStageProgress();
      expect(progress?.currentStage).toBe(2);
      expect(progress?.currentStageSequences).toHaveLength(1);
      expect(progress?.currentStageSequences[0]?.stageNumber).toBe(2);
    });
  });

  describe('Challenge Analytics', () => {
    beforeEach(() => {
      game.initializeMultiStageChallenge('session-123', 3, 'alphabeta', 4);
    });

    it('should provide comprehensive challenge analytics', () => {
      game.recordMoveSequence(1, 19, 26, 85, 1500, 1);
      game.recordMoveSequence(1, 18, 25, 95, 1000, 0);
      game.advanceToNextStage();
      game.recordMoveSequence(2, 37, 44, 80, 2000, 1);

      const analytics = game.getChallengeAnalytics();

      expect(analytics).toEqual({
        totalSequences: 3,
        completedSequences: 3,
        averageAccuracy: expect.closeTo(86.67, 2), // (85 + 95 + 80) / 3
        totalTimeSpent: 4500,
        averageTimePerMove: 1500,
        hintsUsedTotal: 0, // hintsUsed in challengeData tracks different hints
        stageProgress: {
          current: 2,
          total: 3,
          completion: expect.closeTo(33.33, 2), // (2-1)/3 * 100
        },
        aiConfiguration: {
          strategy: 'alphabeta',
          difficulty: 4,
        },
        sessionId: 'session-123',
        isMultiStage: true,
      });
    });

    it('should handle empty sequences in analytics', () => {
      const analytics = game.getChallengeAnalytics();

      expect(analytics?.totalSequences).toBe(0);
      expect(analytics?.completedSequences).toBe(0);
      expect(analytics?.averageAccuracy).toBe(0);
      expect(analytics?.averageTimePerMove).toBe(0);
    });
  });

  describe('Challenge Reset', () => {
    beforeEach(() => {
      game.initializeMultiStageChallenge('session-123', 2);
      game.recordMoveSequence(1, 19, 26, 85, 1500, 1);
      game.advanceToNextStage();
    });

    it('should reset challenge progress while keeping configuration', () => {
      const originalStrategy = game.challengeData?.aiStrategy;
      const originalDifficulty = game.challengeData?.aiDifficulty;
      const originalSessionId = game.challengeData?.sessionId;

      game.resetChallengeProgress();

      // Configuration should be preserved
      expect(game.challengeData?.aiStrategy).toBe(originalStrategy);
      expect(game.challengeData?.aiDifficulty).toBe(originalDifficulty);
      expect(game.challengeData?.sessionId).toBe(originalSessionId);

      // Progress should be reset
      expect(game.challengeData?.attemptsUsed).toBe(0);
      expect(game.challengeData?.hintsUsed).toEqual([]);
      expect(game.challengeData?.moveSequences).toEqual([]);
      expect(game.challengeData?.currentSequenceStep).toBe(0);
      expect(game.challengeData?.currentStage).toBe(1);
      expect(game.challengeData?.overallAccuracy).toBe(0);
      expect(game.challengeData?.totalTimeSpent).toBe(0);
      expect(game.challengeData?.temporaryMoves).toEqual([]);
      expect(game.challengeData?.currentMoveIndex).toBe(0);
    });

    it('should reset board state to initial position', () => {
      const originalBoardState = game.challengeData?.temporaryBoardState;

      // Modify the board somehow (this would normally happen during gameplay)
      game.board.placePiece(19, 'B');

      game.resetChallengeProgress();

      // Board should be reset to original state structure
      // Check that the reset was called by verifying core pieces are in place
      const resetBoardState = game.board.boardState;
      expect(resetBoardState).toContain('WB');
      expect(resetBoardState).toContain('BW');

      // And that the temporary board state was restored as the base
      expect(game.challengeData?.temporaryBoardState).toBe(originalBoardState);
    });
  });

  describe('Non-Challenge Game Behavior', () => {
    it('should return null for AI configuration on non-challenge game', () => {
      const regularGame = new Game();

      expect(regularGame.getAIConfiguration()).toBeNull();
      expect(regularGame.getChallengeAnalytics()).toBeNull();
      expect(regularGame.getCurrentStageProgress()).toBeNull();
    });

    it('should handle method calls gracefully on non-challenge game', () => {
      const regularGame = new Game();

      // These should not throw errors
      regularGame.updateAIConfiguration('minimax', 3);
      regularGame.recordMoveSequence(1, 19, 26, 85, 1500, 1);
      regularGame.resetChallengeProgress();

      expect(regularGame.advanceToNextStage()).toBe(false);
      expect(regularGame.isMultiStageChallengeCompleted()).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle accuracy calculation with no completed sequences', () => {
      game.initializeMultiStageChallenge('session-123', 2);

      // Record incomplete sequences
      game.recordMoveSequence(1, 19, undefined, 85, 1500, 1);

      expect(game.challengeData?.overallAccuracy).toBe(0);
    });

    it('should handle division by zero in analytics', () => {
      const analytics = game.getChallengeAnalytics();

      expect(analytics?.averageTimePerMove).toBe(0);
      expect(analytics?.stageProgress.completion).toBe(0);
    });

    it('should maintain data integrity during stage progression', () => {
      game.initializeMultiStageChallenge('session-123', 3);

      // Record some sequences
      game.recordMoveSequence(1, 19, 26, 85, 1500, 1);
      game.recordMoveSequence(1, 18, 25, 95, 1000, 0);

      const initialSequences = game.challengeData?.moveSequences.length;

      game.advanceToNextStage();

      // Previous sequences should be preserved
      expect(game.challengeData?.moveSequences.length).toBe(initialSequences);

      // But current stage should change
      expect(game.challengeData?.currentStage).toBe(2);
    });
  });
});
