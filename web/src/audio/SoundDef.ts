/**
 * A sound made in code, as data: a stack of layers (tones, noise, glass
 * pings, other sounds) mixed into one buffer, then chorus, delay and reverb.
 * The files are in src/data/sounds (one per sound key) and the Sound tab of
 * the editor edits them. render() is plain math over samples, free of
 * Phaser and of Web Audio nodes, so a worker can run it (SynthWorker.ts)
 * and the result is the same in every browser; the noise comes from a
 * seeded generator, so a sound is the same on every boot too.
 */

/** A value that moves over time: from `from` to `to` along `curve`, over `time` seconds (the layer's length by default). */
export interface Sweep {
  from: number;
  to?: number;
  /** linear; exp (even steps in pitch); drop (falls fast then settles, `k` = how fast); arch (out to `to` and back, `k` bends it). */
  curve?: 'linear' | 'exp' | 'drop' | 'arch';
  k?: number;
  time?: number;
}

/** How loud a layer is over its length: a linear fade in over `attack` seconds, times `shape`. */
export interface Envelope {
  attack?: number;
  /**
   * hold: full to the end; linear: down to `end` (0 by default); exp: dies
   * away (`k` = how fast); pow: (1 - u)^k; arch: up and down, loudest at
   * the middle; release: full for `hold` seconds, then dies away (`k`).
   */
  shape?: 'hold' | 'linear' | 'exp' | 'pow' | 'arch' | 'release';
  k?: number;
  end?: number;
  hold?: number;
}

/** A tremolo: sine sways the level down by `depth`; square cuts it by `depth` while the cycle is below `duty` (-1..1). */
export interface Lfo { shape: 'sine' | 'square'; rate: number; depth: number; duty?: number }

export interface Filter {
  /** lowpass and highpass: one pole; bandpass: resonant (`q`); tilt: a gentle brightening (`amount` 0..1). */
  type: 'lowpass' | 'highpass' | 'bandpass' | 'tilt';
  cutoff?: Sweep;
  q?: number;
  amount?: number;
}

interface LayerBase {
  name?: string;
  /** Start, in seconds from the start of the sound. */
  at: number;
  gain: number;
  mute?: boolean;
}

/** An oscillator gliding along a pitch sweep. */
export interface ToneLayer extends LayerBase {
  type: 'tone';
  dur: number;
  freq: Sweep;
  /** soft: a sine pushed into a soft clip by `drive`, for digital blips. */
  wave?: 'sine' | 'soft' | 'square' | 'saw' | 'triangle';
  drive?: number;
  /** Extra voices at pitch ratios: [ratio, level]. Without them, one voice. */
  partials?: [number, number][];
  /** Vibrato: `depth` is a fraction of the pitch, or Hz when `hz`. */
  wobble?: { rate: number; depth: number; hz?: boolean };
  env?: Envelope;
  lfo?: Lfo;
}

/** White noise through filters. */
export interface NoiseLayer extends LayerBase {
  type: 'noise';
  dur: number;
  filters?: Filter[];
  /** A ring modulator: a metallic, synthetic grit. */
  ring?: { freq: number; depth: number };
  env?: Envelope;
  lfo?: Lfo;
}

/** A struck glass or metal: inharmonic partials [ratio, level, decay] with a click of contact. `count` > 1 scatters random pings (sparks). */
export interface PingLayer extends LayerBase {
  type: 'ping';
  freq: number;
  partials?: [number, number, number][];
  click?: number;
  count?: number;
  spread?: number;
  freqTo?: number;
}

/** Another sound mixed in, `pitch` semitones up or down (faster and shorter going up, like a tape). */
export interface SoundLayer extends LayerBase {
  type: 'sound';
  sound: string;
  pitch?: number;
}

export type Layer = ToneLayer | NoiseLayer | PingLayer | SoundLayer;

export interface SoundDef {
  /** What the sound is for, shown in the editor. */
  note?: string;
  /** Seconds. */
  length: number;
  seed?: number;
  layers: Layer[];
  chorus?: { voices: number; depth: number; rate: number; mix: number };
  delay?: { time: number; feedback: number; mix: number };
  reverb?: number;
  /** Scaled down to this peak if louder. */
  normalize?: number;
}

/** Glass partials (a struck glass sphere is inharmonic) with fast, partial-dependent decays. */
export const GLASS: [number, number, number][] = [[1, 1, 9], [2.32, 0.55, 14], [4.25, 0.35, 22], [6.63, 0.2, 30], [9.38, 0.12, 40]];

/** A small seeded random generator (mulberry32), so the noise is the same every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A sweep's value `t` seconds into a layer `dur` long. */
export function sweepAt(s: Sweep, t: number, dur: number): number {
  const to = s.to ?? s.from;
  if (to === s.from) return s.from;
  const span = s.time ?? dur;
  const u = span > 0 ? Math.min(1, Math.max(0, t / span)) : 1;
  switch (s.curve ?? 'linear') {
    case 'exp': return s.from > 0 && to > 0 ? s.from * Math.pow(to / s.from, u) : s.from + (to - s.from) * u;
    case 'drop': return to + (s.from - to) * Math.exp(-u * (s.k ?? 6));
    case 'arch': return s.from + (to - s.from) * Math.sin(Math.PI * Math.pow(u, s.k ?? 1));
    default: return s.from + (to - s.from) * u;
  }
}

/** An envelope's level at `u` (0..1 of the layer), `t` seconds in. */
export function envAt(e: Envelope | undefined, u: number, t: number, dur: number): number {
  if (!e) return 1;
  const a = e.attack && e.attack > 0 ? Math.min(1, t / e.attack) : 1;
  const k = e.k ?? 4;
  switch (e.shape ?? 'hold') {
    case 'linear': return a * (1 - u * (1 - (e.end ?? 0)));
    case 'exp': return a * Math.exp(-u * k);
    case 'pow': return a * Math.pow(Math.max(0, 1 - u), k);
    case 'arch': return a * Math.sin(Math.PI * Math.min(1, u));
    case 'release': {
      const h = (e.hold ?? 0) / dur;
      return a * (u < h ? 1 : Math.exp(-(u - h) * k));
    }
    default: return a;
  }
}

function lfoAt(l: Lfo | undefined, t: number): number {
  if (!l) return 1;
  const s = Math.sin(2 * Math.PI * l.rate * t);
  return l.shape === 'square' ? (s > (l.duty ?? 0) ? 1 : 1 - l.depth) : 1 - l.depth * (1 - s) / 2;
}

function wave(kind: ToneLayer['wave'], ph: number, drive: number): number {
  switch (kind) {
    case 'soft': return Math.tanh(drive * Math.sin(ph));
    case 'square': return Math.sin(ph) >= 0 ? 1 : -1;
    case 'saw': { const p = ph / (2 * Math.PI); return 2 * (p - Math.floor(p)) - 1; }
    case 'triangle': { const p = ph / (2 * Math.PI); return 1 - 4 * Math.abs(p - Math.floor(p + 0.5)); }
    default: return Math.sin(ph);
  }
}

function tone(d: Float32Array, rate: number, l: ToneLayer): void {
  const start = Math.floor(l.at * rate);
  const n = Math.floor(l.dur * rate);
  const end = Math.min(d.length, start + n);
  const parts = l.partials?.length ? l.partials : [[1, 1]];
  let phase = 0;
  for (let i = Math.max(0, start); i < end; i++) {
    const u = (i - start) / n;
    const t = (i - start) / rate;
    let f = sweepAt(l.freq, t, l.dur);
    if (l.wobble) {
      const w = l.wobble.depth * Math.sin(2 * Math.PI * l.wobble.rate * t);
      f = l.wobble.hz ? f + w : f * (1 + w);
    }
    phase += (2 * Math.PI * f) / rate;
    let v = 0;
    for (const [m, a] of parts) v += a * wave(l.wave, phase * m, l.drive ?? 2.2);
    d[i] += l.gain * v * envAt(l.env, u, t, l.dur) * lfoAt(l.lfo, t);
  }
}

function noise(d: Float32Array, rate: number, l: NoiseLayer, rand: () => number): void {
  const start = Math.floor(l.at * rate);
  const n = Math.floor(l.dur * rate);
  const end = Math.min(d.length, start + n);
  const filters = l.filters ?? [];
  // Per filter: one-pole state, or the band-pass's low and band, or the tilt's last input.
  const st = filters.map(() => ({ a: 0, b: 0 }));
  for (let i = Math.max(0, start); i < end; i++) {
    const u = (i - start) / n;
    const t = (i - start) / rate;
    let x = rand() * 2 - 1;
    filters.forEach((f, j) => {
      const s = st[j];
      const fc = f.cutoff ? Math.min(rate * 0.45, Math.max(1, sweepAt(f.cutoff, t, l.dur))) : 1000;
      if (f.type === 'lowpass' || f.type === 'highpass') {
        s.a += (x - s.a) * (1 - Math.exp((-2 * Math.PI * fc) / rate));
        x = f.type === 'lowpass' ? s.a : x - s.a;
      } else if (f.type === 'bandpass') {
        const g = 2 * Math.sin((Math.PI * fc) / rate);
        s.a += g * s.b;
        s.b += g * (x - s.a - s.b / (f.q ?? 1.4));
        x = s.b;
      } else {
        const y = x - (f.amount ?? 0.5) * s.a;
        s.a = x;
        x = y;
      }
    });
    if (l.ring) x *= 1 - l.ring.depth + l.ring.depth * Math.sin(2 * Math.PI * l.ring.freq * t);
    d[i] += l.gain * x * envAt(l.env, u, t, l.dur) * lfoAt(l.lfo, t);
  }
}

function ping(d: Float32Array, rate: number, l: PingLayer, rand: () => number): void {
  const parts = l.partials?.length ? l.partials : GLASS;
  // Stop once even the slowest partial is below a thousandth.
  const life = 7 / Math.max(1, Math.min(...parts.map((p) => p[2])));
  const click = l.click ?? 0.0005;
  const one = (at: number, f: number, gain: number) => {
    const start = Math.floor(at * rate);
    const end = Math.min(d.length, start + Math.floor(rate * life));
    for (let i = Math.max(0, start); i < end; i++) {
      const t = (i - start) / rate;
      let v = 0;
      for (const [m, a, k] of parts) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * k);
      d[i] += gain * v * (click > 0 ? Math.min(1, t / click) : 1);
    }
  };
  const count = Math.max(1, Math.round(l.count ?? 1));
  if (count === 1) { one(l.at, l.freq, l.gain); return; }
  const spread = l.spread ?? 1;
  for (let c = 0; c < count; c++) {
    // Sparks: more of them early, quieter later.
    const off = Math.pow(rand(), 1.6) * spread;
    const f = l.freq + rand() * ((l.freqTo ?? l.freq) - l.freq);
    one(l.at + off, f, l.gain * (1 - 0.7 * (off / Math.max(1e-6, spread))));
  }
}

/** Another sound, resampled to `pitch` semitones. */
function mixSound(d: Float32Array, rate: number, l: SoundLayer, src: Float32Array): void {
  const ratio = Math.pow(2, (l.pitch ?? 0) / 12);
  const start = Math.floor(l.at * rate);
  for (let i = Math.max(0, start); i < d.length; i++) {
    const p = (i - start) * ratio;
    const j = Math.floor(p);
    if (j + 1 >= src.length) break;
    d[i] += l.gain * (src[j] + (src[j + 1] - src[j]) * (p - j));
  }
}

/** Chorus: copies of the sound on short delays that sway, each at its own phase. */
function chorus(d: Float32Array, rate: number, c: NonNullable<SoundDef['chorus']>): void {
  const voices = Math.max(1, Math.round(c.voices));
  const src = d.slice();
  const base = 0.012 * rate;
  const depth = (c.depth / 1000) * rate;
  for (let i = 0; i < d.length; i++) {
    let wet = 0;
    for (let v = 0; v < voices; v++) {
      const p = i - base - depth * (1 + Math.sin(2 * Math.PI * c.rate * (i / rate) + (2 * Math.PI * v) / voices)) / 2;
      const j = Math.floor(p);
      if (j >= 0 && j + 1 < src.length) wet += src[j] + (src[j + 1] - src[j]) * (p - j);
    }
    d[i] = src[i] * (1 - c.mix * 0.5) + (wet / voices) * c.mix;
  }
}

/** Echoes: the sound repeated every `time` seconds, each `feedback` times quieter. */
function delay(d: Float32Array, rate: number, e: NonNullable<SoundDef['delay']>): void {
  const n = Math.max(1, Math.floor(e.time * rate));
  const echo = new Float32Array(d.length);
  for (let i = n; i < d.length; i++) echo[i] = d[i - n] + echo[i - n] * e.feedback;
  for (let i = 0; i < d.length; i++) d[i] += echo[i] * e.mix;
}

/**
 * A small room reverb (Schroeder: parallel combs then allpasses) mixed into
 * the buffer, so the synth sounds sit in the same space as the sampled ones.
 */
function reverb(d: Float32Array, rate: number, wet: number): void {
  const k = rate / 44100;
  const combs = [1557, 1617, 1491, 1422].map((n) => Math.floor(n * k));
  const out = new Float32Array(d.length);
  for (const n of combs) {
    const buf = new Float32Array(n); let j = 0; let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const y = buf[j];
      lp = y * 0.6 + lp * 0.4; // damping
      buf[j] = d[i] + lp * 0.8;
      out[i] += y / combs.length;
      j = (j + 1) % n;
    }
  }
  for (const n of [225, 556].map((m) => Math.floor(m * k))) {
    const buf = new Float32Array(n); let j = 0;
    for (let i = 0; i < d.length; i++) {
      const b = buf[j];
      const x = out[i];
      buf[j] = x + b * 0.5;
      out[i] = b - x * 0.5;
      j = (j + 1) % n;
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = d[i] * (1 - wet * 0.4) + out[i] * wet;
}

/**
 * A sound's samples at `rate`. `lookup` finds the sounds a 'sound' layer
 * mixes in (a sound that comes back to itself is left out).
 */
export function renderSound(def: SoundDef, rate: number, lookup: (key: string) => SoundDef | undefined = () => undefined, path: string[] = []): Float32Array {
  const d = new Float32Array(Math.max(1, Math.floor(rate * def.length)));
  const rand = seeded(def.seed ?? 1);
  for (const l of def.layers) {
    if (l.mute) continue;
    if (l.type === 'tone') tone(d, rate, l);
    else if (l.type === 'noise') noise(d, rate, l, rand);
    else if (l.type === 'ping') ping(d, rate, l, rand);
    else if (l.type === 'sound') {
      const other = lookup(l.sound);
      if (other && !path.includes(l.sound)) mixSound(d, rate, l, renderSound(other, rate, lookup, [...path, l.sound]));
    }
  }
  if (def.chorus && def.chorus.mix > 0) chorus(d, rate, def.chorus);
  if (def.delay && def.delay.mix > 0) delay(d, rate, def.delay);
  if (def.reverb) reverb(d, rate, def.reverb);
  if (def.normalize) {
    let peak = 0;
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > def.normalize) for (let i = 0; i < d.length; i++) d[i] *= def.normalize / peak;
  }
  return d;
}
