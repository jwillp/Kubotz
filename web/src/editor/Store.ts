import { CLIPS, loadClips, type Clip, type ClipData, type Key } from '../anim/Clips';
import { loadMoves, type MoveData } from '../game/Kubotz';
import { DATA_FILES, fileTexts, fromFiles, type GameData } from '../game/DataFiles';
import { KEPT_KEY, keptDocs } from '../game/EditedData';
import { loadArenas, type ArenaData } from '../map/Arenas';
import { EDITED_KEY } from '../game/EditedData';
import { SOUND_FILES, loadSounds } from '../audio/Synth';

/**
 * The editor's documents (the clips and the moves, as their data files hold
 * them), the selection, undo and saving. Every change goes through edit(),
 * which also pushes it into the game's live tables so the stage draws it.
 */

export const FPS = 60;
export const FRAME_MS = 1000 / FPS;

/** A move: which table it is in and its key there (its file is src/data/moves/<table>/<key>.json). */
export interface MoveRef { table: 'combo' | 'bladeCombo' | 'dir' | 'kickDir' | 'bladeDir' | 'specials'; key: string }

export interface ListEntry { group: string; label: string; ref: MoveRef | null; anim: string }

const m = (group: string, label: string, table: MoveRef['table'], key: string): ListEntry => ({ group, label, ref: { table, key }, anim: '' });
const c = (group: string, label: string, anim: string): ListEntry => ({ group, label, ref: null, anim });
/** The game's move list (game/MoveList.ts) as the editor shows it: its groups, names and order. */
const LIST: ListEntry[] = [
  m('Fists (A)', 'Jab 1', 'combo', '0'), m('Fists (A)', 'Jab 2', 'combo', '1'), m('Fists (A)', 'Jab finisher', 'combo', '2'),
  m('Fists (A)', 'Forward tilt', 'dir', 'ftilt'), m('Fists (A)', 'Down tilt', 'dir', 'dtilt'), m('Fists (A)', 'Up tilt', 'dir', 'utilt'), m('Fists (A)', 'Dash attack', 'dir', 'dash'),
  m('Fists (A)', 'Forward smash', 'dir', 'fsmash'), m('Fists (A)', 'Up smash', 'dir', 'usmash'), m('Fists (A)', 'Down smash', 'dir', 'dsmash'),
  m('Fists (A)', 'Neutral air', 'dir', 'nair'), m('Fists (A)', 'Forward air', 'dir', 'fair'), m('Fists (A)', 'Back air', 'dir', 'bair'), m('Fists (A)', 'Up air', 'dir', 'uair'), m('Fists (A)', 'Down air', 'dir', 'dair'),
  m('Legs (X)', 'Forward tilt', 'kickDir', 'ftilt'), m('Legs (X)', 'Down tilt', 'kickDir', 'dtilt'), m('Legs (X)', 'Up tilt', 'kickDir', 'utilt'), m('Legs (X)', 'Dash attack', 'kickDir', 'dash'),
  m('Legs (X)', 'Forward smash', 'kickDir', 'fsmash'), m('Legs (X)', 'Up smash', 'kickDir', 'usmash'), m('Legs (X)', 'Down smash', 'kickDir', 'dsmash'),
  m('Legs (X)', 'Neutral air', 'kickDir', 'nair'), m('Legs (X)', 'Forward air', 'kickDir', 'fair'), m('Legs (X)', 'Back air', 'kickDir', 'bair'), m('Legs (X)', 'Up air', 'kickDir', 'uair'), m('Legs (X)', 'Down air', 'kickDir', 'dair'),
  m('Specials (A + X)', 'Ion Punch', 'specials', 'ion'), m('Specials (A + X)', 'Raptor Dash', 'specials', 'raptor'), m('Specials (A + X)', 'Raptor Dash (air)', 'specials', 'raptorAir'),
  m('Specials (A + X)', 'Shadow Dive', 'specials', 'dive'), m('Specials (A + X)', 'Plasma Kick', 'specials', 'kick'), m('Specials (A + X)', 'Plasma Kick (air)', 'specials', 'kickAir'),
  m('Plasma blade', 'Blade jab', 'bladeCombo', '0'), m('Plasma blade', 'Blade jab 2', 'bladeCombo', '1'), m('Plasma blade', 'Blade jab 3', 'bladeCombo', '2'),
  m('Plasma blade', 'Blade forward tilt', 'bladeDir', 'ftilt'), m('Plasma blade', 'Blade down tilt', 'bladeDir', 'dtilt'), m('Plasma blade', 'Blade up tilt', 'bladeDir', 'utilt'), m('Plasma blade', 'Blade dash attack', 'bladeDir', 'dash'),
  m('Plasma blade', 'Blade forward smash', 'bladeDir', 'fsmash'), m('Plasma blade', 'Blade up smash', 'bladeDir', 'usmash'), m('Plasma blade', 'Blade down smash', 'bladeDir', 'dsmash'),
  m('Plasma blade', 'Blade neutral air', 'bladeDir', 'nair'), m('Plasma blade', 'Blade forward air', 'bladeDir', 'fair'), m('Plasma blade', 'Blade back air', 'bladeDir', 'bair'),
  m('Plasma blade', 'Blade up air', 'bladeDir', 'uair'), m('Plasma blade', 'Blade down air', 'bladeDir', 'dair'),
  c('Laser gun', 'Shot', 'shoot'),
  c('Grab and throws', 'Grab', 'grab'), c('Grab and throws', 'Holding', 'grabHold'), c('Grab and throws', 'Pummel', 'pummel'),
  c('Grab and throws', 'Forward throw', 'throwF'), c('Grab and throws', 'Back throw', 'throwB'), c('Grab and throws', 'Up throw', 'throwU'), c('Grab and throws', 'Down throw', 'throwD'),
  c('Grab and throws', 'Being held', 'held'),
  c('Defence and ledges', 'Guard', 'guard'), c('Defence and ledges', 'Air dodge', 'dodge'), c('Defence and ledges', 'Roll forward', 'roll'), c('Defence and ledges', 'Roll back', 'rollBack'),
  c('Defence and ledges', 'Ledge hang', 'ledge'), c('Defence and ledges', 'Ledge climb', 'climb'), c('Defence and ledges', 'Ledge roll', 'ledgeRoll'), c('Defence and ledges', 'Taunt', 'taunt'),
  c('Movement', 'Idle', 'idle'), c('Movement', 'Run', 'run'), c('Movement', 'Turn round', 'turn'), c('Movement', 'Crouch', 'crouch'),
  c('Movement', 'Jump', 'jump'), c('Movement', 'Air jump flip', 'flip'), c('Movement', 'Fall', 'fall'), c('Movement', 'Land', 'land'),
  c('Getting hit', 'Hit', 'hit'), c('Getting hit', 'Hit (other side)', 'hit2'), c('Getting hit', 'Tumble', 'tumble'), c('Getting hit', 'Knocked down', 'knockdown'),
  c('Match', 'Victory dance', 'victory'),
];

export interface Selection {
  clip: string;
  /** The move being tuned (its clip is `clip`), if any. */
  move: MoveRef | null;
  /** Time through the clip, 0..1. */
  t: number;
  /** The bone picked on the stage. */
  bone: string | null;
  /** The effect open in the Particles tab. */
  effect: string;
  /** The arena open in the Arena tab (its file name), and the piece picked on it. */
  arena: string;
  piece: ArenaPiece | null;
  /** The sound open in the Sound tab, and its layer being edited. */
  sound: string;
  layer: number;
}

/** A piece of an arena: a wall, platform or portal (a rectangle), or a spawn or bonus spot (a point), by its index. */
export interface ArenaPiece { kind: 'walls' | 'platforms' | 'warps' | PointKind; index: number }
/** Pieces that are a point: spawns and bonus spots ([x, y]), particle emitters and NPCs ({ x, y, ... }). */
export type PointKind = 'spawns' | 'bonus' | 'emitters' | 'npcs' | 'lights';
export const POINT_KINDS: PointKind[] = ['spawns', 'bonus', 'emitters', 'npcs', 'lights'];

/** Where a point piece is (units). */
export function pointOf(a: ArenaData, kind: PointKind, i: number): [number, number] | null {
  const v = (a[kind] as unknown[] | undefined)?.[i];
  if (!v) return null;
  return Array.isArray(v) ? [v[0] as number, v[1] as number] : [(v as { x: number }).x, (v as { y: number }).y];
}

/** Names of the arena's pieces, for headings. */
export const PIECE_NAMES: Record<ArenaPiece['kind'], string> = { walls: 'Wall', platforms: 'Platform', warps: 'Portal', spawns: 'Spawn', bonus: 'Bonus spot', emitters: 'Particles', npcs: 'NPC', lights: 'Light' };

/** A piece's list in an arena (the optional ones may be missing). */
export function piecesOf(a: ArenaData, kind: ArenaPiece['kind']): unknown[] {
  return (a[kind] as unknown[] | undefined) ?? [];
}

/** Moves a point piece. */
export function setPoint(a: ArenaData, kind: PointKind, i: number, x: number, y: number): void {
  const list = a[kind] as unknown[] | undefined;
  const v = list?.[i];
  if (!list || !v) return;
  if (Array.isArray(v)) list[i] = [x, y];
  else Object.assign(v as object, { x, y });
}

type Docs = GameData;
type Kind = 'clips' | 'moves' | 'particles' | 'arenas' | 'sounds';
type Listener = () => void;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
/** Edits saved before the Sound tab have no sounds: the build's. */
const withSounds = (d: Docs): Docs => ({ ...d, sounds: d.sounds ?? clone(SOUND_FILES) });

export class Store {
  /** The data files as last exported (or as the build has them), to write only the ones that changed. */
  private saved = fileTexts(fromFiles(DATA_FILES));
  /** What is being edited: the build's data, or the edits saved in this browser (keptDocs). */
  docs: Docs = withSounds(clone(keptDocs() ?? fromFiles(DATA_FILES)));
  /** Edits not saved in this browser yet (Save). */
  unsaved = false;
  sel: Selection = { clip: 'idle', move: null, t: 0, bone: null, effect: 'hitStars', arena: 'the-foundry', piece: null, sound: 'boom', layer: 0 };
  /** Files changed since the last export (the edits saved in this browser count). */
  dirty = new Set<Kind>(keptDocs() ? ['clips', 'moves', 'particles', 'arenas', 'sounds'] : []);
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private listeners: Listener[] = [];
  /** An edit that is still being dragged: one undo step for the whole drag. */
  private dragging = false;

  on(fn: Listener): void { this.listeners.push(fn); }
  emit(): void { for (const fn of this.listeners) fn(); }

  get clip(): Clip { return CLIPS[this.sel.clip]; }
  get clipData(): ClipData { return this.docs.clips[this.sel.clip]; }

  move(ref = this.sel.move): MoveData | null {
    if (!ref) return null;
    const table = this.docs.moves[ref.table] as unknown as Record<string, MoveData>;
    return table[ref.key] ?? null;
  }

  /** Every move, named and grouped like the game's move list (game/MoveList.ts). */
  moveList(): ListEntry[] {
    return LIST.filter((e): e is ListEntry & { ref: MoveRef } => !!e.ref && !!this.move(e.ref))
      .map((e) => ({ ...e, anim: this.move(e.ref)!.anim }));
  }

  /**
   * The whole list: the moves, then the clips no move plays, in the game's
   * move-list groups where they belong (throws, ledges, guard...).
   */
  fullList(): ListEntry[] {
    const moves = this.moveList();
    const used = new Set(moves.map((e) => e.anim));
    const clips = LIST.filter((e) => !e.ref && this.docs.clips[e.anim] && !used.has(e.anim));
    const listed = new Set([...used, ...clips.map((e) => e.anim)]);
    const rest = Object.keys(this.docs.clips).filter((n) => !listed.has(n)).map((n) => ({ group: 'Other clips', label: n, ref: null, anim: n }));
    // Clip entries join their move-list group; groups keep the game's order.
    const order = [...new Set(LIST.map((e) => e.group)), 'Other clips'];
    return [...moves, ...clips, ...rest].sort((x, y) => order.indexOf(x.group) - order.indexOf(y.group));
  }

  /** How many moves use a point set (editing its points changes them all). */
  pointSetUsers(name: string): number {
    return this.moveList().filter((e) => this.move(e.ref)?.points === name).length;
  }

  /** Length the selection plays over: the move's (the game stretches the clip to it), else the clip's. */
  get playMs(): number { return this.move()?.ms ?? this.clipData.ms; }

  select(patch: Partial<Selection>): void {
    Object.assign(this.sel, patch);
    this.emit();
  }

  /**
   * Changes the documents. `drag` edits (a handle being dragged) share one
   * undo step until endDrag().
   */
  /** Save: keeps the edits in this browser (the game plays them, a reload keeps them); Export writes the files. */
  keep(): string {
    try { localStorage.setItem(KEPT_KEY, JSON.stringify(this.docs)); } catch { return 'Not saved: this browser keeps no data here'; }
    this.unsaved = false;
    this.emit();
    return 'Saved in this browser';
  }

  /** Drops the edits saved in this browser and every unsaved one: back to the build's data. */
  revert(): void {
    try { localStorage.removeItem(KEPT_KEY); } catch { /* nothing kept */ }
    this.undoStack.push(JSON.stringify(this.docs));
    this.docs = clone(fromFiles(DATA_FILES));
    this.unsaved = false;
    this.dirty.clear();
    for (const k of ['clips', 'moves', 'arenas', 'sounds'] as const) this.apply(k);
    this.sel.piece = null;
    this.emit();
  }

  edit(what: Kind, fn: (d: Docs) => void, drag = false): void {
    this.unsaved = true;
    if (!drag || !this.dragging) {
      this.undoStack.push(JSON.stringify(this.docs));
      if (this.undoStack.length > 200) this.undoStack.shift();
      this.redoStack = [];
    }
    this.dragging = drag;
    fn(this.docs);
    this.dirty.add(what);
    this.apply(what);
    this.emit();
  }

  /** A drag (or a typed value) is done: listeners hear it (the in-game editor then rebuilds the arena). */
  endDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.emit();
  }

  /** A drag (or a field being typed in) is still going on. */
  get busy(): boolean { return this.dragging; }

  undo(): void { this.swap(this.undoStack, this.redoStack); }
  redo(): void { this.swap(this.redoStack, this.undoStack); }

  private swap(from: string[], to: string[]): void {
    const prev = from.pop();
    if (!prev) return;
    to.push(JSON.stringify(this.docs));
    this.docs = JSON.parse(prev) as Docs;
    this.dirty.add('clips').add('moves').add('particles').add('arenas').add('sounds');
    if (!this.docs.sounds[this.sel.sound]) this.sel.sound = Object.keys(this.docs.sounds)[0] ?? '';
    if (!this.docs.arenas[this.sel.arena]) this.sel.arena = Object.keys(this.docs.arenas)[0] ?? '';
    this.sel.piece = null;
    if (!this.docs.clips[this.sel.clip]) this.sel.clip = 'idle';
    if (!this.docs.particles[this.sel.effect]) this.sel.effect = Object.keys(this.docs.particles)[0] ?? '';
    if (this.sel.move && !this.move()) this.sel.move = null;
    this.apply('clips');
    this.apply('moves');
    this.apply('arenas');
    this.apply('sounds');
    this.emit();
  }

  /** Pushes a document into the game's tables (what the stage plays). */
  private apply(what: Kind): void {
    if (what === 'clips') loadClips(clone(this.docs.clips));
    else if (what === 'moves') loadMoves(clone(this.docs.moves));
    else if (what === 'arenas') loadArenas(clone(this.docs.arenas));
    else if (what === 'sounds') loadSounds(clone(this.docs.sounds));
    // Particle effects are read straight from the documents (StageScene rebuilds them when they change).
  }

  // ------------------------------------------------------------ keys
  /** The key at the current time (within half a frame), if any. */
  keyAt(t = this.sel.t): Key | null {
    const tol = FRAME_MS / 2 / this.playMs;
    return this.clipData.keys.find((k) => Math.abs(k.t - t) <= tol) ?? null;
  }

  // ------------------------------------------------------------ files
  /** Data files whose text differs from the saved one (path under src/data -> text). */
  changedFiles(): Record<string, string> {
    const now = fileTexts(this.docs);
    return Object.fromEntries(Object.entries(now).filter(([path, text]) => this.saved[path] !== text));
  }

  /** Hands the current (maybe unsaved) data to a game tab opened with ?edited (see game/EditedData.ts). */
  stash(): void {
    try { localStorage.setItem(EDITED_KEY, JSON.stringify(this.docs)); } catch { /* no storage: the game plays the saved data */ }
  }

  /**
   * Writes the data files that changed: through the dev server into
   * src/data, or as downloads when there is none (the published build).
   */
  async save(): Promise<string> {
    const files = Object.entries(this.changedFiles());
    const now = fileTexts(this.docs);
    const gone = Object.keys(this.saved).filter((p) => !(p in now));
    if (files.length === 0 && gone.length === 0) { this.dirty.clear(); this.emit(); return 'Nothing changed'; }
    const names = [...files.map(([p]) => p), ...gone.map((p) => `${p} (deleted)`)];
    const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ');
    if (import.meta.env.DEV) {
      for (const [file, text] of files) {
        const res = await fetch('/__editor/save', { method: 'POST', body: JSON.stringify({ file, text }) });
        if (!res.ok) throw new Error(`${file}: ${await res.text()}`);
        this.saved[file] = text;
      }
      for (const file of gone) {
        const res = await fetch('/__editor/save', { method: 'POST', body: JSON.stringify({ file, delete: true }) });
        if (!res.ok) throw new Error(`${file}: ${await res.text()}`);
        delete this.saved[file];
      }
      this.dirty.clear();
      this.emit();
      return `Saved ${list}`;
    }
    // On claude.ai the page asks the viewer through the downloads capability; elsewhere a plain download.
    // One file per move, so they download flat, named after their path (moves-dir-fsmash.json).
    type Downloads = { save(r: { filename: string; data: string }): Promise<unknown> };
    const host = (window as unknown as { claude?: { use(n: string): Promise<Downloads | null> } }).claude;
    const downloads = host ? await host.use('downloads').catch(() => null) : null;
    for (const [file, text] of files) {
      const filename = file.replace(/\//g, '-');
      if (downloads) await downloads.save({ filename, data: text });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      this.saved[file] = text;
    }
    for (const file of gone) delete this.saved[file];
    this.dirty.clear();
    this.emit();
    return `Downloaded ${list}: each goes in web/src/data at the path its name spells${gone.length ? ` (delete ${gone.join(', ')} there)` : ''}`;
  }
}
