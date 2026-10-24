import { FEELS, type Feel } from './Feel';
import type { Weapon } from './Kubotz';

/**
 * Kubotz are modular: a Kubot is a set of modules, grouped by type. Helmets
 * are looks; bodies set how it moves and how far it flies when hit; weapons
 * (for now only from power-ups) and feet (only the standard pair yet) come
 * next. The Modules menu lists every group; the setup screen picks the
 * helmet and the body.
 */
export type ModuleKind = 'helmet' | 'body' | 'weapon' | 'feet';

/** The groups in the Modules menu's order. */
export const MODULE_KINDS: { kind: ModuleKind; label: string; blurb: string }[] = [
  { kind: 'helmet', label: 'Helmets', blurb: 'The head: a look of its own, painted in the team colour.' },
  { kind: 'body', label: 'Bodies', blurb: 'The body sets how a Kubot moves and how far it flies when hit.' },
  { kind: 'weapon', label: 'Weapons', blurb: 'Arm modules. For now they only come from power-ups in a match.' },
  { kind: 'feet', label: 'Feet', blurb: 'Feet modules are on the way; every Kubot runs on the standard pair.' },
];

/** What every module shows in the Modules menu. */
export interface ModuleInfo {
  id: string;
  name: string;
  /** One line under the name. */
  tagline: string;
  /** A few short lines. */
  details: string[];
}

/** Helmets: the rig's character maps (kubotz.scml), in setup-screen order. */
export const HELMETS: (ModuleInfo & { map: string | null })[] = [
  { id: 'classic', name: 'Classic', map: null, tagline: 'The original Kubot helmet, flame crest and all.', details: ['The first Kubot ever built', 'Visor in the team colour'] },
  { id: 'terminator', name: 'Terminator', map: 'head_terminator', tagline: 'A cold steel skull with a glowing eye.', details: ['Steel jaw, single lens'] },
  { id: 'bigbuff', name: 'Big Buff', map: 'head_bigbuff', tagline: 'All crest, no subtlety.', details: ['A tall team-coloured crest'] },
  { id: 'skull', name: 'Skull', map: 'head_skull', tagline: "The black team's helmet.", details: ['Worn by the Horde waves'] },
  { id: 'diver', name: 'Diver', map: 'head_diver', tagline: 'A sealed dome with a round porthole.', details: ['Built for the deep'] },
  { id: 'mantis', name: 'Mantis', map: 'head_mantis', tagline: 'Long and pointed, with insect eyes.', details: ['Sharp silhouette'] },
  { id: 'sentinel', name: 'Sentinel', map: 'head_sentinel', tagline: 'A watchful visor slit.', details: ['Guard duty look'] },
  { id: 'tank', name: 'Tank', map: 'head_tank', tagline: 'Heavy plates and a narrow view port.', details: ['The sandbox dummy wears it'] },
  { id: 'astro', name: 'Astro', map: 'head_astro', tagline: 'A big glass bubble for open space.', details: ['Wide visor'] },
  { id: 'brute', name: 'Brute', map: 'head_brute', tagline: 'A low brow and a wide jaw.', details: ['Built to headbutt'] },
];

/** Helmet maps by index, as FighterSpec.helmet counts them (null: the classic, the rig's own head). */
export const HEADS: (string | null)[] = HELMETS.map((h) => h.map);

/** Weapons: arm modules, only from power-ups in a match for now (Try it holds one for good). */
export const WEAPONS: (ModuleInfo & { weapon: Weapon; map: string })[] = [
  { id: 'laserGun', name: 'Laser gun', weapon: 'laserGunMkI', map: 'weapon_laserGunMkI', tagline: 'Tap to shoot, hold to charge a big one.',
    details: ['Light shots at range', 'Hold the attack to charge', 'Power-up only for now'] },
  { id: 'plasmaBlade', name: 'Plasma blade', weapon: 'plasmaBlade', map: 'weapon_plasmaBlade', tagline: 'A blade of plasma: long reach, deflects shots.',
    details: ['Long sword swings', 'Deflects shots, clashes with blades', 'Power-up only for now'] },
];

/** Feet: only the standard pair so far. */
export const FEET: ModuleInfo[] = [
  { id: 'standard', name: 'Standard', tagline: 'The standard Kubot feet.', details: ['Every Kubot runs on them', 'More feet modules are coming'] },
];

/**
 * Body modules: the body is the second module a player picks beside the
 * helmet (setup screen, Modules menu). It sets how the Kubot moves (a movement
 * feel, game/Feel.ts) and how far it flies when hit (its weight), and has a
 * torso of its own (a rig map, drawn in tools/bodies over the original torso)
 * with the parts built a little bulkier or slimmer. Team colours stay as they are.
 */
export interface BodyModule extends ModuleInfo {
  /** One line under the name. */
  tagline: string;
  /** How it plays, a few short lines (the Modules menu). */
  details: string[];
  /** Whose movement it borrows (Super Smash Bros. Ultimate), or what it is. */
  inspiredBy: string;
  /** What its numbers are, for testing (the Modules menu's debug line). */
  debug: string;
  /** Its torso (a character map of kubotz.scml), or none for the original. */
  look?: string;
  feel: Feel;
  /** Knockback taken, x (1 = the Core's): above 1 flies further, below 1 less. */
  knockback: number;
  /** Proportions of the original parts: torso size, arm and leg thickness (1 = as drawn). */
  build: Build;
}

export interface Build { torso: number; arms: number; legs: number }

export const BASE_BUILD: Build = { torso: 1, arms: 1, legs: 1 };

/**
 * A part's scale from a body module's build, along its bone and across it:
 * the torso grows or shrinks whole, arms and legs only get thicker or thinner
 * (their length is the skeleton's), feet follow the legs a little.
 */
export function buildScale(file: string, b: Build): [number, number] {
  if (file.startsWith('torso/')) return [b.torso, b.torso];
  if (file.startsWith('arms/') && !file.includes('gun') && !file.includes('blade')) return [1, b.arms];
  if (file.startsWith('legs/')) return [1, b.legs];
  if (file.startsWith('feet/')) return [1 + (b.legs - 1) * 0.5, 1 + (b.legs - 1) * 0.5];
  return [1, 1];
}

/** A heavy body of its own (no Ultimate fighter): slow on its feet and in the air, low jumps, hard to launch. */
const BULWARK: Feel = { name: 'Bulwark', walk: 7.5, dash: 13.0, run: 11.5, air: 7.4, airAccel: 34, gravity: 70, fallGravity: 70, fall: 15.5, fastFall: 24.8, jump: 23.0, shortHop: 0.66 };

export const BODIES: Record<string, BodyModule> = {
  core: {
    id: 'core', name: 'Core', tagline: 'The standard Kubot body: quick, with good jumps.',
    details: ['Fast run, sharp turns', 'High full hop, low short hop', 'Falls fast, so it lands quickly'],
    inspiredBy: 'Fox\'s movement with Falco\'s jumps', debug: 'Kubot current (Fox run + Falco jumps)', feel: FEELS.kubot, knockback: 1, build: BASE_BUILD,
  },
  striker: {
    id: 'striker', look: 'body_striker', name: 'Striker', tagline: 'Light and sharp: always first to the fight.',
    details: ['Fast run and dash', 'Lower jumps than the Core', 'Light: flies a little further when hit'],
    inspiredBy: 'Fox', debug: 'Fox', feel: FEELS.fox, knockback: 1.08, build: { torso: 1, arms: 0.86, legs: 0.88 },
  },
  hopper: {
    id: 'hopper', look: 'body_hopper', name: 'Hopper', tagline: 'Big legs, long jumps, a slower run.',
    details: ['Jumps as high as the Core, and hangs longer', 'The best air control', 'Floatier falls, slower run'],
    inspiredBy: 'Falco', debug: 'Falco', feel: FEELS.falco, knockback: 1.03, build: { torso: 1, arms: 0.92, legs: 1.22 },
  },
  sprinter: {
    id: 'sprinter', look: 'body_sprinter', name: 'Sprinter', tagline: 'The fastest run; commits to every jump.',
    details: ['The fastest run of all', 'Slow walk, slow to get going', 'Wide drift in the air, low jumps'],
    inspiredBy: 'Captain Falcon', debug: 'Captain Falcon', feel: FEELS.falcon, knockback: 0.97, build: { torso: 1, arms: 1.06, legs: 1.24 },
  },
  glider: {
    id: 'glider', look: 'body_glider', name: 'Glider', tagline: 'Floats down slowly and hangs in the air.',
    details: ['Very low gravity: long, floaty jumps', 'Slow falls, slow to land', 'Easy to recover, easy to juggle'],
    inspiredBy: 'Samus', debug: 'Samus', feel: FEELS.samus, knockback: 0.95, build: { torso: 1, arms: 0.8, legs: 0.82 },
  },
  bulwark: {
    id: 'bulwark', look: 'body_bulwark', name: 'Bulwark', tagline: 'Heavy plating: slow, but hard to send flying.',
    details: ['Slow run and air speed', 'Low jumps, heavy falls', 'Heavy: flies much less far when hit'],
    inspiredBy: 'A heavyweight of its own', debug: 'custom heavy (no Ultimate fighter)', feel: BULWARK, knockback: 0.82, build: { torso: 1, arms: 1.35, legs: 1.35 },
  },
  classic: {
    id: 'classic', name: 'Classic', tagline: 'The 2015 Kubot: a heavy fall, a fast drift.',
    details: ['The movement of the original game', 'Falls hard, drifts fast in the air', 'Slower run than the Core'],
    inspiredBy: 'The original Kubotz (2015)', debug: 'Kubot classic', feel: FEELS.classic, knockback: 1, build: BASE_BUILD,
  },
};

/** The bodies in menu order (also the number keys 1 to 7 in a match, for P1). */
export const BODY_ORDER = ['core', 'striker', 'hopper', 'sprinter', 'glider', 'bulwark', 'classic'];

export const DEFAULT_BODY = 'core';

/** A module by id; unknown or missing ids are the Core. */
export const bodyOf = (id?: string): BodyModule => BODIES[id ?? DEFAULT_BODY] ?? BODIES[DEFAULT_BODY];

/** The next module in menu order, d steps away (wraps round). */
export function stepBody(id: string | undefined, d: number): string {
  const at = Math.max(0, BODY_ORDER.indexOf(bodyOf(id).id));
  return BODY_ORDER[(at + d + BODY_ORDER.length * Math.abs(d)) % BODY_ORDER.length];
}

/** Full hop height (units): take-off speed squared over twice the rising gravity. */
export const jumpHeight = (f: Feel): number => (f.jump * f.jump) / (2 * f.gravity);

/** The Modules menu's bars, each 0 to 1 against the other modules. */
export interface BodyStats { run: number; air: number; jump: number; fall: number; weight: number }

const range = (pick: (m: BodyModule) => number) => {
  const all = BODY_ORDER.map((id) => pick(BODIES[id]));
  return { lo: Math.min(...all), hi: Math.max(...all) };
};

/** Where a module sits between the slowest / lightest and the fastest / heaviest (0.15 to 1, so the lowest still shows). */
export function bodyStats(m: BodyModule): BodyStats {
  const bar = (pick: (x: BodyModule) => number) => {
    const { lo, hi } = range(pick);
    return hi === lo ? 1 : 0.15 + 0.85 * (pick(m) - lo) / (hi - lo);
  };
  return {
    run: bar((x) => x.feel.run),
    air: bar((x) => x.feel.air),
    jump: bar((x) => jumpHeight(x.feel)),
    fall: bar((x) => x.feel.fall),
    weight: bar((x) => 1 / x.knockback),
  };
}
