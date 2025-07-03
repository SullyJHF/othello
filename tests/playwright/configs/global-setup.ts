import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs once before all tests to prepare the testing environment
 */
async function globalSetup(config: FullConfig) {
  console.log('🎭 Setting up Playwright test environment...');
  
  // Get base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  
  // Launch browser to warm up and verify server is running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log(`🌐 Checking if server is running at ${baseURL}...`);
    
    // Try to navigate to the base URL with a shorter timeout
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for the main content to load
    await page.waitForSelector('[data-testid="main-menu"], body', { timeout: 10000 });
    
    console.log('✅ Server is ready for testing');
    
    // Take a screenshot of the initial state for debugging
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/current/global-setup-verification.png' 
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to server:', error);
    console.log('⚠️ Continuing with tests - server might be available for individual tests');
    // Don't throw error to allow tests to run anyway
  } finally {
    await browser.close();
  }
  
  console.log('🎭 Playwright test environment ready');
}

export default globalSetup;