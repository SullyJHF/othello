/**
 * Debug configuration system for development and testing utilities
 *
 * This system provides feature flags for debugging tools that can be enabled
 * in both development and production environments for testing purposes,
 * but are completely disabled when not needed to ensure zero overhead.
 */

export interface DebugConfig {
  enabled: boolean;
  features: {
    dummyGame: boolean;
    autoPlay: boolean;
    gameStateInspector: boolean;
    performanceMonitor: boolean;
  };
}

/**
 * Get debug configuration based on environment variables
 *
 * Environment Variables:
 * - VITE_DEBUG_ENABLED: Master switch for all debug features
 * - VITE_DEBUG_DUMMY_GAME: Enable dummy game creation
 * - VITE_DEBUG_AUTO_PLAY: Enable auto-play functionality
 * - VITE_DEBUG_GAME_INSPECTOR: Enable game state inspector
 * - VITE_DEBUG_PERFORMANCE: Enable performance monitoring
 */
export function getDebugConfig(): DebugConfig {
  // Master debug switch - if false, all debug features are disabled
  const debugEnabled = process.env.VITE_DEBUG_ENABLED === 'true';

  if (!debugEnabled) {
    return {
      enabled: false,
      features: {
        dummyGame: false,
        autoPlay: false,
        gameStateInspector: false,
        performanceMonitor: false,
      },
    };
  }

  // Individual feature flags (only checked if debug is enabled)
  return {
    enabled: true,
    features: {
      dummyGame: process.env.VITE_DEBUG_DUMMY_GAME !== 'false', // Default enabled
      autoPlay: process.env.VITE_DEBUG_AUTO_PLAY !== 'false', // Default enabled
      gameStateInspector: process.env.VITE_DEBUG_GAME_INSPECTOR === 'true',
      performanceMonitor: process.env.VITE_DEBUG_PERFORMANCE === 'true',
    },
  };
}

/**
 * Server-side debug configuration
 * Uses NODE_DEBUG_ENABLED instead of REACT_APP_ prefix
 */
export function getServerDebugConfig(): DebugConfig {
  const debugEnabled = process.env.NODE_DEBUG_ENABLED === 'true';

  if (!debugEnabled) {
    return {
      enabled: false,
      features: {
        dummyGame: false,
        autoPlay: false,
        gameStateInspector: false,
        performanceMonitor: false,
      },
    };
  }

  return {
    enabled: true,
    features: {
      dummyGame: process.env.NODE_DEBUG_DUMMY_GAME !== 'false',
      autoPlay: process.env.NODE_DEBUG_AUTO_PLAY !== 'false',
      gameStateInspector: process.env.NODE_DEBUG_GAME_INSPECTOR === 'true',
      performanceMonitor: process.env.NODE_DEBUG_PERFORMANCE === 'true',
    },
  };
}

/**
 * Singleton instance for client-side usage
 */
let clientDebugConfig: DebugConfig | null = null;

export function getClientDebugConfig(): DebugConfig {
  if (clientDebugConfig === null) {
    clientDebugConfig = getDebugConfig();
  }
  return clientDebugConfig;
}

/**
 * Reset client debug config (for testing purposes)
 */
export function resetClientDebugConfig(): void {
  clientDebugConfig = null;
}

/**
 * Singleton instance for server-side usage
 */
let serverDebugConfigInstance: DebugConfig | null = null;

export function getServerDebugConfigInstance(): DebugConfig {
  if (serverDebugConfigInstance === null) {
    serverDebugConfigInstance = getServerDebugConfig();
  }
  return serverDebugConfigInstance;
}

/**
 * Reset server debug config (for testing purposes)
 */
export function resetServerDebugConfig(): void {
  serverDebugConfigInstance = null;
}

/**
 * Utility function to check if any debug features are enabled
 */
export function isDebugModeEnabled(): boolean {
  return getDebugConfig().enabled;
}

/**
 * Utility function to check specific debug features
 */
export function isDebugFeatureEnabled(feature: keyof DebugConfig['features']): boolean {
  const config = getDebugConfig();
  return config.enabled && config.features[feature];
}

/**
 * Debug logging utility - only logs when debug mode is enabled
 */
export function debugLog(message: string, ...args: any[]): void {
  if (isDebugModeEnabled()) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * Performance timing utility for debug mode
 */
export function debugTime(label: string): void {
  if (isDebugFeatureEnabled('performanceMonitor')) {
    console.time(`[DEBUG] ${label}`);
  }
}

export function debugTimeEnd(label: string): void {
  if (isDebugFeatureEnabled('performanceMonitor')) {
    console.timeEnd(`[DEBUG] ${label}`);
  }
}
