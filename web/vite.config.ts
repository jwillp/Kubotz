import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** A hash of everything in public/: a changed asset gets new URLs (BootScene), so no browser keeps a stale copy. */
function publicHash(dir = 'public'): string {
  const hash = createHash('sha256');
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else hash.update(p).update(readFileSync(p));
    }
  };
  walk(dir);
  return hash.digest('hex').slice(0, 10);
}

// The game's assets (art, maps, sounds, the Spriter rig) are served from public/.
export default defineConfig({
  base: './',
  define: { __ASSETS_VERSION__: JSON.stringify(publicHash()) },
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
