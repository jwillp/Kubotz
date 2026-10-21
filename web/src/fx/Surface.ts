import { boxBlur } from './NormalMaps';

/**
 * Surface wear for the robot parts, so they read like the arena tiles: the
 * flat vector plates get the tiles' fine stipple, soft shade towards their
 * inner edges, a thin worn highlight along their upper edges (the tiles'
 * bright bevel), a few light scratches and chipped edges. Shapes and colours
 * stay the art's own; glowing and saturated pixels (eyes, helmet stripes,
 * the blade) are left nearly clean so the helmet colours stay true.
 *
 * The parts are drawn at about 0.4 of their pixel size, so every feature here
 * is a few art pixels wide: about one screen pixel, like the tile grain.
 */
/** Prefix of the worn copy of a part texture's key. */
export const WORN = 'worn:';

/** Whether robots are drawn with their worn copies (G in a match toggles it). */
export const surface = { worn: true };

export interface SurfaceOptions {
  /** Grain amplitude (0..255 per channel). */
  grain?: number;
  /** Shade towards the inner edges (0..1). */
  shade?: number;
  /** Highlight of upper edges (0..255). */
  rim?: number;
  /** Scratches per 10 000 opaque pixels. */
  scratches?: number;
}

/** A weathered copy of an image. `seed` keeps the pattern the same for every colour of a helmet. */
export function weather(source: HTMLImageElement | HTMLCanvasElement, seed: string, opts: SurfaceOptions = {}): HTMLCanvasElement {
  const grain = opts.grain ?? 5;
  const shade = opts.shade ?? 0.2;
  const rimAmount = opts.rim ?? 64;
  const scratchRate = opts.scratches ?? 5;
  const w = source.width;
  const h = source.height;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const rand = mulberry(hash(seed));

  const alpha = new Float32Array(w * h);
  const lum = new Float32Array(w * h);
  let area = 0;
  for (let i = 0; i < w * h; i++) {
    const a = p[i * 4 + 3] / 255;
    alpha[i] = a;
    lum[i] = a * (0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2]) / 255;
    if (a > 0.5) area++;
  }
  // How deep inside the shape: ~0.5 on the outline, 1 well inside.
  const inner = boxBlur(alpha, w, h, Math.max(4, Math.round(Math.min(w, h) / 14)));
  const band = boxBlur(alpha, w, h, 1);
  const lband = boxBlur(lum, w, h, 1);

  // Scratches: short light strokes, mostly along one direction per part.
  const marks = document.createElement('canvas');
  marks.width = w; marks.height = h;
  const mctx = marks.getContext('2d', { willReadFrequently: true })!;
  mctx.strokeStyle = '#fff';
  mctx.lineCap = 'round';
  const main = rand() * Math.PI;
  const count = Math.round((area / 10000) * scratchRate);
  for (let n = 0; n < count; n++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = main + (rand() - 0.5) * 0.9;
    const len = 8 + rand() * 26;
    mctx.globalAlpha = 0.35 + rand() * 0.5;
    mctx.lineWidth = 1.2 + rand() * 1.4;
    mctx.beginPath();
    mctx.moveTo(x, y);
    // A slight bend, like a scrape.
    mctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (rand() - 0.5) * 4, y + Math.sin(a) * len * 0.5 + (rand() - 0.5) * 4,
      x + Math.cos(a) * len, y + Math.sin(a) * len);
    mctx.stroke();
  }
  const scratch = mctx.getImageData(0, 0, w, h).data;

  // Grain on a ~2.5 px lattice (one screen pixel at the robots' scale), and wear blotches on a coarse one.
  const fine = valueNoise(w, h, 2, rand);
  const blotch = valueNoise(w, h, 14, rand);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = alpha[i];
      if (a === 0) continue;
      const o = i * 4;
      const r = p[o], g = p[o + 1], b = p[o + 2];
      const max = Math.max(r, g, b);
      const sat = max ? (max - Math.min(r, g, b)) / max : 0;
      // Plates (blacks and greys) take the full treatment, coloured parts a little.
      const k = 1 - Math.min(1, Math.max(0, (sat - 0.25) / 0.3)) * 0.8;
      const deep = inner[i];
      const up = y >= 3 ? band[i - 3 * w] : 0;
      const lup = y >= 2 ? lband[i - 2 * w] : 0;
      // Upper edges of the silhouette, and the tops of lighter panels inside it.
      const rim = Math.max(0, band[i] - up) * 1.4 + Math.max(0, lum[i] - lup) * 0.8;
      const ao = 1 - shade * Math.min(1, Math.max(0, 1 - deep) * 2) * k;
      let d = (fine[i] * 2 - 1) * grain * k;
      // Sparse light specks, like the tiles' stipple.
      const speck = hash2(x >> 1, y >> 1, 977);
      if (speck > 0.985) d += 12 * k;
      else if (speck < 0.01) d -= 8 * k;
      // Worn edges: where a blotch reaches the outline the dark paint is rubbed back to lighter metal.
      const wear = Math.max(0, blotch[i] - 0.58) * Math.max(0, 0.82 - deep) * 6;
      const s = (scratch[o + 3] / 255) * Math.min(1, Math.max(0, deep - 0.55) * 4);
      const light = Math.min(1, rim) * rimAmount * k + (s * 30 + wear * 26) * k;
      // Faint blotchy tone, so big plates aren't one flat value.
      const tone = 1 + (blotch[i] - 0.5) * 0.06 * k;
      p[o] = clamp8(r * ao * tone + d + light);
      p[o + 1] = clamp8(g * ao * tone + d + light);
      p[o + 2] = clamp8(b * ao * tone + d + light * 1.06);
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Smooth value noise in 0..1 on a lattice of `cell` pixels. */
function valueNoise(w: number, h: number, cell: number, rand: () => number): Float32Array {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = y / cell;
    const y0 = Math.floor(fy);
    const ty = smooth(fy - y0);
    for (let x = 0; x < w; x++) {
      const fx = x / cell;
      const x0 = Math.floor(fx);
      const tx = smooth(fx - x0);
      const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1];
      const c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1];
      out[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function hash2(x: number, y: number, s: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + s;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
