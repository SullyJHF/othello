import { EventEmitter } from 'events';
import { TimerConfig } from '../../shared/types/gameModeTypes';

export interface TimerEvents {
  tick: (remainingTime: number) => void;
  warning: (warningType: 'low' | 'critical', remainingTime: number) => void;
  timeout: () => void;
  pause: (remainingTime: number) => void;
  resume: (remainingTime: number) => void;
  increment: (newTime: number, incrementAmount: number) => void;
  start: (remainingTime: number) => void;
  stop: (remainingTime: number) => void;
  reset: (remainingTime: number) => void;
  destroy: () => void;
}

export class Timer extends EventEmitter {
  private config: TimerConfig;
  private remainingTime: number;
  private isRunning: boolean;
  private isPaused: boolean;
  private intervalId?: NodeJS.Timeout;
  private startTime?: Date;
  private pausedTime?: Date;
  private totalPausedTime: number;
  private lastUpdateTime: Date;
  private warningsIssued: Set<'low' | 'critical'>;
  private moveCount: number;
  private readonly tickInterval: number = 100; // Update every 100ms for smooth countdown

  constructor(config: TimerConfig, initialTime?: number) {
    super();

    // Validate configuration
    const errors = Timer.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid timer configuration: ${errors.join(', ')}`);
    }

    this.config = config;
    this.remainingTime = config.type === 'unlimited' ? Number.MAX_SAFE_INTEGER : (initialTime ?? config.initialTime);
    this.isRunning = false;
    this.isPaused = false;
    this.totalPausedTime = 0;
    this.lastUpdateTime = new Date();
    this.warningsIssued = new Set();
    this.moveCount = 0;
  }

  // Override EventEmitter methods with type safety
  on<U extends keyof TimerEvents>(event: U, listener: TimerEvents[U]): this {
    return super.on(event, listener);
  }

  emit<U extends keyof TimerEvents>(event: U, ...args: Parameters<TimerEvents[U]>): boolean {
    return super.emit(event, ...args);
  }

  start(): void {
    if (this.isRunning || this.config.type === 'unlimited') {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = new Date();
    this.lastUpdateTime = new Date();
    this.warningsIssued.clear();

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.tickInterval);

    this.emit('start', this.remainingTime);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.isPaused = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.updateRemainingTime();
    this.emit('stop', this.remainingTime);
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.pausedTime = new Date();
    this.updateRemainingTime();
    this.emit('pause', this.remainingTime);
  }

  resume(): void {
    if (!this.isRunning || !this.isPaused || !this.pausedTime) {
      return;
    }

    const now = new Date();
    const pausedDuration = (now.getTime() - this.pausedTime.getTime()) / 1000;
    this.totalPausedTime += pausedDuration;

    this.isPaused = false;
    this.pausedTime = undefined;
    this.lastUpdateTime = now;
    this.emit('resume', this.remainingTime);
  }

  addIncrement(): void {
    if (this.config.type === 'increment' && this.config.increment > 0) {
      const newTime = Math.min(this.remainingTime + this.config.increment, this.config.maxTime);
      const incrementAmount = newTime - this.remainingTime;
      this.remainingTime = newTime;
      this.moveCount++;
      this.emit('increment', newTime, incrementAmount);
    } else if (this.config.type === 'delay' && this.config.delay > 0) {
      // For delay/Fischer mode, add the delay amount to remaining time
      const newTime = Math.min(this.remainingTime + this.config.delay, this.config.maxTime);
      const incrementAmount = newTime - this.remainingTime;
      this.remainingTime = newTime;
      this.moveCount++;
      this.emit('increment', newTime, incrementAmount);
    } else {
      this.moveCount++;
    }
  }

  getRemainingTime(): number {
    if (this.config.type === 'unlimited') {
      return Infinity;
    }

    this.updateRemainingTime();
    return Math.max(0, this.remainingTime);
  }

  getElapsedTime(): number {
    if (!this.startTime) {
      return 0;
    }

    const now = new Date();
    const totalTime = (now.getTime() - this.startTime.getTime()) / 1000;
    return totalTime - this.totalPausedTime;
  }

  getMoveCount(): number {
    return this.moveCount;
  }

  getTotalPausedTime(): number {
    return this.totalPausedTime;
  }

  getState(): {
    remainingTime: number;
    isRunning: boolean;
    isPaused: boolean;
    totalElapsedTime: number;
    lastUpdateTime: Date;
    config: TimerConfig;
  } {
    return {
      remainingTime: this.getRemainingTime(),
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      totalElapsedTime: this.getElapsedTime(),
      lastUpdateTime: this.lastUpdateTime,
      config: this.config,
    };
  }

  reset(newTime?: number): void {
    this.stop();
    this.remainingTime = newTime ?? this.config.initialTime;
    this.totalPausedTime = 0;
    this.moveCount = 0;
    this.warningsIssued.clear();
    this.startTime = undefined;
    this.pausedTime = undefined;
    this.lastUpdateTime = new Date();
    this.emit('reset', this.remainingTime);
  }

  destroy(): void {
    this.stop();
    this.emit('destroy');
    this.removeAllListeners();
  }

  private tick(): void {
    if (!this.isRunning || this.isPaused || this.config.type === 'unlimited') {
      return;
    }

    this.updateRemainingTime();
    this.emit('tick', this.remainingTime);

    this.checkWarnings();

    if (this.remainingTime <= 0) {
      this.handleTimeout();
    }
  }

  private updateRemainingTime(): void {
    if (!this.isRunning || this.isPaused || this.config.type === 'unlimited') {
      return;
    }

    const now = new Date();
    const elapsedSinceLastUpdate = (now.getTime() - this.lastUpdateTime.getTime()) / 1000;

    // Apply delay logic for Fischer delay mode
    if (this.config.type === 'delay' && this.config.delay > 0) {
      // In Fischer delay, time doesn't count down for the first 'delay' seconds of each move
      // This is a simplified implementation - in a real system, you'd track per-move delay
      const effectiveElapsed = Math.max(0, elapsedSinceLastUpdate - this.config.delay);
      this.remainingTime = Math.max(0, this.remainingTime - effectiveElapsed);
    } else {
      this.remainingTime = Math.max(0, this.remainingTime - elapsedSinceLastUpdate);
    }

    this.lastUpdateTime = now;
  }

  private checkWarnings(): void {
    if (this.config.type === 'unlimited') {
      return;
    }

    // Check for low time warning
    if (this.remainingTime <= this.config.lowTimeWarning && !this.warningsIssued.has('low')) {
      this.warningsIssued.add('low');
      this.emit('warning', 'low', this.remainingTime);
    }

    // Check for critical time warning
    if (this.remainingTime <= this.config.criticalTimeWarning && !this.warningsIssued.has('critical')) {
      this.warningsIssued.add('critical');
      this.emit('warning', 'critical', this.remainingTime);
    }
  }

  private handleTimeout(): void {
    this.stop();
    this.remainingTime = 0;
    this.emit('timeout');
  }

  formatTime(seconds: number): string {
    return Timer.formatTime(seconds);
  }

  // Static utility methods
  static formatTime(seconds: number): string {
    if (seconds === Infinity) {
      return '∞';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  static validateConfig(config: TimerConfig): string[] {
    const errors: string[] = [];

    if (config.initialTime < 0) {
      errors.push('Initial time cannot be negative');
    }

    if (config.type === 'increment' && config.increment < 0) {
      errors.push('Increment cannot be negative');
    }

    if (config.type === 'delay' && config.delay < 0) {
      errors.push('Delay cannot be negative');
    }

    if (config.maxTime < config.initialTime) {
      errors.push('Maximum time cannot be less than initial time');
    }

    if (config.lowTimeWarning >= config.initialTime) {
      errors.push('Low time warning must be less than initial time');
    }

    if (config.criticalTimeWarning >= config.lowTimeWarning) {
      errors.push('Critical time warning must be less than low time warning');
    }

    if (config.maxPauseTime < 0) {
      errors.push('Maximum pause time cannot be negative');
    }

    return errors;
  }
}
