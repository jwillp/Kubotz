import { defineConfig } from 'vite';

// The game's assets (art, maps, sounds, the Spriter rig) are served from public/.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
