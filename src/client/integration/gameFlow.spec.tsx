/**
 * Integration tests for complete game flows from start to finish
 * Tests the host game workflow: MainMenu → HostGameMenu → Lobby → GameBoard
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { HostGameMenu } from '../components/MainMenu/HostGameMenu';
import { MainMenu } from '../components/MainMenu/MainMenu';
import { Othello } from '../components/Othello/Othello';
import { GameViewProvider } from '../contexts/GameViewContext';

// Mock the socket hooks
vi.mock('../utils/socketHooks', () => {
  const eventHandlers: Record<string, Function[]> = {};

  const mockSocketInstance = {
    emit: vi.fn((event: string, ...args: any[]) => {
      // Simulate server responses for key events
      if (event === 'HostNewGame') {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          setTimeout(() => {
            callback('test-game-123'); // HostGameMenu expects gameId as string parameter
          }, 10);
        }
      }

      if (event === 'JoinedGame') {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          setTimeout(() => {
            callback({ success: true });
          }, 10);
        }
      }

      if (event === 'StartGame') {
        // Simulate game start
        setTimeout(() => {
          const gameUpdatedHandlers = eventHandlers[`Game_${args[0]}_Updated`] || [];
          gameUpdatedHandlers.forEach((handler) => {
            handler({
              id: args[0],
              gameStarted: true,
              gameFull: true,
              gameFinished: false,
              currentPlayer: 'B',
              players: {
                user1: { userId: 'user1', socketId: 'socket1', name: 'Host Player', piece: 'B', connected: true },
                user2: { userId: 'user2', name: 'Joined Player', piece: 'W', connected: true },
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
              joinUrl: 'http://localhost:3000/join/test-game-123',
            });
          });
        }, 10);
      }
    }),

    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),

    off: vi.fn((event: string) => {
      delete eventHandlers[event];
    }),

    // Helper to trigger events manually
    triggerEvent: (event: string, data: any) => {
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
      React.useEffect(() => {
        subscribe();
        return unsubscribe;
      }, [deps]);
    }),
    ProvideSocket: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
    __mockSocket: mockSocketInstance, // Export for test access
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
    useParams: vi.fn(() => ({ gameId: 'test-game-123' })),
  };
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode; }) => (
  <BrowserRouter>
    <GameViewProvider>{children}</GameViewProvider>
  </BrowserRouter>
);

describe('Host Game Flow Integration Tests', () => {
  let mockSocket: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Clear localStorage to prevent test interference
    localStorage.clear();

    // Get the mock socket instance
    const socketHooks = await import('../utils/socketHooks');
    mockSocket = (socketHooks as any).__mockSocket;
  });

  describe('Complete Host Game Workflow', () => {
    it('should complete the full host game flow: MainMenu → HostGameMenu → Lobby → Game', async () => {
      const user = userEvent.setup();

      // Step 1: Start from MainMenu and navigate to host game
      const { rerender } = render(
        <TestWrapper>
          <MainMenu />
        </TestWrapper>,
      );

      // Verify main menu renders correctly
      expect(screen.getByText('Othello')).toBeInTheDocument();
      expect(screen.getByText('🎮 Host Game')).toBeInTheDocument();

      // Click Host Game button
      const hostButton = screen.getByText('🎮 Host Game');
      await user.click(hostButton);

      // Step 2: Render HostGameMenu (simulating navigation)
      rerender(
        <TestWrapper>
          <HostGameMenu />
        </TestWrapper>,
      );

      // Verify host game form appears
      expect(screen.getByText('Host New Game')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();

      // Fill in player name and submit
      const nameInput = screen.getByPlaceholderText(/enter your username/i);
      await user.type(nameInput, 'Test Host Player');

      const createButton = screen.getByRole('button', { name: /create.*host game/i });
      await user.click(createButton);

      // Wait for game creation and navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/game/test-game-123');
      });

      // Step 3: Render game component (simulating navigation to game)
      rerender(
        <TestWrapper>
          <Othello />
        </TestWrapper>,
      );

      // Initially should show lobby (game not started yet)
      await waitFor(() => {
        expect(screen.getByText(/waiting for.*player/i)).toBeInTheDocument();
      });

      // Verify join URL section appears (URL will be populated after game state updates)
      expect(screen.getByText('Share this link to invite a friend:')).toBeInTheDocument();

      // Trigger game update with second player
      await act(async () => {
        mockSocket.triggerEvent('Game_test-game-123_Updated', {
          id: 'test-game-123',
          gameStarted: false,
          gameFull: true,
          players: {
            user1: { userId: 'user1', socketId: 'socket1', name: 'Host Player', piece: 'B', connected: true },
            user2: { userId: 'user2', socketId: 'socket2', name: 'Joined Player', piece: 'W', connected: true },
          },
          board: { boardState: '', score: { B: 2, W: 2 } },
          joinUrl: 'http://localhost:3000/join/test-game-123',
        });
        // Wait for state update to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Wait for lobby to update with both players
      await waitFor(() => {
        expect(screen.getByText('Host Player')).toBeInTheDocument();
        expect(screen.getByText('Joined Player')).toBeInTheDocument();
      });

      // Verify start game button appears when game is full
      await waitFor(() => {
        expect(screen.getByText('🎮 Start Game!')).toBeInTheDocument();
      });

      // Step 4: Start the game
      const startGameButton = screen.getByText('🎮 Start Game!');
      await user.click(startGameButton);

      // Wait for game to start and board to render
      await waitFor(() => {
        expect(screen.getByTestId('game-board-container')).toBeInTheDocument();
      });

      // Verify initial game state
      await waitFor(() => {
        // Should have 64 board cells
        expect(screen.getAllByTestId(/^board-cell-/)).toHaveLength(64);

        // Should show player components with turn indicators
        expect(screen.getByText('Host Player (You)')).toBeInTheDocument();

        // Look for "Joined Player" - may appear with different formatting
        const joinedPlayerElements = screen.queryAllByText(/Joined Player/i);
        expect(joinedPlayerElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Host Game Error Scenarios', () => {
    // Note: HostGameMenu component currently has no error handling,
    // so we only test validation scenarios

    it('should not submit empty form', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <HostGameMenu />
        </TestWrapper>,
      );

      // Ensure input is empty by checking its value
      const nameInput = screen.getByPlaceholderText(/enter your username/i);
      expect(nameInput).toHaveValue('');

      // Try clicking button - should be disabled or not submit
      const createButton = screen.getByRole('button', { name: /create.*host game/i });

      // Either button should be disabled, or clicking shouldn't submit
      if (!createButton.hasAttribute('disabled')) {
        await user.click(createButton);
        // If button isn't disabled, form validation should prevent socket call
        expect(mockSocket.emit).not.toHaveBeenCalledWith(
          'HostNewGame',
          expect.anything(),
          expect.anything(),
          expect.anything(),
        );
      } else {
        // Button is properly disabled
        expect(createButton).toBeDisabled();
      }
    });
  });

  describe('Game State Management', () => {
    it('should properly manage game state updates through socket events', async () => {
      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>,
      );

      // Trigger initial game state
      await act(async () => {
        mockSocket.triggerEvent('Game_test-game-123_Updated', {
          id: 'test-game-123',
          gameStarted: false,
          gameFull: false,
          players: {
            user1: { userId: 'user1', socketId: 'socket1', name: 'Host Player', piece: 'B', connected: true },
          },
          board: { boardState: '', score: { B: 2, W: 2 } },
          joinUrl: 'http://localhost:3000/join/test-game-123',
        });
        // Wait for state update to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show lobby initially (text changes based on player count)
      await waitFor(() => {
        expect(screen.getByText(/waiting for.*player/i)).toBeInTheDocument();
      });

      // Add second player
      await act(async () => {
        mockSocket.triggerEvent('Game_test-game-123_Updated', {
          id: 'test-game-123',
          gameStarted: false,
          gameFull: true,
          players: {
            user1: { userId: 'user1', socketId: 'socket1', name: 'Host Player', piece: 'B', connected: true },
            user2: { userId: 'user2', socketId: 'socket2', name: 'Joined Player', piece: 'W', connected: true },
          },
          board: { boardState: '', score: { B: 2, W: 2 } },
          joinUrl: 'http://localhost:3000/join/test-game-123',
        });
        // Wait for state update to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show both players and start button
      await waitFor(() => {
        expect(screen.getByText('Host Player')).toBeInTheDocument();
        expect(screen.getByText('Joined Player')).toBeInTheDocument();
        expect(screen.getByText('🎮 Start Game!')).toBeInTheDocument();
      });

      // Start game
      await act(async () => {
        mockSocket.triggerEvent('Game_test-game-123_Updated', {
          id: 'test-game-123',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'B',
          players: {
            user1: { userId: 'user1', socketId: 'socket1', name: 'Host Player', piece: 'B', connected: true },
            user2: { userId: 'user2', socketId: 'socket2', name: 'Joined Player', piece: 'W', connected: true },
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
          joinUrl: 'http://localhost:3000/join/test-game-123',
        });
        // Wait for state update to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should render game board
      await waitFor(() => {
        expect(screen.getByTestId('game-board-container')).toBeInTheDocument();
        expect(screen.getAllByTestId(/^board-cell-/)).toHaveLength(64);
      });
    });
  });
});
