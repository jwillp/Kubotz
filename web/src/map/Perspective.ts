import Phaser from 'phaser';

interface Block { x: number; y: number; width: number; height: number }

/** The 2.5D look is on (V toggles it in a match, for comparing with the flat one). */
export const look25 = { on: true };

/**
 * Scale round the camera centre of the blocks' front faces (the tile art,
 * where the robots stand, so it never moves) and of their back edges: a
 * shallow depth, just enough to read. At the arena's sides it shows about as
 * much of the walls as the portals' ovals (fx/Portals.ts) already imply.
 */
const FRONT = 1;
const BACK = 0.955;
/** Each face's colour at its front edge and at its back edge: lit near the viewer, falling into shadow. */
const TOP: [number, number] = [0x7d8aa2, 0x283041];
const SIDE: [number, number] = [0x46516a, 0x1a1f2a];
const UNDER: [number, number] = [0x1a1f29, 0x0e1118];
/** Bands a face is drawn in, front to back: enough that the shading reads as one smooth gradient. */
const BANDS = 12;

/** The colour `t` of the way from `a` to `b`. */
function mix(a: number, b: number, t: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t) << shift;
  return ch(16) | ch(8) | ch(0);
}

/**
 * 2.5D arena (exploration): every block keeps its original tile art as its
 * front face, on the plane the robots fight on, and gets shallow top,
 * underside and side faces going back towards the camera centre, so the
 * blocks show their depth and shift as the camera moves. Redrawn each frame
 * from the camera midpoint; V (look25) switches back to the flat arena.
 */
export class ArenaPerspective {
  private readonly faces: Phaser.GameObjects.Graphics;
  private readonly front: { obj: Phaser.GameObjects.Image; x: number; y: number; scale: number }[];

  constructor(
    scene: Phaser.Scene,
    private readonly blocks: Block[],
    front: Phaser.GameObjects.Image[],
    /** The lit edge along each block's top, redrawn on the front faces. */
    private readonly rims: Phaser.GameObjects.Graphics,
  ) {
    this.front = front.map((obj) => ({ obj, x: obj.x, y: obj.y, scale: obj.scaleX }));
    this.faces = scene.add.graphics().setDepth(1.95);
  }

  update(mid: { x: number; y: number }): void {
    const on = look25.on;
    const at = (x: number, y: number, k: number) => ({ x: mid.x + (x - mid.x) * k, y: mid.y + (y - mid.y) * k });
    for (const f of this.front) {
      const k = on ? FRONT : 1;
      const p = on ? at(f.x, f.y, k) : f;
      f.obj.setPosition(p.x, p.y).setScale(f.scale * k);
    }
    const g = this.faces.clear().setVisible(on);
    const r = this.rims.clear();
    const kf = on ? FRONT : 1;
    for (const b of this.blocks) {
      const a = at(b.x, b.y + 1, kf);
      const c = at(b.x + b.width, b.y + 1, kf);
      r.lineStyle(7, 0x29abe2, 0.18).lineBetween(a.x, a.y, c.x, c.y);
      r.lineStyle(2, 0x9fe6ff, 0.75).lineBetween(a.x, a.y, c.x, c.y);
    }
    if (!on) return;

    // Farthest from the centre first, so nearer faces cover them.
    const order = [...this.blocks].sort((p, q) =>
      Math.hypot(q.x + q.width / 2 - mid.x, q.y + q.height / 2 - mid.y) - Math.hypot(p.x + p.width / 2 - mid.x, p.y + p.height / 2 - mid.y));
    for (const b of order) {
      const x0 = b.x; const x1 = b.x + b.width;
      const y0 = b.y; const y1 = b.y + b.height;
      // Each face from its front edge (a, b) back to its back edge, in thin
      // bands whose colour runs from the lit front to the shadowed back.
      const face = (ax: number, ay: number, bx: number, by: number, [near, deep]: [number, number], seams: boolean) => {
        for (let i = 0; i < BANDS; i++) {
          const k0 = FRONT + ((BACK - FRONT) * i) / BANDS;
          const k1 = FRONT + ((BACK - FRONT) * (i + 1)) / BANDS;
          g.fillStyle(mix(near, deep, (i + 0.5) / BANDS), 1).fillPoints([at(ax, ay, k0), at(bx, by, k0), at(bx, by, k1), at(ax, ay, k1)], true);
        }
        // Plate seams every tile, front to back, and a lit back edge.
        if (seams) {
          g.lineStyle(1, 0x0b0e14, 0.8);
          const len = Math.hypot(bx - ax, by - ay);
          for (let s = 128; s < len - 8; s += 128) {
            const t = s / len;
            const px = ax + (bx - ax) * t; const py = ay + (by - ay) * t;
            const f = at(px, py, FRONT); const k = at(px, py, BACK);
            g.lineBetween(f.x, f.y, k.x, k.y);
          }
          const p = at(ax, ay, BACK); const q = at(bx, by, BACK);
          g.lineStyle(1.5, 0x29abe2, 0.35).lineBetween(p.x, p.y, q.x, q.y);
        }
      };
      if (y0 > mid.y) face(x0, y0, x1, y0, TOP, true);
      if (y1 < mid.y) face(x0, y1, x1, y1, UNDER, false);
      if (x0 > mid.x) face(x0, y0, x0, y1, SIDE, false);
      if (x1 < mid.x) face(x1, y0, x1, y1, SIDE, false);
    }
  }

  destroy(): void {
    this.faces.destroy();
  }
}
