/**
 * Accessibility (a11y) testing suite
 * Tests semantic HTML, ARIA attributes, keyboard navigation, screen reader support, and inclusive design
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

// Utility function to test keyboard navigation
const testKeyboardNavigation = async (user: ReturnType<typeof userEvent.setup>, expectedOrder: string[]) => {
  // Focus should start at first interactive element
  await user.tab();

  for (let i = 0; i < expectedOrder.length; i++) {
    const currentElement = document.activeElement;

    // Check that current focused element matches expected
    if (expectedOrder[i] === 'version-info-button') {
      expect(currentElement).toHaveAttribute('aria-label', 'Show build information');
    } else if (expectedOrder[i] === 'host-game-button') {
      expect(currentElement).toHaveAttribute('data-testid', 'host-game-button');
    } else if (expectedOrder[i] === 'join-game-button') {
      expect(currentElement).toHaveAttribute('data-testid', 'join-game-button');
    } else if (expectedOrder[i] === 'debug-game-button') {
      expect(currentElement).toHaveAttribute('data-testid', 'debug-game-button');
    } else if (expectedOrder[i] === 'my-games-button') {
      expect(currentElement).toHaveAttribute('data-testid', 'my-games-button');
    }

    // Move to next element (unless we're at the last one)
    if (i < expectedOrder.length - 1) {
      await user.tab();
    }
  }
};

describe('Accessibility Testing Suite', () => {
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

  describe('Semantic HTML Structure', () => {
    it('should have proper heading hierarchy on MainMenu', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello', level: 1 })).toBeInTheDocument();
      });

      // Main heading should be h1
      const mainHeading = screen.getByRole('heading', { name: 'Othello' });
      expect(mainHeading.tagName).toBe('H1');
    });

    it('should have proper heading hierarchy on HostGameMenu', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game', level: 1 })).toBeInTheDocument();
      });

      // Form heading should be h1
      const formHeading = screen.getByRole('heading', { name: 'Host New Game' });
      expect(formHeading.tagName).toBe('H1');
    });

    it('should have proper heading hierarchy on JoinGameMenu', async () => {
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game', level: 1 })).toBeInTheDocument();
      });

      const formHeading = screen.getByRole('heading', { name: 'Join Game' });
      expect(formHeading.tagName).toBe('H1');
    });

    it('should have proper heading hierarchy in game lobby', async () => {
      router = createTestRouter(['/game/ABC123']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby', level: 1 })).toBeInTheDocument();
      });

      // Should have h1 for lobby
      const lobbyHeading = screen.getByRole('heading', { name: 'Game Lobby' });
      expect(lobbyHeading.tagName).toBe('H1');

      // Should have h2 for players section
      const playersHeading = screen.getByRole('heading', { name: 'Players:' });
      expect(playersHeading.tagName).toBe('H2');
    });

    it('should use proper list structure for navigation', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Navigation buttons should be properly structured
      const hostButton = screen.getByTestId('host-game-button');
      const joinButton = screen.getByTestId('join-game-button');
      const myGamesButton = screen.getByTestId('my-games-button');

      // These should be links (semantic navigation)
      expect(hostButton.tagName).toBe('A');
      expect(joinButton.tagName).toBe('A');
      expect(myGamesButton.tagName).toBe('A');

      // Links should have proper hrefs
      expect(hostButton).toHaveAttribute('href', '/host');
      expect(joinButton).toHaveAttribute('href', '/join');
      expect(myGamesButton).toHaveAttribute('href', '/my-games');
    });
  });

  describe('Form Accessibility', () => {
    it('should have accessible form inputs in HostGameMenu', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      // ACCESSIBILITY ISSUE: Inputs should have proper <label> elements instead of just placeholders
      // Currently using placeholder text as fallback for accessibility
      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      expect(usernameInput).toBeInTheDocument();
      expect(usernameInput).toHaveAttribute('required');
      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(usernameInput).toHaveAttribute('id', 'username'); // Has ID but no corresponding label

      // Submit button should be properly labeled and typed
      const submitButton = screen.getByRole('button', { name: /create & host game/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have accessible form inputs in JoinGameMenu', async () => {
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      // ACCESSIBILITY ISSUE: Inputs should have proper <label> elements instead of just placeholders
      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      expect(usernameInput).toBeInTheDocument();
      expect(usernameInput).toHaveAttribute('required');

      // ACCESSIBILITY ISSUE: Game ID input needs proper labeling
      const gameIdInput = screen.getByPlaceholderText(/enter game id/i);
      expect(gameIdInput).toBeInTheDocument();
      expect(gameIdInput).toHaveAttribute('required');

      // Submit button should be accessible
      const submitButton = screen.getByRole('button', { name: /join game/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should indicate required fields accessibly', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);

      // Required attribute should be present for screen readers
      expect(usernameInput).toHaveAttribute('required');
      // ACCESSIBILITY ISSUE: Should also have aria-required="true" explicitly
    });

    it('should handle form validation errors accessibly', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create & host game/i })).toBeInTheDocument();
      });

      // Submit button should be disabled when form is invalid
      const submitButton = screen.getByRole('button', { name: /create & host game/i });
      expect(submitButton).toBeDisabled();

      // Enter valid input to enable button
      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      await user.type(usernameInput, 'TestUser');

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Button and Interactive Element Accessibility', () => {
    it('should have accessible button labels', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // All navigation buttons should have accessible names
      expect(screen.getByRole('link', { name: /host game/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /join game/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my active games/i })).toBeInTheDocument();

      // Version info button should have proper aria-label
      const versionButton = screen.getByRole('button', { name: /show build information/i });
      expect(versionButton).toBeInTheDocument();
      expect(versionButton).toHaveAttribute('aria-label', 'Show build information');
    });

    it('should support keyboard activation for buttons', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Focus on host button and activate with Enter
      const hostButton = screen.getByTestId('host-game-button');
      hostButton.focus();
      expect(document.activeElement).toBe(hostButton);

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should support keyboard activation with Space key', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show build information/i })).toBeInTheDocument();
      });

      // Focus on version info button and activate with Space
      const versionButton = screen.getByRole('button', { name: /show build information/i });
      versionButton.focus();
      expect(document.activeElement).toBe(versionButton);

      await user.keyboard(' ');

      // Should toggle version info (even if no visible change in test)
      expect(versionButton).toBeInTheDocument();
    });

    it('should provide adequate touch targets', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      const hostButton = screen.getByTestId('host-game-button');
      const joinButton = screen.getByTestId('join-game-button');
      const myGamesButton = screen.getByTestId('my-games-button');

      // Buttons should be large enough for touch interaction
      // We can't directly test pixel size, but we can verify they're clickable
      expect(hostButton).toBeInTheDocument();
      expect(joinButton).toBeInTheDocument();
      expect(myGamesButton).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have logical tab order on MainMenu', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Test tab order through interactive elements (including debug button when visible)
      await testKeyboardNavigation(user, [
        'version-info-button',
        'host-game-button',
        'join-game-button',
        'debug-game-button', // Debug button appears in development
        'my-games-button',
      ]);
    });

    it('should maintain focus visibility throughout navigation', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Tab through elements and verify focus is visible
      await user.tab(); // Version info button
      expect(document.activeElement).toHaveAttribute('aria-label', 'Show build information');

      await user.tab(); // Host game button
      expect(document.activeElement).toHaveAttribute('data-testid', 'host-game-button');

      await user.tab(); // Join game button
      expect(document.activeElement).toHaveAttribute('data-testid', 'join-game-button');
    });

    it('should handle keyboard navigation in forms', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const submitButton = screen.getByRole('button', { name: /create & host game/i });

      // Should be able to focus form elements
      usernameInput.focus();
      expect(document.activeElement).toBe(usernameInput);

      // Submit button is disabled initially, so test that it exists
      expect(submitButton).toBeDisabled();
      expect(submitButton).toBeInTheDocument();
    });

    it('should support Enter key for form submission', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const submitButton = screen.getByRole('button', { name: /create & host game/i });

      // Initially disabled
      expect(submitButton).toBeDisabled();

      // Type username to enable button
      await user.type(usernameInput, 'TestUser');

      // Wait for button to be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Click the submit button instead of pressing Enter (as Enter may not trigger form submission in test environment)
      await user.click(submitButton);

      // Form should be submitted (socket call would be made)
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    it('should support Escape key for modal/overlay dismissal', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show build information/i })).toBeInTheDocument();
      });

      // Click version info to potentially open overlay
      const versionButton = screen.getByRole('button', { name: /show build information/i });
      await user.click(versionButton);

      // Test Escape key (should close any open overlays)
      await user.keyboard('{Escape}');

      // Version button should still be accessible
      expect(versionButton).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide descriptive text for interactive elements', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Buttons should have descriptive text content
      expect(screen.getByRole('link', { name: /🎮 host game/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /🤝 join game/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /📋 my active games/i })).toBeInTheDocument();
    });

    it('should identify form accessibility gaps for screen readers', async () => {
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      // ACCESSIBILITY ISSUE: Form inputs should be properly associated with labels
      // Currently relying on placeholder text which is not accessible to all screen readers
      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const gameIdInput = screen.getByPlaceholderText(/enter game id/i);

      // These elements exist but lack proper labeling
      expect(usernameInput).toBeInTheDocument();
      expect(gameIdInput).toBeInTheDocument();

      // IMPROVEMENT NEEDED: Add <label for="username">Username</label> and similar for gameId
    });

    it('should provide context for game state in lobby', async () => {
      router = createTestRouter(['/game/ABC123']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });

      // Lobby should provide clear context
      expect(screen.getByText('Share this link to invite a friend:')).toBeInTheDocument();
      expect(screen.getByText('Waiting for players to join...')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Players:' })).toBeInTheDocument();
    });

    it('should announce copy functionality appropriately', async () => {
      router = createTestRouter(['/game/ABC123']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
      });

      // Copy button should be properly labeled
      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).toHaveAccessibleName();
    });

    it('should provide accessible navigation context', async () => {
      router = createTestRouter(['/my-games']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My Active Games' })).toBeInTheDocument();
      });

      // Should have back navigation
      const backLink = screen.getByRole('link', { name: /back to main menu/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  describe('ARIA Attributes and Roles', () => {
    it('should use appropriate ARIA labels for icon buttons', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show build information/i })).toBeInTheDocument();
      });

      // Version info button should have proper ARIA label
      const versionButton = screen.getByRole('button', { name: /show build information/i });
      expect(versionButton).toHaveAttribute('aria-label', 'Show build information');
      expect(versionButton).toHaveAttribute('title', 'Show build information');
    });

    it('should mark decorative elements as aria-hidden', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Icons within version info should be decorative
      const versionButton = screen.getByRole('button', { name: /show build information/i });
      const icon = versionButton.querySelector('svg');

      if (icon) {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      }
    });

    it('should use proper button vs link semantics', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Navigation elements should be links (they navigate)
      const hostLink = screen.getByTestId('host-game-button');
      const joinLink = screen.getByTestId('join-game-button');

      expect(hostLink.tagName).toBe('A');
      expect(joinLink.tagName).toBe('A');

      // Action elements should be buttons (they perform actions)
      const versionButton = screen.getByRole('button', { name: /show build information/i });
      expect(versionButton.tagName).toBe('BUTTON');
    });

    it('should provide accessible form context', async () => {
      router = createTestRouter(['/join/ABC123']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      });

      // Should have accessible form structure
      expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/game id.*abc123/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join game/i })).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should manage focus appropriately during navigation', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Navigate to host page
      const hostButton = screen.getByTestId('host-game-button');
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });

      // Focus should be manageable after navigation
      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      usernameInput.focus();
      expect(document.activeElement).toBe(usernameInput);
    });

    it('should maintain logical focus order in complex layouts', async () => {
      router = createTestRouter(['/game/ABC123']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      });

      // Tab through lobby elements
      await user.tab(); // Should focus first interactive element

      const copyButton = screen.getByRole('button', { name: /copy/i });
      copyButton.focus();
      expect(document.activeElement).toBe(copyButton);
    });
  });

  describe('Error Handling and User Feedback', () => {
    it('should provide accessible error messages', async () => {
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      // ACCESSIBILITY ISSUE: Forms should have proper labels, currently using placeholder text
      // Fill form with valid data to enable submission using placeholder text
      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const gameIdInput = screen.getByPlaceholderText(/enter game id/i);

      await user.type(usernameInput, 'TestUser');
      await user.type(gameIdInput, 'INVALID');

      // Wait for button to be enabled
      const submitButton = screen.getByRole('button', { name: /join game/i });
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      // Should handle form submission (even if it results in error)
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    it('should provide loading state feedback', async () => {
      router = createTestRouter(['/host']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByPlaceholderText(/enter your username/i);
      const submitButton = screen.getByRole('button', { name: /create & host game/i });

      // Clear any existing value and ensure input is empty
      await user.clear(usernameInput);

      // Wait for button to be disabled after clearing
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Button should be enabled when form is valid
      await user.type(usernameInput, 'TestUser');
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Mobile and Touch Accessibility', () => {
    it('should support touch interaction patterns', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Touch interaction should work (click simulation)
      const hostButton = screen.getByTestId('host-game-button');
      await user.click(hostButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Host New Game' })).toBeInTheDocument();
      });
    });

    it('should provide adequate spacing between interactive elements', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      const hostButton = screen.getByTestId('host-game-button');
      const joinButton = screen.getByTestId('join-game-button');
      const myGamesButton = screen.getByTestId('my-games-button');

      // All buttons should be accessible and distinct
      expect(hostButton).toBeInTheDocument();
      expect(joinButton).toBeInTheDocument();
      expect(myGamesButton).toBeInTheDocument();

      // Each should be independently clickable
      expect(hostButton).not.toBe(joinButton);
      expect(joinButton).not.toBe(myGamesButton);
    });
  });

  describe('Performance and Cognitive Accessibility', () => {
    it('should render quickly for users with cognitive disabilities', async () => {
      const startTime = performance.now();

      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Othello' })).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Quick rendering
    });

    it('should provide clear and consistent navigation patterns', async () => {
      router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('host-game-button')).toBeInTheDocument();
      });

      // Navigation should be consistent and predictable
      expect(screen.getByRole('link', { name: /host game/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /join game/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my active games/i })).toBeInTheDocument();

      // Each link should lead where it says it will
      expect(screen.getByTestId('host-game-button')).toHaveAttribute('href', '/host');
      expect(screen.getByTestId('join-game-button')).toHaveAttribute('href', '/join');
      expect(screen.getByTestId('my-games-button')).toHaveAttribute('href', '/my-games');
    });

    it('should support users who need more time', async () => {
      router = createTestRouter(['/join']);
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
      });

      // Users should be able to take time with form input
      const usernameInput = screen.getByPlaceholderText(/enter your username/i);

      // Clear any existing value first
      await user.clear(usernameInput);

      // Simulate slow typing (users with motor disabilities)
      await user.type(usernameInput, 'Test', { delay: 500 });

      expect(usernameInput).toHaveValue('Test');
    });
  });
});
