import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { Animator } from '../anim/Animator';
import type { Rig } from '../anim/Rig';
import { ART_SCALE, Robot2D } from '../anim/Robot2D';
import { Controller, PadState, emptyPad } from './Input';
import { ActivePowerUp, PowerUpType, POWER_UPS } from './PowerUps';
import { KubotzBody, PhysicsWorld } from '../physics/Physics';

export type Weapon = 'none' | 'laserGunMkI' | 'laserGunMkII' | 'laserSword';

/** Something an attack can hit. */
export interface Damageable {
  readonly owner: Kubotz; // who it belongs to (itself for a Kubotz); no friendly fire
  hurtbox(): Phaser.Geom.Rectangle;
  isAlive(): boolean;
  /** @param stun ms without control (hitstun), so light combo hits connect. */
  takeDamage(amount: number, attacker: Kubotz, launch: Launch, dirX: 1 | -1): void;
}

/** A point of a body part (Spriter image pixels, origin bottom-left, y up). */
export interface PartPoint { file: string; x: number; y: number; }

export interface AttackBox {
  /** Hit circles, placed every frame on the striking part (fist, foot, blade). */
  circles: Phaser.Geom.Circle[];
  radius: number;
  points: PartPoint[];
  /** One circle on whichever of the points is furthest forward (the striking fist or foot), instead of one on each. */
  striker: boolean;
  /** The strike goes backwards (back air): the furthest-back point strikes. */
  behind: boolean;
  /** A circle on every striking point (spins, splits). */
  all: boolean;
  /** Hits on both sides (down smash): each target is sent away from the attacker. */
  both: boolean;
  damage: number;
  launch: Launch;
  /** Targets already hit by this swing: one hit per target per swing. */
  hit: Set<Damageable>;
}

/** Spriter files of the weapons, and points measured on their images (see BootScene). */
export const SWORD_FILE = 'arms/lazerSword.png';
export const GUN_FILE = 'arms/gunMk1.png';
export const PART_TIPS = { sword: { x: 300, y: 230 }, swordBase: { x: 90, y: 60 }, gun: { x: 150, y: 80 } };

/** Points from the sword's hilt to its tip, for the blade hitbox. */
function bladePoints(): PartPoint[] {
  const { sword: t, swordBase: b } = PART_TIPS;
  return [0.25, 0.5, 0.75, 1].map((f) => ({ file: SWORD_FILE, x: b.x + (t.x - b.x) * f, y: b.y + (t.y - b.y) * f }));
}

/** Clips of anim/Clips.ts. */
const ANIM = {
  IDLE: 'idle', RUN: 'run', CROUCH: 'crouch', JUMP: 'jump', FLIP: 'flip', FALL: 'fall', LAND: 'land',
  GUARD: 'guard', DODGE: 'dodge', HIT: 'hit', HIT_2: 'hit2', GRAB: 'grab', SHOOT: 'shoot',
} as const;

/** Strikes carry the robot this many times further than their clip's own forward travel. */
const ANIM_TURN = 'turn';
const ROOT_MOTION_GAIN = 3;

/** Front and back fists and feet (the back limbs use the _sha images), near the knuckles and toes. */
const FISTS: PartPoint[] = [{ file: 'arms/hand.png', x: 36, y: 53 }, { file: 'arms/hand_sha.png', x: 34, y: 34 }];
/** The fists with the fire gauntlet on (the forward smash swaps the hand image). */
const FIRE_FISTS: PartPoint[] = [...FISTS, { file: 'arms/fireFist.png', x: 36, y: 53 }];
const FEET: PartPoint[] = [{ file: 'feet/foot.png', x: 21, y: 40 }, { file: 'feet/foot_sha.png', x: 24, y: 45 }];

/** A strike: its clip, length, striking points, effect, and the part of it (0..1) that hurts. */
/** How a hit sends its target: speed (units/s, before damage growth), launch angle (0 forwards, 90 up), fixed hitstun for combo links. */
export interface Launch { knockback: number; angle: number; growth?: number; stun?: number }

/**
 * A strike: its clip, length, striking points, damage and launch, and the part
 * of it (0..1) that hurts. `all` puts a hit circle on every striking point
 * (spins, splits) instead of the furthest forward one; `both` sends targets
 * away on either side; `maps` swaps parts while it plays (the fire fist);
 * `ghosts` leaves afterimages.
 */
interface Move {
  anim: string; ms: number; points: PartPoint[]; damage: number; launch: Launch; active: [number, number];
  behind?: boolean; all?: boolean; both?: boolean; maps?: string[]; ghosts?: boolean;
}

/** Attack + direction, Super Smash Bros. style. */
type Dir = 'neutral' | 'forward' | 'back' | 'up' | 'down';
type DirMoves = Record<'dash' | 'ftilt' | 'dtilt' | 'fsmash' | 'dsmash' | 'nair' | 'fair' | 'bair' | 'uair' | 'dair', Move>;

const LIMBS = [...FISTS, ...FEET];

/**
 * The unarmed ground combo: three presses chain a palm strike, a spinning
 * back fist and a jumping spin kick. The first two push lightly and stun
 * briefly so the next hit connects; the kick launches.
 */
const COMBO: Move[] = [
  { anim: 'jab', ms: 260, points: FISTS, damage: 3, launch: { knockback: 3, angle: 15, stun: 280 }, active: [0.3, 0.72] },
  { anim: 'cross', ms: 360, points: FISTS, damage: 4, launch: { knockback: 4, angle: 20, stun: 340 }, active: [0.4, 0.8], all: true },
  { anim: 'kick', ms: 460, points: FEET, damage: 6, launch: { knockback: 13, angle: 55 }, active: [0.34, 0.76], all: true, ghosts: true },
];
const SWORD_COMBO: Move[] = [
  { anim: 'slash1', ms: 320, points: bladePoints(), damage: 6, launch: { knockback: 4, angle: 25, stun: 300 }, active: [0.36, 0.78] },
  { anim: 'slash2', ms: 340, points: bladePoints(), damage: 7, launch: { knockback: 5, angle: 35, stun: 320 }, active: [0.28, 0.66] },
  { anim: 'slash3', ms: 420, points: bladePoints(), damage: 10, launch: { knockback: 15, angle: 35 }, active: [0.35, 0.8], ghosts: true },
];
/** Directional moves (SSB): dash attack, tilts, smashes (charged) and the five aerials. */
const DIR_MOVES: DirMoves = {
  dash: { anim: 'dash', ms: 420, points: FEET, damage: 7, launch: { knockback: 11, angle: 40 }, active: [0.22, 0.72], ghosts: true },
  ftilt: { anim: 'ftilt', ms: 380, points: FEET, damage: 6, launch: { knockback: 10, angle: 30 }, active: [0.32, 0.7] },
  dtilt: { anim: 'dtilt', ms: 340, points: FEET, damage: 5, launch: { knockback: 9, angle: 80 }, active: [0.3, 0.72] },
  fsmash: { anim: 'fsmash', ms: 560, points: FIRE_FISTS, damage: 14, launch: { knockback: 17, angle: 32 }, active: [0.42, 0.66], maps: ['gauntlet_fireGauntlet'], ghosts: true },
  dsmash: { anim: 'dsmash', ms: 480, points: FEET, damage: 11, launch: { knockback: 14, angle: 28 }, active: [0.36, 0.7], all: true, both: true },
  nair: { anim: 'nair', ms: 420, points: LIMBS, damage: 7, launch: { knockback: 9, angle: 40 }, active: [0.2, 0.75], all: true, ghosts: true },
  fair: { anim: 'fair', ms: 420, points: FEET, damage: 9, launch: { knockback: 11, angle: 30 }, active: [0.25, 0.72], ghosts: true },
  bair: { anim: 'bair', ms: 440, points: FEET, damage: 10, launch: { knockback: 14, angle: 35 }, active: [0.25, 0.72], behind: true },
  uair: { anim: 'uair', ms: 480, points: FEET, damage: 8, launch: { knockback: 12, angle: 85 }, active: [0.2, 0.62], ghosts: true },
  dair: { anim: 'airKick', ms: 420, points: FEET, damage: 8, launch: { knockback: 10, angle: -70 }, active: [0.35, 1], ghosts: true },
};
const SWORD_DIR_MOVES: DirMoves = {
  dash: { anim: 'slash3', ms: 420, points: bladePoints(), damage: 9, launch: { knockback: 13, angle: 35 }, active: [0.35, 0.8], ghosts: true },
  ftilt: { anim: 'sftilt', ms: 420, points: bladePoints(), damage: 8, launch: { knockback: 11, angle: 30 }, active: [0.3, 0.72], ghosts: true },
  dtilt: { anim: 'sdtilt', ms: 380, points: bladePoints(), damage: 6, launch: { knockback: 9, angle: 75 }, active: [0.3, 0.72] },
  fsmash: { anim: 'sfsmash', ms: 600, points: bladePoints(), damage: 16, launch: { knockback: 18, angle: 40 }, active: [0.42, 0.68], ghosts: true },
  dsmash: { anim: 'sdsmash', ms: 520, points: bladePoints(), damage: 12, launch: { knockback: 14, angle: 25 }, active: [0.3, 0.75], both: true, ghosts: true },
  nair: { anim: 'snair', ms: 420, points: bladePoints(), damage: 7, launch: { knockback: 9, angle: 40 }, active: [0.2, 0.75], both: true, ghosts: true },
  fair: { anim: 'slash2', ms: 360, points: bladePoints(), damage: 7, launch: { knockback: 10, angle: 40 }, active: [0.28, 0.66] },
  bair: { anim: 'sbair', ms: 440, points: bladePoints(), damage: 9, launch: { knockback: 13, angle: 35 }, active: [0.25, 0.72], behind: true },
  uair: { anim: 'suair', ms: 480, points: bladePoints(), damage: 8, launch: { knockback: 11, angle: 85 }, active: [0.2, 0.62], ghosts: true },
  dair: { anim: 'sdair', ms: 420, points: bladePoints(), damage: 9, launch: { knockback: 10, angle: -70 }, active: [0.3, 1], ghosts: true },
};
/** Smash attacks: how long the charge can be held, and what a full charge adds to damage and launch. */
const SMASH_CHARGE_MS = 1000;
const SMASH_CHARGE_BONUS = 0.6;
/** A direction pressed this close to the attack press makes it a smash (a flick + attack, like SSB). */
const SMASH_INPUT_MS = 120;
/** Laser gun: a tap fires a light shot; holding charges a bigger one (up to GUN_CHARGE_MS). */
const GUN_TAP_MS = 160;
const GUN_CHARGE_MS = 1200;
/** Turning round (ms) on the ground and in the air. */
const TURN_MS = 210;
const AIR_TURN_MS = 140;
/** After a move, how long the next press still continues the combo. */
const COMBO_WINDOW = 260;
/** Rest after the combo's last move. */
const COMBO_RECOVERY = 220;

export interface KubotzLook { head: string | null; color: number; }

/** Helmet shapes, one per robot in order (character maps of kubotz.scml). */
export const HEADS: (string | null)[] = [null, 'head_terminator', 'head_bigbuff', 'head_skull'];
/** The helmet files a recoloured copy is made of (see BootScene.recolor). */
export const HEAD_FILES = ['head/Helmet2.png', 'head/Helmet3.png', 'head/Helmet4.png', 'head/Helmet5-grey.png'];

/** Player colours: P1 red and P2 blue like their HUD labels; CPUs green, yellow, purple, orange. */
export const P1_COLOR = 0xed1c24;
export const P2_COLOR = 0x29abe2;
export const CPU_COLORS = [0x8cc63f, 0xffd166, 0xb36bff, 0xff8a1f];

export const hex = (c: number) => c.toString(16).padStart(6, '0');

/** Callbacks into the arena, so the actor stays free of scene plumbing. */
export interface ArenaHooks {
  /** @param size bolt scale (1 = normal), @param power its push. */
  fireBullet(shooter: Kubotz, damage: number, speed: number, size?: number, power?: number): void;
  now(): number; // the match clock: stops while paused
  playSfx(key: string, volume?: number): void;
  tryGrab(kubotz: Kubotz, area: Phaser.Geom.Circle): void;
  dust(x: number, y: number): void;
  runDust(x: number, y: number, dir: number): void;
  airJump(x: number, y: number, color: number): void;
}

/**
 * The playable robot (KubotzFactory + Running/Jump/Melee/Grab/Gun/LaserSword/
 * PowerUps/Respawn components and systems, folded into one class).
 */
export class Kubotz implements Damageable {
  readonly owner = this;
  readonly body: KubotzBody;
  readonly anim: Animator;
  readonly model: Robot2D;
  private squashUntil = 0;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly tag: Phaser.GameObjects.Image;
  readonly look: KubotzLook;

  facing: 1 | -1 = -1; // PhysicsComponent default direction is LEFT
  health: number = Config.KUBOTZ_HEALTH;
  energy: number = Config.KUBOTZ_ENERGY;
  lives: number = Config.NB_LIVES;
  kills = 0;
  deaths = 0;
  weapon: Weapon = 'none';
  shield = 0;
  powerUps: ActivePowerUp[] = [];
  lastAttacker: { by: Kubotz; at: number } | null = null;

  private jumps = 0;
  maxJumps: number = Config.NB_JUMPS;
  private jumpReadyAt = 0;
  private attack: AttackBox | null = null;
  private attackEndsAt = 0;
  private attackStart = 0;
  private attackActive: [number, number] = [0, 1];
  private attackReadyAt = 0;
  /** Index in COMBO of the next move, the time it can still follow, and a press buffered during a move. */
  private comboStep = 0;
  private comboUntil = 0;
  private comboQueued = false;
  private inCombo = false; // the current move is part of the ground combo
  private landUntil = 0;
  private hitAnim: string = ANIM.HIT;
  private grabAnimUntil = 0;
  private grabEndsAt = 0;
  private grabReadyAt = 0;
  guard: number = Config.GUARD_MAX;
  guarding = false;
  stunnedUntil = 0;
  dodgeUntil = 0;
  private dropUntil = 0;
  private prevDown = false;
  private landedAt = 0;
  private dodgeReady = true;
  private guardHeld = false;
  /** The foot on the ground in the last drawn run frame (a change = a footfall). */
  private plantedFoot = '';
  private lastStepAt = 0;
  private shootingUntil = 0;
  private hitUntil = 0;
  private flashUntil = 0;
  /** Hitstun from light combo hits (no control, unlike a guard break it shows no wobble). */
  private hitstunUntil = 0;
  /** Tumbling (big hit): no control, bounces off walls and ceilings, lands in a knockdown. */
  private tumbleUntil = 0;
  private knockdownUntil = 0;
  private floorBounced = false;
  private prevVx = 0;
  private prevVy = 0;
  private turnUntil = 0;
  private lastJumpAt = 0;
  /** Drawn yaw (degrees, 0 faces right, 180 left), eased through each turn. */
  private yaw = 180;
  private turnFrom = 180;
  private yawTo = 180;
  private turnAt = -1e9;
  private turnMs = TURN_MS;
  private drawnFacing: 1 | -1 = -1;
  private nextGhostAt = 0;
  /** Input edges, for smash flicks and charging. */
  private attackHeld = false;
  private attackPressedAt = -1e9;
  private dirPressedAt = -1e9;
  private prevPad: PadState = emptyPad();
  /** A smash being charged (rooted), and since when. */
  private charging: Move | null = null;
  private chargeStart = 0;
  private chargeDir: 1 | -1 = 1;
  /** A laser shot being charged (attack held), and since when. */
  private gunChargeStart = -1;
  private currentMove: Move | null = null;
  private facingBefore: 1 | -1 = -1;
  private wasGrounded = false;
  private dead = false;
  respawnAt = 0;
  eliminated = false;
  pad: PadState = emptyPad();

  constructor(
    private scene: Phaser.Scene,
    readonly index: number,
    readonly controller: Controller,
    color: number,
    private readonly rig: Rig,
    x: number,
    y: number,
    private hooks: ArenaHooks,
    physics: PhysicsWorld,
  ) {
    this.body = new KubotzBody(physics, x, y);

    this.anim = new Animator(rig);
    this.look = { head: HEADS[index % HEADS.length], color };
    // Helmets and the laser blade are painted in the player's colour.
    this.model = new Robot2D(scene, rig, (file) => {
      let key = `kubotz:${file}`;
      if (HEAD_FILES.includes(file)) key = `head:${hex(color)}:${file}`;
      else if (file === SWORD_FILE) key = `sword:${hex(color)}`;
      return scene.textures.exists(key) ? key : `kubotz:${file}`;
    });
    this.healthBar = scene.add.graphics().setDepth(20);
    // The P1 / P2 / CPU arrow label floats above the robot.
    const label = controller.label === 'CPU' ? `label-CPU:${hex(color)}` : `label-${controller.label}`;
    this.tag = scene.add.image(x, y, scene.textures.exists(label) ? label : 'label-CPU').setOrigin(0.5, 1).setDepth(21);
  }

  /** Winding up, striking or recovering (a CPU can see it coming). */
  get attacking(): boolean { return this.attack !== null; }

  /** The middle of the laser blade (world pixels), for its light. */
  /** The laser blade's emitter and tip (world pixels), while the sword is out. */
  blade(): { x1: number; y1: number; x2: number; y2: number } | null {
    if (this.weapon !== 'laserSword' || !this.isAlive()) return null;
    const a = this.model.pointOn(SWORD_FILE, 96, 68);
    const b = this.model.pointOn(SWORD_FILE, 298, 216);
    return a && b ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y } : null;
  }

  bladeMiddle(): { x: number; y: number } {
    const { sword: t, swordBase: b } = PART_TIPS;
    return this.model.pointOn(SWORD_FILE, (t.x + b.x) / 2, (t.y + b.y) / 2) ?? { x: this.x, y: this.body.top };
  }

  /** For the debug view. */
  get hitstun(): number { return this.hitstunUntil; }
  get comboInfo(): string { return this.inCombo ? `${this.comboStep || 3}/3${this.comboQueued ? '+' : ''}` : '-'; }

  get name(): string { return this.controller.label === 'CPU' ? `CPU ${this.index + 1}` : this.controller.label; }
  get x(): number { return this.body.x; }
  get y(): number { return this.body.y; }
  get grounded(): boolean { return this.body.grounded; }
  get invincible(): boolean { return this.powerUps.some((p) => p.type === 'invincibility'); }
  /** Air-dodging: attacks and bullets pass through. */
  get intangible(): boolean { return this.hooks.now() < this.dodgeUntil; }
  isAlive(): boolean { return !this.dead; }

  /** The physics body plus the head and shoulders drawn above it, so blows that look like they land do. */
  hurtbox(): Phaser.Geom.Rectangle {
    const extra = this.body.height * 0.4;
    return new Phaser.Geom.Rectangle(this.body.left, this.body.top - extra, this.body.width, this.body.height + extra);
  }

  /** The active melee / sword hitbox, if any, on the striking part of the robot. */
  currentAttack(): AttackBox | null {
    const a = this.attack;
    if (!a) return null;
    // Only the strike itself hurts, not the wind-up or the recovery.
    const t = (this.hooks.now() - this.attackStart) / (this.attackEndsAt - this.attackStart);
    if (t < this.attackActive[0] || t > this.attackActive[1]) return null;
    const at = a.points.map((p) => this.model.pointsOn(p.file, p.x, p.y));
    // The fists (or feet): the striking one is the one furthest forward.
    const dir = this.facing * (a.behind ? -1 : 1);
    const placed = a.striker ? [at.flat().sort((u, v) => dir * (v.x - u.x))[0]] : a.all ? at.flat() : at.map((l) => l[0]);
    a.circles = placed
      .filter((p): p is { x: number; y: number } => !!p)
      .map((p) => new Phaser.Geom.Circle(p.x, p.y, a.radius));
    // Before the first pose (or if the part is hidden), fall back to the reach in front.
    if (a.circles.length === 0) a.circles = [new Phaser.Geom.Circle(this.x + dir * 0.75 * UNIT, this.y, a.radius)];
    return a;
  }

  /**
   * The swing as it sweeps (from just before the active frames to their end):
   * the striking point and a point nearer the body, for the smear behind it.
   */
  swingArc(): { ox: number; oy: number; ix: number; iy: number } | null {
    const a = this.attack;
    if (!a) return null;
    const t = (this.hooks.now() - this.attackStart) / (this.attackEndsAt - this.attackStart);
    if (t < this.attackActive[0] - 0.12 || t > this.attackActive[1]) return null;
    const sword = a.points[0]?.file === SWORD_FILE;
    if (sword) {
      const { sword: tip, swordBase: base } = PART_TIPS;
      const o = this.model.pointOn(SWORD_FILE, tip.x, tip.y);
      const i = this.model.pointOn(SWORD_FILE, base.x, base.y);
      return o && i ? { ox: o.x, oy: o.y, ix: i.x, iy: i.y } : null;
    }
    const pts = a.points.flatMap((p) => this.model.pointsOn(p.file, p.x, p.y));
    if (pts.length === 0) return null;
    // The striking limb: the one furthest from the body's middle.
    const cx = this.x;
    const cy = this.y;
    const o = pts.reduce((best, q) => (Math.hypot(q.x - cx, q.y - cy) > Math.hypot(best.x - cx, best.y - cy) ? q : best));
    return { ox: o.x, oy: o.y, ix: cx + (o.x - cx) * 0.45, iy: cy + (o.y - cy) * 0.45 };
  }

  /** 0..1 while a smash or a laser shot charges, else -1 (for effects). */
  get charge(): number {
    const now = this.hooks.now();
    if (this.charging) return Math.min(1, (now - this.chargeStart) / SMASH_CHARGE_MS);
    if (this.gunChargeStart >= 0 && now - this.gunChargeStart > GUN_TAP_MS) return Math.min(1, (now - this.gunChargeStart - GUN_TAP_MS) / GUN_CHARGE_MS);
    return -1;
  }

  /** Where the laser leaves the gun barrel (world pixels). */
  muzzle(): { x: number; y: number } {
    const tip = this.model.pointOn(GUN_FILE, PART_TIPS.gun.x, PART_TIPS.gun.y);
    return tip ?? { x: this.x + this.facing * UNIT * 1.1, y: this.y - UNIT * 0.15 };
  }

  /** @param controls false during the countdown and while stunned. */
  update(now: number, dt: number, controls = true): void {
    if (this.dead) { this.healthBar.clear(); return; }
    const read = this.controller.read();
    const pad = this.pad = controls && now >= this.stunnedUntil && now >= this.hitstunUntil ? read : emptyPad();
    this.facingBefore = this.facing;
    this.updateGuard(pad, now, dt);
    if (this.guarding) {
      // Guarding roots the robot: no running, jumping or attacking.
      this.move(emptyPad(), now, dt);
    } else if (this.charging) {
      // Charging a smash: rooted, sliding to a stop.
      this.move(emptyPad(), now, dt);
      this.handleActions(pad, now);
    } else if (now < this.dodgeUntil) {
      // Air dodge: keep the burst, hover against gravity, no actions.
      this.body.vy -= Config.GRAVITY * UNIT * dt * 0.8;
    } else {
      this.move(pad, now, dt);
      this.handleActions(pad, now);
    }
    // Strikes carry the robot forwards with their motion (root motion).
    const travel = this.anim.takeRootMotion() * ART_SCALE * ROOT_MOTION_GAIN;
    if (this.attack && travel > 0 && dt > 0) {
      this.body.vx = this.facing * Math.min(travel / dt, 26 * UNIT);
    }
    this.updateTumble(now);
    this.prevVx = this.body.vx;
    this.prevVy = this.body.vy;
    this.updatePowerUps(now);
  }

  /** Tumbling robots rebound off walls and ceilings and bounce once on the floor (SSB). */
  private updateTumble(now: number): void {
    if (!this.tumbling) return;
    const b = this.body;
    const wall = b.wall;
    if (wall !== 0 && Math.sign(this.prevVx) === wall && Math.abs(this.prevVx) > 5 * UNIT) {
      b.setVelocity(-this.prevVx * Config.WALL_BOUNCE, b.vy);
      this.bounce(now, b.x + wall * b.width / 2, b.y);
    } else if (b.ceiling && this.prevVy < -5 * UNIT) {
      b.setVelocity(b.vx, -this.prevVy * Config.WALL_BOUNCE);
      this.bounce(now, b.x, b.top);
    } else if (b.grounded && this.prevVy > 7 * UNIT && !this.floorBounced) {
      this.floorBounced = true;
      b.setVelocity(b.vx * 0.8, -this.prevVy * 0.45);
      this.bounce(now, b.x, b.bottom);
    } else if (b.grounded && Math.abs(b.vy) < 2 * UNIT && now >= this.knockdownUntil) {
      // Down on the floor: a moment to get up.
      this.knockdownUntil = now + 450;
      this.hitstunUntil = Math.max(this.hitstunUntil, this.knockdownUntil);
      this.tumbleUntil = 0;
      this.anim.play('knockdown', { restart: true, ms: 450, fade: 60 });
    }
  }

  private bounce(now: number, x: number, y: number): void {
    this.hooks.dust(x, y);
    this.hooks.playSfx('punch', 0.3);
    this.hitstunUntil += 120;
    this.tumbleUntil = this.hitstunUntil;
    this.flashUntil = now + 60;
  }

  get tumbling(): boolean { return this.hooks.now() < this.tumbleUntil; }

  /** Super Smash Bros.-style shield: hold to raise a bubble that soaks hits. */
  private updateGuard(pad: PadState, now: number, dt: number): void {
    const pressed = pad.guard && !this.guardHeld;
    this.guardHeld = pad.guard;
    if (this.grounded) this.dodgeReady = true;
    // Guard in the air: air dodge in the held direction, intangible for a moment.
    if (pressed && !this.grounded && this.dodgeReady && !this.guarding) {
      this.dodgeReady = false;
      this.dodgeUntil = now + Config.AIR_DODGE_DURATION;
      this.attack = null;
      const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
      const dy = (pad.down ? 1 : 0) - (pad.up ? 1 : 0);
      const len = Math.hypot(dx, dy) || 1;
      this.body.setVelocity((dx / len) * Config.AIR_DODGE_SPEED * UNIT, (dy / len) * Config.AIR_DODGE_SPEED * UNIT);
      this.hooks.playSfx('dodge', 0.3);
      this.anim.play(ANIM.DODGE, { restart: true, ms: Config.AIR_DODGE_DURATION, fade: 40 });
    }
    if (pad.guard && this.grounded && (this.guarding || this.guard >= Config.GUARD_MIN_RAISE)) {
      if (!this.guarding) this.attack = null;
      this.guarding = true;
      this.guard = Math.max(0, this.guard - Config.GUARD_DRAIN * dt);
      if (this.guard <= 0) this.breakGuard();
    } else {
      this.guarding = false;
      this.guard = Math.min(Config.GUARD_MAX, this.guard + Config.GUARD_REGEN * dt);
    }
  }

  private breakGuard(): void {
    this.guarding = false;
    this.guard = Config.GUARD_BREAK_REFILL;
    this.stunnedUntil = this.hooks.now() + Config.GUARD_BREAK_STUN;
    this.body.vy = -12 * UNIT; // pops up, like a shield break
    this.hooks.playSfx('guard-break');
  }

  // ---------------------------------------------------------------- movement
  private move(pad: PadState, now: number, dt: number): void {
    const b = this.body;
    let vx = b.vx / UNIT;
    let vy = b.vy / UNIT; // y-down
    const accel = Config.RUN_ACCELERATION * this.speedFactor() * dt;
    const grounded = this.grounded;

    if (grounded) this.jumps = 0;

    // Aerials keep the robot facing the way it struck (a back air hits behind).
    const canTurn = !this.attack && !this.charging;
    if (pad.left) {
      vx = Math.max(vx - accel, -Config.MAX_SPEED);
      if (canTurn) this.turnTo(-1, now, grounded);
    } else if (pad.right) {
      vx = Math.min(vx + accel, Config.MAX_SPEED);
      if (canTurn) this.turnTo(1, now, grounded);
    } else if (grounded) {
      vx = vx > 0 ? Math.max(vx - accel, 0) : Math.min(vx + accel, 0);
    }

    if (pad.up) {
      if (this.jumps < this.maxJumps && now >= this.jumpReadyAt) {
        vy = -Config.JUMP_VELOCITY;
        this.jumps++;
        this.lastJumpAt = now;
        this.jumpReadyAt = now + Config.JUMP_COOLDOWN;
        if (grounded) {
          this.hooks.dust(this.x, b.bottom);
          if (!this.attack) this.anim.play(ANIM.JUMP, { restart: true, fade: 50 });
        } else {
          this.hooks.airJump(this.x, b.bottom, this.look.color);
          if (!this.attack) this.anim.play(ANIM.FLIP, { restart: true, fade: 40 });
        }
      }
    } else if (pad.down) {
      // Holding down on a soft platform drops through it (SSB-style).
      // Drops through the platform stood on, and only that one: after landing
      // on the next, it takes a fresh press to drop again (the CPU, which holds
      // down while following a path, drops again after a moment).
      const fresh = !this.prevDown || (this.controller.label === 'CPU' && now - this.landedAt > 300);
      if (grounded && fresh && now >= this.dropUntil && this.body.onPlatform) {
        this.dropUntil = now + 400;
        b.dropTop = b.platformTop;
      }
      // fast fall: (RunningSystem.moveDown) never slows the fall down
      const step = Config.JUMP_VELOCITY * Config.FAST_FALL_FACTOR * 60 * dt;
      vy = Math.max(vy, Math.min(vy, Config.MAX_SPEED) + step);
    }

    if (now >= this.dropUntil) b.dropTop = null;
    this.prevDown = pad.down;
    b.setVelocity(vx * UNIT, vy * UNIT);
    if (grounded && !this.wasGrounded) {
      this.landedAt = now;
      this.hooks.dust(this.x, b.bottom);
      this.squashUntil = now + 160;
      this.landUntil = now + 200;
      if (!this.attack) this.anim.play(ANIM.LAND, { restart: true, fade: 40 });
    }
    this.wasGrounded = grounded;
  }

  private turnTo(dir: 1 | -1, now: number, grounded: boolean): void {
    if (this.facing === dir) return;
    this.facing = dir;
    // Dust kicked up by the change of direction.
    if (grounded) this.hooks.runDust(this.x, this.body.bottom, -dir);
    if (grounded && !this.attack && !this.guarding) {
      this.turnUntil = now + TURN_MS;
      this.anim.play(ANIM_TURN, { restart: true, ms: TURN_MS, fade: 40 });
    }
  }

  private speedFactor(): number {
    return this.powerUps.some((p) => p.type === 'speed') ? 1.1 : 1;
  }

  // ----------------------------------------------------------------- actions
  private handleActions(pad: PadState, now: number): void {
    const combo = this.weapon === 'laserSword' ? SWORD_COMBO : COMBO;
    const moves = this.weapon === 'laserSword' ? SWORD_DIR_MOVES : DIR_MOVES;
    // Edges: the attack press, and a direction newly pressed (for smash flicks).
    const attackPressed = pad.attack && !this.attackHeld;
    const attackReleased = !pad.attack && this.attackHeld;
    this.attackHeld = pad.attack;
    if (attackPressed) this.attackPressedAt = now;
    const prev = this.prevPad;
    const flick: Dir | null = pad.down && !prev.down ? 'down'
      : pad.right && !prev.right ? (this.facingBefore === 1 ? 'forward' : 'back')
      : pad.left && !prev.left ? (this.facingBefore === -1 ? 'forward' : 'back') : null;
    if (flick) this.dirPressedAt = now;
    this.prevPad = { ...pad };

    if (this.attack && now >= this.attackEndsAt) {
      this.attack = null;
      this.currentMove = null;
      if (!this.inCombo) this.attackReadyAt = now + Config.PUNCH_COOLDOWN;
      else if (this.comboStep === 0) this.attackReadyAt = now + COMBO_RECOVERY; // the chain is over
      else if (this.comboQueued && this.grounded) this.strike(combo[this.comboStep], now);
      else this.attackReadyAt = now + Config.PUNCH_COOLDOWN;
      this.comboQueued = false;
    }

    // A smash being charged: released (or fully charged) it strikes.
    if (this.charging) {
      const held = now - this.chargeStart;
      if (!pad.attack || held >= SMASH_CHARGE_MS) {
        const move = this.charging;
        this.charging = null;
        this.anim.freeze(null);
        this.facing = this.chargeDir;
        this.strike(move, now, 1 + SMASH_CHARGE_BONUS * Math.min(1, held / SMASH_CHARGE_MS), 0.3);
      }
      return;
    }

    // Laser guns: a tap fires a light shot on release, holding charges a heavy one.
    if (this.weapon === 'laserGunMkI' || this.weapon === 'laserGunMkII') {
      const gun = this.weapon === 'laserGunMkI' ? Config.LASER_GUN_MK_I : Config.LASER_GUN_MK_II;
      if (attackPressed && now >= this.attackReadyAt) this.gunChargeStart = now;
      if (this.gunChargeStart >= 0 && (attackReleased || now - this.gunChargeStart >= GUN_TAP_MS + GUN_CHARGE_MS)) {
        const held = now - this.gunChargeStart;
        const c = held <= GUN_TAP_MS ? 0 : Math.min(1, (held - GUN_TAP_MS) / GUN_CHARGE_MS);
        this.gunChargeStart = -1;
        const damage = c === 0 ? Math.max(1, Math.round(gun.damage * 0.6)) : Math.round(gun.damage * (1 + 2 * c));
        // The cooldown grows with the charge, and so do the recoil and the bolt.
        this.attackReadyAt = now + gun.cooldown * (c === 0 ? 0.6 : 1) + held * 0.8 * c;
        this.shootingUntil = now + 300;
        this.hooks.fireBullet(this, damage, gun.speed * (1 - 0.25 * c), 0.75 + 1.9 * c, 1 + 2.5 * c);
        this.body.vx -= this.facing * gun.recoil * (1 + 2.5 * c) * UNIT;
        if (c > 0.3 && !this.grounded) this.body.vy -= 4 * c * UNIT;
        this.anim.play(ANIM.SHOOT, { restart: true, fade: 30, ms: 260 + 200 * c });
      }
    } else if (pad.attack) {
      const dir = this.attackDirection(pad);
      const smashFlick = this.grounded && (pad.smash || (attackPressed && now - this.dirPressedAt <= SMASH_INPUT_MS));
      if (this.attack) {
        // A flick just after the press turns the starting jab into a smash.
        const early = now - this.attackStart < SMASH_INPUT_MS && this.currentMove === combo[0] && flick
          && now - this.attackPressedAt <= SMASH_INPUT_MS && this.grounded;
        if (early) {
          this.attack = null;
          this.startSmash(flick === 'down' ? moves.dsmash : moves.fsmash, flick, now);
        } else if (this.inCombo && this.comboStep > 0 && attackPressed) {
          // A press during a strike is kept for the next move of the combo.
          this.comboQueued = true;
        }
      } else if (now >= this.attackReadyAt && (attackPressed || this.inComboWindow(now))) {
        if (!this.grounded) {
          this.comboStep = 0;
          this.facing = this.facingBefore;
          this.strike(moves[dir === 'up' ? 'uair' : dir === 'down' ? 'dair' : dir === 'forward' ? 'fair' : dir === 'back' ? 'bair' : 'nair'], now);
        } else if (dir === 'up') {
          this.comboStep = 0;
          this.strike(moves.uair, now); // jump + attack: the backflip kick
        } else if (smashFlick && (dir === 'down' || dir === 'forward' || dir === 'back')) {
          this.startSmash(dir === 'down' ? moves.dsmash : moves.fsmash, dir, now);
        } else if (dir === 'down') {
          this.comboStep = 0;
          this.strike(moves.dtilt, now);
        } else if (dir === 'forward' && Math.abs(this.body.vx) > 0.45 * Config.MAX_SPEED * UNIT) {
          this.comboStep = 0;
          this.strike(moves.dash, now);
        } else if (dir === 'forward' || dir === 'back') {
          // A tilt; held back, the robot has already turned round.
          this.comboStep = 0;
          this.strike(moves.ftilt, now);
        } else {
          if (now > this.comboUntil) this.comboStep = 0;
          this.strike(combo[this.comboStep], now);
        }
      }
    }

    if (pad.grab && now >= this.grabReadyAt && now >= this.grabEndsAt) {
      this.grabEndsAt = now + Config.GRAB_DURATION;
      this.grabReadyAt = this.grabEndsAt + Config.GRAB_COOLDOWN;
      this.grabAnimUntil = now + 300;
      if (!this.attack) this.anim.play(ANIM.GRAB, { restart: true, fade: 40 });
    }
    if (now < this.grabEndsAt) {
      this.hooks.tryGrab(this, new Phaser.Geom.Circle(this.x, this.y, Config.GRAB_RADIUS * UNIT));
    }
  }

  /**
   * Which move the stick asks for: up and down first, then towards or away
   * from where the robot faced before this frame's input, or, with nothing
   * held in the air, up while rising and down while falling.
   */
  private attackDirection(pad: PadState): Dir {
    if (pad.up) return 'up';
    if (pad.down) return 'down';
    const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
    if (dx !== 0) return dx === this.facingBefore ? 'forward' : 'back';
    if (!this.grounded) {
      // Just after a jump the attack is the rising flip; falling fast, the dive.
      if (this.hooks.now() - this.lastJumpAt < 180) return 'up';
      if (this.body.vy / UNIT > 6) return 'down';
    }
    return 'neutral';
  }

  /** Holding attack keeps chaining the ground combo (like holding A in SSB). */
  private inComboWindow(now: number): boolean {
    return this.comboStep > 0 && now <= this.comboUntil;
  }

  /** Starts charging a smash: rooted, the wind-up held while the attack is. */
  private startSmash(move: Move, dir: Dir, now: number): void {
    this.comboStep = 0;
    this.charging = move;
    this.chargeStart = now;
    // A back flick turns round for it.
    this.chargeDir = dir === 'back' ? (this.facingBefore === 1 ? -1 : 1) : this.facing;
    this.facing = this.chargeDir;
    this.anim.play(move.anim, { restart: true, ms: move.ms, fade: 50 });
    this.anim.freeze(0.3);
    this.currentMove = move;
  }

  /** Starts a strike; on the ground it advances the combo. */
  private strike(move: Move, now: number, power = 1, from = 0): void {
    const sword = move.points[0]?.file === SWORD_FILE;
    this.attack = {
      circles: [],
      // The blade is covered by circles from hilt to tip; fists and feet by one on the striking one.
      radius: (sword ? 0.3 : 0.35) * UNIT,
      points: move.points,
      striker: !sword && !move.all,
      behind: !!move.behind,
      all: !!move.all,
      both: !!move.both,
      damage: Math.round(move.damage * power),
      launch: { ...move.launch, knockback: move.launch.knockback * power },
      hit: new Set(),
    };
    // A charged smash resumes from its held wind-up (`from`).
    this.attackStart = now - from * move.ms;
    this.attackEndsAt = this.attackStart + move.ms;
    this.attackActive = move.active;
    this.currentMove = move;
    if (from > 0) this.anim.freeze(null);
    else this.anim.play(move.anim, { restart: true, ms: move.ms, fade: 45 });
    this.inCombo = COMBO.includes(move) || SWORD_COMBO.includes(move);
    if (this.inCombo) {
      this.comboStep = (this.comboStep + 1) % COMBO.length;
      this.comboUntil = this.attackEndsAt + COMBO_WINDOW;
      return;
    }
    const b = this.body;
    switch (move.anim) {
      case 'airKick': case 'sdair': // dives forwards and down
        b.setVelocity(this.facing * Math.max(Math.abs(b.vx), 10 * UNIT), Math.max(b.vy, 6 * UNIT));
        break;
      case 'uair': case 'suair': // the backflip hops up
        b.setVelocity(b.vx, Math.min(b.vy, -9 * UNIT));
        break;
      case 'fair': // thrown forwards
        b.setVelocity(this.facing * Math.max(Math.abs(b.vx), 7 * UNIT), b.vy);
        break;
    }
  }

  // --------------------------------------------------------------- power ups
  givePowerUp(type: PowerUpType, now: number): void {
    const def = POWER_UPS[type];
    // A new weapon replaces the current one instead of stacking.
    if (def.weapon) {
      const old = this.powerUps.find((p) => POWER_UPS[p.type].weapon);
      if (old) this.removePowerUp(old);
    }
    def.onStart(this);
    if (def.timed) this.powerUps.push({ type, endsAt: now + Config.POWERUP_DURATION });
  }

  private removePowerUp(p: ActivePowerUp): void {
    POWER_UPS[p.type].onFinish(this);
    this.powerUps = this.powerUps.filter((q) => q !== p);
  }

  private updatePowerUps(now: number): void {
    for (const p of [...this.powerUps]) if (now >= p.endsAt) this.removePowerUp(p);
    if (this.shield <= 0) this.powerUps = this.powerUps.filter((p) => p.type !== 'shield');
  }

  // ------------------------------------------------------------------ damage
  takeDamage(amount: number, attacker: Kubotz, launch: Launch, dirX: 1 | -1): void {
    if (this.dead || this.invincible || this.intangible) return;
    const now = this.hooks.now();
    this.lastAttacker = { by: attacker, at: now };
    const pushX = dirX * launch.knockback;
    if (this.guarding) {
      this.guard -= amount;
      this.body.vx += (pushX / 3) * UNIT;
      if (this.guard <= 0) this.breakGuard();
      return;
    }
    if (this.shield > 0) {
      this.shield -= amount;
      this.body.vx += (pushX / 2) * UNIT;
      return;
    }
    this.health = Math.max(0, this.health - amount);
    let hitstun: number;
    let tumble = false;
    if (launch.stun) {
      // Light combo hits keep the target on the ground and in reach of the next one.
      this.body.vx = pushX * UNIT;
      hitstun = launch.stun;
    } else {
      // Knockback grows with the damage taken (SSB), along the move's launch angle;
      // hitstun follows the launch speed, and a hard launch tumbles.
      const taken = 1 - this.health / Config.KUBOTZ_HEALTH;
      const speed = launch.knockback * (1 + Config.KNOCKBACK_GROWTH * taken * (launch.growth ?? 1));
      const a = (launch.angle * Math.PI) / 180;
      this.body.setVelocity(dirX * Math.cos(a) * speed * UNIT, -Math.sin(a) * speed * UNIT);
      hitstun = Math.min(Config.HITSTUN_MAX, Config.HITSTUN_BASE + speed * Config.HITSTUN_PER_UNIT);
      tumble = hitstun >= Config.TUMBLE_HITSTUN;
    }
    this.hitUntil = now + Math.max(250, hitstun);
    this.flashUntil = now + 70;
    this.hitstunUntil = Math.max(this.hitstunUntil, now + hitstun);
    this.tumbleUntil = tumble ? this.hitstunUntil : 0;
    this.knockdownUntil = 0;
    this.floorBounced = false;
    // Interrupted: a hit cancels the victim's own move, charge and combo.
    this.attack = null;
    this.currentMove = null;
    if (this.charging) { this.charging = null; this.anim.freeze(null); }
    this.gunChargeStart = -1;
    this.comboStep = 0;
    if (tumble) {
      this.anim.play('tumble', { restart: true, fade: 40 });
    } else {
      this.hitAnim = this.hitAnim === ANIM.HIT ? ANIM.HIT_2 : ANIM.HIT;
      this.anim.play(this.hitAnim, { restart: true, fade: 30 });
    }
  }

  /** RespawnSystem DEAD state: hide and freeze until respawn. */
  kill(now: number): void {
    this.dead = true;
    this.deaths++;
    this.lives--;
    this.eliminated = this.lives <= 0;
    this.respawnAt = now + Config.RESPAWN_DELAY;
    this.attack = null;
    this.charging = null;
    this.gunChargeStart = -1;
    this.anim.freeze(null);
    for (const p of [...this.powerUps]) this.removePowerUp(p);
    this.weapon = 'none';
    this.shield = 0;
    this.guarding = false;
    this.tag.setVisible(false);
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.model.visible = false;
  }

  /** RespawnSystem SPAWNING state. */
  respawn(x: number, y: number): void {
    this.dead = false;
    this.health = Config.KUBOTZ_HEALTH;
    this.energy = Config.KUBOTZ_ENERGY;
    this.maxJumps = Config.NB_JUMPS;
    this.lastAttacker = null;
    this.guard = Config.GUARD_MAX;
    this.stunnedUntil = 0;
    this.hitstunUntil = 0;
    this.tumbleUntil = 0;
    this.knockdownUntil = 0;
    this.body.enable = true;
    this.tag.setVisible(true);
    this.body.reset(x, y);
    this.model.visible = true;
    this.anim.play(ANIM.IDLE, { restart: true, fade: 0 });
  }

  teleport(x: number, y: number): void {
    this.body.reset(x, y, true);
  }

  // --------------------------------------------------------------- rendering
  /** Runs after physics so the drawing sits exactly on the body. */
  render(now: number, dtMs: number): void {
    if (this.dead) return;
    this.updateAnimationState(now);
    this.anim.tick(dtMs);

    const maps: string[] = [];
    if (this.look.head) maps.push(this.look.head);
    if (this.weapon === 'laserSword') maps.push('weapon_laserSword');
    else if (this.weapon !== 'none') maps.push('weapon_laserGunMkI');
    if (this.weapon === 'none' && this.currentMove?.maps && (this.attack || this.charging)) maps.push(...this.currentMove.maps);

    // On top of the clips: turning round, leaning into runs, squash on landing,
    // a wobble when the guard broke.
    // Turning: the drawn yaw eases the short way round to the new facing.
    if (this.facing !== this.drawnFacing) {
      this.drawnFacing = this.facing;
      const want = this.facing === 1 ? 0 : 180;
      let delta = (((want - this.yaw) % 360) + 540) % 360 - 180;
      if (delta === -180) delta = 180;
      this.turnFrom = this.yaw;
      this.yawTo = this.yaw + delta;
      this.turnAt = now;
      this.turnMs = this.grounded ? TURN_MS : AIR_TURN_MS;
    }
    const tt = Math.min(1, (now - this.turnAt) / this.turnMs);
    this.yaw = this.turnFrom + (this.yawTo - this.turnFrom) * tt * tt * (3 - 2 * tt);
    const vx = this.body.vx / (Config.MAX_SPEED * UNIT);
    let lean = this.grounded ? vx * 0.05 : vx * 0.04;
    if (now < this.stunnedUntil) lean += Math.sin(now / 60) * 0.1;
    const squash = now < this.squashUntil ? 1 - 0.12 * Math.sin(((this.squashUntil - now) / 160) * Math.PI) : 1;
    const pose = this.anim.pose();
    // Footsteps land when the other foot touches down in the run.
    if (this.anim.name === ANIM.RUN && this.grounded) {
      const foot = this.rig.lowestFoot(pose).foot;
      if (this.plantedFoot && foot !== this.plantedFoot && now - this.lastStepAt > 120) {
        this.lastStepAt = now;
        this.hooks.playSfx('step', 0.25);
      }
      this.plantedFoot = foot;
    } else this.plantedFoot = '';
    // A clip's own spin (yaw) turns the same way whichever side the robot faces.
    const yaw = this.yaw + (pose.yaw ?? 0) * this.facing;
    // Charging shakes with the building power.
    const c = this.charge;
    const shake = c > 0 && this.charging ? Math.sin(now / 18) * 2.5 * c : 0;
    this.model.update(pose, maps, this.body.x + shake, this.body.bottom, yaw, {
      dtMs,
      lean, squash,
      alpha: this.intangible ? 0.55 : 1,
      flash: now < this.flashUntil || (c > 0.98 && this.charging !== null && Math.floor(now / 60) % 2 === 0),
    });
    // Afterimages behind fast moves, dashes, dodges and tumbles.
    const fast = Math.hypot(this.body.vx, this.body.vy) > 17 * UNIT;
    if ((this.attack && this.currentMove?.ghosts) || now < this.dodgeUntil || this.tumbling || fast) {
      if (now >= this.nextGhostAt) {
        this.nextGhostAt = now + 38;
        this.model.ghost(this.look.color, this.tumbling ? 160 : 210);
      }
    }
    this.drawOverlay(now);
  }

  private updateAnimationState(now: number): void {
    const a = this.anim;
    if (this.attack || this.charging) return; // the strike (or its held wind-up) plays out
    if (now < this.dodgeUntil) return; // the dodge roll plays out
    const vx = this.body.vx;
    const vy = this.body.vy;
    if (now < this.knockdownUntil) return; // the knockdown plays out
    if (this.tumbling) { a.play('tumble', { fade: 40 }); return; }
    if (now < this.hitUntil || now < this.stunnedUntil || now < this.hitstunUntil) { a.play(this.hitAnim, { fade: 30 }); return; }
    if (this.guarding) { a.play(ANIM.GUARD, { fade: 70 }); return; }
    if (now < this.grabAnimUntil) return;
    if (now < this.shootingUntil && this.weapon !== 'none') return;
    if (!this.grounded) {
      // The jump and the flip play out, then the fall.
      if ((a.name === ANIM.JUMP || a.name === ANIM.FLIP) && !a.finished) return;
      a.play(vy < 0 && a.name === ANIM.JUMP ? ANIM.JUMP : ANIM.FALL, { fade: 160 });
    } else if (now < this.turnUntil) {
      return; // the pivot plays out
    } else if (Math.abs(vx) > 4) {
      a.play(ANIM.RUN, { fade: 90 });
      // The stride follows the speed.
      a.setRate(Phaser.Math.Clamp(Math.abs(vx) / (Config.MAX_SPEED * UNIT), 0.6, 1.2));
    } else if (now < this.landUntil) a.play(ANIM.LAND, { fade: 40 });
    else if (this.pad.down) a.play(ANIM.CROUCH, { fade: 90 });
    else if (a.name !== ANIM.LAND || a.finished) a.play(ANIM.IDLE, { fade: 140 });
  }

  private drawOverlay(now: number): void {
    const g = this.healthBar.clear();
    const w = UNIT * 1.2;
    const x = this.x - w / 2;
    const y = this.body.top - UNIT * 0.75;
    g.fillStyle(0x000000, 0.55).fillRect(x - 2, y - 2, w + 4, 10);
    g.fillStyle(this.health > 30 ? 0x7df466 : 0xff5252, 1).fillRect(x, y, (w * this.health) / Config.KUBOTZ_HEALTH, 6);
    // Constant on-screen size whatever the camera zoom.
    const zoom = this.scene.cameras.main.zoom;
    this.tag.setPosition(this.x, y - 6).setScale(0.42 / zoom);
    if (this.guarding) {
      const r = UNIT * (0.6 + 0.75 * (this.guard / Config.GUARD_MAX));
      g.fillStyle(this.look.color, 0.35).fillCircle(this.x, this.y, r);
      g.lineStyle(3, 0xffffff, 0.7).strokeCircle(this.x, this.y, r);
    }
  }

  destroy(): void {
    this.model.destroy();
    this.healthBar.destroy();
    this.tag.destroy();
    this.body.destroy();
  }
}
