import { defineConfig } from 'vite';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['all', 'chaperone-bok-speckled.ngrok-free.dev'],
    open: true,
    proxy: {
      '/auth': API_URL,
      '/admin': API_URL,
      '/leaderboard': API_URL,
      '/api': API_URL,
      '/health': API_URL
    }
  },
});
