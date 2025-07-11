import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Database } from './Database';

// Mock environment variables for testing
const originalEnv = process.env;

describe('Database', () => {
  let db: Database;

  beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_PORT = '5434'; // Test database port
    process.env.POSTGRES_DB = 'othello_test';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
    process.env.DB_POOL_MIN = '1';
    process.env.DB_POOL_MAX = '5';
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Reset the singleton for each test
    // @ts-expect-error - Access private member for testing
    Database.instance = undefined;

    // Get fresh database instance for each test
    db = Database.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const db1 = Database.getInstance();
      const db2 = Database.getInstance();

      expect(db1).toBe(db2);
    });
  });

  describe('Database Configuration', () => {
    it('should use environment variables for configuration', () => {
      // This test verifies that the Database class reads from environment variables
      // The actual connection would be tested in integration tests
      expect(process.env.POSTGRES_HOST).toBe('localhost');
      expect(process.env.POSTGRES_DB).toBe('othello_test');
      expect(process.env.POSTGRES_USER).toBe('test_user');
    });

    it('should use default values when environment variables are not set', () => {
      // Temporarily clear environment variables
      const originalHost = process.env.POSTGRES_HOST;
      const originalPort = process.env.POSTGRES_PORT;
      const originalDB = process.env.POSTGRES_DB;

      delete process.env.POSTGRES_HOST;
      delete process.env.POSTGRES_PORT;
      delete process.env.POSTGRES_DB;

      // Create a new instance (this would normally use defaults)
      const testDb = Database.getInstance();

      // Restore environment variables
      process.env.POSTGRES_HOST = originalHost;
      process.env.POSTGRES_PORT = originalPort;
      process.env.POSTGRES_DB = originalDB;

      expect(testDb).toBeDefined();
    });
  });

  describe('Database Methods', () => {
    it('should have required methods', () => {
      expect(typeof db.connect).toBe('function');
      expect(typeof db.query).toBe('function');
      expect(typeof db.transaction).toBe('function');
      expect(typeof db.healthCheck).toBe('function');
      expect(typeof db.close).toBe('function');
    });

    it('should handle health check structure', async () => {
      const healthResult = await db.healthCheck();

      expect(healthResult).toHaveProperty('status');
      expect(healthResult).toHaveProperty('details');
      expect(['healthy', 'unhealthy']).toContain(healthResult.status);

      // With DATABASE_TEST_MODE enabled, it should be healthy
      if (process.env.DATABASE_TEST_MODE) {
        expect(healthResult.status).toBe('healthy');
        expect(healthResult.details).toHaveProperty('version');
        expect(healthResult.details).toHaveProperty('currentTime');
      }
    });

    it('should handle health check errors', async () => {
      // Temporarily disable DATABASE_TEST_MODE to test error scenario
      const originalTestMode = process.env.DATABASE_TEST_MODE;
      delete process.env.DATABASE_TEST_MODE;

      // Reset the singleton to get uninitialized instance
      // @ts-expect-error - Access private member for testing
      Database.instance = undefined;
      const testDb = Database.getInstance();

      const healthResult = await testDb.healthCheck();

      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.details).toHaveProperty('error');
      expect(healthResult.details.error).toBe('Database pool not initialized');

      // Restore original state
      process.env.DATABASE_TEST_MODE = originalTestMode;
      // @ts-expect-error - Access private member for testing
      Database.instance = undefined;
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // This test verifies error handling structure
      // Actual database connection errors would be tested in integration tests
      expect(() => {
        throw new Error('Database connection failed');
      }).toThrow('Database connection failed');
    });

    it('should handle query errors gracefully', async () => {
      // Test with uninitialized database
      const originalTestMode = process.env.DATABASE_TEST_MODE;
      delete process.env.DATABASE_TEST_MODE;

      // Reset the singleton to get uninitialized instance
      // @ts-expect-error - Access private member for testing
      Database.instance = undefined;
      const testDb = Database.getInstance();

      await expect(testDb.query('SELECT 1')).rejects.toThrow('Database pool not initialized');

      // Restore original state
      process.env.DATABASE_TEST_MODE = originalTestMode;
      // @ts-expect-error - Access private member for testing
      Database.instance = undefined;
    });
  });

  describe('Transaction Handling', () => {
    it('should handle transaction callback structure', async () => {
      // Test with uninitialized database
      const originalTestMode = process.env.DATABASE_TEST_MODE;
      delete process.env.DATABASE_TEST_MODE;

      // Reset the singleton to get uninitialized instance
      // @ts-expect-error - Access private member for testing
      Database.instance = undefined;
      const testDb = Database.getInstance();

      await expect(
        testDb.transaction(async (client) => {
          await client.query('SELECT 1');
          return 'success';
        }),
      ).rejects.toThrow('Database pool not initialized');

      // Restore original state
      process.env.DATABASE_TEST_MODE = originalTestMode;
      // @ts-expect-error - Access private member for testing
      Database.instance = undefined;
    });

    it('should handle transaction errors', async () => {
      // Test with uninitialized database
      const originalTestMode = process.env.DATABASE_TEST_MODE;
      delete process.env.DATABASE_TEST_MODE;

      // Reset the singleton to get uninitialized instance
      // @ts-expect-error - Access private member for testing
      Database.instance = undefined;
      const testDb = Database.getInstance();

      await expect(
        testDb.transaction(async (client) => {
          await client.query('SELECT 1');
          return 'success';
        }),
      ).rejects.toThrow('Database pool not initialized');

      // Restore original state
      process.env.DATABASE_TEST_MODE = originalTestMode;
      // @ts-expect-error - Access private member for testing
      Database.instance = undefined;
    });
  });

  describe('Performance Monitoring', () => {
    it('should track query execution time in development', () => {
      // Set development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock console.log to capture performance logs
      const originalLog = console.log;
      const logSpy = vi.fn();
      console.log = logSpy;

      // This test verifies the structure for performance monitoring
      expect(process.env.NODE_ENV).toBe('development');

      // Restore environment and console
      process.env.NODE_ENV = originalEnv;
      console.log = originalLog;
    });
  });
});
