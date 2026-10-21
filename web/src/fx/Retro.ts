import type Phaser from 'phaser';

/**
 * The Retro arena style, after a photo of an old build of the game: the same
 * backdrop and tile art, recoloured. The back wall's grid glows red on muted
 * olive panels with dark grey columns, the blocks are grey slabs with icy
 * cyan details and a chunky ice-glow cap on top, and the light is flatter
 * and neutral. Flat and pixel-crisp: no bokeh, shafts or haze.
 */
export type ArenaStyle = 'modern' | 'retro';

export const STYLE_NAMES: Record<ArenaStyle, string> = { modern: 'Modern', retro: 'Retro' };

const KEY = 'kubotz.style';
let current: ArenaStyle = load();

function load(): ArenaStyle {
  const param = new URLSearchParams(location.search).get('style');
  if (param === 'retro' || param === 'modern') return param;
  try { return localStorage.getItem(KEY) === 'retro' ? 'retro' : 'modern'; } catch { return 'modern'; }
}

/** The arena style picked on the arena select (kept in the browser; ?style=retro overrides it). */
export const arenaStyle = (): ArenaStyle => current;

export function setArenaStyle(style: ArenaStyle): void {
  current = style;
  try { localStorage.setItem(KEY, style); } catch { /* not saved */ }
}

/** The Retro palette. */
export const RETRO = {
  /** Light2D: ambient, key light, rim light, the light off the top of blocks. */
  ambient: 0xa6a79e,
  key: 0xf2efe6,
  rimLight: 0x7fe8ff,
  blockLight: 0x5fe0f0,
  /** Ice cap: body, top highlight, its shadow line; rims along block tops. */
  ice: 'rgb(118, 226, 240)',
  iceTop: 'rgb(214, 252, 255)',
  iceShade: 'rgb(54, 150, 170)',
  rim: 0x8ff0ff,
};

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * A tile recoloured for the Retro style (made once): the dark panels lifted
 * to a mid grey with a hint of olive, the near-black details kept dark, and
 * the blue light strips turned icy cyan. Returns its texture key.
 */
export function retroTile(textures: Phaser.Textures.TextureManager, key: string): string {
  const out = `retro:${key}`;
  if (textures.exists(out)) return out;
  const src = textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = textures.createCanvas(out, src.width, src.height)!;
  const ctx = canvas.getContext();
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const blue = b - Math.max(r, g * 0.55);
    if (blue > 40 && b > 90) {
      // Light strips: icy cyan, the brightest almost white.
      const k = Math.min(1, (b - 90) / 140);
      d[i] = clamp(70 + 140 * k); d[i + 1] = clamp(190 + 60 * k); d[i + 2] = clamp(210 + 45 * k);
    } else if (l < 0.07) {
      // The darkest marks stay dark: the chunky black details of the slabs.
      d[i] = 22; d[i + 1] = 24; d[i + 2] = 24;
    } else {
      // Panels: a mid grey, a little olive, keeping the art's own shading.
      const v = 80 + l * 300;
      d[i] = clamp(v * 1.0); d[i + 1] = clamp(v * 1.01); d[i + 2] = clamp(v * 0.93);
    }
  }
  ctx.putImageData(img, 0, 0);
  canvas.refresh();
  return out;
}

/**
 * The backdrop recoloured (made once, kept sharp): the grid lines red, the
 * wall panels muted olive grey, the columns a darker grey, following the
 * original's light falling off towards the floor.
 */
export function retroBackdrop(textures: Phaser.Textures.TextureManager): string {
  const out = 'bg-retro';
  if (textures.exists(out)) return out;
  const src = textures.get('bg').getSourceImage() as HTMLImageElement;
  const canvas = textures.createCanvas(out, src.width, src.height)!;
  const ctx = canvas.getContext();
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const bright = Math.min(1.25, (r + g + b) / 3 / 70);
    // Grid lines are the cyan pixels (green well above red); columns are the navy ones.
    const line = Math.max(0, Math.min(1, (g - r - 58) / 34));
    const wall = Math.max(0, Math.min(1, (g / Math.max(1, b) - 0.6) / 0.12));
    const pr = 32 + 34 * wall, pg = 35 + 33 * wall, pb = 32 + 18 * wall;
    const panel = [pr * bright * 0.95, pg * bright * 0.95, pb * bright * 0.95];
    const red = [235 * Math.min(1, bright + 0.15), 38, 30];
    d[i] = clamp(panel[0] + (red[0] - panel[0]) * line);
    d[i + 1] = clamp(panel[1] + (red[1] - panel[1]) * line);
    d[i + 2] = clamp(panel[2] + (red[2] - panel[2]) * line);
  }
  ctx.putImageData(img, 0, 0);
  canvas.refresh();
  return out;
}

/**
 * The ice-glow cap along the top of a block: a pale band with a bright top
 * edge, bevelled ends, and a ragged, stepped lower edge like dripping ice.
 * Drawn in map pixels on the arena art.
 */
export function drawIceCap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, seed: number): void {
  let s = seed * 7919 + 13;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const band = 32;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Body, its bevelled ends a step in.
  ctx.fillStyle = RETRO.ice;
  ctx.fillRect(x + 5, y - 5, w - 10, 5);
  ctx.fillRect(x, y, w, band);
  // Drips: stepped tongues of ice hanging under the band.
  for (let dx = 4; dx < w - 8;) {
    const len = 6 + Math.floor(rnd() * 26);
    const depth = 3 + Math.floor(rnd() * (rnd() < 0.25 ? 16 : 7));
    ctx.fillRect(x + dx, y + band, Math.min(len, w - 4 - dx), depth);
    if (depth > 9) ctx.fillRect(x + dx + 3, y + band + depth, Math.max(3, Math.min(len, w - 4 - dx) - 6), 4);
    dx += len + 4 + Math.floor(rnd() * 16);
  }
  // A darker line under the band, then the bright top edge.
  ctx.fillStyle = RETRO.iceShade;
  ctx.fillRect(x + 2, y + band - 3, w - 4, 3);
  ctx.fillStyle = RETRO.iceTop;
  ctx.fillRect(x + 5, y - 5, w - 10, 4);
  ctx.fillRect(x + 1, y - 1, w - 2, 4);
  ctx.restore();
}
