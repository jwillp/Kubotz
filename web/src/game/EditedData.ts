import { loadClips } from '../anim/Clips';
import { loadMoves } from './Kubotz';
import type { EffectData } from '../fx/ParticleEffect';
import type { GameData } from './DataFiles';
import { ARENA_IDS, loadArenas } from '../map/Arenas';

/** Where the editor leaves its data for "Test in game". */
export const EDITED_KEY = 'kubotz-editor-test';
/** Where the dev tools' Save keeps the edits in this browser (dev builds). */
export const KEPT_KEY = 'kubotz-dev-saved';

/** The edits saved in this browser by the dev tools' Save, if any (dev builds only). */
export function keptDocs(): GameData | null {
  if (!__EDITOR__) return null;
  try { return JSON.parse(localStorage.getItem(KEPT_KEY) ?? 'null') as GameData | null; } catch { return null; }
}

/** Dev builds: plays the edits saved in this browser (before the game boots, so the particle effects are in too). */
export function useKeptEdits(): void {
  const docs = keptDocs();
  if (!docs) return;
  loadClips(docs.clips);
  loadMoves(docs.moves);
  if (docs.arenas) loadArenas(docs.arenas);
  editedParticles = docs.particles ?? null;
}

/** The editor's particle effects while testing (BootScene plays them instead of src/data's). */
export let editedParticles: Record<string, EffectData> | null = null;

/** Set by the Arena tab's "Test in game" (?arena=<id>): boot straight into a match there. */
export let testArena: number | null = null;

/**
 * Opened from the editor's "Test in game" (index.html?edited): plays the
 * clips, moves and particle effects the editor holds, saved or not, instead
 * of src/data.
 */
export function useEditedData(): boolean {
  if (!new URLSearchParams(location.search).has('edited')) return false;
  try {
    const docs = JSON.parse(localStorage.getItem(EDITED_KEY) ?? 'null') as GameData | null;
    if (!docs) return false;
    loadClips(docs.clips);
    loadMoves(docs.moves);
    editedParticles = docs.particles ?? null;
    if (docs.arenas) loadArenas(docs.arenas);
    const arena = new URLSearchParams(location.search).get('arena');
    if (arena) { const i = ARENA_IDS.indexOf(arena); testArena = i > 0 ? i : null; }
    document.title = 'Kubotz (editor test)';
    return true;
  } catch {
    return false;
  }
}
