import Phaser from 'phaser';

/**
 * Virtual game pad, like GoatEngine's VirtualGamePad: directions are held
 * buttons, actions are "just pressed" for one frame (prevents button bashing).
 *   attack = BUTTON_A (punch / shoot / slash)
 *   grab   = BUTTON_B (pick up power-ups)
 *   skill  = BUTTON_X (active skill: drone gauntlet)
 */
export interface PadState {
  up: boolean; down: boolean; left: boolean; right: boolean;
  attack: boolean; grab: boolean; skill: boolean;
}

export const emptyPad = (): PadState => ({
  up: false, down: false, left: false, right: false, attack: false, grab: false, skill: false,
});

export interface Controller {
  readonly label: 'P1' | 'P2' | 'CPU';
  read(): PadState;
}

export interface KeyBinding {
  up: string[]; down: string[]; left: string[]; right: string[];
  attack: string[]; grab: string[]; skill: string[];
}

export const PLAYER_1_KEYS: KeyBinding = {
  up: ['W'], down: ['S'], left: ['A'], right: ['D'],
  attack: ['O', 'J'], grab: ['I', 'K'], skill: ['SHIFT', 'L'],
};

export const PLAYER_2_KEYS: KeyBinding = {
  up: ['UP'], down: ['DOWN'], left: ['LEFT'], right: ['RIGHT'],
  attack: ['NUMPAD_ONE', 'COMMA'], grab: ['NUMPAD_TWO', 'PERIOD'], skill: ['NUMPAD_THREE', 'FORWARD_SLASH'],
};

/** Keyboard player, optionally merged with a connected gamepad. */
export class HumanController implements Controller {
  private keys: Record<keyof KeyBinding, Phaser.Input.Keyboard.Key[]>;
  private prevPad = { attack: false, grab: false, skill: false };

  constructor(private scene: Phaser.Scene, binding: KeyBinding, readonly label: 'P1' | 'P2', private padIndex: number) {
    const kb = scene.input.keyboard!;
    const make = (names: string[]) => names.map((n) => kb.addKey(n, true));
    this.keys = {
      up: make(binding.up), down: make(binding.down), left: make(binding.left), right: make(binding.right),
      attack: make(binding.attack), grab: make(binding.grab), skill: make(binding.skill),
    };
  }

  read(): PadState {
    const held = (k: Phaser.Input.Keyboard.Key[]) => k.some((key) => key.isDown);
    const just = (k: Phaser.Input.Keyboard.Key[]) => k.some((key) => Phaser.Input.Keyboard.JustDown(key));
    const s: PadState = {
      up: held(this.keys.up), down: held(this.keys.down),
      left: held(this.keys.left), right: held(this.keys.right),
      attack: just(this.keys.attack), grab: just(this.keys.grab), skill: just(this.keys.skill),
    };

    const pad = this.scene.input.gamepad?.getPad(this.padIndex);
    if (pad) {
      const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      s.left ||= pad.left || ax < -0.4;
      s.right ||= pad.right || ax > 0.4;
      s.up ||= pad.up || ay < -0.6 || pad.A;
      s.down ||= pad.down || ay > 0.6;
      const now = { attack: pad.X, grab: pad.B, skill: pad.Y || pad.R1 > 0 };
      s.attack ||= now.attack && !this.prevPad.attack;
      s.grab ||= now.grab && !this.prevPad.grab;
      s.skill ||= now.skill && !this.prevPad.skill;
      this.prevPad = now;
    }
    // up XOR down, prevalence of up; left XOR right, prevalence of left (InputTranslationSystem)
    if (s.up) s.down = false;
    if (s.left) s.right = false;
    return s;
  }
}
