import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { addNormalMap, lit } from '../fx/NormalMaps';
import { ItemBody, PhysicsWorld } from '../physics/Physics';
import type { Kubotz } from './Kubotz';
import type { Prop } from './Match';
import { propOf } from './Replay';

/**
 * The balls of the ball games: Kubeball's ball and Skychase's Core (grabbed,
 * carried, thrown, kicked; no attacks while held, any hit knocks it loose), its two Hunters (they fly at the Kubotz on their
 * own) and the golden Spark (it flies off, caught by a grab).
 */
export type BallKind = 'kubeball' | 'core' | 'hunter' | 'spark';

const KINDS: Record<BallKind, { radius: number; color: number; grab: boolean; float: boolean }> = {
  // Kubeball's ball and Skychase's Core: the same glitching crystal, magenta and cyan (no team's colour).
  kubeball: { radius: Config.POWERUP_RADIUS, color: 0xc070ff, grab: true, float: false },
  core: { radius: Config.POWERUP_RADIUS, color: 0xc070ff, grab: true, float: false },
  hunter: { radius: Config.POWERUP_RADIUS * 1.2, color: 0xff3a4a, grab: false, float: true },
  spark: { radius: Config.POWERUP_RADIUS * 0.55, color: 0x3dff8a, grab: true, float: true },
};

/** After a drop or a throw, how long before anyone (the thrower first) can take it again (ms). */
const NO_PICKUP_MS = 350;

/**
 * A ball's art, drawn once in the Kubotz' flat style (no outlines): the
 * ball (Kubeball's, Skychase's Core), a faceted crystal split magenta /
 * cyan with broken ring arcs, a glitchy data shard; the Spark, a dark glass
 * sphere lit from inside along neon green hex seams; a Hunter, a hovering
 * hex drone with a red lens and two thruster pods.
 */
function ballTexture(scene: Phaser.Scene, kind: BallKind): string {
  const look = kind === 'kubeball' || kind === 'core' ? 'crystal' : kind === 'spark' ? 'orb' : kind;
  const key = `gameball:${look}`;
  if (scene.textures.exists(key)) return key;
  const n = 96;
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const ctx = c.getContext('2d')!;
  const m = n / 2;
  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  };
  const hex = (x: number, y: number, r: number, rot = Math.PI / 6): [number, number][] =>
    Array.from({ length: 6 }, (_, i) => [x + Math.cos(rot + (i * Math.PI) / 3) * r, y + Math.sin(rot + (i * Math.PI) / 3) * r]);
  if (look === 'orb') {
    const g = ctx.createRadialGradient(m * 0.8, m * 0.72, n * 0.04, m, m, m - 2);
    g.addColorStop(0, '#2a3d52'); g.addColorStop(1, '#070b12');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m, m, m - 2, 0, Math.PI * 2); ctx.fill();
    // Neon seams: a hex in the middle and spokes to the rim, glowing green.
    ctx.save(); ctx.beginPath(); ctx.arc(m, m, m - 4, 0, Math.PI * 2); ctx.clip();
    ctx.shadowColor = '#3dff8a'; ctx.shadowBlur = 10;
    ctx.strokeStyle = '#b0ffd0'; ctx.lineWidth = 3;
    ctx.beginPath(); hex(m, m, n * 0.17).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
    for (const [x, y] of hex(m, m, n * 0.17)) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(m + (x - m) * 3.2, m + (y - m) * 3.2); ctx.stroke(); }
    ctx.restore();
    const core = ctx.createRadialGradient(m, m, 0, m, m, n * 0.15);
    core.addColorStop(0, '#ffffff'); core.addColorStop(0.5, '#8affb8'); core.addColorStop(1, 'rgba(61,255,138,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(m, m, n * 0.15, 0, Math.PI * 2); ctx.fill();
  } else if (look === 'hunter') {
    // Thruster pods either side, the hex body, a red lens.
    for (const sx of [-1, 1]) {
      poly([[m + sx * n * 0.28, m - n * 0.08], [m + sx * n * 0.47, m - n * 0.04], [m + sx * n * 0.47, m + n * 0.1], [m + sx * n * 0.28, m + n * 0.12]], '#2b3038');
      poly([[m + sx * n * 0.44, m + n * 0.1], [m + sx * n * 0.47, m + n * 0.1], [m + sx * n * 0.47, m + n * 0.16], [m + sx * n * 0.44, m + n * 0.16]], '#ff6a3a');
    }
    const body = ctx.createLinearGradient(0, m - n * 0.3, 0, m + n * 0.3);
    body.addColorStop(0, '#4d5764'); body.addColorStop(1, '#14171c');
    poly(hex(m, m, n * 0.3, 0), body);
    poly(hex(m, m, n * 0.2, 0), '#0c0f14');
    const lens = ctx.createRadialGradient(m + 2, m - 1, 1, m, m, n * 0.13);
    lens.addColorStop(0, '#ffd0c8'); lens.addColorStop(0.45, '#ff2d3a'); lens.addColorStop(1, '#4a0008');
    ctx.fillStyle = lens; ctx.beginPath(); ctx.arc(m, m, n * 0.13, 0, Math.PI * 2); ctx.fill();
  } else {
    // The ball: a faceted crystal, its halves magenta and cyan, broken ring arcs round it.
    ctx.lineWidth = 3; ctx.shadowBlur = 8;
    for (const [from, to, col] of [[0.1, 1.2, '#ff3df0'], [1.9, 2.9, '#3ef0ff'], [3.5, 4.4, '#ff3df0'], [5.0, 5.9, '#3ef0ff']] as const) {
      ctx.shadowColor = col; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(m, m, n * 0.4, from, to); ctx.stroke();
    }
    ctx.shadowBlur = 12; ctx.shadowColor = '#ff3df0';
    poly([[m, m - n * 0.3], [m + n * 0.17, m], [m, m + n * 0.3]], '#3ef0ff');
    poly([[m, m - n * 0.3], [m - n * 0.17, m], [m, m + n * 0.3]], '#ff3df0');
    ctx.shadowBlur = 0;
    poly([[m, m - n * 0.3], [m + n * 0.06, m - n * 0.02], [m, m + n * 0.12], [m - n * 0.06, m - n * 0.02]], 'rgba(255,255,255,0.75)');
  }
  scene.textures.addCanvas(key, c);
  addNormalMap(scene.textures, key);
  return key;
}

export class GameBall {
  readonly radius: number;
  readonly color: number;
  readonly body: ItemBody;
  carrier: Kubotz | null = null;
  /** For the goal highlights: who touched it last (held, threw, struck it), from where, and when it left them. */
  lastTouch: { by: Kubotz; x: number; y: number; at: number } | null = null;
  /** For kicks and strikes (as the power-up balls): no new kick before then. */
  kickedUntil = 0;
  private pickupAt = 0;
  private readonly image: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  /** The Spark: where it is flying to, and when it picks a new spot; its trail (recent positions) and what draws it. */
  wander = { x: 0, y: 0, until: 0 };
  private trail: { x: number; y: number }[] = [];
  private readonly trailG?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, physics: PhysicsWorld, readonly kind: BallKind, readonly spot: { x: number; y: number }) {
    const k = KINDS[kind];
    this.radius = k.radius * UNIT;
    this.color = k.color;
    this.body = new ItemBody(physics, spot.x, spot.y, this.radius);
    if (k.float) this.body.body.setGravityScale(0);
    const size = this.radius * 2 * (kind === 'spark' ? 1.6 : kind === 'hunter' ? 1.5 : 1.5);
    this.glow = scene.add.image(spot.x, spot.y, 'glow').setDepth(7).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(kind === 'hunter' ? 0xff3a3a : k.color).setDisplaySize(size * 2.4, size * 2.4).setAlpha(kind === 'hunter' ? 0.25 : 0.5);
    // The ball and the Spark glow from inside (not lit by the arena); the drone is lit like the Kubotz.
    const image = scene.add.image(spot.x, spot.y, ballTexture(scene, kind)).setDisplaySize(size, size).setDepth(11);
    this.image = kind === 'hunter' ? lit(image) : image;
    if (kind === 'spark') this.trailG = scene.add.graphics().setDepth(10.8).setBlendMode(Phaser.BlendModes.ADD);
  }

  get grabbable(): boolean { return KINDS[this.kind].grab; }
  get x(): number { return this.carrier ? this.carrier.x + this.carrier.facing * 0.55 * UNIT : this.body.x; }
  get y(): number { return this.carrier ? this.carrier.y - 0.15 * UNIT : this.body.y; }

  /**
   * Can `k` take it now (not held, not just dropped)? A generous reach: a
   * small ball at the feet or just overhead, in front or right behind.
   */
  canTake(k: Kubotz, now: number): boolean {
    if (!this.grabbable || this.carrier || now < this.pickupAt || !k.isAlive() || k.carrying || k.ball) return false;
    // The Spark: only a grab right on it.
    if (this.kind === 'spark') return Math.hypot(this.x - k.x, this.y - (k.y - 0.3 * UNIT)) < 1.0 * UNIT;
    const dx = (this.x - k.x) * k.facing;
    const dy = this.y - k.y;
    return dx > -0.8 * UNIT && dx < 1.9 * UNIT && dy > -2.2 * UNIT && dy < 1.6 * UNIT;
  }

  take(k: Kubotz): void {
    this.carrier = k;
    this.lastTouch = { by: k, x: k.x, y: k.y, at: Infinity };
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
    this.lastTouch = { by: k, x, y, at: now };
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
    // A drone stays level, leaning into its flight; the Spark spins; the crystal ball rolls and flickers now and then like a glitch.
    const rot = this.kind === 'hunter' ? Phaser.Math.Clamp(this.body.vx / (40 * UNIT), -0.35, 0.35)
      : this.kind === 'spark' ? now / 160 : spin;
    const glitchy = this.kind === 'kubeball' || this.kind === 'core';
    this.image.setPosition(x, y).setRotation(rot).setAlpha(glitchy && Math.random() < 0.05 ? 0.4 : 1);
    if (this.trailG) this.drawTrail(x, y);
    this.glow.setPosition(x, y).setAlpha((this.kind === 'hunter' ? 0.2 : 0.45) + 0.1 * Math.sin(now / 160));
  }

  /** The Spark's trail: a fading green streak through its last positions. */
  private drawTrail(x: number, y: number): void {
    this.trail.unshift({ x, y });
    if (this.trail.length > 14) this.trail.length = 14;
    const g = this.trailG!.clear();
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1]; const b = this.trail[i];
      const f = 1 - i / this.trail.length;
      g.lineStyle(this.radius * 1.6 * f, 0x3dff8a, 0.35 * f).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(this.radius * 0.5 * f, 0xd0ffe0, 0.8 * f).lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  props(): Prop[] { return [propOf(this.glow), propOf(this.image)]; }

  destroy(): void {
    this.body.destroy();
    this.image.destroy();
    this.glow.destroy();
    this.trailG?.destroy();
  }
}
