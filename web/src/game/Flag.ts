import Phaser from 'phaser';
import { UNIT } from '../config';
import { lit } from '../fx/NormalMaps';
import { STAND, standingFlagTexture } from '../fx/Flag';
import { ItemBody, PhysicsWorld } from '../physics/Physics';
import type { Kubotz } from './Kubotz';
import type { Prop } from './Match';
import { propOf } from './Replay';

/** Where a flag is: on its stand, in a Kubot's hands, or lying loose (bouncing like a power-up ball). */
export type FlagState = 'home' | 'carried' | 'dropped';

/** Shown at this height (world pixels), its pole's foot on the ground. */
const HEIGHT = 2.8 * UNIT;
/** A dropped flag's ball (its physics), and how long after a drop no one can take it (the one who lost it is still flying). */
const RADIUS = 0.45 * UNIT;
const NO_PICKUP_MS = 500;

/**
 * Capture the Flag: one team's flag. It stands at home on its stand; a
 * Kubot of the other team takes it by touching it, and a Kubot of its own
 * team picks it up when it lies loose and carries it back. A strong hit or
 * a K.O. makes the carrier drop it: it bounces off the arena like a
 * power-up ball until someone takes it.
 */
export class CtfFlag {
  state: FlagState = 'home';
  carrier: Kubotz | null = null;
  private body: ItemBody | null = null;
  private readonly image: Phaser.GameObjects.Image;
  private readonly stand: Phaser.GameObjects.Graphics;
  private pickupAt = 0;

  constructor(scene: Phaser.Scene, private physics: PhysicsWorld, readonly team: number, readonly color: number,
    /** The stand: the pole's foot when at home (world pixels). */
    readonly home: { x: number; y: number }) {
    const key = standingFlagTexture(scene, color);
    this.image = lit(scene.add.image(home.x, home.y, key)).setOrigin(STAND.foot.x / STAND.w, STAND.foot.y / STAND.h)
      .setScale(HEIGHT / (STAND.foot.y - STAND.top.y)).setDepth(7);
    // The stand: a low metal block lit along its top in the team colour.
    const w = 1.6 * UNIT;
    this.stand = scene.add.graphics().setDepth(7.5);
    this.stand.fillStyle(0x1b2027, 1).fillRect(home.x - w / 2, home.y - 0.22 * UNIT, w, 0.22 * UNIT);
    this.stand.fillStyle(0x3a424d, 1).fillRect(home.x - w / 2, home.y - 0.22 * UNIT, w, 0.06 * UNIT);
    this.stand.fillStyle(color === 0x2a2d33 ? 0x8d96a6 : color, 0.9).fillRect(home.x - w / 2 + 4, home.y - 0.16 * UNIT, w - 8, 3);
  }

  /** Where it is now (world pixels): the stand, the carrier, or the loose ball. */
  get x(): number { return this.carrier ? this.carrier.x : this.body ? this.body.x : this.home.x; }
  get y(): number { return this.carrier ? this.carrier.y : this.body ? this.body.y : this.home.y - HEIGHT / 2; }

  /** Can `k` take it now (touching it, at home or loose, and not just lost)? */
  canTake(k: Kubotz, now: number): boolean {
    if (this.state === 'carried' || now < this.pickupAt || !k.isAlive() || k.carrying) return false;
    if (this.state === 'home' && k.team === this.team) return false;
    const reach = this.state === 'home' ? 1.1 * UNIT : 1.2 * UNIT;
    return Math.abs(k.x - this.x) < reach && Math.abs(k.y - this.y) < 1.6 * UNIT;
  }

  take(k: Kubotz): void {
    this.body?.destroy();
    this.body = null;
    this.state = 'carried';
    this.carrier = k;
    this.image.setVisible(false);
    k.carryFlag(this);
  }

  /** The carrier lets go (hit hard, K.O.'d): it flies off with the carrier's speed. */
  drop(now: number, vx = 0, vy = 0): void {
    const k = this.carrier;
    if (!k) return;
    k.carryFlag(null);
    this.carrier = null;
    this.state = 'dropped';
    this.pickupAt = now + NO_PICKUP_MS;
    this.body = new ItemBody(this.physics, k.x, k.y - 0.4 * UNIT, RADIUS);
    this.body.push(vx * 0.8, vy * 0.8 - 4 * UNIT);
    this.image.setVisible(true);
  }

  /** Back on its stand (carried home by its team, after a capture, or fallen out of the arena). */
  reset(): void {
    if (this.carrier) this.carrier.carryFlag(null);
    this.carrier = null;
    this.body?.destroy();
    this.body = null;
    this.state = 'home';
    this.image.setVisible(true).setPosition(this.home.x, this.home.y).setRotation(0);
  }

  update(mapBottom: number): void {
    if (this.state !== 'dropped' || !this.body) return;
    // Lying loose: the pole's middle on the ball, tumbling with it (a little).
    this.image.setPosition(this.body.x, this.body.y + HEIGHT / 2).setRotation(this.body.angle * 0.25);
    if (this.body.y > mapBottom) this.reset();
  }

  props(): Prop[] { return this.image.visible ? [propOf(this.image)] : []; }

  destroy(): void {
    this.body?.destroy();
    this.image.destroy();
    this.stand.destroy();
  }
}
