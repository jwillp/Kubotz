import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { SpriterAnimator, SpriterData } from '../spriter/Spriter';
import { Robot3D } from '../three/Robot3D';
import type { World3D } from '../three/World3D';
import { Controller, PadState, emptyPad } from './Input';
import { ActivePowerUp, PowerUpType, POWER_UPS } from './PowerUps';
import { KubotzBody, PhysicsWorld } from '../physics/Physics';

export type Weapon = 'none' | 'laserGunMkI' | 'laserGunMkII' | 'laserSword';

/** Something an attack can hit. */
export interface Damageable {
  readonly owner: Kubotz; // who it belongs to (itself for a Kubotz); no friendly fire
  hurtbox(): Phaser.Geom.Rectangle;
  isAlive(): boolean;
  takeDamage(amount: number, attacker: Kubotz, pushX: number): void;
}

/** A point of a body part (Spriter image pixels, origin bottom-left, y up). */
export interface PartPoint { file: string; x: number; y: number; }

export interface AttackBox {
  /** Hit circles, placed every frame on the striking part (fist, foot, blade). */
  circles: Phaser.Geom.Circle[];
  radius: number;
  points: PartPoint[];
  damage: number;
  knockback: number;
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

const ANIM = {
  IDLE: 'Idle', RUNNING: 'Running', JUMPING: 'Jumping', FALLING: 'Falling',
  PUNCHING: 'Punching', AIR_KICKING: 'Air Kicking', SHOOTING: 'Shooting',
  SWORD: 'Sword_slash1', HIT: 'Hit', DYING: 'Dying',
} as const;

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
}

/**
 * The playable robot (KubotzFactory + Running/Jump/Melee/Grab/Gun/LaserSword/
 * PowerUps/Respawn components and systems, folded into one class).
 */
export class Kubotz implements Damageable {
  readonly owner = this;
  readonly body: KubotzBody;
  private readonly anim: SpriterAnimator;
  readonly model: Robot3D;
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
  private attackReadyAt = 0;
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
    spriter: SpriterData,
    x: number,
    y: number,
    private hooks: ArenaHooks,
    physics: PhysicsWorld,
    world3d: World3D,
  ) {
    this.body = new KubotzBody(physics, x, y);

    this.anim = new SpriterAnimator(spriter, ANIM.IDLE);
    this.look = { head: HEADS[index % HEADS.length], color };
    if (this.look.head) this.anim.setCharacterMaps([this.look.head]);
    // The 3D robot: helmets and laser sword are painted in the player's colour.
    this.model = new Robot3D((file) => {
      let key = `kubotz:${file}`;
      if (HEAD_FILES.includes(file)) key = `head:${hex(color)}:${file}`;
      else if (file === SWORD_FILE) key = `sword:${hex(color)}`;
      if (!scene.textures.exists(key)) key = `kubotz:${file}`;
      return { key, img: scene.textures.get(key).getSourceImage() as HTMLImageElement };
    });
    world3d.add(this.model.group);
    this.healthBar = scene.add.graphics().setDepth(20);
    // The P1 / P2 / CPU arrow label floats above the robot.
    const label = controller.label === 'CPU' ? `label-CPU:${hex(color)}` : `label-${controller.label}`;
    this.tag = scene.add.image(x, y, scene.textures.exists(label) ? label : 'label-CPU').setOrigin(0.5, 1).setDepth(21);
  }

  get name(): string { return this.controller.label === 'CPU' ? `CPU ${this.index + 1}` : this.controller.label; }
  get x(): number { return this.body.x; }
  get y(): number { return this.body.y; }
  get grounded(): boolean { return this.body.grounded; }
  get invincible(): boolean { return this.powerUps.some((p) => p.type === 'invincibility'); }
  /** Air-dodging: attacks and bullets pass through. */
  get intangible(): boolean { return this.hooks.now() < this.dodgeUntil; }
  isAlive(): boolean { return !this.dead; }

  hurtbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.body.left, this.body.top, this.body.width, this.body.height);
  }

  /** The active melee / sword hitbox, if any, on the striking part of the 3D robot. */
  currentAttack(): AttackBox | null {
    const a = this.attack;
    if (!a) return null;
    a.circles = a.points
      .map((p) => this.model.pointOn(p.file, p.x, p.y))
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
    const pad = this.pad = controls && now >= this.stunnedUntil ? read : emptyPad();
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
        if (grounded) this.hooks.dust(this.x, b.bottom);
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
    }
    if (grounded && Math.abs(vx) > 4 && now >= this.nextStepAt) {
      this.nextStepAt = now + 260;
      this.hooks.playSfx('step', 0.25);
    }
    this.wasGrounded = grounded;
  }

  private speedFactor(): number {
    return this.powerUps.some((p) => p.type === 'speed') ? 1.1 : 1;
  }

  // ----------------------------------------------------------------- actions
  private handleActions(pad: PadState, now: number): void {
    if (this.attack && now >= this.attackEndsAt) {
      this.attack = null;
      this.attackReadyAt = now + (this.weapon === 'laserSword' ? Config.LASER_SWORD_COOLDOWN : Config.PUNCH_COOLDOWN);
    }

    if (pad.attack) {
      if (this.weapon === 'laserGunMkI' || this.weapon === 'laserGunMkII') {
        const gun = this.weapon === 'laserGunMkI' ? Config.LASER_GUN_MK_I : Config.LASER_GUN_MK_II;
        if (now >= this.attackReadyAt) {
          this.attackReadyAt = now + gun.cooldown;
          this.shootingUntil = now + gun.cooldown;
          this.hooks.fireBullet(this, gun.damage, gun.speed);
          this.body.vx -= this.facing * gun.recoil * UNIT; // recoil
        }
      } else if (!this.attack && now >= this.attackReadyAt) {
        const sword = this.weapon === 'laserSword';
        const air = !this.grounded;
        this.attack = {
          circles: [],
          // The blade is covered by circles from hilt to tip; punches and kicks use the fist or foot.
          radius: (sword ? 0.3 : 0.35) * UNIT,
          points: sword ? bladePoints() : [air ? { file: 'feet/foot.png', x: 21, y: 40 } : { file: 'arms/hand.png', x: 36, y: 53 }],
          damage: sword ? Config.LASER_SWORD_DAMAGE : Config.PUNCH_DAMAGE,
          knockback: Config.PUNCH_KNOCKBACK * (sword ? 1.5 : 1),
          hit: new Set(),
        };
        this.attackEndsAt = now + (sword ? Config.LASER_SWORD_DURATION : Config.PUNCH_DURATION);
        this.anim.play(sword ? ANIM.SWORD : air ? ANIM.AIR_KICKING : ANIM.PUNCHING, true);
        // The swing plays over the whole hit window.
        this.anim.speed = sword ? 1000 / Config.LASER_SWORD_DURATION : 1;
      }
    }

    if (pad.grab && now >= this.grabReadyAt && now >= this.grabEndsAt) {
      this.grabEndsAt = now + Config.GRAB_DURATION;
      this.grabReadyAt = this.grabEndsAt + Config.GRAB_COOLDOWN;
    }
    if (now < this.grabEndsAt) {
      this.hooks.tryGrab(this, new Phaser.Geom.Circle(this.x, this.y, Config.GRAB_RADIUS * UNIT));
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
  takeDamage(amount: number, attacker: Kubotz, pushX: number): void {
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
    this.body.vx += pushX * growth * UNIT;
    this.body.vy -= Math.abs(pushX) * 0.6 * growth * UNIT;
    this.hitUntil = now + 250;
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
    this.body.enable = true;
    this.tag.setVisible(true);
    this.body.reset(x, y);
    this.model.visible = true;
    this.anim.play(ANIM.IDLE, true);
  }

  teleport(x: number, y: number): void {
    this.body.reset(x, y, true);
  }

  // --------------------------------------------------------------- rendering
  /** Runs after physics so the sprite sits exactly on the body. */
  render(now: number, dtMs: number): void {
    if (this.dead) return;
    this.updateAnimationState(now);
    this.anim.tick(dtMs);

    const maps: string[] = [];
    if (this.look.head) maps.push(this.look.head);
    if (this.weapon === 'laserSword') maps.push('weapon_laserSword');
    else if (this.weapon !== 'none') maps.push('weapon_laserGunMkI');
    this.anim.setCharacterMaps(maps);

    // Extra motion on top of the Spriter animations: turning round, leaning into
    // runs, squash on landing, a spin when air-dodging, a wobble when stunned.
    this.face += (this.facing - this.face) * Math.min(1, (dtMs / 1000) * 14);
    const vx = this.body.vx / (Config.MAX_SPEED * UNIT);
    let lean = this.grounded ? -vx * 0.12 : -vx * 0.05;
    if (now < this.stunnedUntil) lean += Math.sin(now / 60) * 0.1;
    const spin = this.intangible ? -((this.dodgeUntil - now) / Config.AIR_DODGE_DURATION) * Math.PI * 2 * this.facing : 0;
    const squash = now < this.squashUntil ? 1 - 0.12 * Math.sin(((this.squashUntil - now) / 160) * Math.PI) : 1;
    const blink = this.invincible && Math.floor(now / 80) % 2 === 0;
    this.model.update(this.anim.pose(), this.body.x, this.body.bottom, this.face, {
      lean, spin, squash,
      alpha: blink ? 0.45 : this.intangible ? 0.4 : 1,
      flash: now < this.hitUntil,
    });
    this.drawOverlay(now);
  }

  private updateAnimationState(now: number): void {
    const a = this.anim;
    const current = a.animationName;
    const vy = this.body.vy;
    const vx = this.body.vx;
    const busy = (current === ANIM.PUNCHING || current === ANIM.AIR_KICKING || current === ANIM.SWORD) && this.attack;
    if (busy) return;
    a.speed = 1;
    if (now < this.hitUntil || now < this.stunnedUntil) { a.play(ANIM.HIT); return; }
    if (this.guarding) { a.play(ANIM.IDLE); return; }
    if (now < this.shootingUntil && this.weapon !== 'none') { a.play(ANIM.SHOOTING); return; }
    if (!this.grounded) a.play(vy < 0 ? ANIM.JUMPING : ANIM.FALLING);
    else if (Math.abs(vx) > 4) a.play(ANIM.RUNNING);
    else a.play(ANIM.IDLE);
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
    this.model.dispose();
    this.healthBar.destroy();
    this.tag.destroy();
    this.body.destroy();
  }
}
