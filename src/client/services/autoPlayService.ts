/**
 * Auto-play service for automatically making moves in Othello games
 * Supports different algorithms and timing controls for development/testing
 */

import { debugLog } from '../../shared/config/debugConfig';
import { AutoPlayConfig, AutoPlayState } from '../../shared/types/debugTypes';

export type MoveAlgorithm = 'random' | 'greedy' | 'corner-seeking' | 'strategic';

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
      playBothSides: this.state.config.playBothSides 
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
      duration: Date.now() - this.state.startTime 
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
      this.listeners = this.listeners.filter(l => l !== listener);
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
    scores: { black: number; white: number }
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
      default:
        selectedMove = this.selectRandomMove(moves);
    }

    debugLog('Auto-play move generated', {
      algorithm: this.state.config.algorithm,
      selectedMove,
      validMovesCount: validMoves.length,
      currentPlayer
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
   * Private helper methods
   */
  private analyzeValidMoves(boardState: string, validMoves: number[]): ValidMove[] {
    return validMoves.map(position => {
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
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex].position;
  }

  private selectGreedyMove(moves: ValidMove[]): number {
    // Select move that captures the most pieces
    const maxCaptures = Math.max(...moves.map(m => m.captureCount));
    const bestMoves = moves.filter(m => m.captureCount === maxCaptures);
    return this.selectRandomMove(bestMoves);
  }

  private selectCornerSeekingMove(moves: ValidMove[]): number {
    // Prioritize corners, then edges, then highest capture count
    const cornerMoves = moves.filter(m => m.isCorner);
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    const edgeMoves = moves.filter(m => m.isEdge);
    if (edgeMoves.length > 0) {
      return this.selectGreedyMove(edgeMoves);
    }

    return this.selectGreedyMove(moves);
  }

  private selectStrategicMove(moves: ValidMove[], currentPlayer: 'B' | 'W', scores: { black: number; white: number }): number {
    // Basic strategy: corners > avoid positions next to corners > maximize captures
    const cornerMoves = moves.filter(m => m.isCorner);
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    // Avoid positions adjacent to corners (positions that give opponent corner access)
    const dangerousPositions = [1, 6, 8, 15, 48, 55, 57, 62]; // Adjacent to corners
    const safeMoves = moves.filter(m => !dangerousPositions.includes(m.position));
    
    if (safeMoves.length > 0) {
      return this.selectGreedyMove(safeMoves);
    }

    return this.selectGreedyMove(moves);
  }

  private calculateCaptureCount(boardState: string, position: number): number {
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
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        debugLog('Error notifying auto-play listener', { error: error.message });
      }
    });
  }
}

// Export singleton instance
export const autoPlayService = new AutoPlayService();