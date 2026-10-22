import Phaser from 'phaser';
import { addMusic, vfx } from '../game/Settings';
import { hitGlitch } from '../fx/HitGlitch';
import { footer, kubeBackdrop, PlateButton, shutter } from '../ui/Plate';
import { uiSound } from '../audio/Sounds';
import { heading } from '../ui/Type';
import { LOGO_RES } from './BootScene';
import { MenuInput } from './MenuInput';

/** The title menu: each entry opens a scene. */
const ENTRIES: { label: string; scene: string; overlay?: boolean }[] = [
  { label: 'Play', scene: 'Setup' },
  { label: 'Moves', scene: 'MoveList' },
  // Over the title, which waits paused until Back.
  { label: 'Controls', scene: 'Controls', overlay: true },
  { label: 'Settings', scene: 'Settings', overlay: true },
];

/** The logo's glitch bursts: how long one lasts and the quiet between two (ms). */
const BURST_MS = [160, 420] as const;
const QUIET_MS = [2600, 7000] as const;
/** One step of a burst's flicker (ms): the picture jumps between strengths this often. */
const FLICKER_MS = 45;

export class TitleScene extends Phaser.Scene {
  private selected = 0;
  private items: PlateButton[] = [];
  /** Set once a scene change has started (the shutter is closing). */
  private leaving = false;
  private menu!: MenuInput;
  /** The logo and its ARENA line, which glitch together. */
  private brand!: Phaser.GameObjects.Container;
  /** The current glitch burst: start, length, the strength of each flicker step; and when the next one comes. */
  private burst = { at: 0, ms: 0, steps: [] as number[] };
  private nextBurst = 0;

  constructor() { super('Title'); }

  create(): void {
    // The scene object is reused when the title comes back: drop the old (destroyed) texts.
    this.items = [];
    this.leaving = false;
    const { width } = this.scale;
    kubeBackdrop(this);

    // The original Kubotz logo (logo_SD.png from the 2015 gh-pages site), as vectors (public/logo.svg),
    // and KUBOTZ ARENA's subtitle in the logo's font and neon, spaced out under it.
    const logo = this.add.image(0, 0, 'logo').setScale(1.3 / LOGO_RES);
    const arena = heading(this, 0, 108, 'A R E N A', 34);
    this.brand = this.add.container(width / 2, 118, [logo, arena]);
    this.tweens.add({ targets: this.brand, y: 128, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.burst = { at: 0, ms: 0, steps: [] };
    this.nextBurst = this.time.now + 1200;

    ENTRIES.forEach((m, i) => {
      const t = new PlateButton(this, width / 2, 340 + i * 68, 340, 56, m.label, { size: 34 });
      t.on('pointerover', () => this.select(i));
      t.on('pointerdown', () => this.start(i));
      this.items.push(t);
    });
    this.select(0);

    // Title music (dashboard.ogg); browsers start it after the first click or key.
    if (!this.sound.get('music-title')?.isPlaying) {
      this.sound.removeByKey('music-title');
      addMusic(this, 'music-title', 0.5).play();
    }

    footer(this, [
      'P1  WASD move · Space jump · O attack · P special · I grab · Shift shield · U taunt      P2  Arrows · M jump · , attack · N special · . grab · / shield',
      '↑↓ / D-pad / stick choose · Enter / A / Start select · F screen effects · Gamepads use the Smash Ultimate layout · Last team standing wins',
    ]);

    // Arrows / WASD, the D-pad or left stick (repeating while held); Enter, Space, pad A or Start opens.
    this.menu = new MenuInput({
      move: (_dx, dy) => { if (dy) this.select((this.selected + dy + ENTRIES.length) % ENTRIES.length); },
      confirm: () => this.start(this.selected),
    }, false, { confirm: ['A', 9], back: [] });
    // Back from the settings (drawn over the title): the press that closed them must not open anything.
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.menu.reset());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.RESUME));
    const kb = this.input.keyboard!;
    kb.on('keydown-O', () => this.start(this.selected));
    kb.on('keydown-COMMA', () => this.start(this.selected));
  }

  update(time: number): void {
    if (!this.leaving) this.menu.update(time);
    this.updateGlitch(time);
  }

  /** Starts a glitch burst on the logo now (also handy from the console). */
  glitch(): void {
    const ms = Phaser.Math.Between(...BURST_MS);
    // Each flicker step at its own strength, the first ones hardest: it breaks, stutters, settles.
    const n = Math.ceil(ms / FLICKER_MS);
    const steps = Array.from({ length: n }, (_, i) => (Math.random() < 0.25 ? 0 : Phaser.Math.FloatBetween(0.35, 1)) * (1 - 0.6 * (i / n)));
    steps[0] = Phaser.Math.FloatBetween(0.7, 1);
    this.burst = { at: this.time.now, ms, steps };
    this.nextBurst = this.time.now + ms + Phaser.Math.Between(...QUIET_MS);
    hitGlitch(this.brand, 0); // a new pass: a new seed, so no two bursts tear alike
  }

  /** The logo's random glitches (the hit glitch's tearing, RGB split and scan lines), off at VFX 0. */
  private updateGlitch(time: number): void {
    if (vfx() <= 0) { hitGlitch(this.brand, 0); return; }
    if (time >= this.nextBurst) this.glitch();
    const t = time - this.burst.at;
    const amount = t >= 0 && t < this.burst.ms ? (this.burst.steps[Math.floor(t / FLICKER_MS)] ?? 0) : 0;
    hitGlitch(this.brand, amount * vfx());
    // The whole sign jolts sideways on the hardest steps.
    this.brand.x = this.scale.width / 2 + (amount > 0.6 ? Phaser.Math.Between(-4, 4) * amount : 0);
  }

  private select(i: number): void {
    this.selected = i;
    this.items.forEach((t, j) => t.setSelected(j === i));
  }

  private start(i: number): void {
    const e = ENTRIES[i];
    if (this.leaving) return;
    if (e.overlay) {
      uiSound(this, 'confirm');
      this.scene.pause();
      this.scene.launch(e.scene, { resume: ['Title'] });
      this.scene.bringToTop(e.scene);
      return;
    }
    this.leaving = true;
    shutter(this, () => this.scene.start(e.scene));
  }
}
