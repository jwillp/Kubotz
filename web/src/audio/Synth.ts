/**
 * The sounds made in code, as opposed to the original recordings in
 * public/audio (Sounds.ts lists them all). Each is a file in src/data/sounds
 * (SoundDef.ts says what is in one; the editor's Sound tab edits them).
 */
import { renderSound, type SoundDef } from './SoundDef';

/** The menu sounds: a glassy tick to move, a rising chirp to confirm, a falling one to go back, a soft tick to adjust. */
export type UiSoundKind = 'move' | 'confirm' | 'back' | 'tick';

/** The sounds the game plays by key (Sounds.ts): renaming or deleting one silences it. */
export const GAME_SOUNDS = ['boom', 'orb-bounce', 'orb-pickup', 'orb-heal', 'step-0', 'step-1', 'step-2', 'holo-spawn', 'portal-warp', 'ui-move', 'ui-tick', 'ui-confirm', 'ui-back', 'ui-scan'];

/** The sound files in src/data/sounds, by key. */
export const SOUND_FILES: Record<string, SoundDef> = Object.fromEntries(
  Object.entries(import.meta.glob('../data/sounds/*.json', { eager: true, import: 'default' }))
    .map(([path, v]) => [path.replace(/^.*\/(.*)\.json$/, '$1'), v as SoundDef]),
);

let sounds: Record<string, SoundDef> = SOUND_FILES;

/** Every synth sound by key: the files', or the editor's edits once loaded. */
export function soundDefs(): Record<string, SoundDef> { return sounds; }

/** Plays these sounds instead of src/data's (the editor's edits). */
export function loadSounds(defs: Record<string, SoundDef>): void { sounds = defs; }

/** A sound's samples at `rate`, with the sounds its layers mix in looked up in `defs`. */
export function synthSamples(key: string, rate: number, defs: Record<string, SoundDef> = sounds): Float32Array {
  const def = defs[key];
  return def ? renderSound(def, rate, (k) => defs[k], [key]) : new Float32Array(1);
}
