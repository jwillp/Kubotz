import { UNIT } from '../config';
import type { Kubotz } from './Kubotz';

/**
 * Plasma blades meeting: blades that cross in a swing clash (neither Kubot is
 * hurt, both freeze and spring apart), and a strong, square clash locks them
 * in a blade lock, a tug of war won by mashing; the loser's guard breaks.
 */

/** A blade as a segment, emitter to tip (world pixels). */
export interface Blade { x1: number; y1: number; x2: number; y2: number }

/** Blades this close (px) count as touching: the blade hitbox is 0.3 units round its line on each side. */
export const BLADE_TOUCH = 0.5 * UNIT;
/** A clash springs both Kubotz back this fast (px/s) once their freeze ends. */
export const CLASH_RECOIL = 7 * UNIT;
/** A lock keeps both frozen this far ahead, frame after frame. */
export const LOCK_HOLD_MS = 80;
/** Resting blades this close (px) are drawn crossing: they crackle (no collision). */
export const BLADE_CROSS = 8;
/** Locked blades cross this far along (0..1 of their reach towards each other). */
export const LOCK_CROSS = 0.6;
/** How far (px) the pair slides towards the losing side at the end of the bar. */
export const LOCK_SHOVE = 0.7 * UNIT;
/** A lock needs this much damage between the two swings (a smash against a tilt, two smashes)... */
export const LOCK_FORCE = 20;
/** ...and blades crossing at least this square (degrees), not sliding along each other. */
export const LOCK_ANGLE = 30;
/** How long a lock can last (ms); then whoever is ahead wins, or both spring apart on a draw. */
export const LOCK_MS = 2600;
/** How far each press pushes the lock (the meter runs -1..1). */
export const LOCK_STEP = 0.09;
/** Ahead by less than this when time runs out: a draw. */
export const LOCK_DRAW = 0.12;
/** The broken guard: damage and launch dealt by the winner. */
export const LOCK_DAMAGE = 22;
export const LOCK_LAUNCH = { knockback: 22, angle: 38 };
/** A deflected laser flies this much faster and hits this much harder (Smash reflectors: x1.5 damage). */
export const DEFLECT_SPEED = 1.3;
export const DEFLECT_DAMAGE = 1.5;
/** The swing's launch angle, scaled down, aims the deflected laser (a forward swing sends it a little up). */
export const DEFLECT_AIM = 0.6;

/** Closest points of two segments, and their distance. */
export function bladeContact(a: Blade, b: Blade): { x: number; y: number; dist: number } {
  // Segment-segment closest points (Ericson, Real-Time Collision Detection 5.1.9).
  const d1x = a.x2 - a.x1, d1y = a.y2 - a.y1;
  const d2x = b.x2 - b.x1, d2y = b.y2 - b.y1;
  const rx = a.x1 - b.x1, ry = a.y1 - b.y1;
  const aa = d1x * d1x + d1y * d1y, ee = d2x * d2x + d2y * d2y, ff = d2x * rx + d2y * ry;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  let s = 0;
  let t = 0;
  if (aa <= 1e-6 && ee <= 1e-6) { s = 0; t = 0; }
  else if (aa <= 1e-6) { t = clamp(ff / ee); }
  else {
    const c = d1x * rx + d1y * ry;
    if (ee <= 1e-6) { s = clamp(-c / aa); }
    else {
      const bb = d1x * d2x + d1y * d2y;
      const denom = aa * ee - bb * bb;
      s = denom > 1e-6 ? clamp((bb * ff - c * ee) / denom) : 0;
      t = (bb * s + ff) / ee;
      if (t < 0) { t = 0; s = clamp(-c / aa); } else if (t > 1) { t = 1; s = clamp((bb - c) / aa); }
    }
  }
  const px = a.x1 + d1x * s, py = a.y1 + d1y * s;
  const qx = b.x1 + d2x * t, qy = b.y1 + d2y * t;
  return { x: (px + qx) / 2, y: (py + qy) / 2, dist: Math.hypot(px - qx, py - qy) };
}

/**
 * A blade part-way (`t`, 0..1) from where it was last frame to where it is:
 * the emitter moved in a line, the blade turned about it (the short way), so
 * a swing's tip follows its arc instead of cutting across it.
 */
export function lerpBlade(a: Blade, b: Blade, t: number): Blade {
  const x1 = a.x1 + (b.x1 - a.x1) * t;
  const y1 = a.y1 + (b.y1 - a.y1) * t;
  const angA = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
  const angB = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
  let d = angB - angA;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  const ang = angA + d * t;
  const lenA = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
  const len = lenA + (Math.hypot(b.x2 - b.x1, b.y2 - b.y1) - lenA) * t;
  return { x1, y1, x2: x1 + Math.cos(ang) * len, y2: y1 + Math.sin(ang) * len };
}

/** Sub-steps a frame is checked at: a swing sweeps the blade across a Kubot's width in a frame or two. */
const SWEEP = [0, 0.25, 0.5, 0.75, 1];

/**
 * Two blades swept through the frame (from `a0`, `b0` last frame, when
 * known, to `a1`, `b1`): where their paths first cross, or null. Blades
 * swinging past each other between two frames still meet, and so do two
 * swings sweeping through the same spot a moment apart.
 */
export function sweptContact(a0: Blade | undefined, a1: Blade, b0: Blade | undefined, b1: Blade): { x: number; y: number; a: Blade; b: Blade } | null {
  const bs = sweep(b0, b1);
  for (const a of sweep(a0, a1)) {
    for (const b of bs) {
      const c = bladeContact(a, b);
      if (c.dist <= BLADE_TOUCH) return { x: c.x, y: c.y, a, b };
    }
  }
  return null;
}

/** A blade's positions through the frame (from `a0` last frame, when known, to `a1`). */
export function sweep(a0: Blade | undefined, a1: Blade): Blade[] {
  return a0 ? SWEEP.map((t) => lerpBlade(a0, a1, t)) : [a1];
}

/** The angle between two blades (degrees, 0..90). */
export function crossAngle(a: Blade, b: Blade): number {
  const ua = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
  const ub = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
  let d = Math.abs(((ub - ua) * 180) / Math.PI) % 180;
  if (d > 90) d = 180 - d;
  return d;
}

/**
 * A blade lock between two Kubotz: each fresh press pushes the meter towards
 * the other (`a` pushes it up to 1, `b` down to -1).
 */
export class BladeLock {
  meter = 0;
  readonly endsAt: number;
  /** When sparks and the sizzle last went off. */
  lastSpark = 0;
  /** The meter as drawn, easing after the real one. */
  shown = 0;
  /** Where the pair stood when the lock began (the push moves them from there). */
  mid0: number | null = null;

  /** The Kubot on the left (facing right) and the one on the right, kept for the whole lock. */
  readonly left: Kubotz;
  readonly right: Kubotz;

  constructor(readonly a: Kubotz, readonly b: Kubotz, public x: number, public y: number, readonly startedAt: number) {
    this.endsAt = startedAt + LOCK_MS;
    [this.left, this.right] = a.x <= b.x ? [a, b] : [b, a];
  }

  /** Adds the presses since the last frame; returns the winner, 'draw', or null while it goes on. */
  push(pressesA: number, pressesB: number, now: number): Kubotz | 'draw' | null {
    this.meter = Math.max(-1, Math.min(1, this.meter + (pressesA - pressesB) * LOCK_STEP));
    if (this.meter >= 1) return this.a;
    if (this.meter <= -1) return this.b;
    if (now < this.endsAt) return null;
    if (Math.abs(this.meter) < LOCK_DRAW) return 'draw';
    return this.meter > 0 ? this.a : this.b;
  }

  has(k: Kubotz): boolean { return k === this.a || k === this.b; }
}
