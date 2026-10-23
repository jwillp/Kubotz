/**
 * Match camera framing (CameraSystem): how wide a view keeps the Kubotz in
 * sight, and where to centre it. Pure, in arena units, so it can be tested.
 *
 * The view zooms out as the Kubotz spread, up to `widest`. Past that not
 * everyone fits; the view then keeps the human players in (a CPU off screen
 * shows as a bubble at the edge, like Super Smash Bros.' magnifiers). The HUD
 * covers the screen's bottom (the cards) and top (the clock), so the Kubotz
 * are framed in the band between them.
 */

export interface FramePoint { x: number; y: number; human?: boolean }

export interface FrameView {
  /** Screen size (px), and how much of its top and bottom the HUD covers (px). */
  screenW: number; screenH: number; hudTop: number; hudBottom: number;
  /** Narrowest and widest view (units across the screen). */
  narrowest: number; widest: number;
}

/** Room kept around the Kubotz' centres (units): beside, over the head and tag, under the feet. */
export const FRAME_PAD = { side: 7, top: 3.5, bottom: 2.5 };

/** Default zoom-out limit (units across), the one the arenas were made for. */
export const BASE_WIDEST = 58;
/** Never wider than this, however big the map: past it the Kubotz get too small to read. */
export const MAX_WIDEST = 84;

/** How far out the camera may go on a map `w` x `h` units: enough for the whole map, within BASE_WIDEST..MAX_WIDEST. */
export function widestFor(w: number, h: number, view: Omit<FrameView, 'narrowest' | 'widest'>): number {
  const aspect = view.screenW / view.screenH;
  const band = (view.screenH - view.hudTop - view.hudBottom) / view.screenH;
  return Math.min(MAX_WIDEST, Math.max(BASE_WIDEST, w + 6, (h + 4) / band * aspect));
}

/** The view for these points: its width (units) and the world point at the screen's centre. */
export function frame(points: FramePoint[], view: FrameView): { width: number; x: number; y: number } {
  const aspect = view.screenW / view.screenH;
  const band = (view.screenH - view.hudTop - view.hudBottom) / view.screenH;
  const box = bounds(points);
  const needX = box.x1 - box.x0 + FRAME_PAD.side * 2;
  const needY = box.y1 - box.y0 + FRAME_PAD.top + FRAME_PAD.bottom;
  const width = clamp(Math.max(needX, needY / band * aspect), view.narrowest, Math.max(view.narrowest, view.widest));
  const height = width / aspect;
  // The band between the HUD's top and bottom, centred on the Kubotz...
  const bandH = height * band;
  const halfW = width / 2 - FRAME_PAD.side;
  let cx = (box.x0 + box.x1) / 2;
  let top = (box.y0 - FRAME_PAD.top + box.y1 + FRAME_PAD.bottom) / 2 - bandH / 2;
  // ...or, when they don't all fit, shifted so the humans stay in it.
  const people = points.filter((p) => p.human);
  if (people.length > 0) {
    const h = bounds(people);
    if (needX > width) cx = keepIn(cx, h.x1 - halfW, h.x0 + halfW);
    if (needY > bandH) top = keepIn(top, h.y1 + FRAME_PAD.bottom - bandH, h.y0 - FRAME_PAD.top);
  }
  const y = top - height * view.hudTop / view.screenH + height / 2;
  return { width, x: cx, y };
}

function bounds(points: FramePoint[]): { x0: number; x1: number; y0: number; y1: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** `v` moved into lo..hi; when the range is empty (the humans alone don't fit), its middle. */
function keepIn(v: number, lo: number, hi: number): number {
  return lo <= hi ? clamp(v, lo, hi) : (lo + hi) / 2;
}
