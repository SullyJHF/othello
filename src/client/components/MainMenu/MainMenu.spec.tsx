/**
 * Tests for MainMenu component with debug functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MainMenu } from './MainMenu';

// Mock the debug hook
jest.mock('../../hooks/useDebugMode', () => ({
  useDebugMode: jest.fn(),
}));

// Mock the socket hook
jest.mock('../../utils/socketHooks', () => ({
  useSocket: jest.fn(),
}));

const mockUseDebugMode = require('../../hooks/useDebugMode').useDebugMode;
const mockUseSocket = require('../../utils/socketHooks').useSocket;

const renderMainMenu = () => {
  return render(
    <BrowserRouter>
      <MainMenu />
    </BrowserRouter>
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
    mockUseDebugMode.mockReturnValue({
      isDebugEnabled: false,
      isDummyGameEnabled: false,
      logDebug: jest.fn(),
      addAction: jest.fn(),
    });

    renderMainMenu();

    expect(screen.getByText('Othello')).toBeInTheDocument();
    expect(screen.getByText('Host Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
    expect(screen.queryByTestId('debug-game-button')).not.toBeInTheDocument();
    expect(screen.queryByText('Debug Mode')).not.toBeInTheDocument();
  });

  it('should render debug options when debug mode is enabled', () => {
    mockUseDebugMode.mockReturnValue({
      isDebugEnabled: true,
      isDummyGameEnabled: true,
      logDebug: jest.fn(),
      addAction: jest.fn(),
    });

    renderMainMenu();

    expect(screen.getByText('Othello')).toBeInTheDocument();
    expect(screen.getByText('Host Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
    expect(screen.getByTestId('debug-game-button')).toBeInTheDocument();
    expect(screen.getByText('Debug Mode')).toBeInTheDocument();
    expect(screen.getByText('🛠️ Start Debug Game')).toBeInTheDocument();
  });

  it('should not render debug options when debug is enabled but dummy game is disabled', () => {
    mockUseDebugMode.mockReturnValue({
      isDebugEnabled: true,
      isDummyGameEnabled: false,
      logDebug: jest.fn(),
      addAction: jest.fn(),
    });

    renderMainMenu();

    expect(screen.getByText('Othello')).toBeInTheDocument();
    expect(screen.getByText('Host Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
    expect(screen.queryByTestId('debug-game-button')).not.toBeInTheDocument();
    expect(screen.queryByText('Debug Mode')).not.toBeInTheDocument();
  });

  it('should call logDebug and show alert when debug game button is clicked', () => {
    const mockLogDebug = jest.fn();
    const mockAddAction = jest.fn();
    mockUseDebugMode.mockReturnValue({
      isDebugEnabled: true,
      isDummyGameEnabled: true,
      logDebug: mockLogDebug,
      addAction: mockAddAction,
    });

    renderMainMenu();

    const debugButton = screen.getByTestId('debug-game-button');
    fireEvent.click(debugButton);

    expect(mockLogDebug).toHaveBeenCalledWith('Socket or user ID not available');
    expect(global.alert).toHaveBeenCalledWith('Connection not ready. Please wait and try again.');
  });

  it('should have proper accessibility attributes for debug button', () => {
    mockUseDebugMode.mockReturnValue({
      isDebugEnabled: true,
      isDummyGameEnabled: true,
      logDebug: jest.fn(),
      addAction: jest.fn(),
    });

    renderMainMenu();

    const debugButton = screen.getByTestId('debug-game-button');
    expect(debugButton).toHaveAttribute('data-testid', 'debug-game-button');
    expect(debugButton.tagName).toBe('BUTTON');
  });
});