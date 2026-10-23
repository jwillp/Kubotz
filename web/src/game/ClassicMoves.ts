import { fromFiles } from './DataFiles';
import type { DirMoves, Move, MoveData, ThrowKind } from './Kubotz';

/**
 * TEMPORARY (debug comparison): the classic move tables, as on dev before the
 * Smash moves (a copy of dev's src/data/moves in src/classic/moves), for the
 * move list's Classic / SSB toggle. Remove once the moves are settled.
 */
const FILES = Object.fromEntries(Object.entries(import.meta.glob('../classic/moves/**/*.json', { eager: true, import: 'default' }))
  .map(([path, v]) => [path.replace('../classic/', ''), v]));
const data = fromFiles(FILES).moves;
const resolve = (m: MoveData): Move => ({ ...m, points: data.pointSets[m.points] ?? [] });
const table = <K extends string>(t: Record<K, MoveData>) => Object.fromEntries(Object.entries(t).map(([k, m]) => [k, resolve(m as MoveData)])) as Record<K, Move>;

export const CLASSIC_COMBO: Move[] = data.combo.map(resolve);
export const CLASSIC_BLADE_COMBO: Move[] = data.bladeCombo.map(resolve);
export const CLASSIC_DIR_MOVES: DirMoves = table(data.dir);
export const CLASSIC_BLADE_DIR_MOVES: DirMoves = table(data.bladeDir);
export const CLASSIC_SPECIALS = table(data.specials);
export const CLASSIC_THROWS: typeof data.throws = data.throws as Record<ThrowKind, (typeof data.throws)[ThrowKind]>;
