import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [react()],
  root: 'src/client',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          socket: ['socket.io-client'],
          ui: ['framer-motion', 'react-toastify', '@fortawesome/react-fontawesome']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      port: 3000,
    },
    proxy: {
      // Proxy API calls to the Express server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // Proxy Socket.IO calls to the Express server
      '/socket': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      },
      // Proxy health check
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // Proxy static assets
      '/favicon.ico': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/images': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/fonts': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Use legacy SCSS API for compatibility
        api: 'legacy'
      }
    }
  },
  define: {
    // Environment variables for the client
    'process.env.VITE_DEBUG_ENABLED': JSON.stringify(env.VITE_DEBUG_ENABLED || 'false'),
    'process.env.VITE_DEBUG_DUMMY_GAME': JSON.stringify(env.VITE_DEBUG_DUMMY_GAME || 'false'),
    'process.env.VITE_DEBUG_AUTO_PLAY': JSON.stringify(env.VITE_DEBUG_AUTO_PLAY || 'false'),
    'process.env.VITE_DEBUG_GAME_INSPECTOR': JSON.stringify(env.VITE_DEBUG_GAME_INSPECTOR || 'false'),
    'process.env.VITE_DEBUG_PERFORMANCE': JSON.stringify(env.VITE_DEBUG_PERFORMANCE || 'false'),
    'process.env.VITE_VERSION': JSON.stringify(env.VITE_VERSION || 'development'),
    'process.env.VITE_BUILD_HASH': JSON.stringify(env.VITE_BUILD_HASH || 'local'),
    'process.env.VITE_BUILD_BRANCH': JSON.stringify(env.VITE_BUILD_BRANCH || 'local'),
    'process.env.VITE_BUILD_TIME': JSON.stringify(env.VITE_BUILD_TIME || new Date().toISOString()),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@client': resolve(__dirname, 'src/client'),
      '@server': resolve(__dirname, 'src/server'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: '../../vitest.setup.ts',
    css: true,
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        'src/**/*.d.ts',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'vite.config.ts',
        'vitest.config.ts'
      ]
    }
  }
  };
});