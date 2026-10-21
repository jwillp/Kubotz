import Phaser from 'phaser';
import { lit } from '../fx/NormalMaps';
import { Config, UNIT } from '../config';
import type { Kubotz } from './Kubotz';
import { ItemBody, PhysicsWorld } from '../physics/Physics';

/** PowerUpEffect.java subclasses. */
export type PowerUpType =
  | 'health' | 'energy' | 'jump' | 'speed'
  | 'laserGunMkI' | 'laserGunMkII' | 'laserSword'
  | 'invincibility' | 'shield';

export interface ActivePowerUp { type: PowerUpType; endsAt: number; }

interface PowerUpDef {
  label: string;
  image: string; // entities/bonus_*.png (PowerUpFactory.withEffect)
  color: number;
  timed: boolean; // instant effects (health, energy, shield) are not tracked
  weapon?: boolean;
  onStart(k: Kubotz): void;
  onFinish(k: Kubotz): void;
}

const noop = () => {};

export const POWER_UPS: Record<PowerUpType, PowerUpDef> = {
  // The Java versions computed max * 1/50 (= 2%) although commented "50%";
  // the port uses the intended 50%.
  health: {
    label: 'Repair', image: 'bonus_health', color: 0x66ff88, timed: false,
    onStart: (k) => { k.health = Math.min(Config.KUBOTZ_HEALTH, k.health + Config.KUBOTZ_HEALTH * 0.5); },
    onFinish: noop,
  },
  energy: {
    label: 'Energy', image: 'bonus_jump', color: 0xffe066, timed: false,
    onStart: (k) => {
      k.energy = Math.min(Config.KUBOTZ_ENERGY, k.energy + Config.KUBOTZ_ENERGY * 0.5);
      k.guard = Config.GUARD_MAX; // energy refills the guard bubble
    },
    onFinish: noop,
  },
  jump: {
    label: 'Extra jump', image: 'bonus_jump', color: 0x9fe3ff, timed: true,
    onStart: (k) => { k.maxJumps++; },
    onFinish: (k) => { k.maxJumps = Math.max(Config.NB_JUMPS, k.maxJumps - 1); },
  },
  speed: {
    label: 'Speed', image: 'bonus_speed', color: 0xffa94d, timed: true,
    onStart: noop, onFinish: noop, // Kubotz.speedFactor() reads it
  },
  laserGunMkI: {
    label: 'Laser gun Mk I', image: 'bonus_gun', color: 0xff5b5b, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserGunMkI'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  laserGunMkII: {
    label: 'Laser gun Mk II', image: 'bonus_gun', color: 0xff2d7a, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserGunMkII'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  laserSword: {
    label: 'Laser sword', image: 'bonus_laserSword', color: 0x7cf7ff, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserSword'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  invincibility: {
    label: 'Invincible', image: 'bonus_shield', color: 0xffffff, timed: true,
    onStart: noop, onFinish: noop, // Kubotz.invincible reads it
  },
  shield: {
    label: 'Shield', image: 'bonus_shield', color: 0x66ccff, timed: true,
    onStart: (k) => { k.shield = 100; },
    onFinish: (k) => { k.shield = 0; },
  },
};

/**
 * PowerUpsSystem.getRandomEffect(): same 1..9 table (Mk I and energy are doubled).
 * Energy, invincibility and shield had no art of their own (they fell back to
 * bonus_jump); shield and invincibility use bonus_shield here.
 */
const RANDOM_TABLE: PowerUpType[] = [
  'laserGunMkI', 'health', 'energy', 'energy', 'jump', 'laserGunMkI', 'laserSword', 'invincibility', 'shield',
];

export function randomPowerUp(): PowerUpType {
  // Mk II existed but was never in the random table; give it a small chance.
  if (Math.random() < 0.08) return 'laserGunMkII';
  return Phaser.Utils.Array.GetRandom(RANDOM_TABLE);
}

/** The bouncing pick-up (PowerUpFactory): a Box2D circle, lifetime 20 s, grabbable. */
/** Shading laid over a ball (dark rim, a light from the upper left), made once. */
function ballTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('ball-shade')) return;
  const n = 128;
  const shade = scene.textures.createCanvas('ball-shade', n, n)!;
  const c = shade.getContext();
  let g = c.createRadialGradient(n * 0.42, n * 0.4, n * 0.1, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.15)');
  g.addColorStop(1, 'rgba(0,0,0,0.7)');
  c.fillStyle = g; c.beginPath(); c.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2); c.fill();
  shade.refresh();
  const shine = scene.textures.createCanvas('ball-shine', n, n)!;
  const s = shine.getContext();
  g = s.createRadialGradient(n * 0.34, n * 0.3, 0, n * 0.34, n * 0.3, n * 0.26);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  s.fillStyle = g; s.fillRect(0, 0, n, n);
  shine.refresh();
}

/**
 * A power-up: a ball that rolls round the arena (a physics circle). Robots
 * running into it kick it along, hits and laser bolts knock it away; grab
 * picks it up.
 */
export class PowerUpOrb {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly shade: Phaser.GameObjects.Image;
  private readonly shine: Phaser.GameObjects.Image;
  readonly body: ItemBody;
  readonly expiresAt: number;
  readonly radius = Config.POWERUP_RADIUS * UNIT;
  /** No kicks again until then (a robot overlapping it pushes it once, not every frame). */
  kickedUntil = 0;

  constructor(scene: Phaser.Scene, physics: PhysicsWorld, x: number, y: number, readonly type: PowerUpType, now: number) {
    const def = POWER_UPS[type];
    ballTextures(scene);
    this.body = new ItemBody(physics, x, y, this.radius);
    this.body.push(Phaser.Math.Between(-3, 3) * UNIT, 0);
    const size = this.radius * 2;
    this.glow = scene.add.image(x, y, 'glow').setDepth(7).setBlendMode(Phaser.BlendModes.ADD).setTint(def.color).setDisplaySize(size * 2.6, size * 2.6);
    this.sprite = lit(scene.add.image(x, y, def.image).setDepth(8));
    const tint = type === 'invincibility' ? 0xffd84d : type === 'energy' ? 0xfff27a : null;
    if (tint !== null) this.sprite.setTint(tint);
    this.sprite.setDisplaySize(size, size);
    this.shade = scene.add.image(x, y, 'ball-shade').setDepth(8.1).setDisplaySize(size, size);
    this.shine = scene.add.image(x, y, 'ball-shine').setDepth(8.2).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(size, size);
    this.expiresAt = now + Config.POWERUP_LIFETIME;
  }

  get color(): number { return POWER_UPS[this.type].color; }
  get x(): number { return this.body.x; }
  get y(): number { return this.body.y; }

  update(now: number): void {
    const left = this.expiresAt - now;
    const blink = left < 3000 && Math.floor(now / 120) % 2 === 0; // blink before vanishing
    const a = blink ? 0.35 : 1;
    // The art rolls with the ball; the shading and the highlight stay lit from above.
    this.sprite.setPosition(this.x, this.y).setRotation(this.body.angle).setAlpha(a);
    this.shade.setPosition(this.x, this.y).setAlpha(a);
    this.shine.setPosition(this.x, this.y).setAlpha(a);
    this.glow.setPosition(this.x, this.y).setAlpha((blink ? 0.2 : 0.45) + 0.12 * Math.sin(now / 180));
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.shade.destroy();
    this.shine.destroy();
    this.body.destroy();
  }
}
