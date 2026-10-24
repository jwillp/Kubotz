import scml from '../../public/animations/kubotz.scml?raw';
import { describe, expect, it } from 'vitest';
import type { Feel } from './Feel';
import { BASE_BUILD, DEFAULT_BODY, FEET, HEADS, HELMETS, MODULE_KINDS, WEAPONS, BODY_ORDER, BODIES, buildScale, jumpHeight, bodyOf, bodyStats, stepBody } from './Modules';

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

const all = BODY_ORDER.map((id) => BODIES[id]);

describe('body modules', () => {
  it('lists every module once, keyed by its own id', () => {
    expect(new Set(BODY_ORDER).size).toBe(BODY_ORDER.length);
    expect([...BODY_ORDER].sort()).toEqual(Object.keys(BODIES).sort());
    for (const [id, m] of Object.entries(BODIES)) expect(m.id).toBe(id);
  });

  it('falls back to the Core for a missing or unknown id (old saved setups)', () => {
    expect(bodyOf().id).toBe(DEFAULT_BODY);
    expect(bodyOf('nope').id).toBe(DEFAULT_BODY);
    expect(bodyOf('glider').id).toBe('glider');
  });

  it('steps through the menu order both ways and wraps round', () => {
    const order = ['core', 'striker', 'hopper', 'sprinter', 'glider', 'bulwark', 'classic'];
    expect(BODY_ORDER).toEqual(order);
    expect(stepBody('core', 1)).toBe(order[1]);
    expect(stepBody('core', -1)).toBe(order[order.length - 1]);
    expect(stepBody('classic', 1)).toBe('core');
    expect(stepBody(undefined, 2)).toBe(order[2]);
  });

  it('keeps the Core on the standard Kubot feel, build and weight', () => {
    const core = bodyOf('core');
    expect(core.feel.name).toBe('Kubot');
    expect(core.knockback).toBe(1);
    expect(core.build).toEqual(BASE_BUILD);
  });

  it('gives every module its own movement', () => {
    const feels = all.map((m) => JSON.stringify({ ...m.feel, name: '' }));
    expect(new Set(feels).size).toBe(all.length);
  });

  it('matches what the Modules menu says about each one', () => {
    const run = (id: string) => BODIES[id].feel.run;
    // Sprinter: the fastest run of all.
    expect(Math.max(...all.map((m) => m.feel.run))).toBe(run('sprinter'));
    // Glider: the slowest fall and the longest time in the air.
    expect(Math.min(...all.map((m) => m.feel.fall))).toBe(BODIES.glider.feel.fall);
    expect(Math.max(...all.map((m) => airTime(m.feel)))).toBe(airTime(BODIES.glider.feel));
    // Hopper: as high as the Core, hangs longer, the best air control.
    expect(jumpHeight(BODIES.hopper.feel)).toBeGreaterThanOrEqual(jumpHeight(BODIES.core.feel) * 0.98);
    expect(airTime(BODIES.hopper.feel)).toBeGreaterThan(airTime(BODIES.core.feel));
    expect(Math.max(...all.map((m) => m.feel.airAccel))).toBe(BODIES.hopper.feel.airAccel);
    // Bulwark: the heaviest (least knockback), lower jumps than the Core, slow.
    expect(Math.min(...all.map((m) => m.knockback))).toBe(BODIES.bulwark.knockback);
    expect(jumpHeight(BODIES.bulwark.feel)).toBeLessThan(jumpHeight(BODIES.core.feel));
    expect(run('bulwark')).toBeLessThan(run('core'));
    // Striker: lighter than the Core (flies further).
    expect(BODIES.striker.knockback).toBeGreaterThan(1);
  });

  it('keeps knockback and builds in a sane range', () => {
    for (const m of all) {
      expect(m.knockback).toBeGreaterThan(0.7);
      expect(m.knockback).toBeLessThan(1.3);
      for (const v of Object.values(m.build)) { expect(v).toBeGreaterThan(0.7); expect(v).toBeLessThan(1.5); }
    }
  });

  it('scales the stat bars between 0.15 and 1, the extremes at the ends', () => {
    for (const m of all) for (const v of Object.values(bodyStats(m))) { expect(v).toBeGreaterThanOrEqual(0.15); expect(v).toBeLessThanOrEqual(1); }
    expect(bodyStats(BODIES.sprinter).run).toBe(1);
    expect(bodyStats(BODIES.bulwark).weight).toBe(1);
    expect(bodyStats(BODIES.bulwark).run).toBe(0.15);
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

describe('module groups', () => {
  it('has the four groups, each with modules', () => {
    expect(MODULE_KINDS.map((k) => k.kind)).toEqual(['helmet', 'body', 'weapon', 'feet']);
    expect(HELMETS.length).toBeGreaterThan(0);
    expect(WEAPONS.map((w) => w.weapon)).toEqual(['laserGunMkI', 'plasmaBlade']);
    expect(FEET.length).toBe(1);
  });

  it('keeps the helmet order the setup screen and saved setups count by', () => {
    expect(HEADS).toEqual([null, 'head_terminator', 'head_bigbuff', 'head_skull',
      'head_diver', 'head_mantis', 'head_sentinel', 'head_tank', 'head_astro', 'head_brute']);
  });

  it('names whose numbers each body runs on (the debug line)', () => {
    expect(BODIES.glider.debug).toBe('Samus');
    expect(BODIES.sprinter.debug).toBe('Captain Falcon');
    expect(BODIES.classic.debug).toBe('Kubot classic');
    expect(BODIES.core.debug).toMatch(/^Kubot current/);
    for (const m of all) expect(m.debug.length).toBeGreaterThan(0);
  });
});

describe('body looks', () => {
  const torsos = Object.keys(import.meta.glob('../../public/animations/torso/*.png')).map((p) => p.replace('../../public/animations/', ''));
  const files = new Map([...scml.matchAll(/<file id="(\d+)" name="(torso\/[^"]+)"/g)].map((m) => [m[1], m[2]]));

  it('gives every body but the Core and the Classic its own torso, mapped in kubotz.scml', () => {
    for (const m of all) {
      if (m.id === 'core' || m.id === 'classic') { expect(m.look).toBeUndefined(); continue; }
      expect(m.look).toBe(`body_${m.id}`);
      const map = scml.match(new RegExp(`<character_map id="\\d+" name="${m.look}">\\s*<map folder="0" file="0" target_folder="0" target_file="(\\d+)"/>`));
      expect(map, m.id).not.toBeNull();
      const file = files.get(map![1]);
      expect(file).toBe(`torso/torso-${m.id}.png`);
      expect(torsos).toContain(file);
    }
  });
});
