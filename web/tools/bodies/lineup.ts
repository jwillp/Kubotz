// Dev tool: every body module's Kubot side by side, idle and mid-run (rig maps body_<id>, see bodies.ts).
// http://localhost:5173/tools/bodies/lineup.html?scale=0.6&helmet=head_terminator
import { SpriterData } from '../../src/spriter/Spriter';
import { Rig } from '../../src/anim/Rig';
import { CLIPS, sampleClip } from '../../src/anim/Clips';
import { BODY_ORDER, BODIES, buildScale } from '../../src/game/Modules';

const q = new URLSearchParams(location.search);
const scale = Number(q.get('scale') ?? 0.6);
const helmet = q.get('helmet');
const spriter = new SpriterData(await (await fetch('../../animations/kubotz.scml')).text(), 'Kubotz');
const images = new Map<string, HTMLImageElement>();
await Promise.all(spriter.allFiles().map((f) => new Promise<void>((done) => {
  const img = new Image();
  img.onload = img.onerror = () => done();
  img.src = `../../animations/${f}`;
  images.set(f, img);
})));
const rig = new Rig(spriter);
const poses = [sampleClip(CLIPS.idle, 0), sampleClip(CLIPS.run, 0.25)];
const cellW = 330 * scale;
const cellH = 520 * scale;
const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = BODY_ORDER.length * cellW;
canvas.height = poses.length * cellH + 24;
const ctx = canvas.getContext('2d')!;
BODY_ORDER.forEach((id, c) => {
  const m = BODIES[id];
  ctx.fillStyle = '#cde';
  ctx.fillText(m.name, c * cellW + 8, 16);
  const maps = [...(helmet ? [helmet] : []), ...(m.look ? [m.look] : [])];
  poses.forEach((pose, r) => {
    const cx = c * cellW + cellW * 0.5;
    const gy = 24 + r * cellH + cellH * 0.95;
    for (const part of rig.solve(pose, maps)) {
      const img = images.get(part.file.name);
      if (!img || !img.width) continue;
      const { tr, file } = part;
      const [along, across] = buildScale(file.name, m.build);
      ctx.save();
      ctx.translate(cx, gy);
      ctx.scale(-scale, -scale);
      ctx.translate(tr.x, tr.y);
      ctx.rotate((tr.angle * Math.PI) / 180);
      ctx.scale(tr.scaleX * along, tr.scaleY * across);
      ctx.scale(1, -1);
      ctx.drawImage(img, -part.pivotX * file.width, -(1 - part.pivotY) * file.height, file.width, file.height);
      ctx.restore();
    }
  });
});
