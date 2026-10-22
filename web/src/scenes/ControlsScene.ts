import Phaser from 'phaser';
import { CONTROLS, PLAYER_1_KEYS, PLAYER_2_KEYS, type KeyBinding, type PadControl } from '../game/Input';
import { MenuInput } from './MenuInput';
import { drawGlow, drawPlate, drawStrip, menuScreenFx, METAL, METAL_EDGE, METAL_TOP, PlateButton } from '../ui/Plate';
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

/** Where each control sits on the drawn pad (pad pixels from its centre), and its shape there. */
const PAD_SPOTS: Partial<Record<PadControl, { x: number; y: number; r?: number; w?: number; h?: number }>> = {
  LT: { x: -118, y: -162, w: 64, h: 26 }, RT: { x: 118, y: -162, w: 64, h: 26 },
  LB: { x: -118, y: -128, w: 92, h: 18 }, RB: { x: 118, y: -128, w: 92, h: 18 },
  LS: { x: -112, y: -36, r: 30 }, RS: { x: 58, y: 34, r: 27 },
  DPAD: { x: -58, y: 34, r: 30 },
  Y: { x: 116, y: -68, r: 15 }, X: { x: 84, y: -36, r: 15 }, B: { x: 148, y: -36, r: 15 }, A: { x: 116, y: -4, r: 15 },
  SELECT: { x: -26, y: -52, r: 9 }, START: { x: 26, y: -52, r: 9 },
};
/** The drawn pad's centre on screen. */
const PAD_AT = { x: 345, y: 470 };

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
    this.padStatus = this.add.text(PAD_AT.x, 640, '', body(14, { fontStyle: '600', color: '#9fe3ff', align: 'center', wordWrap: { width: 470 } })).setOrigin(0.5, 0);
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
    const g = this.add.graphics();
    const face = FACE[p];
    const label = PAD_NAMES[p] ?? p;
    let w: number;
    if (face !== undefined) {
      w = 30;
      g.fillStyle(0x0b121c, 1).fillCircle(x + 15, y, 15);
      g.lineStyle(2, face, 1).strokeCircle(x + 15, y, 13);
      this.page.add(g);
      this.page.add(this.add.text(x + 15, y + 1, label, body(15, { fontStyle: '800', color: '#' + face.toString(16).padStart(6, '0') })).setOrigin(0.5));
      return w;
    }
    const t = this.add.text(0, y + 1, label, body(13, { fontStyle: '800' })).setOrigin(0.5);
    w = Math.max(38, t.width + 18);
    g.fillStyle(0x0b121c, 1).fillRoundedRect(x, y - 14, w, 28, 14);
    g.lineStyle(1.5, 0x9cc4e8, 0.9).strokeRoundedRect(x, y - 14, w, 28, 14);
    t.x = x + w / 2;
    this.page.add([g, t]);
    return w;
  }

  /** The pad, after the owner's Xbox-layout pad, in the plates' brushed metal. */
  private drawPad(): void {
    const { x: cx, y: cy } = PAD_AT;
    const s = 1.3;
    const g = this.add.graphics({ x: cx, y: cy }).setScale(s);
    // Triggers and bumpers behind the body.
    for (const k of ['LT', 'RT', 'LB', 'RB'] as const) {
      const p = PAD_SPOTS[k]!;
      g.fillStyle(k.endsWith('T') ? METAL : METAL_TOP, 1).fillRoundedRect(p.x - p.w! / 2, p.y - p.h! / 2, p.w!, p.h! + 10, 8);
      g.lineStyle(1, METAL_EDGE, 1).strokeRoundedRect(p.x - p.w! / 2, p.y - p.h! / 2, p.w!, p.h! + 10, 8);
    }
    // The body: a wide shell and two grips.
    g.fillStyle(METAL_EDGE, 1);
    g.fillRoundedRect(-185, -112, 370, 150, 64);
    g.fillCircle(-128, 52, 66);
    g.fillCircle(128, 52, 66);
    g.fillStyle(0x1b2738, 1);
    g.fillRoundedRect(-183, -110, 366, 146, 62);
    g.fillCircle(-128, 50, 64);
    g.fillCircle(128, 50, 64);
    g.fillStyle(METAL_TOP, 0.55).fillRoundedRect(-150, -106, 300, 14, 7);
    // Sticks, D-pad, face buttons, Select / Start.
    for (const k of ['LS', 'RS'] as const) {
      const p = PAD_SPOTS[k]!;
      g.fillStyle(0x070b12, 1).fillCircle(p.x, p.y, p.r! + 6);
      g.fillStyle(METAL_TOP, 1).fillCircle(p.x, p.y, p.r!);
      g.lineStyle(2, METAL_EDGE, 1).strokeCircle(p.x, p.y, p.r! - 7);
    }
    const d = PAD_SPOTS.DPAD!;
    g.fillStyle(0x070b12, 1).fillCircle(d.x, d.y, d.r! + 4);
    g.fillStyle(METAL_TOP, 1).fillRect(d.x - 9, d.y - 26, 18, 52).fillRect(d.x - 26, d.y - 9, 52, 18);
    for (const k of ['A', 'B', 'X', 'Y'] as const) {
      const p = PAD_SPOTS[k]!;
      g.fillStyle(0x070b12, 1).fillCircle(p.x, p.y, p.r! + 2);
      g.fillStyle(FACE[k]!, 0.9).fillCircle(p.x, p.y, p.r!);
    }
    for (const k of ['SELECT', 'START'] as const) {
      const p = PAD_SPOTS[k]!;
      g.fillStyle(METAL_TOP, 1).fillCircle(p.x, p.y, p.r!);
    }
    this.page.add(g);
    // Labels on the pad (screen space, so the text stays crisp).
    const at = (k: PadControl) => ({ x: cx + PAD_SPOTS[k]!.x * s, y: cy + PAD_SPOTS[k]!.y * s });
    for (const k of ['A', 'B', 'X', 'Y'] as const) this.page.add(this.add.text(at(k).x, at(k).y + 1, k, body(16, { fontStyle: '800', color: '#0b121c' })).setOrigin(0.5));
    for (const k of ['LT', 'RT', 'LB', 'RB'] as const) {
      const p = at(k);
      this.page.add(this.add.text(p.x, p.y + (k.endsWith('T') ? -4 : 1), k, body(13, { fontStyle: '800', color: '#cfe9ff' })).setOrigin(0.5));
    }
    this.padGlow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.page.add(this.padGlow);
    this.tweens.add({ targets: this.padGlow, alpha: 0.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** Lights the selected row's controls on the pad. */
  private lightPad(controls: PadControl[]): void {
    const g = this.padGlow?.clear();
    if (!g) return;
    const s = 1.3;
    for (const k of controls) {
      const p = PAD_SPOTS[k];
      if (!p) continue;
      const x = PAD_AT.x + p.x * s;
      const y = PAD_AT.y + p.y * s;
      for (const [grow, width, alpha] of [[10, 10, 0.12], [6, 6, 0.25], [2, 3, 0.6], [0, 1.5, 1]] as const) {
        g.lineStyle(width, NEON, alpha);
        if (p.r) g.strokeCircle(x, y, (p.r + 4) * s + grow);
        else g.strokeRoundedRect(x - (p.w! * s) / 2 - 4 - grow, y - (p.h! * s) / 2 - 4 - grow, p.w! * s + 8 + 2 * grow, p.h! * s + 8 + 2 * grow, 10 + grow);
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
