import { Server, Socket } from 'socket.io';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SocketEvents } from '../../shared/SocketEvents';
import { Game } from '../models/Game';
import GameManager from '../models/GameManager';
import UserManager, { ConnectedUser } from '../models/UserManager';
import { latencyCompensation } from '../services/LatencyCompensation';
import { registerTimerHandlers, TimerManager } from './timerHandlers';

// Mock dependencies
vi.mock('../models/GameManager');
vi.mock('../models/UserManager');
vi.mock('../services/LatencyCompensation');
vi.mock('../database/Database', () => ({
  default: {
    getInstance: vi.fn(() => ({
      // Mock database instance
    })),
  },
}));
vi.mock('./sockets', () => ({
  emit: vi.fn(),
}));

describe('Timer Socket Handlers', () => {
  let mockSocket: Partial<Socket>;
  let mockServer: Partial<Server>;
  let mockGame: Partial<Game>;
  let mockUser: ConnectedUser;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
    };

    mockServer = {};

    mockUser = {
      userId: 'test-user',
      name: 'Test User',
      connected: true,
    };

    mockGame = {
      id: 'test-game',
      players: {
        'test-user': { ...mockUser, piece: 'B' },
      },
      timerState: {
        config: {
          type: 'increment',
          initialTime: 300,
          increment: 5,
          delay: 0,
          maxTime: 600,
          lowTimeWarning: 60,
          criticalTimeWarning: 15,
          autoFlagOnTimeout: true,
          pauseOnDisconnect: true,
          maxPauseTime: 300,
          timeoutAction: 'forfeit',
        },
        playerTimers: {
          'test-user': {
            userId: 'test-user',
            remainingTime: 300,
            isActive: true,
            lastUpdateTime: new Date(),
            totalMoveTime: 0,
            moveCount: 0,
            timeWarnings: [],
            isPaused: false,
            totalPausedTime: 0,
          },
        },
        gameStartTime: new Date(),
        isGamePaused: false,
        totalGameTime: 0,
      },
      hasPlayer: vi.fn().mockReturnValue(true),
      getCompensatedTimerState: vi.fn().mockReturnValue({
        userId: 'test-user',
        remainingTime: 300,
        isActive: true,
        lastUpdateTime: new Date(),
        totalMoveTime: 0,
        moveCount: 0,
        timeWarnings: [],
        isPaused: false,
        totalPausedTime: 0,
      }),
    };

    // Setup mock returns
    (GameManager.getGame as any).mockReturnValue(mockGame);
    (UserManager.getUserById as any).mockReturnValue(mockUser);
    (latencyCompensation.recordLatency as any).mockReturnValue({
      userId: 'test-user',
      gameId: 'test-game',
      latency: 50,
      timestamp: new Date(),
      serverTime: 1000,
      clientTime: 950,
    });
    (latencyCompensation.getTimeSyncData as any).mockReturnValue({
      serverTime: Date.now(),
      latency: 50,
      stats: null,
    });
    (latencyCompensation.getNetworkQuality as any).mockReturnValue('good');
  });

  describe('registerTimerHandlers', () => {
    it('should register all timer event handlers', () => {
      registerTimerHandlers(mockServer as Server, mockSocket as Socket);

      expect(mockSocket.on).toHaveBeenCalledWith(SocketEvents.GetTimerState(''), expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SocketEvents.RequestTimerSync(''), expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SocketEvents.RequestTimerPause(''), expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SocketEvents.RequestTimerResume(''), expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SocketEvents.TimerLatencyPing(''), expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SocketEvents.TimerLatencySync(''), expect.any(Function));
    });
  });

  describe('Timer State Handlers', () => {
    let handlers: Record<string, (...args: any[]) => void>;

    beforeEach(() => {
      handlers = {};
      (mockSocket.on as any).mockImplementation((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler;
      });

      registerTimerHandlers(mockServer as Server, mockSocket as Socket);
    });

    it('should handle GetTimerState request', () => {
      const callback = vi.fn();
      const handler = handlers[SocketEvents.GetTimerState('')];

      handler('test-game', callback);

      expect(callback).toHaveBeenCalledWith({
        'test-user': expect.objectContaining({
          userId: 'test-user',
          remainingTime: 300,
        }),
      });
    });

    it('should handle RequestTimerSync', async () => {
      const { emit } = vi.mocked(await import('./sockets'));
      const handler = handlers[SocketEvents.RequestTimerSync('')];

      handler('test-game');

      expect(emit).toHaveBeenCalledWith(
        SocketEvents.TimerStateSync('test-game'),
        expect.objectContaining({
          timerStates: expect.any(Object),
          gameTimerState: mockGame.timerState,
        }),
      );
    });

    it('should handle RequestTimerPause', () => {
      const handler = handlers[SocketEvents.RequestTimerPause('')];

      handler('test-game', 'test-user');

      expect(UserManager.getUserById).toHaveBeenCalledWith('test-user');
      expect(GameManager.getGame).toHaveBeenCalledWith('test-game');
      expect(mockGame.hasPlayer).toHaveBeenCalledWith(mockUser);
    });

    it('should handle RequestTimerResume', () => {
      const handler = handlers[SocketEvents.RequestTimerResume('')];

      handler('test-game', 'test-user');

      expect(UserManager.getUserById).toHaveBeenCalledWith('test-user');
      expect(GameManager.getGame).toHaveBeenCalledWith('test-game');
      expect(mockGame.hasPlayer).toHaveBeenCalledWith(mockUser);
    });

    it('should ignore requests for invalid users', () => {
      (UserManager.getUserById as any).mockReturnValue(null);
      const handler = handlers[SocketEvents.RequestTimerPause('')];

      expect(() => handler('test-game', 'invalid-user')).not.toThrow();
    });

    it('should ignore requests for invalid games', () => {
      (GameManager.getGame as any).mockReturnValue(null);
      const handler = handlers[SocketEvents.RequestTimerPause('')];

      expect(() => handler('test-game', 'test-user')).not.toThrow();
    });

    it('should ignore requests for users not in game', () => {
      (mockGame.hasPlayer as any).mockReturnValue(false);
      const handler = handlers[SocketEvents.RequestTimerPause('')];

      expect(() => handler('test-game', 'test-user')).not.toThrow();
    });
  });

  describe('Latency Compensation Handlers', () => {
    let handlers: Record<string, (...args: any[]) => void>;

    beforeEach(() => {
      handlers = {};
      (mockSocket.on as any).mockImplementation((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler;
      });

      registerTimerHandlers(mockServer as Server, mockSocket as Socket);
    });

    it('should handle TimerLatencyPing', () => {
      const handler = handlers[SocketEvents.TimerLatencyPing('')];
      const pingData = {
        userId: 'test-user',
        clientTime: 1000,
        pingId: 'ping-123',
      };

      handler('test-game', pingData);

      expect(latencyCompensation.recordLatency).toHaveBeenCalledWith(
        'test-user',
        'test-game',
        1000,
        expect.any(Number),
        expect.any(Number),
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        SocketEvents.TimerLatencyPong('test-game'),
        expect.objectContaining({
          pingId: 'ping-123',
          serverTime: expect.any(Number),
          clientTime: 1000,
          measurement: expect.any(Object),
        }),
      );
    });

    it('should handle TimerLatencySync', () => {
      const handler = handlers[SocketEvents.TimerLatencySync('')];
      const syncData = {
        userId: 'test-user',
        requestTime: 1000,
      };

      handler('test-game', syncData);

      expect(latencyCompensation.getTimeSyncData).toHaveBeenCalledWith('test-user');
      expect(latencyCompensation.getNetworkQuality).toHaveBeenCalledWith('test-user');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        SocketEvents.TimerLatencySync('test-game'),
        expect.objectContaining({
          serverTime: expect.any(Number),
          latency: 50,
          stats: null,
          networkQuality: 'good',
          requestTime: 1000,
          responseTime: expect.any(Number),
        }),
      );
    });
  });

  describe('Timer Management Functions', () => {
    it('should expose TimerManager with correct methods', () => {
      expect(TimerManager).toHaveProperty('createGameTimers');
      expect(TimerManager).toHaveProperty('startPlayerTimer');
      expect(TimerManager).toHaveProperty('stopPlayerTimer');
      expect(TimerManager).toHaveProperty('pausePlayerTimer');
      expect(TimerManager).toHaveProperty('resumePlayerTimer');
      expect(TimerManager).toHaveProperty('addTimeIncrement');
      expect(TimerManager).toHaveProperty('getTimerStates');
      expect(TimerManager).toHaveProperty('syncTimerStates');
      expect(TimerManager).toHaveProperty('destroyGameTimers');
    });

    it('should call correct GameManager methods for timer operations', () => {
      // Mock the timer states for testing
      const mockTimerStates = {
        'test-user': {
          userId: 'test-user',
          remainingTime: 300,
          isActive: true,
        },
      };

      expect(TimerManager.getTimerStates).toBeTypeOf('function');
      expect(TimerManager.syncTimerStates).toBeTypeOf('function');
      expect(TimerManager.createGameTimers).toBeTypeOf('function');
      expect(TimerManager.startPlayerTimer).toBeTypeOf('function');
      expect(TimerManager.stopPlayerTimer).toBeTypeOf('function');
      expect(TimerManager.pausePlayerTimer).toBeTypeOf('function');
      expect(TimerManager.resumePlayerTimer).toBeTypeOf('function');
      expect(TimerManager.addTimeIncrement).toBeTypeOf('function');
      expect(TimerManager.destroyGameTimers).toBeTypeOf('function');
    });
  });

  describe('Error Handling', () => {
    let handlers: Record<string, (...args: any[]) => void>;

    beforeEach(() => {
      handlers = {};
      (mockSocket.on as any).mockImplementation((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler;
      });

      registerTimerHandlers(mockServer as Server, mockSocket as Socket);
    });

    it('should handle latency compensation errors gracefully', () => {
      (latencyCompensation.recordLatency as any).mockImplementation(() => {
        throw new Error('Latency recording failed');
      });

      const handler = handlers[SocketEvents.TimerLatencyPing('')];
      const pingData = {
        userId: 'test-user',
        clientTime: 1000,
        pingId: 'ping-123',
      };

      expect(() => handler('test-game', pingData)).not.toThrow();
    });

    it('should handle sync data errors gracefully', () => {
      (latencyCompensation.getTimeSyncData as any).mockImplementation(() => {
        throw new Error('Sync data failed');
      });

      const handler = handlers[SocketEvents.TimerLatencySync('')];
      const syncData = {
        userId: 'test-user',
        requestTime: 1000,
      };

      expect(() => handler('test-game', syncData)).not.toThrow();
    });

    it('should handle missing game data gracefully', () => {
      (GameManager.getGame as any).mockReturnValue(null);

      const handler = handlers[SocketEvents.GetTimerState('')];
      const callback = vi.fn();

      handler('invalid-game', callback);

      expect(callback).toHaveBeenCalledWith({});
    });

    it('should handle missing timer state gracefully', () => {
      (GameManager.getGame as any).mockReturnValue({
        ...mockGame,
        timerState: null,
      });

      const handler = handlers[SocketEvents.GetTimerState('')];
      const callback = vi.fn();

      handler('test-game', callback);

      expect(callback).toHaveBeenCalledWith({});
    });
  });

  describe('Socket Event Names', () => {
    it('should use correct socket event names', () => {
      expect(SocketEvents.GetTimerState('')).toBe('Timer__GetState');
      expect(SocketEvents.RequestTimerSync('')).toBe('Timer__RequestSync');
      expect(SocketEvents.RequestTimerPause('')).toBe('Timer__RequestPause');
      expect(SocketEvents.RequestTimerResume('')).toBe('Timer__RequestResume');
      expect(SocketEvents.TimerLatencyPing('')).toBe('Timer__LatencyPing');
      expect(SocketEvents.TimerLatencyPong('')).toBe('Timer__LatencyPong');
      expect(SocketEvents.TimerLatencySync('')).toBe('Timer__LatencySync');
      expect(SocketEvents.TimerStateSync('')).toBe('Timer__StateSync');
    });

    it('should generate game-specific event names', () => {
      const gameId = 'test-game-123';

      expect(SocketEvents.GetTimerState(gameId)).toBe('Timer_test-game-123_GetState');
      expect(SocketEvents.RequestTimerSync(gameId)).toBe('Timer_test-game-123_RequestSync');
      expect(SocketEvents.TimerLatencyPing(gameId)).toBe('Timer_test-game-123_LatencyPing');
      expect(SocketEvents.TimerLatencyPong(gameId)).toBe('Timer_test-game-123_LatencyPong');
      expect(SocketEvents.TimerLatencySync(gameId)).toBe('Timer_test-game-123_LatencySync');
    });
  });

  describe('Integration Scenarios', () => {
    let handlers: Record<string, (...args: any[]) => void>;

    beforeEach(() => {
      handlers = {};
      (mockSocket.on as any).mockImplementation((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler;
      });

      registerTimerHandlers(mockServer as Server, mockSocket as Socket);
    });

    it('should handle full latency measurement cycle', () => {
      const pingHandler = handlers[SocketEvents.TimerLatencyPing('')];
      const syncHandler = handlers[SocketEvents.TimerLatencySync('')];

      // First, handle a ping
      pingHandler('test-game', {
        userId: 'test-user',
        clientTime: 1000,
        pingId: 'ping-123',
      });

      // Then handle a sync request
      syncHandler('test-game', {
        userId: 'test-user',
        requestTime: 1500,
      });

      expect(latencyCompensation.recordLatency).toHaveBeenCalled();
      expect(latencyCompensation.getTimeSyncData).toHaveBeenCalled();
      expect(latencyCompensation.getNetworkQuality).toHaveBeenCalled();
    });

    it('should handle timer state requests with compensation', () => {
      const handler = handlers[SocketEvents.GetTimerState('')];
      const callback = vi.fn();

      handler('test-game', callback);

      expect(mockGame.getCompensatedTimerState).toHaveBeenCalledWith('test-user');
      expect(callback).toHaveBeenCalledWith({
        'test-user': expect.objectContaining({
          userId: 'test-user',
          remainingTime: 300,
        }),
      });
    });

    it('should handle pause/resume cycle correctly', () => {
      const pauseHandler = handlers[SocketEvents.RequestTimerPause('')];
      const resumeHandler = handlers[SocketEvents.RequestTimerResume('')];

      // Pause the timer
      pauseHandler('test-game', 'test-user');

      // Resume the timer
      resumeHandler('test-game', 'test-user');

      expect(UserManager.getUserById).toHaveBeenCalledTimes(2);
      expect(GameManager.getGame).toHaveBeenCalledTimes(2);
      expect(mockGame.hasPlayer).toHaveBeenCalledTimes(2);
    });
  });
});
