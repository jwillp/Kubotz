import type { SpriterData, SpriterFile } from '../spriter/Spriter';

/**
 * The robot's skeleton, taken from the first frame of the original Idle
 * animation in kubotz.scml: 15 bones and the part images on them. The new
 * clips (see Clips.ts) pose it.
 *
 * Spriter space: pixels, y up, angles in degrees counter-clockwise, the robot
 * facing left (-x) like the original art. Poses are written as seen with the
 * robot facing right: each bone's direction (0 = forwards, 90 = up, -90 =
 * down) in the body's frame. Bones a pose leaves out keep their stance angle
 * to their parent (the head follows the torso).
 *
 * Bones: body (hips, pointing down), torso, head; per side (F front, B back)
 * shoulder (upper arm), arm (forearm), hand; thigh, leg (shin), foot (the
 * boot, pointing down to the sole).
 */

export const BONES = [
  'body', 'torso', 'head',
  'shoulderF', 'armF', 'handF', 'shoulderB', 'armB', 'handB',
  'thighF', 'legF', 'footF', 'thighB', 'legB', 'footB',
] as const;
export type Bone = typeof BONES[number];

const SCML_BONES: Record<string, Bone> = {
  body_bone: 'body', torso_bone: 'torso', head_bone: 'head',
  shoulder_bone_front: 'shoulderF', arm_bone_front: 'armF', hand_bone_front: 'handF',
  shoulder_bone_back: 'shoulderB', arm_bone_back: 'armB', hand_bone_back: 'handB',
  thigh_bone_front: 'thighF', leg_bone_front: 'legF', foot_bone_front: 'footF',
  thigh_bone_back: 'thighB', leg_bone_back: 'legB', foot_bone_back: 'footB',
};

/** The stance's bone directions (facing right), to write poses from. */
/** Height of the middle of the body above the feet (Spriter pixels). */
const SPIN_CENTRE = 190;

export const STANCE: Record<Bone, number> = {
  body: -96, torso: 89, head: 95,
  shoulderF: -74, armF: 46, handF: 57, shoulderB: -60, armB: -37, handB: -12,
  thighF: -62, legF: -97, footF: -82, thighB: -106, legB: -117, footB: -77,
};

export interface Xf { x: number; y: number; angle: number; scaleX: number; scaleY: number; }

/**
 * A pose: bone directions (degrees, facing right: 0 forwards, 90 up), and the
 * whole body's offset (Spriter pixels, x forwards, y up), tilt (degrees,
 * positive = leaning forwards, round the feet) and spin (degrees, positive =
 * a forward flip, round the middle of the body) and yaw (degrees round the
 * vertical axis, for spins; drawn by Robot2D, not the skeleton).
 */
export type Pose = Partial<Record<Bone, number>> & { x?: number; y?: number; tilt?: number; spin?: number; yaw?: number };

interface RigBone { name: Bone; parent: number; rest: Xf; }
interface RigPart { name: string; parent: number; local: Xf; z: number; folder: number; file: number; pivotX?: number; pivotY?: number; }

/** One drawn part of a posed robot (Spriter space). */
export interface PosedPart {
  name: string;
  file: SpriterFile;
  folder: number;
  fileIndex: number;
  tr: Xf;
  /** The image's pivot (0..1 from its bottom-left), from the animation key rather than the file. */
  pivotX: number;
  pivotY: number;
}

function compose(parent: Xf, child: Xf): Xf {
  const flip = parent.scaleX * parent.scaleY < 0;
  const angle = flip ? 360 - child.angle : child.angle;
  const px = child.x * parent.scaleX;
  const py = child.y * parent.scaleY;
  const rad = (parent.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: px * cos - py * sin + parent.x,
    y: px * sin + py * cos + parent.y,
    angle: parent.angle + angle,
    scaleX: child.scaleX * parent.scaleX,
    scaleY: child.scaleY * parent.scaleY,
  };
}

export class Rig {
  private readonly bones: RigBone[] = [];
  private readonly parts: RigPart[] = [];
  private readonly outlines = new Map<string, number[][]>();

  /** The opaque outline of a part image (pixels from its bottom-left), used to ground the feet exactly. */
  setOutline(file: string, points: number[][]): void { this.outlines.set(file, points); }

  constructor(private readonly spriter: SpriterData) {
    const idle = spriter.animations.get('Idle')!;
    const main = idle.mainline[0];
    const keyOf = (timeline: number, key: number) => idle.timelines.get(timeline)!.keys[key];
    for (const ref of main.bones) {
      const tl = idle.timelines.get(ref.timeline)!;
      const k = keyOf(ref.timeline, ref.key);
      this.bones[ref.id] = {
        name: SCML_BONES[tl.name],
        parent: ref.parent,
        rest: { x: k.x, y: k.y, angle: k.angle, scaleX: k.scaleX, scaleY: k.scaleY },
      };
    }
    for (const ref of main.objects) {
      const k = keyOf(ref.timeline, ref.key);
      this.parts.push({
        name: idle.timelines.get(ref.timeline)!.name,
        parent: ref.parent,
        local: { x: k.x, y: k.y, angle: k.angle, scaleX: k.scaleX, scaleY: k.scaleY },
        z: ref.z,
        folder: k.folder,
        file: k.file,
        pivotX: k.pivotX,
        pivotY: k.pivotY,
      });
    }
    this.parts.sort((a, b) => a.z - b.z);
  }

  /** World transforms of the bones of a pose (and the body's root). */
  solveBones(pose: Pose): { root: Xf; world: Xf[]; names: Bone[] } {
    // Mirrored from facing right to the art's facing left: x -> -x, angle a -> 180 - a.
    // Leaning forwards (towards -x) turns the body counter-clockwise.
    const tilt = (pose.tilt ?? 0) + (pose.spin ?? 0);
    const root: Xf = { x: -(pose.x ?? 0), y: pose.y ?? 0, angle: tilt, scaleX: 1, scaleY: 1 };
    if (pose.spin) {
      // Spin round the middle of the body rather than the feet.
      const r = (pose.spin * Math.PI) / 180;
      root.x += SPIN_CENTRE * Math.sin(r);
      root.y += SPIN_CENTRE - SPIN_CENTRE * Math.cos(r);
    }
    const world: Xf[] = [];
    for (let i = 0; i < this.bones.length; i++) {
      const b = this.bones[i];
      const parent = b.parent >= 0 ? world[b.parent] : root;
      const dir = pose[b.name];
      const angle = dir === undefined ? b.rest.angle : 180 - dir + tilt - parent.angle;
      world[i] = compose(parent, { ...b.rest, angle });
    }
    return { root, world, names: this.bones.map((b) => b.name) };
  }

  /** How far up the pose must be lifted for its lowest boot to touch the ground (y = 0). */
  groundLift(pose: Pose): number {
    let low = Infinity;
    for (const p of this.solve({ ...pose, y: 0 })) {
      if (p.name !== 'foot' && p.name !== 'foot_sha') continue;
      const { width: w, height: h } = p.file;
      // The foot's visible outline when known (the image corners are transparent,
      // so a tilted foot would hover above the floor by them).
      const pts = this.outlines.get(p.file.name) ?? [[0, 0], [w, 0], [0, h], [w, h]];
      for (const [cx, cy] of pts) low = Math.min(low, pointOnPart(p, cx, cy).y);
    }
    return low === Infinity ? 0 : -low;
  }

  /**
   * The parts of a pose, back to front, with the character maps applied
   * (helmet shapes, weapons replacing the forearm).
   */
  solve(pose: Pose, maps: string[] = []): PosedPart[] {
    const { root, world } = this.solveBones(pose);
    const charMaps = maps.map((m) => this.spriter.characterMaps.get(m)).filter((m) => !!m);
    const out: PosedPart[] = [];
    for (const p of this.parts) {
      let folder = p.folder;
      let file = p.file;
      let hidden = false;
      for (const map of charMaps) {
        const swap = map!.get(`${folder}/${file}`);
        if (swap === null) hidden = true;
        else if (swap) { folder = swap.folder; file = swap.file; }
      }
      const info = this.spriter.folders[folder]?.[file];
      if (hidden || !info) continue;
      out.push({
        name: p.name, file: info, folder, fileIndex: file,
        pivotX: p.pivotX ?? info.pivotX, pivotY: p.pivotY ?? info.pivotY,
        tr: compose(p.parent >= 0 ? world[p.parent] : root, p.local),
      });
    }
    return out;
  }
}

/** A point of a part image (pixels, origin bottom-left, y up) in Spriter space. */
export function pointOnPart(part: PosedPart, px: number, py: number): { x: number; y: number } {
  const { tr, file } = part;
  const lx = (px - part.pivotX * file.width) * tr.scaleX;
  const ly = (py - part.pivotY * file.height) * tr.scaleY;
  const rad = (tr.angle * Math.PI) / 180;
  return { x: tr.x + lx * Math.cos(rad) - ly * Math.sin(rad), y: tr.y + lx * Math.sin(rad) + ly * Math.cos(rad) };
}
