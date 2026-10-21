/**
 * Arena moods (BackdropScene, GameScene): every arena keeps the Kube's
 * out-of-focus room with bokeh and light shafts, in its own palette, and the
 * match is lit and its tiles tinted to match, so robots, tiles and backdrop
 * read as one place.
 *
 *  - The Kube: cold blues (the original look).
 *  - The Foundry: amber and ember orange, embers drifting up.
 *  - Sky Deck: violet, motes of light hanging in the air.
 *  - The Pit: teal, with energy flashes deep in the blur lighting the fighters.
 */

export type Particles = 'none' | 'embers' | 'motes';

export interface BackdropTheme {
  /** Tint of the blurred room, top and bottom. */
  room: [number, number];
  /** Bokeh: the main colours, and accents mixed in (40%). */
  bokeh: { main: number[]; accents: number[] };
  shafts: [side: number, middle: number];
  particles: Particles;
  /** Bright flashes far back in the blur, lighting the match. */
  lightning: boolean;
  haze: string;
  /** Light2D in the match: ambient, the warm key light and the rim light. */
  ambient: number;
  key: number;
  rim: number;
  /** The tiles' light strips and the light rising off the blocks; the bright rim line along their tops. */
  glow: number;
  rimLine: number;
  /** The arena tiles recoloured: their light strips take `hue` (degrees), their plates are multiplied by `plates`. */
  tiles?: { hue: number; plates: [number, number, number] };
}

export const BACKDROPS: BackdropTheme[] = [
  {
    // The Kube
    room: [0x6878a0, 0x26304a],
    bokeh: { main: [0x3ab8ff, 0x29abe2, 0x7fdcff, 0x3a6dff], accents: [0x2ee6c8, 0x8a6bff, 0xd46bff, 0xffb46b, 0xff7fae, 0xcfe8ff] },
    shafts: [0x4f8fd8, 0x7fc8ff],
    particles: 'none',
    lightning: false,
    haze: 'rgba(10,20,40,0.9)',
    ambient: 0x64709a,
    key: 0xffe8cc,
    rim: 0x3aa8ff,
    glow: 0x29abe2,
    rimLine: 0x9fe6ff,
  },
  {
    // The Foundry
    room: [0xc08a60, 0x4a2410],
    bokeh: { main: [0xff9a3a, 0xffb46b, 0xff7a2a, 0xffcf7a], accents: [0xff4a3a, 0xffe0b0, 0xff6a8a, 0xffd28a] },
    shafts: [0xff9a50, 0xffc080],
    particles: 'embers',
    lightning: false,
    haze: 'rgba(36,14,4,0.9)',
    ambient: 0x7a6252,
    key: 0xffd8a8,
    rim: 0xff8a3a,
    glow: 0xff8a2a,
    rimLine: 0xffd49a,
    tiles: { hue: 26, plates: [1.12, 0.98, 0.84] },
  },
  {
    // Sky Deck
    room: [0x9a7ac0, 0x2a1a4a],
    bokeh: { main: [0xb07bff, 0xff7fd8, 0x8a6bff, 0xd0a0ff], accents: [0x7fe8ff, 0xffd28a, 0xff9ad8, 0xe8d8ff] },
    shafts: [0xb08aff, 0xe0b8ff],
    particles: 'motes',
    lightning: false,
    haze: 'rgba(24,10,44,0.9)',
    ambient: 0x6c6298,
    key: 0xf0e4ff,
    rim: 0xc06bff,
    glow: 0xa15bff,
    rimLine: 0xe6c8ff,
    tiles: { hue: 272, plates: [1.0, 0.94, 1.1] },
  },
  {
    // The Pit
    room: [0x5aa096, 0x0e302a],
    bokeh: { main: [0x2ee6c8, 0x3affd0, 0x6fffb0, 0x2ab8a0], accents: [0x9a7bff, 0xcfffe8, 0x3ab8ff, 0xb0ff8a] },
    shafts: [0x4fd8b8, 0x8fffe0],
    particles: 'motes',
    lightning: true,
    haze: 'rgba(4,18,16,0.92)',
    ambient: 0x4e706a,
    key: 0xd8fff0,
    rim: 0x3affd0,
    glow: 0x22e0b0,
    rimLine: 0xb0ffe8,
    tiles: { hue: 165, plates: [0.92, 1.04, 1.0] },
  },
];

/** The mood of an arena (index into ARENA_INFO). */
export function backdropOf(arena: number | undefined): BackdropTheme {
  return BACKDROPS[arena ?? 0] ?? BACKDROPS[0];
}

/**
 * Recolours arena art in place for a mood: coloured pixels (the light strips,
 * glows) take its hue, keeping their saturation and brightness; plates and
 * greys are multiplied by its plate tint.
 */
export function tintArt(ctx: CanvasRenderingContext2D, w: number, h: number, tiles: NonNullable<BackdropTheme['tiles']>): void {
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const [pr, pg, pb] = tiles.plates;
  const hue = (((tiles.hue % 360) + 360) % 360) / 60;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue;
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const s = max ? (max - min) / max : 0;
    if (s < 0.25) {
      p[i] = Math.min(255, r * pr); p[i + 1] = Math.min(255, g * pg); p[i + 2] = Math.min(255, b * pb);
      continue;
    }
    // HSV to RGB with the new hue.
    const c = max * s;
    const x = c * (1 - Math.abs((hue % 2) - 1));
    const m = max - c;
    const [rr, gg, bb] = hue < 1 ? [c, x, 0] : hue < 2 ? [x, c, 0] : hue < 3 ? [0, c, x] : hue < 4 ? [0, x, c] : hue < 5 ? [x, 0, c] : [c, 0, x];
    p[i] = rr + m; p[i + 1] = gg + m; p[i + 2] = bb + m;
  }
  ctx.putImageData(img, 0, 0);
}

export function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A lightning bolt from the top of a canvas: midpoint displacement, with a branch or two. */
export function paintBolt(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number, color: string): void {
  const bolt = (x0: number, y0: number, x1: number, y1: number, spread: number, width: number, depth: number) => {
    let pts: [number, number][] = [[x0, y0], [x1, y1]];
    for (let d = 0; d < 6; d++) {
      const next: [number, number][] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        next.push([ax, ay], [(ax + bx) / 2 + (rand() - 0.5) * spread, (ay + by) / 2 + (rand() - 0.5) * spread * 0.3]);
      }
      next.push(pts[pts.length - 1]);
      pts = next;
      spread *= 0.55;
    }
    for (const [lw, a] of [[width * 6, 0.15], [width * 2.5, 0.4], [width, 1]] as const) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (depth > 0) {
      for (let b = 0; b < 2; b++) {
        const [sx, sy] = pts[8 + Math.floor(rand() * (pts.length - 16))];
        bolt(sx, sy, sx + (rand() - 0.5) * w * 0.4, sy + h * (0.15 + rand() * 0.25), spread * 4, width * 0.6, depth - 1);
      }
    }
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Out of focus, like everything behind the arena.
  ctx.filter = 'blur(5px)';
  const x = w * (0.25 + rand() * 0.5);
  bolt(x, 0, x + (rand() - 0.5) * w * 0.3, h * (0.55 + rand() * 0.3), w * 0.25, 3, 1);
  ctx.filter = 'none';
}
