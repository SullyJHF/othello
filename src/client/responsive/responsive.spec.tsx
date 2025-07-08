/**
 * Responsive design validation tests
 * Tests component behavior across different viewport sizes and touch interactions
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock socket context
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
  id: 'test-socket-id',
};

vi.mock('../utils/socketHooks', () => ({
  ProvideSocket: ({ children }: { children: React.ReactNode }) => children,
  useSocket: () => mockSocket,
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

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, className, ...props }: any) => {
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

// Import components after mocks
import { ActiveGamesList } from '../components/ActiveGamesList/ActiveGamesList';
import { AnimatedRoutes } from '../components/AnimatedRoutes/AnimatedRoutes';
import { HostGameMenu } from '../components/MainMenu/HostGameMenu';
import { JoinGameMenu } from '../components/MainMenu/JoinGameMenu';
import { MainMenu } from '../components/MainMenu/MainMenu';
import { Othello } from '../components/Othello/Othello';
import { TransitionWrapper } from '../components/TransitionWrapper/TransitionWrapper';
import VersionInfo from '../components/VersionInfo/VersionInfo';

// Root layout component
const RootLayout = () => {
  return (
    <div id="app">
      <VersionInfo className="global-version-info" />
      <AnimatedRoutes>
        <TransitionWrapper>
          <Outlet />
        </TransitionWrapper>
      </AnimatedRoutes>
    </div>
  );
};

// Utility functions for testing different viewport sizes
const setViewportSize = (width: number, height: number) => {
  // Mock window dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Mock CSS media query matching
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchesMediaQuery(query, width),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Dispatch resize event
  window.dispatchEvent(new Event('resize'));
};

const matchesMediaQuery = (query: string, width: number): boolean => {
  if (query.includes('max-width: 767px')) return width <= 767;
  if (query.includes('max-width: 480px')) return width <= 480;
  if (query.includes('min-width: 768px')) return width >= 768;
  if (query.includes('min-width: 1024px')) return width >= 1024;
  if (query.includes('min-width: 1440px')) return width >= 1440;
  return false;
};

// Viewport presets
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  mobileSmall: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  largeDesktop: { width: 1440, height: 900 },
};

describe('Responsive Design Validation', () => {
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
    // Default to desktop viewport
    setViewportSize(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    router = createTestRouter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Viewport Size Responsiveness', () => {
    it('should render MainMenu correctly on mobile viewport', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Main menu should be present
      expect(screen.getByTestId('main-menu')).toBeInTheDocument();
      expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      expect(screen.getByTestId('join-game-button')).toBeInTheDocument();
      expect(screen.getByTestId('my-games-button')).toBeInTheDocument();
    });

    it('should render MainMenu correctly on tablet viewport', async () => {
      setViewportSize(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Should still render all elements correctly
      expect(screen.getByTestId('main-menu')).toBeInTheDocument();
      expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      expect(screen.getByTestId('join-game-button')).toBeInTheDocument();
    });

    it('should render MainMenu correctly on desktop viewport', async () => {
      setViewportSize(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Should render all desktop elements
      expect(screen.getByTestId('main-menu')).toBeInTheDocument();
      expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      expect(screen.getByTestId('join-game-button')).toBeInTheDocument();
    });

    it('should render MainMenu correctly on large desktop viewport', async () => {
      setViewportSize(VIEWPORTS.largeDesktop.width, VIEWPORTS.largeDesktop.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      expect(screen.getByTestId('main-menu')).toBeInTheDocument();
    });

    it('should handle very small mobile viewport', async () => {
      setViewportSize(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Should not break on very small screens
      expect(screen.getByTestId('main-menu')).toBeInTheDocument();
      expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
    });
  });

  describe('Touch Target Accessibility', () => {
    it('should have adequately sized touch targets on mobile', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      const hostButton = screen.getByTestId('host-game-button');
      const joinButton = screen.getByTestId('join-game-button');
      const myGamesButton = screen.getByTestId('my-games-button');

      // Buttons should be present and clickable
      expect(hostButton).toBeInTheDocument();
      expect(joinButton).toBeInTheDocument();
      expect(myGamesButton).toBeInTheDocument();

      // Test that buttons are actually interactive
      const user = userEvent.setup();
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should maintain touch targets across different mobile sizes', async () => {
      const mobileSizes = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11
        { width: 393, height: 852 }, // iPhone 14
      ];

      for (const size of mobileSizes) {
        setViewportSize(size.width, size.height);
        const { unmount } = render(<RouterProvider router={createTestRouter(['/'])} />);

        await waitFor(() => {
          expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
        });

        // Verify buttons are rendered and accessible
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
        expect(screen.getByTestId('join-game-button')).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe('Form Responsiveness', () => {
    it('should render HostGameMenu form responsively on mobile', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Form elements should be present and properly sized
      const usernameInput = screen.getByPlaceholderText('Enter your username');
      const submitButton = screen.getByRole('button', { name: /create & host game/i });

      expect(usernameInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();

      // Test form interaction on mobile
      const user = userEvent.setup();
      await user.type(usernameInput, 'TestUser');

      expect(usernameInput).toHaveValue('TestUser');
    });

    it('should render JoinGameMenu form responsively on mobile', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });

      // Form elements should be present
      const usernameInput = screen.getByPlaceholderText('Enter your username');
      const gameIdInput = screen.getByPlaceholderText('Enter Game ID');
      const submitButton = screen.getByRole('button', { name: /join game/i });

      expect(usernameInput).toBeInTheDocument();
      expect(gameIdInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('should handle form input on different screen sizes', async () => {
      const sizes = [VIEWPORTS.mobile, VIEWPORTS.tablet, VIEWPORTS.desktop];

      for (const viewport of sizes) {
        setViewportSize(viewport.width, viewport.height);
        const { unmount } = render(<RouterProvider router={createTestRouter(['/host'])} />);

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
        });

        const user = userEvent.setup();
        const usernameInput = screen.getByPlaceholderText('Enter your username');

        await user.type(usernameInput, 'Test');
        expect(usernameInput).toHaveValue('Test');

        unmount();
      }
    });
  });

  describe('Game Board Responsiveness', () => {
    it('should render game lobby responsively on mobile', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
      router = createTestRouter(['/game/ABC123']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });

      // Lobby should render correctly on mobile
      expect(screen.getByText('Share this link to invite a friend:')).toBeInTheDocument();
      expect(screen.getByText('Players:')).toBeInTheDocument();
    });

    it('should handle game lobby across different viewport sizes', async () => {
      const viewports = [VIEWPORTS.mobile, VIEWPORTS.tablet, VIEWPORTS.desktop];

      for (const viewport of viewports) {
        setViewportSize(viewport.width, viewport.height);
        const { unmount } = render(<RouterProvider router={createTestRouter(['/game/TEST123'])} />);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
        });

        // Core lobby elements should be present
        expect(screen.getByText('Share this link to invite a friend:')).toBeInTheDocument();
        expect(screen.getByText('Players:')).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe('Navigation Responsiveness', () => {
    it('should maintain navigation functionality on mobile', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      // Test navigation to host game
      const hostButton = screen.getByTestId('host-game-button');
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should maintain navigation functionality on tablet', async () => {
      setViewportSize(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      // Test navigation to join game
      const joinButton = screen.getByTestId('join-game-button');
      await user.click(joinButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });
    });

    it('should handle navigation between all routes on mobile', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      // Navigate to My Games
      const myGamesButton = screen.getByTestId('my-games-button');
      await user.click(myGamesButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My Active Games' })).toBeInTheDocument();
      });
    });
  });

  describe('Layout Consistency Across Viewports', () => {
    it('should maintain app structure across all viewport sizes', async () => {
      const viewports = [
        VIEWPORTS.mobileSmall,
        VIEWPORTS.mobile,
        VIEWPORTS.tablet,
        VIEWPORTS.desktop,
        VIEWPORTS.largeDesktop,
      ];

      for (const viewport of viewports) {
        setViewportSize(viewport.width, viewport.height);
        const { unmount } = render(<RouterProvider router={createTestRouter(['/'])} />);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
        });

        // Core app structure should be consistent
        const appContainer = screen.getByTestId('main-menu').closest('#app');
        expect(appContainer).toBeInTheDocument();

        // Version info should be present
        const versionInfo = appContainer?.querySelector('.version-info');
        expect(versionInfo).toBeInTheDocument();

        unmount();
      }
    });

    it('should handle viewport changes dynamically', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Start with desktop
      setViewportSize(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Switch to mobile
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);

      // Should still work
      expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      expect(screen.getByTestId('host-game-button')).toBeInTheDocument();

      // Switch to tablet
      setViewportSize(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height);

      // Should continue to work
      expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      expect(screen.getByTestId('join-game-button')).toBeInTheDocument();
    });
  });

  describe('Content Overflow and Scrolling', () => {
    it('should handle content overflow gracefully on small screens', async () => {
      setViewportSize(280, 500); // Very narrow screen
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Content should not be cut off
      expect(screen.getByTestId('main-menu')).toBeInTheDocument();
      expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
    });

    it('should maintain usability on extremely wide screens', async () => {
      setViewportSize(2560, 1440); // 4K monitor
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      // Should still be functional
      expect(screen.getByTestId('main-menu')).toBeInTheDocument();
      expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
    });

    it('should handle tall narrow screens', async () => {
      setViewportSize(375, 1200); // Tall mobile
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      expect(screen.getByTestId('main-menu')).toBeInTheDocument();
    });
  });

  describe('Interactive Element Responsiveness', () => {
    it('should handle button interactions on touch devices', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Touch interaction should work
      const hostButton = screen.getByTestId('host-game-button');
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should maintain form functionality across viewport sizes', async () => {
      const viewports = [VIEWPORTS.mobile, VIEWPORTS.tablet, VIEWPORTS.desktop];

      for (const viewport of viewports) {
        setViewportSize(viewport.width, viewport.height);
        const { unmount } = render(<RouterProvider router={createTestRouter(['/join/ABC123'])} />);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
        });

        const user = userEvent.setup();
        const usernameInput = screen.getByPlaceholderText('Enter your username');

        // Should be able to type in input
        await user.type(usernameInput, 'TestUser');
        expect(usernameInput).toHaveValue('TestUser');

        // Submit button should be present
        expect(screen.getByRole('button', { name: /join game/i })).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe('Performance on Different Viewports', () => {
    it('should render quickly on mobile viewport', async () => {
      setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);

      const startTime = performance.now();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
    });

    it('should render quickly on desktop viewport', async () => {
      setViewportSize(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);

      const startTime = performance.now();
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
    });
  });
});
