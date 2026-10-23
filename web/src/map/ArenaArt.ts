import type Phaser from 'phaser';
import type { TmxMap } from './TmxMap';
import { ARENAS, buildArenaMap } from './Arenas';

/** The largest arena art baked (pixels): a side, and an area (the Kube's 52 x 38 is 8.1 M). */
export const MAX_BAKE_SIDE = 8192;
export const MAX_BAKE_AREA = 12e6;

/**
 * The scale an arena's art is baked at (map pixels to canvas pixels): `most`
 * (1 in a match), smaller for big maps, whose full size canvases run the page
 * out of memory and past the GPU's largest texture.
 */
export function arenaBakeScale(width: number, height: number, most = 1): number {
  return Math.min(most, MAX_BAKE_SIDE / Math.max(width, height), Math.sqrt(MAX_BAKE_AREA / (width * height)));
}

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
