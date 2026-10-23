import { FRAME_MS, type Store } from './Store';
import type { Ease } from '../anim/Clips';

/**
 * The timeline under the stage, drawn on a canvas: a column per frame (60 a
 * second), the clip's keys (drag to retime, click to jump), the move's
 * active frames (drag either end) and its effects, and the playhead.
 */

const ROW = 30;
const HEAD = 22;
const LABEL = 118;
const ROWS = ['Keys', 'Hit (active)', 'Hurtbox', 'Effects', 'Particles'] as const;
const PARTICLE_ROW = HEAD + 4 * ROW;

type Drag = { kind: 'head' } | { kind: 'key'; index: number } | { kind: 'event'; index: number } | { kind: 'active'; end: 0 | 1 };

export class Timeline {
  readonly el: HTMLCanvasElement;
  private drag: Drag | null = null;

  constructor(private readonly store: Store) {
    this.el = document.createElement('canvas');
    this.el.className = 'timeline';
    this.el.dataset.help = 'One column per frame (60 a second). Keys: the poses you set; click to jump, drag to retime, right-click to delete. Hit (active): the frames the hit circles hurt; drag either end. Hurtbox: always on. Particles: the effects this clip starts, each on its frame (drag to retime, right-click to delete). Effects: what the move shows besides the hit (afterimages, part swaps like the fire gauntlet, a special\'s speed burst), set in the Effects and Special motion sections.';
    this.el.addEventListener('pointerdown', (e) => this.down(e));
    this.el.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', () => { if (this.drag && this.drag.kind !== 'head') this.store.endDrag(); this.drag = null; });
    this.el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const k = this.keyUnder(e);
      if (k >= 0) this.store.edit('clips', (d) => { d.clips[this.store.sel.clip].keys.splice(k, 1); });
      const ev = this.eventUnder(e);
      if (ev >= 0) this.store.edit('clips', (d) => { d.clips[this.store.sel.clip].events!.splice(ev, 1); });
    });
    new ResizeObserver(() => this.draw()).observe(this.el);
    store.on(() => this.draw());
  }

  private get frames(): number { return Math.max(1, Math.round(this.store.playMs / FRAME_MS)); }
  private get width(): number { return this.el.clientWidth - LABEL - 12; }
  private xOf(t: number): number { return LABEL + t * this.width; }
  private tOf(x: number): number { return Math.min(1, Math.max(0, (x - LABEL) / this.width)); }
  /** A time snapped to the nearest frame. */
  private snap(t: number): number { const f = this.frames; return Math.round(t * f) / f; }

  private local(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private keyUnder(e: MouseEvent): number {
    const { x, y } = this.local(e);
    if (y < HEAD || y > HEAD + ROW) return -1;
    return this.store.clipData.keys.findIndex((k) => Math.abs(this.xOf(k.t) - x) < 7);
  }

  private eventUnder(e: MouseEvent): number {
    const { x, y } = this.local(e);
    if (y < PARTICLE_ROW || y > PARTICLE_ROW + ROW) return -1;
    return (this.store.clipData.events ?? []).findIndex((ev) => Math.abs(this.xOf(ev.t) - x) < 7);
  }

  private down(e: PointerEvent): void {
    this.el.setPointerCapture(e.pointerId);
    const { x, y } = this.local(e);
    const s = this.store;
    const k = this.keyUnder(e);
    if (k >= 0) {
      this.drag = { kind: 'key', index: k };
      s.select({ t: s.clipData.keys[k].t });
      return;
    }
    const ev = this.eventUnder(e);
    if (ev >= 0) {
      this.drag = { kind: 'event', index: ev };
      s.select({ t: s.clipData.events![ev].t });
      return;
    }
    const move = s.move();
    if (move && y >= HEAD + ROW && y < HEAD + 2 * ROW) {
      const [a, b] = move.active;
      const end = Math.abs(this.xOf(a) - x) < Math.abs(this.xOf(b) - x) ? 0 : 1;
      if (Math.abs(this.xOf(move.active[end]) - x) < 10) { this.drag = { kind: 'active', end }; return; }
    }
    this.drag = { kind: 'head' };
    s.select({ t: this.snap(this.tOf(x)) });
  }

  private move(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    const s = this.store;
    const t = this.snap(this.tOf(this.local(e).x));
    if (d.kind === 'head') { s.select({ t }); return; }
    if (d.kind === 'key') {
      const keys = s.clipData.keys;
      // A key stays between its neighbours; the first one stays at 0.
      if (d.index === 0) return;
      const lo = keys[d.index - 1].t + 1e-3; const hi = (keys[d.index + 1]?.t ?? 1 + 1e-3) - 1e-3;
      const nt = Math.min(hi, Math.max(lo, t));
      s.edit('clips', (docs) => { docs.clips[s.sel.clip].keys[d.index].t = Math.round(nt * 1000) / 1000; }, true);
      s.sel.t = nt;
      return;
    }
    if (d.kind === 'event') {
      s.edit('clips', (docs) => { docs.clips[s.sel.clip].events![d.index].t = Math.round(t * 1000) / 1000; }, true);
      s.sel.t = t;
      return;
    }
    s.edit('moves', (docs) => {
      const ref = s.sel.move!;
      const m = (docs.moves[ref.table] as unknown as Record<string, { active: [number, number] }>)[ref.key];
      const a = [...m.active] as [number, number];
      a[d.end] = Math.round(t * 1000) / 1000;
      if (a[0] > a[1]) a.reverse();
      m.active = a;
    }, true);
  }

  draw(): void {
    const c = this.el;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth; const h = c.clientHeight;
    if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const s = this.store;
    const frames = this.frames;
    const fw = this.width / frames;
    g.font = '11px "JetBrains Mono", ui-monospace, monospace';
    // Rows and their labels.
    ROWS.forEach((name, i) => {
      const y = HEAD + i * ROW;
      g.fillStyle = i % 2 ? '#151a21' : '#12161c';
      g.fillRect(0, y, w, ROW);
      g.fillStyle = i === 1 ? '#ff8080' : i === 2 ? '#7cc4ff' : i === 4 ? '#c9b6ff' : '#9aa4b2';
      g.fillText(name, 10, y + 19);
    });
    g.fillStyle = '#0f1217';
    g.fillRect(0, 0, w, HEAD);
    // Frame ticks: every frame, numbered every 5 (or 10 when tight).
    const every = fw < 9 ? 10 : 5;
    for (let f = 0; f <= frames; f++) {
      const x = LABEL + f * fw;
      g.strokeStyle = f % every === 0 ? '#2c3440' : '#1c222b';
      g.beginPath(); g.moveTo(x + 0.5, HEAD - (f % every === 0 ? 8 : 4)); g.lineTo(x + 0.5, HEAD + ROWS.length * ROW); g.stroke();
      if (f % every === 0) { g.fillStyle = '#6b7685'; g.fillText(String(f), x + 3, 12); }
    }
    // Keys.
    const ky = HEAD + ROW / 2;
    const cur = s.keyAt();
    s.clipData.keys.forEach((k) => {
      const x = this.xOf(k.t);
      g.fillStyle = k === cur ? '#ffffff' : '#ffb547';
      g.beginPath(); g.moveTo(x, ky - 7); g.lineTo(x + 7, ky); g.lineTo(x, ky + 7); g.lineTo(x - 7, ky); g.closePath(); g.fill();
      g.fillStyle = '#6b7685';
      g.fillText(easeMark(k.ease), x + 9, ky + 4);
    });
    // The move: active frames, the hurtbox (always on) and effects.
    const move = s.move();
    if (move) {
      const [a, b] = move.active;
      const y = HEAD + ROW + 7;
      g.fillStyle = 'rgba(255,77,77,0.8)';
      g.fillRect(this.xOf(a), y, this.xOf(b) - this.xOf(a), ROW - 14);
      g.fillStyle = '#ffffff';
      g.fillRect(this.xOf(a) - 2, y, 4, ROW - 14);
      g.fillRect(this.xOf(b) - 2, y, 4, ROW - 14);
      g.fillStyle = '#ffd0d0';
      g.fillText(`${Math.round(a * frames)}-${Math.round(b * frames)}`, this.xOf(b) + 6, y + 12);
      // Each effect as a bar over the part of the move it covers (all of it, or the burst's share).
      const fxs: [string, number, string][] = [];
      if (move.ghosts) fxs.push(['afterimages', 1, '#4a5568']);
      for (const m of move.maps ?? []) fxs.push([m.replace('gauntlet_', '').replace(/([A-Z])/g, ' $1').toLowerCase(), 1, '#7a5cd6']);
      if (move.burst) fxs.push(['burst', move.sustain ?? 1, '#b0663a']);
      // Names on top, in their bar's colour; thin bars underneath.
      const y3 = HEAD + 3 * ROW;
      const lane = fxs.length ? Math.min(5, 10 / fxs.length) : 0;
      let tx = LABEL + 4;
      fxs.forEach(([label, until, color], i) => {
        g.fillStyle = color;
        g.fillRect(LABEL, y3 + 17 + i * (lane + 1), this.xOf(until) - LABEL, lane);
        g.fillStyle = shade(color);
        g.fillText(label, tx, y3 + 12);
        tx += g.measureText(label).width + 14;
      });
      if (!fxs.length) { g.fillStyle = '#4b5563'; g.fillText('none (set them in the Effects section)', LABEL + 6, HEAD + 3 * ROW + 19); }
    } else {
      g.fillStyle = '#4b5563';
      g.fillText('pick a move to see its active frames', LABEL + 6, HEAD + ROW + 19);
    }
    g.fillStyle = 'rgba(47,111,176,0.55)';
    g.fillRect(LABEL, HEAD + 2 * ROW + 9, this.width, ROW - 18);
    // Particle events: purple diamonds with the effect's name (a charge event has a ring: it plays while the smash charges).
    const py = PARTICLE_ROW + ROW / 2;
    for (const ev of s.clipData.events ?? []) {
      const x = this.xOf(ev.t);
      g.fillStyle = '#b18cff';
      g.beginPath(); g.moveTo(x, py - 7); g.lineTo(x + 7, py); g.lineTo(x, py + 7); g.lineTo(x - 7, py); g.closePath(); g.fill();
      if (ev.charge) { g.strokeStyle = '#e3d6ff'; g.beginPath(); g.arc(x, py, 10, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#c9b6ff';
      g.fillText(ev.effect, x + 11, py + 4);
    }
    if (!(s.clipData.events ?? []).length) { g.fillStyle = '#4b5563'; g.fillText('none (add one in the Particles section)', LABEL + 6, py + 4); }

    // Playhead.
    const px = this.xOf(s.sel.t);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(px, 0); g.lineTo(px, HEAD + ROWS.length * ROW); g.stroke();
    g.lineWidth = 1;
  }
}

/** A lighter version of a bar colour, for its label. */
function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const up = (v: number) => Math.round(v + (255 - v) * 0.55);
  return `rgb(${up(n >> 16)}, ${up((n >> 8) & 255)}, ${up(n & 255)})`;
}

function easeMark(e?: Ease): string {
  return { linear: '/', in: 'in', out: 'out', inOut: '', back: 'back', snap: 'snap' }[e ?? 'inOut'];
}

export const TIMELINE_HEIGHT = HEAD + ROWS.length * ROW + 4;
