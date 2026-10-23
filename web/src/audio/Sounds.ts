import Phaser from 'phaser';
import { sfxVolume } from '../game/Settings';
import { SYNTH_SOUNDS, type UiSoundKind } from './Synth';

/**
 * Every sound in the game, by key, in one place.
 *
 * RECORDED: the original Kubotz recordings (release v0.1-alpha music and
 * sounds), converted to mp3 in public/audio.
 * SYNTH: sounds made in code at boot, added for the web port: the
 * SYNTH_SOUNDS table at the end of Synth.ts (it stays free of Phaser so a
 * worker can run it, audio/SynthWorker.ts).
 */
const RECORDED: Record<string, string> = {
  'music-title': 'dashboard.mp3',
  'music-game': 'techno-theme.mp3',
  shot: 'layzer.mp3',
  punch: 'punch-tight.mp3', // HeavyPunch2 without its lead-in
  step: 'step-tight.mp3', // step.mp3 without its silence and scuff; now the dodge (walking uses step-0..2)
  'narrator-1': 'narrator-1.mp3',
  'narrator-2': 'narrator-2.mp3',
  'narrator-3': 'narrator-3.mp3',
  'narrator-fight': 'narrator-fight.mp3',
};

/** The music an arena can play (its file's `music`), for the editors' Music list: [key, label]. */
export const MUSIC: [string, string][] = [
  ['music-game', 'Techno theme (the match music)'],
  ['music-title', 'Dashboard (the title music)'],
  ['none', 'None'],
];

/** Queues the recorded sounds on the loader. */
export function loadRecordedSounds(load: Phaser.Loader.LoaderPlugin): void {
  for (const [key, file] of Object.entries(RECORDED)) load.audio(key, `audio/${file}`);
}

/**
 * Makes the synth sounds into the audio cache (Web Audio only). They are
 * generated in a worker (SynthWorker.ts), off the page's thread, so the load
 * screen never waits on them; without workers, here, pausing between two.
 */
export async function makeSynthSounds(scene: Phaser.Scene, pause: () => Promise<void> = async () => {}): Promise<void> {
  if (!(scene.sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  const ctx = scene.sound.context;
  const add = (key: string, data: Float32Array) => {
    const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    scene.cache.audio.add(key, buf);
  };
  try {
    const worker = new Worker(new URL('./SynthWorker.ts', import.meta.url), { type: 'module' });
    await new Promise<void>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<{ key?: string; data?: Float32Array; done?: boolean }>) => {
        if (e.data.done) { worker.terminate(); resolve(); } else if (e.data.key && e.data.data) add(e.data.key, e.data.data);
      };
      worker.onerror = (err) => { worker.terminate(); reject(err); };
      // A page that blocks workers may never answer: then make them here.
      setTimeout(() => { worker.terminate(); reject(new Error('synth worker timed out')); }, 10000);
      worker.postMessage({ rate: ctx.sampleRate });
    });
  } catch {
    for (const [key, make] of Object.entries(SYNTH_SOUNDS)) {
      if (!scene.cache.audio.exists(key)) scene.cache.audio.add(key, make(ctx));
      await pause();
    }
  }
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

/** The menu screen like a TV changing stations, louder for a stronger one (a faster `rate` makes it a short blip). */
export function scanSound(scene: Phaser.Scene, strength: number, rate = 1): void {
  if (scene.cache.audio.exists('ui-scan')) scene.sound.play('ui-scan', { volume: sfxVolume(0.3 * strength), rate });
}
