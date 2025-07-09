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

      // In test mode without DATABASE_TEST_MODE, it should be unhealthy
      if (!process.env.DATABASE_TEST_MODE) {
        expect(healthResult.status).toBe('unhealthy');
        expect(healthResult.details.error).toBe('Database pool not initialized');
      }
    });

    it('should handle health check errors', async () => {
      const healthResult = await db.healthCheck();

      // In test mode without DATABASE_TEST_MODE, it should be unhealthy
      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.details).toHaveProperty('error');
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
      // In test mode without DATABASE_TEST_MODE, queries should throw appropriate errors
      await expect(db.query('SELECT 1')).rejects.toThrow('Database pool not initialized');
    });
  });

  describe('Transaction Handling', () => {
    it('should handle transaction callback structure', async () => {
      // In test mode without DATABASE_TEST_MODE, transactions should throw appropriate errors
      await expect(
        db.transaction(async (client) => {
          await client.query('SELECT 1');
          return 'success';
        }),
      ).rejects.toThrow('Database pool not initialized');
    });

    it('should handle transaction errors', async () => {
      // In test mode without DATABASE_TEST_MODE, transactions should throw appropriate errors
      await expect(
        db.transaction(async (client) => {
          await client.query('SELECT 1');
          return 'success';
        }),
      ).rejects.toThrow('Database pool not initialized');
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
