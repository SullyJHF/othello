/**
 * Tests for MainMenu component with debug functionality
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { GameViewProvider } from '../../contexts/GameViewContext';
import { MainMenu } from './MainMenu';

// Mock the debug hook
vi.mock('../../hooks/useDebugMode', () => ({
  useDebugMode: vi.fn(),
}));

// Mock the socket hook
vi.mock('../../utils/socketHooks', () => ({
  useSocket: vi.fn(),
}));

import { useDebugMode } from '../../hooks/useDebugMode';
import { useSocket } from '../../utils/socketHooks';

const mockUseDebugMode = useDebugMode as ReturnType<typeof vi.fn>;
const mockUseSocket = useSocket as ReturnType<typeof vi.fn>;

// Helper function to create a complete debug mode mock
const createDebugModeMock = (overrides = {}) => ({
  debugConfig: {
    enabled: true,
    features: {
      dummyGame: true,
      autoPlay: true,
      gameStateInspector: true,
      performanceMonitor: true,
    },
  },
  isDebugEnabled: false,
  isDummyGameEnabled: false,
  isAutoPlayEnabled: false,
  isGameInspectorEnabled: false,
  isPerformanceMonitorEnabled: false,
  panelState: {
    isOpen: false,
    activeTab: 'auto-play' as const,
    position: 'top-right' as const,
    size: 'compact' as const,
  },
  togglePanel: vi.fn(),
  setPanelTab: vi.fn(),
  setPanelPosition: vi.fn(),
  setPanelSize: vi.fn(),
  actions: [],
  logDebug: vi.fn(),
  addAction: vi.fn(),
  clearActions: vi.fn(),
  exportActions: vi.fn(),
  ...overrides,
});

const renderMainMenu = () => {
  return render(
    <GameViewProvider>
      <BrowserRouter>
        <MainMenu />
      </BrowserRouter>
    </GameViewProvider>,
  );
};

describe('MainMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock alert to avoid actual alerts in tests
    global.alert = vi.fn();

    // Default socket mock
    mockUseSocket.mockReturnValue({
      socket: null,
      localUserId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render basic menu without debug options when debug is disabled', () => {
    mockUseDebugMode.mockReturnValue(
      createDebugModeMock({
        isDebugEnabled: false,
        isDummyGameEnabled: false,
      }),
    );

    renderMainMenu();

    expect(screen.getByText('Othello')).toBeInTheDocument();
    expect(screen.getByText('🎮 Host Game')).toBeInTheDocument();
    expect(screen.getByText('🤝 Join Game')).toBeInTheDocument();
    expect(screen.queryByTestId('debug-game-button')).not.toBeInTheDocument();
    expect(screen.queryByText('Debug Mode')).not.toBeInTheDocument();
  });

  it('should not render debug options on main menu when debug mode is enabled', () => {
    mockUseDebugMode.mockReturnValue(
      createDebugModeMock({
        isDebugEnabled: true,
        isDummyGameEnabled: true,
      }),
    );

    renderMainMenu();

    expect(screen.getByText('Othello')).toBeInTheDocument();
    expect(screen.getByText('🎮 Host Game')).toBeInTheDocument();
    expect(screen.getByText('🤝 Join Game')).toBeInTheDocument();
    // Debug game button is now only on host game screen, not main menu
    expect(screen.queryByTestId('debug-game-button')).not.toBeInTheDocument();
    expect(screen.queryByText('Debug Mode')).not.toBeInTheDocument();
    expect(screen.queryByText('🛠️ Start Debug Game')).not.toBeInTheDocument();
  });

  it('should not render debug options when debug is enabled but dummy game is disabled', () => {
    mockUseDebugMode.mockReturnValue(
      createDebugModeMock({
        isDebugEnabled: true,
        isDummyGameEnabled: false,
      }),
    );

    renderMainMenu();

    expect(screen.getByText('Othello')).toBeInTheDocument();
    expect(screen.getByText('🎮 Host Game')).toBeInTheDocument();
    expect(screen.getByText('🤝 Join Game')).toBeInTheDocument();
    expect(screen.queryByTestId('debug-game-button')).not.toBeInTheDocument();
    expect(screen.queryByText('Debug Mode')).not.toBeInTheDocument();
  });

  it('should have all main menu buttons accessible', () => {
    mockUseDebugMode.mockReturnValue(
      createDebugModeMock({
        isDebugEnabled: false,
        isDummyGameEnabled: false,
      }),
    );

    renderMainMenu();

    const hostButton = screen.getByTestId('host-game-button');
    const joinButton = screen.getByTestId('join-game-button');
    const myGamesButton = screen.getByTestId('my-games-button');

    expect(hostButton).toHaveAttribute('href', '/host');
    expect(joinButton).toHaveAttribute('href', '/join');
    expect(myGamesButton).toHaveAttribute('href', '/my-games');
  });
});
