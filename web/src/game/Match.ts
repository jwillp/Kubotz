// Shared match types for the menus (setup, settings, results) and GameScene (phase 11).

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
}

export const emptyStats = (): FighterStats => ({ kos: 0, falls: 0, damageDealt: 0, damageTaken: 0, hits: 0, longestCombo: 0 });
