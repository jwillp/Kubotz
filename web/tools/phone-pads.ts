import type { Plugin } from 'vite';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, type WebSocket } from 'ws';

/**
 * Phone pads relay (dev server and `vite preview`): phones open /pad.html and
 * send their buttons and stick over a WebSocket at /__pads?role=phone; the game
 * page connects at /__pads?role=game and gets every phone's state. Messages are
 * small JSON objects (see src/net/PhonePads.ts):
 *   phone -> relay: {t:'hi', id, name} once, then {t:'s', b, x, y} on each change
 *   relay -> game:  the same, with the phone id, plus {t:'bye', id}
 *   game -> relay -> phone: {t:'buzz', id, ms} (rumble), {t:'slot', id, text}
 */
export function phonePads(): Plugin {
  const wss = new WebSocketServer({ noServer: true });
  const games = new Set<WebSocket>();
  const phones = new Map<string, { ws: WebSocket; hello: string; last?: string }>();
  const toGames = (msg: string) => { for (const g of games) g.send(msg); };

  wss.on('connection', (ws, req) => {
    const role = new URL(req.url ?? '', 'http://x').searchParams.get('role');
    if (role === 'game') {
      games.add(ws);
      // Phones already connected show up at once.
      for (const p of phones.values()) { ws.send(p.hello); if (p.last) ws.send(p.last); }
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(String(data)) as { id?: string };
          phones.get(msg.id ?? '')?.ws.send(String(data));
        } catch { /* not ours */ }
      });
      ws.on('close', () => games.delete(ws));
      return;
    }
    let id = '';
    ws.on('message', (data) => {
      let msg: { t: string; id?: string };
      try { msg = JSON.parse(String(data)); } catch { return; }
      if (msg.t === 'hi' && msg.id) {
        id = msg.id;
        phones.get(id)?.ws.close();
        phones.set(id, { ws, hello: String(data) });
        toGames(String(data));
        return;
      }
      const p = phones.get(id);
      if (!p || p.ws !== ws) return;
      const out = JSON.stringify({ ...msg, id });
      if (msg.t === 's') p.last = out;
      toGames(out);
    });
    ws.on('close', () => {
      if (phones.get(id)?.ws !== ws) return;
      phones.delete(id);
      toGames(JSON.stringify({ t: 'bye', id }));
    });
  });

  const attach = (http: { on(e: 'upgrade', f: (req: IncomingMessage, socket: Duplex, head: Buffer) => void): unknown } | null, port: () => number | undefined) => {
    http?.on('upgrade', (req, socket, head) => {
      if (!req.url?.startsWith('/__pads')) return; // Vite's own HMR socket
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    });
    setTimeout(() => {
      const ips = Object.values(networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n!.address);
      console.log(`\n  Phone pads: open http://<this PC's LAN IP>:${port() ?? '?'}/pad.html on a phone (this machine: ${ips.join(', ') || 'no LAN'})\n`);
    }, 300);
  };

  return {
    name: 'kubotz-phone-pads',
    configureServer(server) { attach(server.httpServer, () => server.config.server.port); },
    configurePreviewServer(server) { attach(server.httpServer, () => server.config.preview.port); },
  };
}
