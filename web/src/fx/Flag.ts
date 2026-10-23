import Phaser from 'phaser';
import { addNormalMap } from './NormalMaps';
import { hex } from '../game/Kubotz';

/**
 * Capture the Flag's flag, drawn in code in the Kubotz' flat style (no
 * outlines; edges from flat fills and soft horizontal gradients): a dark
 * metal pole with a small cube on top and a swallowtail cloth in the team
 * colour, a faint Kube diamond on it. Two textures per colour: the carried
 * one, the size and pose of the plasma blade's image (the carrier swings it
 * with the plasma blade's moves), and a standing one for the stand and a dropped
 * flag.
 */

/** The plasma blade image (arms/plasma-blade.png): its size, and the hilt and the tip in image pixels. */
const BLADE = { w: 329, h: 241, hilt: { x: 96, y: 173 }, tip: { x: 298, y: 25 } };
/** The standing flag texture, and where its pole starts and ends. */
export const STAND = { w: 150, h: 300, foot: { x: 30, y: 296 }, top: { x: 30, y: 8 } };

const css = (c: number) => `#${hex(c)}`;
const shade = (c: number, by: number) => {
  const col = Phaser.Display.Color.IntegerToColor(c);
  return by >= 0 ? col.lighten(by).color : col.darken(-by).color;
};

/** A flag from `foot` up its pole to `top`; the cloth hangs on the side `side` (1 right of the pole, -1 left), over the top 45%. */
function drawFlag(ctx: CanvasRenderingContext2D, foot: { x: number; y: number }, top: { x: number; y: number }, color: number, side: 1 | -1): void {
  const dx = top.x - foot.x; const dy = top.y - foot.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len; const uy = dy / len; // along the pole, upwards
  const nx = -uy * side; const ny = ux * side; // across, to the cloth's side
  // The pole: dark metal, lighter along one edge.
  const thick = Math.max(7, len * 0.035);
  const g = ctx.createLinearGradient(foot.x - nx * thick, foot.y - ny * thick, foot.x + nx * thick, foot.y + ny * thick);
  g.addColorStop(0, '#1d2128'); g.addColorStop(0.55, '#4d5764'); g.addColorStop(1, '#262b33');
  ctx.strokeStyle = g; ctx.lineWidth = thick; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(top.x, top.y); ctx.stroke();
  // A small cube on top, and a grip band low on the pole.
  const cube = thick * 1.6;
  ctx.save(); ctx.translate(top.x, top.y); ctx.rotate(Math.atan2(uy, ux));
  ctx.fillStyle = '#3a414b'; ctx.fillRect(-cube / 2, -cube / 2, cube, cube);
  ctx.fillStyle = '#5d6877'; ctx.fillRect(-cube / 2, -cube / 2, cube, cube * 0.35);
  ctx.restore();
  // The cloth: from 4% below the top down to 47%, out across the pole, swallowtail at the end.
  const at = (f: number, out: number) => ({ x: top.x - ux * len * f + nx * out, y: top.y - uy * len * f + ny * out });
  const w = len * 0.5;
  const pts = [at(0.04, 0), at(0.06, w), at(0.255, w * 0.72), at(0.45, w), at(0.47, 0)];
  const cg = ctx.createLinearGradient(at(0.04, 0).x, at(0.04, 0).y, at(0.04, w).x, at(0.04, w).y);
  cg.addColorStop(0, css(shade(color, -18))); cg.addColorStop(0.4, css(color)); cg.addColorStop(1, css(shade(color, 10)));
  ctx.fillStyle = cg;
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
  // A darker lower band (the cloth folds away from the light).
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); [at(0.36, 0), at(0.4, w * 0.86), at(0.45, w), at(0.47, 0)].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
  // The Kube diamond, faint, so even the black flag reads.
  const c = at(0.24, w * 0.4); const r = len * 0.06;
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath(); ctx.moveTo(c.x + ux * r, c.y + uy * r); ctx.lineTo(c.x + nx * r, c.y + ny * r);
  ctx.lineTo(c.x - ux * r, c.y - uy * r); ctx.lineTo(c.x - nx * r, c.y - ny * r); ctx.closePath(); ctx.fill();
}

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  scene.textures.addCanvas(key, canvas);
  addNormalMap(scene.textures, key);
  return key;
}

/** The carried flag: drawn where the plasma blade's image is, so the plasma blade's poses and moves carry it. */
export function flagTexture(scene: Phaser.Scene, color: number): string {
  return make(scene, `flag:${hex(color)}`, BLADE.w, BLADE.h, (ctx) => drawFlag(ctx, BLADE.hilt, BLADE.tip, color, -1));
}

/** The flag standing upright (origin: the pole's foot, see STAND). */
export function standingFlagTexture(scene: Phaser.Scene, color: number): string {
  return make(scene, `flag-up:${hex(color)}`, STAND.w, STAND.h, (ctx) => drawFlag(ctx, STAND.foot, STAND.top, color, 1));
}
