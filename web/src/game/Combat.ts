import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import type { Kubotz } from './Kubotz';

/**
 * Laser bullet (BulletFactory): no gravity, dies on contact with walls or Kubotz.
 * It moves in a straight line, so it is integrated here rather than by Box2D.
 */
export class Bullet {
  readonly sprite: Phaser.GameObjects.Image;
  readonly expiresAt: number;
  dead = false;
  x: number;
  y: number;
  vx: number; // px/s
  vy: number;
  static readonly W = 0.9 * UNIT;
  static readonly H = 0.22 * UNIT;

  constructor(
    scene: Phaser.Scene,
    readonly shooter: Kubotz,
    x: number, y: number,
    vx: number, vy: number,
    readonly damage: number,
    now: number,
    /** Bolt scale (a charged shot is bigger) and push. */
    readonly size = 1,
    readonly power = 1,
  ) {
    this.x = x; this.y = y;
    this.vx = vx * UNIT; this.vy = vy * UNIT;
    // entities/bullet.png (BulletFactory) points left.
    // Recoloured per player in BootScene: the laser takes the shooter's colour.
    const key = `bullet:${shooter.look.color.toString(16).padStart(6, '0')}`;
    this.sprite = scene.add.image(x, y, scene.textures.exists(key) ? key : 'bullet').setDepth(12);
    this.sprite.setDisplaySize(1.1 * UNIT * (0.6 + 0.4 * size), 0.6 * UNIT * size);
    this.sprite.setFlipX(vx > 0);
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.expiresAt = now + Config.BULLET_LIFESPAN;
  }

  get pushX(): number { return Math.sign(this.vx) * Config.PUNCH_KNOCKBACK * 0.5 * this.power; }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.sprite.setPosition(this.x, this.y);
  }

  hitbox(): Phaser.Geom.Rectangle {
    const w = Bullet.W * (0.6 + 0.4 * this.size);
    const h = Bullet.H * this.size;
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.y - h / 2, w, h);
  }

  /** Carries the bullet to the other side of a warp zone, keeping its speed. */
  teleport(x: number, y: number): void {
    this.x = x; this.y = y;
  }

  destroy(): void {
    this.dead = true;
    this.sprite.destroy();
  }
}
