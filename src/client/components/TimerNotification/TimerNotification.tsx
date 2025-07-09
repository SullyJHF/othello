import { useState, useEffect } from 'react';
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
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && type !== 'expired') {
      // Auto-dismiss warning notifications after 5 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, type, onDismiss]);

  const getNotificationIcon = () => {
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
  };

  const getNotificationTitle = () => {
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
  };

  const getNotificationMessage = () => {
    const timeText =
      remainingTime > 0
        ? `${Math.floor(remainingTime / 60)}:${(remainingTime % 60).toFixed(0).padStart(2, '0')} remaining`
        : 'Time up!';

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
  };

  if (!shouldShow) return null;

  return (
    <div className={`timer-notification ${type} ${isVisible ? 'visible' : ''}`}>
      <div className="notification-content">
        <div className="notification-icon">{getNotificationIcon()}</div>
        <div className="notification-text">
          <div className="notification-title">{getNotificationTitle()}</div>
          <div className="notification-message">{getNotificationMessage()}</div>
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
