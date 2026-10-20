/**
 * Reads the original Tiled .tmx map (XML, base64 + gzip tile layers,
 * image-collection tileset) without any conversion step.
 * Coordinates stay in Tiled's y-down pixel space, which is also Phaser's.
 */

export interface MapObject { id: number; type: string; x: number; y: number; width: number; height: number; }

export interface TileLayer { name: string; visible: boolean; gids: number[]; }

export interface TmxMap {
  width: number; // in tiles
  height: number;
  tileWidth: number;
  tileHeight: number;
  /** gid -> image path relative to the map folder */
  tileImages: Map<number, { source: string; width: number; height: number }>;
  layers: TileLayer[];
  objects: MapObject[];
}

async function gunzipBase64(text: string): Promise<Uint8Array> {
  const bytes = Uint8Array.from(atob(text.trim()), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function parseTmx(xml: string): Promise<TmxMap> {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const mapEl = doc.querySelector('map')!;
  const int = (el: Element, attr: string, def = 0) => {
    const v = el.getAttribute(attr);
    return v === null ? def : parseFloat(v);
  };

  const tileImages = new Map<number, { source: string; width: number; height: number }>();
  for (const ts of Array.from(doc.querySelectorAll('tileset'))) {
    const firstGid = int(ts, 'firstgid', 1);
    for (const tile of Array.from(ts.querySelectorAll('tile'))) {
      const img = tile.querySelector('image');
      if (!img) continue;
      tileImages.set(firstGid + int(tile, 'id'), {
        source: img.getAttribute('source')!,
        width: int(img, 'width'),
        height: int(img, 'height'),
      });
    }
  }

  const layers: TileLayer[] = [];
  for (const layerEl of Array.from(doc.querySelectorAll('layer'))) {
    const data = layerEl.querySelector('data')!;
    let gids: number[];
    if (data.getAttribute('encoding') === 'base64') {
      const raw = data.getAttribute('compression') === 'gzip'
        ? await gunzipBase64(data.textContent ?? '')
        : Uint8Array.from(atob((data.textContent ?? '').trim()), (c) => c.charCodeAt(0));
      const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
      gids = [];
      for (let i = 0; i < raw.byteLength; i += 4) gids.push(view.getUint32(i, true) & 0x1fffffff);
    } else {
      gids = (data.textContent ?? '').split(',').map((s) => parseInt(s, 10) || 0);
    }
    layers.push({ name: layerEl.getAttribute('name') ?? '', visible: layerEl.getAttribute('visible') !== '0', gids });
  }

  const objects: MapObject[] = Array.from(doc.querySelectorAll('objectgroup object')).map((o) => ({
    id: int(o, 'id'),
    type: o.getAttribute('type') ?? '',
    x: int(o, 'x'),
    y: int(o, 'y'),
    width: int(o, 'width'),
    height: int(o, 'height'),
  }));

  return {
    width: int(mapEl, 'width'),
    height: int(mapEl, 'height'),
    tileWidth: int(mapEl, 'tilewidth'),
    tileHeight: int(mapEl, 'tileheight'),
    tileImages,
    layers,
    objects,
  };
}
