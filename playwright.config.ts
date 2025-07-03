import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Othello Game Testing
 * Supports local development, production builds, and CI/CD environments
 */
export default defineConfig({
  // Test directory
  testDir: './tests/playwright/tests',
  
  // Test file patterns
  testMatch: '**/*.spec.ts',
  
  // Parallel execution
  fullyParallel: true,
  
  // Fail build on CI if tests were written accidentally
  forbidOnly: !!process.env.CI,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Workers configuration
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/playwright/reports' }],
    ['json', { outputFile: 'tests/playwright/reports/results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // Global test configuration
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Browser configuration
    headless: process.env.PLAYWRIGHT_HEADLESS === 'true' || process.env.CI === 'true',
    viewport: { width: 1280, height: 720 },
    
    // Screenshot configuration
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
    
    // Trace collection
    trace: 'on-first-retry',
    
    // Timeout configuration
    actionTimeout: 15000,
    navigationTimeout: 45000,
  },

  // Visual comparison configuration
  expect: {
    // Visual comparison threshold
    threshold: 0.2,
    toHaveScreenshot: {
      // Animation handling
      animations: 'disabled',
      // Retry configuration for visual tests
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Web server configuration for testing
  webServer: {
    command: process.env.PLAYWRIGHT_PRODUCTION ? 'npm run serve' : 'npm start',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },

  // Output directory
  outputDir: 'tests/playwright/test-results',
  
  // Global timeout
  timeout: 60 * 1000, // 60 seconds per test
  
  // Global setup/teardown
  globalSetup: './tests/playwright/configs/global-setup.ts',
  globalTeardown: './tests/playwright/configs/global-teardown.ts',
});