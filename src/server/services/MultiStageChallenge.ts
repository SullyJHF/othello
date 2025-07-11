import { AIEngine, Piece } from '../ai/AIEngine';
import { Database } from '../database/Database';
import { Board } from '../models/Board';
import { AIResponseGeneratorService, AIResponseConfig, AIResponseData } from './AIResponseGeneratorService';

/**
 * Configuration for multi-stage challenge orchestration
 */
export interface MultiStageChallengeConfig {
  challengeId: number;
  totalStages: number;
  stageConfigs: StageConfig[];
  progressionRules: ProgressionRules;
  errorRecovery: ErrorRecoveryConfig;
  performanceTracking: boolean;
}

/**
 * Configuration for individual challenge stages
 */
export interface StageConfig {
  stageNumber: number;
  name: string;
  description: string;
  boardState: any;
  playerToMove: Piece;
  aiConfig: AIResponseConfig;
  successCriteria: SuccessCriteria;
  failureHandling: FailureHandling;
  timeLimit?: number;
  hintsAvailable?: string[];
  minimumAccuracy?: number;
}

/**
 * Rules governing progression between stages
 */
export interface ProgressionRules {
  type: 'linear' | 'branching' | 'adaptive';
  allowSkipOnExcellence: boolean;
  requirePerfectCompletion: boolean;
  difficultyAdjustment: 'static' | 'dynamic';
  retryPolicy: RetryPolicy;
}

/**
 * Success criteria for stage completion
 */
export interface SuccessCriteria {
  requiredMoves: number[];
  alternativeSequences?: number[][];
  maxMoves?: number;
  timeBonus?: boolean;
  accuracyThreshold: number; // 0-100%
  allowHints: boolean;
}

/**
 * Failure handling configuration
 */
export interface FailureHandling {
  allowRetry: boolean;
  maxRetries: number;
  provideFeedback: boolean;
  showSolution: boolean;
  penaltyPoints?: number;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxAttemptsPerStage: number;
  cooldownBetweenAttempts: number; // milliseconds
  resetOnFailure: boolean;
  provideDiagnostics: boolean;
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  saveProgressOnError: boolean;
  allowResumeFromFailure: boolean;
  maxRecoveryAttempts: number;
  fallbackToManualMode: boolean;
}

/**
 * Stage attempt tracking
 */
export interface StageAttempt {
  stageNumber: number;
  attemptNumber: number;
  startTime: Date;
  endTime?: Date;
  playerMoves: number[];
  aiResponses: number[];
  success: boolean;
  accuracy: number;
  timeSpent: number;
  hintsUsed: number;
  failureReason?: string;
  feedback?: string;
}

/**
 * Challenge session state
 */
export interface ChallengeSession {
  sessionId: string;
  challengeId: number;
  userId: string;
  currentStage: number;
  totalStages: number;
  attempts: StageAttempt[];
  startTime: Date;
  lastActivity: Date;
  isActive: boolean;
  isCompleted: boolean;
  overallAccuracy: number;
  totalTimeSpent: number;
  totalHintsUsed: number;
  finalScore: number;
}

/**
 * Multi-Stage Challenge Engine for orchestrating complex challenge sequences
 */
export class MultiStageChallenge {
  private db: Database;
  private aiResponseService: AIResponseGeneratorService;
  private aiEngine: AIEngine;
  private activeSessions: Map<string, ChallengeSession> = new Map();

  constructor() {
    this.db = Database.getInstance();
    this.aiResponseService = new AIResponseGeneratorService();
    this.aiEngine = new AIEngine();
  }

  /**
   * Initialize a new multi-stage challenge session
   */
  async initializeChallengeSession(
    challengeId: number,
    userId: string,
    config: MultiStageChallengeConfig,
  ): Promise<string> {
    const sessionId = this.generateSessionId(challengeId, userId);

    // Check for existing active session
    const existingSession = await this.getActiveSession(challengeId, userId);
    if (existingSession && config.progressionRules.retryPolicy.resetOnFailure) {
      await this.resetSession(existingSession.sessionId);
    }

    // Create new session
    const session: ChallengeSession = {
      sessionId,
      challengeId,
      userId,
      currentStage: 1,
      totalStages: config.totalStages,
      attempts: [],
      startTime: new Date(),
      lastActivity: new Date(),
      isActive: true,
      isCompleted: false,
      overallAccuracy: 0,
      totalTimeSpent: 0,
      totalHintsUsed: 0,
      finalScore: 0,
    };

    // Store session in memory and database
    this.activeSessions.set(sessionId, session);
    await this.persistSession(session);

    // Generate AI responses for all stages if not already cached
    await this.precomputeStageResponses(config);

    return sessionId;
  }

  /**
   * Process a player move in the current stage
   */
  async processPlayerMove(
    sessionId: string,
    stageNumber: number,
    playerMove: number,
    config: MultiStageChallengeConfig,
  ): Promise<{
    success: boolean;
    aiResponse?: number;
    stageCompleted: boolean;
    challengeCompleted: boolean;
    feedback?: string;
    nextStage?: number;
    error?: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session?.isActive) {
      return { success: false, error: 'Invalid or inactive session', stageCompleted: false, challengeCompleted: false };
    }

    try {
      // Validate stage number
      if (stageNumber !== session.currentStage) {
        return {
          success: false,
          error: `Expected stage ${session.currentStage}, got ${stageNumber}`,
          stageCompleted: false,
          challengeCompleted: false,
        };
      }

      const stageConfig = config.stageConfigs.find((s) => s.stageNumber === stageNumber);
      if (!stageConfig) {
        return {
          success: false,
          error: 'Stage configuration not found',
          stageCompleted: false,
          challengeCompleted: false,
        };
      }

      // Start new attempt if needed
      let currentAttempt = this.getCurrentAttempt(session, stageNumber);
      if (!currentAttempt) {
        currentAttempt = await this.startNewAttempt(session, stageConfig);
      }

      // Validate player move
      const isValidMove = await this.validatePlayerMove(stageConfig.boardState, playerMove, stageConfig.playerToMove);
      if (!isValidMove) {
        return { success: false, error: 'Invalid move', stageCompleted: false, challengeCompleted: false };
      }

      // Record player move
      currentAttempt.playerMoves.push(playerMove);

      // Generate AI response
      const aiResponse = await this.generateAIResponse(stageConfig, currentAttempt);
      if (aiResponse) {
        currentAttempt.aiResponses.push(aiResponse.move);
      }

      // Check stage completion
      const stageResult = await this.evaluateStageCompletion(currentAttempt, stageConfig);

      // Update session based on result
      if (stageResult.completed) {
        await this.completeStage(session, currentAttempt, stageConfig, config);

        // Check if entire challenge is completed
        const challengeCompleted = session.currentStage > session.totalStages;

        if (challengeCompleted) {
          await this.completeChallengeSession(session, config);
        }

        return {
          success: true,
          aiResponse: aiResponse?.move,
          stageCompleted: true,
          challengeCompleted,
          feedback: stageResult.feedback,
          nextStage: challengeCompleted ? undefined : session.currentStage,
        };
      } else {
        // Stage not completed, handle according to failure policy
        const retryResult = await this.handleStageFailure(session, currentAttempt, stageConfig, config);

        return {
          success: false,
          aiResponse: aiResponse?.move,
          stageCompleted: false,
          challengeCompleted: false,
          feedback: retryResult.feedback,
          error: retryResult.error,
        };
      }
    } catch (error) {
      console.error('Error processing player move:', error);
      await this.handleError(session, error as Error, config.errorRecovery);
      return { success: false, error: 'Internal error', stageCompleted: false, challengeCompleted: false };
    }
  }

  /**
   * Get AI hint for current stage
   */
  async getHint(
    sessionId: string,
    stageNumber: number,
    config: MultiStageChallengeConfig,
  ): Promise<{
    hint?: string;
    cost: number;
    hintsRemaining: number;
    error?: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { cost: 0, hintsRemaining: 0, error: 'Session not found' };
    }

    const stageConfig = config.stageConfigs.find((s) => s.stageNumber === stageNumber);
    if (!stageConfig?.hintsAvailable) {
      return { cost: 0, hintsRemaining: 0, error: 'No hints available for this stage' };
    }

    const currentAttempt = this.getCurrentAttempt(session, stageNumber);
    if (!currentAttempt) {
      return { cost: 0, hintsRemaining: 0, error: 'No active attempt' };
    }

    const hintsUsed = currentAttempt.hintsUsed;
    const hintsAvailable = stageConfig.hintsAvailable.length;

    if (hintsUsed >= hintsAvailable) {
      return { cost: 0, hintsRemaining: 0, error: 'All hints already used' };
    }

    const hint = stageConfig.hintsAvailable[hintsUsed];
    const cost = (hintsUsed + 1) * 10; // Increasing cost per hint

    // Record hint usage
    currentAttempt.hintsUsed++;
    session.totalHintsUsed++;

    await this.persistSession(session);

    return {
      hint,
      cost,
      hintsRemaining: hintsAvailable - currentAttempt.hintsUsed,
    };
  }

  /**
   * Reset a challenge session
   */
  async resetSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Reset session state
    session.currentStage = 1;
    session.attempts = [];
    session.isCompleted = false;
    session.overallAccuracy = 0;
    session.totalTimeSpent = 0;
    session.totalHintsUsed = 0;
    session.finalScore = 0;
    session.lastActivity = new Date();

    await this.persistSession(session);
    return true;
  }

  /**
   * Get session progress information
   */
  async getSessionProgress(sessionId: string): Promise<{
    session?: ChallengeSession;
    stageProgress: Array<{
      stageNumber: number;
      completed: boolean;
      attempts: number;
      accuracy: number;
      timeSpent: number;
    }>;
    error?: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { stageProgress: [], error: 'Session not found' };
    }

    // Calculate stage progress
    const stageProgress = [];
    for (let stage = 1; stage <= session.totalStages; stage++) {
      const stageAttempts = session.attempts.filter((a) => a.stageNumber === stage);
      const completed = stageAttempts.some((a) => a.success);
      const attempts = stageAttempts.length;
      const accuracy = completed ? Math.max(...stageAttempts.map((a) => a.accuracy)) : 0;
      const timeSpent = stageAttempts.reduce((sum, a) => sum + a.timeSpent, 0);

      stageProgress.push({
        stageNumber: stage,
        completed,
        attempts,
        accuracy,
        timeSpent,
      });
    }

    return { session, stageProgress };
  }

  // Private helper methods

  private generateSessionId(challengeId: number, userId: string): string {
    return `challenge_${challengeId}_user_${userId}_${Date.now()}`;
  }

  private async getActiveSession(challengeId: number, userId: string): Promise<ChallengeSession | null> {
    // Check memory first
    for (const session of this.activeSessions.values()) {
      if (session.challengeId === challengeId && session.userId === userId && session.isActive) {
        return session;
      }
    }

    // Check database
    const query = `
      SELECT * FROM challenge_sessions 
      WHERE challenge_id = $1 AND user_id = $2 AND is_active = true 
      ORDER BY created_at DESC LIMIT 1
    `;
    const result = await this.db.query(query, [challengeId, userId]);

    if (result.rows.length > 0) {
      const sessionData = result.rows[0];
      const session: ChallengeSession = {
        sessionId: sessionData.session_id,
        challengeId: sessionData.challenge_id,
        userId: sessionData.user_id,
        currentStage: sessionData.current_stage,
        totalStages: sessionData.total_stages,
        attempts: JSON.parse(sessionData.attempts || '[]'),
        startTime: new Date(sessionData.start_time),
        lastActivity: new Date(sessionData.last_activity),
        isActive: sessionData.is_active,
        isCompleted: sessionData.is_completed,
        overallAccuracy: sessionData.overall_accuracy,
        totalTimeSpent: sessionData.total_time_spent,
        totalHintsUsed: sessionData.total_hints_used,
        finalScore: sessionData.final_score,
      };

      this.activeSessions.set(session.sessionId, session);
      return session;
    }

    return null;
  }

  private async persistSession(session: ChallengeSession): Promise<void> {
    const query = `
      INSERT INTO challenge_sessions (
        session_id, challenge_id, user_id, current_stage, total_stages,
        attempts, start_time, last_activity, is_active, is_completed,
        overall_accuracy, total_time_spent, total_hints_used, final_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (session_id) DO UPDATE SET
        current_stage = $4, attempts = $6, last_activity = $8,
        is_active = $9, is_completed = $10, overall_accuracy = $11,
        total_time_spent = $12, total_hints_used = $13, final_score = $14
    `;

    await this.db.query(query, [
      session.sessionId,
      session.challengeId,
      session.userId,
      session.currentStage,
      session.totalStages,
      JSON.stringify(session.attempts),
      session.startTime,
      session.lastActivity,
      session.isActive,
      session.isCompleted,
      session.overallAccuracy,
      session.totalTimeSpent,
      session.totalHintsUsed,
      session.finalScore,
    ]);
  }

  private async precomputeStageResponses(config: MultiStageChallengeConfig): Promise<void> {
    for (const stageConfig of config.stageConfigs) {
      try {
        // Check if responses already exist
        const existingResponse = await this.aiResponseService.getAIResponse(
          this.hashBoardState(stageConfig.boardState),
          stageConfig.playerToMove,
          config.challengeId,
          stageConfig.stageNumber,
        );

        if (!existingResponse) {
          // Generate and store responses
          await this.aiResponseService.generateAIResponse(
            stageConfig.boardState,
            stageConfig.playerToMove,
            stageConfig.aiConfig,
            config.challengeId,
            undefined,
            stageConfig.stageNumber,
            1,
          );
        }
      } catch (error) {
        console.warn(`Failed to precompute responses for stage ${stageConfig.stageNumber}:`, error);
      }
    }
  }

  private getCurrentAttempt(session: ChallengeSession, stageNumber: number): StageAttempt | null {
    const stageAttempts = session.attempts.filter((a) => a.stageNumber === stageNumber);
    return stageAttempts.find((a) => !a.endTime) || null;
  }

  private async startNewAttempt(session: ChallengeSession, stageConfig: StageConfig): Promise<StageAttempt> {
    const stageAttempts = session.attempts.filter((a) => a.stageNumber === stageConfig.stageNumber);
    const attemptNumber = stageAttempts.length + 1;

    const attempt: StageAttempt = {
      stageNumber: stageConfig.stageNumber,
      attemptNumber,
      startTime: new Date(),
      playerMoves: [],
      aiResponses: [],
      success: false,
      accuracy: 0,
      timeSpent: 0,
      hintsUsed: 0,
    };

    session.attempts.push(attempt);
    session.lastActivity = new Date();

    return attempt;
  }

  private async validatePlayerMove(boardState: any, move: number, player: Piece): Promise<boolean> {
    try {
      const board = new Board(this.boardStateToString(boardState));
      return board.canPlacePiece(move, player);
    } catch (error) {
      console.error('Error validating player move:', error);
      return false;
    }
  }

  private async generateAIResponse(stageConfig: StageConfig, attempt: StageAttempt): Promise<{ move: number } | null> {
    try {
      // Create board state after player moves
      const board = new Board(this.boardStateToString(stageConfig.boardState));
      const aiPlayer = stageConfig.playerToMove === 'W' ? 'B' : 'W';

      // Apply player moves
      for (const move of attempt.playerMoves) {
        board.placePiece(move, stageConfig.playerToMove);
      }

      board.updateNextMoves(stageConfig.playerToMove);

      // Get AI response
      const aiResult = await this.aiEngine.getBestMove(
        board,
        aiPlayer,
        stageConfig.aiConfig.strategy,
        stageConfig.aiConfig.difficulty,
        stageConfig.aiConfig.maxTime,
      );

      return { move: aiResult.move };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return null;
    }
  }

  private async evaluateStageCompletion(
    attempt: StageAttempt,
    stageConfig: StageConfig,
  ): Promise<{ completed: boolean; feedback?: string }> {
    const { successCriteria } = stageConfig;

    // Check if required moves match
    const requiredMoves = successCriteria.requiredMoves;
    const playerMoves = attempt.playerMoves;

    // Primary solution check
    if (this.movesMatchSequence(playerMoves, requiredMoves)) {
      attempt.success = true;
      attempt.accuracy = 100;
      return { completed: true, feedback: 'Perfect! You found the optimal solution.' };
    }

    // Alternative solutions check
    if (successCriteria.alternativeSequences) {
      for (const altSequence of successCriteria.alternativeSequences) {
        if (this.movesMatchSequence(playerMoves, altSequence)) {
          attempt.success = true;
          attempt.accuracy = 90;
          return { completed: true, feedback: 'Excellent! You found an alternative solution.' };
        }
      }
    }

    // Partial completion check
    const accuracy = this.calculateMoveAccuracy(playerMoves, requiredMoves);
    attempt.accuracy = accuracy;

    if (accuracy >= successCriteria.accuracyThreshold) {
      attempt.success = true;
      return { completed: true, feedback: `Good job! Accuracy: ${accuracy}%` };
    }

    return { completed: false, feedback: `Not quite right. Accuracy: ${accuracy}%` };
  }

  private async completeStage(
    session: ChallengeSession,
    attempt: StageAttempt,
    stageConfig: StageConfig,
    config: MultiStageChallengeConfig,
  ): Promise<void> {
    attempt.endTime = new Date();
    attempt.timeSpent = attempt.endTime.getTime() - attempt.startTime.getTime();

    // Update session totals
    session.totalTimeSpent += attempt.timeSpent;
    session.currentStage++;
    session.lastActivity = new Date();

    // Recalculate overall accuracy
    const completedAttempts = session.attempts.filter((a) => a.success);
    session.overallAccuracy =
      completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + a.accuracy, 0) / completedAttempts.length
        : 0;

    await this.persistSession(session);
  }

  private async completeChallengeSession(session: ChallengeSession, config: MultiStageChallengeConfig): Promise<void> {
    session.isCompleted = true;
    session.isActive = false;
    session.lastActivity = new Date();

    // Calculate final score
    const baseScore = session.overallAccuracy * 10;
    const timeBonus = Math.max(0, 1000 - session.totalTimeSpent / 1000);
    const hintPenalty = session.totalHintsUsed * 50;
    session.finalScore = Math.round(baseScore + timeBonus - hintPenalty);

    await this.persistSession(session);

    // Remove from active sessions
    this.activeSessions.delete(session.sessionId);
  }

  private async handleStageFailure(
    session: ChallengeSession,
    attempt: StageAttempt,
    stageConfig: StageConfig,
    config: MultiStageChallengeConfig,
  ): Promise<{ feedback?: string; error?: string }> {
    const failureHandling = stageConfig.failureHandling;

    // Don't end the attempt yet - allow for hints and continued attempts
    // Only end attempt when retry limit is reached or stage is completed
    const stageAttempts = session.attempts.filter((a) => a.stageNumber === stageConfig.stageNumber);

    if (!failureHandling.allowRetry || stageAttempts.length >= failureHandling.maxRetries) {
      // End current attempt only when no more retries
      attempt.endTime = new Date();
      attempt.timeSpent = attempt.endTime.getTime() - attempt.startTime.getTime();

      // No more retries allowed
      session.isActive = false;
      await this.persistSession(session);

      return {
        error: 'Maximum retries exceeded',
        feedback: failureHandling.showSolution
          ? `Solution was: ${stageConfig.successCriteria.requiredMoves.join(', ')}`
          : 'Try again later',
      };
    }

    // Allow retry - keep attempt active
    const feedback = failureHandling.provideFeedback
      ? `Try again. Attempt ${stageAttempts.length} of ${failureHandling.maxRetries}`
      : 'Try again';

    await this.persistSession(session);
    return { feedback };
  }

  private async handleError(session: ChallengeSession, error: Error, recovery: ErrorRecoveryConfig): Promise<void> {
    console.error('Challenge session error:', error);

    if (recovery.saveProgressOnError) {
      await this.persistSession(session);
    }

    if (recovery.fallbackToManualMode) {
      // Implement manual mode fallback
      session.isActive = false;
      await this.persistSession(session);
    }
  }

  private movesMatchSequence(playerMoves: number[], requiredMoves: number[]): boolean {
    if (playerMoves.length !== requiredMoves.length) {
      return false;
    }

    return playerMoves.every((move, index) => move === requiredMoves[index]);
  }

  private calculateMoveAccuracy(playerMoves: number[], requiredMoves: number[]): number {
    const maxLength = Math.max(playerMoves.length, requiredMoves.length);
    if (maxLength === 0) return 100;

    let matches = 0;
    const minLength = Math.min(playerMoves.length, requiredMoves.length);

    for (let i = 0; i < minLength; i++) {
      if (playerMoves[i] === requiredMoves[i]) {
        matches++;
      }
    }

    return Math.round((matches / maxLength) * 100);
  }

  private boardStateToString(boardState: any): string {
    if (typeof boardState === 'string') return boardState;
    if (Array.isArray(boardState)) return boardState.join('');
    if (boardState.state) return boardState.state;
    return JSON.stringify(boardState);
  }

  private hashBoardState(boardState: any): string {
    const stateString = this.boardStateToString(boardState);
    // Simple hash function for board state
    let hash = 0;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}

// Singleton instance
export const multiStageChallenge = new MultiStageChallenge();
