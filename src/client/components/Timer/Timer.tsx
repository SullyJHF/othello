import { useState, useEffect, useMemo, useCallback } from 'react';
import { PlayerTimerState } from '../../../server/models/Game';
import './timer.scss';

export interface TimerProps {
  timerState: PlayerTimerState | null;
  isActive: boolean;
  showWarnings?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const Timer = ({ timerState, isActive, showWarnings = true, size = 'medium', className = '' }: TimerProps) => {
  const [displayTime, setDisplayTime] = useState(0);
  const [warning, setWarning] = useState<'none' | 'low' | 'critical'>('none');

  // Dynamic update interval based on remaining time for performance
  const getUpdateInterval = useCallback((remainingTime: number): number => {
    if (remainingTime <= 10) return 100; // Critical time - update every 100ms
    if (remainingTime <= 60) return 250; // Low time - update every 250ms
    return 1000; // Normal time - update every second
  }, []);

  useEffect(() => {
    if (!timerState) {
      setDisplayTime(0);
      setWarning('none');
      return;
    }

    let intervalId: NodeJS.Timeout;
    let lastUpdateInterval = 0;

    const updateTimer = () => {
      if (timerState.isActive && !timerState.isPaused) {
        const now = Date.now();
        // Handle both Date objects and date strings
        const lastUpdateTime =
          timerState.lastUpdateTime instanceof Date
            ? timerState.lastUpdateTime.getTime()
            : new Date(timerState.lastUpdateTime).getTime();
        const elapsed = (now - lastUpdateTime) / 1000;
        const remainingTime = Math.max(0, timerState.remainingTime - elapsed);

        // Only update if time has changed significantly (prevent unnecessary re-renders)
        if (Math.abs(remainingTime - displayTime) > 0.1) {
          setDisplayTime(remainingTime);
        }

        // Check for warnings (memoized to prevent unnecessary state updates)
        if (showWarnings) {
          let newWarning: 'none' | 'low' | 'critical' = 'none';
          if (remainingTime <= 15) {
            newWarning = 'critical';
          } else if (remainingTime <= 60) {
            newWarning = 'low';
          }

          if (newWarning !== warning) {
            setWarning(newWarning);
          }
        }

        // Adjust interval based on remaining time
        const newInterval = getUpdateInterval(remainingTime);
        if (newInterval !== lastUpdateInterval) {
          clearInterval(intervalId);
          lastUpdateInterval = newInterval;
          intervalId = setInterval(updateTimer, newInterval);
        }
      } else {
        if (Math.abs(timerState.remainingTime - displayTime) > 0.1) {
          setDisplayTime(timerState.remainingTime);
        }
        if (warning !== 'none') {
          setWarning('none');
        }
      }
    };

    updateTimer();
    const initialInterval = getUpdateInterval(timerState.remainingTime);
    lastUpdateInterval = initialInterval;
    intervalId = setInterval(updateTimer, initialInterval);

    return () => clearInterval(intervalId);
  }, [timerState, showWarnings, displayTime, warning, getUpdateInterval]);

  // Memoize expensive operations to prevent unnecessary recalculations
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const timerClass = useMemo((): string => {
    const classes = ['timer', `timer-${size}`];

    if (className) classes.push(className);
    if (isActive) classes.push('active');
    if (timerState?.isPaused) classes.push('paused');
    if (warning !== 'none') classes.push(`warning-${warning}`);

    return classes.join(' ');
  }, [size, className, isActive, timerState?.isPaused, warning]);

  const statusText = useMemo((): string => {
    if (!timerState) return 'No timer';
    if (timerState.isPaused) return 'Paused';
    if (isActive) return 'Active';
    return 'Inactive';
  }, [timerState, isActive]);

  const formattedTime = useMemo(() => formatTime(displayTime), [displayTime, formatTime]);

  const ariaLabel = useMemo(() => `Timer showing ${formattedTime}, ${statusText}`, [formattedTime, statusText]);

  if (!timerState) {
    return null;
  }

  return (
    <div className={timerClass} role="timer" aria-label={ariaLabel} aria-live="polite">
      <div className="timer-display">
        <div className="timer-time">{formattedTime}</div>
        {size !== 'small' && <div className="timer-status">{statusText}</div>}
      </div>
      {warning === 'critical' && (
        <div className="timer-warning critical" role="alert">
          ⚠️ Time running out!
        </div>
      )}
      {warning === 'low' && (
        <div className="timer-warning low" role="alert">
          ⏰ Low time
        </div>
      )}
    </div>
  );
};
