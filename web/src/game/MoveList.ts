import { Config, UNIT } from '../config';
import { CLIPS } from '../anim/Clips';
import {
  COMBO, DIR_MOVES, GUN_CHARGE_MS, GUN_TAP_MS, HANG_DX, HANG_DY, LEDGE_ATTACK, LEDGE_GETUP_MS, LEDGE_INTANGIBLE, LEDGE_INWARD,
  PUMMEL_DAMAGE, PUMMEL_MS, SHORT_HOP, SMASH_CHARGE_BONUS, SMASH_CHARGE_MS, SPECIALS, SWORD_COMBO, SWORD_DIR_MOVES,
  TAUNT_MS, THROWS, type Move, type ThrowKind, type Weapon,
} from './Kubotz';

/**
 * The move list (MoveListScene): every move and a few combos, each with its
 * inputs, a line on what it does (numbers from the move tables in Kubotz.ts)
 * and the steps the preview Kubot plays in a loop.
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
  /** Plays until the Kubot lands. */
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
  /** Where the Kubot starts (units, x forwards, y up) and whether a ledge stands at x = 0. */
  start?: [number, number];
  ledge?: boolean;
  /** A second Kubot stands in reach to be grabbed, pummelled, thrown and hit. */
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

const D = DIR_MOVES;
const S = SWORD_DIR_MOVES;
const SP = SPECIALS;

export const MOVE_LIST: MoveEntry[] = [
  // ---------------------------------------------------------------- ground
  { group: 'Ground', name: 'Jab', keys: 'O', pad: 'A', desc: `Palm strike, the first hit of the jab combo. ${stats(COMBO[0])}.`, steps: ground(COMBO[0]) },
  { group: 'Ground', name: 'Forward tilt', keys: 'Hold A/D, then O', pad: 'Tilt ◀▶ + A', desc: `A low side kick. ${stats(D.ftilt)}.`, steps: ground(D.ftilt) },
  { group: 'Ground', name: 'Down tilt', keys: 'Hold S, then O', pad: 'Tilt ▼ + A', desc: `A crouching sweep that pops up. ${stats(D.dtilt)}.`, steps: ground(D.dtilt) },
  { group: 'Ground', name: 'Up tilt', keys: 'Hold W (landed), then O', pad: 'Tilt ▲ + A', desc: `A rising palm over the head. ${stats(D.utilt)}.`, steps: ground(D.utilt) },
  { group: 'Ground', name: 'Dash attack', keys: 'Run + O', pad: 'Dash + A', desc: `A flying kick out of a run. ${stats(D.dash)}.`, steps: [clip('run', { ms: 380, vel: [Config.MAX_SPEED, null], run: true }), strike(D.dash)] },

  // ---------------------------------------------------------------- smashes
  { group: 'Smash attacks', name: 'Forward smash', keys: 'A/D with O', pad: 'Flick ◀▶ + A, or right stick', desc: `The fire gauntlet punch. ${stats(D.fsmash)}. ${CHARGE}`, steps: smash(D.fsmash) },
  { group: 'Smash attacks', name: 'Up smash', keys: 'W with O', pad: 'Flick ▲ + A, or right stick', desc: `A vertical scissor kick. ${stats(D.usmash)}. ${CHARGE}`, steps: smash(D.usmash) },
  { group: 'Smash attacks', name: 'Down smash', keys: 'S with O', pad: 'Flick ▼ + A, or right stick', desc: `A split kick to both sides. ${stats(D.dsmash)}. ${CHARGE}`, steps: smash(D.dsmash) },

  // ---------------------------------------------------------------- aerials
  { group: 'Aerials', name: 'Neutral air', keys: 'O in the air', pad: 'A in the air', desc: `A spinning kick all round. ${stats(D.nair)}.`, steps: aerial(D.nair) },
  { group: 'Aerials', name: 'Forward air', keys: 'Forward + O in the air', pad: '◀▶ + A, or right stick', desc: `A flying front kick. ${stats(D.fair)}.`, steps: aerial(D.fair) },
  { group: 'Aerials', name: 'Back air', keys: 'Back + O in the air', pad: 'Back + A, or right stick', desc: `A kick behind. ${stats(D.bair)}.`, steps: aerial(D.bair) },
  { group: 'Aerials', name: 'Up air', keys: 'W + O in the air', pad: '▲ + A, or right stick', desc: `An overhead flip kick. ${stats(D.uair)}.`, steps: aerial(D.uair) },
  { group: 'Aerials', name: 'Down air', keys: 'S + O in the air', pad: '▼ + A, or right stick', desc: `A stomping dive kick that spikes. ${stats(D.dair)}.`, steps: aerial(D.dair) },

  // ---------------------------------------------------------------- specials
  { group: 'Specials', name: 'Ion Punch', keys: 'P', pad: 'B', desc: `A slow wind-up and a huge fire punch; back + P turns round first. ${stats(SP.ion)}.`, steps: ground(SP.ion) },
  { group: 'Specials', name: 'Ion Punch (air)', keys: 'P in the air', pad: 'B in the air', desc: `Hangs in the air through the wind-up. ${stats(SP.ion)}.`, steps: [JUMP, strike(SP.ion, { hover: 0.6 }), FALL, LAND] },
  { group: 'Specials', name: 'Raptor Dash', keys: 'A/D + P', pad: '◀▶ + B', desc: `A dashing fire uppercut. ${stats(SP.raptor)}.`, steps: ground(SP.raptor) },
  { group: 'Specials', name: 'Raptor Dash (air)', keys: 'A/D + P in the air', pad: '◀▶ + B in the air', desc: `A downward fire strike; once per trip in the air. ${stats(SP.raptorAir)}.`, steps: [JUMP, strike(SP.raptorAir), FALL, LAND] },
  { group: 'Specials', name: 'Shadow Dive', keys: 'W + P', pad: '▲ + B', desc: `A rising strike to recover, then helpless until landing or a ledge. ${stats(SP.dive)}.`, steps: [strike(SP.dive), FALL, LAND] },
  { group: 'Specials', name: 'Plasma Kick', keys: 'S + P', pad: '▼ + B', desc: `A sliding fire kick along the ground. ${stats(SP.kick)}.`, steps: ground(SP.kick) },
  { group: 'Specials', name: 'Plasma Kick (air)', keys: 'S + P in the air', pad: '▼ + B in the air', desc: `A diagonal dive kick, ending on landing. ${stats(SP.kickAir)}.`, steps: [clip('jump', { jump: 1, ms: 420 }), strike(SP.kickAir, { endOnLand: true }), LAND] },

  // ---------------------------------------------------------------- sword
  { group: 'Laser sword', name: 'Sword jab', keys: 'O', pad: 'A', desc: `An overhead slash, the first of the sword combo. ${stats(SWORD_COMBO[0])}.`, weapon: 'laserSword', steps: ground(SWORD_COMBO[0]) },
  { group: 'Laser sword', name: 'Sword forward tilt', keys: 'Hold A/D, then O', pad: 'Tilt ◀▶ + A', desc: `A full spinning slash. ${stats(S.ftilt)}.`, weapon: 'laserSword', steps: ground(S.ftilt) },
  { group: 'Laser sword', name: 'Sword down tilt', keys: 'Hold S, then O', pad: 'Tilt ▼ + A', desc: `A low slash. ${stats(S.dtilt)}.`, weapon: 'laserSword', steps: ground(S.dtilt) },
  { group: 'Laser sword', name: 'Sword up tilt', keys: 'Hold W (landed), then O', pad: 'Tilt ▲ + A', desc: `An overhead arc. ${stats(S.utilt)}.`, weapon: 'laserSword', steps: ground(S.utilt) },
  { group: 'Laser sword', name: 'Sword dash attack', keys: 'Run + O', pad: 'Dash + A', desc: `A lunging slash out of a run. ${stats(S.dash)}.`, weapon: 'laserSword', steps: [clip('run', { ms: 380, vel: [Config.MAX_SPEED, null], run: true }), strike(S.dash)] },
  { group: 'Laser sword', name: 'Sword forward smash', keys: 'A/D with O', pad: 'Flick ◀▶ + A', desc: `${stats(S.fsmash)}. ${CHARGE}`, weapon: 'laserSword', steps: smash(S.fsmash) },
  { group: 'Laser sword', name: 'Sword up smash', keys: 'W with O', pad: 'Flick ▲ + A', desc: `${stats(S.usmash)}. ${CHARGE}`, weapon: 'laserSword', steps: smash(S.usmash) },
  { group: 'Laser sword', name: 'Sword down smash', keys: 'S with O', pad: 'Flick ▼ + A', desc: `A flat spin slash round both sides. ${stats(S.dsmash)}. ${CHARGE}`, weapon: 'laserSword', steps: smash(S.dsmash) },
  { group: 'Laser sword', name: 'Sword neutral air', keys: 'O in the air', pad: 'A in the air', desc: `${stats(S.nair)}.`, weapon: 'laserSword', steps: aerial(S.nair) },
  { group: 'Laser sword', name: 'Sword forward air', keys: 'Forward + O in the air', pad: '◀▶ + A in the air', desc: `${stats(S.fair)}.`, weapon: 'laserSword', steps: aerial(S.fair) },
  { group: 'Laser sword', name: 'Sword back air', keys: 'Back + O in the air', pad: 'Back + A in the air', desc: `${stats(S.bair)}.`, weapon: 'laserSword', steps: aerial(S.bair) },
  { group: 'Laser sword', name: 'Sword up air', keys: 'W + O in the air', pad: '▲ + A in the air', desc: `${stats(S.uair)}.`, weapon: 'laserSword', steps: aerial(S.uair) },
  { group: 'Laser sword', name: 'Sword down air', keys: 'S + O in the air', pad: '▼ + A in the air', desc: `${stats(S.dair)}.`, weapon: 'laserSword', steps: aerial(S.dair) },

  // ---------------------------------------------------------------- gun
  { group: 'Laser gun', name: 'Quick shot', keys: 'Tap O', pad: 'Tap A', desc: `A tap (under ${GUN_TAP_MS} ms) fires a light bolt: ${shotDamage(0)} dmg (Mk I).`, weapon: 'laserGunMkI', steps: [clip('idle', { ms: 300 }), shot(0), clip('idle', { ms: 250 }), shot(0)] },
  { group: 'Laser gun', name: 'Charged shot', keys: 'Hold O, release', pad: 'Hold A, release', desc: `Charges for up to ${GUN_CHARGE_MS / 1000} s: a big, slower bolt with strong recoil, up to ${shotDamage(1)} dmg (Mk I).`, weapon: 'laserGunMkI', steps: [clip('idle', { ms: GUN_CHARGE_MS, gather: true }), shot(1)] },

  // ---------------------------------------------------------------- grabs
  { group: 'Grab and throws', name: 'Grab', keys: 'I', pad: 'L', desc: 'Reaches just in front (not a Kubot behind its guard); also picks up power-up balls. A miss has end lag.', victim: true, steps: [clip('grab'), clip('grabHold', { ms: 700 })] },
  { group: 'Grab and throws', name: 'Pummel', keys: 'O while holding', pad: 'A while holding', desc: `${PUMMEL_DAMAGE} dmg a hit.`, victim: true, steps: [clip('grab'), clip('grabHold', { ms: 300 }), clip('pummel', { ms: PUMMEL_MS }), clip('pummel', { ms: PUMMEL_MS }), clip('grabHold', { ms: 300 })] },
  { group: 'Grab and throws', name: 'Forward throw', keys: 'Forward while holding', pad: '◀▶ while holding', desc: `${stats(THROWS.forward)}.`, victim: true, steps: throwSteps('forward') },
  { group: 'Grab and throws', name: 'Back throw', keys: 'Back while holding', pad: 'Back while holding', desc: `With a spin. ${stats(THROWS.back)}.`, victim: true, steps: throwSteps('back') },
  { group: 'Grab and throws', name: 'Up throw', keys: 'W while holding', pad: '▲ while holding', desc: `${stats(THROWS.up)}.`, victim: true, steps: throwSteps('up') },
  { group: 'Grab and throws', name: 'Down throw', keys: 'S while holding', pad: '▼ while holding', desc: `${stats(THROWS.down)}.`, victim: true, steps: throwSteps('down') },

  // ---------------------------------------------------------------- defence and movement
  { group: 'Defence and ledges', name: 'Guard', keys: 'Hold Shift', pad: 'Hold R, ZL or ZR', desc: `A shield bubble that soaks hits and shrinks while held; it breaks when empty (${Config.GUARD_MAX} guard).`, steps: [clip('guard', { ms: 1200, bubble: true })] },
  { group: 'Defence and ledges', name: 'Air dodge', keys: 'Shift + direction in the air', pad: 'R + direction in the air', desc: `Intangible for ${Config.AIR_DODGE_DURATION} ms, moving the way held; once per trip in the air.`, steps: [JUMP, clip('dodge', { ms: Config.AIR_DODGE_DURATION, vel: [Config.AIR_DODGE_SPEED * 0.7, Config.AIR_DODGE_SPEED * 0.7], float: true, ghostly: true }), FALL, LAND] },
  { group: 'Defence and ledges', name: 'Ledge hang and climb', keys: 'Fall past a ledge, then toward', pad: 'Fall past a ledge, then toward', desc: `Caught on the way down; intangible ${Math.round(LEDGE_INTANGIBLE)} ms, jumps restored. Toward climbs up.`, ledge: true, start: HANG, steps: [HANG_STEP, ledge('climb'), clip('idle', { ms: 300 })] },
  { group: 'Defence and ledges', name: 'Ledge jump', keys: 'W on a ledge', pad: '▲ on a ledge', desc: 'A jump straight off the ledge.', ledge: true, start: HANG, steps: [HANG_STEP, clip('jump', { jump: 1.05, vel: [2, null] }), FALL, LAND] },
  { group: 'Defence and ledges', name: 'Ledge roll', keys: 'Shift on a ledge', pad: 'R on a ledge', desc: 'Rolls in over the top, intangible.', ledge: true, start: HANG, steps: [HANG_STEP, ledge('roll'), clip('idle', { ms: 300 })] },
  { group: 'Defence and ledges', name: 'Ledge attack', keys: 'O on a ledge', pad: 'A on a ledge', desc: `Climbs up with a sweep kick. ${stats(LEDGE_ATTACK)}.`, ledge: true, start: HANG,
    steps: [HANG_STEP, clip('climb', { ms: LEDGE_GETUP_MS.attack * 0.55, path: [LEDGE_INWARD.attack, 0], ghostly: true }), strike({ ...D.ftilt, ...LEDGE_ATTACK, ms: LEDGE_GETUP_MS.attack * 0.45 })] },
  { group: 'Defence and ledges', name: 'Taunt', keys: 'U', pad: 'D-pad', desc: `A ${TAUNT_MS / 1000} s pose on the ground; a hit ends it.`, steps: [clip('taunt', { ms: TAUNT_MS })] },

  // ---------------------------------------------------------------- combos
  { group: 'Combos', name: 'Jab combo', keys: 'O, O, O (or hold O)', pad: 'A, A, A (or hold A)', desc: `Palm strike, spinning back fist, jumping spin kick: ${sum(COMBO)} dmg; the first two stun so the next connects.`, steps: COMBO.map((m) => strike(m)) },
  { group: 'Combos', name: 'Sword combo', keys: 'O, O, O (or hold O)', pad: 'A, A, A (or hold A)', desc: `Overhead slash, rising slash, finisher: ${sum(SWORD_COMBO)} dmg.`, weapon: 'laserSword', steps: SWORD_COMBO.map((m) => strike(m)) },
  { group: 'Combos', name: 'Up tilt → up air', keys: 'W + O, Space, W + O', pad: 'Tilt ▲ + A, X, ▲ + A', desc: `The up tilt pops them up; jump and follow with the up air: ${D.utilt.damage + D.uair.damage} dmg.`, steps: [strike(D.utilt), JUMP, strike(D.uair), FALL, LAND] },
  { group: 'Combos', name: 'Down tilt → forward air', keys: 'S + O, Space, forward + O', pad: 'Tilt ▼ + A, X, ◀▶ + A', desc: `The sweep lifts them; a short hop forward air follows: ${D.dtilt.damage + D.fair.damage} dmg.`, steps: [strike(D.dtilt), HOP, strike(D.fair), FALL, LAND] },
  { group: 'Combos', name: 'Short hop nair → jab combo', keys: 'Tap Space, O, land, O O O', pad: 'Tap X, A, land, A A A', desc: `A neutral air on the way down, then the jab combo on landing: ${D.nair.damage + sum(COMBO)} dmg.`, steps: [HOP, strike(D.nair), FALL, ...COMBO.map((m) => strike(m))] },
  { group: 'Combos', name: 'Down throw → Raptor Dash', keys: 'I, S, A/D + P', pad: 'L, ▼, ◀▶ + B', desc: `Throw down, then chase with the dashing uppercut: ${THROWS.down.damage + SP.raptor.damage} dmg.`, victim: true, steps: [...throwSteps('down'), strike(SP.raptor)] },
];
