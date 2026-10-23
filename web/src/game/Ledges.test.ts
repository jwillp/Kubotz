import { describe, expect, it } from 'vitest';
import { UNIT } from '../config';
import { LEDGE_REACH, findLedges, ledgeZone } from './Ledges';
import type { Ledge } from './Kubotz';

const block = (x: number, y: number, w: number, h: number, soft = false) => ({ x: x * UNIT, y: y * UNIT, width: w * UNIT, height: h * UNIT, soft });

describe('findLedges', () => {
  it('gives a lone block a ledge at both top corners', () => {
    const ledges = findLedges([block(10, 10, 6, 2)]);
    expect(ledges).toEqual([
      { x: 10 * UNIT, y: 10 * UNIT, dir: -1 },
      { x: 16 * UNIT, y: 10 * UNIT, dir: 1 },
    ]);
  });

  it('has none on drop-through platforms', () => {
    expect(findLedges([block(10, 10, 6, 1, true)])).toEqual([]);
  });

  it('reports a corner with a wall right against it as blocked', () => {
    const blocked: Ledge[] = [];
    // A floor, and a tall wall touching its right end: no room to hang there.
    const ledges = findLedges([block(10, 10, 6, 2), block(16, 0, 2, 20)], blocked);
    expect(ledges.some((l) => l.x === 16 * UNIT && l.y === 10 * UNIT)).toBe(false);
    expect(blocked).toContainEqual({ x: 16 * UNIT, y: 10 * UNIT, dir: 1 });
  });

  it('blocks a corner with no room to stand just inside it', () => {
    const blocked: Ledge[] = [];
    // A low ceiling right on top of the block's left end.
    findLedges([block(10, 10, 6, 2), block(9, 8.5, 2, 1)], blocked);
    expect(blocked).toContainEqual({ x: 10 * UNIT, y: 10 * UNIT, dir: -1 });
  });
});

describe('ledgeZone', () => {
  it('reaches outwards from the corner, around its height', () => {
    const right = ledgeZone({ x: 640, y: 320, dir: 1 });
    expect(right.x).toBeCloseTo(640 + LEDGE_REACH.outMin * UNIT);
    expect(right.width).toBeCloseTo((LEDGE_REACH.outMax - LEDGE_REACH.outMin) * UNIT);
    expect(right.y).toBeCloseTo(320 - LEDGE_REACH.above * UNIT);
    expect(right.height).toBeCloseTo((LEDGE_REACH.above + LEDGE_REACH.below) * UNIT);
    const left = ledgeZone({ x: 640, y: 320, dir: -1 });
    expect(left.x + left.width).toBeCloseTo(640 - LEDGE_REACH.outMin * UNIT);
  });
});
