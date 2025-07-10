import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGameView } from '../../contexts/GameViewContext';
import { getTimerAnalytics, TimerStats } from '../../utils/TimerAnalytics';
import { getTimerSoundManager, TimerSoundConfig } from '../../utils/TimerSoundManager';
import './settings.scss';

export const Settings = () => {
  const { setCurrentView } = useGameView();
  const [timerConfig, setTimerConfig] = useState<TimerSoundConfig>({
    enabled: true,
    volume: 0.5,
    warningEnabled: true,
    criticalEnabled: true,
    tickEnabled: false,
    moveEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{
    stats: TimerStats;
    insights: string[];
    recommendations: string[];
  } | null>(null);

  useEffect(() => {
    setCurrentView('settings');
    loadSettings();
  }, [setCurrentView]);

  const loadSettings = useCallback(async () => {
    try {
      const soundManager = getTimerSoundManager();
      const config = soundManager.getConfig();
      setTimerConfig(config);

      // Load from localStorage if available
      const savedConfig = localStorage.getItem('timer-settings');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setTimerConfig(parsedConfig);
        soundManager.updateConfig(parsedConfig);
      }

      // Load analytics data
      const analyticsManager = getTimerAnalytics();
      const analyticsData = analyticsManager.getDetailedStats();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const soundManager = getTimerSoundManager();
      soundManager.updateConfig(timerConfig);

      // Save to localStorage
      localStorage.setItem('timer-settings', JSON.stringify(timerConfig));

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings. Please try again.');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [timerConfig]);

  const handleConfigChange = useCallback((key: keyof TimerSoundConfig, value: boolean | number) => {
    setTimerConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const testSound = useCallback(async (soundType: 'warning' | 'critical' | 'expired') => {
    try {
      const soundManager = getTimerSoundManager();
      await soundManager.playSound(soundType);
    } catch (error) {
      console.error('Failed to play test sound:', error);
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaultConfig: TimerSoundConfig = {
      enabled: true,
      volume: 0.5,
      warningEnabled: true,
      criticalEnabled: true,
      tickEnabled: false,
      moveEnabled: true,
    };
    setTimerConfig(defaultConfig);
  }, []);

  const resetAnalytics = useCallback(() => {
    const analyticsManager = getTimerAnalytics();
    analyticsManager.reset();
    const analyticsData = analyticsManager.getDetailedStats();
    setAnalytics(analyticsData);
    setSaveMessage('Statistics reset successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  }, []);

  const exportAnalytics = useCallback(() => {
    const analyticsManager = getTimerAnalytics();
    const data = analyticsManager.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `othello-timer-stats-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const importAnalytics = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        const analyticsManager = getTimerAnalytics();
        if (analyticsManager.importData(data)) {
          const analyticsData = analyticsManager.getDetailedStats();
          setAnalytics(analyticsData);
          setSaveMessage('Statistics imported successfully!');
        } else {
          setSaveMessage('Failed to import statistics. Invalid file format.');
        }
        setTimeout(() => setSaveMessage(null), 3000);
      };
      reader.readAsText(file);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="settings-container">
        <div className="loading-indicator">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-title">Game Settings</h1>
        <p className="settings-subtitle">Customize your Othello experience</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2 className="section-title">Timer & Sound Settings</h2>

          <div className="setting-group">
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={timerConfig.enabled}
                  onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                  className="setting-checkbox"
                />
                Enable Timer Sounds
              </label>
              <p className="setting-description">Play audio cues for timer warnings and notifications</p>
            </div>

            <div className={`setting-item ${!timerConfig.enabled ? 'disabled' : ''}`}>
              <label className="setting-label">
                Master Volume
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={timerConfig.volume}
                  onChange={(e) => handleConfigChange('volume', parseFloat(e.target.value))}
                  disabled={!timerConfig.enabled}
                  className="setting-slider"
                />
                <span className="volume-value">{Math.round(timerConfig.volume * 100)}%</span>
              </label>
              <p className="setting-description">Adjust the overall volume of timer sounds</p>
            </div>

            <div className="sound-types">
              <h3 className="subsection-title">Sound Types</h3>

              <div className="sound-setting">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={timerConfig.warningEnabled}
                    onChange={(e) => handleConfigChange('warningEnabled', e.target.checked)}
                    disabled={!timerConfig.enabled}
                    className="setting-checkbox"
                  />
                  Low Time Warning (60s)
                </label>
                <button
                  className="test-sound-button"
                  onClick={() => testSound('warning')}
                  disabled={!timerConfig.enabled || !timerConfig.warningEnabled}
                >
                  Test Sound
                </button>
              </div>

              <div className="sound-setting">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={timerConfig.criticalEnabled}
                    onChange={(e) => handleConfigChange('criticalEnabled', e.target.checked)}
                    disabled={!timerConfig.enabled}
                    className="setting-checkbox"
                  />
                  Critical Time Warning (15s)
                </label>
                <button
                  className="test-sound-button"
                  onClick={() => testSound('critical')}
                  disabled={!timerConfig.enabled || !timerConfig.criticalEnabled}
                >
                  Test Sound
                </button>
              </div>

              <div className="sound-setting">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={timerConfig.tickEnabled}
                    onChange={(e) => handleConfigChange('tickEnabled', e.target.checked)}
                    disabled={!timerConfig.enabled}
                    className="setting-checkbox"
                  />
                  Timer Tick Sounds
                </label>
                <p className="setting-description">
                  Play subtle tick sounds while timer is running (may be distracting)
                </p>
              </div>

              <div className="sound-setting">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={timerConfig.moveEnabled}
                    onChange={(e) => handleConfigChange('moveEnabled', e.target.checked)}
                    disabled={!timerConfig.enabled}
                    className="setting-checkbox"
                  />
                  Move Confirmation Sounds
                </label>
                <p className="setting-description">Play confirmation sounds when making moves</p>
              </div>

              <div className="sound-setting">
                <div className="setting-label">Timer Expiration Sound</div>
                <button
                  className="test-sound-button"
                  onClick={() => testSound('expired')}
                  disabled={!timerConfig.enabled}
                >
                  Test Sound
                </button>
                <p className="setting-description">Plays when timer reaches zero (always enabled)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="section-title">Timer Statistics</h2>
          {analytics && analytics.stats.totalTimedGames > 0 ? (
            <div className="setting-group">
              <div className="stats-overview">
                <h3 className="subsection-title">Performance Overview</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{analytics.stats.totalTimedGames}</div>
                    <div className="stat-label">Timed Games</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{Math.round(analytics.stats.averageGameDuration / 60)}</div>
                    <div className="stat-label">Avg Game (min)</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{analytics.stats.averageMoveTime.toFixed(1)}s</div>
                    <div className="stat-label">Avg Move Time</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{analytics.stats.timeManagementScore}</div>
                    <div className="stat-label">Time Score</div>
                  </div>
                </div>
              </div>

              <div className="stats-detailed">
                <h3 className="subsection-title">Win/Loss Record</h3>
                <div className="stats-row">
                  <span>Wins: {analytics.stats.winLossRecord.wins}</span>
                  <span>Losses: {analytics.stats.winLossRecord.losses}</span>
                  <span>Timeouts: {analytics.stats.winLossRecord.timeouts}</span>
                </div>
              </div>

              {analytics.insights.length > 0 && (
                <div className="stats-insights">
                  <h3 className="subsection-title">Insights</h3>
                  <ul className="insights-list">
                    {analytics.insights.map((insight, index) => (
                      <li key={index} className="insight-item">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analytics.recommendations.length > 0 && (
                <div className="stats-recommendations">
                  <h3 className="subsection-title">Recommendations</h3>
                  <ul className="recommendations-list">
                    {analytics.recommendations.map((recommendation, index) => (
                      <li key={index} className="recommendation-item">
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="analytics-actions">
                <button className="export-button secondary" onClick={exportAnalytics}>
                  Export Data
                </button>
                <label className="import-button secondary">
                  Import Data
                  <input type="file" accept=".json" onChange={importAnalytics} style={{ display: 'none' }} />
                </label>
                <button className="reset-analytics-button secondary" onClick={resetAnalytics}>
                  Reset Statistics
                </button>
              </div>
            </div>
          ) : (
            <div className="setting-info">
              <p className="info-description">Play some timed games to see your performance statistics here!</p>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2 className="section-title">Accessibility</h2>
          <div className="setting-group">
            <div className="setting-info">
              <h3 className="info-title">Motion Sensitivity</h3>
              <p className="info-description">
                Timer animations automatically respect your system&apos;s &quot;reduce motion&quot; preference. To
                disable animations, enable &quot;Reduce motion&quot; in your system accessibility settings.
              </p>
            </div>
            <div className="setting-info">
              <h3 className="info-title">Screen Reader Support</h3>
              <p className="info-description">
                Timer components include ARIA labels and live regions for screen reader compatibility. Timer updates are
                announced appropriately to assistive technologies.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="save-button primary" onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>

        <button className="reset-button secondary" onClick={resetToDefaults} disabled={isSaving}>
          Reset to Defaults
        </button>

        <Link className="back-button secondary" to="/">
          Back to Menu
        </Link>
      </div>

      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('Failed') ? 'error' : 'success'}`}>{saveMessage}</div>
      )}
    </div>
  );
};
