import Phaser from 'phaser';
import { UNIT } from '../config';
import { BACKDROPS, ROOMS, ROOM_H, ROOM_W, seeded } from '../fx/Backdrops';
import { DEFAULT_BLAST, DEFAULT_SIZE, buildArenaMap, warpExit, type ArenaData, type Rect, type TilePaint } from '../map/Arenas';
import { eachTile } from '../map/ArenaArt';
import type { TmxMap } from '../map/TmxMap';
import { POINT_KINDS, pointOf, setPoint, type ArenaPiece, type PointKind, type Store } from './Store';

/**
 * The Arena tab's stage: the arena drawn with the game's own tiles over its
 * room, and its pieces on top (walls, platforms, portals, spawns, bonus
 * spots, the blast zone), to pick, move, resize and draw with the tools.
 */

export type ArenaTool = 'select' | 'walls' | 'platforms' | 'warps' | 'spawns' | 'bonus' | 'emitters' | 'npcs' | 'tile' | 'erase';

const COLORS = { walls: 0x8e99a8, platforms: 0x3fb8a6, warps: 0xa06eff, spawns: 0x4aa3ff, bonus: 0xffd166, emitters: 0xff7ad9, npcs: 0x111111, blast: 0xff4d4d, sel: 0xffb547 };
type Drag =
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'pinch'; dist: number; zoom: number; wx: number; wy: number }
  | { kind: 'move'; piece: ArenaPiece; ux: number; uy: number; start: number[] }
  | { kind: 'resize'; piece: ArenaPiece; corner: number; start: Rect }
  | { kind: 'draw'; what: 'walls' | 'platforms'; ux: number; uy: number; index: number }
  | { kind: 'paint' }
  | { kind: 'exit'; index: number };

export class ArenaScene extends Phaser.Scene {
  tool: ArenaTool = 'select';
  /** The tile brush: which image, on which layer. */
  brush: { source: string; layer: TilePaint[0] } = { source: 'ground-02.png', layer: 'blocks' };
  view = { grid: true, room: true, tiles: true, pieces: true };
  private store!: Store;
  private base!: TmxMap;
  private room!: Phaser.GameObjects.Image;
  private tiles!: Phaser.GameObjects.Container;
  private grid!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private built = '';
  private builtTiles = '';
  private drag: Drag | null = null;
  /** Where the pointer went down, until it has moved far enough to count as a drag (taps edit nothing). */
  private pressAt: { x: number; y: number } | null = null;
  private hover = -1;

  /**
   * @param overlay inside the game: drawn over the real arena (no room or
   * tiles of its own) and moving the match's camera.
   */
  constructor(private readonly overlay = false) { super('Arena'); }

  /** The camera the arena is seen through: the match's, inside the game. */
  private get cam(): Phaser.Cameras.Scene2D.Camera {
    return (this.overlay ? this.scene.get('Game')?.cameras.main : null) ?? this.cameras.main;
  }

  /** Inside the game, this scene's camera shows exactly what the match's does. */
  private syncCamera(): void {
    if (!this.overlay) return;
    const from = this.cam; const to = this.cameras.main;
    if (from === to) return;
    to.setZoom(from.zoom).setScroll(from.scrollX, from.scrollY);
    to.preRender();
  }

  create(): void {
    this.store = this.registry.get('store') as Store;
    this.base = this.registry.get('map') as TmxMap;
    this.room = this.add.image(0, 0, 'bg').setOrigin(0.5).setDepth(0).setAlpha(0.75);
    this.tiles = this.add.container(0, 0).setDepth(1);
    this.grid = this.add.graphics().setDepth(2);
    this.over = this.add.graphics().setDepth(3);
    if (!this.overlay) this.cameras.main.setBackgroundColor('#0d1015');
    this.room.setVisible(!this.overlay);
    this.input.addPointer(1);
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.moveTo(p));
    this.input.on('pointerup', () => this.up());
    this.input.on('pointerupoutside', () => this.up());
    // Listeners on the page and the game outlive the scene (it is stopped and started again inside the game): removed on shutdown.
    const onWheel = (e: WheelEvent) => {
      if (!this.sys.isActive()) return;
      e.preventDefault();
      const cam = this.cam;
      const r = this.game.canvas.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      const mouseWheel = !e.ctrlKey && e.deltaX === 0 && (e.deltaMode !== 0 || (Number.isInteger(dy) && Math.abs(dy) >= 50));
      if (e.ctrlKey) this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-dy * 0.01));
      else if (mouseWheel) this.zoomAt(e.clientX - r.left, e.clientY - r.top, dy > 0 ? 0.9 : 1.1);
      else { cam.scrollX += e.deltaX / cam.zoom; cam.scrollY += dy / cam.zoom; }
    };
    this.game.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.canvas.removeEventListener('wheel', onWheel));
    this.recentre();
  }

  private get arena(): ArenaData | undefined { return this.store.docs.arenas[this.store.sel.arena]; }
  private get size(): [number, number] { return this.arena?.size ?? DEFAULT_SIZE; }

  /** Fits the whole arena and its blast zone on screen. */
  recentre(): void {
    const cam = this.cam;
    const [w, h] = this.size;
    const [l, t, r, b] = this.arena?.blast ?? DEFAULT_BLAST;
    const fw = (w + l + r) * UNIT; const fh = (h + Math.min(t, 8) + b) * UNIT;
    cam.setZoom(Math.min(cam.width / fw, cam.height / fh) * 0.95);
    cam.centerOn(((w + r - l) / 2) * UNIT, ((h + b - Math.min(t, 8)) / 2) * UNIT);
  }

  zoomAt(sx: number, sy: number, factor: number): void {
    const cam = this.cam;
    const before = cam.getWorldPoint(sx, sy);
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, 0.08, 4));
    cam.preRender();
    const after = cam.getWorldPoint(sx, sy);
    cam.scrollX += before.x - after.x; cam.scrollY += before.y - after.y;
    this.syncCamera();
  }

  // ------------------------------------------------------------ drawing
  update(): void {
    this.syncCamera();
    const a = this.arena;
    if (!a) { this.tiles.removeAll(true); this.over.clear(); this.grid.clear(); return; }
    // The tiles and the room are rebuilt only when the arena's shape changes.
    const { name: _n, blurb: _b, spawns: _s, bonus: _bo, order: _o, blast: _bl, emitters: _e, npcs: _np, ...shape } = a;
    // Inside the game the match draws the real arena; this scene only adds the pieces.
    if (!this.overlay) {
      const key = JSON.stringify(shape);
      if (key !== this.builtTiles) { this.builtTiles = key; this.buildTiles(a); }
      if (a.room !== this.built) { this.built = a.room ?? ''; this.buildRoom(a); }
    }
    this.room.setVisible(this.view.room && !this.overlay);
    this.tiles.setVisible(this.view.tiles && !this.overlay);
    this.drawGrid();
    this.drawPieces(a);
  }

  private buildTiles(a: ArenaData): void {
    this.tiles.removeAll(true);
    const map = buildArenaMap(a, this.base);
    eachTile(this.textures, map, (_src, key, x, y) => this.tiles.add(this.add.image(x, y, key).setOrigin(0, 0)));
  }

  /** The arena's room behind it, as painted for the backdrop (fx/Backdrops.ts), or the Kube's picture. */
  private buildRoom(a: ArenaData): void {
    const n = Math.max(0, ROOMS.indexOf(a.room ?? 'kube'));
    const th = BACKDROPS[n];
    let key = 'bg';
    if (th.paint) {
      key = `editor-room-${n}`;
      if (!this.textures.exists(key)) {
        const c = this.textures.createCanvas(key, ROOM_W, ROOM_H)!;
        const front = document.createElement('canvas');
        front.width = ROOM_W; front.height = ROOM_H;
        th.paint(c.getContext(), front.getContext('2d')!, ROOM_W, ROOM_H, seeded(31 + n * 1013));
        c.getContext().drawImage(front, 0, 0);
        c.refresh();
      }
    }
    const [w, h] = this.size;
    this.room.setTexture(key).setPosition((w * UNIT) / 2, (h * UNIT) / 2);
    const s = Math.max((w + 16) * UNIT / this.room.width, (h + 16) * UNIT / this.room.height);
    this.room.setScale(s);
  }

  private drawGrid(): void {
    const g = this.grid.clear();
    if (!this.view.grid) return;
    const [w, h] = this.size;
    const z = this.cameras.main.zoom;
    g.lineStyle(1 / z, 0xffffff, 0.07);
    for (let x = 0; x <= w; x++) g.lineBetween(x * UNIT, 0, x * UNIT, h * UNIT);
    for (let y = 0; y <= h; y++) g.lineBetween(0, y * UNIT, w * UNIT, y * UNIT);
    g.lineStyle(2 / z, 0xffffff, 0.35).strokeRect(0, 0, w * UNIT, h * UNIT);
  }

  private drawPieces(a: ArenaData): void {
    const g = this.over.clear();
    const z = this.cameras.main.zoom;
    const px = (v: number) => v / z;
    const [w, h] = this.size;
    const [l, t, r, b] = a.blast ?? DEFAULT_BLAST;
    // The blast zone: past this line a Kubot is out.
    g.lineStyle(px(2), COLORS.blast, 0.85);
    this.dashed(g, -l * UNIT, -t * UNIT, (w + l + r) * UNIT, (h + t + b) * UNIT, px(12));
    if (!this.view.pieces) return;
    const sel = this.store.sel.piece;
    const isSel = (kind: ArenaPiece['kind'], i: number) => sel?.kind === kind && sel.index === i;
    for (const kind of ['walls', 'platforms', 'warps'] as const) {
      a[kind].forEach(([x, y, rw, rh], i) => {
        const c = COLORS[kind];
        g.fillStyle(c, kind === 'walls' ? 0.18 : 0.35).fillRect(x * UNIT, y * UNIT, rw * UNIT, rh * UNIT);
        g.lineStyle(px(isSel(kind, i) ? 3 : 1.5), isSel(kind, i) ? COLORS.sel : c, 1).strokeRect(x * UNIT, y * UNIT, rw * UNIT, rh * UNIT);
      });
    }
    // Where each portal leads: a faint dotted line to its exit (a ring you can drag), or between the two of a pair.
    g.lineStyle(px(1.5), COLORS.warps, 0.7);
    a.warps.forEach((w, i) => {
      const exit = warpExit(w);
      if (!exit) return;
      const [ex, ey] = [exit[0] * UNIT, exit[1] * UNIT];
      this.dashedLine(g, (w[0] + w[2] / 2) * UNIT, (w[1] + w[3] / 2) * UNIT, ex, ey, px(6));
      g.lineStyle(px(isSel('warps', i) ? 3 : 2), isSel('warps', i) ? COLORS.sel : COLORS.warps, 1).strokeCircle(ex, ey, px(9));
      g.lineStyle(px(1.5), COLORS.warps, 0.7);
    });
    const pair = a.warps.filter((w) => !warpExit(w));
    if (pair.length === 2 && a.warps.length === 2) {
      const [p, q] = pair;
      this.dashedLine(g, (p[0] + p[2] / 2) * UNIT, (p[1] + p[3] / 2) * UNIT, (q[0] + q[2] / 2) * UNIT, (q[1] + q[3] / 2) * UNIT, px(10));
    }
    a.spawns.forEach(([x, y], i) => {
      const s = px(isSel('spawns', i) ? 13 : 10);
      g.fillStyle(isSel('spawns', i) ? COLORS.sel : COLORS.spawns, 1).fillTriangle(x * UNIT, y * UNIT, x * UNIT - s, y * UNIT - 2 * s, x * UNIT + s, y * UNIT - 2 * s);
    });
    a.bonus.forEach(([x, y], i) => {
      g.lineStyle(px(isSel('bonus', i) ? 4 : 3), isSel('bonus', i) ? COLORS.sel : COLORS.bonus, 1).strokeCircle(x * UNIT, y * UNIT, px(10));
    });
    // Particle emitters: a pink star; NPCs: a black triangle ringed in white, like a spawn.
    (a.emitters ?? []).forEach(({ x, y }, i) => {
      const r = px(isSel('emitters', i) ? 11 : 9);
      const pts = Array.from({ length: 8 }, (_, k) => ({ x: x * UNIT + Math.cos((k * Math.PI) / 4) * (k % 2 ? r * 0.45 : r), y: y * UNIT + Math.sin((k * Math.PI) / 4) * (k % 2 ? r * 0.45 : r) }));
      g.fillStyle(isSel('emitters', i) ? COLORS.sel : COLORS.emitters, 1).fillPoints(pts, true);
    });
    (a.npcs ?? []).forEach(({ x, y }, i) => {
      const s = px(isSel('npcs', i) ? 13 : 10);
      g.fillStyle(COLORS.npcs, 1).fillTriangle(x * UNIT, y * UNIT, x * UNIT - s, y * UNIT - 2 * s, x * UNIT + s, y * UNIT - 2 * s);
      g.lineStyle(px(2), isSel('npcs', i) ? COLORS.sel : 0xffffff, 1).strokeTriangle(x * UNIT, y * UNIT, x * UNIT - s, y * UNIT - 2 * s, x * UNIT + s, y * UNIT - 2 * s);
    });
    // Resize handles on the picked rectangle.
    const rect = this.selectedRect();
    if (rect) for (const [cx, cy] of this.corners(rect)) g.fillStyle(0xffffff, 1).fillRect(cx - px(5), cy - px(5), px(10), px(10));
    void this.hover;
  }

  private dashed(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, d: number): void {
    this.dashedLine(g, x, y, x + w, y, d); this.dashedLine(g, x + w, y, x + w, y + h, d);
    this.dashedLine(g, x + w, y + h, x, y + h, d); this.dashedLine(g, x, y + h, x, y, d);
  }

  private dashedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, d: number): void {
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (let s = 0; s < len; s += d * 2) {
      const e = Math.min(len, s + d);
      g.lineBetween(x1 + ((x2 - x1) * s) / len, y1 + ((y2 - y1) * s) / len, x1 + ((x2 - x1) * e) / len, y1 + ((y2 - y1) * e) / len);
    }
  }

  private selectedRect(): Rect | null {
    const sel = this.store.sel.piece;
    if (!sel || (POINT_KINDS as string[]).includes(sel.kind)) return null;
    return this.arena?.[sel.kind as 'walls'][sel.index] ?? null;
  }

  private corners([x, y, w, h]: Rect): [number, number][] {
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([cx, cy]) => [cx * UNIT, cy * UNIT]);
  }

  // ------------------------------------------------------------ the dev HUD's palette
  /** The stage point under a page point (client pixels), or null when it is off the canvas. */
  worldAt(clientX: number, clientY: number): { x: number; y: number } | null {
    const r = this.game.canvas.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    const k = this.game.scale.width / r.width;
    this.syncCamera();
    const p = this.cameras.main.getWorldPoint((clientX - r.left) * k, (clientY - r.top) * k);
    return { x: p.x, y: p.y };
  }

  /** The middle of what the camera shows (units), where a palette item tapped (not dragged) lands. */
  viewCentre(): { x: number; y: number } {
    this.syncCamera();
    const m = this.cameras.main.midPoint;
    return { x: m.x, y: m.y };
  }

  /** Adds a piece dropped from the palette at a stage point (pixels), snapped to the grid, and picks it. */
  dropAt(kind: ArenaPiece['kind'], wx: number, wy: number): void {
    const s = this.store;
    const a = this.arena;
    if (!a) return;
    const ux = Math.round(wx / UNIT); const uy = Math.round(wy / UNIT);
    const hx = Math.round((wx / UNIT) * 2) / 2; const hy = Math.round((wy / UNIT) * 2) / 2;
    const index = ((a[kind] as unknown[] | undefined) ?? []).length;
    s.edit('arenas', (d) => {
      const x = d.arenas[s.sel.arena];
      switch (kind) {
        case 'walls': x.walls.push([ux - 2, uy - 1, 4, 2]); break;
        case 'platforms': x.platforms.push([ux - 3, uy, 6, 1]); break;
        // A new portal leads a few units to its right until its exit ring is dragged somewhere.
        case 'warps': x.warps.push([ux, uy - 2, 1, 5, ux + 4, uy + 0.5]); break;
        case 'spawns': x.spawns.push([hx, hy]); break;
        case 'bonus': x.bonus.push([hx, hy]); break;
        case 'emitters': {
          const effect = Object.keys(s.docs.particles).includes('stars') ? 'stars' : Object.keys(s.docs.particles)[0];
          x.emitters = [...(x.emitters ?? []), { x: hx, y: hy, effect, every: 600 }];
          break;
        }
        case 'npcs': x.npcs = [...(x.npcs ?? []), { x: hx, y: hy, behaviour: 'attack', level: 5 }]; break;
      }
    });
    s.select({ piece: { kind, index } });
  }

  // ------------------------------------------------------------ input
  private unit(p: Phaser.Input.Pointer, step = 1): [number, number] {
    return [Math.round(p.worldX / UNIT / step) * step, Math.round(p.worldY / UNIT / step) * step];
  }

  private cell(p: Phaser.Input.Pointer): [number, number] {
    return [Math.floor(p.worldX / UNIT), Math.floor(p.worldY / UNIT)];
  }

  /** The piece under a point: spots first, then platforms, portals and walls (the last drawn on top). */
  private pieceAt(wx: number, wy: number, touch: boolean): ArenaPiece | null {
    const a = this.arena;
    if (!a) return null;
    const r = (touch ? 22 : 12) / this.cameras.main.zoom;
    for (const kind of POINT_KINDS) {
      for (let i = ((a[kind] as unknown[] | undefined)?.length ?? 0) - 1; i >= 0; i--) {
        const [x, y] = pointOf(a, kind, i)!;
        const cy = kind === 'spawns' || kind === 'npcs' ? y * UNIT - r : y * UNIT;
        if (Math.hypot(x * UNIT - wx, cy - wy) <= r * 1.4) return { kind, index: i };
      }
    }
    for (const kind of ['platforms', 'warps', 'walls'] as const) {
      for (let i = a[kind].length - 1; i >= 0; i--) {
        const [x, y, w, h] = a[kind][i];
        if (wx >= x * UNIT - r / 2 && wx <= (x + w) * UNIT + r / 2 && wy >= y * UNIT - r / 2 && wy <= (y + h) * UNIT + r / 2) return { kind, index: i };
      }
    }
    return null;
  }

  private down(p: Phaser.Input.Pointer): void {
    const cam = this.cam;
    const a = this.pointer2Down() ? null : this.arena;
    if (this.pointer2Down()) {
      if (this.drag && this.drag.kind !== 'pan') this.store.endDrag();
      const q = this.input.pointer1; const r = this.input.pointer2;
      const mid = cam.getWorldPoint((q.x + r.x) / 2, (q.y + r.y) / 2);
      this.drag = { kind: 'pinch', dist: Math.max(1, Phaser.Math.Distance.Between(q.x, q.y, r.x, r.y)), zoom: cam.zoom, wx: mid.x, wy: mid.y };
      return;
    }
    if (!a) return;
    const pan = () => { this.drag = { kind: 'pan', sx: p.x, sy: p.y, cx: cam.midPoint.x, cy: cam.midPoint.y }; };
    if (p.rightButtonDown() && this.tool !== 'tile') { pan(); return; }
    const s = this.store;
    const [ux, uy] = this.unit(p);
    this.pressAt = { x: p.x, y: p.y };
    switch (this.tool) {
      case 'select': {
        const rect = this.selectedRect();
        if (rect) {
          const r = (p.wasTouch ? 22 : 10) / cam.zoom;
          const corner = this.corners(rect).findIndex(([cx, cy]) => Math.abs(cx - p.worldX) <= r && Math.abs(cy - p.worldY) <= r);
          if (corner >= 0) { this.drag = { kind: 'resize', piece: s.sel.piece!, corner, start: [...rect] as unknown as Rect }; return; }
        }
        // A portal's exit ring: drag it to set where the portal leads.
        const exitR = (p.wasTouch ? 22 : 12) / cam.zoom;
        const exitOf = a.warps.findIndex((w) => { const e = warpExit(w); return !!e && Math.hypot(e[0] * UNIT - p.worldX, e[1] * UNIT - p.worldY) <= exitR; });
        if (exitOf >= 0) { s.select({ piece: { kind: 'warps', index: exitOf } }); this.drag = { kind: 'exit', index: exitOf }; return; }
        const hit = this.pieceAt(p.worldX, p.worldY, p.wasTouch);
        if (!hit) { s.select({ piece: null }); pan(); return; }
        s.select({ piece: hit });
        const start = (POINT_KINDS as string[]).includes(hit.kind) ? pointOf(a, hit.kind as PointKind, hit.index)! : [...a[hit.kind as 'walls'][hit.index]];
        this.drag = { kind: 'move', piece: hit, ux: p.worldX / UNIT, uy: p.worldY / UNIT, start };
        return;
      }
      case 'walls':
      case 'platforms': {
        // The piece is made once the drag starts (a tap draws nothing).
        this.drag = { kind: 'draw', what: this.tool, ux, uy, index: -1 };
        return;
      }
      case 'warps': {
        const index = a.warps.length;
        s.edit('arenas', (d) => { d.arenas[s.sel.arena].warps.push([ux, uy, 1, 5]); });
        s.select({ piece: { kind: 'warps', index } });
        return;
      }
      case 'spawns':
      case 'bonus': {
        const what = this.tool;
        const [hx, hy] = this.unit(p, 0.5);
        const index = a[what].length;
        s.edit('arenas', (d) => { d.arenas[s.sel.arena][what].push([hx, hy]); });
        s.select({ piece: { kind: what, index } });
        return;
      }
      case 'emitters': {
        const [hx, hy] = this.unit(p, 0.5);
        const index = a.emitters?.length ?? 0;
        const effect = Object.keys(s.docs.particles).includes('stars') ? 'stars' : Object.keys(s.docs.particles)[0];
        s.edit('arenas', (d) => { const x = d.arenas[s.sel.arena]; x.emitters = [...(x.emitters ?? []), { x: hx, y: hy, effect, every: 600 }]; });
        s.select({ piece: { kind: 'emitters', index } });
        return;
      }
      case 'npcs': {
        const [hx, hy] = this.unit(p, 0.5);
        const index = a.npcs?.length ?? 0;
        s.edit('arenas', (d) => { const x = d.arenas[s.sel.arena]; x.npcs = [...(x.npcs ?? []), { x: hx, y: hy, behaviour: 'attack' }]; });
        s.select({ piece: { kind: 'npcs', index } });
        return;
      }
      case 'tile':
      case 'erase':
        this.paint(p);
        this.drag = { kind: 'paint' };
        return;
    }
  }

  private pointer2Down(): boolean { return this.input.pointer1.isDown && this.input.pointer2.isDown; }

  /** The tile brush: puts (or, with the eraser or the right button, clears) the tile of the cell under the pointer. */
  private paint(p: Phaser.Input.Pointer): void {
    const s = this.store;
    const [cx, cy] = this.cell(p);
    const [w, h] = this.size;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return;
    const source = this.tool === 'erase' || p.rightButtonDown() ? '' : this.brush.source;
    const layer = this.brush.layer;
    const tiles = this.arena?.tiles ?? [];
    const same = tiles.find(([l, x, y]) => l === layer && x === cx && y === cy);
    if (same && same[3] === source) return;
    s.edit('arenas', (d) => {
      const a = d.arenas[s.sel.arena];
      a.tiles = (a.tiles ?? []).filter(([l, x, y]) => !(l === layer && x === cx && y === cy));
      a.tiles.push([layer, cx, cy, source]);
    }, true);
  }

  private moveTo(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    const s = this.store;
    const cam = this.cam;
    if (!d) return;
    if (d.kind === 'pinch') {
      const q = this.input.pointer1; const r = this.input.pointer2;
      if (!q.isDown || !r.isDown) return;
      cam.setZoom(Phaser.Math.Clamp(d.zoom * Phaser.Math.Distance.Between(q.x, q.y, r.x, r.y) / d.dist, 0.08, 4));
      cam.preRender();
      const mid = cam.getWorldPoint((q.x + r.x) / 2, (q.y + r.y) / 2);
      cam.scrollX += d.wx - mid.x; cam.scrollY += d.wy - mid.y;
      this.syncCamera();
      return;
    }
    if (d.kind === 'pan') { cam.centerOn(d.cx - (p.x - d.sx) / cam.zoom, d.cy - (p.y - d.sy) / cam.zoom); this.syncCamera(); return; }
    if (d.kind === 'paint') { this.paint(p); return; }
    if (this.pressAt && Math.hypot(p.x - this.pressAt.x, p.y - this.pressAt.y) < (p.wasTouch ? 10 : 4)) return;
    this.pressAt = null;
    const id = s.sel.arena;
    if (d.kind === 'move') {
      const point = (POINT_KINDS as string[]).includes(d.piece.kind);
      const step = point ? 0.5 : 1;
      const dx = Math.round((p.worldX / UNIT - d.ux) / step) * step;
      const dy = Math.round((p.worldY / UNIT - d.uy) / step) * step;
      s.edit('arenas', (docs) => {
        if (point) { setPoint(docs.arenas[id], d.piece.kind as PointKind, d.piece.index, d.start[0] + dx, d.start[1] + dy); return; }
        const list = docs.arenas[id][d.piece.kind as 'walls'] as number[][];
        list[d.piece.index] = [d.start[0] + dx, d.start[1] + dy, ...d.start.slice(2)];
      }, true);
      return;
    }
    if (d.kind === 'resize') {
      const [ux, uy] = this.unit(p);
      const [x, y, w, h] = d.start;
      let x1 = x; let y1 = y; let x2 = x + w; let y2 = y + h;
      if (d.corner === 0 || d.corner === 3) x1 = Math.min(ux, x2 - 1); else x2 = Math.max(ux, x1 + 1);
      if (d.corner === 0 || d.corner === 1) y1 = Math.min(uy, y2 - 1); else y2 = Math.max(uy, y1 + 1);
      if (d.piece.kind === 'platforms') y2 = y1 + 1; // platforms are one unit thick
      // A portal keeps its exit.
      s.edit('arenas', (docs) => { (docs.arenas[id][d.piece.kind as 'walls'] as number[][])[d.piece.index] = [x1, y1, x2 - x1, y2 - y1, ...d.start.slice(4)]; }, true);
      return;
    }
    if (d.kind === 'exit') {
      const [hx, hy] = this.unit(p, 0.5);
      s.edit('arenas', (docs) => { const w = docs.arenas[id].warps[d.index]; docs.arenas[id].warps[d.index] = [w[0], w[1], w[2], w[3], hx, hy]; }, true);
      return;
    }
    if (d.kind === 'draw') {
      if (d.index < 0) {
        d.index = this.arena![d.what].length;
        s.edit('arenas', (docs) => { docs.arenas[id][d.what].push([d.ux, d.uy, 1, 1]); }, true);
        s.select({ piece: { kind: d.what, index: d.index } });
      }
      const [ux, uy] = this.unit(p);
      const x1 = Math.min(d.ux, ux); const x2 = Math.max(d.ux, ux, x1 + 1);
      const y1 = Math.min(d.uy, uy); const y2 = d.what === 'platforms' ? y1 + 1 : Math.max(d.uy, uy, y1 + 1);
      s.edit('arenas', (docs) => { docs.arenas[id][d.what][d.index] = [x1, y1, Math.max(1, x2 - x1), Math.max(1, y2 - y1)]; }, true);
    }
  }

  private up(): void {
    if (this.drag && this.drag.kind !== 'pan' && this.drag.kind !== 'pinch') this.store.endDrag();
    this.drag = null;
    this.pressAt = null;
  }
}
