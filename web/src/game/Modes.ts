// Battle modes: picked on the mode screen (scenes/ModeScene.ts) before the setup screen.

import type { Weapon } from './Kubotz';

export type MatchMode = 'gladiator' | 'horde' | 'blasters' | 'blades';

export interface ModeInfo {
  name: string;
  /** One line under the name. */
  tagline: string;
  /** The rules, a few short lines. */
  rules: string[];
  /** A weapon every Kubot holds for the whole match (no weapon power-ups then). */
  armed?: Weapon;
  /** All players on one team against the black team's waves. */
  horde?: boolean;
}

export const MODES: Record<MatchMode, ModeInfo> = {
  gladiator: {
    name: 'Gladiator',
    tagline: 'The classic: last team standing wins.',
    rules: ['Free for all or teams', 'Weapons come from power-ups', 'Lose every life and you are out'],
  },
  horde: {
    name: 'Horde',
    tagline: 'Everyone together against the black team.',
    rules: ['All players fight on one team', 'Survive 10 waves of black-team Kubotz', 'Each wave brings more, and tougher'],
    horde: true,
  },
  blasters: {
    name: 'Blasters',
    tagline: 'A laser gun for everyone, for good.',
    rules: ['Every Kubot holds a laser gun all match', 'No sword or gun power-ups', 'Win with fire power alone'],
    armed: 'laserGunMkI',
  },
  blades: {
    name: 'Blades',
    tagline: 'A laser sword for everyone, for good.',
    rules: ['Every Kubot holds a laser sword all match', 'No sword or gun power-ups', 'Win with the blade alone'],
    armed: 'laserSword',
  },
};

export const MODE_ORDER: MatchMode[] = ['gladiator', 'horde', 'blasters', 'blades'];

/** Horde: waves to survive, and the players' team. */
export const HORDE_WAVES = 10;
export const HORDE_TEAM = 0;

/** At most this many black-team Kubotz at once: 4 more than the players, never more than 8. */
export const hordeCap = (players: number): number => Math.min(players + 4, 8);

/**
 * Wave `n` (from 1): how many black-team Kubotz, their CPU level and the
 * health they start with (100 is a full Kubot). The first waves are one or
 * two level 1 Kubotz at 40%; each wave adds a little of everything.
 */
export function hordeWave(n: number, players: number): { count: number; level: number; health: number } {
  return {
    count: Math.min(hordeCap(players), 1 + Math.floor(n / 2)),
    level: Math.min(9, 1 + Math.floor((n - 1) * 0.8)),
    health: Math.min(100, 40 + (n - 1) * 7),
  };
}
