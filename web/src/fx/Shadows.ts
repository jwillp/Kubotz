/**
 * Light shadows (a map light's Shadows option): the area a light at (x, y)
 * reaches within `r`, cut off by blocks, as a polygon (world pixels) to mask
 * its glow with. Rays go out evenly all around, and on each side of every
 * nearby block corner so the shadow edges are sharp.
 */
export interface Rect { x: number; y: number; width: number; height: number }
export interface Point { x: number; y: number }

export function lightPolygon(x: number, y: number, r: number, blocks: Rect[], steps = 64): Point[] {
  const near = blocks.filter((b) => b.x < x + r && b.x + b.width > x - r && b.y < y + r && b.y + b.height > y - r);
  const segments: [number, number, number, number][] = [];
  for (const b of near) {
    const l = b.x, t = b.y, rr = b.x + b.width, bb = b.y + b.height;
    segments.push([l, t, rr, t], [rr, t, rr, bb], [rr, bb, l, bb], [l, bb, l, t]);
  }
  const angles: number[] = [];
  for (let i = 0; i < steps; i++) angles.push((i / steps) * Math.PI * 2 - Math.PI);
  for (const b of near) {
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]]) {
      const a = Math.atan2(cy - y, cx - x);
      angles.push(a - 1e-4, a, a + 1e-4);
    }
  }
  angles.sort((p, q) => p - q);
  return angles.map((a) => {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = r;
    for (const [x1, y1, x2, y2] of segments) {
      const t = rayHit(x, y, dx, dy, x1, y1, x2, y2);
      if (t !== null && t < best) best = t;
    }
    return { x: x + dx * best, y: y + dy * best };
  });
}

/** How far along the ray (origin, unit direction) it meets the segment, or null. */
export function rayHit(ox: number, oy: number, dx: number, dy: number, x1: number, y1: number, x2: number, y2: number): number | null {
  const sx = x2 - x1, sy = y2 - y1;
  const den = dx * sy - dy * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((x1 - ox) * sy - (y1 - oy) * sx) / den;
  const u = ((x1 - ox) * dy - (y1 - oy) * dx) / den;
  return t >= 0 && u >= 0 && u <= 1 ? t : null;
}
