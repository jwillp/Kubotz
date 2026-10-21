import Phaser from 'phaser';
import type { Fixture } from 'planck';
import { Config, UNIT } from '../config';
import { CpuController } from '../game/Ai';
import type { GameScene } from './GameScene';

/** What the debug mode shows and how it runs the game (see GameScene.update). */
export interface DebugState {
  on: boolean;
  timeScale: number;
  frozen: boolean;
  /** Frames to run while frozen. */
  steps: number;
  nav: boolean;
}

const LINK_COLORS = { jump: 0x4da3ff, drop: 0xffd166, fall: 0xff8a1f } as const;

/**
 * Debug mode (F3 or `), drawn over the arena: Box2D fixtures, hurtboxes and
 * attack circles, the CPUs' plans and the navigation graph, a readout per
 * robot, FPS with a frame time graph, and the time controls.
 */
export class DebugScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private panel!: Phaser.GameObjects.Text;
  private labels: Phaser.GameObjects.Text[] = [];
  private frameMs: number[] = [];
  private nextText = 0;

  constructor() { super('Debug'); }

  create(): void {
    this.g = this.add.graphics();
    this.panel = this.add.text(12, 0, '', {
      fontFamily: 'Consolas, Menlo, monospace', fontSize: '13px', color: '#d7f7ff',
      backgroundColor: '#000000aa', padding: { x: 8, y: 6 }, lineSpacing: 2,
    }).setOrigin(0, 1).setPosition(12, this.scale.height - 12);
  }

  update(time: number, delta: number): void {
    const game = this.scene.get('Game') as GameScene;
    if (!game?.sys.isActive() && !game?.sys.isPaused()) return;
    const state = game.debugState;
    this.frameMs.push(delta);
    if (this.frameMs.length > 120) this.frameMs.shift();

    const cam = game.cameras.main;
    const view = cam.worldView;
    const z = cam.zoom;
    const sx = (x: number) => (x - view.x) * z;
    const sy = (y: number) => (y - view.y) * z;
    const g = this.g.clear();

    // Box2D fixtures.
    for (let b = game.physicsWorld.world.getBodyList(); b; b = b.getNext()) {
      if (!b.isActive()) continue;
      const t = b.getTransform();
      for (let f: Fixture | null = b.getFixtureList(); f; f = f.getNext()) {
        const tag = f.getUserData() as string | { platform?: boolean } | null;
        const color = typeof tag === 'object' && tag?.platform ? 0x40e0ff
          : tag === 'static' ? 0x5cff7a : tag === 'foot' ? 0xffffff : tag === 'item' ? 0xff66ff : tag === 'debris' ? 0xffa040 : 0xffe14d;
        g.lineStyle(f.isSensor() ? 1 : 2, color, f.isSensor() ? 0.6 : 0.85);
        const shape = f.getShape();
        if (shape.getType() === 'circle') {
          const c = shape as unknown as { m_p: { x: number; y: number }; m_radius: number };
          const p = { x: t.p.x + t.q.c * c.m_p.x - t.q.s * c.m_p.y, y: t.p.y + t.q.s * c.m_p.x + t.q.c * c.m_p.y };
          g.strokeCircle(sx(p.x * UNIT), sy(p.y * UNIT), c.m_radius * UNIT * z);
        } else if (shape.getType() === 'polygon') {
          const vs = (shape as unknown as { m_vertices: { x: number; y: number }[] }).m_vertices;
          g.beginPath();
          vs.forEach((v, i) => {
            const x = sx((t.p.x + t.q.c * v.x - t.q.s * v.y) * UNIT);
            const y = sy((t.p.y + t.q.s * v.x + t.q.c * v.y) * UNIT);
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
          });
          g.closePath();
          g.strokePath();
        }
      }
    }

    // Warp zones.
    g.lineStyle(2, 0xb36bff, 0.9);
    for (const w of game.warpZoneRects) g.strokeRect(sx(w.x), sy(w.y), w.width * z, w.height * z);

    // Navigation graph.
    if (state.nav) {
      const nav = game.navGraph;
      for (const s of nav.surfaces) {
        g.lineStyle(4, s.soft ? 0x40e0ff : 0x5cff7a, 0.7).lineBetween(sx(s.x1), sy(s.y), sx(s.x2), sy(s.y));
      }
      for (const l of nav.allLinks()) {
        const a = nav.surfaces[l.from];
        const b = nav.surfaces[l.to];
        g.lineStyle(1, LINK_COLORS[l.kind], 0.45).lineBetween(sx(l.fromX), sy(a.y), sx(l.toX), sy(b.y));
      }
    }

    // Robots: hurtbox, attack circles, CPU plan.
    const alive = game.fighters.filter((k) => k.isAlive());
    for (const k of alive) {
      const h = k.hurtbox();
      g.lineStyle(2, 0xff4d4d, 0.9).strokeRect(sx(h.x), sy(h.y), h.width * z, h.height * z);
      const box = k.currentAttack();
      if (box) for (const c of box.circles) g.fillStyle(0xff2020, 0.45).fillCircle(sx(c.x), sy(c.y), c.radius * z);
      if (k.controller instanceof CpuController) {
        const d = k.controller.debug;
        const nav = game.navGraph;
        g.lineStyle(3, 0xff4dff, 0.9);
        for (const l of d.path) {
          const a = nav.surfaces[l.from];
          const b = nav.surfaces[l.to];
          if (a && b) g.lineBetween(sx(l.fromX), sy(a.y), sx(l.toX), sy(b.y));
        }
        if (d.dest) {
          const x = sx(d.dest.x);
          const y = sy(d.dest.y);
          g.lineStyle(2, 0xff4dff, 0.9).lineBetween(x - 8, y - 8, x + 8, y + 8).lineBetween(x - 8, y + 8, x + 8, y - 8);
        }
      }
    }
    for (const c of game.debrisCircles()) g.lineStyle(1, 0xffa040, 0.8).strokeCircle(sx(c.x), sy(c.y), c.radius * z);

    // Frame time graph (16.7 ms line).
    const gx = 12;
    const gy = this.scale.height - 200;
    g.fillStyle(0x000000, 0.55).fillRect(gx, gy - 50, 240, 54);
    g.lineStyle(1, 0x5cff7a, 0.6).lineBetween(gx, gy - 16.7 * 1.5, gx + 240, gy - 16.7 * 1.5);
    g.lineStyle(1, 0xffd166, 1);
    this.frameMs.forEach((ms, i) => g.lineBetween(gx + i * 2, gy, gx + i * 2, gy - Math.min(48, ms * 1.5)));

    // Text: robot readouts and the panel, ten times a second.
    if (time < this.nextText) {
      game.fighters.forEach((k, i) => this.labels[i]?.setPosition(sx(k.x), sy(k.body.top) - 70 - (i % 2) * 56));
      return;
    }
    this.nextText = time + 100;
    while (this.labels.length < game.fighters.length) {
      this.labels.push(this.add.text(0, 0, '', {
        fontFamily: 'Consolas, Menlo, monospace', fontSize: '12px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 1));
    }
    this.labels.forEach((t, i) => {
      const k = game.fighters[i];
      if (!k || !k.isAlive()) { t.setVisible(false); return; }
      const now = game.clock;
      const ai = k.controller instanceof CpuController ? `\nAI ${k.controller.debug.mode}` : '';
      const stun = Math.max(k.stunnedUntil, k.hitstun) - now;
      t.setVisible(true).setPosition(sx(k.x), sy(k.body.top) - 70 - (i % 2) * 56).setText(
        `${k.name}  hp ${k.health}  ${k.weapon !== 'none' ? k.weapon : ''}\n`
        + `${k.anim.name} ${(k.anim.progress * 100).toFixed(0)}%  combo ${k.comboInfo}\n`
        + `v ${(k.body.vx / UNIT).toFixed(1)}, ${(k.body.vy / UNIT).toFixed(1)}  ${k.grounded ? (k.body.onPlatform ? 'platform' : 'ground') : 'air'}`
        + `${stun > 0 ? `  stun ${stun.toFixed(0)}` : ''}${ai}`,
      );
    });
    const ms = this.frameMs;
    const avg = ms.reduce((a, b) => a + b, 0) / Math.max(1, ms.length);
    this.panel.setText([
      `FPS ${this.game.loop.actualFps.toFixed(0)}   frame ${avg.toFixed(1)} ms (max ${Math.max(...ms).toFixed(1)})`,
      `bodies ${game.physicsWorld.world.getBodyCount()}  robots ${alive.length}  bullets ${game.bulletCount}  power-ups ${game.orbCount}  debris ${game.debrisCircles().length}`,
      `clock ${(game.clock / 1000).toFixed(1)} s   speed ${state.frozen ? 'frozen' : `x${state.timeScale}`}   gravity ${Config.GRAVITY}`,
      'F3 debug off · F4 slow motion · F6 freeze · F7 one frame · F8 navigation graph',
    ].join('\n'));
  }
}
