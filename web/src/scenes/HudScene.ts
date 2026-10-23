import Phaser from 'phaser';
import { Config } from '../config';
import { POWER_UPS } from '../game/PowerUps';
import { hex, SLOT_COLORS, type Kubotz } from '../game/Kubotz';
import { BLACK_COLOR, BLACK_TEAM, isBlackTeam, TEAM_NAMES } from '../game/Match';
import { CTF_CAPTURES, HORDE_WAVES, MODES } from '../game/Modes';
import { hitGlitch } from '../fx/HitGlitch';
import { fx } from '../game/Settings';
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
/** The big titles' glitch (as on the title's logo): one step of the flicker (ms), and a burst's length coming in and going out. */
const FLICKER_MS = 45;
const GLITCH_IN_MS = 380;
const GLITCH_OUT_MS = 240;

interface Card {
  container: Phaser.GameObjects.Container;
  bars: Phaser.GameObjects.Graphics;
  kills: Phaser.GameObjects.Text;
  chip: Phaser.GameObjects.Graphics;
  status: Phaser.GameObjects.Text;
  /** The status shown (its chip is redrawn only when it changes). */
  shown: string;
  /** Infinite recharges (Sandbox, Capture the Flag): an ∞ instead of pips. */
  infinite: Phaser.GameObjects.Text;
}

/**
 * HUDSystem: a "Kube plate" card per Kubot along the bottom edge (tag on a
 * slab in its helmet colour, segmented health, guard, recharge pips, K.O.s),
 * a status chip above each card, and the match timer plate top centre.
 */
export class HudScene extends Phaser.Scene {
  private game_!: GameScene;
  private cards = new Map<Kubotz, Card>();
  private timer!: Phaser.GameObjects.Text;
  /** Horde: the wave and the black-team Kubotz left, under the timer. */
  private waveText?: Phaser.GameObjects.Text;
  /** The behaviour view (F9): the teams' strategies, under the mode's line. */
  private strategyText!: Phaser.GameObjects.Text;
  /** Capture the Flag: a bubble at the screen's edge for each flag out of view, and its state under it. */
  private bubbles!: Phaser.GameObjects.Graphics;
  private bubbleLabels: Phaser.GameObjects.Text[] = [];
  private banner!: Phaser.GameObjects.Container;
  private bannerPlate!: Phaser.GameObjects.Graphics;
  private bannerText!: HeadingText;
  private hint!: Phaser.GameObjects.Text;
  /** The pause menu: the arena dimmed, a plate of buttons under PAUSED. */
  private pause!: Phaser.GameObjects.Container;
  private pauseItems: PlateButton[] = [];
  private pauseSelected = 0;
  private pauseMenu!: MenuInput;
  /** Big titles glitching now: the title, when the burst started and the strength of each flicker step. */
  private glitches: { obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text; at: number; steps: number[] }[] = [];

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

    // The mode's line under the timer: Horde's wave, the sandbox dummy, the training count, the captures.
    this.waveText = undefined;
    const mode = MODES[this.game_.mode];
    if (mode.horde || mode.sandbox || mode.trial || mode.ctf || mode.ball) {
      drawPlate(tg, width / 2 - 170, 40, 340, 30, { cut: 10, alpha: 0.85 });
      this.waveText = this.add.text(width / 2, 55, '', body(15, { fontStyle: '800', color: '#cfe9ff' })).setOrigin(0.5);
    }
    this.strategyText = this.add.text(width / 2, 84, '', body(14, { fontStyle: '800', color: '#ffd27a' })).setOrigin(0.5).setShadow(0, 2, '#02060c', 0, false, true);
    this.bubbles = this.add.graphics().setDepth(15);
    this.bubbleLabels = [];

    // One card per Kubot in seat order, centred along the bottom edge; the black team and the guardians have none.
    this.syncCards();

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
    this.game_.events.on('wave', this.onWave, this);
    this.game_.events.on('wave-cleared', this.onWaveCleared, this);
    this.game_.events.on('bonus-recharge', this.onBonusRecharge, this);
    this.game_.events.on('capture', this.onCapture, this);
    this.game_.events.on('goal', this.onGoal, this);
    this.game_.events.on('dummy', this.onDummy, this);
    this.glitches = [];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME);
      this.game_.events.off('wave', this.onWave, this);
      this.game_.events.off('wave-cleared', this.onWaveCleared, this);
      this.game_.events.off('bonus-recharge', this.onBonusRecharge, this);
      this.game_.events.off('capture', this.onCapture, this);
      this.game_.events.off('goal', this.onGoal, this);
      this.game_.events.off('dummy', this.onDummy, this);
      this.game_.events.off('continue-prompt', this.onContinuePrompt, this);
      this.game_.events.off('countdown', this.onCountdown, this);
      this.game_.events.off('match-over', this.onMatchOver, this);
      this.game_.events.off('pause', this.onPause, this);
    });
  }

  /** Cards for the Kubotz that have one (not the black team, not guardians, not a defeated training CPU), centred along the bottom. */
  private syncCards(): void {
    const { width, height } = this.scale;
    const trial = MODES[this.game_.mode].trial;
    const shown = this.game_.fighters.filter((k) => (!isBlackTeam(k) || !!MODES[this.game_.mode].ball || trial) && k.role !== 'guardian' && !k.hudless
      && !(trial && k.index >= this.game_.specs.length && (k.eliminated || k.appearAt > this.game_.clock)));
    for (const k of shown) if (!this.cards.has(k)) this.cards.set(k, this.makeCard(k, 0, height - CARD_H - 10));
    const left = (width - shown.length * CARD_W - (shown.length - 1) * CARD_GAP) / 2;
    for (const [k, card] of this.cards) {
      const i = shown.indexOf(k);
      card.container.setVisible(i >= 0);
      if (i >= 0) card.container.x = left + i * (CARD_W + CARD_GAP);
    }
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
    const opponent = MODES[this.game_.mode].trial && k.index >= this.game_.specs.length;
    const team = this.add.text(CARD_W - 8, 10, opponent ? 'OPPONENT' : `${TEAM_NAMES[k.team] ?? (isBlackTeam(k) ? 'Black' : '')} team`.toUpperCase(),
      body(11, { fontStyle: '800', color: '#' + hex(color) })).setOrigin(1, 0);
    const bars = this.add.graphics();
    const kills = this.add.text(CARD_W - 8, 56, 'K.O. 0', body(13, { fontStyle: '800', color: '#cfe9ff' })).setOrigin(1, 0.5);
    const chip = this.add.graphics();
    const status = this.add.text(SLAB + 8, -14, '', body(11, { fontStyle: '800' })).setOrigin(0, 0.5);
    const infinite = this.add.text(SLAB + 12, 56, '∞', body(20, { fontStyle: '800', color: '#' + hex(color) })).setOrigin(0, 0.5).setVisible(false);
    c.add([g, tag, name, team, bars, kills, chip, status, infinite]);
    return { container: c, bars, kills, chip, status, shown: '', infinite };
  }

  update(): void {
    this.updateGlitches();
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
    if (this.waveText) {
      const mode = MODES[g.mode];
      const left = g.fighters.filter((k) => isBlackTeam(k) && !k.eliminated).length;
      this.waveText.setText(mode.sandbox ? `DUMMY: ${(g.dummyMode() ?? '').toUpperCase()}   ·   SELECT / TAB: CHANGE`
        : mode.trial ? `DEFEATED ${g.defeated} / ${g.target}`
          : mode.ctf ? `CAPTURES   RED ${g.captures[0]}  –  ${g.captures[1]} BLUE   ·   FIRST TO ${CTF_CAPTURES}`
            : mode.ball ? `RED ${g.captures[0]}  –  ${g.captures[1]} BLUE   ·   ${g.scoreLimit ? `FIRST TO ${g.scoreLimit}` : 'NO LIMIT'}${mode.ball === 'skychase' ? '   ·   SPARK +30' : ''}`
            : g.wave ? `WAVE ${g.wave} / ${HORDE_WAVES}  ·  ${left} LEFT` : `${HORDE_WAVES} WAVES`);
    }
    this.drawFlagBubbles();
    this.strategyText.setText(g.showRoles ? (g.strategyLine() ?? '').toUpperCase() : '');
    // Training: each CPU coming in gets a card (its health in sight), gone once defeated.
    if (MODES[g.mode].trial) this.syncCards();
    for (const [k, card] of this.cards) if (card.container.visible) this.drawCard(k, card, time);
  }

  /** Horde: a new wave's number comes in big, like the countdown. */
  private onWave(wave: number): void {
    const final = wave === HORDE_WAVES;
    const t = heading(this, this.scale.width / 2, this.scale.height / 2 - 60, final ? 'FINAL WAVE' : `WAVE ${wave}`, 96).setDepth(20).setScale(1.5).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 240, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 400, onComplete: () => t.destroy() });
    this.glitchTitle(t, 1100);
  }

  private onWaveCleared(wave: number): void {
    const t = this.add.text(this.scale.width / 2, this.scale.height / 2 - 60, `WAVE ${wave} CLEARED`, body(34, { fontStyle: 'italic 800', color: '#bfe9ff' }))
      .setOrigin(0.5).setShadow(0, 3, '#02060c', 0, false, true).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: t.y - 12, duration: 260, ease: 'Quad.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400, onComplete: () => t.destroy() });
    this.glitchTitle(t, 1500);
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
    // Recharge: cube pips in the helmet colour.
    // Horde's bonus recharges add pips; a training CPU shows its own (one).
    const foe = MODES[this.game_.mode].trial && k.index >= this.game_.specs.length;
    // (Below 0: infinite, as an arena's test match sets it.)
    const all = this.game_.recharges < 0 ? Infinity : this.game_.recharges;
    const recharges = foe ? k.lives : Math.max(all, k.lives);
    card.infinite.setVisible(!Number.isFinite(recharges));
    if (!Number.isFinite(recharges)) { card.kills.setText(`K.O. ${k.kills}`); return this.drawStatus(k, card, time, stunned); }
    const step = Math.min(16, (w - 70) / Math.max(1, recharges - 1));
    for (let s = 0; s < recharges; s++) {
      const cx = x0 + 6 + s * step;
      const pip = new Phaser.Geom.Polygon([cx, 50, cx + 6, 56, cx, 62, cx - 6, 56]);
      if (s < k.lives) b.fillStyle(k.look.color, 1).fillPoints(pip.points, true).lineStyle(1, 0xffffff, 0.55).strokePoints(pip.points, true);
      else b.lineStyle(1, 0xffffff, 0.2).strokePoints(pip.points, true);
    }
    card.kills.setText(`K.O. ${k.kills}`);
    this.drawStatus(k, card, time, stunned);
  }

  /** The status chip above a card, and the card dimmed once eliminated. */
  private drawStatus(k: Kubotz, card: Card, time: number, stunned: boolean): void {
    // The status chip above the card.
    let status = '';
    let tone = NEON;
    let left = 0;
    const pu = k.powerUps[0];
    if (k.eliminated) { status = 'TERMINATED'; tone = 0xff5252; }
    else if (stunned) { status = 'GUARD BROKEN'; tone = 0xff5252; }
    else if (!k.isAlive()) status = Number.isFinite(k.respawnAt) ? `RESPAWN ${Math.max(0, Math.ceil((k.respawnAt - time) / 1000))}` : 'OUT UNTIL THE NEXT GOAL';
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
    this.glitchTitle(t, 650);
  }

  /**
   * A big title glitches like the title screen's logo (tearing, RGB split,
   * scan lines): a hard burst as it comes in that settles, and a short one
   * as it goes, `outAt` ms later.
   */
  private glitchTitle(obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text, outAt: number): void {
    const burst = (ms: number, first: number) => {
      const n = Math.ceil(ms / FLICKER_MS);
      const steps = Array.from({ length: n }, (_, i) => (Math.random() < 0.25 ? 0 : Phaser.Math.FloatBetween(0.35, 1)) * (1 - 0.6 * (i / n)));
      steps[0] = first;
      this.glitches.push({ obj, at: this.time.now, steps });
      hitGlitch(obj, 0); // a new seed, so no two bursts tear alike
    };
    burst(GLITCH_IN_MS, 1);
    this.time.delayedCall(outAt, () => { if (obj.active) burst(GLITCH_OUT_MS, 0.8); });
  }

  private updateGlitches(): void {
    const now = this.time.now;
    this.glitches = this.glitches.filter((gl) => {
      if (!gl.obj.active) return false;
      const t = now - gl.at;
      const amount = gl.steps[Math.floor(t / FLICKER_MS)] ?? 0;
      hitGlitch(gl.obj, fx().distortion ? amount : 0);
      // Sideways jolts on the hardest steps.
      if (amount > 0.6) gl.obj.x = this.scale.width / 2 + Phaser.Math.Between(-6, 6) * amount;
      else gl.obj.x = this.scale.width / 2;
      return t < gl.steps.length * FLICKER_MS;
    });
  }

  /**
   * Capture the Flag: a flag out of view shows as a bubble on the screen's
   * edge in its direction (as Smash shows a player off screen), the flag
   * drawn inside, with where it is under it: home, taken or dropped.
   */
  private drawFlagBubbles(): void {
    const g = this.bubbles.clear();
    const marks = this.game_.markers();
    const cam = this.game_.cameras.main;
    const { width, height } = this.scale;
    while (this.bubbleLabels.length < marks.length) this.bubbleLabels.push(this.add.text(0, 0, '', body(11, { fontStyle: '800', color: '#e9f6ff' })).setOrigin(0.5).setDepth(15));
    marks.forEach((f, i) => {
      const label = this.bubbleLabels[i];
      const sx = (f.x - cam.worldView.x) * cam.zoom;
      const sy = (f.y - cam.worldView.y) * cam.zoom;
      const inView = sx > 0 && sx < width && sy > 0 && sy < height;
      label?.setVisible(!inView && this.game_.winnerTeam === undefined);
      if (inView || this.game_.winnerTeam !== undefined) return;
      const R = 26;
      const bx = Phaser.Math.Clamp(sx, 40, width - 40);
      const by = Phaser.Math.Clamp(sy, 100, height - 140);
      const ring = f.color === BLACK_COLOR ? 0x8d96a6 : f.color;
      // A pointer towards the flag, then the bubble.
      const a = Math.atan2(sy - by, sx - bx);
      const tip = { x: bx + Math.cos(a) * (R + 12), y: by + Math.sin(a) * (R + 12) };
      g.fillStyle(ring, 0.95).fillTriangle(tip.x, tip.y, bx + Math.cos(a + 0.5) * R, by + Math.sin(a + 0.5) * R, bx + Math.cos(a - 0.5) * R, by + Math.sin(a - 0.5) * R);
      g.fillStyle(0x0d1520, 0.92).fillCircle(bx, by, R);
      g.lineStyle(3, ring, 1).strokeCircle(bx, by, R);
      // Inside: the flag (a pole and its cloth), or the ball.
      if (f.flag) {
        g.lineStyle(3, 0x8d96a6, 1).lineBetween(bx - 7, by + 14, bx - 7, by - 14);
        g.fillStyle(f.color === BLACK_COLOR ? 0x3a3e46 : f.color, 1).fillTriangle(bx - 6, by - 14, bx + 13, by - 8, bx - 6, by - 1);
      } else {
        g.fillStyle(f.color, 1).fillCircle(bx, by, 10);
        g.fillStyle(0xffffff, 0.35).fillCircle(bx - 3, by - 3, 4);
      }
      label?.setPosition(bx, by + R + 10).setText(f.label)
        .setColor(f.label === 'HOME' || f.label === 'BALL' ? '#9fe3ff' : '#ffd27a');
    });
  }

  /** Capture the Flag: a capture's title, in the scoring team's colour. */
  private onCapture(side: number): void {
    const t = heading(this, this.scale.width / 2, this.scale.height / 2 - 60, side === 0 ? 'RED TEAM SCORES' : 'BLUE TEAM SCORES', 80).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 200 });
    this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400, onComplete: () => t.destroy() });
    this.glitchTitle(t, 1500);
  }

  /** Ball games: a goal (or the Spark caught), glitching in the scoring team's colour. */
  private onGoal(team: number, title: string): void {
    // team -1: news for everyone (the Spark is out).
    const text = team < 0 ? title : `${team === 0 ? 'RED' : 'BLUE'}  ${title}`;
    const t = heading(this, this.scale.width / 2, this.scale.height / 2 - 60, text, team < 0 ? 64 : 84, { glow: team < 0 ? 0xffd84d : SLOT_COLORS[team] }).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 200 });
    this.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 400, onComplete: () => t.destroy() });
    this.glitchTitle(t, 1300);
  }

  /** Sandbox: the dummy's new behaviour, briefly. */
  private onDummy(mode: string): void {
    const t = heading(this, this.scale.width / 2, 130, `DUMMY: ${mode.toUpperCase()}`, 40).setDepth(20);
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 300, onComplete: () => t.destroy() });
    this.glitchTitle(t, 900);
  }

  /** Horde: every few waves, one more recharge for everyone. */
  private onBonusRecharge(): void {
    const t = heading(this, this.scale.width / 2, this.scale.height / 2 + 30, 'BONUS RECHARGE', 64).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 200 });
    this.tweens.add({ targets: t, alpha: 0, delay: 1700, duration: 400, onComplete: () => t.destroy() });
    this.glitchTitle(t, 1700);
  }

  private onMatchOver(winnerTeam: number | null): void {
    // One Kubot: its name; a team of several: the team. Horde: survived, or the wave that ended it.
    const team = winnerTeam === null ? [] : this.game_.teamOf(winnerTeam);
    const title = team.length === 1 ? team[0].name : `${TEAM_NAMES[winnerTeam!]} team`.toUpperCase();
    const mode = MODES[this.game_.mode];
    const color = winnerTeam === null || winnerTeam === BLACK_TEAM ? NEON : SLOT_COLORS[winnerTeam];
    const won = winnerTeam === 0;
    this.bannerText.setText(mode.horde ? (winnerTeam === BLACK_TEAM ? `FELL ON WAVE ${this.game_.wave}` : 'HORDE SURVIVED')
      : mode.trial ? (won ? 'TRAINING CLEARED' : `DEFEATED ${this.game_.defeated} OF ${this.game_.target}`)
        : winnerTeam === BLACK_TEAM ? 'BLACK TEAM WINS'
          : winnerTeam === null ? 'DRAW' : `${title} WINS`).setGlow(color);
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
