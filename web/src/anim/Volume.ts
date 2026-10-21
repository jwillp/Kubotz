import Phaser from 'phaser';

/**
 * 2.5D robot parts (exploration): every part image lifted into a rounded
 * volume, the way the Blender port built its 3D parts (the distance from the
 * edge gives the thickness, with a round profile, front and back alike), then
 * drawn turned round its vertical axis at a few yaw angles, each with the
 * normal map of the turned volume. A turning part then shows its side instead
 * of a squeezed flat image, and Light2D shades it as a solid.
 */

/** The 2.5D look is on (V toggles it in a match, for comparing with the flat one). */
export const look25 = { on: true };

/** How far a volumetric robot stands turned towards the viewer at rest, degrees: it shows a little of its side. */
export const REST_YAW = 22;

/** Yaw of each view, degrees (0 = the art as drawn). Past 90 the mirrored view of 180 - yaw is used. */
export const VIEW_STEP = 10;
const VIEWS = 90 / VIEW_STEP + 1;

export interface PartViews {
  /** Texture key of each view, by yaw / VIEW_STEP. */
  keys: string[];
  /** Columns added on each side of the image so a turned part fits. */
  pad: number;
}

const cache = new Map<string, PartViews>();

/** The turned views of a loaded texture (made once per key, on first use). */
export function partViews(textures: Phaser.Textures.TextureManager, key: string): PartViews {
  const hit = cache.get(key);
  if (hit) return hit;
  const source = textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = source.width;
  const h = source.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;

  // Thickness: half of it on each side of the image plane, round in section.
  const inside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inside[i] = px[i * 4 + 3] > 96 ? 1 : 0;
  const dist = chamfer(inside, w, h);
  let maxD = 0;
  for (let i = 0; i < w * h; i++) if (dist[i] > maxD) maxD = dist[i];
  const D = Math.max(1, maxD * 0.85);
  const half = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!inside[i]) continue;
    const u = Math.min(1, Math.max(0, (dist[i] - 0.5) / D));
    half[i] = D * Math.sqrt(1 - (1 - u) * (1 - u)) + 0.5;
  }
  const pad = Math.ceil(maxD) + 2;
  const W = w + 2 * pad;
  const cx = w / 2;
  const at = (x: number, y: number) => half[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];

  const keys: string[] = [];
  const depth = new Float32Array(W * h);
  for (let v = 0; v < VIEWS; v++) {
    const vk = `${key}@yaw${v * VIEW_STEP}`;
    keys.push(vk);
    if (textures.exists(vk)) continue;
    const a = (v * VIEW_STEP * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const colour = new ImageData(W, h);
    const normal = new ImageData(W, h);
    const cd = colour.data;
    const nd = normal.data;
    for (let i = 0; i < W * h; i++) { nd[i * 4] = 128; nd[i * 4 + 1] = 128; nd[i * 4 + 2] = 255; nd[i * 4 + 3] = 255; }
    depth.fill(Infinity);
    // Every point of the solid, nearest wins: (x, t) turned by the yaw, t
    // running from the front face (towards the viewer) to the back one.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const hh = half[i];
        if (hh <= 0) continue;
        // Surface slope: across the image and down it.
        const gx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
        const gy = (at(x, y + 1) - at(x, y - 1)) * 0.5;
        const steps = sa < 1e-3 ? 0 : Math.ceil(2 * hh);
        for (let s = 0; s <= steps; s++) {
          const t = -hh + (steps ? (2 * hh * s) / steps : 0);
          const sx = Math.round(pad + cx + (x + 0.5 - cx) * ca - t * sa);
          if (sx < 0 || sx >= W) continue;
          const o = y * W + sx;
          const z = (x + 0.5 - cx) * sa + t * ca;
          if (z >= depth[o]) continue;
          depth[o] = z;
          // Outward normal of |t| = half(x, y): front, back or the rim between.
          const f = t / hh;
          const nx = -gx;
          const nt = f;
          const ny = gy;
          const len = Math.hypot(nx, nt, ny) || 1;
          // Into view space: x right, y up, z towards the viewer.
          const vx = (nx * ca - nt * sa) / len;
          const vz = -(nx * sa + nt * ca) / len;
          const vy = ny / len;
          nd[o * 4] = (vx * 0.5 + 0.5) * 255;
          nd[o * 4 + 1] = (vy * 0.5 + 0.5) * 255;
          nd[o * 4 + 2] = (Math.max(0, vz) * 0.5 + 0.5) * 255;
          // The rim is the art's own colour, a little darker.
          const shade = Math.abs(f) > 0.9 ? 1 : 0.72;
          cd[o * 4] = px[i * 4] * shade;
          cd[o * 4 + 1] = px[i * 4 + 1] * shade;
          cd[o * 4 + 2] = px[i * 4 + 2] * shade;
          cd[o * 4 + 3] = 255;
        }
      }
    }
    const cc = document.createElement('canvas');
    cc.width = W; cc.height = h;
    cc.getContext('2d')!.putImageData(colour, 0, 0);
    const nc = document.createElement('canvas');
    nc.width = W; nc.height = h;
    nc.getContext('2d')!.putImageData(normal, 0, 0);
    const tex = textures.addCanvas(vk, cc)!;
    if (textures.game.renderer.type === Phaser.WEBGL) tex.setDataSource(nc);
  }
  const out = { keys, pad };
  cache.set(key, out);
  return out;
}

/** Distance (pixels) from each inside pixel to the nearest outside one (3-4 chamfer). */
function chamfer(inside: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h);
  const BIG = 1e6;
  for (let i = 0; i < w * h; i++) d[i] = inside[i] ? BIG : 0;
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], get(x - 1, y) + 3, get(x, y - 1) + 3, get(x - 1, y - 1) + 4, get(x + 1, y - 1) + 4);
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], get(x + 1, y) + 3, get(x, y + 1) + 3, get(x + 1, y + 1) + 4, get(x - 1, y + 1) + 4);
    }
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
}
