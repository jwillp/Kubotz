import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { phonePads } from './tools/phone-pads';

const DATA = resolve(__dirname, 'src/data');

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

/**
 * The editor's save (dev server only): POST /__editor/save {file, text} (or {file, delete: true})
 * writes a data file under src/data (one per clip or move). The editor keeps its own state, so its
 * writes don't reload the pages.
 */
function editorSave(): Plugin {
  const own = new Map<string, number>();
  return {
    name: 'kubotz-editor-save',
    configureServer(server) {
      server.middlewares.use('/__editor/save', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { file, text, delete: remove } = JSON.parse(body) as { file: string; text?: string; delete?: boolean };
            const path = resolve(DATA, file);
            if (!path.startsWith(DATA + '/') || !path.endsWith('.json')) throw new Error('not a data file');
            own.set(path, Date.now());
            if (remove) { rmSync(path, { force: true }); res.end('ok'); return; }
            JSON.parse(text!);
            mkdirSync(dirname(path), { recursive: true });
            writeFileSync(path, text!);
            res.end('ok');
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
    },
    handleHotUpdate(ctx) {
      const at = own.get(ctx.file);
      if (at !== undefined && Date.now() - at < 2000) return [];
    },
  };
}

// The game's assets (art, maps, sounds, the Spriter rig) are served from public/.
// The editor (in the game on F2, and editor.html) is in dev and in `npm run build:editor`
// (KUBOTZ_EDITOR=1, into dist-editor/), never in the production build.
export default defineConfig(({ mode }) => {
  const editor = mode === 'development' || process.env.KUBOTZ_EDITOR === '1';
  return {
    base: './',
    define: { __ASSETS_VERSION__: JSON.stringify(publicHash()), __EDITOR__: JSON.stringify(editor) },
    plugins: [editorSave(), phonePads()],
    build: {
      outDir: editor ? 'dist-editor' : 'dist',
      chunkSizeWarningLimit: 2000,
      rollupOptions: { input: { main: resolve(__dirname, 'index.html'), pad: resolve(__dirname, 'pad.html'), ...(editor ? { editor: resolve(__dirname, 'editor.html') } : {}) } },
    },
  };
});
