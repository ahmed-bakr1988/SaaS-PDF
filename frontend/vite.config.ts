/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function getAllowedHosts() {
  const defaultHosts = ['dociva.io', 'www.dociva.io', 'localhost', '127.0.0.1'];
  const siteDomain = process.env.VITE_SITE_DOMAIN;

  if (!siteDomain) {
    return defaultHosts;
  }

  try {
    const hostname = new URL(siteDomain).hostname;
    return Array.from(new Set([...defaultHosts, hostname]));
  } catch {
    return defaultHosts;
  }
}

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: getAllowedHosts(),
    proxy: {
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: getAllowedHosts(),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssMinify: true,
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react-dom') || id.includes('/react/')) {
            return 'vendor';
          }

          if (id.includes('react-router-dom')) {
            return 'router';
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }

          if (id.includes('react-helmet-async')) {
            return 'helmet';
          }

          if (id.includes('/axios/')) {
            return 'network';
          }

          if (id.includes('/pdf-lib/')) {
            return 'pdf-core';
          }

          if (id.includes('/fabric/')) {
            return 'editor';
          }

          return undefined;
        },
      },
    },
  },
});
