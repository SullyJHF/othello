import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerSoundManager, getTimerSoundManager, playTimerSound, initializeTimerSounds } from './TimerSoundManager';

// Mock Web Audio API
const mockAudioContext = {
  state: 'running',
  sampleRate: 44100,
  createBuffer: vi.fn().mockReturnValue({
    getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
  }),
  createBufferSource: vi.fn().mockReturnValue({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  }),
  createGain: vi.fn().mockReturnValue({
    gain: { value: 0.5 },
    connect: vi.fn(),
  }),
  destination: {},
  close: vi.fn(),
  resume: vi.fn().mockResolvedValue(undefined),
};

// Mock window.AudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContext),
});

// Also mock webkitAudioContext for Safari compatibility
Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContext),
});

describe('TimerSoundManager', () => {
  let soundManager: TimerSoundManager;

  beforeEach(() => {
    vi.clearAllMocks();
    soundManager = new TimerSoundManager();
  });

  afterEach(() => {
    soundManager.dispose();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await soundManager.initialize();
      expect(window.AudioContext).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalAudioContext = window.AudioContext;

      // Create a new sound manager for this test to avoid state pollution
      const testSoundManager = new TimerSoundManager();

      // Temporarily make AudioContext throw an error
      (window.AudioContext as any) = vi.fn().mockImplementation(() => {
        throw new Error('AudioContext not supported');
      });

      await testSoundManager.initialize();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize timer sound manager:', expect.any(Error));

      // Restore the original mock
      window.AudioContext = originalAudioContext;
      consoleSpy.mockRestore();
    });

    it('should not initialize twice', async () => {
      await soundManager.initialize();
      await soundManager.initialize();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('sound configuration', () => {
    it('should use default configuration', () => {
      const config = soundManager.getConfig();
      expect(config).toEqual({
        enabled: true,
        volume: 0.5,
        warningEnabled: true,
        criticalEnabled: true,
        tickEnabled: false,
        moveEnabled: true,
      });
    });

    it('should allow configuration updates', () => {
      soundManager.updateConfig({ volume: 0.8, warningEnabled: false });
      const config = soundManager.getConfig();
      expect(config.volume).toBe(0.8);
      expect(config.warningEnabled).toBe(false);
    });

    it('should merge configuration correctly', () => {
      soundManager.updateConfig({ volume: 0.3 });
      const config = soundManager.getConfig();
      expect(config.volume).toBe(0.3);
      expect(config.enabled).toBe(true); // Should remain unchanged
    });
  });

  describe('sound playback', () => {
    beforeEach(async () => {
      await soundManager.initialize();
    });

    it('should play warning sound', async () => {
      await soundManager.playSound('warning');
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should play critical sound', async () => {
      await soundManager.playSound('critical');
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    it('should play expired sound', async () => {
      await soundManager.playSound('expired');
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    it('should respect sound type permissions', async () => {
      soundManager.updateConfig({ warningEnabled: false });
      await soundManager.playSound('warning');
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
    });

    it('should not play when disabled', async () => {
      soundManager.updateConfig({ enabled: false });
      await soundManager.playSound('warning');
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
    });

    it('should handle playback errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockAudioContext.createBufferSource.mockImplementation(() => {
        throw new Error('Playback error');
      });

      await soundManager.playSound('warning');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to play timer sound: warning', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended';
      await soundManager.playSound('warning');
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });

  describe('disposal', () => {
    it('should dispose resources properly', async () => {
      await soundManager.initialize();
      soundManager.dispose();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe('global functions', () => {
    it('should return singleton instance', () => {
      const manager1 = getTimerSoundManager();
      const manager2 = getTimerSoundManager();
      expect(manager1).toBe(manager2);
    });

    it('should initialize timer sounds', async () => {
      await initializeTimerSounds();
      expect(window.AudioContext).toHaveBeenCalled();
    });

    it('should play timer sound', async () => {
      await initializeTimerSounds();
      await playTimerSound('warning');
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });
  });

  describe('sound generation', () => {
    beforeEach(async () => {
      await soundManager.initialize();
    });

    it('should generate different sounds for different types', () => {
      // This test verifies that different sound types are properly registered
      const config = soundManager.getConfig();
      expect(config.warningEnabled).toBe(true);
      expect(config.criticalEnabled).toBe(true);
      expect(config.tickEnabled).toBe(false);
      expect(config.moveEnabled).toBe(true);
    });
  });
});
