import Phaser from 'phaser';
import { boxBlur } from './NormalMaps';

/**
 * The cel look (exploration), after Zelda: The Wind Waker's toon shading:
 * each Kubot part in two flat tones only, lit and shadow, split by one crisp
 * edge that follows the part's rounded volume under a sun from above (and the
 * art's own shading, so its plates and folds keep their shadows). Lit tones
 * are clean and saturated, shadows cooler and bluer rather
 * than just darker; big glossy parts (helmets, visors) catch a small hard
 * white shine. No texture, no gradients, no outlines. The arena lights reach
 * them in toon steps (ToonLightPipeline below).
 * T in a match; neon (Y, fx/Neon.ts) goes over either.
 */
export const CEL = 'cel:';

// New key: everyone starts on classic again, whatever the earlier toon-first builds saved.
const STYLE_KEY = 'kubotz.toon-look';

/** ?toon=1 / ?toon=0, else the last choice, off (classic) by default. */
function startStyle(): boolean {
  const q = new URLSearchParams(location.search).get('toon');
  if (q) return q !== '0';
  try { const v = localStorage.getItem(STYLE_KEY); return v === null ? false : v === '1'; } catch { return false; }
}

export const cel = { on: startStyle() };

export function setCel(on: boolean): void {
  cel.on = on;
  try { localStorage.setItem(STYLE_KEY, on ? '1' : '0'); } catch { /* private window */ }
}

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

/** Turns a hue a little towards blue-violet (shadows) by `k` of the way. */
function towardBlue(h: number, k: number): number {
  let d = 0.68 - h;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return h + d * k;
}

/**
 * The lit and shadow tones of a pixel's colour. Coloured pixels: lit at full
 * saturation and bright, shadow bluer and darker. Greys as painted metal:
 * their value in a few flat steps, lit a clean cool white, shadow a cool
 * blue-grey; black parts a deep navy whose shadow is darker still.
 */
function tones(r: number, g: number, b: number): [Rgb, Rgb] {
  const [h, s, v] = hsv(r, g, b);
  if (s >= 0.3 && v > 0.2) {
    const lit = rgb(h, Math.min(1, s * 1.1 + 0.08), Math.min(1, v * 1.08 + 0.08));
    return [lit, rgb(towardBlue(h, 0.12), Math.min(1, s * 1.05 + 0.12), Math.min(1, v * 1.08 + 0.08) * 0.66)];
  }
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  if (l <= 0.2) return [[0.09, 0.1, 0.17], [0.035, 0.035, 0.08]];
  const step = Math.min(1, Math.round(l * 5) / 5 * 0.9);
  const lit: Rgb = [step * 0.98, step, Math.min(1, step * 1.03 + 0.02)];
  const shadow: Rgb = [step * 0.52 + 0.02, step * 0.56 + 0.03, step * 0.74 + 0.08];
  return [lit, shadow];
}

/** A cel copy of a part image (from its clean art: wear would only break up the flat fills). */
export function celPart(source: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width, h = source.height;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  // The art's colours with its soft gradients flattened, so each plate reads as one fill.
  ctx.filter = 'blur(2px)';
  ctx.drawImage(source, 0, 0);
  ctx.filter = 'none';
  const soft = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const alpha = new Float32Array(w * h);
  const luma = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    alpha[i] = p[i * 4 + 3] / 255;
    luma[i] = (0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2]) / 255;
  }
  // The part's rounded volume: its blurred silhouette as a height, twice for a smooth dome.
  const r = Math.max(3, Math.round(Math.min(w, h) * 0.14));
  const height = boxBlur(boxBlur(alpha, w, h, r), w, h, r);
  // The art's own shading, smoothed so its shadow shapes come out as clean blobs.
  const shading = boxBlur(luma, w, h, 3);
  const big = Math.min(w, h) > 90;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      if (p[o + 3] === 0) continue;
      // (getImageData colours are not premultiplied: no division by alpha.)
      const cr = soft[o] / 255, cg = soft[o + 1] / 255, cb = soft[o + 2] / 255;
      const [lit, shadow] = tones(Math.min(1, cr), Math.min(1, cg), Math.min(1, cb));
      // Facing the sun (straight above, a touch towards the front): the height's slope upwards,
      // plus a little of its dome so the middle of a part stays lit.
      const gy = height[i + (y < h - 1 ? w : 0)] - height[i - (y > 0 ? w : 0)];
      const gx = height[i + (x < w - 1 ? 1 : 0)] - height[i - (x > 0 ? 1 : 0)];
      const facing = gy * r * 1.6 + (height[i] - 0.5) * 0.5;
      // Against the flattened colour, how much darker the art paints this spot.
      const own = shading[i] - (0.299 * cr + 0.587 * cg + 0.114 * cb);
      const n = facing + own * 1.6;
      let c = n > -0.26 ? lit : shadow;
      // A small hard shine on the top of big glossy (coloured or light) parts.
      if (big && n > 0.5 && Math.abs(gx) * r < 0.25 && (cr + cg + cb) / 3 > 0.35) c = [Math.min(1, lit[0] * 0.3 + 0.75), Math.min(1, lit[1] * 0.3 + 0.75), Math.min(1, lit[2] * 0.3 + 0.75)];
      p[o] = Math.min(255, c[0] * 255); p[o + 1] = Math.min(255, c[1] * 255); p[o + 2] = Math.min(255, c[2] * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

const BINS = 16;
/** How much of the Kubotz' colour change (beyond brightness) the tiles take. */
const TINT = 0.35;
const pixels = (src: HTMLImageElement | HTMLCanvasElement) => {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  return { c, ctx, img: ctx.getImageData(0, 0, c.width, c.height) };
};
const lumaOf = (d: Uint8ClampedArray, o: number) => (0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) / 255;
const satOf = (d: Uint8ClampedArray, o: number) => { const max = Math.max(d[o], d[o + 1], d[o + 2]); return max ? (max - Math.min(d[o], d[o + 1], d[o + 2])) / max : 0; };

/**
 * How the cel look changed the Kubotz' colours, to recolour the arena tiles
 * the same way (the tiles keep their art, only their colours follow): the
 * mean colour of the classic parts and of their cel copies, per brightness,
 * for the metal (unsaturated) pixels; a tile pixel of that brightness takes
 * the same per-channel change. Coloured pixels (the light strips) take the
 * cel colours' saturation and brightness boost.
 */
export class CelShift {
  private readonly from = new Float64Array(BINS * 4);
  private readonly to = new Float64Array(BINS * 4);
  private gains?: Float32Array;

  /** Adds a classic part and its cel copy to the measure. */
  add(classic: HTMLImageElement | HTMLCanvasElement, celCopy: HTMLImageElement | HTMLCanvasElement): void {
    const a = pixels(classic).img.data, b = pixels(celCopy).img.data;
    for (let o = 0; o < a.length; o += 4) {
      if (a[o + 3] < 200 || satOf(a, o) >= 0.3) continue;
      const k = Math.min(BINS - 1, Math.floor(lumaOf(a, o) * BINS)) * 4;
      for (let c = 0; c < 3; c++) { this.from[k + c] += a[o + c]; this.to[k + c] += b[o + c]; }
      this.from[k + 3]++;
    }
  }

  /** Per-channel gains for each brightness bin; empty bins take the nearest measured one. */
  private gainsOf(): Float32Array {
    if (this.gains) return this.gains;
    const g = new Float32Array(BINS * 3).fill(NaN);
    for (let k = 0; k < BINS; k++) {
      if (this.from[k * 4 + 3] < 50) continue;
      for (let c = 0; c < 3; c++) g[k * 3 + c] = Math.min(1.8, Math.max(0.4, (this.to[k * 4 + c] + 1) / (this.from[k * 4 + c] + 1)));
    }
    for (let k = 0; k < BINS; k++) {
      if (!Number.isNaN(g[k * 3])) continue;
      for (let d = 1; d < BINS; d++) {
        const n = [k - d, k + d].find((j) => j >= 0 && j < BINS && !Number.isNaN(g[j * 3]) && this.from[j * 4 + 3] >= 50);
        if (n !== undefined) { for (let c = 0; c < 3; c++) g[k * 3 + c] = g[n * 3 + c]; break; }
      }
    }
    return (this.gains = g.map((v) => (Number.isNaN(v) ? 1 : v)));
  }

  /** A copy of a tile in the cel colours. */
  apply(tile: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
    const g = this.gainsOf();
    const { c, ctx, img } = pixels(tile);
    const d = img.data;
    for (let o = 0; o < d.length; o += 4) {
      if (d[o + 3] === 0) continue;
      const r = d[o] / 255, gr = d[o + 1] / 255, b = d[o + 2] / 255;
      const [h, s, v] = hsv(r, gr, b);
      if (s >= 0.3 && v > 0.2) {
        const out = rgb(h, Math.min(1, s * 1.1 + 0.08), Math.min(1, v * 1.08 + 0.08));
        d[o] = out[0] * 255; d[o + 1] = out[1] * 255; d[o + 2] = out[2] * 255;
        continue;
      }
      // Between the two nearest bins, so the change runs smoothly with brightness.
      const f = Math.max(0, Math.min(BINS - 1, lumaOf(d, o) * BINS - 0.5));
      const k0 = Math.floor(f), k1 = Math.min(BINS - 1, k0 + 1), t = f - k0;
      // The brightness change in full, the colour change only partly: the tiles keep most of their own saturation.
      const gain = [0, 1, 2].map((ch) => g[k0 * 3 + ch] * (1 - t) + g[k1 * 3 + ch] * t);
      const lg = 0.299 * gain[0] + 0.587 * gain[1] + 0.114 * gain[2];
      for (let ch = 0; ch < 3; ch++) d[o + ch] = Math.min(255, d[o + ch] * (lg + (gain[ch] - lg) * TINT));
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

/**
 * Phaser's Light2D shader with toon steps: each light's reach on a part is
 * cut into flat bands (none, half, full) with hard edges, so the arena lights
 * still play over the cel Kubotz, through their normal maps, without shading
 * them back into gradients. Same ambient and about the same strength as
 * Light2D, so the Kubotz sit in the arena's light like the classic ones.
 */
function toonFrag(lightFrag: string): string {
  return lightFrag
    .replace('#define SHADER_NAME PHASER_LIGHT_FS', '#define SHADER_NAME KUBOTZ_TOON_LIGHT_FS')
    .replace('vec3 diffuse = light.color * diffuseFactor;', 'float lit = attenuation * diffuseFactor; float band = step(0.08, lit) * 0.35 + step(0.3, lit) * 0.35 + step(0.6, lit) * 0.3;')
    .replace('finalColor += (attenuation * diffuse) * light.intensity;', 'finalColor += light.color * band * light.intensity * 0.5;');
}

class ToonLightPipeline extends Phaser.Renderer.WebGL.Pipelines.LightPipeline {
  constructor(game: Phaser.Game, lightFrag: string) {
    super({ game, fragShader: toonFrag(lightFrag) } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }
}

/** Draws a cel part through the toon lights (WebGL only). */
export function toonLit<T extends Phaser.GameObjects.Components.Pipeline & Phaser.GameObjects.GameObject>(obj: T): T {
  const renderer = obj.scene.sys.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return obj;
  if (!renderer.pipelines.has('ToonLight')) {
    // Phaser's own light shader (as built, light count filled in), with the toon steps.
    const light = renderer.pipelines.get('Light2D') as Phaser.Renderer.WebGL.WebGLPipeline;
    renderer.pipelines.add('ToonLight', new ToonLightPipeline(obj.scene.game, light.shaders[0].fragSrc));
  }
  return obj.setPipeline('ToonLight');
}
