import crypto from 'crypto';
import { TimerConfig, ChallengeConfig } from '../../shared/types/gameModeTypes';
import { HOST, CLIENT_PORT } from '../env';
import { latencyCompensation } from '../services/LatencyCompensation';
import { Board, OPPOSITE_PIECE } from './Board';
import { ConnectedUser } from './UserManager';

export type Piece = 'W' | 'B';

export interface Player extends ConnectedUser {
  piece?: Piece;
}

export interface PlayerTimerState {
  userId: string;
  remainingTime: number; // Time remaining in seconds
  isActive: boolean; // Whether this player's timer is currently running
  lastUpdateTime: Date; // When the timer was last updated
  totalMoveTime: number; // Total time spent on moves
  moveCount: number; // Number of moves made
  timeWarnings: ('low' | 'critical')[]; // Warnings issued
  isPaused: boolean; // Whether timer is paused (for disconnections)
  pausedAt?: Date; // When timer was paused
  totalPausedTime: number; // Total time spent paused
}

export interface GameTimerState {
  config: TimerConfig;
  playerTimers: { [userId: string]: PlayerTimerState };
  gameStartTime: Date;
  currentPlayerStartTime?: Date; // When current player's turn started
  isGamePaused: boolean;
  totalGameTime: number; // Total elapsed game time
}
export class Game {
  id: string;
  joinUrl: string;
  currentPlayer: Piece;
  players: { [userId: string]: Player };
  gameStarted: boolean;
  gameFull: boolean;
  gameFinished: boolean;
  createdAt: Date;
  lastActivityAt: Date;

  // Game mode support
  gameModeId?: string;
  timerState?: GameTimerState;

  // Challenge mode support
  isChallenge?: boolean;
  challengeConfig?: ChallengeConfig;
  challengeData?: {
    challengeId: string;
    attemptsUsed: number;
    hintsUsed: number[];
    startTime: Date;
    solution?: {
      moves: number[];
      explanation: string;
      alternativeSolutions?: number[][];
    };
    // Enhanced AI system integration
    aiStrategy: 'minimax' | 'alphabeta' | 'random';
    aiDifficulty: number; // 1-6 difficulty level
    sessionId?: string; // Multi-stage challenge session ID
    currentStage: number; // Current stage in multi-stage challenges
    totalStages: number; // Total number of stages
    moveSequences: Array<{
      stageNumber: number;
      playerMove: number;
      aiResponse?: number;
      boardAfterPlayer: string;
      boardAfterAI?: string;
      completed: boolean;
      accuracy: number;
      timeSpent: number;
      hintsUsed: number;
    }>;
    currentSequenceStep: number;
    totalSequenceSteps: number;
    overallAccuracy: number;
    totalTimeSpent: number;
    isMultiStage: boolean;
    // Temporary state for multi-stage challenges
    temporaryMoves: number[]; // Moves made but not yet submitted
    temporaryBoardState: string; // Board state with temporary moves applied
    currentMoveIndex: number; // Current position in the move sequence
  };

  board: Board;

  constructor(
    gameModeId?: string,
    timerConfig?: TimerConfig,
    challengeOptions?: {
      boardState: string;
      currentPlayer: Piece;
      challengeId: string;
      challengeConfig: ChallengeConfig;
    },
  ) {
    this.id = crypto.randomBytes(3).toString('hex');
    // Include port for localhost, but not for production domains
    const baseUrl = HOST === 'localhost' ? `http://${HOST}:${CLIENT_PORT}` : `https://${HOST}`;
    this.joinUrl = `${baseUrl}/join/${this.id}`;
    this.currentPlayer = challengeOptions?.currentPlayer || 'B';
    this.players = {};
    this.gameFull = false;
    this.gameStarted = false;
    this.gameFinished = false;
    this.createdAt = new Date();
    this.lastActivityAt = new Date();

    // Initialize challenge mode
    if (challengeOptions) {
      this.isChallenge = true;
      this.challengeConfig = challengeOptions.challengeConfig;
      this.challengeData = {
        challengeId: challengeOptions.challengeId,
        attemptsUsed: 0,
        hintsUsed: [],
        startTime: new Date(),
        solution: challengeOptions.challengeConfig.solution,
        // Enhanced AI system integration
        aiStrategy: 'alphabeta', // Default to best strategy
        aiDifficulty: challengeOptions.challengeConfig.difficulty || 3,
        currentStage: 1,
        totalStages: 1, // Single stage by default, can be updated for multi-stage
        moveSequences: [],
        currentSequenceStep: 0,
        totalSequenceSteps: challengeOptions.challengeConfig.solution?.moves.length || 1,
        overallAccuracy: 0,
        totalTimeSpent: 0,
        isMultiStage: false,
        // Initialize temporary state for multi-stage challenges
        temporaryMoves: [],
        temporaryBoardState: challengeOptions.boardState,
        currentMoveIndex: 0,
      };
      this.board = new Board();
      this.board.setBoardState(challengeOptions.boardState, challengeOptions.currentPlayer);
    } else {
      this.board = new Board();
    }

    // Initialize game mode if provided
    if (gameModeId) {
      this.gameModeId = gameModeId;
    }

    // Initialize timer state if timer config is provided
    if (timerConfig) {
      this.timerState = {
        config: timerConfig,
        playerTimers: {},
        gameStartTime: new Date(),
        isGamePaused: false,
        totalGameTime: 0,
      };
    }
  }

  startGame() {
    const pieces: ('W' | 'B')[] = ['W', 'B'];
    const firstPiece = Math.floor(Math.random() * 2);
    const secondPiece = (firstPiece + 1) % 2;
    const userIds = Object.keys(this.players);

    if (userIds.length >= 2) {
      const userId1 = userIds[0];
      const userId2 = userIds[1];

      if (userId1 && userId2) {
        const player1 = this.players[userId1];
        const player2 = this.players[userId2];

        if (player1 && player2) {
          const piece1 = pieces[firstPiece];
          const piece2 = pieces[secondPiece];
          if (piece1 && piece2) {
            player1.piece = piece1;
            player2.piece = piece2;
          }
        }
      }
    }

    this.board = new Board();
    this.gameStarted = true;
    this.lastActivityAt = new Date();

    // Initialize timer system if enabled
    if (this.timerState) {
      this.timerState.gameStartTime = new Date();

      // Initialize timers for all players
      Object.keys(this.players).forEach((userId) => {
        this.initializePlayerTimer(userId);
      });

      // Start timer for the first player (current player)
      const firstPlayerUserId = Object.keys(this.players).find(
        (userId) => this.players[userId].piece === this.currentPlayer,
      );
      if (firstPlayerUserId) {
        this.startPlayerTimer(firstPlayerUserId);
      }
    }
  }

  getGameData() {
    return this;
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }

  addOrUpdatePlayer(user: ConnectedUser): { success: boolean; error?: string } {
    if (this.players[user.userId]) {
      const wasConnected = this.players[user.userId].connected;
      this.players[user.userId] = { ...this.players[user.userId], ...user };

      // Handle timer resume if player was disconnected and is now reconnecting
      if (!wasConnected && user.connected && this.isTimerEnabled()) {
        this.resumePlayerTimer(user.userId);
      }

      return { success: true };
    }

    if (this.gameFull) {
      return { success: false, error: 'Game is full' };
    }

    if (this.getPlayerCount() === 0) {
      this.players[user.userId] = { ...user, piece: 'B' };
    } else {
      this.players[user.userId] = { ...user, piece: 'W' };
      this.gameFull = true;
    }

    return { success: true };
  }

  removePlayer(user: ConnectedUser) {
    const { userId } = user;
    const player = this.players[userId];
    if (player) {
      player.connected = false;

      // Handle timer pause if player disconnects and timer is enabled
      if (this.isTimerEnabled()) {
        this.pausePlayerTimer(userId);
      }

      // Clear latency measurements for disconnected player
      this.clearPlayerLatencyData(userId);
    }
  }

  hasPlayer(user: ConnectedUser) {
    if (!user) return false;
    if (this.players[user.userId]) {
      this.addOrUpdatePlayer(user);
      return true;
    }
    return false;
  }

  switchPlayer() {
    this.currentPlayer = OPPOSITE_PIECE[this.currentPlayer];
  }

  placePiece(user: ConnectedUser, placeId: number): { success: boolean; error?: string } {
    const player = this.players[user.userId];
    if (!player) {
      console.warn('Move rejected: Player not found', { userId: user.userId, gameId: this.id });
      return { success: false, error: 'Player not found' };
    }

    if (player.piece !== this.currentPlayer) {
      console.warn('Move rejected: Wrong player turn', {
        userId: user.userId,
        playerPiece: player.piece,
        currentPlayer: this.currentPlayer,
        gameId: this.id,
        placeId,
      });
      return { success: false, error: 'Not your turn' };
    }

    if (this.gameFinished) {
      console.warn('Move rejected: Game already finished', { userId: user.userId, gameId: this.id });
      return { success: false, error: 'Game is finished' };
    }

    try {
      // Stop current player's timer before processing move
      if (this.isTimerEnabled()) {
        this.stopPlayerTimer(user.userId);
      }

      let canNextPlayerMove = this.board.updateBoard(placeId, player.piece);
      this.switchPlayer();
      if (!canNextPlayerMove) {
        canNextPlayerMove = this.board.updateNextMoves(this.currentPlayer);
        this.switchPlayer();
      }
      if (!canNextPlayerMove) {
        this.gameFinished = true;
      }
      this.lastActivityAt = new Date();

      // Handle timer logic after successful move
      if (this.isTimerEnabled()) {
        // Apply time increment to the player who just moved
        this.applyTimeIncrement(user.userId);

        // Start timer for next player if game is not finished
        if (!this.gameFinished) {
          const nextPlayerUserId = Object.keys(this.players).find(
            (userId) => this.players[userId].piece === this.currentPlayer,
          );
          if (nextPlayerUserId) {
            this.startPlayerTimer(nextPlayerUserId);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.warn('Move rejected: Board update failed', {
        userId: user.userId,
        gameId: this.id,
        placeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, error: 'Invalid move' };
    }
  }

  getGameSummary() {
    const playerCount = Object.keys(this.players).length;
    const connectedPlayers = Object.values(this.players).filter((p) => p.connected).length;
    const score = this.board.getScore();

    return {
      id: this.id,
      joinUrl: this.joinUrl,
      playerCount,
      connectedPlayers,
      gameStarted: this.gameStarted,
      gameFinished: this.gameFinished,
      currentPlayer: this.currentPlayer,
      score,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      gameModeId: this.gameModeId,
      timerState: this.timerState,
      players: Object.values(this.players).map((p) => ({
        userId: p.userId,
        name: p.name,
        piece: p.piece,
        connected: p.connected,
      })),
    };
  }

  // Timer-related methods
  initializePlayerTimer(userId: string): void {
    if (!this.timerState) return;

    const now = new Date();
    this.timerState.playerTimers[userId] = {
      userId,
      remainingTime: this.timerState.config.initialTime,
      isActive: false,
      lastUpdateTime: now,
      totalMoveTime: 0,
      moveCount: 0,
      timeWarnings: [],
      isPaused: false,
      totalPausedTime: 0,
    };
  }

  startPlayerTimer(userId: string): void {
    if (!this.timerState?.playerTimers[userId]) return;

    const now = new Date();
    const playerTimer = this.timerState.playerTimers[userId];

    // Stop other players' timers first
    Object.values(this.timerState.playerTimers).forEach((timer) => {
      if (timer.userId !== userId && timer.isActive) {
        this.stopPlayerTimer(timer.userId);
      }
    });

    playerTimer.isActive = true;
    playerTimer.isPaused = false;
    playerTimer.lastUpdateTime = now;

    // Set current player start time for move tracking
    this.timerState.currentPlayerStartTime = now;
  }

  stopPlayerTimer(userId: string): void {
    if (!this.timerState?.playerTimers[userId]) return;

    const now = new Date();
    const playerTimer = this.timerState.playerTimers[userId];

    if (playerTimer.isActive && !playerTimer.isPaused) {
      this.updatePlayerTimerState(userId, now);
    }

    playerTimer.isActive = false;
  }

  updatePlayerTimerState(userId: string, currentTime: Date): void {
    if (!this.timerState?.playerTimers[userId]) return;

    const playerTimer = this.timerState.playerTimers[userId];
    const rawElapsedTime = (currentTime.getTime() - playerTimer.lastUpdateTime.getTime()) / 1000;

    if (playerTimer.isActive && !playerTimer.isPaused) {
      // Apply latency compensation to elapsed time
      const latencyCompensatedElapsedTime = this.applyLatencyCompensation(userId, rawElapsedTime);

      playerTimer.remainingTime = Math.max(0, playerTimer.remainingTime - latencyCompensatedElapsedTime);
      playerTimer.totalMoveTime += latencyCompensatedElapsedTime;
      playerTimer.lastUpdateTime = currentTime;

      // Check for time warnings
      this.checkTimeWarnings(userId);

      // Check for timeout (with latency buffer)
      if (playerTimer.remainingTime <= this.getLatencyBuffer(userId)) {
        this.handlePlayerTimeout(userId);
      }
    }
  }

  checkTimeWarnings(userId: string): void {
    if (!this.timerState?.playerTimers[userId]) return;

    const playerTimer = this.timerState.playerTimers[userId];
    const config = this.timerState.config;

    // Check for low time warning
    if (playerTimer.remainingTime <= config.lowTimeWarning && !playerTimer.timeWarnings.includes('low')) {
      playerTimer.timeWarnings.push('low');
      // Emit timer warning event (will be handled by socket handlers)
    }

    // Check for critical time warning
    if (playerTimer.remainingTime <= config.criticalTimeWarning && !playerTimer.timeWarnings.includes('critical')) {
      playerTimer.timeWarnings.push('critical');
      // Emit critical timer warning event (will be handled by socket handlers)
    }
  }

  handlePlayerTimeout(userId: string): void {
    if (!this.timerState?.config.autoFlagOnTimeout) return;

    // Find the player who timed out
    const timedOutPlayer = this.players[userId];
    if (!timedOutPlayer) return;

    console.log(`Player ${userId} timed out in game ${this.id}`);

    // Check if it's the timed out player's turn
    if (timedOutPlayer.piece === this.currentPlayer) {
      // Player timed out on their turn
      this.handleCurrentPlayerTimeout(userId);
    } else {
      // Player timed out while waiting (shouldn't happen in normal gameplay)
      console.warn(`Player ${userId} timed out while not on their turn`);
    }

    this.lastActivityAt = new Date();
  }

  private handleCurrentPlayerTimeout(userId: string): void {
    const timedOutPlayer = this.players[userId];
    if (!timedOutPlayer || !this.timerState) return;

    // Check if there are any valid moves available
    const validMoves = this.getValidMoves(timedOutPlayer.piece!);

    if (validMoves.length === 0) {
      // No valid moves available, player would have to pass anyway
      console.log(`Player ${userId} timed out but no valid moves available - forcing pass`);
      this.forcePlayerPass(userId);
      return;
    }

    // Player has valid moves but timed out - handle based on timeout action
    const timeoutAction = this.timerState.config.timeoutAction;
    console.log(`Player ${userId} timed out with ${validMoves.length} valid moves available, action: ${timeoutAction}`);

    switch (timeoutAction) {
      case 'forfeit':
        // End the game with timeout - other player wins
        this.gameFinished = true;
        this.recordTimeout(userId, 'move_timeout');
        break;

      case 'auto_pass':
        // Force the player to pass their turn
        this.forcePlayerPass(userId);
        break;

      case 'auto_move':
        // Make an automatic move for the player
        this.makeAutomaticMove(userId, validMoves);
        break;

      default:
        // Fallback to forfeit
        this.gameFinished = true;
        this.recordTimeout(userId, 'move_timeout');
        break;
    }
  }

  private forcePlayerPass(userId: string): void {
    const player = this.players[userId];
    if (!player) return;

    console.log(`Forcing pass for player ${userId} due to timeout`);

    // Switch to next player
    this.switchPlayer();

    // Check if next player can move
    const nextPlayerCanMove = this.board.updateNextMoves(this.currentPlayer);

    if (!nextPlayerCanMove) {
      // Next player also cannot move - game ends
      this.gameFinished = true;
      console.log(`Game ${this.id} ended after forced pass - no moves available`);
    }

    // Record the forced pass
    this.recordTimeout(userId, 'forced_pass');
  }

  private recordTimeout(userId: string, timeoutType: 'move_timeout' | 'forced_pass' | 'auto_move'): void {
    // Add timeout information to game metadata for statistics and analysis
    const timeoutRecord = {
      userId,
      timeoutType,
      timestamp: new Date().toISOString(),
      turn: this.getTurnCount(),
      piece: this.players[userId]?.piece,
    };

    // Store timeout in a hypothetical game history or metadata
    // This would be useful for game analysis and statistics
    console.log(`Recording timeout:`, timeoutRecord);
  }

  private getValidMoves(piece: 'W' | 'B'): number[] {
    // Use the board's nextMoves calculation to get valid moves
    const currentNextMoves = this.board.nextMoves || [];

    // Filter moves that are valid for the current piece
    // In Othello, valid moves are shown as '0' in the board state
    return currentNextMoves.filter((moveId) => {
      // Basic validation - ensure the move is actually valid for this piece
      return this.board.canPlacePiece(moveId, piece);
    });
  }

  private getTurnCount(): number {
    // Count the number of moves made by analyzing the board state
    // This is a simplified implementation
    const pieces = this.board.pieces;
    const totalPieces = pieces.filter((p) => p === 'W' || p === 'B').length;
    return totalPieces - 4; // Subtract starting pieces
  }

  pausePlayerTimer(userId: string): void {
    if (!this.timerState?.playerTimers[userId]) return;
    if (!this.timerState.config.pauseOnDisconnect) return;

    const now = new Date();
    const playerTimer = this.timerState.playerTimers[userId];

    if (playerTimer.isActive && !playerTimer.isPaused) {
      this.updatePlayerTimerState(userId, now);
      playerTimer.isPaused = true;
      playerTimer.pausedAt = now;
    }
  }

  resumePlayerTimer(userId: string): void {
    if (!this.timerState?.playerTimers[userId]) return;

    const now = new Date();
    const playerTimer = this.timerState.playerTimers[userId];

    if (playerTimer.isPaused && playerTimer.pausedAt) {
      const pausedTime = (now.getTime() - playerTimer.pausedAt.getTime()) / 1000;
      playerTimer.totalPausedTime += pausedTime;
      playerTimer.isPaused = false;
      playerTimer.pausedAt = undefined;
      playerTimer.lastUpdateTime = now;

      // Check if pause time exceeded maximum
      if (playerTimer.totalPausedTime > this.timerState.config.maxPauseTime) {
        this.handlePlayerTimeout(userId);
      }
    }
  }

  applyTimeIncrement(userId: string): void {
    if (!this.timerState?.playerTimers[userId]) return;

    const config = this.timerState.config;
    const playerTimer = this.timerState.playerTimers[userId];

    if (config.type === 'increment' && config.increment > 0) {
      playerTimer.remainingTime = Math.min(playerTimer.remainingTime + config.increment, config.maxTime);
    }

    playerTimer.moveCount++;
  }

  getAllTimerStates(): { [userId: string]: PlayerTimerState } {
    if (!this.timerState) return {};

    // Update all active timers before returning
    const now = new Date();
    Object.keys(this.timerState.playerTimers).forEach((userId) => {
      this.updatePlayerTimerState(userId, now);
    });

    return this.timerState.playerTimers;
  }

  isTimerEnabled(): boolean {
    return this.timerState !== undefined && this.timerState !== null && this.timerState.config.type !== 'unlimited';
  }

  private makeAutomaticMove(userId: string, validMoves: number[]): void {
    const player = this.players[userId];
    if (!player || !this.timerState) return;

    const strategy = this.timerState.config.autoMoveStrategy || 'random';
    console.log(`Making automatic move for player ${userId} using strategy: ${strategy}`);

    let selectedMove: number;

    switch (strategy) {
      case 'best_corner':
        selectedMove = this.selectBestCornerMove(validMoves);
        break;

      case 'best_edge':
        selectedMove = this.selectBestEdgeMove(validMoves);
        break;

      case 'random':
      default:
        selectedMove = this.selectRandomMove(validMoves);
        break;
    }

    console.log(`Automatic move selected: ${selectedMove} for player ${userId}`);

    // Execute the move using the existing placePiece logic
    try {
      // Create a user object for the move
      const userForMove = {
        userId: player.userId,
        name: player.name,
        connected: player.connected,
      };

      // Execute the move
      const result = this.placePiece(userForMove, selectedMove);

      if (result.success) {
        this.recordTimeout(userId, 'auto_move');
        console.log(`Automatic move successful for player ${userId} at position ${selectedMove}`);
      } else {
        console.error(`Automatic move failed for player ${userId}:`, result.error);
        // Fallback to forfeit if automatic move fails
        this.gameFinished = true;
        this.recordTimeout(userId, 'move_timeout');
      }
    } catch (error) {
      console.error(`Error executing automatic move for player ${userId}:`, error);
      // Fallback to forfeit if automatic move throws error
      this.gameFinished = true;
      this.recordTimeout(userId, 'move_timeout');
    }
  }

  private selectRandomMove(validMoves: number[]): number {
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }

  private selectBestCornerMove(validMoves: number[]): number {
    const boardSize = this.board.size;
    const corners = [0, boardSize - 1, (boardSize - 1) * boardSize, boardSize * boardSize - 1];

    // Prefer corner moves
    const cornerMoves = validMoves.filter((move) => corners.includes(move));
    if (cornerMoves.length > 0) {
      return this.selectRandomMove(cornerMoves);
    }

    // If no corners, prefer edge moves
    const edgeMoves = validMoves.filter((move) => this.isEdgeMove(move, boardSize));
    if (edgeMoves.length > 0) {
      return this.selectRandomMove(edgeMoves);
    }

    // Fallback to random
    return this.selectRandomMove(validMoves);
  }

  private selectBestEdgeMove(validMoves: number[]): number {
    const boardSize = this.board.size;

    // Prefer edge moves
    const edgeMoves = validMoves.filter((move) => this.isEdgeMove(move, boardSize));
    if (edgeMoves.length > 0) {
      return this.selectRandomMove(edgeMoves);
    }

    // Fallback to random
    return this.selectRandomMove(validMoves);
  }

  private isEdgeMove(move: number, boardSize: number): boolean {
    const row = Math.floor(move / boardSize);
    const col = move % boardSize;
    return row === 0 || row === boardSize - 1 || col === 0 || col === boardSize - 1;
  }

  // Latency compensation methods
  private applyLatencyCompensation(userId: string, rawElapsedTime: number): number {
    const latencyEstimate = latencyCompensation.getLatencyEstimate(userId);
    const networkQuality = latencyCompensation.getNetworkQuality(userId);

    // Apply different compensation strategies based on network quality
    switch (networkQuality) {
      case 'excellent':
        // Minimal compensation for excellent connections
        return Math.max(0, rawElapsedTime - latencyEstimate / 2000); // Convert to seconds

      case 'good':
        // Standard compensation for good connections
        return Math.max(0, rawElapsedTime - latencyEstimate / 1000); // Convert to seconds

      case 'fair':
        // More generous compensation for fair connections
        return Math.max(0, rawElapsedTime - (latencyEstimate * 1.5) / 1000); // Convert to seconds

      case 'poor':
        // Maximum compensation for poor connections
        return Math.max(0, rawElapsedTime - (latencyEstimate * 2) / 1000); // Convert to seconds

      default:
        // No compensation for unknown network quality
        return rawElapsedTime;
    }
  }

  private getLatencyBuffer(userId: string): number {
    const latencyEstimate = latencyCompensation.getLatencyEstimate(userId);
    const networkQuality = latencyCompensation.getNetworkQuality(userId);

    // Provide a latency buffer to prevent premature timeouts
    switch (networkQuality) {
      case 'excellent':
        return latencyEstimate / 2000; // 0.5x latency buffer in seconds

      case 'good':
        return latencyEstimate / 1000; // 1x latency buffer in seconds

      case 'fair':
        return (latencyEstimate * 1.5) / 1000; // 1.5x latency buffer in seconds

      case 'poor':
        return (latencyEstimate * 2) / 1000; // 2x latency buffer in seconds

      default:
        return 0.1; // Default 100ms buffer
    }
  }

  // Get compensated timer state for client display
  getCompensatedTimerState(userId: string): PlayerTimerState | null {
    if (!this.timerState?.playerTimers[userId]) return null;

    const playerTimer = this.timerState.playerTimers[userId];
    const now = new Date();

    // Calculate compensated remaining time
    const rawElapsedTime = (now.getTime() - playerTimer.lastUpdateTime.getTime()) / 1000;
    const compensatedElapsedTime = this.applyLatencyCompensation(userId, rawElapsedTime);
    const compensatedRemainingTime = Math.max(0, playerTimer.remainingTime - compensatedElapsedTime);

    return {
      ...playerTimer,
      remainingTime: compensatedRemainingTime,
      lastUpdateTime: now,
    };
  }

  // Clear latency measurements when player disconnects
  clearPlayerLatencyData(userId: string): void {
    latencyCompensation.clearUserMeasurements(userId);
  }

  /**
   * Evaluate a challenge move and determine if the puzzle is solved
   */
  /**
   * Enhanced multi-stage challenge move evaluation
   * Validates moves without permanently changing game state until manual submission
   */
  evaluateChallengeMove(
    placeId: number,
    piece: Piece,
  ): {
    success: boolean;
    isSolution: boolean;
    isPartialSolution: boolean;
    challengeComplete: boolean;
    attemptsRemaining: number;
    currentMoveIndex: number;
    totalMoves: number;
    temporaryMoves: number[];
    canUndo: boolean;
    error?: string;
    explanation?: string;
  } {
    console.log(`🎯 Enhanced challenge move evaluated for position ${placeId} by piece ${piece}`);

    if (!this.isChallenge || !this.challengeData || !this.challengeConfig) {
      console.log('❌ Not a challenge game or missing data');
      return {
        success: false,
        isSolution: false,
        isPartialSolution: false,
        challengeComplete: false,
        attemptsRemaining: 0,
        currentMoveIndex: 0,
        totalMoves: 0,
        temporaryMoves: [],
        canUndo: false,
        error: 'Not a challenge game',
      };
    }

    const solution = this.challengeData.solution!;
    const currentMoveIndex = this.challengeData.currentMoveIndex;

    // Create temporary board for move validation
    const tempBoard = new Board();
    tempBoard.setBoardState(this.challengeData.temporaryBoardState, this.currentPlayer);

    console.log('🔍 Checking move validity for position:', placeId);
    console.log('Current move index:', currentMoveIndex);
    console.log('Temporary moves so far:', this.challengeData.temporaryMoves);

    // Check if move is valid on the current temporary board state
    if (!tempBoard.canPlacePiece(placeId, piece)) {
      console.log('❌ Invalid move on current board state');
      return {
        success: false,
        isSolution: false,
        isPartialSolution: false,
        challengeComplete: false,
        attemptsRemaining: this.challengeConfig.maxAttempts - this.challengeData.attemptsUsed,
        currentMoveIndex,
        totalMoves: solution.moves.length,
        temporaryMoves: this.challengeData.temporaryMoves,
        canUndo: this.challengeData.temporaryMoves.length > 0,
        error: 'Invalid move',
      };
    }

    console.log('✅ Valid move! Checking solution...');
    console.log('Expected move:', solution.moves[currentMoveIndex]);
    console.log('Your move:', placeId);

    // Check if this move matches the expected solution move
    const isCorrectMove = solution.moves[currentMoveIndex] === placeId;

    // Check alternative solutions if available
    let isAlternativeCorrect = false;
    if (solution.alternativeSolutions) {
      for (const altSolution of solution.alternativeSolutions) {
        if (altSolution[currentMoveIndex] === placeId) {
          isAlternativeCorrect = true;
          break;
        }
      }
    }

    const isSolution = isCorrectMove || isAlternativeCorrect;

    // If move is correct, apply it to temporary state
    if (isSolution) {
      // Apply move to temporary board
      tempBoard.updateBoard(placeId, piece);

      // Update temporary state (not permanent until submission)
      this.challengeData.temporaryMoves.push(placeId);
      this.challengeData.temporaryBoardState = tempBoard.boardState;
      this.challengeData.currentMoveIndex++;

      console.log('✅ Correct move applied to temporary state');
      console.log('Temporary moves now:', this.challengeData.temporaryMoves);
      console.log('Move index now:', this.challengeData.currentMoveIndex);
    } else {
      console.log('❌ Incorrect move - not applying to temporary state');
    }

    // Check puzzle completion status
    const isPartialSolution = isSolution && this.challengeData.currentMoveIndex < solution.moves.length;
    const challengeComplete = isSolution && this.challengeData.currentMoveIndex >= solution.moves.length;

    console.log('🎯 Move evaluation result:', {
      isSolution,
      isPartialSolution,
      challengeComplete,
      currentMoveIndex: this.challengeData.currentMoveIndex,
      totalMoves: solution.moves.length,
    });

    return {
      success: true,
      isSolution,
      isPartialSolution,
      challengeComplete,
      attemptsRemaining: this.challengeConfig.maxAttempts - this.challengeData.attemptsUsed,
      currentMoveIndex: this.challengeData.currentMoveIndex,
      totalMoves: solution.moves.length,
      temporaryMoves: [...this.challengeData.temporaryMoves],
      canUndo: this.challengeData.temporaryMoves.length > 0,
      explanation: challengeComplete ? solution.explanation : undefined,
    };
  }

  /**
   * Undo the last temporary challenge move without consuming attempts
   */
  undoLastChallengeMove(): {
    success: boolean;
    currentMoveIndex: number;
    temporaryMoves: number[];
    canUndo: boolean;
    error?: string;
  } {
    if (!this.isChallenge || !this.challengeData) {
      return {
        success: false,
        currentMoveIndex: 0,
        temporaryMoves: [],
        canUndo: false,
        error: 'Not a challenge game',
      };
    }

    if (this.challengeData.temporaryMoves.length === 0) {
      return {
        success: false,
        currentMoveIndex: this.challengeData.currentMoveIndex,
        temporaryMoves: [],
        canUndo: false,
        error: 'No moves to undo',
      };
    }

    // Remove last move
    this.challengeData.temporaryMoves.pop();
    this.challengeData.currentMoveIndex--;

    // Rebuild board state by replaying all remaining temporary moves
    const tempBoard = new Board();
    // Start from the original challenge board state
    const originalBoardStateIndex = this.challengeData.temporaryBoardState.lastIndexOf(':');
    const originalBoardState =
      originalBoardStateIndex > -1
        ? this.challengeData.temporaryBoardState.substring(0, originalBoardStateIndex + 2)
        : this.challengeData.temporaryBoardState;

    tempBoard.setBoardState(originalBoardState, this.currentPlayer);

    // Replay remaining moves
    for (const moveId of this.challengeData.temporaryMoves) {
      tempBoard.updateBoard(moveId, this.currentPlayer);
    }

    this.challengeData.temporaryBoardState = tempBoard.boardState;

    console.log('⏪ Undid last challenge move');
    console.log('Temporary moves now:', this.challengeData.temporaryMoves);
    console.log('Current move index:', this.challengeData.currentMoveIndex);

    return {
      success: true,
      currentMoveIndex: this.challengeData.currentMoveIndex,
      temporaryMoves: [...this.challengeData.temporaryMoves],
      canUndo: this.challengeData.temporaryMoves.length > 0,
    };
  }

  /**
   * Submit moves as a complete challenge attempt
   * This consumes an attempt and validates the submitted moves
   */
  submitChallengeAttempt(submittedMoves: number[]): {
    success: boolean;
    isCorrect: boolean;
    attemptsRemaining: number;
    finalMoves: number[];
    error?: string;
    explanation?: string;
  } {
    if (!this.isChallenge || !this.challengeData || !this.challengeConfig) {
      return {
        success: false,
        isCorrect: false,
        attemptsRemaining: 0,
        finalMoves: [],
        error: 'Not a challenge game',
      };
    }

    const solution = this.challengeData.solution!;
    const temporaryMoves = submittedMoves || this.challengeData.temporaryMoves;

    console.log('🔍 Challenge submission debug:', {
      submittedMoves,
      temporaryMoves,
      solutionMoves: solution.moves,
      challengeDataExists: !!this.challengeData,
      solutionExists: !!solution,
    });

    // Check if all required moves have been made
    const allMovesComplete = temporaryMoves.length === solution.moves.length;

    // Verify moves match the solution
    let isCorrect = true;
    if (allMovesComplete) {
      for (let i = 0; i < solution.moves.length; i++) {
        if (temporaryMoves[i] !== solution.moves[i]) {
          // Check alternative solutions
          let matchesAlternative = false;
          if (solution.alternativeSolutions) {
            for (const altSolution of solution.alternativeSolutions) {
              if (altSolution[i] === temporaryMoves[i]) {
                matchesAlternative = true;
                break;
              }
            }
          }
          if (!matchesAlternative) {
            isCorrect = false;
            break;
          }
        }
      }
    } else {
      isCorrect = false; // Incomplete sequence is incorrect
    }

    // Consume an attempt
    this.challengeData.attemptsUsed++;
    const attemptsRemaining = this.challengeConfig.maxAttempts - this.challengeData.attemptsUsed;

    // If correct or out of attempts, finish the challenge
    if (isCorrect || attemptsRemaining <= 0) {
      this.gameFinished = true;
      // Don't modify server board state - client handles all visual updates
    } else {
      // Reset temporary state for another attempt
      this.challengeData.temporaryMoves = [];
      this.challengeData.currentMoveIndex = 0;
      // Don't modify server board state - client handles the reset
    }

    console.log('📝 Challenge attempt submitted:', {
      isCorrect,
      movesSubmitted: temporaryMoves,
      attemptsRemaining,
      gameFinished: this.gameFinished,
    });

    return {
      success: true,
      isCorrect,
      attemptsRemaining,
      finalMoves: [...temporaryMoves],
      explanation: isCorrect ? solution.explanation : undefined,
    };
  }

  /**
   * Get challenge status and progress
   */
  getChallengeStatus() {
    if (!this.isChallenge || !this.challengeData || !this.challengeConfig) {
      return null;
    }

    const timeElapsed = Date.now() - this.challengeData.startTime.getTime();
    const timeLimit = this.challengeConfig.timeLimit;
    const timeRemaining = timeLimit ? Math.max(0, timeLimit * 1000 - timeElapsed) : null;

    return {
      challengeId: this.challengeData.challengeId,
      attemptsUsed: this.challengeData.attemptsUsed,
      attemptsRemaining: this.challengeConfig.maxAttempts - this.challengeData.attemptsUsed,
      hintsUsed: this.challengeData.hintsUsed,
      timeElapsed: Math.floor(timeElapsed / 1000),
      timeRemaining: timeRemaining ? Math.floor(timeRemaining / 1000) : null,
      difficulty: this.challengeConfig.difficulty,
      type: this.challengeConfig.type,
      // Enhanced AI system status
      aiStrategy: this.challengeData.aiStrategy,
      aiDifficulty: this.challengeData.aiDifficulty,
      currentStage: this.challengeData.currentStage,
      totalStages: this.challengeData.totalStages,
      overallAccuracy: this.challengeData.overallAccuracy,
      totalTimeSpent: this.challengeData.totalTimeSpent,
      isMultiStage: this.challengeData.isMultiStage,
      sessionId: this.challengeData.sessionId,
    };
  }

  /**
   * Initialize multi-stage challenge session
   */
  initializeMultiStageChallenge(
    sessionId: string,
    totalStages: number,
    aiStrategy: 'minimax' | 'alphabeta' | 'random' = 'alphabeta',
    aiDifficulty: number = 3,
  ) {
    if (!this.isChallenge || !this.challengeData) {
      throw new Error('Cannot initialize multi-stage challenge on non-challenge game');
    }

    this.challengeData.sessionId = sessionId;
    this.challengeData.totalStages = totalStages;
    this.challengeData.isMultiStage = true;
    this.challengeData.aiStrategy = aiStrategy;
    this.challengeData.aiDifficulty = aiDifficulty;
    this.challengeData.currentStage = 1;
    this.challengeData.moveSequences = [];
    this.challengeData.overallAccuracy = 0;
    this.challengeData.totalTimeSpent = 0;
  }

  /**
   * Record move sequence for current stage
   */
  recordMoveSequence(
    stageNumber: number,
    playerMove: number,
    aiResponse?: number,
    accuracy: number = 0,
    timeSpent: number = 0,
    hintsUsed: number = 0,
  ) {
    if (!this.isChallenge || !this.challengeData) {
      return;
    }

    const boardAfterPlayer = this.board.boardState;
    let boardAfterAI: string | undefined;

    if (aiResponse !== undefined) {
      // Create a temporary board to simulate AI move
      const tempBoard = new Board(this.board.boardState);
      const aiPlayer = this.currentPlayer === 'W' ? 'B' : 'W';
      tempBoard.placePiece(aiResponse, aiPlayer);
      boardAfterAI = tempBoard.boardState;
    }

    const sequence = {
      stageNumber,
      playerMove,
      aiResponse,
      boardAfterPlayer,
      boardAfterAI,
      completed: aiResponse !== undefined,
      accuracy,
      timeSpent,
      hintsUsed,
    };

    this.challengeData.moveSequences.push(sequence);
    this.challengeData.currentSequenceStep++;

    // Update overall metrics
    this.challengeData.totalTimeSpent += timeSpent;
    this.updateOverallAccuracy();
  }

  /**
   * Advance to next stage in multi-stage challenge
   */
  advanceToNextStage(): boolean {
    if (!this.isChallenge || !this.challengeData?.isMultiStage) {
      return false;
    }

    if (this.challengeData.currentStage >= this.challengeData.totalStages) {
      return false; // Already at last stage
    }

    this.challengeData.currentStage++;
    return true;
  }

  /**
   * Check if multi-stage challenge is completed
   */
  isMultiStageChallengeCompleted(): boolean {
    if (!this.isChallenge || !this.challengeData?.isMultiStage) {
      return false;
    }

    return this.challengeData.currentStage > this.challengeData.totalStages;
  }

  /**
   * Get current stage progress
   */
  getCurrentStageProgress() {
    if (!this.isChallenge || !this.challengeData) {
      return null;
    }

    const currentStageSequences = this.challengeData.moveSequences.filter(
      (seq) => seq.stageNumber === this.challengeData.currentStage,
    );

    return {
      currentStage: this.challengeData.currentStage,
      totalStages: this.challengeData.totalStages,
      currentStageSequences,
      stageProgress: currentStageSequences.length,
      stageCompleted: currentStageSequences.length > 0 && currentStageSequences.every((seq) => seq.completed),
    };
  }

  /**
   * Update AI strategy and difficulty
   */
  updateAIConfiguration(strategy: 'minimax' | 'alphabeta' | 'random', difficulty: number) {
    if (!this.isChallenge || !this.challengeData) {
      return;
    }

    this.challengeData.aiStrategy = strategy;
    this.challengeData.aiDifficulty = Math.max(1, Math.min(6, difficulty)); // Clamp to 1-6 range
  }

  /**
   * Get AI configuration for current challenge
   */
  getAIConfiguration() {
    if (!this.isChallenge || !this.challengeData) {
      return null;
    }

    return {
      strategy: this.challengeData.aiStrategy,
      difficulty: this.challengeData.aiDifficulty,
    };
  }

  /**
   * Reset challenge progress while keeping configuration
   */
  resetChallengeProgress() {
    if (!this.isChallenge || !this.challengeData) {
      return;
    }

    this.challengeData.attemptsUsed = 0;
    this.challengeData.hintsUsed = [];
    this.challengeData.moveSequences = [];
    this.challengeData.currentSequenceStep = 0;
    this.challengeData.currentStage = 1;
    this.challengeData.overallAccuracy = 0;
    this.challengeData.totalTimeSpent = 0;
    this.challengeData.temporaryMoves = [];
    this.challengeData.currentMoveIndex = 0;
    this.challengeData.startTime = new Date();

    // Reset board to initial state if we have the original board state
    if (this.challengeData.temporaryBoardState) {
      this.board.setBoardState(this.challengeData.temporaryBoardState, this.currentPlayer);
    }
  }

  /**
   * Update overall accuracy based on completed sequences
   */
  private updateOverallAccuracy() {
    if (!this.challengeData) return;

    const completedSequences = this.challengeData.moveSequences.filter((seq) => seq.completed);
    if (completedSequences.length === 0) {
      this.challengeData.overallAccuracy = 0;
      return;
    }

    const totalAccuracy = completedSequences.reduce((sum, seq) => sum + seq.accuracy, 0);
    this.challengeData.overallAccuracy = totalAccuracy / completedSequences.length;
  }

  /**
   * Get detailed challenge analytics
   */
  getChallengeAnalytics() {
    if (!this.isChallenge || !this.challengeData) {
      return null;
    }

    const sequences = this.challengeData.moveSequences;
    const completedSequences = sequences.filter((seq) => seq.completed);

    return {
      totalSequences: sequences.length,
      completedSequences: completedSequences.length,
      averageAccuracy: this.challengeData.overallAccuracy,
      totalTimeSpent: this.challengeData.totalTimeSpent,
      averageTimePerMove: sequences.length > 0 ? this.challengeData.totalTimeSpent / sequences.length : 0,
      hintsUsedTotal: this.challengeData.hintsUsed.length,
      stageProgress: {
        current: this.challengeData.currentStage,
        total: this.challengeData.totalStages,
        completion:
          this.challengeData.totalStages > 0
            ? ((this.challengeData.currentStage - 1) / this.challengeData.totalStages) * 100
            : 0,
      },
      aiConfiguration: {
        strategy: this.challengeData.aiStrategy,
        difficulty: this.challengeData.aiDifficulty,
      },
      sessionId: this.challengeData.sessionId,
      isMultiStage: this.challengeData.isMultiStage,
    };
  }
}
