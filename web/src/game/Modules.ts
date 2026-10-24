import { FEELS, type Feel } from './Feel';

/**
 * Body modules: Kubotz are modular, and the body is the second module a
 * player picks beside the helmet (setup screen, Modules menu). The body sets
 * how the Kubot moves (a movement feel, game/Feel.ts) and how far it flies
 * when hit (its weight). It looks the same Kubot, in the same parts and team
 * colour, only built a little bulkier or slimmer (the parts' proportions).
 */
export interface BodyModule {
  id: string;
  name: string;
  /** One line under the name. */
  tagline: string;
  /** How it plays, a few short lines (the Modules menu). */
  details: string[];
  /** Whose movement it borrows (Super Smash Bros. Ultimate), or what it is. */
  inspiredBy: string;
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

export const MODULES: Record<string, BodyModule> = {
  core: {
    id: 'core', name: 'Core', tagline: 'The standard Kubot body: quick, with good jumps.',
    details: ['Fast run, sharp turns', 'High full hop, low short hop', 'Falls fast, so it lands quickly'],
    inspiredBy: 'Fox\'s movement with Falco\'s jumps', feel: FEELS.kubot, knockback: 1, build: BASE_BUILD,
  },
  striker: {
    id: 'striker', name: 'Striker', tagline: 'Light and sharp: always first to the fight.',
    details: ['Fast run and dash', 'Lower jumps than the Core', 'Light: flies a little further when hit'],
    inspiredBy: 'Fox', feel: FEELS.fox, knockback: 1.08, build: { torso: 0.92, arms: 0.86, legs: 0.88 },
  },
  hopper: {
    id: 'hopper', name: 'Hopper', tagline: 'Big legs, long jumps, a slower run.',
    details: ['Jumps as high as the Core, and hangs longer', 'The best air control', 'Floatier falls, slower run'],
    inspiredBy: 'Falco', feel: FEELS.falco, knockback: 1.03, build: { torso: 0.95, arms: 0.92, legs: 1.22 },
  },
  sprinter: {
    id: 'sprinter', name: 'Sprinter', tagline: 'The fastest run; commits to every jump.',
    details: ['The fastest run of all', 'Slow walk, slow to get going', 'Wide drift in the air, low jumps'],
    inspiredBy: 'Captain Falcon', feel: FEELS.falcon, knockback: 0.97, build: { torso: 1.08, arms: 1.06, legs: 1.24 },
  },
  glider: {
    id: 'glider', name: 'Glider', tagline: 'Floats down slowly and hangs in the air.',
    details: ['Very low gravity: long, floaty jumps', 'Slow falls, slow to land', 'Easy to recover, easy to juggle'],
    inspiredBy: 'Samus', feel: FEELS.samus, knockback: 0.95, build: { torso: 0.88, arms: 0.8, legs: 0.82 },
  },
  bulwark: {
    id: 'bulwark', name: 'Bulwark', tagline: 'Heavy plating: slow, but hard to send flying.',
    details: ['Slow run and air speed', 'Low jumps, heavy falls', 'Heavy: flies much less far when hit'],
    inspiredBy: 'A heavyweight of its own', feel: BULWARK, knockback: 0.82, build: { torso: 1.25, arms: 1.35, legs: 1.35 },
  },
};

/** The modules in menu order (also the number keys 1 to 6 in a match, for P1). */
export const MODULE_ORDER = ['core', 'striker', 'hopper', 'sprinter', 'glider', 'bulwark'];

export const DEFAULT_MODULE = 'core';

/** A module by id; unknown or missing ids are the Core. */
export const moduleOf = (id?: string): BodyModule => MODULES[id ?? DEFAULT_MODULE] ?? MODULES[DEFAULT_MODULE];

/** The next module in menu order, d steps away (wraps round). */
export function stepModule(id: string | undefined, d: number): string {
  const at = Math.max(0, MODULE_ORDER.indexOf(moduleOf(id).id));
  return MODULE_ORDER[(at + d + MODULE_ORDER.length * Math.abs(d)) % MODULE_ORDER.length];
}

/** Full hop height (units): take-off speed squared over twice the rising gravity. */
export const jumpHeight = (f: Feel): number => (f.jump * f.jump) / (2 * f.gravity);

/** The Modules menu's bars, each 0 to 1 against the other modules. */
export interface ModuleStats { run: number; air: number; jump: number; fall: number; weight: number }

const range = (pick: (m: BodyModule) => number) => {
  const all = MODULE_ORDER.map((id) => pick(MODULES[id]));
  return { lo: Math.min(...all), hi: Math.max(...all) };
};

/** Where a module sits between the slowest / lightest and the fastest / heaviest (0.15 to 1, so the lowest still shows). */
export function moduleStats(m: BodyModule): ModuleStats {
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
