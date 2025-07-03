import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('main menu visual regression', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="main-menu"]');
    
    // Wait for fonts and images to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot and compare with baseline
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('game board initial state visual regression', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="main-menu"]');
    
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await page.waitForURL('**/game/**');
      await page.waitForSelector('[data-testid="board"]');
      
      // Wait for game state to stabilize
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of initial game state
      await expect(page).toHaveScreenshot('game-board-initial.png', {
        fullPage: true,
        animations: 'disabled',
      });
    } else {
      test.skip(true, 'Debug mode not enabled - skipping visual regression test');
    }
  });

  test('game board after first move visual regression', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="main-menu"]');
    
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await page.waitForURL('**/game/**');
      await page.waitForSelector('[data-testid="board"]');
      
      // Wait for initial state
      await page.waitForTimeout(1000);
      
      // Make a move
      const validMove = page.locator('[data-valid-move="true"]').first();
      if (await validMove.isVisible()) {
        await validMove.click();
        
        // Wait for move to be processed
        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot after move
        await expect(page).toHaveScreenshot('game-board-after-move.png', {
          fullPage: true,
          animations: 'disabled',
        });
      }
    } else {
      test.skip(true, 'Debug mode not enabled - skipping visual regression test');
    }
  });

  test('debug panel visual regression', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="main-menu"]');
    
    const debugButton = page.locator('[data-testid="debug-game-button"]');
    
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await page.waitForURL('**/game/**');
      await page.waitForSelector('[data-testid="board"]');
      
      // Wait for debug panel to load
      await page.waitForTimeout(1000);
      
      // Ensure debug panel is visible and open
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
        
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of debug panel
        await expect(debugPanel).toHaveScreenshot('debug-panel.png', {
          animations: 'disabled',
        });
      }
    } else {
      test.skip(true, 'Debug mode not enabled - skipping debug panel visual regression test');
    }
  });

  test('responsive design visual regression', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForSelector('[data-testid="main-menu"]');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot for each viewport
      await expect(page).toHaveScreenshot(`main-menu-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
      
      // Test game board if debug mode is available
      const debugButton = page.locator('[data-testid="debug-game-button"]');
      if (await debugButton.isVisible()) {
        await debugButton.click();
        await page.waitForURL('**/game/**');
        await page.waitForSelector('[data-testid="board"]');
        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle');
        
        await expect(page).toHaveScreenshot(`game-board-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
        });
        
        // Go back to main menu for next iteration
        await page.goto('/');
        await page.waitForSelector('[data-testid="main-menu"]');
      }
    }
  });

  test('theme variations visual regression', async ({ page }) => {
    // This test assumes theme switching functionality exists
    // For now, we'll test the default theme
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="main-menu"]');
    await page.waitForLoadState('networkidle');
    
    // Test default theme
    await expect(page).toHaveScreenshot('main-menu-default-theme.png', {
      fullPage: true,
      animations: 'disabled',
    });
    
    // If dark mode or other themes are available, test them here
    // For example, if there's a theme toggle:
    // const themeToggle = page.locator('[data-testid="theme-toggle"]');
    // if (await themeToggle.isVisible()) {
    //   await themeToggle.click();
    //   await page.waitForTimeout(500);
    //   await expect(page).toHaveScreenshot('main-menu-dark-theme.png');
    // }
  });

  test('game over modal visual regression', async ({ page }) => {
    // This test would ideally trigger a game completion
    // For now, we'll skip it as it requires auto-play to complete a game
    test.skip(true, 'Game over modal test requires game completion - implement with auto-play');
    
    // Future implementation:
    // 1. Start debug game
    // 2. Enable auto-play at high speed
    // 3. Wait for game completion
    // 4. Take screenshot of game over modal
  });

  test('loading states visual regression', async ({ page }) => {
    // Test loading states if they exist
    await page.goto('/');
    
    // Capture any loading spinners or states
    const loadingElements = page.locator('[data-testid*="loading"], .loading, .spinner');
    
    if (await loadingElements.first().isVisible()) {
      await expect(loadingElements.first()).toHaveScreenshot('loading-state.png', {
        animations: 'disabled',
      });
    }
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="main-menu"]');
    await page.waitForLoadState('networkidle');
  });

  test('error states visual regression', async ({ page }) => {
    // Test error states if they can be triggered
    // This might involve testing network failures or invalid game states
    
    // For now, we'll skip this test
    test.skip(true, 'Error state testing requires specific error conditions');
    
    // Future implementation:
    // 1. Trigger network errors
    // 2. Trigger invalid game states
    // 3. Capture error messages and UI
  });
});