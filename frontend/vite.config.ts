/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
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
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'logo.svg', 'icons/*.svg'],
      manifest: false, // use the static manifest.json in public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Google Fonts are fetched by the browser only (not intercepted by the SW).
        // Workbox CacheFirst on fonts.gstatic.com caused "no-response" when cache was cold
        // or third-party requests were blocked (extensions / privacy tools).
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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

          if (id.includes('lucide-react')) {
            return 'icons';
          }

          if (id.includes('@microsoft/clarity')) {
            return 'analytics';
          }

          return undefined;
        },
      },
    },
  },
});
