import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameViewProvider } from '../../contexts/GameViewContext';
import * as TimerAnalytics from '../../utils/TimerAnalytics';
import * as TimerSoundManager from '../../utils/TimerSoundManager';
import { FloatingSettingsButton } from './FloatingSettingsButton';

// Mock the timer sound manager
const mockTimerSoundManager = {
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
  playSound: vi.fn().mockResolvedValue(undefined),
  initialize: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../utils/TimerSoundManager', () => ({
  getTimerSoundManager: () => mockTimerSoundManager,
  playTimerSound: vi.fn().mockResolvedValue(undefined),
}));

// Mock the timer analytics
const mockTimerAnalytics = {
  getDetailedStats: vi.fn(),
  reset: vi.fn(),
  exportData: vi.fn(),
  importData: vi.fn(),
};

vi.mock('../../utils/TimerAnalytics', () => ({
  getTimerAnalytics: () => mockTimerAnalytics,
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const renderFloatingSettingsButton = () => {
  return render(
    <BrowserRouter>
      <GameViewProvider>
        <FloatingSettingsButton />
      </GameViewProvider>
    </BrowserRouter>,
  );
};

describe('FloatingSettingsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerSoundManager.getConfig.mockReturnValue({
      enabled: true,
      volume: 0.5,
      warningEnabled: true,
      criticalEnabled: true,
      tickEnabled: false,
      moveEnabled: true,
    });

    // Set up TimerAnalytics mocks
    mockTimerAnalytics.getDetailedStats.mockReturnValue({
      stats: {
        totalTimedGames: 0,
        averageGameDuration: 0,
        averageMoveTime: 0,
        timeManagementScore: 0,
        winLossRecord: {
          wins: 0,
          losses: 0,
          timeouts: 0,
        },
      },
      insights: [],
      recommendations: [],
    });
    mockTimerAnalytics.exportData.mockReturnValue('{}');
    mockTimerAnalytics.importData.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the floating settings button', () => {
      renderFloatingSettingsButton();

      const settingsButton = screen.getByLabelText('Open Settings');
      expect(settingsButton).toBeInTheDocument();
      expect(settingsButton).toHaveAttribute('title', 'Settings');
    });

    it('should not show settings modal initially', () => {
      renderFloatingSettingsButton();

      expect(screen.queryByRole('button', { name: 'Close settings modal' })).not.toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    it('should open settings modal when button is clicked', async () => {
      renderFloatingSettingsButton();

      const settingsButton = screen.getByLabelText('Open Settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close settings modal' })).toBeInTheDocument();
        expect(screen.getByText('Game Settings')).toBeInTheDocument();
      });
    });

    it('should close settings modal when close button is clicked', async () => {
      renderFloatingSettingsButton();

      // Open modal
      const settingsButton = screen.getByLabelText('Open Settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close settings modal' })).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByLabelText('Close Settings');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Close settings modal' })).not.toBeInTheDocument();
      });
    });

    it('should close settings modal when escape key is pressed', async () => {
      renderFloatingSettingsButton();

      // Open modal
      const settingsButton = screen.getByLabelText('Open Settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close settings modal' })).toBeInTheDocument();
      });

      // Press escape
      const modal = screen.getByRole('button', { name: 'Close settings modal' });
      fireEvent.keyDown(modal, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Close settings modal' })).not.toBeInTheDocument();
      });
    });

    it('should close settings modal when overlay is clicked', async () => {
      renderFloatingSettingsButton();

      // Open modal
      const settingsButton = screen.getByLabelText('Open Settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close settings modal' })).toBeInTheDocument();
      });

      // Click overlay
      const overlay = screen.getByRole('button', { name: 'Close settings modal' });
      fireEvent.click(overlay);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Close settings modal' })).not.toBeInTheDocument();
      });
    });

    it('should handle fade-out animation properly with timing', async () => {
      vi.useFakeTimers();

      renderFloatingSettingsButton();

      // Open modal
      const settingsButton = screen.getByLabelText('Open Settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close settings modal' })).toBeInTheDocument();
      });

      // Start closing modal
      const closeButton = screen.getByLabelText('Close Settings');
      fireEvent.click(closeButton);

      // Should immediately add 'closing' class but modal should still be visible
      await waitFor(() => {
        const overlay = screen.getByRole('button', { name: 'Close settings modal' });
        expect(overlay).toHaveClass('closing');
      });

      // Modal should still be in DOM immediately after close click
      expect(screen.getByRole('button', { name: 'Close settings modal' })).toBeInTheDocument();

      // Fast-forward past the animation duration (200ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Now modal should be removed from DOM
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Close settings modal' })).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Settings Modal Content', () => {
    it('should show settings content when modal is open', async () => {
      renderFloatingSettingsButton();

      const settingsButton = screen.getByLabelText('Open Settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Game Settings')).toBeInTheDocument();
        expect(screen.getByText('Timer & Sound Settings')).toBeInTheDocument();
        expect(screen.getByText('Enable Timer Sounds')).toBeInTheDocument();
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
      });
    });

    it('should not show back to menu link in modal', async () => {
      renderFloatingSettingsButton();

      const settingsButton = screen.getByLabelText('Open Settings');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Game Settings')).toBeInTheDocument();
        expect(screen.queryByText('Back to Menu')).not.toBeInTheDocument();
      });
    });
  });
});
