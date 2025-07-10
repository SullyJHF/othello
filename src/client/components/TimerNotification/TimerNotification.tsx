import { useState, useEffect, useMemo, useCallback } from 'react';
import { playTimerSound } from '../../utils/TimerSoundManager';
import './timer-notification.scss';

export interface TimerNotificationProps {
  type: 'low' | 'critical' | 'expired';
  playerName: string;
  remainingTime: number;
  isVisible: boolean;
  onDismiss: () => void;
}

export const TimerNotification = ({
  type,
  playerName,
  remainingTime,
  isVisible,
  onDismiss,
}: TimerNotificationProps) => {
  const [shouldShow, setShouldShow] = useState(isVisible);

  useEffect(() => {
    setShouldShow(isVisible);

    // Play sound when notification becomes visible
    if (isVisible) {
      const soundType = type === 'low' ? 'warning' : type === 'critical' ? 'critical' : 'expired';
      playTimerSound(soundType).catch(console.warn);
    }
  }, [isVisible, type]);

  useEffect(() => {
    if (isVisible && type !== 'expired') {
      // Auto-dismiss warning notifications after 5 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, type, onDismiss]);

  // Memoize expensive calculations to prevent unnecessary recalculations
  const notificationIcon = useMemo(() => {
    switch (type) {
      case 'low':
        return '⏰';
      case 'critical':
        return '⚠️';
      case 'expired':
        return '⏱️';
      default:
        return '⏰';
    }
  }, [type]);

  const notificationTitle = useMemo(() => {
    switch (type) {
      case 'low':
        return 'Low Time Warning';
      case 'critical':
        return 'Critical Time Warning';
      case 'expired':
        return 'Timer Expired';
      default:
        return 'Timer Warning';
    }
  }, [type]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const notificationMessage = useMemo(() => {
    const timeText = remainingTime > 0 ? `${formatTime(remainingTime)} remaining` : 'Time up!';

    switch (type) {
      case 'low':
        return `${playerName} has ${timeText}`;
      case 'critical':
        return `${playerName} has ${timeText}`;
      case 'expired':
        return `${playerName}'s timer has expired`;
      default:
        return `${playerName} - ${timeText}`;
    }
  }, [type, playerName, remainingTime, formatTime]);

  const notificationClass = useMemo(
    () => `timer-notification ${type} ${isVisible ? 'visible' : ''}`,
    [type, isVisible],
  );

  if (!shouldShow) return null;

  return (
    <div className={notificationClass}>
      <div className="notification-content">
        <div className="notification-icon">{notificationIcon}</div>
        <div className="notification-text">
          <div className="notification-title">{notificationTitle}</div>
          <div className="notification-message">{notificationMessage}</div>
        </div>
        <button className="notification-dismiss" onClick={onDismiss} aria-label="Dismiss notification">
          ×
        </button>
      </div>
    </div>
  );
};

export interface TimerNotificationManagerProps {
  notifications: Array<{
    id: string;
    type: 'low' | 'critical' | 'expired';
    playerName: string;
    remainingTime: number;
    timestamp: number;
  }>;
  onDismiss: (id: string) => void;
}

export const TimerNotificationManager = ({ notifications, onDismiss }: TimerNotificationManagerProps) => {
  return (
    <div className="timer-notification-manager">
      {notifications.map((notification) => (
        <TimerNotification
          key={notification.id}
          type={notification.type}
          playerName={notification.playerName}
          remainingTime={notification.remainingTime}
          isVisible={true}
          onDismiss={() => onDismiss(notification.id)}
        />
      ))}
    </div>
  );
};
