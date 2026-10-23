import { describe, expect, it } from 'vitest';
import { BACKDROPS, ROOMS, ROOM_CHOICES, seeded } from './Backdrops';

describe('the rooms', () => {
  it("keeps the original arenas' rooms first, in their order", () => {
    expect(ROOMS.slice(0, 4)).toEqual(['kube', 'foundry', 'skyDeck', 'pit']);
  });
  it('gives every room its own id and a label for the Background list', () => {
    expect(new Set(ROOMS).size).toBe(ROOMS.length);
    expect(ROOM_CHOICES).toHaveLength(BACKDROPS.length);
    for (const [id, label] of ROOM_CHOICES) {
      expect(ROOMS).toContain(id);
      expect(label.length).toBeGreaterThan(0);
    }
  });
  it('has the colour, white and black rooms and the night cities', () => {
    for (const id of ['bloom', 'core', 'coolant', 'lagoon', 'whiteBlue', 'blackRed', 'neonRain', 'ringedPlanet', 'redMoon', 'aurora']) expect(ROOMS).toContain(id);
    expect(BACKDROPS.filter((t) => t.light).every((t) => t.id.startsWith('white'))).toBe(true);
  });
});

describe('seeded', () => {
  it('gives the same numbers for the same seed, between 0 and 1', () => {
    const a = seeded(7), b = seeded(7);
    for (let i = 0; i < 20; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
