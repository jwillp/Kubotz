import { describe, expect, it } from 'vitest';
import { lightPolygon, rayHit } from './Shadows';

describe('rayHit', () => {
  it('finds how far a ray meets a segment', () => {
    expect(rayHit(0, 0, 1, 0, 10, -5, 10, 5)).toBeCloseTo(10);
  });
  it('misses a segment behind the ray, beside it or parallel to it', () => {
    expect(rayHit(0, 0, 1, 0, -10, -5, -10, 5)).toBeNull();
    expect(rayHit(0, 0, 1, 0, 10, 1, 10, 5)).toBeNull();
    expect(rayHit(0, 0, 1, 0, 0, 3, 10, 3)).toBeNull();
  });
});

describe('lightPolygon', () => {
  it('is a circle of the light radius with nothing around', () => {
    const points = lightPolygon(100, 100, 50, [], 16);
    expect(points).toHaveLength(16);
    for (const p of points) expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(50);
  });

  it('stops at a block in the way and goes on around it', () => {
    // A wall 20 px to the right of the light, from far above to far below it.
    const points = lightPolygon(0, 0, 100, [{ x: 20, y: -500, width: 10, height: 1000 }], 64);
    const right = points.filter((p) => p.x > 0 && Math.abs(p.y) < 10);
    expect(right.length).toBeGreaterThan(0);
    for (const p of right) expect(p.x).toBeCloseTo(20);
    const left = points.find((p) => p.x < -99);
    expect(left).toBeDefined();
  });

  it('ignores blocks out of reach', () => {
    const points = lightPolygon(0, 0, 50, [{ x: 500, y: 500, width: 10, height: 10 }], 8);
    for (const p of points) expect(Math.hypot(p.x, p.y)).toBeCloseTo(50);
  });

  it('casts a sharp shadow edge past a block corner', () => {
    // A small block below and to the right: rays just past its corner are not cut short.
    const block = { x: 30, y: 30, width: 20, height: 20 };
    const points = lightPolygon(0, 0, 200, [block], 32);
    const corner = Math.atan2(30, 50);
    const near = points.filter((p) => Math.abs(Math.atan2(p.y, p.x) - corner) < 2e-4);
    const lengths = near.map((p) => Math.hypot(p.x, p.y));
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(100);
  });
});
