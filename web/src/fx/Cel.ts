import { boxBlur } from './NormalMaps';

/**
 * The cel look (exploration): Kubotz parts flattened into the same three flat
 * layers as the K.O. smoke (fx/Impact.ts drawSmoke): a deep rim on the shadow
 * side (down and to the right, the light coming from the top left), a bright
 * flat body, and cream highlights on the lit edges and bright spots. No
 * outlines: the rim is a crescent of the part's own deep tone, like the
 * smoke's. Coloured parts (eyes, stripes, helmets, blades) take the smoke's
 * hue shifts: brighter towards yellow or cyan, the rim turning the other way;
 * metal takes cool slate shadows. Picked with ?style=cel / ?style=classic,
 * else the last choice (Y in a match), cel by default.
 */
export const CEL = 'cel:';

const STYLE_KEY = 'kubotz.style';

function startStyle(): boolean {
  const q = new URLSearchParams(location.search).get('style');
  if (q) return q !== 'classic';
  try { return localStorage.getItem(STYLE_KEY) !== 'classic'; } catch { return true; }
}

export const cel = { on: startStyle() };

export function setCel(on: boolean): void {
  cel.on = on;
  try { localStorage.setItem(STYLE_KEY, on ? 'cel' : 'classic'); } catch { /* private window */ }
}

/** The smoke's cream highlight. */
const CREAM: Rgb = [1, 0.984, 0.902];

type Rgb = [number, number, number];

function hsv(r: number, g: number, b: number): Rgb {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, max ? d / max : 0, max];
}

function rgb(h: number, s: number, v: number): Rgb {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  return ([[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]] as Rgb[])[i % 6];
}

/** The smoke's turn for a hue: warm ones brighten towards yellow, cool ones towards cyan. */
function turnOf(h: number): number {
  let d = (h < 0.3 || h > 0.85 ? 0.13 : 0.46) - h;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * The three tones of a pixel's colour: deep (rim), body, light. Coloured
 * pixels as in the smoke; greys as metal, with slate-violet shadows and a
 * slightly cool body, their value kept in two steps so dark plates stay dark.
 */
function tones(r: number, g: number, b: number): [Rgb, Rgb, Rgb] {
  const [h, s, v] = hsv(r, g, b);
  if (s >= 0.3 && v > 0.2) {
    const d = turnOf(h);
    const body = rgb(h + d * 0.12, Math.min(1, s * 1.05 + 0.05), Math.min(1, v * 1.05 + 0.04));
    const deep = rgb(h - Math.sign(d) * 0.05, Math.min(1, s + 0.15), v * 0.6);
    return [deep, body, mixRgb(rgb(h + d * 0.6, 0.45, 1), CREAM, 0.45)];
  }
  // Metal: its value in a few flat steps, slightly cool, with slate-violet
  // shadows; black parts stay black, with only a faint cool light on their lit edges.
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  if (l <= 0.2) return [[0.015, 0.015, 0.035], [0.07, 0.07, 0.09], [0.22, 0.23, 0.28]];
  const step = Math.round(l * 5) / 5;
  const body: Rgb = [step * 0.97, step * 0.99, step * 1.04 + 0.02];
  const deep: Rgb = [step * 0.5 + 0.01, step * 0.48 + 0.01, step * 0.64 + 0.05];
  return [deep, body, mixRgb(body, CREAM, 0.6)];
}

/** A cel copy of a part image (from its clean art: wear would only break up the flat fills). */
export function celPart(source: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width, h = source.height;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  // Flatten the art's soft gradients first, so each plate reads as one fill.
  ctx.filter = 'blur(1.5px)';
  ctx.drawImage(source, 0, 0);
  ctx.filter = 'none';
  const soft = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = p[i * 4 + 3] / 255;
  // The part's rounded shape (its blurred silhouette as a height), lit from the top left.
  const r = Math.max(3, Math.round(Math.min(w, h) * 0.08));
  const height = boxBlur(alpha, w, h, r);
  // Rim width: the shift of the body inside it, as in the smoke (r * 0.16, r * 0.2).
  const shift = Math.max(2, Math.round(Math.min(w, h) * 0.07));
  const sx = Math.round(shift * 0.62), sy = Math.round(shift * 0.78);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : alpha[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      if (p[o + 3] === 0) continue;
      const sa = soft[o + 3] / 255 || 1;
      const cr = soft[o] / 255 / sa, cg = soft[o + 1] / 255 / sa, cb = soft[o + 2] / 255 / sa;
      const [deep, body, light] = tones(Math.min(1, cr), Math.min(1, cg), Math.min(1, cb));
      // Facing the light: the slope of the height towards the top left.
      const gx = height[i + (x < w - 1 ? 1 : 0)] - height[i - (x > 0 ? 1 : 0)];
      const gy = height[i + (y < h - 1 ? w : 0)] - height[i - (y > 0 ? w : 0)];
      const facing = (gx * 0.62 + gy * 0.78) * r; // > 0: lit side
      // The pixel's own shading in the art, against its flattened colour.
      const own = (0.299 * p[o] + 0.587 * p[o + 1] + 0.114 * p[o + 2]) / 255 - (0.299 * cr + 0.587 * cg + 0.114 * cb);
      const shade = facing * 0.9 + own * 2.2;
      let c: Rgb;
      if (at(x + sx, y + sy) < 0.5 || shade < -0.32) c = deep;
      else if ((at(x - (sx >> 1), y - (sy >> 1)) < 0.5 && shade > -0.05) || shade > 0.42) c = light;
      else c = body;
      p[o] = Math.min(255, c[0] * 255); p[o + 1] = Math.min(255, c[1] * 255); p[o + 2] = Math.min(255, c[2] * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}
