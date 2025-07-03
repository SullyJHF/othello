import { test, expect } from '@playwright/test';

test.describe('Game Initialization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main menu
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="main-menu"]');
  });

  test('should display main menu correctly', async ({ page }) => {
    // Verify main menu elements are present
    await expect(page.locator('[data-testid="game-title"]')).toHaveText('Othello');
    await expect(page.locator('[data-testid="host-game-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="join-game-button"]')).toBeVisible();
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/current/main-menu.png',
      fullPage: true 
    });
  });

  test('should start debug game when debug mode is enabled', async ({ page }) => {
    // Enable debug mode by setting environment variable
    // Note: This would typically be set before running tests
    
    // Look for debug game button (might not be visible if debug mode is off)
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (await debugButton.isVisible()) {
      // Click debug game button
      await debugButton.click();
      
      // Wait for navigation to game page
      await page.waitForURL('**/game/**');
      
      // Verify we're on a game page
      await expect(page.locator('[data-testid="game-board-container"]')).toBeVisible();
      
      // Take screenshot of the initial game state
      await page.screenshot({ 
        path: 'tests/playwright/screenshots/current/debug-game-initialized.png',
        fullPage: true 
      });
    } else {
      // Skip test if debug mode is not enabled
      test.skip(true, 'Debug mode not enabled - skipping debug game test');
    }
  });

  test('should display initial game board correctly', async ({ page }) => {
    // Try to start a debug game first
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await page.waitForURL('**/game/**');
      
      // Wait for game board to load
      await page.waitForSelector('[data-testid="board"]');
      
      // Verify initial board state - standard Othello starting position
      // Center positions should have pieces: 27=white, 28=black, 35=black, 36=white
      await expect(page.locator('[data-testid="piece-white-27"]')).toBeVisible();
      await expect(page.locator('[data-testid="piece-black-28"]')).toBeVisible();
      await expect(page.locator('[data-testid="piece-black-35"]')).toBeVisible();
      await expect(page.locator('[data-testid="piece-white-36"]')).toBeVisible();
      
      // Verify there are valid moves available (positions marked with data-valid-move)
      const validMoves = page.locator('[data-valid-move="true"]');
      const validMoveCount = await validMoves.count();
      expect(validMoveCount).toBeGreaterThan(0);
      
      // Take screenshot of initial board state
      await page.screenshot({ 
        path: 'tests/playwright/screenshots/current/initial-board-state.png',
        fullPage: true 
      });
    } else {
      test.skip(true, 'Debug mode not enabled - skipping board initialization test');
    }
  });

  test('should navigate to host game page', async ({ page }) => {
    // Click host game button
    await page.click('[data-testid="host-game-button"]');
    
    // Wait for navigation
    await page.waitForURL('**/host');
    
    // Verify we're on the host page
    await expect(page).toHaveURL(/.*host$/);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/current/host-game-page.png',
      fullPage: true 
    });
  });

  test('should navigate to join game page', async ({ page }) => {
    // Click join game button
    await page.click('[data-testid="join-game-button"]');
    
    // Wait for navigation
    await page.waitForURL('**/join');
    
    // Verify we're on the join page
    await expect(page).toHaveURL(/.*join$/);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/current/join-game-page.png',
      fullPage: true 
    });
  });
});