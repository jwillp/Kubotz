import { loadClips } from '../anim/Clips';
import { loadMoves } from './Kubotz';
import type { EffectData } from '../fx/ParticleEffect';
import type { GameData } from './DataFiles';
import { ARENA_IDS, loadArenas } from '../map/Arenas';

/** Where the editor leaves its data for "Test in game". */
export const EDITED_KEY = 'kubotz-editor-test';

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
