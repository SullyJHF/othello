/**
 * Focused test to debug game state transitions
 * Tests the specific lobby → game board transition
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Othello } from '../components/Othello/Othello';
import { GameViewProvider } from '../contexts/GameViewContext';

// Mock the socket hooks
vi.mock('../utils/socketHooks', () => {
  const eventHandlers: Record<string, (...args: any[]) => void[]> = {};

  const mockSocketInstance = {
    emit: vi.fn((event: string, ...args: any[]) => {
      console.log('Socket emit:', event, args);

      if (event === 'JoinedGame') {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          setTimeout(() => {
            callback({ success: true });
          }, 5);
        }
      }

      if (event === 'StartGame') {
        console.log('StartGame triggered for gameId:', args[0]);
      }
    }),

    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
      console.log('Subscribed to event:', event);
    }),

    off: vi.fn((event: string) => {
      delete eventHandlers[event];
      console.log('Unsubscribed from event:', event);
    }),

    // Helper to trigger events manually
    triggerEvent: (event: string, data: any) => {
      console.log('Triggering event:', event, data);
      const handlers = eventHandlers[event] || [];
      handlers.forEach((handler) => handler(data));
    },
  };

  return {
    useSocket: vi.fn(() => ({
      socket: mockSocketInstance,
      localUserId: 'user1',
    })),
    useSubscribeEffect: vi.fn((subscribe, unsubscribe, deps) => {
      useEffect(() => {
        console.log('useSubscribeEffect called with deps:', deps);
        subscribe();
        return unsubscribe;
      }, [deps]);
    }),
    ProvideSocket: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    __mockSocket: mockSocketInstance,
  };
});

// Mock debug mode
vi.mock('../hooks/useDebugMode', () => ({
  useDebugMode: vi.fn(() => ({
    debugConfig: { enabled: false, features: {} },
    isDebugEnabled: false,
    isDummyGameEnabled: false,
    isAutoPlayEnabled: false,
    isGameInspectorEnabled: false,
    isPerformanceMonitorEnabled: false,
    panelState: { isOpen: false, activeTab: 'auto-play', position: 'top-right', size: 'compact' },
    togglePanel: vi.fn(),
    setPanelTab: vi.fn(),
    setPanelPosition: vi.fn(),
    setPanelSize: vi.fn(),
    actions: [],
    addAction: vi.fn(),
    clearActions: vi.fn(),
    exportActions: vi.fn(),
    logDebug: vi.fn(),
  })),
}));

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(() => ({ gameId: 'debug-game-123' })),
  };
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <GameViewProvider>{children}</GameViewProvider>
  </BrowserRouter>
);

describe('Game State Transition Debug Tests', () => {
  let mockSocket: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Get the mock socket instance
    const socketHooks = await import('../utils/socketHooks');
    mockSocket = (socketHooks as any).__mockSocket;
  });

  it('should transition from lobby to game board when all conditions are met', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Othello />
      </TestWrapper>,
    );

    console.log('🚀 Test starting - should be in initial lobby state');

    // Step 1: Set up lobby state with 2 players (no pieces yet)
    await waitFor(async () => {
      mockSocket.triggerEvent('Game_debug-game-123_Updated', {
        id: 'debug-game-123',
        gameStarted: false,
        gameFull: true,
        gameFinished: false,
        players: {
          user1: { userId: 'user1', socketId: 'socket1', name: 'Player 1', connected: true },
          user2: { userId: 'user2', socketId: 'socket2', name: 'Player 2', connected: true },
        },
        board: { boardState: '', score: { B: 2, W: 2 } },
        joinUrl: 'http://localhost:3000/join/debug-game-123',
      });
    });

    // Verify lobby state
    await waitFor(() => {
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 2')).toBeInTheDocument();
      expect(screen.getByText('🎮 Start Game!')).toBeInTheDocument();
    });

    console.log('✅ Lobby state confirmed - clicking start game');

    // Step 2: Click start game
    const startButton = screen.getByText('🎮 Start Game!');
    await user.click(startButton);

    console.log('🔄 Start game clicked - now sending game started state with pieces...');

    // Step 3: Send game started state with all required properties
    await waitFor(async () => {
      mockSocket.triggerEvent('Game_debug-game-123_Updated', {
        id: 'debug-game-123',
        gameStarted: true, // ✓ Required
        gameFull: true,
        gameFinished: false,
        currentPlayer: 'B', // ✓ Required for currentPlayerId derivation
        players: {
          user1: {
            userId: 'user1',
            socketId: 'socket1',
            name: 'Player 1',
            piece: 'B', // ✓ Required for black derivation
            connected: true,
          },
          user2: {
            userId: 'user2',
            socketId: 'socket2',
            name: 'Player 2',
            piece: 'W', // ✓ Required for white derivation
            connected: true,
          },
        },
        board: {
          boardState: `........
........
...0....
..0WB...
...BW0..
....0...
........
........`,
          score: { B: 2, W: 2 },
        },
        joinUrl: 'http://localhost:3000/join/debug-game-123',
      });
    });

    console.log('🎯 Game started state sent - checking for game board...');

    // Step 4: Verify game board appears
    await waitFor(
      () => {
        expect(screen.getByTestId('game-board-container')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    console.log('🎮 Game board found! Checking board cells...');

    // Step 5: Verify board is interactive
    await waitFor(() => {
      expect(screen.getAllByTestId(/^board-cell-/)).toHaveLength(64);
    });

    console.log('🎉 Test passed - full transition successful!');
  });

  it('should show lobby when pieces are missing', async () => {
    render(
      <TestWrapper>
        <Othello />
      </TestWrapper>,
    );

    console.log('🧪 Testing condition: gameStarted=true but no pieces');

    // Send game state with gameStarted=true but no pieces assigned
    await waitFor(async () => {
      mockSocket.triggerEvent('Game_debug-game-123_Updated', {
        id: 'debug-game-123',
        gameStarted: true, // ✓ True but...
        gameFull: true,
        gameFinished: false,
        currentPlayer: 'B',
        players: {
          user1: { userId: 'user1', socketId: 'socket1', name: 'Player 1', connected: true }, // ❌ No piece
          user2: { userId: 'user2', socketId: 'socket2', name: 'Player 2', connected: true }, // ❌ No piece
        },
        board: { boardState: '', score: { B: 2, W: 2 } },
        joinUrl: 'http://localhost:3000/join/debug-game-123',
      });
    });

    // Should still show lobby (because black and white will be undefined)
    await waitFor(() => {
      expect(screen.getByText('🎮 Start Game!')).toBeInTheDocument();
    });

    console.log('✅ Correctly stayed in lobby when pieces missing');
  });

  it('should show lobby when currentPlayer does not match any player piece', async () => {
    render(
      <TestWrapper>
        <Othello />
      </TestWrapper>,
    );

    console.log('🧪 Testing condition: pieces assigned but currentPlayer mismatch');

    // Send game state with pieces but currentPlayer doesn't match
    await waitFor(async () => {
      mockSocket.triggerEvent('Game_debug-game-123_Updated', {
        id: 'debug-game-123',
        gameStarted: true,
        gameFull: true,
        gameFinished: false,
        currentPlayer: 'X', // ❌ Doesn't match B or W
        players: {
          user1: { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
          user2: { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true },
        },
        board: { boardState: '', score: { B: 2, W: 2 } },
        joinUrl: 'http://localhost:3000/join/debug-game-123',
      });
    });

    // Should still show lobby (because currentPlayerId will be undefined)
    await waitFor(() => {
      expect(screen.getByText('🎮 Start Game!')).toBeInTheDocument();
    });

    console.log('✅ Correctly stayed in lobby when currentPlayer mismatches');
  });
});
