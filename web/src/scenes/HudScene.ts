import Phaser from 'phaser';
import { Config } from '../config';
import { POWER_UPS } from '../game/PowerUps';
import { hex, SLOT_COLORS, type Kubotz } from '../game/Kubotz';
import { TEAM_NAMES } from '../game/Match';
import type { GameScene } from './GameScene';
import { MenuInput } from './MenuInput';

const PAUSE_ITEMS = ['Resume', 'Settings', 'Quit to title'];
import { body, heading, headingText, NEON } from '../ui/Type';

interface Panel {
  container: Phaser.GameObjects.Container;
  bars: Phaser.GameObjects.Graphics;
  kills: Phaser.GameObjects.Text;
  lives: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
}

/** HUDSystem, using the hud-multi-* mock-up art: a badge per robot plus a match timer. */
export class HudScene extends Phaser.Scene {
  private game_!: GameScene;
  private panels = new Map<Kubotz, Panel>();
  private timer!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.BitmapText;
  /** The pause menu under the PAUSED banner. */
  private pauseItems: Phaser.GameObjects.Text[] = [];
  private pauseSelected = 0;
  private pauseMenu!: MenuInput;

  constructor() { super('Hud'); }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;
    this.panels.clear();
    const { width, height } = this.scale;

    this.add.image(width / 2, 0, 'hud-timer').setOrigin(0.5, 0).setScale(0.8);
    this.timer = this.add.text(width / 2, 19, '0:00', body(22, { fontStyle: '800' })).setOrigin(0.5);

    const fighters = this.game_.fighters;
    const n = fighters.length;
    // Two teams of up to two: each team on its own side.
    const teams = [...new Set(fighters.map((f) => f.team))];
    const sided = teams.length === 2 && teams.every((t) => fighters.filter((f) => f.team === t).length <= 2);
    fighters.forEach((k, i) => {
      // Two panels per side, like a versus HUD.
      const right = sided ? k.team === teams[1] : n > 1 && i % 2 === 1;
      const slot = sided ? fighters.filter((f) => f.team === k.team).indexOf(k) : Math.floor(i / 2);
      const x = right ? width - 330 - slot * 0 : 16;
      const y = 14 + slot * 132;
      this.panels.set(k, this.makePanel(k, right ? width - 16 - 300 : x, y));
    });

    this.banner = this.add.container(width / 2, height / 2).setVisible(false).setDepth(10);
    const bg = this.add.rectangle(0, 0, width, 200, 0x050b18, 0.75);
    this.bannerText = heading(this, 0, -20, '', 72);
    const hint = this.add.text(0, 55, '', body(22, { color: '#cfe9ff', fontStyle: '500' })).setOrigin(0.5).setName('hint');
    this.banner.add([bg, this.bannerText, hint]);
    this.pauseItems = PAUSE_ITEMS.map((label, i) => {
      const t = this.add.text((i - 1) * 260, 48, label, body(28, { fontStyle: '800' })).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.selectPause(i));
      t.on('pointerdown', () => this.choosePause(i));
      return t;
    });
    this.banner.add(this.pauseItems);
    this.pauseMenu = new MenuInput({
      move: (dx, dy) => this.selectPause((this.pauseSelected + (dx || dy) + PAUSE_ITEMS.length) % PAUSE_ITEMS.length),
      confirm: () => this.choosePause(this.pauseSelected),
    });

    this.game_.events.on('match-over', this.onMatchOver, this);
    this.game_.events.on('pause', this.onPause, this);
    this.game_.events.on('countdown', this.onCountdown, this);
    this.game_.events.on('continue-prompt', this.onContinuePrompt, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game_.events.off('continue-prompt', this.onContinuePrompt, this);
      this.game_.events.off('countdown', this.onCountdown, this);
      this.game_.events.off('match-over', this.onMatchOver, this);
      this.game_.events.off('pause', this.onPause, this);
    });
  }

  private makePanel(k: Kubotz, x: number, y: number): Panel {
    const c = this.add.container(x, y);
    const badge = this.add.image(0, 0, 'hud-badge').setOrigin(0, 0).setScale(0.5);
    const label = this.add.image(40, 30, k.tagKey).setScale(0.42);
    const name = this.add.text(92, 2, k.name, body(18, { fontStyle: '800', stroke: '#0b1d33', strokeThickness: 4 }));
    // The robot's team (its colour): a coloured tag after the name.
    const team = this.add.text(92 + name.width + 10, 6, `${TEAM_NAMES[k.team] ?? ''} team`.toUpperCase(), body(12, { fontStyle: '800', color: '#' + hex(k.look.color), stroke: '#0b1d33', strokeThickness: 3 }));
    const barsArt = this.add.image(88, 28, 'hud-bars').setOrigin(0, 0).setScale(0.85, 0.7);
    const bars = this.add.graphics();
    const style = body(15, { fontStyle: '800', stroke: '#0b1d33', strokeThickness: 3 });
    const kills = this.add.text(26, 124, '0', style).setOrigin(0.5, 0);
    const lives = this.add.text(55, 124, '0', style).setOrigin(0.5, 0);
    const status = this.add.text(92, 80, '', { ...style, fontSize: '13px', color: '#9fe3ff' });
    c.add([badge, label, name, team, barsArt, bars, kills, lives, status]);
    return { container: c, bars, kills, lives, status };
  }

  update(): void {
    const g = this.game_;
    if (!g?.fighters) return;
    if (g.paused) this.pauseMenu.update(this.time.now);
    const time = g.clock; // the match clock stands still while paused
    const elapsed = Math.max(0, Math.floor((time - g.startedAt) / 1000));
    if (g.winnerTeam === undefined && !g.paused) {
      this.timer.setText(`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`);
    }

    for (const [k, p] of this.panels) {
      const b = p.bars.clear();
      // health bar (top) and guard bar (bottom) over the hud-multi-bars art
      const w = 190;
      b.fillStyle(k.health > 30 ? 0x7df466 : 0xff5252, 0.95).fillRect(92, 32, (w * k.health) / Config.KUBOTZ_HEALTH, 15);
      if (k.shield > 0) b.fillStyle(0x66ccff, 0.9).fillRect(92, 32, (w * k.shield) / 100, 5);
      const guard = Phaser.Math.Clamp(k.guard / Config.GUARD_MAX, 0, 1);
      const stunned = time < k.stunnedUntil;
      b.fillStyle(stunned ? 0xff5252 : guard >= 1 ? 0xffe066 : 0xbfa640, 0.95).fillRect(92, 60, w * guard, 13);
      p.kills.setText(String(k.kills));
      p.lives.setText(String(Math.max(0, k.lives)));
      const effects = k.powerUps.map((pu) => `${POWER_UPS[pu.type].label} ${Math.ceil((pu.endsAt - time) / 1000)}s`);
      let status = effects.join(' · ');
      if (k.eliminated) status = 'ELIMINATED';
      else if (time < k.stunnedUntil) status = 'GUARD BROKEN';
      else if (!k.isAlive()) status = `respawning ${Math.max(0, Math.ceil((k.respawnAt - time) / 1000))}…`;
      p.status.setText(status);
      p.container.setAlpha(k.eliminated ? 0.4 : 1);
    }
  }

  private onCountdown(word: string): void {
    const t = heading(this, this.scale.width / 2, this.scale.height / 2 - 40, word, 140, { glowStrength: 4 }).setDepth(20).setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 300, onComplete: () => t.destroy() });
  }

  private onMatchOver(winnerTeam: number | null): void {
    // One robot: its name; a team of several: the team.
    const team = winnerTeam === null ? [] : this.game_.teamOf(winnerTeam);
    const title = team.length === 1 ? team[0].name : `${TEAM_NAMES[winnerTeam!]} team`.toUpperCase();
    this.bannerText.setText(headingText(winnerTeam === null ? 'DRAW' : `${title} WINS`));
    this.glowBanner(winnerTeam === null ? NEON : SLOT_COLORS[winnerTeam]);
    (this.banner.getByName('hint') as Phaser.GameObjects.Text).setText('').setY(55).setFontSize(22);
    this.bannerText.setY(-20);
    for (const t of this.pauseItems) t.setVisible(false);
    // High up, so the camera's close-up of the winners' dance stays clear.
    this.banner.setY(150).setVisible(true).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: this.banner, scale: 1, alpha: 1, duration: 400, ease: 'Back.out' });
  }

  private onPause(paused: boolean): void {
    this.bannerText.setText('PAUSED');
    this.glowBanner(NEON);
    (this.banner.getByName('hint') as Phaser.GameObjects.Text).setText('Esc to resume  ·  Q to quit to the title screen').setY(-82).setFontSize(16);
    for (const t of this.pauseItems) t.setVisible(true);
    this.bannerText.setY(-28);
    this.banner.setY(this.scale.height / 2).setVisible(paused).setScale(1).setAlpha(1);
    this.pauseMenu.reset();
    this.selectPause(0);
  }

  private selectPause(i: number): void {
    this.pauseSelected = i;
    this.pauseItems.forEach((t, j) => t.setColor(j === i ? '#29abe2' : '#ffffff').setScale(j === i ? 1.1 : 1));
  }

  private choosePause(i: number): void {
    if (!this.game_.paused) return;
    if (i === 0) this.game_.togglePause();
    else if (i === 1) this.game_.openSettings();
    else this.game_.backToTitle();
  }

  /** After the winners have danced a little: what continues to the results. */
  private onContinuePrompt(): void {
    const hint = (this.banner.getByName('hint') as Phaser.GameObjects.Text).setText('Press attack / Enter / A to continue').setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 1, duration: 300 });
    this.tweens.add({ targets: hint, scale: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 300 });
  }

  private glowBanner(color: number): void {
    this.bannerText.postFX?.clear();
    this.bannerText.postFX?.addGlow(color, 3, 0, false, 0.1, 12);
  }
}
