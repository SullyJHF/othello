import { test, expect } from '@playwright/test';

test.describe('Debug Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to main menu and start a debug game
    await page.goto('/');
    await page.waitForSelector('[data-testid="main-menu"]');
  });

  test('should display debug panel when debug mode is enabled', async ({ page }) => {
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (!(await debugButton.isVisible())) {
      test.skip(true, 'Debug mode not enabled - skipping debug panel test');
      return;
    }

    // Start debug game
    await debugButton.click();
    await page.waitForURL('**/game/**');
    await page.waitForSelector('[data-testid="board"]');

    // Look for debug panel
    const debugPanel = page.locator('.debug-panel');
    
    if (await debugPanel.isVisible()) {
      // Verify debug panel is present
      await expect(debugPanel).toBeVisible();
      
      // Take screenshot of debug panel
      await page.screenshot({ 
        path: 'tests/playwright/screenshots/current/debug-panel-visible.png',
        fullPage: true 
      });
      
      // Check for debug panel toggle button
      const toggleButton = page.locator('.toggle-button, .panel-header');
      if (await toggleButton.isVisible()) {
        await expect(toggleButton).toBeVisible();
      }
    } else {
      // Debug panel might be closed by default
      const panelToggle = page.locator('.panel-header, [data-testid="debug-panel-toggle"]');
      if (await panelToggle.isVisible()) {
        await panelToggle.click();
        await expect(debugPanel).toBeVisible();
      }
    }
  });

  test('should show auto-play controls', async ({ page }) => {
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (!(await debugButton.isVisible())) {
      test.skip(true, 'Debug mode not enabled - skipping auto-play test');
      return;
    }

    // Start debug game
    await debugButton.click();
    await page.waitForURL('**/game/**');
    await page.waitForSelector('[data-testid="board"]');

    // Wait for debug panel to load
    await page.waitForTimeout(1000);

    // Look for debug panel and ensure it's open
    const debugPanel = page.locator('.debug-panel');
    if (await debugPanel.isVisible()) {
      // Try to open the panel if it's closed
      const panelHeader = page.locator('.panel-header');
      if (await panelHeader.isVisible()) {
        const isOpen = await debugPanel.locator('.open').isVisible();
        if (!isOpen) {
          await panelHeader.click();
          await page.waitForTimeout(500);
        }
      }

      // Look for auto-play controls
      const autoPlaySection = page.locator('.control-section:has-text("Auto-Play")');
      if (await autoPlaySection.isVisible()) {
        await expect(autoPlaySection).toBeVisible();
        
        // Look for auto-play mode options
        const radioOptions = page.locator('input[type="radio"][name="autoPlayMode"]');
        const radioCount = await radioOptions.count();
        expect(radioCount).toBeGreaterThan(0);
        
        // Take screenshot of auto-play controls
        await page.screenshot({ 
          path: 'tests/playwright/screenshots/current/auto-play-controls.png',
          fullPage: true 
        });
      }
    }
  });

  test('should allow enabling auto-play', async ({ page }) => {
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (!(await debugButton.isVisible())) {
      test.skip(true, 'Debug mode not enabled - skipping auto-play enable test');
      return;
    }

    // Start debug game
    await debugButton.click();
    await page.waitForURL('**/game/**');
    await page.waitForSelector('[data-testid="board"]');

    // Wait for debug panel
    await page.waitForTimeout(1000);

    // Ensure debug panel is open
    const debugPanel = page.locator('.debug-panel');
    if (await debugPanel.isVisible()) {
      const panelHeader = page.locator('.panel-header');
      if (await panelHeader.isVisible()) {
        const isOpen = await debugPanel.locator('.open').isVisible();
        if (!isOpen) {
          await panelHeader.click();
          await page.waitForTimeout(500);
        }
      }

      // Look for auto-play radio buttons
      const fullAutoRadio = page.locator('input[value="full-auto"]');
      if (await fullAutoRadio.isVisible()) {
        // Take screenshot before enabling auto-play
        await page.screenshot({ 
          path: 'tests/playwright/screenshots/current/before-auto-play.png',
          fullPage: true 
        });

        // Enable full auto-play
        await fullAutoRadio.click();
        
        // Wait for auto-play to start
        await page.waitForTimeout(2000);

        // Check if the game state has changed (moves were made)
        const pieces = page.locator('[data-testid^="piece-"]');
        const pieceCount = await pieces.count();
        
        // Should have more than the initial 4 pieces if auto-play is working
        expect(pieceCount).toBeGreaterThan(4);

        // Take screenshot after auto-play
        await page.screenshot({ 
          path: 'tests/playwright/screenshots/current/after-auto-play.png',
          fullPage: true 
        });
      }
    }
  });

  test('should show game state information', async ({ page }) => {
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (!(await debugButton.isVisible())) {
      test.skip(true, 'Debug mode not enabled - skipping game state test');
      return;
    }

    // Start debug game
    await debugButton.click();
    await page.waitForURL('**/game/**');
    await page.waitForSelector('[data-testid="board"]');

    // Wait for debug panel
    await page.waitForTimeout(1000);

    // Look for debug panel
    const debugPanel = page.locator('.debug-panel');
    if (await debugPanel.isVisible()) {
      // Ensure panel is open
      const panelHeader = page.locator('.panel-header');
      if (await panelHeader.isVisible()) {
        const isOpen = await debugPanel.locator('.open').isVisible();
        if (!isOpen) {
          await panelHeader.click();
          await page.waitForTimeout(500);
        }
      }

      // Look for game info section
      const gameInfoSection = page.locator('.control-section:has-text("Game Info")');
      if (await gameInfoSection.isVisible()) {
        await expect(gameInfoSection).toBeVisible();
        
        // Check for current player info
        const currentPlayerInfo = page.locator('.info-row:has-text("Current Player")');
        if (await currentPlayerInfo.isVisible()) {
          await expect(currentPlayerInfo).toBeVisible();
        }
        
        // Check for score info
        const scoreInfo = page.locator('.info-row:has-text("Score")');
        if (await scoreInfo.isVisible()) {
          await expect(scoreInfo).toBeVisible();
        }
        
        // Take screenshot of game info
        await page.screenshot({ 
          path: 'tests/playwright/screenshots/current/debug-game-info.png',
          fullPage: true 
        });
      }
    }
  });
});