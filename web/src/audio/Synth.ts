/**
 * The sounds made in code (Web Audio buffers), as opposed to the original
 * recordings in public/audio. Sounds.ts lists them all.
 */

/** Glass partials (a struck glass sphere is inharmonic) with fast, partial-dependent decays. */
const GLASS = [[1, 1, 9], [2.32, 0.55, 14], [4.25, 0.35, 22], [6.63, 0.2, 30], [9.38, 0.12, 40]];

function ping(d: Float32Array, rate: number, at: number, f: number, gain: number): void {
  const start = Math.floor(at * rate);
  // Past 0.8 s even the slowest partial (e^-9t) is below a thousandth: stop there.
  const end = Math.min(d.length, start + Math.floor(rate * 0.8));
  for (let i = start; i < end; i++) {
    const t = (i - start) / rate;
    let v = 0;
    for (const [m, a, k] of GLASS) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * k);
    // A hard click of contact, then the ring.
    d[i] += gain * v * Math.min(1, t * 2000);
  }
}

/** A round crystal ball bouncing: a bright glassy tink. */
export function crystalBounceBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 0.6), rate);
  const d = buf.getChannelData(0);
  ping(d, rate, 0, 2640, 0.3);
  ping(d, rate, 0.003, 3950, 0.1);
  return buf;
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

/** A sine tone whose frequency glides along f(t), into the buffer. */
function glide(d: Float32Array, rate: number, at: number, dur: number, f: (u: number) => number, amp: (u: number) => number): void {
  let phase = 0;
  const start = Math.floor(at * rate);
  const end = Math.min(d.length, start + Math.floor(dur * rate));
  for (let i = start; i < end; i++) {
    const u = (i - start) / (end - start);
    phase += (2 * Math.PI * f(u)) / rate;
    d[i] += amp(u) * Math.sin(phase);
  }
}

/** Picking a power-up: a sci-fi energy sweep up with digital blips, in a little reverb. */
export function pickupChimeBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 1.2), rate);
  const d = buf.getChannelData(0);
  // The power-up charge: a rising sweep with a fast FM warble.
  glide(d, rate, 0, 0.32, (u) => 380 * Math.pow(7, u) * (1 + 0.06 * Math.sin(u * 2 * Math.PI * 22)),
    (u) => 0.22 * Math.min(1, u * 12) * (1 - u * 0.5));
  // A detuned second voice an octave up, for a phaser-like shimmer.
  glide(d, rate, 0.02, 0.3, (u) => 772 * Math.pow(7, u), (u) => 0.08 * Math.min(1, u * 10) * (1 - u));
  // Three quick square-ish blips at the top.
  [2093, 2637, 3136].forEach((f, n) => glide(d, rate, 0.3 + n * 0.06, 0.07, () => f,
    (u) => 0.1 * (1 - u) * Math.min(1, u * 40) * (Math.sin(u * 2 * Math.PI * 30) > -0.2 ? 1 : 0.4)));
  // The landing tone: a clean high ring that fades.
  glide(d, rate, 0.48, 0.6, () => 2093, (u) => 0.09 * Math.exp(-u * 5) * Math.min(1, u * 60));
  reverb(d, rate, 0.35);
  return buf;
}

/** The health power-up: a warm rising chord swell with a soft sparkle, in a little reverb. */
export function healChimeBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 1.6), rate);
  const d = buf.getChannelData(0);
  // A major chord (C E G C) blooming in one note after another, each sliding up a touch.
  [523.25, 659.25, 783.99, 1046.5].forEach((f, n) => {
    const at = n * 0.09;
    glide(d, rate, at, 1.0 - at * 0.5, (u) => f * (0.97 + 0.03 * Math.min(1, u * 6)),
      (u) => 0.11 * Math.min(1, u * 8) * Math.exp(-u * 2.6));
    // A soft octave overtone so it reads as a pad, not a beep.
    glide(d, rate, at, 0.8, (u) => 2 * f, (u) => 0.025 * Math.min(1, u * 8) * Math.exp(-u * 4));
  });
  // Sparkle: little glassy pings rising above the chord.
  [2093, 2637, 3136, 4186].forEach((f, n) => ping(d, rate, 0.25 + n * 0.07, f, 0.05));
  reverb(d, rate, 0.4);
  return buf;
}

/**
 * A Kubot blowing up, sci-fi style: a sub-bass thump, a laser zap diving
 * down, a filtered blast of noise with a ring-modulated metallic edge,
 * crackling sparks and a shimmering power-down whine, in a larger reverb.
 */
export function sciFiExplosionBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 2.2), rate);
  const d = buf.getChannelData(0);
  // Sub thump: a sine dropping from 120 to 35 Hz.
  glide(d, rate, 0, 0.7, (u) => 35 + 85 * Math.exp(-u * 6), (u) => 0.55 * Math.exp(-u * 4) * Math.min(1, u * 300));
  // Laser zap diving from 2.4 kHz with a fast FM wobble.
  glide(d, rate, 0, 0.45, (u) => 2400 * Math.pow(0.03, u) * (1 + 0.25 * Math.sin(u * 2 * Math.PI * 38)),
    (u) => 0.16 * Math.exp(-u * 3) * Math.min(1, u * 200));
  // Blast: noise through a falling low-pass, ring-modulated for a metallic, synthetic grit.
  let low = 0; let band = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const noise = Math.random() * 2 - 1;
    const k = 0.03 + 0.45 * Math.exp(-t * 7);
    low += (noise - low) * k;
    band += (low - band) * 0.2; // takes the hiss off
    const ring = 0.6 + 0.4 * Math.sin(2 * Math.PI * (180 + 60 * Math.exp(-t * 3)) * t);
    d[i] += band * 1.4 * ring * Math.exp(-t * 2.6) * Math.min(1, t * 500);
  }
  // Crackle: bright little sparks scattered through the first second.
  for (let n = 0; n < 34; n++) {
    const at = Math.pow(Math.random(), 1.6) * 1.0;
    ping(d, rate, at, 1800 + Math.random() * 3200, 0.05 * (1 - at * 0.7));
  }
  // Power-down whine: a thin tone sliding down as the core dies.
  glide(d, rate, 0.15, 1.2, (u) => 900 * Math.pow(0.12, u), (u) => 0.05 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - u));
  reverb(d, rate, 0.45);
  // Keep it below clipping.
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0.95) for (let i = 0; i < d.length; i++) d[i] *= 0.95 / peak;
  return buf;
}

/**
 * A boot step on a metal floor, kept soft: a dull heel thud, a short damped
 * ring of the plate (inharmonic partials) and a faint scuff, in a little
 * reverb. `variant` shifts the plate's pitch so repeated steps differ.
 */
export function metalStepBuffer(ctx: BaseAudioContext, variant: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 0.35), rate);
  const d = buf.getChannelData(0);
  const shift = [1, 1.07, 0.94][variant % 3];
  // Heel thud: a low sine dropping in pitch, gone in a few tens of ms.
  glide(d, rate, 0, 0.09, (u) => 70 + 50 * Math.exp(-u * 8), (u) => 0.42 * Math.exp(-u * 9) * Math.min(1, u * 120));
  // The plate: damped inharmonic partials (a grate, not a bell).
  const plate = [[430, 0.13, 55], [1160, 0.07, 70], [1890, 0.045, 90], [3020, 0.025, 120]];
  for (let i = 0; i < d.length; i++) {
    const t = i / rate - 0.004;
    if (t < 0) continue;
    let v = 0;
    for (const [f, a, k] of plate) v += a * Math.sin(2 * Math.PI * f * shift * t) * Math.exp(-t * k);
    d[i] += v * Math.min(1, t * 3000);
  }
  // Scuff: a short, soft burst of smoothed noise as the sole meets the floor.
  let lp = 0;
  for (let i = 0; i < Math.floor(rate * 0.03); i++) {
    const t = i / rate;
    lp += ((Math.random() * 2 - 1) - lp) * 0.35;
    d[i] += lp * 0.09 * Math.exp(-t * 120);
  }
  reverb(d, rate, 0.18);
  return buf;
}

// ------------------------------------------------------------------ spawn
/** The materialize sound: a rising shimmer, crackles of scan lines and a soft lock-in tone. */
export function holoSpawnBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 1.9), rate);
  const d = buf.getChannelData(0);
  let ph1 = 0; let ph2 = 0; let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    // A swelling sweep with a fast warble, up through the reveal.
    const u = Math.min(1, t / 1.2);
    const f = 220 * Math.pow(4, u) * (1 + 0.04 * Math.sin(t * 2 * Math.PI * 31));
    ph1 += (2 * Math.PI * f) / rate;
    ph2 += (2 * Math.PI * f * 1.503) / rate;
    const env = Math.min(1, t * 6) * (t < 1.25 ? 1 : Math.exp(-(t - 1.25) * 9));
    let v = 0.12 * env * (Math.sin(ph1) + 0.45 * Math.sin(ph2));
    // Scan-line crackle: filtered noise in short bursts.
    lp += (Math.random() * 2 - 1 - lp) * 0.35;
    const burst = Math.sin(t * 2 * Math.PI * 14) > 0.3 ? 1 : 0.25;
    v += 0.07 * lp * burst * env;
    // The lock-in: a clean ring as the hologram turns solid.
    if (t > 1.25) v += 0.1 * Math.sin(2 * Math.PI * 1318 * (t - 1.25)) * Math.exp(-(t - 1.25) * 4) * Math.min(1, (t - 1.25) * 80);
    d[i] = v;
  }
  return buf;
}

// ------------------------------------------------------------------ menus
/** The menu sounds: a glassy tick to move, a rising chirp to confirm, a falling one to go back, a soft tick to adjust. */
export type UiSoundKind = 'move' | 'confirm' | 'back' | 'tick';

/** A short square-ish blip (a sine through a soft clip), for the digital chirps. */
function blip(d: Float32Array, rate: number, at: number, dur: number, f: (u: number) => number, gain: number): void {
  let phase = 0;
  const start = Math.floor(at * rate);
  const end = Math.min(d.length, start + Math.floor(dur * rate));
  for (let i = start; i < end; i++) {
    const u = (i - start) / (end - start);
    phase += (2 * Math.PI * f(u)) / rate;
    d[i] += gain * Math.tanh(2.2 * Math.sin(phase)) * Math.min(1, u * 40) * Math.pow(1 - u, 1.6);
  }
}

export function uiSoundBuffer(ctx: BaseAudioContext, kind: UiSoundKind): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * (kind === 'move' || kind === 'tick' ? 0.3 : 0.6)), rate);
  const d = buf.getChannelData(0);
  if (kind === 'move') {
    // A light glass tick over a tiny upward blip: the cursor landing on a plate.
    glide(d, rate, 0, 0.04, (u) => 1150 + 500 * u, (u) => 0.14 * (1 - u) * Math.min(1, u * 60));
    ping(d, rate, 0.004, 3136, 0.06);
    reverb(d, rate, 0.2);
  } else if (kind === 'tick') {
    // Lower and duller than the move: a detent clicking as a value steps.
    glide(d, rate, 0, 0.025, () => 760, (u) => 0.13 * (1 - u) * Math.min(1, u * 80));
    ping(d, rate, 0.002, 1975, 0.035);
    reverb(d, rate, 0.12);
  } else {
    // Two quick blips a fifth apart (up to confirm, down to go back), a short energy sweep and a fading ring.
    const up = kind === 'confirm';
    const [a, b] = up ? [1318.5, 1975.5] : [1174.7, 784];
    blip(d, rate, 0, 0.06, () => a, 0.09);
    blip(d, rate, 0.055, up ? 0.12 : 0.1, () => b, 0.09);
    glide(d, rate, 0, 0.16, (u) => (up ? 500 * Math.pow(4, u) : 1400 * Math.pow(0.3, u)) * (1 + 0.05 * Math.sin(u * 2 * Math.PI * 18)),
      (u) => 0.08 * Math.min(1, u * 15) * (1 - u));
    glide(d, rate, 0.07, 0.4, () => 2 * b, (u) => 0.04 * Math.exp(-u * 6) * Math.min(1, u * 60));
    reverb(d, rate, 0.3);
  }
  return buf;
}

/**
 * Going through a portal: a rushing whoosh of noise swept through a
 * resonant filter (the phaser of the rift), a warbling tone that rises in
 * and drops out the other side, a soft sub thump at the crossing and a few
 * glassy motes, in a little reverb.
 */
export function portalWarpBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 1.1), rate);
  const d = buf.getChannelData(0);
  const len = 0.55;
  // Whoosh: noise through a state-variable band-pass whose centre sweeps up then down.
  let low = 0; let band = 0;
  for (let i = 0; i < Math.floor(rate * len); i++) {
    const u = i / (rate * len);
    const fc = 300 + 2600 * Math.sin(Math.PI * Math.pow(u, 0.8));
    const f = 2 * Math.sin((Math.PI * fc) / rate);
    const noise = Math.random() * 2 - 1;
    low += f * band;
    band += f * (noise - low - band * 0.35);
    d[i] += band * 0.14 * Math.sin(Math.PI * u) * (u < 0.5 ? 1 : 1 - (u - 0.5) * 0.6);
  }
  // The warp tone: in to the crossing, then out lower, with a fast wobble.
  glide(d, rate, 0, 0.26, (u) => 260 * Math.pow(4, u) * (1 + 0.08 * Math.sin(u * 2 * Math.PI * 14)),
    (u) => 0.1 * Math.min(1, u * 4));
  glide(d, rate, 0.26, 0.4, (u) => 1200 * Math.pow(0.35, u) * (1 + 0.08 * Math.sin(u * 2 * Math.PI * 10)),
    (u) => 0.1 * (1 - u) * (1 - u));
  // A thump as the body crosses.
  glide(d, rate, 0.24, 0.25, (u) => 55 + 70 * Math.exp(-u * 8), (u) => 0.32 * Math.exp(-u * 7) * Math.min(1, u * 150));
  // Motes thrown off the rim on the way out.
  [2637, 3520, 2960, 4186].forEach((f, n) => ping(d, rate, 0.27 + n * 0.045, f, 0.03));
  reverb(d, rate, 0.35);
  return buf;
}

/**
 * An old TV changing stations: a click of the dial, a burst of static hiss
 * that swells and dies, a whistle of the tuner sliding past a carrier and a
 * low buzz of the tube, in a little reverb.
 */
export function scanBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 1.3), rate);
  const d = buf.getChannelData(0);
  const len = 1.05;
  // Static: noise through a gentle high-pass, swelling then dying.
  let prev = 0;
  for (let i = 0; i < Math.floor(rate * len); i++) {
    const u = i / (rate * len);
    const noise = Math.random() * 2 - 1;
    const hp = noise - prev * 0.6;
    prev = noise;
    const env = Math.min(1, u * 14) * Math.pow(1 - u, 1.5);
    // Grainy: it chatters a little.
    const chatter = 0.75 + 0.25 * Math.sin(u * 2 * Math.PI * 23);
    d[i] += hp * 0.11 * env * chatter;
  }
  // The tuner whistle sliding past a station.
  glide(d, rate, 0.08, 0.6, (u) => 2600 - 1700 * u + 300 * Math.sin(u * 9), (u) => 0.03 * Math.sin(Math.PI * u));
  // The tube's buzz.
  glide(d, rate, 0, len, () => 60, (u) => 0.06 * Math.min(1, u * 10) * (1 - u));
  glide(d, rate, 0, len, () => 180, (u) => 0.025 * Math.min(1, u * 10) * (1 - u));
  // The dial's click.
  ping(d, rate, 0, 900, 0.05);
  reverb(d, rate, 0.15);
  return buf;
}

// ------------------------------------------------------------------ laser sabers
/** Keeps a buffer below clipping. */
function limit(d: Float32Array, max = 0.95): void {
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > max) for (let i = 0; i < d.length; i++) d[i] *= max / peak;
}

/**
 * The saber's hum: a buzzy low tone (odd and even harmonics, a slow beat
 * between two detuned voices) whose pitch follows `f(u)`, at `amp(u)`.
 */
function hum(d: Float32Array, rate: number, at: number, dur: number, f: (u: number) => number, amp: (u: number) => number): void {
  let p1 = 0; let p2 = 0;
  const start = Math.floor(at * rate);
  const end = Math.min(d.length, start + Math.floor(dur * rate));
  for (let i = start; i < end; i++) {
    const u = (i - start) / (end - start);
    const fr = f(u);
    p1 += (2 * Math.PI * fr) / rate;
    p2 += (2 * Math.PI * fr * 1.012) / rate;
    const v = Math.sin(p1) + 0.55 * Math.sin(2 * p1) + 0.4 * Math.sin(3 * p1) + 0.22 * Math.sin(5 * p1)
      + 0.7 * Math.sin(p2) + 0.3 * Math.sin(2 * p2);
    // A little hard clipping for the electric buzz.
    d[i] += amp(u) * Math.max(-1.2, Math.min(1.2, v)) * 0.5;
  }
}

/** Noise through a band-pass whose centre follows `fc(u)` (a whoosh, a sizzle). */
function bandNoise(d: Float32Array, rate: number, at: number, dur: number, fc: (u: number) => number, amp: (u: number) => number, q = 0.35): void {
  let low = 0; let band = 0;
  const start = Math.floor(at * rate);
  const end = Math.min(d.length, start + Math.floor(dur * rate));
  for (let i = start; i < end; i++) {
    const u = (i - start) / (end - start);
    const f = 2 * Math.sin((Math.PI * Math.min(fc(u), rate / 6)) / rate);
    low += f * band;
    band += f * (Math.random() * 2 - 1 - low - band * q);
    d[i] += band * amp(u);
  }
}

/**
 * A laser saber swung: the hum swells and bends up then down as the blade
 * sweeps past (a Doppler sweep), over an airy whoosh. `variant` 0..2 shifts
 * the pitch and the length so repeated swings differ.
 */
export function saberSwingBuffer(ctx: BaseAudioContext, variant: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = 0.36 + variant * 0.04;
  const buf = ctx.createBuffer(1, Math.floor(rate * (len + 0.25)), rate);
  const d = buf.getChannelData(0);
  const f0 = 92 + variant * 11;
  const swell = (u: number) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 1.6);
  hum(d, rate, 0, len, (u) => f0 * (1 + 0.55 * Math.sin(Math.PI * Math.pow(u, 0.8))), (u) => 0.32 * swell(u));
  bandNoise(d, rate, 0, len, (u) => 500 + 1900 * Math.sin(Math.PI * Math.pow(u, 0.8)), (u) => 0.11 * swell(u));
  // The blade's high sizzle, riding the sweep.
  glide(d, rate, 0, len, (u) => (1500 + variant * 120) * (1 + 0.4 * Math.sin(Math.PI * u)) * (1 + 0.03 * Math.sin(u * 2 * Math.PI * 30)), (u) => 0.025 * swell(u));
  reverb(d, rate, 0.2);
  limit(d);
  return buf;
}

/** Two sabers clashing: a crack of contact, electric crackle and buzz, and the metallic ring of the blades. */
export function saberClashBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 0.8), rate);
  const d = buf.getChannelData(0);
  // Crackle: noise chopped into random bursts, dying fast.
  let gate = 1; let low = 0;
  for (let i = 0; i < Math.floor(rate * 0.45); i++) {
    const t = i / rate;
    if (Math.random() < 0.004) gate = Math.random() < 0.6 ? 1 : 0.15;
    const noise = Math.random() * 2 - 1;
    low += (noise - low) * 0.5;
    d[i] += (noise - low) * 0.5 * gate * Math.exp(-t * 7) * Math.min(1, t * 3000);
  }
  // The buzz: two hums thrown off pitch by the hit.
  hum(d, rate, 0, 0.42, (u) => 150 - 40 * u, (u) => 0.4 * Math.exp(-u * 5) * Math.min(1, u * 400));
  hum(d, rate, 0, 0.3, (u) => 223 + 30 * u, (u) => 0.22 * Math.exp(-u * 6));
  // The blades ringing.
  [1870, 2790, 4150, 5600].forEach((f, n) => ping(d, rate, 0.002 * n, f, 0.06 - n * 0.01));
  reverb(d, rate, 0.3);
  limit(d);
  return buf;
}

/** A laser bolt batted back by a saber: a zap bent off the blade, with a thump of the hum. */
export function saberDeflectBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 0.6), rate);
  const d = buf.getChannelData(0);
  // The bolt's zap, kicked up then flying off.
  glide(d, rate, 0, 0.32, (u) => (u < 0.12 ? 1400 + 9000 * u : 2500 * Math.pow(0.3, (u - 0.12) / 0.88)) * (1 + 0.12 * Math.sin(u * 2 * Math.PI * 26)),
    (u) => 0.22 * Math.min(1, u * 120) * Math.pow(1 - u, 1.4));
  hum(d, rate, 0, 0.22, (u) => 130 + 60 * Math.exp(-u * 6), (u) => 0.3 * Math.exp(-u * 7) * Math.min(1, u * 300));
  bandNoise(d, rate, 0, 0.12, () => 3200, (u) => 0.12 * (1 - u), 0.5);
  ping(d, rate, 0, 3520, 0.05);
  reverb(d, rate, 0.25);
  limit(d);
  return buf;
}

/** A blade lock broken: the clash, louder and longer, a heavy thump and the loser's blade fizzing out. */
export function saberBreakBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 1.3), rate);
  const d = buf.getChannelData(0);
  const clash = saberClashBuffer(ctx).getChannelData(0);
  for (let i = 0; i < clash.length && i < d.length; i++) d[i] += clash[i] * 0.8;
  glide(d, rate, 0, 0.5, (u) => 40 + 80 * Math.exp(-u * 7), (u) => 0.55 * Math.exp(-u * 5) * Math.min(1, u * 300));
  hum(d, rate, 0.05, 0.8, (u) => 120 * Math.pow(0.4, u), (u) => 0.18 * (1 - u) * (0.6 + 0.4 * Math.sin(u * 2 * Math.PI * 9)));
  bandNoise(d, rate, 0.05, 0.7, (u) => 2600 - 1800 * u, (u) => 0.08 * (1 - u), 0.6);
  reverb(d, rate, 0.4);
  limit(d);
  return buf;
}

// ------------------------------------------------------------------ the table
/** Every synth sound by key (audio/Sounds.ts loads them; the recorded ones are listed there). */
export const SYNTH_SOUNDS: Record<string, (ctx: BaseAudioContext) => AudioBuffer> = {
  boom: sciFiExplosionBuffer, // a Kubot blowing up
  'orb-bounce': crystalBounceBuffer, // the power-up ball bouncing
  'orb-pickup': pickupChimeBuffer,
  'orb-heal': healChimeBuffer,
  // Footsteps: soft metal boot steps, three variants (replacing step.mp3, too loud and scuffy).
  'step-0': (ctx) => metalStepBuffer(ctx, 0),
  'step-1': (ctx) => metalStepBuffer(ctx, 1),
  'step-2': (ctx) => metalStepBuffer(ctx, 2),
  'holo-spawn': holoSpawnBuffer, // a Kubot materializing
  'portal-warp': portalWarpBuffer, // a Kubot going through a portal
  'ui-move': (ctx) => uiSoundBuffer(ctx, 'move'),
  'ui-tick': (ctx) => uiSoundBuffer(ctx, 'tick'),
  'ui-confirm': (ctx) => uiSoundBuffer(ctx, 'confirm'),
  'ui-back': (ctx) => uiSoundBuffer(ctx, 'back'),
  'ui-scan': scanBuffer, // the menu screen like a TV changing stations
  // Laser sabers: a swing (three variants), two blades clashing, a laser bolt batted back, a blade lock broken.
  'saber-swing-0': (ctx) => saberSwingBuffer(ctx, 0),
  'saber-swing-1': (ctx) => saberSwingBuffer(ctx, 1),
  'saber-swing-2': (ctx) => saberSwingBuffer(ctx, 2),
  'saber-clash': saberClashBuffer,
  'saber-deflect': saberDeflectBuffer,
  'saber-break': saberBreakBuffer,
};
