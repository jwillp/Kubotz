import { boxBlur } from './NormalMaps';

/**
 * The neon look (exploration): Kubotz plates pushed down to dark gunmetal with
 * a violet cast, their coloured parts (eyes, stripes, blades) lit up to hot
 * neon, and a cyan rim along their upper edges and a magenta one along their
 * lower edges, like two coloured lights on either side. A brighter halo in the
 * neon team colour around each Kubot keeps the teams readable on the darker
 * arenas. Over the classic or the cel look (fx/Cel.ts); T in a match.
 */
export const NEON = 'neon:';

export { neon, setNeon } from './NeonState';

/** The team colours as neon lights (same hues, full saturation and brightness); dark teams glow a cold grey. */
export function neonColor(color: number): number {
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max < 60) return 0x8a96c8;
  if (max - min < 30) return 0xd8e0ff;
  const lift = (v: number) => Math.round(Math.min(255, ((v - min) / (max - min)) * 255 * 0.92 + 20));
  return (lift(r) << 16) | (lift(g) << 8) | lift(b);
}

/** A neon copy of a part image (best from its worn copy, so the wear shows through). */
export function neonPart(source: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width, h = source.height;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = p[i * 4 + 3] / 255;
  const band = boxBlur(alpha, w, h, 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      if (p[o + 3] === 0) continue;
      const r = p[o] / 255, g = p[o + 1] / 255, b = p[o + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const s = max ? (max - min) / max : 0;
      let nr: number, ng: number, nb: number;
      if (s >= 0.35 && max > 0.25) {
        // Lit parts: full saturation, bright, a white-hot core where they were already bright.
        const k = 1 / max;
        const sat = (v: number) => Math.max(0, (v * k - (1 - s)) / s);
        const v = Math.min(1, max * 1.25 + 0.1);
        const hot = Math.max(0, max - 0.9) * 1.5;
        nr = sat(r) * v + hot; ng = sat(g) * v + hot; nb = sat(b) * v + hot;
      } else {
        // Plates: dark gunmetal with a violet cast, contrast kept.
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const t = Math.pow(l, 1.1) * 0.8;
        nr = t * 0.9 + 0.015; ng = t * 0.88 + 0.01; nb = t * 1.08 + 0.04;
        // Two coloured lights: cyan from above, magenta from below.
        const top = Math.max(0, band[i] - (y >= 6 ? band[i - 6 * w] : 0)) * 1.1;
        const bottom = Math.max(0, band[i] - (y < h - 6 ? band[i + 6 * w] : 0)) * 0.9;
        nr += bottom * 1.0; ng += top * 0.9 + bottom * 0.12; nb += top * 1.0 + bottom * 0.8;
      }
      p[o] = Math.min(255, nr * 255); p[o + 1] = Math.min(255, ng * 255); p[o + 2] = Math.min(255, nb * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}
