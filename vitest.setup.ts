import '@testing-library/jest-dom';
import 'core-js/full/set-immediate';
import { vi } from 'vitest';

// Set up test database environment variables
process.env.NODE_ENV = 'test';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5434';
process.env.POSTGRES_DB = 'othello_test';
process.env.POSTGRES_USER = 'test_user';
process.env.POSTGRES_PASSWORD = 'test_password';
process.env.DATABASE_TEST_MODE = 'true';

afterEach(() => {
  vi.clearAllMocks();
});
