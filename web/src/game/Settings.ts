// Player settings kept in the browser (phase 11): volumes and visual effects.
import type Phaser from 'phaser';

export interface Settings {
  /** 0..1 */
  music: number;
  /** Sound effects, 0..1 */
  sfx: number;
  /** Visual effects intensity (particles, shake, flashes, bloom), 0..1 */
  vfx: number;
}

const KEY = 'kubotz.settings';
const DEFAULTS: Settings = { music: 0.8, sfx: 0.8, vfx: 1 };
let current: Settings = load();
const listeners = new Set<(s: Readonly<Settings>) => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* private window or blocked storage: defaults */ }
  return { ...DEFAULTS };
}

export const settings = (): Readonly<Settings> => current;

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* not saved */ }
  for (const fn of listeners) fn(current);
}

/** Calls `fn` on every change (live preview); returns the function that stops it. */
export function onSettingsChange(fn: (s: Readonly<Settings>) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ------------------------------------------------------------------ audio
/** A sound effect's volume: its own level times the sound effects setting. */
export const sfxVolume = (base: number): number => base * current.sfx;

/**
 * Adds a looping music track whose volume follows the music setting live
 * (`base` is the track's own level at full music volume).
 */
export function addMusic(scene: Phaser.Scene, key: string, base: number): Phaser.Sound.BaseSound {
  const sound = scene.sound.add(key, { loop: true, volume: base * current.music });
  const off = onSettingsChange((s) => (sound as Phaser.Sound.WebAudioSound).setVolume?.(base * s.music));
  sound.once('destroy', off);
  return sound;
}

// ------------------------------------------------------------------ visual effects
/**
 * The visual effects multiplier, 0..1: particle counts and emission, screen
 * shake, hit flashes and glows scale with it; the grade pass is on from 0.5.
 * 0 is the minimal look (like ?lowfx).
 */
export const vfx = (): number => current.vfx;

/** `n` things (particles) scaled by the VFX setting, rounded at random so small counts keep their average. */
export function vfxCount(n: number): number {
  const x = n * current.vfx;
  return Math.floor(x + Math.random());
}

/** True for a fraction of calls equal to the VFX setting (whether to spawn one optional effect). */
export const vfxChance = (): boolean => Math.random() < current.vfx;
