import { describe, expect, it } from 'vitest';
import type { Feel } from './Feel';
import { BASE_BUILD, DEFAULT_MODULE, MODULE_ORDER, MODULES, buildScale, jumpHeight, moduleOf, moduleStats, stepModule } from './Modules';

/** Seconds in the air for a full hop: up under gravity, down under the fall gravity up to the fall speed. */
function airTime(f: Feel): number {
  const h = jumpHeight(f);
  const up = f.jump / f.gravity;
  // Time to reach the fall speed, and the distance covered meanwhile.
  const tCap = f.fall / f.fallGravity;
  const dCap = 0.5 * f.fallGravity * tCap * tCap;
  const down = h <= dCap ? Math.sqrt((2 * h) / f.fallGravity) : tCap + (h - dCap) / f.fall;
  return up + down;
}

const all = MODULE_ORDER.map((id) => MODULES[id]);

describe('body modules', () => {
  it('lists every module once, keyed by its own id', () => {
    expect(new Set(MODULE_ORDER).size).toBe(MODULE_ORDER.length);
    expect([...MODULE_ORDER].sort()).toEqual(Object.keys(MODULES).sort());
    for (const [id, m] of Object.entries(MODULES)) expect(m.id).toBe(id);
  });

  it('falls back to the Core for a missing or unknown id (old saved setups)', () => {
    expect(moduleOf().id).toBe(DEFAULT_MODULE);
    expect(moduleOf('nope').id).toBe(DEFAULT_MODULE);
    expect(moduleOf('glider').id).toBe('glider');
  });

  it('steps through the menu order both ways and wraps round', () => {
    const order = ['core', 'striker', 'hopper', 'sprinter', 'glider', 'bulwark'];
    expect(stepModule('core', 1)).toBe(order[1]);
    expect(stepModule('core', -1)).toBe(order[order.length - 1]);
    expect(stepModule('bulwark', 1)).toBe('core');
    expect(stepModule(undefined, 2)).toBe(order[2]);
  });

  it('keeps the Core on the standard Kubot feel, build and weight', () => {
    const core = moduleOf('core');
    expect(core.feel.name).toBe('Kubot');
    expect(core.knockback).toBe(1);
    expect(core.build).toEqual(BASE_BUILD);
  });

  it('gives every module its own movement', () => {
    const feels = all.map((m) => JSON.stringify({ ...m.feel, name: '' }));
    expect(new Set(feels).size).toBe(all.length);
  });

  it('matches what the Modules menu says about each one', () => {
    const run = (id: string) => MODULES[id].feel.run;
    // Sprinter: the fastest run of all.
    expect(Math.max(...all.map((m) => m.feel.run))).toBe(run('sprinter'));
    // Glider: the slowest fall and the longest time in the air.
    expect(Math.min(...all.map((m) => m.feel.fall))).toBe(MODULES.glider.feel.fall);
    expect(Math.max(...all.map((m) => airTime(m.feel)))).toBe(airTime(MODULES.glider.feel));
    // Hopper: as high as the Core, hangs longer, the best air control.
    expect(jumpHeight(MODULES.hopper.feel)).toBeGreaterThanOrEqual(jumpHeight(MODULES.core.feel) * 0.98);
    expect(airTime(MODULES.hopper.feel)).toBeGreaterThan(airTime(MODULES.core.feel));
    expect(Math.max(...all.map((m) => m.feel.airAccel))).toBe(MODULES.hopper.feel.airAccel);
    // Bulwark: the heaviest (least knockback), lower jumps than the Core, slow.
    expect(Math.min(...all.map((m) => m.knockback))).toBe(MODULES.bulwark.knockback);
    expect(jumpHeight(MODULES.bulwark.feel)).toBeLessThan(jumpHeight(MODULES.core.feel));
    expect(run('bulwark')).toBeLessThan(run('core'));
    // Striker: lighter than the Core (flies further).
    expect(MODULES.striker.knockback).toBeGreaterThan(1);
  });

  it('keeps knockback and builds in a sane range', () => {
    for (const m of all) {
      expect(m.knockback).toBeGreaterThan(0.7);
      expect(m.knockback).toBeLessThan(1.3);
      for (const v of Object.values(m.build)) { expect(v).toBeGreaterThan(0.7); expect(v).toBeLessThan(1.5); }
    }
  });

  it('scales the stat bars between 0.15 and 1, the extremes at the ends', () => {
    for (const m of all) for (const v of Object.values(moduleStats(m))) { expect(v).toBeGreaterThanOrEqual(0.15); expect(v).toBeLessThanOrEqual(1); }
    expect(moduleStats(MODULES.sprinter).run).toBe(1);
    expect(moduleStats(MODULES.bulwark).weight).toBe(1);
    expect(moduleStats(MODULES.bulwark).run).toBe(0.15);
  });
});

describe('buildScale', () => {
  const b = { torso: 1.2, arms: 1.3, legs: 1.4 };

  it('scales the torso whole, and only the thickness of arms and legs', () => {
    expect(buildScale('torso/torso.png', b)).toEqual([1.2, 1.2]);
    expect(buildScale('arms/fore-arm.png', b)).toEqual([1, 1.3]);
    expect(buildScale('legs/thigh-sha.png', b)).toEqual([1, 1.4]);
  });

  it('lets feet follow the legs halfway and leaves helmets and weapons alone', () => {
    const [fx, fy] = buildScale('feet/foot.png', b);
    expect(fx).toBeCloseTo(1.2);
    expect(fy).toBeCloseTo(1.2);
    expect(buildScale('head/helmet3.png', b)).toEqual([1, 1]);
    expect(buildScale('arms/gun-mk1.png', b)).toEqual([1, 1]);
    expect(buildScale('arms/plasma-blade.png', b)).toEqual([1, 1]);
  });

  it('changes nothing on the base build', () => {
    for (const f of ['torso/torso.png', 'arms/hand.png', 'legs/lower-leg.png', 'feet/foot-sha.png']) expect(buildScale(f, BASE_BUILD)).toEqual([1, 1]);
  });
});
