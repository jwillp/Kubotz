import Phaser from 'phaser';
import { ARENA_INFO } from '../map/Arenas';
import { arenaMap, eachTile } from '../map/ArenaArt';
import type { TmxMap } from '../map/TmxMap';
import { SLOT_COLORS } from '../game/Kubotz';
import { BONUS_RATES, RATE_ORDER, type BonusRate, type FighterSpec, type MatchSetup } from '../game/Match';
import { BODY_FAMILY, heading } from '../ui/Type';
import { arenaStyle, retroBackdrop, setArenaStyle, STYLE_NAMES } from '../fx/Retro';

const PREVIEW_W = 600;
const PREVIEW_Y = 340;
const PAD = { B: 0, A: 1, Y: 2, X: 3, START: 9, LEFT: 14, RIGHT: 15 } as const;

const font = (size: number, color = '#ffffff') => ({ fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: `${size}px`, color });

/**
 * The arena select: a picture of each arena (its tile art drawn small, the
 * way GameScene bakes it, with the platform rims and the portals), its name
 * and blurb; left / right to change, attack / Enter to fight, special / Esc
 * back to the join screen. The power-up rate and the arena style (Modern or
 * Retro) are set here too.
 */
export class ArenaScene extends Phaser.Scene {
  private fighters: FighterSpec[] = [];
  private arena = 0;
  private bonuses: BonusRate = 'normal';
  private preview!: Phaser.GameObjects.Image;
  private frame!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private blurbText!: Phaser.GameObjects.Text;
  private bonusText!: Phaser.GameObjects.Text;
  private styleText!: Phaser.GameObjects.Text;
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
    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height).setAlpha(0.7);
    this.add.rectangle(width / 2, height / 2, width, height, 0x050b18, 0.55);
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
    this.styleText = this.add.text(width / 2, below + 162, '', font(20)).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleStyle());
    this.add.text(width / 2 - 20, height - 22, '◀ ▶ change   ·   attack / Enter / A: fight!   ·   special / Esc / B: back   ·   B key / gamepad X: power-ups   ·   T / Y: style', {
      fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '15px', color: '#9fe3ff',
    }).setOrigin(0.5);
    const back = this.add.text(70, height - 22, '◀ Back', font(20, '#29abe2')).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.back());
    const fight = this.add.text(width - 80, height - 22, 'FIGHT!', font(26, '#29abe2')).setOrigin(0.5).setInteractive({ useHandCursor: true });
    fight.on('pointerdown', () => this.go());

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.pick(-1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.pick(1));
    for (const k of ['ENTER', 'SPACE', 'O', 'J', 'COMMA', 'NUMPAD_ONE']) kb.on(`keydown-${k}`, () => this.go());
    for (const k of ['ESC', 'P', 'N', 'BACKSPACE']) kb.on(`keydown-${k}`, () => this.back());
    kb.on('keydown-B', () => this.pickBonuses());
    kb.on('keydown-T', () => this.toggleStyle());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === PAD.A || button.index === PAD.START) this.go();
      else if (button.index === PAD.B) this.back();
      else if (button.index === PAD.X) this.pickBonuses();
      else if (button.index === PAD.Y) this.toggleStyle();
    });
    this.pick(0);
    this.pickBonuses(0);
    this.toggleStyle(false);
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
    if (d !== 0) {
      this.preview.setX(width / 2 + d * 40).setAlpha(0.3);
      this.tweens.add({ targets: this.preview, x: width / 2, alpha: 1, duration: 180, ease: 'Cubic.out' });
    }
    const w = this.preview.width;
    const h = this.preview.height;
    this.frame.clear().lineStyle(4, 0x29abe2, 1).strokeRoundedRect(width / 2 - w / 2 - 6, PREVIEW_Y - h / 2 - 6, w + 12, h + 12, 10);
    this.nameText.setText(ARENA_INFO[this.arena].name);
    this.blurbText.setText(ARENA_INFO[this.arena].blurb);
    this.dots.forEach((dot, i) => dot.setFillStyle(i === this.arena ? 0x29abe2 : 0xffffff, i === this.arena ? 1 : 0.4));
  }

  private pickBonuses(delta = 1): void {
    this.bonuses = RATE_ORDER[(RATE_ORDER.indexOf(this.bonuses) + delta) % RATE_ORDER.length];
    this.registry.set('bonuses', this.bonuses);
    this.bonusText.setText(`Power-ups: ${BONUS_RATES[this.bonuses].label}  ·  click to change`);
  }

  private toggleStyle(change = true): void {
    if (change) setArenaStyle(arenaStyle() === 'retro' ? 'modern' : 'retro');
    this.styleText.setText(`Style: ${STYLE_NAMES[arenaStyle()]}  ·  click to change`);
    if (change) this.pick(0);
  }

  private go(): void {
    if (this.fighters.length < 2) { this.back(); return; }
    const setup: MatchSetup = { fighters: this.fighters, arena: this.arena, bonuses: this.bonuses };
    this.scene.start('Game', setup);
  }

  private back(): void {
    this.scene.start('Join');
  }

  /**
   * A picture of the arena (made once per arena): the backdrop, the tile art
   * drawn small, a lit rim along every block like the game's, and the portals.
   */
  private thumbnail(index: number): string {
    const style = arenaStyle();
    const key = `arena-thumb:${style}:${index}`;
    if (this.textures.exists(key)) return key;
    const m: TmxMap = arenaMap(index, this.registry.get('map'));
    const mapW = m.width * m.tileWidth;
    const mapH = m.height * m.tileHeight;
    const s = PREVIEW_W / mapW;
    const tex = this.textures.createCanvas(key, PREVIEW_W, Math.round(mapH * s))!;
    const ctx = tex.getContext();
    const retro = style === 'retro';
    const bg = this.textures.get(retro ? retroBackdrop(this.textures) : 'bg').getSourceImage() as HTMLImageElement;
    ctx.drawImage(bg, 0, 0, tex.width, tex.height);
    ctx.fillStyle = retro ? 'rgba(10, 10, 8, 0.2)' : 'rgba(5, 11, 24, 0.35)';
    ctx.fillRect(0, 0, tex.width, tex.height);
    eachTile(this.textures, m, (source, _key, x, y) => ctx.drawImage(source, x * s, y * s, source.width * s, source.height * s), style);
    ctx.globalCompositeOperation = 'lighter';
    for (const o of m.objects) {
      if (o.type === 'WALL' || o.type === 'STATIC_PLATFORM') {
        ctx.strokeStyle = retro ? 'rgba(118, 226, 240, 0.8)' : 'rgba(41, 171, 226, 0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(o.x * s, o.y * s + 1); ctx.lineTo((o.x + o.width) * s, o.y * s + 1); ctx.stroke();
        ctx.strokeStyle = 'rgba(159, 230, 255, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (o.type === 'WARP_ZONE') {
        const cx = (o.x + o.width / 2) * s;
        const cy = (o.y + o.height / 2) * s;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.height * s * 0.6);
        g.addColorStop(0, 'rgba(160, 120, 255, 0.9)');
        g.addColorStop(1, 'rgba(60, 40, 160, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(cx, cy, o.width * s * 1.6, o.height * s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    tex.refresh();
    return key;
  }
}
