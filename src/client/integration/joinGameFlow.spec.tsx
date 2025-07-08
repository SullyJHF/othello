/**
 * Integration tests for join game flow
 * Tests the join game workflow: Direct link → JoinGameMenu → Lobby → GameBoard
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { JoinGameMenu } from '../components/MainMenu/JoinGameMenu';
import { Othello } from '../components/Othello/Othello';
import { GameViewProvider } from '../contexts/GameViewContext';

// Mock the socket hooks
vi.mock('../utils/socketHooks', () => {
  const eventHandlers: Record<string, (...args: any[]) => void[]> = {};

  const mockSocketInstance = {
    emit: vi.fn((event: string, ...args: any[]) => {
      // Simulate server responses for key events
      if (event === 'JoinGame') {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          setTimeout(() => {
            const gameId = args[2]; // gameId is the 3rd parameter (localUserId, userName, gameId, callback)
            if (gameId === 'VALID1' || gameId === 'valid-game-123') {
              callback({ error: null }); // Success response has error: null
            } else if (gameId === 'INVAL1') {
              callback({
                error: 'Game not found',
              });
            } else if (gameId === 'FULL01') {
              callback({
                error: 'Game is full',
              });
            } else {
              // Default successful response for other valid game IDs
              callback({ error: null });
            }
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
    }),

    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
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
      localUserId: 'user2',
    })),
    useSubscribeEffect: vi.fn((subscribe, unsubscribe, deps) => {
      useEffect(() => {
        subscribe();
        return unsubscribe;
      }, [deps]);
    }),
    ProvideSocket: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  const mockUseParams = vi.fn(() => ({ gameId: 'valid-game-123' }));
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: mockUseParams,
    __mockUseParams: mockUseParams, // Export for test access
  };
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <GameViewProvider>{children}</GameViewProvider>
  </BrowserRouter>
);

describe('Join Game Flow Integration Tests', () => {
  let mockSocket: any;
  let mockUseParams: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Clear localStorage to prevent test interference
    localStorage.clear();

    // Get the mock instances
    const socketHooks = await import('../utils/socketHooks');
    const routerDom = await import('react-router-dom');
    mockSocket = (socketHooks as any).__mockSocket;
    mockUseParams = (routerDom as any).__mockUseParams;
    mockUseParams.mockReturnValue({ gameId: 'valid-game-123' });
  });

  describe('Join via Game ID', () => {
    it('should successfully join a game by entering game ID', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Verify join game form appears
      expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('valid-game-123')).toBeInTheDocument();

      // Fill in the form
      const nameInput = screen.getByPlaceholderText(/enter your username/i);
      const gameIdInput = screen.getByDisplayValue('valid-game-123');

      await user.type(nameInput, 'Test Joiner');
      await user.clear(gameIdInput);
      await user.type(gameIdInput, 'VALID1');

      // Submit the form
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      await user.click(joinButton);

      // Wait for navigation to game
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/game/VALID1');
      });

      // Verify socket events were called correctly
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'JoinGame',
        'user2', // localUserId
        'Test Joiner', // username
        'VALID1', // gameId
        expect.any(Function), // callback
      );
    });

    it('should handle invalid game ID error', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Fill in form with invalid game ID
      const nameInput = screen.getByPlaceholderText(/enter your username/i);
      const gameIdInput = screen.getByDisplayValue('valid-game-123');

      await user.type(nameInput, 'Test Player');
      await user.clear(gameIdInput);
      await user.type(gameIdInput, 'INVAL1');

      // Submit the form
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      await user.click(joinButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/game not found/i)).toBeInTheDocument();
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle game full error', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Fill in form with full game ID
      const nameInput = screen.getByPlaceholderText(/enter your username/i);
      const gameIdInput = screen.getByDisplayValue('valid-game-123');

      await user.type(nameInput, 'Test Player');
      await user.clear(gameIdInput);
      await user.type(gameIdInput, 'FULL01');

      // Submit the form
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      await user.click(joinButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/game is full/i)).toBeInTheDocument();
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Join via Direct Link', () => {
    it('should auto-populate game ID from URL parameter', async () => {
      // Mock useParams to return a game ID
      const routerDom = await import('react-router-dom');
      const mockUseParamsLocal = (routerDom as any).__mockUseParams;
      mockUseParamsLocal.mockReturnValue({ gameId: 'url-game-789' });

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Game ID should be pre-filled
      const gameIdInput = screen.getByDisplayValue('url-game-789');
      expect(gameIdInput).toBeInTheDocument();
    });

    it('should handle join from direct link with pre-filled game ID', async () => {
      const user = userEvent.setup();

      // Mock useParams to return a game ID
      const routerDom = await import('react-router-dom');
      const mockUseParamsLocal = (routerDom as any).__mockUseParams;
      mockUseParamsLocal.mockReturnValue({ gameId: 'valid-game-123' });

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Only need to fill in name (game ID is pre-filled)
      const nameInput = screen.getByPlaceholderText(/enter your username/i);
      await user.type(nameInput, 'Direct Link User');

      // Submit the form
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      await user.click(joinButton);

      // Wait for navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/game/valid-game-123');
      });
    });
  });

  describe('Form Validation', () => {
    it('should require player name before submission', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Try to submit without name (game ID already pre-filled)
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      await user.click(joinButton);

      // Should not call socket or navigate
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'JoinGame',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should require game ID before submission', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Try to submit without game ID
      const nameInput = screen.getByPlaceholderText(/enter your username/i);
      const gameIdInput = screen.getByDisplayValue('valid-game-123');

      await user.type(nameInput, 'Test Player');
      await user.clear(gameIdInput);

      // Wait for button to be disabled after clearing game ID
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      await waitFor(() => {
        expect(joinButton).toBeDisabled();
      });

      // Clicking disabled button should not trigger form submission
      await user.click(joinButton);

      // Should not call socket or navigate because button is disabled
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'JoinGame',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Game Lobby After Join', () => {
    it('should render lobby after successful join', async () => {
      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>,
      );

      // Simulate joining a game in progress
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_valid-game-123_Updated', {
          id: 'valid-game-123',
          gameStarted: false,
          gameFull: true,
          gameFinished: false,
          players: {
            user1: { userId: 'user1', socketId: 'socket1', name: 'Host Player', piece: 'B', connected: true },
            user2: { userId: 'user2', socketId: 'socket2', name: 'Joined Player', piece: 'W', connected: true },
          },
          board: { boardState: '', score: { B: 2, W: 2 } },
          joinUrl: 'http://localhost:3000/join/valid-game-123',
        });
      });

      // Should show lobby with both players
      await waitFor(() => {
        expect(screen.getByText('Host Player')).toBeInTheDocument();
        expect(screen.getByText('Joined Player')).toBeInTheDocument();
      });

      // Should show ready to start since game is full
      await waitFor(() => {
        expect(screen.getByText(/start game/i)).toBeInTheDocument();
      });
    });

    it('should show waiting state for incomplete game', async () => {
      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>,
      );

      // Simulate joining a game with only one player
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_valid-game-123_Updated', {
          id: 'valid-game-123',
          gameStarted: false,
          gameFull: false,
          gameFinished: false,
          players: {
            user2: { userId: 'user2', socketId: 'socket2', name: 'Joined Player', piece: 'W', connected: true },
          },
          board: { boardState: '', score: { B: 2, W: 2 } },
          joinUrl: 'http://localhost:3000/join/valid-game-123',
        });
      });

      // Should show waiting message
      await waitFor(() => {
        expect(screen.getByText(/waiting/i)).toBeInTheDocument();
      });

      // Should show the player who joined
      await waitFor(() => {
        expect(screen.getByText('Joined Player')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Error Handling', () => {
    it('should handle socket connection issues', async () => {
      const user = userEvent.setup();

      // Mock socket to be null (disconnected)
      const { useSocket } = await import('../utils/socketHooks');
      useSocket.mockReturnValue({
        socket: null,
        localUserId: null,
      });

      render(
        <TestWrapper>
          <JoinGameMenu />
        </TestWrapper>,
      );

      // Fill in form
      const nameInput = screen.getByPlaceholderText(/enter your username/i);
      const gameIdInput = screen.getByDisplayValue('valid-game-123');

      await user.type(nameInput, 'Test Player');
      await user.clear(gameIdInput);
      await user.type(gameIdInput, 'some-game');

      // Try to submit
      const joinButton = screen.getByRole('button', { name: 'Join Game' });
      await user.click(joinButton);

      // Should handle gracefully (not crash)
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
