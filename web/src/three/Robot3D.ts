import * as THREE from 'three';
import { Config, UNIT } from '../config';
import type { PosedObject } from '../spriter/Spriter';
import { bledTexture, glowTexture, partGeometry } from './Extrude';

type Img = CanvasImageSource & { width: number; height: number };

/** Thickness of each body part, in Spriter pixels (the robot is ~300 px tall). */
const DEPTH: Record<string, number> = {
  torso: 120, head: 170, shoulder: 80, thigh: 70, lower_leg: 60, foot: 52,
  hand: 56, fore_arm: 56, lazerSword: 24, gunMk1: 46, fireArm: 56, iceArm: 56,
};
const depthOf = (file: string): number => {
  const base = file.split('/').pop()!.replace(/(_sha)?\.png$/, '').replace(/^Helmet.*/, 'head');
  return DEPTH[base] ?? 50;
};

/** Laser blades glow strongly; painted parts only let their lights shine a little. */
const glowOf = (key: string): number => (key.startsWith('sword:') || key.includes('lazerSword') ? 2.4 : 0.35);

/** Geometry is shared by every robot: one extrusion per image. */
const geometryCache = new Map<string, THREE.BufferGeometry>();

/**
 * One Kubotz in 3D. Every Spriter part becomes a bevelled solid cut from its
 * own artwork; parts are stacked front to back in their drawing order, so the
 * 3D robot plays exactly the original animations, now with depth and light.
 */
export class Robot3D {
  readonly group = new THREE.Group(); // at the feet, y up, units
  private readonly rig = new THREE.Group(); // Spriter space (px), mirrored to face right
  private readonly parts = new Map<number, { holder: THREE.Group; mesh: THREE.Mesh; key: string }>();
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * @param texture returns the image to use for a Spriter file, already
   * recoloured for this robot (helmet, sword), and its texture key.
   */
  constructor(private texture: (file: string) => { key: string; img: Img }) {
    const s = Config.SPRITER_SCALE; // Spriter px -> units
    this.rig.scale.setScalar(s);
    this.group.add(this.rig);
  }

  private material(key: string, img: Img): THREE.MeshStandardMaterial {
    let m = this.materials.get(key);
    if (!m) {
      const map = new THREE.CanvasTexture(bledTexture(img));
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      const glow = new THREE.CanvasTexture(glowTexture(img));
      glow.colorSpace = THREE.SRGBColorSpace;
      m = new THREE.MeshStandardMaterial({
        map, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: glowOf(key),
        roughness: 0.42, metalness: 0.55, transparent: true,
      });
      m.userData.glow = glowOf(key);
      this.materials.set(key, m);
    }
    return m;
  }

  private geometry(key: string, file: string, img: Img): THREE.BufferGeometry {
    let g = geometryCache.get(key);
    if (!g) {
      const depth = depthOf(file);
      g = partGeometry(img, { depth, bevel: depth * 0.38 });
      geometryCache.set(key, g);
    }
    return g;
  }

  /**
   * Places the robot and its parts.
   * @param x,y feet position in world pixels (Phaser space, y down)
   * @param face -1 (left) .. 1 (right), eased when turning round; the art faces
   * left, so the rig is mirrored when facing right
   */
  update(pose: PosedObject[], x: number, y: number, face: number, fx: {
    lean: number; spin: number; squash: number; alpha: number; flash: boolean;
  }): void {
    this.group.position.set(x / UNIT, -y / UNIT, 0);
    // A 3/4 view: turned a little towards the camera.
    this.group.rotation.set(0, -face * 0.32, fx.lean + fx.spin);
    const s = Config.SPRITER_SCALE;
    this.rig.scale.set(s * -Math.sign(face || 1) * Math.max(0.15, Math.abs(face)), s * fx.squash, s);

    for (const p of this.parts.values()) p.holder.visible = false;
    const n = pose.length;
    pose.forEach((o, rank) => {
      const { key, img } = this.texture(o.file.name);
      let part = this.parts.get(o.timeline);
      if (!part) {
        const holder = new THREE.Group();
        const mesh = new THREE.Mesh(this.geometry(key, o.file.name, img), this.material(key, img));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        holder.add(mesh);
        this.rig.add(holder);
        part = { holder, mesh, key };
        this.parts.set(o.timeline, part);
      } else if (part.key !== key) {
        part.mesh.geometry = this.geometry(key, o.file.name, img);
        part.mesh.material = this.material(key, img);
        part.key = key;
      }
      const depth = depthOf(o.file.name);
      // Front faces follow the drawing order; each part extends backwards from it.
      const front = (rank - n / 2) * 7 + 45;
      part.holder.visible = o.tr.alpha > 0.01;
      part.holder.position.set(o.tr.x, o.tr.y, front - depth / 2);
      part.holder.rotation.set(0, 0, (o.tr.angle * Math.PI) / 180);
      part.holder.scale.set(o.tr.scaleX, o.tr.scaleY, 1);
      part.mesh.position.set(-o.pivotX * o.file.width, -o.pivotY * o.file.height, 0);
    });

    const flashOn = fx.flash;
    for (const m of this.materials.values()) {
      m.opacity = fx.alpha;
      m.depthWrite = fx.alpha > 0.99;
      m.emissive.setHex(flashOn ? 0xff6666 : 0xffffff);
      m.emissiveIntensity = flashOn ? 0.6 : (m.userData.glow as number);
    }
  }

  /**
   * World position (Phaser pixels) of a point given in a part's image pixels
   * (origin bottom-left, y up), for the part currently showing `file`.
   */
  pointOn(file: string, px: number, py: number): { x: number; y: number } | null {
    for (const p of this.parts.values()) {
      if (!p.holder.visible) continue;
      const showing = this.texture(file).key;
      if (p.key !== showing) continue;
      this.group.updateMatrixWorld(true);
      const v = new THREE.Vector3(px, py, 0).applyMatrix4(p.mesh.matrixWorld);
      return { x: v.x * UNIT, y: -v.y * UNIT };
    }
    return null;
  }

  /**
   * Copies of the visible parts as they are posed now, for the K.O. explosion:
   * each mesh is centred in its holder, which carries the part's world
   * position (units), rotation and scale. Materials are copies, free to fade.
   */
  pieces(): { holder: THREE.Group; radius: number }[] {
    this.group.updateMatrixWorld(true);
    const copies = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    const out: { holder: THREE.Group; radius: number }[] = [];
    for (const p of this.parts.values()) {
      if (!p.holder.visible || !this.group.visible) continue;
      const geo = p.mesh.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const box = geo.boundingBox!;
      if (box.isEmpty()) continue;
      const centre = box.getCenter(new THREE.Vector3());
      const holder = new THREE.Group();
      p.mesh.matrixWorld.decompose(holder.position, holder.quaternion, holder.scale);
      holder.position.copy(centre.clone().applyMatrix4(p.mesh.matrixWorld));
      const src = p.mesh.material as THREE.MeshStandardMaterial;
      let mat = copies.get(src);
      if (!mat) { mat = src.clone(); mat.opacity = 1; mat.depthWrite = true; copies.set(src, mat); }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(centre).negate();
      mesh.castShadow = true;
      holder.add(mesh);
      const size = box.getSize(new THREE.Vector3());
      const radius = 0.32 * Math.max(Math.abs(size.x * holder.scale.x), Math.abs(size.y * holder.scale.y));
      out.push({ holder, radius: Math.min(0.45, Math.max(0.12, radius)) });
    }
    return out;
  }

  set visible(v: boolean) { this.group.visible = v; }

  dispose(): void {
    this.group.removeFromParent();
    for (const m of this.materials.values()) {
      m.map?.dispose();
      m.emissiveMap?.dispose();
      m.dispose();
    }
  }
}
