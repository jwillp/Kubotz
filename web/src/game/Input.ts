import Phaser from 'phaser';

/**
 * Virtual game pad, like GoatEngine's VirtualGamePad: directions are held
 * buttons (and so are attack, for charging smashes and laser bolts, and
 * guard); grab is "just pressed" for one frame.
 *   attack = BUTTON_A (punch / shoot / slash)
 *   grab   = BUTTON_B (pick up power-ups)
 *   guard  = shield bubble, held (like Super Smash Bros.)
 */
export interface PadState {
  up: boolean; down: boolean; left: boolean; right: boolean;
  attack: boolean; grab: boolean; guard: boolean;
  /** CPU only: this attack is a smash (people flick a direction with the press instead). */
  smash?: boolean;
  /** The jump button (X / Y), held. Pushing up jumps too (tap jump). */
  jump?: boolean;
  /** The special button (B), held. */
  special?: boolean;
  /** Taunt (the D-pad), on the frame it is pressed. */
  taunt?: boolean;
  /** An analog stick tilted, not pushed: walk instead of dash, strong attacks instead of smashes, no tap jump. */
  walk?: boolean;
  /** The direction came from an analog stick (flicks and tilts apply). */
  analog?: boolean;
  /** Stick only: a direction slammed from the centre this frame (a flick: dash, smash, drop through). */
  flick?: boolean;
  /** The right stick (C-stick) pushed this frame: a smash on the ground, an aerial in the air. */
  cstick?: 'up' | 'down' | 'left' | 'right';
}

export const emptyPad = (): PadState => ({
  up: false, down: false, left: false, right: false, attack: false, grab: false, guard: false,
});

export interface Controller {
  readonly label: 'P1' | 'P2' | 'CPU';
  /** Shown name (P3, P4 for extra pad players); the label otherwise. */
  readonly name?: string;
  read(): PadState;
}

export interface KeyBinding {
  up: string[]; down: string[]; left: string[]; right: string[];
  attack: string[]; grab: string[]; guard: string[];
  jump: string[]; special: string[]; taunt: string[];
}

export const PLAYER_1_KEYS: KeyBinding = {
  up: ['W'], down: ['S'], left: ['A'], right: ['D'],
  attack: ['O', 'J'], grab: ['I', 'K'], guard: ['SHIFT', 'L'],
  jump: ['SPACE'], special: ['P'], taunt: ['U'],
};

export const PLAYER_2_KEYS: KeyBinding = {
  up: ['UP'], down: ['DOWN'], left: ['LEFT'], right: ['RIGHT'],
  attack: ['NUMPAD_ONE', 'COMMA'], grab: ['NUMPAD_TWO', 'PERIOD'], guard: ['NUMPAD_THREE', 'NUMPAD_ZERO', 'FORWARD_SLASH'],
  jump: ['NUMPAD_FIVE', 'M'], special: ['NUMPAD_FOUR', 'N'], taunt: ['NUMPAD_SIX'],
};

/**
 * Gamepad buttons by position (the browser's standard mapping), as on the
 * Smash Ultimate card for a Switch Pro Controller: right face A = attack,
 * bottom face B = special, top and left (X, Y) = jump, L = grab, R / ZL / ZR =
 * shield, D-pad = taunt; left stick moves, right stick smashes.
 */
const BTN = { B: 0, A: 1, Y: 2, X: 3, L: 4, R: 5, ZL: 6, ZR: 7, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const;
/** Stick: below DEAD is centred, past TILT a direction, past FULL pushed; a flick goes from centred to FULL within FLICK_MS. */
const DEAD = 0.25;
const TILT = 0.3;
const FULL = 0.8;
const FLICK_MS = 70;

/** Keyboard player, optionally merged with a connected gamepad. */
export class HumanController implements Controller {
  private keys: Record<keyof KeyBinding, Phaser.Input.Keyboard.Key[]>;
  private prevPad = { grab: false, taunt: false, cx: 0, cy: 0 };
  /** When each stick axis was last centred, and whether the stick is dashing (flicked sideways, until centred). */
  private centredAt = { x: 0, y: 0 };
  private dashing = false;

  /**
   * @param binding keyboard keys, or null for a gamepad-only player
   * @param padIndex the gamepad merged in (-1: none)
   */
  constructor(private scene: Phaser.Scene, binding: KeyBinding | null, readonly label: 'P1' | 'P2', private padIndex: number, readonly name?: string) {
    const kb = scene.input.keyboard!;
    const keyboard = binding !== null;
    const make = (names: string[]) => (keyboard ? names.map((n) => kb.addKey(n, true)) : []);
    binding ??= PLAYER_1_KEYS; // only the key names: no keys are made
    this.keys = {
      up: make(binding.up), down: make(binding.down), left: make(binding.left), right: make(binding.right),
      attack: make(binding.attack), grab: make(binding.grab), guard: make(binding.guard),
      jump: make(binding.jump), special: make(binding.special), taunt: make(binding.taunt),
    };
  }

  read(): PadState {
    const held = (k: Phaser.Input.Keyboard.Key[]) => k.some((key) => key.isDown);
    const just = (k: Phaser.Input.Keyboard.Key[]) => k.some((key) => Phaser.Input.Keyboard.JustDown(key));
    const s: PadState = {
      up: held(this.keys.up), down: held(this.keys.down),
      left: held(this.keys.left), right: held(this.keys.right),
      attack: held(this.keys.attack), grab: just(this.keys.grab), guard: held(this.keys.guard),
      jump: held(this.keys.jump), special: held(this.keys.special), taunt: just(this.keys.taunt),
    };
    const pad = this.scene.input.gamepad?.getPad(this.padIndex);
    if (pad) this.readPad(pad, s);
    // up XOR down, prevalence of up; left XOR right, prevalence of left (InputTranslationSystem)
    if (s.up) s.down = false;
    if (s.left) s.right = false;
    return s;
  }

  /** Merges a gamepad into the keyboard state (see BTN). */
  private readPad(pad: Phaser.Input.Gamepad.Gamepad, s: PadState): void {
    const now = this.scene.time.now;
    const btn = (i: number) => (pad.buttons[i]?.value ?? 0) > 0.5;
    const axis = (i: number) => (pad.axes.length > i ? pad.axes[i].getValue() : 0);
    const ax = axis(0);
    const ay = axis(1);
    const mx = Math.abs(ax);
    const my = Math.abs(ay);
    // Flicks: a stick axis slammed past FULL soon after it was centred.
    let flick = false;
    if (mx < DEAD) { this.centredAt.x = now; this.dashing = false; }
    else if (mx > FULL && now - this.centredAt.x <= FLICK_MS) { flick = true; this.dashing = true; this.centredAt.x = -1e9; }
    if (my < DEAD) this.centredAt.y = now;
    else if (my > FULL && now - this.centredAt.y <= FLICK_MS) { flick = true; this.centredAt.y = -1e9; }
    if (mx > TILT || my > TILT) {
      s.left ||= ax < -TILT; s.right ||= ax > TILT;
      s.up ||= ay < -TILT; s.down ||= ay > TILT;
      // Tilted: walking (unless flicked into a dash), and no tap jump short of a full push up.
      if (!this.dashing && !(ay < -FULL)) s.walk = true;
      s.analog = true;
      if (flick) s.flick = true;
    }
    s.attack ||= btn(BTN.A);
    s.special ||= btn(BTN.B);
    s.jump ||= btn(BTN.X) || btn(BTN.Y);
    s.guard ||= btn(BTN.R) || btn(BTN.ZL) || btn(BTN.ZR);
    const grab = btn(BTN.L);
    s.grab ||= grab && !this.prevPad.grab;
    const taunt = btn(BTN.UP) || btn(BTN.DOWN) || btn(BTN.LEFT) || btn(BTN.RIGHT);
    s.taunt ||= taunt && !this.prevPad.taunt;
    // Right stick: one smash (or aerial) each time it is pushed out of the centre.
    const cx = axis(2);
    const cy = axis(3);
    const cOut = Math.max(Math.abs(cx), Math.abs(cy)) > 0.6;
    const wasOut = Math.max(Math.abs(this.prevPad.cx), Math.abs(this.prevPad.cy)) > 0.6;
    if (cOut && !wasOut) s.cstick = Math.abs(cx) > Math.abs(cy) ? (cx < 0 ? 'left' : 'right') : (cy < 0 ? 'up' : 'down');
    this.prevPad = { grab, taunt, cx, cy };
  }
}
