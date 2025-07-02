import CopyPlugin from 'copy-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import sass from 'sass';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';

const devMode = process.env.NODE_ENV !== 'production';

// Conditionally import development-only plugins
let ReactRefreshWebpackPlugin: any;
let NodemonPlugin: any;

if (devMode) {
  ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
  NodemonPlugin = require('nodemon-webpack-plugin');
}

const serverPlugins: webpack.WebpackPluginInstance[] = [
  new CopyPlugin({
    patterns: [{ from: 'src/server/public', to: 'public' }],
  }),
  new ForkTsCheckerWebpackPlugin(),
];
const devServerPlugins: webpack.WebpackPluginInstance[] = devMode ? [
  new NodemonPlugin({
    watch: [path.resolve('./dist/server')],
    ext: 'js',
    script: './dist/server/server.js',
    verbose: true,
  }),
] : [];

const clientPlugins: webpack.WebpackPluginInstance[] = [
  new HtmlWebpackPlugin({
    template: 'src/client/index.html',
    inject: true,
  }),
  new ForkTsCheckerWebpackPlugin(),
  new webpack.DefinePlugin({
    'process.env.REACT_APP_DEBUG_ENABLED': JSON.stringify(process.env.REACT_APP_DEBUG_ENABLED || 'false'),
    'process.env.REACT_APP_DEBUG_DUMMY_GAME': JSON.stringify(process.env.REACT_APP_DEBUG_DUMMY_GAME || 'false'),
    'process.env.REACT_APP_DEBUG_AUTO_PLAY': JSON.stringify(process.env.REACT_APP_DEBUG_AUTO_PLAY || 'false'),
    'process.env.REACT_APP_DEBUG_GAME_INSPECTOR': JSON.stringify(process.env.REACT_APP_DEBUG_GAME_INSPECTOR || 'false'),
    'process.env.REACT_APP_DEBUG_PERFORMANCE': JSON.stringify(process.env.REACT_APP_DEBUG_PERFORMANCE || 'false'),
  }),
].filter(Boolean);
const prodClientplugins: webpack.WebpackPluginInstance[] = [
  new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
];
const devClientPlugins: webpack.WebpackPluginInstance[] = devMode ? [
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoEmitOnErrorsPlugin(),
  new ReactRefreshWebpackPlugin(),
] : [];
if (devMode) {
  serverPlugins.push(...devServerPlugins);
  clientPlugins.push(...devClientPlugins);
} else {
  clientPlugins.push(...prodClientplugins);
}

const config: webpack.Configuration[] = [
  {
    name: 'server',
    mode: devMode ? 'development' : 'production',
    entry: './src/server/server.ts',
    target: 'node',
    output: {
      filename: 'server.js',
      path: path.join(__dirname, '/dist/server/'),
    },
    externals: [
      nodeExternals({
        // Allow webpack dev dependencies to be bundled in dev mode only
        allowlist: devMode ? ['webpack/hot/poll?300'] : []
      })
    ],
    devtool: devMode ? 'inline-source-map' : 'source-map',
    optimization: {
      minimize: false // Don't minify server code to avoid Terser issues
    },
    module: {
      rules: [
        {
          test: /\.[j|t]s$/,
          exclude: [/node_modules/],
          resolve: {
            extensions: ['.js', '.ts'],
          },
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              presets: ['@babel/preset-env', '@babel/typescript'],
              plugins: [
                // Don't use transform-runtime for server to avoid runtime dependency
              ],
            },
          },
        },
        { test: /\.json$/ },
      ],
    },
    plugins: serverPlugins,
    watchOptions: {
      ignored: ['**/node_modules'],
    },
  },
  {
    name: 'client',
    mode: devMode ? 'development' : 'production',
    entry: [devMode && 'webpack-hot-middleware/client?name=client&quiet=true', './src/client/index.tsx'].filter(
      Boolean,
    ) as string[],
    output: {
      path: path.join(__dirname, '/dist/client/'),
      filename: '[name].[contenthash].js',
      publicPath: '/js/',
    },
    optimization: {
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
      ...(devMode ? {} : {
        minimizer: [
          new (require('terser-webpack-plugin'))({
            terserOptions: {
              compress: {
                drop_console: true,
              },
            },
          }),
        ],
      }),
    },
    devtool: devMode ? 'eval-cheap-module-source-map' : 'source-map',
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    },
    module: {
      rules: [
        {
          test: /\.(tsx|jsx|ts|js)?$/,
          exclude: /node_modules/,
          resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
          },
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              presets: ['@babel/preset-react', '@babel/preset-typescript'],
              plugins: [devMode && 'react-refresh/babel', '@babel/transform-runtime'].filter(
                Boolean,
              ) as string[],
            },
          },
        },
        {
          test: /\.(c|s[ac])ss$/,
          use: [
            devMode ? require.resolve('style-loader') : MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: require.resolve('sass-loader'),
              options: {
                implementation: sass,
              },
            },
          ],
        },
        { test: /\.html$/, use: [{ loader: 'html-loader', options: { sources: false, minimize: true } }] },
      ],
    },
    plugins: clientPlugins,
    watchOptions: {
      ignored: ['**/node_modules'],
    },
    performance: {
      hints: false, // Disable performance warnings for now
    },
  },
];

export default config;
