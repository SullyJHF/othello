import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import NodemonPlugin from 'nodemon-webpack-plugin';
import path from 'path';
import sass from 'sass';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';

const devMode = process.env.NODE_ENV !== 'production';

const serverPlugins: webpack.WebpackPluginInstance[] = [
  new CopyPlugin({
    patterns: [{ from: 'src/server/public', to: 'public' }],
  }),
  new ForkTsCheckerWebpackPlugin(),
];
const devServerPlugins: webpack.WebpackPluginInstance[] = [
  new NodemonPlugin({
    watch: [path.resolve('./dist/server')],
    ext: 'js',
    script: './dist/server/server.js',
    verbose: true,
  }),
];

const clientPlugins: webpack.WebpackPluginInstance[] = [
  new HtmlWebpackPlugin({
    template: 'src/client/index.html',
    inject: true,
  }),
  new ForkTsCheckerWebpackPlugin(),
].filter(Boolean);
const prodClientplugins: webpack.WebpackPluginInstance[] = [
  new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
];
const devClientPlugins: webpack.WebpackPluginInstance[] = [
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoEmitOnErrorsPlugin(),
  new ReactRefreshWebpackPlugin(),
];
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
    externals: [nodeExternals()],
    devtool: 'inline-source-map',
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
              plugins: ['@babel/transform-runtime'],
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
      Boolean
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
      },
    },
    devtool: 'inline-source-map',
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
              presets: [['@babel/preset-react', { runtime: 'automatic' }], '@babel/preset-typescript'],
              plugins: [devMode && require.resolve('react-refresh/babel'), '@babel/transform-runtime'].filter(
                Boolean
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
  },
];

export default config;
