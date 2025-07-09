import { TimerConfig } from '../../shared/types/gameModeTypes';

export interface TimerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateTimerConfig = (config: TimerConfig): TimerValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!config) {
    errors.push('Timer configuration is required');
    return { isValid: false, errors, warnings };
  }

  // Type validation
  const validTypes = ['increment', 'delay', 'fixed', 'correspondence', 'unlimited'];
  if (!validTypes.includes(config.type)) {
    errors.push(`Invalid timer type: ${config.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Initial time validation
  if (config.type !== 'unlimited') {
    if (config.initialTime < 30) {
      errors.push('Initial time must be at least 30 seconds');
    }
    if (config.initialTime > 7200) {
      errors.push('Initial time cannot exceed 2 hours (7200 seconds)');
    }
  }

  // Increment validation
  if (config.type === 'increment') {
    if (config.increment < 0) {
      errors.push('Increment cannot be negative');
    }
    if (config.increment > 300) {
      errors.push('Increment cannot exceed 5 minutes (300 seconds)');
    }
    if (config.increment === 0) {
      warnings.push('Zero increment effectively makes this a fixed timer');
    }
  }

  // Delay validation
  if (config.type === 'delay') {
    if (config.delay < 0) {
      errors.push('Delay cannot be negative');
    }
    if (config.delay > 60) {
      errors.push('Delay cannot exceed 1 minute (60 seconds)');
    }
    if (config.delay === 0) {
      warnings.push('Zero delay effectively makes this a fixed timer');
    }
  }

  // Max time validation
  if (config.type === 'increment' || config.type === 'delay') {
    if (config.maxTime < config.initialTime) {
      errors.push('Maximum time cannot be less than initial time');
    }
    if (config.maxTime > 14400) {
      errors.push('Maximum time cannot exceed 4 hours (14400 seconds)');
    }
  }

  // Warning thresholds validation
  if (config.type !== 'unlimited') {
    if (config.lowTimeWarning < 10) {
      warnings.push('Low time warning below 10 seconds may be too short');
    }
    if (config.lowTimeWarning > config.initialTime / 2) {
      warnings.push('Low time warning is more than half the initial time');
    }

    if (config.criticalTimeWarning < 5) {
      warnings.push('Critical time warning below 5 seconds may be too short');
    }
    if (config.criticalTimeWarning >= config.lowTimeWarning) {
      errors.push('Critical time warning must be less than low time warning');
    }
  }

  // Pause settings validation
  if (config.pauseOnDisconnect) {
    if (config.maxPauseTime < 30) {
      errors.push('Maximum pause time must be at least 30 seconds');
    }
    if (config.maxPauseTime > 1800) {
      errors.push('Maximum pause time cannot exceed 30 minutes (1800 seconds)');
    }
    if (config.maxPauseTime > config.initialTime) {
      warnings.push('Maximum pause time exceeds initial time');
    }
  }

  // Timeout action validation
  const validTimeoutActions = ['forfeit', 'auto_pass', 'auto_move'];
  if (!validTimeoutActions.includes(config.timeoutAction)) {
    errors.push(`Invalid timeout action: ${config.timeoutAction}. Must be one of: ${validTimeoutActions.join(', ')}`);
  }

  // Auto move strategy validation
  if (config.timeoutAction === 'auto_move' && config.autoMoveStrategy) {
    const validStrategies = ['random', 'best_corner', 'best_edge'];
    if (!validStrategies.includes(config.autoMoveStrategy)) {
      errors.push(
        `Invalid auto move strategy: ${config.autoMoveStrategy}. Must be one of: ${validStrategies.join(', ')}`,
      );
    }
  }

  // Logical consistency checks
  if (config.type === 'increment' && config.increment > 0) {
    if (config.initialTime < 60 && config.increment > 10) {
      warnings.push('Large increment with very short initial time may create unbalanced games');
    }
  }

  if (config.type === 'fixed' && config.initialTime < 300) {
    warnings.push('Fixed timer with less than 5 minutes may be too short for most players');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const getTimerDisplayText = (config: TimerConfig): string => {
  switch (config.type) {
    case 'unlimited':
      return 'No time limit';
    case 'fixed':
      return `${Math.floor(config.initialTime / 60)}:${(config.initialTime % 60).toString().padStart(2, '0')} fixed`;
    case 'increment':
      return `${Math.floor(config.initialTime / 60)}:${(config.initialTime % 60).toString().padStart(2, '0')} + ${config.increment}s`;
    case 'delay':
      return `${Math.floor(config.initialTime / 60)}:${(config.initialTime % 60).toString().padStart(2, '0')} (${config.delay}s delay)`;
    case 'correspondence':
      return `${Math.floor(config.initialTime / 60)}:${(config.initialTime % 60).toString().padStart(2, '0')} correspondence`;
    default:
      return 'Unknown timer type';
  }
};

export const getTimerEstimatedDuration = (config: TimerConfig): number => {
  switch (config.type) {
    case 'unlimited':
      return 30; // Estimate 30 minutes for unlimited games
    case 'fixed':
      return Math.ceil(config.initialTime / 30); // Rough estimate based on initial time
    case 'increment':
      // Base time plus estimated increment usage
      return Math.ceil((config.initialTime + config.increment * 20) / 30); // Assume ~20 moves per game
    case 'delay':
      return Math.ceil(config.initialTime / 30);
    case 'correspondence':
      return Math.ceil(config.initialTime / 30);
    default:
      return 15; // Default fallback
  }
};

export const isTimerConfigSuitable = (
  config: TimerConfig,
  skill: 'beginner' | 'intermediate' | 'advanced',
): TimerValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.type === 'unlimited') {
    return { isValid: true, errors, warnings };
  }

  const totalTime = config.initialTime + (config.increment || 0) * 20; // Estimate with ~20 moves

  switch (skill) {
    case 'beginner':
      if (totalTime < 300) {
        warnings.push('This timer may be too fast for beginners');
      }
      if (totalTime > 2400) {
        warnings.push('This timer may be too slow for beginners');
      }
      break;
    case 'intermediate':
      if (totalTime < 180) {
        warnings.push('This timer may be too fast for intermediate players');
      }
      if (totalTime > 1800) {
        warnings.push('This timer may be too slow for intermediate players');
      }
      break;
    case 'advanced':
      if (totalTime < 60) {
        warnings.push('This timer may be too fast even for advanced players');
      }
      break;
  }

  return { isValid: true, errors, warnings };
};
