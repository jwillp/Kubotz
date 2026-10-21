// Shared match types for the menus (setup, settings, results) and GameScene (phase 11).

import type { Pose } from '../anim/Rig';

/** Who drives a robot: keyboard set 1 or 2 (with any pad), or the computer. */
export type InputKind = 'P1' | 'P2' | 'CPU';

export interface FighterSpec {
  input: InputKind;
  /** Gamepad index for a human who joined with a pad. */
  pad?: number;
  /** Faction: an index into SLOT_COLORS. Same team = friends (no damage), last team standing wins. */
  team: number;
  /** Helmet: an index into HEADS / HEAD_FILES. */
  helmet: number;
}

/** Per-robot numbers collected during a match, shown on the results screen. */
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
  /** The K.O.s in order, each with the seconds before it (see game/Replay.ts). */
  replays: KoReplay[];
  /** The arena had an outer hull texture (cube arenas), for drawing the replays. */
  hull: boolean;
}

/** One robot as drawn on one frame (see Robot2D.DrawState); hidden while dead. */
export interface RobotFrame {
  visible: boolean;
  pose: Pose; maps: string[]; x: number; bottom: number; yaw: number;
  lean: number; squash: number; alpha: number; flash: boolean;
  /** In its spawn hologram: ms into it, the projector's x and the feet's y (fx/Hologram.ts). */
  holo?: [number, number, number];
}

/** A recorded frame: the match clock, the arena camera (centre, zoom, roll) and every robot. */
export interface ReplayFrame {
  t: number;
  camX: number; camY: number; zoom: number; rotation: number;
  robots: RobotFrame[];
  /** The lit lights, flat: x, y, radius, colour, intensity for each. */
  lights: number[];
  /** Sounds and impact effects started on this frame, replayed as the frame passes. */
  events: ReplayEvent[];
}

/** A sound (key, volume, detune) or an impact effect (an ImpactFx method and its arguments). */
export type ReplayEvent =
  | { kind: 'sfx'; key: string; volume: number; detune: number }
  | { kind: 'fx'; method: string; args: number[] };

/** A K.O. and the frames around it: `blow` is the hit that sent the victim off (or the K.O. itself). */
export interface KoReplay {
  victim: number;
  killer: number | null;
  /** Match clock of the K.O. and of the blow. */
  at: number;
  blow: number;
  frames: ReplayFrame[];
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

/** What the menus (join, arena select) hand to GameScene. */
export interface MatchSetup {
  /** One per robot, in slot order (at most 4). */
  fighters: FighterSpec[];
  /** Index into ARENA_INFO / ARENAS. */
  arena: number;
  bonuses: BonusRate;
  /**
   * Arena select preview: no robots, music, HUD or rules; the whole arena
   * fitted into this screen rectangle, lit and animated as in a match.
   */
  preview?: { x: number; y: number; width: number; height: number };
}

/** Faction names, by team (same order as SLOT_COLORS). */
export const TEAM_NAMES = ['Red', 'Blue', 'Green', 'Purple'];

/** Anything on a team: robots (Kubotz.team), and what they own. */
export interface Teamed { readonly team: number }

/**
 * The one friendly-fire rule: `a` can hurt `b` (hit, shoot, grab, debris)
 * only if they are on different teams. A robot never hurts itself.
 */
export const canHurt = (a: Teamed, b: Teamed): boolean => a !== b && a.team !== b.team;

/** The teams with at least one robot still in the match (not eliminated). */
export function teamsLeft(fighters: { team: number; eliminated: boolean }[]): number[] {
  return [...new Set(fighters.filter((f) => !f.eliminated).map((f) => f.team))];
}

/** The default match: P1 against a CPU on the original arena. */
export const defaultSetup = (): MatchSetup => ({
  fighters: [{ input: 'P1', team: 0, helmet: 0 }, { input: 'CPU', team: 1, helmet: 1 }],
  arena: 0,
  bonuses: 'normal',
});
