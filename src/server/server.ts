import http from 'http';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import { PORT, ROOT_DIR } from './env';
import { initSocketIO } from './sockets/sockets';

const devMode = process.env.NODE_ENV !== 'production';

const CLIENT_DIR = path.join(ROOT_DIR, 'dist/client');
const SERVER_DIR = path.join(ROOT_DIR, 'dist/server');

const app = express();
const httpServer = http.createServer(app);
app.disable('x-powered-by');

initSocketIO(httpServer);

// Static assets
app.use('/favicon.ico', express.static(path.join(SERVER_DIR, 'public', 'images', 'favicon.ico')));
app.use('/images', express.static(path.join(SERVER_DIR, 'public', 'images')));
app.use('/fonts', express.static(path.join(SERVER_DIR, 'public', 'fonts')));

if (devMode) {
  // Development: Use webpack-dev-middleware
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webpack = require('webpack');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const WebpackDevMiddleware = require('webpack-dev-middleware');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const WebpackHotMiddleware = require('webpack-hot-middleware');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webpackConfig = require('../../webpack.config').default;

  const clientConfig = webpackConfig.find((config: any) => (config as { name?: string }).name === 'client');
  const compiler = webpack(clientConfig);

  app.use(
    WebpackDevMiddleware(compiler, {
      publicPath: clientConfig.output.publicPath,
    }),
  );
  app.use(WebpackHotMiddleware(compiler));
  // Serve index.html for all routes in development
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    const filename = path.join(compiler.outputPath, 'index.html');
    compiler.outputFileSystem.readFile(filename, (err: unknown, result: unknown) => {
      if (err) return next(err);
      res.set('content-type', 'text/html');
      res.send(result);
      res.end();
    });
  });
} else {
  // Production: Serve pre-built static files
  app.use('/js', express.static(path.join(CLIENT_DIR)));
  app.use('/css', express.static(path.join(CLIENT_DIR)));
  // Serve index.html for all routes in production
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} (${devMode ? 'development' : 'production'})`);
});
