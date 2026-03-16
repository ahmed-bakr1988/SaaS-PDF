/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('react-dom') ||
            id.includes('react-router-dom') ||
            id.includes('/react/')
          ) {
            return 'vendor';
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }

          if (id.includes('react-helmet-async')) {
            return 'helmet';
          }

          if (id.includes('lucide-react')) {
            return 'icons';
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
