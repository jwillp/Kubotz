// Battle modes: picked on the mode screen (scenes/ModeScene.ts) before the setup screen.

import type { Weapon } from './Kubotz';

export type MatchMode = 'gladiator' | 'horde' | 'blasters' | 'blades' | 'ctf' | 'kubeball' | 'skychase' | 'sandbox' | 'blasterTraining' | 'bladeTraining';

export interface ModeInfo {
  /** Where it is listed on the mode screen: the battles, or the solo training. */
  group: 'battle' | 'training';
  name: string;
  /** One line under the name. */
  tagline: string;
  /** The rules, a few short lines. */
  rules: string[];
  /** A weapon every Kubot holds for the whole match (no weapon power-ups then). */
  armed?: Weapon;
  /** All players on one team against the black team's waves. */
  horde?: boolean;
  /** Capture the flag: all players on one team against the black team, on the giant arena. */
  ctf?: boolean;
  /** Training: one player only. */
  solo?: boolean;
  /** Training against a dummy whose behaviour changes mid-match; infinite recharges. */
  sandbox?: boolean;
  /** Training: defeat a number of CPUs coming in one or two at a time. */
  trial?: boolean;
  /** A ball game, red against blue (CPUs fill both teams): Kubeball, or Skychase. */
  ball?: 'kubeball' | 'skychase';
}

export const MODES: Record<MatchMode, ModeInfo> = {
  gladiator: {
    group: 'battle',
    name: 'Gladiator',
    tagline: 'The classic: last team standing wins.',
    rules: ['Free for all or teams', 'Weapons come from power-ups', 'Use up every recharge and you are out'],
  },
  horde: {
    group: 'battle',
    name: 'Horde',
    tagline: 'Everyone together against the black team.',
    rules: ['All players fight on one team', 'Survive 10 waves of black-team Kubotz', 'Each wave brings more, and tougher', 'Every 5 waves cleared: +1 recharge for everyone'],
    horde: true,
  },
  blasters: {
    group: 'battle',
    name: 'Blasters',
    tagline: 'A laser gun for everyone, for good.',
    rules: ['Every Kubot holds a laser gun all match', 'No sword or gun power-ups', 'Win with fire power alone'],
    armed: 'laserGunMkI',
  },
  blades: {
    group: 'battle',
    name: 'Blades',
    tagline: 'A laser sword for everyone, for good.',
    rules: ['Every Kubot holds a laser sword all match', 'No sword or gun power-ups', 'Win with the blade alone'],
    armed: 'laserSword',
  },
  ctf: {
    group: 'battle',
    name: 'Capture the Flag',
    tagline: 'Bring the black team\'s flag home.',
    rules: ['A giant hall with pits and portals', 'Grab the black flag, bring it to your spawn', 'The flag is a sword; a big hit knocks it loose', 'First to 3 captures; K.O.s come fast'],
    ctf: true,
  },
  kubeball: {
    group: 'battle',
    name: 'Kubeball',
    tagline: 'Red against blue, one ball, two goals.',
    rules: ['No hands: run into the ball, strike it, smash it', 'Into the other team\'s goal rift to score', 'Strikes send it along their launch angle', 'Goals or time: you choose'],
    ball: 'kubeball',
  },
  skychase: {
    group: 'battle',
    name: 'Skychase',
    tagline: 'Fly, throw, chase the Spark.',
    rules: ['Five air jumps each; the Core through a ring: 10', 'Two Hunters chase anyone and knock them flying', 'After a minute the golden Spark: 30, and it ends', 'Points or time: you choose'],
    ball: 'skychase',
  },
  sandbox: {
    group: 'training',
    name: 'Sandbox',
    tagline: 'Practice on a dummy, as long as you like.',
    rules: ['You against a dummy Kubot, infinite recharges', 'Select / Tab: what the dummy does', 'Stand, walk, jump, guard, dodge or fight back', 'Damage shows on every hit'],
    solo: true,
    sandbox: true,
  },
  blasterTraining: {
    group: 'training',
    name: 'Blaster Training',
    tagline: 'Your laser gun against everything else.',
    rules: ['You hold a laser gun all match', 'Defeat 5, 10 or 20 CPUs, one or two at a time', 'They fight with anything, and get tougher', '3 recharges'],
    solo: true,
    trial: true,
    armed: 'laserGunMkI',
  },
  bladeTraining: {
    group: 'training',
    name: 'Blade Training',
    tagline: 'Your laser sword against everything else.',
    rules: ['You hold a laser sword all match', 'Defeat 5, 10 or 20 CPUs, one or two at a time', 'They fight with anything, and get tougher', '3 recharges'],
    solo: true,
    trial: true,
    armed: 'laserSword',
  },
};

export const MODE_ORDER: MatchMode[] = ['gladiator', 'horde', 'blasters', 'blades', 'ctf', 'kubeball', 'skychase', 'sandbox', 'blasterTraining', 'bladeTraining'];

/** All players on one team against the black team (Horde, Capture the Flag). */
export const teamUp = (m: ModeInfo): boolean => !!(m.horde || m.ctf);

/** Sandbox: what the dummy does, cycled with Select / Tab during the match. */
export type DummyMode = 'stand' | 'walk' | 'jump' | 'guard' | 'dodge' | 'fight';
export const DUMMY_MODES: DummyMode[] = ['stand', 'walk', 'jump', 'guard', 'dodge', 'fight'];

/** Training: how many CPUs to defeat (picked on the setup screen) and the recharges you get. */
export const TRAINING_TARGETS = [5, 10, 20];
export const TRAINING_RECHARGES = 3;

/**
 * Training: the CPUs at a point of the run (`done` defeated of `target`):
 * how many are in at once (one, then two from a third of the way) and
 * their level (2, up to 8 at the end).
 */
export function trainingFoes(done: number, target: number): { together: number; level: number } {
  const f = done / Math.max(1, target);
  return { together: f < 1 / 3 ? 1 : 2, level: Math.round(2 + 6 * f) };
}

/** Capture the Flag: captures to win, and guardians per side. */
export const CTF_CAPTURES = 3;
export const CTF_GUARDIANS = 2;
/** Capture the Flag: the black team's interceptors (they hold the middle), and how much more damage everyone takes. */
export const CTF_INTERCEPTORS = 2;
export const CTF_DAMAGE = 1.8;

/** Horde: waves to survive, and the players' team. */
export const HORDE_WAVES = 10;
export const HORDE_TEAM = 0;
/** Horde: every this many waves cleared, each player gets one more recharge (an eliminated one comes back). */
export const HORDE_BONUS_EVERY = 5;

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

/** Ball games: each team is filled up to this many with CPUs. */
export const BALL_TEAM_SIZE = 3;
/** Ball games: the score to reach, picked on the setup screen (0: no limit, time decides). */
export const KUBEBALL_GOALS = [3, 5, 7, 10, 0];
export const SKYCHASE_POINTS = [100, 150, 200, 0];
/** Skychase: the Core through a ring, and the Spark caught (which ends the match). */
export const CORE_POINTS = 10;
export const SPARK_POINTS = 30;
/** Skychase: air jumps and how much gravity is left (it plays like flying). */
export const SKYCHASE_JUMPS = 6;
export const SKYCHASE_GRAVITY = 0.45;
