import { BONES, type Pose } from './Rig';
import { DATA_FILES, fromFiles } from '../game/DataFiles';
import type { ClipEvent } from './ClipEvents';

/**
 * The Kubotz' animation set: keyed poses (see Rig.ts for how a pose reads:
 * bone directions facing right, 0 = forwards, 90 = up), kept in
 * src/data/clips (one file each) so the editor can change them. Strikes wind up, snap out
 * and hold before settling back; every clip blends into the next
 * (Animator.ts).
 */
export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'back' | 'snap';

/** A key of a clip: when (0..1), the pose, and how the motion eases into it. */
export interface Key { t: number; pose: Pose; ease?: Ease }

export interface Clip {
  name: string;
  /** Natural length; the game may play a clip over another duration. */
  ms: number;
  loop: boolean;
  /** Lifted so that the lowest boot stays on the ground (y then adds a hop). */
  planted: boolean;
  /** Forward motion moves the Kubot itself (root motion) instead of only its drawing. */
  rootMotion?: boolean;
  keys: Key[];
  /** Particle effects started along the clip (see ClipEvents.ts). */
  events?: ClipEvent[];
}

const FIELDS = [...BONES, 'x', 'y', 'tilt', 'spin', 'yaw'] as const;

export function mixPoses(a: Pose, b: Pose, f: number): Pose {
  const out: Pose = {};
  for (const k of FIELDS) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    out[k] = va + (vb - va) * f;
  }
  return out;
}

/** A clip as its file stores it (its name is the file's). */
export type ClipData = Omit<Clip, 'name'>;

/** Every clip by name. The editor swaps entries in place, so readers look them up each time. */
export const CLIPS: Record<string, Clip> = {};

/** Loads (or reloads) clips from their data. */
export function loadClips(data: Record<string, ClipData>): void {
  for (const k of Object.keys(CLIPS)) delete CLIPS[k];
  for (const [name, c] of Object.entries(data)) CLIPS[name] = { name, ...c };
}
loadClips(fromFiles(DATA_FILES).clips);


const EASE: Record<Ease, (t: number) => number> = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  // Overshoots, then settles.
  back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  // Most of the way at once: a whip.
  snap: (t) => 1 - Math.pow(1 - t, 4),
};

/** The pose of a clip at a point (0..1). Looping clips wrap to their first key. */
export function sampleClip(clip: Clip, at: number): Pose {
  const keys = clip.keys;
  const t = clip.loop ? ((at % 1) + 1) % 1 : Math.min(1, Math.max(0, at));
  let i = keys.length - 1;
  while (i > 0 && keys[i].t > t) i--;
  const k1 = keys[i];
  const k2 = keys[i + 1] ?? (clip.loop ? { ...keys[0], t: 1 } : null);
  if (!k2) return k1.pose;
  const f = (t - k1.t) / (k2.t - k1.t || 1);
  return mixPoses(k1.pose, k2.pose, EASE[k2.ease ?? 'inOut'](f));
}
