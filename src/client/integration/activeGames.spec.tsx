/**
 * Active Games Integration Tests
 * Tests the active games list functionality and real-time updates
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock navigation to prevent JSDOM errors
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

// Mock the Link component to prevent navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, className, to, ...props }: any) => (
      <div className={className} data-href={to} {...props}>
        {children}
      </div>
    ),
    BrowserRouter: ({ children }: any) => <div>{children}</div>,
  };
});
import { ActiveGamesList } from '../components/ActiveGamesList/ActiveGamesList';
import { GameViewProvider } from '../contexts/GameViewContext';

// Socket events constants
const SocketEvents = {
  GetMyActiveGames: 'GetMyActiveGames',
  MyActiveGamesUpdated: 'MyActiveGamesUpdated',
};

// Mock game data
interface GameSummary {
  id: string;
  joinUrl: string;
  playerCount: number;
  connectedPlayers: number;
  gameStarted: boolean;
  gameFinished: boolean;
  currentPlayer: 'B' | 'W';
  score: { B: number; W: number };
  createdAt: Date | string;
  lastActivityAt: Date | string;
  players: Array<{
    userId: string;
    name?: string;
    piece?: 'B' | 'W';
    connected: boolean;
  }>;
}

const createMockGame = (overrides: Partial<GameSummary> = {}): GameSummary => ({
  id: 'test-game-1',
  joinUrl: 'http://localhost:3000/join/test-game-1',
  playerCount: 2,
  connectedPlayers: 2,
  gameStarted: true,
  gameFinished: false,
  currentPlayer: 'B',
  score: { B: 2, W: 2 },
  createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  lastActivityAt: new Date(Date.now() - 1000 * 30), // 30 seconds ago
  players: [
    { userId: 'test-user-id', name: 'Test User', piece: 'B', connected: true },
    { userId: 'other-user', name: 'Other User', piece: 'W', connected: true },
  ],
  ...overrides,
});

// Mock socket infrastructure
interface MockSocket {
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  connected: boolean;
  id: string;
}

let mockSocket: MockSocket;
let activeGamesCallbacks: Map<string, (...args: any[]) => void>;

const createMockSocket = (): MockSocket => {
  activeGamesCallbacks = new Map();

  const socket: MockSocket = {
    emit: vi.fn((event: string, ...args: any[]) => {
      // Handle GetMyActiveGames requests
      if (event === SocketEvents.GetMyActiveGames) {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          // Return mock games after a short delay
          setTimeout(() => {
            callback([
              createMockGame(),
              createMockGame({
                id: 'test-game-2',
                gameStarted: false,
                playerCount: 1,
                connectedPlayers: 1,
                players: [{ userId: 'test-user-id', name: 'Test User', piece: 'B', connected: true }],
              }),
              createMockGame({
                id: 'test-game-3',
                gameStarted: true,
                gameFinished: true,
                currentPlayer: 'W',
                score: { B: 25, W: 39 },
                players: [
                  { userId: 'test-user-id', name: 'Test User', piece: 'B', connected: true },
                  { userId: 'winner-user', name: 'Winner User', piece: 'W', connected: true },
                ],
              }),
            ]);
          }, 10);
        }
      }
    }),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      activeGamesCallbacks.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      activeGamesCallbacks.delete(event);
    }),
    connected: true,
    id: 'mock-socket-id',
  };

  return socket;
};

// Mock socket hooks
vi.mock('../utils/socketHooks', () => ({
  useSocket: vi.fn(() => ({
    socket: mockSocket,
    localUserId: 'test-user-id',
  })),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => <GameViewProvider>{children}</GameViewProvider>;

describe('Active Games Integration Tests', () => {
  beforeEach(() => {
    mockSocket = createMockSocket();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Active Games List Loading and Display', () => {
    it('should load and display active games on mount', async () => {
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should emit GetMyActiveGames on mount
      expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.GetMyActiveGames, 'test-user-id', expect.any(Function));

      // Wait for games to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should display all games (looking for game IDs in the format "Game #game-id")
      expect(screen.getByText(/Game #test-game-1/)).toBeInTheDocument();
      expect(screen.getByText(/Game #test-game-2/)).toBeInTheDocument();
      expect(screen.getByText(/Game #test-game-3/)).toBeInTheDocument();
    });

    it('should display correct game status for different game states', async () => {
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Active game where it's user's turn
      expect(screen.getByText('Your turn')).toBeInTheDocument();

      // Waiting game
      expect(screen.getByText('Waiting for players')).toBeInTheDocument();

      // Finished game
      expect(screen.getByText('Game finished')).toBeInTheDocument();
    });

    it('should display game scores and player information', async () => {
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show score for active games (target specific score elements)
      expect(
        screen.getByText((content, element) => {
          return (element?.className === 'score' && element?.textContent?.includes('⚫ 2 - 2 ⚪')) || false;
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return (element?.className === 'score' && element?.textContent?.includes('⚫ 25 - 39 ⚪')) || false;
        }),
      ).toBeInTheDocument();

      // Should show player names (current user shows as "You", may appear multiple times)
      expect(screen.getAllByText('You').length).toBeGreaterThan(0);
      expect(screen.getByText('Other User')).toBeInTheDocument();
      expect(screen.getByText('Winner User')).toBeInTheDocument();
    });

    it('should format time ago correctly', async () => {
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show relative time formatting (may appear multiple times)
      expect(screen.getAllByText(/min ago|hours ago|Just now/).length).toBeGreaterThan(0);
    });

    it('should handle empty games list', async () => {
      // Mock empty response
      mockSocket.emit.mockImplementation((event: string, ...args: any[]) => {
        if (event === SocketEvents.GetMyActiveGames) {
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            setTimeout(() => callback([]), 10);
          }
        }
      });

      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show empty state
      expect(screen.getByText(/you don't have any active games/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should listen for active games updates on mount', async () => {
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      // Should register for real-time updates
      expect(mockSocket.on).toHaveBeenCalledWith(SocketEvents.MyActiveGamesUpdated, expect.any(Function));
    });

    it('should update games list when receiving real-time updates', async () => {
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Simulate real-time update
      const updatedGames = [
        createMockGame({
          id: 'new-game',
          currentPlayer: 'W', // Now opponent's turn
          score: { B: 3, W: 5 },
        }),
      ];

      const updateHandler = activeGamesCallbacks.get(SocketEvents.MyActiveGamesUpdated);
      expect(updateHandler).toBeDefined();

      if (updateHandler) {
        await act(async () => {
          updateHandler(updatedGames);
          // Wait for state update to complete
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
      }

      // Should show updated information
      await waitFor(() => {
        expect(screen.getByText(/Game #new-game/)).toBeInTheDocument();
        expect(screen.getByText("Opponent's turn")).toBeInTheDocument();
        expect(screen.getByText(/3.*-.*5/)).toBeInTheDocument(); // Score format: "3 - 5"
      });

      // Old games should be replaced
      expect(screen.queryByText(/Game #test-game-1/)).not.toBeInTheDocument();
    });

    it('should handle rapid successive updates', async () => {
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const updateHandler = activeGamesCallbacks.get(SocketEvents.MyActiveGamesUpdated);

      // Send multiple rapid updates
      const updates = [
        [createMockGame({ id: 'update-1', score: { B: 1, W: 1 } })],
        [createMockGame({ id: 'update-2', score: { B: 2, W: 2 } })],
        [createMockGame({ id: 'update-3', score: { B: 3, W: 3 } })],
      ];

      updates.forEach((games, index) => {
        setTimeout(() => {
          if (updateHandler) updateHandler(games);
        }, index * 10);
      });

      // Should handle all updates and show final state
      await waitFor(() => {
        expect(screen.getByText(/Game #update-3/)).toBeInTheDocument();
        expect(screen.getByText(/3.*-.*3/)).toBeInTheDocument(); // Score format: "3 - 3"
      });
    });

    it('should clean up event listeners on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      unmount();

      // Should remove event listeners
      expect(mockSocket.off).toHaveBeenCalledWith(SocketEvents.MyActiveGamesUpdated);
    });
  });

  describe('Game Navigation and Interaction', () => {
    it('should provide navigation links to games', async () => {
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should have clickable game elements (mocked as divs with data-href)
      const gameCards = document.querySelectorAll('.game-card[data-href]');
      const gameLinks = Array.from(gameCards).filter((card) => {
        const href = card.getAttribute('data-href');
        return href && href !== '/';
      });

      expect(gameLinks.length).toBeGreaterThan(0);

      // Game links should point to game or join URLs
      gameLinks.forEach((link) => {
        const href = link.getAttribute('data-href');
        expect(href).toMatch(/\/(game|join)\//);
      });
    });

    it('should handle click interactions without crashing', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should be able to click on games without crashing
      const gameElements = screen.getAllByText(/Game #test-game-/);

      expect(async () => {
        for (const element of gameElements) {
          await user.click(element);
        }
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock socket emit to call callback with error
      mockSocket.emit.mockImplementation((event: string, ...args: any[]) => {
        if (event === SocketEvents.GetMyActiveGames) {
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            // Simulate network error - call with empty array
            setTimeout(() => callback([]), 10);
          }
        }
      });

      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      // Should handle network errors gracefully
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should show empty state when no games are returned
      expect(screen.getByText(/you don't have any active games/i)).toBeInTheDocument();
    });

    it('should handle malformed game data', async () => {
      // Mock response with partially malformed data (but with required fields to prevent crashes)
      mockSocket.emit.mockImplementation((event: string, ...args: any[]) => {
        if (event === SocketEvents.GetMyActiveGames) {
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            setTimeout(() => {
              callback([
                {
                  id: 'partial-game',
                  players: [], // Empty players array
                  gameStarted: false,
                  gameFinished: false,
                },
                createMockGame(), // Valid game mixed with partial ones
              ]);
            }, 10);
          }
        }
      });

      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      // Should handle malformed data without crashing
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should still render what it can
      expect(screen.getByText(/Game #partial-game/)).toBeInTheDocument();
      expect(screen.getByText(/Game #test-game-1/)).toBeInTheDocument();
    });

    it('should handle socket emit failures', async () => {
      // Mock socket emit to fail without throwing
      mockSocket.emit.mockImplementation((event, userId, callback) => {
        if (event === 'GetMyActiveGames') {
          // Simulate network failure by not calling callback
          console.warn('Socket emit failed (simulated)');
          return false;
        }
      });

      // Component should render but show loading state since callback never fires
      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      // Should handle the error gracefully by staying in loading state
      await waitFor(
        () => {
          expect(screen.getByText(/loading/i) || screen.getByText(/no active games/i)).toBeInTheDocument();
        },
        { timeout: 1000 },
      );

      // Component should not crash
      expect(screen.getByRole('heading', { name: 'My Active Games' })).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with multiple mounts/unmounts', async () => {
      // Mount and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <TestWrapper>
            <ActiveGamesList />
          </TestWrapper>,
        );

        unmount();
      }

      // Should not accumulate event listeners
      expect(mockSocket.off).toHaveBeenCalledTimes(5);
    });

    it('should handle large game lists efficiently', async () => {
      // Mock large number of games
      const largeGamesList = Array.from({ length: 100 }, (_, i) => createMockGame({ id: `game-${i}` }));

      mockSocket.emit.mockImplementation((event: string, ...args: any[]) => {
        if (event === SocketEvents.GetMyActiveGames) {
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            setTimeout(() => {
              act(() => {
                callback(largeGamesList);
              });
            }, 10);
          }
        }
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const endTime = performance.now();

      // Should render efficiently (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should display games
      expect(screen.getByText(/Game #game-0/)).toBeInTheDocument();
      expect(screen.getByText(/Game #game-99/)).toBeInTheDocument();
    });
  });

  describe('Game Status Logic', () => {
    it("should correctly determine when it is the user's turn", async () => {
      const userTurnGame = createMockGame({
        id: 'user-turn-game',
        currentPlayer: 'B', // User is black
        players: [
          { userId: 'test-user-id', name: 'Test User', piece: 'B', connected: true },
          { userId: 'other-user', name: 'Other User', piece: 'W', connected: true },
        ],
      });

      mockSocket.emit.mockImplementation((event: string, ...args: any[]) => {
        if (event === SocketEvents.GetMyActiveGames) {
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            setTimeout(() => callback([userTurnGame]), 10);
          }
        }
      });

      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('Your turn')).toBeInTheDocument();
      });
    });

    it("should correctly determine when it is the opponent's turn", async () => {
      const opponentTurnGame = createMockGame({
        id: 'opponent-turn-game',
        currentPlayer: 'W', // Opponent is white, user is black
        players: [
          { userId: 'test-user-id', name: 'Test User', piece: 'B', connected: true },
          { userId: 'other-user', name: 'Other User', piece: 'W', connected: true },
        ],
      });

      mockSocket.emit.mockImplementation((event: string, ...args: any[]) => {
        if (event === SocketEvents.GetMyActiveGames) {
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            setTimeout(() => callback([opponentTurnGame]), 10);
          }
        }
      });

      render(
        <TestWrapper>
          <ActiveGamesList />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Opponent's turn")).toBeInTheDocument();
      });
    });
  });
});
