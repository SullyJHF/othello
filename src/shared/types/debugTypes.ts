/**
 * Debug-related type definitions for development and testing utilities
 */

export interface AutoPlayConfig {
  enabled: boolean;
  speed: number; // Multiplier: 1x, 2x, 5x, 10x
  algorithm: 'random' | 'greedy' | 'corner-seeking' | 'strategic';
  playBothSides: boolean;
  stopConditions: {
    nearEndGame: boolean; // Stop when < 10 moves remaining
    specificScore: number | null; // Stop when score difference reaches this
    moveCount: number | null; // Stop after X moves
  };
}

export interface GameStateSnapshot {
  boardState: string;
  currentPlayer: 'B' | 'W';
  scores: {
    black: number;
    white: number;
  };
  validMoves: number[];
  moveHistory: Array<{
    player: 'B' | 'W';
    position: number;
    timestamp: number;
  }>;
  gameStarted: boolean;
  gameFinished: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  networkLatency: number;
  memoryUsage: number;
  socketEvents: {
    sent: number;
    received: number;
    lastEventTime: number;
  };
}

export interface DebugAction {
  id: string;
  type: 'dummy-game' | 'auto-play' | 'game-reset' | 'scenario-inject';
  timestamp: number;
  payload: any;
  result?: 'success' | 'error';
  error?: string;
}

export interface DummyGameOptions {
  playerNames: {
    user: string;
    opponent: string;
  };
  userPiece: 'B' | 'W' | 'random';
  opponentBehavior: 'random' | 'smart' | 'passive';
  startImmediately: boolean;
}

/**
 * Debug panel UI state management
 */
export interface DebugPanelState {
  isOpen: boolean;
  activeTab: 'auto-play' | 'game-state' | 'performance' | 'actions';
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size: 'compact' | 'normal' | 'expanded';
}

/**
 * Auto-play service state
 */
export interface AutoPlayState {
  isActive: boolean;
  config: AutoPlayConfig;
  moveCount: number;
  startTime: number;
  lastMoveTime: number;
  errors: string[];
}

/**
 * Game scenario injection for testing
 */
export interface GameScenario {
  id: string;
  name: string;
  description: string;
  boardState: string;
  currentPlayer: 'B' | 'W';
  moveHistory: Array<{
    player: 'B' | 'W';
    position: number;
  }>;
  expectedOutcome?: 'black-wins' | 'white-wins' | 'draw';
}

/**
 * Debug event types for logging and monitoring
 */
export type DebugEventType = 
  | 'debug-mode-enabled'
  | 'debug-mode-disabled'
  | 'dummy-game-created'
  | 'auto-play-started'
  | 'auto-play-stopped'
  | 'auto-play-move'
  | 'game-state-inspected'
  | 'performance-measured'
  | 'scenario-injected'
  | 'debug-error';

export interface DebugEvent {
  type: DebugEventType;
  timestamp: number;
  data?: any;
  source: 'client' | 'server';
}