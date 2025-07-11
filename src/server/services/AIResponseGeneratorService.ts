import { AIEngine, AIStrategy, AIMoveResult, Piece } from '../ai/AIEngine';
import { Database } from '../database/Database';
import { Board } from '../models/Board';
import { DailyChallenge } from '../models/DailyChallenge';

/**
 * Configuration for generating AI responses
 */
export interface AIResponseConfig {
  strategy: AIStrategy;
  difficulty: number; // 1-6 search depth
  maxTime: number; // Maximum calculation time in milliseconds
  generateAlternatives: boolean; // Whether to generate alternative moves
  includeExplanation: boolean; // Whether to include move explanations
  validationRequired: boolean; // Whether human validation is required
}

/**
 * Interface for AI response data to be stored
 */
export interface AIResponseData {
  challengeId?: number;
  gameId?: string;
  boardState: any; // Board state object
  playerToMove: Piece;
  sequenceStage: number;
  moveNumber: number;
  aiMove: number;
  aiStrategy: AIStrategy;
  aiDifficulty: number;
  moveEvaluation: number;
  searchDepth: number;
  nodesSearched?: number;
  calculationTime: number;
  alternativeMoves?: Array<{
    move: number;
    evaluation: number;
    difference: number;
    classification: string;
    explanation?: string;
  }>;
  precedingMoves?: number[];
  expectedPlayerResponse?: {
    move: number;
    evaluation: number;
  };
  moveExplanation?: string;
  tacticalThemes?: string[];
  difficultyRating: string;
  isPrimaryLine: boolean;
  isRetaliationMove: boolean;
  triggersOnPlayerMove?: number;
  positionType: string;
  isForcingSequence: boolean;
}

/**
 * Interface for multi-stage challenge sequence configuration
 */
export interface ChallengeSequenceConfig {
  challengeId: number;
  sequenceName: string;
  description: string;
  totalStages: number;
  isLinear: boolean;
  successCriteria: any;
  completionRewards: any;
  difficultyProgression: 'static' | 'increasing' | 'decreasing';
  estimatedDuration?: number;
  requiredAccuracy: number;
}

/**
 * Service for generating optimal AI responses for challenge positions
 */
export class AIResponseGeneratorService {
  private db: Database;
  private aiEngine: AIEngine;

  constructor() {
    this.db = Database.getInstance();
    this.aiEngine = new AIEngine();
  }

  /**
   * Generate AI response for a specific board position
   */
  async generateAIResponse(
    boardState: any,
    playerToMove: Piece,
    config: AIResponseConfig,
    challengeId?: number,
    gameId?: string,
    sequenceStage: number = 1,
    moveNumber: number = 1,
  ): Promise<AIResponseData> {
    // Create Board instance from state
    const board = new Board(this.boardStateToString(boardState));
    board.updateNextMoves(playerToMove);

    // Generate AI move using the AI Engine
    const aiResult: AIMoveResult = await this.aiEngine.getBestMove(
      board,
      playerToMove,
      config.strategy,
      config.difficulty,
      config.maxTime,
    );

    // Generate alternative moves if requested
    let alternativeMoves: any[] = [];
    if (config.generateAlternatives) {
      alternativeMoves = await this.generateAlternativeMoves(board, playerToMove, aiResult, config);
    }

    // Generate move explanation if requested
    let moveExplanation: string | undefined;
    let tacticalThemes: string[] = [];
    if (config.includeExplanation) {
      const explanationData = this.generateMoveExplanation(board, aiResult, playerToMove);
      moveExplanation = explanationData.explanation;
      tacticalThemes = explanationData.themes;
    }

    // Determine expected player response
    const expectedResponse = await this.generateExpectedPlayerResponse(board, aiResult.move, playerToMove, config);

    // Classify position type
    const positionType = this.classifyPosition(board, aiResult);

    // Determine difficulty rating
    const difficultyRating = this.determineDifficultyRating(aiResult, alternativeMoves, config.difficulty);

    const responseData: AIResponseData = {
      challengeId,
      gameId,
      boardState,
      playerToMove,
      sequenceStage,
      moveNumber,
      aiMove: aiResult.move,
      aiStrategy: config.strategy,
      aiDifficulty: config.difficulty,
      moveEvaluation: aiResult.evaluation,
      searchDepth: aiResult.searchDepth,
      nodesSearched: aiResult.nodesSearched,
      calculationTime: aiResult.timeElapsed,
      alternativeMoves,
      expectedPlayerResponse: expectedResponse,
      moveExplanation,
      tacticalThemes,
      difficultyRating,
      isPrimaryLine: true,
      isRetaliationMove: false,
      positionType,
      isForcingSequence: this.isForcingSequence(board, aiResult),
    };

    return responseData;
  }

  /**
   * Store AI response in the database
   */
  async storeAIResponse(responseData: AIResponseData): Promise<number> {
    const query = `
      INSERT INTO ai_response_moves (
        challenge_id, game_id, board_state, player_to_move, sequence_stage, move_number,
        ai_move, ai_strategy, ai_difficulty, move_evaluation, search_depth, nodes_searched,
        calculation_time, alternative_moves, expected_player_response, response_evaluation,
        move_explanation, tactical_themes, difficulty_rating, is_primary_line,
        is_retaliation_move, triggers_on_player_move, position_type, is_forcing_sequence
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING id
    `;

    const values = [
      responseData.challengeId || null,
      responseData.gameId || null,
      JSON.stringify(responseData.boardState),
      responseData.playerToMove,
      responseData.sequenceStage,
      responseData.moveNumber,
      responseData.aiMove,
      responseData.aiStrategy,
      responseData.aiDifficulty,
      responseData.moveEvaluation,
      responseData.searchDepth,
      responseData.nodesSearched || null,
      responseData.calculationTime,
      JSON.stringify(responseData.alternativeMoves || []),
      responseData.expectedPlayerResponse ? JSON.stringify(responseData.expectedPlayerResponse) : null,
      responseData.expectedPlayerResponse?.evaluation || null,
      responseData.moveExplanation || null,
      responseData.tacticalThemes || [],
      responseData.difficultyRating,
      responseData.isPrimaryLine,
      responseData.isRetaliationMove,
      responseData.triggersOnPlayerMove || null,
      responseData.positionType,
      responseData.isForcingSequence,
    ];

    const result = await this.db.query(query, values);
    const aiResponseId = result.rows[0].id;

    // Store alternative moves in separate table if they exist
    if (responseData.alternativeMoves && responseData.alternativeMoves.length > 0) {
      await this.storeAlternativeMoves(aiResponseId, responseData.alternativeMoves);
    }

    return aiResponseId;
  }

  /**
   * Generate and store complete AI responses for a challenge
   */
  async generateChallengeResponses(
    challengeId: number,
    config: AIResponseConfig,
    sequenceConfig?: ChallengeSequenceConfig,
  ): Promise<number[]> {
    // Get challenge data
    const challenge = await this.getChallengeById(challengeId);
    if (!challenge) {
      throw new Error(`Challenge with ID ${challengeId} not found`);
    }

    const responseIds: number[] = [];

    // Create sequence configuration if provided
    if (sequenceConfig) {
      await this.createChallengeSequence(sequenceConfig);
    }

    // Generate AI response for the initial position
    const initialResponse = await this.generateAIResponse(
      challenge.initialBoardState,
      challenge.currentPlayer as Piece,
      config,
      challengeId,
      undefined,
      1,
      1,
    );

    const initialResponseId = await this.storeAIResponse(initialResponse);
    responseIds.push(initialResponseId);

    // Generate retaliation moves for common player responses
    const retaliationResponses = await this.generateRetaliationMoves(
      challenge.initialBoardState,
      challenge.currentPlayer as Piece,
      initialResponse,
      config,
      challengeId,
    );

    for (const response of retaliationResponses) {
      const responseId = await this.storeAIResponse(response);
      responseIds.push(responseId);
    }

    return responseIds;
  }

  /**
   * Get AI response for a specific board position
   */
  async getAIResponse(
    boardStateHash: string,
    playerToMove: Piece,
    challengeId?: number,
    sequenceStage?: number,
  ): Promise<any | null> {
    let query = `
      SELECT * FROM ai_response_moves 
      WHERE board_hash = $1 AND player_to_move = $2
    `;
    const values: any[] = [boardStateHash, playerToMove];

    if (challengeId !== undefined) {
      query += ` AND challenge_id = $3`;
      values.push(challengeId);

      if (sequenceStage !== undefined) {
        query += ` AND sequence_stage = $4`;
        values.push(sequenceStage);
      }
    }

    query += ` ORDER BY sequence_priority DESC, validation_score DESC LIMIT 1`;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Generate alternative moves for a position
   */
  private async generateAlternativeMoves(
    board: Board,
    player: Piece,
    primaryResult: AIMoveResult,
    config: AIResponseConfig,
  ): Promise<any[]> {
    const alternatives: any[] = [];

    // Get all valid moves
    const validMoves = this.getValidMoves(board, player);

    // Evaluate alternative moves (excluding the primary move)
    for (const move of validMoves) {
      if (move === primaryResult.move) continue;

      // Create board with this move
      const testBoard = new Board(board.boardState);
      testBoard.placePiece(move, player);

      // Evaluate this position
      const evaluation = this.aiEngine.evaluatePosition(testBoard, player);
      const difference = primaryResult.evaluation - evaluation;

      // Classify the move
      let classification = 'acceptable';
      if (difference <= 25) classification = 'excellent';
      else if (difference <= 50) classification = 'good';
      else if (difference <= 100) classification = 'acceptable';
      else if (difference <= 200) classification = 'mistake';
      else classification = 'blunder';

      alternatives.push({
        move,
        evaluation,
        difference,
        classification,
        explanation: this.generateAlternativeMoveExplanation(move, classification, difference),
      });
    }

    // Sort by evaluation (best first) and take top 5
    return alternatives.sort((a, b) => b.evaluation - a.evaluation).slice(0, 5);
  }

  /**
   * Generate expected player response to AI move
   */
  private async generateExpectedPlayerResponse(
    board: Board,
    aiMove: number,
    aiPlayer: Piece,
    config: AIResponseConfig,
  ): Promise<{ move: number; evaluation: number } | undefined> {
    // Create board after AI move
    const newBoard = new Board(board.boardState);
    newBoard.placePiece(aiMove, aiPlayer);

    // Get opponent
    const opponent = aiPlayer === 'W' ? 'B' : 'W';
    newBoard.updateNextMoves(opponent);

    // Generate optimal response for opponent
    try {
      const opponentResponse = await this.aiEngine.getBestMove(
        newBoard,
        opponent,
        config.strategy,
        Math.min(config.difficulty, 4), // Limit depth for efficiency
        config.maxTime / 2, // Half the time for response calculation
      );

      return {
        move: opponentResponse.move,
        evaluation: -opponentResponse.evaluation, // Negate for perspective
      };
    } catch (error) {
      console.warn('Failed to generate expected player response:', error);
      return undefined;
    }
  }

  /**
   * Generate retaliation moves for common player deviations
   */
  private async generateRetaliationMoves(
    initialBoardState: any,
    initialPlayer: Piece,
    primaryResponse: AIResponseData,
    config: AIResponseConfig,
    challengeId: number,
  ): Promise<AIResponseData[]> {
    const retaliationMoves: AIResponseData[] = [];

    // Create board from initial state
    const board = new Board(this.boardStateToString(initialBoardState));
    const validPlayerMoves = this.getValidMoves(board, initialPlayer);

    // Generate AI responses for each possible player move (excluding the optimal one)
    for (const playerMove of validPlayerMoves) {
      // Skip if this is the expected optimal player move
      if (playerMove === this.getOptimalPlayerMoveFromSolution(initialBoardState)) {
        continue;
      }

      // Create board after player move
      const testBoard = new Board(board.boardState);
      testBoard.placePiece(playerMove, initialPlayer);

      // Get AI player (opposite of initial player)
      const aiPlayer = initialPlayer === 'W' ? 'B' : 'W';
      testBoard.updateNextMoves(aiPlayer);

      try {
        // Generate AI retaliation
        const retaliationResponse = await this.generateAIResponse(
          this.boardStringToState(testBoard.boardState),
          aiPlayer,
          config,
          challengeId,
          undefined,
          1,
          2, // Move number 2 since this is after initial player move
        );

        // Mark as retaliation move
        retaliationResponse.isRetaliationMove = true;
        retaliationResponse.triggersOnPlayerMove = playerMove;
        retaliationResponse.isPrimaryLine = false;
        retaliationResponse.moveExplanation = `AI response to player deviation (move ${playerMove}). ${retaliationResponse.moveExplanation || ''}`;

        retaliationMoves.push(retaliationResponse);
      } catch (error) {
        console.warn(`Failed to generate retaliation for player move ${playerMove}:`, error);
      }
    }

    return retaliationMoves;
  }

  /**
   * Store alternative moves in the database
   */
  private async storeAlternativeMoves(aiResponseId: number, alternatives: any[]): Promise<void> {
    const query = `
      INSERT INTO ai_move_alternatives (
        ai_response_move_id, move_position, evaluation, evaluation_difference,
        move_classification, explanation, probability_played, is_teaching_moment, learning_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    for (const alt of alternatives) {
      const isTeachingMoment = alt.classification === 'mistake' || alt.classification === 'blunder';
      const probabilityPlayed = this.calculateMoveProbability(alt.classification);
      const learningValue = this.generateLearningValue(alt);

      await this.db.query(query, [
        aiResponseId,
        alt.move,
        alt.evaluation,
        alt.difference,
        alt.classification,
        alt.explanation,
        probabilityPlayed,
        isTeachingMoment,
        learningValue,
      ]);
    }
  }

  /**
   * Create challenge sequence configuration
   */
  private async createChallengeSequence(config: ChallengeSequenceConfig): Promise<number> {
    const query = `
      INSERT INTO ai_challenge_sequences (
        challenge_id, sequence_name, description, total_stages, current_stage,
        is_linear, success_criteria, completion_rewards, difficulty_progression,
        estimated_duration, required_accuracy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;

    const values = [
      config.challengeId,
      config.sequenceName,
      config.description,
      config.totalStages,
      1, // current_stage starts at 1
      config.isLinear,
      JSON.stringify(config.successCriteria),
      JSON.stringify(config.completionRewards),
      config.difficultyProgression,
      config.estimatedDuration || null,
      config.requiredAccuracy,
    ];

    const result = await this.db.query(query, values);
    return result.rows[0].id;
  }

  // Helper methods

  private async getChallengeById(challengeId: number): Promise<any | null> {
    const query = `SELECT * FROM daily_challenges WHERE id = $1`;
    const result = await this.db.query(query, [challengeId]);
    return result.rows[0] || null;
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

  private boardStateToString(boardState: any): string {
    // Convert board state object to string format expected by Board class
    if (typeof boardState === 'string') return boardState;
    if (Array.isArray(boardState)) return boardState.join('');

    // If it's an object with properties, convert appropriately
    if (boardState.state) return boardState.state;

    // Default: assume it's a 64-character representation
    return JSON.stringify(boardState);
  }

  private boardStringToState(boardString: string): any {
    // Convert board string back to state object
    return {
      state: boardString,
      size: 8,
      lastMove: null,
    };
  }

  private generateMoveExplanation(
    board: Board,
    aiResult: AIMoveResult,
    player: Piece,
  ): { explanation: string; themes: string[] } {
    const themes: string[] = [];
    let explanation = '';

    const move = aiResult.move;
    const row = Math.floor(move / 8);
    const col = move % 8;

    // Check for corner moves
    if ([0, 7, 56, 63].includes(move)) {
      themes.push('corner-control');
      explanation += 'This corner move provides unflippable pieces and strong board control. ';
    }

    // Check for edge moves
    else if (this.isEdgeMove(move)) {
      themes.push('edge-play');
      explanation += 'This edge move helps establish positional advantage and limits opponent mobility. ';
    }

    // Check for mobility
    const opponentMoves = this.getValidMoves(board, player === 'W' ? 'B' : 'W');
    if (opponentMoves.length <= 3) {
      themes.push('mobility-restriction');
      explanation += 'This move severely restricts opponent mobility. ';
    }

    // Check for high piece count gain
    const testBoard = new Board(board.boardState);
    const beforeCount = this.countPieces(testBoard, player);
    testBoard.placePiece(move, player);
    const afterCount = this.countPieces(testBoard, player);
    const piecesGained = afterCount - beforeCount;

    if (piecesGained >= 8) {
      themes.push('material-gain');
      explanation += `This move flips ${piecesGained - 1} opponent pieces. `;
    }

    // Default explanation if no specific themes
    if (explanation === '') {
      explanation = 'This move maintains optimal position according to advanced evaluation. ';
    }

    return { explanation: explanation.trim(), themes };
  }

  private classifyPosition(board: Board, aiResult: AIMoveResult): string {
    const pieceCount = this.getTotalPieceCount(board);

    if (pieceCount <= 20) return 'opening';
    if (pieceCount <= 50) return 'midgame';
    if (pieceCount >= 58) return 'endgame';

    // Check for tactical themes
    if (aiResult.evaluation > 500) return 'tactical';
    return 'strategic';
  }

  private determineDifficultyRating(aiResult: AIMoveResult, alternatives: any[], aiDifficulty: number): string {
    // Base on AI difficulty and move evaluation spread
    if (aiDifficulty <= 2) return 'beginner';
    if (aiDifficulty <= 4) return 'intermediate';
    if (aiDifficulty <= 5) return 'advanced';
    return 'expert';
  }

  private isForcingSequence(board: Board, aiResult: AIMoveResult): boolean {
    // A move is forcing if it significantly limits opponent options
    const move = aiResult.move;
    const testBoard = new Board(board.boardState);
    const player = 'W'; // Assume white for simplicity

    testBoard.placePiece(move, player);
    const opponentMoves = this.getValidMoves(testBoard, 'B');

    return opponentMoves.length <= 2;
  }

  private generateAlternativeMoveExplanation(move: number, classification: string, difference: number): string {
    const position = `${String.fromCharCode(65 + (move % 8))}${Math.floor(move / 8) + 1}`;

    switch (classification) {
      case 'excellent':
        return `Move ${position} is nearly as strong as the best move (only ${difference} points difference).`;
      case 'good':
        return `Move ${position} is a solid choice with minor disadvantages (${difference} points worse).`;
      case 'acceptable':
        return `Move ${position} is playable but not optimal (${difference} points behind best).`;
      case 'mistake':
        return `Move ${position} is a mistake that gives unnecessary advantage to opponent (${difference} points lost).`;
      case 'blunder':
        return `Move ${position} is a serious blunder that severely damages position (${difference} points lost).`;
      default:
        return `Move ${position} has evaluation difference of ${difference} points.`;
    }
  }

  private calculateMoveProbability(classification: string): number {
    switch (classification) {
      case 'excellent':
        return 0.85;
      case 'good':
        return 0.6;
      case 'acceptable':
        return 0.35;
      case 'mistake':
        return 0.15;
      case 'blunder':
        return 0.05;
      default:
        return 0.5;
    }
  }

  private generateLearningValue(alternative: any): string {
    switch (alternative.classification) {
      case 'mistake':
        return 'This move demonstrates why position evaluation matters more than immediate piece gain.';
      case 'blunder':
        return 'This shows the importance of careful calculation before making moves.';
      case 'excellent':
        return 'This alternative shows multiple good options exist in strong positions.';
      default:
        return 'Understanding move alternatives helps improve strategic thinking.';
    }
  }

  private getOptimalPlayerMoveFromSolution(boardState: any): number | null {
    // This would extract the expected player move from challenge solution
    // Implementation depends on challenge data structure
    return null;
  }

  private isEdgeMove(move: number): boolean {
    const row = Math.floor(move / 8);
    const col = move % 8;
    return row === 0 || row === 7 || col === 0 || col === 7;
  }

  private countPieces(board: Board, player: Piece): number {
    let count = 0;
    const pieces = board.pieces;
    for (let i = 0; i < 64; i++) {
      if (pieces[i] === player) count++;
    }
    return count;
  }

  private getTotalPieceCount(board: Board): number {
    return this.countPieces(board, 'W') + this.countPieces(board, 'B');
  }

  /**
   * Validate stored AI responses by re-calculating them
   */
  async validateStoredResponses(challengeId?: number): Promise<{ validated: number; failed: number }> {
    let query = `SELECT * FROM ai_response_moves WHERE validation_score = 0`;
    const values: any[] = [];

    if (challengeId) {
      query += ` AND challenge_id = $1`;
      values.push(challengeId);
    }

    query += ` ORDER BY created_at ASC LIMIT 100`;

    const result = await this.db.query(query, values);
    let validated = 0;
    let failed = 0;

    for (const response of result.rows) {
      try {
        // Re-calculate the move
        const board = new Board(this.boardStateToString(response.board_state));
        board.updateNextMoves(response.player_to_move);

        const recalculated = await this.aiEngine.getBestMove(
          board,
          response.player_to_move,
          response.ai_strategy,
          response.ai_difficulty,
          2000,
        );

        // Calculate validation score
        const evaluationDiff = Math.abs(recalculated.evaluation - response.move_evaluation);
        const moveDiff = recalculated.move === response.ai_move ? 0 : 1;
        const validationScore = Math.max(0, 10 - evaluationDiff / 100 - moveDiff * 3);

        // Update validation score
        await this.db.query(
          `UPDATE ai_response_moves SET validation_score = $1, last_validated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [validationScore, response.id],
        );

        if (validationScore >= 7) validated++;
        else failed++;
      } catch (error) {
        console.error(`Validation failed for response ${response.id}:`, error);
        failed++;
      }
    }

    return { validated, failed };
  }
}

// Singleton instance
export const aiResponseGeneratorService = new AIResponseGeneratorService();
