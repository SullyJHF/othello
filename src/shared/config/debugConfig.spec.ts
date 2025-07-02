/**
 * Tests for debug configuration system
 */

import { 
  getDebugConfig, 
  getServerDebugConfig, 
  isDebugFeatureEnabled, 
  debugLog,
  resetClientDebugConfig,
  resetServerDebugConfig 
} from './debugConfig';

// Mock environment variables
const originalEnv = process.env;

describe('debugConfig', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    resetClientDebugConfig();
    resetServerDebugConfig();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getDebugConfig', () => {
    it('should return all features disabled when REACT_APP_DEBUG_ENABLED is false', () => {
      process.env.REACT_APP_DEBUG_ENABLED = 'false';
      
      const config = getDebugConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.features.dummyGame).toBe(false);
      expect(config.features.autoPlay).toBe(false);
      expect(config.features.gameStateInspector).toBe(false);
      expect(config.features.performanceMonitor).toBe(false);
    });

    it('should return all features disabled when REACT_APP_DEBUG_ENABLED is not set', () => {
      delete process.env.REACT_APP_DEBUG_ENABLED;
      
      const config = getDebugConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.features.dummyGame).toBe(false);
      expect(config.features.autoPlay).toBe(false);
      expect(config.features.gameStateInspector).toBe(false);
      expect(config.features.performanceMonitor).toBe(false);
    });

    it('should enable debug mode with default features when REACT_APP_DEBUG_ENABLED is true', () => {
      process.env.REACT_APP_DEBUG_ENABLED = 'true';
      
      const config = getDebugConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.features.dummyGame).toBe(true); // Default enabled
      expect(config.features.autoPlay).toBe(true); // Default enabled
      expect(config.features.gameStateInspector).toBe(false); // Default disabled
      expect(config.features.performanceMonitor).toBe(false); // Default disabled
    });

    it('should respect individual feature flags when debug is enabled', () => {
      process.env.REACT_APP_DEBUG_ENABLED = 'true';
      process.env.REACT_APP_DEBUG_DUMMY_GAME = 'false';
      process.env.REACT_APP_DEBUG_AUTO_PLAY = 'false';
      process.env.REACT_APP_DEBUG_GAME_INSPECTOR = 'true';
      process.env.REACT_APP_DEBUG_PERFORMANCE = 'true';
      
      const config = getDebugConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.features.dummyGame).toBe(false);
      expect(config.features.autoPlay).toBe(false);
      expect(config.features.gameStateInspector).toBe(true);
      expect(config.features.performanceMonitor).toBe(true);
    });
  });

  describe('getServerDebugConfig', () => {
    it('should return all features disabled when NODE_DEBUG_ENABLED is false', () => {
      process.env.NODE_DEBUG_ENABLED = 'false';
      
      const config = getServerDebugConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.features.dummyGame).toBe(false);
      expect(config.features.autoPlay).toBe(false);
      expect(config.features.gameStateInspector).toBe(false);
      expect(config.features.performanceMonitor).toBe(false);
    });

    it('should enable debug mode with default features when NODE_DEBUG_ENABLED is true', () => {
      process.env.NODE_DEBUG_ENABLED = 'true';
      
      const config = getServerDebugConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.features.dummyGame).toBe(true);
      expect(config.features.autoPlay).toBe(true);
      expect(config.features.gameStateInspector).toBe(false);
      expect(config.features.performanceMonitor).toBe(false);
    });
  });

  describe('isDebugFeatureEnabled', () => {
    it('should return false when debug mode is disabled', () => {
      process.env.REACT_APP_DEBUG_ENABLED = 'false';
      
      expect(isDebugFeatureEnabled('dummyGame')).toBe(false);
      expect(isDebugFeatureEnabled('autoPlay')).toBe(false);
    });

    it('should return correct values when debug mode is enabled', () => {
      process.env.REACT_APP_DEBUG_ENABLED = 'true';
      process.env.REACT_APP_DEBUG_DUMMY_GAME = 'true';
      process.env.REACT_APP_DEBUG_AUTO_PLAY = 'false';
      
      expect(isDebugFeatureEnabled('dummyGame')).toBe(true);
      expect(isDebugFeatureEnabled('autoPlay')).toBe(false);
    });
  });

  describe('debugLog', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should not log when debug mode is disabled', () => {
      process.env.REACT_APP_DEBUG_ENABLED = 'false';
      
      debugLog('test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log when debug mode is enabled', () => {
      process.env.REACT_APP_DEBUG_ENABLED = 'true';
      
      debugLog('test message', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] test message', { data: 'test' });
    });
  });
});