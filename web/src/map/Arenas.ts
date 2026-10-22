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

/** A tile painted over the automatic ones: layer, cell (tiles sit on their cell's bottom edge) and image; '' erases. */
export type TilePaint = [layer: 'fades' | 'blocks' | 'platforms', x: number, y: number, source: string];

export interface ArenaDef {
  name: string;
  blurb: string;
  /** Map size in units (default 52 x 38). */
  size?: [w: number, h: number];
  /** The room behind it (fx/Backdrops.ts ROOMS); default by the arena's place in the list. */
  room?: string;
  walls: Rect[];
  /** Drop-through platforms. */
  platforms: Rect[];
  /** Portals: none, or two that lead to each other (the left one's robots come out of the right one). */
  warps: Rect[];
  /** Feet positions. */
  spawns: [x: number, y: number][];
  /** Centres. */
  bonus: [x: number, y: number][];
  /** How far past the map's edges a robot can go before it is out (units): left, top, right, bottom. */
  blast?: [l: number, t: number, r: number, b: number];
  /** Tiles painted over the automatic ones. */
  tiles?: TilePaint[];
  /** Particle effects placed in the map, playing over and over. */
  emitters?: MapEmitter[];
  /** Hostile CPUs that belong to the map (the black team): no HUD card, back at their spot after a K.O., never counted to win. */
  npcs?: MapNpc[];
}

/** A particle effect of src/data/particles placed in the map (units): played again `every` ms after it ends (0: at once), mirrored or not. */
export interface MapEmitter { x: number; y: number; effect: string; every?: number; flip?: boolean }

export type NpcBehaviour = 'attack' | 'flee' | 'idle';
/** An NPC: where its feet are (units), what it does (attack the nearest robot, keep away from robots, stand still) and its helmet (HEADS index). */
export interface MapNpc { x: number; y: number; behaviour: NpcBehaviour; helmet?: number }

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

/** Names and blurbs for the arena select (index 0 is the original Kube). */
export const ARENA_INFO: { name: string; blurb: string }[] = [];

/** Loads (or reloads) the arenas, in their order. */
export function loadArenas(byId: Record<string, ArenaData>): void {
  const list = Object.entries(byId).sort(([, x], [, y]) => x.order - y.order);
  ARENAS.length = 1;
  ARENA_IDS.length = 1;
  for (const [id, { order: _order, ...def }] of list) { ARENAS.push(def); ARENA_IDS.push(id); }
  ARENA_INFO.length = 0;
  ARENA_INFO.push({ name: 'The Kube', blurb: 'The original arena' }, ...ARENAS.slice(1).map((a) => ({ name: a!.name, blurb: a!.blurb })));
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
