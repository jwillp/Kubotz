import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { SpriterData, SpriterPlayer } from '../spriter/Spriter';
import { Controller, PadState, emptyPad } from './Input';
import { ActivePowerUp, PowerUpType, POWER_UPS } from './PowerUps';

export type Weapon = 'none' | 'laserGunMkI' | 'laserGunMkII' | 'laserSword';

/** Something an attack can hit: a Kubotz or a drone. */
export interface Damageable {
  readonly owner: Kubotz; // who it belongs to (itself for a Kubotz); no friendly fire
  hurtbox(): Phaser.Geom.Rectangle;
  isAlive(): boolean;
  takeDamage(amount: number, attacker: Kubotz, pushX: number): void;
}

export interface AttackBox {
  circle: Phaser.Geom.Circle;
  damage: number;
  knockback: number;
  /** Targets already hit by this swing: one hit per target per swing. */
  hit: Set<Damageable>;
}

const ANIM = {
  IDLE: 'Idle', RUNNING: 'Running', JUMPING: 'Jumping', FALLING: 'Falling',
  PUNCHING: 'Punching', AIR_KICKING: 'Air Kicking', SHOOTING: 'Shooting',
  SWORD: 'Sword_slash1', HIT: 'Hit', DYING: 'Dying',
} as const;

export interface KubotzLook { head: string | null; tint: number; color: number; }

export const LOOKS: KubotzLook[] = [
  { head: null, tint: 0xffffff, color: 0xed1c24 }, // hud/player1_label.png red
  { head: 'head_terminator', tint: 0xffffff, color: 0x29abe2 }, // hud/player2_label.png blue
  { head: 'head_bigbuff', tint: 0xffffff, color: 0x8cc63f }, // hud/cpu_label.png green
  { head: 'head_skull', tint: 0xffffff, color: 0xffd166 },
];

/** Callbacks into the arena, so the actor stays free of scene plumbing. */
export interface ArenaHooks {
  fireBullet(shooter: Kubotz, damage: number, speed: number): void;
  spawnDrone(master: Kubotz): void;
  tryGrab(kubotz: Kubotz, area: Phaser.Geom.Circle): void;
  dust(x: number, y: number): void;
}

/**
 * The playable robot (KubotzFactory + Running/Jump/Melee/Grab/Gun/LaserSword/
 * DroneGauntlet/PowerUps/Respawn components and systems, folded into one class).
 */
export class Kubotz implements Damageable {
  readonly owner = this;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly view: Phaser.GameObjects.Container;
  private readonly anim: SpriterPlayer;
  private readonly healthBar: Phaser.GameObjects.Graphics;

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
  droneReadyAt = 0;
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
    spriter: SpriterData,
    x: number,
    y: number,
    private hooks: ArenaHooks,
  ) {
    const w = Config.KUBOTZ_WIDTH * UNIT;
    const h = Config.KUBOTZ_HEIGHT * UNIT;
    const zone = scene.add.zone(x, y, w, h);
    scene.physics.add.existing(zone);
    this.body = zone.body as Phaser.Physics.Arcade.Body;
    this.body.setMaxVelocity(Config.MAX_SPEED * UNIT * 2, Config.MAX_SPEED * UNIT * 2);

    this.anim = new SpriterPlayer(scene, spriter, 'kubotz:', ANIM.IDLE);
    const scale = Config.SPRITER_SCALE * UNIT;
    this.anim.setScale(scale);
    this.view = scene.add.container(x, y, [this.anim]).setDepth(10);
    const look = this.look;
    if (look.head) this.anim.setCharacterMaps([look.head]);
    this.healthBar = scene.add.graphics().setDepth(20);
  }

  get look(): KubotzLook { return LOOKS[this.index % LOOKS.length]; }
  get name(): string { return this.controller.label === 'CPU' ? `CPU ${this.index + 1}` : this.controller.label; }
  get x(): number { return this.body.center.x; }
  get y(): number { return this.body.center.y; }
  get grounded(): boolean { return this.body.blocked.down; }
  get invincible(): boolean { return this.powerUps.some((p) => p.type === 'invincibility'); }
  isAlive(): boolean { return !this.dead; }

  hurtbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.body.x, this.body.y, this.body.width, this.body.height);
  }

  /** The active melee / sword hitbox, if any. */
  currentAttack(): AttackBox | null {
    if (!this.attack) return null;
    const r = this.attack.circle.radius;
    const offset = this.weapon === 'laserSword' ? 0.75 * UNIT : 0.75 * UNIT;
    this.attack.circle.setTo(this.x + this.facing * offset, this.y, r);
    return this.attack;
  }

  update(now: number, dt: number): void {
    if (this.dead) { this.healthBar.clear(); return; }
    const pad = this.pad = this.controller.read();
    this.move(pad, now, dt);
    this.handleActions(pad, now);
    this.updatePowerUps(now);
  }

  // ---------------------------------------------------------------- movement
  private move(pad: PadState, now: number, dt: number): void {
    const b = this.body;
    let vx = b.velocity.x / UNIT;
    let vy = b.velocity.y / UNIT; // y-down
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
      // fast fall: (RunningSystem.moveDown) never slows the fall down
      const step = Config.JUMP_VELOCITY * Config.FAST_FALL_FACTOR * 60 * dt;
      vy = Math.max(vy, Math.min(vy, Config.MAX_SPEED) + step);
    }

    b.setVelocity(vx * UNIT, vy * UNIT);
    if (grounded && !this.wasGrounded) this.hooks.dust(this.x, b.bottom);
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
        }
      } else if (!this.attack && now >= this.attackReadyAt) {
        const sword = this.weapon === 'laserSword';
        this.attack = {
          circle: new Phaser.Geom.Circle(0, 0, (sword ? 0.75 : 0.25) * UNIT),
          damage: sword ? Config.LASER_SWORD_DAMAGE : Config.PUNCH_DAMAGE,
          knockback: Config.PUNCH_KNOCKBACK * (sword ? 1.5 : 1),
          hit: new Set(),
        };
        this.attackEndsAt = now + (sword ? Config.LASER_SWORD_DURATION : Config.PUNCH_DURATION);
        this.anim.play(sword ? ANIM.SWORD : this.grounded ? ANIM.PUNCHING : ANIM.AIR_KICKING, true);
      }
    }

    if (pad.grab && now >= this.grabReadyAt && now >= this.grabEndsAt) {
      this.grabEndsAt = now + Config.GRAB_DURATION;
      this.grabReadyAt = this.grabEndsAt + Config.GRAB_COOLDOWN;
    }
    if (now < this.grabEndsAt) {
      this.hooks.tryGrab(this, new Phaser.Geom.Circle(this.x, this.y, Config.GRAB_RADIUS * UNIT));
    }

    if (pad.skill && now >= this.droneReadyAt) {
      this.droneReadyAt = now + Config.DRONE_COOLDOWN;
      this.hooks.spawnDrone(this);
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
    if (this.dead || this.invincible) return;
    const now = this.scene.time.now;
    this.lastAttacker = { by: attacker, at: now };
    if (this.shield > 0) {
      this.shield -= amount;
      this.body.velocity.x += (pushX / 2) * UNIT;
      return;
    }
    this.health = Math.max(0, this.health - amount);
    this.body.velocity.x += pushX * UNIT;
    this.body.velocity.y -= Math.abs(pushX) * 0.5 * UNIT;
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
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.view.setVisible(false);
  }

  /** RespawnSystem SPAWNING state. */
  respawn(x: number, y: number): void {
    this.dead = false;
    this.health = Config.KUBOTZ_HEALTH;
    this.energy = Config.KUBOTZ_ENERGY;
    this.maxJumps = Config.NB_JUMPS;
    this.lastAttacker = null;
    this.body.enable = true;
    this.body.reset(x, y);
    this.view.setVisible(true);
    this.anim.play(ANIM.IDLE, true);
  }

  teleport(x: number, y: number): void {
    const v = this.body.velocity.clone();
    this.body.reset(x, y);
    this.body.setVelocity(v.x, v.y);
  }

  // --------------------------------------------------------------- rendering
  /** Runs after physics so the sprite sits exactly on the body. */
  render(now: number, dtMs: number): void {
    if (this.dead) return;
    this.view.setPosition(this.body.center.x, this.body.bottom);
    this.updateAnimationState(now);
    this.anim.setFlipped(this.facing === 1); // the Spriter art faces left
    this.anim.tick(dtMs);

    const maps: string[] = [];
    if (this.look.head) maps.push(this.look.head);
    if (this.weapon === 'laserSword') maps.push('weapon_laserSword');
    else if (this.weapon !== 'none') maps.push('weapon_laserGunMkI');
    this.anim.setCharacterMaps(maps);

    const blink = this.invincible && Math.floor(now / 80) % 2 === 0;
    this.anim.setAlpha(blink ? 0.45 : 1);
    this.drawOverlay(now);
  }

  private updateAnimationState(now: number): void {
    const a = this.anim;
    const current = a.animationName;
    const vy = this.body.velocity.y;
    const vx = this.body.velocity.x;
    const busy = (current === ANIM.PUNCHING || current === ANIM.AIR_KICKING || current === ANIM.SWORD) && this.attack;
    if (busy) return;
    if (now < this.hitUntil) { a.play(ANIM.HIT); return; }
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
    g.fillStyle(this.look.color, 1).fillTriangle(this.x - 7, y - 14, this.x + 7, y - 14, this.x, y - 5);
    if (this.shield > 0) {
      const pulse = 0.25 + 0.1 * Math.sin(now / 120);
      g.lineStyle(3, 0x66ccff, 0.8).fillStyle(0x66ccff, pulse)
        .fillEllipse(this.x, this.y, UNIT * 1.8, UNIT * 2.6)
        .strokeEllipse(this.x, this.y, UNIT * 1.8, UNIT * 2.6);
    }
  }

  destroy(): void {
    this.view.destroy();
    this.healthBar.destroy();
    this.body.gameObject.destroy();
  }
}
