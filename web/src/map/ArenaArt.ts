import type Phaser from 'phaser';
import type { TmxMap } from './TmxMap';
import { ARENAS, buildArenaMap } from './Arenas';

/** The map of an arena (index into ARENA_INFO): the original TMX one, or one built from its tiles. */
export function arenaMap(index: number, original: TmxMap): TmxMap {
  const def = ARENAS[index] ?? null;
  return def ? buildArenaMap(def, original) : original;
}

/**
 * Every tile image of a map's layers with its top-left corner (map pixels),
 * in drawing order: what GameScene bakes into the arena art, and the arena
 * select draws small.
 */
export function eachTile(textures: Phaser.Textures.TextureManager, m: TmxMap,
  draw: (source: HTMLImageElement, key: string, x: number, y: number) => void): void {
  for (const layer of m.layers) {
    layer.gids.forEach((gid, i) => {
      const img = m.tileImages.get(gid);
      if (!img) return;
      const key = `tile:${img.source}`;
      const source = textures.get(key).getSourceImage() as HTMLImageElement;
      // Tiled anchors image tiles at the cell's bottom-left corner.
      const x = (i % m.width) * m.tileWidth;
      const y = (Math.floor(i / m.width) + 1) * m.tileHeight - source.height;
      draw(source, key, x, y);
    });
  }
}
