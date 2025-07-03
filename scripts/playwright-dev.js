#!/usr/bin/env node

/**
 * Playwright Development Workflow Integration Script
 * Provides convenient commands for running Playwright tests during development
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  production: process.env.PLAYWRIGHT_PRODUCTION === 'true',
  headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  debugMode: process.env.REACT_APP_DEBUG_ENABLED === 'true',
  screenshotDir: './tests/playwright/screenshots',
  reportDir: './tests/playwright/reports',
};

// Command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🎭';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`);
  }
}

function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${cmd} ${args.join(' ')}`);
    const process = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function checkServerStatus() {
  try {
    const response = await fetch(CONFIG.baseURL);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function waitForServer(maxAttempts = 30) {
  log(`Waiting for server at ${CONFIG.baseURL}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkServerStatus()) {
      log('Server is ready!', 'success');
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    log(`Attempt ${i + 1}/${maxAttempts}...`);
  }
  
  throw new Error(`Server not ready after ${maxAttempts} attempts`);
}

// Command implementations
async function runTests(options = {}) {
  ensureDirectoryExists(CONFIG.screenshotDir);
  ensureDirectoryExists(CONFIG.reportDir);
  
  const playwrightArgs = ['test'];
  
  if (options.headed) playwrightArgs.push('--headed');
  if (options.debug) playwrightArgs.push('--debug');
  if (options.ui) playwrightArgs.push('--ui');
  if (options.project) playwrightArgs.push('--project', options.project);
  if (options.grep) playwrightArgs.push('--grep', options.grep);
  if (options.updateSnapshots) playwrightArgs.push('--update-snapshots');
  
  // Set environment variables
  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: CONFIG.baseURL,
    PLAYWRIGHT_PRODUCTION: CONFIG.production.toString(),
    PLAYWRIGHT_HEADLESS: CONFIG.headless.toString(),
  };
  
  await runCommand('npx', ['playwright', ...playwrightArgs], { env });
}

async function startDevWorkflow() {
  log('Starting development workflow with Playwright integration');
  
  try {
    // Check if development server is running
    const serverRunning = await checkServerStatus();
    
    if (!serverRunning) {
      log('Development server not running. Please start it with: npm start');
      process.exit(1);
    }
    
    // Run tests in watch mode
    await runTests({ headed: !CONFIG.headless, grep: 'game-initialization' });
    
  } catch (error) {
    log(`Development workflow failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

async function testProduction() {
  log('Testing production build with Playwright');
  
  try {
    // Build production version
    log('Building production version...');
    await runCommand('npm', ['run', 'build']);
    
    // Start production server in background
    log('Starting production server...');
    const serverProcess = spawn('npm', ['run', 'serve'], {
      stdio: 'pipe',
      detached: true
    });
    
    // Wait for server to be ready
    await waitForServer();
    
    // Run full test suite
    await runTests({ project: 'chromium' });
    
    // Clean up
    log('Stopping production server...');
    process.kill(-serverProcess.pid);
    
    log('Production testing completed!', 'success');
    
  } catch (error) {
    log(`Production testing failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

async function visualRegression() {
  log('Running visual regression tests');
  
  try {
    await runTests({ 
      grep: 'visual-regression',
      updateSnapshots: args.includes('--update')
    });
    
    log('Visual regression tests completed!', 'success');
    
  } catch (error) {
    log(`Visual regression tests failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

async function crossBrowser() {
  log('Running cross-browser tests');
  
  const browsers = ['chromium', 'firefox', 'webkit'];
  
  for (const browser of browsers) {
    try {
      log(`Testing on ${browser}...`);
      await runTests({ project: browser });
      log(`${browser} tests passed!`, 'success');
    } catch (error) {
      log(`${browser} tests failed: ${error.message}`, 'error');
    }
  }
}

async function generateReport() {
  log('Generating Playwright test report...');
  
  try {
    await runCommand('npx', ['playwright', 'show-report']);
  } catch (error) {
    log(`Failed to generate report: ${error.message}`, 'error');
  }
}

async function cleanScreenshots() {
  log('Cleaning screenshot directories...');
  
  const dirs = [
    './tests/playwright/screenshots/current',
    './tests/playwright/screenshots/diffs',
    './tests/playwright/test-results'
  ];
  
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      log(`Cleaned: ${dir}`);
    }
  }
  
  log('Screenshot cleanup completed!', 'success');
}

// Main command handler
async function main() {
  switch (command) {
    case 'dev':
      await startDevWorkflow();
      break;
      
    case 'test':
      await runTests({ 
        headed: args.includes('--headed'),
        debug: args.includes('--debug'),
        ui: args.includes('--ui'),
      });
      break;
      
    case 'production':
      await testProduction();
      break;
      
    case 'visual':
      await visualRegression();
      break;
      
    case 'cross-browser':
      await crossBrowser();
      break;
      
    case 'report':
      await generateReport();
      break;
      
    case 'clean':
      await cleanScreenshots();
      break;
      
    case 'help':
    default:
      console.log(`
Playwright Development Workflow Script

Usage: node scripts/playwright-dev.js <command> [options]

Commands:
  dev             Start development workflow with test watching
  test            Run Playwright tests (add --headed, --debug, --ui)
  production      Build and test production version
  visual          Run visual regression tests (add --update to update baselines)
  cross-browser   Run tests across all configured browsers
  report          Generate and show test report
  clean           Clean screenshot and test result directories
  help            Show this help message

Environment Variables:
  PLAYWRIGHT_BASE_URL       Base URL for tests (default: http://localhost:3000)
  PLAYWRIGHT_PRODUCTION     Use production build (default: false)
  PLAYWRIGHT_HEADLESS       Run in headless mode (default: true)
  REACT_APP_DEBUG_ENABLED   Enable debug mode features (default: false)

Examples:
  node scripts/playwright-dev.js dev
  node scripts/playwright-dev.js test --headed --debug
  node scripts/playwright-dev.js visual --update
  node scripts/playwright-dev.js production
      `);
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`Script failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runTests,
  startDevWorkflow,
  testProduction,
  visualRegression,
  crossBrowser,
  generateReport,
  cleanScreenshots,
};