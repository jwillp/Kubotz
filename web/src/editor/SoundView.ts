import type Phaser from 'phaser';
import { renderSound, type Layer, type SoundDef } from '../audio/SoundDef';
import { synthSamples } from '../audio/Synth';
import { encodeWav, zip } from '../audio/Wav';
import type { Store } from './Store';

/** The rate sounds are exported at (CD quality). */
export const WAV_RATE = 44100;

/** How long a layer lasts on the lanes, in seconds. */
function layerSpan(l: Layer, defs: Record<string, SoundDef>): number {
  if (l.type === 'tone' || l.type === 'noise') return l.dur;
  if (l.type === 'ping') return (l.count ?? 1) > 1 ? (l.spread ?? 1) + 0.3 : 0.3;
  const other = defs[l.sound];
  return other ? other.length / Math.pow(2, (l.pitch ?? 0) / 12) : 0.1;
}

/**
 * The Sound tab's stage: the open sound's waveform (the picked layer's own
 * wave over it), a lane per layer (click to pick one, drag to move it in
 * time), and playing it through the game's audio.
 */
export class SoundView {
  readonly el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private audio: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private playedAt = 0;
  private playLength = 0;
  private mix: Float32Array = new Float32Array(1);
  private solo: Float32Array | null = null;
  private renderedFor = '';
  private seen = { key: '', sounds: '' };
  /** An edit to play once it is done (a slider let go). */
  private pending = false;
  private drag: { layer: number; x: number; at: number } | null = null;
  /** Plays the sound after each change. */
  autoPlay = true;
  loop = false;
  /** Called when a lane is clicked: the inspector opens that layer. */
  onPick: (layer: number) => void = () => {};

  constructor(private store: Store, private game?: Phaser.Game) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sound-wave';
    this.el = document.createElement('div');
    this.el.className = 'sound-view';
    this.el.append(this.canvas);
    new ResizeObserver(() => this.draw()).observe(this.el);
    this.canvas.addEventListener('pointerdown', (e) => this.down(e));
    this.canvas.addEventListener('pointermove', (e) => this.move(e));
    this.canvas.addEventListener('pointerup', () => { if (this.drag) { this.drag = null; this.store.endDrag(); } });
  }

  private get def(): SoundDef | undefined { return this.store.docs.sounds[this.store.sel.sound]; }

  /** After every store change: renders again if the sound changed, and plays it once an edit is done. */
  update(): void {
    if (!this.def || this.el.hidden) return;
    const key = this.store.sel.sound;
    const sounds = JSON.stringify(this.store.docs.sounds);
    const shape = `${key}|${this.store.sel.layer}|${sounds}`;
    if (shape !== this.renderedFor) { this.renderedFor = shape; this.render(); }
    // The same sound, changed: an edit (or an undo).
    if (this.seen.key === key && this.seen.sounds !== sounds) { this.toGame(); this.pending = true; }
    this.seen = { key, sounds };
    if (this.pending && !this.store.busy && !this.drag) { this.pending = false; if (this.autoPlay) this.play(); }
  }

  private rate(): number { return this.ctx()?.sampleRate ?? WAV_RATE; }

  private render(): void {
    const defs = this.store.docs.sounds;
    const key = this.store.sel.sound;
    this.mix = synthSamples(key, this.rate(), defs);
    const l = this.def?.layers[this.store.sel.layer];
    this.solo = l ? renderSound({ length: this.def!.length, seed: this.def!.seed, layers: [{ ...l, mute: false } as Layer] }, this.rate(), (k) => defs[k], [key]) : null;
    this.draw();
  }

  /** The game plays the edited sound from now on (its audio cache). */
  private toGame(): void {
    const cache = this.game?.cache.audio;
    const ctx = this.ctx();
    if (!cache || !ctx || !cache.exists(this.store.sel.sound)) return;
    const buf = ctx.createBuffer(1, this.mix.length, ctx.sampleRate);
    buf.copyToChannel(this.mix as Float32Array<ArrayBuffer>, 0);
    cache.remove(this.store.sel.sound);
    cache.add(this.store.sel.sound, buf);
  }

  private ctx(): AudioContext | null {
    const sm = this.game?.sound as unknown as { context?: AudioContext } | undefined;
    if (sm?.context) return sm.context;
    try { this.audio ??= new AudioContext(); } catch { return null; }
    return this.audio;
  }

  /** Plays the sound (or only the picked layer). */
  play(layerOnly = false): void {
    const ctx = this.ctx();
    if (!ctx) return;
    this.render();
    this.stop();
    void ctx.resume();
    const data = layerOnly && this.solo ? this.solo : this.mix;
    const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = this.loop;
    src.connect(ctx.destination);
    src.start();
    src.onended = () => { if (this.source === src) this.source = null; };
    this.source = src;
    this.playedAt = ctx.currentTime;
    this.playLength = buf.duration;
    const tick = () => { this.draw(); if (this.source === src) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  stop(): void {
    try { this.source?.stop(); } catch { /* already over */ }
    this.source = null;
    this.draw();
  }

  get playing(): boolean { return !!this.source; }

  // ------------------------------------------------------------ drawing
  private lanesTop(h: number): number { return Math.round(h * 0.5); }

  private draw(): void {
    const def = this.def;
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = this.el.clientWidth; const h = this.el.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    c.style.width = `${w}px`; c.style.height = `${h}px`;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0d1015';
    g.fillRect(0, 0, w, h);
    if (!def) return;
    const pad = 14;
    const top = this.lanesTop(h);
    const x = (t: number) => pad + (t / def.length) * (w - pad * 2);
    // Time ruler.
    g.font = '11px "JetBrains Mono", ui-monospace, monospace';
    const step = def.length > 1.5 ? 0.25 : def.length > 0.5 ? 0.1 : 0.05;
    for (let t = 0; t <= def.length + 1e-6; t += step) {
      g.fillStyle = '#262c36'; g.fillRect(Math.round(x(t)), 18, 1, h - 18);
      g.fillStyle = '#6b7685'; g.fillText(`${Math.round(t * 1000)}ms`, x(t) + 3, 12);
    }
    // The mix, then the picked layer over it.
    const mid = 18 + (top - 18) / 2; const amp = (top - 26) / 2;
    const wave = (d: Float32Array, color: string) => {
      g.fillStyle = color;
      const cols = Math.max(1, Math.floor(w - pad * 2));
      for (let px = 0; px < cols; px++) {
        const a = Math.floor((px / cols) * d.length); const b = Math.max(a + 1, Math.floor(((px + 1) / cols) * d.length));
        let lo = 0; let hi = 0;
        for (let i = a; i < b && i < d.length; i++) { const v = d[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        g.fillRect(pad + px, mid - Math.min(1, hi) * amp, 1, Math.max(1, (Math.min(1, hi) - Math.max(-1, lo)) * amp));
      }
    };
    wave(this.mix, '#5b6b80');
    if (this.solo) wave(this.solo, '#ffb547');
    g.fillStyle = '#3a4352'; g.fillRect(pad, mid, w - pad * 2, 1);
    // Lanes.
    const lanes = def.layers.length;
    const laneH = Math.min(26, (h - top - 8) / Math.max(1, lanes));
    def.layers.forEach((l, i) => {
      const y = top + i * laneH;
      const on = i === this.store.sel.layer;
      const x0 = x(l.at); const x1 = Math.max(x0 + 4, x(Math.min(def.length, l.at + layerSpan(l, this.store.docs.sounds))));
      g.globalAlpha = l.mute ? 0.35 : 1;
      g.fillStyle = on ? '#ffb547' : { tone: '#4f86c6', noise: '#8a7ab8', ping: '#4fb3a4', sound: '#c07a4f' }[l.type];
      g.fillRect(x0, y + 3, x1 - x0, laneH - 6);
      g.fillStyle = on ? '#1a1205' : '#e6ebf2';
      g.font = `${Math.min(12, laneH - 8)}px "Exo 2", system-ui, sans-serif`;
      g.save(); g.beginPath(); g.rect(x0, y, Math.max(x1 - x0, 160), laneH); g.clip();
      g.fillText(`${l.name ?? l.type}${l.mute ? ' (muted)' : ''}`, x0 + 5, y + laneH / 2 + 4);
      g.restore();
      g.globalAlpha = 1;
    });
    // Playhead.
    const ctx = this.ctx();
    if (this.source && ctx) {
      let t = ctx.currentTime - this.playedAt;
      if (this.loop) t %= this.playLength;
      if (t <= this.playLength) { g.fillStyle = '#ffffff'; g.fillRect(x(t), 18, 1.5, h - 18); }
    }
  }

  // ------------------------------------------------------------ lanes
  private laneAt(e: PointerEvent): number {
    const def = this.def;
    const r = this.canvas.getBoundingClientRect();
    const top = this.lanesTop(r.height);
    const laneH = Math.min(26, (r.height - top - 8) / Math.max(1, def?.layers.length ?? 1));
    const y = e.clientY - r.top - top;
    return y < 0 ? -1 : Math.floor(y / laneH);
  }

  private down(e: PointerEvent): void {
    const def = this.def;
    if (!def) return;
    const i = this.laneAt(e);
    if (i < 0) { this.play(); return; }
    if (i >= def.layers.length) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.drag = { layer: i, x: e.clientX, at: def.layers[i].at };
    if (this.store.sel.layer !== i) { this.store.select({ layer: i }); this.onPick(i); }
  }

  private move(e: PointerEvent): void {
    const def = this.def;
    if (!this.drag || !def) return;
    const r = this.canvas.getBoundingClientRect();
    const dt = ((e.clientX - this.drag.x) / Math.max(1, r.width - 28)) * def.length;
    if (Math.abs(e.clientX - this.drag.x) < 3) return;
    const at = Math.max(0, Math.round((this.drag.at + dt) * 1000) / 1000);
    const { layer } = this.drag;
    const key = this.store.sel.sound;
    this.store.edit('sounds', (d) => { d.sounds[key].layers[layer].at = at; }, true);
  }

  // ------------------------------------------------------------ export
  /**
   * Writes sounds as WAVs: through the dev server into web/sound-exports,
   * else as a download (on claude.ai, a zip: the page may not hand over .wav files).
   */
  async exportWavs(keys: string[]): Promise<string> {
    const defs = this.store.docs.sounds;
    const files: Record<string, Uint8Array> = {};
    for (const k of keys) files[`${k}.wav`] = encodeWav(synthSamples(k, WAV_RATE, defs), WAV_RATE);
    const names = Object.keys(files);
    if (import.meta.env.DEV) {
      for (const [name, data] of Object.entries(files)) {
        const res = await fetch(`/__editor/wav?file=${encodeURIComponent(name)}`, { method: 'POST', body: data as Uint8Array<ArrayBuffer> });
        if (!res.ok) throw new Error(`${name}: ${await res.text()}`);
      }
      return `Wrote ${names.length > 3 ? `${names.length} WAVs` : names.join(', ')} to web/sound-exports`;
    }
    type Downloads = { save(r: { filename: string; data: Uint8Array }): Promise<unknown> };
    const host = (window as unknown as { claude?: { use(n: string): Promise<Downloads | null> } }).claude;
    const downloads = host ? await host.use('downloads').catch(() => null) : null;
    if (downloads) {
      const filename = keys.length === 1 ? `${keys[0]}-wav.zip` : 'kubotz-sounds-wav.zip';
      await downloads.save({ filename, data: zip(files) });
      return `Downloaded ${filename}`;
    }
    const one = names.length === 1;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([(one ? files[names[0]] : zip(files)) as Uint8Array<ArrayBuffer>], { type: one ? 'audio/wav' : 'application/zip' }));
    a.download = one ? names[0] : 'kubotz-sounds-wav.zip';
    a.click();
    URL.revokeObjectURL(a.href);
    return `Downloaded ${a.download}`;
  }
}
