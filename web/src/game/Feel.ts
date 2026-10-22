import { Config } from '../config';

/**
 * Movement "feel" presets: the Kubotz' run, walk, air control, gravity, fall
 * speeds and jumps, either the Kubot's own or those of a Super Smash Bros.
 * Ultimate fighter converted to Kubotz units (docs/ultimate-reference: speeds
 * x 60 x s, accelerations x 3600 x s, with s = 0.1333 Kubotz units per Ultimate
 * unit). Jump speeds are solved so a full hop and a short hop stay in the air
 * as many frames as the fighter's (SH / FH air time) under its gravity and
 * fall speed. The Kubot's own (the default) is Fox's with Falco's jump
 * heights (owner, 2026-10-22). Switched in a match with the number keys
 * (1 Kubot, 2 Fox, 3 Falco, 4 Captain Falcon, 5 Samus, 6 the Kubot's
 * original feel) or ?feel=fox in the address.
 */
export interface Feel {
  name: string;
  /** Ground speeds (units/s): the walk at a full walk tilt, the initial dash, the run. */
  walk: number; dash: number; run: number;
  /** Air speed (units/s) and air acceleration (units/s²). */
  air: number; airAccel: number;
  /** Gravity rising and falling (units/s²): Ultimate fighters fall under the same gravity they rise with. */
  gravity: number; fallGravity: number;
  /** Fall and fast-fall speeds (units/s). */
  fall: number; fastFall: number;
  /** Full hop take-off speed (units/s) and the short hop's share of it. */
  jump: number; shortHop: number;
}

export const FEELS: Record<string, Feel> = {
  // Fox's movement, falls and air control, with Falco's full and short hop heights (5.8 and 2.2 units)
  // under Fox's gravity: 35.7 u/s take-off, short hop 0.62 of it (45 / 24 frames in the air).
  kubot: { name: 'Kubot', walk: 12.2, dash: 16.7, run: 19.2, air: 8.9, airAccel: 43, gravity: 110, fallGravity: 110, fall: 16.8, fastFall: 26.9, jump: 35.7, shortHop: 0.62 },
  // The Kubot's movement before the presets: slower run, heavy falls, fast air drift.
  classic: {
    name: 'Kubot classic', walk: 8.4, dash: 15.4, run: Config.RUN_SPEED, air: Config.MAX_SPEED, airAccel: Config.RUN_ACCELERATION,
    gravity: Config.GRAVITY, fallGravity: Config.GRAVITY * (1 + Config.FALL_GRAVITY_BONUS),
    fall: Config.MAX_FALL_SPEED, fastFall: Config.FAST_FALL_SPEED, jump: Config.JUMP_VELOCITY, shortHop: 0.68,
  },
  // Ultimate (units/frame): walk 1.523, dash 2.09, run 2.402, air 1.11, air accel 0.09, gravity 0.23, fall 2.1 / 3.36, SH / FH 24 / 36 f.
  fox: { name: 'Fox', walk: 12.2, dash: 16.7, run: 19.2, air: 8.9, airAccel: 43, gravity: 110, fallGravity: 110, fall: 16.8, fastFall: 26.9, jump: 30.4, shortHop: 0.72 },
  // walk 1.344, dash 2.035, run 1.619, air 0.977, air accel 0.1, gravity 0.13, fall 1.8 / 2.88, SH / FH 32 / 57 f.
  falco: { name: 'Falco', walk: 10.7, dash: 16.3, run: 12.9, air: 7.8, airAccel: 48, gravity: 62, fallGravity: 62, fall: 14.4, fastFall: 23.0, jump: 26.9, shortHop: 0.62 },
  // walk 0.987, dash 1.98, run 2.552, air 1.218, air accel 0.075, gravity 0.12, fall 1.865 / 2.984, SH / FH 34 / 48 f.
  falcon: { name: 'Captain Falcon', walk: 7.9, dash: 15.8, run: 20.4, air: 9.7, airAccel: 36, gravity: 58, fallGravity: 58, fall: 14.9, fastFall: 23.9, jump: 22.2, shortHop: 0.74 },
  // walk 1.115, dash 1.87, run 1.654, air 1.103, air accel 0.09, gravity 0.075, fall 1.33 / 2.128, SH / FH 44 / 61 f.
  samus: { name: 'Samus', walk: 8.9, dash: 15.0, run: 13.2, air: 8.8, airAccel: 43, gravity: 36, fallGravity: 36, fall: 10.6, fastFall: 17.0, jump: 17.3, shortHop: 0.76 },
};

/** The keys 1 to 6, in order. */
export const FEEL_ORDER = ['kubot', 'fox', 'falco', 'falcon', 'samus', 'classic'];

const KEY = 'kubotz.feel';
const fromUrl = new URLSearchParams(location.search).get('feel');
let currentKey = fromUrl && FEELS[fromUrl] ? fromUrl : (() => {
  try { const k = localStorage.getItem(KEY); return k && FEELS[k] ? k : 'kubot'; } catch { return 'kubot'; }
})();

/** The feel the Kubotz move with now. */
export const feel = (): Feel => FEELS[currentKey];

export function setFeel(key: string): Feel {
  if (!FEELS[key]) return feel();
  currentKey = key;
  try { localStorage.setItem(KEY, key); } catch { /* not saved */ }
  return feel();
}
