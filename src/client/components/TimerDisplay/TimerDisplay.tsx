import { useEffect, useState } from 'react';
import { PlayerTimers } from '../../../shared/types/gameModeTypes';
import { TimerState } from '../../../server/models/Game';
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

  // Force re-render every second for smooth countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = (userId: string, timer: PlayerTimers[string]): string => {
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
  };

  const getTimerIcon = (timer: PlayerTimers[string]): string => {
    if (timer.isActive) {
      return '⏳';
    } else if (timer.remainingTime <= 0) {
      return '⏰';
    } else {
      return '⏱️';
    }
  };

  // Get timers from either prop
  const activeTimers = timers || timerState?.playerTimers;

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
                width: `${Math.max(0, (timer.remainingTime / 300) * 100)}%`, // Assuming 5 min initial
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
