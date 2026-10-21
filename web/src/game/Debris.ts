import Phaser from 'phaser';
import { lit } from '../fx/NormalMaps';
import { UNIT } from '../config';
import { DebrisBody, PhysicsWorld } from '../physics/Physics';
import type { Kubotz } from './Kubotz';

const LIFETIME = 3200; // ms
const FADE = 900;
const DAMAGE = 2;
const PUSH = 5; // units/s, before the knockback growth
const HARMFUL_SPEED = 5 * UNIT; // pieces lying around do not hurt

interface Piece {
  body: DebrisBody;
  image: Phaser.GameObjects.Image;
  angle0: number; // image angle when the body's angle was 0 (degrees)
  radius: number; // px
  owner: Kubotz;
  hit: Set<Kubotz>;
  born: number;
}

/**
 * K.O.: the robot blows apart. Every body part (helmet, arms, legs, weapon...)
 * flies off as a spinning piece that bounces around the arena, and knocks the
 * robots it hits a little.
 */
export class DebrisField {
  private pieces: Piece[] = [];
  private flashes: { x: number; y: number; color: number; born: number }[] = [];

  constructor(private scene: Phaser.Scene, private physics: PhysicsWorld) {}

  get count(): number { return this.pieces.length; }
  /** The pieces' bodies (for the portals). */
  get bodies(): DebrisBody[] { return this.pieces.map((p) => p.body); }

  explode(k: Kubotz, now: number): void {
    const cx = k.x;
    const cy = k.y;
    this.flashes.push({ x: cx, y: cy, color: k.look.color, born: now });
    for (const part of k.model.pieces()) {
      const radius = Phaser.Math.Clamp(part.size * 0.32, 0.12 * UNIT, 0.45 * UNIT);
      const body = new DebrisBody(this.physics, part.x, part.y, radius);
      // Outwards from the robot's middle, a little upwards, plus its momentum.
      let dx = part.x - cx + Phaser.Math.FloatBetween(-8, 8);
      let dy = part.y - cy - 18 + Phaser.Math.FloatBetween(-8, 8);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const speed = Phaser.Math.FloatBetween(11, 21) * UNIT;
      body.setVelocity(dx * speed + k.body.vx * 0.5, dy * speed - 6 * UNIT + k.body.vy * 0.3);
      body.spin = Phaser.Math.FloatBetween(-14, 14);
      const image = lit(this.scene.add.image(part.x, part.y, part.key))
        .setOrigin(part.originX, part.originY).setScale(part.scaleX, part.scaleY).setAngle(part.angle).setDepth(11);
      this.pieces.push({ body, image, angle0: part.angle - Phaser.Math.RadToDeg(body.angle), radius, owner: k, hit: new Set(), born: now });
    }
  }

  /** Moves the pieces with their bodies (after the physics step), hurts robots, clears old ones. */
  update(now: number, fighters: Kubotz[], onHit: (victim: Kubotz, x: number, y: number) => void): void {
    for (const p of this.pieces) {
      const age = now - p.born;
      const { x, y } = p.body;
      p.image.setPosition(x, y).setAngle(p.angle0 + Phaser.Math.RadToDeg(p.body.angle)).setAlpha(Math.min(1, (LIFETIME - age) / FADE));

      if (Math.hypot(p.body.vx, p.body.vy) < HARMFUL_SPEED) continue;
      for (const f of fighters) {
        if (f === p.owner || !f.isAlive() || f.intangible || p.hit.has(f)) continue;
        const circle = new Phaser.Geom.Circle(x, y, p.radius);
        if (!Phaser.Geom.Intersects.CircleToRectangle(circle, f.hurtbox())) continue;
        p.hit.add(f);
        f.takeDamage(DAMAGE, p.owner, { knockback: PUSH, angle: 45 }, (p.body.vx || f.x - x) < 0 ? -1 : 1);
        // The piece bounces off the robot.
        p.body.setVelocity(-p.body.vx * 0.4, -Math.abs(p.body.vy) * 0.5 - 3 * UNIT);
        onHit(f, x, y);
      }
    }
    for (const p of this.pieces.filter((q) => now - q.born >= LIFETIME)) this.remove(p);
    this.pieces = this.pieces.filter((q) => now - q.born < LIFETIME);
    this.flashes = this.flashes.filter((f) => now - f.born < 600);
  }

  /** Physics circles of the pieces, for the debug view. */
  circles(): Phaser.Geom.Circle[] {
    return this.pieces.map((p) => new Phaser.Geom.Circle(p.body.x, p.body.y, p.radius));
  }

  /** Bright flash where a robot blew up, fading out. */
  lights(now: number): { x: number; y: number; color: number; intensity: number }[] {
    return this.flashes.map((f) => ({ x: f.x, y: f.y, color: f.color, intensity: 40 * (1 - (now - f.born) / 600) }));
  }

  private remove(p: Piece): void {
    p.body.destroy();
    p.image.destroy();
  }

  destroy(): void {
    for (const p of this.pieces) this.remove(p);
    this.pieces = [];
  }
}

/** A short explosion, synthesised (the original had no sound for it). */
export function explosionBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * 1.1);
  const buf = ctx.createBuffer(1, len, rate);
  const d = buf.getChannelData(0);
  let low = 0;
  for (let i = 0; i < len; i++) {
    const t = i / rate;
    const noise = Math.random() * 2 - 1;
    // Low-pass noise whose cutoff falls: a crack, then a rumble.
    const k = 0.04 + 0.5 * Math.exp(-t * 9);
    low += (noise - low) * k;
    const thump = Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-t * 14)) * t) * Math.exp(-t * 7);
    d[i] = (low * 1.6 + thump * 0.8) * Math.exp(-t * 3.2) * Math.min(1, t * 400);
  }
  return buf;
}

