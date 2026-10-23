import type { MapObject, TileLayer, TmxMap } from './TmxMap';
import { DATA_FILES, fromFiles } from '../game/DataFiles';

/**
 * More arenas, built from the original map's tiles. Each one is a list of
 * blocks in map units (1 unit = one 64 px cell; the tiles are 2 x 2 units);
 * the tile art is laid on them the way the original map does it: ground or
 * ceiling strips on slabs, side pieces down walls, platform pieces with their
 * end caps on platforms, and fades on the outer side of the frame.
 */

export type Rect = [x: number, y: number, w: number, h: number];

/**
 * A portal: its rectangle, and where it leads (the exit point, units: where a
 * Kubot's middle comes out, keeping its speed). Without an exit, two portals
 * lead to each other (the left one out in front of the right one and back).
 */
export type Warp = [x: number, y: number, w: number, h: number, exitX?: number, exitY?: number];

/** Where a portal leads (units), or null when it has no exit of its own. */
export const warpExit = (w: Warp): [number, number] | null => (w.length >= 6 ? [w[4]!, w[5]!] : null);

/** A tile painted over the automatic ones: layer, cell (tiles sit on their cell's bottom edge) and image; '' erases. */
export type TilePaint = [layer: 'fades' | 'blocks' | 'platforms', x: number, y: number, source: string];

/** How a block is tiled: as the game sees fit (auto), as a floor strip, a ceiling strip, side pieces, or not at all (invisible). */
export type BlockLook = 'auto' | 'floor' | 'ceiling' | 'side' | 'none';
/** A wall or platform (units), and its look (default auto). */
export type Block = [x: number, y: number, w: number, h: number, look?: BlockLook];

export interface ArenaDef {
  name: string;
  /** A line about it, under its name on the setup screen. */
  description: string;
  /** Map size in units (default 52 x 38). */
  size?: [w: number, h: number];
  /** The room behind it (fx/Backdrops.ts ROOMS); default by the arena's place in the list. */
  room?: string;
  walls: Block[];
  /** Drop-through platforms. */
  platforms: Block[];
  /** Portals (see Warp): each leads to its exit point, or two without exits lead to each other. */
  warps: Warp[];
  /** Feet positions. */
  spawns: [x: number, y: number][];
  /** Centres. */
  bonus: [x: number, y: number][];
  /** How far past the map's edges a Kubot can go before it is out (units): left, top, right, bottom. */
  blast?: [l: number, t: number, r: number, b: number];
  /** Tiles painted over the automatic ones. */
  tiles?: TilePaint[];
  /** Particle effects placed in the map, playing over and over. */
  emitters?: MapEmitter[];
  /** Hostile CPUs that belong to the map (the black team): no HUD card, back at their spot after a K.O., never counted to win. */
  npcs?: MapNpc[];
  /** Lights placed in the map, for ambience: they light the tiles and the Kubotz near them. */
  lights?: MapLight[];
  /** The match's music (audio/Sounds.ts MUSIC); default the game's theme. */
  music?: string;
}

export type LightEffect = 'steady' | 'pulse' | 'flicker';
/**
 * A light in the map (units): its colour ('#rrggbb'), how far it reaches
 * (radius, units), how strong it is, and whether it stays steady, pulses
 * slowly or flickers like a failing tube. Round (all around), or a cone:
 * pointing at `angle` (degrees, 0 right, 90 down), `spread` degrees wide.
 * Its glow is drawn on `layer` (default behind the arena), cut off by blocks with `shadows`.
 */
export interface MapLight {
  x: number; y: number; color: string; radius: number; intensity: number; effect?: LightEffect;
  shape?: 'round' | 'cone'; angle?: number; spread?: number; layer?: MapLayer;
  /** Its glow stops at walls and platforms (the light on the tiles and Kubotz does not: Light2D has no shadows). */
  shadows?: boolean;
}
/** A cone light's direction and width when the file leaves them out: pointing down, 60 degrees wide. */
export const CONE_ANGLE = 90;
export const CONE_SPREAD = 60;
/** At most this many map lights are lit (main.ts maxLights covers them). */
export const MAX_MAP_LIGHTS = 12;

/**
 * A particle effect of src/data/particles placed in the map (units): played
 * again `every` ms after it ends (0: at once) or only `once`, mirrored or
 * not, `scale` times its size, in one `tint` colour ('#rrggbb') or its own.
 */
export interface MapEmitter { x: number; y: number; effect: string; every?: number; once?: boolean; flip?: boolean; scale?: number; tint?: string; layer?: MapLayer }

/**
 * Where a light's glow or a particle effect is drawn: behind the arena's
 * blocks (seen through the gaps), over the blocks but behind the Kubotz, or
 * in front of everything.
 */
export type MapLayer = 'behind' | 'arena' | 'front';
// Behind: under the tiles' art (2) but over the outer hull (1.9) and the blocks' 2.5D faces (1.95), which are
// nearly as dark as the room and would otherwise cut the glow with edges you cannot see.
export const LAYER_DEPTH: Record<MapLayer, number> = { behind: 1.97, arena: 3, front: 14 };

export type NpcBehaviour = 'attack' | 'flee' | 'idle';
/**
 * An NPC: where its feet are (units), what it does (attack the nearest
 * Kubot, keep away from Kubotz, stand still), how good it is (CPU level 1
 * to 9, default 5), its recharges (below 0, the default: infinite), how long
 * after a K.O. it comes back (ms, default the game's) and its helmet (HEADS
 * index). `respawn: false` (older files) means one recharge.
 */
export interface MapNpc { x: number; y: number; behaviour: NpcBehaviour; level?: number; recharges?: number; respawnMs?: number; respawn?: boolean; helmet?: number }

/** An NPC's recharges: below 0 is infinite. */
export const npcRecharges = (n: MapNpc): number => n.recharges ?? (n.respawn === false ? 1 : -1);

/** The NPCs' team and colour: one team for every map NPC, hostile to the players. */
export const NPC_TEAM = 99;
export const NPC_COLOR = 0x2a2d33;

export const DEFAULT_SIZE: [number, number] = [52, 38];
export const DEFAULT_BLAST: [number, number, number, number] = [6, 20, 6, 6];

/** An arena as src/data/arenas/<id>.json stores it: `order` places it in the list (the original map is 0). */
export type ArenaData = ArenaDef & { order: number };

/** File name (without .json) of each arena, by index; the editor saves under it. */
export const ARENA_IDS: (string | null)[] = [null];

export const ARENAS: (ArenaDef | null)[] = [null]; // 0: the original map (debug-map.tmx)

/** Names and descriptions for the arena select (index 0 is the original Kube). */
export const ARENA_INFO: { name: string; description: string }[] = [];

/** Loads (or reloads) the arenas, in their order. */
export function loadArenas(byId: Record<string, ArenaData>): void {
  const list = Object.entries(byId).sort(([, x], [, y]) => x.order - y.order);
  ARENAS.length = 1;
  ARENA_IDS.length = 1;
  // (Edits kept in a browser before the field was renamed still say `blurb`.)
  for (const [id, { order: _order, ...def }] of list) { ARENAS.push({ ...def, description: def.description ?? (def as { blurb?: string }).blurb ?? '' }); ARENA_IDS.push(id); }
  ARENA_INFO.length = 0;
  ARENA_INFO.push({ name: 'The Kube', description: 'The original arena' }, ...ARENAS.slice(1).map((a) => ({ name: a!.name, description: a!.description })));
}
loadArenas(fromFiles(DATA_FILES).arenas);

/** A map like the TMX one, for an arena: same tiles, generated layers and objects. */
export function buildArenaMap(def: ArenaDef, base: TmxMap): TmxMap {
  const [W, H] = def.size ?? DEFAULT_SIZE;
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

  /** A floor or ceiling strip along a block's top, its end caps at both ends. */
  const strip = (kind: 'ground' | 'top', x: number, y: number, w: number) => {
    const xs = along(x, w, 2);
    xs.forEach((cx, i) => put('blocks', `${kind}-0${i === 0 ? 1 : i === xs.length - 1 ? 4 : pick(2, 3)}.png`, cx, y));
  };
  /** Side pieces filling a block. */
  const sides = (x: number, y: number, w: number, h: number) => {
    for (const cy of along(y, h, 2)) for (const cx of along(x, w, 2)) put('blocks', `side${pick(3, 4) === 3 ? '03' : '4'}.png`, cx, cy);
  };
  for (const [x, y, w, h, look = 'auto'] of def.walls) {
    if (look === 'none') continue;
    if (look === 'floor' || look === 'ceiling') { strip(look === 'floor' ? 'ground' : 'top', x, y, w); continue; }
    if (look === 'side') { sides(x, y, w, h); continue; }
    // Auto: the way the original map does it, with fades on the outer side of the frame.
    if (w >= h) {
      const ceiling = y <= 3;
      strip(ceiling ? 'top' : 'ground', x, y, w);
      for (let cx = x; cx + 8 <= x + w + 1; cx += 8) {
        if (ceiling) put('fades', 'top-fade.png', cx, y - 2);
        else if (h >= 3) put('fades', 'bottom-fade.png', cx, y + 2);
      }
    } else {
      sides(x, y, w, h);
      for (const cy of along(y, h, 2)) {
        if (x <= 6) put('fades', `left-fade-0${pick(1, 2)}.png`, x - 2, cy);
        else if (x + w >= W - 6) put('fades', `right-fade-0${pick(1, 2)}.png`, x + w, cy);
      }
    }
  }
  for (const [x, y, w, h, look = 'auto'] of def.platforms) {
    if (look === 'none') continue;
    if (look === 'floor' || look === 'ceiling') { strip(look === 'floor' ? 'ground' : 'top', x, y, w); continue; }
    if (look === 'side') { sides(x, y, w, h); continue; }
    for (let cx = x; cx <= x + w - 2; cx++) {
      const n = cx === x ? 1 : cx === x + w - 2 ? 4 : pick(2, 3);
      put('platforms', `platform-0${n}.png`, cx, y);
    }
  }

  // Then the tiles painted by hand (the editor's tile brush).
  for (const [layer, x, y, source] of def.tiles ?? []) {
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    layers[layer][y * W + x] = source ? gidOf.get(source) ?? 0 : 0;
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

/**
 * An arena from a Tiled map made like the original (debug-map.tmx): its
 * WALL, STATIC_PLATFORM and WARP_ZONE objects become walls, platforms and
 * portals, PLAYER_SPAWN and BONUS_SPAWN the spawns (feet) and bonus spots
 * (centres), in tiles. Its tile layers are not kept: the arena is tiled
 * automatically, then by the editor's brush.
 */
export function arenaFromTmx(m: TmxMap, name: string): ArenaDef {
  const U = m.tileWidth;
  const half = (v: number) => Math.round((v / U) * 2) / 2;
  const rect = (o: MapObject): [number, number, number, number] => [half(o.x), half(o.y), Math.max(0.5, half(o.width)), Math.max(0.5, half(o.height))];
  const of = (type: string) => m.objects.filter((o) => o.type === type);
  return {
    name, description: 'Imported from a Tiled map', size: [m.width, m.height],
    walls: of('WALL').map(rect),
    platforms: of('STATIC_PLATFORM').map(rect),
    warps: of('WARP_ZONE').map(rect),
    spawns: of('PLAYER_SPAWN').map((o) => [half(o.x + o.width / 2), half(o.y + o.height)]),
    bonus: of('BONUS_SPAWN').map((o) => [half(o.x + o.width / 2), half(o.y + o.height / 2)]),
  };
}
