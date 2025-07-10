import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameViewProvider } from '../../contexts/GameViewContext';
import * as TimerAnalytics from '../../utils/TimerAnalytics';
import * as TimerSoundManager from '../../utils/TimerSoundManager';
import { Settings } from './Settings';

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

const renderSettings = (onClose?: () => void) => {
  return render(
    <BrowserRouter>
      <GameViewProvider>
        <Settings onClose={onClose || vi.fn()} />
      </GameViewProvider>
    </BrowserRouter>,
  );
};

describe('Settings Component', () => {
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
    it('should render the settings page with title', async () => {
      renderSettings();

      await waitFor(() => {
        expect(screen.getByText('Game Settings')).toBeInTheDocument();
        expect(screen.getByText('Customize your Othello experience')).toBeInTheDocument();
      });
    });

    it('should display timer and sound settings section', async () => {
      renderSettings();

      await waitFor(() => {
        expect(screen.getByText('Timer & Sound Settings')).toBeInTheDocument();
        expect(screen.getByText('Enable Timer Sounds')).toBeInTheDocument();
      });
    });

    it('should display accessibility section', async () => {
      renderSettings();

      await waitFor(() => {
        expect(screen.getByText('Accessibility')).toBeInTheDocument();
        expect(screen.getByText('Motion Sensitivity')).toBeInTheDocument();
        expect(screen.getByText('Screen Reader Support')).toBeInTheDocument();
      });
    });
  });

  describe('Timer Sound Configuration', () => {
    it('should load and display current configuration', async () => {
      renderSettings();

      await waitFor(() => {
        const enabledCheckbox = screen.getByLabelText('Enable Timer Sounds');
        expect(enabledCheckbox.checked).toBe(true);

        const warningCheckbox = screen.getByLabelText('Low Time Warning (60s)');
        expect(warningCheckbox.checked).toBe(true);
      });
    });

    it('should handle master volume control', async () => {
      renderSettings();

      await waitFor(() => {
        const volumeSlider = screen.getByLabelText(/Master Volume/);
        expect(volumeSlider.value).toBe('0.5');

        fireEvent.change(volumeSlider, { target: { value: '0.8' } });
        expect(volumeSlider.value).toBe('0.8');
      });
    });

    it('should disable sound controls when timer sounds are disabled', async () => {
      mockTimerSoundManager.getConfig.mockReturnValue({
        enabled: false,
        volume: 0.5,
        warningEnabled: true,
        criticalEnabled: true,
        tickEnabled: false,
        moveEnabled: true,
      });

      renderSettings();

      await waitFor(() => {
        const volumeSlider = screen.getByLabelText(/Master Volume/);
        expect(volumeSlider.disabled).toBe(true);

        const warningCheckbox = screen.getByLabelText('Low Time Warning (60s)');
        expect(warningCheckbox.disabled).toBe(true);
      });
    });

    it('should handle checkbox state changes', async () => {
      renderSettings();

      await waitFor(() => {
        const tickCheckbox = screen.getByLabelText('Timer Tick Sounds');
        expect(tickCheckbox.checked).toBe(false);

        fireEvent.click(tickCheckbox);
        expect(tickCheckbox.checked).toBe(true);
      });
    });
  });

  describe('Sound Testing', () => {
    it('should play test sounds when buttons are clicked', async () => {
      renderSettings();

      await waitFor(() => {
        const testButtons = screen.getAllByText('Test Sound');
        expect(testButtons.length).toBeGreaterThan(0);

        fireEvent.click(testButtons[0]);
        expect(mockTimerSoundManager.playSound).toHaveBeenCalled();
      });
    });

    it('should disable test buttons when sounds are disabled', async () => {
      mockTimerSoundManager.getConfig.mockReturnValue({
        enabled: false,
        volume: 0.5,
        warningEnabled: false,
        criticalEnabled: false,
        tickEnabled: false,
        moveEnabled: false,
      });

      renderSettings();

      await waitFor(() => {
        const testButtons = screen.getAllByText('Test Sound');
        testButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings to localStorage', async () => {
      renderSettings();

      await waitFor(() => {
        const saveButton = screen.getByText('Save Settings');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('timer-settings', expect.stringContaining('"enabled"'));
        expect(mockTimerSoundManager.updateConfig).toHaveBeenCalled();
      });
    });

    it('should load settings from localStorage on mount', async () => {
      const savedConfig = {
        enabled: false,
        volume: 0.3,
        warningEnabled: false,
        criticalEnabled: true,
        tickEnabled: true,
        moveEnabled: false,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig));

      renderSettings();

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('timer-settings');
      });
    });

    it('should show success message after saving', async () => {
      renderSettings();

      await waitFor(() => {
        const saveButton = screen.getByText('Save Settings');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to default configuration', async () => {
      renderSettings();

      await waitFor(() => {
        // Change a setting
        const tickCheckbox = screen.getByLabelText('Timer Tick Sounds');
        fireEvent.click(tickCheckbox);
        expect(tickCheckbox.checked).toBe(true);

        // Reset to defaults
        const resetButton = screen.getByText('Reset to Defaults');
        fireEvent.click(resetButton);

        expect(tickCheckbox.checked).toBe(false);
      });
    });
  });

  describe('Navigation', () => {
    it('should not render back to menu link in modal mode', async () => {
      renderSettings();

      await waitFor(() => {
        expect(screen.getByText('Game Settings')).toBeInTheDocument();
        expect(screen.queryByText('Back to Menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should render modal overlay', async () => {
      renderSettings();

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });
    });

    it('should render close button', async () => {
      const onCloseMock = vi.fn();
      renderSettings(onCloseMock);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close Settings');
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should call onClose when close button is clicked', async () => {
      const onCloseMock = vi.fn();
      renderSettings(onCloseMock);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close Settings');
        fireEvent.click(closeButton);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when escape key is pressed', async () => {
      const onCloseMock = vi.fn();
      renderSettings(onCloseMock);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        fireEvent.keyDown(modal, { key: 'Escape' });
        expect(onCloseMock).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when overlay is clicked', async () => {
      const onCloseMock = vi.fn();
      renderSettings(onCloseMock);

      await waitFor(() => {
        const overlay = screen.getByRole('dialog', { hidden: true });
        fireEvent.click(overlay);
        expect(onCloseMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading States', () => {
    it('should eventually show the settings interface after loading', async () => {
      renderSettings();

      // Wait for the component to finish loading and show the main interface
      await waitFor(() => {
        expect(screen.getByText('Game Settings')).toBeInTheDocument();
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
      });
    });

    it('should handle save button interaction', async () => {
      renderSettings();

      await waitFor(() => {
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);

      // Verify the save operations are called
      expect(mockTimerSoundManager.updateConfig).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('timer-settings', expect.stringContaining('"enabled"'));

      // Should show success message after save
      await waitFor(() => {
        expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      renderSettings();

      await waitFor(() => {
        const saveButton = screen.getByText('Save Settings');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to save settings. Please try again.')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle localStorage loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      renderSettings();

      await waitFor(() => {
        expect(screen.getByText('Game Settings')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });
});
