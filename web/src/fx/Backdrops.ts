import { ARENAS } from '../map/Arenas';

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
 *
 * Then more rooms, for any arena to pick (its file's `room`): rooms in one
 * colour, white rooms and black rooms with coloured light strips, and night
 * cities under the stars.
 */

export type Particles = 'none' | 'embers' | 'motes' | 'rain';

export interface BackdropTheme {
  /** Its name in the arena files (`room`), and in the editors' Background list. */
  id: string;
  label: string;
  /** Tint of the blurred room, top and bottom. */
  room: [number, number];
  /** A room of its own in the Kube backdrop's language (undefined: the Kube's own picture). */
  paint?: RoomPainter;
  /** The lens blur on the painted wall and on the silhouettes in front (px); default 7 and 5. */
  blur?: [wall: number, front: number];
  /** A light room: its lights are drawn over it, not added (they would wash out to white). */
  light?: boolean;
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
/** `a` towards `b` by `t` (0..1). */
function mix(a: number, b: number, t: number): number {
  let out = 0;
  for (const s of [16, 8, 0]) {
    const x = (a >> s) & 255, y = (b >> s) & 255;
    out |= Math.round(x + (y - x) * t) << s;
  }
  return out;
}
/** `c` darkened to `k` of its brightness. */
const shade = (c: number, k: number) => mix(0, c, k);

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
  /** Light strips in a colour of their own along some of the seams (the white and black rooms' highlights). */
  strips?: number;
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
    if (st.strips !== undefined) {
      // Some seams lit in the room's colour, the rest left plain (their core paler in a dark room, as lights are).
      const core = st.top > 0x808080 ? st.strips : mix(st.strips, 0xffffff, 0.35);
      const strip = (x0: number, y0: number, x1: number, y1: number) => {
        // Thick enough to stay bright through the lens blur.
        for (const [lw, a] of [[34, 0.16], [14, 0.45], [6, 1]] as const) {
          wall.strokeStyle = css(lw === 6 ? core : st.strips!, a); wall.lineWidth = lw;
          wall.beginPath(); wall.moveTo(x0, y0); wall.lineTo(x1, y1); wall.stroke();
        }
      };
      for (const y of rows) if (rand() < 0.45) {
        const x0 = rand() < 0.5 ? 0 : cw * Math.floor(rand() * 4);
        strip(x0, y, Math.min(w, x0 + cw * (3 + Math.floor(rand() * 8))), y);
      }
      for (const x of cols) if (rand() < 0.3) {
        const y0 = rows[Math.floor(rand() * rows.length)] ?? 0;
        strip(x, y0, x, y0 + ch * (1 + Math.floor(rand() * 3)));
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

interface CityStyle {
  /** The night sky: top, middle, and the horizon's glow. */
  sky: [number, number, number];
  stars: number;
  /** Faint clouds of gas across the sky. */
  nebula?: number[];
  /** A planet (with a ring), or a moon: where (0..1), radius, colour. */
  planet?: { x: number; y: number; r: number; color: number; ring?: boolean };
  /** Curtains of light hanging over the city. */
  aurora?: number;
  /** The far skyline, the towers in front, and the fog between them. */
  far: number; near: number; fog: number;
  /** Lit windows, and the neon signs. */
  windows: number[]; neon: number[];
}

/**
 * A city at night under the stars, in the rooms' language (blurred a little,
 * dark towers in front): the sky with its stars and maybe a planet, layers
 * of skyline sinking into fog, and near towers with lit windows and neon.
 * The rows it returns are the flying traffic's lanes (no columns).
 */
function paintCity(cs: CityStyle): RoomPainter {
  return (wall, front, w, h, rand) => {
    const pick = (a: number[]) => a[Math.floor(rand() * a.length)];
    const sky = wall.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, css(cs.sky[0]));
    sky.addColorStop(0.5, css(cs.sky[1]));
    sky.addColorStop(0.8, css(cs.sky[2]));
    sky.addColorStop(1, css(cs.sky[2]));
    wall.fillStyle = sky;
    wall.fillRect(0, 0, w, h);
    const soft = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: number, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, css(c, a));
      g.addColorStop(1, css(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    wall.globalCompositeOperation = 'lighter';
    // Gas clouds along a band across the sky.
    for (const [i, c] of (cs.nebula ?? []).entries()) {
      for (let k = 0; k < 7; k++) {
        const t = rand();
        soft(wall, t * w, h * (0.08 + 0.4 * (1 - t)) + (rand() - 0.5) * 160 + i * 30, 160 + rand() * 260, c, 0.06 + rand() * 0.06);
      }
    }
    if (cs.aurora !== undefined) {
      // Thin vertical strokes, their foot along a slow wave, fading upwards.
      for (let x = 0; x < w; x += 3) {
        const foot = h * (0.4 + 0.08 * Math.sin(x / 260) + 0.04 * Math.sin(x / 97 + 1));
        const tall = 180 + 140 * (0.5 + 0.5 * Math.sin(x / 140 + 2));
        const a = 0.12 + 0.18 * Math.max(0, Math.sin(x / 180) + Math.sin(x / 61) * 0.5);
        const g = wall.createLinearGradient(0, foot - tall, 0, foot);
        g.addColorStop(0, css(cs.aurora, 0));
        g.addColorStop(0.85, css(cs.aurora, a));
        g.addColorStop(1, css(cs.aurora, 0));
        wall.fillStyle = g;
        wall.fillRect(x, foot - tall, 3, tall);
      }
    }
    // Stars, thinning towards the horizon; a few bright ones with a glint.
    for (let i = 0; i < cs.stars; i++) {
      const x = rand() * w;
      const y = h * 0.72 * Math.pow(rand(), 1.3);
      const r = 0.7 + Math.pow(rand(), 4) * 1.8;
      const tint = rand() < 0.2 ? pick(cs.windows) : 0xffffff;
      wall.fillStyle = css(mix(0xffffff, tint, 0.4), (0.35 + rand() * 0.65) * (1 - y / h));
      wall.beginPath(); wall.arc(x, y, r, 0, Math.PI * 2); wall.fill();
      if (r > 2.1) {
        soft(wall, x, y, r * 7, mix(0xffffff, tint, 0.4), 0.35);
        wall.fillStyle = css(0xffffff, 0.35);
        wall.fillRect(x - r * 6, y - 0.5, r * 12, 1);
        wall.fillRect(x - 0.5, y - r * 6, 1, r * 12);
      }
    }
    wall.globalCompositeOperation = 'source-over';
    if (cs.planet) {
      const { r, color, ring } = cs.planet;
      const px = cs.planet.x * w, py = cs.planet.y * h;
      wall.globalCompositeOperation = 'lighter';
      soft(wall, px, py, r * 1.5, color, 0.22);
      wall.globalCompositeOperation = 'source-over';
      const band = (from: number, to: number) => {
        wall.strokeStyle = css(mix(color, 0xffffff, 0.3), 0.5); wall.lineWidth = r * 0.12;
        wall.beginPath(); wall.ellipse(px, py, r * 2.1, r * 0.42, -0.28, from, to); wall.stroke();
        wall.strokeStyle = css(mix(color, 0xffffff, 0.5), 0.35); wall.lineWidth = r * 0.04;
        wall.beginPath(); wall.ellipse(px, py, r * 2.4, r * 0.5, -0.28, from, to); wall.stroke();
      };
      if (ring) band(Math.PI, Math.PI * 2);
      // Lit from the top left: bright side, its colour, a dark limb.
      const g = wall.createRadialGradient(px - r * 0.45, py - r * 0.45, r * 0.05, px, py, r);
      g.addColorStop(0, css(mix(color, 0xffffff, 0.45)));
      g.addColorStop(0.55, css(color));
      g.addColorStop(1, css(shade(color, 0.18)));
      wall.fillStyle = g;
      wall.beginPath(); wall.arc(px, py, r, 0, Math.PI * 2); wall.fill();
      // Bands of cloud (a planet) or craters (a moon).
      wall.save();
      wall.beginPath(); wall.arc(px, py, r, 0, Math.PI * 2); wall.clip();
      for (let k = 0; k < 9; k++) {
        if (ring) {
          wall.fillStyle = css(k % 2 ? shade(color, 0.6) : mix(color, 0xffffff, 0.2), 0.18);
          wall.fillRect(px - r, py - r + (k / 9) * r * 2 + rand() * 8, r * 2, r * (0.06 + rand() * 0.12));
        } else {
          wall.fillStyle = css(shade(color, 0.55), 0.22);
          wall.beginPath(); wall.arc(px + (rand() - 0.5) * r * 1.4, py + (rand() - 0.5) * r * 1.4, r * (0.06 + rand() * 0.14), 0, Math.PI * 2); wall.fill();
        }
      }
      wall.restore();
      if (ring) band(0, Math.PI);
    }
    // Skylines sinking into the fog: far, then nearer and taller.
    const horizon = h * 0.7;
    const skyline = (ctx: CanvasRenderingContext2D, base: number, minH: number, maxH: number, minW: number, maxW: number, color: number, lit: number, win: number) => {
      let x = -20;
      while (x < w + 20) {
        const bw = minW + rand() * (maxW - minW);
        const bh = minH + Math.pow(rand(), 1.6) * (maxH - minH);
        const top = base - bh;
        ctx.fillStyle = css(color);
        ctx.fillRect(x, top, bw, h - top);
        // Setbacks, a spire or an antenna with its red light.
        if (rand() < 0.4) ctx.fillRect(x + bw * 0.25, top - bh * 0.15, bw * 0.5, bh * 0.15 + 2);
        if (rand() < 0.3) {
          const ax = x + bw * (0.3 + rand() * 0.4);
          ctx.fillRect(ax - 1.5, top - 40 - rand() * 50, 3, 90);
          ctx.fillStyle = css(0xff3a3a, 0.9);
          ctx.fillRect(ax - 2.5, top - 92, 5, 5);
        }
        // Windows: a grid, some lit.
        for (let wy = top + win * 2; wy < h; wy += win * 2.2) {
          for (let wx = x + win; wx < x + bw - win; wx += win * 1.8) {
            if (rand() > lit) continue;
            ctx.fillStyle = css(pick(cs.windows), 0.35 + rand() * 0.5);
            ctx.fillRect(wx, wy, win, win * 1.2);
          }
        }
        x += bw + (rand() < 0.3 ? rand() * 30 : 0);
      }
    };
    const fog = (ctx: CanvasRenderingContext2D, from: number, to: number, a: number) => {
      const g = ctx.createLinearGradient(0, from, 0, to);
      g.addColorStop(0, css(cs.fog, 0));
      g.addColorStop(1, css(cs.fog, a));
      ctx.fillStyle = g;
      ctx.fillRect(0, from, w, h - from);
    };
    skyline(wall, horizon, 40, 200, 30, 90, mix(cs.far, cs.fog, 0.35), 0.18, 2);
    fog(wall, horizon - 160, horizon + 60, 0.6);
    skyline(wall, horizon + 90, 120, 360, 60, 150, cs.far, 0.22, 3);
    fog(wall, horizon - 40, h, 0.55);
    // The near towers, on the front layer: tall, stepped, windows lit, neon signs.
    const towers = 6;
    for (let i = 0; i < towers; i++) {
      const cx = ((i + 0.2 + rand() * 0.6) / towers) * w;
      const bw = 120 + rand() * 130;
      const top = h * (0.28 + rand() * 0.34);
      const x = cx - bw / 2;
      front.fillStyle = css(cs.near);
      front.fillRect(x, top, bw, h - top);
      front.fillRect(x + bw * 0.15, top - 40, bw * 0.7, 42);
      front.fillRect(x + bw * 0.45, top - 130 - rand() * 80, 6, 200);
      front.fillStyle = css(0xff3a3a);
      front.fillRect(x + bw * 0.45 - 2, top - 210, 10, 8);
      for (let wy = top + 16; wy < h; wy += 20) {
        for (let wx = x + 10; wx < x + bw - 12; wx += 14) {
          if (rand() > 0.3) continue;
          front.fillStyle = css(pick(cs.windows), 0.25 + rand() * 0.35);
          front.fillRect(wx, wy, 6, 9);
        }
      }
      // Neon: a tall sign down one edge, a band across the front.
      front.save();
      const neon = pick(cs.neon);
      front.shadowColor = css(neon); front.shadowBlur = 26;
      front.fillStyle = css(mix(neon, 0xffffff, 0.25));
      const sx = rand() < 0.5 ? x - 18 : x + bw - 6;
      const sy = top + 60 + rand() * 200;
      front.fillRect(sx, sy, 24, 140 + rand() * 180);
      if (rand() < 0.6) {
        const n2 = pick(cs.neon);
        front.shadowColor = css(n2);
        front.fillStyle = css(mix(n2, 0xffffff, 0.25));
        front.fillRect(x + 8, top + 30 + rand() * h * 0.3, bw - 16, 6);
      }
      front.restore();
    }
    // Sky bridges between towers, low down.
    front.fillStyle = css(cs.near);
    for (let k = 0; k < 3; k++) front.fillRect(rand() * w * 0.7, h * (0.62 + rand() * 0.25), 200 + rand() * 300, 14);
    return { rows: [0.34, 0.42, 0.5, 0.58].map((f) => h * f), cols: [] };
  };
}

/** A room's shape: panel size, pillars, beams, lit vents (how many), fading lines, a chasm. */
type Layout = Pick<RoomStyle, 'cell' | 'pillars' | 'beams' | 'fade' | 'chasm'> & { vents?: number };

const HALL: Layout = { cell: [180, 130], pillars: [[0.2, 130], [0.8, 130]], beams: [[0.3, 22]] };
const TOWER: Layout = { cell: [220, 260], pillars: [[0.5, 180]], fade: 'down' };
const LATTICE: Layout = { cell: [120, 120], pillars: [[0.1, 100], [0.36, 80], [0.64, 80], [0.9, 100]], vents: 5 };
const GALLERY: Layout = { cell: [300, 140], pillars: [[0.27, 120], [0.73, 120]], beams: [[0.18, 30], [0.7, 20]], vents: 6 };
const DROP: Layout = { cell: [240, 180], pillars: [], fade: 'up', chasm: 0.22 };
const LAYOUTS = [HALL, LATTICE, GALLERY, TOWER, DROP];

const WHITE = 0xffffff;
/** The tiles' plates leaning a little towards `c`. */
const platesOf = (c: number, k = 1): [number, number, number] =>
  [16, 8, 0].map((s) => k * (0.92 + 0.2 * (((c >> s) & 255) / 255))) as [number, number, number];
const shapeOf = (l: Layout, vents: number) => ({ ...l, vents: l.vents ? { count: l.vents, color: vents } : undefined });

/** A room in one colour `c` (`deep` for its glows), as the Foundry, Sky Deck and the Pit are. */
function colourRoom(id: string, label: string, c: number, deep: number, accents: number[], hue: number, layout: Layout, more: Partial<BackdropTheme> = {}): BackdropTheme {
  return {
    id, label,
    room: [shade(mix(WHITE, c, 0.3), 0.72), shade(mix(WHITE, c, 0.5), 0.28)],
    paint: paintRoom({ top: shade(c, 0.16), bottom: shade(c, 0.04), line: c, glow: deep, dark: shade(c, 0.05), ...shapeOf(layout, mix(c, WHITE, 0.3)) }),
    bokeh: { main: [c, deep, mix(c, WHITE, 0.4), mix(c, deep, 0.5)], accents },
    shafts: [c, mix(c, WHITE, 0.5)],
    particles: 'motes',
    lightning: false,
    haze: css(shade(c, 0.13), 0.9),
    ambient: shade(mix(0xb0b0b0, c, 0.3), 0.6),
    key: mix(WHITE, c, 0.25),
    rim: c,
    glow: c,
    rimLine: mix(WHITE, c, 0.45),
    tiles: { hue, plates: platesOf(c) },
    ...more,
  };
}

/** A white room: pale panels, grey seams, some of them lit in `c`. */
function whiteRoom(id: string, label: string, c: number, hue: number, layout: Layout, accents: number[]): BackdropTheme {
  return {
    id, label, light: true,
    room: [0xe8ebf0, 0xa2a9b4],
    paint: paintRoom({ top: 0xf6f8fa, bottom: 0xc8ced6, line: 0xaab2be, glow: 0xdde2e8, dark: 0xb2b8c2, strips: c, ...shapeOf(layout, c) }),
    bokeh: { main: [c, mix(c, WHITE, 0.5)], accents },
    shafts: [WHITE, mix(c, WHITE, 0.6)],
    particles: 'motes',
    lightning: false,
    haze: 'rgba(236,240,246,0.75)',
    ambient: 0x9ca2ae,
    key: WHITE,
    rim: c,
    glow: c,
    rimLine: mix(WHITE, c, 0.45),
    tiles: { hue, plates: platesOf(0xe0e4ea, 1.5) },
  };
}

/** A black room: near-black panels and seams, some of them lit in `c`. */
function blackRoom(id: string, label: string, c: number, hue: number, layout: Layout, accents: number[]): BackdropTheme {
  return {
    id, label,
    // The room is painted black already: the tint mostly sets how bright its strips are.
    room: [0xd0d4dc, 0x8a8e96],
    paint: paintRoom({ top: 0x16181c, bottom: 0x040405, line: 0x3a3e46, glow: 0x1c1e22, dark: 0x000000, strips: c, ...shapeOf(layout, c) }),
    bokeh: { main: [c, mix(c, WHITE, 0.4)], accents },
    shafts: [shade(c, 0.6), mix(c, WHITE, 0.5)],
    particles: 'motes',
    lightning: false,
    haze: 'rgba(2,2,4,0.92)',
    ambient: 0x4a4c54,
    key: mix(WHITE, c, 0.15),
    rim: c,
    glow: c,
    rimLine: mix(WHITE, c, 0.45),
    tiles: { hue, plates: platesOf(0x9098a0, 0.8) },
  };
}

/** A night city (paintCity): its sky and towers, and the light and neon it gives the match. */
function cityRoom(id: string, label: string, cs: CityStyle, look: { neon: number; hue: number; ambient: number; particles: Particles; lightning?: boolean }): BackdropTheme {
  const c = look.neon;
  return {
    id, label,
    room: [0xbcbcc8, 0x9494a4],
    paint: paintCity(cs),
    blur: [1.5, 3],
    bokeh: { main: cs.neon, accents: cs.windows },
    shafts: [shade(c, 0.5), mix(c, WHITE, 0.4)],
    particles: look.particles,
    lightning: !!look.lightning,
    haze: css(shade(cs.fog, 0.4), 0.85),
    ambient: look.ambient,
    key: mix(WHITE, cs.windows[0], 0.3),
    rim: c,
    glow: c,
    rimLine: mix(WHITE, c, 0.45),
    tiles: { hue: look.hue, plates: platesOf(cs.fog, 0.95) },
  };
}

// The palette's colours, for the new rooms.
const BLUE = 0x3ab8ff, AMBER = 0xff9a3a, VIOLET = 0xb07bff, TEAL = 0x2ee6c8, PINK = 0xff5ab8, RED = 0xff3a44, CYAN = 0x3af0ff;

export const BACKDROPS: BackdropTheme[] = [
  {
    // The Kube
    id: 'kube', label: 'The Kube (blue)',
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
    id: 'foundry', label: 'Foundry (amber)',
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
    id: 'skyDeck', label: 'Sky Deck (violet)',
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
    id: 'pit', label: 'The Pit (teal)',
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
  colourRoom('bloom', 'Bloom (pink)', PINK, 0xd02a8a, [0x7fe8ff, 0xffd28a, 0xb07bff, 0xffe0f0], 325, LATTICE),
  colourRoom('core', 'The Core (red)', RED, 0xc0141e, [0xff9a3a, 0xffe0b0, 0xff6a8a, 0xffd04a], 355, GALLERY, { particles: 'embers' }),
  colourRoom('coolant', 'Coolant (cyan)', CYAN, 0x18a8d0, [0xb07bff, 0xe0ffff, 0x3a6dff, 0xb0ff8a], 186, TOWER),
  colourRoom('lagoon', 'Lagoon (teal)', 0x22c8b0, 0x0e8a7a, [0x3ab8ff, 0xcfffe8, 0xffd28a, 0x9a7bff], 172, HALL),
  ...([['Blue', BLUE, 200], ['Amber', AMBER, 26], ['Violet', VIOLET, 272], ['Teal', TEAL, 165], ['Pink', PINK, 325]] as const)
    .map(([name, c, hue], i) => whiteRoom(`white${name}`, `White room (${name.toLowerCase()})`, c, hue, LAYOUTS[i], [BLUE, AMBER, VIOLET, TEAL, PINK].filter((x) => x !== c))),
  ...([['Blue', BLUE, 200], ['Amber', AMBER, 26], ['Violet', VIOLET, 272], ['Teal', TEAL, 165], ['Red', RED, 355]] as const)
    .map(([name, c, hue], i) => blackRoom(`black${name}`, `Black room (${name.toLowerCase()})`, c, hue, LAYOUTS[(i + 2) % LAYOUTS.length], [WHITE, mix(c, WHITE, 0.6)])),
  cityRoom('neonRain', 'City: Neon Rain', {
    sky: [0x0a0420, 0x2a0a40, 0x8a1a6a], stars: 260, nebula: [0x6a1aa0],
    far: 0x2a1038, near: 0x07040c, fog: 0x5a1450,
    windows: [0xffd28a, 0x7fe8ff, 0xff9ad8], neon: [0xff3ab0, 0x3af0ff, 0xb07bff],
  }, { neon: 0xff4ac0, hue: 320, ambient: 0x5a4a78, particles: 'rain' }),
  cityRoom('ringedPlanet', 'City: Ringed Planet', {
    sky: [0x02040e, 0x081a38, 0x1a5a7a], stars: 900, nebula: [0x3a6aff, 0x2ee6c8],
    planet: { x: 0.72, y: 0.24, r: 150, color: 0xd89a6a, ring: true },
    far: 0x0c1c2c, near: 0x03070c, fog: 0x1a4a60,
    windows: [0x9fe6ff, 0xffe0a0, 0x7fffd0], neon: [0x2ee6c8, 0x3ab8ff, 0xffb46b],
  }, { neon: 0x3ac8ff, hue: 195, ambient: 0x4a6078, particles: 'motes' }),
  cityRoom('redMoon', 'City: Red Moon', {
    sky: [0x080206, 0x2a0810, 0x7a2010], stars: 600,
    planet: { x: 0.25, y: 0.22, r: 110, color: 0xff5a3a },
    far: 0x2a0c0c, near: 0x080204, fog: 0x6a1a10,
    windows: [0xffb050, 0xff7a4a, 0xffe0b0], neon: [0xff3a3a, 0xff9a3a, 0xffd04a],
  }, { neon: 0xff5a3a, hue: 12, ambient: 0x6a4a48, particles: 'motes', lightning: true }),
  cityRoom('aurora', 'City: Aurora', {
    sky: [0x020610, 0x06182a, 0x0e3a40], stars: 800, aurora: 0x3affb0,
    far: 0x0a1a20, near: 0x02060a, fog: 0x0e3a3a,
    windows: [0xcfffe8, 0xffe0a0], neon: [0x3affb0, 0x9a7bff, 0x3ab8ff],
  }, { neon: 0x3affb0, hue: 155, ambient: 0x46645e, particles: 'motes' }),
];

/** Room names for the arena files (`room`), in BACKDROPS order; the first four are the original arenas'. */
export const ROOMS = BACKDROPS.map((t) => t.id);
/** The rooms for a Background list: [room, its label]. */
export const ROOM_CHOICES: [string, string][] = BACKDROPS.map((t) => [t.id, t.label]);

/** The mood of an arena (index into ARENA_INFO): the room its file names, else the one at its place in the list. */
export function backdropOf(arena: number | undefined): BackdropTheme {
  const room = ARENAS[arena ?? 0]?.room;
  const i = room ? ROOMS.indexOf(room) : arena ?? 0;
  return BACKDROPS[i] ?? BACKDROPS[0];
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
