/**
 * Debug mode hook for managing debug utilities state and functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { getClientDebugConfig, isDebugFeatureEnabled, debugLog } from '../../shared/config/debugConfig';
import type { DebugConfig } from '../../shared/config/debugConfig';
import type { DebugPanelState, DebugAction } from '../../shared/types/debugTypes';

export interface UseDebugModeReturn {
  // Configuration
  debugConfig: DebugConfig;
  isDebugEnabled: boolean;
  
  // Feature checks
  isDummyGameEnabled: boolean;
  isAutoPlayEnabled: boolean;
  isGameInspectorEnabled: boolean;
  isPerformanceMonitorEnabled: boolean;
  
  // Debug panel state
  panelState: DebugPanelState;
  togglePanel: () => void;
  setPanelTab: (tab: DebugPanelState['activeTab']) => void;
  setPanelPosition: (position: DebugPanelState['position']) => void;
  setPanelSize: (size: DebugPanelState['size']) => void;
  
  // Debug actions
  actions: DebugAction[];
  addAction: (action: Omit<DebugAction, 'id' | 'timestamp'>) => void;
  clearActions: () => void;
  
  // Utility functions
  logDebug: (message: string, ...args: any[]) => void;
}

const initialPanelState: DebugPanelState = {
  isOpen: false,
  activeTab: 'auto-play',
  position: 'top-right',
  size: 'compact',
};

/**
 * Custom hook for managing debug mode functionality
 */
export function useDebugMode(): UseDebugModeReturn {
  const [debugConfig] = useState(() => getClientDebugConfig());
  const [panelState, setPanelState] = useState<DebugPanelState>(initialPanelState);
  const [actions, setActions] = useState<DebugAction[]>([]);

  // Feature flag checks
  const isDebugEnabled = debugConfig.enabled;
  const isDummyGameEnabled = isDebugFeatureEnabled('dummyGame');
  const isAutoPlayEnabled = isDebugFeatureEnabled('autoPlay');
  const isGameInspectorEnabled = isDebugFeatureEnabled('gameStateInspector');
  const isPerformanceMonitorEnabled = isDebugFeatureEnabled('performanceMonitor');

  // Panel controls
  const togglePanel = useCallback(() => {
    setPanelState(prev => ({ ...prev, isOpen: !prev.isOpen }));
    debugLog('Debug panel toggled', { isOpen: !panelState.isOpen });
  }, [panelState.isOpen]);

  const setPanelTab = useCallback((tab: DebugPanelState['activeTab']) => {
    setPanelState(prev => ({ ...prev, activeTab: tab }));
    debugLog('Debug panel tab changed', { tab });
  }, []);

  const setPanelPosition = useCallback((position: DebugPanelState['position']) => {
    setPanelState(prev => ({ ...prev, position }));
    debugLog('Debug panel position changed', { position });
  }, []);

  const setPanelSize = useCallback((size: DebugPanelState['size']) => {
    setPanelState(prev => ({ ...prev, size }));
    debugLog('Debug panel size changed', { size });
  }, []);

  // Action management
  const addAction = useCallback((action: Omit<DebugAction, 'id' | 'timestamp'>) => {
    const newAction: DebugAction = {
      ...action,
      id: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    setActions(prev => [newAction, ...prev].slice(0, 50)); // Keep last 50 actions
    debugLog('Debug action added', newAction);
  }, []);

  const clearActions = useCallback(() => {
    setActions([]);
    debugLog('Debug actions cleared');
  }, []);

  // Debug logging
  const logDebug = useCallback((message: string, ...args: any[]) => {
    debugLog(message, ...args);
    addAction({
      type: 'dummy-game', // Generic type for log actions
      payload: { message, args },
      result: 'success',
    });
  }, [addAction]);

  // Initialize debug mode
  useEffect(() => {
    if (isDebugEnabled) {
      debugLog('Debug mode initialized', {
        features: debugConfig.features,
        timestamp: new Date().toISOString(),
      });
      
      addAction({
        type: 'dummy-game',
        payload: { message: 'Debug mode initialized', config: debugConfig },
        result: 'success',
      });
    }
  }, [isDebugEnabled, debugConfig, addAction]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isDebugEnabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + D to toggle debug panel
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        togglePanel();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isDebugEnabled, togglePanel]);

  return {
    // Configuration
    debugConfig,
    isDebugEnabled,
    
    // Feature checks
    isDummyGameEnabled,
    isAutoPlayEnabled,
    isGameInspectorEnabled,
    isPerformanceMonitorEnabled,
    
    // Debug panel state
    panelState,
    togglePanel,
    setPanelTab,
    setPanelPosition,
    setPanelSize,
    
    // Debug actions
    actions,
    addAction,
    clearActions,
    
    // Utility functions
    logDebug,
  };
}