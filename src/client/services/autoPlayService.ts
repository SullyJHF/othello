/**
 * Auto-play service for automatically making moves in Othello games
 * Supports different algorithms and timing controls for development/testing
 */

import { debugLog } from '../../shared/config/debugConfig';
import { AutoPlayConfig, AutoPlayState } from '../../shared/types/debugTypes';

export type MoveAlgorithm =
  | 'random'
  | 'greedy'
  | 'corner-seeking'
  | 'strategic'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export interface ValidMove {
  position: number;
  captureCount: number;
  isCorner: boolean;
  isEdge: boolean;
}

class AutoPlayService {
  private state: AutoPlayState = {
    isActive: false,
    config: {
      enabled: false,
      speed: 1,
      algorithm: 'random',
      playBothSides: false,
      stopConditions: {
        nearEndGame: false,
        specificScore: null,
        moveCount: null,
      },
    },
    moveCount: 0,
    startTime: 0,
    lastMoveTime: 0,
    errors: [],
    pendingMove: false,
  };

  private moveTimeout: NodeJS.Timeout | null = null;
  private listeners: Array<(state: AutoPlayState) => void> = [];

  /**
   * Initialize auto-play with configuration
   */
  initialize(config: Partial<AutoPlayConfig>): void {
    this.state.config = { ...this.state.config, ...config };
    this.state.config.enabled = true;
    debugLog('Auto-play service initialized', { config: this.state.config });
    this.notifyListeners();
  }

  /**
   * Start auto-play
   */
  start(): void {
    if (!this.state.config.enabled) {
      debugLog('Cannot start auto-play: service not enabled');
      return;
    }

    this.state.isActive = true;
    this.state.startTime = Date.now();
    this.state.moveCount = 0;
    this.state.errors = [];

    debugLog('Auto-play started', {
      algorithm: this.state.config.algorithm,
      speed: this.state.config.speed,
      playBothSides: this.state.config.playBothSides,
    });

    this.notifyListeners();
  }

  /**
   * Stop auto-play
   */
  stop(): void {
    this.state.isActive = false;

    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }

    debugLog('Auto-play stopped', {
      moveCount: this.state.moveCount,
      duration: Date.now() - this.state.startTime,
    });

    this.notifyListeners();
  }

  /**
   * Update auto-play configuration
   */
  updateConfig(updates: Partial<AutoPlayConfig>): void {
    this.state.config = { ...this.state.config, ...updates };
    debugLog('Auto-play config updated', { config: this.state.config });
    this.notifyListeners();
  }

  /**
   * Get current auto-play state
   */
  getState(): AutoPlayState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AutoPlayState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Check if auto-play should make a move for the current player
   */
  shouldMakeMove(currentPlayer: 'B' | 'W', gameStarted: boolean, gameFinished: boolean): boolean {
    if (!this.state.isActive || !this.state.config.enabled || !gameStarted || gameFinished) {
      return false;
    }

    // Check stop conditions
    if (this.shouldStop()) {
      this.stop();
      return false;
    }

    return true;
  }

  /**
   * Generate next move based on algorithm and board state
   */
  generateMove(
    boardState: string,
    validMoves: number[],
    currentPlayer: 'B' | 'W',
    scores: { black: number; white: number },
  ): number | null {
    if (validMoves.length === 0) {
      debugLog('No valid moves available for auto-play');
      return null;
    }

    const moves = this.analyzeValidMoves(boardState, validMoves);
    let selectedMove: number;

    switch (this.state.config.algorithm) {
      case 'random':
        selectedMove = this.selectRandomMove(moves);
        break;
      case 'greedy':
        selectedMove = this.selectGreedyMove(moves);
        break;
      case 'corner-seeking':
        selectedMove = this.selectCornerSeekingMove(moves);
        break;
      case 'strategic':
        selectedMove = this.selectStrategicMove(moves, currentPlayer, scores);
        break;
      case 'beginner':
        selectedMove = this.selectBeginnerMove(moves);
        break;
      case 'intermediate':
        selectedMove = this.selectIntermediateMove(moves, currentPlayer, scores);
        break;
      case 'advanced':
        selectedMove = this.selectAdvancedMove(moves, currentPlayer, scores);
        break;
      case 'expert':
        selectedMove = this.selectExpertMove(moves, currentPlayer, scores);
        break;
      default:
        selectedMove = this.selectRandomMove(moves);
    }

    debugLog('Auto-play move generated', {
      algorithm: this.state.config.algorithm,
      selectedMove,
      validMovesCount: validMoves.length,
      currentPlayer,
    });

    return selectedMove;
  }

  /**
   * Schedule next move with timing
   */
  scheduleMove(moveCallback: () => void): void {
    if (!this.state.isActive) return;

    // Calculate delay based on speed (1x = 2000ms, 5x = 400ms, 10x = 200ms)
    const baseDelay = 2000;
    const delay = Math.max(200, baseDelay / this.state.config.speed);

    this.moveTimeout = setTimeout(() => {
      if (this.state.isActive) {
        this.state.lastMoveTime = Date.now();
        this.state.moveCount++;
        moveCallback();
        this.notifyListeners();
      }
    }, delay);
  }

  /**
   * Record an error in auto-play
   */
  recordError(error: string): void {
    this.state.errors.push(error);
    debugLog('Auto-play error recorded', { error, totalErrors: this.state.errors.length });

    // Stop auto-play if too many errors
    if (this.state.errors.length >= 3) {
      debugLog('Stopping auto-play due to repeated errors');
      this.stop();
    }

    this.notifyListeners();
  }

  /**
   * Set pending move state (when a move is sent to server)
   */
  setPendingMove(): void {
    this.state.pendingMove = true;
    this.notifyListeners();
  }

  /**
   * Clear pending move state (when server response is received)
   */
  clearPendingMove(): void {
    this.state.pendingMove = false;
    this.notifyListeners();
  }

  /**
   * Check if we can make a move (not pending and active)
   */
  canMakeMove(): boolean {
    return this.state.isActive && !this.state.pendingMove;
  }

  /**
   * Private helper methods
   */
  private analyzeValidMoves(boardState: string, validMoves: number[]): ValidMove[] {
    return validMoves.map((position) => {
      const captureCount = this.calculateCaptureCount(boardState, position);
      const isCorner = this.isCornerPosition(position);
      const isEdge = this.isEdgePosition(position);

      return {
        position,
        captureCount,
        isCorner,
        isEdge,
      };
    });
  }

  private selectRandomMove(moves: ValidMove[]): number {
    if (moves.length === 0) {
      throw new Error('No valid moves available');
    }
    const randomIndex = Math.floor(Math.random() * moves.length);
    const selectedMove = moves[randomIndex];
    if (!selectedMove) {
      throw new Error('Selected move is undefined');
    }
    return selectedMove.position;
  }

  private selectGreedyMove(moves: ValidMove[]): number {
    // Select move that captures the most pieces
    const maxCaptures = Math.max(...moves.map((m) => m.captureCount));
    const bestMoves = moves.filter((m) => m.captureCount === maxCaptures);
    return this.selectRandomMove(bestMoves);
  }

  private selectCornerSeekingMove(moves: ValidMove[]): number {
    // Prioritize corners, then edges, then highest capture count
    const cornerMoves = moves.filter((m) => m.isCorner);
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    const edgeMoves = moves.filter((m) => m.isEdge);
    if (edgeMoves.length > 0) {
      return this.selectGreedyMove(edgeMoves);
    }

    return this.selectGreedyMove(moves);
  }

  private selectStrategicMove(
    moves: ValidMove[],
    _currentPlayer: 'B' | 'W',
    _scores: { black: number; white: number },
  ): number {
    // Basic strategy: corners > avoid positions next to corners > maximize captures
    const cornerMoves = moves.filter((m) => m.isCorner);
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    // Avoid positions adjacent to corners (positions that give opponent corner access)
    const dangerousPositions = [1, 6, 8, 15, 48, 55, 57, 62]; // Adjacent to corners
    const safeMoves = moves.filter((m) => !dangerousPositions.includes(m.position));

    if (safeMoves.length > 0) {
      return this.selectGreedyMove(safeMoves);
    }

    return this.selectGreedyMove(moves);
  }

  private selectBeginnerMove(moves: ValidMove[]): number {
    // Beginner: 80% random, 20% prefer corners if available
    if (Math.random() < 0.8) {
      return this.selectRandomMove(moves);
    }

    const cornerMoves = moves.filter((m) => m.isCorner);
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    return this.selectRandomMove(moves);
  }

  private selectIntermediateMove(
    moves: ValidMove[],
    _currentPlayer: 'B' | 'W',
    _scores: { black: number; white: number },
  ): number {
    // Intermediate: corners > greedy moves with some randomness
    const cornerMoves = moves.filter((m) => m.isCorner);
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    // 30% chance to make a random move instead of greedy
    if (Math.random() < 0.3) {
      return this.selectRandomMove(moves);
    }

    return this.selectGreedyMove(moves);
  }

  private selectAdvancedMove(
    moves: ValidMove[],
    _currentPlayer: 'B' | 'W',
    _scores: { black: number; white: number },
  ): number {
    // Advanced: strategic with minimal randomness
    const cornerMoves = moves.filter((m) => m.isCorner);
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    // Avoid dangerous positions (adjacent to corners)
    const dangerousPositions = [1, 6, 8, 15, 48, 55, 57, 62];
    const safeMoves = moves.filter((m) => !dangerousPositions.includes(m.position));

    if (safeMoves.length > 0) {
      // Prefer edge moves among safe moves
      const safeEdgeMoves = safeMoves.filter((m) => m.isEdge);
      if (safeEdgeMoves.length > 0) {
        return this.selectGreedyMove(safeEdgeMoves);
      }
      return this.selectGreedyMove(safeMoves);
    }

    // 10% chance to make a random risky move
    if (Math.random() < 0.1) {
      return this.selectRandomMove(moves);
    }

    return this.selectGreedyMove(moves);
  }

  private selectExpertMove(
    moves: ValidMove[],
    currentPlayer: 'B' | 'W',
    scores: { black: number; white: number },
  ): number {
    // Expert: full strategic analysis
    const cornerMoves = moves.filter((m) => m.isCorner);
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    // Avoid dangerous positions unless absolutely necessary
    const dangerousPositions = [1, 6, 8, 15, 48, 55, 57, 62];
    const safeMoves = moves.filter((m) => !dangerousPositions.includes(m.position));

    if (safeMoves.length > 0) {
      // Advanced positional evaluation
      const scoredMoves = safeMoves.map((move) => ({
        ...move,
        score: this.calculateExpertScore(move, currentPlayer, scores),
      }));

      scoredMoves.sort((a, b) => b.score - a.score);

      // Take best move with 5% randomness among top 2 moves
      if (scoredMoves.length > 1 && Math.random() < 0.05) {
        return Math.random() < 0.5 ? scoredMoves[0].position : scoredMoves[1].position;
      }

      return scoredMoves[0].position;
    }

    // If forced to make dangerous move, choose carefully
    return this.selectGreedyMove(moves);
  }

  private calculateExpertScore(
    move: ValidMove,
    currentPlayer: 'B' | 'W',
    scores: { black: number; white: number },
  ): number {
    let score = 0;

    // Capture count (immediate gain)
    score += move.captureCount * 2;

    // Position value (corners are best, edges are good)
    if (move.isCorner) {
      score += 50;
    } else if (move.isEdge) {
      score += 10;
    }

    // Mobility consideration (prefer moves that don't limit future options)
    score += this.estimateMobilityImpact(move.position);

    // Endgame considerations
    const totalPieces = scores.black + scores.white;
    if (totalPieces > 50) {
      // Late game: prioritize immediate captures more
      score += move.captureCount * 3;
    }

    return score;
  }

  private estimateMobilityImpact(position: number): number {
    // Simple heuristic: center positions generally provide more mobility
    const row = Math.floor(position / 8);
    const col = position % 8;
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    return Math.max(0, 7 - centerDistance);
  }

  private calculateCaptureCount(_boardState: string, _position: number): number {
    // This is a simplified calculation - in reality this would need the full game logic
    // For now, return a random number between 1-8 as an approximation
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

  private shouldStop(): boolean {
    const { stopConditions } = this.state.config;

    if (stopConditions.moveCount && this.state.moveCount >= stopConditions.moveCount) {
      debugLog('Auto-play stopped: move count limit reached');
      return true;
    }

    // Additional stop conditions can be added here
    return false;
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debugLog('Error notifying auto-play listener', { error: errorMessage });
      }
    });
  }
}

// Export singleton instance
export const autoPlayService = new AutoPlayService();
