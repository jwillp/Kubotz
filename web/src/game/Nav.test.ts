import { describe, expect, it } from 'vitest';
import { UNIT } from '../config';
import { Nav } from './Nav';

const block = (x: number, y: number, w: number, h: number, soft = false) => ({ x: x * UNIT, y: y * UNIT, width: w * UNIT, height: h * UNIT, soft });

describe('Nav', () => {
  // A floor with a soft platform above it.
  const nav = new Nav([block(0, 20, 40, 2), block(10, 14, 12, 1, true)]);
  const floor = nav.surfaceAt(5 * UNIT, 20 * UNIT)!;
  const platform = nav.surfaceAt(16 * UNIT, 14 * UNIT)!;

  it('drops through a soft platform from where the Kubot stands, not its middle', () => {
    const [drop] = nav.path(platform, floor, 11 * UNIT)!;
    expect(drop.kind).toBe('drop');
    expect(drop.fromX).toBe(11 * UNIT);
    expect(drop.toX).toBe(11 * UNIT);
  });

  it('jumps up through it from the nearest spot under it', () => {
    const [jump] = nav.path(floor, platform, 5 * UNIT)!;
    expect(jump.kind).toBe('jump');
    expect(jump.fromX).toBe(10.5 * UNIT);
  });

  it('runs through a portal when that is shorter', () => {
    // Two ledges at the far sides of the map, joined by a portal pair.
    const portals = new Nav([block(0, 20, 6, 2), block(50, 20, 6, 2)], [
      { top: 15 * UNIT, bottom: 20 * UNIT, enterX: 2 * UNIT, dir: -1, exitX: 53 * UNIT, dy: 0 },
      { top: 15 * UNIT, bottom: 20 * UNIT, enterX: 54 * UNIT, dir: 1, exitX: 3 * UNIT, dy: 0 },
    ]);
    const left = portals.surfaceAt(3 * UNIT, 20 * UNIT)!;
    const right = portals.surfaceAt(53 * UNIT, 20 * UNIT)!;
    expect(portals.path(left, right, 4 * UNIT)!.map((l) => l.kind)).toEqual(['warp']);
  });
});
