import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import type { Kubotz } from './Kubotz';

/** PowerUpEffect.java subclasses. */
export type PowerUpType =
  | 'health' | 'energy' | 'jump' | 'speed'
  | 'laserGunMkI' | 'laserGunMkII' | 'laserSword'
  | 'invincibility' | 'shield';

export interface ActivePowerUp { type: PowerUpType; endsAt: number; }

interface PowerUpDef {
  label: string;
  icon: string; // short glyph drawn on the orb
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
    label: 'Repair', icon: '+', color: 0x66ff88, timed: false,
    onStart: (k) => { k.health = Math.min(Config.KUBOTZ_HEALTH, k.health + Config.KUBOTZ_HEALTH * 0.5); },
    onFinish: noop,
  },
  energy: {
    label: 'Energy', icon: 'E', color: 0xffe066, timed: false,
    onStart: (k) => {
      k.energy = Math.min(Config.KUBOTZ_ENERGY, k.energy + Config.KUBOTZ_ENERGY * 0.5);
      k.droneReadyAt = 0; // energy recharges the active skill
    },
    onFinish: noop,
  },
  jump: {
    label: 'Extra jump', icon: '^', color: 0x9fe3ff, timed: true,
    onStart: (k) => { k.maxJumps++; },
    onFinish: (k) => { k.maxJumps = Math.max(Config.NB_JUMPS, k.maxJumps - 1); },
  },
  speed: {
    label: 'Speed', icon: '>', color: 0xffa94d, timed: true,
    onStart: noop, onFinish: noop, // Kubotz.speedFactor() reads it
  },
  laserGunMkI: {
    label: 'Laser gun Mk I', icon: 'I', color: 0xff5b5b, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserGunMkI'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  laserGunMkII: {
    label: 'Laser gun Mk II', icon: 'II', color: 0xff2d7a, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserGunMkII'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  laserSword: {
    label: 'Laser sword', icon: '/', color: 0x7cf7ff, timed: true, weapon: true,
    onStart: (k) => { k.weapon = 'laserSword'; },
    onFinish: (k) => { k.weapon = 'none'; },
  },
  invincibility: {
    label: 'Invincible', icon: '*', color: 0xffffff, timed: true,
    onStart: noop, onFinish: noop, // Kubotz.invincible reads it
  },
  shield: {
    label: 'Shield', icon: 'O', color: 0x66ccff, timed: true,
    onStart: (k) => { k.shield = 100; },
    onFinish: (k) => { k.shield = 0; },
  },
};

/** PowerUpsSystem.getRandomEffect(): same 1..9 table (Mk I and energy are doubled). */
const RANDOM_TABLE: PowerUpType[] = [
  'laserGunMkI', 'health', 'energy', 'energy', 'jump', 'laserGunMkI', 'laserSword', 'invincibility', 'shield',
];

export function randomPowerUp(): PowerUpType {
  // Mk II existed but was never in the random table; give it a small chance.
  if (Math.random() < 0.08) return 'laserGunMkII';
  return Phaser.Utils.Array.GetRandom(RANDOM_TABLE);
}

/** The bouncing pick-up orb (PowerUpFactory): lifetime 20 s, grabbable. */
export class PowerUpOrb {
  readonly sprite: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private readonly iconText: Phaser.GameObjects.Text;
  readonly expiresAt: number;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly type: PowerUpType, now: number) {
    const def = POWER_UPS[type];
    const r = Config.POWERUP_RADIUS * UNIT;
    this.sprite = scene.physics.add.image(x, y, 'orb').setTint(def.color).setDepth(8);
    this.sprite.setDisplaySize(r * 2.6, r * 2.6);
    this.sprite.body.setCircle(this.sprite.width / 2);
    this.sprite.setBounce(0.5).setDragX(60);
    this.iconText = scene.add.text(x, y, def.icon, {
      fontFamily: 'Orbitron, Arial Black, sans-serif', fontSize: '22px', color: '#0b1d33', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9);
    this.expiresAt = now + Config.POWERUP_LIFETIME;
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  update(now: number): void {
    this.iconText.setPosition(this.sprite.x, this.sprite.y);
    const left = this.expiresAt - now;
    const alpha = left < 3000 && Math.floor(now / 120) % 2 === 0 ? 0.35 : 1; // blink before vanishing
    this.sprite.setAlpha(alpha);
    this.iconText.setAlpha(alpha);
    this.sprite.setAngle(Math.sin(now / 300) * 8);
  }

  destroy(): void {
    this.sprite.destroy();
    this.iconText.destroy();
  }
}
