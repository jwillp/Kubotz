// Shared match types for the menus (setup, settings, results) and GameScene (phase 11).

import type { Pose } from '../anim/Rig';
import type { Shield } from '../anim/Kubot2D';
import type { MatchMode } from './Modes';

/** Who drives a Kubot: keyboard set 1 or 2 (with any pad), or the computer. */
export type InputKind = 'P1' | 'P2' | 'CPU';

export interface FighterSpec {
  input: InputKind;
  /** Gamepad index for a human who joined with a pad. */
  pad?: number;
  /** Faction: an index into SLOT_COLORS. Same team = friends (no damage), last team standing wins. */
  team: number;
  /** Helmet: an index into HEADS / HEAD_FILES. */
  helmet: number;
  /** A CPU's level, 1 to 9 (see cpuReactionMs). */
  cpuLevel?: number;
}

/** CPU levels: the highest a CPU can be set to, and the default. */
export const CPU_LEVELS = 9;
export const CPU_LEVEL = 5;
/** How long a CPU takes to react at a level: 140 ms at level 5 (the original tuning), quicker above, slower below. */
export const cpuReactionMs = (level = CPU_LEVEL): number => Math.round(140 * 1.25 ** (CPU_LEVEL - level));

/** Per-Kubot numbers collected during a match, shown on the results screen. */
export interface FighterStats {
  kos: number;
  falls: number;
  damageDealt: number;
  damageTaken: number;
  hits: number;
  longestCombo: number;
}

/** What GameScene hands to the post-match scenes. */
export interface MatchResult {
  fighters: FighterSpec[];
  stats: FighterStats[];
  /** Winning team, or null for a draw. */
  winnerTeam: number | null;
  /** Match length in ms. */
  duration: number;
  /** Per fighter, as shown in the match: name ("P1", "CPU 3") and colour. */
  names: string[];
  colors: number[];
  /** Per fighter, the texture of its player tag (see Kubotz.tagKey). */
  tags?: string[];
  /** The match's best moments, ranked within each kind: K.O.s, recoveries, combos (see game/Replay.ts). */
  highlights: Highlight[];
  /** The arena had an outer hull texture (cube arenas), for drawing the replays. */
  hull: boolean;
  /** The arena's blocks (world pixels), for the replays' perspective faces. */
  blocks: { x: number; y: number; width: number; height: number }[];
  /** The arena played (its backdrop and light), and its portals (world pixels). */
  arena: number;
  /** The battle mode; for Horde, the wave reached (the last one cleared when they won). */
  mode?: MatchMode;
  wave?: number;
  /** Capture the Flag: captures (players, black team). Training: CPUs defeated, of how many. */
  score?: [number, number];
  defeated?: number;
  target?: number;
  warpZones: { x: number; y: number; width: number; height: number }[];
}

/** One Kubot as drawn on one frame (see Kubot2D.DrawState); hidden while dead. */
export interface KubotFrame {
  visible: boolean;
  pose: Pose; maps: string[]; x: number; bottom: number; yaw: number;
  lean: number; squash: number; alpha: number; flash: boolean; glitch?: boolean;
  /** A raised guard's shield hexagon (anim/Kubot2D.ts). */
  shield?: Shield;
  /** In its spawn hologram: ms into it, the projector's x and the feet's y (fx/Hologram.ts). */
  holo?: [number, number, number];
  /** Its laser blade (hilt x, y, tip x, y), and the swing trail's newest edge (outer x, y, inner x, y). */
  blade?: [number, number, number, number];
  swing?: [number, number, number, number];
  /** Power-up motes circling it (ImpactFx.aura keys). */
  auras?: string[];
}

/**
 * Any other image the match drew on a frame (K.O. debris, laser bolts, power-up
 * balls, glows): texture, frame, x, y, origin x, y, scale x, y, rotation (rad),
 * tint, alpha, blend mode, depth, flags (1 lit, 2 flipped), scan-out (0..1, debris)
 * and an id that follows the same object from frame to frame.
 */
export type Prop = [string, string | number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

/** A recorded frame: the match clock, the arena camera (centre, zoom, roll) and every Kubot. */
export interface ReplayFrame {
  t: number;
  camX: number; camY: number; zoom: number; rotation: number;
  kubotz: KubotFrame[];
  /** The lit lights, flat: x, y, radius, colour, intensity for each. */
  lights: number[];
  /** Sounds and impact effects started on this frame, replayed as the frame passes. */
  events: ReplayEvent[];
  /** The other images drawn (see Prop), and the ambient light (it flashes with the lightning). */
  props: Prop[];
  ambient: number;
}

/** A sound (key, volume, detune), an effect (an ImpactFx or PortalFx method and its arguments), a .pe effect or power-up motes round a Kubot. */
export type ReplayEvent =
  | { kind: 'sfx'; key: string; volume: number; detune: number }
  | { kind: 'fx'; method: string; args: number[]; on?: 'portals' }
  | { kind: 'pe'; name: string; x: number; y: number; tint?: number }
  | { kind: 'twirl'; kubot: number; color: number; ms: number };

export type HighlightKind = 'goal' | 'ko' | 'recovery' | 'combo';

/**
 * One of the match's best moments and the frames around it. `subject` is the
 * Kubot it happens to (the K.O.'d Kubot, the one recovering, the one comboed),
 * `by` the opponent (null for a fall on its own); `focus` is the moment played
 * in slow motion (the blow, the closest call, the last hit).
 */
export interface Highlight {
  kind: HighlightKind;
  subject: number;
  by: number | null;
  score: number;
  focus: number;
  frames: ReplayFrame[];
  /** Combo: hits and damage; recovery: how close to the blast zone it got (units); K.O.: it ended the match. */
  hits?: number;
  damage?: number;
  margin?: number;
  final?: boolean;
  /** A combo or recovery ended in (or was) a K.O. */
  ko?: boolean;
}

export const emptyStats = (): FighterStats => ({ kos: 0, falls: 0, damageDealt: 0, damageTaken: 0, hits: 0, longestCombo: 0 });

/** How often power-up balls appear: seconds between spawns, and how many can be out at once. */
export type BonusRate = 'off' | 'rare' | 'normal' | 'frequent';
export const BONUS_RATES: Record<BonusRate, { label: string; min: number; max: number; most: number }> = {
  off: { label: 'Off', min: 0, max: 0, most: 0 },
  rare: { label: 'Rare', min: 22000, max: 35000, most: 2 },
  normal: { label: 'Normal', min: 12000, max: 20000, most: 3 },
  frequent: { label: 'Frequent', min: 5000, max: 10000, most: 5 }, // the original game's rate
};
export const RATE_ORDER: BonusRate[] = ['off', 'rare', 'normal', 'frequent'];

/** What the setup screen hands to GameScene. */
export interface MatchSetup {
  /** The battle mode (default Gladiator). */
  mode?: MatchMode;
  /** Training: how many CPUs to defeat. */
  target?: number;
  /** One per Kubot, in slot order (at most 4). */
  fighters: FighterSpec[];
  /** Index into ARENA_INFO / ARENAS. */
  arena: number;
  bonuses: BonusRate;
  /** Lives per Kubot (default Config.NB_LIVES). */
  recharges?: number;
  /** Match length in minutes; 0 or unset: no time limit. When time runs out, the team with the most lives left wins. */
  minutes?: number;
  /**
   * Setup screen preview: no Kubotz, music, HUD or rules; the whole arena
   * fitted into this screen rectangle, lit and animated as in a match.
   */
  preview?: {
    x: number; y: number; width: number; height: number;
    /** Cover the rectangle with the arena (cropped, blurred: a menu's background) and fit it whole into `inset`. */
    inset?: { x: number; y: number; width: number; height: number };
  };
}

/** Faction names, by team (same order as SLOT_COLORS). */
export const TEAM_NAMES = ['Red', 'Blue', 'Green', 'Purple'];

/** Anything on a team: Kubotz (Kubotz.team), and what they own. */
export interface Teamed { readonly team: number }

/**
 * The one friendly-fire rule: `a` can hurt `b` (hit, shoot, grab, debris)
 * only if they are on different teams. A Kubot never hurts itself.
 */
export const canHurt = (a: Teamed, b: Teamed): boolean => a !== b && a.team !== b.team;

/**
 * The black team: CPUs nobody plays (Horde's waves, an arena's NPCs), hostile
 * to every player. No HUD card, and never counted as a team still standing.
 */
export const BLACK_TEAM = 99;
export const BLACK_COLOR = 0x2a2d33;
/** Its player tag's colour (BLACK_COLOR would not read over the arenas). */
export const BLACK_TAG = 0x8d96a6;
export const isBlackTeam = (f: Teamed): boolean => f.team === BLACK_TEAM;

/** The players' teams with at least one Kubot still in the match (not eliminated); the black team never counts. */
export function teamsLeft(fighters: { team: number; eliminated: boolean }[]): number[] {
  return [...new Set(fighters.filter((f) => !f.eliminated && !isBlackTeam(f)).map((f) => f.team))];
}

/** The default match: P1 against a CPU on the original arena. */
export const defaultSetup = (): MatchSetup => ({
  fighters: [{ input: 'P1', team: 0, helmet: 0 }, { input: 'CPU', team: 1, helmet: 1 }],
  arena: 0,
  bonuses: 'normal',
});
