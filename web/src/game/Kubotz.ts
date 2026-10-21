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
  takeDamage(amount: number, attacker: Kubotz, pushX: number, stun?: number): void;
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
  damage: number;
  knockback: number;
  stun: number;
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
const ROOT_MOTION_GAIN = 3;

/** Front and back fists and feet (the back limbs use the _sha images), near the knuckles and toes. */
const FISTS: PartPoint[] = [{ file: 'arms/hand.png', x: 36, y: 53 }, { file: 'arms/hand_sha.png', x: 34, y: 34 }];
const FEET: PartPoint[] = [{ file: 'feet/foot.png', x: 21, y: 40 }, { file: 'feet/foot_sha.png', x: 24, y: 45 }];

/** A strike: its clip, length, striking points, effect, and the part of it (0..1) that hurts. */
interface Move { anim: string; ms: number; points: PartPoint[]; damage: number; knockback: number; stun: number; active: [number, number] }

/**
 * The unarmed ground combo, Super Smash Bros. style: three presses in a row
 * chain a jab, a cross and a kick. The first two push lightly and stun
 * briefly so the next hit connects; the kick launches.
 */
const COMBO: Move[] = [
  { anim: 'jab', ms: 280, points: FISTS, damage: 3, knockback: 3, stun: 280, active: [0.3, 0.72] },
  { anim: 'cross', ms: 360, points: FISTS, damage: 4, knockback: 4, stun: 320, active: [0.36, 0.78] },
  { anim: 'kick', ms: 440, points: FEET, damage: 6, knockback: 13, stun: 0, active: [0.32, 0.74] },
];
/** The laser sword's combo: overhead slash, rising slash, lunging thrust. */
const SWORD_COMBO: Move[] = [
  { anim: 'slash1', ms: 320, points: bladePoints(), damage: 6, knockback: 4, stun: 300, active: [0.36, 0.78] },
  { anim: 'slash2', ms: 340, points: bladePoints(), damage: 7, knockback: 5, stun: 320, active: [0.28, 0.66] },
  { anim: 'slash3', ms: 420, points: bladePoints(), damage: 10, knockback: 15, stun: 0, active: [0.35, 0.8] },
];
const AIR_KICK: Move = { anim: 'airKick', ms: 420, points: FEET, damage: Config.PUNCH_DAMAGE, knockback: Config.PUNCH_KNOCKBACK, stun: 0, active: [0.35, 1] };
const AIR_SLASH: Move = { ...SWORD_COMBO[1], stun: 0, knockback: 9 };
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
  fireBullet(shooter: Kubotz, damage: number, speed: number): void;
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
  private face = -1; // eased facing for the turn-round animation
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
  private dodgeReady = true;
  private guardHeld = false;
  private nextStepAt = 0;
  private shootingUntil = 0;
  private hitUntil = 0;
  private flashUntil = 0;
  /** Hitstun from light combo hits (no control, unlike a guard break it shows no wobble). */
  private hitstunUntil = 0;
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
    rig: Rig,
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
    const placed = a.striker ? [at.flat().sort((u, v) => this.facing * (v.x - u.x))[0]] : at.map((l) => l[0]);
    a.circles = placed
      .filter((p): p is { x: number; y: number } => !!p)
      .map((p) => new Phaser.Geom.Circle(p.x, p.y, a.radius));
    // Before the first pose (or if the part is hidden), fall back to the reach in front.
    if (a.circles.length === 0) a.circles = [new Phaser.Geom.Circle(this.x + this.facing * 0.75 * UNIT, this.y, a.radius)];
    return a;
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
    this.updateGuard(pad, now, dt);
    if (this.guarding) {
      // Guarding roots the robot: no running, jumping or attacking.
      this.move(emptyPad(), now, dt);
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
    this.updatePowerUps(now);
  }

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

    if (pad.left) {
      vx = Math.max(vx - accel, -Config.MAX_SPEED);
      this.facing = -1;
    } else if (pad.right) {
      vx = Math.min(vx + accel, Config.MAX_SPEED);
      this.facing = 1;
    } else if (grounded) {
      vx = vx > 0 ? Math.max(vx - accel, 0) : Math.min(vx + accel, 0);
    }

    if (pad.up) {
      if (this.jumps < this.maxJumps && now >= this.jumpReadyAt) {
        vy = -Config.JUMP_VELOCITY;
        this.jumps++;
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
      if (grounded && this.body.onPlatform) this.dropUntil = now + 300;
      // fast fall: (RunningSystem.moveDown) never slows the fall down
      const step = Config.JUMP_VELOCITY * Config.FAST_FALL_FACTOR * 60 * dt;
      vy = Math.max(vy, Math.min(vy, Config.MAX_SPEED) + step);
    }

    b.dropping = now < this.dropUntil;
    b.setVelocity(vx * UNIT, vy * UNIT);
    if (grounded && !this.wasGrounded) {
      this.hooks.dust(this.x, b.bottom);
      this.squashUntil = now + 160;
      this.landUntil = now + 200;
      if (!this.attack) this.anim.play(ANIM.LAND, { restart: true, fade: 40 });
    }
    if (grounded && Math.abs(vx) > 4 && now >= this.nextStepAt) {
      this.nextStepAt = now + 260;
      this.hooks.playSfx('step', 0.25);
      this.hooks.runDust(this.x, b.bottom, -Math.sign(vx));
    }
    this.wasGrounded = grounded;
  }

  private speedFactor(): number {
    return this.powerUps.some((p) => p.type === 'speed') ? 1.1 : 1;
  }

  // ----------------------------------------------------------------- actions
  private handleActions(pad: PadState, now: number): void {
    const combo = this.weapon === 'laserSword' ? SWORD_COMBO : COMBO;
    if (this.attack && now >= this.attackEndsAt) {
      this.attack = null;
      if (!this.inCombo) this.attackReadyAt = now + Config.PUNCH_COOLDOWN;
      else if (this.comboStep === 0) this.attackReadyAt = now + COMBO_RECOVERY; // the chain is over
      else if (this.comboQueued && this.grounded) this.strike(combo[this.comboStep], now);
      else this.attackReadyAt = now + Config.PUNCH_COOLDOWN;
      this.comboQueued = false;
    }

    if (pad.attack) {
      if (this.weapon === 'laserGunMkI' || this.weapon === 'laserGunMkII') {
        const gun = this.weapon === 'laserGunMkI' ? Config.LASER_GUN_MK_I : Config.LASER_GUN_MK_II;
        if (now >= this.attackReadyAt) {
          this.attackReadyAt = now + gun.cooldown;
          this.shootingUntil = now + Math.max(260, gun.cooldown);
          this.hooks.fireBullet(this, gun.damage, gun.speed);
          this.body.vx -= this.facing * gun.recoil * UNIT; // recoil
          this.anim.play(ANIM.SHOOT, { restart: true, fade: 30 });
        }
      } else if (this.attack) {
        // A press during a strike is kept for the next move of the combo.
        if (this.inCombo && this.comboStep > 0) this.comboQueued = true;
      } else if (now >= this.attackReadyAt) {
        if (!this.grounded) {
          this.comboStep = 0;
          this.strike(this.weapon === 'laserSword' ? AIR_SLASH : AIR_KICK, now);
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

  /** Starts a strike; on the ground it advances the combo. */
  private strike(move: Move, now: number): void {
    const sword = move.anim.startsWith('slash');
    this.attack = {
      circles: [],
      // The blade is covered by circles from hilt to tip; fists and feet by one on the striking one.
      radius: (sword ? 0.3 : 0.35) * UNIT,
      points: move.points,
      striker: !sword,
      damage: move.damage,
      knockback: move.knockback,
      stun: move.stun,
      hit: new Set(),
    };
    this.attackStart = now;
    this.attackEndsAt = now + move.ms;
    this.attackActive = move.active;
    this.anim.play(move.anim, { restart: true, ms: move.ms, fade: 45 });
    this.inCombo = move !== AIR_KICK && move !== AIR_SLASH;
    if (this.inCombo) {
      this.comboStep = (this.comboStep + 1) % COMBO.length;
      this.comboUntil = this.attackEndsAt + COMBO_WINDOW;
    } else if (move === AIR_KICK) {
      // The air kick dives forwards.
      this.body.setVelocity(this.facing * Math.max(Math.abs(this.body.vx), 10 * UNIT), Math.max(this.body.vy, 6 * UNIT));
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
  takeDamage(amount: number, attacker: Kubotz, pushX: number, stun = 0): void {
    if (this.dead || this.invincible || this.intangible) return;
    const now = this.hooks.now();
    this.lastAttacker = { by: attacker, at: now };
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
    // The more damage taken, the further hits send you (SSB-like).
    const growth = 1 + Config.KNOCKBACK_GROWTH * (1 - this.health / Config.KUBOTZ_HEALTH);
    if (stun) {
      // Light combo hits keep the target on the ground and in reach of the next one.
      this.body.vx = pushX * UNIT;
    } else {
      this.body.vx += pushX * growth * UNIT;
      this.body.vy -= Math.abs(pushX) * 0.6 * growth * UNIT;
    }
    this.hitUntil = now + Math.max(250, stun);
    this.flashUntil = now + 70;
    this.hitstunUntil = Math.max(this.hitstunUntil, now + stun);
    // Interrupted: a hit cancels the victim's own move and combo.
    this.attack = null;
    this.comboStep = 0;
    this.hitAnim = this.hitAnim === ANIM.HIT ? ANIM.HIT_2 : ANIM.HIT;
    this.anim.play(this.hitAnim, { restart: true, fade: 30 });
  }

  /** RespawnSystem DEAD state: hide and freeze until respawn. */
  kill(now: number): void {
    this.dead = true;
    this.deaths++;
    this.lives--;
    this.eliminated = this.lives <= 0;
    this.respawnAt = now + Config.RESPAWN_DELAY;
    this.attack = null;
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

    // On top of the clips: turning round, leaning into runs, squash on landing,
    // a wobble when the guard broke.
    this.face += (this.facing - this.face) * Math.min(1, (dtMs / 1000) * 16);
    const vx = this.body.vx / (Config.MAX_SPEED * UNIT);
    let lean = this.grounded ? vx * 0.05 : vx * 0.04;
    if (now < this.stunnedUntil) lean += Math.sin(now / 60) * 0.1;
    const squash = now < this.squashUntil ? 1 - 0.12 * Math.sin(((this.squashUntil - now) / 160) * Math.PI) : 1;
    const blink = this.invincible && Math.floor(now / 80) % 2 === 0;
    this.model.update(this.anim.pose(), maps, this.body.x, this.body.bottom, this.face, {
      lean, squash,
      alpha: blink ? 0.45 : this.intangible ? 0.55 : 1,
      flash: now < this.flashUntil,
    });
    this.drawOverlay(now);
  }

  private updateAnimationState(now: number): void {
    const a = this.anim;
    if (this.attack) return; // the strike plays out
    if (now < this.dodgeUntil) return; // the dodge roll plays out
    const vx = this.body.vx;
    const vy = this.body.vy;
    if (now < this.hitUntil || now < this.stunnedUntil || now < this.hitstunUntil) { a.play(this.hitAnim, { fade: 30 }); return; }
    if (this.guarding) { a.play(ANIM.GUARD, { fade: 70 }); return; }
    if (now < this.grabAnimUntil) return;
    if (now < this.shootingUntil && this.weapon !== 'none') return;
    if (!this.grounded) {
      // The jump and the flip play out, then the fall.
      if ((a.name === ANIM.JUMP || a.name === ANIM.FLIP) && !a.finished) return;
      a.play(vy < 0 && a.name === ANIM.JUMP ? ANIM.JUMP : ANIM.FALL, { fade: 160 });
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
    if (this.shield > 0) {
      const pulse = 0.25 + 0.1 * Math.sin(now / 120);
      g.lineStyle(3, 0x66ccff, 0.8).fillStyle(0x66ccff, pulse)
        .fillEllipse(this.x, this.y, UNIT * 1.8, UNIT * 2.6)
        .strokeEllipse(this.x, this.y, UNIT * 1.8, UNIT * 2.6);
    }
  }

  destroy(): void {
    this.model.destroy();
    this.healthBar.destroy();
    this.tag.destroy();
    this.body.destroy();
  }
}
