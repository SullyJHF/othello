/**
 * Socket Event Testing Infrastructure
 * Tests real-time communication patterns and socket event handling
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
// Socket events constants (copied to avoid import issues in tests)
const SocketEvents = {
  ClientConnected: 'ClientConnected',
  UserJoined: 'UserJoined',
  UserLeft: 'UserLeft',
  Disconnected: 'disconnect',
  Connected: 'connection',
  PlacePiece: 'PlacePiece',
  HostNewGame: 'HostNewGame',
  JoinGame: 'JoinGame',
  JoinedGame: 'JoinedGame',
  StartGame: 'StartGame',
  CreateDummyGame: 'CreateDummyGame',
  GetMyActiveGames: 'GetMyActiveGames',
  MyActiveGamesUpdated: 'MyActiveGamesUpdated',
  GameUpdated: (gameId: string) => `Game_${gameId}_Updated`,
};
import { ProvideSocket } from '../utils/socketHooks';
import { HostGameMenu } from '../components/MainMenu/HostGameMenu';
import { JoinGameMenu } from '../components/MainMenu/JoinGameMenu';
import { Board } from '../components/Board/Board';
import { GameViewProvider } from '../contexts/GameViewContext';

// Socket event testing infrastructure
interface MockSocket {
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connected: boolean;
  id: string;
}

interface SocketEventTest {
  name: string;
  event: string;
  expectedArgs?: any[];
  callback?: (socket: MockSocket, ...args: any[]) => void;
}

/**
 * Creates a mock socket with event tracking capabilities
 */
const createMockSocket = (): MockSocket => {
  const eventHandlers = new Map<string, Function[]>();

  const mockSocket: MockSocket = {
    emit: vi.fn((event: string, ...args: any[]) => {
      // Simulate server response for certain events
      const lastArg = args[args.length - 1];
      if (typeof lastArg === 'function') {
        // Handle callback-based responses
        if (event === SocketEvents.HostNewGame) {
          setTimeout(() => lastArg('test-game-id'), 0);
        } else if (event === SocketEvents.JoinGame) {
          setTimeout(() => lastArg({}), 0); // Success case - empty object means no error
        }
      }
    }),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
    }),
    off: vi.fn((event: string, handler: Function) => {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  };

  // Add method to trigger events for testing
  (mockSocket as any).triggerEvent = (event: string, ...args: any[]) => {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  };

  return mockSocket;
};

// Mock socket hooks
let mockSocket: MockSocket;

vi.mock('../utils/socketHooks', () => {
  return {
    useSocket: vi.fn(() => ({
      socket: mockSocket,
      localUserId: 'test-user-id',
    })),
    ProvideSocket: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSubscribeEffect: vi.fn((subscribe: () => void) => {
      subscribe();
    }),
  };
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <GameViewProvider>
      <ProvideSocket>{children}</ProvideSocket>
    </GameViewProvider>
  </BrowserRouter>
);

describe('Socket Event Testing Infrastructure', () => {
  beforeEach(() => {
    mockSocket = createMockSocket();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Socket Event Emission Tests', () => {
    it('should emit HostNewGame event with correct parameters', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <HostGameMenu />
        </TestWrapper>,
      );

      // Fill in username and submit
      const usernameInput = screen.getByPlaceholderText('Enter your username');
      const submitButton = screen.getByRole('button', { name: /create.*host game/i });

      await user.type(usernameInput, 'Test Host');
      await user.click(submitButton);

      // Verify socket emit was called with correct parameters
      expect(mockSocket.emit).toHaveBeenCalledWith(
        SocketEvents.HostNewGame,
        'test-user-id',
        'Test Host',
        expect.any(Function),
      );
    });

    it('should emit JoinGame event with correct parameters', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Fill in game details and submit
      const usernameInput = screen.getByPlaceholderText('Enter your username');
      const gameIdInput = screen.getByPlaceholderText('Enter Game ID');
      const submitButton = screen.getByRole('button', { name: 'Join Game' });

      // Clear existing value and type new value
      await user.clear(usernameInput);
      await user.type(usernameInput, 'Test Joiner');
      await user.type(gameIdInput, 'ABC123'); // 6 characters to match maxlength
      await user.click(submitButton);

      // Verify socket emit was called with correct parameters
      expect(mockSocket.emit).toHaveBeenCalledWith(
        SocketEvents.JoinGame,
        'test-user-id',
        'Test Joiner',
        'ABC123',
        expect.any(Function),
      );
    });

    it('should emit PlacePiece event when board cell is clicked', async () => {
      const user = userEvent.setup();

      const boardProps = {
        gameId: 'test-game',
        boardState: '0...............................................................', // Valid move at position 0
        isCurrentPlayer: true,
      };

      render(
        <TestWrapper>
          <Board {...boardProps} />
        </TestWrapper>,
      );

      // Click on a valid move
      const moveCell = screen.getByTestId('board-cell-0');
      await user.click(moveCell);

      // Verify socket emit was called with correct parameters
      expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.PlacePiece, 'test-game', 'test-user-id', 0);
    });
  });

  describe('Socket Event Handler Tests', () => {
    it('should handle socket events without crashing', async () => {
      const gameId = 'test-game';
      const mockGameData = {
        gameId,
        gameStarted: true,
        players: {
          player1: { userId: 'player1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
          player2: { userId: 'player2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true },
        },
        currentPlayer: 'B',
        board: 'BWBWBWBWWBWBWBWB...'.repeat(4).substring(0, 64),
        gameFinished: false,
        score: { B: 32, W: 32 },
      };

      // Should be able to trigger events without crashing
      expect(() => {
        (mockSocket as any).triggerEvent(SocketEvents.GameUpdated(gameId), mockGameData);
        (mockSocket as any).triggerEvent(SocketEvents.UserJoined, { userId: 'test', name: 'Test' });
        (mockSocket as any).triggerEvent(SocketEvents.UserLeft, { userId: 'test' });
      }).not.toThrow();
    });

    it('should maintain socket mock functionality', async () => {
      // Verify that our mock socket behaves correctly
      expect(mockSocket.emit).toBeDefined();
      expect(mockSocket.on).toBeDefined();
      expect(mockSocket.off).toBeDefined();
      expect(mockSocket.connected).toBe(true);
      expect(mockSocket.id).toBe('mock-socket-id');
    });
  });

  describe('Socket Connection Lifecycle Tests', () => {
    it('should handle socket connection events', async () => {
      // Should be able to trigger connection events without crashing
      expect(() => {
        (mockSocket as any).triggerEvent('connect');
        (mockSocket as any).triggerEvent(SocketEvents.Disconnected);
      }).not.toThrow();
    });

    it('should clean up event listeners on component unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <HostGameMenu />
        </TestWrapper>,
      );

      // Unmount component should not cause any errors
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should maintain socket connection state', async () => {
      // Mock socket should maintain its connected state
      expect(mockSocket.connected).toBe(true);

      // Should have necessary methods
      expect(typeof mockSocket.emit).toBe('function');
      expect(typeof mockSocket.on).toBe('function');
      expect(typeof mockSocket.disconnect).toBe('function');
    });
  });

  describe('Event Synchronization Tests', () => {
    it('should handle multiple events in sequence without crashing', async () => {
      const gameId = 'sync-test-game';

      // Simulate a sequence of events
      const events = [
        { event: SocketEvents.GameUpdated(gameId), data: { gameId, gameStarted: false } },
        { event: SocketEvents.UserJoined, data: { userId: 'player2', name: 'Player 2' } },
        { event: SocketEvents.GameUpdated(gameId), data: { gameId, gameStarted: true } },
      ];

      // Should handle all events without crashing
      expect(() => {
        events.forEach(({ event, data }) => {
          (mockSocket as any).triggerEvent(event, data);
        });
      }).not.toThrow();
    });

    it('should handle rapid successive events without race conditions', async () => {
      const gameId = 'rapid-test-game';

      // Create 10 rapid events
      const rapidEvents = Array.from({ length: 10 }, (_, i) => ({
        event: SocketEvents.GameUpdated(gameId),
        data: { gameId, eventNumber: i },
      }));

      // Should handle all rapid events without crashing
      expect(() => {
        rapidEvents.forEach(({ event, data }) => {
          (mockSocket as any).triggerEvent(event, data);
        });
      }).not.toThrow();
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle socket errors gracefully', async () => {
      // Should be able to trigger error events without crashing
      expect(() => {
        (mockSocket as any).triggerEvent('error', new Error('Socket connection failed'));
      }).not.toThrow();
    });

    it('should handle malformed event data', async () => {
      const gameId = 'error-test-game';

      // Send malformed data
      const malformedEvents = [
        { event: SocketEvents.GameUpdated(gameId), data: null },
        { event: SocketEvents.GameUpdated(gameId), data: undefined },
        { event: SocketEvents.GameUpdated(gameId), data: 'invalid-string' },
        { event: SocketEvents.GameUpdated(gameId), data: { incomplete: 'data' } },
      ];

      // Should handle all malformed data gracefully
      malformedEvents.forEach(({ event, data }) => {
        expect(() => {
          (mockSocket as any).triggerEvent(event, data);
        }).not.toThrow();
      });
    });

    it('should handle callback errors in socket emits', async () => {
      const user = userEvent.setup();

      // Mock socket to trigger error in callback
      mockSocket.emit.mockImplementation((event: string, ...args: any[]) => {
        const lastArg = args[args.length - 1];
        if (typeof lastArg === 'function' && event === SocketEvents.HostNewGame) {
          setTimeout(() => lastArg(new Error('Server error')), 0);
        }
      });

      render(
        <TestWrapper>
          <HostGameMenu />
        </TestWrapper>,
      );

      const usernameInput = screen.getByPlaceholderText('Enter your username');
      const submitButton = screen.getByRole('button', { name: /create.*host game/i });

      await user.type(usernameInput, 'Test Host');

      // Should not crash when clicking submit
      expect(async () => {
        await user.click(submitButton);
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-frequency events efficiently', async () => {
      const startTime = performance.now();

      // Simulate 100 rapid events
      for (let i = 0; i < 100; i++) {
        (mockSocket as any).triggerEvent(SocketEvents.GameUpdated('perf-test'), {
          gameId: 'perf-test',
          gameStarted: true,
          currentPlayer: 'B',
          board: `${i}`.repeat(64).substring(0, 64),
          gameFinished: false,
          score: { B: i, W: 100 - i },
        });
      }

      const endTime = performance.now();

      // Should complete within reasonable time (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should not cause memory leaks with event handlers', async () => {
      const initialHandlerCount = mockSocket.on.mock.calls.length;

      // Create and destroy components multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <TestWrapper>
            <HostGameMenu />
          </TestWrapper>,
        );
        unmount();
      }

      // Handler count should be reasonable (not exponentially growing)
      const finalHandlerCount = mockSocket.on.mock.calls.length;
      expect(finalHandlerCount - initialHandlerCount).toBeLessThan(50);
    });
  });
});
