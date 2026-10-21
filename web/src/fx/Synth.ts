/**
 * Small sounds made in code (Web Audio buffers): the crystal ball bounce, the
 * power-up pick-up and the heal.
 */

/** Glass partials (a struck glass sphere is inharmonic) with fast, partial-dependent decays. */
const GLASS = [[1, 1, 9], [2.32, 0.55, 14], [4.25, 0.35, 22], [6.63, 0.2, 30], [9.38, 0.12, 40]];

function ping(d: Float32Array, rate: number, at: number, f: number, gain: number): void {
  const start = Math.floor(at * rate);
  for (let i = start; i < d.length; i++) {
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
 * A robot blowing up, sci-fi style: a sub-bass thump, a laser zap diving
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
