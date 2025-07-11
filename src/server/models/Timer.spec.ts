import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimerConfig } from '../../shared/types/gameModeTypes';
import { Timer } from './Timer';

describe('Timer', () => {
  let timer: Timer;
  let mockConfig: TimerConfig;

  beforeEach(() => {
    vi.useFakeTimers();

    mockConfig = {
      type: 'increment',
      initialTime: 300, // 5 minutes
      increment: 5,
      delay: 0,
      maxTime: 600,
      lowTimeWarning: 60,
      criticalTimeWarning: 15,
      autoFlagOnTimeout: true,
      pauseOnDisconnect: true,
      maxPauseTime: 300,
      timeoutAction: 'forfeit',
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize timer with config', () => {
      timer = new Timer(mockConfig);

      expect(timer.getState()).toEqual({
        remainingTime: 300,
        isRunning: false,
        isPaused: false,
        totalElapsedTime: 0,
        lastUpdateTime: expect.any(Date),
        config: mockConfig,
      });
    });

    it('should handle unlimited timer type', () => {
      mockConfig.type = 'unlimited';
      timer = new Timer(mockConfig);

      expect(timer.getState().remainingTime).toBe(Infinity);
    });
  });

  describe('start', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should start the timer', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.start();

      expect(timer.getState().isRunning).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith('start', 300);
    });

    it('should not start if already running', () => {
      timer.start();
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.start();

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should start ticking when started', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.start();

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      // Should emit start event and at least one tick event
      expect(mockEmit).toHaveBeenCalledWith('start', 300);
      expect(mockEmit).toHaveBeenCalledWith(expect.stringMatching(/tick/), expect.any(Number));
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should stop the timer', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.start();
      timer.stop();

      expect(timer.getState().isRunning).toBe(false);
      expect(mockEmit).toHaveBeenCalledWith('stop', expect.any(Number));
    });

    it('should not stop if not running', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.stop();

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should pause the timer', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.start();
      timer.pause();

      expect(timer.getState().isPaused).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith('pause', expect.any(Number));
    });

    it('should not pause if not running', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.pause();

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should resume the timer', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.start();
      timer.pause();
      timer.resume();

      expect(timer.getState().isPaused).toBe(false);
      expect(mockEmit).toHaveBeenCalledWith('resume', expect.any(Number));
    });

    it('should not resume if not paused', () => {
      const mockEmit = vi.fn();
      timer.start();
      timer.emit = mockEmit;

      timer.resume();

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('addIncrement', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should add increment to remaining time', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.addIncrement();

      expect(timer.getState().remainingTime).toBe(305); // 300 + 5
      expect(mockEmit).toHaveBeenCalledWith('increment', 305, 5);
    });

    it('should not exceed max time', () => {
      mockConfig.initialTime = 595;
      timer = new Timer(mockConfig);

      timer.addIncrement();

      expect(timer.getState().remainingTime).toBe(600); // Capped at maxTime
    });

    it('should handle delay timer type', () => {
      mockConfig.type = 'delay';
      mockConfig.delay = 3;
      timer = new Timer(mockConfig);

      timer.addIncrement();

      expect(timer.getState().remainingTime).toBe(303); // 300 + 3 (delay)
    });
  });

  describe('timer expiration', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should emit timeout when time reaches zero', () => {
      // Create a timer with very short time for testing
      const shortConfig = { ...mockConfig, initialTime: 0.1, lowTimeWarning: 0.05, criticalTimeWarning: 0.02 };
      timer = new Timer(shortConfig);

      const mockEmit = vi.fn();
      timer.start();
      timer.emit = mockEmit;

      // Advance time to exhaust the timer
      vi.advanceTimersByTime(150); // 150ms should be enough

      // Check that timeout was called at some point
      expect(mockEmit.mock.calls.some((call) => call[0] === 'timeout')).toBe(true);
    });

    it('should stop running when timeout occurs', () => {
      // Create a timer with very short time for testing
      const shortConfig = { ...mockConfig, initialTime: 0.1, lowTimeWarning: 0.05, criticalTimeWarning: 0.02 };
      timer = new Timer(shortConfig);

      timer.start();

      // Advance time to exhaust the timer
      vi.advanceTimersByTime(150);

      expect(timer.getState().isRunning).toBe(false);
      expect(timer.getState().remainingTime).toBe(0);
    });
  });

  describe('timer warnings', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should emit low time warning', () => {
      // Create a timer with short time and low warning threshold
      const shortConfig = { ...mockConfig, initialTime: 5, lowTimeWarning: 4, criticalTimeWarning: 2 };
      timer = new Timer(shortConfig);

      const mockEmit = vi.fn();
      timer.start();
      timer.emit = mockEmit;

      // Advance time to trigger low warning
      vi.advanceTimersByTime(1200); // 1.2 seconds

      // Check that low warning was called at some point
      expect(mockEmit.mock.calls.some((call) => call[0] === 'warning' && call[1] === 'low')).toBe(true);
    });

    it('should emit critical time warning', () => {
      // Create a timer with short time and critical warning threshold
      const shortConfig = { ...mockConfig, initialTime: 5, lowTimeWarning: 4, criticalTimeWarning: 2 };
      timer = new Timer(shortConfig);

      const mockEmit = vi.fn();
      timer.start();
      timer.emit = mockEmit;

      // Advance time to trigger critical warning
      vi.advanceTimersByTime(3200); // 3.2 seconds

      // Check that critical warning was called at some point
      expect(mockEmit.mock.calls.some((call) => call[0] === 'warning' && call[1] === 'critical')).toBe(true);
    });

    it('should not emit duplicate warnings', () => {
      // Create a timer with short time and low warning threshold
      const shortConfig = { ...mockConfig, initialTime: 5, lowTimeWarning: 4, criticalTimeWarning: 2 };
      timer = new Timer(shortConfig);

      const mockEmit = vi.fn();
      timer.start();
      timer.emit = mockEmit;

      // Advance time to trigger low warning
      vi.advanceTimersByTime(1200);
      const lowWarningCalls = mockEmit.mock.calls.filter((call) => call[0] === 'warning' && call[1] === 'low').length;

      // Advance more time but stay in low warning range
      vi.advanceTimersByTime(500);
      const lowWarningCallsAfter = mockEmit.mock.calls.filter(
        (call) => call[0] === 'warning' && call[1] === 'low',
      ).length;

      // Should have exactly one low warning call
      expect(lowWarningCallsAfter).toBe(1);
    });
  });

  describe('different timer types', () => {
    it('should handle fixed timer type', () => {
      mockConfig.type = 'fixed';
      timer = new Timer(mockConfig);

      timer.addIncrement();

      // Fixed timer should not add increment
      expect(timer.getState().remainingTime).toBe(300);
    });

    it('should handle correspondence timer type', () => {
      mockConfig.type = 'correspondence';
      mockConfig.initialTime = 86400; // 24 hours
      mockConfig.maxTime = 172800; // 48 hours
      timer = new Timer(mockConfig);

      expect(timer.getState().remainingTime).toBe(86400);
    });
  });

  describe('getState', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should return current timer state', () => {
      timer.start();
      vi.advanceTimersByTime(1000);

      const state = timer.getState();

      expect(state.remainingTime).toBeCloseTo(299, 0);
      expect(state.isRunning).toBe(true);
      expect(state.isPaused).toBe(false);
      expect(state.totalElapsedTime).toBeCloseTo(1, 0);
      expect(state.lastUpdateTime).toBeInstanceOf(Date);
      expect(state.config).toBe(mockConfig);
    });

    it('should update elapsed time correctly', () => {
      timer.start();
      vi.advanceTimersByTime(5000);

      const state = timer.getState();

      expect(state.totalElapsedTime).toBeCloseTo(5, 0);
      expect(state.remainingTime).toBeCloseTo(295, 0);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should reset timer to initial state', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.start();
      vi.advanceTimersByTime(5000);
      timer.reset();

      const state = timer.getState();
      expect(state.remainingTime).toBe(300);
      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.totalElapsedTime).toBe(0);
      expect(mockEmit).toHaveBeenCalledWith('reset', 300);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should clean up timer resources', () => {
      const mockEmit = vi.fn();
      timer.emit = mockEmit;

      timer.start();
      timer.destroy();

      expect(timer.getState().isRunning).toBe(false);
      expect(mockEmit).toHaveBeenCalledWith('destroy');
    });
  });

  describe('validation', () => {
    it('should validate timer configuration', () => {
      const invalidConfig = {
        ...mockConfig,
        initialTime: -1, // Invalid
      };

      expect(() => new Timer(invalidConfig)).toThrow();
    });

    it('should validate increment values', () => {
      const invalidConfig = {
        ...mockConfig,
        increment: -1, // Invalid
      };

      expect(() => new Timer(invalidConfig)).toThrow();
    });
  });

  describe('time formatting', () => {
    beforeEach(() => {
      timer = new Timer(mockConfig);
    });

    it('should format time correctly', () => {
      // Test the formatTime method (if it exists)
      expect(timer.formatTime(3661)).toBe('1:01:01'); // 1 hour, 1 minute, 1 second
      expect(timer.formatTime(65)).toBe('1:05'); // 1 minute, 5 seconds
      expect(timer.formatTime(5)).toBe('0:05'); // 5 seconds
    });
  });

  describe('edge cases', () => {
    it('should handle very small time values', () => {
      mockConfig.initialTime = 1;
      mockConfig.lowTimeWarning = 0.5;
      mockConfig.criticalTimeWarning = 0.1;
      timer = new Timer(mockConfig);

      timer.start();
      vi.advanceTimersByTime(1000);

      expect(timer.getState().remainingTime).toBeCloseTo(0, 5);
    });

    it('should handle pause and resume correctly', () => {
      timer = new Timer(mockConfig);
      timer.start();

      // Run for 2 seconds
      vi.advanceTimersByTime(2000);
      expect(timer.getState().remainingTime).toBeCloseTo(298, 0);

      // Pause for 3 seconds
      timer.pause();
      vi.advanceTimersByTime(3000);
      expect(timer.getState().remainingTime).toBeCloseTo(298, 0); // Should not change

      // Resume and run for 1 second
      timer.resume();
      vi.advanceTimersByTime(1000);
      expect(timer.getState().remainingTime).toBeCloseTo(297, 0);
    });

    it('should handle multiple increments', () => {
      timer = new Timer(mockConfig);

      timer.addIncrement();
      timer.addIncrement();
      timer.addIncrement();

      expect(timer.getState().remainingTime).toBe(315); // 300 + 3*5
    });
  });
});
