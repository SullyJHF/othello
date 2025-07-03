# Playwright MCP Integration Guide

This document provides comprehensive guidance for using Playwright MCP (Model Context Protocol) with the Othello game project for automated testing, visual regression detection, and AI-powered debugging.

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [MCP Configuration](#mcp-configuration)
4. [Development Workflow](#development-workflow)
5. [Test Scenarios](#test-scenarios)
6. [Visual Regression Testing](#visual-regression-testing)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Usage](#advanced-usage)

## Overview

Playwright MCP enables Claude Code to directly control browsers and interact with the Othello application, providing:

- **Automated Testing**: End-to-end testing of game functionality
- **Visual Regression Detection**: Automatic detection of UI changes
- **Screenshot Capture**: Automatic documentation of game states
- **Cross-browser Testing**: Validation across Chrome, Firefox, and Safari
- **Performance Monitoring**: Real-time performance metrics
- **Debug Panel Integration**: Enhanced debugging capabilities

### Key Benefits

- **Eliminates Manual Screenshots**: Claude can capture game states automatically
- **Faster Development Cycles**: Automated testing of multiplayer flows
- **Early Bug Detection**: Visual regressions caught immediately
- **Comprehensive Coverage**: Tests across devices and browsers
- **AI-Powered Debugging**: Intelligent test scenario generation

## Installation & Setup

### Prerequisites

- Node.js 18 or newer
- Othello project dependencies installed (`npm install`)
- Development server running (`npm start`)

### Install Playwright

```bash
# Install Playwright and browsers
npm install --save-dev @playwright/test playwright
npx playwright install
```

### MCP Configuration

#### Quick Setup (Recommended)

```bash
# Add Playwright MCP to Claude Code
claude mcp add playwright npx @playwright/mcp@latest
```

#### Manual Configuration

Add to your Claude Code settings (`~/.config/claude-code/config.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "chrome",
        "--allowed-origins", "http://localhost:3000,http://localhost:8080",
        "--isolated",
        "--caps", "tabs,pdf,history,wait,files"
      ],
      "env": {
        "PLAYWRIGHT_HEADLESS": "false"
      }
    }
  }
}
```

### Project Configuration

The project includes pre-configured Playwright settings:

- **`playwright.config.ts`**: Main configuration file
- **`tests/playwright/`**: Test directory structure
- **`scripts/playwright-dev.js`**: Development workflow script

## MCP Configuration

### Browser Configuration

```json
{
  "playwright": {
    "browsers": ["chromium", "firefox", "webkit"],
    "headless": false,
    "viewport": { "width": 1280, "height": 720 },
    "timeout": 30000,
    "allowedOrigins": [
      "http://localhost:3000",
      "http://localhost:8080"
    ]
  }
}
```

### Security Settings

- **Origin Restriction**: Limits browser access to specified URLs
- **Isolated Context**: Uses separate browser contexts for testing
- **Timeout Limits**: Prevents hanging automation
- **Data Protection**: No sensitive data in test configurations

## Development Workflow

### Starting Development Testing

```bash
# Start development server
npm start

# In another terminal, run Playwright development workflow
npm run playwright:dev
```

### Manual Test Execution

```bash
# Run all tests
npm run test:playwright

# Run tests with browser visible
npm run test:playwright:headed

# Run tests in debug mode
npm run test:playwright:debug

# Run tests with UI
npm run test:playwright:ui
```

### Development Script Commands

```bash
# Development workflow with watch mode
npm run playwright:dev

# Run specific test types
npm run playwright:test
npm run playwright:visual
npm run playwright:cross-browser

# Production testing
npm run playwright:production

# Generate reports
npm run playwright:report

# Clean test artifacts
npm run playwright:clean
```

## Test Scenarios

### Game Initialization Tests

Located in `tests/playwright/tests/game-initialization.spec.ts`:

- **Main Menu Display**: Verifies UI elements and navigation
- **Debug Game Creation**: Tests debug mode functionality
- **Board Initialization**: Validates initial game state
- **Navigation Testing**: Tests page routing

### Game Flow Tests

Located in `tests/playwright/tests/game-flow.spec.ts`:

- **Valid Move Testing**: Ensures moves follow game rules
- **Invalid Move Prevention**: Tests move validation
- **Score Updates**: Verifies score calculation
- **Game Over States**: Tests completion scenarios

### Debug Panel Tests

Located in `tests/playwright/tests/debug-panel.spec.ts`:

- **Panel Visibility**: Tests debug panel display
- **Auto-play Controls**: Validates auto-play functionality
- **Game State Display**: Tests real-time information
- **Speed Controls**: Tests auto-play timing

### Responsive Design Tests

Located in `tests/playwright/tests/responsive-design.spec.ts`:

- **Viewport Testing**: Tests across desktop, tablet, mobile
- **Orientation Changes**: Tests portrait/landscape switching
- **Touch Interface**: Validates mobile interactions
- **Text Scaling**: Tests typography responsiveness

## Visual Regression Testing

### Baseline Creation

```bash
# Create initial baseline screenshots
npm run playwright:visual --update
```

### Running Visual Tests

```bash
# Run visual regression tests
npm run playwright:visual

# Update baselines when changes are intentional
npm run playwright:visual --update
```

### Screenshot Organization

```
tests/playwright/screenshots/
├── baselines/          # Reference screenshots
├── current/           # Current test screenshots
└── diffs/             # Visual difference reports
```

### Visual Testing Features

- **Animation Disabled**: Consistent screenshots
- **Threshold Configuration**: Configurable diff sensitivity
- **Cross-browser Comparison**: Visual consistency validation
- **Mobile/Desktop Variants**: Responsive design validation

## CI/CD Integration

### GitHub Actions Workflow

The project includes comprehensive CI/CD integration in `.github/workflows/playwright-tests.yml`:

#### Test Matrix

- **Cross-browser**: Chrome, Firefox, Safari
- **Mobile Testing**: iOS Safari, Android Chrome
- **Visual Regression**: Automatic diff detection
- **Performance Testing**: Load time and responsiveness

#### Workflow Triggers

- **Push to main/develop**: Full test suite
- **Pull Requests**: Visual regression + core tests
- **Manual Dispatch**: Configurable test types

#### Artifact Management

- **Test Results**: Detailed test reports
- **Screenshots**: Visual regression artifacts
- **Performance Reports**: Metrics and analytics
- **HTML Reports**: Interactive test summaries

### Setting Up CI/CD

1. **Environment Variables**: Configure in GitHub repository settings
2. **Branch Protection**: Require Playwright tests to pass
3. **Artifact Retention**: Configurable storage duration
4. **Notification**: PR comments with test results

## Troubleshooting

### Common Issues

#### Server Not Ready

```
Error: Server not ready at http://localhost:3000
```

**Solution**: Ensure development server is running:
```bash
npm start
```

#### Browser Installation Issues

```
Error: Browser not found
```

**Solution**: Reinstall browsers:
```bash
npx playwright install --with-deps
```

#### Permission Errors

```
Error: Permission denied when accessing screenshots
```

**Solution**: Check directory permissions:
```bash
chmod -R 755 tests/playwright/screenshots/
```

#### Memory Issues

```
Error: Out of memory during test execution
```

**Solution**: Reduce parallel workers:
```javascript
// playwright.config.ts
workers: process.env.CI ? 1 : 2
```

### Debug Mode Issues

#### Debug Panel Not Visible

1. Verify debug mode is enabled:
   ```bash
   export REACT_APP_DEBUG_ENABLED=true
   ```

2. Check feature flags in debug configuration

3. Ensure debug build includes debug features

#### Auto-play Not Working

1. Verify debug panel is open
2. Check auto-play mode selection
3. Validate game state allows moves
4. Review browser console for errors

### Performance Issues

#### Slow Test Execution

1. **Reduce Animation**: Disable CSS animations
2. **Optimize Waits**: Use specific selector waits
3. **Parallel Execution**: Adjust worker configuration
4. **Resource Cleanup**: Ensure proper browser cleanup

#### High Memory Usage

1. **Browser Cleanup**: Close contexts after tests
2. **Screenshot Optimization**: Limit screenshot sizes
3. **Artifact Management**: Regular cleanup of test results

## Advanced Usage

### Custom Test Scenarios

Create custom test scenarios in `tests/playwright/fixtures/test-data/`:

```json
{
  "customScenario": {
    "boardState": "custom_board_state_string",
    "description": "Description of test scenario",
    "expectedOutcome": "expected_result"
  }
}
```

### Performance Testing

Add performance metrics to tests:

```typescript
test('performance metrics', async ({ page }) => {
  await page.goto('/');
  
  const loadTime = await page.evaluate(() => {
    return performance.timing.loadEventEnd - performance.timing.navigationStart;
  });
  
  expect(loadTime).toBeLessThan(3000);
});
```

### Cross-browser Configuration

Customize browser-specific tests:

```typescript
// playwright.config.ts
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    testMatch: '**/*.chrome.spec.ts'
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
    testMatch: '**/*.firefox.spec.ts'
  }
]
```

### API Testing Integration

Combine UI and API testing:

```typescript
test('game state API consistency', async ({ page, request }) => {
  // UI interaction
  await page.goto('/game/debug');
  await page.click('[data-testid="board-cell-19"]');
  
  // API validation
  const response = await request.get('/api/game/state');
  const gameState = await response.json();
  
  expect(gameState.lastMove).toBe(19);
});
```

### Mobile Device Testing

Test specific mobile devices:

```typescript
// Mobile-specific test
test.use({ 
  ...devices['iPhone 12'],
  hasTouch: true
});

test('mobile game interaction', async ({ page }) => {
  await page.goto('/');
  
  // Test touch interactions
  await page.tap('[data-testid="debug-game-button"]');
  await page.tap('[data-testid="board-cell-19"]');
});
```

### Environment Configuration

Configure for different environments:

```bash
# Development
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:playwright

# Staging
PLAYWRIGHT_BASE_URL=https://staging.othello.com npm run test:playwright

# Production
PLAYWRIGHT_PRODUCTION=true npm run playwright:production
```

## Command Reference

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run test:playwright` | Run all Playwright tests |
| `npm run test:playwright:ui` | Run tests with UI interface |
| `npm run test:playwright:headed` | Run tests with visible browser |
| `npm run test:playwright:debug` | Run tests in debug mode |
| `npm run playwright:dev` | Development workflow with watching |
| `npm run playwright:visual` | Visual regression tests |
| `npm run playwright:cross-browser` | Test across all browsers |
| `npm run playwright:production` | Test production build |
| `npm run playwright:report` | Generate test reports |
| `npm run playwright:clean` | Clean test artifacts |

### Claude Code Commands

Once MCP is configured, use these natural language commands:

```
"Use playwright to open localhost:3000 and take a screenshot"
"Click on the debug mode button and start a new game"
"Test the auto-play functionality at maximum speed"
"Verify the game board responds correctly to moves"
"Check the responsive design on mobile viewport"
"Run visual regression tests and compare with baselines"
"Test the multiplayer flow with two browser windows"
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAYWRIGHT_BASE_URL` | Base URL for tests | `http://localhost:3000` |
| `PLAYWRIGHT_HEADLESS` | Run in headless mode | `true` |
| `PLAYWRIGHT_PRODUCTION` | Use production build | `false` |
| `REACT_APP_DEBUG_ENABLED` | Enable debug features | `false` |

## Best Practices

### Test Organization

1. **Descriptive Names**: Use clear, descriptive test names
2. **Logical Grouping**: Group related tests in describe blocks
3. **Setup/Teardown**: Use beforeEach/afterEach for common setup
4. **Independent Tests**: Ensure tests can run independently

### Screenshot Management

1. **Meaningful Names**: Use descriptive screenshot filenames
2. **Regular Updates**: Update baselines when UI changes intentionally
3. **Diff Review**: Always review visual diffs before approving
4. **Cleanup**: Regular cleanup of outdated screenshots

### Performance Optimization

1. **Selective Testing**: Run only relevant tests for changes
2. **Parallel Execution**: Use appropriate worker configuration
3. **Resource Management**: Proper cleanup of browser resources
4. **Caching**: Cache dependencies and browser installations

### Maintenance

1. **Regular Updates**: Keep Playwright and browsers updated
2. **Baseline Maintenance**: Regular review and update of baselines
3. **Test Review**: Regular review of test effectiveness
4. **Documentation**: Keep test documentation current

## Support and Resources

### Getting Help

1. **GitHub Issues**: Report bugs and feature requests
2. **Playwright Documentation**: Official Playwright guides
3. **Claude Code Documentation**: MCP integration guides
4. **Team Chat**: Development team communication channels

### External Resources

- [Playwright Official Documentation](https://playwright.dev/)
- [Claude Code MCP Guide](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Visual Testing Best Practices](https://playwright.dev/docs/test-snapshots)
- [CI/CD Integration Examples](https://playwright.dev/docs/ci)

### Contributing

1. **Test Coverage**: Add tests for new features
2. **Visual Baselines**: Update baselines for UI changes
3. **Documentation**: Update guides for new functionality
4. **Review Process**: Follow code review guidelines for test changes