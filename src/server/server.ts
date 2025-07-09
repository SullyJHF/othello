import http from 'http';
import path from 'path';
import express, { Request, Response } from 'express';
import gameModeRoutes from './api/gameModeRoutes';
import { PORT, ROOT_DIR } from './env';
import { initSocketIO } from './sockets/sockets';
import GameManager from './models/GameManager';

const devMode = process.env.NODE_ENV !== 'production';

const CLIENT_DIR = path.join(ROOT_DIR, 'dist/client');
const SERVER_DIR = path.join(ROOT_DIR, 'dist/server');

const app = express();
const httpServer = http.createServer(app);
app.disable('x-powered-by');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', gameModeRoutes);

initSocketIO(httpServer);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.VITE_VERSION || 'unknown',
    build: process.env.VITE_BUILD_HASH || 'unknown',
    branch: process.env.VITE_BUILD_BRANCH || 'unknown',
    buildTime: process.env.VITE_BUILD_TIME || 'unknown',
  });
});

// Static assets
app.use('/favicon.ico', express.static(path.join(SERVER_DIR, 'public', 'images', 'favicon.ico')));
app.use('/images', express.static(path.join(SERVER_DIR, 'public', 'images')));
app.use('/fonts', express.static(path.join(SERVER_DIR, 'public', 'fonts')));

if (devMode) {
  // Development: API and Socket.IO only, client served by Vite dev server
  console.log('🔧 Development mode: Client served by Vite dev server on port 3000');
  console.log('🔗 API and Socket.IO available on this server');
} else {
  // Production: Serve pre-built static files from Vite
  app.use('/assets', express.static(path.join(CLIENT_DIR, 'assets')));
  app.use(express.static(CLIENT_DIR));

  // Serve index.html for all routes in production (SPA fallback)
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
  });
}

// Initialize GameManager with persistence
async function initializeServer() {
  try {
    await GameManager.initialize();
    console.log('✅ GameManager initialized with persistence');
  } catch (error) {
    console.error('❌ Failed to initialize GameManager:', error);
    // Continue server startup even if persistence fails
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await GameManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await GameManager.shutdown();
  process.exit(0);
});

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT} (${devMode ? 'development' : 'production'})`);
  if (devMode) {
    console.log('🎯 In development, open http://localhost:3000 for the client');
  }

  // Initialize after server starts
  await initializeServer();
});
