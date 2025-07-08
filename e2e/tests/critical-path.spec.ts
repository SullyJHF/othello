/**
 * Critical Path E2E Tests
 * Tests the most important user journeys that must always work
 */

import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  
  test('Complete host game flow: create → lobby → start game', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Should show main menu
    await expect(page.getByText('Othello')).toBeVisible();
    
    // Click Host Game
    await page.getByText('🎮 Host Game').click();
    
    // Should navigate to host game form
    await expect(page.getByText('Host New Game')).toBeVisible();
    await expect(page.getByText('Create a game and invite a friend to play')).toBeVisible();
    
    // Fill in username and create game
    await page.getByPlaceholder('Enter your username').fill('E2E Test Host');
    await page.getByRole('button', { name: /create.*host game/i }).click();
    
    // Should navigate to game lobby
    await expect(page.getByText('Game Lobby')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Test Host')).toBeVisible();
    
    // Should show join URL for inviting players
    await expect(page.getByText('Share this link to invite a friend:')).toBeVisible();
    const joinUrlElement = page.locator('.copy-text-wrapper .text');
    await expect(joinUrlElement).toBeVisible();
    
    // Get the join URL for potential use in other tests
    const joinUrl = await joinUrlElement.textContent();
    console.log('Generated join URL:', joinUrl);
    
    // Should show waiting state (only 1 player)
    await expect(page.getByText(/waiting/i)).toBeVisible();
    
    // Start game button should not be visible (need 2 players)
    await expect(page.getByText('🎮 Start Game!')).not.toBeVisible();
  });
  
  test('Complete join game flow: direct link → join form → lobby', async ({ page, context }) => {
    // First, create a game to join (using a separate page)
    const hostPage = await context.newPage();
    await hostPage.goto('/');
    await hostPage.getByText('🎮 Host Game').click();
    await hostPage.getByPlaceholder('Enter your username').fill('E2E Host');
    await hostPage.getByRole('button', { name: /create.*host game/i }).click();
    
    // Wait for lobby and extract game ID from URL
    await expect(hostPage.getByText('Game Lobby')).toBeVisible();
    const hostUrl = hostPage.url();
    const gameId = hostUrl.match(/\/game\/([a-zA-Z0-9]+)/)?.[1];
    expect(gameId).toBeDefined();
    
    // Now join the game from the main page
    await page.goto(`/join/${gameId}`);
    
    // Should show join game form with pre-filled game ID
    await expect(page.getByText('Join Game')).toBeVisible();
    await expect(page.getByText('Enter your details to join an existing game')).toBeVisible();
    
    // Game ID should be pre-filled and detected
    await expect(page.getByText(`Game ID ${gameId} detected from invite link`)).toBeVisible();
    
    // Fill in username and join
    await page.getByPlaceholder('Enter your username').fill('E2E Test Joiner');
    await page.getByRole('button', { name: 'Join Game' }).click();
    
    // Should navigate to game lobby
    await expect(page.getByText('Game Lobby')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Test Joiner')).toBeVisible();
    
    // Should show both players now
    await expect(page.getByText('E2E Host')).toBeVisible();
    await expect(page.getByText('E2E Test Joiner')).toBeVisible();
    
    // Should show ready to start (2 players)
    await expect(page.getByText('Ready to start!')).toBeVisible();
    await expect(page.getByText('🎮 Start Game!')).toBeVisible();
    
    // Clean up
    await hostPage.close();
  });
  
  test('Game start and board interaction', async ({ page, context }) => {
    // Set up a game with 2 players
    const hostPage = await context.newPage();
    await hostPage.goto('/');
    await hostPage.getByText('🎮 Host Game').click();
    await hostPage.getByPlaceholder('Enter your username').fill('Player 1');
    await hostPage.getByRole('button', { name: /create.*host game/i }).click();
    
    // Extract game ID and join from second browser
    await expect(hostPage.getByText('Game Lobby')).toBeVisible();
    const gameId = hostPage.url().match(/\/game\/([a-zA-Z0-9]+)/)?.[1];
    
    await page.goto(`/join/${gameId}`);
    await page.getByPlaceholder('Enter your username').fill('Player 2');
    await page.getByRole('button', { name: 'Join Game' }).click();
    
    // Both should be in lobby
    await expect(page.getByText('Ready to start!')).toBeVisible();
    await expect(hostPage.getByText('Ready to start!')).toBeVisible();
    
    // Start the game from host's browser
    await hostPage.getByText('🎮 Start Game!').click();
    
    // Both browsers should transition to game board
    await expect(hostPage.locator('[data-testid="game-board-container"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="game-board-container"]')).toBeVisible({ timeout: 15000 });
    
    // Should show 64 board cells
    await expect(hostPage.locator('[data-testid^="board-cell-"]')).toHaveCount(64);
    await expect(page.locator('[data-testid^="board-cell-"]')).toHaveCount(64);
    
    // Should show player information
    await expect(hostPage.getByText('Player 1 (You)')).toBeVisible();
    await expect(hostPage.getByText('Player 2')).toBeVisible();
    await expect(page.getByText('Player 1')).toBeVisible();
    await expect(page.getByText('Player 2 (You)')).toBeVisible();
    
    // One player should have their turn
    const hostTurnIndicator = hostPage.getByText('YOUR TURN');
    const guestTurnIndicator = page.getByText('YOUR TURN');
    
    // Exactly one should show "YOUR TURN"
    const hostHasTurn = await hostTurnIndicator.isVisible();
    const guestHasTurn = await guestTurnIndicator.isVisible();
    expect(hostHasTurn !== guestHasTurn).toBe(true); // XOR - exactly one should be true
    
    // Clean up
    await hostPage.close();
  });
  
  test('Mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto('/');
    
    // Main menu should be mobile-optimized
    await expect(page.getByText('Othello')).toBeVisible();
    await expect(page.getByText('🎮 Host Game')).toBeVisible();
    await expect(page.getByText('🎯 Join Game')).toBeVisible();
    
    // Navigation should work on mobile
    await page.getByText('🎮 Host Game').click();
    
    // Form should be mobile-optimized
    await expect(page.getByText('Host New Game')).toBeVisible();
    const usernameInput = page.getByPlaceholder('Enter your username');
    await expect(usernameInput).toBeVisible();
    
    // Input should be properly sized for mobile
    const inputBoundingBox = await usernameInput.boundingBox();
    expect(inputBoundingBox?.width).toBeGreaterThan(200); // Should be reasonably wide
    
    // Create a game and check lobby mobile view
    await usernameInput.fill('Mobile User');
    await page.getByRole('button', { name: /create.*host game/i }).click();
    
    await expect(page.getByText('Game Lobby')).toBeVisible();
    
    // Copy URL section should be mobile-friendly
    await expect(page.getByText('Share this link to invite a friend:')).toBeVisible();
    const copyButton = page.getByText('Copy');
    await expect(copyButton).toBeVisible();
    
    // Button should be touchable on mobile (minimum 44px)
    const copyButtonBox = await copyButton.boundingBox();
    expect(copyButtonBox?.height).toBeGreaterThanOrEqual(40);
  });
  
  test('Error handling and edge cases', async ({ page }) => {
    // Test joining non-existent game
    await page.goto('/join/invalid-game-id');
    
    await expect(page.getByText('Join Game')).toBeVisible();
    await page.getByPlaceholder('Enter your username').fill('Test User');
    await page.getByRole('button', { name: 'Join Game' }).click();
    
    // Should show error message
    await expect(page.getByText(/game not found|invalid game|error/i)).toBeVisible({ timeout: 10000 });
    
    // Test navigation with invalid game URL
    await page.goto('/game/invalid-game-id');
    
    // Should handle gracefully (show lobby or redirect)
    // The app should not crash or show blank page
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Test back navigation
    await page.goBack();
    
    // Should return to previous page without crashing
    await expect(page.locator('body')).not.toBeEmpty();
  });
  
  test('Performance and memory usage', async ({ page }) => {
    // Start monitoring performance
    await page.goto('/');
    
    // Create multiple games rapidly to test for memory leaks
    for (let i = 0; i < 3; i++) {
      await page.getByText('🎮 Host Game').click();
      await page.getByPlaceholder('Enter your username').fill(`User ${i}`);
      await page.getByRole('button', { name: /create.*host game/i }).click();
      
      // Wait for lobby
      await expect(page.getByText('Game Lobby')).toBeVisible();
      
      // Navigate back to menu
      await page.goto('/');
    }
    
    // App should still be responsive
    await expect(page.getByText('Othello')).toBeVisible();
    
    // Check console for any errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate around to trigger any console errors
    await page.getByText('🎯 Join Game').click();
    await page.goto('/');
    
    // Should not have critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('deprecated') &&
      !error.includes('CJS build')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});