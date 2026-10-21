import Phaser from 'phaser';
import { UNIT } from '../config';

interface Mote { x: number; y: number; a: number; r: number; age: number; life: number; size: number; out: boolean; }
interface Portal { zone: Phaser.Geom.Rectangle; color: number; core: number; motes: Mote[]; light: Phaser.GameObjects.Light; burstAt: number; burstY: number; }

/** The two portals' colours, Portal-style: blue on the left, orange on the right. */
const COLORS: [number, number][] = [[0x3ab8ff, 0x0b2a66], [0xff9a2e, 0x5a2006]];

/**
 * The portals at the arena's sides, drawn as energy rifts: a dark oval
 * with a glowing rim, spiral arms turning into it, motes drawn in towards
 * the middle and sparks thrown off the rim, and a light on the walls round
 * it. A robot or a bolt going through makes the exit portal flare.
 */
export class PortalFx {
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly portals: Portal[];

  constructor(scene: Phaser.Scene, zones: Phaser.Geom.Rectangle[]) {
    // Behind the robots, so they step out of the rift.
    this.back = scene.add.graphics().setDepth(9.3);
    this.glow = scene.add.graphics().setDepth(9.4).setBlendMode(Phaser.BlendModes.ADD);
    const sorted = [...zones].sort((p, q) => p.x - q.x);
    this.portals = sorted.map((zone, i) => {
      const [color, core] = COLORS[i % 2];
      const light = scene.lights.addLight(zone.centerX, zone.centerY, UNIT * 7, color, 2.2);
      return { zone, color, core, motes: [], light, burstAt: -1e9, burstY: zone.centerY };
    });
  }

  /** A body came out of the portal nearest x, at height y: a flare. */
  burst(x: number, y: number, now: number): void {
    const p = this.portals.reduce((best, q) => (Math.abs(q.zone.centerX - x) < Math.abs(best.zone.centerX - x) ? q : best), this.portals[0]);
    if (!p) return;
    p.burstAt = now;
    p.burstY = y;
    for (let i = 0; i < 18; i++) p.motes.push(this.mote(p, true, true));
  }

  update(now: number, dtMs: number): void {
    const g = this.glow.clear();
    const b = this.back.clear();
    const t = now / 1000;
    for (const p of this.portals) {
      const cx = p.zone.centerX;
      const cy = p.zone.centerY;
      const rx = Math.max(0.6 * UNIT, p.zone.width * 0.6);
      const ry = p.zone.height * 0.5;
      const flare = Math.max(0, 1 - (now - p.burstAt) / 400);
      const pulse = 0.85 + 0.15 * Math.sin(t * 3.1) + 0.6 * flare;
      p.light.setIntensity(1.8 * pulse);
      // The dark inside of the rift, and its coloured haze.
      b.fillStyle(p.core, 0.85).fillEllipse(cx, cy, rx * 2, ry * 2);
      b.fillStyle(0x000000, 0.5).fillEllipse(cx, cy, rx * 1.2, ry * 1.5);
      g.fillStyle(p.color, 0.12 * pulse).fillEllipse(cx, cy, rx * 4.2, ry * 2.4);
      g.fillStyle(p.color, 0.08 * pulse).fillEllipse(cx, cy, rx * 7, ry * 2.8);
      // Spiral arms turning into the middle.
      const spin = t * 2.4 * (p === this.portals[0] ? 1 : -1);
      for (let arm = 0; arm < 3; arm++) {
        let prev: { x: number; y: number } | null = null;
        for (let s = 0; s <= 24; s++) {
          const f = s / 24; // 0 at the rim, 1 in the middle
          const a = spin + arm * ((Math.PI * 2) / 3) + f * Math.PI * 2.2;
          const r = 1 - f * 0.92;
          const q = { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r };
          if (prev) g.lineStyle(3 * (1 - f) + 1, p.color, 0.55 * (1 - f) * pulse).lineBetween(prev.x, prev.y, q.x, q.y);
          prev = q;
        }
      }
      // The rim: a wide soft glow, then a bright edge.
      g.lineStyle(10, p.color, 0.22 * pulse).strokeEllipse(cx, cy, rx * 2, ry * 2);
      g.lineStyle(3, p.color, 0.9).strokeEllipse(cx, cy, rx * 2, ry * 2);
      g.lineStyle(1.5, 0xffffff, 0.7 * pulse).strokeEllipse(cx, cy, rx * 1.9, ry * 1.96);
      // A flare where something came through.
      if (flare > 0) {
        g.fillStyle(0xffffff, 0.5 * flare).fillEllipse(cx, p.burstY, rx * 2.4 * (1.4 - flare * 0.4), UNIT * 1.6 * flare);
        g.lineStyle(3, p.color, flare).strokeEllipse(cx, p.burstY, rx * 4 * (1.3 - flare), UNIT * 2.4 * (1.3 - flare));
      }
      // Motes: most are drawn in, spiralling to the middle; a few are thrown off the rim.
      if (Math.random() < dtMs / 45) p.motes.push(this.mote(p, Math.random() < 0.25, false));
      p.motes = p.motes.filter((m) => (m.age += dtMs) < m.life);
      for (const m of p.motes) {
        const k = m.age / m.life;
        let x: number; let y: number;
        if (m.out) {
          x = m.x + Math.cos(m.a) * m.r * k;
          y = m.y + Math.sin(m.a) * m.r * k;
        } else {
          const a = m.a + k * 2.5 * (p === this.portals[0] ? 1 : -1);
          const r = 1.25 * (1 - k);
          x = cx + Math.cos(a) * rx * r;
          y = cy + Math.sin(a) * ry * r * 0.95;
        }
        const alpha = Math.sin(Math.PI * k);
        g.fillStyle(p.color, 0.3 * alpha).fillCircle(x, y, m.size * 2.6);
        g.fillStyle(0xffffff, alpha).fillCircle(x, y, m.size * 0.9);
      }
    }
  }

  private mote(p: Portal, out: boolean, burst: boolean): Mote {
    const a = Math.random() * Math.PI * 2;
    const rx = Math.max(0.6 * UNIT, p.zone.width * 0.6);
    const ry = p.zone.height * 0.5;
    const y = burst ? p.burstY : p.zone.centerY + Math.sin(a) * ry;
    return {
      x: p.zone.centerX + Math.cos(a) * rx, y, a: burst ? a : Math.atan2(Math.sin(a) * ry, Math.cos(a) * rx),
      r: (burst ? 1.6 : 0.9) * UNIT * (0.5 + Math.random()), age: 0,
      life: burst ? 350 + Math.random() * 250 : out ? 500 + Math.random() * 400 : 700 + Math.random() * 600,
      size: 1.2 + Math.random() * 1.6, out,
    };
  }

  destroy(): void {
    this.back.destroy();
    this.glow.destroy();
  }
}
