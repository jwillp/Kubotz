import Phaser from 'phaser';
import { Animator } from '../anim/Animator';
import { Rig } from '../anim/Rig';
import { ART_SCALE, Kubot2D } from '../anim/Kubot2D';
import { UNIT } from '../config';
import { SLOT_COLORS, partTexture } from '../game/Kubotz';
import type { MatchSetup } from '../game/Match';
import { MODULE_ORDER, MODULES, moduleStats, type BodyModule, type ModuleStats } from '../game/Modules';
import type { SpriterData } from '../spriter/Spriter';
import { body, heading, HeadingText, NEON } from '../ui/Type';
import { drawPlate, drawStrip, footer, frameTitle, kubeBackdrop, PlateButton, shutter } from '../ui/Plate';
import { uiSound } from '../audio/Sounds';
import { MenuInput } from './MenuInput';

const BTN_X = 260;
const BTN_TOP = 196;
const BTN_STEP = 58;
/** The panel describing the selected module, on the right. */
const PANEL = { x: 500, y: 140, w: 732, h: 570 };
/** The demo stage: its floor, and its ends (the Kubot runs between them). */
const FLOOR_Y = PANEL.y + 490;
const STAGE = { left: PANEL.x + 90, right: PANEL.x + PANEL.w - 90 };
/** The demo Kubot's scale (of a Kubot in a match), and so pixels per game unit on the stage. */
const DEMO_SCALE = 0.5;
const PX = UNIT * DEMO_SCALE;
const BARS: { key: keyof ModuleStats; label: string }[] = [
  { key: 'run', label: 'RUN' }, { key: 'air', label: 'AIR SPEED' }, { key: 'jump', label: 'JUMP' },
  { key: 'fall', label: 'FALL SPEED' }, { key: 'weight', label: 'WEIGHT' },
];
/** How long the demo Kubot waits on the ground between jumps (ms). */
const DEMO_REST = 450;

/**
 * The Modules menu (title): every body module down the left; the selected one
 * explained on the right, with its numbers as bars and a Kubot showing it off
 * (running and jumping with the module's own speeds and gravity, at half
 * size). "Try it" starts the sandbox with a base Kubot (Classic helmet) built
 * on only that module; quitting the sandbox comes back here.
 * D-pad / stick up and down choose, A tries it, B goes back to the title.
 */
export class ModulesScene extends Phaser.Scene {
  private selected = 0;
  private items: PlateButton[] = [];
  private leaving = false;
  private menu!: MenuInput;
  private title!: HeadingText;
  private tagline!: Phaser.GameObjects.Text;
  private inspired!: Phaser.GameObjects.Text;
  private details!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;
  private tryIt!: PlateButton;
  private kubot!: Kubot2D;
  private anim!: Animator;
  /** The demo Kubot on the stage: where it is (x px, height above the floor px), its speed (px/s, y up), facing, and when it may jump again. */
  private demo = { x: 0, h: 0, vx: 0, vy: 0, face: 1 as 1 | -1, grounded: true, restUntil: 0, t: 0 };
  /** The bars as drawn now, easing towards the selected module's. */
  private shown: ModuleStats = { run: 0, air: 0, jump: 0, fall: 0, weight: 0 };

  constructor() { super('Modules'); }

  create(): void {
    this.items = [];
    this.leaving = false;
    kubeBackdrop(this);
    frameTitle(this, 'Body modules');
    this.add.text(48, 118, 'Kubotz are modular: the body sets how a Kubot moves and how far it flies when hit.',
      body(15, { fontStyle: '500', color: '#9fc4e4' }));
    const rig = new Rig(this.registry.get('spriter') as SpriterData);
    if (this.sys.renderer.type === Phaser.WEBGL) {
      this.lights.enable().setAmbientColor(0xb4bcdc);
      this.lights.addLight(PANEL.x + 160, PANEL.y + 200, 1200, 0xffe8cc, 2.6);
      this.lights.addLight(PANEL.x + PANEL.w, PANEL.y + PANEL.h + 100, 1100, 0x3aa8ff, 1.6);
    }

    const p = drawPlate(this.add.graphics(), PANEL.x, PANEL.y, PANEL.w, PANEL.h, { cut: 26, alpha: 0.88 });
    drawStrip(p, PANEL.x, PANEL.y + 26, PANEL.x, PANEL.y + PANEL.h, NEON, 4);
    drawStrip(p, PANEL.x + PANEL.w * 0.45, PANEL.y + PANEL.h, PANEL.x + PANEL.w - 26, PANEL.y + PANEL.h, NEON, 3);
    drawStrip(p, STAGE.left - 40, FLOOR_Y + 2, STAGE.right + 40, FLOOR_Y + 2, NEON, 2);
    this.title = heading(this, PANEL.x + 50, PANEL.y + 48, '', 48).setOrigin(0, 0.5);
    this.tagline = this.add.text(PANEL.x + 52, PANEL.y + 92, '', body(19, { fontStyle: '600', color: '#9fe3ff' }));
    this.inspired = this.add.text(PANEL.x + 52, PANEL.y + 122, '', body(14, { fontStyle: 'italic 500', color: '#8fb6d8' }));
    this.details = this.add.text(PANEL.x + 52, PANEL.y + 162, '', body(16, { fontStyle: '600', color: '#e9f6ff', lineSpacing: 9, wordWrap: { width: 330 } }));
    const barX = PANEL.x + 420;
    BARS.forEach((b, i) => this.add.text(barX, PANEL.y + 158 + i * 28, b.label, body(12, { fontStyle: '700', color: '#9fc4e4' })).setOrigin(0, 0.5));
    this.bars = this.add.graphics();

    this.kubot = new Kubot2D(this, rig, (file) => partTexture(this.textures, file, SLOT_COLORS[0]));
    this.anim = new Animator(rig);
    this.anim.play('idle', { restart: true });

    this.tryIt = new PlateButton(this, PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 40, 280, 48, 'Try it  ▶', { size: 26 });
    this.tryIt.setSelected(true);
    this.tryIt.on('pointerdown', () => this.tryModule());

    MODULE_ORDER.forEach((id, i) => {
      const b = new PlateButton(this, BTN_X, BTN_TOP + i * BTN_STEP, 340, 46, MODULES[id].name, { size: 24 });
      b.on('pointerover', () => this.select(i));
      b.on('pointerdown', () => { this.select(i); this.tryModule(); });
      this.items.push(b);
    });
    const saved = this.registry.get('module') as string | undefined;
    this.selected = -1;
    this.select(Math.max(0, MODULE_ORDER.indexOf(saved ?? 'core')));

    footer(this, ['D-pad / stick ↑↓ choose · A (Enter) try it in the sandbox · B (Esc) back']);
    this.menu = new MenuInput({
      move: (_dx, dy) => { if (dy) this.select((this.selected + dy + MODULE_ORDER.length) % MODULE_ORDER.length); },
      confirm: () => this.tryModule(),
      back: () => this.back(),
    }, false, { confirm: ['A', 9], back: ['B'] });
    const kb = this.input.keyboard!;
    kb.on('keydown-O', () => this.tryModule());
    kb.on('keydown-COMMA', () => this.tryModule());
  }

  private get module(): BodyModule { return MODULES[MODULE_ORDER[this.selected]]; }

  private select(i: number): void {
    if (i === this.selected) return;
    this.selected = i;
    this.items.forEach((t, j) => t.setSelected(j === i));
    const m = this.module;
    this.registry.set('module', m.id);
    this.title.setText(m.name);
    this.tagline.setText(m.tagline);
    this.inspired.setText(`Moves like: ${m.inspiredBy}`);
    this.details.setText(m.details.map((d) => `▸  ${d}`).join('\n'));
    this.kubot.build = m.build;
    // A fresh run from the left end of the stage.
    this.demo = { x: STAGE.left, h: 0, vx: 0, vy: 0, face: 1, grounded: true, restUntil: this.demo.t + 250, t: this.demo.t };
    this.anim.play('taunt', { restart: true, ms: 600, fade: 60 });
  }

  update(time: number, deltaMs: number): void {
    if (!this.leaving) this.menu.update(time);
    this.drawBars(deltaMs);
    this.runDemo(Math.min(deltaMs, 50));
  }

  /** The stat bars, easing to the selected module's values. */
  private drawBars(deltaMs: number): void {
    const target = moduleStats(this.module);
    const k = Math.min(1, deltaMs / 90);
    const g = this.bars.clear();
    const x = PANEL.x + 520;
    const w = PANEL.w - 520 - 50;
    BARS.forEach((b, i) => {
      this.shown[b.key] += (target[b.key] - this.shown[b.key]) * k;
      const y = PANEL.y + 158 + i * 28;
      g.fillStyle(0x0a1626, 0.9).fillRect(x, y - 5, w, 10);
      g.fillStyle(NEON, 0.95).fillRect(x, y - 5, w * this.shown[b.key], 10);
      g.fillStyle(0xffffff, 0.35).fillRect(x, y - 5, w * this.shown[b.key], 2);
    });
  }

  /**
   * The demo Kubot runs to one end of the stage and back, jumping (a full hop)
   * after each short rest, with the module's run speed, air speed, jump,
   * gravity and fall speed: a floaty body hangs in the air, a heavy one drops.
   */
  private runDemo(dtMs: number): void {
    const d = this.demo;
    const f = this.module.feel;
    const dt = dtMs / 1000;
    d.t += dtMs;
    if (d.grounded) {
      if (d.t >= d.restUntil) {
        // Off it goes: a full hop with a run start.
        d.grounded = false;
        d.vy = f.jump * PX;
        d.vx = d.face * f.run * PX;
        this.anim.play('jump', { restart: true, fade: 50 });
      } else if (this.anim.finished || this.anim.name !== 'taunt') {
        if (this.anim.name !== 'idle') this.anim.play('idle', { fade: 120 });
      }
    } else {
      d.vy -= (d.vy > 0 ? f.gravity : f.fallGravity) * PX * dt;
      d.vy = Math.max(d.vy, -f.fall * PX);
      // In the air, the drift is the air speed's.
      const air = f.air * PX;
      d.vx = Phaser.Math.Clamp(d.vx, -Math.max(air, Math.abs(d.vx) - f.airAccel * PX * dt), Math.max(air, Math.abs(d.vx) - f.airAccel * PX * dt));
      if (d.vy < 0 && this.anim.name === 'jump' && this.anim.finished) this.anim.play('fall', { fade: 80 });
      d.h += d.vy * dt;
      d.x += d.vx * dt;
      if (d.h <= 0) {
        d.h = 0;
        d.grounded = true;
        d.restUntil = d.t + DEMO_REST;
        this.anim.play('land', { restart: true, fade: 40 });
      }
    }
    // Turn round at the stage's ends.
    if (d.x >= STAGE.right) { d.x = STAGE.right; d.face = -1; d.vx = -Math.abs(d.vx) * 0.3; }
    if (d.x <= STAGE.left) { d.x = STAGE.left; d.face = 1; d.vx = Math.abs(d.vx) * 0.3; }
    this.anim.tick(dtMs);
    if (this.anim.finished && this.anim.name === 'land') this.anim.play('idle', { fade: 120 });
    this.kubot.update(this.anim.pose(), [], d.x, FLOOR_Y - d.h, d.face > 0 ? 0 : 180, { lean: 0, squash: 1, alpha: 1, flash: false, dtMs });
    this.kubot.view.setScale(-ART_SCALE * DEMO_SCALE, ART_SCALE * DEMO_SCALE);
  }

  /** The sandbox with a base Kubot on only this module; quitting comes back here. */
  private tryModule(): void {
    if (this.leaving) return;
    this.leaving = true;
    uiSound(this, 'confirm');
    const pad = this.input.gamepad?.gamepads.find((p) => p?.connected);
    const setup: MatchSetup = {
      mode: 'sandbox',
      fighters: [{ input: 'P1', team: 0, helmet: 0, body: this.module.id, ...(pad ? { pad: pad.index } : {}) }],
      arena: 0, bonuses: 'off', returnTo: 'Modules',
    };
    shutter(this, () => this.scene.start('Game', setup));
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    shutter(this, () => this.scene.start('Title'), 'back');
  }
}
