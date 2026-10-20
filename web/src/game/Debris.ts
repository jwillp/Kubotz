import * as THREE from 'three';
import Phaser from 'phaser';
import { UNIT } from '../config';
import { DebrisBody, PhysicsWorld } from '../physics/Physics';
import type { World3D } from '../three/World3D';
import type { Kubotz } from './Kubotz';

const LIFETIME = 3200; // ms
const FADE = 900;
const DAMAGE = 2;
const PUSH = 5; // units/s, before the knockback growth
const HARMFUL_SPEED = 5 * UNIT; // pieces lying around do not hurt

interface Piece {
  body: DebrisBody;
  holder: THREE.Group;
  q0: THREE.Quaternion;
  a0: number;
  axis: THREE.Vector3;
  tumble: number;
  radius: number; // px
  owner: Kubotz;
  hit: Set<Kubotz>;
  materials: THREE.MeshStandardMaterial[];
  born: number;
}

/**
 * K.O.: the robot blows apart. Every body part (helmet, arms, legs, weapon...)
 * flies off as a tumbling solid that bounces around the arena, and knocks the
 * robots it hits a little.
 */
export class DebrisField {
  private pieces: Piece[] = [];
  private flashes: { x: number; y: number; color: number; born: number }[] = [];

  constructor(private physics: PhysicsWorld, private world3d: World3D) {}

  explode(k: Kubotz, now: number): void {
    const cx = k.x;
    const cy = k.y;
    this.flashes.push({ x: cx, y: cy, color: k.look.color, born: now });
    for (const { holder, radius } of k.model.pieces()) {
      const x = holder.position.x * UNIT;
      const y = -holder.position.y * UNIT;
      const body = new DebrisBody(this.physics, x, y, radius * UNIT);
      // Outwards from the robot's middle, a little upwards, plus its momentum.
      let dx = x - cx + Phaser.Math.FloatBetween(-8, 8);
      let dy = y - cy - 18 + Phaser.Math.FloatBetween(-8, 8);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const speed = Phaser.Math.FloatBetween(11, 21) * UNIT;
      body.setVelocity(dx * speed + k.body.vx * 0.5, dy * speed - 6 * UNIT + k.body.vy * 0.3);
      body.spin = Phaser.Math.FloatBetween(-14, 14);
      this.world3d.add(holder);
      const materials: THREE.MeshStandardMaterial[] = [];
      holder.traverse((o) => { if (o instanceof THREE.Mesh) materials.push(o.material as THREE.MeshStandardMaterial); });
      this.pieces.push({
        body, holder, q0: holder.quaternion.clone(), a0: body.angle,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0).normalize(),
        tumble: Phaser.Math.FloatBetween(-9, 9),
        radius: radius * UNIT, owner: k, hit: new Set(), materials, born: now,
      });
    }
  }

  /** Moves the pieces with their bodies (after the physics step), hurts robots, clears old ones. */
  update(now: number, fighters: Kubotz[], onHit: (victim: Kubotz, x: number, y: number) => void): void {
    const zAxis = new THREE.Vector3(0, 0, 1);
    for (const p of this.pieces) {
      const age = now - p.born;
      const { x, y } = p.body;
      p.holder.position.set(x / UNIT, -y / UNIT, p.holder.position.z);
      p.holder.quaternion.copy(p.q0);
      p.holder.rotateOnWorldAxis(zAxis, -(p.body.angle - p.a0));
      p.holder.rotateOnWorldAxis(p.axis, (p.tumble * Math.min(age, 1200)) / 1000);
      const alpha = Math.min(1, (LIFETIME - age) / FADE);
      for (const m of p.materials) { m.opacity = alpha; m.depthWrite = alpha > 0.99; }

      if (Math.hypot(p.body.vx, p.body.vy) < HARMFUL_SPEED) continue;
      for (const f of fighters) {
        if (f === p.owner || !f.isAlive() || f.intangible || p.hit.has(f)) continue;
        const circle = new Phaser.Geom.Circle(x, y, p.radius);
        if (!Phaser.Geom.Intersects.CircleToRectangle(circle, f.hurtbox())) continue;
        p.hit.add(f);
        f.takeDamage(DAMAGE, p.owner, Math.sign(p.body.vx || f.x - x) * PUSH);
        // The piece bounces off the robot.
        p.body.setVelocity(-p.body.vx * 0.4, -Math.abs(p.body.vy) * 0.5 - 3 * UNIT);
        onHit(f, x, y);
      }
    }
    for (const p of this.pieces.filter((q) => now - q.born >= LIFETIME)) this.remove(p);
    this.pieces = this.pieces.filter((q) => now - q.born < LIFETIME);
    this.flashes = this.flashes.filter((f) => now - f.born < 600);
  }

  /** Bright flash where a robot blew up, fading out. */
  lights(now: number): { x: number; y: number; color: number; intensity: number }[] {
    return this.flashes.map((f) => ({ x: f.x, y: f.y, color: f.color, intensity: 40 * (1 - (now - f.born) / 600) }));
  }

  private remove(p: Piece): void {
    p.body.destroy();
    p.holder.removeFromParent();
    for (const m of p.materials) m.dispose();
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

