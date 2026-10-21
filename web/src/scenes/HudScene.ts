import Phaser from 'phaser';
import { Config } from '../config';
import { POWER_UPS } from '../game/PowerUps';
import { hex, type Kubotz } from '../game/Kubotz';
import type { GameScene } from './GameScene';
import { body, heading, HeadingText, NEON } from '../ui/Type';

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
  private bannerText!: HeadingText;

  constructor() { super('Hud'); }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;
    this.panels.clear();
    const { width, height } = this.scale;

    this.add.image(width / 2, 0, 'hud-timer').setOrigin(0.5, 0).setScale(0.8);
    this.timer = this.add.text(width / 2, 19, '0:00', body(22, { fontStyle: '800' })).setOrigin(0.5);

    const n = this.game_.fighters.length;
    this.game_.fighters.forEach((k, i) => {
      // Two panels per side, like a versus HUD.
      const right = n > 1 && i % 2 === 1;
      const slot = Math.floor(i / 2);
      const x = right ? width - 330 - slot * 0 : 16;
      const y = 14 + slot * 132;
      this.panels.set(k, this.makePanel(k, right ? width - 16 - 300 : x, y));
    });

    this.banner = this.add.container(width / 2, height / 2).setVisible(false).setDepth(10);
    const bg = this.add.rectangle(0, 0, width, 200, 0x050b18, 0.75);
    this.bannerText = heading(this, 0, -20, '', 72);
    const hint = this.add.text(0, 55, '', body(22, { color: '#cfe9ff', fontStyle: '500' })).setOrigin(0.5).setName('hint');
    this.banner.add([bg, this.bannerText, hint]);

    this.game_.events.on('match-over', this.onMatchOver, this);
    this.game_.events.on('pause', this.onPause, this);
    this.game_.events.on('countdown', this.onCountdown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game_.events.off('countdown', this.onCountdown, this);
      this.game_.events.off('match-over', this.onMatchOver, this);
      this.game_.events.off('pause', this.onPause, this);
    });
  }

  private makePanel(k: Kubotz, x: number, y: number): Panel {
    const c = this.add.container(x, y);
    const badge = this.add.image(0, 0, 'hud-badge').setOrigin(0, 0).setScale(0.5);
    const label = this.add.image(40, 30, `label-${k.controller.label}:${hex(k.look.color)}`).setScale(0.42);
    const name = this.add.text(92, 2, k.name, body(18, { fontStyle: '800', stroke: '#0b1d33', strokeThickness: 4 }));
    const barsArt = this.add.image(88, 28, 'hud-bars').setOrigin(0, 0).setScale(0.85, 0.7);
    const bars = this.add.graphics();
    const style = body(15, { fontStyle: '800', stroke: '#0b1d33', strokeThickness: 3 });
    const kills = this.add.text(26, 124, '0', style).setOrigin(0.5, 0);
    const lives = this.add.text(55, 124, '0', style).setOrigin(0.5, 0);
    const status = this.add.text(92, 80, '', { ...style, fontSize: '13px', color: '#9fe3ff' });
    c.add([badge, label, name, barsArt, bars, kills, lives, status]);
    return { container: c, bars, kills, lives, status };
  }

  update(): void {
    const g = this.game_;
    if (!g?.fighters) return;
    const time = g.clock; // the match clock stands still while paused
    const elapsed = Math.max(0, Math.floor((time - g.startedAt) / 1000));
    if (g.winner === undefined && !g.paused) {
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
    const t = heading(this, this.scale.width / 2, this.scale.height / 2 - 40, word, 140).setDepth(20).setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 300, onComplete: () => t.destroy() });
  }

  private onMatchOver(winner: Kubotz | null): void {
    this.bannerText.setText(winner ? `${winner.name} WINS` : 'DRAW');
    this.bannerText.setGlow(winner ? winner.look.color : NEON);
    (this.banner.getByName('hint') as Phaser.GameObjects.Text).setText('Press Enter to return to the menu');
    this.banner.setVisible(true).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: this.banner, scale: 1, alpha: 1, duration: 400, ease: 'Back.out' });
  }

  private onPause(paused: boolean): void {
    this.bannerText.setText('PAUSED');
    this.bannerText.setGlow(NEON);
    (this.banner.getByName('hint') as Phaser.GameObjects.Text).setText('Esc to resume  ·  Q to quit to the title screen');
    this.banner.setVisible(paused).setScale(1).setAlpha(1);
  }
}
