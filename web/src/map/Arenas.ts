import type { MapObject, TileLayer, TmxMap } from './TmxMap';

/**
 * More arenas, built from the original map's tiles. Each one is a list of
 * blocks in map units (1 unit = one 64 px cell; the tiles are 2 x 2 units);
 * the tile art is laid on them the way the original map does it: ground or
 * ceiling strips on slabs, side pieces down walls, platform pieces with their
 * end caps on platforms, and fades on the outer side of the frame.
 */

type Rect = [x: number, y: number, w: number, h: number];

export interface ArenaDef {
  name: string;
  blurb: string;
  walls: Rect[];
  platforms: Rect[];
  warps: Rect[];
  /** Feet positions. */
  spawns: [x: number, y: number][];
  /** Centres. */
  bonus: [x: number, y: number][];
}

const W = 52;
const H = 38;

/** The original cube's frame: ceiling, side walls with a portal in each, floor. */
function kube(floor: Rect[] = [[6, 34, 40, 3]]): Pick<ArenaDef, 'walls' | 'warps'> {
  return {
    walls: [
      [6, 1, 40, 2],
      [4, 3, 2, 13], [1, 16, 5, 2], [1, 23, 5, 2], [4, 25, 2, 11],
      [46, 3, 2, 13], [46, 16, 5, 2], [46, 23, 5, 2], [46, 25, 2, 11],
      ...floor,
    ],
    warps: [[1, 18, 1, 5], [50, 18, 1, 5]],
  };
}

export const ARENAS: (ArenaDef | null)[] = [
  null, // the original map (DebugMap.tmx)
  {
    name: 'The Foundry',
    blurb: 'Two pillars and a block in the middle',
    ...((f) => ({ walls: [...f.walls, [14, 26, 4, 8], [34, 26, 4, 8], [23, 17, 6, 2]] as Rect[], warps: f.warps }))(kube()),
    platforms: [[20, 29, 12, 1], [7, 20, 7, 1], [38, 20, 7, 1], [18, 12, 6, 1], [28, 12, 6, 1]],
    spawns: [[8, 34], [44, 34], [16, 26], [36, 26]],
    bonus: [[10, 17], [41.5, 17], [26, 15], [26, 27]],
  },
  {
    name: 'Sky Deck',
    blurb: 'An open stage: fall off and you are out',
    walls: [[10, 25, 32, 3], [14, 28, 24, 2]],
    platforms: [[14, 19, 7, 1], [31, 19, 7, 1], [22, 13, 8, 1]],
    warps: [],
    spawns: [[15, 25], [37, 25], [17.5, 19], [34.5, 19]],
    bonus: [[26, 22], [17.5, 16], [34.5, 16], [26, 10]],
  },
  {
    name: 'The Pit',
    blurb: 'Mind the hole in the floor',
    ...((f) => ({ walls: [...f.walls, [6, 27, 6, 2], [40, 27, 6, 2]] as Rect[], warps: f.warps }))(kube([[6, 34, 13, 3], [33, 34, 13, 3]])),
    platforms: [[22, 29, 8, 1], [15, 22, 8, 1], [29, 22, 8, 1], [21, 15, 10, 1], [8, 13, 6, 1], [38, 13, 6, 1]],
    spawns: [[9, 34], [43, 34], [19, 22], [33, 22]],
    bonus: [[26, 26], [26, 12], [11, 10], [41, 10]],
  },
];

export const ARENA_INFO = [
  { name: 'The Kube', blurb: 'The original arena' },
  ...ARENAS.slice(1).map((a) => ({ name: a!.name, blurb: a!.blurb })),
];

/** A map like the TMX one, for an arena: same tiles, generated layers and objects. */
export function buildArenaMap(def: ArenaDef, base: TmxMap): TmxMap {
  const gidOf = new Map<string, number>();
  for (const [gid, t] of base.tileImages) gidOf.set(t.source, gid);
  const layers: Record<'fades' | 'blocks' | 'platforms', number[]> = {
    fades: new Array(W * H).fill(0),
    blocks: new Array(W * H).fill(0),
    platforms: new Array(W * H).fill(0),
  };
  // A tile is drawn with its bottom on its cell's bottom edge: a 2-unit-tall
  // tile covering rows top..top+1 sits in row top+1.
  const put = (layer: keyof typeof layers, source: string, x: number, top: number) => {
    const gid = gidOf.get(source);
    const row = top + 1;
    if (!gid || x < 0 || x >= W || row < 0 || row >= H) return;
    layers[layer][row * W + x] = gid;
  };
  let seed = 7;
  const pick = (a: number, b: number) => { seed = (seed * 16807) % 2147483647; return seed % 2 ? a : b; };
  // Tile positions along a span, every `step` units, the last one flush with its end.
  const along = (from: number, length: number, step: number) => {
    const out: number[] = [];
    for (let v = from; v < from + length; v += step) out.push(Math.min(v, from + length - 2));
    return out;
  };

  for (const [x, y, w, h] of def.walls) {
    if (w >= h) {
      const ceiling = y <= 3;
      const xs = along(x, w, 2);
      xs.forEach((cx, i) => {
        const n = i === 0 ? 1 : i === xs.length - 1 ? 4 : pick(2, 3);
        put('blocks', `${ceiling ? 'top' : 'ground'}_0${n}.png`, cx, y);
      });
      for (let cx = x; cx + 8 <= x + w + 1; cx += 8) {
        if (ceiling) put('fades', 'top_fade.png', cx, y - 2);
        else if (h >= 3) put('fades', 'bottom_fade.png', cx, y + 2);
      }
    } else {
      for (const cy of along(y, h, 2)) {
        for (const cx of along(x, w, 2)) put('blocks', `side${pick(3, 4) === 3 ? '03' : '4'}.png`, cx, cy);
        // Fades on the outer side of the frame.
        if (x <= 6) put('fades', `left_fade_0${pick(1, 2)}.png`, x - 2, cy);
        else if (x + w >= W - 6) put('fades', `right_fade_0${pick(1, 2)}.png`, x + w, cy);
      }
    }
  }
  for (const [x, y, w] of def.platforms) {
    for (let cx = x; cx <= x + w - 2; cx++) {
      const n = cx === x ? 1 : cx === x + w - 2 ? 4 : pick(2, 3);
      put('platforms', `platform_0${n}.png`, cx, y);
    }
  }

  const U = base.tileWidth;
  let id = 1;
  const obj = (type: string, x: number, y: number, w: number, h: number): MapObject => ({ id: id++, type, x: x * U, y: y * U, width: w * U, height: h * U });
  const objects: MapObject[] = [
    ...def.walls.map(([x, y, w, h]) => obj('WALL', x, y, w, h)),
    ...def.platforms.map(([x, y, w, h]) => obj('STATIC_PLATFORM', x, y, w, h)),
    ...def.warps.map(([x, y, w, h]) => obj('WARP_ZONE', x, y, w, h)),
    ...def.spawns.map(([x, y]) => obj('PLAYER_SPAWN', x - 0.5, y - 1, 1, 1)),
    ...def.bonus.map(([x, y]) => obj('BONUS_SPAWN', x - 0.5, y - 0.5, 1, 1)),
  ];
  const tileLayers: TileLayer[] = (['fades', 'blocks', 'platforms'] as const).map((name) => ({ name, visible: true, gids: layers[name] }));
  return { width: W, height: H, tileWidth: U, tileHeight: U, tileImages: base.tileImages, layers: tileLayers, objects };
}
