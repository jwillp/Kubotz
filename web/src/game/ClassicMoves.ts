import { PART_TIPS, SWORD_FILE, type DirMoves, type Launch, type Move, type PartPoint, type ThrowKind } from './Kubotz';

/**
 * TEMPORARY (debug comparison): the classic move tables, as on dev before the
 * Smash moves, for the move list's Classic / SSB toggle. Remove once the moves
 * are settled.
 */

function bladePoints(): PartPoint[] {
  const { sword: t, swordBase: b } = PART_TIPS;
  return [0.25, 0.5, 0.75, 1].map((f) => ({ file: SWORD_FILE, x: b.x + (t.x - b.x) * f, y: b.y + (t.y - b.y) * f }));
}

const FISTS: PartPoint[] = [{ file: 'arms/hand.png', x: 36, y: 53 }, { file: 'arms/hand-sha.png', x: 34, y: 34 }];
/** The fists with the fire gauntlet on (the forward smash swaps the hand image). */
const FIRE_FISTS: PartPoint[] = [...FISTS, { file: 'arms/fire-fist.png', x: 36, y: 53 }];
const FEET: PartPoint[] = [{ file: 'feet/foot.png', x: 21, y: 40 }, { file: 'feet/foot-sha.png', x: 24, y: 45 }];




const LIMBS = [...FISTS, ...FEET];

/**
 * The unarmed ground combo: three presses chain a palm strike, a spinning
 * back fist and a jumping spin kick. The first two push lightly and stun
 * briefly so the next hit connects; the kick launches.
 */
export const CLASSIC_COMBO: Move[] = [
  { anim: 'jab', ms: 260, points: FISTS, damage: 3, launch: { knockback: 3, angle: 15, stun: 280 }, active: [0.3, 0.72] },
  { anim: 'cross', ms: 360, points: FISTS, damage: 4, launch: { knockback: 4, angle: 20, stun: 340 }, active: [0.4, 0.8], all: true },
  { anim: 'kick', ms: 460, points: FEET, damage: 6, launch: { knockback: 13, angle: 55 }, active: [0.34, 0.76], all: true, ghosts: true },
];
export const CLASSIC_SWORD_COMBO: Move[] = [
  { anim: 'slash1', ms: 320, points: bladePoints(), damage: 6, launch: { knockback: 4, angle: 25, stun: 300 }, active: [0.36, 0.78] },
  { anim: 'slash2', ms: 340, points: bladePoints(), damage: 7, launch: { knockback: 5, angle: 35, stun: 320 }, active: [0.28, 0.66] },
  { anim: 'slash3', ms: 420, points: bladePoints(), damage: 10, launch: { knockback: 15, angle: 35 }, active: [0.35, 0.8], ghosts: true },
];
/** Directional moves (SSB): dash attack, tilts, smashes (charged) and the five aerials. */
export const CLASSIC_DIR_MOVES: DirMoves = {
  dash: { anim: 'dash', ms: 420, points: FEET, damage: 7, launch: { knockback: 11, angle: 40 }, active: [0.22, 0.72], ghosts: true },
  ftilt: { anim: 'ftilt', ms: 380, points: FEET, damage: 6, launch: { knockback: 10, angle: 30 }, active: [0.32, 0.7] },
  dtilt: { anim: 'dtilt', ms: 340, points: FEET, damage: 5, launch: { knockback: 9, angle: 80 }, active: [0.3, 0.72] },
  utilt: { anim: 'utilt', ms: 340, points: FISTS, damage: 6, launch: { knockback: 10, angle: 88 }, active: [0.36, 0.72] },
  usmash: { anim: 'usmash', ms: 520, points: [FEET[0]], damage: 13, launch: { knockback: 16, angle: 88 }, active: [0.4, 0.68], ghosts: true },
  fsmash: { anim: 'fsmash', ms: 560, points: FIRE_FISTS, damage: 14, launch: { knockback: 17, angle: 32 }, active: [0.42, 0.66], maps: ['gauntlet_fireGauntlet'], ghosts: true },
  dsmash: { anim: 'dsmash', ms: 480, points: FEET, damage: 11, launch: { knockback: 14, angle: 28 }, active: [0.36, 0.7], all: true, both: true },
  nair: { anim: 'nair', ms: 420, points: LIMBS, damage: 7, launch: { knockback: 9, angle: 40 }, active: [0.2, 0.75], all: true, ghosts: true },
  fair: { anim: 'fair', ms: 420, points: FEET, damage: 9, launch: { knockback: 11, angle: 30 }, active: [0.25, 0.72], ghosts: true },
  bair: { anim: 'bair', ms: 440, points: FEET, damage: 10, launch: { knockback: 14, angle: 35 }, active: [0.25, 0.72], behind: true },
  uair: { anim: 'uair', ms: 480, points: FEET, damage: 8, launch: { knockback: 12, angle: 85 }, active: [0.2, 0.62], ghosts: true },
  dair: { anim: 'airKick', ms: 420, points: FEET, damage: 8, launch: { knockback: 10, angle: -70 }, active: [0.35, 1], ghosts: true },
};
export const CLASSIC_SWORD_DIR_MOVES: DirMoves = {
  dash: { anim: 'slash3', ms: 420, points: bladePoints(), damage: 9, launch: { knockback: 13, angle: 35 }, active: [0.35, 0.8], ghosts: true },
  ftilt: { anim: 'sftilt', ms: 420, points: bladePoints(), damage: 8, launch: { knockback: 11, angle: 30 }, active: [0.3, 0.72], ghosts: true },
  dtilt: { anim: 'sdtilt', ms: 380, points: bladePoints(), damage: 6, launch: { knockback: 9, angle: 75 }, active: [0.3, 0.72] },
  utilt: { anim: 'susmash', ms: 400, points: bladePoints(), damage: 7, launch: { knockback: 10, angle: 85 }, active: [0.38, 0.75] },
  usmash: { anim: 'susmash', ms: 560, points: bladePoints(), damage: 15, launch: { knockback: 17, angle: 85 }, active: [0.4, 0.72], ghosts: true },
  fsmash: { anim: 'sfsmash', ms: 600, points: bladePoints(), damage: 16, launch: { knockback: 18, angle: 40 }, active: [0.42, 0.68], ghosts: true },
  dsmash: { anim: 'sdsmash', ms: 520, points: bladePoints(), damage: 12, launch: { knockback: 14, angle: 25 }, active: [0.3, 0.75], both: true, ghosts: true },
  nair: { anim: 'snair', ms: 420, points: bladePoints(), damage: 7, launch: { knockback: 9, angle: 40 }, active: [0.2, 0.75], both: true, ghosts: true },
  fair: { anim: 'slash2', ms: 360, points: bladePoints(), damage: 7, launch: { knockback: 10, angle: 40 }, active: [0.28, 0.66] },
  bair: { anim: 'sbair', ms: 440, points: bladePoints(), damage: 9, launch: { knockback: 13, angle: 35 }, active: [0.25, 0.72], behind: true },
  uair: { anim: 'suair', ms: 480, points: bladePoints(), damage: 8, launch: { knockback: 11, angle: 85 }, active: [0.2, 0.62], ghosts: true },
  dair: { anim: 'sdair', ms: 420, points: bladePoints(), damage: 9, launch: { knockback: 10, angle: -70 }, active: [0.3, 1], ghosts: true },
};
/**
 * Special moves (B), unarmed whatever the weapon: Captain Falcon flavoured
 * ninja moves. The up special leaves the robot helpless until it lands or
 * catches a ledge; the side and up specials work once per trip in the air.
 */
export const CLASSIC_SPECIALS = {
  ion: { anim: 'ionPunch', ms: 900, points: FIRE_FISTS, damage: 22, launch: { knockback: 19, angle: 35 }, active: [0.6, 0.78], maps: ['gauntlet_fireGauntlet'], ghosts: true },
  raptor: { anim: 'raptor', ms: 560, points: FIRE_FISTS, damage: 9, launch: { knockback: 13, angle: 80 }, active: [0.2, 0.78], maps: ['gauntlet_fireGauntlet'], ghosts: true, burst: [22, null], sustain: 0.5 },
  raptorAir: { anim: 'raptor', ms: 560, points: FIRE_FISTS, damage: 10, launch: { knockback: 12, angle: -55 }, active: [0.2, 0.78], maps: ['gauntlet_fireGauntlet'], ghosts: true, burst: [18, 1], sustain: 0.5 },
  dive: { anim: 'shadowDive', ms: 640, points: FISTS, damage: 9, launch: { knockback: 12, angle: 78 }, active: [0.08, 0.55], ghosts: true, burst: [4, -20], sustain: 0.25 },
  kick: { anim: 'dash', ms: 560, points: FEET, damage: 12, launch: { knockback: 14, angle: 38 }, active: [0.12, 0.72], ghosts: true, burst: [22, null], sustain: 0.55 },
  kickAir: { anim: 'airKick', ms: 520, points: FEET, damage: 13, launch: { knockback: 13, angle: 45 }, active: [0.05, 1], ghosts: true, burst: [16, 22], sustain: 1 },
} satisfies Record<string, Move>;

export const CLASSIC_THROWS: Record<ThrowKind, { anim: string; ms: number; release: number; damage: number; launch: Launch; dir: 1 | -1 }> = {
  forward: { anim: 'throwF', ms: 440, release: 0.45, damage: 7, launch: { knockback: 13, angle: 40 }, dir: 1 },
  back: { anim: 'throwB', ms: 520, release: 0.55, damage: 8, launch: { knockback: 14, angle: 40 }, dir: -1 },
  up: { anim: 'throwU', ms: 480, release: 0.45, damage: 7, launch: { knockback: 14, angle: 90 }, dir: 1 },
  down: { anim: 'throwD', ms: 480, release: 0.48, damage: 6, launch: { knockback: 10, angle: 75, growth: 0.8 }, dir: 1 },
};
