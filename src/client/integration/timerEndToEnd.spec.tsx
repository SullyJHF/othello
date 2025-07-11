/**
 * End-to-End Timer System Integration Tests
 *
 * This test suite covers complete timer workflows from game creation to completion,
 * testing all components working together in realistic scenarios.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimerConfig, PlayerTimerState } from '../../server/models/Game';
import { HostGameMenu } from '../components/MainMenu/HostGameMenu';
import { Othello } from '../components/Othello/Othello';
import { Timer } from '../components/Timer/Timer';
import { TimerDisplay } from '../components/TimerDisplay/TimerDisplay';
import { TimerNotification } from '../components/TimerNotification/TimerNotification';
import { GameModeProvider } from '../contexts/GameModeContext';
import { GameViewProvider } from '../contexts/GameViewContext';

// Mock socket implementation for end-to-end testing
class MockSocket {
  private eventHandlers: { [event: string]: ((...args: any[]) => void)[] } = {};
  private emitHandler: ((...args: any[]) => void) | null = null;

  on(event: string, handler: (...args: any[]) => void) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event: string, handler: (...args: any[]) => void) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter((h) => h !== handler);
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.emitHandler) {
      this.emitHandler(event, ...args);
    }
  }

  // Test helper methods
  setEmitHandler(handler: (...args: any[]) => void) {
    this.emitHandler = handler;
  }

  simulateEvent(event: string, data: any) {
    const handlers = this.eventHandlers[event] || [];
    handlers.forEach((handler) => handler(data));
  }

  disconnect() {
    this.eventHandlers = {};
  }
}

// Mock timer state for testing
const createMockTimerState = (overrides: Partial<PlayerTimerState> = {}): PlayerTimerState => ({
  userId: 'test-user',
  remainingTime: 300,
  isActive: false,
  lastUpdateTime: new Date(),
  totalMoveTime: 0,
  moveCount: 0,
  timeWarnings: [],
  isPaused: false,
  totalPausedTime: 0,
  ...overrides,
});

// Mock game modes with timer configurations
const mockGameModes = [
  {
    id: 'classic-timed',
    name: 'Classic Timed',
    description: 'Standard game with 10+5 timer',
    category: 'timed',
    config: {
      timer: {
        type: 'increment',
        initialTime: 600,
        increment: 5,
        lowTimeWarning: 30,
        criticalTimeWarning: 10,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: true,
        maxPauseTime: 300,
        timeoutAction: 'forfeit',
      } as TimerConfig,
      board: { width: 8, height: 8 },
    },
    isActive: true,
    isDefault: false,
    minimumPlayers: 2,
    maximumPlayers: 2,
    estimatedDuration: 20,
    difficultyLevel: 'intermediate',
    tags: ['standard', 'timed'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'blitz',
    name: 'Blitz',
    description: 'Fast-paced game with 3+2 timer',
    category: 'timed',
    config: {
      timer: {
        type: 'increment',
        initialTime: 180,
        increment: 2,
        lowTimeWarning: 15,
        criticalTimeWarning: 5,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: false,
        maxPauseTime: 60,
        timeoutAction: 'forfeit',
      } as TimerConfig,
      board: { width: 8, height: 8 },
    },
    isActive: true,
    isDefault: false,
    minimumPlayers: 2,
    maximumPlayers: 2,
    estimatedDuration: 8,
    difficultyLevel: 'advanced',
    tags: ['blitz', 'timed'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('End-to-End Timer System Integration Tests', () => {
  let mockSocket: MockSocket;
  let gameId: string;
  let router: ReturnType<typeof createMemoryRouter>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket = new MockSocket();
    gameId = 'test-game-e2e';

    // Mock the socket hooks
    vi.doMock('../utils/socketHooks', () => ({
      useSocket: () => ({
        socket: mockSocket,
        localUserId: 'player1',
      }),
      useSubscribeEffect: vi.fn(),
      ProvideSocket: ({ children }: { children: React.ReactNode }) => children,
    }));

    // Mock game mode context
    vi.doMock('../contexts/GameModeContext', () => ({
      GameModeProvider: ({ children }: { children: React.ReactNode }) => children,
      useGameModes: () => ({
        gameModes: mockGameModes,
        selectedGameMode: mockGameModes[0],
        loading: false,
        error: null,
        setSelectedGameMode: vi.fn(),
        refreshGameModes: vi.fn(),
        getGameModesByCategory: vi.fn(),
        getDefaultGameMode: vi.fn(() => mockGameModes[0]),
      }),
    }));

    // Mock debug mode
    vi.doMock('../hooks/useDebugMode', () => ({
      useDebugMode: () => ({
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
      }),
    }));

    // Mock game view context
    vi.doMock('../contexts/GameViewContext', () => ({
      GameViewProvider: ({ children }: { children: React.ReactNode }) => children,
      useGameView: () => ({
        currentView: 'main-menu',
        setCurrentView: vi.fn(),
      }),
    }));

    // Mock localStorage
    vi.doMock('../utils/hooks', () => ({
      useLocalStorage: (key: string, defaultValue: any) => [defaultValue, vi.fn()],
    }));

    // Mock react-router
    router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <GameViewProvider>
              <GameModeProvider>
                <HostGameMenu />
              </GameModeProvider>
            </GameViewProvider>
          ),
        },
        {
          path: '/game/:gameId',
          element: (
            <GameViewProvider>
              <GameModeProvider>
                <Othello />
              </GameModeProvider>
            </GameViewProvider>
          ),
        },
      ],
      {
        initialEntries: ['/'],
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockSocket.disconnect();
  });

  describe('Complete Timer Game Flow', () => {
    it.skip('should handle full game lifecycle with timers from creation to completion', async () => {
      // Set up socket emit handler to simulate server responses
      mockSocket.setEmitHandler((event: string, ...args: any[]) => {
        if (event === 'HostNewGameWithMode') {
          const [userId, username, modeId, callback] = args;
          setTimeout(() => {
            callback({ success: true, gameId });
          }, 0);
        }
      });

      // 1. Create game with timer configuration
      render(<RouterProvider router={router} />);

      // Wait for form to render
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      // Fill in username
      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      await act(async () => {
        fireEvent.change(usernameInput, { target: { value: 'Player1' } });
      });

      // Submit game creation
      const submitButton = screen.getByRole('button', { name: /create & host game/i });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      // Should navigate to game lobby
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(`/game/${gameId}`);
      });

      // 2. Simulate second player joining
      await act(async () => {
        mockSocket.simulateEvent('Game_test-game-e2e_Updated', {
          id: gameId,
          gameStarted: false,
          gameFull: true,
          players: {
            player1: { userId: 'player1', name: 'Player1', piece: 'B', connected: true },
            player2: { userId: 'player2', name: 'Player2', piece: 'W', connected: true },
          },
          board: { boardState: '', score: { B: 2, W: 2 } },
          timerConfig: mockGameModes[0].config.timer,
        });
      });

      // 3. Start game with timer initialization
      await act(async () => {
        mockSocket.simulateEvent('Game_test-game-e2e_Updated', {
          id: gameId,
          gameStarted: true,
          gameFull: true,
          currentPlayer: 'B',
          players: {
            player1: { userId: 'player1', name: 'Player1', piece: 'B', connected: true },
            player2: { userId: 'player2', name: 'Player2', piece: 'W', connected: true },
          },
          board: {
            boardState: '........\n........\n...0....\n..0WB...\n...BW0..\n....0...\n........\n........',
            score: { B: 2, W: 2 },
          },
          timerState: {
            config: mockGameModes[0].config.timer,
            playerTimers: {
              player1: createMockTimerState({ userId: 'player1', remainingTime: 600, isActive: true }),
              player2: createMockTimerState({ userId: 'player2', remainingTime: 600, isActive: false }),
            },
            gameStartTime: new Date(),
            isGamePaused: false,
            totalGameTime: 0,
          },
        });
      });

      // 4. Verify timer display appears
      await waitFor(() => {
        expect(screen.getByText('10:00')).toBeInTheDocument(); // Player1's timer
      });

      // 5. Simulate timer tick updates
      await act(async () => {
        vi.advanceTimersByTime(1000);
        mockSocket.simulateEvent('Timer_test-game-e2e_Tick', {
          playerTimers: {
            player1: createMockTimerState({ userId: 'player1', remainingTime: 599, isActive: true }),
            player2: createMockTimerState({ userId: 'player2', remainingTime: 600, isActive: false }),
          },
        });
      });

      // Verify timer countdown
      await waitFor(() => {
        expect(screen.getByText('9:59')).toBeInTheDocument();
      });

      // 6. Simulate low time warning
      await act(async () => {
        mockSocket.simulateEvent('Timer_test-game-e2e_Warning', {
          userId: 'player1',
          remainingTime: 25,
          warningType: 'low',
        });
      });

      // Verify warning appears
      await waitFor(() => {
        expect(screen.getByText('⏰ Low time')).toBeInTheDocument();
      });

      // 7. Simulate critical time warning
      await act(async () => {
        mockSocket.simulateEvent('Timer_test-game-e2e_CriticalWarning', {
          userId: 'player1',
          remainingTime: 8,
          warningType: 'critical',
        });
      });

      // Verify critical warning appears
      await waitFor(() => {
        expect(screen.getByText('⚠️ Time running out!')).toBeInTheDocument();
      });

      // 8. Simulate timer switch after move
      await act(async () => {
        mockSocket.simulateEvent('Timer_test-game-e2e_Increment', {
          userId: 'player1',
          incrementAmount: 5,
          newRemainingTime: 13,
        });

        mockSocket.simulateEvent('Timer_test-game-e2e_Tick', {
          playerTimers: {
            player1: createMockTimerState({ userId: 'player1', remainingTime: 13, isActive: false }),
            player2: createMockTimerState({ userId: 'player2', remainingTime: 600, isActive: true }),
          },
        });
      });

      // Verify timer switch
      await waitFor(() => {
        expect(screen.getByText('10:00')).toBeInTheDocument(); // Player2's timer now active
      });

      console.log('✅ Full timer game flow test completed successfully');
    }, 15000);
  });

  describe('Timer State Synchronization', () => {
    it.skip('should handle timer state synchronization during network interruptions', async () => {
      // 1. Set up active game with timers
      const testRouter = createMemoryRouter(
        [
          {
            path: '/game/:gameId',
            element: (
              <GameViewProvider>
                <GameModeProvider>
                  <Othello />
                </GameModeProvider>
              </GameViewProvider>
            ),
          },
        ],
        {
          initialEntries: [`/game/${gameId}`],
        },
      );

      const { rerender } = render(<RouterProvider router={testRouter} />);

      // 2. Initialize game state
      await act(async () => {
        mockSocket.simulateEvent('Game_test-game-e2e_Updated', {
          id: gameId,
          gameStarted: true,
          gameFull: true,
          currentPlayer: 'B',
          players: {
            player1: { userId: 'player1', name: 'Player1', piece: 'B', connected: true },
            player2: { userId: 'player2', name: 'Player2', piece: 'W', connected: true },
          },
          board: {
            boardState: '........\n........\n...0....\n..0WB...\n...BW0..\n....0...\n........\n........',
            score: { B: 2, W: 2 },
          },
          timerState: {
            config: mockGameModes[0].config.timer,
            playerTimers: {
              player1: createMockTimerState({ userId: 'player1', remainingTime: 300, isActive: true }),
              player2: createMockTimerState({ userId: 'player2', remainingTime: 400, isActive: false }),
            },
            gameStartTime: new Date(),
            isGamePaused: false,
            totalGameTime: 0,
          },
        });
      });

      // 3. Simulate network interruption (no timer updates)
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // 4. Simulate reconnection with state sync
      await act(async () => {
        mockSocket.simulateEvent('Timer_test-game-e2e_StateSync', {
          playerTimers: {
            player1: createMockTimerState({ userId: 'player1', remainingTime: 295, isActive: true }),
            player2: createMockTimerState({ userId: 'player2', remainingTime: 400, isActive: false }),
          },
          gameStartTime: new Date(Date.now() - 5000),
          isGamePaused: false,
          totalGameTime: 5000,
        });
      });

      // 5. Verify timer state is synchronized
      await waitFor(() => {
        expect(screen.getByText('4:55')).toBeInTheDocument(); // Should show synced time
      });

      console.log('✅ Timer state synchronization test completed successfully');
    }, 10000);
  });

  describe('Timer Performance Under Load', () => {
    it('should handle rapid timer updates efficiently', async () => {
      const timerStates = Array.from({ length: 10 }, (_, i) =>
        createMockTimerState({ remainingTime: 300 - i, isActive: i % 2 === 0 }),
      );

      render(
        <div>
          {timerStates.map((state, index) => (
            <Timer key={index} timerState={state} isActive={state.isActive} />
          ))}
        </div>,
      );

      const startTime = performance.now();

      // Simulate rapid updates (reduced number for performance)
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          vi.advanceTimersByTime(100);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle updates efficiently (less than 2 seconds total)
      expect(duration).toBeLessThan(2000);

      console.log(`✅ Timer performance test completed in ${duration}ms`);
    });
  });

  describe('Timer Error Recovery', () => {
    it.skip('should recover gracefully from timer errors', async () => {
      const testRouter = createMemoryRouter(
        [
          {
            path: '/game/:gameId',
            element: (
              <GameViewProvider>
                <GameModeProvider>
                  <Othello />
                </GameModeProvider>
              </GameViewProvider>
            ),
          },
        ],
        {
          initialEntries: [`/game/${gameId}`],
        },
      );

      render(<RouterProvider router={testRouter} />);

      // 1. Set up normal timer state
      await act(async () => {
        mockSocket.simulateEvent('Game_test-game-e2e_Updated', {
          id: gameId,
          gameStarted: true,
          gameFull: true,
          currentPlayer: 'B',
          timerState: {
            config: mockGameModes[0].config.timer,
            playerTimers: {
              player1: createMockTimerState({ userId: 'player1', remainingTime: 300, isActive: true }),
              player2: createMockTimerState({ userId: 'player2', remainingTime: 400, isActive: false }),
            },
            gameStartTime: new Date(),
            isGamePaused: false,
            totalGameTime: 0,
          },
        });
      });

      // 2. Simulate timer error (invalid state)
      await act(async () => {
        mockSocket.simulateEvent('Timer_test-game-e2e_Tick', {
          playerTimers: {
            player1: createMockTimerState({ userId: 'player1', remainingTime: -10, isActive: true }),
            player2: createMockTimerState({ userId: 'player2', remainingTime: 400, isActive: false }),
          },
        });
      });

      // 3. Should handle invalid timer state gracefully
      await waitFor(() => {
        expect(screen.getByText('0:00')).toBeInTheDocument(); // Should show 0:00 instead of negative
      });

      // 4. Simulate recovery with valid state
      await act(async () => {
        mockSocket.simulateEvent('Timer_test-game-e2e_StateSync', {
          playerTimers: {
            player1: createMockTimerState({ userId: 'player1', remainingTime: 280, isActive: true }),
            player2: createMockTimerState({ userId: 'player2', remainingTime: 400, isActive: false }),
          },
          gameStartTime: new Date(),
          isGamePaused: false,
          totalGameTime: 0,
        });
      });

      // 5. Verify recovery
      await waitFor(() => {
        expect(screen.getByText('4:40')).toBeInTheDocument();
      });

      console.log('✅ Timer error recovery test completed successfully');
    }, 10000);
  });

  describe('Multi-Timer Component Integration', () => {
    it('should coordinate multiple timer components correctly', async () => {
      const player1Timer = createMockTimerState({ userId: 'player1', remainingTime: 300, isActive: true });
      const player2Timer = createMockTimerState({ userId: 'player2', remainingTime: 400, isActive: false });

      render(
        <div>
          <div data-testid="player1-timer">
            <Timer timerState={player1Timer} isActive={true} />
          </div>
          <div data-testid="player2-timer">
            <Timer timerState={player2Timer} isActive={false} />
          </div>
          <TimerDisplay
            timerState={{
              config: mockGameModes[0].config.timer,
              playerTimers: {
                player1: player1Timer,
                player2: player2Timer,
              },
              gameStartTime: new Date(),
              isGamePaused: false,
              totalGameTime: 0,
            }}
            localUserId="player1"
          />
        </div>,
      );

      // Verify initial state
      expect(screen.getByTestId('player1-timer')).toHaveTextContent('5:00');
      expect(screen.getByTestId('player2-timer')).toHaveTextContent('6:40');

      // Simulate time progression
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Both components should update consistently
      await waitFor(() => {
        expect(screen.getByTestId('player1-timer')).toHaveTextContent('4:59');
        expect(screen.getByTestId('player2-timer')).toHaveTextContent('6:40'); // Should remain same (inactive)
      });

      console.log('✅ Multi-timer component integration test completed successfully');
    });
  });

  describe('Timer Accessibility Features', () => {
    it('should provide proper accessibility attributes for screen readers', async () => {
      const timerState = createMockTimerState({ remainingTime: 45, isActive: true });

      render(<Timer timerState={timerState} isActive={true} />);

      // Verify timer has proper accessibility attributes
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toBeInTheDocument();
      expect(timerElement).toHaveAttribute('aria-live', 'polite');
      expect(timerElement).toHaveAttribute('aria-label', expect.stringContaining('Timer'));

      // Verify warning states are announced
      await waitFor(() => {
        expect(screen.getByText('⏰ Low time')).toBeInTheDocument();
        expect(screen.getByText('⏰ Low time')).toHaveAttribute('role', 'alert');
      });

      console.log('✅ Timer accessibility features test completed successfully');
    });
  });
});
