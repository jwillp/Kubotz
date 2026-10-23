import Phaser from 'phaser';

/**
 * Virtual game pad, like GoatEngine's VirtualGamePad: directions are held
 * buttons (and so are attack, for charging smashes and laser bolts, and
 * guard); grab is "just pressed" for one frame.
 *   attack = A (fists / shoot / slash)
 *   kick   = X (legs); A and X together = special
 *   grab   = LB / RB (and picks up power-ups)
 *   guard  = shield bubble, held (like Super Smash Bros.)
 */
export interface PadState {
  up: boolean; down: boolean; left: boolean; right: boolean;
  attack: boolean; grab: boolean; guard: boolean;
  /** CPU only: this attack is a smash (people flick a direction with the press instead). */
  smash?: boolean;
  /** The jump button (X / Y), held. Pushing up jumps too (tap jump). */
  jump?: boolean;
  /** The kick button (gamepad X, keyboard P), held: leg moves. */
  kick?: boolean;
  /** CPU only: a special move now (people press fists and legs together). */
  special?: boolean;
  /** Taunt (the D-pad), on the frame it is pressed. */
  taunt?: boolean;
  /** An analog stick tilted, not pushed: walk instead of dash, strong attacks instead of smashes, no tap jump. */
  walk?: boolean;
  /** Walking: how far the stick is tilted sideways (0..1 of a full walk), so the walk speed follows it (Ultimate). */
  walkAmount?: number;
  /** The direction came from an analog stick (flicks and tilts apply). */
  analog?: boolean;
  /** Stick only: a direction slammed from the centre this frame (a flick: dash, smash, drop through). */
  flick?: boolean;
  /** Stick only: flicked down this frame (drops through a soft platform). */
  flickDown?: boolean;
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
  jump: string[]; kick: string[]; taunt: string[];
}

export const PLAYER_1_KEYS: KeyBinding = {
  up: ['W'], down: ['S'], left: ['A'], right: ['D'],
  attack: ['O', 'J'], grab: ['I', 'K'], guard: ['SHIFT', 'L'],
  jump: ['SPACE'], kick: ['P'], taunt: ['U'],
};

export const PLAYER_2_KEYS: KeyBinding = {
  up: ['UP'], down: ['DOWN'], left: ['LEFT'], right: ['RIGHT'],
  attack: ['NUMPAD_ONE', 'COMMA'], grab: ['NUMPAD_TWO', 'PERIOD'], guard: ['NUMPAD_THREE', 'NUMPAD_ZERO', 'FORWARD_SLASH'],
  jump: ['NUMPAD_FIVE', 'M'], kick: ['NUMPAD_FOUR', 'N'], taunt: ['NUMPAD_SIX'],
};

/**
 * Gamepad buttons by position (the browser's standard mapping), named as on
 * an Xbox-style pad (the owner's GameSir T4n Lite): A (bottom) = fists,
 * X (left) = legs (A and X together: special), B (right) and Y (top) = jump, LB / RB =
 * grab, LT / RT = shield, D-pad = taunt; left stick moves, right stick
 * smashes. A Nintendo pad gets the same positions.
 */
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const;
export type PadButtonName = keyof typeof BTN;

/** The pad's buttons per action (the layout above); the left stick moves, the right stick smashes. */
export const PAD_BINDING = {
  attack: ['A'], kick: ['X'], jump: ['B', 'Y'], grab: ['LB', 'RB'], guard: ['LT', 'RT'], taunt: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
} as const satisfies Partial<Record<keyof KeyBinding, readonly PadButtonName[]>>;

/** A pad control as drawn on the Controls screen: a button, a stick, or the whole D-pad. */
export type PadControl = PadButtonName | 'LS' | 'RS' | 'DPAD';

/**
 * What the controls do, in the order the Controls screen lists them
 * (scenes/ControlsScene.ts): each with the KeyBinding actions whose keys it
 * shows and the pad controls, so the screen always matches the bindings.
 * `keyText` stands in where a keyboard has no key of its own for it.
 */
export const CONTROLS: { action: string; hint: string; keys: (keyof KeyBinding)[]; keyText?: string; pad: PadControl[] }[] = [
  { action: 'Move', hint: 'Tilt the stick to walk, push it to run · down falls faster in the air', keys: ['up', 'left', 'down', 'right'], pad: ['LS'] },
  { action: 'Jump', hint: 'Again in the air for a double jump · pushing up jumps too', keys: ['jump'], pad: [...PAD_BINDING.jump] },
  { action: 'Fists', hint: 'Jab combo · with a direction: tilts, aerials · flick + press: smash', keys: ['attack'], pad: [...PAD_BINDING.attack] },
  { action: 'Legs', hint: 'Kicks · with a direction: tilts, aerials · flick + press: smash · with Fists: special move', keys: ['kick'], pad: [...PAD_BINDING.kick] },
  { action: 'Smash', hint: 'A smash on the ground, an aerial in the air · keys: hold Fists to charge', keys: [], keyText: 'Flick + Fists', pad: ['RS'] },
  { action: 'Grab', hint: 'Throw an opponent · pick up bonuses', keys: ['grab'], pad: [...PAD_BINDING.grab] },
  { action: 'Shield', hint: 'Held: a bubble that wears down · with a direction: roll, or dodge in the air', keys: ['guard'], pad: [...PAD_BINDING.guard] },
  { action: 'Taunt', hint: 'Show off', keys: ['taunt'], pad: ['DPAD'] },
  { action: 'Pause', hint: 'Settings, controls, quit', keys: [], keyText: 'Esc', pad: ['START'] },
];
/** The triggers are analog: a light pull counts (past 0.5 felt late). */
const TRIGGER = 0.15;
/** Stick: below DEAD is centred, past TILT a direction, past FULL pushed; a flick goes from centred to FULL within FLICK_MS. */
const DEAD = 0.25;
const TILT = 0.3;
const FULL = 0.8;
const FLICK_MS = 70;

/** Keyboard player, optionally merged with a connected gamepad. */
export class HumanController implements Controller {
  private keys: Record<keyof KeyBinding, Phaser.Input.Keyboard.Key[]>;
  private prevPad = { grab: false, taunt: false, cx: 0, cy: 0, left: false, right: false };
  /**
   * Kubeball captains: the D-pad's left / right pressed this frame (-1, 1; 0
   * when not), read by the match to switch the team's strategy. While
   * `sideSwitches` is on, left / right do that instead of taunting.
   */
  side: -1 | 0 | 1 = 0;
  sideSwitches = false;
  /** When each stick axis was last centred, and whether the stick is dashing (flicked sideways, until centred). */
  private centredAt = { x: 0, y: 0 };
  private dashing = false;
  private attackKey: string | null;

  /**
   * @param binding keyboard keys, or null for a gamepad-only player
   * @param padIndex the gamepad merged in (-1: none)
   */
  constructor(private scene: Phaser.Scene, binding: KeyBinding | null, readonly label: 'P1' | 'P2', private padIndex: number, readonly name?: string) {
    const kb = scene.input.keyboard!;
    const keyboard = binding !== null;
    const make = (names: string[]) => (keyboard ? names.map((n) => kb.addKey(n, true)) : []);
    binding ??= PLAYER_1_KEYS; // only the key names: no keys are made
    this.attackKey = keyboard ? binding.attack[0] : null;
    this.keys = {
      up: make(binding.up), down: make(binding.down), left: make(binding.left), right: make(binding.right),
      attack: make(binding.attack), grab: make(binding.grab), guard: make(binding.guard),
      jump: make(binding.jump), kick: make(binding.kick), taunt: make(binding.taunt),
    };
  }

  /** The attack button to show in prompts: A on a gamepad, else the first attack key. */
  get mashButton(): string {
    return this.attackKey === null || this.scene.input.gamepad?.getPad(this.padIndex) ? 'A' : this.attackKey;
  }

  read(): PadState {
    this.side = 0;
    const held = (k: Phaser.Input.Keyboard.Key[]) => k.some((key) => key.isDown);
    const just = (k: Phaser.Input.Keyboard.Key[]) => k.some((key) => Phaser.Input.Keyboard.JustDown(key));
    const s: PadState = {
      up: held(this.keys.up), down: held(this.keys.down),
      left: held(this.keys.left), right: held(this.keys.right),
      attack: held(this.keys.attack), grab: just(this.keys.grab), guard: held(this.keys.guard),
      jump: held(this.keys.jump), kick: held(this.keys.kick), taunt: just(this.keys.taunt),
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
    let flickDown = false;
    if (mx < DEAD) { this.centredAt.x = now; this.dashing = false; }
    else if (mx > FULL && now - this.centredAt.x <= FLICK_MS) { flick = true; this.dashing = true; this.centredAt.x = -1e9; }
    if (my < DEAD) this.centredAt.y = now;
    else if (my > FULL && now - this.centredAt.y <= FLICK_MS) { flick = true; flickDown = ay > 0; this.centredAt.y = -1e9; }
    if (mx > TILT || my > TILT) {
      s.left ||= ax < -TILT; s.right ||= ax > TILT;
      s.up ||= ay < -TILT; s.down ||= ay > TILT;
      // Tilted, not pushed all the way (or flicked): a walk as fast as the tilt
      // (Ultimate), tilt attacks instead of smashes, and no tap jump short of a
      // full push up. Pushed all the way, it dashes and runs at once.
      if (!this.dashing && mx < FULL && !(ay < -FULL)) {
        s.walk = true;
        s.walkAmount = Phaser.Math.Clamp((mx - TILT) / (FULL - TILT), 0.25, 1);
      }
      s.analog = true;
      if (flick) s.flick = true;
      if (flickDown) s.flickDown = true;
    }
    const trigger = (i: number) => (pad.buttons[i]?.value ?? 0) > TRIGGER;
    const pressed = (names: readonly PadButtonName[], on = btn) => names.some((n) => on(BTN[n]));
    s.attack ||= pressed(PAD_BINDING.attack);
    s.kick ||= pressed(PAD_BINDING.kick);
    s.jump ||= pressed(PAD_BINDING.jump);
    s.guard ||= pressed(PAD_BINDING.guard, trigger);
    const grab = pressed(PAD_BINDING.grab);
    s.grab ||= grab && !this.prevPad.grab;
    const left = btn(BTN.LEFT); const right = btn(BTN.RIGHT);
    if (this.sideSwitches) {
      if (left && !this.prevPad.left) this.side = -1;
      if (right && !this.prevPad.right) this.side = 1;
    }
    const taunt = pressed(this.sideSwitches ? PAD_BINDING.taunt.filter((n) => n !== 'LEFT' && n !== 'RIGHT') : PAD_BINDING.taunt);
    s.taunt ||= taunt && !this.prevPad.taunt;
    // Right stick: one smash (or aerial) each time it is pushed out of the centre.
    const cx = axis(2);
    const cy = axis(3);
    const cOut = Math.max(Math.abs(cx), Math.abs(cy)) > 0.6;
    const wasOut = Math.max(Math.abs(this.prevPad.cx), Math.abs(this.prevPad.cy)) > 0.6;
    if (cOut && !wasOut) s.cstick = Math.abs(cx) > Math.abs(cy) ? (cx < 0 ? 'left' : 'right') : (cy < 0 ? 'up' : 'down');
    this.prevPad = { grab, taunt, cx, cy, left, right };
  }
}
