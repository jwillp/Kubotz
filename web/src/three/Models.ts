import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * The 3D models made in Blender from the original art (robot, bonus chips,
 * arena tiles), loaded once at boot. See core/assets/models.
 */
export interface Models {
  robot: GLTF;
  tiles: Map<string, THREE.Mesh>;
  pickups: Map<string, GLTF>;
}

export const PICKUP_IMAGES = ['bonus_gun', 'bonus_health', 'bonus_jump', 'bonus_laserSword', 'bonus_shield', 'bonus_speed'];

let models: Models | null = null;

export async function loadModels(base = 'models/'): Promise<Models> {
  const loader = new GLTFLoader();
  // Embedded images load through <img> rather than fetch(): hosts with a
  // strict content policy (the published artifact) refuse fetches of blob: URLs.
  loader.register((parser) => {
    parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
    return { name: 'kubotz_img_textures' };
  });
  const load = async (file: string) => loader.parseAsync(await fetchGlb(`${base}${file}`), base);
  const [robot, tiles, ...pickups] = await Promise.all([
    load('robot.glb'),
    load('tiles.glb'),
    ...PICKUP_IMAGES.map((n) => load(`pickups/${n}.glb`)),
  ]);
  const tileMeshes = new Map<string, THREE.Mesh>();
  tiles.scene.updateMatrixWorld(true);
  tiles.scene.traverse((o) => { if (o instanceof THREE.Mesh) tileMeshes.set(o.name, o); });
  models = { robot, tiles: tileMeshes, pickups: new Map(PICKUP_IMAGES.map((n, i) => [n, pickups[i]])) };
  return models;
}

/**
 * A .glb file's bytes. Hosts that do not serve .glb files get the same model
 * as glTF JSON named <file>.glb.json, its buffer as base64; it is put back
 * together here instead of letting the loader fetch a data: URI, which a
 * strict content policy refuses.
 */
async function fetchGlb(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url).catch(() => null);
  if (res?.ok) {
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > 12 && new DataView(bytes).getUint32(0, true) === 0x46546c67) return bytes; // 'glTF'
  }
  const jsonRes = await fetch(`${url}.json`);
  if (!jsonRes.ok) throw new Error(`${url}: ${jsonRes.status}`);
  const json = await jsonRes.json();
  const uri: string = json.buffers[0].uri;
  delete json.buffers[0].uri;
  const text = atob(uri.slice(uri.indexOf(',') + 1));
  const bin = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bin[i] = text.charCodeAt(i);
  return toGlb(json, bin);
}

function toGlb(json: unknown, bin: Uint8Array): ArrayBuffer {
  const pad = (n: number) => (n + 3) & ~3;
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLen = pad(jsonBytes.length);
  const binLen = pad(bin.length);
  const out = new Uint8Array(12 + 8 + jsonLen + 8 + binLen);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // 'glTF'
  view.setUint32(4, 2, true);
  view.setUint32(8, out.length, true);
  view.setUint32(12, jsonLen, true);
  view.setUint32(16, 0x4e4f534a, true); // 'JSON'
  out.fill(0x20, 20, 20 + jsonLen);
  out.set(jsonBytes, 20);
  const b = 20 + jsonLen;
  view.setUint32(b, binLen, true);
  view.setUint32(b + 4, 0x004e4942, true); // 'BIN'
  out.set(bin, b + 8);
  return out.buffer;
}

/** The loaded models, or null when they could not be loaded (the game then builds its own). */
export function getModels(): Models | null { return models; }
