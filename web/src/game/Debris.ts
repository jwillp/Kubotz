import Phaser from 'phaser';
import { DISSOLVE_MS, holoPiece } from '../fx/Hologram';
import { lit } from '../fx/NormalMaps';
import { UNIT } from '../config';
import { DebrisBody, PhysicsWorld } from '../physics/Physics';
import type { Kubotz } from './Kubotz';
import type { Prop } from './Match';
import { propOf } from './Replay';
import { canHurt } from './Match';

const LIFETIME = 3200; // ms, the longest a piece lasts
const SPREAD = 1100; // the pieces scan out one by one over the last this long
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
  /** When it is gone: it scans out (a hologram dissolving from the top) for DISSOLVE_MS before. */
  end: number;
}

/**
 * K.O.: the Kubot blows apart. Every body part (helmet, arms, legs, weapon...)
 * flies off as a spinning piece that bounces around the arena, and knocks the
 * Kubotz it hits a little. Then each piece, one by one, scans out like a
 * hologram switching off (fx/Hologram.ts).
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
      // Outwards from the Kubot's middle, a little upwards, plus its momentum.
      let dx = part.x - cx + Phaser.Math.FloatBetween(-8, 8);
      let dy = part.y - cy - 18 + Phaser.Math.FloatBetween(-8, 8);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const speed = Phaser.Math.FloatBetween(11, 21) * UNIT;
      body.setVelocity(dx * speed + k.body.vx * 0.5, dy * speed - 6 * UNIT + k.body.vy * 0.3);
      body.spin = Phaser.Math.FloatBetween(-14, 14);
      const image = lit(this.scene.add.image(part.x, part.y, part.key))
        .setOrigin(part.originX, part.originY).setScale(part.scaleX, part.scaleY).setAngle(part.angle).setDepth(11);
      this.pieces.push({ body, image, angle0: part.angle - Phaser.Math.RadToDeg(body.angle), radius, owner: k, hit: new Set(), born: now,
        end: now + LIFETIME - Math.random() * SPREAD });
    }
  }

  /** Moves the pieces with their bodies (after the physics step), hurts Kubotz, clears old ones. */
  update(now: number, fighters: Kubotz[], onHit: (victim: Kubotz, x: number, y: number) => void): void {
    for (const p of this.pieces) {
      const { x, y } = p.body;
      p.image.setPosition(x, y).setAngle(p.angle0 + Phaser.Math.RadToDeg(p.body.angle));
      const t = 1 - (p.end - now) / DISSOLVE_MS;
      if (t > 0) holoPiece(p.image, Math.min(1, t));

      if (Math.hypot(p.body.vx, p.body.vy) < HARMFUL_SPEED) continue;
      for (const f of fighters) {
        if (!canHurt(p.owner, f) || !f.isAlive() || f.intangible || p.hit.has(f)) continue;
        const circle = new Phaser.Geom.Circle(x, y, p.radius);
        if (!Phaser.Geom.Intersects.CircleToRectangle(circle, f.hurtbox())) continue;
        p.hit.add(f);
        f.takeDamage(DAMAGE, p.owner, { knockback: PUSH, angle: 45 }, (p.body.vx || f.x - x) < 0 ? -1 : 1);
        // The piece bounces off the Kubot.
        p.body.setVelocity(-p.body.vx * 0.4, -Math.abs(p.body.vy) * 0.5 - 3 * UNIT);
        onHit(f, x, y);
      }
    }
    for (const p of this.pieces.filter((q) => now >= q.end)) this.remove(p);
    this.pieces = this.pieces.filter((q) => now < q.end);
    this.flashes = this.flashes.filter((f) => now - f.born < 600);
  }

  /** The pieces as drawn, with how far each is into its scan-out (for the replays). */
  props(now: number): Prop[] {
    return this.pieces.map((p) => propOf(p.image, { holo: Phaser.Math.Clamp(1 - (p.end - now) / DISSOLVE_MS, 0, 1) }));
  }

  /** Physics circles of the pieces, for the debug view. */
  circles(): Phaser.Geom.Circle[] {
    return this.pieces.map((p) => new Phaser.Geom.Circle(p.body.x, p.body.y, p.radius));
  }

  /** Bright flash where a Kubot blew up, fading out. */
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
