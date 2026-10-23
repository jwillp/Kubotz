import type { ClipData } from '../anim/Clips';
import type { MoveData, MovesData } from './Kubotz';
import type { EffectData } from '../fx/ParticleEffect';
import type { ArenaData } from '../map/Arenas';
import type { SoundDef } from '../audio/SoundDef';

/**
 * The game data as files under src/data, one per clip and one per move:
 *   clips/<clip>.json
 *   moves/<table>/<move>.json   (combo and blade-combo moves are numbered 1, 2, 3)
 *   moves/point-sets.json, moves/hurtbox.json
 *   particles/<effect>.json
 *   arenas/<arena>.json
 *   sounds/<sound>.json
 * The editor writes the same layout back (fileTexts).
 */

const TABLES = { combo: 'combo', bladeCombo: 'blade-combo', dir: 'dir', kickDir: 'kick-dir', bladeDir: 'blade-dir', specials: 'specials', throws: 'throws' } as const;
type Table = keyof typeof TABLES;
const LISTS: Table[] = ['combo', 'bladeCombo'];

/** Clips and moves from files keyed by their path under src/data. */
export interface GameData { clips: Record<string, ClipData>; moves: MovesData; particles: Record<string, EffectData>; arenas: Record<string, ArenaData>; sounds: Record<string, SoundDef> }

/** Clips, moves and particle effects from files keyed by their path under src/data. */
export function fromFiles(files: Record<string, unknown>): GameData {
  const clips: Record<string, ClipData> = {};
  const particles: Record<string, EffectData> = {};
  const arenas: Record<string, ArenaData> = {};
  const sounds: Record<string, SoundDef> = {};
  const moves = { pointSets: {}, combo: [], bladeCombo: [], dir: {}, kickDir: {}, bladeDir: {}, specials: {}, throws: {}, hurtbox: { width: 1, height: 2.8 } } as unknown as MovesData;
  const byTable = moves as unknown as Record<Table, Record<string, MoveData> | MoveData[]>;
  for (const [path, data] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
    const m = /^(clips|moves|particles|arenas|sounds)\/(?:([a-z-]+)\/)?([^/]+)\.json$/.exec(path);
    if (!m) continue;
    const [, kind, dir, name] = m;
    if (kind === 'clips') { clips[name] = data as ClipData; continue; }
    if (kind === 'particles') { particles[name] = data as EffectData; continue; }
    if (kind === 'arenas') { arenas[name] = data as ArenaData; continue; }
    if (kind === 'sounds') { sounds[name] = data as SoundDef; continue; }
    if (!dir) {
      if (name === 'point-sets') moves.pointSets = data as MovesData['pointSets'];
      else if (name === 'hurtbox') moves.hurtbox = data as MovesData['hurtbox'];
      continue;
    }
    const table = (Object.keys(TABLES) as Table[]).find((t) => TABLES[t] === dir);
    if (!table) continue;
    if (LISTS.includes(table)) (byTable[table] as MoveData[])[Number(name) - 1] = data as MoveData;
    else (byTable[table] as Record<string, MoveData>)[name] = data as MoveData;
  }
  return { clips, moves, particles, arenas, sounds };
}

/** One line per key or point, so diffs show what changed. */
function clipText(c: ClipData): string {
  const { keys, ...head } = c;
  return `{\n${Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`).join('')}  "keys": [\n${keys.map((k) => `    ${JSON.stringify(k)}`).join(',\n')}\n  ]\n}\n`;
}
/** An effect: one line per emitter setting. */
const effectText = (e: EffectData) => `{\n  "emitters": [\n${e.emitters.map((em) => `    {\n${Object.entries(em).map(([k, v]) => `      ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n    }`).join(',\n')}\n  ]\n}\n`;
/** A sound: one line per layer. */
const soundText = ({ layers, ...head }: SoundDef) => `{\n${Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`).join('')}  "layers": [\n${layers.map((l) => `    ${JSON.stringify(l)}`).join(',\n')}\n  ]\n}\n`;
const objText = (o: object) => `{\n${Object.entries(o).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}\n`;

/** Every data file's text, keyed by its path under src/data. */
export function fileTexts({ clips, moves, particles, arenas, sounds }: GameData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, a] of Object.entries(arenas)) out[`arenas/${id}.json`] = objText(a);
  for (const [name, e] of Object.entries(particles)) out[`particles/${name}.json`] = effectText(e);
  for (const [name, d] of Object.entries(sounds ?? {})) out[`sounds/${name}.json`] = soundText(d);
  for (const [name, c] of Object.entries(clips)) out[`clips/${name}.json`] = clipText(c);
  out['moves/point-sets.json'] = objText(moves.pointSets);
  out['moves/hurtbox.json'] = objText(moves.hurtbox);
  for (const t of Object.keys(TABLES) as Table[]) {
    const table = moves[t] as unknown as Record<string, object> | object[];
    for (const [k, m] of Object.entries(table)) out[`moves/${TABLES[t]}/${LISTS.includes(t) ? Number(k) + 1 : k}.json`] = objText(m);
  }
  return out;
}

/** The files in src/data, bundled with the game. */
export const DATA_FILES: Record<string, unknown> = Object.fromEntries(
  Object.entries(import.meta.glob(['../data/clips/*.json', '../data/moves/**/*.json', '../data/particles/*.json', '../data/arenas/*.json', '../data/sounds/*.json'], { eager: true, import: 'default' }))
    .map(([path, v]) => [path.replace('../data/', ''), v]),
);
