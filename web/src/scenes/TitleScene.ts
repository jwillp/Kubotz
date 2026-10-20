import Phaser from 'phaser';
import { ARENA_INFO } from '../map/Arenas';

export type Slot = 'P1' | 'P2' | 'CPU';
export interface MatchSetup { slots: Slot[]; arena?: number; }

const MODES: { label: string; slots: Slot[] }[] = [
  { label: '1 Player vs CPU', slots: ['P1', 'CPU'] },
  { label: '2 Players', slots: ['P1', 'P2'] },
  { label: '1 Player vs 3 CPU', slots: ['P1', 'CPU', 'CPU', 'CPU'] },
  { label: '2 Players vs 2 CPU', slots: ['P1', 'P2', 'CPU', 'CPU'] },
  { label: 'Watch CPUs fight', slots: ['CPU', 'CPU', 'CPU', 'CPU'] },
];

export class TitleScene extends Phaser.Scene {
  private selected = 0;
  private items: Phaser.GameObjects.Text[] = [];
  private arena = 0;
  private arenaText!: Phaser.GameObjects.Text;
  private arenaBlurb!: Phaser.GameObjects.Text;

  constructor() { super('Title'); }

  create(): void {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height).setAlpha(0.8);
    this.add.rectangle(width / 2, height / 2, width, height, 0x050b18, 0.45);

    const title = this.add.text(width / 2, 120, 'KUBOTZ', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '110px', color: '#ffffff',
      stroke: '#29abe2', strokeThickness: 10,
    }).setOrigin(0.5);
    title.setShadow(0, 8, '#0b1d33', 0, true, true);
    this.tweens.add({ targets: title, y: 132, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(width / 2, 210, 'robot arena brawler', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#9fe3ff',
    }).setOrigin(0.5);

    MODES.forEach((m, i) => {
      const t = this.add.text(width / 2, 300 + i * 56, m.label, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '32px', color: '#ffffff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.select(i));
      t.on('pointerdown', () => this.start(i));
      this.items.push(t);
    });
    this.select(0);

    // Arena picker: the original cube, or one of the arenas built from its tiles.
    this.arena = (this.registry.get('arena') as number | undefined) ?? 0;
    const arrow = (x: number, label: string, delta: number) => this.add.text(x, 600, label, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: '#29abe2',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pickArena(delta));
    this.arenaText = this.add.text(width / 2, 600, '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: '#ffffff',
    }).setOrigin(0.5);
    this.arenaBlurb = this.add.text(width / 2, 634, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#9fe3ff',
    }).setOrigin(0.5);
    arrow(width / 2 - 250, '◀', -1);
    arrow(width / 2 + 250, '▶', 1);
    this.pickArena(0);

    // Title music (dashboard.ogg); browsers start it after the first click or key.
    if (!this.sound.get('music-title')?.isPlaying) {
      this.sound.removeByKey('music-title');
      this.sound.add('music-title', { loop: true, volume: 0.5 }).play();
    }

    this.add.text(width / 2, height - 70,
      'P1: WASD move/jump (S: drop down) · O attack · I grab · Shift guard      P2: Arrows · , attack · . grab · / guard\n'
      + 'Gamepads work too. Grab power-ups, knock rivals out, last robot standing wins.', {
        fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#cfe9ff', align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.select((this.selected + MODES.length - 1) % MODES.length));
    kb.on('keydown-W', () => this.select((this.selected + MODES.length - 1) % MODES.length));
    kb.on('keydown-DOWN', () => this.select((this.selected + 1) % MODES.length));
    kb.on('keydown-S', () => this.select((this.selected + 1) % MODES.length));
    kb.on('keydown-LEFT', () => this.pickArena(-1));
    kb.on('keydown-A', () => this.pickArena(-1));
    kb.on('keydown-RIGHT', () => this.pickArena(1));
    kb.on('keydown-D', () => this.pickArena(1));
    kb.on('keydown-ENTER', () => this.start(this.selected));
    kb.on('keydown-SPACE', () => this.start(this.selected));
    kb.on('keydown', (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= MODES.length) this.start(n - 1);
    });
  }

  private select(i: number): void {
    this.selected = i;
    this.items.forEach((t, j) => t.setColor(j === i ? '#29abe2' : '#ffffff').setScale(j === i ? 1.1 : 1));
  }

  private pickArena(delta: number): void {
    this.arena = (this.arena + delta + ARENA_INFO.length) % ARENA_INFO.length;
    this.registry.set('arena', this.arena);
    this.arenaText.setText(`Arena: ${ARENA_INFO[this.arena].name}`);
    this.arenaBlurb.setText(`${ARENA_INFO[this.arena].blurb}  ·  ◀ ▶ to change`);
  }

  private start(i: number): void {
    const setup: MatchSetup = { slots: MODES[i].slots, arena: this.arena };
    this.scene.start('Game', setup);
  }
}
