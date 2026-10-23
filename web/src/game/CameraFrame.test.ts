import { describe, expect, it } from 'vitest';
import { BASE_WIDEST, FRAME_PAD, MAX_WIDEST, frame, widestFor, type FrameView } from './CameraFrame';

const screen = { screenW: 1280, screenH: 768, hudTop: 40, hudBottom: 88 };
const view: FrameView = { ...screen, narrowest: 24, widest: 58 };

/** The world rows (units) between the HUD's top and bottom, for a framing. */
function band(f: { width: number; y: number }): [number, number] {
  const h = f.width / (screen.screenW / screen.screenH);
  const top = f.y - h / 2;
  return [top + h * screen.hudTop / screen.screenH, top + h * (screen.screenH - screen.hudBottom) / screen.screenH];
}

describe('frame', () => {
  it('stays at its narrowest on Kubotz close together', () => {
    expect(frame([{ x: 20, y: 30 }, { x: 22, y: 30 }], view).width).toBe(24);
  });

  it('keeps everyone between the HUD cards and the timer when they fit', () => {
    const f = frame([{ x: 20, y: 10 }, { x: 24, y: 30 }], view);
    const [top, bottom] = band(f);
    expect(top).toBeLessThanOrEqual(10 - FRAME_PAD.top + 1e-9);
    expect(bottom).toBeGreaterThanOrEqual(30 + FRAME_PAD.bottom - 1e-9);
  });

  it('keeps the human in view when a CPU is too far above to fit', () => {
    const f = frame([{ x: 20, y: 75, human: true }, { x: 22, y: 5 }], view);
    expect(f.width).toBe(58);
    const [, bottom] = band(f);
    expect(bottom).toBeGreaterThanOrEqual(75 + FRAME_PAD.bottom - 1e-9);
  });

  it('centres on everyone when no human is playing', () => {
    const f = frame([{ x: 20, y: 75 }, { x: 22, y: 5 }], view);
    const [top, bottom] = band(f);
    expect((top + bottom) / 2).toBeCloseTo((5 - FRAME_PAD.top + 75 + FRAME_PAD.bottom) / 2);
  });
});

describe('widestFor', () => {
  it('keeps the usual limit on the usual 52 x 38 maps', () => {
    expect(widestFor(52, 38, screen)).toBe(BASE_WIDEST);
  });

  it('goes further out on a taller map, up to the most', () => {
    const tall = widestFor(52, 45, screen);
    expect(tall).toBeGreaterThan(BASE_WIDEST);
    expect(tall).toBeLessThan(MAX_WIDEST);
    expect(widestFor(52, 200, screen)).toBe(MAX_WIDEST);
  });
});
