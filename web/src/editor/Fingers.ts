import type Phaser from 'phaser';

/**
 * The fingers on the game's canvas, tracked from the page's own touch events.
 * Phaser's touch pointers can stay "down" when a touch starts outside the
 * canvas (dragging an element from the dev HUD's palette onto the map), which
 * turned the next one-finger pan into a pinch: only touches that began on
 * the canvas count here.
 *
 * Touches are read in the capture phase on the window, before Phaser's own
 * listeners on the canvas: a second finger is known here by the time Phaser
 * reports its press (read after, the press found one finger and panned).
 */
export class Fingers {
  private readonly at = new Map<number, { x: number; y: number }>();
  private readonly off: (() => void)[] = [];

  constructor(private readonly game: Phaser.Game) {
    const canvas = game.canvas;
    const start = (e: TouchEvent) => { if (e.target === canvas) for (const t of Array.from(e.changedTouches)) this.at.set(t.identifier, this.toGame(t)); };
    const move = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) if (this.at.has(t.identifier)) this.at.set(t.identifier, this.toGame(t)); };
    const end = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) this.at.delete(t.identifier); };
    const on = { passive: true, capture: true };
    window.addEventListener('touchstart', start, on);
    window.addEventListener('touchmove', move, on);
    window.addEventListener('touchend', end, on);
    window.addEventListener('touchcancel', end, on);
    this.off.push(() => window.removeEventListener('touchstart', start, true), () => window.removeEventListener('touchmove', move, true),
      () => window.removeEventListener('touchend', end, true), () => window.removeEventListener('touchcancel', end, true));
  }

  /** How many fingers are on the canvas. */
  get count(): number { return this.at.size; }

  /** The first two fingers (game pixels), or null with fewer. */
  two(): [{ x: number; y: number }, { x: number; y: number }] | null {
    const [a, b] = [...this.at.values()];
    return a && b ? [a, b] : null;
  }

  destroy(): void { for (const f of this.off) f(); this.at.clear(); }

  private toGame(t: Touch): { x: number; y: number } {
    const r = this.game.canvas.getBoundingClientRect();
    const k = this.game.scale.width / r.width;
    return { x: (t.clientX - r.left) * k, y: (t.clientY - r.top) * k };
  }
}
