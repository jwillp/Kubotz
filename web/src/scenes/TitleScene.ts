import Phaser from 'phaser';
import { addMusic } from '../game/Settings';
import { footer, kubeBackdrop, PlateButton, shutter } from '../ui/Plate';
import { heading } from '../ui/Type';

/** The title menu: each entry opens a scene. */
const ENTRIES: { label: string; scene: string; overlay?: boolean }[] = [
  { label: 'Play', scene: 'Join' },
  { label: 'Moves', scene: 'MoveList' },
  // Over the title, which waits paused until Back.
  { label: 'Settings', scene: 'Settings', overlay: true },
];

export class TitleScene extends Phaser.Scene {
  private selected = 0;
  private items: PlateButton[] = [];
  /** Set once a scene change has started (the shutter is closing). */
  private leaving = false;

  constructor() { super('Title'); }

  create(): void {
    // The scene object is reused when the title comes back: drop the old (destroyed) texts.
    this.items = [];
    this.leaving = false;
    const { width } = this.scale;
    kubeBackdrop(this);

    // The original Kubotz logo (logo_SD.png from the 2015 gh-pages site).
    const logo = this.add.image(width / 2, 118, 'logo').setScale(1.3);
    this.tweens.add({ targets: logo, y: 128, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // KUBOTZ ARENA: the subtitle in the logo's font and neon, spaced out under it.
    const arena = heading(this, width / 2, 226, 'A R E N A', 34);
    this.tweens.add({ targets: arena, y: 236, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    ENTRIES.forEach((m, i) => {
      const t = new PlateButton(this, width / 2, 340 + i * 68, 340, 56, m.label, { size: 40 });
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
      '↑↓ choose · Enter / A select · Gamepads use the Smash Ultimate layout · Grab power-ups, knock rivals out, last team standing wins',
    ]);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.select((this.selected + ENTRIES.length - 1) % ENTRIES.length));
    kb.on('keydown-W', () => this.select((this.selected + ENTRIES.length - 1) % ENTRIES.length));
    kb.on('keydown-DOWN', () => this.select((this.selected + 1) % ENTRIES.length));
    kb.on('keydown-S', () => this.select((this.selected + 1) % ENTRIES.length));
    kb.on('keydown-ENTER', () => this.start(this.selected));
    kb.on('keydown-SPACE', () => this.start(this.selected));
    kb.on('keydown-O', () => this.start(this.selected));
    kb.on('keydown-COMMA', () => this.start(this.selected));
    // Gamepads: A (right face) or Start opens the entry, the D-pad moves.
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 1 || button.index === 9) this.start(this.selected);
      if (button.index === 12) this.select((this.selected + ENTRIES.length - 1) % ENTRIES.length);
      if (button.index === 13) this.select((this.selected + 1) % ENTRIES.length);
    });
  }

  private select(i: number): void {
    this.selected = i;
    this.items.forEach((t, j) => t.setSelected(j === i));
  }

  private start(i: number): void {
    const e = ENTRIES[i];
    if (e.overlay) {
      this.scene.pause();
      this.scene.launch(e.scene, { resume: ['Title'] });
      this.scene.bringToTop(e.scene);
      return;
    }
    if (this.leaving) return;
    this.leaving = true;
    shutter(this, () => this.scene.start(e.scene));
  }
}
