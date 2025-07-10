export type TimerSoundType = 'warning' | 'critical' | 'expired' | 'tick' | 'move';

export interface TimerSoundConfig {
  enabled: boolean;
  volume: number;
  warningEnabled: boolean;
  criticalEnabled: boolean;
  tickEnabled: boolean;
  moveEnabled: boolean;
}

export class TimerSoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<TimerSoundType, AudioBuffer> = new Map();
  private config: TimerSoundConfig;
  private isInitialized = false;

  constructor(config?: Partial<TimerSoundConfig>) {
    this.config = {
      enabled: true,
      volume: 0.5,
      warningEnabled: true,
      criticalEnabled: true,
      tickEnabled: false,
      moveEnabled: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved configuration from localStorage
      this.loadConfigFromStorage();

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Generate sound effects using Web Audio API
      await this.generateSounds();

      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize timer sound manager:', error);
      this.config.enabled = false;
    }
  }

  private async generateSounds(): Promise<void> {
    if (!this.audioContext) return;

    // Generate warning sound (gentle beep)
    const warningBuffer = this.createTone(800, 0.2, 'sine');
    this.sounds.set('warning', warningBuffer);

    // Generate critical sound (urgent beep)
    const criticalBuffer = this.createTone(1200, 0.3, 'sawtooth');
    this.sounds.set('critical', criticalBuffer);

    // Generate expiration sound (alarm)
    const expiredBuffer = this.createAlarmSound();
    this.sounds.set('expired', expiredBuffer);

    // Generate tick sound (subtle click)
    const tickBuffer = this.createTone(400, 0.05, 'square');
    this.sounds.set('tick', tickBuffer);

    // Generate move sound (confirmation beep)
    const moveBuffer = this.createTone(600, 0.1, 'sine');
    this.sounds.set('move', moveBuffer);
  }

  private createTone(frequency: number, duration: number, type: OscillatorType): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'sawtooth':
          sample = 2 * ((frequency * t) % 1) - 1;
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        default:
          sample = Math.sin(2 * Math.PI * frequency * t);
      }

      // Apply envelope for smoother sound
      const envelope = this.createEnvelope(t, duration);
      data[i] = sample * envelope * this.config.volume;
    }

    return buffer;
  }

  private createAlarmSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;

      // Alternating frequencies for alarm effect
      const frequency = Math.sin(t * 10) > 0 ? 1000 : 800;
      const sample = Math.sin(2 * Math.PI * frequency * t);

      // Apply envelope
      const envelope = this.createEnvelope(t, duration);
      data[i] = sample * envelope * this.config.volume * 0.8;
    }

    return buffer;
  }

  private createEnvelope(time: number, duration: number): number {
    const attackTime = 0.01;
    const releaseTime = 0.1;

    if (time < attackTime) {
      return time / attackTime;
    } else if (time > duration - releaseTime) {
      return (duration - time) / releaseTime;
    } else {
      return 1;
    }
  }

  async playSound(type: TimerSoundType): Promise<void> {
    if (!this.config.enabled || !this.isInitialized || !this.audioContext) return;

    // Check specific sound type permissions
    switch (type) {
      case 'warning':
        if (!this.config.warningEnabled) return;
        break;
      case 'critical':
        if (!this.config.criticalEnabled) return;
        break;
      case 'tick':
        if (!this.config.tickEnabled) return;
        break;
      case 'move':
        if (!this.config.moveEnabled) return;
        break;
    }

    const buffer = this.sounds.get(type);
    if (!buffer) return;

    try {
      // Resume audio context if suspended (required for autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      gainNode.gain.value = this.config.volume;
      source.start();
    } catch (error) {
      console.warn(`Failed to play timer sound: ${type}`, error);
    }
  }

  updateConfig(newConfig: Partial<TimerSoundConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): TimerSoundConfig {
    return { ...this.config };
  }

  private loadConfigFromStorage(): void {
    try {
      const savedConfig = localStorage.getItem('timer-settings');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig) as Partial<TimerSoundConfig>;
        this.config = { ...this.config, ...parsedConfig };
      }
    } catch (error) {
      console.warn('Failed to load timer settings from localStorage:', error);
    }
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.sounds.clear();
    this.isInitialized = false;
  }
}

// Global timer sound manager instance
let timerSoundManager: TimerSoundManager | null = null;

export const getTimerSoundManager = (): TimerSoundManager => {
  if (!timerSoundManager) {
    timerSoundManager = new TimerSoundManager();
  }
  return timerSoundManager;
};

export const initializeTimerSounds = async (): Promise<void> => {
  const manager = getTimerSoundManager();
  await manager.initialize();
};

export const playTimerSound = async (type: TimerSoundType): Promise<void> => {
  const manager = getTimerSoundManager();
  await manager.playSound(type);
};
