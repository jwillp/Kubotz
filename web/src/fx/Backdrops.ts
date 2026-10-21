/**
 * Backdrop moods per arena (BackdropScene): a palette, painted parallax
 * layers, drifting lights and particles, and the light the robots and tiles
 * are lit with, so each map has its own place behind the same Kube tiles.
 *
 *  - The Kube: the blurred room with bokeh (the original look).
 *  - The Foundry: a warm furnace hall, gantries and chains, embers rising.
 *  - Sky Deck: a night city far below and around, searchlights, clouds under the stage.
 *  - The Pit: a cave opening on a storm, lightning lighting the fighters.
 *
 * Layers are painted once into canvases (procedurally, from a seed), so they
 * cost one image each to draw.
 */

export type Particles = 'none' | 'embers' | 'motes' | 'drips';

export interface BackdropTheme {
  /** The blurred Kube room behind everything (only The Kube). */
  room: boolean;
  /** Sky gradient top to bottom, when there is no room. */
  sky: [number, number, number];
  /** Painted layers, far to near: a painter and how much it drifts with the camera (0..1). */
  layers: { paint: Painter; depth: number }[];
  bokeh: { colors: number[]; count: number; alpha: number };
  shafts: { color: number; alpha: number; sweep: boolean } | null;
  particles: Particles;
  lightning: boolean;
  haze: string;
  /** Light2D in the match: ambient, and the rim light's colour. */
  ambient: number;
  rim: number;
  key: number;
}

export type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => void;

export function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

// ---------------------------------------------------------------- painters

/** A city skyline along the bottom: blocks with stepped tops, antennas and lit windows. */
function skyline(opts: { body: number; top: number; low: number; window: number[]; lit: number; edge?: number; antennas?: boolean }): Painter {
  return (ctx, w, h, rand) => {
    let x = -20;
    while (x < w) {
      const bw = 40 + rand() * 110;
      const bh = h * (opts.low + rand() * (opts.top - opts.low));
      const y = h - bh;
      ctx.fillStyle = css(opts.body);
      ctx.fillRect(x, y, bw, bh);
      // A setback or two on top.
      if (rand() < 0.5) ctx.fillRect(x + bw * 0.2, y - bh * 0.08, bw * 0.6, bh * 0.08 + 1);
      if (opts.antennas && rand() < 0.35) ctx.fillRect(x + bw * 0.5 - 1, y - bh * 0.22, 2, bh * 0.22);
      // A thin light edge on one side, like the city's glow catching it.
      if (opts.edge !== undefined) {
        ctx.fillStyle = css(opts.edge, 0.35);
        ctx.fillRect(x, y, 1.5, bh);
      }
      // Windows in a grid, some lit.
      const cw = 6, ch = 8;
      for (let wy = y + 8; wy < h - 6; wy += ch) {
        for (let wx = x + 5; wx < x + bw - 6; wx += cw) {
          if (rand() > opts.lit) continue;
          ctx.fillStyle = css(opts.window[Math.floor(rand() * opts.window.length)], 0.35 + rand() * 0.5);
          ctx.fillRect(wx, wy, 3, 4);
        }
      }
      x += bw + rand() * 12 - 4;
    }
  };
}

function stars(count: number): Painter {
  return (ctx, w, h, rand) => {
    for (let i = 0; i < count; i++) {
      const y = Math.pow(rand(), 1.6) * h * 0.7;
      ctx.fillStyle = `rgba(220,230,255,${0.2 + rand() * 0.6})`;
      const s = rand() < 0.08 ? 2 : 1;
      ctx.fillRect(rand() * w, y, s, s);
    }
  };
}

/** Soft cloud banks, painted from many overlapping blobs. */
function clouds(color: number, top: number, alpha: number): Painter {
  return (ctx, w, h, rand) => {
    for (let i = 0; i < 140; i++) {
      const x = rand() * w;
      const y = h * (top + rand() * (1 - top)) + 40;
      const r = 40 + rand() * 120;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, css(color, alpha));
      g.addColorStop(1, css(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };
}

/** Furnace glow and lit openings along the bottom of a far wall. */
function furnaceWall(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number): void {
  ctx.fillStyle = css(0x1a0f0c);
  ctx.fillRect(0, h * 0.25, w, h);
  // Big pillars and wall panels.
  for (let x = 0; x < w; x += 140 + rand() * 60) {
    ctx.fillStyle = css(0x24150f);
    ctx.fillRect(x, h * 0.25, 26, h);
    ctx.fillStyle = css(0x3a2216, 0.6);
    ctx.fillRect(x, h * 0.25, 3, h);
  }
  // Openings onto molten light.
  for (let i = 0; i < 6; i++) {
    const x = rand() * w;
    const ow = 50 + rand() * 90;
    const y = h * (0.62 + rand() * 0.18);
    const g = ctx.createLinearGradient(0, y, 0, y + 70);
    g.addColorStop(0, 'rgba(255,190,90,0.9)');
    g.addColorStop(1, 'rgba(255,80,20,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, ow, 70);
    ctx.fillStyle = 'rgba(30,14,8,0.9)';
    for (let bx = x + 10; bx < x + ow; bx += 14) ctx.fillRect(bx, y, 3, 70);
  }
  // The glow rising from the floor of the hall.
  const glow = ctx.createLinearGradient(0, h * 0.55, 0, h);
  glow.addColorStop(0, 'rgba(255,110,30,0)');
  glow.addColorStop(1, 'rgba(255,110,30,0.45)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
}

/** Truss gantries across, pillars, pipes and hanging chains, in silhouette. */
function gantries(color: number, rimColor: number, scale: number): Painter {
  return (ctx, w, h, rand) => {
    ctx.strokeStyle = css(color);
    ctx.fillStyle = css(color);
    const truss = (y: number, th: number) => {
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.moveTo(0, y + th); ctx.lineTo(w, y + th);
      for (let x = 0; x < w; x += th) { ctx.moveTo(x, y); ctx.lineTo(x + th / 2, y + th); ctx.lineTo(x + th, y); }
      ctx.stroke();
      ctx.strokeStyle = css(rimColor, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y + th + 1.5); ctx.lineTo(w, y + th + 1.5); ctx.stroke();
      ctx.strokeStyle = css(color);
    };
    truss(h * 0.12, 26 * scale);
    if (scale < 1.2) truss(h * 0.42, 18 * scale);
    // Pillars with cross bracing.
    for (let x = rand() * 200; x < w; x += 380 * scale + rand() * 200) {
      const pw = 30 * scale;
      ctx.lineWidth = 3 * scale;
      ctx.strokeRect(x, 0, pw, h);
      ctx.beginPath();
      for (let y = 0; y < h; y += pw) { ctx.moveTo(x, y); ctx.lineTo(x + pw, y + pw); ctx.moveTo(x + pw, y); ctx.lineTo(x, y + pw); }
      ctx.stroke();
    }
    // Pipes with flanges.
    for (let i = 0; i < 2; i++) {
      const y = h * (0.22 + rand() * 0.3);
      const t = (8 + rand() * 8) * scale;
      ctx.fillRect(0, y, w, t);
      for (let x = rand() * 80; x < w; x += 120 + rand() * 80) ctx.fillRect(x, y - 3, 6 * scale, t + 6);
    }
    // Hanging chains with hooks.
    for (let i = 0; i < 5; i++) {
      const x = rand() * w;
      const len = h * (0.2 + rand() * 0.35);
      const top = h * 0.12 + 26 * scale;
      ctx.lineWidth = 2 * scale;
      for (let y = top; y < top + len; y += 9 * scale) {
        ctx.beginPath();
        ctx.ellipse(x, y, 2.5 * scale, 5 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.arc(x + 6 * scale, top + len + 8 * scale, 8 * scale, Math.PI, Math.PI * 2.6);
      ctx.stroke();
    }
  };
}

/** A stormy sky with cloud banks, seen through the cave mouth. */
function stormSky(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number): void {
  for (let i = 0; i < 90; i++) {
    const x = rand() * w;
    const y = h * (0.1 + rand() * 0.5);
    const r = 60 + rand() * 140;
    const g = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
    g.addColorStop(0, `rgba(70,95,120,${0.25 + rand() * 0.2})`);
    g.addColorStop(1, 'rgba(30,45,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/**
 * Cave rock: jagged ceiling with stalactites and a floor with stalagmites,
 * framing an opening; a faint cold rim where the storm light catches it, and
 * a few glowing crystals.
 */
function cave(color: number, rimColor: number, open: number, crystals: number): Painter {
  return (ctx, w, h, rand) => {
    const edge = (fromTop: boolean) => {
      const dir = fromTop ? 1 : -1;
      const p1 = rand() * 6.3, p2 = rand() * 6.3;
      const pts: [number, number][] = [];
      for (let x = -10; x <= w + 10; x += 6 + rand() * 6) {
        const mid = Math.abs(x / w - 0.5) * 2; // 0 in the middle, 1 at the sides
        const base = h * (0.5 - dir * open * (1 - mid * mid) * 0.5);
        // Rolling rock: two slow waves and a little roughness.
        let y = base + Math.sin(x * 0.011 + p1) * 26 + Math.sin(x * 0.037 + p2) * 10 + (rand() - 0.5) * 6;
        // Stalactites hang and stalagmites rise: narrow spikes.
        if (rand() < 0.07) {
          const sw = 6 + rand() * 10;
          const len = 30 + rand() * 110;
          pts.push([x, y], [x + sw * (0.4 + rand() * 0.2), y + dir * len], [x + sw, y]);
          x += sw;
          continue;
        }
        pts.push([x, y]);
      }
      ctx.beginPath();
      ctx.moveTo(-10, fromTop ? -10 : h + 10);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(w + 10, fromTop ? -10 : h + 10);
      ctx.closePath();
      ctx.fillStyle = css(color);
      ctx.fill();
      // A soft cold rim where the storm light catches the rock.
      ctx.save();
      ctx.filter = 'blur(2px)';
      ctx.strokeStyle = css(rimColor, 0.16);
      ctx.lineWidth = 3;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + dir) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.restore();
      return pts;
    };
    const top = edge(true);
    const bottom = edge(false);
    // Rock texture: darker strata streaks.
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + rand() * 0.12})`;
      ctx.fillRect(rand() * w, rand() * h, 30 + rand() * 120, 2 + rand() * 3);
    }
    ctx.globalCompositeOperation = 'source-over';
    // Crystals near the rock edges, glowing.
    for (let i = 0; i < crystals; i++) {
      const pts = rand() < 0.5 ? top : bottom;
      const [x, y] = pts[Math.floor(rand() * pts.length)];
      const c = rand() < 0.6 ? 0x3affd0 : 0x9a7bff;
      const up = pts === bottom;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 40);
      glow.addColorStop(0, css(c, 0.22));
      glow.addColorStop(1, css(c, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(x - 40, y - 40, 80, 80);
      ctx.fillStyle = css(c, 0.6);
      for (let k = 0; k < 3; k++) {
        const cx = x + (rand() - 0.5) * 14;
        const ch = 8 + rand() * 14;
        ctx.beginPath();
        ctx.moveTo(cx - 3, y);
        ctx.lineTo(cx, y + (up ? -ch : ch));
        ctx.lineTo(cx + 3, y);
        ctx.fill();
      }
    }
  };
}

// ---------------------------------------------------------------- themes

const KUBE: BackdropTheme = {
  room: true,
  sky: [0x0a1428, 0x0a1428, 0x0a1428],
  layers: [],
  bokeh: { colors: [0x3ab8ff, 0x29abe2, 0x7fdcff, 0x3a6dff, 0x3ab8ff, 0x2ee6c8, 0x8a6bff, 0xd46bff, 0xffb46b, 0xff7fae, 0xcfe8ff], count: 34, alpha: 1 },
  shafts: { color: 0x4f8fd8, alpha: 0.07, sweep: false },
  particles: 'none',
  lightning: false,
  haze: 'rgba(10,20,40,0.9)',
  ambient: 0x64709a,
  rim: 0x3aa8ff,
  key: 0xffe8cc,
};

export const BACKDROPS: BackdropTheme[] = [
  KUBE,
  {
    // The Foundry
    room: false,
    sky: [0x0d0806, 0x2a140b, 0x5a2a12],
    layers: [
      { paint: furnaceWall, depth: 0.1 },
      { paint: gantries(0x120a08, 0xff8a3a, 1), depth: 0.3 },
      { paint: gantries(0x070404, 0xffa060, 1.8), depth: 0.6 },
    ],
    bokeh: { colors: [0xff9a3a, 0xffb46b, 0xff6a2a, 0xffd28a], count: 18, alpha: 0.8 },
    shafts: { color: 0xff9a50, alpha: 0.06, sweep: false },
    particles: 'embers',
    lightning: false,
    haze: 'rgba(40,16,6,0.85)',
    ambient: 0x7a6458,
    rim: 0xff8a3a,
    key: 0xffd8b0,
  },
  {
    // Sky Deck
    room: false,
    sky: [0x05061a, 0x1a1240, 0x6a2a6a],
    layers: [
      { paint: stars(260), depth: 0.02 },
      { paint: skyline({ body: 0x1c1640, top: 0.7, low: 0.3, window: [0x8fb8ff, 0xd08fff], lit: 0.12 }), depth: 0.12 },
      { paint: skyline({ body: 0x100c26, top: 0.55, low: 0.18, window: [0x7fe8ff, 0xffd28a, 0xff7fd8], lit: 0.22, edge: 0xff7fd8, antennas: true }), depth: 0.3 },
      { paint: clouds(0x3a2a6a, 0.72, 0.35), depth: 0.5 },
    ],
    bokeh: { colors: [0xff7fd8, 0x7fe8ff, 0xffd28a, 0xb08fff], count: 14, alpha: 0.7 },
    shafts: { color: 0xbfe8ff, alpha: 0.1, sweep: true },
    particles: 'motes',
    lightning: false,
    haze: 'rgba(30,14,50,0.85)',
    ambient: 0x6a6496,
    rim: 0xff6fd0,
    key: 0xe8e4ff,
  },
  {
    // The Pit
    room: false,
    sky: [0x05090c, 0x0f1c24, 0x1c2c34],
    layers: [
      { paint: stormSky, depth: 0.04 },
      { paint: cave(0x0b1216, 0x6fd8ff, 0.7, 4), depth: 0.18 },
      { paint: cave(0x040709, 0x3affd0, 0.92, 8), depth: 0.45 },
    ],
    bokeh: { colors: [0x3affd0, 0x6fd8ff, 0x9a7bff], count: 12, alpha: 0.6 },
    shafts: null,
    particles: 'drips',
    lightning: true,
    haze: 'rgba(6,14,18,0.92)',
    ambient: 0x4e6670,
    rim: 0x3affd0,
    key: 0xcfe8ff,
  },
];

/** The backdrop of an arena (index into ARENA_INFO). */
export function backdropOf(arena: number | undefined): BackdropTheme {
  return BACKDROPS[arena ?? 0] ?? KUBE;
}

/** A lightning bolt from the top of a canvas: midpoint displacement, with a branch or two. */
export function paintBolt(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number): void {
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
    for (const [lw, a] of [[width * 6, 0.12], [width * 2.5, 0.35], [width, 1]] as const) {
      ctx.strokeStyle = `rgba(210,240,255,${a})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    if (depth > 0) {
      for (let b = 0; b < 2; b++) {
        const [sx, sy] = pts[8 + Math.floor(rand() * (pts.length - 16))];
        bolt(sx, sy, sx + (rand() - 0.5) * w * 0.4, sy + h * (0.15 + rand() * 0.25), spread * 4, width * 0.6, depth - 1);
      }
    }
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const x = w * (0.25 + rand() * 0.5);
  bolt(x, 0, x + (rand() - 0.5) * w * 0.3, h * (0.55 + rand() * 0.3), w * 0.25, 2, 1);
}
