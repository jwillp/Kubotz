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
}

/** A recorded frame: the match clock, the arena camera (centre, zoom, roll) and every robot. */
export interface ReplayFrame {
  t: number;
  camX: number; camY: number; zoom: number; rotation: number;
  robots: RobotFrame[];
}

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
