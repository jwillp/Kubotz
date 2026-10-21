import Phaser from 'phaser';

/**
 * Normal maps made from the art itself, so Phaser's Light2D pipeline can shade
 * it: the alpha gives a rounded bevel along every edge (the parts read as
 * metal shells), the luminance a little embossed surface detail.
 */
export interface NormalOptions {
  /** Bevel width in pixels. */
  bevel?: number;
  /** How much the brightness embosses the surface (0..1). */
  detail?: number;
  /** Height of the bevel relative to its width: more = steeper edges. */
  strength?: number;
}

const cache = new Map<string, HTMLCanvasElement>();

/** A normal map canvas for an image (cached by key). */
export function normalMapFor(key: string, source: HTMLImageElement | HTMLCanvasElement, opts: NormalOptions = {}): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const bevel = opts.bevel ?? 4;
  const detail = opts.detail ?? 0.35;
  const strength = opts.strength ?? 1.4;
  const w = source.width;
  const h = source.height;
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(source, 0, 0);
  const px = sctx.getImageData(0, 0, w, h).data;

  // Height field: blurred alpha (the bevel) plus a touch of blurred brightness.
  const alpha = new Float32Array(w * h);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3] / 255;
    alpha[i] = a;
    lum[i] = a * (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
  }
  const height = boxBlur(alpha, w, h, bevel);
  const fine = boxBlur(lum, w, h, 1);
  for (let i = 0; i < w * h; i++) height[i] = height[i] * bevel * strength + fine[i] * detail * 2;

  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = height[i - (x > 0 ? 1 : 0)];
      const r = height[i + (x < w - 1 ? 1 : 0)];
      const u = height[i - (y > 0 ? w : 0)];
      const dn = height[i + (y < h - 1 ? w : 0)];
      // Canvas y runs down, the shader's up: the top edge faces up (+y).
      let nx = -(r - l) * 0.5;
      let ny = (dn - u) * 0.5;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      d[i * 4] = (nx * 0.5 + 0.5) * 255;
      d[i * 4 + 1] = (ny * 0.5 + 0.5) * 255;
      d[i * 4 + 2] = (nz * 0.5 + 0.5) * 255;
      d[i * 4 + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  cache.set(key, out);
  return out;
}

/** Gives a loaded texture a generated normal map (WebGL only; a no-op elsewhere). */
export function addNormalMap(textures: Phaser.Textures.TextureManager, key: string, opts: NormalOptions = {}, from = key): HTMLCanvasElement | null {
  if (textures.game.renderer.type !== Phaser.WEBGL) return null;
  const tex = textures.get(key);
  if (!tex || tex.key === '__MISSING') return null;
  const source = textures.get(from).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  if (!source || !source.width) return null;
  const normals = normalMapFor(from, source, opts);
  tex.setDataSource(normals);
  return normals;
}

/** A two-pass box blur (radius r) of a field. */
export function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return Float32Array.from(src);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + clamp(x, w)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / n;
      sum += src[y * w + clamp(x + r + 1, w)] - src[y * w + clamp(x - r, w)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[clamp(y, h) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / n;
      sum += tmp[clamp(y + r + 1, h) * w + x] - tmp[clamp(y - r, h) * w + x];
    }
  }
  return out;
}

function clamp(i: number, n: number): number { return i < 0 ? 0 : i >= n ? n - 1 : i; }

/** Draws a game object through the Light2D pipeline (WebGL only). */
export function lit<T extends Phaser.GameObjects.Components.Pipeline & Phaser.GameObjects.GameObject>(obj: T): T {
  if (obj.scene.sys.renderer.type === Phaser.WEBGL) obj.setPipeline('Light2D');
  return obj;
}
