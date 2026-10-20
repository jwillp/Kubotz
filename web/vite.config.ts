import { defineConfig } from 'vite';

// The original LibGDX assets are served untouched from core/assets.
export default defineConfig({
  base: './',
  publicDir: '../core/assets',
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
