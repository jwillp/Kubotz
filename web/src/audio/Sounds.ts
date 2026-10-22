import Phaser from 'phaser';
import { sfxVolume } from '../game/Settings';
import {
  crystalBounceBuffer, healChimeBuffer, holoSpawnBuffer, metalStepBuffer, pickupChimeBuffer, portalWarpBuffer,
  sciFiExplosionBuffer, uiSoundBuffer, scanBuffer, type UiSoundKind,
} from './Synth';

/**
 * Every sound in the game, by key, in one place.
 *
 * RECORDED: the original Kubotz recordings (release v0.1-alpha music and
 * sounds), converted to mp3 in public/audio.
 * SYNTH: sounds made in code at boot (Synth.ts), added for the web port.
 */
const RECORDED: Record<string, string> = {
  'music-title': 'dashboard.mp3',
  'music-game': 'TechnoTheme.mp3',
  shot: 'layzer.mp3',
  punch: 'punch_tight.mp3', // HeavyPunch2 without its lead-in
  step: 'step_tight.mp3', // step.mp3 without its silence and scuff; now the dodge (walking uses step-0..2)
  'narrator-1': 'narrator_1.mp3',
  'narrator-2': 'narrator_2.mp3',
  'narrator-3': 'narrator_3.mp3',
  'narrator-fight': 'narrator_fight.mp3',
};

const SYNTH: Record<string, (ctx: BaseAudioContext) => AudioBuffer> = {
  boom: sciFiExplosionBuffer, // a robot blowing up
  'orb-bounce': crystalBounceBuffer, // the power-up ball bouncing
  'orb-pickup': pickupChimeBuffer,
  'orb-heal': healChimeBuffer,
  // Footsteps: soft metal boot steps, three variants (replacing step.mp3, too loud and scuffy).
  'step-0': (ctx) => metalStepBuffer(ctx, 0),
  'step-1': (ctx) => metalStepBuffer(ctx, 1),
  'step-2': (ctx) => metalStepBuffer(ctx, 2),
  'holo-spawn': holoSpawnBuffer, // a robot materializing
  'portal-warp': portalWarpBuffer, // a robot going through a portal
  'ui-move': (ctx) => uiSoundBuffer(ctx, 'move'),
  'ui-tick': (ctx) => uiSoundBuffer(ctx, 'tick'),
  'ui-confirm': (ctx) => uiSoundBuffer(ctx, 'confirm'),
  'ui-back': (ctx) => uiSoundBuffer(ctx, 'back'),
  'ui-scan': scanBuffer, // the menu screen like a TV changing stations
};

/** Queues the recorded sounds on the loader. */
export function loadRecordedSounds(load: Phaser.Loader.LoaderPlugin): void {
  for (const [key, file] of Object.entries(RECORDED)) load.audio(key, `audio/${file}`);
}

/** Makes the synth sounds into the audio cache (Web Audio only). */
export function makeSynthSounds(scene: Phaser.Scene): void {
  if (!(scene.sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  for (const [key, make] of Object.entries(SYNTH)) scene.cache.audio.add(key, make(scene.sound.context));
}

// ------------------------------------------------------------------ menus
/** Each menu sound's level (before the sound effects setting). */
const UI_VOLUME: Record<UiSoundKind, number> = { move: 0.4, tick: 0.45, confirm: 0.45, back: 0.4 };
const lastAt = new Map<UiSoundKind, number>();

/**
 * Plays a menu sound (`ui-move`, `ui-confirm`, ...). Several paths can
 * report one action (a key and the shutter it starts, a pause that also
 * selects its first item), so a sound is skipped when the same one just
 * played, and a move right after a confirm or back.
 */
export function uiSound(scene: Phaser.Scene, kind: UiSoundKind): void {
  const key = `ui-${kind}`;
  if (!scene.cache.audio.exists(key)) return;
  const now = performance.now();
  const since = (k: UiSoundKind) => now - (lastAt.get(k) ?? -1e9);
  if (since(kind) < (kind === 'move' || kind === 'tick' ? 45 : 150)) return;
  if (kind === 'move' && Math.min(since('confirm'), since('back')) < 200) return;
  lastAt.set(kind, now);
  scene.sound.play(key, { volume: sfxVolume(UI_VOLUME[kind]) });
}

/** The menu screen like a TV changing stations, louder for a stronger one. */
export function scanSound(scene: Phaser.Scene, strength: number): void {
  if (scene.cache.audio.exists('ui-scan')) scene.sound.play('ui-scan', { volume: sfxVolume(0.3 * strength) });
}
