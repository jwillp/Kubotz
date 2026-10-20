import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import type { Damageable, Kubotz } from './Kubotz';

/** Laser bullet (BulletFactory): 1 x 0.25 units, no gravity, dies on contact. */
export class Bullet {
  readonly sprite: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  readonly expiresAt: number;
  dead = false;

  constructor(
    scene: Phaser.Scene,
    readonly shooter: Kubotz,
    x: number, y: number,
    vx: number, vy: number,
    readonly damage: number,
    now: number,
    small = false,
  ) {
    this.sprite = scene.physics.add.image(x, y, 'laser').setDepth(12).setTint(shooter.look.color);
    const w = (small ? 0.5 : 1) * UNIT;
    const h = (small ? 0.18 : 0.25) * UNIT;
    this.sprite.setDisplaySize(w, h);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setVelocity(vx * UNIT, vy * UNIT);
    this.sprite.setRotation(Math.atan2(vy, vx));
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.expiresAt = now + Config.BULLET_LIFESPAN;
  }

  get pushX(): number { return Math.sign(this.sprite.body.velocity.x) * Config.PUNCH_KNOCKBACK * 0.5; }

  hitbox(): Phaser.Geom.Rectangle {
    const b = this.sprite.body;
    return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  }

  destroy(): void {
    this.dead = true;
    this.sprite.destroy();
  }
}

/**
 * Drone summoned by the Drone Gauntlet (DroneFactory + DroneBehaviourScript).
 * The original drone only followed its master; here it also chases and zaps
 * the nearest enemy in sight, which is what its "threat" blackboard was for.
 */
export class Drone implements Damageable {
  readonly sprite: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  health: number = Config.DRONE_HEALTH;
  readonly expiresAt: number;
  private shootReadyAt: number;
  private readonly offset: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene, readonly owner: Kubotz, now: number) {
    this.sprite = scene.physics.add.image(owner.x - UNIT, owner.y - UNIT, 'drone').setDepth(11);
    this.sprite.setDisplaySize(UNIT * 0.9, UNIT * 0.9).setTint(owner.look.color);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setCircle(this.sprite.width / 2);
    this.offset = new Phaser.Math.Vector2(Phaser.Math.Between(1, 2) * -owner.facing, -Phaser.Math.Between(1, 2));
    this.expiresAt = now + Config.DRONE_LIFESPAN;
    this.shootReadyAt = now + 600;
  }

  isAlive(): boolean { return this.health > 0 && this.sprite.active; }

  hurtbox(): Phaser.Geom.Rectangle {
    const b = this.sprite.body;
    return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    this.sprite.setTintFill(0xffffff);
    this.sprite.scene.time.delayedCall(60, () => this.sprite.active && this.sprite.setTint(this.owner.look.color));
  }

  update(now: number, enemies: Kubotz[], shoot: (d: Drone, target: Kubotz) => void): void {
    const pos = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
    let threat: Kubotz | null = null;
    let best = Config.DRONE_SIGHT * UNIT;
    for (const e of enemies) {
      const d = Phaser.Math.Distance.Between(pos.x, pos.y, e.x, e.y);
      if (d < best) { best = d; threat = e; }
    }
    const anchor = threat ?? this.owner;
    const dest = new Phaser.Math.Vector2(anchor.x + this.offset.x * UNIT, anchor.y + this.offset.y * UNIT);
    // moveToDestination: velocity proportional to the remaining distance
    this.sprite.setVelocity((dest.x - pos.x) * 3, (dest.y - pos.y) * 3);
    this.sprite.setAngle(Math.sin(now / 150) * 10);

    if (threat && now >= this.shootReadyAt) {
      this.shootReadyAt = now + Config.DRONE_SHOT.cooldown;
      shoot(this, threat);
    }
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
