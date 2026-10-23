import { Config, UNIT } from '../config';
import { CLIPS } from '../anim/Clips';
import {
  COMBO, GUN_CHARGE_MS, KICK_MOVES, PUNCH_MOVES, GUN_TAP_MS, HANG_DX, HANG_DY, LEDGE_ATTACK, LEDGE_GETUP_MS, LEDGE_INTANGIBLE, LEDGE_INWARD,
  PUMMEL_DAMAGE, PUMMEL_MS, SHORT_HOP, SMASH_CHARGE_BONUS, SMASH_CHARGE_MS, SPECIALS, SWORD_COMBO, SWORD_DIR_MOVES,
  TAUNT_MS, THROWS, type DirMoves, type Move, type ThrowKind, type Weapon,
} from './Kubotz';

/**
 * The move list (MoveListScene): every move and a few combos, each with its
 * inputs, a line on what it does (numbers from the move tables in Kubotz.ts)
 * and the steps the preview robot plays in a loop.
 */

/** One step of a preview: a clip, and what the body does while it plays. */
export interface Step {
  anim: string;
  /** How long the clip plays (its own length by default). */
  ms: number;
  /** A strike: its maps (fire fist), burst, afterimages, and its active part (hit glow on the striking points). */
  move?: Move;
  /** Smashes: the wind-up is held this long (ms) before it strikes. */
  charge?: number;
  /** Leaves the ground (or jumps again) at the start, with this share of the jump speed. */
  jump?: number;
  /** Velocity set at the start (units/s, x forwards, y down; null keeps it). */
  vel?: [number | null, number | null];
  /** No gravity (air dodge, hanging). */
  float?: boolean;
  /** Carried to this point (units from the start's ledge, x forwards, y up): up first, then across (ledge get-ups). */
  path?: [number, number];
  /** Keeps its speed on the ground (a run). */
  run?: boolean;
  /** Plays until the robot lands. */
  untilLand?: boolean;
  /** Ends early on landing (the air kick). */
  endOnLand?: boolean;
  /** The fall is held to a slow drift for this share of the step (the Ion Punch in the air). */
  hover?: number;
  /** Drawn see-through (intangible). */
  ghostly?: boolean;
  /** The guard bubble. */
  bubble?: boolean;
  /** Laser gun: gathers a charge (glow at the muzzle) through the step. */
  gather?: boolean;
  /** Laser gun: fires a bolt at the start, of this charge (0..1). */
  shot?: number;
}

export interface MoveEntry {
  group: string;
  name: string;
  /** P1 keyboard and Smash Ultimate gamepad inputs. */
  keys: string;
  pad: string;
  desc: string;
  weapon?: Weapon;
  /** Where the robot starts (units, x forwards, y up) and whether a ledge stands at x = 0. */
  start?: [number, number];
  ledge?: boolean;
  /** A second robot stands in reach to be grabbed, pummelled, thrown and hit. */
  victim?: boolean;
  steps: Step[];
}

const clip = (anim: string, extra: Partial<Step> = {}): Step => ({ anim, ms: CLIPS[anim]?.ms ?? 400, ...extra });
const strike = (move: Move, extra: Partial<Step> = {}): Step => ({ anim: move.anim, ms: move.ms, move, ...extra });

/** Damage and launch, as the move tables give them. */
const stats = (m: { damage: number; launch: { knockback: number; angle: number } }) =>
  `${m.damage} dmg, launch ${m.launch.knockback} at ${m.launch.angle}°`;
const sum = (ms: Move[]) => ms.reduce((t, m) => t + m.damage, 0);

const JUMP: Step = clip('jump', { jump: 1, ms: 300 });
const HOP: Step = clip('jump', { jump: SHORT_HOP, ms: 200, vel: [3, null] });
const FALL: Step = clip('fall', { untilLand: true });
const LAND: Step = clip('land');
const SMASH_HOLD = SMASH_CHARGE_MS * 0.6;
const CHARGE = `Hold to charge (up to ${SMASH_CHARGE_MS / 1000} s, +${SMASH_CHARGE_BONUS * 100}% damage and launch).`;

/** Steps of a ground strike, an aerial (jump, strike, fall, land) and a smash (held wind-up). */
const ground = (m: Move): Step[] => [strike(m)];
const aerial = (m: Move): Step[] => [JUMP, strike(m), FALL, LAND];
const smash = (m: Move): Step[] => [strike(m, { charge: SMASH_HOLD })];

/** The tilts, dash attack, smashes and aerials of one button. */
function dirEntries(group: string, m: DirMoves, key: string, btn: string, what: Record<keyof DirMoves, string>): MoveEntry[] {
  const e = (name: string, keys: string, pad: string, k: keyof DirMoves, steps: Step[], extra = ''): MoveEntry =>
    ({ group, name, keys, pad, desc: `${what[k]} ${stats(m[k])}.${extra}`, steps });
  const rs = btn === 'X' ? ', or right stick' : '';
  return [
    e('Forward tilt', `Hold A/D, then ${key}`, `Tilt ◀▶ + ${btn}`, 'ftilt', ground(m.ftilt)),
    e('Down tilt', `Hold S, then ${key}`, `Tilt ▼ + ${btn}`, 'dtilt', ground(m.dtilt)),
    e('Up tilt', `Hold W (landed), then ${key}`, `Tilt ▲ + ${btn}`, 'utilt', ground(m.utilt)),
    e('Dash attack', `Run + ${key}`, `Dash + ${btn}`, 'dash', [clip('run', { ms: 380, vel: [Config.MAX_SPEED, null], run: true }), strike(m.dash)]),
    e('Forward smash', `A/D with ${key}`, `Flick ◀▶ + ${btn}${rs}`, 'fsmash', smash(m.fsmash), ` ${CHARGE}`),
    e('Up smash', `W with ${key}`, `Flick ▲ + ${btn}${rs}`, 'usmash', smash(m.usmash), ` ${CHARGE}`),
    e('Down smash', `S with ${key}`, `Flick ▼ + ${btn}${rs}`, 'dsmash', smash(m.dsmash), ` ${CHARGE}`),
    e('Neutral air', `${key} in the air`, `${btn} in the air`, 'nair', aerial(m.nair)),
    e('Forward air', `Forward + ${key} in the air`, `◀▶ + ${btn}${rs}`, 'fair', aerial(m.fair)),
    e('Back air', `Back + ${key} in the air`, `Back + ${btn}${rs}`, 'bair', aerial(m.bair)),
    e('Up air', `W + ${key} in the air`, `▲ + ${btn}${rs}`, 'uair', aerial(m.uair)),
    e('Down air', `S + ${key} in the air`, `▼ + ${btn}${rs}`, 'dair', aerial(m.dair)),
  ];
}

const throwSteps = (kind: ThrowKind): Step[] => [clip('grab'), clip('grabHold', { ms: 300 }), clip(THROWS[kind].anim, { ms: THROWS[kind].ms })];

/** Laser gun shots: the light tap and the full charge, with their recoil. */
const gun = Config.LASER_GUN_MK_I;
const shot = (c: number): Step => clip('shoot', { ms: 260 + 200 * c, shot: c, vel: [-gun.recoil * (1 + 2.5 * c), null] });
const shotDamage = (c: number) => (c === 0 ? Math.max(1, Math.round(gun.damage * 0.6)) : Math.round(gun.damage * (1 + 2 * c)));

/** Hanging from a ledge (x = 0, open to the left): the body below and behind the corner. */
const HANG: [number, number] = [-HANG_DX / UNIT, -(HANG_DY / UNIT + Config.KUBOTZ_HEIGHT / 2)];
const HANG_STEP = clip('ledge', { ms: 700, float: true, ghostly: true });
const ledge = (kind: 'climb' | 'roll'): Step =>
  clip(kind === 'roll' ? 'ledgeRoll' : 'climb', { ms: LEDGE_GETUP_MS[kind], path: [LEDGE_INWARD[kind], 0], ghostly: true });

const P = PUNCH_MOVES;
const K = KICK_MOVES;
const S = SWORD_DIR_MOVES;
const SP = SPECIALS;

export const MOVE_LIST: MoveEntry[] = [
  // ---------------------------------------------------------------- fists (A)
  { group: 'Fists (A)', name: 'Jab combo', keys: 'O, O, O (or hold O)', pad: 'A, A, A (or hold A)', desc: `Fox's Jab 1, Jab 2 and jab finisher: lead straight, rear straight, high side kick, ${sum(COMBO)} dmg. Press again during a jab to chain it early.`, steps: COMBO.map((m) => strike(m)) },
  ...dirEntries('Fists (A)', P, 'O', 'A', {
    ftilt: 'A stepping hook.', dtilt: 'A crouching punch at the shins.', utilt: 'A rising palm over the head (classic).', dash: 'A flying punch out of a run.',
    fsmash: 'The fire gauntlet punch.', usmash: 'A leaping double uppercut.', dsmash: 'Both fists slam the floor, one each side.',
    nair: 'A spin with both fists out.', fair: 'A flurry of five straights.', bair: 'A spinning back fist behind.', uair: 'Both fists driven up.', dair: 'A double hammer that spikes.',
  }),

  // ---------------------------------------------------------------- legs (X)
  { group: 'Legs (X)', name: 'Kick', keys: 'P', pad: 'X', desc: `The roundhouse. ${stats(K.ftilt)}.`, steps: ground(K.ftilt) },
  ...dirEntries('Legs (X)', K, 'P', 'X', {
    ftilt: 'A roundhouse at waist height.', dtilt: 'A low kick along the floor that pops up.', utilt: 'A scorpion kick over the head.', dash: 'A sliding kick out of a run (classic).',
    fsmash: 'A spinning back kick, turning right round.', usmash: 'A back flip kick straight up.', dsmash: 'A split kick to both sides.',
    nair: 'A spinning kick all round (classic).', fair: 'A flying front kick (classic).', bair: 'A kick behind (classic).', uair: 'A backflip kick (classic).', dair: 'A stomping dive kick that spikes (classic).',
  }),

  // ---------------------------------------------------------------- specials (A + X)
  { group: 'Specials (A + X)', name: 'Ion Punch', keys: 'O + P', pad: 'A + X', desc: `The Falcon Punch: the body turns away to coil, then a huge fire punch on frame 53; back + O + P turns round first. ${stats(SP.ion)}.`, steps: ground(SP.ion) },
  { group: 'Specials (A + X)', name: 'Ion Punch (air)', keys: 'O + P in the air', pad: 'A + X in the air', desc: `Hangs in the air through the wind-up. ${stats(SP.ion)}.`, steps: [JUMP, strike(SP.ion, { hover: 0.6 }), FALL, LAND] },
  { group: 'Specials (A + X)', name: 'Raptor Dash', keys: 'A/D + O + P', pad: '◀▶ + A + X', desc: `A dashing fire uppercut (classic). ${stats(SP.raptor)}.`, steps: ground(SP.raptor) },
  { group: 'Specials (A + X)', name: 'Raptor Dash (air)', keys: 'A/D + O + P in the air', pad: '◀▶ + A + X in the air', desc: `A downward fire strike; once per trip in the air (classic). ${stats(SP.raptorAir)}.`, steps: [JUMP, strike(SP.raptorAir), FALL, LAND] },
  { group: 'Specials (A + X)', name: 'Shadow Dive', keys: 'W + O + P', pad: '▲ + A + X', desc: `A leap up and forwards, hand reaching, then a flip; helpless until landing or a ledge. ${stats(SP.dive)}.`, steps: [strike(SP.dive), FALL, LAND] },
  { group: 'Specials (A + X)', name: 'Plasma Kick', keys: 'S + O + P', pad: '▼ + A + X', desc: `The Falcon Kick: the knee drawn up, then a flying kick low along the ground. ${stats(SP.kick)}.`, steps: ground(SP.kick) },
  { group: 'Specials (A + X)', name: 'Plasma Kick (air)', keys: 'S + O + P in the air', pad: '▼ + A + X in the air', desc: `A diagonal dive kick, ending on landing (classic). ${stats(SP.kickAir)}.`, steps: [clip('jump', { jump: 1, ms: 420 }), strike(SP.kickAir, { endOnLand: true }), LAND] },

  // ---------------------------------------------------------------- sword
  { group: 'Laser sword', name: 'Sword jab', keys: 'O', pad: 'A', desc: `An overhead slash, the first of the sword combo (classic). ${stats(SWORD_COMBO[0])}.`, weapon: 'laserSword', steps: ground(SWORD_COMBO[0]) },
  { group: 'Laser sword', name: 'Sword forward tilt', keys: 'Hold A/D, then O', pad: 'Tilt ◀▶ + A', desc: `Link's chop: the blade swung up behind, then down and through to waist height. ${stats(S.ftilt)}.`, weapon: 'laserSword', steps: ground(S.ftilt) },
  { group: 'Laser sword', name: 'Sword down tilt', keys: 'Hold S, then O', pad: 'Tilt ▼ + A', desc: `A long low thrust along the floor. ${stats(S.dtilt)}.`, weapon: 'laserSword', steps: ground(S.dtilt) },
  { group: 'Laser sword', name: 'Sword up tilt', keys: 'Hold W (landed), then O', pad: 'Tilt ▲ + A', desc: `An arc from in front, over the head, to behind. ${stats(S.utilt)}.`, weapon: 'laserSword', steps: ground(S.utilt) },
  { group: 'Laser sword', name: 'Sword dash attack', keys: 'Run + O', pad: 'Dash + A', desc: `A running leap, the chop landing with the feet. ${stats(S.dash)}.`, weapon: 'laserSword', steps: [clip('run', { ms: 380, vel: [Config.MAX_SPEED, null], run: true }), strike(S.dash)] },
  { group: 'Laser sword', name: 'Sword forward smash', keys: 'A/D with O', pad: 'Flick ◀▶ + A', desc: `The blade raised in both hands, then a leaping chop. ${stats(S.fsmash)}. ${CHARGE}`, weapon: 'laserSword', steps: smash(S.fsmash) },
  { group: 'Laser sword', name: 'Sword up smash', keys: 'W with O', pad: 'Flick ▲ + A', desc: `Three sweeps overhead. ${stats(S.usmash)}. ${CHARGE}`, weapon: 'laserSword', steps: smash(S.usmash) },
  { group: 'Laser sword', name: 'Sword down smash', keys: 'S with O', pad: 'Flick ▼ + A', desc: `A low cut in front, then one behind. ${stats(S.dsmash)}. ${CHARGE}`, weapon: 'laserSword', steps: smash(S.dsmash) },
  { group: 'Laser sword', name: 'Sword neutral air', keys: 'O in the air', pad: 'A in the air', desc: `The blade swung down into a long thrust, held. ${stats(S.nair)}.`, weapon: 'laserSword', steps: aerial(S.nair) },
  { group: 'Laser sword', name: 'Sword forward air', keys: 'Forward + O in the air', pad: '◀▶ + A in the air', desc: `A chop down, then a full spinning cut. ${stats(S.fair)}.`, weapon: 'laserSword', steps: aerial(S.fair) },
  { group: 'Laser sword', name: 'Sword back air', keys: 'Back + O in the air', pad: 'Back + A in the air', desc: `Two cuts behind. ${stats(S.bair)}.`, weapon: 'laserSword', steps: aerial(S.bair) },
  { group: 'Laser sword', name: 'Sword up air', keys: 'W + O in the air', pad: '▲ + A in the air', desc: `The blade thrust straight up, the body stretched after it. ${stats(S.uair)}.`, weapon: 'laserSword', steps: aerial(S.uair) },
  { group: 'Laser sword', name: 'Sword down air', keys: 'S + O in the air', pad: '▼ + A in the air', desc: `The blade flipped point down and driven under the feet. ${stats(S.dair)}.`, weapon: 'laserSword', steps: aerial(S.dair) },

  // ---------------------------------------------------------------- gun
  { group: 'Laser gun', name: 'Quick shot', keys: 'Tap O', pad: 'Tap A', desc: `A tap (under ${GUN_TAP_MS} ms) fires a light bolt: ${shotDamage(0)} dmg (Mk I).`, weapon: 'laserGunMkI', steps: [clip('idle', { ms: 300 }), shot(0), clip('idle', { ms: 250 }), shot(0)] },
  { group: 'Laser gun', name: 'Charged shot', keys: 'Hold O, release', pad: 'Hold A, release', desc: `Charges for up to ${GUN_CHARGE_MS / 1000} s: a big, slower bolt with strong recoil, up to ${shotDamage(1)} dmg (Mk I).`, weapon: 'laserGunMkI', steps: [clip('idle', { ms: GUN_CHARGE_MS, gather: true }), shot(1)] },

  // ---------------------------------------------------------------- grabs
  { group: 'Grab and throws', name: 'Grab', keys: 'I', pad: 'LB', desc: 'Reaches just in front (not a robot behind its guard); also picks up power-up balls. A miss has end lag.', victim: true, steps: [clip('grab'), clip('grabHold', { ms: 700 })] },
  { group: 'Grab and throws', name: 'Pummel', keys: 'O while holding', pad: 'A while holding', desc: `${PUMMEL_DAMAGE} dmg a hit.`, victim: true, steps: [clip('grab'), clip('grabHold', { ms: 300 }), clip('pummel', { ms: PUMMEL_MS }), clip('pummel', { ms: PUMMEL_MS }), clip('grabHold', { ms: 300 })] },
  { group: 'Grab and throws', name: 'Forward throw', keys: 'Forward while holding', pad: '◀▶ while holding', desc: `${stats(THROWS.forward)}.`, victim: true, steps: throwSteps('forward') },
  { group: 'Grab and throws', name: 'Back throw', keys: 'Back while holding', pad: 'Back while holding', desc: `With a spin. ${stats(THROWS.back)}.`, victim: true, steps: throwSteps('back') },
  { group: 'Grab and throws', name: 'Up throw', keys: 'W while holding', pad: '▲ while holding', desc: `${stats(THROWS.up)}.`, victim: true, steps: throwSteps('up') },
  { group: 'Grab and throws', name: 'Down throw', keys: 'S while holding', pad: '▼ while holding', desc: `${stats(THROWS.down)}.`, victim: true, steps: throwSteps('down') },

  // ---------------------------------------------------------------- defence and movement
  { group: 'Defence and ledges', name: 'Guard', keys: 'Hold Shift', pad: 'Hold LT or RT', desc: `A shield bubble that soaks hits and shrinks while held; it breaks when empty (${Config.GUARD_MAX} guard).`, steps: [clip('guard', { ms: 1200, bubble: true })] },
  { group: 'Defence and ledges', name: 'Air dodge', keys: 'Shift + direction in the air', pad: 'LT + direction in the air', desc: `Intangible for ${Config.AIR_DODGE_DURATION} ms, moving the way held; once per trip in the air.`, steps: [JUMP, clip('dodge', { ms: Config.AIR_DODGE_DURATION, vel: [Config.AIR_DODGE_SPEED * 0.7, Config.AIR_DODGE_SPEED * 0.7], float: true, ghostly: true }), FALL, LAND] },
  { group: 'Defence and ledges', name: 'Ledge hang and climb', keys: 'Fall past a ledge, then toward', pad: 'Fall past a ledge, then toward', desc: `Caught on the way down; intangible ${Math.round(LEDGE_INTANGIBLE)} ms, jumps restored. Toward climbs up.`, ledge: true, start: HANG, steps: [HANG_STEP, ledge('climb'), clip('idle', { ms: 300 })] },
  { group: 'Defence and ledges', name: 'Ledge jump', keys: 'W on a ledge', pad: '▲ on a ledge', desc: 'A jump straight off the ledge.', ledge: true, start: HANG, steps: [HANG_STEP, clip('jump', { jump: 1.05, vel: [2, null] }), FALL, LAND] },
  { group: 'Defence and ledges', name: 'Ledge roll', keys: 'Shift on a ledge', pad: 'LT on a ledge', desc: 'Rolls in over the top, intangible.', ledge: true, start: HANG, steps: [HANG_STEP, ledge('roll'), clip('idle', { ms: 300 })] },
  { group: 'Defence and ledges', name: 'Ledge attack', keys: 'O on a ledge', pad: 'A on a ledge', desc: `Climbs up with a sweep kick. ${stats(LEDGE_ATTACK)}.`, ledge: true, start: HANG,
    steps: [HANG_STEP, clip('climb', { ms: LEDGE_GETUP_MS.attack * 0.55, path: [LEDGE_INWARD.attack, 0], ghostly: true }), strike({ ...K.ftilt, ...LEDGE_ATTACK, ms: LEDGE_GETUP_MS.attack * 0.45 })] },
  { group: 'Defence and ledges', name: 'Taunt', keys: 'U', pad: 'D-pad', desc: `A ${TAUNT_MS / 1000} s pose on the ground; a hit ends it.`, steps: [clip('taunt', { ms: TAUNT_MS })] },

  // ---------------------------------------------------------------- combos
  { group: 'Combos', name: 'Sword combo', keys: 'O, O, O (or hold O)', pad: 'A, A, A (or hold A)', desc: `Overhead slash, rising slash, finisher (classic): ${sum(SWORD_COMBO)} dmg.`, weapon: 'laserSword', steps: SWORD_COMBO.map((m) => strike(m)) },
  { group: 'Combos', name: 'Up tilt → up air', keys: 'W + O, Space, W + P', pad: 'Tilt ▲ + A, Y, ▲ + X', desc: `The up tilt pops them up; jump and follow with the flip kick (classic): ${P.utilt.damage + K.uair.damage} dmg.`, steps: [strike(P.utilt), JUMP, strike(K.uair), FALL, LAND] },
  { group: 'Combos', name: 'Down tilt → forward air', keys: 'S + P, Space, forward + P', pad: 'Tilt ▼ + X, Y, ◀▶ + X', desc: `The sweep lifts them; a short hop flying kick follows: ${K.dtilt.damage + K.fair.damage} dmg.`, steps: [strike(K.dtilt), HOP, strike(K.fair), FALL, LAND] },
  { group: 'Combos', name: 'Short hop nair → jab combo', keys: 'Tap Space, P, land, O O O', pad: 'Tap Y, X, land, A A A', desc: `The spinning kick on the way down (classic), then the jab combo on landing: ${K.nair.damage + sum(COMBO)} dmg.`, steps: [HOP, strike(K.nair), FALL, ...COMBO.map((m) => strike(m))] },
  { group: 'Combos', name: 'Down throw → Raptor Dash', keys: 'I, S, A/D + O + P', pad: 'LB, ▼, ◀▶ + A + X', desc: `Throw down, then chase with the dashing uppercut: ${THROWS.down.damage + SP.raptor.damage} dmg.`, victim: true, steps: [...throwSteps('down'), strike(SP.raptor)] },
];
