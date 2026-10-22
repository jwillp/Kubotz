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
// Standard gamepad mapping, by position: A is the right face button, B the bottom one (Smash layout).
const PAD = { confirm: [1], back: [0, 9], up: [12], down: [13], left: [14], right: [15] };
/** Which pad buttons confirm and go back, where a menu wants others than A and B / Start. */
export type PadButtons = Partial<Record<Button, number[]>>;

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
  private readonly pad: Record<Button, number[]>;
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
    const pads = (navigator.getGamepads?.() ?? []).filter((p): p is Gamepad => !!p);
    const key = (codes: string[]) => codes.some((c) => held.has(c) || (presses.get(c) ?? 0) !== (this.seen.get(c) ?? 0));
    const btn = (ids: number[]) => pads.some((p) => ids.some((i) => p.buttons[i]?.pressed));
    const stick = (axis: number, sign: number) => pads.some((p) => (p.axes[axis] ?? 0) * sign > 0.5);
    return {
      x: (key(KEYS.right) || btn(PAD.right) || stick(0, 1) ? 1 : 0) - (key(KEYS.left) || btn(PAD.left) || stick(0, -1) ? 1 : 0),
      y: (key(KEYS.down) || btn(PAD.down) || stick(1, 1) ? 1 : 0) - (key(KEYS.up) || btn(PAD.up) || stick(1, -1) ? 1 : 0),
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

