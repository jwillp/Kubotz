import { gamepads } from '../ui/Fullscreen';

/**
 * Menu navigation shared by the menus (title, settings, pause): arrows / WASD, the
 * D-pad or left stick of any gamepad, with key repeat while held; confirm
 * (Enter, Space, pad A) and back (Esc, Backspace, pad B, Start).
 *
 * It polls the keyboard (through its own window listeners) and
 * `navigator.getGamepads()` directly instead of a scene's input plugins, so
 * a menu opened over a paused scene never sees the press that opened it:
 * a button only counts once it has been seen up, then pressed. A key tapped
 * between two frames still counts.
 */
export interface MenuHandlers {
  /** A step in a direction (dx, dy: -1, 0 or 1), repeated while held. */
  move?(dx: number, dy: number): void;
  confirm?(): void;
  back?(): void;
}

const held = new Set<string>();
/** Presses per key so far: a tap shorter than a frame shows as a new count. */
const presses = new Map<string, number>();
let listening = false;
function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('keydown', (e) => {
    held.add(e.code);
    if (!e.repeat) presses.set(e.code, (presses.get(e.code) ?? 0) + 1);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
}

const KEYS = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  confirm: ['Enter', 'NumpadEnter', 'Space'], back: ['Escape', 'Backspace'],
};
/**
 * A pad's A and B face buttons in the browser's standard mapping, by their
 * labels: on Nintendo pads A is the right button and B the bottom one, on
 * Xbox-style pads (most others, e.g. GameSir, 8BitDo in X mode) A is the
 * bottom one and B the right one.
 */
export function faceButtons(p: { id: string }): { A: number; B: number } {
  return /nintendo|pro controller|joy-con|vendor: 057e/i.test(p.id) ? { A: 1, B: 0 } : { A: 0, B: 1 };
}

/** A pad button: by its label (A, B, see faceButtons) or its index in the standard mapping. */
type PadButton = 'A' | 'B' | number;
// D-pad by position; A confirms, B or Start goes back.
const PAD = { confirm: ['A'] as PadButton[], back: ['B', 9] as PadButton[], up: [12], down: [13], left: [14], right: [15] };
/** Which pad buttons confirm and go back, where a menu wants others than A and B / Start. */
export type PadButtons = Partial<Record<Button, PadButton[]>>;

/**
 * The D-pad of a pad without the standard mapping (the browser could not
 * place its buttons): most show it as a pair of axes (6, 7), DirectInput
 * pads as one "hat" axis (9) stepping round from up (-1) clockwise.
 */
function hatDir(p: Gamepad, dir: 'up' | 'down' | 'left' | 'right'): boolean {
  const ax = (i: number) => p.axes[i] ?? 0;
  if (p.axes.length >= 8) {
    const x = ax(6); const y = ax(7);
    if (dir === 'left' ? x < -0.5 : dir === 'right' ? x > 0.5 : dir === 'up' ? y < -0.5 : y > 0.5) return true;
  }
  if (p.axes.length >= 10) {
    const h = ax(9);
    if (h > 1.1 || h < -1.1) return false; // centred
    // Eight steps of 2/7 from up (-1): up, up-right, right, down-right, down, down-left, left, up-left.
    const step = Math.round((h + 1) / (2 / 7)) % 8;
    const on = { up: [7, 0, 1], right: [1, 2, 3], down: [3, 4, 5], left: [5, 6, 7] }[dir];
    return on.includes(step);
  }
  return false;
}

const REPEAT_DELAY = 320;
const REPEAT_EVERY = 70;

type Button = 'confirm' | 'back';

export class MenuInput {
  private dir = { x: 0, y: 0 };
  private nextRepeat = 0;
  /** Frames polled since the last step: repeats also wait a few frames, so a slow frame never doubles a tap. */
  private frames = 0;
  /** Per button: down last frame, and whether it was seen up since the menu opened. */
  private state: Record<Button, { down: boolean; armed: boolean }> = {
    confirm: { down: true, armed: false }, back: { down: true, armed: false },
  };
  private readonly pad: Record<Button, PadButton[]>;
  /** The key press counts as of the last frame. */
  private seen = new Map<string, number>();
  /** Confirm / back fire when the button is let go (so the scene behind never gets the press). */
  constructor(private handlers: MenuHandlers, private onRelease = false, pad: PadButtons = {}) {
    this.pad = { confirm: pad.confirm ?? PAD.confirm, back: pad.back ?? PAD.back };
    listen();
    this.reset();
  }

  /** What is down now: held keys, keys tapped since the last frame, any pad's buttons and left stick. */
  private read(): { x: number; y: number; confirm: boolean; back: boolean } {
    const pads = gamepads();
    const key = (codes: string[]) => codes.some((c) => held.has(c) || (presses.get(c) ?? 0) !== (this.seen.get(c) ?? 0));
    const btn = (ids: PadButton[]) => pads.some((p) => ids.some((i) => p.buttons[typeof i === 'number' ? i : faceButtons(p)[i]]?.pressed));
    const stick = (axis: number, sign: number) => pads.some((p) => (p.axes[axis] ?? 0) * sign > 0.5);
    const hat = (dir: 'up' | 'down' | 'left' | 'right') => pads.some((p) => p.mapping !== 'standard' && hatDir(p, dir));
    const dir = (d: 'up' | 'down' | 'left' | 'right', axis: number, sign: number) => key(KEYS[d]) || btn(PAD[d]) || stick(axis, sign) || hat(d);
    return {
      x: (dir('right', 0, 1) ? 1 : 0) - (dir('left', 0, -1) ? 1 : 0),
      y: (dir('down', 1, 1) ? 1 : 0) - (dir('up', 1, -1) ? 1 : 0),
      confirm: key(KEYS.confirm) || btn(this.pad.confirm),
      back: key(KEYS.back) || btn(this.pad.back),
    };
  }

  /** Call every frame. */
  update(time: number): void {
    const { x, y, confirm, back } = this.read();
    this.seen = new Map(presses);
    this.frames++;
    if (x !== this.dir.x || y !== this.dir.y) {
      this.dir = { x, y };
      this.nextRepeat = time + REPEAT_DELAY;
      this.frames = -2;
      if (x || y) this.handlers.move?.(x, y);
    } else if ((x || y) && time >= this.nextRepeat && this.frames >= 2) {
      this.nextRepeat = time + REPEAT_EVERY;
      this.frames = 0;
      this.handlers.move?.(x, y);
    }

    this.button('confirm', confirm, () => this.handlers.confirm?.());
    this.button('back', back, () => this.handlers.back?.());
  }

  private button(name: Button, down: boolean, fire: () => void): void {
    const s = this.state[name];
    if (!down) {
      if (s.down && s.armed && this.onRelease) fire();
      s.armed = true;
    } else if (!s.down && s.armed && !this.onRelease) fire();
    s.down = down;
  }

  /**
   * Forget earlier presses, e.g. when a menu shows again: a button held now
   * must be let go first, the next press starts fresh.
   */
  reset(): void {
    this.seen = new Map(presses);
    const now = this.read();
    this.state.confirm = { down: now.confirm, armed: !now.confirm };
    this.state.back = { down: now.back, armed: !now.back };
    this.dir = { x: now.x, y: now.y };
  }
}

