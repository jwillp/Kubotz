// Dev tool: the body modules' torsos (game/Modules.ts), drawn over the original torso art.
// http://localhost:5173/tools/bodies/bodies.html shows them; window.bodyPngs() returns each as a PNG
// data URL, saved as public/animations/torso/torso-<id>.png (kubotz.scml: files + body_<id> character maps).
import { PAD, TORSO, VARIANTS } from './variants';

const torso = new Image();
torso.src = '../../animations/torso/torso.png';
await torso.decode();

const svgImage = (svg: string): Promise<HTMLImageElement> => new Promise((done) => {
  const img = new Image();
  img.onload = () => done(img);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TORSO.w + 2 * PAD}" height="${TORSO.h + 2 * PAD}" viewBox="${-PAD} ${-PAD} ${TORSO.w + 2 * PAD} ${TORSO.h + 2 * PAD}">${svg}</svg>`);
});

const out: Record<string, string> = {};
for (const [id, v] of Object.entries(VARIANTS)) {
  const c = document.createElement('canvas');
  c.width = TORSO.w + 2 * PAD;
  c.height = TORSO.h + 2 * PAD;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(await svgImage(v.back), 0, 0);
  if (!v.hideTorso) ctx.drawImage(torso, PAD, PAD);
  ctx.drawImage(await svgImage(v.front), 0, 0);
  out[id] = c.toDataURL('image/png');
  const fig = document.createElement('figure');
  fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: id }));
  document.body.append(fig);
}
(window as unknown as { bodyPngs: () => Record<string, string> }).bodyPngs = () => out;
