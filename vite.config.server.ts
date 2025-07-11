import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node18',
    outDir: 'dist/server',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/server/server.ts',
      output: {
        format: 'cjs',
        entryFileNames: 'server.js',
      },
      external: [
        // Node.js built-ins
        'fs',
        'path',
        'crypto',
        'events',
        'stream',
        'util',
        'url',
        'querystring',
        'http',
        'https',
        'net',
        'os',
        'child_process',
        'cluster',
        'worker_threads',
        'zlib',
        'buffer',
        'assert',
        'tty',
        'readline',
        'dgram',
        'dns',
        'timers',
        'perf_hooks',
        'async_hooks',
        'inspector',
        'v8',
        'vm',
        'constants',
        'string_decoder',
        'process',
        'console',
        'module',
        'domain',
        'punycode',
        // Production dependencies (don't bundle these)
        'express',
        'socket.io',
        'pg',
        'dotenv',
        'uuid',
        'cors',
      ],
    },
    minify: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@client': resolve(__dirname, 'src/client'),
      '@server': resolve(__dirname, 'src/server'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  define: {
    // Server-side environment variables
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
