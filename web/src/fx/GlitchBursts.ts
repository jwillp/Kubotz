import Phaser from 'phaser';
import { fx } from '../game/Settings';
import { hitGlitch } from './HitGlitch';

/**
 * The logo's glitch bursts, for any title: now and then its picture breaks up
 * through the hit glitch (tearing, RGB split, scan lines) for a fraction of a
 * second, stutters and settles, then stays clean for a few seconds. Each title
 * keeps its own random schedule, so two on one screen don't glitch together.
 * Off with the distortion effect.
 */

/** How long one burst lasts and the quiet between two (ms). */
const BURST_MS = [160, 420] as const;
const QUIET_MS = [2600, 7000] as const;
/** One step of a burst's flicker (ms): the picture jumps between strengths this often. */
const FLICKER_MS = 45;

export interface GlitchBurstOptions {
  /** When the first burst comes (ms from now); random within the first quiet by default. */
  first?: number;
  /** The whole thing jolts sideways on the hardest steps, by up to this many pixels (0: never). */
  jolt?: number;
  /** How coarse the tears are (1: as on the logo and a hit Kubot), so small titles don't tear apart. */
  coarse?: number;
}

export class GlitchBursts {
  /** The current burst: start, length, the strength of each flicker step; and when the next one comes. */
  private burst = { at: 0, ms: 0, steps: [] as number[] };
  private next: number;
  private readonly jolt: number;
  private readonly coarse: number;
  /** The sideways jolt now applied to the target's x, taken back before the next one. */
  private offset = 0;
  private readonly scene: Phaser.Scene;

  constructor(readonly target: Phaser.GameObjects.Container | Phaser.GameObjects.Image, { first, jolt = 0, coarse = 1 }: GlitchBurstOptions = {}) {
    this.scene = target.scene;
    this.jolt = jolt;
    this.coarse = coarse;
    this.next = this.scene.time.now + (first ?? Phaser.Math.Between(600, QUIET_MS[1]));
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    target.once(Phaser.GameObjects.Events.DESTROY, this.destroy, this);
  }

  /** Starts a burst now (also handy from the console). */
  glitch(): void {
    const now = this.scene.time.now;
    const ms = Phaser.Math.Between(...BURST_MS);
    // Each flicker step at its own strength, the first ones hardest: it breaks, stutters, settles.
    const n = Math.ceil(ms / FLICKER_MS);
    const steps = Array.from({ length: n }, (_, i) => (Math.random() < 0.25 ? 0 : Phaser.Math.FloatBetween(0.35, 1)) * (1 - 0.6 * (i / n)));
    steps[0] = Phaser.Math.FloatBetween(0.7, 1);
    this.burst = { at: now, ms, steps };
    this.next = now + ms + Phaser.Math.Between(...QUIET_MS);
    hitGlitch(this.target, 0); // a new pass: a new seed, so no two bursts tear alike
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  private update(time: number): void {
    const t = this.target;
    if (!t.active) return;
    t.x -= this.offset;
    this.offset = 0;
    if (!fx().distortion || !t.visible) { hitGlitch(t, 0); return; }
    if (time >= this.next) this.glitch();
    const since = time - this.burst.at;
    const amount = since >= 0 && since < this.burst.ms ? (this.burst.steps[Math.floor(since / FLICKER_MS)] ?? 0) : 0;
    hitGlitch(t, amount, undefined, null, this.coarse);
    if (this.jolt && amount > 0.6) {
      this.offset = Phaser.Math.Between(-this.jolt, this.jolt) * amount;
      t.x += this.offset;
    }
  }
}
