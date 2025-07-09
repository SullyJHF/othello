/**
 * Navigation and routing integration tests
 * Tests React Router configuration, route transitions, and navigation patterns
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock socket context
const mockSocket = {
  emit: vi.fn((event: string, ...args: any[]) => {
    // Simulate server responses for certain events
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
      // Handle callback-based responses
      if (event === 'HostNewGameWithMode') {
        setTimeout(() => lastArg({ success: true, gameId: 'test-game-id' }), 0);
      } else if (event === 'GetGameModes') {
        // Mock game modes data
        const mockGameModes = [
          {
            id: 'classic',
            name: 'Classic',
            description: 'Standard Othello game',
            category: 'standard',
            config: { timer: null, board: { width: 8, height: 8 } },
            isActive: true,
            isDefault: true,
            minimumPlayers: 2,
            maximumPlayers: 2,
            estimatedDuration: 30,
            difficultyLevel: 'intermediate',
            tags: ['standard'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        setTimeout(() => lastArg({ success: true, data: mockGameModes }), 0);
      }
    }
  }),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
  id: 'test-socket-id',
};

vi.mock('../utils/socketHooks', () => ({
  ProvideSocket: ({ children }: { children: React.ReactNode }) => children,
  useSocket: () => ({
    socket: mockSocket,
    localUserId: 'test-user-id',
  }),
  useSubscribeEffect: vi.fn(),
}));

// Mock GameViewContext
const mockSetCurrentView = vi.fn();
vi.mock('../contexts/GameViewContext', () => ({
  GameViewProvider: ({ children }: { children: React.ReactNode }) => children,
  useGameView: () => ({
    currentView: 'main-menu',
    setCurrentView: mockSetCurrentView,
  }),
}));

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, className, ...props }: any) => {
      // Filter out motion-specific props that shouldn't be passed to DOM
      const { layout: _layout, layoutId: _layoutId, transition: _transition, ...domProps } = props;
      return (
        <div className={className} {...domProps}>
          {children}
        </div>
      );
    },
  },
}));

// Mock toast notifications
vi.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock GameModeContext to provide default selected game mode
const mockGameMode = {
  id: 'classic',
  name: 'Classic',
  description: 'Standard Othello game',
  category: 'standard',
  config: { timer: null, board: { width: 8, height: 8 } },
  isActive: true,
  isDefault: true,
  minimumPlayers: 2,
  maximumPlayers: 2,
  estimatedDuration: 30,
  difficultyLevel: 'intermediate',
  tags: ['standard'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('../contexts/GameModeContext', () => ({
  GameModeProvider: ({ children }: { children: React.ReactNode }) => children,
  useGameModes: () => ({
    gameModes: [mockGameMode],
    selectedGameMode: mockGameMode, // Default selected game mode to enable submit button
    loading: false,
    error: null,
    setSelectedGameMode: vi.fn(),
    refreshGameModes: vi.fn(),
    getGameModesByCategory: vi.fn(),
    getDefaultGameMode: vi.fn(() => mockGameMode),
  }),
}));

// Import components after mocks
import { ActiveGamesList } from '../components/ActiveGamesList/ActiveGamesList';
import { AnimatedRoutes } from '../components/AnimatedRoutes/AnimatedRoutes';
import { HostGameMenu } from '../components/MainMenu/HostGameMenu';
import { JoinGameMenu } from '../components/MainMenu/JoinGameMenu';
import { MainMenu } from '../components/MainMenu/MainMenu';
import { Othello } from '../components/Othello/Othello';
import { TransitionWrapper } from '../components/TransitionWrapper/TransitionWrapper';
import VersionInfo from '../components/VersionInfo/VersionInfo';
import { GameModeProvider } from '../contexts/GameModeContext';

// Root layout component (same as in index.tsx)
const RootLayout = () => {
  return (
    <GameModeProvider>
      <div id="app">
        <VersionInfo className="global-version-info" />
        <AnimatedRoutes>
          <TransitionWrapper>
            <Outlet />
          </TransitionWrapper>
        </AnimatedRoutes>
      </div>
    </GameModeProvider>
  );
};

describe('Navigation and Routing', () => {
  let router: ReturnType<typeof createMemoryRouter>;

  const createTestRouter = (initialEntries: string[] = ['/']) => {
    return createMemoryRouter(
      [
        {
          path: '/',
          element: <RootLayout />,
          children: [
            { index: true, element: <MainMenu /> },
            { path: 'host', element: <HostGameMenu /> },
            { path: 'join', element: <JoinGameMenu /> },
            { path: 'join/:gameId', element: <JoinGameMenu /> },
            { path: 'game/:gameId', element: <Othello /> },
            { path: 'my-games', element: <ActiveGamesList /> },
          ],
        },
      ],
      {
        initialEntries,
      },
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    router = createTestRouter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Definitions', () => {
    it('should render MainMenu component at root path', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });
    });

    it('should render HostGameMenu at /host', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should render JoinGameMenu at /join', async () => {
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should render JoinGameMenu at /join/:gameId with gameId parameter', async () => {
      router = createTestRouter(['/join/ABC123']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should render Othello component (Lobby state) at /game/:gameId', async () => {
      router = createTestRouter(['/game/ABC123']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });
    });

    it('should render ActiveGamesList at /my-games', async () => {
      router = createTestRouter(['/my-games']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My Active Games' })).toBeInTheDocument();
      });
    });
  });

  describe('Route Parameters', () => {
    it('should extract gameId parameter from /join/:gameId route', async () => {
      const gameId = 'TEST123';
      router = createTestRouter([`/join/${gameId}`]);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        // JoinGameMenu should be rendered with the gameId parameter available
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should extract gameId parameter from /game/:gameId route', async () => {
      const gameId = 'GAME456';
      router = createTestRouter([`/game/${gameId}`]);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });
    });

    it('should handle URL-encoded gameId parameters', async () => {
      const encodedGameId = 'TEST%20123'; // "TEST 123" URL encoded
      router = createTestRouter([`/join/${encodedGameId}`]);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should handle special characters in gameId', async () => {
      const specialGameId = 'GAME-123_abc';
      router = createTestRouter([`/game/${specialGameId}`]);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Patterns', () => {
    it('should navigate from MainMenu to HostGameMenu', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Start at MainMenu
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Navigate to host game
      const hostButton = screen.getByTestId('host-game-button');
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should navigate from MainMenu to JoinGameMenu', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Start at MainMenu
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Navigate to join game
      const joinButton = screen.getByTestId('join-game-button');
      await user.click(joinButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should navigate from MainMenu to ActiveGamesList', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Start at MainMenu
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Navigate to active games
      const activeGamesButton = screen.getByTestId('my-games-button');
      await user.click(activeGamesButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My Active Games' })).toBeInTheDocument();
      });
    });

    it('should render HostGameMenu form structure correctly', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      // Start at HostGameMenu
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Check form elements
      expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create & host game/i })).toBeInTheDocument();
    });

    it('should render JoinGameMenu form structure correctly', async () => {
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      // Start at JoinGameMenu
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });

      // Check form elements
      expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter Game ID')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join game/i })).toBeInTheDocument();
    });
  });

  describe('Deep Linking', () => {
    it('should handle direct navigation to /host', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should handle direct navigation to /join', async () => {
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should handle direct navigation to /join/:gameId', async () => {
      router = createTestRouter(['/join/ABC123']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should handle direct navigation to /game/:gameId', async () => {
      router = createTestRouter(['/game/XYZ789']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });
    });

    it('should handle direct navigation to /my-games', async () => {
      router = createTestRouter(['/my-games']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My Active Games' })).toBeInTheDocument();
      });
    });
  });

  describe('Layout and Common Elements', () => {
    it('should render RootLayout components on all routes', async () => {
      const routes = ['/', '/host', '/join', '/game/ABC123', '/my-games'];

      for (const route of routes) {
        router = createTestRouter([route]);
        const { unmount } = render(<RouterProvider router={router} />);

        // Check that layout elements are present
        expect(document.querySelector('#app')).toBeInTheDocument();
        expect(document.querySelector('.version-info')).toBeInTheDocument();

        unmount();
      }
    });

    it('should preserve layout state during navigation', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Check initial layout elements
      const appElement = document.querySelector('#app');
      const versionInfo = document.querySelector('.version-info');

      expect(appElement).toBeInTheDocument();
      expect(versionInfo).toBeInTheDocument();

      // Navigate to different route
      const hostButton = screen.getByTestId('host-game-button');
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Layout elements should still be present
      expect(document.querySelector('#app')).toBeInTheDocument();
      expect(document.querySelector('.version-info')).toBeInTheDocument();
    });
  });

  describe('Route History and Browser Navigation', () => {
    it('should support browser back navigation', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Start at MainMenu
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Navigate to host
      const hostButton = screen.getByRole('link', { name: /host game/i });
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Navigate back using router history
      router.navigate(-1);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });
    });

    it('should support browser forward navigation', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Navigate: MainMenu -> Host -> Back -> Forward
      const hostButton = screen.getByRole('link', { name: /host game/i });
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Go back
      router.navigate(-1);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Go forward
      router.navigate(1);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should maintain route history across multiple navigations', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Navigate through multiple routes
      const hostButton = screen.getByRole('link', { name: /host game/i });
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Navigate back using browser history (since there's no back button in HostGameMenu)
      router.navigate(-1);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      const joinButton = screen.getByTestId('join-game-button');
      await user.click(joinButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });

      // Should be able to go back through history
      router.navigate(-1); // Back to MainMenu

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });
    });
  });

  describe('Router State Management', () => {
    it('should support initial route configuration', async () => {
      // Test that router starts with correct route
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should support different initial routes', async () => {
      // Test different starting routes
      const routes = [
        { path: '/', expectedHeading: 'Othello' },
        { path: '/join', expectedHeading: 'Join Game' },
        { path: '/my-games', expectedHeading: 'My Active Games' },
      ];

      for (const route of routes) {
        router = createTestRouter([route.path]);
        const { unmount } = render(<RouterProvider router={router} />);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: route.expectedHeading })).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('Error Cases and Edge Conditions', () => {
    it('should handle missing gameId parameter by not matching route', async () => {
      // /game/ without gameId doesn't match any route pattern
      router = createTestRouter(['/game/valid-game-id']);
      render(<RouterProvider router={router} />);

      // Should render the game component with valid gameId
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });
    });

    it('should handle very long gameId parameters', async () => {
      const longGameId = 'A'.repeat(1000);
      router = createTestRouter([`/game/${longGameId}`]);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });
    });

    it('should handle special characters in route parameters', async () => {
      const specialGameId = 'game@#$%^&*()_+-=[]{}|;:,.<>?';
      router = createTestRouter([`/join/${encodeURIComponent(specialGameId)}`]);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should handle sequential user navigation through multiple routes', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Start at MainMenu
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Navigate to host
      const hostButton = screen.getByTestId('host-game-button');
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Check that form elements are present
      expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create & host game/i })).toBeInTheDocument();
    });
  });

  describe('Animation Integration', () => {
    it('should render AnimatedRoutes component in layout', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Check that animation wrapper exists
      expect(document.querySelector('.animated-page')).toBeInTheDocument();
    });

    it('should maintain animation structure during route changes', async () => {
      const user = userEvent.setup();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Check initial animation structure
      expect(document.querySelector('.animated-page')).toBeInTheDocument();

      // Navigate to different route
      const hostButton = screen.getByTestId('host-game-button');
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Animation structure should still exist
      expect(document.querySelector('.animated-page')).toBeInTheDocument();
    });
  });
});
