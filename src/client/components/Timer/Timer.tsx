import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!timerState) {
      setDisplayTime(0);
      setWarning('none');
      return;
    }

    const updateTimer = () => {
      if (timerState.isActive && !timerState.isPaused) {
        const now = new Date();
        // Handle both Date objects and date strings
        const lastUpdateTime =
          timerState.lastUpdateTime instanceof Date ? timerState.lastUpdateTime : new Date(timerState.lastUpdateTime);
        const elapsed = (now.getTime() - lastUpdateTime.getTime()) / 1000;
        const remainingTime = Math.max(0, timerState.remainingTime - elapsed);
        setDisplayTime(remainingTime);

        // Check for warnings
        if (showWarnings) {
          if (remainingTime <= 15) {
            setWarning('critical');
          } else if (remainingTime <= 60) {
            setWarning('low');
          } else {
            setWarning('none');
          }
        }
      } else {
        setDisplayTime(timerState.remainingTime);
        setWarning('none');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [timerState, showWarnings]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = (): string => {
    const classes = ['timer', `timer-${size}`];

    if (className) classes.push(className);
    if (isActive) classes.push('active');
    if (timerState?.isPaused) classes.push('paused');
    if (warning !== 'none') classes.push(`warning-${warning}`);

    return classes.join(' ');
  };

  const getStatusText = (): string => {
    if (!timerState) return 'No timer';
    if (timerState.isPaused) return 'Paused';
    if (isActive) return 'Active';
    return 'Inactive';
  };

  if (!timerState) {
    return null;
  }

  return (
    <div
      className={getTimerClass()}
      role="timer"
      aria-label={`Timer showing ${formatTime(displayTime)}, ${getStatusText()}`}
      aria-live="polite"
    >
      <div className="timer-display">
        <div className="timer-time">{formatTime(displayTime)}</div>
        {size !== 'small' && <div className="timer-status">{getStatusText()}</div>}
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
