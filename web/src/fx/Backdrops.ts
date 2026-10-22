/**
 * Arena moods (BackdropScene, GameScene): every arena keeps the Kube's
 * out-of-focus room with bokeh and light shafts, in its own palette, and the
 * match is lit and its tiles tinted to match, so Kubotz, tiles and backdrop
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
  /** A room of its own in the Kube backdrop's language (undefined: the Kube's own picture). */
  paint?: RoomPainter;
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

/**
 * A room painted like the Kube's backdrop picture: a deep gradient, a wall of
 * glowing panel lines, dark blocky silhouettes in front. Returns where the
 * lines are (picture pixels), for the light pulses that run along them.
 */
export interface Room { rows: number[]; cols: number[]; }
export type RoomPainter = (wall: CanvasRenderingContext2D, front: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => Room;

export const ROOM_W = 1920;
export const ROOM_H = 1080;

const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

interface RoomStyle {
  /** Gradient top, bottom. */
  top: number; bottom: number;
  /** The panel lines, and their wide soft glow. */
  line: number; glow: number;
  /** The silhouettes' colour. */
  dark: number;
  /** Panel cell size. */
  cell: [number, number];
  /** Jagged vertical silhouettes: x centre (0..1) and width (px) of each. */
  pillars: [number, number][];
  /** Horizontal beams across the wall: y (0..1) and thickness. */
  beams?: [number, number][];
  /** Lit rectangles in the wall (vents, screens): count and their colour. */
  vents?: { count: number; color: number };
  /** Lines fade out towards the bottom (an open drop) or the top. */
  fade?: 'down' | 'up';
  /** Stepped dark masses closing in from both sides (a chasm): how far in (0..0.5). */
  chasm?: number;
}

function paintRoom(st: RoomStyle): RoomPainter {
  return (wall, front, w, h, rand) => {
    const g = wall.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, css(st.top));
    g.addColorStop(1, css(st.bottom));
    wall.fillStyle = g;
    wall.fillRect(0, 0, w, h);
    // Panels, a touch lighter than the gradient, each with its own faint sheen.
    const [cw, ch] = st.cell;
    const cols: number[] = [];
    const rows: number[] = [];
    for (let x = (w % cw) / 2; x <= w; x += cw) cols.push(x);
    for (let y = (h % ch) / 2 + ch * 0.4; y <= h; y += ch) rows.push(y);
    const strength = (y: number) => st.fade === 'down' ? Math.max(0.1, 1 - y / h) : st.fade === 'up' ? Math.max(0.1, y / h) : 1;
    for (let i = 0; i < cols.length - 1; i++) for (let j = 0; j < rows.length - 1; j++) {
      const pg = wall.createLinearGradient(0, rows[j], 0, rows[j + 1]);
      pg.addColorStop(0, css(st.line, 0.1 * strength(rows[j])));
      pg.addColorStop(1, css(st.line, 0.02));
      wall.fillStyle = pg;
      wall.fillRect(cols[i] + 3, rows[j] + 3, cw - 6, ch - 6);
    }
    const line = (x0: number, y0: number, x1: number, y1: number, k: number) => {
      wall.strokeStyle = css(st.glow, 0.35 * k); wall.lineWidth = 9;
      wall.beginPath(); wall.moveTo(x0, y0); wall.lineTo(x1, y1); wall.stroke();
      wall.strokeStyle = css(st.line, 0.95 * k); wall.lineWidth = 3;
      wall.beginPath(); wall.moveTo(x0, y0); wall.lineTo(x1, y1); wall.stroke();
    };
    for (const y of rows) {
      // Lines drawn in runs with gaps, like the picture's broken panel seams.
      let x = 0;
      while (x < w) {
        const run = cw * (1 + Math.floor(rand() * 4));
        line(x, y, Math.min(w, x + run), y, strength(y));
        x += run + (rand() < 0.3 ? cw * 0.5 : 0);
      }
    }
    for (const x of cols) {
      const segs = st.fade ? 4 : 1;
      for (let k = 0; k < segs; k++) {
        const y0 = (h * k) / segs;
        line(x, y0, x, y0 + h / segs, strength(y0 + h / (2 * segs)));
      }
    }
    if (st.vents) {
      for (let i = 0; i < st.vents.count; i++) {
        const ci = Math.floor(rand() * (cols.length - 1));
        const rj = Math.floor(rand() * (rows.length - 1));
        const x = cols[ci] + cw * 0.2, y = rows[rj] + ch * 0.3;
        const vg = wall.createLinearGradient(0, y, 0, y + ch * 0.4);
        vg.addColorStop(0, css(st.vents.color, 0.55));
        vg.addColorStop(1, css(st.vents.color, 0.15));
        wall.fillStyle = vg;
        wall.fillRect(x, y, cw * 0.6, ch * 0.4);
        wall.fillStyle = css(st.dark, 0.8);
        for (let sx = x + 6; sx < x + cw * 0.6; sx += 14) wall.fillRect(sx, y, 4, ch * 0.4);
      }
    }
    // The silhouettes, in front: jagged pillars built from stacked slabs.
    front.fillStyle = css(st.dark);
    for (const [fx, pw] of st.pillars) {
      const cx = fx * w;
      let y = -20;
      while (y < h + 20) {
        const sh = 60 + rand() * 160;
        const sw = pw * (0.7 + rand() * 0.6);
        const dx = (rand() - 0.5) * pw * 0.5;
        front.fillRect(cx + dx - sw / 2, y, sw, sh + 4);
        // Now and then a shoulder sticking out, like the picture's bulky shapes.
        if (rand() < 0.35) front.fillRect(cx + dx + (rand() < 0.5 ? -sw : sw * 0.5), y + sh * 0.3, sw * 0.5, sh * 0.5);
        y += sh;
      }
    }
    for (const [fy, th] of st.beams ?? []) {
      front.fillRect(0, fy * h, w, th);
      for (let x = rand() * 200; x < w; x += 300 + rand() * 300) front.fillRect(x, fy * h - 10, 18, th + 20);
    }
    if (st.chasm) {
      for (const side of [-1, 1]) {
        let y = h * 0.35;
        let reach = 0;
        while (y < h + 20) {
          const sh = 50 + rand() * 120;
          reach = Math.min(st.chasm * w, reach + rand() * w * 0.06);
          const x0 = side < 0 ? 0 : w - reach;
          front.fillRect(x0, y, reach, sh + 4);
          y += sh;
        }
      }
    }
    return { rows, cols };
  };
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
    // The Foundry: a dense wall of small panels, heavy beams and pillars, vents glowing.
    room: [0xb8a088, 0x4a3020],
    paint: paintRoom({
      top: 0x2a1408, bottom: 0x0a0402, line: 0xff9a3a, glow: 0xff6a1a, dark: 0x0c0604, cell: [150, 110],
      pillars: [[0.14, 150], [0.47, 220], [0.83, 170]], beams: [[0.22, 34], [0.58, 26]], vents: { count: 7, color: 0xffb050 },
    }),
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
    // Sky Deck: tall panels of a shaft going up, open below, two slim pillars.
    room: [0xa898c0, 0x302448],
    paint: paintRoom({
      top: 0x2a1a50, bottom: 0x0a0618, line: 0xb07bff, glow: 0x7a4ad0, dark: 0x0a0616, cell: [200, 300],
      pillars: [[0.3, 90], [0.72, 110]], fade: 'down',
    }),
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
    // The Pit: wide panels plunging down a chasm, dark masses closing in from the sides.
    room: [0x90b0a8, 0x203830],
    paint: paintRoom({
      top: 0x0c2a28, bottom: 0x020806, line: 0x2ee6c8, glow: 0x18a088, dark: 0x030806, cell: [260, 150],
      pillars: [[0.5, 120]], fade: 'up', chasm: 0.3,
    }),
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
// The Long Hall (Capture the Flag): Sky Deck's violet room.
BACKDROPS.push(BACKDROPS[2]);

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
