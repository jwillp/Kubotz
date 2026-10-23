import Phaser from 'phaser';
import { Animator } from '../anim/Animator';
import { Rig } from '../anim/Rig';
import { ART_SCALE, Kubot2D } from '../anim/Kubot2D';
import { Config } from '../config';
import { HEADS, SLOT_COLORS, hex, partTexture } from '../game/Kubotz';
import {
  BONUS_RATES, CPU_LEVEL, CPU_LEVELS, RATE_ORDER, TEAM_NAMES,
  type BonusRate, type FighterSpec, type MatchSetup,
} from '../game/Match';
import { CTF_CAPTURES, KUBEBALL_POINTS, SKYCHASE_POINTS, HORDE_TEAM, MODES, TRAINING_RECHARGES, TRAINING_TARGETS, teamUp, type MatchMode } from '../game/Modes';
import { ARENA_INFO, arenaOf, isModeArena, type ArenaMode } from '../map/Arenas';
import { arenaThumbnail } from '../map/ArenaThumb';
import { GlitchBursts } from '../fx/GlitchBursts';
import type { SpriterData } from '../spriter/Spriter';
import { body, heading, HeadingText, NEON } from '../ui/Type';
import { drawGlow, drawPlate, drawStrip, footer, kubeBackdrop, METAL_EDGE, shutter } from '../ui/Plate';
import { LOGO_RES } from './BootScene';
import { faceButtons, MenuInput } from './MenuInput';
import { paintRoomOnce } from './BackdropScene';
import { ALL_THEMES, backdropOf } from '../fx/Backdrops';
import { uiSound } from '../audio/Sounds';

/**
 * What drives a slot: keyboard set 1 or 2, a gamepad (its index), the computer, or nobody.
 * 'PAD' is a gamepad not seen yet (browsers only show a pad once a button is pressed): the next pad to press A takes the slot,
 * and it already counts as a player (the match gives it the first free pad).
 */
type Device = 'K1' | 'K2' | number | 'CPU' | 'OFF' | 'PAD';

interface Seat { device: Device; team: number; helmet: number; level: number }

/** The setup screen's choices, kept in the registry so a rematch from the title keeps them. */
interface SetupState { seats: Seat[]; arena: number; recharges: number; minutes: number; bonuses: BonusRate; /** Training: CPUs to defeat. */ target?: number; /** Ball games: the score to reach (0: none), per game. */ score?: Partial<Record<'kubeball' | 'skychase', number>> }

const SLOTS = 4;
const SLOT_W = 282;
const SLOT_H = 250;
const SLOT_GAP = 20;
const SLOT_TOP = 398;
/** The chosen arena's frame, top centre. */
const CAROUSEL_Y = 212;
const CENTER_W = 300;
const RECHARGES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
/** Match lengths in minutes; 0 is no limit. */
const MINUTES = [0, 2, 3, 5, 8];
const HELMET_NAMES = ['Classic', 'Terminator', 'Big Buff', 'Skull',
  'Diver', 'Mantis', 'Sentinel', 'Tank', 'Astro', 'Brute'];
/** Rows in a slot: who drives it, its helmet, its team. */
const FIELDS = ['input', 'helmet', 'team'] as const;
type Field = typeof FIELDS[number];

/** Attack / special keys of the two keyboard sets: attack joins a free slot, special leaves it. */
const JOIN_KEYS: Record<'K1' | 'K2', { join: string[]; leave: string[] }> = {
  K1: { join: ['KeyO', 'KeyJ'], leave: ['KeyP'] },
  K2: { join: ['Comma', 'Numpad1'], leave: ['KeyN', 'Numpad4'] },
};
/** Shoulders in the standard gamepad mapping (A and B go by the pad's labels: faceButtons). */
const PAD = { L: 4, R: 5 } as const;

const deviceLabel = (s: Seat): string => {
  const d = s.device;
  if (d === 'K1') return 'Keyboard (WASD)';
  if (d === 'K2') return 'Keyboard (Arrows)';
  if (d === 'CPU') return `CPU Lv ${s.level}`;
  if (d === 'OFF') return 'Off';
  if (d === 'PAD') return 'Gamepad';
  return `Gamepad ${d + 1}`;
};
const deviceBlurb = (s: Seat): string => {
  const d = s.device;
  if (d === 'K1') return 'WASD move · Space jump\nO attack · P special';
  if (d === 'K2') return 'Arrows move · M jump\n, attack · N special';
  if (d === 'CPU') return s.level >= 7 ? 'Reads you, punishes\nevery opening.' : s.level <= 3 ? 'Takes its time.\nGood for practice.' : 'A fair fight.';
  if (typeof d === 'number') return 'Smash Ultimate layout';
  if (d === 'PAD') return 'Press A on a gamepad\nto take this slot.';
  return 'Press attack or pad A\nto join, or pick a CPU.';
};

/** A focusable thing: a rule at the top, a field of a slot, or START. */
type Focus = { kind: 'arena' | 'recharges' | 'time' | 'bonuses' | 'start' } | { kind: 'slot'; slot: number; field: Field };

interface Row {
  label: Phaser.GameObjects.Text;
  arrows: Phaser.GameObjects.Text[];
}

interface Slot {
  frame: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  tag: HeadingText;
  slotNo: Phaser.GameObjects.Text;
  blurb: Phaser.GameObjects.Text;
  rows: Record<Field, Row>;
  kubot: Kubot2D;
  anim: Animator;
  /** The colour the preview's parts are painted in. */
  color: number;
}

/** The way into the match: a slanted red plate, "START" in heavy italic Exo 2; selected, it glows and a light sweeps across. */
class StartButton extends Phaser.GameObjects.Container {
  private static readonly RED = 0xe8323a;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly sweep: Phaser.GameObjects.Graphics;
  private selected = false;
  private ready?: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly w: number, readonly h: number, private readonly slant = 20) {
    super(scene, x, y);
    const pts = (pad: number) => [
      new Phaser.Math.Vector2(-w / 2 + slant - pad, -h / 2 - pad), new Phaser.Math.Vector2(w / 2 + pad, -h / 2 - pad),
      new Phaser.Math.Vector2(w / 2 - slant + pad, h / 2 + pad), new Phaser.Math.Vector2(-w / 2 - pad, h / 2 + pad),
    ];
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    for (const [pad, width, alpha] of [[12, 14, 0.08], [8, 10, 0.14], [4.5, 6, 0.24], [2, 3, 0.45]] as const) {
      this.glow.lineStyle(width, 0xff4a4a, alpha).strokePoints(pts(pad), true);
    }
    const g = scene.add.graphics();
    g.fillStyle(StartButton.RED, 1).fillPoints(pts(0), true);
    // Lit from above: a brighter band along the top, a darker one along the bottom.
    g.fillStyle(0xff6a6a, 0.35).fillPoints([pts(0)[0], pts(0)[1],
      new Phaser.Math.Vector2(w / 2 - slant * 0.3, -h / 2 + h * 0.3), new Phaser.Math.Vector2(-w / 2 + slant * 0.7, -h / 2 + h * 0.3)], true);
    g.fillStyle(0x7a0c12, 0.35).fillRect(-w / 2 + 4, h / 2 - 6, w - slant - 4, 6);
    g.lineStyle(1.5, 0xffd0d0, 0.8).lineBetween(-w / 2 + slant, -h / 2, w / 2, -h / 2);
    this.sweep = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    const label = scene.add.text(4, 1, 'START ▶', body(38, { fontStyle: 'italic 800', color: '#ffffff' })).setOrigin(0.5)
      .setShadow(0, 3, '#5a0008', 0, false, true);
    this.add([this.glow, g, this.sweep, label]);
    this.setSize(w, h).setInteractive({ useHandCursor: true });
    scene.add.existing(this);
  }

  setSelected(on: boolean): this {
    if (on === this.selected) return this;
    this.selected = on;
    const tweens = this.scene.tweens;
    tweens.killTweensOf([this.glow, this.sweep]);
    this.glow.setAlpha(on ? 1 : 0);
    if (!on) { this.sweep.setVisible(false); return this; }
    tweens.add({ targets: this.glow, alpha: 0.5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const { w, h } = this;
    const g = this.sweep.clear().setVisible(true).setAlpha(1);
    g.fillStyle(0xffffff, 0.3).fillPoints([new Phaser.Math.Vector2(-8, -h / 2), new Phaser.Math.Vector2(14, -h / 2),
      new Phaser.Math.Vector2(-6, h / 2), new Phaser.Math.Vector2(-28, h / 2)], true);
    g.x = -w / 2 + this.slant;
    tweens.add({ targets: g, x: w / 2 - 8, alpha: 0, duration: 360, ease: 'Quad.in', onComplete: () => g.setVisible(false) });
    return this;
  }

  /** Ready: it beats gently. */
  setReady(ready: boolean): this {
    if (ready === this.ready) return this;
    this.ready = ready;
    this.setAlpha(ready ? 1 : 0.4);
    this.scene.tweens.killTweensOf(this);
    this.setScale(1);
    if (ready) this.scene.tweens.add({ targets: this, scale: 1.04, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return this;
  }
}

/**
 * The setup screen: arena, rules and Kubotz on one page (it replaced the
 * join screen and the arena select). The chosen arena fills the background,
 * dimmed and soft, and shows whole in the frame at the top, both rendered live; recharges, time and power-ups beside it; four
 * slots below, each with its Kubot in its team colour and helmet; START.
 *
 * One cursor (arrows / WASD, any gamepad's D-pad or stick) moves up and down
 * through the rows, left / right changes the value; Q / E or the pad's
 * shoulders jump between slots. A keyboard set's attack key or a new
 * gamepad's A takes the first free slot, special / B leaves it. Every arrow
 * can be clicked too.
 */
export class SetupScene extends Phaser.Scene {
  private state!: SetupState;
  private focus: Focus = { kind: 'start' };
  private slots: Slot[] = [];
  private menu!: MenuInput;
  private leaving = false;
  /** The live arena (GameScene in preview mode); the canvas renderer keeps the picture. */
  private live = false;
  private center!: Phaser.GameObjects.Image;
  /** Dims the arena behind the menu, around the centre frame. */
  private dim!: Phaser.GameObjects.Graphics;
  private arenaFrame!: Phaser.GameObjects.Graphics;
  private arenaName!: HeadingText;
  private arenaBlurb!: Phaser.GameObjects.Text;
  private rules: Record<'recharges' | 'time' | 'bonuses', { title: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text; glow: Phaser.GameObjects.Graphics; box: Phaser.Geom.Rectangle }> = {} as never;
  private start!: StartButton;
  private status!: Phaser.GameObjects.Text;
  /** The battle mode picked on the mode screen. */
  private mode: MatchMode = 'gladiator';
  /** Pad buttons down last frame, per pad, for joins and leaves. */
  private padDown = new Map<number, Set<number>>();
  private keyPresses = new Map<string, number>();
  private seenKeys = new Map<string, number>();

  constructor() { super('Setup'); }

  create(): void {
    this.slots = [];
    this.leaving = false;
    this.padDown.clear();
    this.mode = (this.registry.get('mode') as MatchMode | undefined) ?? 'gladiator';
    const saved = this.registry.get('setup') as SetupState | undefined;
    this.state = saved ? structuredClone(saved) : {
      seats: [
        { device: 'K1', team: 0, helmet: 0, level: CPU_LEVEL },
        { device: 'CPU', team: 1, helmet: 1, level: CPU_LEVEL },
        { device: 'OFF', team: 2, helmet: 2, level: CPU_LEVEL },
        { device: 'OFF', team: 3, helmet: 3, level: CPU_LEVEL },
      ],
      arena: (this.registry.get('arena') as number | undefined) ?? 0,
      recharges: Config.NB_LIVES,
      minutes: 0,
      bonuses: (this.registry.get('bonuses') as BonusRate | undefined) ?? 'normal',
    };
    // Pads that went away since: their slots empty.
    for (const s of this.state.seats) if (typeof s.device === 'number' && !this.pad(s.device)) s.device = 'OFF';
    this.state.target ??= 10;
    // Training is for one player: slot 1 is a person (the keyboard by default).
    if (this.solo && (this.state.seats[0].device === 'OFF' || this.state.seats[0].device === 'CPU')) this.state.seats[0].device = 'K1';
    // Capture the Flag plays its own arena, and only it does.
    if (this.modeArena >= 0) this.state.arena = this.modeArena;
    else if (isModeArena(this.state.arena)) this.state.arena = 0;
    this.focus = { kind: 'start' };

    const { width } = this.scale;
    this.live = this.sys.renderer.type === Phaser.WEBGL;
    // Every arena's room painted now, while the screen change still covers the screen, not on the first switch to it.
    if (this.live) ARENA_INFO.forEach((_, i) => paintRoomOnce(this, ALL_THEMES.indexOf(backdropOf(i))));
    kubeBackdrop(this, this.live ? 0 : 0.3);
    // The chosen arena is the menu's background (GameScene behind this scene), dimmed except in its frame.
    this.dim = this.add.graphics();
    if (this.live) {
      this.lights.enable().setAmbientColor(0xb4bcdc);
      // Key light from the top left over the slots, a blue rim from below right.
      this.lights.addLight(width * 0.3, 260, 1500, 0xffe8cc, 2.6);
      this.lights.addLight(width * 0.8, 768, 1300, 0x3aa8ff, 1.6);
    }

    // The original logo top left, ARENA under it.
    // As on the title, at 0.62 / 1.3 of its size: ARENA centred under the logo.
    // They glitch together, as on the title.
    const logo = this.add.image(0, 0, 'logo').setOrigin(0, 0.5).setScale(0.62 / LOGO_RES);
    const arena = heading(this, logo.displayWidth / 2, 108 * 0.62 / 1.3, 'A R E N A', 34 * 0.62 / 1.3, { glitch: false });
    new GlitchBursts(this.add.container(48, 64, [logo, arena]), { jolt: 2 });
    this.add.text(width - 40, 40, 'Gamepads: Smash Ultimate layout\nKeyboards: P1 WASD + O / P · P2 Arrows + , / N',
      body(13, { fontStyle: '500', color: '#8fb6d8', align: 'right', lineSpacing: 4 })).setOrigin(1, 0);

    this.makeCarousel();
    this.makeRules();
    const rig = new Rig(this.registry.get('spriter') as SpriterData);
    for (let i = 0; i < SLOTS; i++) this.slots.push(this.makeSlot(i, rig));

    this.start = new StartButton(this, width / 2, 690, 290, 54);
    this.start.on('pointerover', () => this.setFocus({ kind: 'start' }));
    this.start.on('pointerdown', () => this.go());
    this.status = this.add.text(width / 2 + 180, 692, '', body(15, { fontStyle: '600', color: '#ffd27a' })).setOrigin(0, 0.5);
    footer(this, ['↑↓ choose · ◀ ▶ change · Q / E or L / R: next slot · attack / pad A joins, special / B leaves · Enter / Start: fight · Esc: back']);

    this.menu = new MenuInput({
      move: (dx, dy) => this.move(dx, dy),
      confirm: () => (this.focus.kind === 'start' ? this.go() : this.move(0, 1)),
      back: () => this.back(),
    }, false, { confirm: [9], back: [] });
    this.seenKeys = new Map(this.keyPresses);
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat) this.keyPresses.set(e.code, (this.keyPresses.get(e.code) ?? 0) + 1);
      if (e.code === 'KeyQ') this.jumpSlot(-1);
      if (e.code === 'KeyE') this.jumpSlot(1);
    });
    this.refresh();
    this.pickArena(0);
  }

  // ------------------------------------------------------------------ layout
  private slotX(i: number): number {
    const left = (this.scale.width - SLOTS * SLOT_W - (SLOTS - 1) * SLOT_GAP) / 2;
    return left + i * (SLOT_W + SLOT_GAP);
  }

  private arrow(x: number, y: number, label: string, onClick: () => void, size = 22): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, label, body(size, { fontStyle: '800', color: '#e9f6ff' })).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setScale(1.15).setColor('#29abe2'));
    t.on('pointerout', () => t.setScale(1).setColor('#e9f6ff'));
    t.on('pointerdown', onClick);
    return t;
  }

  private makeCarousel(): void {
    const { width } = this.scale;
    this.arenaFrame = this.add.graphics();
    this.center = this.add.image(width / 2, CAROUSEL_Y, arenaThumbnail(this, 0, CENTER_W))
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setFocus({ kind: 'arena' }));
    if (this.live) this.center.setAlpha(0);
    const h = this.center.height;
    this.add.text(width / 2, CAROUSEL_Y - h / 2 - 22, 'A R E N A', body(13, { fontStyle: '700', color: '#9fc4e4' })).setOrigin(0.5);
    this.arrow(width / 2 - CENTER_W / 2 - 34, CAROUSEL_Y, '◀', () => this.pickArena(-1), 40);
    this.arrow(width / 2 + CENTER_W / 2 + 34, CAROUSEL_Y, '▶', () => this.pickArena(1), 40);
    this.arenaName = heading(this, width / 2, CAROUSEL_Y + h / 2 + 28, '', 28);
    this.arenaBlurb = this.add.text(width / 2, CAROUSEL_Y + h / 2 + 53, '', body(14, { fontStyle: '500', color: '#9fe3ff' })).setOrigin(0.5);
  }

  /** Recharges and time on the right of the arena, power-ups on the left. */
  private makeRules(): void {
    const { width } = this.scale;
    const rule = (key: 'recharges' | 'time' | 'bonuses', x: number, y: number, title: string, d: (n: number) => void) => {
      const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      const g = this.add.graphics();
      const box = new Phaser.Geom.Rectangle(x - 80, y - 36, 160, 72);
      drawPlate(g, box.x, box.y, box.width, box.height, { cut: 12, alpha: 0.7 });
      const label = this.add.text(x, y - 18, title, body(13, { fontStyle: '700', color: '#9fc4e4' })).setOrigin(0.5);
      const value = this.add.text(x, y + 10, '', body(26, { fontStyle: '800' })).setOrigin(0.5);
      this.arrow(x - 58, y + 10, '◀', () => d(-1));
      this.arrow(x + 58, y + 10, '▶', () => d(1));
      this.add.zone(x, y, 100, 72).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setFocus({ kind: key }));
      this.rules[key] = { title: label, value, glow, box };
    };
    const right = width - 136;
    rule('recharges', right, CAROUSEL_Y - 50, 'RECHARGES', (d) => this.change({ kind: 'recharges' }, d));
    rule('time', right, CAROUSEL_Y + 50, 'TIME', (d) => this.change({ kind: 'time' }, d));
    rule('bonuses', 136, CAROUSEL_Y + 50, 'POWER-UPS', (d) => this.change({ kind: 'bonuses' }, d));
    // The mode picked on the previous screen, above the power-ups (Back changes it).
    const y = CAROUSEL_Y - 50;
    const g = drawPlate(this.add.graphics(), 136 - 80, y - 36, 160, 72, { cut: 12, alpha: 0.7 });
    drawStrip(g, 136 - 80 + 12, y + 36, 136 + 80, y + 36, NEON, 2);
    this.add.text(136, y - 18, 'MODE', body(13, { fontStyle: '700', color: '#9fc4e4' })).setOrigin(0.5);
    const name = this.add.text(136, y + 10, MODES[this.mode].name.toUpperCase(), body(22, { fontStyle: 'italic 800' })).setOrigin(0.5);
    if (name.width > 140) name.setScale(140 / name.width); // long names (Capture the Flag) fit the plate
  }

  /** Horde: every Kubot on the players' team against the black team. */
  private get oneTeam(): boolean { return teamUp(MODES[this.mode]) || this.solo; }
  /** The arena a mode plays only (Capture the Flag, the ball games), or -1. */
  private get modeArena(): number {
    const m = MODES[this.mode];
    return arenaOf((m.ctf ? 'ctf' : m.ball) as ArenaMode | undefined);
  }

  /** Ball games: the score to reach picked here (0: none). */
  private ballScore(): number {
    const ball = MODES[this.mode].ball;
    if (!ball) return 0;
    return this.state.score?.[ball] ?? (ball === 'kubeball' ? 7 : 150);
  }

  /** Training: one player, slot 1 only. */
  private get solo(): boolean { return !!MODES[this.mode].solo; }
  /** A seat's team in this mode. */
  /** A seat's team in this mode (ball games: red or blue). */
  private teamOf(seat: Seat): number { return this.oneTeam ? HORDE_TEAM : MODES[this.mode].ball ? seat.team % 2 : seat.team; }

  private makeSlot(i: number, rig: Rig): Slot {
    const x = this.slotX(i);
    const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const frame = this.add.graphics();
    const tag = heading(this, x + 44, SLOT_TOP + 6, '', 30, { glow: null, glitch: false }); // a player tag, not a title
    const slotNo = this.add.text(x + 104, SLOT_TOP + 14, `SLOT ${i + 1}`, body(12, { fontStyle: '700', color: '#9fc4e4' })).setOrigin(0, 0.5);
    const blurb = this.add.text(x + 18, SLOT_TOP + 58, '', body(12, { fontStyle: '500', color: '#cfe9ff', lineSpacing: 3 }));
    const rows = {} as Record<Field, Row>;
    FIELDS.forEach((f, r) => {
      const y = SLOT_TOP + 150 + r * 36;
      rows[f] = {
        label: this.add.text(x + SLOT_W / 2, y, '', body(16, { fontStyle: '800' })).setOrigin(0.5)
          .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setFocus({ kind: 'slot', slot: i, field: f })),
        arrows: [
          this.arrow(x + 22, y, '◀', () => { this.setFocus({ kind: 'slot', slot: i, field: f }); this.change(this.focus, -1); }),
          this.arrow(x + SLOT_W - 22, y, '▶', () => { this.setFocus({ kind: 'slot', slot: i, field: f }); this.change(this.focus, 1); }),
        ],
      };
    });
    const slot: Slot = { frame, glow, tag, slotNo, blurb, rows, kubot: null!, anim: new Animator(rig), color: SLOT_COLORS[0] };
    // The Kubot stands over the top right of its slot, in front of the plate.
    slot.kubot = new Kubot2D(this, rig, (file) => partTexture(this.textures, file, slot.color));
    slot.anim.play('idle', { restart: true });
    return slot;
  }

  // ------------------------------------------------------------------- state
  private pad(index: number): Phaser.Input.Gamepad.Gamepad | undefined {
    return this.input.gamepad?.gamepads.find((p) => p?.index === index && p.connected);
  }

  /** The devices a slot's input row cycles through: off, the keyboards, connected pads not taken, the CPU levels. */
  private choices(slot: number): Seat[] {
    const seat = this.state.seats[slot];
    const taken = new Set(this.state.seats.filter((_, j) => j !== slot).map((s) => s.device));
    const devs: Device[] = ['OFF', 'K1', 'K2'];
    for (const p of this.input.gamepad?.gamepads ?? []) if (p?.connected) devs.push(p.index);
    // No free pad known yet: a slot waiting for one.
    if (!devs.some((d) => typeof d === 'number' && !taken.has(d))) devs.push('PAD');
    const out = devs.filter((d) => d === 'OFF' || !taken.has(d)).map((device) => ({ ...seat, device }));
    if (this.solo) return out.filter((c) => c.device !== 'OFF'); // training: a person, never a CPU or nobody
    for (let l = 1; l <= CPU_LEVELS; l++) out.push({ ...seat, device: 'CPU', level: l });
    return out;
  }

  private change(f: Focus, d: number): void {
    const s = this.state;
    switch (f.kind) {
      case 'arena': this.pickArena(d); return;
      case 'recharges': {
        const ball = MODES[this.mode].ball;
        if (ball) {
          const list = ball === 'kubeball' ? KUBEBALL_POINTS : SKYCHASE_POINTS;
          s.score = { ...s.score, [ball]: list[(list.indexOf(this.ballScore()) + d + list.length) % list.length] };
          break;
        }
      }
        if (this.fixedRecharges() !== null) return; s.recharges = RECHARGES[(RECHARGES.indexOf(s.recharges) + d + RECHARGES.length) % RECHARGES.length]; break;
      case 'time':
        if (MODES[this.mode].trial) { s.target = TRAINING_TARGETS[(TRAINING_TARGETS.indexOf(s.target ?? 10) + d + TRAINING_TARGETS.length) % TRAINING_TARGETS.length]; break; }
        if (this.oneTeam) return;
        s.minutes = MINUTES[(MINUTES.indexOf(s.minutes) + d + MINUTES.length) % MINUTES.length]; break;
      case 'bonuses': s.bonuses = RATE_ORDER[(RATE_ORDER.indexOf(s.bonuses) + d + RATE_ORDER.length) % RATE_ORDER.length]; break;
      case 'start': return;
      case 'slot': {
        const seat = s.seats[f.slot];
        if (f.field === 'input') {
          const list = this.choices(f.slot);
          const at = list.findIndex((c) => c.device === seat.device && (c.device !== 'CPU' || c.level === seat.level));
          const next = list[(Math.max(0, at) + d + list.length) % list.length];
          seat.device = next.device;
          seat.level = next.level;
          if (seat.device !== 'OFF') this.taunt(f.slot);
        } else if (seat.device === 'OFF' || (f.field === 'team' && this.oneTeam)) {
          return;
        } else if (f.field === 'helmet') {
          seat.helmet = (seat.helmet + d + HEADS.length) % HEADS.length;
        } else {
          // Ball games: red or blue.
          const teams = MODES[this.mode].ball ? 2 : SLOT_COLORS.length;
          seat.team = ((seat.team % teams) + d + teams) % teams;
          this.taunt(f.slot);
        }
      }
    }
    uiSound(this, 'tick');
    this.refresh();
  }

  private pickArena(d: number): void {
    const s = this.state;
    if (this.modeArena >= 0) d = 0; // its own arena only
    s.arena = (s.arena + d + ARENA_INFO.length) % ARENA_INFO.length;
    // An arena that belongs to one mode is skipped by the others.
    while (isModeArena(s.arena) && this.modeArena < 0) s.arena = (s.arena + (d || 1) + ARENA_INFO.length) % ARENA_INFO.length;
    if (d) uiSound(this, 'move');
    const { width } = this.scale;
    this.center.setTexture(arenaThumbnail(this, s.arena, CENTER_W));
    if (this.live) this.showArena();
    else if (d) {
      this.center.setX(width / 2 + d * 40).setAlpha(0.3);
      this.tweens.add({ targets: this.center, x: width / 2, alpha: 1, duration: 180, ease: 'Cubic.out' });
    }
    this.arenaName.setText(ARENA_INFO[s.arena].name);
    this.arenaBlurb.setText(ARENA_INFO[s.arena].description);
    if (d) this.focus = { kind: 'arena' };
    this.refresh();
  }

  /** Renders the chosen arena live in the centre frame (GameScene in preview mode, under this scene). */
  private showArena(): void {
    const { width } = this.scale;
    const w = this.center.width;
    const h = this.center.height;
    const { height } = this.scale;
    const setup: MatchSetup = {
      fighters: [], arena: this.state.arena, bonuses: this.state.bonuses,
      preview: { x: 0, y: 0, width, height, inset: { x: width / 2 - w / 2, y: CAROUSEL_Y - h / 2, width: w, height: h } },
    };
    // Dark over the background arena, clear over the frame.
    const fy = CAROUSEL_Y - h / 2;
    const fx = width / 2 - w / 2;
    this.dim.clear().fillStyle(0x050b18, 0.38)
      .fillRect(0, 0, width, fy).fillRect(0, fy + h, width, height - fy - h)
      .fillRect(0, fy, fx, h).fillRect(fx + w, fy, width - fx - w, h);
    // A new arena flashes in behind.
    this.dim.setAlpha(1);
    this.tweens.killTweensOf(this.dim);
    this.tweens.add({ targets: this.dim, alpha: { from: 0.45, to: 1 }, duration: 320, ease: 'Quad.out' });
    const game = this.scene.get('Game');
    if (game.sys.isActive()) game.scene.restart(setup);
    else this.scene.launch('Game', setup);
    this.scene.bringToTop();
  }

  private taunt(slot: number): void {
    this.slots[slot]?.anim.play('taunt', { restart: true, ms: 700, fade: 60 });
  }

  /** The slots in the match (a slot still waiting for a pad is one). */
  private seats(): Seat[] { return this.state.seats.filter((s, i) => s.device !== 'OFF' && (!this.solo || i === 0)); }

  /** Recharges the mode sets itself (∞ in the sandbox and Capture the Flag, 3 in training), or null when they are picked here. */
  private fixedRecharges(): number | null {
    const m = MODES[this.mode];
    return m.sandbox || m.ctf ? Infinity : m.trial ? TRAINING_RECHARGES : null;
  }

  /** Why START is greyed out, if it is: too few Kubotz (the grey button says it), or everyone on one team. */
  private problem(): 'few' | 'one team' | null {
    const seats = this.seats();
    // Horde: one Kubot is enough, and everyone is on one team anyway.
    // Ball games: CPUs fill both teams.
    if (this.oneTeam || MODES[this.mode].ball) return seats.length < 1 ? 'few' : null;
    if (seats.length < 2) return 'few';
    if (new Set(seats.map((s) => s.team)).size < 2) return 'one team';
    return null;
  }

  // -------------------------------------------------------------- navigation
  /** The rows the cursor steps through, top to bottom, for the slot it is in (or the first). */
  private order(slot: number): Focus[] {
    const seat = this.state.seats[this.solo ? 0 : slot];
    const fields: Field[] = seat.device === 'OFF' ? ['input'] : FIELDS.filter((f) => f !== 'team' || !this.oneTeam);
    return [
      { kind: 'arena' }, { kind: 'recharges' }, { kind: 'time' }, { kind: 'bonuses' },
      ...fields.map((field): Focus => ({ kind: 'slot', slot, field })),
      { kind: 'start' },
    ];
  }

  private lastSlot = 0;

  private move(dx: number, dy: number): void {
    if (dy) {
      const f = this.focus;
      const slot = f.kind === 'slot' ? f.slot : this.lastSlot;
      const list = this.order(slot);
      const at = list.findIndex((g) => g.kind === f.kind && (g.kind !== 'slot' || (f.kind === 'slot' && g.field === f.field)));
      this.setFocus(list[Phaser.Math.Clamp(at + dy, 0, list.length - 1)]);
    } else if (dx) {
      this.change(this.focus, dx);
    }
  }

  /** Q / E, or a pad's shoulders: the same row of the next slot. */
  private jumpSlot(d: number): void {
    if (this.solo) return;
    const f = this.focus;
    const slot = ((f.kind === 'slot' ? f.slot : this.lastSlot) + d + SLOTS) % SLOTS;
    const field = f.kind === 'slot' && (f.field === 'input' || this.state.seats[slot].device !== 'OFF') ? f.field : 'input';
    this.setFocus({ kind: 'slot', slot, field });
  }

  private setFocus(f: Focus): void {
    if (JSON.stringify(f) !== JSON.stringify(this.focus)) uiSound(this, 'move');
    this.focus = f;
    if (f.kind === 'slot') this.lastSlot = f.slot;
    this.refresh();
  }

  /**
   * A gamepad the browser shows (connected, or woken by a press) goes to
   * player 1 by itself when player 1 is still on the keyboard, waiting for a
   * pad or off, once per pad: set back to the keyboard, it stays there.
   */
  private autoAssignPad(): void {
    const done = (this.registry.get('padsAutoAssigned') as string[] | undefined) ?? [];
    const seat = this.state.seats[0];
    for (const p of this.input.gamepad?.gamepads ?? []) {
      if (!p?.connected || done.includes(p.id + p.index)) continue;
      this.registry.set('padsAutoAssigned', [...done, p.id + p.index]);
      if (this.state.seats.some((s) => s.device === p.index)) return;
      if (seat.device !== 'K1' && seat.device !== 'PAD' && seat.device !== 'OFF') return;
      seat.device = p.index;
      // The press that woke the pad does not also count as A (that would start the match).
      this.padDown.set(p.index, new Set(p.buttons.filter((b) => b.pressed).map((b) => b.index)));
      uiSound(this, 'confirm');
      this.taunt(0);
      this.refresh();
      return;
    }
  }

  /** Joins and leaves: a keyboard set's attack or a pad's A takes the first free slot; special / B leaves. */
  private pollJoins(): void {
    for (const set of ['K1', 'K2'] as const) {
      const fresh = (codes: string[]) => codes.some((c) => (this.keyPresses.get(c) ?? 0) !== (this.seenKeys.get(c) ?? 0));
      if (fresh(JOIN_KEYS[set].join)) this.join(set);
      if (fresh(JOIN_KEYS[set].leave)) this.leave(set);
    }
    this.seenKeys = new Map(this.keyPresses);
    for (const p of this.input.gamepad?.gamepads ?? []) {
      if (!p?.connected) continue;
      const before = this.padDown.get(p.index) ?? new Set<number>();
      const now = new Set(p.buttons.filter((b) => b.pressed).map((b) => b.index));
      const pressed = (b: number) => now.has(b) && !before.has(b);
      const seated = this.state.seats.some((s) => s.device === p.index);
      const { A, B } = faceButtons(p);
      if (pressed(A)) { if (seated) this.confirm(); else this.join(p.index); }
      if (pressed(B)) { if (seated) this.leave(p.index); else this.back(); }
      if (pressed(PAD.L)) this.jumpSlot(-1);
      if (pressed(PAD.R)) this.jumpSlot(1);
      this.padDown.set(p.index, now);
    }
  }

  private confirm(): void {
    if (this.focus.kind === 'start') this.go(); else this.move(0, 1);
  }

  private join(device: Device): void {
    const seats = this.state.seats;
    if (seats.some((s) => s.device === device)) return;
    // A slot waiting for a pad (for a pad), else the first empty slot, else the first CPU's.
    const waiting = typeof device === 'number' ? seats.findIndex((s) => s.device === 'PAD') : -1;
    const i = this.solo ? 0 : waiting >= 0 ? waiting : seats.findIndex((s) => s.device === 'OFF') >= 0 ? seats.findIndex((s) => s.device === 'OFF') : seats.findIndex((s) => s.device === 'CPU');
    if (i < 0) return;
    seats[i].device = device;
    uiSound(this, 'confirm');
    this.setFocus({ kind: 'slot', slot: i, field: 'helmet' });
    this.taunt(i);
  }

  private leave(device: Device): void {
    if (this.solo) return; // training keeps its one player
    const seat = this.state.seats.find((s) => s.device === device);
    if (seat) { seat.device = 'OFF'; this.refresh(); uiSound(this, 'back'); }
  }

  // ------------------------------------------------------------------ drawing
  private refresh(): void {
    const s = this.state;
    const f = this.focus;
    const on = (k: Focus['kind']) => f.kind === k;
    // Rules: values, and the focused one glows.
    const fixed = this.fixedRecharges();
    const ball = MODES[this.mode].ball;
    this.rules.recharges.title.setText(ball ? 'POINTS' : 'RECHARGES');
    this.rules.recharges.value.setText(ball ? (this.ballScore() || '∞').toString()
      : fixed === null ? String(s.recharges) : Number.isFinite(fixed) ? String(fixed) : '∞');
    // The time box: the training's target, Capture the Flag's captures, else the time limit.
    const m = MODES[this.mode];
    this.rules.time.title.setText(m.trial ? 'DEFEAT' : m.ctf ? 'CAPTURES' : 'TIME');
    this.rules.time.value.setText(m.trial ? String(s.target ?? 10) : m.ctf ? String(CTF_CAPTURES) : s.minutes && !this.oneTeam ? `${s.minutes}:00` : '∞');
    this.rules.bonuses.value.setText(BONUS_RATES[s.bonuses].label).setFontSize(s.bonuses === 'frequent' ? 20 : 24);
    for (const k of ['recharges', 'time', 'bonuses'] as const) {
      const r = this.rules[k];
      r.glow.clear();
      if (on(k)) drawGlow(r.glow, r.box.x, r.box.y, r.box.width, r.box.height, { cut: 12 });
    }
    // The arena frame: lit, and glowing when focused.
    const { width } = this.scale;
    const w = this.center.width;
    const h = this.center.height;
    const fx = width / 2 - w / 2 - 8;
    const fy = CAROUSEL_Y - h / 2 - 8;
    this.arenaFrame.clear();
    if (on('arena')) drawGlow(this.arenaFrame, fx, fy, w + 16, h + 16, { cut: 16 });
    drawPlate(this.arenaFrame, fx, fy, w + 16, h + 16, { cut: 16, edge: on('arena') ? NEON : METAL_EDGE, alpha: this.live ? 0 : 0.92 });
    drawStrip(this.arenaFrame, fx + 16, fy, fx + w * 0.5, fy, NEON, 3);
    drawStrip(this.arenaFrame, fx + w * 0.5, fy + h + 16, fx + w, fy + h + 16, NEON, 3);

    let humanNo = 0;
    this.slots.forEach((p, i) => this.drawSlot(p, i, s.seats[i], s.seats[i].device === 'CPU' ? 'CPU' : s.seats[i].device === 'OFF' ? '' : `P${++humanNo}`));

    const problem = this.problem();
    this.start.setSelected(on('start'));
    this.start.setReady(!problem);
    this.status.setText(problem === 'one team' ? 'Everyone is on one team' : '');
    this.registry.set('setup', structuredClone(s));
    this.registry.set('arena', s.arena);
    this.registry.set('bonuses', s.bonuses);
  }

  private drawSlot(p: Slot, i: number, seat: Seat, tag: string): void {
    const x = this.slotX(i);
    const off = seat.device === 'OFF';
    const color = off ? 0x3a4a66 : SLOT_COLORS[this.teamOf(seat)];
    const f = this.focus;
    const focused = f.kind === 'slot' && f.slot === i ? f.field : null;
    p.color = color;
    p.glow.clear();
    if (focused) drawGlow(p.glow, x, SLOT_TOP, SLOT_W, SLOT_H, { cut: 22, color: off ? NEON : color });
    const g = p.frame.clear();
    drawPlate(g, x, SLOT_TOP, SLOT_W, SLOT_H, { cut: 22, alpha: off ? 0.55 : 0.9, edge: off ? METAL_EDGE : color });
    // The tag: a slanted plate in the team colour, top left.
    g.fillStyle(color, off ? 0.6 : 1).fillPoints([
      new Phaser.Math.Vector2(x + 2, SLOT_TOP - 6), new Phaser.Math.Vector2(x + 92, SLOT_TOP - 6),
      new Phaser.Math.Vector2(x + 84, SLOT_TOP + 34), new Phaser.Math.Vector2(x + 2, SLOT_TOP + 34),
    ], true);
    g.lineStyle(1, 0xffffff, 0.4).lineBetween(x + 2, SLOT_TOP - 6, x + 92, SLOT_TOP - 6);
    if (off) g.fillStyle(0xffffff, 0.7).fillRect(x + 32, SLOT_TOP + 12, 24, 4);
    if (!off) {
      drawStrip(g, x + 8, SLOT_TOP + SLOT_H - 2, x + SLOT_W - 24, SLOT_H + SLOT_TOP - 2, color, 3);
    }
    // The focused row: a wash in the slot's colour.
    if (focused) {
      const r = FIELDS.indexOf(focused);
      g.fillStyle(off ? NEON : color, 0.22).fillRect(x + 8, SLOT_TOP + 150 + r * 36 - 15, SLOT_W - 16, 30);
    }
    p.tag.setText(off ? '' : tag).setPosition(x + 44, SLOT_TOP + 15);
    p.blurb.setText(deviceBlurb(seat));
    p.rows.input.label.setText(deviceLabel(seat)).setColor(off ? '#9fc4e4' : '#ffffff');
    p.rows.helmet.label.setText(HELMET_NAMES[seat.helmet] ?? `Helmet ${seat.helmet + 1}`);
    p.rows.team.label.setText(this.oneTeam ? 'PLAYERS TEAM' : `${TEAM_NAMES[this.teamOf(seat)]} team`.toUpperCase()).setColor('#' + hex(Phaser.Display.Color.ValueToColor(color).lighten(18).color));
    for (const field of ['helmet', 'team'] as const) {
      p.rows[field].label.setVisible(!off);
      for (const a of p.rows[field].arrows) a.setVisible(!off && (field !== 'team' || !this.oneTeam));
    }
    p.kubot.visible = !off;
    // Training: only slot 1 shows.
    const shown = !this.solo || i === 0;
    for (const o of [p.frame, p.glow, p.tag, p.slotNo, p.blurb, ...Object.values(p.rows).flatMap((r) => [r.label, ...r.arrows])]) if (!shown) o.setVisible(false);
    if (!shown) p.kubot.visible = false;
  }

  // ------------------------------------------------------------------- frame
  update(time: number, deltaMs: number): void {
    if (this.leaving) return;
    this.autoAssignPad();
    this.pollJoins();
    this.menu.update(time);
    const seats = this.state.seats;
    this.slots.forEach((p, i) => {
      if (seats[i].device === 'OFF' || (this.solo && i > 0)) return;
      p.anim.tick(deltaMs);
      if (p.anim.finished) p.anim.play('idle', { fade: 150 });
      const head = HEADS[seats[i].helmet];
      // Standing over the slot's top right, facing into the slot.
      p.kubot.update(p.anim.pose(), head ? [head] : [], this.slotX(i) + SLOT_W - 78, SLOT_TOP + 128, 160,
        { lean: 0, squash: 1, alpha: 1, flash: false, dtMs: deltaMs });
      p.kubot.view.setScale(-ART_SCALE * 0.78, ART_SCALE * 0.78);
    });
  }

  /** The fighters for the match: humans keep their keyboard set or pad. */
  private fighters(): FighterSpec[] {
    let humans = 0;
    // A slot still waiting for its pad gets the first pad no other slot has (the next one the browser shows).
    const taken = new Set(this.state.seats.map((s) => s.device).filter((d) => typeof d === 'number'));
    const freePad = () => { let i = 0; while (taken.has(i)) i++; taken.add(i); return i; };
    return this.seats().map((s): FighterSpec => {
      const team = this.teamOf(s);
      if (s.device === 'CPU') return { input: 'CPU', team, helmet: s.helmet, cpuLevel: s.level };
      const n = humans++;
      if (s.device === 'K1' || s.device === 'K2') return { input: s.device === 'K1' ? 'P1' : 'P2', team, helmet: s.helmet };
      return { input: n % 2 === 0 ? 'P1' : 'P2', pad: s.device === 'PAD' ? freePad() : s.device as number, team, helmet: s.helmet };
    });
  }

  private go(): void {
    if (this.problem() || this.leaving) return;
    this.leaving = true;
    const s = this.state;
    const setup: MatchSetup = {
      mode: this.mode, fighters: this.fighters(), arena: s.arena, bonuses: s.bonuses, recharges: s.recharges, minutes: this.oneTeam ? 0 : s.minutes,
      target: MODES[this.mode].ball ? this.ballScore() : s.target,
    };
    shutter(this, () => { this.scene.stop('Game'); this.scene.start('Game', setup); });
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    shutter(this, () => { this.scene.stop('Game'); this.scene.start('Modes'); }, 'back');
  }
}
