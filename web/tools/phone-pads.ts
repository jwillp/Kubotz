import type { Plugin } from 'vite';
import { request, type IncomingMessage } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { connect } from 'node:net';
import type { Duplex } from 'node:stream';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, type WebSocket } from 'ws';

/**
 * Phone pads relay (dev server and `vite preview`): phones open /pad.html and
 * send their buttons and stick over a WebSocket at /__pads?role=phone; the game
 * page connects at /__pads?role=game and gets every phone's state. Messages are
 * small JSON objects (see src/net/PhonePads.ts):
 *   phone -> relay: {t:'hi', id, name} once, then {t:'s', b, x, y} on each change
 *   relay -> game:  the same, with the phone id, plus {t:'bye', id}
 *   game -> relay -> phone: {t:'buzz', id, ms} (rumble), {t:'slot', id, text}, {t:'info', id, ...} (its Kubot)
 *
 * When the dev server listens on the network (npm run pads), a second, HTTPS
 * door one port up passes everything on to it: phones only share their motion
 * sensors (the tilt layout) with secure pages. Its certificate is self-signed
 * (made once with openssl), so a phone warns the first time.
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
    configureServer(server) {
      attach(server.httpServer, () => server.config.server.port);
      if (server.config.server.host) server.httpServer?.once('listening', () => httpsDoor(server.config.server.port, wss));
    },
    configurePreviewServer(server) { attach(server.httpServer, () => server.config.preview.port); },
  };
}

/** A self-signed certificate for the HTTPS door, made once (null without openssl). */
function certificate(): { key: Buffer; cert: Buffer } | null {
  const dir = join(process.cwd(), 'node_modules', '.cache', 'kubotz-phone-pads');
  const key = join(dir, 'key.pem');
  const cert = join(dir, 'cert.pem');
  if (!existsSync(cert)) {
    try {
      mkdirSync(dir, { recursive: true });
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '825',
        '-subj', '/CN=Kubotz phone pads', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
    } catch {
      return null;
    }
  }
  return { key: readFileSync(key), cert: readFileSync(cert) };
}

/** HTTPS on port + 1, passing pages and sockets on to the dev server (the relay's own socket straight to it). */
function httpsDoor(port: number, wss: WebSocketServer): void {
  const tls = certificate();
  if (!tls) { console.log('  Phone pads: no openssl, so no HTTPS door (the tilt layout needs it).'); return; }
  const door = createHttps(tls, (req, res) => {
    const out = request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers: req.headers }, (back) => {
      res.writeHead(back.statusCode ?? 502, back.headers);
      back.pipe(res);
    });
    out.on('error', () => { res.statusCode = 502; res.end(); });
    req.pipe(out);
  });
  door.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (req.url?.startsWith('/__pads')) { wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req)); return; }
    // Anything else (Vite's own socket): the raw bytes both ways.
    const up = connect(port, '127.0.0.1', () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      up.write(`${lines.join('\r\n')}\r\n\r\n`);
      up.write(head);
      socket.pipe(up).pipe(socket);
    });
    up.on('error', () => socket.destroy());
    socket.on('error', () => up.destroy());
  });
  door.on('error', (e) => console.log(`  Phone pads: no HTTPS door on ${port + 1} (${(e as Error).message}).`));
  door.listen(port + 1, '0.0.0.0', () => console.log(`  Phone pads (tilt layout): https://<this PC's LAN IP>:${port + 1}/pad.html?layout=lean`));
}
