import type { MapObject, TileLayer, TmxMap } from './TmxMap';

/**
 * More arenas, built from the original map's tiles. Each one is a list of
 * blocks in map units (1 unit = one 64 px cell; the tiles are 2 x 2 units);
 * the tile art is laid on them the way the original map does it: ground or
 * ceiling strips on slabs, side pieces down walls, platform pieces with their
 * end caps on platforms, and fades on the outer side of the frame.
 */

type Rect = [x: number, y: number, w: number, h: number];

/** Modes that play their own arena. */
export type ArenaMode = 'ctf' | 'kubeball' | 'skychase';

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
  /** Width and height in units (default one Kube: 52 x 38; the same field as the arena editor's). */
  size?: [w: number, h: number];
  /** Capture the Flag only: the flag stands (the pole's foot), the players' first; spawns nearest a stand belong to its team. */
  flags?: [x: number, y: number][];
  /** Portals inside the arena, in pairs (1st and 2nd, 3rd and 4th...): going into one comes out of the other. */
  portals?: Rect[];
  /** The one mode this arena is played in (and the only arena that mode plays); others never list it. */
  mode?: ArenaMode;
  /** Ball games: goals (rifts on a wall's face) and the team each one belongs to (the other team scores in it). */
  goals?: [team: number, x: number, y: number, w: number, h: number][];
  /** Ball games: where the ball is put into play (its centre). */
  ball?: [x: number, y: number];
}

/** One Kube's size in units: the default arena size. */
export const KUBE_SIZE: [w: number, h: number] = [52, 38];

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
  null, // the original map (debug-map.tmx)
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
  {
    // Capture the Flag: two bases far apart at the ends of a long hall, six pits between them,
    // a raised middle, and two pairs of portals across the middle: a high lane, and one by the floor.
    name: 'The Long Hall',
    mode: 'ctf',
    blurb: 'Capture the Flag: a base at each end',
    size: [180, 44],
    walls: [
      [6, 1, 168, 2], [4, 3, 2, 37], [174, 3, 2, 37],
      [6, 40, 26, 3], [36, 40, 16, 3], [57, 40, 14, 3], [75, 40, 30, 3], [109, 40, 14, 3], [128, 40, 16, 3], [148, 40, 26, 3],
      [24, 35, 3, 5], [153, 35, 3, 5], [62, 34, 3, 6], [115, 34, 3, 6], [86, 31, 8, 2],
      // The portals' walls: each rift sits on a wall's face, as in the Kube.
      [44, 8, 2, 7], [134, 8, 2, 7], [57, 34, 2, 6], [121, 34, 2, 6],
    ],
    platforms: [
      [30, 34, 8, 1], [142, 34, 8, 1], [50, 33, 9, 1], [121, 33, 9, 1], [70, 34, 7, 1], [103, 34, 7, 1],
      [8, 32, 10, 1], [162, 32, 10, 1], [14, 25, 10, 1], [156, 25, 10, 1], [40, 26, 10, 1], [130, 26, 10, 1],
      [60, 22, 12, 1], [108, 22, 12, 1], [84, 18, 12, 1], [28, 17, 14, 1], [138, 17, 14, 1],
    ],
    warps: [],
    spawns: [[8, 40], [13, 40], [18, 40], [12, 32], [172, 40], [167, 40], [162, 40], [168, 32]],
    bonus: [[20, 37], [160, 37], [90, 28], [90, 15], [55, 30], [125, 30]],
    flags: [[11, 40], [169, 40]],
    portals: [[46, 9, 1, 5], [133, 9, 1, 5], [59, 35, 1, 5], [120, 35, 1, 5]],
  },
  {
    // Kubeball: a closed pitch, a goal rift high in each end wall, platforms to climb to them.
    name: 'The Pitch',
    blurb: 'Kubeball: a goal at each end',
    mode: 'kubeball',
    size: [80, 32],
    walls: [[6, 1, 68, 2], [4, 3, 2, 25], [74, 3, 2, 25], [6, 28, 68, 3]],
    platforms: [[14, 22, 8, 1], [58, 22, 8, 1], [33, 17, 14, 1], [22, 11, 8, 1], [50, 11, 8, 1], [8, 16, 6, 1], [66, 16, 6, 1]],
    warps: [],
    spawns: [[12, 28], [18, 28], [24, 28], [18, 22], [68, 28], [62, 28], [56, 28], [62, 22]],
    bonus: [[40, 14], [26, 8], [54, 8]],
    goals: [[0, 6, 6, 1, 6], [1, 73, 6, 1, 6]],
    ball: [40, 15.5], // on the top middle platform: everyone has to climb for it
  },
  {
    // Skychase: a tall open tower, three ring rifts high on each side wall, a hole in the floor.
    name: 'The Sky Tower',
    blurb: 'Skychase: rings high on each side',
    mode: 'skychase',
    size: [70, 50],
    walls: [[6, 1, 58, 2], [4, 3, 2, 44], [64, 3, 2, 44], [6, 47, 20, 3], [44, 47, 20, 3]],
    platforms: [[14, 39, 8, 1], [48, 39, 8, 1], [30, 31, 10, 1], [19, 22, 7, 1], [44, 22, 7, 1], [31, 13, 8, 1]],
    warps: [],
    spawns: [[10, 47], [16, 47], [22, 47], [18, 39], [60, 47], [54, 47], [48, 47], [52, 39]],
    bonus: [[35, 28], [22, 19], [48, 19]],
    goals: [[0, 6, 9, 1, 5], [0, 6, 19, 1, 5], [0, 6, 29, 1, 5], [1, 63, 9, 1, 5], [1, 63, 19, 1, 5], [1, 63, 29, 1, 5]],
    ball: [35, 26],
  },
];

/** The arena a mode plays (index into ARENA_INFO), or -1 when it plays any of the others. */
export const arenaOf = (mode: ArenaMode | undefined): number => (mode ? ARENAS.findIndex((a) => a?.mode === mode) : -1);
/** Arenas that belong to one mode are not offered to the others. */
export const isModeArena = (i: number): boolean => !!ARENAS[i]?.mode;
/** The Capture the Flag arena. */
export const CTF_ARENA = arenaOf('ctf');

export const ARENA_INFO = [
  { name: 'The Kube', blurb: 'The original arena' },
  ...ARENAS.slice(1).map((a) => ({ name: a!.name, blurb: a!.blurb })),
];

/** A map like the TMX one, for an arena: same tiles, generated layers and objects. */
export function buildArenaMap(def: ArenaDef, base: TmxMap): TmxMap {
  const [W, H] = def.size ?? KUBE_SIZE;
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
        put('blocks', `${ceiling ? 'top' : 'ground'}-0${n}.png`, cx, y);
      });
      for (let cx = x; cx + 8 <= x + w + 1; cx += 8) {
        if (ceiling) put('fades', 'top-fade.png', cx, y - 2);
        else if (h >= 3) put('fades', 'bottom-fade.png', cx, y + 2);
      }
    } else {
      for (const cy of along(y, h, 2)) {
        for (const cx of along(x, w, 2)) put('blocks', `side${pick(3, 4) === 3 ? '03' : '4'}.png`, cx, cy);
        // Fades on the outer side of the frame.
        if (x <= 6) put('fades', `left-fade-0${pick(1, 2)}.png`, x - 2, cy);
        else if (x + w >= W - 6) put('fades', `right-fade-0${pick(1, 2)}.png`, x + w, cy);
      }
    }
  }
  for (const [x, y, w] of def.platforms) {
    for (let cx = x; cx <= x + w - 2; cx++) {
      const n = cx === x ? 1 : cx === x + w - 2 ? 4 : pick(2, 3);
      put('platforms', `platform-0${n}.png`, cx, y);
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
    ...(def.flags ?? []).map(([x, y]) => obj('FLAG_STAND', x - 0.5, y - 1, 1, 1)),
    ...(def.portals ?? []).map(([x, y, w, h]) => obj('PORTAL', x, y, w, h)),
    ...(def.goals ?? []).map(([team, x, y, w, h]) => obj(`GOAL_${team}`, x, y, w, h)),
    ...(def.ball ? [obj('BALL_SPOT', def.ball[0] - 0.5, def.ball[1] - 0.5, 1, 1)] : []),
  ];
  const tileLayers: TileLayer[] = (['fades', 'blocks', 'platforms'] as const).map((name) => ({ name, visible: true, gids: layers[name] }));
  return { width: W, height: H, tileWidth: U, tileHeight: U, tileImages: base.tileImages, layers: tileLayers, objects };
}
