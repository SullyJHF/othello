import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * Runs once after all tests to clean up the testing environment
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up Playwright test environment...');
  
  // Add any cleanup logic here if needed
  // For example: database cleanup, file cleanup, etc.
  
  console.log('✅ Playwright test environment cleaned up');
}

export default globalTeardown;