import Phaser from 'phaser';
import { ARENA_INFO } from '../map/Arenas';
import { addMusic } from '../game/Settings';

export type Slot = 'P1' | 'P2' | 'CPU';
export interface MatchSetup { slots: Slot[]; arena?: number; bonuses?: BonusRate; }

/** How often power-up balls appear: seconds between spawns, and how many can be out at once. */
export type BonusRate = 'off' | 'rare' | 'normal' | 'frequent';
export const BONUS_RATES: Record<BonusRate, { label: string; min: number; max: number; most: number }> = {
  off: { label: 'Off', min: 0, max: 0, most: 0 },
  rare: { label: 'Rare', min: 22000, max: 35000, most: 2 },
  normal: { label: 'Normal', min: 12000, max: 20000, most: 3 },
  frequent: { label: 'Frequent', min: 5000, max: 10000, most: 5 }, // the original game's rate
};
const RATE_ORDER: BonusRate[] = ['off', 'rare', 'normal', 'frequent'];

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
  private bonuses: BonusRate = 'normal';
  private bonusText!: Phaser.GameObjects.Text;

  constructor() { super('Title'); }

  create(): void {
    // The scene object is reused when the title comes back: drop the old (destroyed) texts.
    this.items = [];
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
    // Settings (volumes, visual effects): the last entry of the menu, in the top corner.
    const gear = this.add.text(width - 28, 28, '⚙ Settings', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '24px', color: '#ffffff',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    gear.on('pointerover', () => this.select(MODES.length));
    gear.on('pointerdown', () => this.start(MODES.length));
    this.items.push(gear);
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

    // Game setting: how often power-up balls appear (B or click to change).
    this.bonuses = (this.registry.get('bonuses') as BonusRate | undefined) ?? 'normal';
    this.bonusText = this.add.text(width / 2, 672, '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pickBonuses());
    this.pickBonuses(0);

    // Title music (dashboard.ogg); browsers start it after the first click or key.
    if (!this.sound.get('music-title')?.isPlaying) {
      this.sound.removeByKey('music-title');
      addMusic(this, 'music-title', 0.5).play();
    }

    this.add.text(width / 2, height - 36,
      'P1: WASD move (W, Space: jump) · O attack · P special · I grab · Shift shield · U taunt      P2: Arrows · , attack · N special · . grab · / shield · M jump\n'
      + 'Gamepads use the Smash Ultimate layout. Grab power-ups, knock rivals out, last robot standing wins.', {
        fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#cfe9ff', align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);

    const kb = this.input.keyboard!;
    const n = this.items.length;
    kb.on('keydown-UP', () => this.select((this.selected + n - 1) % n));
    kb.on('keydown-W', () => this.select((this.selected + n - 1) % n));
    kb.on('keydown-DOWN', () => this.select((this.selected + 1) % n));
    kb.on('keydown-S', () => this.select((this.selected + 1) % n));
    kb.on('keydown-LEFT', () => this.pickArena(-1));
    kb.on('keydown-A', () => this.pickArena(-1));
    kb.on('keydown-RIGHT', () => this.pickArena(1));
    kb.on('keydown-D', () => this.pickArena(1));
    kb.on('keydown-B', () => this.pickBonuses());
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

  private pickBonuses(delta = 1): void {
    this.bonuses = RATE_ORDER[(RATE_ORDER.indexOf(this.bonuses) + delta) % RATE_ORDER.length];
    this.registry.set('bonuses', this.bonuses);
    this.bonusText.setText(`Power-ups: ${BONUS_RATES[this.bonuses].label}  ·  B to change`);
  }

  private start(i: number): void {
    if (i === MODES.length) {
      // Over the title, which waits paused until Back.
      this.scene.pause();
      this.scene.launch('Settings', { resume: ['Title'] });
      this.scene.bringToTop('Settings');
      return;
    }
    const setup: MatchSetup = { slots: MODES[i].slots, arena: this.arena, bonuses: this.bonuses };
    this.scene.start('Game', setup);
  }
}
