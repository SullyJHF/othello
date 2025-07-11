import { AIResponseGeneratorService, AIResponseConfig } from '../services/AIResponseGeneratorService';
import { MultiStageChallenge, MultiStageChallengeConfig, StageConfig } from '../services/MultiStageChallenge';
import { AIEngine, AIStrategy, Piece } from '../ai/AIEngine';
import { Board } from '../models/Board';
import { Database } from '../database/Database';
import { DailyChallenge } from '../models/DailyChallenge';

/**
 * Template for creating challenge configurations
 */
export interface ChallengeTemplate {
  name: string;
  description: string;
  category: 'tactical' | 'strategic' | 'endgame' | 'opening' | 'puzzle' | 'scenario';
  difficulty: number; // 1-5 scale
  estimatedTime: number; // minutes
  tags: string[];
  boardSetup: {
    size: 6 | 8 | 10;
    initialState: string;
    currentPlayer: Piece;
  };
  objectives: {
    primary: string;
    secondary?: string[];
    successCriteria: {
      requiredMoves?: number[];
      alternativeSolutions?: number[][];
      minimumAccuracy: number;
      timeBonus?: boolean;
    };
  };
  hints?: {
    text: string;
    cost: number;
    triggerAfter?: number; // seconds
  }[];
  progression?: {
    isMultiStage: boolean;
    totalStages?: number;
    stageConfigs?: Partial<StageConfig>[];
  };
}

/**
 * Configuration for AI move validation
 */
export interface ValidationConfig {
  strategy: AIStrategy;
  difficulty: number;
  maxCalculationTime: number;
  requireOptimal: boolean;
  toleranceThreshold: number; // Evaluation difference tolerance
}

/**
 * Challenge creation results
 */
export interface ChallengeCreationResult {
  success: boolean;
  challengeId?: number;
  sessionId?: string;
  validation: {
    boardValid: boolean;
    solutionValid: boolean;
    aiResponsesGenerated: number;
    validationScore: number;
  };
  errors?: string[];
  warnings?: string[];
  metadata: {
    createdAt: Date;
    aiStrategy: AIStrategy;
    difficulty: number;
    estimatedSolveTime: number;
  };
}

/**
 * Difficulty calibration result
 */
export interface DifficultyCalibration {
  recommendedDifficulty: number;
  analysisMetrics: {
    positionComplexity: number;
    solutionDepth: number;
    alternativeCount: number;
    timeEstimate: number;
  };
  adjustmentReasons: string[];
}

/**
 * Challenge Builder - Tools for creating AI-powered challenges
 */
export class ChallengeBuilder {
  private db: Database;
  private aiEngine: AIEngine;
  private aiResponseService: AIResponseGeneratorService;
  private multiStageEngine: MultiStageChallenge;

  constructor() {
    this.db = Database.getInstance();
    this.aiEngine = new AIEngine();
    this.aiResponseService = new AIResponseGeneratorService();
    this.multiStageEngine = new MultiStageChallenge();
  }

  /**
   * Create a new challenge from a template
   */
  async createChallengeFromTemplate(
    template: ChallengeTemplate,
    validationConfig: ValidationConfig = {
      strategy: 'alphabeta',
      difficulty: 4,
      maxCalculationTime: 5000,
      requireOptimal: true,
      toleranceThreshold: 50,
    },
  ): Promise<ChallengeCreationResult> {
    const result: ChallengeCreationResult = {
      success: false,
      validation: {
        boardValid: false,
        solutionValid: false,
        aiResponsesGenerated: 0,
        validationScore: 0,
      },
      errors: [],
      warnings: [],
      metadata: {
        createdAt: new Date(),
        aiStrategy: validationConfig.strategy,
        difficulty: validationConfig.difficulty,
        estimatedSolveTime: template.estimatedTime,
      },
    };

    try {
      // Step 1: Validate board setup
      const boardValidation = await this.validateBoardSetup(template.boardSetup);
      result.validation.boardValid = boardValidation.valid;

      if (!boardValidation.valid) {
        result.errors = boardValidation.errors;
        return result;
      }

      // Step 2: Validate solution moves
      const solutionValidation = await this.validateSolution(
        template.boardSetup,
        template.objectives.successCriteria,
        validationConfig,
      );
      result.validation.solutionValid = solutionValidation.valid;

      if (!solutionValidation.valid) {
        result.errors?.push(...solutionValidation.errors);
        result.warnings?.push(...solutionValidation.warnings);
      }

      // Step 3: Create challenge in database
      const challengeData = await this.createChallengeRecord(template);
      result.challengeId = challengeData.id;

      // Step 4: Generate AI responses
      const aiConfig: AIResponseConfig = {
        strategy: validationConfig.strategy,
        difficulty: validationConfig.difficulty,
        maxTime: validationConfig.maxCalculationTime,
        generateAlternatives: true,
        includeExplanation: true,
        validationRequired: false,
      };

      if (template.progression?.isMultiStage && template.progression.totalStages) {
        // Multi-stage challenge setup
        const sessionId = await this.createMultiStageChallenge(challengeData.id, template, aiConfig);
        result.sessionId = sessionId;
      } else {
        // Single-stage challenge
        const responseIds = await this.aiResponseService.generateChallengeResponses(challengeData.id, aiConfig);
        result.validation.aiResponsesGenerated = responseIds.length;
      }

      // Step 5: Calculate validation score
      result.validation.validationScore = this.calculateValidationScore(result.validation, solutionValidation.score);

      result.success = result.validation.validationScore >= 70; // Minimum 70% validation score

      return result;
    } catch (error) {
      result.errors?.push(`Challenge creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Calibrate difficulty for a challenge position
   */
  async calibrateDifficulty(
    boardSetup: ChallengeTemplate['boardSetup'],
    solution: number[],
  ): Promise<DifficultyCalibration> {
    const board = new Board(boardSetup.initialState);
    board.updateNextMoves(boardSetup.currentPlayer);

    const calibration: DifficultyCalibration = {
      recommendedDifficulty: 3,
      analysisMetrics: {
        positionComplexity: 0,
        solutionDepth: solution.length,
        alternativeCount: 0,
        timeEstimate: 0,
      },
      adjustmentReasons: [],
    };

    try {
      // Analyze position complexity
      const validMoves = this.getValidMoves(board, boardSetup.currentPlayer);
      calibration.analysisMetrics.alternativeCount = validMoves.length;

      // Calculate position complexity based on valid moves and board state
      const pieceCount = this.getTotalPieceCount(board);
      const mobilityScore = validMoves.length;
      const positionScore = this.evaluatePositionComplexity(board);

      calibration.analysisMetrics.positionComplexity = positionScore;

      // Calculate recommended difficulty
      let difficultyScore = 1;

      // Factor 1: Solution depth
      if (solution.length >= 5) {
        difficultyScore += 1;
        calibration.adjustmentReasons.push('Long solution sequence increases difficulty');
      }

      // Factor 2: Move alternatives
      if (validMoves.length >= 8) {
        difficultyScore += 1;
        calibration.adjustmentReasons.push('Many alternative moves increase decision complexity');
      }

      // Factor 3: Position complexity
      if (positionScore > 500) {
        difficultyScore += 1;
        calibration.adjustmentReasons.push('Complex board position requires advanced analysis');
      }

      // Factor 4: Game phase
      if (pieceCount <= 20) {
        difficultyScore += 0.5;
        calibration.adjustmentReasons.push('Opening positions require strategic understanding');
      } else if (pieceCount >= 50) {
        difficultyScore += 1;
        calibration.adjustmentReasons.push('Endgame positions require precise calculation');
      }

      // Calculate time estimate
      const baseTime = solution.length * 30; // 30 seconds per move base
      const complexityMultiplier = 1 + positionScore / 1000;
      calibration.analysisMetrics.timeEstimate = Math.round(baseTime * complexityMultiplier);

      calibration.recommendedDifficulty = Math.min(5, Math.max(1, Math.round(difficultyScore)));

      return calibration;
    } catch (error) {
      console.error('Error calibrating difficulty:', error);
      return calibration;
    }
  }

  /**
   * Validate challenge solution against AI analysis
   */
  async validateSolution(
    boardSetup: ChallengeTemplate['boardSetup'],
    successCriteria: ChallengeTemplate['objectives']['successCriteria'],
    validationConfig: ValidationConfig,
  ): Promise<{
    valid: boolean;
    score: number;
    errors: string[];
    warnings: string[];
    aiAnalysis?: {
      bestMove: number;
      evaluation: number;
      alternatives: Array<{ move: number; evaluation: number; difference: number }>;
    };
  }> {
    const result = {
      valid: true,
      score: 100,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      const board = new Board(boardSetup.initialState);
      board.updateNextMoves(boardSetup.currentPlayer);

      // Get AI analysis of the position
      const aiResult = await this.aiEngine.getBestMove(
        board,
        boardSetup.currentPlayer,
        validationConfig.strategy,
        validationConfig.difficulty,
        validationConfig.maxCalculationTime,
      );

      const aiAnalysis = {
        bestMove: aiResult.move,
        evaluation: aiResult.evaluation,
        alternatives: [] as Array<{ move: number; evaluation: number; difference: number }>,
      };

      // Validate primary solution
      if (successCriteria.requiredMoves && successCriteria.requiredMoves.length > 0) {
        const primaryMove = successCriteria.requiredMoves[0];
        const evaluationDifference = Math.abs(
          aiResult.evaluation -
            this.evaluateMoveSequence(board, successCriteria.requiredMoves, boardSetup.currentPlayer),
        );

        if (validationConfig.requireOptimal && primaryMove !== aiResult.move) {
          const difference = Math.abs(
            aiResult.evaluation - this.evaluateMove(board, primaryMove, boardSetup.currentPlayer),
          );

          if (difference > validationConfig.toleranceThreshold) {
            result.errors.push(
              `Primary solution move ${primaryMove} is not optimal (${difference} points worse than AI best move ${aiResult.move})`,
            );
            result.valid = false;
            result.score -= 30;
          } else {
            result.warnings.push(`Primary solution move differs from AI recommendation but within tolerance`);
            result.score -= 10;
          }
        }

        // Validate alternative solutions
        if (successCriteria.alternativeSolutions) {
          for (const altSolution of successCriteria.alternativeSolutions) {
            if (altSolution.length > 0) {
              const altEvaluation = this.evaluateMoveSequence(board, altSolution, boardSetup.currentPlayer);
              const difference = Math.abs(aiResult.evaluation - altEvaluation);

              if (difference > validationConfig.toleranceThreshold * 2) {
                result.warnings.push(`Alternative solution may be suboptimal (${difference} points difference)`);
                result.score -= 5;
              }
            }
          }
        }
      }

      // Generate alternatives for analysis
      const validMoves = this.getValidMoves(board, boardSetup.currentPlayer);
      for (const move of validMoves.slice(0, 5)) {
        // Top 5 alternatives
        if (move !== aiResult.move) {
          const evaluation = this.evaluateMove(board, move, boardSetup.currentPlayer);
          aiAnalysis.alternatives.push({
            move,
            evaluation,
            difference: aiResult.evaluation - evaluation,
          });
        }
      }

      return { ...result, aiAnalysis };
    } catch (error) {
      result.errors.push(`Solution validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.valid = false;
      result.score = 0;
      return result;
    }
  }

  /**
   * Create challenge record in database
   */
  private async createChallengeRecord(template: ChallengeTemplate): Promise<{ id: number }> {
    const challengeData = {
      date: new Date().toISOString().split('T')[0],
      title: template.name,
      description: template.description,
      difficulty: template.difficulty,
      type: template.category,
      boardState: template.boardSetup.initialState,
      currentPlayer: template.boardSetup.currentPlayer,
      config: {
        type: template.category,
        difficulty: template.difficulty,
        maxAttempts: Math.max(3, 6 - template.difficulty),
        timeLimit: template.estimatedTime * 60,
        hints: template.hints || [],
        solution: {
          moves: template.objectives.successCriteria.requiredMoves || [],
          explanation: template.objectives.primary,
          alternativeSolutions: template.objectives.successCriteria.alternativeSolutions || [],
        },
        tags: template.tags,
      },
      hints: template.hints || [],
      solution: {
        moves: template.objectives.successCriteria.requiredMoves || [],
        explanation: template.objectives.primary,
        alternativeSolutions: template.objectives.successCriteria.alternativeSolutions || [],
      },
      tags: template.tags,
      points: template.difficulty * 100,
      timeBonus: template.objectives.successCriteria.timeBonus || false,
      isActive: true,
    };

    const query = `
      INSERT INTO daily_challenges (
        date, title, description, difficulty, type, board_state, current_player,
        config, hints, solution, tags, points, time_bonus, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `;

    const values = [
      challengeData.date,
      challengeData.title,
      challengeData.description,
      challengeData.difficulty,
      challengeData.type,
      challengeData.boardState,
      challengeData.currentPlayer,
      JSON.stringify(challengeData.config),
      JSON.stringify(challengeData.hints),
      JSON.stringify(challengeData.solution),
      challengeData.tags,
      challengeData.points,
      challengeData.timeBonus,
      challengeData.isActive,
      new Date(),
    ];

    const result = await this.db.query(query, values);
    return { id: result.rows[0].id };
  }

  /**
   * Create multi-stage challenge configuration
   */
  private async createMultiStageChallenge(
    challengeId: number,
    template: ChallengeTemplate,
    aiConfig: AIResponseConfig,
  ): Promise<string> {
    if (!template.progression?.stageConfigs) {
      throw new Error('Multi-stage challenge requires stage configurations');
    }

    const stageConfigs: StageConfig[] = template.progression.stageConfigs.map((stageConfig, index) => ({
      stageNumber: index + 1,
      name: stageConfig.name || `Stage ${index + 1}`,
      description: stageConfig.description || `Challenge stage ${index + 1}`,
      boardState: stageConfig.boardState || template.boardSetup.initialState,
      playerToMove: stageConfig.playerToMove || template.boardSetup.currentPlayer,
      aiConfig,
      successCriteria: stageConfig.successCriteria || {
        requiredMoves: template.objectives.successCriteria.requiredMoves || [],
        accuracyThreshold: template.objectives.successCriteria.minimumAccuracy,
        allowHints: true,
      },
      failureHandling: stageConfig.failureHandling || {
        allowRetry: true,
        maxRetries: 3,
        provideFeedback: true,
        showSolution: false,
      },
      hintsAvailable: template.hints?.map((h) => h.text) || [],
    }));

    const multiStageConfig: MultiStageChallengeConfig = {
      challengeId,
      totalStages: template.progression.totalStages || stageConfigs.length,
      stageConfigs,
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

    // Initialize multi-stage challenge session
    const sessionId = await this.multiStageEngine.initializeChallengeSession(
      challengeId,
      'builder_session',
      multiStageConfig,
    );

    return sessionId;
  }

  /**
   * Test framework for challenge validation
   */
  async testChallenge(
    challengeId: number,
    testConfig: {
      iterations: number;
      strategies: AIStrategy[];
      difficulties: number[];
      timeouts: number[];
    },
  ): Promise<{
    results: Array<{
      strategy: AIStrategy;
      difficulty: number;
      timeout: number;
      success: boolean;
      accuracy: number;
      timeSpent: number;
      solution: number[];
    }>;
    summary: {
      averageAccuracy: number;
      successRate: number;
      averageTime: number;
      recommendedSettings: {
        strategy: AIStrategy;
        difficulty: number;
        timeout: number;
      };
    };
  }> {
    const results: Array<{
      strategy: AIStrategy;
      difficulty: number;
      timeout: number;
      success: boolean;
      accuracy: number;
      timeSpent: number;
      solution: number[];
    }> = [];

    // Get challenge data
    const challenge = await this.getChallengeById(challengeId);
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    // Test all combinations
    for (const strategy of testConfig.strategies) {
      for (const difficulty of testConfig.difficulties) {
        for (const timeout of testConfig.timeouts) {
          for (let iteration = 0; iteration < testConfig.iterations; iteration++) {
            try {
              const startTime = Date.now();

              const board = new Board(challenge.board_state);
              board.updateNextMoves(challenge.current_player);

              const aiResult = await this.aiEngine.getBestMove(
                board,
                challenge.current_player,
                strategy,
                difficulty,
                timeout,
              );

              const timeSpent = Date.now() - startTime;
              const expectedSolution = challenge.solution.moves;

              // Calculate accuracy
              let accuracy = 0;
              if (expectedSolution.length > 0) {
                const firstMoveMatch = aiResult.move === expectedSolution[0] ? 100 : 0;
                accuracy = firstMoveMatch;
              }

              results.push({
                strategy,
                difficulty,
                timeout,
                success: accuracy >= 80,
                accuracy,
                timeSpent,
                solution: [aiResult.move],
              });
            } catch (error) {
              results.push({
                strategy,
                difficulty,
                timeout,
                success: false,
                accuracy: 0,
                timeSpent: timeout,
                solution: [],
              });
            }
          }
        }
      }
    }

    // Calculate summary statistics
    const successfulResults = results.filter((r) => r.success);
    const summary = {
      averageAccuracy: results.length > 0 ? results.reduce((sum, r) => sum + r.accuracy, 0) / results.length : 0,
      successRate: results.length > 0 ? successfulResults.length / results.length : 0,
      averageTime: results.length > 0 ? results.reduce((sum, r) => sum + r.timeSpent, 0) / results.length : 0,
      recommendedSettings: this.findOptimalSettings(results),
    };

    return { results, summary };
  }

  // Helper methods

  private async validateBoardSetup(boardSetup: ChallengeTemplate['boardSetup']): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Validate board size
      const expectedLength = boardSetup.size * boardSetup.size;
      if (boardSetup.initialState.replace(/\n/g, '').length !== expectedLength) {
        errors.push(`Board state length doesn't match size ${boardSetup.size}x${boardSetup.size}`);
      }

      // Validate board state format
      const validChars = /^[WB.0\n]*$/;
      if (!validChars.test(boardSetup.initialState)) {
        errors.push('Board state contains invalid characters');
      }

      // Validate that board has at least some pieces
      const pieceCount = (boardSetup.initialState.match(/[WB]/g) || []).length;
      if (pieceCount < 4) {
        errors.push('Board must have at least 4 pieces');
      }

      // Validate that current player has valid moves
      const board = new Board(boardSetup.initialState);
      board.updateNextMoves(boardSetup.currentPlayer);
      const validMoves = this.getValidMoves(board, boardSetup.currentPlayer);

      if (validMoves.length === 0) {
        errors.push(`Current player ${boardSetup.currentPlayer} has no valid moves`);
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Board validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors };
    }
  }

  private evaluateMove(board: Board, move: number, player: Piece): number {
    try {
      const testBoard = new Board(board.boardState);
      testBoard.placePiece(move, player);
      return this.aiEngine.evaluatePosition(testBoard, player);
    } catch (error) {
      return -1000; // Invalid move
    }
  }

  private evaluateMoveSequence(board: Board, moves: number[], player: Piece): number {
    try {
      const testBoard = new Board(board.boardState);
      let currentPlayer = player;

      for (const move of moves) {
        testBoard.placePiece(move, currentPlayer);
        currentPlayer = currentPlayer === 'W' ? 'B' : 'W';
      }

      return this.aiEngine.evaluatePosition(testBoard, player);
    } catch (error) {
      return -1000; // Invalid sequence
    }
  }

  private getValidMoves(board: Board, player: Piece): number[] {
    const moves: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (board.canPlacePiece(i, player)) {
        moves.push(i);
      }
    }
    return moves;
  }

  private getTotalPieceCount(board: Board): number {
    const pieces = board.pieces;
    return pieces.filter((p) => p === 'W' || p === 'B').length;
  }

  private evaluatePositionComplexity(board: Board): number {
    // Simple complexity evaluation based on piece distribution and mobility
    const pieces = board.pieces;
    let complexity = 0;

    // Count piece types
    const whitePieces = pieces.filter((p) => p === 'W').length;
    const blackPieces = pieces.filter((p) => p === 'B').length;

    // Imbalanced positions are more complex
    const imbalance = Math.abs(whitePieces - blackPieces);
    complexity += imbalance * 10;

    // More pieces generally means more complexity
    complexity += (whitePieces + blackPieces) * 5;

    // Check for edge and corner control
    const corners = [0, 7, 56, 63];
    const controlledCorners = corners.filter((i) => pieces[i] === 'W' || pieces[i] === 'B').length;
    complexity += controlledCorners * 50;

    return complexity;
  }

  private calculateValidationScore(validation: ChallengeCreationResult['validation'], solutionScore: number): number {
    let score = 0;

    if (validation.boardValid) score += 30;
    if (validation.solutionValid) score += 40;
    if (validation.aiResponsesGenerated > 0) score += 20;

    // Add solution quality score
    score += (solutionScore / 100) * 10;

    return Math.round(score);
  }

  private findOptimalSettings(
    results: Array<{
      strategy: AIStrategy;
      difficulty: number;
      timeout: number;
      success: boolean;
      accuracy: number;
      timeSpent: number;
    }>,
  ): { strategy: AIStrategy; difficulty: number; timeout: number } {
    // Find settings with best balance of accuracy and performance
    const successfulResults = results.filter((r) => r.success);

    if (successfulResults.length === 0) {
      return { strategy: 'alphabeta', difficulty: 3, timeout: 2000 };
    }

    // Score each configuration
    const scored = successfulResults.map((r) => ({
      ...r,
      score: r.accuracy * 0.7 + (r.timeSpent < 1000 ? 30 : 0) + (r.strategy === 'alphabeta' ? 10 : 0),
    }));

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    return {
      strategy: best.strategy,
      difficulty: best.difficulty,
      timeout: best.timeout,
    };
  }

  private async getChallengeById(challengeId: number): Promise<any | null> {
    const query = `SELECT * FROM daily_challenges WHERE id = $1`;
    const result = await this.db.query(query, [challengeId]);
    return result.rows[0] || null;
  }
}

// Singleton instance
export const challengeBuilder = new ChallengeBuilder();
