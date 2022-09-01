import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import webpack, { Compiler, Configuration } from 'webpack';
import WebpackDevMiddleware from 'webpack-dev-middleware';
import WebpackHotMiddleware from 'webpack-hot-middleware';
import webpackOptions from '../../webpack.config';
import { PORT, ROOT_DIR } from './env';
import GameManager from './models/GameManager';
import { initSocketIO } from './sockets/sockets';

const devMode = process.env.NODE_ENV !== 'production';

const CLIENT_DIR = path.join(ROOT_DIR, 'dist/client');
const SERVER_DIR = path.join(ROOT_DIR, 'dist/server');

const app = express();
const httpServer = http.createServer(app);
app.disable('x-powered-by');

initSocketIO(httpServer);

app.use('/favicon.ico', express.static(path.join(SERVER_DIR, 'public', 'images', 'favicon.ico')));
app.use('/images', express.static(path.join(SERVER_DIR, 'public', 'images')));
app.use('/fonts', express.static(path.join(SERVER_DIR, 'public', 'fonts')));

const prodReactController = (req: Request, res: Response) => res.sendFile(path.join(CLIENT_DIR, 'index.html'));
let clientCompiler: Compiler;
if (devMode) {
  clientCompiler = webpack(webpackOptions.filter((opt) => opt.name === 'client')[0] as Configuration);
}
const devReactController = (req: Request, res: Response, next: NextFunction) => {
  const filename = path.join(clientCompiler.outputPath, 'index.html');
  clientCompiler.outputFileSystem.readFile(filename, (err, result) => {
    if (err) {
      return next(err);
    }
    res.set('content-type', 'text/html');
    res.send(result);
    return res.end();
  });
};

if (!devMode) {
  app.use(['/js', '/css'], express.static(CLIENT_DIR));
} else {
  app.use(WebpackDevMiddleware(clientCompiler));
  app.use(WebpackHotMiddleware(clientCompiler));
}
app.get('*', devMode ? devReactController : prodReactController);

httpServer.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
  GameManager.createGame();
});
