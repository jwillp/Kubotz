import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { feel } from './Feel';
import { Animator } from '../anim/Animator';
import type { Rig } from '../anim/Rig';
import { ART_SCALE, Kubot2D } from '../anim/Kubot2D';
import { Controller, PadState, emptyPad } from './Input';
import { ActivePowerUp, PowerUpType, POWER_UPS } from './PowerUps';
import { KubotzBody, PhysicsWorld } from '../physics/Physics';
import { vfx } from './Settings';
import { BLACK_TAG, BLACK_TEAM, canHurt, type Teamed } from './Match';
import type { CtfFlag } from './Flag';
import { flagTexture } from '../fx/Flag';
import { emptyStats, type FighterStats } from './Match';
import { makeTagTexture } from '../ui/Type';
import { WORN, surface } from '../fx/Surface';

export type Weapon = 'none' | 'laserGunMkI' | 'laserGunMkII' | 'laserSword';

/** Something an attack can hit. */
export interface Damageable {
  readonly owner: Kubotz; // who it belongs to (itself for a Kubotz); no friendly fire
  hurtbox(): Phaser.Geom.Rectangle;
  isAlive(): boolean;
  /** @param stun ms without control (hitstun), so light combo hits connect. */
  takeDamage(amount: number, attacker: Kubotz, launch: Launch, dirX: 1 | -1): void;
}

/** A point of a body part (Spriter image pixels, origin bottom-left, y up). */
export interface PartPoint { file: string; x: number; y: number; }

export interface AttackBox {
  /** Hit circles, placed every frame on the striking part (fist, foot, blade). */
  circles: Phaser.Geom.Circle[];
  radius: number;
  points: PartPoint[];
  /** One circle on whichever of the points is furthest forward (the striking fist or foot), instead of one on each. */
  striker: boolean;
  /** The strike goes backwards (back air): the furthest-back point strikes. */
  behind: boolean;
  /** A circle on every striking point (spins, splits). */
  all: boolean;
  /** Hits on both sides (down smash): each target is sent away from the attacker. */
  both: boolean;
  damage: number;
  launch: Launch;
  /** Targets already hit by this swing: one hit per target per swing. */
  hit: Set<Damageable>;
}

/** Spriter files of the weapons, and points measured on their images (see BootScene). */
export const SWORD_FILE = 'arms/lazer-sword.png';
export const GUN_FILE = 'arms/gun-mk1.png';
export const PART_TIPS = { sword: { x: 300, y: 230 }, swordBase: { x: 90, y: 60 }, gun: { x: 150, y: 80 } };

/** Points from the sword's hilt to its tip, for the blade hitbox. */
function bladePoints(): PartPoint[] {
  const { sword: t, swordBase: b } = PART_TIPS;
  return [0.25, 0.5, 0.75, 1].map((f) => ({ file: SWORD_FILE, x: b.x + (t.x - b.x) * f, y: b.y + (t.y - b.y) * f }));
}

/** Clips of anim/Clips.ts. */
const ANIM = {
  IDLE: 'idle', RUN: 'run', CROUCH: 'crouch', JUMP: 'jump', FLIP: 'flip', FALL: 'fall', LAND: 'land',
  GUARD: 'guard', DODGE: 'dodge', HIT: 'hit', HIT_2: 'hit2', GRAB: 'grab', SHOOT: 'shoot',
} as const;

/** Strikes carry the Kubot this many times further than their clip's own forward travel. */
const ANIM_TURN = 'turn';
export const ROOT_MOTION_GAIN = 3;
/** Walking (a tilted stick) tops out at this share of the run. */
/**
 * Starting to run on the ground (SSB's initial dash): the Kubot is at its
 * dash speed at once for the first frames (about 10 in Ultimate), then runs.
 * Run, dash, walk, air and jump speeds come from the feel preset (game/Feel.ts).
 */
const INITIAL_DASH_MS = 160;
/** Letting go on the ground: stops from full speed in about 0.3 s (Ultimate: ~20 frames of traction). */
const GROUND_FRICTION = 60;
/**
 * Input buffer (Ultimate: 9 frames): an attack, special or jump pressed while
 * the Kubot cannot act yet (an attack's end lag, landing, hitstun, a roll)
 * still comes out on the first frame it can.
 */
const INPUT_BUFFER_MS = 150;
/** Shield and a direction pressed within this of each other (either first) roll (6 frames). */
const ROLL_WINDOW_MS = 100;
/** Smash-style jump squat before a grounded jump; let go of jump within it for a short hop of this height. */
const JUMP_SQUAT_MS = 50;
export const SHORT_HOP = 0.68;
/** A taunt's length. */
export const TAUNT_MS = 1000;
/** People jump on the press, so they only need a short guard between jumps. */
const HUMAN_JUMP_COOLDOWN = 140;

/** Front and back fists and feet (the back limbs use the _sha images), near the knuckles and toes. */
const FISTS: PartPoint[] = [{ file: 'arms/hand.png', x: 36, y: 53 }, { file: 'arms/hand-sha.png', x: 34, y: 34 }];
/** The fists with the fire gauntlet on (the forward smash swaps the hand image). */
const FIRE_FISTS: PartPoint[] = [...FISTS, { file: 'arms/fire-fist.png', x: 36, y: 53 }];
const FEET: PartPoint[] = [{ file: 'feet/foot.png', x: 21, y: 40 }, { file: 'feet/foot-sha.png', x: 24, y: 45 }];

/** A strike: its clip, length, striking points, effect, and the part of it (0..1) that hurts. */
/** How a hit sends its target: speed (units/s, before damage growth), launch angle (0 forwards, 90 up), fixed hitstun for combo links. */
export interface Launch { knockback: number; angle: number; growth?: number; stun?: number }

/**
 * A strike: its clip, length, striking points, damage and launch, and the part
 * of it (0..1) that hurts. `all` puts a hit circle on every striking point
 * (spins, splits) instead of the furthest forward one; `both` sends targets
 * away on either side; `maps` swaps parts while it plays (the fire fist);
 * `ghosts` leaves afterimages.
 */
export interface Move {
  anim: string; ms: number; points: PartPoint[]; damage: number; launch: Launch; active: [number, number];
  behind?: boolean; all?: boolean; both?: boolean; maps?: string[]; ghosts?: boolean;
  /** Specials: a velocity (units/s, x forwards; null keeps that axis) held for the first `sustain` share of the move. */
  burst?: [number | null, number | null]; sustain?: number;
}

/** Attack + direction, Super Smash Bros. style. */
type Dir = 'neutral' | 'forward' | 'back' | 'up' | 'down';
export type DirMoves = Record<'dash' | 'ftilt' | 'dtilt' | 'utilt' | 'fsmash' | 'dsmash' | 'usmash' | 'nair' | 'fair' | 'bair' | 'uair' | 'dair', Move>;

const LIMBS = [...FISTS, ...FEET];

/**
 * The unarmed ground combo: three presses chain a palm strike, a spinning
 * back fist and a jumping spin kick. The first two push lightly and stun
 * briefly so the next hit connects; the kick launches.
 */
export const COMBO: Move[] = [
  { anim: 'jab', ms: 260, points: FISTS, damage: 3, launch: { knockback: 3, angle: 15, stun: 280 }, active: [0.3, 0.72] },
  { anim: 'cross', ms: 360, points: FISTS, damage: 4, launch: { knockback: 4, angle: 20, stun: 340 }, active: [0.4, 0.8], all: true },
  { anim: 'kick', ms: 460, points: FEET, damage: 6, launch: { knockback: 13, angle: 55 }, active: [0.34, 0.76], all: true, ghosts: true },
];
export const SWORD_COMBO: Move[] = [
  { anim: 'slash1', ms: 320, points: bladePoints(), damage: 6, launch: { knockback: 4, angle: 25, stun: 300 }, active: [0.36, 0.78] },
  { anim: 'slash2', ms: 340, points: bladePoints(), damage: 7, launch: { knockback: 5, angle: 35, stun: 320 }, active: [0.28, 0.66] },
  { anim: 'slash3', ms: 420, points: bladePoints(), damage: 10, launch: { knockback: 15, angle: 35 }, active: [0.35, 0.8], ghosts: true },
];
/** Directional moves (SSB): dash attack, tilts, smashes (charged) and the five aerials. */
export const DIR_MOVES: DirMoves = {
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
export const SWORD_DIR_MOVES: DirMoves = {
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
 * ninja moves. The up special leaves the Kubot helpless until it lands or
 * catches a ledge; the side and up specials work once per trip in the air.
 */
export const SPECIALS = {
  ion: { anim: 'ionPunch', ms: 900, points: FIRE_FISTS, damage: 22, launch: { knockback: 19, angle: 35 }, active: [0.6, 0.78], maps: ['gauntlet_fireGauntlet'], ghosts: true },
  raptor: { anim: 'raptor', ms: 560, points: FIRE_FISTS, damage: 9, launch: { knockback: 13, angle: 80 }, active: [0.2, 0.78], maps: ['gauntlet_fireGauntlet'], ghosts: true, burst: [22, null], sustain: 0.5 },
  raptorAir: { anim: 'raptor', ms: 560, points: FIRE_FISTS, damage: 10, launch: { knockback: 12, angle: -55 }, active: [0.2, 0.78], maps: ['gauntlet_fireGauntlet'], ghosts: true, burst: [18, 1], sustain: 0.5 },
  dive: { anim: 'shadowDive', ms: 640, points: FISTS, damage: 9, launch: { knockback: 12, angle: 78 }, active: [0.08, 0.55], ghosts: true, burst: [4, -20], sustain: 0.25 },
  kick: { anim: 'dash', ms: 560, points: FEET, damage: 12, launch: { knockback: 14, angle: 38 }, active: [0.12, 0.72], ghosts: true, burst: [22, null], sustain: 0.55 },
  kickAir: { anim: 'airKick', ms: 520, points: FEET, damage: 13, launch: { knockback: 13, angle: 45 }, active: [0.05, 1], ghosts: true, burst: [16, 22], sustain: 1 },
} satisfies Record<string, Move>;
type SpecialKind = 'neutral' | 'side' | 'up' | 'down';

/** Smash attacks: how long the charge can be held, and what a full charge adds to damage and launch. */
export const SMASH_CHARGE_MS = 1000;
export const SMASH_CHARGE_BONUS = 0.6;
/** A direction pressed this close to the attack press makes it a smash (a flick + attack, like SSB). */
const SMASH_INPUT_MS = 120;
/** Laser gun: a tap fires a light shot; holding charges a bigger one (up to GUN_CHARGE_MS). */
export const GUN_TAP_MS = 160;
export const GUN_CHARGE_MS = 1200;
/** Turning round (ms) on the ground and in the air. */
const TURN_MS = 210;
const AIR_TURN_MS = 140;
/** After a move, how long the next press still continues the combo. */
const COMBO_WINDOW = 260;
/** Rest after the combo's last move. */
const COMBO_RECOVERY = 220;

export interface KubotzLook { head: string | null; color: number; }

/** Helmet shapes, one per Kubot in order (character maps of kubotz.scml). */
export const HEADS: (string | null)[] = [null, 'head_terminator', 'head_bigbuff', 'head_skull',
  'head_diver', 'head_mantis', 'head_sentinel', 'head_tank', 'head_astro', 'head_brute'];
/** The helmet files a recoloured copy is made of (see BootScene.recolor). */
export const HEAD_FILES = ['head/helmet2.png', 'head/helmet3.png', 'head/helmet4.png', 'head/helmet5-grey.png',
  'head/helmet-diver.png', 'head/helmet-mantis.png', 'head/helmet-sentinel.png', 'head/helmet-tank.png', 'head/helmet-astro.png', 'head/helmet-brute.png'];

/** Kubot colours by slot (owner, phase 10d): red, blue, green, purple; humans and CPUs alike. */
export const SLOT_COLORS = [0xed1c24, 0x29abe2, 0x3ccf4e, 0xa155ff];

export const hex = (c: number) => c.toString(16).padStart(6, '0');

/** The texture of a Kubot part in a colour: helmets and the laser blade are recoloured (BootScene), and all of it worn (fx/Surface.ts) unless switched off. */
export function partTexture(textures: Phaser.Textures.TextureManager, file: string, color: number): string {
  let key = `kubotz:${file}`;
  if (HEAD_FILES.includes(file)) key = `head:${hex(color)}:${file}`;
  else if (file === SWORD_FILE) key = `sword:${hex(color)}`;
  if (!textures.exists(key)) key = `kubotz:${file}`;
  return surface.worn && textures.exists(WORN + key) ? WORN + key : key;
}

/** The top corner of a solid block a Kubot can hang from; `dir` is the open side (-1 left, 1 right). */
export interface Ledge { x: number; y: number; dir: 1 | -1; }

export type ThrowKind = 'forward' | 'back' | 'up' | 'down';

/**
 * Melee-style throws: clip, length, when the Kubot is let go (0..1), damage
 * and launch (angle from the horizontal, towards `dir` relative to facing).
 */
export const THROWS: Record<ThrowKind, { anim: string; ms: number; release: number; damage: number; launch: Launch; dir: 1 | -1 }> = {
  forward: { anim: 'throwF', ms: 440, release: 0.45, damage: 7, launch: { knockback: 13, angle: 40 }, dir: 1 },
  back: { anim: 'throwB', ms: 520, release: 0.55, damage: 8, launch: { knockback: 14, angle: 40 }, dir: -1 },
  up: { anim: 'throwU', ms: 480, release: 0.45, damage: 7, launch: { knockback: 14, angle: 90 }, dir: 1 },
  down: { anim: 'throwD', ms: 480, release: 0.48, damage: 6, launch: { knockback: 10, angle: 75, growth: 0.8 }, dir: 1 },
};

/** Melee frame data, at 60 frames a second. */
const FRAME = 1000 / 60;
const GRAB_HOLD_FRAMES = 76; // a grab at 0 %...
const GRAB_HOLD_PER_DAMAGE = 1.6; // ...plus 1.6 frames per % (read in 5 % steps)
const GRAB_MASH_FRAMES = 6; // each mash takes 6 frames off
const GRAB_RELEASE_LAG = 29 * FRAME; // both stuck after a grab release
const GRAB_WHIFF_LAG = 480; // a missed grab
export const PUMMEL_MS = 380;
export const PUMMEL_DAMAGE = 3;
const LEDGE_CATCH = 7 * FRAME; // options open after the catch
export const LEDGE_INTANGIBLE = 37 * FRAME; // the catch plus 30 frames
const LEDGE_REGRAB = 480; // after letting go
/** Damage from which the ledge get-ups are slower (Melee: 100 %, but our Kubotz die at 100). */
const LEDGE_SLOW_DAMAGE = 60;
/** Where the body hangs below a ledge, so the raised hands are on its top. */
export const HANG_DY = 1.32 * UNIT;
export const HANG_DX = 0.52 * UNIT;
/** Ledge get-ups (ms, below LEDGE_SLOW_DAMAGE): climb, roll in, and the attack (the climb is 55% of it, then the kick); how far in they end (units). */
export const LEDGE_GETUP_MS = { climb: 550, roll: 700, attack: 750 } as const;
export const LEDGE_INWARD = { climb: 0.7, roll: 2.6, attack: 0.7 } as const;
/** The get-up attack: the forward tilt's kick with its own damage and launch. */
export const LEDGE_ATTACK = { damage: 6, launch: { knockback: 10, angle: 25 } as Launch };

/** Callbacks into the arena, so the actor stays free of scene plumbing. */
export interface ArenaHooks {
  /** @param size bolt scale (1 = normal), @param power its push. */
  fireBullet(shooter: Kubotz, damage: number, speed: number, size?: number, power?: number): void;
  now(): number; // the match clock: stops while paused
  playSfx(key: string, volume?: number): void;
  /** Picks up a power-up ball in the area; true if one was taken. */
  tryGrab(kubotz: Kubotz, area: Phaser.Geom.Circle): boolean;
  /** An opponent in grab reach in front of this Kubot, or null. */
  grabTarget(kubotz: Kubotz): Kubotz | null;
  /** A free ledge the Kubot's hands can catch right now, or null. */
  ledgeNear(kubotz: Kubotz): Ledge | null;
  /** A grab, pummel or throw landing: sparks and a sound. */
  grabFx(x: number, y: number, color: number, power: number): void;
  /** Camera shake (0..1). */
  shake(amount: number): void;
  dust(x: number, y: number): void;
  runDust(x: number, y: number, dir: number): void;
  /** Jumping off or landing: the subtle dust of a change of direction, to both sides. */
  footDust(x: number, y: number): void;
  airJump(x: number, y: number, color: number): void;
  /** A hit that got through (for the post-match highlights): launch speed in units/s (0 for a light combo hit), angle in degrees. */
  landed?(victim: Kubotz, attacker: Kubotz, damage: number, chained: boolean, healthBefore: number, speed: number, angle: number): void;
}

/**
 * The playable Kubot (KubotzFactory + Running/Jump/Melee/Grab/Gun/LaserSword/
 * PowerUps/Respawn components and systems, folded into one class).
 */
export class Kubotz implements Damageable, Teamed {
  readonly owner = this;
  /** Faction (index into SLOT_COLORS): Kubotz on the same team can't hurt each other (see canHurt). */
  readonly team: number;
  readonly body: KubotzBody;
  readonly anim: Animator;
  readonly model: Kubot2D;
  private squashUntil = 0;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly tag: Phaser.GameObjects.Image;
  /** Texture of the player tag (P1, P2... or CPU, in the Kubot's colour), for the HUD and results. */
  readonly tagKey: string;
  readonly look: KubotzLook;

  facing: 1 | -1 = -1; // PhysicsComponent default direction is LEFT
  health: number = Config.KUBOTZ_HEALTH;
  energy: number = Config.KUBOTZ_ENERGY;
  lives: number = Config.NB_LIVES;
  kills = 0;
  deaths = 0;
  weapon: Weapon = 'none';
  /** The weapon it always holds (the Blasters and Blades modes): back after a weapon power-up and at each respawn. */
  armed: Weapon = 'none';
  /** The health it spawns with (Horde's weaker black-team Kubotz start lower). */
  maxHealth: number = Config.KUBOTZ_HEALTH;
  /** Capture the Flag: the flag it holds (swung with the sword's moves), and its job on a CPU team. */
  carrying: CtfFlag | null = null;
  role?: 'striker' | 'guardian' | 'interceptor';
  /** Damage taken is multiplied by this (Capture the Flag: Kubotz go down much faster than in a duel). */
  damageScale = 1;
  shield = 0;
  powerUps: ActivePowerUp[] = [];
  lastAttacker: { by: Kubotz; at: number } | null = null;
  /** Numbers for the results screen (phase 11 D). */
  readonly stats: FighterStats = emptyStats();
  /** Hits taken in the current combo (each one landing before the last one's hitstun wore off). */
  private comboTaken = 0;
  /** Won the match: no more controls, the victory dance once on the ground. */
  celebrating = false;

  private jumps = 0;
  maxJumps: number = Config.NB_JUMPS;
  private jumpReadyAt = 0;
  private jumpHeld = false;
  /** A grounded jump leaves at this time (the jump squat), 0 when none is coming. */
  private jumpSquatUntil = 0;
  private attack: AttackBox | null = null;
  private attackEndsAt = 0;
  private attackStart = 0;
  private attackActive: [number, number] = [0, 1];
  private attackReadyAt = 0;
  /** Index in COMBO of the next move, the time it can still follow, and a press buffered during a move. */
  private comboStep = 0;
  private comboUntil = 0;
  private comboQueued = false;
  private inCombo = false; // the current move is part of the ground combo
  private landUntil = 0;
  private hitAnim: string = ANIM.HIT;
  private grabAnimUntil = 0;
  private grabEndsAt = 0;
  private grabReadyAt = 0;
  guard: number = Config.GUARD_MAX;
  guarding = false;
  stunnedUntil = 0;
  /**
   * A dodge under way: the air dodge, or the roll on the ground (guard + left /
   * right). Intangible from `safeFrom` to `safeUntil`, no other actions until
   * `ends`; a roll travels in `dir` and passes through Kubotz.
   */
  private dodge: { kind: 'air' | 'roll'; dir: -1 | 0 | 1; start: number; safeFrom: number; safeUntil: number; ends: number; turned?: boolean } | null = null;
  private rollReadyAt = 0;
  /** The left / right held last frame (a newly pressed one, with the guard, rolls). */
  private guardDir = 0;
  private dropUntil = 0;
  private prevDown = false;
  private fastFalling = false;
  private landedAt = 0;
  private dodgeReady = true;
  private guardHeld = false;
  /** The foot on the ground in the last drawn run frame (a change = a footfall). */
  private plantedFoot = '';
  private lastStepAt = 0;
  private shootingUntil = 0;
  private hitUntil = 0;
  private flashUntil = 0;
  /** Hitstun from light combo hits (no control, unlike a guard break it shows no wobble). */
  private hitstunUntil = 0;
  /** Tumbling (big hit): no control, bounces off walls and ceilings, lands in a knockdown. */
  private tumbleUntil = 0;
  private knockdownUntil = 0;
  private floorBounced = false;
  private prevVx = 0;
  private prevVy = 0;
  private turnUntil = 0;
  private lastJumpAt = 0;
  /** Drawn yaw (degrees, 0 faces right, 180 left), eased through each turn. */
  private yaw = 180;
  private turnFrom = 180;
  private yawTo = 180;
  private turnAt = -1e9;
  private turnMs = TURN_MS;
  private drawnFacing: 1 | -1 = -1;
  private nextGhostAt = 0;
  /** Input edges, for smash flicks and charging. */
  private attackHeld = false;
  /** Input buffer: when attack, special and jump were last pressed (see INPUT_BUFFER_MS), and whether they were held. */
  private pressedAt = { attack: -1e9, special: -1e9, jump: -1e9 };
  private rawHeld = { attack: false, special: false, jump: false };
  /** The initial dash lasts until then. */
  private dashUntil = 0;
  /** For the roll window: when the guard was pressed and when the held direction was. */
  private guardPressedAt = -1e9;
  private dirPressedAtGround = -1e9;
  private specialHeld = false;
  /** After the up special: no jumps, attacks or specials until landing or a ledge. */
  helpless = false;
  /** The side and up specials, once per trip in the air. */
  private sideSpecialUsed = false;
  private upSpecialUsed = false;
  private attackPressedAt = -1e9;
  private dirPressedAt = -1e9;
  private prevPad: PadState = emptyPad();
  /** A smash being charged (rooted), and since when. */
  private charging: Move | null = null;
  private chargeStart = 0;
  private chargeDir: 1 | -1 = 1;
  /** A laser shot being charged (attack held), and since when. */
  private gunChargeStart = -1;
  private currentMove: Move | null = null;
  private facingBefore: 1 | -1 = -1;
  private wasGrounded = false;
  private dead = false;
  respawnAt = 0;
  /** Materializing in the spawn hologram (fx/Hologram.ts): held in the beam, no controls, intangible, until then. */
  materializeUntil = 0;
  /** The match intro: not shown at all (no tag either) until its spawn starts. */
  appearAt = 0;
  eliminated = false;
  pad: PadState = emptyPad();
  /** Melee grabs: the Kubot this one holds, or the one holding it. */
  holding: Kubotz | null = null;
  heldBy: Kubotz | null = null;
  /** While held: time left before breaking out (ms). */
  private holdLeft = 0;
  private ghosted = false;
  private mashPrev: PadState = emptyPad();
  private pummelUntil = 0;
  private pummelStunUntil = 0;
  private throwing: { kind: ThrowKind; start: number; releaseAt: number } | null = null;
  /** After a grab release, a whiffed grab or a throw: no actions until then. */
  private lockUntil = 0;
  /** Ledges: the one hung from, when it was caught, when it was let go. */
  ledge: Ledge | null = null;
  private ledgeAt = 0;
  private ledgeLetGoAt = -1e9;
  private ledgeSafeUntil = 0;
  private ledgePrev: PadState = emptyPad();
  /** Climbing up from a ledge (normal, roll or attack get-up) along a path. */
  private climb: { kind: 'climb' | 'roll' | 'attack'; ledge: Ledge; start: number; ms: number; x0: number; y0: number; x1: number; y1: number } | null = null;

  constructor(
    private scene: Phaser.Scene,
    readonly index: number,
    readonly controller: Controller,
    color: number,
    private readonly rig: Rig,
    x: number,
    y: number,
    private hooks: ArenaHooks,
    physics: PhysicsWorld,
    /** Faction (same team = no damage; defaults to its own slot) and helmet (index into HEADS; defaults by slot). */
    opts: { team?: number; helmet?: number } = {},
  ) {
    this.body = new KubotzBody(physics, x, y);
    this.team = opts.team ?? index;

    this.anim = new Animator(rig);
    this.look = { head: HEADS[(opts.helmet ?? index) % HEADS.length], color };
    // Helmets and the laser blade are painted in the player's colour.
    // A flag carrier holds the flag where the laser sword goes.
    this.model = new Kubot2D(scene, rig, (file) => (file === SWORD_FILE && this.carrying
      ? flagTexture(scene, this.carrying.color) : partTexture(scene.textures, file, color)));
    // A soft outer glow in the player's colour, so Kubotz stay apart in a close fight (WebGL only).
    this.model.view.postFX?.addGlow(color, 0.7, 0, false, 0.1, 6);
    this.healthBar = scene.add.graphics().setDepth(20);
    // The P1 / P2 / P3 / P4 / CPU arrow label floats above the Kubot.
    const who = controller.label === 'CPU' ? 'CPU' : controller.name ?? controller.label;
    // The black team's tag is a light steel, so it reads over the dark arenas.
    const tagColor = this.team === BLACK_TEAM ? BLACK_TAG : color;
    this.tagKey = `label-${who}:${hex(tagColor)}`;
    if (!scene.textures.exists(this.tagKey)) makeTagTexture(scene, this.tagKey, who, tagColor);
    this.tag = scene.add.image(x, y, this.tagKey).setOrigin(0.5, 1).setDepth(21);
  }

  /** Winding up, striking or recovering (a CPU can see it coming). */
  get attacking(): boolean { return this.attack !== null; }

  /** The middle of the laser blade (world pixels), for its light. */
  /** The laser blade's emitter and tip (world pixels), while the sword is out. */
  blade(): { x1: number; y1: number; x2: number; y2: number } | null {
    if (this.weapon !== 'laserSword' || !this.isAlive() || this.carrying) return null;
    const a = this.model.pointOn(SWORD_FILE, 96, 68);
    const b = this.model.pointOn(SWORD_FILE, 298, 216);
    return a && b ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y } : null;
  }

  bladeMiddle(): { x: number; y: number } {
    const { sword: t, swordBase: b } = PART_TIPS;
    return this.model.pointOn(SWORD_FILE, (t.x + b.x) / 2, (t.y + b.y) / 2) ?? { x: this.x, y: this.body.top };
  }

  /** For the debug view. */
  get hitstun(): number { return this.hitstunUntil; }
  get comboInfo(): string { return this.inCombo ? `${this.comboStep || 3}/3${this.comboQueued ? '+' : ''}` : '-'; }

  get name(): string { return this.controller.name ?? (this.controller.label === 'CPU' ? `CPU ${this.index + 1}` : this.controller.label); }
  get x(): number { return this.body.x; }
  get y(): number { return this.body.y; }
  get grounded(): boolean { return this.body.grounded; }
  get invincible(): boolean { return this.powerUps.some((p) => p.type === 'invincibility'); }
  /** Dodging (air dodge, roll) or catching a ledge: attacks and bullets pass through. */
  get intangible(): boolean {
    const now = this.hooks.now();
    const d = this.dodge;
    return (!!d && now >= d.safeFrom && now < d.safeUntil) || now < this.ledgeSafeUntil || now < this.materializeUntil;
  }
  /** In an air dodge or a roll (including its end lag). */
  get dodging(): boolean { return !!this.dodge && this.hooks.now() < this.dodge.ends; }
  /** Rolling on the ground (CPUs read it). */
  get rolling(): boolean { return this.dodging && this.dodge!.kind === 'roll'; }
  /** On a ledge or climbing up from one. */
  get onLedge(): boolean { return this.ledge !== null || this.climb !== null; }
  /** The ledge hung from or being climbed (for edge hogging). */
  get ledgeHeld(): Ledge | null { return this.ledge ?? this.climb?.ledge ?? null; }
  /** Grabbing, held or throwing: CPUs read it. */
  get grabbing(): boolean { return this.holding !== null || this.throwing !== null; }
  isAlive(): boolean { return !this.dead; }

  /** The physics body plus the head and shoulders drawn above it, so blows that look like they land do. */
  hurtbox(): Phaser.Geom.Rectangle {
    const extra = this.body.height * 0.4;
    return new Phaser.Geom.Rectangle(this.body.left, this.body.top - extra, this.body.width, this.body.height + extra);
  }

  /** The active melee / sword hitbox, if any, on the striking part of the Kubot. */
  currentAttack(): AttackBox | null {
    const a = this.attack;
    if (!a) return null;
    // Only the strike itself hurts, not the wind-up or the recovery.
    const t = (this.hooks.now() - this.attackStart) / (this.attackEndsAt - this.attackStart);
    if (t < this.attackActive[0] || t > this.attackActive[1]) return null;
    const at = a.points.map((p) => this.model.pointsOn(p.file, p.x, p.y));
    // The fists (or feet): the striking one is the one furthest forward.
    const dir = this.facing * (a.behind ? -1 : 1);
    const placed = a.striker ? [at.flat().sort((u, v) => dir * (v.x - u.x))[0]] : a.all ? at.flat() : at.map((l) => l[0]);
    a.circles = placed
      .filter((p): p is { x: number; y: number } => !!p)
      .map((p) => new Phaser.Geom.Circle(p.x, p.y, a.radius));
    // Before the first pose (or if the part is hidden), fall back to the reach in front.
    if (a.circles.length === 0) a.circles = [new Phaser.Geom.Circle(this.x + dir * 0.75 * UNIT, this.y, a.radius)];
    return a;
  }

  /**
   * The swing as it sweeps (from just before the active frames to their end):
   * the striking point and a point nearer the body, for the smear behind it.
   */
  swingArc(): { ox: number; oy: number; ix: number; iy: number } | null {
    const a = this.attack;
    if (!a) return null;
    const t = (this.hooks.now() - this.attackStart) / (this.attackEndsAt - this.attackStart);
    if (t < this.attackActive[0] - 0.12 || t > this.attackActive[1]) return null;
    const sword = a.points[0]?.file === SWORD_FILE;
    if (sword) {
      const { sword: tip, swordBase: base } = PART_TIPS;
      const o = this.model.pointOn(SWORD_FILE, tip.x, tip.y);
      const i = this.model.pointOn(SWORD_FILE, base.x, base.y);
      return o && i ? { ox: o.x, oy: o.y, ix: i.x, iy: i.y } : null;
    }
    const pts = a.points.flatMap((p) => this.model.pointsOn(p.file, p.x, p.y));
    if (pts.length === 0) return null;
    // The striking limb: the one furthest from the body's middle.
    const cx = this.x;
    const cy = this.y;
    const o = pts.reduce((best, q) => (Math.hypot(q.x - cx, q.y - cy) > Math.hypot(best.x - cx, best.y - cy) ? q : best));
    return { ox: o.x, oy: o.y, ix: cx + (o.x - cx) * 0.45, iy: cy + (o.y - cy) * 0.45 };
  }

  /** 0..1 while a smash or a laser shot charges, else -1 (for effects). */
  get charge(): number {
    const now = this.hooks.now();
    if (this.charging) return Math.min(1, (now - this.chargeStart) / SMASH_CHARGE_MS);
    if (this.gunChargeStart >= 0 && now - this.gunChargeStart > GUN_TAP_MS) return Math.min(1, (now - this.gunChargeStart - GUN_TAP_MS) / GUN_CHARGE_MS);
    return -1;
  }

  /** Where the laser leaves the gun barrel (world pixels). */
  muzzle(): { x: number; y: number } {
    const tip = this.model.pointOn(GUN_FILE, PART_TIPS.gun.x, PART_TIPS.gun.y);
    return tip ?? { x: this.x + this.facing * UNIT * 1.1, y: this.y - UNIT * 0.15 };
  }

  /** @param controls false during the countdown and while stunned. */
  update(now: number, dt: number, controls = true): void {
    if (this.dead) { this.healthBar.clear(); return; }
    if (now < this.materializeUntil) { this.pad = emptyPad(); this.body.enable = false; return; }
    if (!this.body.enable) this.body.enable = true; // let go by the spawn hologram: it drops
    const read = this.controller.read();
    // Buffered presses, for people (not while shielding: no attacks out of shield).
    const buffers = this.controller.label !== 'CPU';
    for (const k of ['attack', 'special', 'jump'] as const) {
      const down = !!read[k];
      if (down && !this.rawHeld[k] && buffers && controls && !this.guarding) this.pressedAt[k] = now;
      this.rawHeld[k] = down;
    }
    const pad = this.pad = controls && !this.celebrating && now >= this.stunnedUntil && now >= this.hitstunUntil ? read : emptyPad();
    this.facingBefore = this.facing;
    // Grabs and ledges take over the controls while they last.
    if (this.dodge && now >= this.dodge.ends) this.dodge = null;
    // Passing through Kubotz (held, thrown, rolling) lasts until clear of them.
    if (!this.heldBy && this.ghosted && !this.rolling && !this.body.overlapsKubot()) { this.body.ghost = false; this.ghosted = false; }
    if (this.heldBy) { this.updateHeld(now, dt, controls ? read : emptyPad()); this.updatePowerUps(now); return; }
    if (this.holding || this.throwing) { this.updateHolding(now, pad); this.updatePowerUps(now); return; }
    if (this.onLedge) { this.updateLedge(now, pad); this.updatePowerUps(now); return; }
    if (now < this.lockUntil) {
      // Grab release or a missed grab: sliding to a stop, no actions (the grab still reaches out).
      this.move(emptyPad(), now, dt);
      this.grabWindow(now);
      this.updatePowerUps(now);
      return;
    }
    this.updateGuard(pad, now, dt);
    if (this.guarding) {
      // Guarding roots the Kubot: no running, jumping or attacking.
      this.move(emptyPad(), now, dt);
    } else if (this.charging) {
      // Charging a smash: rooted, sliding to a stop.
      this.move(emptyPad(), now, dt);
      this.act(pad, now);
    } else if (this.dodging) {
      this.updateDodge(now, dt);
    } else {
      this.move(pad, now, dt);
      this.act(pad, now);
    }
    this.updateSpecial(now);
    // Heavy on the way down: past the apex gravity pulls much harder, up to a
    // terminal speed (the fast-fall speed when fast-falling). Hitstun and the
    // specials' bursts keep their speed (spikes, dive kicks), easing back after.
    const f = feel();
    // The feel's gravity, over the world's (which every body falls under).
    if (!this.grounded && !this.dodging) this.body.vy += (f.gravity - Config.GRAVITY) * UNIT * dt;
    if (!this.grounded && this.body.vy > 0 && !this.dodging) {
      this.body.vy += (f.fallGravity - f.gravity) * UNIT * dt;
      const cap = (this.fastFalling ? f.fastFall : f.fall) * UNIT;
      if (this.body.vy > cap && now >= this.hitstunUntil && !this.currentMove?.burst) {
        this.body.vy = Math.max(cap, this.body.vy - 90 * UNIT * dt);
      }
    }
    // Falling past a ledge catches it (not while holding down, attacking or tumbling).
    if (!this.grounded && this.body.vy >= 0 && !pad.down && !this.attack && !this.charging && !this.tumbling
      && now >= this.hitstunUntil && !this.dodging && now - this.ledgeLetGoAt > LEDGE_REGRAB) {
      const ledge = this.hooks.ledgeNear(this);
      if (ledge) { this.grabLedge(ledge, now); return; }
    }
    // Strikes carry the Kubot forwards with their motion (root motion).
    const travel = this.anim.takeRootMotion() * ART_SCALE * ROOT_MOTION_GAIN;
    if (this.attack && travel > 0 && dt > 0) {
      this.body.vx = this.facing * Math.min(travel / dt, 26 * UNIT);
    }
    this.updateTumble(now);
    this.prevVx = this.body.vx;
    this.prevVy = this.body.vy;
    this.updatePowerUps(now);
  }

  /** Tumbling Kubotz rebound off walls and ceilings and bounce once on the floor (SSB). */
  private updateTumble(now: number): void {
    if (!this.tumbling) return;
    const b = this.body;
    const wall = b.wall;
    if (wall !== 0 && Math.sign(this.prevVx) === wall && Math.abs(this.prevVx) > 5 * UNIT) {
      b.setVelocity(-this.prevVx * Config.WALL_BOUNCE, b.vy);
      this.bounce(now, b.x + wall * b.width / 2, b.y);
    } else if (b.ceiling && this.prevVy < -5 * UNIT) {
      b.setVelocity(b.vx, -this.prevVy * Config.WALL_BOUNCE);
      this.bounce(now, b.x, b.top);
    } else if (b.grounded && this.prevVy > 7 * UNIT && !this.floorBounced) {
      this.floorBounced = true;
      b.setVelocity(b.vx * 0.8, -this.prevVy * 0.45);
      this.bounce(now, b.x, b.bottom);
    } else if (b.grounded && Math.abs(b.vy) < 2 * UNIT && now >= this.knockdownUntil) {
      // Down on the floor: a moment to get up.
      this.knockdownUntil = now + 450;
      this.hitstunUntil = Math.max(this.hitstunUntil, this.knockdownUntil);
      this.tumbleUntil = 0;
      this.anim.play('knockdown', { restart: true, ms: 450, fade: 60 });
    }
  }

  private bounce(now: number, x: number, y: number): void {
    this.hooks.dust(x, y);
    this.hooks.shake(0.18);
    this.hooks.playSfx('punch', 0.3);
    this.hitstunUntil += 120;
    this.tumbleUntil = this.hitstunUntil;
    this.flashUntil = now + 60;
  }

  /** For the CPU: air jumps left, and whether the up and side specials can be used now. */
  get airJumpsLeft(): number { return this.maxJumps - this.jumps; }
  get canUpSpecial(): boolean { return !this.upSpecialUsed && !this.helpless; }
  get canSideSpecial(): boolean { return (this.grounded || !this.sideSpecialUsed) && !this.helpless; }

  get tumbling(): boolean { return this.hooks.now() < this.tumbleUntil; }

  /** Super Smash Bros.-style shield: hold to raise a bubble that soaks hits. */
  private updateGuard(pad: PadState, now: number, dt: number): void {
    const pressed = pad.guard && !this.guardHeld;
    this.guardHeld = pad.guard;
    if (this.grounded) this.dodgeReady = true;
    const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
    const newDir = dx !== 0 && dx !== this.guardDir;
    this.guardDir = dx;
    if (pressed) this.guardPressedAt = now;
    if (newDir) this.dirPressedAtGround = now;
    if (this.dodging) {
      // Mid-dodge: the guard comes back up after it if still held.
      this.guarding = false;
      this.guard = Math.min(Config.GUARD_MAX, this.guard + Config.GUARD_REGEN * dt);
      return;
    }
    // Guard + left / right on the ground (a direction pressed with the guard up,
    // or both at once; running into a guard just guards): the dodge roll, the
    // ground version of the air dodge.
    // Either order counts within ROLL_WINDOW_MS: a direction then the guard, or the guard then a direction.
    const rollInput = (newDir && (this.guarding || now - this.guardPressedAt <= ROLL_WINDOW_MS))
      || (pressed && dx !== 0 && now - this.dirPressedAtGround <= ROLL_WINDOW_MS);
    if (pad.guard && rollInput && this.grounded && now >= this.rollReadyAt && !this.helpless) {
      this.startRoll(dx > 0 ? 1 : -1, now);
      return;
    }
    // Guard in the air: air dodge in the held direction, intangible for a moment.
    if (pressed && !this.grounded && this.dodgeReady && !this.guarding && !this.helpless) {
      this.dodgeReady = false;
      this.dodge = { kind: 'air', dir: dx as -1 | 0 | 1, start: now, safeFrom: now, safeUntil: now + Config.AIR_DODGE_DURATION, ends: now + Config.AIR_DODGE_DURATION };
      this.attack = null;
      const dy = (pad.down ? 1 : 0) - (pad.up ? 1 : 0);
      const len = Math.hypot(dx, dy) || 1;
      this.body.setVelocity((dx / len) * Config.AIR_DODGE_SPEED * UNIT, (dy / len) * Config.AIR_DODGE_SPEED * UNIT);
      this.hooks.playSfx('dodge', 0.3);
      this.anim.play(ANIM.DODGE, { restart: true, ms: Config.AIR_DODGE_DURATION, fade: 40 });
    }
    if (pad.guard && this.grounded && (this.guarding || this.guard >= Config.GUARD_MIN_RAISE)) {
      if (!this.guarding) this.attack = null;
      this.guarding = true;
      this.guard = Math.max(0, this.guard - Config.GUARD_DRAIN * dt);
      if (this.guard <= 0) this.breakGuard();
    } else {
      this.guarding = false;
      this.guard = Math.min(Config.GUARD_MAX, this.guard + Config.GUARD_REGEN * dt);
    }
  }

  /** The dodge roll: a quick tucked roll a fixed distance, intangible and through Kubotz, then a short end lag. */
  private startRoll(dir: 1 | -1, now: number): void {
    this.guarding = false;
    this.attack = null;
    this.currentMove = null;
    this.comboStep = 0;
    this.jumpSquatUntil = 0;
    const ends = now + Config.ROLL_DURATION + Config.ROLL_END_LAG;
    this.dodge = { kind: 'roll', dir, start: now, safeFrom: now + Config.ROLL_SAFE_FROM, safeUntil: now + Config.ROLL_SAFE_UNTIL, ends };
    this.rollReadyAt = ends + Config.ROLL_COOLDOWN;
    this.body.ghost = true;
    this.ghosted = true;
    // Rolling forwards tucks into a forward roll, backwards into a back roll.
    this.anim.play(dir === this.facing ? 'roll' : 'rollBack', { restart: true, ms: Config.ROLL_DURATION + Config.ROLL_END_LAG * 0.5, fade: 30 });
    this.hooks.playSfx('dodge', 0.3);
    this.hooks.runDust(this.x, this.body.bottom, -dir);
  }

  /** Air dodge: keep the burst, hover against gravity. Roll: travel, then the end lag. */
  private updateDodge(now: number, dt: number): void {
    const d = this.dodge!;
    if (d.kind === 'air') { this.body.vy -= Config.GRAVITY * UNIT * dt * 0.8; return; }
    const t = (now - d.start) / Config.ROLL_DURATION;
    if (t < 1) {
      // Fast off the mark, slowing to a stop: x = D (1 - (1 - t)²).
      if (!this.grounded && now - d.start > 50) {
        // Rolled off an edge: falls from there.
        this.dodge = null;
        return;
      }
      const speed = (2 * Config.ROLL_DISTANCE * (1 - t)) / (Config.ROLL_DURATION / 1000);
      this.body.setVelocity(d.dir * speed * UNIT, this.body.vy);
      return;
    }
    this.body.vx = 0;
    if (!d.turned) {
      // Ends facing back the way it came, towards whoever it rolled past (Melee).
      d.turned = true;
      this.facing = d.dir === 1 ? -1 : 1;
    }
  }

  private breakGuard(): void {
    this.guarding = false;
    this.guard = Config.GUARD_BREAK_REFILL;
    this.stunnedUntil = this.hooks.now() + Config.GUARD_BREAK_STUN;
    this.body.vy = -12 * UNIT; // pops up, like a shield break
    this.hooks.playSfx('guard-break');
  }

  // ---------------------------------------------------------------- movement
  private move(pad: PadState, now: number, dt: number): void {
    const b = this.body;
    let vx = b.vx / UNIT;
    let vy = b.vy / UNIT; // y-down
    const grounded = this.grounded;
    const f = feel();
    const accel = (grounded ? Config.RUN_ACCELERATION : f.airAccel) * this.speedFactor() * dt;

    if (grounded) { this.jumps = 0; this.helpless = false; this.sideSpecialUsed = false; this.upSpecialUsed = false; }

    // Aerials keep the Kubot facing the way it struck (a back air hits behind).
    const canTurn = !this.attack && !this.charging;
    // A light stick tilt walks, as fast as the tilt; pushed all the way (or a
    // key) the Kubot runs. On the ground, starting off from (near) standing
    // dashes: at speed at once (Ultimate's initial dash), for people only (the
    // CPU, which turns often while following a path, eases in). Turning round
    // out of a run skids to a near stop first, then dashes the other way.
    const dir = pad.left ? -1 : pad.right ? 1 : 0;
    const run = f.run * this.speedFactor();
    const walking = !!pad.walk && grounded;
    const human = this.controller.label !== 'CPU';
    if (dir && grounded && Math.sign(vx) === -dir && Math.abs(vx) > 0.25 * run) {
      vx += dir * GROUND_FRICTION * 1.5 * dt; // the skid
    } else if (dir && human && grounded && !walking && !this.attack && !this.charging && Math.abs(vx) < 0.25 * run) {
      this.dashUntil = now + INITIAL_DASH_MS;
      vx = dir * f.dash * this.speedFactor();
    }
    if (walking) this.dashUntil = 0;
    const top = !grounded ? f.air * this.speedFactor()
      : walking ? f.walk * this.speedFactor() * (pad.walkAmount ?? 1)
      : now < this.dashUntil ? Math.max(run, f.dash * this.speedFactor()) : run;
    if (pad.left) {
      vx = vx < -top ? Math.min(vx + accel, -top) : Math.max(vx - accel, -top);
      if (canTurn) this.turnTo(-1, now, grounded);
    } else if (pad.right) {
      vx = vx > top ? Math.max(vx - accel, top) : Math.min(vx + accel, top);
      if (canTurn) this.turnTo(1, now, grounded);
    } else if (grounded) {
      const stop = GROUND_FRICTION * dt;
      vx = vx > 0 ? Math.max(vx - stop, 0) : Math.min(vx + stop, 0);
    }

    // Jumps: the jump button, or pushing up all the way (tap jump). People jump
    // on the press (after a short jump squat on the ground: let go within it
    // for a short hop); the CPU holds up and jumps again after a cooldown.
    // (The CPU holds up to aim its up attacks and specials: no jump then.)
    const jumpInput = !!pad.jump || (pad.up && !pad.walk && (human || (!pad.attack && !pad.special)));
    const jumpPress = human ? (jumpInput && !this.jumpHeld) || this.buffered('jump', now) : jumpInput;
    this.jumpHeld = jumpInput;
    if (this.jumpSquatUntil > 0 && now >= this.jumpSquatUntil) {
      this.jumpSquatUntil = 0;
      if (grounded) vy = this.jump(now, true, jumpInput ? 1 : f.shortHop);
    }
    if (pad.up && !jumpPress) {
      // Up tilted (or held after a jump): no jump, just the direction.
    } else if (jumpPress) {
      if (this.jumps < this.maxJumps && now >= this.jumpReadyAt && this.jumpSquatUntil === 0 && !this.helpless) {
        this.pressedAt.jump = -1e9; // used
        if (grounded && human) this.jumpSquatUntil = now + JUMP_SQUAT_MS;
        else vy = this.jump(now, grounded, 1);
      }
    } else if (pad.down) {
      // Holding down on a soft platform drops through it (SSB-style).
      // Drops through the platform stood on, and only that one: after landing
      // on the next, it takes a fresh press to drop again (the CPU, which holds
      // down while following a path, drops again after a moment).
      // On a stick it takes a flick down (tilted down is a crouch).
      const fresh = (!this.prevDown && (!pad.walk || !!pad.flick)) || (this.controller.label === 'CPU' && now - this.landedAt > 300);
      if (grounded && fresh && now >= this.dropUntil && this.body.onPlatform) {
        this.dropUntil = now + 400;
        b.dropTop = b.platformTop;
      }
      // Fast fall (Melee): down past the apex drops straight to the fast-fall speed.
      if (!grounded && vy > 0) vy = Math.max(vy, feel().fastFall);
    }

    if (now >= this.dropUntil) b.dropTop = null;
    // Fast-falling: holding down on the way down (reset once landed).
    if (grounded) this.fastFalling = false;
    else if (pad.down && vy > 0) this.fastFalling = true;
    this.prevDown = pad.down;
    b.setVelocity(vx * UNIT, vy * UNIT);
    if (grounded && !this.wasGrounded) {
      this.landedAt = now;
      // A hard landing thumps the camera: a fast fall (down held), or a long fall.
      const fall = this.prevVy / UNIT;
      if (this.fastFalling && fall > 8) this.hooks.shake(Math.min(0.45, 0.2 + fall / 90));
      else if (fall > 22) this.hooks.shake(Math.min(0.4, (fall - 18) / 40));
      this.hooks.footDust(this.x, b.bottom);
      this.squashUntil = now + 160;
      this.landUntil = now + 200;
      if (!this.attack) this.anim.play(ANIM.LAND, { restart: true, fade: 40 });
    }
    this.wasGrounded = grounded;
  }

  /** Leaves the ground or jumps again in the air; returns the new vertical speed (units/s). */
  private jump(now: number, grounded: boolean, height: number): number {
    this.jumps++;
    this.lastJumpAt = now;
    this.jumpReadyAt = now + (this.controller.label === 'CPU' ? Config.JUMP_COOLDOWN : HUMAN_JUMP_COOLDOWN);
    if (grounded) {
      this.hooks.footDust(this.x, this.body.bottom);
      if (!this.attack) this.anim.play(ANIM.JUMP, { restart: true, fade: 50 });
    } else {
      this.hooks.airJump(this.x, this.body.bottom, this.look.color);
      if (!this.attack) this.anim.play(ANIM.FLIP, { restart: true, fade: 40 });
    }
    return -feel().jump * height;
  }

  private turnTo(dir: 1 | -1, now: number, grounded: boolean): void {
    if (this.facing === dir) return;
    this.facing = dir;
    // Dust kicked up by the change of direction.
    if (grounded) this.hooks.runDust(this.x, this.body.bottom, -dir);
    if (grounded && !this.attack && !this.guarding) {
      this.turnUntil = now + TURN_MS;
      this.anim.play(ANIM_TURN, { restart: true, ms: TURN_MS, fade: 40 });
    }
  }

  /** A press of `k` still in the input buffer. */
  private buffered(k: 'attack' | 'special' | 'jump', now: number): boolean {
    return now - this.pressedAt[k] <= INPUT_BUFFER_MS;
  }

  private speedFactor(): number {
    return this.powerUps.some((p) => p.type === 'speed') ? 1.1 : 1;
  }

  // ----------------------------------------------------------------- actions
  /** handleActions, then: a buffered press that started something is used up.
   * (A jab combo's next hit is queued by the press itself, so it keeps the buffer until it starts.) */
  private act(pad: PadState, now: number): void {
    const before = { move: this.currentMove, charging: this.charging, attack: this.attack, lock: this.lockUntil };
    this.handleActions(pad, now);
    // Started: a new move, attack or charge (not one ending), or a commitment such as a taunt.
    const started = (this.currentMove && this.currentMove !== before.move) || (this.charging && this.charging !== before.charging)
      || (this.attack && this.attack !== before.attack) || this.lockUntil > before.lock;
    if (started) {
      this.pressedAt.attack = -1e9;
      this.pressedAt.special = -1e9;
    }
  }

  private handleActions(pad: PadState, now: number): void {
    const combo = this.weapon === 'laserSword' ? SWORD_COMBO : COMBO;
    const moves = this.weapon === 'laserSword' ? SWORD_DIR_MOVES : DIR_MOVES;
    // Edges: the attack press, and a direction newly pressed (for smash flicks).
    // A press now, or one buffered while the Kubot could not act.
    const attackPressed = (pad.attack && !this.attackHeld) || this.buffered('attack', now);
    const attackReleased = !pad.attack && this.attackHeld;
    this.attackHeld = pad.attack;
    if (attackPressed) this.attackPressedAt = Math.max(this.pressedAt.attack, now - INPUT_BUFFER_MS);
    const specialPressed = (!!pad.special && !this.specialHeld) || this.buffered('special', now);
    this.specialHeld = !!pad.special;
    const prev = this.prevPad;
    // On the keyboard a newly pressed direction counts as a flick; on a stick only a real flick does.
    const side = (dx: number): Dir => (dx === this.facingBefore ? 'forward' : 'back');
    const flick: Dir | null = pad.analog
      ? (pad.flick ? (pad.up ? 'up' : pad.down ? 'down' : pad.right ? side(1) : pad.left ? side(-1) : null) : null)
      : pad.up && !prev.up ? 'up' : pad.down && !prev.down ? 'down'
      : pad.right && !prev.right ? side(1) : pad.left && !prev.left ? side(-1) : null;
    if (flick) this.dirPressedAt = now;
    this.prevPad = { ...pad };

    if (this.attack && now >= this.attackEndsAt) {
      this.attack = null;
      this.currentMove = null;
      if (!this.inCombo) this.attackReadyAt = now + Config.PUNCH_COOLDOWN;
      else if (this.comboStep === 0) this.attackReadyAt = now + COMBO_RECOVERY; // the chain is over
      else if (this.comboQueued && this.grounded) this.strike(combo[this.comboStep], now);
      else this.attackReadyAt = now + Config.PUNCH_COOLDOWN;
      this.comboQueued = false;
    }

    // A smash being charged: released (or fully charged) it strikes.
    if (this.charging) {
      const held = now - this.chargeStart;
      if (!pad.attack || held >= SMASH_CHARGE_MS) {
        const move = this.charging;
        this.charging = null;
        this.anim.freeze(null);
        this.facing = this.chargeDir;
        this.strike(move, now, 1 + SMASH_CHARGE_BONUS * Math.min(1, held / SMASH_CHARGE_MS), 0.3);
      }
      return;
    }

    // Taunt (D-pad), on the ground: committed to it until it ends (or a hit stops it).
    if (pad.taunt && this.grounded && !this.attack && now >= this.attackReadyAt) {
      this.lockUntil = now + TAUNT_MS;
      this.anim.play('taunt', { restart: true, ms: TAUNT_MS, fade: 60 });
      return;
    }

    // Helpless after the up special: nothing until landing or a ledge.
    if (this.helpless && !this.grounded) { if (!this.attack) this.anim.play(ANIM.FALL, { fade: 80 }); return; }

    // Special moves (B), alone or with a direction.
    if (specialPressed && !this.attack && now >= this.attackReadyAt) {
      const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
      const kind: SpecialKind = pad.up ? 'up' : pad.down ? 'down' : dx !== 0 ? 'side' : 'neutral';
      if (this.startSpecial(kind, dx, now)) return;
    }

    // The right stick (C-stick): an instant smash on the ground, an aerial in the air, in its direction.
    if (pad.cstick && !this.attack && now >= this.attackReadyAt) {
      const c = pad.cstick;
      const dir: Dir = c === 'up' || c === 'down' ? c : (c === 'right' ? 1 : -1) === this.facingBefore ? 'forward' : 'back';
      this.comboStep = 0;
      if (this.grounded) {
        // Strikes on the next frame, unless A is held too: then it charges (as in Smash).
        this.startSmash(dir === 'down' ? moves.dsmash : dir === 'up' ? moves.usmash : moves.fsmash, dir, now);
      } else {
        this.facing = this.facingBefore;
        this.strike(moves[dir === 'up' ? 'uair' : dir === 'down' ? 'dair' : dir === 'forward' ? 'fair' : 'bair'], now);
      }
      return;
    }

    // Laser guns: a tap fires a light shot on release, holding charges a heavy one.
    if (this.weapon === 'laserGunMkI' || this.weapon === 'laserGunMkII') {
      const gun = this.weapon === 'laserGunMkI' ? Config.LASER_GUN_MK_I : Config.LASER_GUN_MK_II;
      if (attackPressed && now >= this.attackReadyAt) this.gunChargeStart = now;
      if (this.gunChargeStart >= 0 && (attackReleased || now - this.gunChargeStart >= GUN_TAP_MS + GUN_CHARGE_MS)) {
        const held = now - this.gunChargeStart;
        const c = held <= GUN_TAP_MS ? 0 : Math.min(1, (held - GUN_TAP_MS) / GUN_CHARGE_MS);
        this.gunChargeStart = -1;
        const damage = c === 0 ? Math.max(1, Math.round(gun.damage * 0.6)) : Math.round(gun.damage * (1 + 2 * c));
        // The cooldown grows with the charge, and so do the recoil and the bolt.
        this.attackReadyAt = now + gun.cooldown * (c === 0 ? 0.6 : 1) + held * 0.8 * c;
        this.shootingUntil = now + 300;
        this.hooks.fireBullet(this, damage, gun.speed * (1 - 0.25 * c), 0.75 + 1.9 * c, 1 + 2.5 * c);
        this.body.vx -= this.facing * gun.recoil * (1 + 2.5 * c) * UNIT;
        if (c > 0.3 && !this.grounded) this.body.vy -= 4 * c * UNIT;
        this.anim.play(ANIM.SHOOT, { restart: true, fade: 30, ms: 260 + 200 * c });
      }
    } else if (pad.attack) {
      const dir = this.attackDirection(pad);
      const smashFlick = this.grounded && (pad.smash || (attackPressed && now - this.dirPressedAt <= SMASH_INPUT_MS));
      if (this.attack) {
        // A flick just after the press turns the starting jab into a smash.
        const early = now - this.attackStart < SMASH_INPUT_MS && this.currentMove === combo[0] && flick
          && now - this.attackPressedAt <= SMASH_INPUT_MS && this.grounded;
        if (early) {
          this.attack = null;
          this.startSmash(flick === 'down' ? moves.dsmash : flick === 'up' ? moves.usmash : moves.fsmash, flick, now);
        } else if (this.inCombo && this.comboStep > 0 && attackPressed) {
          // A press during a strike is kept for the next move of the combo.
          this.comboQueued = true;
        }
      } else if (now >= this.attackReadyAt && (attackPressed || this.inComboWindow(now))) {
        if (!this.grounded) {
          this.comboStep = 0;
          this.facing = this.facingBefore;
          this.strike(moves[dir === 'up' ? 'uair' : dir === 'down' ? 'dair' : dir === 'forward' ? 'fair' : dir === 'back' ? 'bair' : 'nair'], now);
        } else if (dir === 'up') {
          // Up + attack: a smash when flicked (or pressed during the jump squat, which it cancels), else the up tilt.
          this.comboStep = 0;
          if (this.jumpSquatUntil > 0 || smashFlick) {
            this.jumpSquatUntil = 0;
            this.startSmash(moves.usmash, 'up', now);
          } else this.strike(moves.utilt, now);
        } else if (smashFlick && (dir === 'down' || dir === 'forward' || dir === 'back')) {
          this.startSmash(dir === 'down' ? moves.dsmash : moves.fsmash, dir, now);
        } else if (dir === 'down') {
          this.comboStep = 0;
          this.strike(moves.dtilt, now);
        } else if (dir === 'forward' && Math.abs(this.body.vx) > 0.55 * feel().run * UNIT) {
          this.comboStep = 0;
          this.strike(moves.dash, now);
        } else if (dir === 'forward' || dir === 'back') {
          // A tilt; held back, the Kubot has already turned round.
          this.comboStep = 0;
          this.strike(moves.ftilt, now);
        } else {
          if (now > this.comboUntil) this.comboStep = 0;
          this.strike(combo[this.comboStep], now);
        }
      }
    }

    if (pad.grab && now >= this.grabReadyAt && now >= this.grabEndsAt && !this.attack) {
      this.grabEndsAt = now + Config.GRAB_DURATION;
      this.grabReadyAt = this.grabEndsAt + Config.GRAB_COOLDOWN;
      this.grabAnimUntil = now + 300;
      this.anim.play(ANIM.GRAB, { restart: true, fade: 40 });
      // On the ground a grab can miss: end lag, unless a Kubot or a ball is caught.
      if (this.grounded) this.lockUntil = now + GRAB_WHIFF_LAG;
    }
    this.grabWindow(now);
  }

  /** While the grab reaches out: an opponent in front is caught, else a power-up ball. */
  private grabWindow(now: number): void {
    if (now >= this.grabEndsAt) return;
    const target = this.grounded ? this.hooks.grabTarget(this) : null;
    if (target) this.startHold(target, now);
    else if (this.hooks.tryGrab(this, new Phaser.Geom.Circle(this.x, this.y, Config.GRAB_RADIUS * UNIT))) { this.lockUntil = 0; this.grabEndsAt = 0; }
  }

  /**
   * Which move the stick asks for: up and down first, then towards or away
   * from where the Kubot faced before this frame's input, or, with nothing
   * held in the air, up while rising and down while falling.
   */
  private attackDirection(pad: PadState): Dir {
    if (pad.up) return 'up';
    if (pad.down) return 'down';
    const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
    if (dx !== 0) return dx === this.facingBefore ? 'forward' : 'back';
    if (!this.grounded) {
      // Just after a jump the attack is the rising flip; falling fast, the dive.
      if (this.hooks.now() - this.lastJumpAt < 180) return 'up';
      if (this.body.vy / UNIT > 6) return 'down';
    }
    return 'neutral';
  }

  /** Holding attack keeps chaining the ground combo (like holding A in SSB). */
  private inComboWindow(now: number): boolean {
    return this.comboStep > 0 && now <= this.comboUntil;
  }

  /** Starts charging a smash: rooted, the wind-up held while the attack is. */
  /** Starts a special move; false when it cannot be used now (once per trip in the air). */
  private startSpecial(kind: SpecialKind, dx: number, now: number): boolean {
    const air = !this.grounded;
    if (kind === 'side' && air && this.sideSpecialUsed) return false;
    if (kind === 'up' && this.upSpecialUsed) return false;
    this.comboStep = 0;
    this.jumpSquatUntil = 0;
    // Side specials go the way pressed; the neutral one turns round when back is held.
    if (dx !== 0 && kind !== 'up' && kind !== 'down') this.facing = dx > 0 ? 1 : -1;
    else this.facing = this.facingBefore;
    if (kind === 'side') this.sideSpecialUsed ||= air;
    if (kind === 'up') this.upSpecialUsed = true;
    const move = kind === 'neutral' ? SPECIALS.ion : kind === 'side' ? (air ? SPECIALS.raptorAir : SPECIALS.raptor)
      : kind === 'up' ? SPECIALS.dive : air ? SPECIALS.kickAir : SPECIALS.kick;
    this.strike(move, now);
    this.hooks.playSfx('dodge', 0.35);
    return true;
  }

  /** Specials keep their burst of speed for a share of the move; the up special leaves the Kubot helpless. */
  private updateSpecial(now: number): void {
    const m = this.currentMove;
    if (!this.attack || !m) return;
    const t = (now - this.attackStart) / (this.attackEndsAt - this.attackStart);
    if (m.burst && t < (m.sustain ?? 0)) {
      const [bx, by] = m.burst;
      this.body.setVelocity(bx === null ? this.body.vx : this.facing * bx * UNIT, by === null ? this.body.vy : by * UNIT);
    }
    // The Ion Punch hangs in the air while it winds up.
    if (m === SPECIALS.ion && !this.grounded && t < 0.6) this.body.vy = Math.min(this.body.vy, 2 * UNIT);
    // The air kick ends when it lands, with a little landing lag.
    if (m === SPECIALS.kickAir && this.grounded && t > 0.08) {
      this.attack = null;
      this.currentMove = null;
      this.attackReadyAt = now + 160;
      this.hooks.footDust(this.x, this.body.bottom);
      this.hooks.shake(0.15);
    }
    if (m === SPECIALS.dive && t >= 0.5 && !this.grounded) this.helpless = true;
  }

  private startSmash(move: Move, dir: Dir, now: number): void {
    this.comboStep = 0;
    this.jumpSquatUntil = 0; // a smash out of the jump squat cancels the jump
    this.charging = move;
    this.chargeStart = now;
    // A back flick turns round for it.
    this.chargeDir = dir === 'back' ? (this.facingBefore === 1 ? -1 : 1) : this.facing;
    this.facing = this.chargeDir;
    this.anim.play(move.anim, { restart: true, ms: move.ms, fade: 50 });
    this.anim.freeze(0.3);
    this.currentMove = move;
  }

  /** Starts a strike; on the ground it advances the combo. */
  private strike(move: Move, now: number, power = 1, from = 0): void {
    const sword = move.points[0]?.file === SWORD_FILE;
    this.attack = {
      circles: [],
      // The blade is covered by circles from hilt to tip; fists and feet by one on the striking one.
      radius: (sword ? 0.3 : 0.35) * UNIT,
      points: move.points,
      striker: !sword && !move.all,
      behind: !!move.behind,
      all: !!move.all,
      both: !!move.both,
      damage: Math.round(move.damage * power),
      launch: { ...move.launch, knockback: move.launch.knockback * power },
      hit: new Set(),
    };
    // A charged smash resumes from its held wind-up (`from`).
    this.attackStart = now - from * move.ms;
    this.attackEndsAt = this.attackStart + move.ms;
    this.attackActive = move.active;
    this.currentMove = move;
    if (from > 0) this.anim.freeze(null);
    else this.anim.play(move.anim, { restart: true, ms: move.ms, fade: 45 });
    this.inCombo = COMBO.includes(move) || SWORD_COMBO.includes(move);
    if (this.inCombo) {
      this.comboStep = (this.comboStep + 1) % COMBO.length;
      this.comboUntil = this.attackEndsAt + COMBO_WINDOW;
      return;
    }
    const b = this.body;
    switch (move.anim) {
      case 'airKick': case 'sdair': // dives forwards and down
        b.setVelocity(this.facing * Math.max(Math.abs(b.vx), 10 * UNIT), Math.max(b.vy, 6 * UNIT));
        break;
      case 'uair': case 'suair': // the backflip hops up
        b.setVelocity(b.vx, Math.min(b.vy, -9 * UNIT));
        break;
      case 'fair': // thrown forwards
        b.setVelocity(this.facing * Math.max(Math.abs(b.vx), 7 * UNIT), b.vy);
        break;
    }
  }

  // ------------------------------------------------------- grabs (Melee-style)
  /** Catches `victim`: it is lifted in front and can only mash to break out. */
  private startHold(victim: Kubotz, now: number): void {
    this.grabEndsAt = 0;
    this.lockUntil = 0;
    this.holding = victim;
    this.pummelUntil = 0;
    this.body.setVelocity(0, this.body.vy);
    this.anim.play('grabHold', { restart: true, fade: 50 });
    victim.caught(this, now);
    this.hooks.grabFx(victim.x, victim.y, this.look.color, 0.5);
  }

  /** Grabbed by `by`: drops whatever it was doing. */
  private caught(by: Kubotz, now: number): void {
    this.cancelActions();
    this.releaseLedge(now);
    if (this.holding) this.holding.heldBy = null;
    this.holding = null;
    this.throwing = null;
    this.heldBy = by;
    this.body.ghost = true;
    this.ghosted = true;
    this.facing = by.facing === 1 ? -1 : 1;
    this.mashPrev = { ...this.controller.read() };
    const damage = Config.KUBOTZ_HEALTH - this.health;
    this.holdLeft = (GRAB_HOLD_FRAMES + GRAB_HOLD_PER_DAMAGE * Math.floor(damage / 5) * 5) * FRAME;
    this.anim.play('held', { restart: true, fade: 40 });
  }

  /** Stops attacks, charges, guarding, dodges and stuns (grabbed, or catching a ledge). */
  private cancelActions(): void {
    this.attack = null;
    this.currentMove = null;
    if (this.charging) { this.charging = null; this.anim.freeze(null); }
    this.gunChargeStart = -1;
    this.comboStep = 0;
    this.guarding = false;
    this.dodge = null;
    this.hitstunUntil = 0;
    this.tumbleUntil = 0;
    this.knockdownUntil = 0;
    this.hitUntil = 0;
  }

  /** Held: the timer runs down, faster for every mash (a new button or direction). */
  private updateHeld(now: number, dt: number, raw: PadState): void {
    const by = this.heldBy!;
    if (!by.isAlive() || by.holding !== this) { this.heldBy = null; return; }
    const p = this.mashPrev;
    const mashes = (['attack', 'grab', 'guard', 'up', 'down', 'left', 'right'] as const).filter((k) => raw[k] && !p[k]).length;
    this.mashPrev = { ...raw };
    if (now >= this.pummelStunUntil) this.holdLeft -= mashes * GRAB_MASH_FRAMES * FRAME;
    this.holdLeft -= dt * 1000;
    if (this.holdLeft <= 0) by.grabRelease(now);
  }

  /** Holding: pummel with attack, throw with a direction; the throw lets go part-way. */
  private updateHolding(now: number, pad: PadState): void {
    const b = this.body;
    b.setVelocity(0, this.grounded ? 0 : b.vy);
    const v = this.holding;
    if (this.throwing) {
      const t = THROWS[this.throwing.kind];
      if (v) {
        this.placeHeld(v, Math.min(1, (now - this.throwing.start) / (this.throwing.releaseAt - this.throwing.start)), this.throwing.kind);
        if (now >= this.throwing.releaseAt) {
          this.holding = null;
          v.heldBy = null;
          v.lockUntil = 0;
          v.takeDamage(t.damage, this, t.launch, (this.facing * t.dir) as 1 | -1);
          this.hooks.grabFx(v.x, v.y, this.look.color, 1);
        }
      }
      if (now >= this.throwing.start + t.ms) this.throwing = null;
      return;
    }
    if (!v || !v.isAlive() || v.heldBy !== this) { this.holding = null; return; }
    // The held Kubot can't fall: carried along when the grabber walks off an edge.
    this.placeHeld(v, 0, null);
    if (!this.grounded) { this.grabRelease(now); return; }
    if (now < this.pummelUntil) return;
    const p = this.prevPad;
    this.prevPad = { ...pad };
    const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
    const kind: ThrowKind | null = pad.up ? 'up' : pad.down ? 'down' : dx === 0 ? null : dx === this.facing ? 'forward' : 'back';
    if (kind) {
      this.throwing = { kind, start: now, releaseAt: now + THROWS[kind].ms * THROWS[kind].release };
      this.anim.play(THROWS[kind].anim, { restart: true, fade: 40 });
      this.hooks.playSfx('dodge', 0.35);
      return;
    }
    if (pad.attack && !p.attack) {
      // Pummel: a knee. The held Kubot can't mash out through its hitstun.
      this.pummelUntil = now + PUMMEL_MS;
      this.anim.play('pummel', { restart: true, ms: PUMMEL_MS, fade: 30 });
      v.health = Math.max(1, v.health - PUMMEL_DAMAGE);
      v.flashUntil = now + 70;
      v.pummelStunUntil = now + PUMMEL_MS * 0.6;
      v.lastAttacker = { by: this, at: now };
      this.hooks.grabFx(v.x, v.y, this.look.color, 0.6);
    }
  }

  /**
   * Where the held Kubot is: in front of the grabber's hands; during a throw
   * it follows the swing (`u`, 0..1 up to the release).
   */
  private placeHeld(v: Kubotz, u: number, kind: ThrowKind | null): void {
    let dx = 1.05;
    let dy = -0.15;
    switch (kind) {
      case 'forward': dx = u < 0.66 ? 1.05 - 0.4 * (u / 0.66) : 0.65 + 1.0 * ((u - 0.66) / 0.34); break;
      case 'back': { const a = (u * 250 * Math.PI) / 180; dx = 1.05 * Math.cos(a); dy = -0.15 - 0.25 * Math.sin(a); break; }
      case 'up': dx = 1.05 - 0.85 * u; dy = -0.15 - 1.1 * u; break;
      case 'down': dx = 1.05 - 0.2 * u; dy = u < 0.6 ? -0.15 - 0.9 * (u / 0.6) : -1.05 + 1.1 * ((u - 0.6) / 0.4); break;
    }
    v.body.reset(this.x + this.facing * dx * UNIT, this.y + dy * UNIT);
    v.facing = this.facing === 1 ? -1 : 1;
  }

  /** The hold timed out: both pushed apart and stuck for a moment (Melee's grab release). */
  grabRelease(now: number): void {
    const v = this.holding;
    this.holding = null;
    if (!v) return;
    v.heldBy = null;
    const air = !this.grounded;
    v.body.setVelocity(this.facing * 7 * UNIT, air ? -9 * UNIT : -2 * UNIT);
    this.body.setVelocity(-this.facing * 3 * UNIT, this.body.vy);
    this.lockUntil = now + GRAB_RELEASE_LAG;
    v.lockUntil = air ? 0 : now + GRAB_RELEASE_LAG;
    this.anim.play(ANIM.HIT_2, { restart: true, ms: GRAB_RELEASE_LAG, fade: 40 });
    v.anim.play(ANIM.HIT, { restart: true, ms: GRAB_RELEASE_LAG, fade: 40 });
    this.hooks.playSfx('dodge', 0.3);
  }

  /** Ends a grab from either side (a hit, a knock-out). */
  private breakGrab(): void {
    if (this.holding) { this.holding.heldBy = null; this.holding = null; }
    if (this.heldBy) { this.heldBy.holding = null; this.heldBy = null; }
    this.throwing = null;
  }

  // ---------------------------------------------------- ledges (Melee-style)
  private hangPos(l: Ledge): { x: number; y: number } {
    return { x: l.x + l.dir * HANG_DX, y: l.y + HANG_DY };
  }

  private grabLedge(l: Ledge, now: number): void {
    this.cancelActions();
    this.ledge = l;
    this.ledgeAt = now;
    this.ledgeSafeUntil = now + LEDGE_INTANGIBLE;
    this.ledgePrev = { ...this.pad };
    // The air jumps, the air dodge and the specials come back.
    this.jumps = 1;
    this.helpless = false;
    this.sideSpecialUsed = false;
    this.upSpecialUsed = false;
    this.dodgeReady = true;
    this.facing = l.dir === 1 ? -1 : 1;
    const p = this.hangPos(l);
    this.body.reset(p.x, p.y);
    this.anim.play('ledge', { restart: true, fade: 60 });
    this.hooks.playSfx('step', 0.35);
    this.hooks.dust(l.x, l.y);
  }

  private releaseLedge(now: number): void {
    if (!this.ledge && !this.climb) return;
    this.ledge = null;
    this.climb = null;
    this.ledgeLetGoAt = now;
  }

  /** Hanging: get up (toward), jump (up), attack, roll (guard) or let go (down / away). */
  private updateLedge(now: number, pad: PadState): void {
    if (this.climb) { this.updateClimb(now); return; }
    const l = this.ledge!;
    const p = this.hangPos(l);
    this.body.reset(p.x, p.y);
    const prev = this.ledgePrev;
    this.ledgePrev = { ...pad };
    if (now - this.ledgeAt < LEDGE_CATCH) return;
    const fresh = (k: keyof PadState) => !!pad[k] && !prev[k];
    const toward = l.dir === 1 ? 'left' : 'right';
    const away = l.dir === 1 ? 'right' : 'left';
    if (fresh('up')) {
      this.releaseLedge(now);
      this.body.setVelocity(-l.dir * 2 * UNIT, -feel().jump * 1.05 * UNIT);
      this.lastJumpAt = now;
      this.jumpReadyAt = now + Config.JUMP_COOLDOWN;
      this.ledgeSafeUntil = Math.min(this.ledgeSafeUntil, now + 150);
      this.anim.play(ANIM.JUMP, { restart: true, fade: 40 });
      this.hooks.airJump(this.x, this.body.bottom, this.look.color);
    } else if (fresh(toward)) this.startClimb('climb', now);
    else if (fresh('attack')) this.startClimb('attack', now);
    else if (fresh('guard')) this.startClimb('roll', now);
    else if (fresh('down') || fresh(away)) {
      this.releaseLedge(now);
      this.ledgeSafeUntil = Math.min(this.ledgeSafeUntil, now);
      this.body.setVelocity(l.dir * UNIT, 2 * UNIT);
      this.anim.play(ANIM.FALL, { fade: 80 });
    }
  }

  private startClimb(kind: 'climb' | 'roll' | 'attack', now: number): void {
    const l = this.ledge!;
    const slow = Config.KUBOTZ_HEALTH - this.health >= LEDGE_SLOW_DAMAGE;
    const ms = slow ? (kind === 'climb' ? 900 : 1100) : LEDGE_GETUP_MS[kind];
    const inward = LEDGE_INWARD[kind];
    this.climb = { kind, ledge: l, start: now, ms, x0: this.x, y0: this.y, x1: l.x - l.dir * inward * UNIT, y1: l.y - this.body.height / 2 - 2 };
    this.ledge = null;
    // Intangible through most of the get-up (less for the attack, which strikes).
    this.ledgeSafeUntil = Math.max(this.ledgeSafeUntil, now + ms * (kind === 'attack' ? 0.5 : kind === 'roll' ? 0.9 : 0.8));
    const climbMs = kind === 'attack' ? ms * 0.55 : ms;
    this.anim.play(kind === 'roll' ? 'ledgeRoll' : 'climb', { restart: true, ms: climbMs, fade: 40 });
  }

  /** Up the wall first, then in over the top (so the body never cuts the corner). */
  private updateClimb(now: number): void {
    const c = this.climb!;
    const len = c.kind === 'attack' ? c.ms * 0.55 : c.ms;
    const u = Math.min(1, (now - c.start) / len);
    const rise = Math.min(1, u / 0.45);
    const across = Math.max(0, (u - 0.45) / 0.55);
    const ease = (t: number) => t * t * (3 - 2 * t);
    this.body.reset(c.x0 + (c.x1 - c.x0) * ease(across), c.y0 + (c.y1 - c.y0) * ease(rise));
    if (u < 1) return;
    this.climb = null;
    this.ledgeLetGoAt = now;
    this.wasGrounded = true;
    if (c.kind === 'attack') {
      // The get-up attack: a sweeping kick across the ledge.
      const moves = this.weapon === 'laserSword' ? SWORD_DIR_MOVES : DIR_MOVES;
      this.comboStep = 0;
      this.strike({ ...moves.ftilt, ...LEDGE_ATTACK, ms: c.ms * 0.45 }, now);
    }
  }

  // --------------------------------------------------------------- power ups
  givePowerUp(type: PowerUpType, now: number): void {
    const def = POWER_UPS[type];
    if (def.weapon && this.carrying) return; // the flag stays in hand
    // A new weapon replaces the current one instead of stacking.
    if (def.weapon) {
      const old = this.powerUps.find((p) => POWER_UPS[p.type].weapon);
      if (old) this.removePowerUp(old);
    }
    def.onStart(this);
    if (def.timed) this.powerUps.push({ type, endsAt: now + Config.POWERUP_DURATION });
  }

  /** Capture the Flag: takes the flag in hand (it fights with the sword's moves), or lets go of it. */
  carryFlag(flag: CtfFlag | null): void {
    if (flag) for (const p of [...this.powerUps]) if (POWER_UPS[p.type].weapon) this.removePowerUp(p);
    this.carrying = flag;
    this.weapon = flag ? 'laserSword' : this.dead ? 'none' : this.armed;
  }

  private removePowerUp(p: ActivePowerUp): void {
    POWER_UPS[p.type].onFinish(this);
    this.powerUps = this.powerUps.filter((q) => q !== p);
  }

  private updatePowerUps(now: number): void {
    for (const p of [...this.powerUps]) if (now >= p.endsAt) this.removePowerUp(p);
    if (this.shield <= 0) this.powerUps = this.powerUps.filter((p) => p.type !== 'shield');
  }

  // ------------------------------------------------------------------ damage
  takeDamage(amount: number, attacker: Kubotz, launch: Launch, dirX: 1 | -1): void {
    if (this.dead || this.invincible || this.intangible || !canHurt(attacker, this)) return;
    amount *= this.damageScale;
    const now = this.hooks.now();
    // A hit breaks a grab (on either Kubot) and knocks a Kubot off its ledge.
    if (this.holding || this.heldBy) this.breakGrab();
    this.releaseLedge(now);
    this.lockUntil = 0;
    const prev = this.lastAttacker;
    this.lastAttacker = { by: attacker, at: now };
    const pushX = dirX * launch.knockback;
    if (this.guarding) {
      this.guard -= amount;
      this.body.vx += (pushX / 3) * UNIT;
      if (this.guard <= 0) this.breakGuard();
      return;
    }
    if (this.shield > 0) {
      this.shield -= amount;
      this.body.vx += (pushX / 2) * UNIT;
      return;
    }
    const chained = prev?.by === attacker && now < Math.max(this.hitstunUntil, this.hitUntil);
    const healthBefore = this.health;
    this.countHit(attacker, Math.min(this.health, amount), chained);
    this.health = Math.max(0, this.health - amount);
    let hitstun: number;
    let tumble = false;
    let speed = 0;
    if (launch.stun) {
      // Light combo hits keep the target on the ground and in reach of the next one.
      this.body.vx = pushX * UNIT;
      hitstun = launch.stun;
    } else {
      // Knockback grows with the damage taken (SSB), along the move's launch angle;
      // hitstun follows the launch speed, and a hard launch tumbles.
      const taken = 1 - this.health / Config.KUBOTZ_HEALTH;
      speed = launch.knockback * (1 + Config.KNOCKBACK_GROWTH * taken * (launch.growth ?? 1));
      const a = (launch.angle * Math.PI) / 180;
      this.body.setVelocity(dirX * Math.cos(a) * speed * UNIT, -Math.sin(a) * speed * UNIT);
      hitstun = Math.min(Config.HITSTUN_MAX, Config.HITSTUN_BASE + speed * Config.HITSTUN_PER_UNIT);
      tumble = hitstun >= Config.TUMBLE_HITSTUN;
      // Strong launches shake the camera, harder the faster they fly.
      if (speed > 12) this.hooks.shake(Math.min(0.75, (speed - 10) / 22));
    }
    this.hitUntil = now + Math.max(250, hitstun);
    this.flashUntil = now + 70;
    this.hitstunUntil = Math.max(this.hitstunUntil, now + hitstun);
    this.tumbleUntil = tumble ? this.hitstunUntil : 0;
    this.knockdownUntil = 0;
    this.floorBounced = false;
    // Interrupted: a hit cancels the victim's own move, charge and combo.
    this.attack = null;
    this.currentMove = null;
    if (this.charging) { this.charging = null; this.anim.freeze(null); }
    this.gunChargeStart = -1;
    this.comboStep = 0;
    this.dodge = null; // (hit in a roll's end lag)
    if (tumble) {
      this.anim.play('tumble', { restart: true, fade: 40 });
    } else {
      this.hitAnim = this.hitAnim === ANIM.HIT ? ANIM.HIT_2 : ANIM.HIT;
      this.anim.play(this.hitAnim, { restart: true, fade: 30 });
    }
    this.hooks.landed?.(this, attacker, Math.min(healthBefore, amount), chained, healthBefore, speed, launch.angle);
  }

  /** Stats: a hit that got through (not guarded or shielded); `chained` = landed while the last one still stunned. */
  private countHit(attacker: Kubotz, damage: number, chained: boolean): void {
    this.comboTaken = chained ? this.comboTaken + 1 : 1;
    this.stats.damageTaken += damage;
    attacker.stats.damageDealt += damage;
    attacker.stats.hits++;
    attacker.stats.longestCombo = Math.max(attacker.stats.longestCombo, this.comboTaken);
  }

  /** RespawnSystem DEAD state: hide and freeze until respawn. */
  kill(now: number): void {
    this.breakGrab();
    this.releaseLedge(now);
    this.lockUntil = 0;
    this.dead = true;
    this.deaths++;
    this.lives--;
    this.eliminated = this.lives <= 0;
    this.respawnAt = now + Config.RESPAWN_DELAY;
    this.attack = null;
    this.charging = null;
    this.gunChargeStart = -1;
    this.anim.freeze(null);
    for (const p of [...this.powerUps]) this.removePowerUp(p);
    this.weapon = 'none';
    this.shield = 0;
    this.guarding = false;
    this.dodge = null;
    this.tag.setVisible(false);
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.model.visible = false;
  }

  /** RespawnSystem SPAWNING state. */
  respawn(x: number, y: number): void {
    this.dead = false;
    this.eliminated = false;
    this.health = this.maxHealth;
    this.weapon = this.armed;
    this.energy = Config.KUBOTZ_ENERGY;
    this.maxJumps = Config.NB_JUMPS;
    this.lastAttacker = null;
    this.guard = Config.GUARD_MAX;
    this.stunnedUntil = 0;
    this.hitstunUntil = 0;
    this.tumbleUntil = 0;
    this.knockdownUntil = 0;
    this.body.enable = true;
    this.tag.setVisible(true);
    this.body.reset(x, y);
    this.model.visible = true;
    this.anim.play(ANIM.IDLE, { restart: true, fade: 0 });
  }

  teleport(x: number, y: number): void {
    this.body.reset(x, y, true);
  }

  // --------------------------------------------------------------- rendering
  /** Runs after physics so the drawing sits exactly on the body. */
  render(now: number, dtMs: number): void {
    if (this.dead) return;
    this.updateAnimationState(now);
    this.anim.tick(dtMs);

    const maps: string[] = [];
    if (this.look.head) maps.push(this.look.head);
    if (this.weapon === 'laserSword') maps.push('weapon_laserSword');
    else if (this.weapon !== 'none') maps.push('weapon_laserGunMkI');
    if (this.weapon === 'none' && this.currentMove?.maps && (this.attack || this.charging)) maps.push(...this.currentMove.maps);

    // On top of the clips: turning round, leaning into runs, squash on landing,
    // a wobble when the guard broke.
    // Turning: the drawn yaw eases the short way round to the new facing.
    if (this.facing !== this.drawnFacing) {
      this.drawnFacing = this.facing;
      const want = this.facing === 1 ? 0 : 180;
      let delta = (((want - this.yaw) % 360) + 540) % 360 - 180;
      if (delta === -180) delta = 180;
      this.turnFrom = this.yaw;
      this.yawTo = this.yaw + delta;
      this.turnAt = now;
      this.turnMs = this.grounded ? TURN_MS : AIR_TURN_MS;
    }
    const tt = Math.min(1, (now - this.turnAt) / this.turnMs);
    this.yaw = this.turnFrom + (this.yawTo - this.turnFrom) * tt * tt * (3 - 2 * tt);
    const vx = this.body.vx / (feel().run * UNIT);
    let lean = this.grounded ? vx * 0.05 : vx * 0.04;
    if (now < this.stunnedUntil) lean += Math.sin(now / 60) * 0.1;
    const squash = now < this.squashUntil ? 1 - 0.12 * Math.sin(((this.squashUntil - now) / 160) * Math.PI) : 1;
    const pose = this.anim.pose();
    // Footsteps land when the other foot touches down in the run.
    if (this.anim.name === ANIM.RUN && this.grounded) {
      const foot = this.rig.lowestFoot(pose).foot;
      if (this.plantedFoot && foot !== this.plantedFoot && now - this.lastStepAt > 120) {
        this.lastStepAt = now;
        this.hooks.playSfx('step', 0.25);
      }
      this.plantedFoot = foot;
    } else this.plantedFoot = '';
    // A clip's own spin (yaw) turns the same way whichever side the Kubot faces.
    const yaw = this.yaw + (pose.yaw ?? 0) * this.facing;
    // Charging shakes with the building power.
    const c = this.charge;
    const shake = c > 0 && this.charging ? Math.sin(now / 18) * 2.5 * c : 0;
    this.model.update(pose, maps, this.body.x + shake, this.body.bottom, yaw, {
      dtMs,
      lean, squash,
      alpha: this.intangible && now >= this.materializeUntil ? 0.55 : 1,
      flash: (now < this.flashUntil && vfx() > 0) || (c > 0.98 && this.charging !== null && Math.floor(now / 60) % 2 === 0),
      glitch: now < this.flashUntil && vfx() > 0,
      // The guard's shield shrinks as it drains.
      shield: this.guarding ? { r: UNIT * 1.2 * (0.6 + 0.75 * (this.guard / Config.GUARD_MAX)), above: (this.body.bottom - this.body.top) * 0.62, color: this.look.color } : undefined,
    });
    // Afterimages behind fast moves, dashes, dodges and tumbles.
    const fast = Math.hypot(this.body.vx, this.body.vy) > 17 * UNIT;
    if ((this.attack && this.currentMove?.ghosts) || this.dodging || this.tumbling || fast) {
      if (now >= this.nextGhostAt) {
        this.nextGhostAt = now + 38;
        this.model.ghost(this.look.color, this.tumbling ? 160 : 210);
      }
    }
    this.drawOverlay(now);
  }

  private updateAnimationState(now: number): void {
    const a = this.anim;
    if (now < this.materializeUntil) { a.play(ANIM.IDLE, { fade: 0 }); return; } // standing in the spawn beam
    if (this.heldBy) { a.play('held', { fade: 60 }); return; }
    if (this.throwing || this.climb) return; // the throw or the get-up plays out
    if (this.holding) { if (now >= this.pummelUntil) a.play('grabHold', { fade: 80 }); return; }
    if (this.ledge) { a.play('ledge', { fade: 60 }); return; }
    if (now < this.lockUntil) return; // a grab release or a missed grab plays out
    if (this.attack || this.charging) return; // the strike (or its held wind-up) plays out
    if (this.dodging) return; // the air dodge or the roll plays out
    const vx = this.body.vx;
    const vy = this.body.vy;
    if (now < this.knockdownUntil) return; // the knockdown plays out
    if (this.tumbling) { a.play('tumble', { fade: 40 }); return; }
    if (now < this.hitUntil || now < this.stunnedUntil || now < this.hitstunUntil) { a.play(this.hitAnim, { fade: 30 }); return; }
    if (this.celebrating && this.grounded) { a.play('victory', { fade: 220 }); return; }
    if (this.guarding) { a.play(ANIM.GUARD, { fade: 70 }); return; }
    if (now < this.grabAnimUntil) return;
    if (now < this.shootingUntil && this.weapon !== 'none') return;
    if (!this.grounded) {
      // The jump and the flip play out, then the fall.
      if ((a.name === ANIM.JUMP || a.name === ANIM.FLIP) && !a.finished) return;
      a.play(vy < 0 && a.name === ANIM.JUMP ? ANIM.JUMP : ANIM.FALL, { fade: 160 });
    } else if (now < this.turnUntil) {
      return; // the pivot plays out
    } else if (Math.abs(vx) > 4) {
      a.play(ANIM.RUN, { fade: 90 });
      // The stride follows the speed.
      a.setRate(Phaser.Math.Clamp(Math.abs(vx) / (feel().run * UNIT), 0.6, 1.4));
    } else if (now < this.landUntil) a.play(ANIM.LAND, { fade: 40 });
    else if (this.pad.down) a.play(ANIM.CROUCH, { fade: 90 });
    else if (a.name !== ANIM.LAND || a.finished) a.play(ANIM.IDLE, { fade: 140 });
  }

  private drawOverlay(now: number): void {
    const g = this.healthBar.clear();
    // Constant on-screen size whatever the camera zoom.
    const zoom = this.scene.cameras.main.zoom;
    const y = this.body.top - UNIT * 0.75;
    this.tag.setPosition(this.x, y - 6).setScale(0.42 / zoom).setAlpha(now < this.appearAt ? 0 : 1);
    // The HUD cards carry health; over the Kubot it shows only while low (red),
    // so close fights stay readable.
    const low = this.health <= 30;
    if (low) {
      // A small Kube plate: segments like the HUD's, underlined in the helmet colour.
      const px = 1 / zoom;
      const w = 64 * px;
      const h = 7 * px;
      const x = this.x - w / 2;
      const by = y + 2 * px;
      const segs = 8;
      const seg = w / segs;
      const hp = Phaser.Math.Clamp(this.health / Config.KUBOTZ_HEALTH, 0, 1);
      g.fillStyle(0x0d1520, 0.8).fillRect(x - 2 * px, by - 2 * px, w + 2 * px, h + 4 * px);
      for (let s = 0; s < segs; s++) {
        const fill = Phaser.Math.Clamp(hp * segs - s, 0, 1);
        if (fill > 0) g.fillStyle(0xff4a4a, 1).fillRect(x + s * seg, by, (seg - px) * fill, h);
      }
      g.fillStyle(this.look.color, 1).fillRect(x - 2 * px, by + h + 2 * px, w + 2 * px, 2 * px);
    }
  }

  destroy(): void {
    this.model.destroy();
    this.healthBar.destroy();
    this.tag.destroy();
    this.body.destroy();
  }
}
