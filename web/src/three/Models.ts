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
  // Hosts that do not serve .glb files get the same models as glTF JSON
  // (buffers embedded), named <file>.glb.json.
  const load = (file: string) => loader.loadAsync(`${base}${file}`).catch(() => loader.loadAsync(`${base}${file}.json`));
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

/** The loaded models, or null when they could not be loaded (the game then builds its own). */
export function getModels(): Models | null { return models; }
