/**
 * Tests for MainMenu component with debug functionality
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { GameViewProvider } from '../../contexts/GameViewContext';
import { MainMenu } from './MainMenu';

// Mock the debug hook
jest.mock('../../hooks/useDebugMode', () => ({
  useDebugMode: jest.fn(),
}));

// Mock the socket hook
jest.mock('../../utils/socketHooks', () => ({
  useSocket: jest.fn(),
}));

import { useDebugMode } from '../../hooks/useDebugMode';
import { useSocket } from '../../utils/socketHooks';

const mockUseDebugMode = useDebugMode as jest.MockedFunction<typeof useDebugMode>;
const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;

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
  togglePanel: jest.fn(),
  setPanelTab: jest.fn(),
  setPanelPosition: jest.fn(),
  setPanelSize: jest.fn(),
  actions: [],
  logDebug: jest.fn(),
  addAction: jest.fn(),
  clearActions: jest.fn(),
  exportActions: jest.fn(),
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
    jest.clearAllMocks();
    // Mock alert to avoid actual alerts in tests
    global.alert = jest.fn();

    // Default socket mock
    mockUseSocket.mockReturnValue({
      socket: null,
      localUserId: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('should render debug options when debug mode is enabled', () => {
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
    expect(screen.getByTestId('debug-game-button')).toBeInTheDocument();
    expect(screen.getByText('Debug Mode')).toBeInTheDocument();
    expect(screen.getByText('🛠️ Start Debug Game')).toBeInTheDocument();
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

  it('should call logDebug and show alert when debug game button is clicked', () => {
    const mockLogDebug = jest.fn();
    const mockAddAction = jest.fn();
    mockUseDebugMode.mockReturnValue(
      createDebugModeMock({
        isDebugEnabled: true,
        isDummyGameEnabled: true,
        logDebug: mockLogDebug,
        addAction: mockAddAction,
      }),
    );

    renderMainMenu();

    const debugButton = screen.getByTestId('debug-game-button');
    fireEvent.click(debugButton);

    expect(mockLogDebug).toHaveBeenCalledWith('Socket or user ID not available');
    expect(global.alert).toHaveBeenCalledWith('Connection not ready. Please wait and try again.');
  });

  it('should have proper accessibility attributes for debug button', () => {
    mockUseDebugMode.mockReturnValue(
      createDebugModeMock({
        isDebugEnabled: true,
        isDummyGameEnabled: true,
      }),
    );

    renderMainMenu();

    const debugButton = screen.getByTestId('debug-game-button');
    expect(debugButton).toHaveAttribute('data-testid', 'debug-game-button');
    expect(debugButton.tagName).toBe('BUTTON');
  });
});
