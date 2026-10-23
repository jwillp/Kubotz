import Phaser from 'phaser';
import { pureAdd } from '../fx/Grade';
import { lit } from '../fx/NormalMaps';
import { GLITCH_MS, hitGlitch } from '../fx/HitGlitch';
import { Config, UNIT } from '../config';
import type { Kubotz } from './Kubotz';
import type { Prop } from './Match';
import { propOf } from './Replay';
import { ItemBody, PhysicsWorld } from '../physics/Physics';

/** PowerUpEffect.java subclasses. */
export type PowerUpType =
  | 'health' | 'energy' | 'jump' | 'speed'
  | 'laserGunMkI' | 'laserGunMkII' | 'laserSword'
  | 'invincibility' | 'shield';

export interface ActivePowerUp { type: PowerUpType; endsAt: number; }

interface PowerUpDef {
  label: string;
  image: string; // entities/bonus-*.png (PowerUpFactory.withEffect)
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
    label: 'Repair', image: 'bonus-health', color: 0x66ff88, timed: false,
    onStart: (k) => { k.health = Math.min(Config.KUBOTZ_HEALTH, k.health + Config.KUBOTZ_HEALTH * 0.5); },
    onFinish: noop,
  },
  energy: {
    label: 'Energy', image: 'bonus-jump', color: 0xffe066, timed: false,
    onStart: (k) => {
      k.energy = Math.min(Config.KUBOTZ_ENERGY, k.energy + Config.KUBOTZ_ENERGY * 0.5);
      k.guard = Config.GUARD_MAX; // energy refills the guard bubble
    },
    onFinish: noop,
  },
  jump: {
    label: 'Extra jump', image: 'bonus-jump', color: 0x9fe3ff, timed: true,
    onStart: (k) => { k.maxJumps++; },
    onFinish: (k) => { k.maxJumps = Math.max(Config.NB_JUMPS, k.maxJumps - 1); },
  },
  speed: {
    label: 'Speed', image: 'bonus-speed', color: 0xffa94d, timed: true,
    onStart: noop, onFinish: noop, // Kubotz.speedFactor() reads it
  },
  laserGunMkI: {
    label: 'Laser gun Mk I', image: 'bonus-gun', color: 0xff5b5b, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserGunMkI'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  laserGunMkII: {
    label: 'Laser gun Mk II', image: 'bonus-gun', color: 0xff2d7a, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserGunMkII'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  laserSword: {
    label: 'Laser sword', image: 'bonus-laser-sword', color: 0x7cf7ff, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserSword'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  invincibility: {
    label: 'Invincible', image: 'bonus-shield', color: 0xffd84d, timed: true,
    onStart: noop, onFinish: noop, // Kubotz.invincible reads it
  },
  shield: {
    label: 'Shield', image: 'bonus-shield', color: 0x66ccff, timed: true,
    onStart: (k) => { k.shield = 100; },
    onFinish: (k) => { k.shield = 0; },
  },
};

/**
 * PowerUpsSystem.getRandomEffect(): same 1..9 table (Mk I and energy are doubled).
 * Energy, invincibility and shield had no art of their own (they fell back to
 * bonus-jump); shield and invincibility use bonus-shield here.
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
 * A power-up: a ball that rolls round the arena (a physics circle). Kubotz
 * running into it kick it along, hits and laser bolts knock it away; grab
 * picks it up.
 */
export class PowerUpOrb {
  readonly sprite: Phaser.GameObjects.Image;
  /** The ball as drawn (art, shading, highlight), glitched as one on a bounce. */
  private readonly view: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly shade: Phaser.GameObjects.Image;
  private readonly shine: Phaser.GameObjects.Image;
  readonly body: ItemBody;
  readonly expiresAt: number;
  readonly radius = Config.POWERUP_RADIUS * UNIT;
  /** No kicks again until then (a Kubot overlapping it pushes it once, not every frame). */
  kickedUntil = 0;
  /** For the bounce sound: last velocity (pixels/s) and last tink. */
  lastVx = 0;
  lastVy = 0;
  lastTinkAt = 0;
  /** The bounce glitch: how hard (0..1) and when it started (match clock). */
  private glitchPower = 0;
  private glitchAt = -Infinity;

  constructor(scene: Phaser.Scene, physics: PhysicsWorld, x: number, y: number, readonly type: PowerUpType, now: number) {
    const def = POWER_UPS[type];
    ballTextures(scene);
    this.body = new ItemBody(physics, x, y, this.radius);
    this.body.push(Phaser.Math.Between(-3, 3) * UNIT, 0);
    const size = this.radius * 2;
    this.glow = scene.add.image(x, y, 'glow').setDepth(7).setBlendMode(pureAdd(scene)).setTint(def.color).setDisplaySize(size * 2.6, size * 2.6);
    this.sprite = lit(scene.add.image(0, 0, def.image));
    const tint = type === 'invincibility' ? 0xffd84d : type === 'energy' ? 0xfff27a : null;
    if (tint !== null) this.sprite.setTint(tint);
    this.sprite.setDisplaySize(size, size);
    this.shade = scene.add.image(0, 0, 'ball-shade').setDisplaySize(size, size);
    this.shine = scene.add.image(0, 0, 'ball-shine').setBlendMode(pureAdd(scene)).setDisplaySize(size, size);
    this.view = scene.add.container(x, y, [this.sprite, this.shade, this.shine]).setDepth(8);
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
    this.view.setPosition(this.x, this.y).setAlpha(a);
    this.sprite.setRotation(this.body.angle);
    // A bounce glitches it like a hit Kubot (fx/HitGlitch.ts), settling over GLITCH_MS.
    const f = (now - this.glitchAt) / GLITCH_MS;
    const k = f >= 0 && f < 1 ? this.glitchPower * (1 - f) * (1 - f) : 0;
    hitGlitch(this.view, k);
    // The glow cuts out now and then while it glitches.
    const cut = k > 0 && Math.random() < 0.4 * k;
    this.glow.setPosition(this.x, this.y).setAlpha(cut ? 0.05 : (blink ? 0.2 : 0.45) + 0.12 * Math.sin(now / 180));
  }

  /** The ball as drawn: glow, art, shading, highlight (for the replays). */
  props(): Prop[] {
    const at = { x: this.x, y: this.y, alpha: this.view.alpha, depth: this.view.depth };
    return [propOf(this.glow), propOf(this.sprite, at), propOf(this.shade, { ...at, rotation: 0 }), propOf(this.shine, { ...at, rotation: 0 })];
  }

  /** A bounce: the ball glitches, harder for a harder bounce (`power` 0..1). */
  glitch(now: number, power: number): void {
    const f = (now - this.glitchAt) / GLITCH_MS;
    const left = f < 1 ? this.glitchPower * (1 - f) * (1 - f) : 0;
    this.glitchPower = Math.max(left, Phaser.Math.Clamp(power, 0.25, 1));
    this.glitchAt = now;
  }

  destroy(): void {
    this.view.destroy();
    this.glow.destroy();
    this.body.destroy();
  }
}
