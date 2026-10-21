import { BONES, STANCE, type Bone, type Pose } from './Rig';

/**
 * The robots' animation set, written as keyed poses (see Rig.ts for how a pose
 * reads: bone directions facing right, 0 = forwards, 90 = up). Strikes wind
 * up, snap out and hold before settling back; every clip blends into the next
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
  keys: Key[];
}

const PARENT: Record<Bone, Bone | null> = {
  body: null, torso: 'body', head: 'torso',
  shoulderF: 'torso', armF: 'shoulderF', handF: 'armF', shoulderB: 'torso', armB: 'shoulderB', handB: 'armB',
  thighF: 'body', legF: 'thighF', footF: 'legF', thighB: 'body', legB: 'thighB', footB: 'legB',
};

/** Every bone given: a left-out bone keeps its stance angle to its parent. */
function complete(p: Pose): Pose {
  const out: Pose = { ...p };
  for (const b of BONES) {
    if (out[b] !== undefined) continue;
    const parent = PARENT[b];
    out[b] = parent ? out[parent]! + (STANCE[b] - STANCE[parent]) : STANCE[b];
  }
  return out;
}

const S = STANCE;

// ------------------------------------------------------------------ poses
/** Knees bent, weight low: the base of the fighting moves. */
const READY: Pose = { ...S, torso: 86, head: 92, thighF: -50, legF: -108, footF: -86, thighB: -98, legB: -128, footB: -84 };
const CROUCH: Pose = {
  ...READY, torso: 78, head: 88, thighF: -15, legF: -125, footF: -95, thighB: -60, legB: -150, footB: -100,
  shoulderF: -60, armF: 60, shoulderB: -45, armB: -10,
};
/** Knees to the chest, in the air. */
const TUCK: Pose = {
  torso: 75, head: 80, thighF: 10, legF: -120, footF: -100, thighB: -20, legB: -140, footB: -110,
  shoulderF: -40, armF: 40, shoulderB: -30, armB: 20,
};

const FIELDS = [...BONES, 'x', 'y', 'tilt', 'spin'] as const;

export function mixPoses(a: Pose, b: Pose, f: number): Pose {
  const out: Pose = {};
  for (const k of FIELDS) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    out[k] = va + (vb - va) * f;
  }
  return out;
}

function clip(name: string, ms: number, keys: Key[], opts: { loop?: boolean; planted?: boolean } = {}): Clip {
  return { name, ms, loop: opts.loop ?? false, planted: opts.planted ?? true, keys: keys.map((k) => ({ ...k, pose: complete(k.pose) })) };
}

// ------------------------------------------------------------------ clips
const runContact = (lead: 'F' | 'B'): Pose => {
  const [a, b] = lead === 'F' ? ['F', 'B'] : ['B', 'F'];
  return {
    tilt: 10, torso: 84, head: 88, y: 0,
    [`thigh${a}`]: -35, [`leg${a}`]: -70, [`foot${a}`]: -50,
    [`thigh${b}`]: -135, [`leg${b}`]: -160, [`foot${b}`]: -120,
    [`shoulder${a}`]: -125, [`arm${a}`]: -60,
    [`shoulder${b}`]: -25, [`arm${b}`]: 40,
  } as Pose;
};
const runPass = (lead: 'F' | 'B'): Pose => {
  const [a, b] = lead === 'F' ? ['F', 'B'] : ['B', 'F'];
  return {
    tilt: 12, torso: 86, head: 90, y: 14,
    [`thigh${a}`]: -100, [`leg${a}`]: -105, [`foot${a}`]: -85,
    [`thigh${b}`]: -55, [`leg${b}`]: -150, [`foot${b}`]: -115,
    [`shoulder${a}`]: -80, [`arm${a}`]: -10,
    [`shoulder${b}`]: -70, [`arm${b}`]: 10,
  } as Pose;
};

export const CLIPS: Record<string, Clip> = {
  idle: clip('idle', 1400, [
    { t: 0, pose: READY },
    { t: 0.5, pose: { ...READY, torso: 84, head: 90, thighF: -44, legF: -114, thighB: -92, legB: -134, armF: 52, handF: 64, armB: -30 } },
  ], { loop: true }),

  run: clip('run', 640, [
    { t: 0, pose: runContact('F') },
    { t: 0.25, pose: runPass('B'), ease: 'out' },
    { t: 0.5, pose: runContact('B'), ease: 'in' },
    { t: 0.75, pose: runPass('F'), ease: 'out' },
  ], { loop: true }),

  crouch: clip('crouch', 600, [{ t: 0, pose: CROUCH }, { t: 0.5, pose: { ...CROUCH, torso: 76, y: -3 } }], { loop: true }),

  jump: clip('jump', 420, [
    { t: 0, pose: { ...CROUCH, tilt: 4 } },
    { t: 0.25, pose: { torso: 92, head: 96, thighF: -80, legF: -95, footF: -95, thighB: -110, legB: -115, footB: -110, shoulderF: 60, armF: 110, shoulderB: 40, armB: 100 }, ease: 'snap' },
    { t: 1, pose: { ...TUCK, torso: 88, head: 92, shoulderF: 20, armF: 80, shoulderB: 0, armB: 60 }, ease: 'out' },
  ], { planted: false }),

  flip: clip('flip', 460, [
    { t: 0, pose: { ...TUCK, spin: 0 } },
    { t: 0.85, pose: { ...TUCK, spin: 340 }, ease: 'out' },
    { t: 1, pose: { ...TUCK, torso: 85, thighF: -40, legF: -100, spin: 360 } },
  ], { planted: false }),

  fall: clip('fall', 700, [
    { t: 0, pose: { torso: 92, head: 98, thighF: -60, legF: -100, footF: -85, thighB: -110, legB: -135, footB: -95, shoulderF: 30, armF: 80, shoulderB: 10, armB: 70 } },
    { t: 0.5, pose: { torso: 94, head: 100, thighF: -66, legF: -106, footF: -88, thighB: -104, legB: -128, footB: -92, shoulderF: 40, armF: 95, shoulderB: 20, armB: 85 } },
  ], { loop: true, planted: false }),

  land: clip('land', 240, [
    { t: 0, pose: { ...CROUCH, torso: 74 } },
    { t: 0.35, pose: { ...CROUCH, torso: 72, head: 84 }, ease: 'out' },
    { t: 1, pose: READY },
  ]),

  guard: clip('guard', 900, [
    { t: 0, pose: { ...READY, torso: 80, head: 84, shoulderF: -30, armF: 85, handF: 95, shoulderB: -20, armB: 80, handB: 95, thighF: -40, legF: -112 } },
    { t: 0.5, pose: { ...READY, torso: 79, head: 83, shoulderF: -28, armF: 88, handF: 98, shoulderB: -18, armB: 83, handB: 98, thighF: -38, legF: -115 } },
  ], { loop: true }),

  dodge: clip('dodge', 300, [
    { t: 0, pose: { ...TUCK, spin: 0 } },
    { t: 1, pose: { ...TUCK, spin: -360 }, ease: 'inOut' },
  ], { planted: false }),

  hit: clip('hit', 320, [
    { t: 0, pose: READY },
    { t: 0.2, pose: { ...READY, torso: 108, head: 118, tilt: -6, x: -20, shoulderF: -135, armF: -95, shoulderB: -145, armB: -110, thighF: -40, legF: -100 }, ease: 'snap' },
    { t: 1, pose: READY, ease: 'inOut' },
  ]),

  hit2: clip('hit2', 320, [
    { t: 0, pose: READY },
    { t: 0.2, pose: { ...CROUCH, torso: 55, head: 40, tilt: 8, x: -18, shoulderF: -95, armF: -80, shoulderB: -100, armB: -85 }, ease: 'snap' },
    { t: 1, pose: READY, ease: 'inOut' },
  ]),

  grab: clip('grab', 300, [
    { t: 0, pose: READY },
    { t: 0.4, pose: { ...READY, tilt: 10, x: 20, torso: 80, shoulderF: -5, armF: 0, handF: 0, shoulderB: 0, armB: 5, handB: 5, thighF: -35, legF: -90 }, ease: 'snap' },
    { t: 1, pose: READY },
  ]),

  shoot: clip('shoot', 260, [
    { t: 0, pose: { ...READY, shoulderF: -8, armF: 0 } },
    { t: 0.15, pose: { ...READY, torso: 96, head: 100, x: -12, shoulderF: 8, armF: 22 }, ease: 'snap' },
    { t: 1, pose: { ...READY, shoulderF: -8, armF: 0 }, ease: 'inOut' },
  ]),

  // -------------------------------------------------------------- combat
  /** Combo 1: a quick jab with the front fist, stepping in. */
  jab: clip('jab', 280, [
    { t: 0, pose: READY },
    { t: 0.2, pose: { ...READY, torso: 92, x: -6, shoulderF: -110, armF: 30, handF: 40 }, ease: 'out' },
    { t: 0.42, pose: { ...READY, torso: 78, tilt: 6, x: 26, shoulderF: -2, armF: 0, handF: 0, thighF: -36, legF: -96, thighB: -112, legB: -132 }, ease: 'snap' },
    { t: 0.7, pose: { ...READY, torso: 79, tilt: 6, x: 26, shoulderF: -6, armF: 4, handF: 4, thighF: -36, legF: -96, thighB: -112, legB: -132 } },
    { t: 1, pose: { ...READY, x: 18 }, ease: 'inOut' },
  ]),

  /** Combo 2: a cross with the back fist, the whole body turning into it. */
  cross: clip('cross', 360, [
    { t: 0, pose: { ...READY, x: 18 } },
    { t: 0.28, pose: { ...READY, torso: 100, head: 98, tilt: -6, x: 4, shoulderB: -160, armB: -80, handB: -70, shoulderF: -40, armF: 70 }, ease: 'out' },
    { t: 0.5, pose: {
      ...READY, torso: 70, head: 80, tilt: 16, x: 62, shoulderB: 4, armB: 0, handB: 0, shoulderF: -120, armF: 20, handF: 30,
      thighF: -24, legF: -80, footF: -70, thighB: -128, legB: -128, footB: -100,
    }, ease: 'snap' },
    { t: 0.75, pose: {
      ...READY, torso: 71, head: 81, tilt: 15, x: 62, shoulderB: 0, armB: -4, handB: -4, shoulderF: -118, armF: 22, handF: 32,
      thighF: -24, legF: -80, footF: -70, thighB: -128, legB: -128, footB: -100,
    } },
    { t: 1, pose: { ...READY, x: 40 }, ease: 'inOut' },
  ]),

  /** Combo 3: a high front kick that launches. */
  kick: clip('kick', 440, [
    { t: 0, pose: { ...READY, x: 40 } },
    { t: 0.25, pose: { ...READY, torso: 96, head: 96, x: 40, thighF: 30, legF: -95, footF: -70, shoulderF: -110, armF: 20, shoulderB: -40, armB: 60 }, ease: 'out' },
    { t: 0.45, pose: {
      ...READY, torso: 120, head: 112, tilt: -4, x: 100, thighF: 22, legF: 18, footF: 50, thighB: -100, legB: -112,
      shoulderF: -150, armF: -100, shoulderB: -110, armB: -60,
    }, ease: 'snap' },
    { t: 0.7, pose: {
      ...READY, torso: 118, head: 110, tilt: -4, x: 104, thighF: 18, legF: 12, footF: 45, thighB: -100, legB: -112,
      shoulderF: -148, armF: -98, shoulderB: -108, armB: -58,
    } },
    { t: 1, pose: { ...READY, x: 96 }, ease: 'inOut' },
  ]),

  /** In the air: a diving kick. */
  airKick: clip('airKick', 420, [
    { t: 0, pose: TUCK },
    { t: 0.3, pose: { ...TUCK, torso: 100, thighF: 30, legF: -60 }, ease: 'out' },
    { t: 0.5, pose: {
      torso: 112, head: 108, tilt: 18, thighF: -30, legF: -32, footF: -5, thighB: -150, legB: -175, footB: -130,
      shoulderF: 60, armF: 120, shoulderB: 80, armB: 140,
    }, ease: 'snap' },
    { t: 1, pose: {
      torso: 110, head: 106, tilt: 16, thighF: -34, legF: -36, footF: -8, thighB: -148, legB: -172, footB: -128,
      shoulderF: 55, armF: 115, shoulderB: 75, armB: 135,
    } },
  ], { planted: false }),

  /** Sword combo 1: overhead slash down. */
  slash1: clip('slash1', 340, [
    { t: 0, pose: READY },
    { t: 0.3, pose: { ...READY, torso: 100, head: 100, tilt: -4, x: -6, shoulderF: 120, armF: 150, handF: 150 }, ease: 'out' },
    { t: 0.52, pose: { ...READY, torso: 72, head: 78, tilt: 14, x: 56, shoulderF: -55, armF: -60, handF: -60, thighF: -28, legF: -84, thighB: -124, legB: -130 }, ease: 'snap' },
    { t: 0.75, pose: { ...READY, torso: 73, head: 79, tilt: 13, x: 56, shoulderF: -60, armF: -66, handF: -66, thighF: -28, legF: -84, thighB: -124, legB: -130 } },
    { t: 1, pose: { ...READY, x: 40 }, ease: 'inOut' },
  ]),

  /** Sword combo 2: rising slash with a hop. */
  slash2: clip('slash2', 360, [
    { t: 0, pose: { ...READY, x: 40, shoulderF: -60, armF: -66 } },
    { t: 0.22, pose: { ...CROUCH, x: 44, shoulderF: -120, armF: -150, handF: -150 }, ease: 'out' },
    { t: 0.42, pose: { ...READY, torso: 92, head: 96, tilt: 6, x: 80, y: 10, shoulderF: -24, armF: -20, handF: -20, thighF: -30, legF: -100 }, ease: 'snap' },
    { t: 0.62, pose: { ...READY, torso: 100, head: 102, tilt: -4, x: 88, y: 34, shoulderF: 48, armF: 66, handF: 66, thighF: -30, legF: -110 }, ease: 'out' },
    { t: 0.8, pose: { ...READY, torso: 99, head: 101, tilt: -4, x: 88, y: 14, shoulderF: 52, armF: 70, handF: 70 } },
    { t: 1, pose: { ...READY, x: 70 }, ease: 'inOut' },
  ]),

  /** Sword combo 3: a long lunging thrust. */
  slash3: clip('slash3', 440, [
    { t: 0, pose: { ...READY, x: 70 } },
    { t: 0.3, pose: { ...READY, torso: 96, x: 60, shoulderF: -150, armF: -175, handF: -175, shoulderB: -20, armB: 40 }, ease: 'out' },
    { t: 0.5, pose: {
      ...READY, torso: 68, head: 76, tilt: 20, x: 140, shoulderF: -4, armF: 0, handF: 0, shoulderB: -150, armB: -120,
      thighF: -10, legF: -70, footF: -60, thighB: -140, legB: -140, footB: -110,
    }, ease: 'snap' },
    { t: 0.78, pose: {
      ...READY, torso: 69, head: 77, tilt: 19, x: 142, shoulderF: -6, armF: -2, handF: -2, shoulderB: -148, armB: -118,
      thighF: -10, legF: -70, footF: -60, thighB: -140, legB: -140, footB: -110,
    } },
    { t: 1, pose: { ...READY, x: 110 }, ease: 'inOut' },
  ]),
};

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
