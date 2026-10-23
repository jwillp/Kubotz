import { BONES, STANCE, type Bone, type Pose } from './Rig';

/**
 * The Kubotz' animation set, written as keyed poses (see Rig.ts for how a pose
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
const READY: Pose = {
  ...S, tilt: 6, torso: 74, head: 88,
  thighF: -38, legF: -112, footF: -88, thighB: -128, legB: -118, footB: -96,
  shoulderF: -22, armF: 14, handF: 22, shoulderB: -125, armB: -150, handB: -160,
};
/** The fighting stance: the original guard with the knees bent. */
const FIGHT: Pose = { ...S, torso: 86, head: 92, thighF: -50, legF: -108, footF: -86, thighB: -98, legB: -128, footB: -84 };
const CROUCH: Pose = {
  ...READY, torso: 78, head: 88, thighF: -15, legF: -125, footF: -95, thighB: -60, legB: -150, footB: -100,
  shoulderF: -60, armF: 60, shoulderB: -45, armB: -10,
};
/** One knee dipped low towards the ground, the front shin upright (victory dance). */
const KNEE_DIP: Pose = {
  ...S, torso: 84, head: 86, tilt: 0,
  thighF: -8, legF: -92, footF: -84, thighB: -98, legB: -178, footB: -130,
  shoulderF: -105, armF: 15, handF: 25, shoulderB: -70, armB: -40, handB: -20,
};
/** "Yes!": standing tall, the front elbow pulled down and the fist up and back. */
const YAY: Pose = {
  ...S, torso: 94, head: 100, y: 6, shoulderF: 82, armF: 92, handF: 96, shoulderB: -62, armB: -24, handB: -10,
  thighF: -56, legF: -94, thighB: -110, legB: -120,
};
/** Knees to the chest, in the air. */
const TUCK: Pose = {
  torso: 75, head: 80, thighF: 10, legF: -120, footF: -100, thighB: -20, legB: -140, footB: -110,
  shoulderF: -40, armF: 40, shoulderB: -30, armB: 20,
};

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

function clip(name: string, ms: number, keys: Key[], opts: { loop?: boolean; planted?: boolean } = {}): Clip {
  return { name, ms, loop: opts.loop ?? false, planted: opts.planted ?? true, keys: keys.map((k) => ({ ...k, pose: complete(k.pose) })) };
}

// ------------------------------------------------------------------ clips

export const CLIPS: Record<string, Clip> = {
  /** The fighting stance (guard up, knees bent), bouncing lightly on the balls of the feet. */
  idle: clip('idle', 860, [
    { t: 0, pose: FIGHT, ease: 'inOut' },
    { t: 0.5, pose: { ...FIGHT, torso: 84, head: 90, thighF: -40, legF: -116, footF: -88, thighB: -88, legB: -136, footB: -86, shoulderF: -70, armF: 52, handF: 64, armB: -30 }, ease: 'inOut' },
  ], { loop: true }),

  /** The original game's run, smoothed (resampled and rounded off), a touch faster and leaning in. */
  run: clip('run', 640, [
    { t: 0.00, pose: { torso: 72, head: 80, shoulderF: -66, armF: 18, handF: 30, shoulderB: -185, armB: -162, handB: -136, thighF: -133, legF: -151, footF: -150, thighB: -42, legB: -156, footB: -125, tilt: 6 } },
    { t: 0.05, pose: { torso: 72, head: 80, shoulderF: -65, armF: 17, handF: 29, shoulderB: -179, armB: -166, handB: -140, thighF: -142, legF: -158, footF: -174, thighB: -37, legB: -133, footB: -110, tilt: 6 } },
    { t: 0.10, pose: { torso: 72, head: 80, shoulderF: -71, armF: 9, handF: 21, shoulderB: -169, armB: -158, handB: -132, thighF: -143, legF: -164, footF: -190, thighB: -36, legB: -106, footB: -92, tilt: 6 } },
    { t: 0.15, pose: { torso: 72, head: 80, shoulderF: -78, armF: -3, handF: 9, shoulderB: -161, armB: -143, handB: -117, thighF: -139, legF: -171, footF: -193, thighB: -36, legB: -86, footB: -76, tilt: 6 } },
    { t: 0.20, pose: { torso: 72, head: 80, shoulderF: -86, armF: -19, handF: -7, shoulderB: -153, armB: -123, handB: -97, thighF: -131, legF: -179, footF: -187, thighB: -40, legB: -77, footB: -67, tilt: 6 } },
    { t: 0.25, pose: { torso: 72, head: 80, shoulderF: -98, armF: -42, handF: -30, shoulderB: -144, armB: -102, handB: -76, thighF: -121, legF: -189, footF: -182, thighB: -49, legB: -81, footB: -69, tilt: 6 } },
    { t: 0.30, pose: { torso: 72, head: 80, shoulderF: -113, armF: -68, handF: -56, shoulderB: -133, armB: -80, handB: -54, thighF: -110, legF: -195, footF: -179, thighB: -62, legB: -93, footB: -78, tilt: 6 } },
    { t: 0.35, pose: { torso: 72, head: 80, shoulderF: -128, armF: -93, handF: -82, shoulderB: -121, armB: -59, handB: -33, thighF: -94, legF: -195, footF: -174, thighB: -76, legB: -110, footB: -89, tilt: 6 } },
    { t: 0.40, pose: { torso: 72, head: 80, shoulderF: -143, armF: -110, handF: -98, shoulderB: -109, armB: -41, handB: -15, thighF: -75, legF: -190, footF: -168, thighB: -90, legB: -125, footB: -99, tilt: 6 } },
    { t: 0.45, pose: { torso: 72, head: 80, shoulderF: -158, armF: -115, handF: -103, shoulderB: -95, armB: -28, handB: -2, thighF: -55, legF: -180, footF: -160, thighB: -103, legB: -139, footB: -109, tilt: 6 } },
    { t: 0.50, pose: { torso: 72, head: 80, shoulderF: -173, armF: -112, handF: -101, shoulderB: -80, armB: -19, handB: 7, thighF: -40, legF: -164, footF: -144, thighB: -115, legB: -150, footB: -119, tilt: 6 } },
    { t: 0.55, pose: { torso: 72, head: 80, shoulderF: -187, armF: -110, handF: -98, shoulderB: -68, armB: -12, handB: 14, thighF: -34, legF: -140, footF: -120, thighB: -125, legB: -161, footB: -131, tilt: 6 } },
    { t: 0.60, pose: { torso: 72, head: 80, shoulderF: -192, armF: -105, handF: -93, shoulderB: -66, armB: -14, handB: 12, thighF: -35, legF: -115, footF: -94, thighB: -134, legB: -174, footB: -150, tilt: 6 } },
    { t: 0.65, pose: { torso: 72, head: 80, shoulderF: -185, armF: -93, handF: -81, shoulderB: -80, armB: -28, handB: -2, thighF: -37, legF: -95, footF: -74, thighB: -141, legB: -188, footB: -176, tilt: 6 } },
    { t: 0.70, pose: { torso: 72, head: 80, shoulderF: -168, armF: -77, handF: -65, shoulderB: -101, armB: -47, handB: -22, thighF: -42, legF: -87, footF: -65, thighB: -142, legB: -197, footB: -196, tilt: 6 } },
    { t: 0.75, pose: { torso: 72, head: 80, shoulderF: -149, armF: -60, handF: -48, shoulderB: -121, armB: -65, handB: -39, thighF: -52, legF: -91, footF: -69, thighB: -131, legB: -196, footB: -195, tilt: 6 } },
    { t: 0.80, pose: { torso: 72, head: 80, shoulderF: -131, armF: -42, handF: -30, shoulderB: -138, armB: -80, handB: -54, thighF: -64, legF: -102, footF: -81, thighB: -111, legB: -188, footB: -181, tilt: 6 } },
    { t: 0.85, pose: { torso: 72, head: 80, shoulderF: -112, armF: -25, handF: -13, shoulderB: -154, armB: -98, handB: -72, thighF: -78, legF: -116, footF: -97, thighB: -87, legB: -179, footB: -163, tilt: 6 } },
    { t: 0.90, pose: { torso: 72, head: 80, shoulderF: -93, armF: -7, handF: 5, shoulderB: -169, armB: -121, handB: -95, thighF: -95, legF: -130, footF: -113, thighB: -65, legB: -172, footB: -149, tilt: 6 } },
    { t: 0.95, pose: { torso: 72, head: 80, shoulderF: -76, armF: 8, handF: 20, shoulderB: -180, armB: -145, handB: -119, thighF: -115, legF: -141, footF: -130, thighB: -50, legB: -167, footB: -137, tilt: 6 } },
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
    { t: 1, pose: FIGHT },
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
    { t: 0, pose: FIGHT },
    { t: 0.2, pose: { ...READY, torso: 108, head: 118, tilt: -6, x: -20, shoulderF: -135, armF: -95, shoulderB: -145, armB: -110, thighF: -40, legF: -100 }, ease: 'snap' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  hit2: clip('hit2', 320, [
    { t: 0, pose: FIGHT },
    { t: 0.2, pose: { ...CROUCH, torso: 58, head: 62, tilt: 8, x: -18, shoulderF: -95, armF: -80, shoulderB: -100, armB: -85 }, ease: 'snap' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  grab: clip('grab', 300, [
    { t: 0, pose: FIGHT },
    { t: 0.4, pose: { ...READY, tilt: 10, x: 20, torso: 80, shoulderF: -5, armF: 0, handF: 0, shoulderB: 0, armB: 5, handB: 5, thighF: -35, legF: -90 }, ease: 'snap' },
    { t: 1, pose: FIGHT },
  ]),

  shoot: clip('shoot', 260, [
    { t: 0, pose: { ...READY, shoulderF: -8, armF: 0 } },
    { t: 0.15, pose: { ...READY, torso: 96, head: 100, x: -12, shoulderF: 8, armF: 22 }, ease: 'snap' },
    { t: 1, pose: { ...READY, shoulderF: -8, armF: 0 }, ease: 'inOut' },
  ]),

  // -------------------------------------------------------------- combat
  /** Combo 1: a palm strike, stepping in. */
  jab: clip('jab', 260, [
    { t: 0, pose: FIGHT },
    { t: 0.2, pose: { ...READY, torso: 82, x: -8, shoulderF: -70, armF: 70, handF: 80, shoulderB: -100, armB: -60 }, ease: 'out' },
    { t: 0.42, pose: { ...READY, torso: 66, tilt: 10, x: 38, shoulderF: 2, armF: 4, handF: 70, shoulderB: -150, armB: -170, thighF: -26, legF: -92, thighB: -140, legB: -130 }, ease: 'snap' },
    { t: 0.7, pose: { ...READY, torso: 67, tilt: 10, x: 40, shoulderF: -2, armF: 0, handF: 66, shoulderB: -148, armB: -168, thighF: -26, legF: -92, thighB: -140, legB: -130 } },
    { t: 1, pose: { ...READY, x: 30 }, ease: 'inOut' },
  ]),

  /** Combo 2: a spinning back fist, the whole body whipping round. */
  cross: clip('cross', 360, [
    { t: 0, pose: { ...READY, x: 30 } },
    { t: 0.2, pose: { ...READY, yaw: 110, torso: 82, x: 36, shoulderB: -70, armB: 40, handB: 50, shoulderF: -110, armF: -50 }, ease: 'in' },
    { t: 0.46, pose: {
    ...READY, yaw: 335, torso: 76, head: 84, tilt: 8, x: 74, shoulderB: 2, armB: 4, handB: 4, shoulderF: -150, armF: -150,
    thighF: -30, legF: -90, thighB: -142, legB: -132,
  }, ease: 'out' },
    { t: 0.75, pose: {
    ...READY, yaw: 360, torso: 77, head: 85, tilt: 8, x: 78, shoulderB: -2, armB: 0, handB: 0, shoulderF: -148, armF: -148,
    thighF: -30, legF: -90, thighB: -142, legB: -132,
  } },
    { t: 1, pose: { ...READY, yaw: 360, x: 70 }, ease: 'inOut' },
  ]),

  /** Combo 3: a jumping spin hook kick that launches. */
  kick: clip('kick', 460, [
    { t: 0, pose: { ...READY, x: 70 } },
    { t: 0.2, pose: { ...CROUCH, x: 74, y: -6, torso: 70, shoulderF: -140, armF: -120, shoulderB: -40, armB: 40 }, ease: 'out' },
    { t: 0.48, pose: {
    torso: 112, head: 104, tilt: -8, x: 140, y: 60, yaw: 345,
    thighF: 26, legF: 30, footF: 55, thighB: -110, legB: -160, footB: -140,
    shoulderF: 160, armF: 175, shoulderB: -175, armB: -170,
  }, ease: 'out' },
    { t: 0.76, pose: {
    torso: 106, head: 100, tilt: -6, x: 150, y: 30, yaw: 360,
    thighF: 14, legF: 4, footF: 30, thighB: -112, legB: -158, footB: -136,
    shoulderF: 150, armF: 165, shoulderB: -170, armB: -165,
  } },
    { t: 1, pose: { ...READY, x: 146, yaw: 360 }, ease: 'inOut' },
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
    { t: 0, pose: FIGHT },
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

  /** Up tilt: a rising palm thrust straight overhead. */
  utilt: clip('utilt', 340, [
    { t: 0, pose: FIGHT },
    { t: 0.25, pose: { ...CROUCH, torso: 80, y: -6, shoulderF: -120, armF: -60, handF: -40, shoulderB: -40, armB: 30 }, ease: 'out' },
    { t: 0.45, pose: {
    ...READY, torso: 90, head: 96, tilt: 0, x: 34, y: 14, shoulderF: 76, armF: 82, handF: 90, shoulderB: -120, armB: -140,
    thighF: -70, legF: -95, thighB: -110, legB: -115,
  }, ease: 'snap' },
    { t: 0.72, pose: {
    ...READY, torso: 90, head: 96, tilt: 0, x: 36, y: 12, shoulderF: 78, armF: 84, handF: 92, shoulderB: -118, armB: -138,
    thighF: -70, legF: -95, thighB: -110, legB: -115,
  } },
    { t: 1, pose: READY, ease: 'inOut' },
  ]),

  /** Up smash: coils low (held while charging), then a vertical scissor kick straight up. */
  usmash: clip('usmash', 520, [
    { t: 0, pose: FIGHT },
    { t: 0.3, pose: { ...CROUCH, torso: 70, y: -10, shoulderF: -150, armF: -130, shoulderB: -150, armB: -130 }, ease: 'out' },
    { t: 0.46, pose: {
    torso: 100, head: 100, tilt: -2, x: 44, y: 28, thighF: 64, legF: 76, footF: 104, thighB: -92, legB: -100, footB: -80,
    shoulderF: -140, armF: -160, handF: -160, shoulderB: -120, armB: -150,
  }, ease: 'snap' },
    { t: 0.7, pose: {
    torso: 100, head: 100, tilt: -2, x: 46, y: 20, thighF: 68, legF: 80, footF: 108, thighB: -92, legB: -100, footB: -80,
    shoulderF: -138, armF: -158, handF: -158, shoulderB: -118, armB: -148,
  } },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  /** Sword up smash (and, quicker, up tilt): the blade sweeps from low in front, over the head, to behind. */
  susmash: clip('susmash', 560, [
    { t: 0, pose: FIGHT },
    { t: 0.3, pose: { ...CROUCH, y: -8, shoulderF: -150, armF: -170, handF: -170 }, ease: 'out' },
    { t: 0.44, pose: { ...READY, torso: 96, head: 100, y: 16, shoulderF: 30, armF: 40, handF: 40 }, ease: 'snap' },
    { t: 0.56, pose: { ...READY, torso: 108, head: 108, tilt: -8, y: 18, shoulderF: 95, armF: 100, handF: 100 }, ease: 'linear' },
    { t: 0.72, pose: { ...READY, torso: 112, head: 110, tilt: -10, y: 10, shoulderF: 150, armF: 160, handF: 160 }, ease: 'out' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  /** Taunt (D-pad): stands tall, one hand on the hip, and beckons twice: "come on". */
  taunt: clip('taunt', 1000, [
    { t: 0, pose: FIGHT },
    { t: 0.15, pose: { ...S, torso: 92, head: 98, shoulderF: 5, armF: 10, handF: 20, shoulderB: -100, armB: -40, handB: -20 }, ease: 'out' },
    { t: 0.3, pose: { ...S, torso: 92, head: 98, shoulderF: 5, armF: 95, handF: 150, shoulderB: -100, y: 4, armB: -40, handB: -20 }, ease: 'inOut' },
    { t: 0.45, pose: { ...S, torso: 92, head: 98, shoulderF: 5, armF: 10, handF: 20, shoulderB: -100, armB: -40, handB: -20 }, ease: 'inOut' },
    { t: 0.6, pose: { ...S, torso: 92, head: 98, shoulderF: 5, armF: 95, handF: 150, shoulderB: -100, y: 4, armB: -40, handB: -20 }, ease: 'inOut' },
    { t: 0.78, pose: { ...S, torso: 93, head: 84, shoulderF: 5, armF: 10, handF: 20, shoulderB: -100, armB: -40, handB: -20 }, ease: 'inOut' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  /**
   * Victory dance (phase 11 D), a ninja's few beats, looping: a hand seal and
   * a bow, then one knee dips low with the fist drawn in,
   * and the Kubot springs up into a "yes!": the elbow pulled down, the fist
   * up and back, pumped once.
   */
  victory: clip('victory', 2600, [
    { t: 0, pose: FIGHT },
    { t: 0.1, pose: { ...S, torso: 90, head: 74, y: -6, shoulderF: -15, armF: 82, handF: 95, shoulderB: -28, armB: 74, handB: 90 }, ease: 'out' },
    { t: 0.2, pose: { ...S, torso: 92, head: 96, y: -2, shoulderF: -15, armF: 82, handF: 95, shoulderB: -28, armB: 74, handB: 90 }, ease: 'inOut' },
    { t: 0.4, pose: { ...KNEE_DIP }, ease: 'inOut' },
    { t: 0.54, pose: { ...KNEE_DIP, torso: 80, head: 80, thighF: -2, legF: -90, shoulderF: -115, armF: 5, handF: 15 }, ease: 'inOut' },
    { t: 0.66, pose: { ...YAY }, ease: 'back' },
    { t: 0.75, pose: { ...YAY, y: 2, shoulderF: 68, armF: 100, handF: 104, head: 96 }, ease: 'inOut' },
    { t: 0.83, pose: { ...YAY }, ease: 'back' },
    { t: 0.92, pose: { ...YAY, y: 3, shoulderF: 85, armF: 98, handF: 100, head: 98 }, ease: 'inOut' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ], { loop: true }),

  // ------------------------------------------------------- special moves (B)
  /** Neutral special, the Ion Punch: a long coil with the burning fist drawn back, then a huge lunging punch. */
  ionPunch: clip('ionPunch', 900, [
    { t: 0, pose: FIGHT },
    { t: 0.15, pose: { ...READY, torso: 96, x: -6, shoulderF: -60, armF: 60, handF: 70 }, ease: 'out' },
    { t: 0.5, pose: {
    ...READY, torso: 106, head: 98, tilt: -12, x: -24, y: -6, thighF: -28, legF: -112, thighB: -148, legB: -126, footB: -100,
    shoulderF: -172, armF: 160, handF: 165, shoulderB: 10, armB: 40, handB: 50,
  }, ease: 'out' },
    { t: 0.57, pose: {
    ...READY, torso: 108, head: 99, tilt: -13, x: -28, y: -7, thighF: -28, legF: -112, thighB: -148, legB: -126, footB: -100,
    shoulderF: -174, armF: 158, handF: 163, shoulderB: 12, armB: 42, handB: 52,
  } },
    { t: 0.64, pose: {
    ...READY, torso: 58, head: 72, tilt: 22, x: 190, thighF: -10, legF: -66, footF: -48, thighB: -160, legB: -170, footB: -134,
    shoulderF: 2, armF: 0, handF: 0, shoulderB: -160, armB: -172,
  }, ease: 'snap' },
    { t: 0.86, pose: {
    ...READY, torso: 60, head: 74, tilt: 20, x: 198, thighF: -10, legF: -66, footF: -48, thighB: -160, legB: -170, footB: -134,
    shoulderF: 0, armF: -2, handF: -2, shoulderB: -158, armB: -170,
  } },
    { t: 1, pose: { ...READY, x: 180 }, ease: 'inOut' },
  ]),

  /** Side special, the Raptor Dash: a low sprinting lunge, then a rising uppercut. */
  raptor: clip('raptor', 560, [
    { t: 0, pose: FIGHT },
    { t: 0.14, pose: {
    ...READY, torso: 58, head: 70, tilt: 18, thighF: -10, legF: -80, thighB: -150, legB: -150, footB: -120,
    shoulderF: -150, armF: -120, handF: -110, shoulderB: -30, armB: 30,
  }, ease: 'out' },
    { t: 0.48, pose: {
    ...READY, torso: 56, head: 68, tilt: 20, thighF: -20, legF: -96, thighB: -140, legB: -140, footB: -110,
    shoulderF: -154, armF: -126, handF: -116, shoulderB: -26, armB: 34,
  } },
    { t: 0.62, pose: {
    ...READY, torso: 104, head: 104, tilt: -6, y: 22, thighF: -40, legF: -100, thighB: -120, legB: -110,
    shoulderF: 70, armF: 88, handF: 95, shoulderB: -130, armB: -150,
  }, ease: 'snap' },
    { t: 0.82, pose: {
    ...READY, torso: 103, head: 103, tilt: -5, y: 18, thighF: -40, legF: -100, thighB: -120, legB: -110,
    shoulderF: 72, armF: 90, handF: 96, shoulderB: -128, armB: -148,
  } },
    { t: 1, pose: READY, ease: 'inOut' },
  ]),

  /** Up special, the Shadow Dive: a rising uppercut that spins up into a tuck. */
  shadowDive: clip('shadowDive', 640, [
    { t: 0, pose: { ...READY, y: -6 } },
    { t: 0.12, pose: {
    torso: 96, head: 100, thighF: 0, legF: -100, footF: -80, thighB: -110, legB: -120, footB: -90,
    shoulderF: 80, armF: 88, handF: 92, shoulderB: -100, armB: -60,
  }, ease: 'snap' },
    { t: 0.55, pose: {
    torso: 96, head: 100, spin: -360, thighF: 0, legF: -100, footF: -80, thighB: -110, legB: -120, footB: -90,
    shoulderF: 80, armF: 88, handF: 92, shoulderB: -100, armB: -60,
  }, ease: 'linear' },
    { t: 0.8, pose: { ...TUCK, spin: -360 }, ease: 'out' },
    { t: 1, pose: { ...TUCK, torso: 86, spin: -360, shoulderF: -20, armF: 10, shoulderB: -160, armB: -170 }, ease: 'inOut' },
  ], { planted: false }),

  // ------------------------------------------------- directional moves (SSB)
  /** Dash attack: a sliding kick along the ground. */
  dash: clip('dash', 420, [
    { t: 0, pose: { ...READY, x: 0 } },
    { t: 0.2, pose: { ...READY, torso: 60, head: 70, tilt: 14, x: 30, thighF: 20, legF: -60, footF: -40, thighB: -70, legB: -150, shoulderF: -140, armF: -120, shoulderB: 130, armB: 160 }, ease: 'out' },
    { t: 0.4, pose: { torso: 125, head: 118, tilt: -8, x: 120, thighF: 4, legF: 0, footF: 20, thighB: -50, legB: -165, footB: -140, shoulderF: -150, armF: -110, shoulderB: 150, armB: 175 }, ease: 'snap' },
    { t: 0.7, pose: { torso: 122, head: 116, tilt: -8, x: 170, thighF: 2, legF: -2, footF: 18, thighB: -52, legB: -165, footB: -140, shoulderF: -148, armF: -108, shoulderB: 148, armB: 172 } },
    { t: 1, pose: { ...READY, x: 190 }, ease: 'inOut' },
  ]),

  /** Down tilt: a low sweep of the front leg that pops the target up. */
  dtilt: clip('dtilt', 380, [
    { t: 0, pose: CROUCH },
    { t: 0.22, pose: { ...CROUCH, torso: 92, tilt: -4, thighF: -110, legF: -140, footF: -120, thighB: -40, legB: -150, shoulderF: -120, armF: -60 }, ease: 'out' },
    { t: 0.45, pose: { ...CROUCH, torso: 70, head: 76, tilt: 10, x: 24, thighF: -4, legF: -8, footF: -30, thighB: -35, legB: -160, footB: -115, shoulderF: -70, armF: -40, handF: -40, shoulderB: -20, armB: -110 }, ease: 'snap' },
    { t: 0.7, pose: { ...CROUCH, torso: 71, head: 77, tilt: 10, x: 26, thighF: -8, legF: -12, footF: -34, thighB: -35, legB: -160, footB: -115, shoulderF: -72, armF: -42, handF: -42, shoulderB: -20, armB: -110 } },
    { t: 1, pose: { ...CROUCH, x: 20 }, ease: 'inOut' },
  ]),

  /** Neutral air: a tornado kick, spinning with one leg out. */
  nair: clip('nair', 420, [
    { t: 0, pose: TUCK },
    { t: 0.18, pose: { torso: 98, head: 100, yaw: 70, thighF: 4, legF: 0, footF: 28, thighB: -70, legB: -150, footB: -120, shoulderF: 150, armF: 170, shoulderB: -150, armB: -170 }, ease: 'out' },
    { t: 0.46, pose: { torso: 96, head: 98, yaw: 220, thighF: 0, legF: -4, footF: 24, thighB: -72, legB: -152, footB: -122, shoulderF: 152, armF: 172, shoulderB: -152, armB: -172 }, ease: 'linear' },
    { t: 0.74, pose: { torso: 96, head: 98, yaw: 360, thighF: 2, legF: -2, footF: 26, thighB: -70, legB: -150, footB: -120, shoulderF: 150, armF: 170, shoulderB: -150, armB: -170 }, ease: 'linear' },
    { t: 1, pose: { ...TUCK, torso: 84, yaw: 360 }, ease: 'inOut' },
  ], { planted: false }),

  /** Forward air: a flying knee, the whole body thrown forwards. */
  fair: clip('fair', 420, [
    { t: 0, pose: { ...TUCK, shoulderF: 100, armF: 150, shoulderB: 60, armB: 130 } },
    { t: 0.3, pose: { torso: 62, head: 72, tilt: 24, thighF: 46, legF: -56, footF: -40, thighB: -130, legB: -172, footB: -135, shoulderB: -140, armB: -110, shoulderF: 110, armF: 160 }, ease: 'snap' },
    { t: 0.7, pose: { torso: 64, head: 74, tilt: 22, thighF: 40, legF: -60, footF: -44, thighB: -130, legB: -172, footB: -135, shoulderB: -142, armB: -112, shoulderF: 106, armF: 156 } },
    { t: 1, pose: { ...TUCK, torso: 82 }, ease: 'inOut' },
  ]),

  /** Back air: a reverse kick behind, looking over the shoulder. */
  bair: clip('bair', 440, [
    { t: 0, pose: { ...TUCK, torso: 100, head: 104 } },
    { t: 0.3, pose: { torso: 60, head: 56, tilt: 22, thighB: 150, legB: 162, footB: 180, thighF: -40, legF: -140, footF: -120, shoulderF: -20, armF: 10, shoulderB: -30, armB: 20 }, ease: 'snap' },
    { t: 0.7, pose: { torso: 62, head: 58, tilt: 20, thighB: 146, legB: 158, footB: 176, thighF: -44, legF: -142, footF: -122, shoulderF: -24, armF: 6, shoulderB: -32, armB: 18 } },
    { t: 1, pose: { ...TUCK, torso: 86 }, ease: 'inOut' },
  ], { planted: false }),

  /** Up air: a backflip kick, the front leg whipping up and over. */
  uair: clip('uair', 480, [
    { t: 0, pose: { ...TUCK, spin: 0, shoulderF: -120, armF: -100, shoulderB: -110, armB: -80 } },
    { t: 0.28, pose: { torso: 108, head: 112, spin: -70, thighF: 86, legF: 98, footF: 125, thighB: -70, legB: -150, footB: -120, shoulderF: -150, armF: -120, shoulderB: -140, armB: -100 }, ease: 'snap' },
    { t: 0.55, pose: { torso: 104, head: 108, spin: -210, thighF: 92, legF: 104, footF: 130, thighB: -60, legB: -140, footB: -110, shoulderF: -140, armF: -110, shoulderB: -130, armB: -90 }, ease: 'linear' },
    { t: 0.82, pose: { ...TUCK, spin: -330 }, ease: 'out' },
    { t: 1, pose: { ...TUCK, torso: 86, spin: -360 }, ease: 'inOut' },
  ], { planted: false }),

  // Sword versions.
  /** Sword down tilt: a low sweep of the blade along the ground. */
  sdtilt: clip('sdtilt', 380, [
    { t: 0, pose: CROUCH },
    { t: 0.22, pose: { ...CROUCH, torso: 90, tilt: -4, shoulderF: -170, armF: -170, handF: -170, thighF: -40 }, ease: 'out' },
    { t: 0.45, pose: { ...CROUCH, torso: 66, head: 72, tilt: 12, x: 16, shoulderF: -42, armF: -34, handF: -34, shoulderB: -40, armB: -110, thighF: -8, legF: -100 }, ease: 'snap' },
    { t: 0.7, pose: { ...CROUCH, torso: 67, head: 73, tilt: 12, x: 18, shoulderF: -36, armF: -28, handF: -28, shoulderB: -40, armB: -110, thighF: -8, legF: -100 } },
    { t: 1, pose: { ...CROUCH, x: 24 }, ease: 'inOut' },
  ]),

  /** Sword back air: a cut behind, the blade arm reaching back over the shoulder. */
  sbair: clip('sbair', 440, [
    { t: 0, pose: { ...TUCK, torso: 100, head: 104, shoulderF: 40, armF: 60, handF: 60 } },
    { t: 0.3, pose: { torso: 112, head: 100, tilt: -10, shoulderF: 170, armF: 178, handF: 178, shoulderB: -40, armB: 10, thighF: -20, legF: -120, footF: -100, thighB: -110, legB: -160, footB: -130 }, ease: 'snap' },
    { t: 0.7, pose: { torso: 112, head: 100, tilt: -10, shoulderF: 176, armF: 184, handF: 184, shoulderB: -40, armB: 10, thighF: -20, legF: -120, footF: -100, thighB: -110, legB: -160, footB: -130 } },
    { t: 1, pose: { ...TUCK, torso: 86 }, ease: 'inOut' },
  ], { planted: false }),

  /** Sword up air: a rising flip with the blade swinging up and over. */
  suair: clip('suair', 480, [
    { t: 0, pose: { ...TUCK, spin: 0, shoulderF: -130, armF: -150, handF: -150 } },
    { t: 0.28, pose: { torso: 100, head: 104, spin: -70, shoulderF: 30, armF: 50, handF: 50, shoulderB: -130, armB: -100, thighF: 10, legF: -110, thighB: -70, legB: -150 }, ease: 'snap' },
    { t: 0.55, pose: { torso: 98, head: 102, spin: -210, shoulderF: 70, armF: 90, handF: 90, shoulderB: -130, armB: -100, thighF: 10, legF: -110, thighB: -70, legB: -150 }, ease: 'linear' },
    { t: 0.82, pose: { ...TUCK, spin: -330, shoulderF: 20, armF: 40 }, ease: 'out' },
    { t: 1, pose: { ...TUCK, torso: 86, spin: -360 }, ease: 'inOut' },
  ], { planted: false }),

  /** Sword down air: a plunging stab, blade under the feet. */
  sdair: clip('sdair', 420, [
    { t: 0, pose: { ...TUCK, shoulderF: 60, armF: 100, handF: 100 } },
    { t: 0.3, pose: { torso: 104, head: 106, tilt: 10, shoulderF: -50, armF: -66, handF: -66, shoulderB: 60, armB: 120, thighF: -40, legF: -150, footF: -130, thighB: -120, legB: -170, footB: -140 }, ease: 'snap' },
    { t: 1, pose: { torso: 102, head: 104, tilt: 12, shoulderF: -52, armF: -68, handF: -68, shoulderB: 64, armB: 124, thighF: -44, legF: -152, footF: -132, thighB: -124, legB: -172, footB: -142 } },
  ], { planted: false }),

  /** Tumbling through the air after a big hit (loops). */
  tumble: clip('tumble', 720, [
    { t: 0, pose: { torso: 100, head: 110, spin: 0, thighF: 30, legF: -40, footF: -20, thighB: -140, legB: -170, footB: -150, shoulderF: 120, armF: 160, shoulderB: -150, armB: -170 } },
    { t: 0.5, pose: { torso: 96, head: 104, spin: 180, thighF: -10, legF: -80, footF: -60, thighB: -110, legB: -160, footB: -140, shoulderF: 80, armF: 130, shoulderB: -120, armB: -150 }, ease: 'linear' },
    { t: 1, pose: { torso: 100, head: 110, spin: 360, thighF: 30, legF: -40, footF: -20, thighB: -140, legB: -170, footB: -150, shoulderF: 120, armF: 160, shoulderB: -150, armB: -170 }, ease: 'linear' },
  ], { loop: true, planted: false }),

  /** Knocked down flat after a tumble, then pushing up. */
  knockdown: clip('knockdown', 600, [
    { t: 0, pose: { torso: 160, head: 150, tilt: -60, thighF: -150, legF: -170, footF: -150, thighB: -170, legB: -175, footB: -160, shoulderF: 150, armF: 160, shoulderB: 170, armB: 175, y: -60 } },
    { t: 0.6, pose: { torso: 150, head: 140, tilt: -55, thighF: -140, legF: -165, footF: -145, thighB: -165, legB: -175, footB: -160, shoulderF: -120, armF: -150, shoulderB: 170, armB: 175, y: -58 } },
    { t: 1, pose: { ...CROUCH, torso: 70, head: 80, tilt: 8 }, ease: 'inOut' },
  ]),

  // ------------------------------------------------ grabs (Melee-style)
  /** Holding a grabbed Kubot out in front, both hands clamped on it. */
  grabHold: clip('grabHold', 700, [
    { t: 0, pose: { ...READY, tilt: 6, x: 14, torso: 82, head: 88, shoulderF: -2, armF: 6, handF: 10, shoulderB: 8, armB: 14, handB: 18, thighF: -40, legF: -100 } },
    { t: 0.5, pose: { ...READY, tilt: 7, x: 14, y: -3, torso: 80, head: 86, shoulderF: 2, armF: 8, handF: 12, shoulderB: 12, armB: 16, handB: 20, thighF: -38, legF: -104 }, ease: 'inOut' },
  ], { loop: true }),

  /** Grabbed: lifted, kicking and struggling. */
  held: clip('held', 360, [
    { t: 0, pose: { torso: 104, head: 112, tilt: -8, thighF: -70, legF: -95, footF: -70, thighB: -112, legB: -128, footB: -96, shoulderF: -150, armF: -120, shoulderB: 150, armB: 130 } },
    { t: 0.5, pose: { torso: 100, head: 106, tilt: -4, thighF: -95, legF: -120, footF: -92, thighB: -88, legB: -100, footB: -76, shoulderF: -130, armF: -100, shoulderB: 170, armB: 150 }, ease: 'inOut' },
  ], { loop: true, planted: false }),

  /** Pummel: a knee into the held Kubot. */
  pummel: clip('pummel', 320, [
    { t: 0, pose: { ...READY, tilt: 6, x: 14, torso: 82, shoulderF: -2, armF: 6, shoulderB: 8, armB: 14 } },
    { t: 0.35, pose: { ...READY, tilt: 10, x: 24, torso: 78, shoulderF: 4, armF: 10, shoulderB: 14, armB: 18, thighF: 30, legF: -70, footF: -40 }, ease: 'snap' },
    { t: 1, pose: { ...READY, tilt: 6, x: 14, torso: 82, shoulderF: -2, armF: 6, shoulderB: 8, armB: 14 }, ease: 'inOut' },
  ]),

  /** Forward throw: a heave out with both arms. */
  throwF: clip('throwF', 440, [
    { t: 0, pose: { ...READY, tilt: 6, x: 14, torso: 82, shoulderF: -2, armF: 6, shoulderB: 8, armB: 14 } },
    { t: 0.3, pose: { ...READY, tilt: -8, x: -10, torso: 104, head: 100, shoulderF: -40, armF: -20, shoulderB: -30, armB: -10, thighF: -30, legF: -110 }, ease: 'out' },
    { t: 0.45, pose: { ...READY, tilt: 16, x: 60, torso: 62, head: 74, shoulderF: 24, armF: 30, handF: 34, shoulderB: 30, armB: 36, thighF: -20, legF: -76, thighB: -150, legB: -160 }, ease: 'snap' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  /** Back throw: a full spin, slinging the Kubot out behind. */
  throwB: clip('throwB', 520, [
    { t: 0, pose: { ...READY, tilt: 6, x: 14, torso: 82, shoulderF: -2, armF: 6, shoulderB: 8, armB: 14, yaw: 0 } },
    { t: 0.4, pose: { ...READY, torso: 92, shoulderF: 6, armF: 8, shoulderB: 12, armB: 16, thighF: -60, legF: -100, thighB: -110, legB: -120, yaw: 150 }, ease: 'in' },
    { t: 0.55, pose: { ...READY, tilt: 10, torso: 70, head: 80, shoulderF: 20, armF: 26, shoulderB: 26, armB: 32, thighF: -30, legF: -90, thighB: -140, legB: -150, yaw: 250 }, ease: 'linear' },
    { t: 1, pose: { ...FIGHT, yaw: 360 }, ease: 'out' },
  ]),

  /** Up throw: dips, then hurls the Kubot straight overhead. */
  throwU: clip('throwU', 480, [
    { t: 0, pose: { ...READY, tilt: 6, x: 14, torso: 82, shoulderF: -2, armF: 6, shoulderB: 8, armB: 14 } },
    { t: 0.3, pose: { ...CROUCH, torso: 84, head: 90, shoulderF: -40, armF: -10, shoulderB: -30, armB: 0 }, ease: 'out' },
    { t: 0.45, pose: { ...READY, torso: 96, head: 104, tilt: -4, y: 10, thighF: -70, legF: -95, thighB: -105, legB: -100, shoulderF: 92, armF: 95, handF: 100, shoulderB: 86, armB: 92, handB: 96 }, ease: 'snap' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  /** Down throw: raises the Kubot, then slams it into the floor. */
  throwD: clip('throwD', 480, [
    { t: 0, pose: { ...READY, tilt: 6, x: 14, torso: 82, shoulderF: -2, armF: 6, shoulderB: 8, armB: 14 } },
    { t: 0.3, pose: { ...READY, torso: 100, head: 104, tilt: -6, shoulderF: 80, armF: 90, shoulderB: 74, armB: 86 }, ease: 'out' },
    { t: 0.48, pose: { ...CROUCH, torso: 48, head: 60, tilt: 22, x: 30, shoulderF: -50, armF: -60, handF: -60, shoulderB: -44, armB: -56 }, ease: 'snap' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  // ------------------------------------------------ ledges (Melee-style)
  /** Hanging from a ledge by both hands, facing it, legs swaying below. */
  ledge: clip('ledge', 1400, [
    { t: 0, pose: { torso: 94, head: 100, shoulderF: 44, armF: 50, handF: 60, shoulderB: 38, armB: 46, handB: 54, thighF: -82, legF: -98, footF: -64, thighB: -100, legB: -108, footB: -72 } },
    { t: 0.5, pose: { torso: 92, head: 98, shoulderF: 45, armF: 51, handF: 61, shoulderB: 39, armB: 47, handB: 55, thighF: -90, legF: -104, footF: -70, thighB: -94, legB: -100, footB: -66 }, ease: 'inOut' },
  ], { loop: true, planted: false }),

  /** Climbing up from the ledge: pull up, a knee onto the top, stand. */
  climb: clip('climb', 550, [
    { t: 0, pose: { torso: 94, head: 100, shoulderF: 44, armF: 50, handF: 60, shoulderB: 38, armB: 46, handB: 54, thighF: -82, legF: -98, footF: -64, thighB: -100, legB: -108, footB: -72 } },
    { t: 0.4, pose: { torso: 72, head: 80, tilt: 18, shoulderF: -70, armF: -40, handF: -20, shoulderB: -60, armB: -30, thighF: 20, legF: -110, footF: -90, thighB: -110, legB: -125, footB: -90 }, ease: 'out' },
    { t: 0.75, pose: CROUCH, ease: 'inOut' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ], { planted: false }),

  /**
   * Dodge roll (guard + forwards): a ninja forward roll. Ducks into a crouch,
   * tucks and rolls over low along the floor, then comes up in a crouch.
   */
  roll: clip('roll', 440, [
    { t: 0, pose: { ...CROUCH, tilt: 10 } },
    { t: 0.12, pose: { ...TUCK, y: -40, spin: 30, shoulderF: -10, armF: 70, shoulderB: 0, armB: 80 }, ease: 'out' },
    { t: 0.72, pose: { ...TUCK, y: -55, spin: 340 }, ease: 'inOut' },
    { t: 0.85, pose: { ...CROUCH, spin: 360 }, ease: 'out' },
    { t: 1, pose: { ...FIGHT, spin: 360 }, ease: 'inOut' },
  ], { planted: false }),

  /** Dodge roll backwards: the same tuck rolled over the back. */
  rollBack: clip('rollBack', 440, [
    { t: 0, pose: { ...CROUCH, tilt: -8 } },
    { t: 0.12, pose: { ...TUCK, y: -40, spin: -30, shoulderF: -10, armF: 70, shoulderB: 0, armB: 80 }, ease: 'out' },
    { t: 0.72, pose: { ...TUCK, y: -55, spin: -340 }, ease: 'inOut' },
    { t: 0.85, pose: { ...CROUCH, spin: -360 }, ease: 'out' },
    { t: 1, pose: { ...FIGHT, spin: -360 }, ease: 'inOut' },
  ], { planted: false }),

  /** Ledge roll: pulled up into a tucked roll along the floor. */
  ledgeRoll: clip('ledgeRoll', 700, [
    { t: 0, pose: { torso: 94, head: 100, shoulderF: 44, armF: 50, shoulderB: 38, armB: 46, thighF: -82, legF: -98, thighB: -100, legB: -108 } },
    { t: 0.3, pose: { ...TUCK, spin: 0 }, ease: 'out' },
    { t: 0.8, pose: { ...TUCK, spin: 360 }, ease: 'inOut' },
    { t: 1, pose: FIGHT, ease: 'out' },
  ], { planted: false }),

  /** Turning round on the spot: a pivot step with the shoulders swinging through. */
  turn: clip('turn', 180, [
    { t: 0, pose: FIGHT },
    { t: 0.5, pose: { ...READY, torso: 100, head: 96, tilt: -3, y: 4, thighF: -76, legF: -102, footF: -84, thighB: -78, legB: -122, footB: -82, shoulderF: -110, armF: -40, shoulderB: -40, armB: 30 }, ease: 'out' },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  /** Forward tilt: a chambered side kick, the body leaning away from it. */
  ftilt: clip('ftilt', 380, [
    { t: 0, pose: FIGHT },
    { t: 0.25, pose: { ...READY, torso: 104, head: 96, tilt: -6, x: 12, thighF: 50, legF: -125, footF: -100, shoulderF: -60, armF: 40, shoulderB: -110, armB: -60 }, ease: 'out' },
    { t: 0.42, pose: {
    ...READY, torso: 128, head: 108, tilt: -12, x: 64, thighF: 6, legF: 2, footF: 28, thighB: -100, legB: -112, footB: -92,
    shoulderF: -170, armF: -160, shoulderB: 165, armB: 175,
  }, ease: 'snap' },
    { t: 0.7, pose: {
    ...READY, torso: 126, head: 107, tilt: -12, x: 68, thighF: 4, legF: 0, footF: 26, thighB: -100, legB: -112, footB: -92,
    shoulderF: -168, armF: -158, shoulderB: 163, armB: 173,
  } },
    { t: 1, pose: { ...READY, x: 62 }, ease: 'inOut' },
  ]),

  /** Forward smash: the burning fist. Coils (held while charging), then a long lunging punch. */
  fsmash: clip('fsmash', 560, [
    { t: 0, pose: FIGHT },
    { t: 0.3, pose: {
    ...READY, torso: 104, head: 96, tilt: -10, x: -16, y: -4, thighF: -30, legF: -110, thighB: -146, legB: -126, footB: -100,
    shoulderF: -172, armF: 160, handF: 165, shoulderB: -20, armB: 40, handB: 50,
  }, ease: 'out' },
    { t: 0.46, pose: {
    ...READY, torso: 60, head: 74, tilt: 20, x: 150, thighF: -12, legF: -68, footF: -50, thighB: -158, legB: -168, footB: -132,
    shoulderF: 2, armF: 0, handF: 0, shoulderB: -160, armB: -172,
  }, ease: 'snap' },
    { t: 0.66, pose: {
    ...READY, torso: 62, head: 76, tilt: 18, x: 160, thighF: -12, legF: -68, footF: -50, thighB: -158, legB: -168, footB: -132,
    shoulderF: 0, armF: -2, handF: -2, shoulderB: -158, armB: -170,
  } },
    { t: 1, pose: { ...READY, x: 150 }, ease: 'inOut' },
  ]),

  /** Down smash: drops into a split, kicking out both ways at once. */
  dsmash: clip('dsmash', 480, [
    { t: 0, pose: FIGHT },
    { t: 0.3, pose: { ...CROUCH, torso: 92, head: 94, y: -8, thighF: -10, legF: -140, thighB: -170, legB: -150, shoulderF: 30, armF: 120, shoulderB: 20, armB: 120 }, ease: 'out' },
    { t: 0.44, pose: {
    torso: 92, head: 96, thighF: -6, legF: -8, footF: 4, thighB: -174, legB: -172, footB: -262,
    shoulderF: 125, armF: 150, handF: 160, shoulderB: 55, armB: 30, handB: 20,
  }, ease: 'snap' },
    { t: 0.7, pose: {
    torso: 90, head: 95, thighF: -5, legF: -7, footF: 6, thighB: -175, legB: -173, footB: -264,
    shoulderF: 122, armF: 148, handF: 158, shoulderB: 58, armB: 32, handB: 22,
  } },
    { t: 1, pose: FIGHT, ease: 'inOut' },
  ]),

  /** Sword forward tilt: a full spinning slash, the blade sweeping round flat. */
  sftilt: clip('sftilt', 420, [
    { t: 0, pose: FIGHT },
    { t: 0.22, pose: { ...READY, yaw: 40, torso: 82, x: 10, shoulderF: -150, armF: -168, handF: -168, shoulderB: -40, armB: 30 }, ease: 'out' },
    { t: 0.48, pose: { ...READY, yaw: 300, torso: 72, tilt: 8, x: 64, shoulderF: -8, armF: -4, handF: -4, shoulderB: -150, armB: -170, thighF: -28, legF: -92, thighB: -142, legB: -132 }, ease: 'linear' },
    { t: 0.72, pose: { ...READY, yaw: 360, torso: 73, tilt: 8, x: 72, shoulderF: -10, armF: -8, handF: -8, shoulderB: -150, armB: -170, thighF: -28, legF: -92, thighB: -142, legB: -132 }, ease: 'out' },
    { t: 1, pose: { ...READY, yaw: 360, x: 66 }, ease: 'inOut' },
  ]),

  /**
   * Blade lock: a deep lunge into the other blade, leaning in, both hands on
   * the hilt, quivering with the strain (the arena pushes it to and fro).
   */
  bladeLock: clip('bladeLock', 240, [
    { t: 0, pose: {
    ...S, torso: 70, head: 74, tilt: 4, x: 18, y: -6,
    thighF: -24, legF: -96, footF: -80, thighB: -150, legB: -158, footB: -118,
    shoulderF: -38, armF: 40, handF: 52, shoulderB: -26, armB: 34, handB: 46,
  }, ease: 'inOut' },
    { t: 0.5, pose: {
    ...S, torso: 73, head: 76, tilt: 3, x: 13, y: -4,
    thighF: -27, legF: -99, footF: -82, thighB: -146, legB: -154, footB: -116,
    shoulderF: -44, armF: 35, handF: 47, shoulderB: -31, armB: 29, handB: 41,
  }, ease: 'inOut' },
  ], { loop: true }),

  /** Sword forward smash: blade raised overhead (held while charging), then a leaping cleave. */
  sfsmash: clip('sfsmash', 600, [
    { t: 0, pose: FIGHT },
    { t: 0.3, pose: {
    ...READY, torso: 104, head: 98, tilt: -10, x: -14, shoulderF: 150, armF: 172, handF: 172, shoulderB: 140, armB: 160,
    thighF: -30, legF: -112, thighB: -146, legB: -126,
  }, ease: 'out' },
    { t: 0.46, pose: {
    ...READY, torso: 58, head: 70, tilt: 22, x: 150, y: 10, shoulderF: -42, armF: -52, handF: -52, shoulderB: -60, armB: -40,
    thighF: -12, legF: -72, footF: -50, thighB: -158, legB: -168, footB: -132,
  }, ease: 'snap' },
    { t: 0.68, pose: {
    ...READY, torso: 60, head: 72, tilt: 20, x: 158, shoulderF: -48, armF: -58, handF: -58, shoulderB: -62, armB: -42,
    thighF: -12, legF: -72, footF: -50, thighB: -158, legB: -168, footB: -132,
  } },
    { t: 1, pose: { ...READY, x: 150 }, ease: 'inOut' },
  ]),

  /** Sword down smash: crouched, a flat spin slash round both sides. */
  sdsmash: clip('sdsmash', 520, [
    { t: 0, pose: FIGHT },
    { t: 0.3, pose: { ...CROUCH, yaw: 0, torso: 76, y: -6, shoulderF: -150, armF: -170, handF: -170, shoulderB: -40, armB: 40 }, ease: 'out' },
    { t: 0.5, pose: { ...CROUCH, yaw: 200, torso: 70, y: -10, shoulderF: -30, armF: -22, handF: -22, shoulderB: -150, armB: -170, thighF: -4, legF: -110, thighB: -150, legB: -150 }, ease: 'linear' },
    { t: 0.72, pose: { ...CROUCH, yaw: 360, torso: 70, y: -10, shoulderF: -30, armF: -22, handF: -22, shoulderB: -150, armB: -170, thighF: -4, legF: -110, thighB: -150, legB: -150 }, ease: 'linear' },
    { t: 1, pose: { ...READY, yaw: 360 }, ease: 'inOut' },
  ]),

  /** Sword neutral air: spinning with the blade held out flat. */
  snair: clip('snair', 420, [
    { t: 0, pose: { ...TUCK, shoulderF: -120, armF: -150, handF: -150 } },
    { t: 0.2, pose: { ...TUCK, yaw: 80, torso: 92, shoulderF: -6, armF: -2, handF: -2, shoulderB: -150, armB: -170 }, ease: 'out' },
    { t: 0.5, pose: { ...TUCK, yaw: 250, torso: 92, shoulderF: -6, armF: -2, handF: -2, shoulderB: -150, armB: -170 }, ease: 'linear' },
    { t: 0.76, pose: { ...TUCK, yaw: 360, torso: 92, shoulderF: -8, armF: -4, handF: -4, shoulderB: -150, armB: -170 }, ease: 'linear' },
    { t: 1, pose: { ...TUCK, torso: 84, yaw: 360 }, ease: 'inOut' },
  ], { planted: false }),
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
