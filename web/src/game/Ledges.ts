import { UNIT } from '../config';
import type { Ledge } from './Kubotz';
import type { NavBlock } from './Nav';

interface Rect { x: number; y: number; width: number; height: number }

/**
 * Where a falling Kubot catches a ledge: its centre 0.1 to 1 unit out from
 * the corner, the top of its body from 0.85 unit above the ledge to 0.45
 * below (ledgeNear). The box the top of its body must reach (pixels), for
 * the debug view and the editor.
 */
export const LEDGE_REACH = { outMin: 0.1, outMax: 1.0, above: 0.85, below: 0.45 };
export function ledgeZone(l: Ledge): Rect {
  const near = l.x + l.dir * LEDGE_REACH.outMin * UNIT;
  const far = l.x + l.dir * LEDGE_REACH.outMax * UNIT;
  return { x: Math.min(near, far), y: l.y - LEDGE_REACH.above * UNIT, width: Math.abs(far - near), height: (LEDGE_REACH.above + LEDGE_REACH.below) * UNIT };
}

/**
 * Ledges, Melee-style: the top corners of solid blocks with room to stand on
 * just inside the corner and room to hang just outside it. Soft platforms
 * have none. Corners with no ledge go in `blocked` (the debug view's red crosses).
 */
export function findLedges(blocks: NavBlock[], blocked?: Ledge[]): Ledge[] {
  const solid = blocks.filter((b) => !b.soft);
  const free = (x1: number, y1: number, x2: number, y2: number) =>
    !solid.some((o) => o.x < Math.max(x1, x2) - 1 && o.x + o.width > Math.min(x1, x2) + 1 && o.y < Math.max(y1, y2) - 1 && o.y + o.height > Math.min(y1, y2) + 1);
  const out: Ledge[] = [];
  for (const b of solid) {
    for (const dir of [-1, 1] as const) {
      const x = dir < 0 ? b.x : b.x + b.width;
      const y = b.y;
      if (free(x, y - 2 * UNIT, x - dir * UNIT, y) && free(x, y - 0.5 * UNIT, x + dir * 1.2 * UNIT, y + 2.2 * UNIT)) out.push({ x, y, dir });
      else blocked?.push({ x, y, dir });
    }
  }
  return out;
}
