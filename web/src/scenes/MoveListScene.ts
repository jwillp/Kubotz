import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { Animator } from '../anim/Animator';
import { Rig } from '../anim/Rig';
import { ART_SCALE, Robot2D } from '../anim/Robot2D';
import type { SpriterData } from '../spriter/Spriter';
import {
  GUN_FILE, HEADS, PART_TIPS, ROOT_MOTION_GAIN, SLOT_COLORS, SWORD_FILE, THROWS, hex, partTexture, type Launch, type ThrowKind,
} from '../game/Kubotz';
import { MOVE_LIST, type MoveEntry, type Step } from '../game/MoveList';
import { opaqueOutline } from './GameScene';
import { BODY_FAMILY, heading } from '../ui/Type';
import { shutter } from '../ui/Plate';

/** Where the preview stage sits in the world, away from the list (its own camera shows it). */
const STAGE_X = 6000;
const STAGE_Y = 6000;
/** The preview panel (screen pixels). */
const PANEL = { x: 600, y: 92, w: 648, h: 470 };
/** The list (screen pixels). */
const LIST = { x: 32, y: 92, w: 540, h: 644 };
const ROW_H = 30;
const HEADER_H = 38;
/** Rest between two plays of a move. */
const PAUSE_MS = 650;
const COLOR = SLOT_COLORS[0];
const VICTIM_COLOR = SLOT_COLORS[1];
/** Preview speeds (the toggle at the top). */
const SPEEDS = [{ label: 'Normal', rate: 1 }, { label: 'Slow', rate: 0.35 }];
/** The speed chosen, kept for the next visit. */
let speedIndex = 0;
const FALL_GRAVITY = Config.GRAVITY * (1 + Config.FALL_GRAVITY_BONUS);

const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * One play-through of an entry's steps on a robot: the clips in order, with
 * just enough body motion to read them (jumps and gravity, root motion of
 * strikes, bursts of specials, recoil, ledge get-ups along their path).
 * Positions are stage pixels: x forwards (the robot faces right), y down,
 * the ground at y = 0.
 */
class PreviewRun {
  x = 0; y = 0; vx = 0; vy = 0;
  index = -1;
  stepMs = 0;
  /** 0..1 through the current strike (the held part of a smash stays at its wind-up). */
  progress = 0;
  done = false;
  private from = { x: 0, y: 0 };
  /** Shots fired this tick (charge 0..1), for the scene to draw. */
  shots: number[] = [];

  constructor(private readonly entry: MoveEntry, readonly anim: Animator) {
    const [sx, sy] = entry.start ?? [0, 0];
    this.x = sx * UNIT;
    this.y = -sy * UNIT;
  }

  get step(): Step | null { return this.entry.steps[this.index] ?? null; }

  /** The ground under a point: the floor, or (ledge stage) only right of the ledge. */
  private groundAt(x: number): number {
    return this.entry.ledge && x < -0.45 * UNIT ? Infinity : 0;
  }

  get grounded(): boolean { return this.y >= this.groundAt(this.x) - 0.5; }

  private enter(i: number): void {
    this.index = i;
    this.stepMs = 0;
    const s = this.step;
    if (!s) { this.done = true; this.anim.play(this.grounded ? 'idle' : 'fall', { fade: 140 }); return; }
    this.anim.play(s.anim, { restart: true, ms: s.ms, fade: 50 });
    if (s.charge) this.anim.freeze(0.3);
    if (s.jump) this.vy = -Config.JUMP_VELOCITY * s.jump * UNIT;
    if (s.vel) {
      if (s.vel[0] !== null) this.vx = s.vel[0] * UNIT;
      if (s.vel[1] !== null) this.vy = s.vel[1] * UNIT;
    }
    if (s.shot !== undefined) this.shots.push(s.shot);
    this.from = { x: this.x, y: this.y };
  }

  tick(dtMs: number): void {
    const dt = dtMs / 1000;
    this.shots = [];
    if (this.index < 0) this.enter(0);
    this.anim.tick(dtMs);
    const s = this.step;
    this.stepMs += dtMs;
    let t = 1;
    let length = 0;
    if (s) {
      const charge = s.charge ?? 0;
      if (charge && this.stepMs < charge) t = 0.3;
      else if (charge) {
        this.anim.freeze(null);
        t = 0.3 + (this.stepMs - charge) / s.ms;
      } else t = this.stepMs / s.ms;
      length = charge + s.ms * (charge ? 0.7 : 1);
    }
    this.progress = Math.min(1, t);

    // Body motion.
    const m = s?.move;
    const bursting = !!(m?.burst && t < (m.sustain ?? 0));
    if (m?.burst && bursting) {
      const [bx, by] = m.burst;
      if (bx !== null) this.vx = bx * UNIT;
      if (by !== null) this.vy = by * UNIT;
    }
    if (s?.path) {
      // Up the wall first, then in over the top.
      const u = Math.min(1, t);
      const [px, py] = s.path;
      const rise = Math.min(1, u / 0.45);
      const across = Math.max(0, (u - 0.45) / 0.55);
      this.x = this.from.x + (px * UNIT - this.from.x) * ease(across);
      this.y = this.from.y + (-py * UNIT - this.from.y) * ease(rise);
      this.vx = 0; this.vy = 0;
    } else if (!s?.float || this.done) {
      if (!this.grounded || this.vy < 0) this.vy += (this.vy > 0 ? FALL_GRAVITY : Config.GRAVITY) * UNIT * dt;
      if (s?.hover && t < s.hover) this.vy = Math.min(this.vy, 2 * UNIT);
      // Strikes carry the robot forwards with their motion.
      const travel = this.anim.takeRootMotion() * ART_SCALE * ROOT_MOTION_GAIN;
      if (m && travel > 0) this.x += Math.min(travel, 26 * UNIT * dt);
      const prevY = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // Lands only coming down onto the floor (not from below it, off a ledge).
      const ground = this.groundAt(this.x);
      if (this.y >= ground && prevY <= ground + 1) { this.y = ground; this.vy = 0; }
      if (this.grounded && !bursting && !s?.run) this.vx *= Math.exp(-9 * dt);
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    this.anim.takeRootMotion();

    if (!s) return;
    const landed = this.grounded && this.vy === 0;
    if (s.untilLand ? landed || this.stepMs > 3000 : (s.endOnLand && landed && t > 0.08) || this.stepMs >= length) {
      if (s.endOnLand || s.untilLand) this.vx = 0;
      this.enter(this.index + 1);
    }
  }
}

/** Where a held robot sits from its holder (units, x forwards, y up), as Kubotz.placeHeld puts it: `u` is 0..1 to the throw's release. */
function heldOffset(kind: ThrowKind | null, u: number): [number, number] {
  switch (kind) {
    case 'forward': return [u < 0.66 ? 1.05 - 0.4 * (u / 0.66) : 0.65 + 1.0 * ((u - 0.66) / 0.34), 0.15];
    case 'back': { const a = (u * 250 * Math.PI) / 180; return [1.05 * Math.cos(a), 0.15 + 0.25 * Math.sin(a)]; }
    case 'up': return [1.05 - 0.85 * u, 0.15 + 1.1 * u];
    case 'down': return [1.05 - 0.2 * u, u < 0.6 ? 0.15 + 0.9 * (u / 0.6) : 1.05 - 1.1 * ((u - 0.6) / 0.4)];
    default: return [1.05, 0.15];
  }
}

const THROW_OF: Record<string, ThrowKind> = Object.fromEntries(
  (Object.keys(THROWS) as ThrowKind[]).map((k) => [THROWS[k].anim, k]));

/**
 * The second robot of the grab previews: it stands in reach facing the
 * first, is caught by the grab, held and kneed, carried round by a throw
 * and launched at its release (or by a strike that reaches it), then falls,
 * lands flat and gets up. Stage pixels, like PreviewRun.
 */
class Victim {
  x = 1.05 * UNIT; y = 0; vx = 0; vy = 0;
  private state: 'stand' | 'held' | 'air' | 'down' = 'stand';
  private downMs = 0;
  /** The holder's step that last launched it (one hit a step). */
  private hitBy = -1;
  flash = false;

  constructor(readonly anim: Animator) { anim.play('idle'); }

  /** Back on its feet (or still held): nothing left to frame. */
  get settled(): boolean { return this.state === 'stand' || this.state === 'held'; }

  tick(dtMs: number, run: PreviewRun): void {
    const dt = dtMs / 1000;
    this.anim.tick(dtMs);
    this.anim.takeRootMotion();
    const s = run.step;
    this.flash = false;
    if (this.state === 'stand' && s?.anim === 'grab' && run.progress >= 0.4) {
      this.state = 'held';
      this.anim.play('held', { fade: 40 });
    }
    if (this.state === 'held') {
      const kind = s ? THROW_OF[s.anim] ?? null : null;
      const release = kind ? THROWS[kind].release : 1;
      const [dx, dy] = heldOffset(kind, Math.min(1, run.progress / release));
      this.x = run.x + dx * UNIT;
      this.y = run.y - dy * UNIT;
      this.flash = s?.anim === 'pummel' && run.progress > 0.35 && run.progress < 0.55;
      if (kind && run.progress >= release) this.launch(THROWS[kind].launch, THROWS[kind].dir, run.index);
      return;
    }
    // A strike that reaches it launches it.
    const m = s?.move;
    if (m && run.index !== this.hitBy && run.progress >= m.active[0] && run.progress <= m.active[1]
      && Math.abs(this.x - run.x) < 1.7 * UNIT && Math.abs(this.y - run.y) < 2.2 * UNIT) {
      this.launch(m.launch, m.behind ? -1 : 1, run.index);
    }
    if (this.state === 'air') {
      this.vy += (this.vy > 0 ? FALL_GRAVITY : Config.GRAVITY) * UNIT * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y >= 0 && this.vy > 0) {
        this.y = 0; this.vy = 0; this.vx *= 0.4;
        this.state = 'down'; this.downMs = 0;
        this.anim.play('knockdown', { restart: true, fade: 60 });
      }
    } else if (this.state === 'down') {
      this.x += this.vx * dt;
      this.vx *= Math.exp(-9 * dt);
      this.downMs += dtMs;
      if (this.downMs >= 900) { this.state = 'stand'; this.anim.play('idle', { fade: 160 }); }
    }
  }

  /** Sent along a launch (speed and angle at 0 %), `dir` 1 forwards; strong ones tumble. */
  private launch(l: Launch, dir: number, step: number): void {
    const a = (l.angle * Math.PI) / 180;
    this.vx = dir * Math.cos(a) * l.knockback * UNIT;
    this.vy = -Math.sin(a) * l.knockback * UNIT;
    this.y = Math.min(this.y, -1);
    this.state = 'air';
    this.hitBy = step;
    this.anim.play(l.knockback >= 8 ? 'tumble' : 'hit', { restart: true, fade: 30 });
  }
}

/** Plays an entry once without drawing, for where it goes: its reach left, right and up (stage pixels). */
function extent(entry: MoveEntry, rig: Rig): { minX: number; maxX: number; top: number } {
  const run = new PreviewRun(entry, new Animator(rig));
  const victim = entry.victim ? new Victim(new Animator(rig)) : null;
  let minX = run.x; let maxX = run.x; let top = run.y;
  for (let i = 0; i < 900 && !(run.done && (victim?.settled ?? true)); i++) {
    run.tick(1000 / 60);
    minX = Math.min(minX, run.x); maxX = Math.max(maxX, run.x); top = Math.min(top, run.y);
    // Room in front for the bolt to fly.
    if (run.shots.length) maxX = Math.max(maxX, run.x + 5 * UNIT);
    if (victim) {
      victim.tick(1000 / 60, run);
      minX = Math.min(minX, victim.x); maxX = Math.max(maxX, victim.x); top = Math.min(top, victim.y);
    }
  }
  return { minX, maxX, top };
}

interface Bolt { img: Phaser.GameObjects.Image; vx: number; until: number }

/**
 * The move list: every move and combo, grouped, with its inputs and numbers;
 * the selected one plays on a robot in a loop.
 */
export class MoveListScene extends Phaser.Scene {
  private rig!: Rig;
  private robot!: Robot2D;
  private victimRobot!: Robot2D;
  private run!: PreviewRun;
  private victim: Victim | null = null;
  private speedButtons: { box: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }[] = [];
  private entry!: MoveEntry;
  private selected = 0;
  private rows: { text: Phaser.GameObjects.Text; index: number; y: number }[] = [];
  private list!: Phaser.GameObjects.Container;
  private scroll = 0;
  private contentH = 0;
  private highlight!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private keysText!: Phaser.GameObjects.Text;
  private padText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private stage!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private cam!: Phaser.Cameras.Scene2D.Camera;
  private light!: Phaser.GameObjects.Light;
  private offsetX = 0;
  private pauseUntil = 0;
  private nextGhostAt = 0;
  private bolts: Bolt[] = [];
  private padPrev = { up: false, down: false, back: false, speed: false };
  /** Set by back(): the scene stops at the next step, so nothing may draw the destroyed robot meanwhile. */
  private leaving = false;
  private padRepeatAt = 0;

  constructor() { super('MoveList'); }

  create(): void {
    this.rows = [];
    this.leaving = false;
    this.bolts = [];
    this.scroll = 0;
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height).setAlpha(0.5);
    this.add.rectangle(width / 2, height / 2, width, height, 0x050b18, 0.7);
    // Centred on the header row, its glow clear of the panels below.
    heading(this, LIST.x - 8, 44, 'Move list', 48).setOrigin(0, 0.5);
    this.buildSpeedToggle();
    this.add.text(width - 32, 44, '▲▼ / W S / wheel: choose      Esc / B: back', {
      fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '17px', color: '#9fe3ff',
    }).setOrigin(1, 0.5);

    this.buildList();
    this.buildPreview();
    this.buildInfo();
    this.bindInput();
    this.select(0);
  }

  // ---------------------------------------------------------------- speed
  /** Normal / Slow buttons over the preview. */
  private buildSpeedToggle(): void {
    this.speedButtons = [];
    const w = 92;
    const x0 = PANEL.x - 8;
    const label = this.add.text(x0, 44, 'SPEED  TAB / Y', { fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: '14px', color: '#29abe2' }).setOrigin(0, 0.5);
    SPEEDS.forEach((sp, i) => {
      const x = x0 + label.width + 14 + i * w;
      const box = this.add.rectangle(x, 44, w, 32, 0x29abe2, 0).setOrigin(0, 0.5).setStrokeStyle(1, 0x29abe2, 0.7)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(x + w / 2, 44, sp.label, { fontFamily: BODY_FAMILY, fontStyle: '700', fontSize: '17px', color: '#e8f4ff' }).setOrigin(0.5);
      box.on('pointerdown', () => this.setSpeed(i));
      this.speedButtons.push({ box, text });
    });
    this.setSpeed(speedIndex);
  }

  private setSpeed(i: number): void {
    speedIndex = i % SPEEDS.length;
    this.speedButtons.forEach((b, j) => {
      const on = j === speedIndex;
      b.box.setFillStyle(0x29abe2, on ? 0.45 : 0.08);
      b.text.setColor(on ? '#ffffff' : '#9fbdd6');
    });
  }

  // ----------------------------------------------------------------- list
  private buildList(): void {
    this.add.rectangle(LIST.x - 8, LIST.y - 8, LIST.w + 16, LIST.h + 16, 0x0b1626, 0.75).setOrigin(0).setStrokeStyle(1, 0x29abe2, 0.4);
    this.list = this.add.container(LIST.x, LIST.y);
    this.highlight = this.add.rectangle(0, 0, LIST.w, ROW_H, 0x29abe2, 0.28).setOrigin(0);
    this.list.add(this.highlight);
    let y = 0;
    let group = '';
    MOVE_LIST.forEach((e, i) => {
      if (e.group !== group) {
        group = e.group;
        if (i > 0) y += 8;
        this.list.add(this.add.text(6, y + 10, group.toUpperCase(), {
          fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: '15px', color: '#29abe2',
        }));
        y += HEADER_H - 8;
      }
      const t = this.add.text(22, y + ROW_H / 2, e.name, {
        fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '19px', color: '#e8f4ff',
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', (p: Phaser.Input.Pointer) => { if (this.inList(p)) this.select(i); });
      this.list.add(t);
      this.rows.push({ text: t, index: i, y });
      y += ROW_H;
    });
    this.contentH = y;
    const mask = this.make.graphics({}, false).fillRect(LIST.x, LIST.y, LIST.w, LIST.h).createGeometryMask();
    this.list.setMask(mask);
  }

  private inList(p: Phaser.Input.Pointer): boolean {
    return p.y >= LIST.y && p.y <= LIST.y + LIST.h && p.x >= LIST.x && p.x <= LIST.x + LIST.w;
  }

  private setScroll(s: number): void {
    this.scroll = Phaser.Math.Clamp(s, 0, Math.max(0, this.contentH - LIST.h));
    this.list.y = LIST.y - this.scroll;
  }

  private select(i: number): void {
    this.selected = (i + MOVE_LIST.length) % MOVE_LIST.length;
    const row = this.rows[this.selected];
    this.rows.forEach((r) => r.text.setColor(r === row ? '#ffffff' : '#c6d8ea').setFontStyle(r === row ? 'bold' : ''));
    this.highlight.setY(row.y);
    // Keep the row (and its group header, near the top) in view.
    if (row.y - HEADER_H < this.scroll) this.setScroll(row.y - HEADER_H);
    else if (row.y + ROW_H + 8 > this.scroll + LIST.h) this.setScroll(row.y + ROW_H + 8 - LIST.h);
    this.showEntry(MOVE_LIST[this.selected]);
  }

  // ----------------------------------------------------------------- info
  private buildInfo(): void {
    const x = PANEL.x;
    const y = PANEL.y + PANEL.h + 18;
    this.add.rectangle(x - 8, y - 10, PANEL.w + 16, LIST.y + LIST.h + 8 - (y - 10), 0x0b1626, 0.75).setOrigin(0).setStrokeStyle(1, 0x29abe2, 0.4);
    this.nameText = this.add.text(x + 8, y, '', { fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: '24px', color: '#ffffff' });
    const label = (ly: number, s: string) => this.add.text(x + 8, ly, s, { fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: '14px', color: '#29abe2' });
    label(y + 40, 'KEYBOARD');
    label(y + 66, 'GAMEPAD');
    const val = { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '17px', color: '#e8f4ff' };
    this.keysText = this.add.text(x + 104, y + 38, '', val);
    this.padText = this.add.text(x + 104, y + 64, '', val);
    this.descText = this.add.text(x + 8, y + 96, '', { ...val, color: '#bfe2ff', wordWrap: { width: PANEL.w - 16 }, lineSpacing: 4 });
  }

  // -------------------------------------------------------------- preview
  private buildPreview(): void {
    this.add.rectangle(PANEL.x - 8, PANEL.y - 8, PANEL.w + 16, PANEL.h + 16, 0x0b1626, 0.75).setOrigin(0).setStrokeStyle(1, 0x29abe2, 0.4);
    const spriter: SpriterData = this.registry.get('spriter');
    this.rig = new Rig(spriter);
    for (const file of ['feet/foot.png', 'feet/foot_sha.png']) this.rig.setOutline(file, opaqueOutline(this, `kubotz:${file}`));
    this.stage = this.add.graphics().setDepth(5);
    this.fx = this.add.graphics().setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
    this.robot = new Robot2D(this, this.rig, (file) => partTexture(this.textures, file, COLOR));
    // The grabbed one, just behind the grabber's hands.
    this.victimRobot = new Robot2D(this, this.rig, (file) => partTexture(this.textures, file, VICTIM_COLOR));
    this.victimRobot.view.setDepth(9.5);
    this.cam = this.cameras.add(PANEL.x, PANEL.y, PANEL.w, PANEL.h).setBackgroundColor('rgba(0,0,0,0)');
    this.lights.enable().setAmbientColor(0x7a86ac);
    this.light = this.lights.addLight(STAGE_X, STAGE_Y - 4 * UNIT, 12 * UNIT, 0xffe8cc, 2.6);
    this.lights.addLight(STAGE_X, STAGE_Y - UNIT, 10 * UNIT, 0x3aa8ff, 1.4);
  }

  private showEntry(entry: MoveEntry): void {
    this.entry = entry;
    this.nameText.setText(entry.name);
    this.keysText.setText(entry.keys);
    this.padText.setText(entry.pad);
    this.descText.setText(entry.desc);
    // Frame the whole move: centred on its travel, zoomed out for high or long ones.
    const e = extent(entry, this.rig);
    this.offsetX = -(e.minX + e.maxX) / 2;
    // The floor sits low in the panel; higher for ledges, where the robot hangs below it.
    const floor = entry.ledge ? 0.62 : 0.8;
    const w = e.maxX - e.minX + 3 * UNIT;
    const h = -Math.min(0, e.top) + 2.8 * UNIT;
    const zoom = Phaser.Math.Clamp(Math.min(PANEL.w * 0.92 / w, PANEL.h * (floor - 0.04) / h), 0.55, 1.1);
    this.cam.setZoom(zoom).centerOn(STAGE_X, STAGE_Y - (floor - 0.5) * PANEL.h / zoom);
    this.drawStage();
    this.restart();
  }

  private restart(): void {
    for (const b of this.bolts) b.img.destroy();
    this.bolts = [];
    const anim = new Animator(this.rig);
    this.run = new PreviewRun(this.entry, anim);
    this.victim = this.entry.victim ? new Victim(new Animator(this.rig)) : null;
    this.victimRobot.view.setVisible(!!this.victim);
    this.pauseUntil = 0;
    this.draw(0, true);
  }

  private drawStage(): void {
    const g = this.stage.clear();
    const gx = STAGE_X + this.offsetX;
    const left = this.entry.ledge ? gx : STAGE_X - 3000;
    // The floor: a block with a glowing top edge (a ledge stage stops at the ledge).
    g.fillStyle(0x111d30, 1).fillRect(left, STAGE_Y, STAGE_X + 3000 - left, 6 * UNIT);
    g.fillStyle(0x1b2d48, 1).fillRect(left, STAGE_Y, STAGE_X + 3000 - left, 10);
    g.lineStyle(3, 0x29abe2, 0.9).lineBetween(left, STAGE_Y, STAGE_X + 3000, STAGE_Y);
    if (this.entry.ledge) g.lineStyle(2, 0x29abe2, 0.5).lineBetween(left, STAGE_Y, left, STAGE_Y + 6 * UNIT);
  }

  update(time: number, delta: number): void {
    if (this.leaving) return;
    this.pollPad(time);
    if (this.leaving) return;
    const dt = Math.min(delta, 50) * SPEEDS[speedIndex].rate;
    if (this.run.done) {
      if (!this.pauseUntil) this.pauseUntil = time + PAUSE_MS / SPEEDS[speedIndex].rate;
      if (time >= this.pauseUntil) { this.restart(); return; }
    }
    this.run.tick(dt);
    this.victim?.tick(dt, this.run);
    for (const c of this.run.shots) this.fire(c);
    this.draw(dt, false);
    for (const b of this.bolts) b.img.x += b.vx * (dt / 1000);
    this.bolts = this.bolts.filter((b) => { if (time < b.until) return true; b.img.destroy(); return false; });
  }

  private maps(): string[] {
    const maps: string[] = [];
    if (HEADS[1]) maps.push(HEADS[1]);
    const w = this.entry.weapon ?? 'none';
    if (w === 'laserSword') maps.push('weapon_laserSword');
    else if (w !== 'none') maps.push('weapon_laserGunMkI');
    const m = this.run.step?.move;
    if (w === 'none' && m?.maps) maps.push(...m.maps);
    return maps;
  }

  private draw(dtMs: number, snap: boolean): void {
    const r = this.run;
    const s = r.step;
    const now = this.time.now;
    const x = STAGE_X + this.offsetX + r.x;
    const bottom = STAGE_Y + r.y;
    // A held smash or a gathering shot shakes and flashes as it builds.
    const holding = !!(s?.charge && r.stepMs < s.charge);
    const build = holding ? r.stepMs / s!.charge! : s?.gather ? r.stepMs / s.ms : 0;
    const shake = build > 0 ? Math.sin(now / 18) * 2.5 * build : 0;
    const pose = r.anim.pose();
    this.robot.update(pose, this.maps(), x + shake, bottom, pose.yaw ?? 0, {
      dtMs, lean: 0, squash: 1, snap,
      alpha: s?.ghostly ? 0.55 : 1,
      flash: build > 0.98 && Math.floor(now / 60) % 2 === 0,
    });
    this.light.setPosition(x + UNIT, bottom - 4 * UNIT);
    const v = this.victim;
    if (v) {
      const vp = v.anim.pose();
      this.victimRobot.update(vp, HEADS[2] ? [HEADS[2]] : [], STAGE_X + this.offsetX + v.x, STAGE_Y + v.y, 180 + (vp.yaw ?? 0), {
        dtMs, lean: 0, squash: 1, snap, alpha: 1, flash: v.flash,
      });
    }
    const m = s?.move;
    if (m?.ghosts && !holding && now >= this.nextGhostAt) {
      this.nextGhostAt = now + 38;
      this.robot.ghost(COLOR, 210);
    }
    const g = this.fx.clear();
    // The strike's active part: a glow on the striking points.
    if (m && !holding && r.progress >= m.active[0] && r.progress <= m.active[1]) {
      const sword = m.points[0]?.file === SWORD_FILE;
      let pts = m.points.flatMap((p) => this.robot.pointsOn(p.file, p.x, p.y));
      if (!sword && !m.all && pts.length) {
        const best = pts.reduce((a, b) => ((m.behind ? b.x < a.x : b.x > a.x) ? b : a));
        pts = [best];
      }
      const rad = (sword ? 0.3 : 0.35) * UNIT;
      for (const p of pts) {
        g.fillStyle(COLOR, 0.28).fillCircle(p.x, p.y, rad);
        g.fillStyle(0xffffff, 0.5).fillCircle(p.x, p.y, rad * 0.35);
      }
    }
    if (s?.bubble) {
      const rad = UNIT * (0.6 + 0.75 * Math.max(0.3, 1 - r.stepMs / (s.ms * 2.5)));
      g.fillStyle(COLOR, 0.3).fillCircle(x, bottom - UNIT, rad);
      g.lineStyle(3, 0xffffff, 0.6).strokeCircle(x, bottom - UNIT, rad);
    }
    if (s?.gather) {
      const tip = this.robot.pointOn(GUN_FILE, PART_TIPS.gun.x, PART_TIPS.gun.y);
      if (tip) {
        const c = Math.min(1, r.stepMs / s.ms);
        g.fillStyle(COLOR, 0.35).fillCircle(tip.x, tip.y, 6 + 18 * c);
        g.fillStyle(0xffffff, 0.7).fillCircle(tip.x, tip.y, 3 + 7 * c);
      }
    }
  }

  /** A laser bolt from the muzzle, as GameScene fires them (size and speed by charge). */
  private fire(c: number): void {
    const tip = this.robot.pointOn(GUN_FILE, PART_TIPS.gun.x, PART_TIPS.gun.y)
      ?? { x: STAGE_X + this.offsetX + this.run.x + UNIT * 1.1, y: STAGE_Y + this.run.y - UNIT * 1.15 };
    const key = `bullet:${hex(COLOR)}`;
    const size = 0.75 + 1.9 * c;
    const img = this.add.image(tip.x, tip.y, this.textures.exists(key) ? key : 'bullet').setDepth(12)
      .setDisplaySize(1.1 * UNIT * (0.6 + 0.4 * size), 0.6 * UNIT * size).setFlipX(true).setBlendMode(Phaser.BlendModes.ADD);
    this.bolts.push({ img, vx: Config.LASER_GUN_MK_I.speed * (1 - 0.25 * c) * UNIT, until: this.time.now + 900 });
  }

  // ---------------------------------------------------------------- input
  private bindInput(): void {
    const kb = this.input.keyboard!;
    const up = () => this.select(this.selected - 1);
    const down = () => this.select(this.selected + 1);
    kb.on('keydown-UP', up);
    kb.on('keydown-W', up);
    kb.on('keydown-DOWN', down);
    kb.on('keydown-S', down);
    kb.on('keydown-PAGE_UP', () => this.select(Math.max(0, this.selected - 10)));
    kb.on('keydown-PAGE_DOWN', () => this.select(Math.min(MOVE_LIST.length - 1, this.selected + 10)));
    kb.on('keydown-TAB', (e: KeyboardEvent) => { e.preventDefault(); this.setSpeed(speedIndex + 1); });
    kb.on('keydown-ESC', () => this.back());
    kb.on('keydown-BACKSPACE', () => this.back());
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.inList(p)) this.setScroll(this.scroll + dy * 0.6);
      else this.select(this.selected + Math.sign(dy));
    });
  }

  /** Gamepads: D-pad or left stick to choose (repeating while held), B (bottom face) back. */
  private pollPad(time: number): void {
    const pads = this.input.gamepad?.gamepads.filter((p) => p && p.connected) ?? [];
    let up = false; let down = false; let back = false; let speed = false;
    for (const pad of pads) {
      const btn = (i: number) => (pad.buttons[i]?.value ?? 0) > 0.5;
      const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      up ||= btn(12) || ay < -0.6;
      down ||= btn(13) || ay > 0.6;
      back ||= btn(0);
      speed ||= btn(2);
    }
    const prev = this.padPrev;
    if ((up && !prev.up) || (down && !prev.down)) {
      this.select(this.selected + (up ? -1 : 1));
      this.padRepeatAt = time + 380;
    } else if ((up || down) && time >= this.padRepeatAt) {
      this.select(this.selected + (up ? -1 : 1));
      this.padRepeatAt = time + 110;
    }
    if (speed && !prev.speed) this.setSpeed(speedIndex + 1);
    if (back && !prev.back) this.back();
    this.padPrev = { up, down, back, speed };
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    for (const b of this.bolts) b.img.destroy();
    this.robot.destroy();
    this.victimRobot.destroy();
    this.lights.disable();
    this.cameras.remove(this.cam);
    shutter(this, () => this.scene.start('Title'));
  }
}
