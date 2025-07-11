import { useEffect, useState, useMemo, useCallback } from 'react';
import { TimerState } from '../../../server/models/Game';
import { PlayerTimers } from '../../../shared/types/gameModeTypes';
import './timer-display.scss';

interface TimerDisplayProps {
  timers?: PlayerTimers;
  timerState?: TimerState;
  currentPlayerId?: string;
  localUserId: string;
}

export const TimerDisplay = ({
  timers,
  timerState,
  currentPlayerId: _currentPlayerId,
  localUserId,
}: TimerDisplayProps) => {
  const [, setTick] = useState(0);

  // Get timers from either prop (memoized to prevent unnecessary recalculations)
  const activeTimers = useMemo(() => timers || timerState?.playerTimers, [timers, timerState]);

  // Only update if there are active timers that need updating
  useEffect(() => {
    if (!activeTimers) return;

    // Check if any timer is active to determine if we need to update
    const hasActiveTimers = Object.values(activeTimers).some((timer) => timer.isActive);

    if (!hasActiveTimers) return;

    // Adaptive update frequency based on lowest remaining time
    const minRemainingTime = Math.min(...Object.values(activeTimers).map((timer) => timer.remainingTime));
    const updateInterval = minRemainingTime <= 30 ? 250 : 1000; // More frequent updates for critical time

    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [activeTimers]);

  // Memoize helper functions to prevent unnecessary recalculations
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimerClass = useCallback(
    (userId: string, timer: PlayerTimers[string]): string => {
      const classes = ['timer'];

      if (timer.isActive) {
        classes.push('active');
      }

      if (timer.remainingTime <= 30) {
        classes.push('warning');
      }

      if (timer.remainingTime <= 10) {
        classes.push('critical');
      }

      if (userId === localUserId) {
        classes.push('local');
      }

      return classes.join(' ');
    },
    [localUserId],
  );

  const getTimerIcon = useCallback((timer: PlayerTimers[string]): string => {
    if (timer.isActive) {
      return '⏳';
    } else if (timer.remainingTime <= 0) {
      return '⏰';
    } else {
      return '⏱️';
    }
  }, []);

  // Memoize progress calculation to prevent unnecessary recalculations
  const getProgressWidth = useCallback((timer: PlayerTimers[string]): number => {
    // Use initial timer time from timer config if available, otherwise assume 5 minutes
    const initialTime = 300; // This could be made configurable
    return Math.max(0, Math.min(100, (timer.remainingTime / initialTime) * 100));
  }, []);

  if (!activeTimers) {
    return <div className="timer-display">No timers available</div>;
  }

  return (
    <div className="timer-display">
      {Object.entries(activeTimers).map(([userId, timer]) => (
        <div key={userId} className={getTimerClass(userId, timer)}>
          <div className="timer-icon">{getTimerIcon(timer)}</div>
          <div className="timer-info">
            <div className="timer-time">{formatTime(timer.remainingTime)}</div>
            <div className="timer-moves">{timer.moveCount} moves</div>
          </div>
          <div className="timer-progress">
            <div
              className="progress-bar"
              style={{
                width: `${getProgressWidth(timer)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
