import { describe, expect, it } from 'vitest';
import { ARENAS, ARENA_IDS, ARENA_INFO, arenaFromTmx, loadArenas, npcRecharges, warpExit, type ArenaData } from './Arenas';
import { arenaBakeScale, MAX_BAKE_AREA, MAX_BAKE_SIDE } from './ArenaArt';
import type { TmxMap } from './TmxMap';

describe('npcRecharges', () => {
  it('is infinite (below 0) by default', () => {
    expect(npcRecharges({ x: 0, y: 0, behaviour: 'attack' })).toBeLessThan(0);
  });
  it('reads the recharges set, and one for older files that said respawn: false', () => {
    expect(npcRecharges({ x: 0, y: 0, behaviour: 'idle', recharges: 3 })).toBe(3);
    expect(npcRecharges({ x: 0, y: 0, behaviour: 'idle', respawn: false })).toBe(1);
  });
});

describe('warpExit', () => {
  it('is the exit point when the portal has one', () => {
    expect(warpExit([1, 2, 1, 5, 20, 8])).toEqual([20, 8]);
    expect(warpExit([1, 2, 1, 5])).toBeNull();
  });
});

describe('arenaFromTmx', () => {
  const U = 64;
  const map: TmxMap = {
    width: 40, height: 30, tileWidth: U, tileHeight: U, tileImages: new Map(), layers: [],
    objects: [
      { id: 1, type: 'WALL', x: 2 * U, y: 20 * U, width: 30 * U, height: 2 * U },
      { id: 2, type: 'STATIC_PLATFORM', x: 10 * U, y: 15 * U, width: 6 * U, height: U },
      { id: 3, type: 'WARP_ZONE', x: 0, y: 10 * U, width: U, height: 5 * U },
      { id: 4, type: 'PLAYER_SPAWN', x: 5 * U, y: 19 * U, width: U, height: U },
      { id: 5, type: 'BONUS_SPAWN', x: 20 * U, y: 12 * U, width: U, height: U },
    ],
  };
  it('turns the Tiled objects into walls, platforms, portals, spawns and bonus spots in tiles', () => {
    const a = arenaFromTmx(map, 'Imported');
    expect(a.name).toBe('Imported');
    expect(a.size).toEqual([40, 30]);
    expect(a.walls).toEqual([[2, 20, 30, 2]]);
    expect(a.platforms).toEqual([[10, 15, 6, 1]]);
    expect(a.warps).toEqual([[0, 10, 1, 5]]);
    // Spawns by their feet (bottom middle), bonus spots by their centre.
    expect(a.spawns).toEqual([[5.5, 20]]);
    expect(a.bonus).toEqual([[20.5, 12.5]]);
  });
});

describe('loadArenas', () => {
  it("orders the arenas, keeps their ids, and reads an older file's blurb as its description", () => {
    const before = Object.fromEntries(ARENA_IDS.slice(1).map((id, i) => [id, { ...(ARENAS[i + 1] as object), order: i + 1 }]));
    const arena = (name: string, order: number, extra: object = {}) => ({ name, order, walls: [], platforms: [], warps: [], spawns: [], bonus: [], ...extra }) as unknown as ArenaData;
    loadArenas({ b: arena('B', 2, { description: 'second' }), a: arena('A', 1, { blurb: 'first' }) });
    expect(ARENA_IDS).toEqual([null, 'a', 'b']);
    expect(ARENA_INFO.map((i) => i.description)).toEqual(['The original arena', 'first', 'second']);
    loadArenas(before as Record<string, ArenaData>);
  });
});

describe('arenaBakeScale', () => {
  it('keeps the usual arenas at full size', () => {
    expect(arenaBakeScale(52 * 64, 38 * 64)).toBe(1);
    expect(arenaBakeScale(52 * 64, 38 * 64, 0.3)).toBe(0.3);
  });
  it('shrinks big maps under the size and area limits', () => {
    const w = 200 * 64, h = 160 * 64;
    const s = arenaBakeScale(w, h);
    expect(s).toBeLessThan(1);
    expect(Math.max(w, h) * s).toBeLessThanOrEqual(MAX_BAKE_SIDE + 1e-6);
    expect(w * s * h * s).toBeLessThanOrEqual(MAX_BAKE_AREA * (1 + 1e-9));
  });
});
