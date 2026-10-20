import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { UNIT } from '../config';
import type { PosedObject } from '../spriter/Spriter';
import type { Robot3D } from './Robot3D';

/** Spriter character map -> helmet node of robot.glb. */
const HELMETS: Record<string, string> = {
  head_terminator: 'helmet_terminator',
  head_bigbuff: 'helmet_bigbuff',
  head_skull: 'helmet_skull',
};
const HELMET_NODES = ['helmet_default', 'helmet_terminator', 'helmet_bigbuff', 'helmet_skull'];
const FOREARM_NODES = ['fore_arm', 'weapon_laserSword', 'weapon_laserGunMkI', 'gauntlet_fireArm', 'gauntlet_iceArm'];
const HAND_NODES = ['hand', 'gauntlet_fireFist', 'gauntlet_iceFist'];

export type Weapon = 'none' | 'laserSword' | 'laserGunMkI' | 'laserGunMkII';

/**
 * One Kubotz drawn with robot.glb, the robot remade in Blender from the
 * original art: the original bones and animations (played in step with the
 * game's Spriter clock), helmets and weapons as part variants, painted and
 * lit parts tinted in the player's colour. Points on the parts (hitboxes,
 * muzzle) still come from the Spriter pose, through a skeleton-only Robot3D.
 */
export class RobotGltf {
  readonly group = new THREE.Group(); // at the feet, y up, units
  private readonly root: THREE.Object3D;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private readonly nodes = new Map<string, THREE.Object3D>();
  private readonly materials: THREE.MeshStandardMaterial[] = [];

  constructor(gltf: GLTF, color: number, private readonly skeleton: Robot3D, envMap?: THREE.Texture) {
    this.root = cloneSkeleton(gltf.scene);
    this.group.add(this.root);
    this.root.traverse((o) => {
      this.nodes.set(o.name, o);
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      const m = (o.material as THREE.MeshStandardMaterial).clone();
      if (envMap) { m.envMap = envMap; m.envMapIntensity = 0.25; }
      const name = m.name;
      if (name.startsWith('player_color.') || name.startsWith('player_glow.')) {
        m.color.set(color);
        if (name.startsWith('player_glow.')) m.emissive.set(color);
      }
      m.userData.emissive = m.emissive.clone();
      m.userData.emissiveIntensity = m.emissiveIntensity;
      m.userData.transparent = m.transparent;
      o.material = m;
      this.materials.push(m);
    });
    this.mixer = new THREE.AnimationMixer(this.root);
    for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
  }

  /** Shows the helmet and the weapon in hand (one variant per slot). */
  setLoadout(head: string | null, weapon: Weapon): void {
    const helmet = (head && HELMETS[head]) || 'helmet_default';
    for (const n of HELMET_NODES) this.show(n, n === helmet);
    const arm = weapon === 'laserSword' ? 'weapon_laserSword' : weapon === 'none' ? 'fore_arm' : 'weapon_laserGunMkI';
    for (const n of FOREARM_NODES) this.show(n, n === arm);
    // The original hides the hand when a weapon is held.
    for (const n of HAND_NODES) this.show(n, n === 'hand' && weapon === 'none');
  }

  private show(name: string, on: boolean): void {
    const n = this.nodes.get(name);
    if (n) n.visible = on;
  }

  /**
   * Plays an animation at a given point (0..1), so the model stays in step
   * with the Spriter clock that drives the game (attack timings, hitboxes).
   * Switching animations blends briefly.
   */
  animate(name: string, progress: number, dtMs: number): void {
    const next = this.actions.get(name) ?? this.actions.get('Idle');
    if (!next) return;
    if (next !== this.current) {
      next.reset();
      next.timeScale = 0; // time is set by hand below
      next.play();
      if (this.current) next.crossFadeFrom(this.current, 0.08, false);
      this.current = next;
    }
    next.time = Math.min(progress, 0.9999) * next.getClip().duration;
    this.mixer.update(dtMs / 1000);
  }

  /** Same placement as Robot3D.update; also poses the skeleton used for hit points. */
  update(pose: PosedObject[], x: number, y: number, face: number, fx: {
    lean: number; spin: number; squash: number; alpha: number; flash: boolean;
  }): void {
    this.skeleton.update(pose, x, y, face, fx);
    this.group.position.set(x / UNIT, -y / UNIT, 0);
    // A 3/4 view: turned a little towards the camera. The model faces +X.
    this.group.rotation.set(0, -face * 0.32, fx.lean + fx.spin);
    this.root.scale.set(Math.sign(face || 1) * Math.max(0.15, Math.abs(face)), fx.squash, 1);
    for (const m of this.materials) {
      m.transparent = fx.alpha < 0.99 || (m.userData.transparent as boolean);
      m.opacity = fx.alpha;
      m.depthWrite = fx.alpha > 0.99;
      if (fx.flash) {
        m.emissive.setHex(0xff3030);
        m.emissiveIntensity = 0.3;
      } else {
        m.emissive.copy(m.userData.emissive as THREE.Color);
        m.emissiveIntensity = m.userData.emissiveIntensity as number;
      }
    }
  }

  pointOn(file: string, px: number, py: number): { x: number; y: number } | null {
    return this.skeleton.pointOn(file, px, py);
  }

  /** Copies of the visible parts as posed now, for the K.O. explosion (see Robot3D.pieces). */
  pieces(): { holder: THREE.Group; radius: number }[] {
    this.group.updateMatrixWorld(true);
    const out: { holder: THREE.Group; radius: number }[] = [];
    const parts = new Set<THREE.Object3D>();
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.parent && !(o.parent instanceof THREE.Mesh)) {
        // A multi-material part is a group of meshes: take the group.
        parts.add(o.parent.type === 'Group' && !o.parent.name.endsWith('_bone') && o.parent !== this.root ? o.parent : o);
      }
    });
    for (const part of parts) {
      let shown = true;
      for (let n: THREE.Object3D | null = part; n; n = n.parent) if (!n.visible) shown = false;
      const scale = new THREE.Vector3();
      part.getWorldScale(scale);
      if (!shown || Math.abs(scale.x * scale.y) < 1e-4) continue;
      const box = new THREE.Box3().setFromObject(part);
      if (box.isEmpty()) continue;
      const centre = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const holder = new THREE.Group();
      part.matrixWorld.decompose(holder.position, holder.quaternion, holder.scale);
      const local = part.worldToLocal(centre.clone());
      holder.position.copy(centre);
      const copy = part.clone();
      copy.position.copy(local).negate();
      copy.quaternion.identity();
      copy.scale.set(1, 1, 1);
      copy.visible = true;
      copy.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const m = (o.material as THREE.MeshStandardMaterial).clone();
        m.opacity = 1;
        m.depthWrite = true;
        o.material = m;
      });
      holder.add(copy);
      out.push({ holder, radius: Math.min(0.45, Math.max(0.12, 0.32 * Math.max(size.x, size.y))) });
    }
    return out;
  }

  set visible(v: boolean) { this.group.visible = v; }

  dispose(): void {
    this.group.removeFromParent();
    this.mixer.stopAllAction();
    for (const m of this.materials) m.dispose();
    this.skeleton.dispose();
  }
}
