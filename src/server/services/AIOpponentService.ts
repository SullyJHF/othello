import { GameMode } from '../../shared/types/gameModeTypes';

export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type AIPersonality = 'aggressive' | 'defensive' | 'balanced' | 'unpredictable';

export interface AIOpponent {
  id: string;
  name: string;
  difficulty: AIDifficulty;
  personality: AIPersonality;
  description: string;
  avatar?: string;
  moveDelayRange: [number, number]; // Min/max delay in milliseconds
  algorithm: AIAlgorithmConfig;
}

export interface AIAlgorithmConfig {
  type: 'minimax' | 'greedy' | 'positional' | 'random';
  depth?: number; // For minimax
  randomness?: number; // 0-1, amount of randomness to add
  positionWeights?: number[]; // Board position weights
  evaluationFactors?: {
    pieceCount: number;
    mobility: number;
    corners: number;
    edges: number;
    stability: number;
  };
}

export interface AIMove {
  position: number;
  confidence: number; // 0-1, AI's confidence in this move
  reasoning?: string; // Optional explanation of the move
  alternativeMoves?: number[]; // Other moves considered
}

export interface ValidMove {
  position: number;
  captureCount: number;
  isCorner: boolean;
  isEdge: boolean;
  positionValue: number;
}

export class AIOpponentService {
  private static instance: AIOpponentService;
  private opponents: Map<string, AIOpponent> = new Map();

  private constructor() {
    this.initializeDefaultOpponents();
  }

  public static getInstance(): AIOpponentService {
    if (!AIOpponentService.instance) {
      AIOpponentService.instance = new AIOpponentService();
    }
    return AIOpponentService.instance;
  }

  /**
   * Initialize default AI opponents with different personalities and difficulties
   */
  private initializeDefaultOpponents(): void {
    const defaultOpponents: AIOpponent[] = [
      // Beginner Level
      {
        id: 'rookie-robot',
        name: 'Rookie Robot',
        difficulty: 'beginner',
        personality: 'unpredictable',
        description: 'A friendly AI that makes mostly random moves with occasional good choices. Perfect for learning!',
        moveDelayRange: [1000, 3000],
        algorithm: {
          type: 'random',
          randomness: 0.8,
        },
      },
      {
        id: 'student-sam',
        name: 'Student Sam',
        difficulty: 'beginner',
        personality: 'balanced',
        description: 'An AI student learning Othello. Makes simple moves but sometimes finds good opportunities.',
        moveDelayRange: [1500, 4000],
        algorithm: {
          type: 'greedy',
          randomness: 0.6,
          evaluationFactors: {
            pieceCount: 1.0,
            mobility: 0.1,
            corners: 0.2,
            edges: 0.1,
            stability: 0.0,
          },
        },
      },

      // Intermediate Level
      {
        id: 'clever-cat',
        name: 'Clever Cat',
        difficulty: 'intermediate',
        personality: 'aggressive',
        description: 'Focuses on capturing as many pieces as possible each turn. Aggressive but predictable.',
        moveDelayRange: [800, 2500],
        algorithm: {
          type: 'greedy',
          randomness: 0.3,
          evaluationFactors: {
            pieceCount: 1.0,
            mobility: 0.3,
            corners: 0.5,
            edges: 0.2,
            stability: 0.1,
          },
        },
      },
      {
        id: 'tactical-turtle',
        name: 'Tactical Turtle',
        difficulty: 'intermediate',
        personality: 'defensive',
        description: 'Plays defensively, focusing on board position and avoiding risky moves.',
        moveDelayRange: [1200, 3500],
        algorithm: {
          type: 'positional',
          randomness: 0.2,
          evaluationFactors: {
            pieceCount: 0.6,
            mobility: 0.4,
            corners: 0.8,
            edges: 0.3,
            stability: 0.5,
          },
        },
      },

      // Advanced Level
      {
        id: 'strategic-sphinx',
        name: 'Strategic Sphinx',
        difficulty: 'advanced',
        personality: 'balanced',
        description: 'A well-rounded opponent that considers multiple factors. Excellent for improving your game.',
        moveDelayRange: [1000, 2800],
        algorithm: {
          type: 'minimax',
          depth: 4,
          randomness: 0.1,
          evaluationFactors: {
            pieceCount: 0.7,
            mobility: 0.6,
            corners: 1.0,
            edges: 0.4,
            stability: 0.7,
          },
        },
      },
      {
        id: 'corner-master',
        name: 'Corner Master',
        difficulty: 'advanced',
        personality: 'aggressive',
        description: 'Obsessed with controlling corners and edges. Very strategic about board control.',
        moveDelayRange: [900, 2200],
        algorithm: {
          type: 'positional',
          randomness: 0.05,
          evaluationFactors: {
            pieceCount: 0.4,
            mobility: 0.5,
            corners: 1.5,
            edges: 0.8,
            stability: 0.9,
          },
        },
      },

      // Expert Level
      {
        id: 'grandmaster-eagle',
        name: 'Grandmaster Eagle',
        difficulty: 'expert',
        personality: 'balanced',
        description: 'A formidable opponent that thinks several moves ahead. Only for the most skilled players!',
        moveDelayRange: [800, 2000],
        algorithm: {
          type: 'minimax',
          depth: 6,
          randomness: 0.02,
          evaluationFactors: {
            pieceCount: 0.6,
            mobility: 0.8,
            corners: 1.2,
            edges: 0.6,
            stability: 1.0,
          },
        },
      },
      {
        id: 'perfect-phoenix',
        name: 'Perfect Phoenix',
        difficulty: 'expert',
        personality: 'unpredictable',
        description: 'The ultimate challenge. Uses advanced algorithms and deep analysis. Can you defeat it?',
        moveDelayRange: [1200, 2500],
        algorithm: {
          type: 'minimax',
          depth: 8,
          randomness: 0.01,
          evaluationFactors: {
            pieceCount: 0.5,
            mobility: 1.0,
            corners: 1.3,
            edges: 0.7,
            stability: 1.2,
          },
        },
      },
    ];

    defaultOpponents.forEach((opponent) => {
      this.opponents.set(opponent.id, opponent);
    });
  }

  /**
   * Get all available AI opponents
   */
  getAllOpponents(): AIOpponent[] {
    return Array.from(this.opponents.values());
  }

  /**
   * Get opponents by difficulty level
   */
  getOpponentsByDifficulty(difficulty: AIDifficulty): AIOpponent[] {
    return this.getAllOpponents().filter((opponent) => opponent.difficulty === difficulty);
  }

  /**
   * Get a specific opponent by ID
   */
  getOpponentById(id: string): AIOpponent | undefined {
    return this.opponents.get(id);
  }

  /**
   * Generate a move for an AI opponent
   */
  async generateMove(
    opponentId: string,
    boardState: string,
    validMoves: number[],
    currentPlayer: 'B' | 'W',
    gameMode?: GameMode,
  ): Promise<AIMove | null> {
    const opponent = this.getOpponentById(opponentId);
    if (!opponent) {
      throw new Error(`AI opponent not found: ${opponentId}`);
    }

    if (validMoves.length === 0) {
      return null;
    }

    // Add realistic delay to simulate thinking
    const delay = this.getRandomDelay(opponent.moveDelayRange);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const moves = this.analyzeValidMoves(boardState, validMoves);
    const selectedMove = this.selectMoveUsingAlgorithm(moves, opponent.algorithm, currentPlayer);

    return {
      position: selectedMove,
      confidence: this.calculateMoveConfidence(selectedMove, moves, opponent.algorithm),
      reasoning: this.generateMoveReasoning(selectedMove, moves, opponent),
      alternativeMoves: this.getAlternativeMoves(selectedMove, moves, 2),
    };
  }

  /**
   * Analyze all valid moves and calculate their strategic value
   */
  private analyzeValidMoves(boardState: string, validMoves: number[]): ValidMove[] {
    return validMoves.map((position) => ({
      position,
      captureCount: this.calculateCaptureCount(boardState, position),
      isCorner: this.isCornerPosition(position),
      isEdge: this.isEdgePosition(position),
      positionValue: this.calculatePositionValue(position),
    }));
  }

  /**
   * Select move based on AI algorithm
   */
  private selectMoveUsingAlgorithm(moves: ValidMove[], algorithm: AIAlgorithmConfig, currentPlayer: 'B' | 'W'): number {
    switch (algorithm.type) {
      case 'random':
        return this.selectRandomMove(moves, algorithm.randomness || 1.0);
      case 'greedy':
        return this.selectGreedyMove(moves, algorithm);
      case 'positional':
        return this.selectPositionalMove(moves, algorithm);
      case 'minimax':
        return this.selectMinimaxMove(moves, algorithm, currentPlayer);
      default:
        return this.selectRandomMove(moves, 1.0);
    }
  }

  /**
   * Random move selection with optional bias toward better moves
   */
  private selectRandomMove(moves: ValidMove[], randomness: number): number {
    if (randomness >= 1.0 || Math.random() < randomness) {
      // Pure random selection
      const randomIndex = Math.floor(Math.random() * moves.length);
      return moves[randomIndex].position;
    } else {
      // Bias toward moves with higher capture count
      const weightedMoves = moves.map((move) => ({
        ...move,
        weight: move.captureCount + (move.isCorner ? 10 : 0) + (move.isEdge ? 3 : 0),
      }));

      const totalWeight = weightedMoves.reduce((sum, move) => sum + move.weight, 0);
      let randomValue = Math.random() * totalWeight;

      for (const move of weightedMoves) {
        randomValue -= move.weight;
        if (randomValue <= 0) {
          return move.position;
        }
      }

      return moves[0].position;
    }
  }

  /**
   * Greedy move selection focusing on immediate piece capture
   */
  private selectGreedyMove(moves: ValidMove[], algorithm: AIAlgorithmConfig): number {
    const factors = algorithm.evaluationFactors || {
      pieceCount: 1.0,
      mobility: 0.0,
      corners: 0.5,
      edges: 0.2,
      stability: 0.0,
    };

    const scoredMoves = moves.map((move) => ({
      ...move,
      score: this.calculateMoveScore(move, factors),
    }));

    scoredMoves.sort((a, b) => b.score - a.score);

    // Add some randomness if specified
    if (algorithm.randomness && algorithm.randomness > 0 && Math.random() < algorithm.randomness) {
      const topMoves = scoredMoves.slice(0, Math.max(1, Math.ceil(scoredMoves.length * 0.3)));
      const randomIndex = Math.floor(Math.random() * topMoves.length);
      return topMoves[randomIndex].position;
    }

    return scoredMoves[0].position;
  }

  /**
   * Positional move selection focusing on board control
   */
  private selectPositionalMove(moves: ValidMove[], algorithm: AIAlgorithmConfig): number {
    const factors = algorithm.evaluationFactors || {
      pieceCount: 0.6,
      mobility: 0.4,
      corners: 1.0,
      edges: 0.3,
      stability: 0.5,
    };

    const scoredMoves = moves.map((move) => ({
      ...move,
      score: this.calculatePositionalScore(move, factors),
    }));

    scoredMoves.sort((a, b) => b.score - a.score);

    // Apply randomness
    if (algorithm.randomness && algorithm.randomness > 0 && Math.random() < algorithm.randomness) {
      const topMoves = scoredMoves.slice(0, Math.max(1, Math.ceil(scoredMoves.length * 0.2)));
      const randomIndex = Math.floor(Math.random() * topMoves.length);
      return topMoves[randomIndex].position;
    }

    return scoredMoves[0].position;
  }

  /**
   * Minimax algorithm for advanced AI (simplified version)
   */
  private selectMinimaxMove(moves: ValidMove[], algorithm: AIAlgorithmConfig, currentPlayer: 'B' | 'W'): number {
    // Simplified minimax - for now, just use enhanced positional scoring
    // In a full implementation, this would simulate future game states
    const factors = algorithm.evaluationFactors || {
      pieceCount: 0.5,
      mobility: 0.8,
      corners: 1.2,
      edges: 0.6,
      stability: 1.0,
    };

    const scoredMoves = moves.map((move) => ({
      ...move,
      score: this.calculateAdvancedScore(move, factors, currentPlayer),
    }));

    scoredMoves.sort((a, b) => b.score - a.score);

    // Minimal randomness for expert level
    if (algorithm.randomness && algorithm.randomness > 0 && Math.random() < algorithm.randomness) {
      const topMoves = scoredMoves.slice(0, Math.max(1, 2));
      const randomIndex = Math.floor(Math.random() * topMoves.length);
      return topMoves[randomIndex].position;
    }

    return scoredMoves[0].position;
  }

  /**
   * Calculate move score based on evaluation factors
   */
  private calculateMoveScore(move: ValidMove, factors: any): number {
    return (
      move.captureCount * factors.pieceCount +
      (move.isCorner ? 10 : 0) * factors.corners +
      (move.isEdge ? 3 : 0) * factors.edges +
      move.positionValue * factors.stability
    );
  }

  /**
   * Calculate positional score emphasizing board control
   */
  private calculatePositionalScore(move: ValidMove, factors: any): number {
    let score = move.positionValue * factors.stability;

    if (move.isCorner) {
      score += 20 * factors.corners;
    } else if (move.isEdge) {
      score += 5 * factors.edges;
    }

    // Reduce score for positions adjacent to corners (unless we control the corner)
    if (this.isAdjacentToCorner(move.position)) {
      score -= 8 * factors.stability;
    }

    score += move.captureCount * factors.pieceCount;

    return score;
  }

  /**
   * Calculate advanced score for minimax algorithm
   */
  private calculateAdvancedScore(move: ValidMove, factors: any, currentPlayer: 'B' | 'W'): number {
    let score = this.calculatePositionalScore(move, factors);

    // Add mobility considerations (simplified)
    score += this.estimateMobilityImpact(move.position) * factors.mobility;

    return score;
  }

  /**
   * Helper methods for board analysis
   */
  private calculateCaptureCount(boardState: string, position: number): number {
    // Simplified calculation - in full implementation would use actual game logic
    return Math.floor(Math.random() * 8) + 1;
  }

  private isCornerPosition(position: number): boolean {
    return [0, 7, 56, 63].includes(position);
  }

  private isEdgePosition(position: number): boolean {
    const row = Math.floor(position / 8);
    const col = position % 8;
    return row === 0 || row === 7 || col === 0 || col === 7;
  }

  private isAdjacentToCorner(position: number): boolean {
    const adjacentToCorners = [1, 8, 9, 6, 14, 15, 48, 49, 57, 54, 62, 55];
    return adjacentToCorners.includes(position);
  }

  private calculatePositionValue(position: number): number {
    // Board position values (corners highest, adjacent to corners lowest)
    const values = [
      100, -20, 11, 8, 8, 11, -20, 100, -20, -40, -5, -3, -3, -5, -40, -20, 11, -5, 2, 2, 2, 2, -5, 11, 8, -3, 2, 1, 1,
      2, -3, 8, 8, -3, 2, 1, 1, 2, -3, 8, 11, -5, 2, 2, 2, 2, -5, 11, -20, -40, -5, -3, -3, -5, -40, -20, 100, -20, 11,
      8, 8, 11, -20, 100,
    ];
    return values[position] || 0;
  }

  private estimateMobilityImpact(position: number): number {
    // Simplified mobility estimation
    return Math.random() * 5;
  }

  private calculateMoveConfidence(selectedMove: number, allMoves: ValidMove[], algorithm: AIAlgorithmConfig): number {
    const selectedMoveData = allMoves.find((m) => m.position === selectedMove);
    if (!selectedMoveData) return 0.5;

    // Higher confidence for corner moves, lower for risky moves
    let confidence = 0.5;

    if (selectedMoveData.isCorner) confidence += 0.3;
    if (selectedMoveData.isEdge) confidence += 0.1;
    if (this.isAdjacentToCorner(selectedMove)) confidence -= 0.2;

    // Adjust based on algorithm type
    switch (algorithm.type) {
      case 'minimax':
        confidence += 0.2;
        break;
      case 'random':
        confidence = Math.random() * 0.6 + 0.2;
        break;
    }

    return Math.max(0.1, Math.min(0.9, confidence));
  }

  private generateMoveReasoning(selectedMove: number, allMoves: ValidMove[], opponent: AIOpponent): string {
    const move = allMoves.find((m) => m.position === selectedMove);
    if (!move) return 'I think this is a good move.';

    const reasons: string[] = [];

    if (move.isCorner) {
      reasons.push('securing a corner');
    } else if (move.isEdge) {
      reasons.push('controlling the edge');
    }

    if (move.captureCount > 5) {
      reasons.push('capturing many pieces');
    }

    if (reasons.length === 0) {
      switch (opponent.personality) {
        case 'aggressive':
          reasons.push('going for the attack');
          break;
        case 'defensive':
          reasons.push('playing it safe');
          break;
        case 'balanced':
          reasons.push('maintaining balance');
          break;
        default:
          reasons.push('following my strategy');
      }
    }

    return `I'm ${reasons.join(' and ')}.`;
  }

  private getAlternativeMoves(selectedMove: number, allMoves: ValidMove[], count: number): number[] {
    return allMoves
      .filter((move) => move.position !== selectedMove)
      .sort((a, b) => b.captureCount - a.captureCount)
      .slice(0, count)
      .map((move) => move.position);
  }

  private getRandomDelay([min, max]: [number, number]): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
