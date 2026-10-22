import Phaser from 'phaser';
import { NEON } from '../ui/Type';
import { tvCut } from './ScreenScan';

/**
 * The load screen: the Kubotz logo tuning in and out of a snowy signal, like
 * a station ident on an old TV, over a tuning bar that fills with the
 * loading. Everything sits under the screen change's TV pass (scanlines,
 * blue snow, colour bleed), steady instead of rolling.
 */
export class TvIdent {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly logo: Phaser.GameObjects.Image;
  private readonly ghost: Phaser.GameObjects.Image;
  private readonly bar: Phaser.GameObjects.Graphics;
  /** A soft cyan-white halo round the lit blocks (additive). */
  private readonly barGlow: Phaser.GameObjects.Graphics;
  private readonly scale: number;
  private progress = 0;
  /** The bar as shown: it eases towards the progress, so it fills smoothly. */
  private shown = 0;
  private readonly start = performance.now();
  /** The load screen's camera (kept: the scene drops its cameras as it shuts down). */
  private readonly cam: Phaser.Cameras.Scene2D.Camera;

  /** `logoKey` must already be loaded (it is the first file in the boot queue). */
  constructor(private readonly scene: Phaser.Scene, logoKey: string) {
    const { width, height } = scene.scale;
    this.cam = scene.cameras.main;
    scene.add.rectangle(width / 2, height / 2, width, height, 0x05080f); // the screen the snow runs on
    // A soft cyan bloom behind the logo, in rings.
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 8; i > 0; i--) this.glow.fillStyle(NEON, 0.035).fillEllipse(width / 2, height / 2 - 30, 110 * i, 64 * i);
    this.scale = 520 / Math.max(1, scene.textures.get(logoKey).getSourceImage().width);
    // A faint second image off to the side: the signal's ghost.
    this.ghost = scene.add.image(width / 2, height / 2 - 30, logoKey).setScale(this.scale).setTint(0xff3a6a).setBlendMode(Phaser.BlendModes.ADD);
    this.logo = scene.add.image(width / 2, height / 2 - 30, logoKey).setScale(this.scale);
    this.barGlow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.bar = scene.add.graphics();
  }

  /** How far the loading is, 0..1: the tuning bar's blocks light up. */
  setProgress(p: number): void { this.progress = Math.max(this.progress, p); }

  /** Call every frame (`delta` in ms). */
  update(delta = 16): void {
    const { width, height } = this.scene.scale;
    const t = performance.now() - this.start;
    // The signal comes and goes: a flicker, now and then a drop-out, and sideways jumps.
    const flicker = Math.random() < 0.1 ? 0.25 : 0.75 + 0.25 * Math.random();
    const jump = Math.random() < 0.15 ? Phaser.Math.Between(-24, 24) : 0;
    this.logo.setAlpha(flicker).setX(width / 2 + jump).setScale(this.scale * (1 + 0.02 * Math.sin(t / 40)), this.scale);
    this.ghost.setAlpha(0.35 * flicker).setX(width / 2 + jump + 14);
    this.glow.setAlpha(0.8 + 0.2 * Math.sin(t / 300));
    const blocks = 16;
    this.shown += (this.progress - this.shown) * Math.min(1, delta / 120);
    const fill = blocks * Phaser.Math.Clamp(this.shown, 0, 1);
    const g = this.bar.clear();
    const bw = 22;
    const x0 = width / 2 - (blocks * (bw + 6)) / 2;
    // White blocks, the one being filled partly lit, each lit one haloed in a few soft layers.
    const glow = this.barGlow.clear();
    for (let i = 0; i < blocks; i++) {
      const lit = Phaser.Math.Clamp(fill - i, 0, 1);
      const x = x0 + i * (bw + 6);
      const y = height - 150;
      g.fillStyle(0xffffff, 0.14 + 0.81 * lit).fillRect(x, y, bw, 14);
      for (const [grow, a] of [[3, 0.22], [7, 0.1], [13, 0.05]] as const) glow.fillStyle(0xbfe9ff, a * lit).fillRect(x - grow, y - grow, bw + 2 * grow, 14 + 2 * grow);
    }
    // The TV look, a little lighter than a screen change at its peak.
    tvCut(this.cam, 0.75, 0);
  }

  destroy(): void {
    try { tvCut(this.cam, 0, 0); } catch { /* the camera went with the scene */ }
  }
}
