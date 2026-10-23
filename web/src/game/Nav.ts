import { UNIT } from '../config';

/**
 * Path finding for the CPU players. The original ran A* on a grid over the
 * map; for a platformer it is simpler and more reliable to run A* on the
 * surfaces Kubotz can stand on, linked by the moves between them: jump up to a
 * platform (through it from below when it is soft), drop through a soft
 * platform, run off an edge, or jump across a gap.
 */

export interface NavBlock { x: number; y: number; width: number; height: number; soft: boolean; }

export interface Surface { id: number; x1: number; x2: number; y: number; soft: boolean; }

export type MoveKind = 'jump' | 'drop' | 'fall';

export interface Link {
  from: number;
  to: number;
  kind: MoveKind;
  fromX: number; // where to stand on the start surface (px)
  fromMin: number; // anywhere in [fromMin, fromMax] will do to set off
  fromMax: number;
  toX: number; // where to aim on the arrival surface (px)
  cost: number;
  /**
   * Straight up or down through a soft platform: it can set off anywhere in
   * [fromMin, fromMax] and lands right above or below. fromX / toX are the
   * middle of that stretch until a path picks the spot (Nav.path).
   */
  through?: boolean;
}

const MAX_JUMP_UP = 12 * UNIT; // three jumps of 5 units, with some margin
const MAX_GAP = 8 * UNIT;
const MAX_GAP_UP = 5 * UNIT; // across and up at the same time
const MAX_DROP = 30 * UNIT;

export class Nav {
  readonly surfaces: Surface[] = [];
  /** Every link, for the debug view. */
  allLinks(): Link[] { return [...this.links.values()].flat(); }
  private links = new Map<number, Link[]>();

  constructor(blocks: NavBlock[]) {
    blocks.forEach((b) => {
      // The parts of a top with solid blocks standing on it (or hanging just
      // above it) are not places to stand: keep the free stretches.
      let free: [number, number][] = [[b.x, b.x + b.width]];
      for (const o of blocks) {
        if (o === b || o.soft || o.y + o.height > b.y + 1 || o.y + o.height <= b.y - 2 * UNIT) continue;
        free = free.flatMap(([x1, x2]): [number, number][] => [[x1, Math.min(x2, o.x)], [Math.max(x1, o.x + o.width), x2]])
          .filter(([x1, x2]) => x2 - x1 >= UNIT);
      }
      for (const [x1, x2] of free) this.surfaces.push({ id: this.surfaces.length, x1, x2, y: b.y, soft: b.soft });
    });
    for (const a of this.surfaces) this.links.set(a.id, this.surfaces.flatMap((b) => (a === b ? [] : this.link(a, b, blocks))));
  }

  private link(a: Surface, b: Surface, blocks: NavBlock[]): Link[] {
    const dy = a.y - b.y; // > 0: b is higher
    const ov1 = Math.max(a.x1, b.x1);
    const ov2 = Math.min(a.x2, b.x2);
    const overlap = ov2 - ov1;
    const gap = Math.max(b.x1 - a.x2, a.x1 - b.x2, 0);
    const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
    const make = (kind: MoveKind, fromX: number, toX: number, window = 0.4 * UNIT): Link => ({
      from: a.id, to: b.id, kind, fromX, toX, fromMin: fromX - window, fromMax: fromX + window,
      cost: Math.abs(toX - fromX) / UNIT + Math.abs(dy) / UNIT * (dy > 0 ? 1.6 : 0.8) + 2,
    });
    const out: Link[] = [];
    const push = (l: Link) => { if (!this.blockedAcross(l.fromX, l.toX, b.y, blocks)) out.push(l); };
    const inside = (x: number, s: Surface, margin: number) => x >= s.x1 + margin && x <= s.x2 - margin;

    if (Math.abs(dy) < UNIT / 2) {
      // Same height: jump across a gap.
      if (gap > 0 && gap <= MAX_GAP) {
        const right = b.x1 > a.x2;
        push(make('jump', right ? a.x2 - UNIT / 2 : a.x1 + UNIT / 2, right ? b.x1 + UNIT : b.x2 - UNIT));
      }
    } else if (dy > 0 && dy <= MAX_JUMP_UP) {
      // Up. A soft platform above can be jumped through from below.
      if (b.soft && overlap >= UNIT) {
        const x = clamp((b.x1 + b.x2) / 2, ov1 + UNIT / 2, ov2 - UNIT / 2);
        out.push({ ...make('jump', x, x), fromMin: ov1 + UNIT / 2, fromMax: ov2 - UNIT / 2, through: true });
      } else if (overlap > 0) {
        // A solid block above: take off beside it, then land on its edge.
        for (const side of [-1, 1]) {
          const fromX = side < 0 ? b.x1 - UNIT : b.x2 + UNIT;
          if (inside(fromX, a, UNIT / 4) && !this.blockedAbove(fromX, a.y, b.y, blocks)) {
            push(make('jump', fromX, side < 0 ? b.x1 + UNIT : b.x2 - UNIT));
          }
        }
      } else if (gap <= MAX_GAP_UP) {
        const right = b.x1 >= a.x2;
        const fromX = right ? a.x2 - UNIT / 2 : a.x1 + UNIT / 2;
        if (!this.blockedAbove(fromX, a.y, b.y, blocks)) push(make('jump', fromX, right ? b.x1 + UNIT : b.x2 - UNIT));
      }
    } else if (dy < 0 && -dy <= MAX_DROP) {
      // Down: drop through a soft platform, or run off an edge.
      if (a.soft && overlap >= UNIT) {
        const x = clamp((a.x1 + a.x2) / 2, ov1 + UNIT / 2, ov2 - UNIT / 2);
        out.push({ ...make('drop', x, x), fromMin: ov1 + UNIT / 2, fromMax: ov2 - UNIT / 2, through: true });
      } else {
        for (const side of [-1, 1]) {
          const fromX = side < 0 ? a.x1 - UNIT * 0.7 : a.x2 + UNIT * 0.7;
          // Something solid right beside the edge (a wall) blocks the way off.
          const wall = blocks.some((o) => !o.soft && fromX > o.x && fromX < o.x + o.width && o.y < a.y && o.y + o.height > a.y - 2 * UNIT);
          if (wall) continue;
          if (fromX >= b.x1 - 3 * UNIT && fromX <= b.x2 + 3 * UNIT && !this.landsOnOther(fromX, a.y, b, blocks)) {
            push(make('fall', fromX, clamp(fromX, b.x1 + UNIT, b.x2 - UNIT)));
          }
        }
      }
    }
    return out;
  }

  /** A solid block between two heights at x (would bump the Kubot's head). */
  private blockedAbove(x: number, fromY: number, toY: number, blocks: NavBlock[]): boolean {
    return blocks.some((o) => !o.soft && x > o.x - UNIT / 2 && x < o.x + o.width + UNIT / 2 && o.y + o.height <= fromY && o.y + o.height > toY);
  }

  /** A solid block in the way when moving from x1 to x2 just above height y. */
  private blockedAcross(x1: number, x2: number, y: number, blocks: NavBlock[]): boolean {
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    return blocks.some((o) => !o.soft && o.x < hi && o.x + o.width > lo && o.y < y - 1 && o.y + o.height > y - 1.5 * UNIT);
  }

  /** Falling at x from y, would something else catch the Kubot before surface b? */
  private landsOnOther(x: number, y: number, b: Surface, blocks: NavBlock[]): boolean {
    return blocks.some((o) => !o.soft && x >= o.x && x <= o.x + o.width && o.y > y && o.y < b.y);
  }

  /** The surface under a point (the Kubot's feet), within `reach` px below it. */
  surfaceAt(x: number, y: number, reach = 40 * UNIT): Surface | null {
    let best: Surface | null = null;
    for (const s of this.surfaces) {
      if (x < s.x1 - UNIT / 2 || x > s.x2 + UNIT / 2) continue;
      if (s.y < y - UNIT / 2 || s.y - y > reach) continue;
      if (!best || s.y < best.y) best = s;
    }
    return best;
  }

  /**
   * The move as made from x: a link through a soft platform sets off where the
   * Kubot already is (or the nearest spot of its stretch) and goes straight up
   * or down; the others set off from their one take-off point.
   */
  from(l: Link, x: number): Link {
    if (!l.through) return l;
    const fromX = Math.min(l.fromMax, Math.max(l.fromMin, x));
    return { ...l, fromX, toX: fromX };
  }

  /** A* from one surface to another; returns the moves to make, in order (set off from where they start). */
  path(from: Surface, to: Surface, startX: number): Link[] | null {
    if (from.id === to.id) return [];
    const centre = (s: Surface) => ({ x: (s.x1 + s.x2) / 2, y: s.y });
    const h = (s: Surface) => Math.hypot(centre(s).x - centre(to).x, centre(s).y - centre(to).y) / UNIT;
    const g = new Map<number, number>([[from.id, 0]]);
    const xAt = new Map<number, number>([[from.id, startX]]);
    const came = new Map<number, Link>();
    const open = new Set<number>([from.id]);
    while (open.size) {
      let cur = -1;
      let best = Infinity;
      for (const id of open) {
        const f = g.get(id)! + h(this.surfaces[id]);
        if (f < best) { best = f; cur = id; }
      }
      if (cur === to.id) break;
      open.delete(cur);
      for (const link of this.links.get(cur) ?? []) {
        const l = this.from(link, xAt.get(cur)!);
        // Walking to the take-off point counts too.
        const cost = g.get(cur)! + Math.abs(l.fromX - xAt.get(cur)!) / UNIT + l.cost;
        if (cost < (g.get(l.to) ?? Infinity)) {
          g.set(l.to, cost);
          xAt.set(l.to, l.toX);
          came.set(l.to, l);
          open.add(l.to);
        }
      }
    }
    if (!came.has(to.id)) return null;
    const moves: Link[] = [];
    for (let id = to.id; id !== from.id; id = came.get(id)!.from) moves.unshift(came.get(id)!);
    return moves;
  }
}
