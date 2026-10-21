/**
 * Small sounds made in code (Web Audio buffers): the crystal ball bounce and
 * the power-up pick-up chime.
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
  ping(d, rate, 0, 1480, 0.32);
  ping(d, rate, 0.004, 2210, 0.12);
  return buf;
}

/** Picking a power-up: a rising crystal arpeggio with a shimmer. */
export function pickupChimeBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 1.1), rate);
  const d = buf.getChannelData(0);
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => ping(d, rate, i * 0.055, f, 0.22));
  // Shimmer: a soft high tremolo tail.
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    if (t < 0.16) continue;
    const s = t - 0.16;
    d[i] += 0.06 * Math.sin(2 * Math.PI * 3136 * s) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 14 * s)) * Math.exp(-s * 4) * Math.min(1, s * 50);
  }
  return buf;
}
