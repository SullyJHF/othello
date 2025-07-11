/**
 * Debug-related type definitions for development and testing utilities
 */

import { GameMode } from './gameModeTypes';

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
  opponentBehavior: 'random' | 'smart' | 'passive' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  startImmediately: boolean;
  gameMode?: GameMode;
  aiPersonality?: 'aggressive' | 'defensive' | 'balanced' | 'unpredictable';
}

/**
 * AI opponent configuration for single player games
 */
export interface AIOpponentConfig {
  id: string;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  personality: 'aggressive' | 'defensive' | 'balanced' | 'unpredictable';
  description: string;
  avatar?: string;
  moveDelayRange: [number, number]; // Min/max delay in milliseconds
}

/**
 * Single player game options extending dummy game options
 */
export interface SinglePlayerGameOptions extends Omit<DummyGameOptions, 'opponentBehavior'> {
  aiOpponentId: string;
  isPracticeMode: boolean; // No rating impact
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
  pendingMove: boolean;
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

/**
 * Playwright testing integration types
 */
export interface PlaywrightTestConfig {
  enabled: boolean;
  screenshotPath: string;
  autoCapture: boolean;
  testScenarios: string[];
}

export interface ScreenshotCapture {
  id: string;
  filename: string;
  path: string;
  timestamp: number;
  gameState: GameStateSnapshot;
  description?: string;
  testScenario?: string;
}

export interface TestScenarioExecution {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  screenshots: ScreenshotCapture[];
  errors: string[];
  results?: {
    passed: boolean;
    assertions: number;
    failures: string[];
  };
}

/**
 * Enhanced debug panel with Playwright integration
 */
export interface PlaywrightDebugFeatures {
  autoScreenshot: boolean;
  visualValidation: boolean;
  performanceMonitoring: boolean;
  testScenarioRunner: boolean;
  crossBrowserTesting: boolean;
}

/**
 * Browser automation interface for Playwright integration
 */
export interface BrowserAutomationAPI {
  captureScreenshot(description?: string): Promise<ScreenshotCapture>;
  validateGameState(): Promise<boolean>;
  runTestScenario(scenarioId: string): Promise<TestScenarioExecution>;
  measurePerformance(): Promise<PerformanceMetrics>;
  simulateUserInteraction(action: 'click' | 'type' | 'hover', target: string, value?: string): Promise<void>;
}
