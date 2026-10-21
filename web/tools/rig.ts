// Dev tool: contact sheets of the animation clips (see PLAN.md, phase 6).
// http://localhost:5173/tools/rig.html?clips=jab,cross&frames=8&scale=0.5
import { SpriterData } from '../src/spriter/Spriter';
import { Rig, STANCE, type Pose } from '../src/anim/Rig';
import { CLIPS, sampleClip } from '../src/anim/Clips';

const q = new URLSearchParams(location.search);
const scale = Number(q.get('scale') ?? 0.5);
const frames = Number(q.get('frames') ?? 8);
const maps = (q.get('maps') ?? '').split(',').filter(Boolean);

const spriter = new SpriterData(await (await fetch('../animations/kubotz.scml')).text(), 'Kubotz');
const images = new Map<string, HTMLImageElement>();
await Promise.all(spriter.allFiles().map((f) => new Promise<void>((done) => {
  const img = new Image();
  img.onload = img.onerror = () => done();
  img.src = `../animations/${f}`;
  images.set(f, img);
})));
const rig = new Rig(spriter);

const test: Record<string, Pose[]> = {
  stance: [{}, { ...STANCE }, { ...STANCE, tilt: 15 }, { tilt: 15 }],
  spin: [{ spin: 0 }, { spin: 45 }, { spin: 90 }, { spin: 180 }],
  signs: [{}, { armF: 0 }, { torso: 70 }, { thighF: 0 }, { legF: -150 }, { tilt: 20 }, { x: 40, y: 30 }, { shoulderB: 0, armB: 0 }],
  arms: [{ shoulderF: 60 }, { shoulderF: -60 }, { armF: 60 }, { armF: -60 }, { handF: 60 }, { shoulderB: 60 }, { shoulderB: -60 }, { armB: -60 }],
  legs: [{ thighB: 45 }, { thighB: -45 }, { legB: -45 }, { footF: 30 }, { footB: 30 }, { body: 20 }, { head: 20 }, { torso: -20 }],
};
const names = (q.get('clips') ?? Object.keys(CLIPS).join(',')).split(',');
const rows: { name: string; poses: Pose[] }[] = names.map((n) => {
  if (test[n]) return { name: n, poses: test[n] };
  const clip = CLIPS[n];
  const count = clip.loop ? frames : frames;
  return { name: n, poses: Array.from({ length: count }, (_, i) => {
    const p = sampleClip(clip, clip.loop ? i / count : i / (count - 1));
    return clip.planted ? { ...p, y: (p.y ?? 0) + rig.groundLift(p) } : p;
  }) };
});

const cellW = 420 * scale;
const cellH = 560 * scale;
const cols = Math.max(...rows.map((r) => r.poses.length));
const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = 90 + cols * cellW;
canvas.height = rows.length * cellH;
const ctx = canvas.getContext('2d')!;
rows.forEach((row, r) => {
  ctx.fillStyle = '#cde';
  ctx.fillText(row.name, 6, r * cellH + 16);
  row.poses.forEach((pose, c) => {
    const cx = 90 + c * cellW + cellW * 0.45;
    const gy = r * cellH + cellH * 0.96;
    ctx.strokeStyle = '#3a4a60';
    ctx.strokeRect(90 + c * cellW, r * cellH, cellW, cellH);
    ctx.beginPath(); ctx.moveTo(90 + c * cellW, gy); ctx.lineTo(90 + (c + 1) * cellW, gy); ctx.stroke();
    for (const part of rig.solve(pose, maps)) {
      const img = images.get(part.file.name);
      if (!img || !img.width) continue;
      const { tr, file } = part;
      ctx.save();
      ctx.translate(cx, gy);
      ctx.scale(-scale, -scale); // facing right, y up
      ctx.translate(tr.x, tr.y);
      ctx.rotate((tr.angle * Math.PI) / 180);
      ctx.scale(tr.scaleX, tr.scaleY);
      ctx.scale(1, -1);
      ctx.drawImage(img, -part.pivotX * file.width, -(1 - part.pivotY) * file.height, file.width, file.height);
      ctx.restore();
    }
    if (q.has('bones')) {
      const { world, names } = rig.solveBones(pose);
      world.forEach((b, i) => {
        const a = (b.angle * Math.PI) / 180;
        const x0 = cx - b.x * scale, y0 = gy - b.y * scale;
        const x1 = x0 - Math.cos(a) * 40 * scale, y1 = y0 - Math.sin(a) * 40 * scale;
        ctx.strokeStyle = names[i].endsWith('F') ? '#ff5050' : names[i].endsWith('B') ? '#50a0ff' : '#ffe050';
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = '#fff'; ctx.fillText(names[i], x0 + 3, y0 - 3);
      });
    }
  });
});
document.title = 'ready';
