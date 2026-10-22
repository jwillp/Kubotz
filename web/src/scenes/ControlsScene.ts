import Phaser from 'phaser';
import { CONTROLS, PLAYER_1_KEYS, PLAYER_2_KEYS, type KeyBinding, type PadControl } from '../game/Input';
import { MenuInput } from './MenuInput';
import { BEVEL, drawGlow, drawPlate, drawStrip, menuScreenFx, METAL, METAL_EDGE, METAL_TOP, PlateButton } from '../ui/Plate';
import { body, heading, NEON } from '../ui/Type';
import { uiSound } from '../audio/Sounds';
import { gamepads } from '../ui/Fullscreen';

/** What opened the controls: the scenes it paused, resumed when it closes. */
export interface ControlsData { resume?: string[]; }

type Tab = 'keyboard' | 'gamepad';
const TABS: { tab: Tab; label: string }[] = [{ tab: 'keyboard', label: 'Keyboard' }, { tab: 'gamepad', label: 'Gamepad' }];
/** The tab shown last, kept for the next visit (the first one follows whether a pad is plugged in). */
let lastTab: Tab | undefined;

/** The frame (screen pixels) and the rows inside it. */
const FRAME = { x: 90, y: 34, w: 1100, h: 700 };
const ROWS_TOP = 236;
const ROW_H = 47;

/** Key names as printed on the keys. */
const KEY_NAMES: Record<string, string> = {
  UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', SPACE: 'Space', SHIFT: 'Shift', COMMA: ',', PERIOD: '.', FORWARD_SLASH: '/',
};
const keyName = (k: string) => KEY_NAMES[k] ?? k.replace(/^NUMPAD_(\w+)$/, (_, n: string) => `Num ${['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].indexOf(n)}`);

/** Xbox face-button colours (positions, as the game reads them: A bottom, B right, X left, Y top). */
const FACE: Partial<Record<PadControl, number>> = { A: 0x5fb043, B: 0xd8423a, X: 0x2f86d8, Y: 0xe8b62a };
const PAD_NAMES: Partial<Record<PadControl, string>> = { LS: 'L stick', RS: 'R stick', DPAD: 'D-pad', START: 'Start', SELECT: 'Select' };

/** The glyphs' chip: a dark inset with a light rim, on the pad as in the list. */
const CHIP_FILL = 0x0b121c;
const CHIP_EDGE = 0x9cc4e8;
const hexColor = (c: number) => '#' + c.toString(16).padStart(6, '0');

/** Where each control sits on the drawn pad (screen pixels from its centre), and its shape there: a circle (r) or a pill (w, h). */
const PAD_SPOTS: Partial<Record<PadControl, { x: number; y: number; r?: number; w?: number; h?: number }>> = {
  LT: { x: -150, y: -160, w: 74, h: 28 }, RT: { x: 150, y: -160, w: 74, h: 28 },
  LB: { x: -150, y: -120, w: 100, h: 24 }, RB: { x: 150, y: -120, w: 100, h: 24 },
  LS: { x: -142, y: -40, r: 34 }, RS: { x: 76, y: 46, r: 30 },
  DPAD: { x: -76, y: 46, r: 32 },
  Y: { x: 146, y: -78, r: 17 }, X: { x: 108, y: -40, r: 17 }, B: { x: 184, y: -40, r: 17 }, A: { x: 146, y: -2, r: 17 },
  SELECT: { x: -36, y: -58, w: 34, h: 16 }, START: { x: 36, y: -58, w: 34, h: 16 },
};
/** The drawn pad's centre on screen. */
const PAD_AT = { x: 345, y: 450 };

/** The pad's outline: the right half from the top centre, clockwise, as cubic curves (mirrored for the left). */
const PAD_HALF: [number, number][][] = [
  [[122, -112]],
  [[176, -112], [216, -86], [226, -30]],
  [[236, 26], [242, 96], [226, 138]],
  [[210, 178], [158, 184], [138, 152]],
  [[118, 120], [100, 94], [68, 92]],
  [[0, 92]],
];

/**
 * Controls: what every key and pad button does, on a Keyboard tab (both
 * keyboard players side by side) and a Gamepad tab (a drawn pad, the
 * selected row's buttons lit on it). Everything shown comes from
 * game/Input.ts (CONTROLS, the key bindings, PAD_BINDING), so it always
 * matches the game. Opened from the title screen or the pause menu, drawn
 * over the scene it came from (which stays paused until Back).
 */
export class ControlsScene extends Phaser.Scene {
  private tab: Tab = 'keyboard';
  private tabs: PlateButton[] = [];
  private back!: PlateButton;
  /** The current tab's objects, rebuilt on a switch. */
  private page!: Phaser.GameObjects.Container;
  private rows: { plate: Phaser.GameObjects.Graphics; name: Phaser.GameObjects.Text; y: number; x: number; w: number }[] = [];
  private selected = 0;
  private glow!: Phaser.GameObjects.Graphics;
  /** The selected row's buttons lit on the pad. */
  private padGlow?: Phaser.GameObjects.Graphics;
  private padStatus?: Phaser.GameObjects.Text;
  private menu!: MenuInput;
  private resume: string[] = [];

  constructor() { super('Controls'); }

  create(data: ControlsData): void {
    this.resume = data?.resume ?? [];
    this.tabs = [];
    this.selected = 0;
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x02050c, 0.72).setInteractive(); // eats clicks meant for the scene behind
    const frame = drawPlate(this.add.graphics(), FRAME.x, FRAME.y, FRAME.w, FRAME.h, { cut: 28, alpha: 0.95 });
    drawStrip(frame, FRAME.x, FRAME.y + 28, FRAME.x, FRAME.y + FRAME.h, NEON, 4);
    heading(this, width / 2, 88, 'Controls', 56);

    TABS.forEach(({ tab, label }, i) => {
      const b = new PlateButton(this, width / 2 + (i - 0.5) * 250, 164, 230, 46, label, { size: 22 });
      b.on('pointerdown', () => this.show(tab));
      this.tabs.push(b);
    });
    drawStrip(frame, FRAME.x + 40, 200, FRAME.x + FRAME.w - 40, 200, NEON, 2);
    this.glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.glow, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.page = this.add.container(0, 0);

    this.back = new PlateButton(this, FRAME.x + FRAME.w - 130, FRAME.y + FRAME.h - 34, 200, 42, 'Back', { size: 22 });
    let backDown = false;
    this.back.on('pointerdown', () => { backDown = true; });
    this.back.on('pointerup', () => { if (backDown) this.close(); });
    this.back.on('pointerover', () => this.back.setSelected(true));
    this.back.on('pointerout', () => this.back.setSelected(false));
    this.add.text(FRAME.x + 44, FRAME.y + FRAME.h - 34, '←→ / LB RB tab · ↑↓ choose · Esc / B back', body(15, { fontStyle: '500', color: '#cfe9ff' })).setOrigin(0, 0.5);

    this.menu = new MenuInput({
      move: (dx, dy) => {
        if (dx) this.show(this.tab === 'keyboard' ? 'gamepad' : 'keyboard');
        else if (dy) this.select((this.selected + dy + CONTROLS.length) % CONTROLS.length);
      },
      confirm: () => this.show(this.tab === 'keyboard' ? 'gamepad' : 'keyboard'),
      back: () => this.close(),
    }, true, { confirm: ['A', 4, 5] });
    // A pad plugged in or out while the screen is open: the Gamepad tab's status follows.
    const onPads = () => this.updatePadStatus();
    window.addEventListener('gamepadconnected', onPads);
    window.addEventListener('gamepaddisconnected', onPads);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('gamepadconnected', onPads);
      window.removeEventListener('gamepaddisconnected', onPads);
    });

    this.show(lastTab ?? (gamepads().length ? 'gamepad' : 'keyboard'));
    menuScreenFx(this, { keys: false });
  }

  update(time: number): void {
    this.menu.update(time);
  }

  /** Shows a tab (its rows rebuilt), keeping the selected row. */
  private show(tab: Tab): void {
    this.tab = lastTab = tab;
    this.tabs.forEach((b, i) => b.setSelected(TABS[i].tab === tab));
    this.page.removeAll(true);
    this.rows = [];
    this.padGlow = undefined;
    this.padStatus = undefined;
    if (tab === 'keyboard') this.buildKeyboard(); else this.buildGamepad();
    this.select(this.selected, true);
  }

  private buildKeyboard(): void {
    const x = FRAME.x + 36;
    const w = FRAME.w - 72;
    const col = { action: x + 24, p1: x + 190, p2: x + 470, hint: x + 750 };
    const head = (cx: number, text: string) => this.page.add(this.add.text(cx, ROWS_TOP - 14, text, body(14, { fontStyle: '800', color: '#9fe3ff' })).setOrigin(0, 0.5));
    head(col.action, 'ACTION');
    head(col.p1, 'PLAYER 1');
    head(col.p2, 'PLAYER 2');
    CONTROLS.forEach((c, i) => {
      const y = ROWS_TOP + 20 + i * ROW_H;
      this.row(x, y, w, c.action, col.action);
      for (const [cx, binding] of [[col.p1, PLAYER_1_KEYS], [col.p2, PLAYER_2_KEYS]] as [number, KeyBinding][]) {
        const keys = c.keys.flatMap((a) => binding[a]);
        if (keys.length) this.keyCaps(cx, y, keys.map(keyName));
        else if (c.keyText) this.page.add(this.add.text(cx, y, c.keyText, body(16, { fontStyle: '700', color: '#ffffff' })).setOrigin(0, 0.5));
      }
      this.hint(col.hint, y, c.hint, FRAME.x + FRAME.w - 50 - col.hint);
    });
  }

  private buildGamepad(): void {
    this.drawPad();
    this.padStatus = this.add.text(PAD_AT.x, 648, '', body(14, { fontStyle: '600', color: '#9fe3ff', align: 'center', wordWrap: { width: 470 } })).setOrigin(0.5, 0);
    this.page.add(this.padStatus);
    this.updatePadStatus();
    const x = 612;
    const w = FRAME.x + FRAME.w - 36 - x;
    const col = { glyph: x + 22, action: x + 170, hint: x + 290 };
    CONTROLS.forEach((c, i) => {
      const y = ROWS_TOP + 20 + i * ROW_H;
      this.row(x, y, w, c.action, col.action);
      let gx = col.glyph;
      for (const p of c.pad) gx += this.glyph(gx, y, p) + 6;
      this.hint(col.hint, y, c.hint, x + w - 16 - col.hint);
    });
  }

  /** A row's plate and action name; returns the name. */
  private row(x: number, y: number, w: number, action: string, nameX: number): Phaser.GameObjects.Text {
    const plate = this.add.graphics();
    const name = this.add.text(nameX, y, action.toUpperCase(), body(18, { fontStyle: 'italic 800' })).setOrigin(0, 0.5);
    this.page.add([plate, name]);
    const i = this.rows.length;
    const hit = this.add.rectangle(x, y, w, ROW_H - 6, 0, 0).setOrigin(0, 0.5).setInteractive();
    hit.on('pointerover', () => this.select(i));
    this.page.add(hit);
    this.rows.push({ plate, name, y, x, w });
    return name;
  }

  private hint(x: number, y: number, text: string, width: number): void {
    this.page.add(this.add.text(x, y, text, body(13, { fontStyle: '500', color: '#cfe9ff', wordWrap: { width }, lineSpacing: -2 })).setOrigin(0, 0.5));
  }

  /** Key caps in a row from x, centred on y. */
  private keyCaps(x: number, y: number, names: string[]): void {
    for (const n of names) {
      const t = this.add.text(0, y, n, body(15, { fontStyle: '800' })).setOrigin(0.5);
      const w = Math.max(30, t.width + 16);
      const g = this.add.graphics();
      drawPlate(g, x, y - 15, w, 30, { cut: 6, alpha: 1, edge: 0x7fa8cc });
      g.fillStyle(0xffffff, 0.06).fillRect(x + 6, y - 13, w - 8, 3);
      t.x = x + w / 2;
      this.page.add([g, t]);
      x += w + 6;
    }
  }

  /** A pad control's glyph at x (left edge), centred on y; returns its width. */
  private glyph(x: number, y: number, p: PadControl): number {
    const face = FACE[p];
    if (face !== undefined) {
      this.faceButton(x + 15, y, 15, p, face);
      return 30;
    }
    const t = this.add.text(0, y + 1, PAD_NAMES[p] ?? p, body(13, { fontStyle: '800' })).setOrigin(0.5);
    const w = Math.max(38, t.width + 18);
    this.pill(x + w / 2, y, w, 28);
    t.x = x + w / 2;
    this.page.add(t);
    return w;
  }

  /** A face button as in the list: a dark chip, a ring and its letter in the button's colour. */
  private faceButton(x: number, y: number, r: number, label: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(CHIP_FILL, 1).fillCircle(x, y, r);
    g.lineStyle(2, color, 1).strokeCircle(x, y, r - 2);
    this.page.add(g);
    this.page.add(this.add.text(x, y + 1, label, body(Math.round(r), { fontStyle: '800', color: hexColor(color) })).setOrigin(0.5));
  }

  /** A pill chip centred on (x, y). */
  private pill(x: number, y: number, w: number, h: number, label?: string, size = 13): void {
    const g = this.add.graphics();
    g.fillStyle(CHIP_FILL, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    g.lineStyle(1.5, CHIP_EDGE, 0.9).strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    this.page.add(g);
    if (label) this.page.add(this.add.text(x, y + 1, label, body(size, { fontStyle: '800' })).setOrigin(0.5));
  }

  /**
   * The pad, an Xbox-layout pad like the owner's: a brushed-metal shell like
   * the plates, every control drawn as the same chip as in the list.
   */
  private drawPad(): void {
    const { x: cx, y: cy } = PAD_AT;
    const at = (k: PadControl) => ({ ...PAD_SPOTS[k]!, x: cx + PAD_SPOTS[k]!.x, y: cy + PAD_SPOTS[k]!.y });
    // The shell: the outline's curves sampled, both halves.
    const path = new Phaser.Curves.Path(0, -112);
    for (const seg of PAD_HALF) {
      const [ex, ey] = seg[seg.length - 1];
      if (seg.length === 3) path.cubicBezierTo(ex, ey, seg[0][0], seg[0][1], seg[1][0], seg[1][1]);
      else path.lineTo(ex, ey);
    }
    const right = path.getPoints(24);
    const left = right.slice().reverse().map((p) => new Phaser.Math.Vector2(-p.x, p.y));
    const shell = [...right, ...left].map((p) => new Phaser.Math.Vector2(cx + p.x, cy + p.y));
    const g = this.add.graphics();
    // Shoulder buttons first, tucked behind the shell's top edge.
    for (const k of ['LB', 'RB'] as const) { const p = at(k); g.fillStyle(0x070b12, 1).fillRoundedRect(p.x - p.w! / 2 - 6, p.y - p.h! / 2 - 6, p.w! + 12, p.h! + 24, 16); }
    g.fillStyle(0x070b12, 0.6).fillPoints(shell.map((p) => new Phaser.Math.Vector2(p.x, p.y + 8)), true); // its shadow
    g.fillStyle(METAL_TOP, 1).fillPoints(shell, true);
    // Lit from above like the plates: the lower part a shade darker.
    const lower = shell.filter((p) => p.y > cy - 20);
    if (lower.length > 2) g.fillStyle(METAL, 0.3).fillPoints(lower, true);
    g.lineStyle(1.5, METAL_EDGE, 1).strokePoints(shell, true);
    g.lineStyle(1, BEVEL, 0.35).lineBetween(cx - 118, cy - 110, cx + 118, cy - 110);
    // Wells round the sticks and the D-pad.
    for (const k of ['LS', 'RS', 'DPAD'] as const) {
      const p = at(k);
      g.fillStyle(0x070b12, 0.9).fillCircle(p.x, p.y, p.r! + 7);
      g.lineStyle(1, METAL_EDGE, 0.6).strokeCircle(p.x, p.y, p.r! + 7);
    }
    const f = at('A');
    g.fillStyle(0x070b12, 0.45).fillCircle(f.x, f.y - 38, 60); // the face buttons' recess
    this.page.add(g);

    for (const k of ['LT', 'RT', 'LB', 'RB'] as const) { const p = at(k); this.pill(p.x, p.y, p.w!, p.h!, k); }
    for (const k of ['SELECT', 'START'] as const) { const p = at(k); this.pill(p.x, p.y, p.w!, p.h!); }
    for (const k of ['LS', 'RS'] as const) {
      const p = at(k);
      const s = this.add.graphics();
      s.fillStyle(CHIP_FILL, 1).fillCircle(p.x, p.y, p.r!);
      s.lineStyle(1.5, CHIP_EDGE, 0.9).strokeCircle(p.x, p.y, p.r!);
      s.lineStyle(1, CHIP_EDGE, 0.3).strokeCircle(p.x, p.y, p.r! - 9);
      this.page.add(s);
      this.page.add(this.add.text(p.x, p.y + 1, k[0], body(15, { fontStyle: '800' })).setOrigin(0.5));
    }
    const d = at('DPAD');
    const a = 9; const l = 27; // the cross's half thickness and arm length
    const V = Phaser.Math.Vector2;
    const cross = [[-a, -l], [a, -l], [a, -a], [l, -a], [l, a], [a, a], [a, l], [-a, l], [-a, a], [-l, a], [-l, -a], [-a, -a]]
      .map(([x, y]) => new V(d.x + x, d.y + y));
    const dg = this.add.graphics();
    dg.fillStyle(CHIP_FILL, 1).fillPoints(cross, true);
    dg.lineStyle(1.5, CHIP_EDGE, 0.9).strokePoints(cross, true);
    dg.fillStyle(CHIP_EDGE, 0.5).fillCircle(d.x, d.y, 3);
    this.page.add(dg);
    for (const k of ['A', 'B', 'X', 'Y'] as const) { const p = at(k); this.faceButton(p.x, p.y, p.r!, k, FACE[k]!); }
    for (const [k, t] of [['SELECT', 'SELECT'], ['START', 'START']] as const) {
      const p = at(k);
      this.page.add(this.add.text(p.x, p.y + 17, t, body(9, { fontStyle: '800', color: '#8fb6d8' })).setOrigin(0.5));
    }
    this.padGlow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.page.add(this.padGlow);
    this.tweens.add({ targets: this.padGlow, alpha: 0.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Lights the selected row's controls on the pad. */
  private lightPad(controls: PadControl[]): void {
    const g = this.padGlow?.clear();
    if (!g) return;
    for (const k of controls) {
      const p = PAD_SPOTS[k];
      if (!p) continue;
      const x = PAD_AT.x + p.x;
      const y = PAD_AT.y + p.y;
      for (const [grow, width, alpha] of [[10, 10, 0.12], [6, 6, 0.25], [2, 3, 0.6], [0, 1.5, 1]] as const) {
        g.lineStyle(width, NEON, alpha);
        if (p.r) g.strokeCircle(x, y, p.r + 4 + grow);
        else {
          const w = p.w! + 8 + 2 * grow; const h = p.h! + 8 + 2 * grow;
          g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
        }
      }
    }
  }

  private updatePadStatus(): void {
    if (!this.padStatus) return;
    const pads = gamepads();
    this.padStatus.setText(pads.length
      ? `Connected: ${pads.map((p) => p.id.replace(/\s*\(.*\)\s*$/, '').trim() || 'Gamepad').join(' · ')}\nSame places on any pad: on a Nintendo pad, A is bottom.`
      : 'No gamepad yet: plug one in and press a button.\nAny pad works, buttons go by their place.');
  }

  private select(i: number, quiet = false): void {
    if (i !== this.selected && !quiet) uiSound(this, 'move');
    this.selected = i;
    this.glow.clear();
    this.rows.forEach((r, j) => {
      const on = j === i;
      const g = r.plate.clear();
      drawPlate(g, r.x, r.y - ROW_H / 2 + 3, r.w, ROW_H - 6, { cut: 10, alpha: on ? 0.9 : 0.45, edge: on ? NEON : undefined });
      if (on) {
        drawStrip(g, r.x, r.y - ROW_H / 2 + 12, r.x, r.y + ROW_H / 2 - 3, NEON, 3);
        drawGlow(this.glow, r.x, r.y - ROW_H / 2 + 3, r.w, ROW_H - 6, { cut: 10 });
      }
      r.name.setColor(on ? '#bfe9ff' : '#ffffff');
    });
    this.lightPad(CONTROLS[i]?.pad ?? []);
  }

  private close(): void {
    uiSound(this, 'back');
    for (const key of this.resume) this.scene.resume(key);
    this.scene.stop();
  }
}
