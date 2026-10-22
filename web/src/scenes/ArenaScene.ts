import Phaser from 'phaser';
import { ARENA_INFO } from '../map/Arenas';
import { arenaThumbnail } from '../map/ArenaThumb';
import { SLOT_COLORS } from '../game/Kubotz';
import { BONUS_RATES, RATE_ORDER, type BonusRate, type FighterSpec, type MatchSetup } from '../game/Match';
import { BODY_FAMILY, heading } from '../ui/Type';
import { drawGlow, drawPlate, drawStrip, footer, kubeBackdrop, shutter } from '../ui/Plate';

const PREVIEW_W = 600;
const PREVIEW_Y = 340;
const PAD = { B: 0, A: 1, Y: 2, X: 3, START: 9, LEFT: 14, RIGHT: 15 } as const;

const font = (size: number, color = '#ffffff') => ({ fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: `${size}px`, color });

/**
 * The arena select: a picture of each arena (its tile art drawn small, the
 * way GameScene bakes it, with the platform rims and the portals), its name
 * and blurb; left / right to change, attack / Enter to fight, special / Esc
 * back to the join screen. The power-up rate is set here too.
 */
export class ArenaScene extends Phaser.Scene {
  private fighters: FighterSpec[] = [];
  private arena = 0;
  private bonuses: BonusRate = 'normal';
  private preview!: Phaser.GameObjects.Image;
  /** The preview is GameScene's live render of the arena, not the picture. */
  private live = false;
  private frame!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private blurbText!: Phaser.GameObjects.Text;
  private bonusText!: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Arc[] = [];
  private padDir = new Map<number, number>();

  constructor() { super('Arena'); }

  init(data: { fighters?: FighterSpec[] }): void {
    this.fighters = data.fighters ?? [];
    this.dots = [];
    this.padDir.clear();
  }

  create(): void {
    const { width, height } = this.scale;
    // The preview is the arena itself, rendered by GameScene into the frame
    // (WebGL: lit, with the backdrop behind it); the canvas renderer keeps the drawn picture.
    this.live = this.sys.renderer.type === Phaser.WEBGL;
    kubeBackdrop(this, this.live ? 0 : 0.3);
    heading(this, width / 2, 46, 'Choose the arena', 54);

    // Who is fighting: a chip per robot in its team colour.
    const chipW = 96;
    this.fighters.forEach((f, i) => {
      const x = width / 2 + (i - (this.fighters.length - 1) / 2) * (chipW + 10);
      this.add.rectangle(x, 94, chipW, 26, SLOT_COLORS[f.team], 0.85).setStrokeStyle(2, 0xffffff, 0.6);
      this.add.text(x, 94, f.input === 'CPU' ? 'CPU' : `P${this.fighters.slice(0, i + 1).filter((g) => g.input !== 'CPU').length}`, font(15)).setOrigin(0.5);
    });

    this.arena = Phaser.Math.Clamp((this.registry.get('arena') as number | undefined) ?? 0, 0, ARENA_INFO.length - 1);
    this.bonuses = (this.registry.get('bonuses') as BonusRate | undefined) ?? 'normal';
    this.frame = this.add.graphics();
    this.preview = this.add.image(width / 2, PREVIEW_Y, this.thumbnail(this.arena));
    const arrow = (x: number, label: string, d: number) => {
      const t = this.add.text(x, PREVIEW_Y, label, font(54, '#29abe2')).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.pick(d));
      t.on('pointerover', () => t.setScale(1.12));
      t.on('pointerout', () => t.setScale(1));
    };
    arrow(width / 2 - PREVIEW_W / 2 - 60, '◀', -1);
    arrow(width / 2 + PREVIEW_W / 2 + 60, '▶', 1);
    this.preview.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.go());
    if (this.live) this.preview.setAlpha(0);

    const below = PREVIEW_Y + this.preview.height / 2;
    this.nameText = this.add.text(width / 2, below + 38, '', { ...font(36), stroke: '#0b1d33', strokeThickness: 6 }).setOrigin(0.5);
    this.blurbText = this.add.text(width / 2, below + 72, '', { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '19px', color: '#9fe3ff' }).setOrigin(0.5);
    ARENA_INFO.forEach((_, i) => {
      const dot = this.add.circle(width / 2 + (i - (ARENA_INFO.length - 1) / 2) * 26, below + 100, 7, 0xffffff)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pick(i - this.arena));
      this.dots.push(dot);
    });
    this.bonusText = this.add.text(width / 2, below + 132, '', font(20)).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pickBonuses());
    footer(this, ['◀ ▶ change   ·   attack / Enter / A: fight!   ·   special / Esc / B: back   ·   B key / gamepad X: power-ups']);
    const back = this.add.text(70, height - 20, '◀ Back', font(20, '#29abe2')).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.back());
    const fight = this.add.text(width - 80, height - 20, 'FIGHT!', font(26, '#29abe2')).setOrigin(0.5).setInteractive({ useHandCursor: true });
    fight.on('pointerdown', () => this.go());

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.pick(-1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.pick(1));
    for (const k of ['ENTER', 'SPACE', 'O', 'J', 'COMMA', 'NUMPAD_ONE']) kb.on(`keydown-${k}`, () => this.go());
    for (const k of ['ESC', 'P', 'N', 'BACKSPACE']) kb.on(`keydown-${k}`, () => this.back());
    kb.on('keydown-B', () => this.pickBonuses());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === PAD.A || button.index === PAD.START) this.go();
      else if (button.index === PAD.B) this.back();
      else if (button.index === PAD.X || button.index === PAD.Y) this.pickBonuses();
    });
    this.pick(0);
    this.pickBonuses(0);
  }

  update(): void {
    // Gamepads: D-pad or left stick, one arena per push.
    for (const pad of this.input.gamepad?.gamepads ?? []) {
      if (!pad) continue;
      const ax = pad.axes[0]?.getValue() ?? 0;
      const btn = (i: number) => (pad.buttons[i]?.value ?? 0) > 0.5;
      const dir = btn(PAD.LEFT) || ax < -0.6 ? -1 : btn(PAD.RIGHT) || ax > 0.6 ? 1 : 0;
      if (dir && dir !== this.padDir.get(pad.index)) this.pick(dir);
      this.padDir.set(pad.index, dir);
    }
  }

  private pick(d: number): void {
    this.arena = (this.arena + d + ARENA_INFO.length) % ARENA_INFO.length;
    this.registry.set('arena', this.arena);
    const { width } = this.scale;
    this.preview.setTexture(this.thumbnail(this.arena));
    if (this.live) this.showArena();
    else if (d !== 0) {
      this.preview.setX(width / 2 + d * 40).setAlpha(0.3);
      this.tweens.add({ targets: this.preview, x: width / 2, alpha: 1, duration: 180, ease: 'Cubic.out' });
    }
    const w = this.preview.width;
    const h = this.preview.height;
    // The preview set in a Kube plate, lit top left and bottom right.
    const fx = width / 2 - w / 2 - 14;
    const fy = PREVIEW_Y - h / 2 - 14;
    // The chosen arena glows, like a selected button.
    drawGlow(this.frame.clear(), fx, fy, w + 28, h + 28, { cut: 22, color: 0x29abe2 });
    drawPlate(this.frame, fx, fy, w + 28, h + 28, { cut: 22, edge: 0x29abe2, alpha: this.live ? 0 : 0.92 });
    drawStrip(this.frame, fx + 22, fy, fx + w * 0.5, fy, 0x29abe2, 3);
    drawStrip(this.frame, fx + w * 0.5, fy + h + 28, fx + w + 6, fy + h + 28, 0x29abe2, 3);
    this.nameText.setText(ARENA_INFO[this.arena].name);
    this.blurbText.setText(ARENA_INFO[this.arena].blurb);
    this.dots.forEach((dot, i) => dot.setFillStyle(i === this.arena ? 0x29abe2 : 0xffffff, i === this.arena ? 1 : 0.4));
  }

  private pickBonuses(delta = 1): void {
    this.bonuses = RATE_ORDER[(RATE_ORDER.indexOf(this.bonuses) + delta) % RATE_ORDER.length];
    this.registry.set('bonuses', this.bonuses);
    this.bonusText.setText(`Power-ups: ${BONUS_RATES[this.bonuses].label}  ·  click to change`);
  }

  private go(): void {
    if (this.fighters.length < 2) { this.back(); return; }
    const setup: MatchSetup = { fighters: this.fighters, arena: this.arena, bonuses: this.bonuses };
    shutter(this, () => { this.scene.stop('Game'); this.scene.start('Game', setup); });
  }

  private back(): void {
    shutter(this, () => { this.scene.stop('Game'); this.scene.start('Join'); });
  }

  /** Renders the chosen arena live in the frame (GameScene in preview mode, under this scene). */
  private showArena(): void {
    const { width } = this.scale;
    const w = this.preview.width;
    const h = this.preview.height;
    const setup: MatchSetup = {
      fighters: [], arena: this.arena, bonuses: this.bonuses,
      preview: { x: width / 2 - w / 2, y: PREVIEW_Y - h / 2, width: w, height: h },
    };
    const game = this.scene.get('Game');
    if (game.sys.isActive()) game.scene.restart(setup);
    else this.scene.launch('Game', setup);
    this.scene.bringToTop();
  }

  private thumbnail(index: number): string { return arenaThumbnail(this, index, PREVIEW_W); }
}
