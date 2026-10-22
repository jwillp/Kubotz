// Player settings kept in the browser (phase 11): volumes and visual effects.
import type Phaser from 'phaser';

export interface Settings {
  /** 0..1 */
  music: number;
  /** Sound effects, 0..1 */
  sfx: number;
  /** Which visual effects are on (the graphics presets set them all at once). */
  fx: Effects;
}

/** The visual effects, each on or off; particles at a level. */
export interface Effects {
  /** Particle amount, 0..1: sparks, debris bits, motes, portal motes, .pe emitters. */
  particles: number;
  /** Camera shake on strong hits, hard landings and K.O.s. */
  shake: boolean;
  /** Kubotz flash white when struck. */
  hitFlash: boolean;
  /** Tearing and RGB split: struck Kubotz, bouncing orbs, the title logo. */
  glitch: boolean;
  /** Light thrown by hits and explosions, the menu buttons' shine. */
  glow: boolean;
  /** The cel-shaded smoke burst of a K.O. */
  koSmoke: boolean;
  /** Vignette, contrast and split tone over the arena; the soft arena behind the setup. */
  grade: boolean;
  /** Film grain and faint scanlines over the whole screen. */
  grain: boolean;
  /** The old TV screen changes and the menus' blips of interference. */
  tv: boolean;
}

/** The graphics presets, lightest first. */
export const GRAPHICS = {
  minimal: { particles: 0, shake: false, hitFlash: false, glitch: false, glow: false, koSmoke: false, grade: false, grain: false, tv: false },
  low: { particles: 0.35, shake: true, hitFlash: true, glitch: false, glow: false, koSmoke: true, grade: false, grain: false, tv: false },
  medium: { particles: 0.65, shake: true, hitFlash: true, glitch: true, glow: true, koSmoke: true, grade: true, grain: false, tv: true },
  high: { particles: 1, shake: true, hitFlash: true, glitch: true, glow: true, koSmoke: true, grade: true, grain: true, tv: true },
} satisfies Record<string, Effects>;
export type Graphics = keyof typeof GRAPHICS;
export const GRAPHICS_LEVELS = Object.keys(GRAPHICS) as Graphics[];

/** The preset the effects match, or 'custom'. */
export function graphicsOf(fx: Effects): Graphics | 'custom' {
  const keys = Object.keys(fx) as (keyof Effects)[];
  return GRAPHICS_LEVELS.find((g) => keys.every((k) => GRAPHICS[g][k] === fx[k])) ?? 'custom';
}

const KEY = 'kubotz.settings';
const DEFAULTS: Settings = { music: 0.8, sfx: 0.8, fx: { ...GRAPHICS.high } };
let current: Settings = load();
const listeners = new Set<(s: Readonly<Settings>) => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Settings> & { vfx?: number };
      // Before the per-effect settings: one 0..1 level, kept as the nearest preset.
      const old = typeof saved.vfx === 'number' && !saved.fx
        ? GRAPHICS[saved.vfx <= 0 ? 'minimal' : saved.vfx < 0.5 ? 'low' : saved.vfx < 1 ? 'medium' : 'high'] : undefined;
      delete saved.vfx;
      return { ...DEFAULTS, ...saved, fx: { ...DEFAULTS.fx, ...old, ...saved.fx } };
    }
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
  const level = { base, duck: 1 };
  musicLevels.set(sound, level);
  const off = onSettingsChange((s) => (sound as Phaser.Sound.WebAudioSound).setVolume?.(level.base * level.duck * s.music));
  sound.once('destroy', off);
  return sound;
}

const musicLevels = new WeakMap<Phaser.Sound.BaseSound, { base: number; duck: number }>();

/** Lowers a music track to `duck` (0..1) of its level, under the music setting (the pause); 1 restores it. */
export function duckMusic(sound: Phaser.Sound.BaseSound | undefined, duck: number): void {
  const level = sound && musicLevels.get(sound);
  if (!level) return;
  level.duck = duck;
  (sound as Phaser.Sound.WebAudioSound).setVolume?.(level.base * duck * current.music);
}

// ------------------------------------------------------------------ visual effects
/** The visual effects now (Settings: a graphics preset, then each effect on or off). */
export const fx = (): Readonly<Effects> => current.fx;

/** `n` things (particles) scaled by the particle amount, rounded at random so small counts keep their average. */
export function particleCount(n: number): number {
  const x = n * current.fx.particles;
  return Math.floor(x + Math.random());
}

/** True for a fraction of calls equal to the particle amount (whether to spawn one optional particle). */
export const particleChance = (): boolean => Math.random() < current.fx.particles;
