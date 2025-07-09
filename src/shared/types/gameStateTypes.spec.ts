import { describe, it, expect, beforeEach } from 'vitest';
import { GameMode, GAME_MODE_TEMPLATES } from './gameModeTypes';
import {
  GameState,
  GameModeState,
  PlayerTimers,
  ChallengeState,
  TournamentState,
  Player,
  Board,
  createInitialGameModeState,
  createInitialPlayerTimers,
  createInitialChallengeState,
  createInitialTournamentState,
  updateGameModeState,
  updatePlayerTimer,
  updateChallengeState,
  validateGameModeState,
  validatePlayerTimers,
  validateChallengeState,
  isTimerActive,
  getRemainingTime,
  hasTimerWarning,
  isChallengeCompleted,
  isChallengeFailed,
  getRemainingAttempts,
  getGameDuration,
  isGameModePhase,
  serializeGameModeState,
  deserializeGameModeState,
  serializePlayerTimers,
  deserializePlayerTimers,
  serializeChallengeState,
  deserializeChallengeState,
} from './gameStateTypes';

describe('Game State Types', () => {
  let sampleGameMode: GameMode;
  let samplePlayers: { [userId: string]: Player };
  let sampleBoard: Board;

  beforeEach(() => {
    sampleGameMode = {
      id: 'test-blitz',
      name: 'Test Blitz',
      description: 'A test blitz mode',
      category: 'timer',
      config: {
        timer: {
          type: 'increment',
          initialTime: 180,
          increment: 2,
          delay: 0,
          maxTime: 300,
          lowTimeWarning: 30,
          criticalTimeWarning: 10,
          autoFlagOnTimeout: true,
          pauseOnDisconnect: true,
          maxPauseTime: 60,
        },
      },
      isActive: true,
      isDefault: false,
      minimumPlayers: 2,
      maximumPlayers: 2,
      estimatedDuration: 10,
      difficultyLevel: 'intermediate',
      tags: ['test', 'blitz'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    samplePlayers = {
      user1: {
        userId: 'user1',
        username: 'Player 1',
        piece: 'B',
        isHost: true,
        isReady: true,
        connectedAt: new Date(),
        lastActiveAt: new Date(),
      },
      user2: {
        userId: 'user2',
        username: 'Player 2',
        piece: 'W',
        isHost: false,
        isReady: true,
        connectedAt: new Date(),
        lastActiveAt: new Date(),
      },
    };

    sampleBoard = {
      boardState: '........\n........\n...0....\n..0WB...\n...BW0..\n....0...\n........\n........',
      score: { B: 2, W: 2 },
      currentPlayer: 'B',
      gameStarted: true,
      gameFinished: false,
    };
  });

  describe('GameState interface', () => {
    it('should validate complete GameState object', () => {
      const gameState: GameState = {
        id: 'test-game',
        currentPlayer: 'B',
        players: samplePlayers,
        gameStarted: true,
        gameFull: true,
        gameFinished: false,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        board: sampleBoard,
        joinUrl: 'http://localhost:3000/join/test-game',
        gameMode: sampleGameMode,
        gameModeState: createInitialGameModeState(sampleGameMode),
        timers: createInitialPlayerTimers(samplePlayers, sampleGameMode),
      };

      expect(gameState.id).toBe('test-game');
      expect(gameState.gameMode.id).toBe('test-blitz');
      expect(gameState.gameModeState.phase).toBe('setup');
      expect(gameState.timers).toBeDefined();
      expect(Object.keys(gameState.timers!)).toHaveLength(2);
    });
  });

  describe('Initial state creation functions', () => {
    it('should create initial game mode state', () => {
      const state = createInitialGameModeState(sampleGameMode);

      expect(state.phase).toBe('setup');
      expect(state.startTime).toBeInstanceOf(Date);
      expect(state.moveCount).toBe(0);
      expect(state.lastMoveTime).toBeInstanceOf(Date);
      expect(state.specialConditions).toEqual({});
    });

    it('should create initial player timers for timer mode', () => {
      const timers = createInitialPlayerTimers(samplePlayers, sampleGameMode);

      expect(timers).toBeDefined();
      expect(Object.keys(timers!)).toHaveLength(2);
      expect(timers!['user1'].remainingTime).toBe(180);
      expect(timers!['user2'].remainingTime).toBe(180);
      expect(timers!['user1'].isActive).toBe(false);
      expect(timers!['user2'].isActive).toBe(false);
    });

    it('should return undefined for player timers when no timer config', () => {
      const nonTimerMode = {
        ...sampleGameMode,
        config: { board: { width: 8, height: 8, startingPosition: '', validSizes: [8], customRules: [] } },
      };
      const timers = createInitialPlayerTimers(samplePlayers, nonTimerMode);

      expect(timers).toBeUndefined();
    });

    it('should create initial challenge state for challenge mode', () => {
      const challengeMode = {
        ...sampleGameMode,
        config: {
          challenge: {
            type: 'tactical' as const,
            difficulty: 3 as const,
            maxAttempts: 3,
            hints: [],
            solution: { moves: [], explanation: '' },
            tags: [],
          },
        },
      };

      const challengeState = createInitialChallengeState(challengeMode);

      expect(challengeState).toBeDefined();
      expect(challengeState!.attemptNumber).toBe(1);
      expect(challengeState!.hintsUsed).toBe(0);
      expect(challengeState!.score).toBe(0);
      expect(challengeState!.isCompleted).toBe(false);
      expect(challengeState!.isFailed).toBe(false);
    });

    it('should return undefined for challenge state when no challenge config', () => {
      const challengeState = createInitialChallengeState(sampleGameMode);
      expect(challengeState).toBeUndefined();
    });

    it('should create initial tournament state for tournament mode', () => {
      const tournamentMode = {
        ...sampleGameMode,
        config: {
          tournament: {
            format: 'single-elimination' as const,
            rounds: 4,
            timePerRound: 30,
            bracketSize: 16,
            advancementRules: 'standard',
          },
        },
      };

      const tournamentState = createInitialTournamentState(tournamentMode);

      expect(tournamentState).toBeDefined();
      expect(tournamentState!.round).toBe(1);
      expect(tournamentState!.position).toBe(0);
      expect(tournamentState!.advancement).toBe('pending');
    });

    it('should return undefined for tournament state when no tournament config', () => {
      const tournamentState = createInitialTournamentState(sampleGameMode);
      expect(tournamentState).toBeUndefined();
    });
  });

  describe('State update functions', () => {
    it('should update game mode state', () => {
      const initialState = createInitialGameModeState(sampleGameMode);
      const updatedState = updateGameModeState(initialState, { phase: 'active', moveCount: 5 });

      expect(updatedState.phase).toBe('active');
      expect(updatedState.moveCount).toBe(5);
      expect(updatedState.lastMoveTime).toBeInstanceOf(Date);
    });

    it('should update player timer', () => {
      const timers = createInitialPlayerTimers(samplePlayers, sampleGameMode)!;
      const updatedTimers = updatePlayerTimer(timers, 'user1', { remainingTime: 170, isActive: true });

      expect(updatedTimers['user1'].remainingTime).toBe(170);
      expect(updatedTimers['user1'].isActive).toBe(true);
      expect(updatedTimers['user2'].remainingTime).toBe(180); // Unchanged
    });

    it('should update challenge state', () => {
      const challengeMode = {
        ...sampleGameMode,
        config: {
          challenge: {
            type: 'tactical' as const,
            difficulty: 3 as const,
            maxAttempts: 3,
            hints: [],
            solution: { moves: [], explanation: '' },
            tags: [],
          },
        },
      };

      const initialState = createInitialChallengeState(challengeMode)!;
      const updatedState = updateChallengeState(initialState, { attemptNumber: 2, hintsUsed: 1, score: 50 });

      expect(updatedState.attemptNumber).toBe(2);
      expect(updatedState.hintsUsed).toBe(1);
      expect(updatedState.score).toBe(50);
    });
  });

  describe('Validation functions', () => {
    it('should validate correct game mode state without errors', () => {
      const state = createInitialGameModeState(sampleGameMode);
      const errors = validateGameModeState(state);

      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid game mode state', () => {
      const invalidState: GameModeState = {
        phase: '' as any,
        startTime: null as any,
        moveCount: -1,
        lastMoveTime: new Date(),
        specialConditions: {},
        pausedTime: -5,
      };

      const errors = validateGameModeState(invalidState);
      expect(errors).toContain('Game mode phase is required');
      expect(errors).toContain('Start time is required');
      expect(errors).toContain('Move count cannot be negative');
      expect(errors).toContain('Paused time cannot be negative');
    });

    it('should validate correct player timers without errors', () => {
      const timers = createInitialPlayerTimers(samplePlayers, sampleGameMode)!;
      const errors = validatePlayerTimers(timers);

      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid player timers', () => {
      const invalidTimers: PlayerTimers = {
        user1: {
          remainingTime: -10,
          isActive: false,
          lastMoveTime: new Date(),
          totalMoveTime: -5,
          moveCount: -1,
          timeWarnings: [],
        },
      };

      const errors = validatePlayerTimers(invalidTimers);
      expect(errors).toContain('Timer for player user1 cannot have negative remaining time');
      expect(errors).toContain('Timer for player user1 cannot have negative total move time');
      expect(errors).toContain('Timer for player user1 cannot have negative move count');
    });

    it('should validate correct challenge state without errors', () => {
      const challengeMode = {
        ...sampleGameMode,
        config: {
          challenge: {
            type: 'tactical' as const,
            difficulty: 3 as const,
            maxAttempts: 3,
            hints: [],
            solution: { moves: [], explanation: '' },
            tags: [],
          },
        },
      };

      const state = createInitialChallengeState(challengeMode)!;
      const errors = validateChallengeState(state);

      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid challenge state', () => {
      const invalidState: ChallengeState = {
        attemptNumber: 0,
        hintsUsed: -1,
        score: -10,
        startTime: null as any,
        moves: null as any,
        isCompleted: false,
        isFailed: false,
      };

      const errors = validateChallengeState(invalidState);
      expect(errors).toContain('Attempt number must be at least 1');
      expect(errors).toContain('Hints used cannot be negative');
      expect(errors).toContain('Score cannot be negative');
      expect(errors).toContain('Start time is required');
      expect(errors).toContain('Moves must be an array');
    });
  });

  describe('Query functions', () => {
    it('should check if timer is active', () => {
      const timers = createInitialPlayerTimers(samplePlayers, sampleGameMode)!;
      const updatedTimers = updatePlayerTimer(timers, 'user1', { isActive: true });

      expect(isTimerActive(updatedTimers, 'user1')).toBe(true);
      expect(isTimerActive(updatedTimers, 'user2')).toBe(false);
    });

    it('should get remaining time', () => {
      const timers = createInitialPlayerTimers(samplePlayers, sampleGameMode)!;
      const updatedTimers = updatePlayerTimer(timers, 'user1', { remainingTime: 150 });

      expect(getRemainingTime(updatedTimers, 'user1')).toBe(150);
      expect(getRemainingTime(updatedTimers, 'user2')).toBe(180);
    });

    it('should check timer warnings', () => {
      const timers = createInitialPlayerTimers(samplePlayers, sampleGameMode)!;
      const updatedTimers = updatePlayerTimer(timers, 'user1', { timeWarnings: ['low', 'critical'] });

      expect(hasTimerWarning(updatedTimers, 'user1', 'low')).toBe(true);
      expect(hasTimerWarning(updatedTimers, 'user1', 'critical')).toBe(true);
      expect(hasTimerWarning(updatedTimers, 'user2', 'low')).toBe(false);
    });

    it('should check challenge completion status', () => {
      const challengeMode = {
        ...sampleGameMode,
        config: {
          challenge: {
            type: 'tactical' as const,
            difficulty: 3 as const,
            maxAttempts: 3,
            hints: [],
            solution: { moves: [], explanation: '' },
            tags: [],
          },
        },
      };

      const state = createInitialChallengeState(challengeMode)!;
      const completedState = updateChallengeState(state, { isCompleted: true });

      expect(isChallengeCompleted(completedState)).toBe(true);
      expect(isChallengeCompleted(state)).toBe(false);
    });

    it('should check challenge failure status', () => {
      const challengeMode = {
        ...sampleGameMode,
        config: {
          challenge: {
            type: 'tactical' as const,
            difficulty: 3 as const,
            maxAttempts: 3,
            hints: [],
            solution: { moves: [], explanation: '' },
            tags: [],
          },
        },
      };

      const state = createInitialChallengeState(challengeMode)!;
      const failedState = updateChallengeState(state, { isFailed: true });

      expect(isChallengeFailed(failedState)).toBe(true);
      expect(isChallengeFailed(state)).toBe(false);
    });

    it('should get remaining attempts', () => {
      const challengeMode = {
        ...sampleGameMode,
        config: {
          challenge: {
            type: 'tactical' as const,
            difficulty: 3 as const,
            maxAttempts: 3,
            hints: [],
            solution: { moves: [], explanation: '' },
            tags: [],
          },
        },
      };

      const state = createInitialChallengeState(challengeMode)!;
      const updatedState = updateChallengeState(state, { attemptNumber: 2 });

      expect(getRemainingAttempts(updatedState, 3)).toBe(1);
      expect(getRemainingAttempts(state, 3)).toBe(2);
    });

    it('should get game duration', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      const state: GameModeState = {
        phase: 'active',
        startTime: oneMinuteAgo,
        endTime: now,
        moveCount: 10,
        lastMoveTime: now,
        specialConditions: {},
        pausedTime: 10000, // 10 seconds
      };

      const duration = getGameDuration(state);
      expect(duration).toBe(50000); // 60 seconds - 10 seconds paused
    });

    it('should check game mode phase', () => {
      const state = createInitialGameModeState(sampleGameMode);
      const activeState = updateGameModeState(state, { phase: 'active' });

      expect(isGameModePhase(state, 'setup')).toBe(true);
      expect(isGameModePhase(activeState, 'active')).toBe(true);
      expect(isGameModePhase(activeState, 'setup')).toBe(false);
    });
  });

  describe('Serialization functions', () => {
    it('should serialize and deserialize game mode state', () => {
      const state = createInitialGameModeState(sampleGameMode);
      const serialized = serializeGameModeState(state);
      const deserialized = deserializeGameModeState(serialized);

      expect(deserialized.phase).toBe(state.phase);
      expect(deserialized.startTime).toEqual(state.startTime);
      expect(deserialized.moveCount).toBe(state.moveCount);
      expect(deserialized.lastMoveTime).toEqual(state.lastMoveTime);
    });

    it('should serialize and deserialize player timers', () => {
      const timers = createInitialPlayerTimers(samplePlayers, sampleGameMode)!;
      const serialized = serializePlayerTimers(timers);
      const deserialized = deserializePlayerTimers(serialized);

      expect(Object.keys(deserialized)).toHaveLength(2);
      expect(deserialized['user1'].remainingTime).toBe(timers['user1'].remainingTime);
      expect(deserialized['user1'].lastMoveTime).toEqual(timers['user1'].lastMoveTime);
      expect(deserialized['user2'].remainingTime).toBe(timers['user2'].remainingTime);
    });

    it('should serialize and deserialize challenge state', () => {
      const challengeMode = {
        ...sampleGameMode,
        config: {
          challenge: {
            type: 'tactical' as const,
            difficulty: 3 as const,
            maxAttempts: 3,
            hints: [],
            solution: { moves: [], explanation: '' },
            tags: [],
          },
        },
      };

      const state = createInitialChallengeState(challengeMode)!;
      const serialized = serializeChallengeState(state);
      const deserialized = deserializeChallengeState(serialized);

      expect(deserialized.attemptNumber).toBe(state.attemptNumber);
      expect(deserialized.startTime).toEqual(state.startTime);
      expect(deserialized.hintsUsed).toBe(state.hintsUsed);
      expect(deserialized.score).toBe(state.score);
    });
  });
});
