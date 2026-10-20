import * as THREE from 'three';

/**
 * Turns a flat sprite (one Spriter body part) into a solid: the outline of its
 * opaque pixels is traced, simplified and extruded with rounded (bevelled)
 * edges, and the original painting is mapped on the front and back faces, so
 * the 3D robot keeps the exact look of the 2D art.
 */

type Pt = [number, number];

/** Alpha mask of an image at a reduced resolution (step px per cell). */
function mask(img: CanvasImageSource & { width: number; height: number }, step: number) {
  const w = Math.ceil(img.width / step);
  const h = Math.ceil(img.height / step);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const m = new Uint8Array((w + 2) * (h + 2)); // 1-cell empty border
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 100) m[(y + 1) * (w + 2) + x + 1] = 1;
  }
  return { m, w: w + 2, h: h + 2 };
}

/**
 * Boundary loops of the mask: every edge between a filled and an empty cell,
 * directed with the filled cell on its left, chained into closed loops.
 * Outlines and holes come out in opposite directions.
 */
function traceLoops(m: Uint8Array, w: number, h: number): Pt[][] {
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  const next = new Map<number, number[]>(); // start vertex -> end vertices
  const key = (x: number, y: number) => y * (w + 1) + x;
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const k = key(x1, y1);
    const list = next.get(k);
    if (list) list.push(key(x2, y2)); else next.set(k, [key(x2, y2)]);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!filled(x, y)) continue;
    if (!filled(x, y - 1)) add(x + 1, y, x, y); // top edge, right to left
    if (!filled(x - 1, y)) add(x, y, x, y + 1); // left edge, downwards
    if (!filled(x, y + 1)) add(x, y + 1, x + 1, y + 1); // bottom edge, left to right
    if (!filled(x + 1, y)) add(x + 1, y + 1, x + 1, y); // right edge, upwards
  }
  const loops: Pt[][] = [];
  for (const [start] of next) {
    while ((next.get(start)?.length ?? 0) > 0) {
      const loop: Pt[] = [];
      let cur = start;
      for (let guard = 0; guard < 100000; guard++) {
        loop.push([cur % (w + 1), Math.floor(cur / (w + 1))]);
        const list = next.get(cur)!;
        const n = list.pop()!;
        if (list.length === 0) next.delete(cur);
        cur = n;
        if (cur === start) break;
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  return loops;
}

/** Ramer-Douglas-Peucker on a closed loop. */
function simplify(loop: Pt[], eps: number): Pt[] {
  const rdp = (pts: Pt[]): Pt[] => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0];
    const [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let best = 0;
    let idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > best) { best = d; idx = i; }
    }
    if (best <= eps) return [pts[0], pts[pts.length - 1]];
    return [...rdp(pts.slice(0, idx + 1)).slice(0, -1), ...rdp(pts.slice(idx))];
  };
  // Split at the point farthest from the first one so both halves are open polylines.
  let far = 0;
  let fd = 0;
  for (let i = 0; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = rdp(loop.slice(0, far + 1));
  const b = rdp([...loop.slice(far), loop[0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const area = (p: Pt[]) => p.reduce((s, [x, y], i) => {
  const [nx, ny] = p[(i + 1) % p.length];
  return s + x * ny - nx * y;
}, 0) / 2;

function inside([px, py]: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export interface PartGeometryOptions {
  depth: number; // thickness, in image pixels
  bevel: number; // rounding of the edges, in image pixels
}

/**
 * Extruded geometry of the opaque area of `img`, in image pixel units with the
 * origin at the image's bottom-left corner and y up, centred on z = 0.
 * UVs map the painting on the front/back faces (sides take the edge colours).
 */
export function partGeometry(img: CanvasImageSource & { width: number; height: number }, opt: PartGeometryOptions): THREE.BufferGeometry {
  const step = Math.max(1, Math.round(Math.max(img.width, img.height) / 90));
  const { m, w, h } = mask(img, step);
  const loops = traceLoops(m, w, h)
    // to image pixels, y up, removing the 1-cell border
    .map((l) => simplify(l, 0.9).map(([x, y]): Pt => [(x - 1) * step, img.height - (y - 1) * step]))
    .filter((l) => l.length >= 3 && Math.abs(area(l)) > step * step * 4);
  // The biggest loop is an outline; holes run the other way round.
  const sign = Math.sign(loops.reduce((best, l) => (Math.abs(area(l)) > Math.abs(best) ? area(l) : best), 0));
  const outers = loops.filter((l) => Math.sign(area(l)) === sign);
  const holes = loops.filter((l) => Math.sign(area(l)) !== sign);
  const shapes = outers.map((o) => {
    const shape = new THREE.Shape(o.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const hole of holes) if (inside(hole[0], o)) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
    return shape;
  });
  if (shapes.length === 0) return new THREE.BufferGeometry();
  const bevel = Math.min(opt.bevel, opt.depth / 2 - 0.5);
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: Math.max(0.5, opt.depth - bevel * 2), curveSegments: 1,
    bevelEnabled: bevel > 0.5, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3,
  });
  geo.translate(0, 0, -opt.depth / 2 + bevel);
  // Planar UVs from the image: front and back show the art, sides stretch the edge colours.
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / img.width, pos.getY(i) / img.height);
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * The image with its colours bled into the transparent pixels around it, fully
 * opaque, so bevelled edges sample the part's own colours instead of black.
 */
export function bledTexture(img: CanvasImageSource & { width: number; height: number }, passes = 6): HTMLCanvasElement {
  const w = img.width;
  const h = img.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  let known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) known[i] = d[i * 4 + 3] > 100 ? 1 : 0;
  for (let pass = 0; pass < passes; pass++) {
    const nk = known.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (known[i]) continue;
      let r = 0; let g = 0; let b = 0; let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx; const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!known[j]) continue;
        r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++;
      }
      if (n) { d[i * 4] = r / n; d[i * 4 + 1] = g / n; d[i * 4 + 2] = b / n; nk[i] = 1; }
    }
    known = nk;
  }
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = 255;
  ctx.putImageData(id, 0, 0);
  return c;
}

/**
 * The glowing parts of an image (bright, saturated pixels: visors, lights,
 * laser blades), for an emissive map.
 */
export function glowTexture(img: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    const sat = max === 0 ? 0 : (max - min) / max;
    const glow = d[i + 3] > 100 && max > 150 && sat > 0.45 ? Math.min(1, (sat - 0.45) * 3) : 0;
    d[i] *= glow; d[i + 1] *= glow; d[i + 2] *= glow; d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}
