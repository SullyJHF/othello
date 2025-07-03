# Playwright MCP Quick Start Guide

## 🎭 What is Playwright MCP?

Playwright MCP (Model Context Protocol) enables Claude Code to directly control browsers and interact with your Othello game application. This means I can:

- **Take screenshots automatically** during debugging
- **Test your game flows** end-to-end without manual effort
- **Detect visual regressions** when UI changes
- **Run cross-browser tests** across Chrome, Firefox, and Safari
- **Automate testing workflows** integrated with your development process

## 🚀 Quick Setup

### 1. Install Playwright

```bash
npm install --save-dev @playwright/test playwright
npx playwright install
```

### 2. Configure MCP for Claude Code

Add Playwright MCP to your Claude Code configuration:

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

Or manually add to `~/.config/claude-code/config.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "chrome",
        "--allowed-origins", "http://localhost:3000",
        "--isolated"
      ]
    }
  }
}
```

### 3. Start Development Server

```bash
npm start
```

### 4. Test the Integration

Once MCP is configured, try these commands with Claude:

```
"Use playwright to open localhost:3000 and take a screenshot"
"Click on the debug game button and start a new game"
"Test the game board functionality"
```

## 🎮 Common Usage Scenarios

### Testing Debug Mode

```
"Start a debug game and test the auto-play functionality"
"Capture screenshots of the game board at different states"
"Test the debug panel controls"
```

### Visual Regression Testing

```bash
# Create baseline screenshots
npm run playwright:visual --update

# Run visual regression tests
npm run playwright:visual
```

### Cross-Browser Testing

```bash
# Test across all browsers
npm run playwright:cross-browser
```

### Mobile Testing

```
"Test the game on mobile viewport"
"Check responsive design on tablet size"
```

## 📁 Project Structure

```
tests/playwright/
├── configs/              # Configuration files
├── tests/                # Test scenarios
│   ├── game-initialization.spec.ts
│   ├── game-flow.spec.ts
│   ├── debug-panel.spec.ts
│   ├── responsive-design.spec.ts
│   └── visual-regression.spec.ts
├── fixtures/             # Test data
├── screenshots/          # Visual testing
│   ├── baselines/       # Reference images
│   ├── current/         # Current test images
│   └── diffs/           # Visual differences
└── reports/             # Test reports
```

## 🛠️ Available Commands

### Development

```bash
npm run playwright:dev        # Development workflow
npm run playwright:test       # Run all tests
npm run playwright:visual     # Visual regression tests
npm run playwright:production # Test production build
```

### Debugging

```bash
npm run test:playwright:headed  # Run with visible browser
npm run test:playwright:debug   # Debug mode
npm run test:playwright:ui      # UI interface
```

### Maintenance

```bash
npm run playwright:clean     # Clean artifacts
npm run playwright:report    # Generate reports
```

## 🤖 Claude Code Integration

With MCP configured, you can use natural language commands:

### Game Testing
- "Test the initial game board setup"
- "Make a move and verify the board updates"
- "Test the multiplayer lobby functionality"

### Debug Features
- "Enable auto-play and capture screenshots"
- "Test all debug panel controls"
- "Verify the debug mode works correctly"

### Visual Validation
- "Take a screenshot of the current game state"
- "Compare the current UI with the baseline"
- "Test the responsive design on different screen sizes"

### Performance Testing
- "Measure the game's loading performance"
- "Test the auto-play speed at maximum settings"
- "Check memory usage during extended gameplay"

## 🔧 Configuration

### Environment Variables

```bash
# For development
export PLAYWRIGHT_BASE_URL=http://localhost:3000
export REACT_APP_DEBUG_ENABLED=true

# For CI/CD
export PLAYWRIGHT_HEADLESS=true
export PLAYWRIGHT_PRODUCTION=true
```

### Debug Mode Requirements

To test debug features, ensure debug mode is enabled:

```bash
export REACT_APP_DEBUG_ENABLED=true
npm start
```

## 📊 Test Types

### 1. Functional Tests
- Game initialization
- Move validation
- Score calculation
- Game completion

### 2. Visual Tests
- UI consistency
- Responsive design
- Theme variations
- Cross-browser appearance

### 3. Integration Tests
- Socket.IO communication
- Real-time updates
- Multiplayer flows
- Debug panel integration

### 4. Performance Tests
- Page load times
- Move response times
- Memory usage
- Auto-play performance

## 🚨 Troubleshooting

### Common Issues

**Server not ready**: Ensure `npm start` is running
```bash
npm start
# Wait for "webpack compiled successfully"
```

**Browser not found**: Reinstall browsers
```bash
npx playwright install
```

**Debug mode not available**: Enable debug mode
```bash
export REACT_APP_DEBUG_ENABLED=true
npm start
```

**Permission errors**: Check screenshot directory permissions
```bash
chmod -R 755 tests/playwright/screenshots/
```

## 📈 CI/CD Integration

The project includes GitHub Actions workflow for automated testing:

- **Pull Requests**: Visual regression testing
- **Main Branch**: Full cross-browser testing
- **Manual Triggers**: Configurable test suites

View results in GitHub Actions artifacts and PR comments.

## 📖 Next Steps

1. **Start with basics**: Use Claude to take screenshots of your game
2. **Test debug features**: Explore auto-play and debug panel testing
3. **Visual regression**: Set up baselines for your UI components
4. **Expand coverage**: Add tests for new features as you develop them
5. **CI/CD**: Enable automated testing in your deployment pipeline

## 📚 Additional Resources

- **Detailed Guide**: See `docs/PLAYWRIGHT_INTEGRATION.md`
- **Playwright Docs**: https://playwright.dev/
- **Claude Code MCP**: https://docs.anthropic.com/en/docs/claude-code/mcp
- **Test Examples**: Explore `tests/playwright/tests/` directory

---

**Ready to start?** Try this first command with Claude:

```
"Use playwright to open localhost:3000, take a screenshot, and tell me what you see"
```
