import Phaser from 'phaser';
import { Animator } from '../anim/Animator';
import { Rig } from '../anim/Rig';
import { ART_SCALE, Kubot2D } from '../anim/Kubot2D';
import { UNIT } from '../config';
import { SLOT_COLORS, partTexture } from '../game/Kubotz';
import type { FighterSpec, MatchSetup } from '../game/Match';
import {
  BASE_BUILD, BODIES, BODY_ORDER, FEET, HELMETS, MODULE_KINDS, WEAPONS, bodyStats,
  type BodyModule, type BodyStats, type ModuleInfo, type ModuleKind,
} from '../game/Modules';
import type { SpriterData } from '../spriter/Spriter';
import { body, heading, HeadingText, NEON } from '../ui/Type';
import { drawGlow, drawPlate, drawStrip, footer, frameTitle, kubeBackdrop, METAL_EDGE, PlateButton, shutter } from '../ui/Plate';
import { uiSound } from '../audio/Sounds';
import { MenuInput } from './MenuInput';

const BTN_X = 260;
const BTN_TOP = 238;
const BTN_STEP = 44;
/** The group tabs over the list. */
const TAB_Y = 186;
const TAB_W = 90;
/** The panel describing the selected module, on the right. */
const PANEL = { x: 500, y: 140, w: 732, h: 570 };
/** The demo stage: its floor, and its ends (the Kubot runs between them). */
const FLOOR_Y = PANEL.y + 490;
const STAGE = { left: PANEL.x + 90, right: PANEL.x + PANEL.w - 90 };
/** The demo Kubot's scale (of a Kubot in a match), and so pixels per game unit on the stage. */
const DEMO_SCALE = 0.5;
const PX = UNIT * DEMO_SCALE;
/** A helmet, weapon or feet module's Kubot, standing still and bigger. */
const SHOW_SCALE = 0.8;
const BARS: { key: keyof BodyStats; label: string }[] = [
  { key: 'run', label: 'RUN' }, { key: 'air', label: 'AIR SPEED' }, { key: 'jump', label: 'JUMP' },
  { key: 'fall', label: 'FALL SPEED' }, { key: 'weight', label: 'WEIGHT' },
];
/** How long the demo Kubot waits on the ground between jumps (ms). */
const DEMO_REST = 450;
/** Shoulders in the standard gamepad mapping: the previous / next group. */
const PAD = { L: 4, R: 5 } as const;

/** Every group's modules, in menu order. */
const LISTS: Record<ModuleKind, ModuleInfo[]> = {
  helmet: HELMETS,
  body: BODY_ORDER.map((id) => BODIES[id]),
  weapon: WEAPONS,
  feet: FEET,
};

/**
 * The Modules menu (title): Kubotz are modular, and their modules come in
 * groups (helmets, bodies, weapons, feet), one tab each. The group's modules
 * run down the left; the selected one is explained on the right. A body shows
 * its numbers as bars, a debug line naming whose numbers they are, and a
 * Kubot running and jumping with the body's own speeds and gravity (at half
 * size); the others show a Kubot wearing or holding the module. "Try it"
 * starts the sandbox with a base Kubot on only that module; quitting the
 * sandbox comes back here.
 * D-pad / stick up and down choose, left / right or LB / RB change the
 * group, A tries it, B goes back to the title.
 */
export class ModulesScene extends Phaser.Scene {
  private kind: ModuleKind = 'body';
  private selected = 0;
  private items: PlateButton[] = [];
  private tabs: { kind: ModuleKind; g: Phaser.GameObjects.Graphics; glow: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; x: number }[] = [];
  private leaving = false;
  private menu!: MenuInput;
  private blurb!: Phaser.GameObjects.Text;
  private title!: HeadingText;
  private tagline!: Phaser.GameObjects.Text;
  private inspired!: Phaser.GameObjects.Text;
  private debug!: Phaser.GameObjects.Text;
  private details!: Phaser.GameObjects.Text;
  private barLabels: Phaser.GameObjects.Text[] = [];
  private bars!: Phaser.GameObjects.Graphics;
  private kubot!: Kubot2D;
  private anim!: Animator;
  private padDown = new Map<number, Set<number>>();
  /** The demo Kubot on the stage: where it is (x px, height above the floor px), its speed (px/s, y up), facing, and when it may jump again. */
  private demo = { x: 0, h: 0, vx: 0, vy: 0, face: 1 as 1 | -1, grounded: true, restUntil: 0, t: 0 };
  /** The bars as drawn now, easing towards the selected body's. */
  private shown: BodyStats = { run: 0, air: 0, jump: 0, fall: 0, weight: 0 };

  constructor() { super('Modules'); }

  create(): void {
    this.items = [];
    this.tabs = [];
    this.barLabels = [];
    this.leaving = false;
    this.padDown.clear();
    kubeBackdrop(this);
    frameTitle(this, 'Modules');
    this.blurb = this.add.text(48, 118, '', body(15, { fontStyle: '500', color: '#9fc4e4' }));
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
    // Whose numbers a body runs on, plainly, for testing.
    this.debug = this.add.text(PANEL.x + PANEL.w - 40, PANEL.y + 30, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffd27a' }).setOrigin(1, 0.5);
    this.details = this.add.text(PANEL.x + 52, PANEL.y + 162, '', body(16, { fontStyle: '600', color: '#e9f6ff', lineSpacing: 9, wordWrap: { width: 330 } }));
    const barX = PANEL.x + 420;
    BARS.forEach((b, i) => this.barLabels.push(this.add.text(barX, PANEL.y + 158 + i * 28, b.label, body(12, { fontStyle: '700', color: '#9fc4e4' })).setOrigin(0, 0.5)));
    this.bars = this.add.graphics();

    this.kubot = new Kubot2D(this, rig, (file) => partTexture(this.textures, file, SLOT_COLORS[0]));
    this.anim = new Animator(rig);
    this.anim.play('idle', { restart: true });

    const tryIt = new PlateButton(this, PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 40, 280, 48, 'Try it  ▶', { size: 26 });
    tryIt.setSelected(true);
    tryIt.on('pointerdown', () => this.tryModule());

    // The group tabs.
    const left = BTN_X - 170;
    MODULE_KINDS.forEach((k, i) => {
      const x = left + i * (TAB_W + 6);
      const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      const g = this.add.graphics();
      const label = this.add.text(x + TAB_W / 2, TAB_Y, k.label.toUpperCase(), body(14, { fontStyle: 'italic 800' })).setOrigin(0.5)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.showKind(k.kind));
      this.tabs.push({ kind: k.kind, g, glow, label, x });
    });
    this.add.text(left, TAB_Y - 30, 'LB / RB', body(11, { fontStyle: '700', color: '#6f93b3' }));

    const saved = this.registry.get('modules') as { kind: ModuleKind; index: number } | undefined;
    this.showKind(saved?.kind ?? 'body', saved?.index ?? 0);

    footer(this, ['D-pad / stick ↑↓ choose · ◀ ▶ or LB / RB group · A (Enter) try it in the sandbox · B (Esc) back']);
    this.menu = new MenuInput({
      move: (dx, dy) => {
        if (dy) this.select((this.selected + dy + this.list.length) % this.list.length);
        else if (dx) this.stepKind(dx);
      },
      confirm: () => this.tryModule(),
      back: () => this.back(),
    }, false, { confirm: ['A', 9], back: ['B'] });
    const kb = this.input.keyboard!;
    kb.on('keydown-O', () => this.tryModule());
    kb.on('keydown-COMMA', () => this.tryModule());
    kb.on('keydown-Q', () => this.stepKind(-1));
    kb.on('keydown-E', () => this.stepKind(1));
  }

  private get list(): ModuleInfo[] { return LISTS[this.kind]; }
  private get module(): ModuleInfo { return this.list[this.selected]; }
  /** The selected body, when the group is the bodies. */
  private get bodyModule(): BodyModule | null { return this.kind === 'body' ? this.module as BodyModule : null; }

  private stepKind(d: number): void {
    const at = MODULE_KINDS.findIndex((k) => k.kind === this.kind);
    this.showKind(MODULE_KINDS[(at + d + MODULE_KINDS.length) % MODULE_KINDS.length].kind);
    uiSound(this, 'move');
  }

  /** A group's modules down the left, the first (or `index`) selected. */
  private showKind(kind: ModuleKind, index = 0): void {
    this.kind = kind;
    for (const b of this.items) b.destroy();
    this.items = this.list.map((m, i) => {
      const b = new PlateButton(this, BTN_X, BTN_TOP + i * BTN_STEP, 340, 38, m.name, { size: 21 });
      b.on('pointerover', () => this.select(i));
      b.on('pointerdown', () => { this.select(i); this.tryModule(); });
      return b;
    });
    for (const t of this.tabs) {
      const on = t.kind === kind;
      t.g.clear();
      t.glow.clear();
      if (on) drawGlow(t.glow, t.x, TAB_Y - 16, TAB_W, 32, { cut: 8 });
      drawPlate(t.g, t.x, TAB_Y - 16, TAB_W, 32, { cut: 8, alpha: on ? 0.95 : 0.6, edge: on ? NEON : METAL_EDGE });
      t.label.setColor(on ? '#bfe9ff' : '#8fb6d8');
    }
    this.blurb.setText(MODULE_KINDS.find((k) => k.kind === kind)!.blurb);
    const isBody = kind === 'body';
    for (const o of [this.inspired, this.debug, this.bars, ...this.barLabels]) o.setVisible(isBody);
    this.selected = -1;
    this.select(Math.min(index, this.list.length - 1));
  }

  private select(i: number): void {
    if (i === this.selected) return;
    this.selected = i;
    this.items.forEach((t, j) => t.setSelected(j === i));
    const m = this.module;
    this.registry.set('modules', { kind: this.kind, index: i });
    this.title.setText(m.name);
    this.tagline.setText(m.tagline);
    this.details.setText(m.details.map((d) => `▸  ${d}`).join('\n'));
    const b = this.bodyModule;
    if (b) {
      this.inspired.setText(`Moves like: ${b.inspiredBy}`);
      this.debug.setText(`debug: ${b.debug}`);
    }
    this.kubot.build = b?.build ?? BASE_BUILD;
    // A fresh run from the left end of the stage (bodies), or a pose in the middle.
    this.demo = { x: b ? STAGE.left : (STAGE.left + STAGE.right) / 2, h: 0, vx: 0, vy: 0, face: 1, grounded: true, restUntil: this.demo.t + 250, t: this.demo.t };
    this.anim.play('taunt', { restart: true, ms: 600, fade: 60 });
  }

  /** The rig maps the shown Kubot wears: the module itself (a helmet, a body's torso, a weapon). */
  private maps(): string[] {
    const m = this.module as ModuleInfo & { map?: string | null; look?: string };
    return [m.map ?? m.look].filter((x): x is string => !!x);
  }

  update(time: number, deltaMs: number): void {
    if (!this.leaving) {
      this.menu.update(time);
      this.pollShoulders();
    }
    this.drawBars(deltaMs);
    const dt = Math.min(deltaMs, 50);
    if (this.bodyModule) this.runDemo(dt);
    else this.standStill(dt);
  }

  /** LB / RB on any pad: the previous / next group. */
  private pollShoulders(): void {
    for (const p of this.input.gamepad?.gamepads ?? []) {
      if (!p?.connected) continue;
      const before = this.padDown.get(p.index) ?? new Set<number>();
      const now = new Set(p.buttons.filter((b) => b.pressed).map((b) => b.index));
      if (now.has(PAD.L) && !before.has(PAD.L)) this.stepKind(-1);
      if (now.has(PAD.R) && !before.has(PAD.R)) this.stepKind(1);
      this.padDown.set(p.index, now);
    }
  }

  /** The stat bars, easing to the selected body's values. */
  private drawBars(deltaMs: number): void {
    const g = this.bars.clear();
    const b = this.bodyModule;
    if (!b) return;
    const target = bodyStats(b);
    const k = Math.min(1, deltaMs / 90);
    const x = PANEL.x + 520;
    const w = PANEL.w - 520 - 50;
    BARS.forEach((bar, i) => {
      this.shown[bar.key] += (target[bar.key] - this.shown[bar.key]) * k;
      const y = PANEL.y + 158 + i * 28;
      g.fillStyle(0x0a1626, 0.9).fillRect(x, y - 5, w, 10);
      g.fillStyle(NEON, 0.95).fillRect(x, y - 5, w * this.shown[bar.key], 10);
      g.fillStyle(0xffffff, 0.35).fillRect(x, y - 5, w * this.shown[bar.key], 2);
    });
  }

  /** A helmet, weapon or feet module: the Kubot stands in the middle of the stage, wearing or holding it. */
  private standStill(dtMs: number): void {
    this.anim.tick(dtMs);
    if (this.anim.finished) this.anim.play('idle', { fade: 150 });
    this.kubot.update(this.anim.pose(), this.maps(), (STAGE.left + STAGE.right) / 2, FLOOR_Y, 0, { lean: 0, squash: 1, alpha: 1, flash: false, dtMs });
    this.kubot.view.setScale(-ART_SCALE * SHOW_SCALE, ART_SCALE * SHOW_SCALE);
  }

  /**
   * The demo Kubot runs to one end of the stage and back, jumping (a full hop)
   * after each short rest, with the body's run speed, air speed, jump, gravity
   * and fall speed: a floaty body hangs in the air, a heavy one drops.
   */
  private runDemo(dtMs: number): void {
    const d = this.demo;
    const f = this.bodyModule!.feel;
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
      const cap = Math.max(air, Math.abs(d.vx) - f.airAccel * PX * dt);
      d.vx = Phaser.Math.Clamp(d.vx, -cap, cap);
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
    this.kubot.update(this.anim.pose(), this.maps(), d.x, FLOOR_Y - d.h, d.face > 0 ? 0 : 180, { lean: 0, squash: 1, alpha: 1, flash: false, dtMs });
    this.kubot.view.setScale(-ART_SCALE * DEMO_SCALE, ART_SCALE * DEMO_SCALE);
  }

  /** The sandbox with a base Kubot on only this module (Classic helmet, Core body, no weapon otherwise); quitting comes back here. */
  private tryModule(): void {
    if (this.leaving) return;
    this.leaving = true;
    uiSound(this, 'confirm');
    const pad = this.input.gamepad?.gamepads.find((p) => p?.connected);
    const m = this.module;
    const fighter: FighterSpec = { input: 'P1', team: 0, helmet: 0, ...(pad ? { pad: pad.index } : {}) };
    if (this.kind === 'helmet') fighter.helmet = this.selected;
    if (this.kind === 'body') fighter.body = m.id;
    if (this.kind === 'weapon') fighter.weapon = WEAPONS[this.selected].weapon;
    const setup: MatchSetup = { mode: 'sandbox', fighters: [fighter], arena: 0, bonuses: 'off', returnTo: 'Modules' };
    shutter(this, () => this.scene.start('Game', setup));
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    shutter(this, () => this.scene.start('Title'), 'back');
  }
}
