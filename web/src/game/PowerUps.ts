import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import type { Kubotz } from './Kubotz';
import * as THREE from 'three';
import { ItemBody, PhysicsWorld } from '../physics/Physics';
import { getModels } from '../three/Models';
import type { World3D } from '../three/World3D';

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
export class PowerUpOrb {
  readonly sprite: Phaser.GameObjects.Image;
  readonly body: ItemBody;
  readonly expiresAt: number;
  /** The bonus chip made in Blender, spinning; the sprite is then only its pick-up area. */
  private chip: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private lastNow: number;

  constructor(scene: Phaser.Scene, physics: PhysicsWorld, world3d: World3D, x: number, y: number, readonly type: PowerUpType, now: number) {
    const def = POWER_UPS[type];
    this.body = new ItemBody(physics, x, y, Config.POWERUP_RADIUS * UNIT);
    this.sprite = scene.add.image(x, y, def.image).setDepth(8);
    const tint = type === 'invincibility' ? 0xffd84d : type === 'energy' ? 0xfff27a : null;
    if (tint !== null) this.sprite.setTint(tint);
    this.sprite.setDisplaySize(UNIT * 1.1, UNIT * 1.1);
    this.expiresAt = now + Config.POWERUP_LIFETIME;
    this.lastNow = now;

    const gltf = getModels()?.pickups.get(def.image);
    if (gltf) {
      this.chip = gltf.scene.clone();
      this.chip.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const m = (o.material as THREE.MeshStandardMaterial).clone();
        if (tint !== null) { m.color.multiply(new THREE.Color(tint)); m.emissive.multiply(new THREE.Color(tint)); }
        m.transparent = true;
        o.material = m;
        o.castShadow = true;
      });
      this.mixer = new THREE.AnimationMixer(this.chip);
      for (const clip of gltf.animations) this.mixer.clipAction(clip).play();
      world3d.add(this.chip);
      this.sprite.setVisible(false);
    }
  }

  get x(): number { return this.body.x; }
  get y(): number { return this.body.y; }

  update(now: number): void {
    const left = this.expiresAt - now;
    const blink = left < 3000 && Math.floor(now / 120) % 2 === 0; // blink before vanishing
    // The art sits on the 0.3-unit physics circle.
    if (this.chip) {
      this.chip.position.set(this.x / UNIT, -(this.y - UNIT * 0.2) / UNIT, 0);
      this.chip.traverse((o) => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).opacity = blink ? 0.35 : 1; });
      this.mixer!.update(Math.max(0, now - this.lastNow) / 1000);
      this.lastNow = now;
      this.sprite.setPosition(this.x, this.y - UNIT * 0.2);
      return;
    }
    this.sprite.setPosition(this.x, this.y - UNIT * 0.2);
    this.sprite.setAlpha(blink ? 0.35 : 1);
    this.sprite.setAngle(Math.sin(now / 300) * 8);
  }

  destroy(): void {
    if (this.chip) {
      this.chip.removeFromParent();
      this.chip.traverse((o) => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose(); });
    }
    this.sprite.destroy();
    this.body.destroy();
  }
}
