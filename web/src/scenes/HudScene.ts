import Phaser from 'phaser';
import { Config } from '../config';
import { POWER_UPS } from '../game/PowerUps';
import { hex, SLOT_COLORS, type Kubotz } from '../game/Kubotz';
import { TEAM_NAMES } from '../game/Match';
import type { GameScene } from './GameScene';
import { MenuInput } from './MenuInput';
import { drawPlate, drawStrip, PlateButton } from '../ui/Plate';
import { body, heading, HeadingText, NEON } from '../ui/Type';

const PAUSE_ITEMS = ['Resume', 'Settings', 'Controls', 'Quit to title'];

/** Fighter card size, and the gap between cards along the bottom edge. */
const CARD_W = 270;
const CARD_H = 78;
const CARD_GAP = 14;
/** The helmet-colour slab holding the P1 / CPU tag. */
const SLAB = 64;
const SEGMENTS = 12;

interface Card {
  container: Phaser.GameObjects.Container;
  bars: Phaser.GameObjects.Graphics;
  kills: Phaser.GameObjects.Text;
  chip: Phaser.GameObjects.Graphics;
  status: Phaser.GameObjects.Text;
  /** The status shown (its chip is redrawn only when it changes). */
  shown: string;
}

/**
 * HUDSystem: a "Kube plate" card per robot along the bottom edge (tag on a
 * slab in its helmet colour, segmented health, guard, stock pips, K.O.s),
 * a status chip above each card, and the match timer plate top centre.
 */
export class HudScene extends Phaser.Scene {
  private game_!: GameScene;
  private cards = new Map<Kubotz, Card>();
  private timer!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerPlate!: Phaser.GameObjects.Graphics;
  private bannerText!: HeadingText;
  private hint!: Phaser.GameObjects.Text;
  /** The pause menu: the arena dimmed, a plate of buttons under PAUSED. */
  private pause!: Phaser.GameObjects.Container;
  private pauseItems: PlateButton[] = [];
  private pauseSelected = 0;
  private pauseMenu!: MenuInput;

  constructor() { super('Hud'); }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;
    this.cards.clear();
    this.pauseItems = [];
    const { width, height } = this.scale;

    const tg = this.add.graphics();
    drawPlate(tg, width / 2 - 64, -14, 128, 50, { cut: 12 });
    drawStrip(tg, width / 2 - 46, 35, width / 2 + 46, 35, NEON, 2);
    this.timer = this.add.text(width / 2, 18, '0:00', body(22, { fontStyle: '800' })).setOrigin(0.5);

    // One card per robot in seat order, centred along the bottom edge.
    const fighters = this.game_.fighters;
    const left = (width - fighters.length * CARD_W - (fighters.length - 1) * CARD_GAP) / 2;
    fighters.forEach((k, i) => this.cards.set(k, this.makeCard(k, left + i * (CARD_W + CARD_GAP), height - CARD_H - 10)));

    this.banner = this.add.container(width / 2, height / 2).setVisible(false).setDepth(10);
    this.bannerPlate = this.add.graphics();
    this.bannerText = heading(this, 0, -14, '', 72);
    this.hint = this.add.text(0, 58, '', body(20, { color: '#cfe9ff', fontStyle: '500' })).setOrigin(0.5);
    this.banner.add([this.bannerPlate, this.bannerText, this.hint]);

    this.pause = this.add.container(width / 2, height / 2 - 30).setVisible(false).setDepth(10);
    // A light dim: the paused match behind stays readable, its scan lines heavier and colours richer (fx/Grade.ts uPause).
    const dim = this.add.rectangle(0, 30, width, height, 0x02050c, 0.3);
    const pg = this.add.graphics();
    drawPlate(pg, -170, -190, 340, 446, { cut: 24 });
    drawStrip(pg, -170, -166, -170, 256, NEON, 4);
    drawStrip(pg, -140, -92, 140, -92, NEON, 2);
    const title = heading(this, 0, -140, 'PAUSED', 54);
    const keys = this.add.text(0, 228, 'Esc / Start / B resume  ·  Q / Select quit', body(14, { fontStyle: '500', color: '#8fb6d8' })).setOrigin(0.5);
    this.pause.add([dim, pg, title, keys]);
    PAUSE_ITEMS.forEach((label, i) => {
      const b = new PlateButton(this, 0, -36 + i * 62, 280, 48, label, { size: 22 });
      b.on('pointerover', () => this.selectPause(i));
      b.on('pointerdown', () => this.choosePause(i));
      this.pause.add(b);
      this.pauseItems.push(b);
    });
    this.pauseMenu = new MenuInput({
      move: (dx, dy) => this.selectPause((this.pauseSelected + (dx || dy) + PAUSE_ITEMS.length) % PAUSE_ITEMS.length),
      confirm: () => this.choosePause(this.pauseSelected),
      // Esc and Start already toggle the pause in the match: B resumes here.
      back: () => { if (this.game_.paused) this.game_.togglePause(); },
    }, false, { back: ['B'] });
    // Back from the settings or controls: the Esc or B that closed them must not resume the match too.
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.pauseMenu.reset());

    this.game_.events.on('match-over', this.onMatchOver, this);
    this.game_.events.on('pause', this.onPause, this);
    this.game_.events.on('countdown', this.onCountdown, this);
    this.game_.events.on('continue-prompt', this.onContinuePrompt, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME);
      this.game_.events.off('continue-prompt', this.onContinuePrompt, this);
      this.game_.events.off('countdown', this.onCountdown, this);
      this.game_.events.off('match-over', this.onMatchOver, this);
      this.game_.events.off('pause', this.onPause, this);
    });
  }

  private makeCard(k: Kubotz, x: number, y: number): Card {
    const color = k.look.color;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    drawPlate(g, 0, 0, CARD_W, CARD_H);
    // The tag slab, in the helmet colour, with a light top edge like the tag art.
    g.fillStyle(color, 0.88).fillPoints([new Phaser.Math.Vector2(0, 14), new Phaser.Math.Vector2(14, 0),
      new Phaser.Math.Vector2(SLAB, 0), new Phaser.Math.Vector2(SLAB, CARD_H), new Phaser.Math.Vector2(0, CARD_H)], true);
    g.fillStyle(0xffffff, 0.22).fillRect(14, 0, SLAB - 14, 5);
    g.fillStyle(0x000000, 0.25).fillRect(SLAB - 3, 0, 3, CARD_H);
    drawStrip(g, 0, CARD_H - 1, CARD_W - 14, CARD_H - 1, color, 2);
    const who = k.tagKey.slice('label-'.length).split(':')[0];
    const tag = heading(this, SLAB / 2, CARD_H / 2 + 2, who, who.length > 2 ? 26 : 34, { glow: Phaser.Display.Color.IntegerToColor(color).darken(50).color, glitch: false }); // a player tag, not a title
    const name = this.add.text(SLAB + 10, 8, k.name, body(15, { fontStyle: '800' }));
    const team = this.add.text(CARD_W - 8, 10, `${TEAM_NAMES[k.team] ?? ''} team`.toUpperCase(),
      body(11, { fontStyle: '800', color: '#' + hex(color) })).setOrigin(1, 0);
    const bars = this.add.graphics();
    const kills = this.add.text(CARD_W - 8, 56, 'K.O. 0', body(13, { fontStyle: '800', color: '#cfe9ff' })).setOrigin(1, 0.5);
    const chip = this.add.graphics();
    const status = this.add.text(SLAB + 8, -14, '', body(11, { fontStyle: '800' })).setOrigin(0, 0.5);
    c.add([g, tag, name, team, bars, kills, chip, status]);
    return { container: c, bars, kills, chip, status, shown: '' };
  }

  update(): void {
    const g = this.game_;
    if (!g?.fighters) return;
    if (g.paused) this.pauseMenu.update(this.time.now);
    const time = g.clock; // the match clock stands still while paused
    // Counts up, or down to the time limit.
    const ms = Math.max(0, time - g.startedAt);
    const shown = g.timeLimit ? Math.ceil(Math.max(0, g.timeLimit - ms) / 1000) : Math.floor(ms / 1000);
    if (g.winnerTeam === undefined && !g.paused) {
      this.timer.setText(`${Math.floor(shown / 60)}:${String(shown % 60).padStart(2, '0')}`);
      this.timer.setColor(g.timeLimit && shown <= 10 ? '#ff6a5a' : '#ffffff');
    }
    for (const [k, card] of this.cards) this.drawCard(k, card, time);
  }

  private drawCard(k: Kubotz, card: Card, time: number): void {
    const b = card.bars.clear();
    const x0 = SLAB + 10;
    const w = CARD_W - x0 - 10;
    // Health: segments like the Kube's light strips, red when low.
    const hp = Phaser.Math.Clamp(k.health / Config.KUBOTZ_HEALTH, 0, 1);
    const seg = w / SEGMENTS;
    const low = k.health <= 30;
    for (let s = 0; s < SEGMENTS; s++) {
      const fill = Phaser.Math.Clamp(hp * SEGMENTS - s, 0, 1);
      const sx = x0 + s * seg;
      b.fillStyle(0xffffff, 0.08).fillRect(sx, 30, seg - 2, 12);
      if (fill > 0) b.fillStyle(low ? 0xff4a4a : 0xe9f6ff, 0.95).fillRect(sx, 30, (seg - 2) * fill, 12);
    }
    if (k.shield > 0) b.fillStyle(0x66ccff, 0.9).fillRect(x0, 30, (w - 2) * Math.min(1, k.shield / 100), 4);
    // Guard: a thin amber line, red while broken.
    const guard = Phaser.Math.Clamp(k.guard / Config.GUARD_MAX, 0, 1);
    const stunned = time < k.stunnedUntil;
    b.fillStyle(0xffffff, 0.08).fillRect(x0, 46, w - 2, 4);
    b.fillStyle(stunned ? 0xff5252 : guard >= 1 ? 0xffcf4a : 0xbfa640, 0.95).fillRect(x0, 46, (w - 2) * guard, 4);
    // Stock: cube pips in the helmet colour.
    const stocks = this.game_.stocks;
    const step = Math.min(16, (w - 70) / Math.max(1, stocks - 1));
    for (let s = 0; s < stocks; s++) {
      const cx = x0 + 6 + s * step;
      const pip = new Phaser.Geom.Polygon([cx, 50, cx + 6, 56, cx, 62, cx - 6, 56]);
      if (s < k.lives) b.fillStyle(k.look.color, 1).fillPoints(pip.points, true).lineStyle(1, 0xffffff, 0.55).strokePoints(pip.points, true);
      else b.lineStyle(1, 0xffffff, 0.2).strokePoints(pip.points, true);
    }
    card.kills.setText(`K.O. ${k.kills}`);

    // The status chip above the card.
    let status = '';
    let tone = NEON;
    let left = 0;
    const pu = k.powerUps[0];
    if (k.eliminated) { status = 'ELIMINATED'; tone = 0xff5252; }
    else if (stunned) { status = 'GUARD BROKEN'; tone = 0xff5252; }
    else if (!k.isAlive()) status = `RESPAWN ${Math.max(0, Math.ceil((k.respawnAt - time) / 1000))}`;
    else if (pu) {
      status = k.powerUps.map((p) => `${POWER_UPS[p.type].label} ${Math.ceil((p.endsAt - time) / 1000)}s`).join('  ·  ').toUpperCase();
      tone = POWER_UPS[pu.type].color;
      left = Phaser.Math.Clamp((pu.endsAt - time) / Config.POWERUP_DURATION, 0, 1);
    }
    if (status !== card.shown) {
      card.shown = status;
      card.status.setText(status).setColor('#' + hex(Phaser.Display.Color.IntegerToColor(tone).lighten(25).color));
    }
    const chip = card.chip.clear();
    if (status) {
      const cw = card.status.width + 16;
      chip.fillStyle(Phaser.Display.Color.IntegerToColor(tone).darken(60).color, 0.9)
        .fillPoints([new Phaser.Math.Vector2(SLAB, -18 - 6), new Phaser.Math.Vector2(SLAB + cw, -24), new Phaser.Math.Vector2(SLAB + cw, -8),
          new Phaser.Math.Vector2(SLAB + cw - 6, -4), new Phaser.Math.Vector2(SLAB, -4)], true);
      chip.lineStyle(1, tone, 0.9).strokeRect(SLAB, -24, cw, 20);
      if (left > 0) chip.fillStyle(tone, 1).fillRect(SLAB + 2, -7, (cw - 4) * left, 2);
    }
    card.container.setAlpha(k.eliminated ? 0.45 : 1);
  }

  private onCountdown(word: string): void {
    const t = heading(this, this.scale.width / 2, this.scale.height / 2 - 40, word, 140, { glitch: { first: 0 } }).setDepth(20).setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 300, onComplete: () => t.destroy() });
  }

  private onMatchOver(winnerTeam: number | null): void {
    // One robot: its name; a team of several: the team.
    const team = winnerTeam === null ? [] : this.game_.teamOf(winnerTeam);
    const title = team.length === 1 ? team[0].name : `${TEAM_NAMES[winnerTeam!]} team`.toUpperCase();
    const color = winnerTeam === null ? NEON : SLOT_COLORS[winnerTeam];
    this.bannerText.setText(winnerTeam === null ? 'DRAW' : `${title} WINS`).setGlow(color);
    // A plate band lit in the winner's colour.
    const w = Math.max(560, this.bannerText.displayWidth + 140);
    drawStrip(drawPlate(this.bannerPlate.clear(), -w / 2, -70, w, 150, { cut: 28 }), -w / 2 + 28, -70, w / 2, -70, color, 3);
    drawStrip(this.bannerPlate, -w / 2, 80, w / 2 - 28, 80, color, 3);
    this.hint.setText('');
    // High up, so the camera's close-up of the winners' dance stays clear.
    this.banner.setY(150).setVisible(true).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: this.banner, scale: 1, alpha: 1, duration: 400, ease: 'Back.out' });
  }

  private onPause(paused: boolean): void {
    this.pause.setVisible(paused);
    // The paused look on the match behind (the Hud's tweens run while the match's are paused).
    const fx = { k: (this.registry.get('pauseFx') as number | undefined) ?? 0 };
    this.tweens.killTweensOf(fx);
    this.tweens.add({ targets: fx, k: paused ? 1 : 0, duration: paused ? 220 : 140, ease: 'Quad.out',
      onUpdate: () => this.registry.set('pauseFx', fx.k) });
    this.pauseMenu.reset();
    this.pauseItems.forEach((b) => b.setSelected(false));
    this.selectPause(0);
  }

  private selectPause(i: number): void {
    this.pauseSelected = i;
    this.pauseItems.forEach((b, j) => b.setSelected(j === i));
  }

  private choosePause(i: number): void {
    if (!this.game_.paused) return;
    if (i === 0) this.game_.togglePause();
    else if (i === 1) this.game_.openOverlay('Settings');
    else if (i === 2) this.game_.openOverlay('Controls');
    else this.game_.backToTitle();
  }

  /** After the winners have danced a little: what continues to the results. */
  private onContinuePrompt(): void {
    const hint = this.hint.setText('Press attack / Enter / A to continue').setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 1, duration: 300 });
    this.tweens.add({ targets: hint, scale: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 300 });
  }
}
