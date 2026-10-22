import Phaser from 'phaser';
import { arenaMap, eachTile } from './ArenaArt';
import type { TmxMap } from './TmxMap';

/**
 * A picture of an arena, `width` px wide (made once per arena and width): the backdrop, the tile art
 * drawn small, a lit rim along every block like the game's, and the portals.
 */
export function arenaThumbnail(scene: Phaser.Scene, index: number, width: number): string {
  const key = `arena-thumb:${index}:${width}`;
  if (scene.textures.exists(key)) return key;
  const m: TmxMap = arenaMap(index, scene.registry.get('map'));
  const mapW = m.width * m.tileWidth;
  const mapH = m.height * m.tileHeight;
  const s = width / mapW;
  const tex = scene.textures.createCanvas(key, width, Math.round(mapH * s))!;
  const ctx = tex.getContext();
  const bg = scene.textures.get('bg').getSourceImage() as HTMLImageElement;
  ctx.drawImage(bg, 0, 0, tex.width, tex.height);
  ctx.fillStyle = 'rgba(5, 11, 24, 0.35)';
  ctx.fillRect(0, 0, tex.width, tex.height);
  eachTile(scene.textures, m, (source, _key, x, y) => ctx.drawImage(source, x * s, y * s, source.width * s, source.height * s));
  ctx.globalCompositeOperation = 'lighter';
  for (const o of m.objects) {
    if (o.type === 'WALL' || o.type === 'STATIC_PLATFORM') {
      ctx.strokeStyle = 'rgba(41, 171, 226, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(o.x * s, o.y * s + 1); ctx.lineTo((o.x + o.width) * s, o.y * s + 1); ctx.stroke();
      ctx.strokeStyle = 'rgba(159, 230, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (o.type === 'WARP_ZONE') {
      const cx = (o.x + o.width / 2) * s;
      const cy = (o.y + o.height / 2) * s;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.height * s * 0.6);
      g.addColorStop(0, 'rgba(160, 120, 255, 0.9)');
      g.addColorStop(1, 'rgba(60, 40, 160, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, cy, o.width * s * 1.6, o.height * s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  tex.refresh();
  return key;
}
