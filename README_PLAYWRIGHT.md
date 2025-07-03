# Playwright MCP Browser Automation Guide

## 🎭 What is Playwright MCP?

Playwright MCP (Model Context Protocol) enables Claude Code to directly control browsers and interact with your Othello game application. This means I can:

- **Take screenshots automatically** during debugging sessions
- **Navigate and interact** with your game interface in real-time
- **Test debug panel features** by clicking and controlling elements
- **Capture visual evidence** of bugs or features for analysis
- **Automate manual testing workflows** when requested

## 🚀 Quick Setup

### 1. Install Playwright

Playwright is already installed as a project dependency for MCP browser automation.

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
"Navigate to the game board and take a screenshot"
```

## 🎮 Common Usage Scenarios

### Testing Debug Mode

```
"Start a debug game and test the auto-play functionality"
"Capture screenshots of the game board at different states"
"Test the debug panel controls and show me what happens"
```

### Visual Debugging

```
"Take a screenshot of the main menu"
"Show me what the game board looks like during auto-play"
"Capture the debug panel in action"
```

### Interactive Testing

```
"Click through the game flow and document each step"
"Test the responsive design on mobile viewport"
"Interact with the debug controls and explain what each does"
```

## 🤖 Claude Code Integration

With MCP configured, you can use natural language commands:

### Game Navigation
- "Navigate to the main menu and take a screenshot"
- "Start a debug game and show me the initial board"
- "Click on a valid move and capture the result"

### Debug Features
- "Enable auto-play and document the gameplay"
- "Test all debug panel controls and explain their functions"
- "Show me how the debug mode differs from normal gameplay"

### Visual Documentation
- "Take screenshots of all major game states"
- "Document the responsive design across different screen sizes"
- "Capture error states or edge cases during gameplay"

### Browser Interaction
- "Fill out forms or input fields in the game interface"
- "Test keyboard shortcuts and hotkeys"
- "Validate tooltips and hover states"

## 🔧 Configuration

### Environment Variables

```bash
# For development
export PLAYWRIGHT_BASE_URL=http://localhost:3000
export REACT_APP_DEBUG_ENABLED=true
```

### Debug Mode Requirements

To test debug features, ensure debug mode is enabled:

```bash
export REACT_APP_DEBUG_ENABLED=true
npm start
```

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

**MCP connection issues**: Check Claude Code MCP configuration
```bash
claude mcp list
# Verify playwright MCP is listed and active
```

## 📖 Usage Examples

### Basic Screenshot Capture
Ask Claude: *"Take a screenshot of the main menu"*

### Interactive Testing
Ask Claude: *"Start a debug game, enable auto-play, and show me what happens"*

### Bug Documentation
Ask Claude: *"Reproduce this bug by clicking X and then Y, and take screenshots of each step"*

### Feature Validation
Ask Claude: *"Test the new debug panel feature and document how it works"*

## 📚 Additional Resources

- **Playwright Docs**: https://playwright.dev/
- **Claude Code MCP**: https://docs.anthropic.com/en/docs/claude-code/mcp
- **MCP Specification**: https://spec.modelcontextprotocol.io/

---

**Ready to start?** Try this first command with Claude:

```
"Use playwright to open localhost:3000, take a screenshot, and tell me what you see"
```