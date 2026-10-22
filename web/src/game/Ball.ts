import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { addNormalMap, lit } from '../fx/NormalMaps';
import { ItemBody, PhysicsWorld } from '../physics/Physics';
import type { Kubotz } from './Kubotz';
import type { Prop } from './Match';
import { propOf } from './Replay';

/**
 * The balls of the ball games: Kubeball's ball and Skychase's Core (grabbed,
 * carried, thrown, kicked), its two Hunters (they fly at the Kubotz on their
 * own) and the golden Spark (it flies off, caught by a grab).
 */
export type BallKind = 'kubeball' | 'core' | 'hunter' | 'spark';

const KINDS: Record<BallKind, { radius: number; color: number; grab: boolean; float: boolean }> = {
  kubeball: { radius: Config.POWERUP_RADIUS, color: 0xdff3ff, grab: true, float: false },
  core: { radius: Config.POWERUP_RADIUS * 1.1, color: 0xff7a3a, grab: true, float: false },
  hunter: { radius: Config.POWERUP_RADIUS * 1.15, color: 0x2a2d33, grab: false, float: true },
  spark: { radius: Config.POWERUP_RADIUS * 0.6, color: 0xffd84d, grab: true, float: true },
};

/** After a drop or a throw, how long before anyone (the thrower first) can take it again (ms). */
const NO_PICKUP_MS = 350;

/** A ball's art, drawn once in the Kubotz' flat style: a lit sphere, its marks, a soft highlight. */
function ballTexture(scene: Phaser.Scene, kind: BallKind): string {
  const key = `gameball:${kind}`;
  if (scene.textures.exists(key)) return key;
  const n = 96;
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const ctx = c.getContext('2d')!;
  const r = n / 2 - 2;
  const sphere = (inner: string, outer: string) => {
    const g = ctx.createRadialGradient(n * 0.4, n * 0.36, n * 0.05, n / 2, n / 2, r);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n / 2, n / 2, r, 0, Math.PI * 2); ctx.fill();
  };
  const hex = (x: number, y: number, s: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); }
    ctx.closePath(); ctx.fill();
  };
  if (kind === 'kubeball') {
    sphere('#ffffff', '#7f9bb4');
    hex(n / 2, n / 2, n * 0.13, '#1d2a3a');
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; hex(n / 2 + Math.cos(a) * n * 0.32, n / 2 + Math.sin(a) * n * 0.32, n * 0.09, '#2a3a4e'); }
  } else if (kind === 'core') {
    sphere('#ffc08a', '#b8361a');
    ctx.fillStyle = 'rgba(255,240,200,0.55)'; ctx.fillRect(n * 0.1, n * 0.46, n * 0.8, n * 0.08);
    hex(n / 2, n / 2, n * 0.12, '#ffe6b0');
  } else if (kind === 'hunter') {
    sphere('#5d6877', '#14171c');
    // A red lens, like the black team's helmets.
    const g = ctx.createRadialGradient(n * 0.55, n * 0.45, 1, n * 0.55, n * 0.45, n * 0.16);
    g.addColorStop(0, '#ffb0a0'); g.addColorStop(0.5, '#ff2d2d'); g.addColorStop(1, '#5a0008');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n * 0.55, n * 0.45, n * 0.16, 0, Math.PI * 2); ctx.fill();
  } else {
    // The Spark: a gold ball with two thin wings.
    ctx.fillStyle = 'rgba(255,255,240,0.85)';
    ctx.beginPath(); ctx.moveTo(n * 0.5, n * 0.45); ctx.lineTo(n * 0.02, n * 0.18); ctx.lineTo(n * 0.12, n * 0.55); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(n * 0.5, n * 0.45); ctx.lineTo(n * 0.98, n * 0.18); ctx.lineTo(n * 0.88, n * 0.55); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(n / 2, n / 2); ctx.scale(0.55, 0.55); ctx.translate(-n / 2, -n / 2);
    sphere('#fff6c0', '#c88a10');
    ctx.restore();
  }
  // A soft highlight, low (no outlines, no hard gloss).
  const s = ctx.createRadialGradient(n * 0.36, n * 0.32, 0, n * 0.36, n * 0.32, n * 0.22);
  s.addColorStop(0, 'rgba(255,255,255,0.35)'); s.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = s; ctx.fillRect(0, 0, n, n);
  scene.textures.addCanvas(key, c);
  addNormalMap(scene.textures, key);
  return key;
}

export class GameBall {
  readonly radius: number;
  readonly color: number;
  readonly body: ItemBody;
  carrier: Kubotz | null = null;
  /** For kicks and strikes (as the power-up balls): no new kick before then. */
  kickedUntil = 0;
  private pickupAt = 0;
  private readonly image: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  /** The Spark: where it is flying to, and when it picks a new spot. */
  wander = { x: 0, y: 0, until: 0 };

  constructor(scene: Phaser.Scene, physics: PhysicsWorld, readonly kind: BallKind, readonly spot: { x: number; y: number }) {
    const k = KINDS[kind];
    this.radius = k.radius * UNIT;
    this.color = k.color;
    this.body = new ItemBody(physics, spot.x, spot.y, this.radius);
    if (k.float) this.body.body.setGravityScale(0);
    const size = this.radius * 2 * (kind === 'spark' ? 2.2 : 1);
    this.glow = scene.add.image(spot.x, spot.y, 'glow').setDepth(7).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(kind === 'hunter' ? 0xff3a3a : k.color).setDisplaySize(size * 2.4, size * 2.4).setAlpha(kind === 'hunter' ? 0.25 : 0.5);
    this.image = lit(scene.add.image(spot.x, spot.y, ballTexture(scene, kind))).setDisplaySize(size, size).setDepth(11);
  }

  get grabbable(): boolean { return KINDS[this.kind].grab; }
  get x(): number { return this.carrier ? this.carrier.x + this.carrier.facing * 0.55 * UNIT : this.body.x; }
  get y(): number { return this.carrier ? this.carrier.y - 0.15 * UNIT : this.body.y; }

  /** Can `k` take it now (in reach of a grab, not held, not just dropped)? */
  canTake(k: Kubotz, area: Phaser.Geom.Circle, now: number): boolean {
    return this.grabbable && !this.carrier && now >= this.pickupAt && k.isAlive() && !k.carrying && !k.ball
      && Phaser.Geom.Intersects.CircleToCircle(area, new Phaser.Geom.Circle(this.x, this.y, this.radius + 0.25 * UNIT));
  }

  take(k: Kubotz): void {
    this.carrier = k;
    k.ball = this;
    this.body.enable = false;
  }

  /** Let go: dropped (knocked loose) or thrown, at this velocity (pixels/s). */
  release(now: number, vx: number, vy: number): void {
    const k = this.carrier;
    if (!k) return;
    const { x, y } = this;
    k.ball = null;
    this.carrier = null;
    this.pickupAt = now + NO_PICKUP_MS;
    this.body.enable = true;
    this.body.setPosition(x, y);
    this.body.setVelocity(vx, vy);
  }

  /** Back to its spot, still (after a goal, or out of the arena); no one can take it before `holdUntil`. */
  reset(holdUntil = 0): void {
    this.pickupAt = holdUntil;
    if (this.carrier) { this.carrier.ball = null; this.carrier = null; }
    this.body.enable = true;
    this.body.setPosition(this.spot.x, this.spot.y);
    this.body.setVelocity(0, 0);
  }

  update(now: number): void {
    const { x, y } = this;
    if (this.carrier) this.body.setPosition(x, y);
    const spin = this.carrier ? 0 : this.body.angle;
    this.image.setPosition(x, y).setRotation(this.kind === 'spark' ? Math.sin(now / 40) * 0.25 : spin);
    this.glow.setPosition(x, y).setAlpha((this.kind === 'hunter' ? 0.2 : 0.45) + 0.1 * Math.sin(now / 160));
  }

  props(): Prop[] { return [propOf(this.glow), propOf(this.image)]; }

  destroy(): void {
    this.body.destroy();
    this.image.destroy();
    this.glow.destroy();
  }
}
