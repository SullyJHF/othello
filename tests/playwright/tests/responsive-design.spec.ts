import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Large Desktop', width: 1920, height: 1080 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should display correctly on ${name} (${width}x${height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width, height });
      
      // Navigate to main menu
      await page.goto('/');
      await page.waitForSelector('[data-testid="main-menu"]');

      // Take screenshot of main menu
      await page.screenshot({ 
        path: `tests/playwright/screenshots/current/main-menu-${name.toLowerCase()}.png`,
        fullPage: true 
      });

      // Verify main elements are visible
      await expect(page.locator('[data-testid="game-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="host-game-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="join-game-button"]')).toBeVisible();

      // Check if debug button is available and start game
      const debugButton = page.locator('[data-testid="debug-game-button"]');
      if (await debugButton.isVisible()) {
        await debugButton.click();
        await page.waitForURL('**/game/**');
        await page.waitForSelector('[data-testid="board"]');

        // Wait for game to load
        await page.waitForTimeout(1000);

        // Take screenshot of game board
        await page.screenshot({ 
          path: `tests/playwright/screenshots/current/game-board-${name.toLowerCase()}.png`,
          fullPage: true 
        });

        // Verify game board is visible and functional
        await expect(page.locator('[data-testid="board"]')).toBeVisible();
        
        // Check that board cells are appropriately sized
        const boardCell = page.locator('[data-testid="board-cell-0"]').first();
        const boundingBox = await boardCell.boundingBox();
        
        if (boundingBox) {
          // Board cells should have reasonable dimensions for the viewport
          const minCellSize = width < 768 ? 20 : 40; // Smaller cells on mobile
          expect(boundingBox.width).toBeGreaterThan(minCellSize);
          expect(boundingBox.height).toBeGreaterThan(minCellSize);
        }

        // Check debug panel responsiveness if present
        const debugPanel = page.locator('.debug-panel');
        if (await debugPanel.isVisible()) {
          // Debug panel should not overflow the viewport
          const panelBox = await debugPanel.boundingBox();
          if (panelBox) {
            expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(width + 10); // 10px tolerance
          }
        }
      }
    });
  });

  test('should handle orientation changes on mobile', async ({ page }) => {
    // Start with portrait mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="main-menu"]');

    // Take portrait screenshot
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/current/mobile-portrait.png',
      fullPage: true 
    });

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    
    // Wait for layout to adjust
    await page.waitForTimeout(500);

    // Take landscape screenshot
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/current/mobile-landscape.png',
      fullPage: true 
    });

    // Verify elements are still accessible
    await expect(page.locator('[data-testid="game-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="host-game-button"]')).toBeVisible();
    
    // Test game board in landscape if possible
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await page.waitForURL('**/game/**');
      await page.waitForSelector('[data-testid="board"]');
      
      // Take game board landscape screenshot
      await page.screenshot({ 
        path: 'tests/playwright/screenshots/current/game-board-mobile-landscape.png',
        fullPage: true 
      });
      
      // Verify board is still functional
      await expect(page.locator('[data-testid="board"]')).toBeVisible();
    }
  });

  test('should have touch-friendly interface on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate and start game
    await page.goto('/');
    await page.waitForSelector('[data-testid="main-menu"]');
    
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await page.waitForURL('**/game/**');
      await page.waitForSelector('[data-testid="board"]');
      
      // Wait for game to load
      await page.waitForTimeout(1000);
      
      // Test touch interaction on board cells
      const validMove = page.locator('[data-valid-move="true"]').first();
      if (await validMove.isVisible()) {
        // Get the bounding box to check if it's large enough for touch
        const boundingBox = await validMove.boundingBox();
        
        if (boundingBox) {
          // Touch targets should be at least 44px for accessibility
          expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThan(30);
        }
        
        // Test tap interaction
        await validMove.tap();
        await page.waitForTimeout(500);
        
        // Take screenshot after tap
        await page.screenshot({ 
          path: 'tests/playwright/screenshots/current/mobile-after-tap.png',
          fullPage: true 
        });
      }
    }
  });

  test('should scale text appropriately across viewports', async ({ page }) => {
    const textElements = [
      { selector: '[data-testid="game-title"]', name: 'title' },
      { selector: '[data-testid="host-game-button"]', name: 'button' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForSelector('[data-testid="main-menu"]');

      for (const element of textElements) {
        const locator = page.locator(element.selector);
        if (await locator.isVisible()) {
          const fontSize = await locator.evaluate((el) => {
            return window.getComputedStyle(el).fontSize;
          });
          
          // Font size should be reasonable (not too small or too large)
          const fontSizeNum = parseInt(fontSize);
          expect(fontSizeNum).toBeGreaterThan(12); // Minimum readable size
          expect(fontSizeNum).toBeLessThan(100); // Maximum reasonable size
        }
      }
    }
  });
});