import Phaser from 'phaser';
import { UNIT } from '../config';

type Kind = 'spark' | 'ring' | 'flash' | 'puff' | 'bit' | 'beam' | 'mote';

interface Particle {
  kind: Kind;
  x: number; y: number; vx: number; vy: number;
  age: number; life: number;
  color: number;
  size: number; // width of a spark, radius of the others (px)
  grow: number; // radius gained over the life (px)
  gravity: number; // px/s²
  drag: number; // fraction of speed kept per second
  flat?: boolean; // rings drawn as a flat ellipse (on the ground)
  len?: number; // beams: length behind the point (signed: the bolt's direction)
}

/** A swing's smear: per sample, the striking point (o) and one nearer the body (i). */
interface Trail { points: { ox: number; oy: number; ix: number; iy: number; t: number }[]; color: number; }

interface Flash { x: number; y: number; color: number; intensity: number; at: number; }

const TRAIL_MS = 170;
const FLASH_MS = 160;

const mix = (a: number, b: number, f: number) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    ca.red + (cb.red - ca.red) * f, ca.green + (cb.green - ca.green) * f, ca.blue + (cb.blue - ca.blue) * f);
};
const rand = Phaser.Math.FloatBetween;

/**
 * Impact effects drawn over the 3D world: sparks stretched along their motion,
 * flash rings and a brief light where hits land, swing trails behind the
 * striking fist, foot or blade, rings under double jumps and dust kicked up
 * by running. Glowing parts are drawn additively, dust normally.
 */
export class ImpactFx {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly dust: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private readonly trails = new Map<object, Trail>();
  private flashes: Flash[] = [];
  private now = 0;

  constructor(scene: Phaser.Scene) {
    this.dust = scene.add.graphics().setDepth(14);
    this.glow = scene.add.graphics().setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** A hit: `dir` is the push direction (-1 / 1), `power` about 1 for a punch. */
  hit(x: number, y: number, dir: number, color: number, power: number): void {
    const p = Phaser.Math.Clamp(power, 0.5, 2.2);
    this.add({ kind: 'flash', x, y, color: 0xffffff, size: 0.2 * UNIT * p, grow: -0.15 * UNIT * p, life: 80 });
    this.add({ kind: 'ring', x, y, color: mix(color, 0xffffff, 0.35), size: 0.12 * UNIT, grow: 0.8 * UNIT * p, life: 200 });
    const n = Math.round(7 + 5 * p);
    for (let i = 0; i < n; i++) {
      // Mostly along the push, some splashing back.
      const back = i % 4 === 3;
      const a = (back ? Math.PI : 0) + rand(-1.1, 1.1);
      const speed = rand(7, 20) * p * UNIT;
      this.add({
        kind: 'spark', x, y,
        vx: Math.cos(a) * speed * (dir || 1), vy: Math.sin(a) * speed - rand(2, 6) * UNIT,
        color: i % 3 === 0 ? 0xffffff : mix(color, 0xffffff, rand(0, 0.5)),
        size: rand(2, 3.5), life: rand(180, 380), gravity: 30 * UNIT, drag: 0.08,
      });
    }
    this.flashes.push({ x, y, color, intensity: 5 * p, at: this.now });
  }

  /** Two attacks meeting: white and gold sparks all round. */
  clash(x: number, y: number): void {
    this.add({ kind: 'flash', x, y, color: 0xffffff, size: 0.45 * UNIT, grow: -0.3 * UNIT, life: 110 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rand(-0.2, 0.2);
      const speed = rand(10, 22) * UNIT;
      this.add({
        kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        color: i % 2 ? 0xffe27a : 0xffffff, size: 2.5, life: rand(200, 320), gravity: 20 * UNIT, drag: 0.05,
      });
    }
    this.flashes.push({ x, y, color: 0xffe27a, intensity: 7, at: this.now });
  }

  /** A laser bolt ending on something. */
  pop(x: number, y: number, color: number): void {
    this.add({ kind: 'ring', x, y, color, size: 0.1 * UNIT, grow: 0.6 * UNIT, life: 180 });
    for (let i = 0; i < 7; i++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(5, 13) * UNIT;
      this.add({
        kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        color: mix(color, 0xffffff, 0.4), size: 2, life: rand(150, 260), gravity: 18 * UNIT, drag: 0.05,
      });
    }
  }

  /** A double jump: a flat ring of light under the feet and a few sparks falling. */
  airJump(x: number, y: number, color: number): void {
    this.add({ kind: 'ring', x, y, color, size: 0.25 * UNIT, grow: 0.9 * UNIT, life: 260, flat: true });
    for (let i = 0; i < 6; i++) {
      this.add({
        kind: 'spark', x: x + rand(-0.3, 0.3) * UNIT, y,
        vx: rand(-4, 4) * UNIT, vy: rand(4, 9) * UNIT,
        color: mix(color, 0xffffff, 0.3), size: 2, life: rand(160, 260), gravity: 10 * UNIT, drag: 0.1,
      });
    }
  }

  /** Dust kicked up behind a running robot (`dir`: away from the run). */
  runDust(x: number, y: number, dir: number): void {
    for (let i = 0; i < 2; i++) {
      this.add({
        kind: 'puff', x: x + dir * rand(0, 0.2) * UNIT, y: y - rand(0, 0.1) * UNIT,
        vx: dir * rand(1.5, 3.5) * UNIT, vy: -rand(0.6, 1.8) * UNIT,
        color: 0xb9c4d0, size: rand(0.08, 0.13) * UNIT, grow: rand(0.15, 0.25) * UNIT,
        life: rand(320, 480), gravity: 0, drag: 0.15,
      });
    }
  }

  /** Laser bolt wake: a fading beam line and flickering square data bits, no smoke. */
  laserTrail(x: number, y: number, dir: number, color: number, size: number): void {
    const hot = mix(color, 0xffffff, 0.55);
    this.add({ kind: 'beam', x, y, color: hot, size: 0.05 * UNIT * size, life: 110, len: dir * 0.9 * UNIT });
    if (Math.random() < 0.7) {
      this.add({
        kind: 'bit', x: x - dir * rand(0, 0.5) * UNIT, y: y + rand(-0.12, 0.12) * UNIT * size,
        vx: -dir * rand(0.5, 2) * UNIT, vy: rand(-1.5, 1.5) * UNIT,
        color: Math.random() < 0.4 ? 0xffffff : hot, size: rand(1.5, 3) * Math.min(1.6, size), life: rand(140, 280), drag: 0.2,
      });
    }
  }

  /** A gun charging: sparks drawn in from all round into the barrel, more as it fills. */
  charge(x: number, y: number, color: number, c: number): void {
    const n = 1 + Math.floor(c * 3);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(0.55, 1.2) * UNIT * (1 + c * 0.4);
      const life = rand(140, 220);
      this.add({
        kind: 'spark', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
        vx: (-Math.cos(a) * r) / (life / 1000), vy: (-Math.sin(a) * r) / (life / 1000),
        color: Math.random() < 0.3 ? 0xffffff : mix(color, 0xffffff, rand(0.2, 0.6)), size: rand(1.8, 3), life,
      });
    }
    if (Math.random() < 0.5) this.add({ kind: 'flash', x, y, color: mix(color, 0xffffff, 0.5), size: (0.05 + 0.14 * c) * UNIT, grow: -0.03 * UNIT, life: 60 });
  }

  /** Tiny glowing motes rising off a power-up ball (call every frame). */
  motes(x: number, y: number, color: number, radius: number, dtMs: number): void {
    if (Math.random() > dtMs / 70) return;
    const a = rand(0, Math.PI * 2);
    this.add({
      kind: 'mote', x: x + Math.cos(a) * radius * 1.05, y: y + Math.sin(a) * radius * 1.05,
      vx: Math.cos(a) * rand(0.2, 0.7) * UNIT, vy: Math.sin(a) * rand(0.2, 0.7) * UNIT - rand(0.3, 0.8) * UNIT,
      color: Math.random() < 0.35 ? 0xffffff : mix(color, 0xffffff, 0.3), size: rand(1.2, 2.4), life: rand(600, 1100), drag: 0.6,
    });
  }

  /** Follows a swing: call every frame with its arc (striking point and inner point), or null when not swinging. */
  swing(owner: object, at: { ox: number; oy: number; ix: number; iy: number } | null, color: number): void {
    let trail = this.trails.get(owner);
    if (!trail) this.trails.set(owner, trail = { points: [], color });
    trail.color = color;
    if (at) {
      const last = trail.points[trail.points.length - 1];
      // A new swing starting far from the last one starts a new smear.
      if (last && Math.hypot(at.ox - last.ox, at.oy - last.oy) > UNIT * 2.5) trail.points = [];
      trail.points.push({ ...at, t: this.now });
    }
  }

  /** Brief lights where hits landed, for the 3D world. */
  lights(): { x: number; y: number; color: number; intensity: number }[] {
    return this.flashes.map((f) => ({ x: f.x, y: f.y, color: f.color, intensity: f.intensity * (1 - (this.now - f.at) / FLASH_MS) }));
  }

  update(now: number, dtMs: number): void {
    this.now = now;
    const dt = dtMs / 1000;
    this.flashes = this.flashes.filter((f) => now - f.at < FLASH_MS);
    this.particles = this.particles.filter((p) => (p.age += dtMs) < p.life);
    for (const p of this.particles) {
      const keep = Math.pow(p.drag, dt);
      p.vx *= keep;
      p.vy = p.vy * keep + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.draw();
  }

  private draw(): void {
    const g = this.glow.clear();
    const d = this.dust.clear();
    for (const p of this.particles) {
      const f = p.age / p.life;
      const fade = 1 - f;
      switch (p.kind) {
        case 'spark': {
          // A streak as long as the distance covered in ~30 ms, thinning as it dies.
          const len = Math.max(3, Math.hypot(p.vx, p.vy) * 0.03);
          const s = Math.hypot(p.vx, p.vy) || 1;
          const tx = p.x - (p.vx / s) * len;
          const ty = p.y - (p.vy / s) * len;
          g.lineStyle(p.size * (0.4 + 0.6 * fade) * 2.4, p.color, 0.25 * fade).lineBetween(tx, ty, p.x, p.y);
          g.lineStyle(p.size * (0.4 + 0.6 * fade), p.color, fade).lineBetween(tx, ty, p.x, p.y);
          break;
        }
        case 'ring': {
          const r = p.size + p.grow * Math.sqrt(f);
          g.lineStyle(3 * fade + 1, p.color, 0.8 * fade);
          if (p.flat) g.strokeEllipse(p.x, p.y, r * 2, r * 0.5);
          else g.strokeCircle(p.x, p.y, r);
          break;
        }
        case 'flash':
          g.fillStyle(p.color, fade).fillCircle(p.x, p.y, Math.max(1, p.size + p.grow * f));
          g.fillStyle(p.color, 0.18 * fade).fillCircle(p.x, p.y, Math.max(1, (p.size + p.grow * f) * 1.7));
          break;
        case 'beam': {
          const len = (p.len ?? 0) * (0.4 + 0.6 * fade);
          g.lineStyle(p.size * 3 * fade, p.color, 0.18 * fade).lineBetween(p.x - len, p.y, p.x, p.y);
          g.lineStyle(p.size * fade, p.color, 0.8 * fade).lineBetween(p.x - len, p.y, p.x, p.y);
          break;
        }
        case 'bit': {
          // Square pixels that flicker out.
          if (Math.random() < 0.25 * f) break;
          const sz = p.size * (0.5 + 0.5 * fade);
          g.fillStyle(p.color, fade).fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
          break;
        }
        case 'mote': {
          const tw = 0.6 + 0.4 * Math.sin((p.age / 90) + p.x);
          const a = Math.sin(Math.PI * f) * tw;
          g.fillStyle(p.color, 0.25 * a).fillCircle(p.x, p.y, p.size * 2.6);
          g.fillStyle(p.color, a).fillCircle(p.x, p.y, p.size);
          break;
        }
        case 'puff':
          d.fillStyle(p.color, 0.35 * fade).fillCircle(p.x, p.y, p.size + p.grow * f);
          break;
      }
    }
    for (const [owner, trail] of this.trails) {
      trail.points = trail.points.filter((q) => this.now - q.t < TRAIL_MS);
      if (trail.points.length === 0) { this.trails.delete(owner); continue; }
      // A swoosh: a crescent filled between the inner and outer paths, brightest at
      // its leading edge, with a white-hot rim along the striking point's path.
      const pts = trail.points;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const k = Math.max(0, 1 - (this.now - b.t) / TRAIL_MS); // 1 at the head
        const tail = i / pts.length;
        // The inner edge sits part-way out, so the smear thins towards the body.
        const inA = { x: a.ix + (a.ox - a.ix) * 0.35, y: a.iy + (a.oy - a.iy) * 0.35 };
        const inB = { x: b.ix + (b.ox - b.ix) * 0.35, y: b.iy + (b.oy - b.iy) * 0.35 };
        g.fillStyle(trail.color, 0.32 * k * tail);
        g.fillPoints([{ x: a.ox, y: a.oy }, { x: b.ox, y: b.oy }, inB, inA], true);
        g.fillStyle(0xffffff, 0.12 * k * tail);
        const midA = { x: (a.ox + inA.x) / 2, y: (a.oy + inA.y) / 2 };
        const midB = { x: (b.ox + inB.x) / 2, y: (b.oy + inB.y) / 2 };
        g.fillPoints([{ x: a.ox, y: a.oy }, { x: b.ox, y: b.oy }, midB, midA], true);
        g.lineStyle(0.1 * UNIT * k, 0xffffff, 0.85 * k).lineBetween(a.ox, a.oy, b.ox, b.oy);
      }
    }
  }

  private add(p: Partial<Particle> & Pick<Particle, 'kind' | 'x' | 'y' | 'color' | 'size' | 'life'>): void {
    this.particles.push({ vx: 0, vy: 0, age: 0, grow: 0, gravity: 0, drag: 1, ...p });
  }

  destroy(): void {
    this.glow.destroy();
    this.dust.destroy();
  }
}
