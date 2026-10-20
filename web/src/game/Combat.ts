import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import type { Kubotz } from './Kubotz';

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
  ) {
    // entities/bullet.png (BulletFactory) points left.
    this.sprite = scene.physics.add.image(x, y, 'bullet').setDepth(12);
    this.sprite.setDisplaySize(1.1 * UNIT, 0.6 * UNIT);
    this.sprite.body.setSize(this.sprite.width * 0.8, this.sprite.height * 0.35);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setVelocity(vx * UNIT, vy * UNIT);
    this.sprite.setFlipX(vx > 0);
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.expiresAt = now + Config.BULLET_LIFESPAN;
  }

  get pushX(): number { return Math.sign(this.sprite.body.velocity.x) * Config.PUNCH_KNOCKBACK * 0.5; }

  hitbox(): Phaser.Geom.Rectangle {
    const b = this.sprite.body;
    return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  }

  /** Carries the bullet to the other side of a warp zone, keeping its speed. */
  teleport(x: number, y: number): void {
    const v = this.sprite.body.velocity.clone();
    this.sprite.body.reset(x, y);
    this.sprite.setVelocity(v.x, v.y);
  }

  destroy(): void {
    this.dead = true;
    this.sprite.destroy();
  }
}
