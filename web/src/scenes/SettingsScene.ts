import Phaser from 'phaser';
import {
  fx, GRAPHICS, GRAPHICS_LEVELS, graphicsOf, settings, updateSettings, sfxVolume, type Effects, type Graphics,
} from '../game/Settings';
import { MenuInput } from './MenuInput';
import { drawGlow, drawPlate, drawStrip, menuScreenFx, PlateButton } from '../ui/Plate';
import { BODY_FAMILY, heading } from '../ui/Type';
import { uiSound } from '../audio/Sounds';
import { toggleFullscreen } from '../ui/Fullscreen';

/** What opened the settings: the scenes it paused, resumed when it closes. */
export interface SettingsData { resume?: string[]; }

type Toggle = { [K in keyof Effects]: Effects[K] extends boolean ? K : never }[keyof Effects];

/** A settings line: a volume slider, the graphics preset, the particle amount or one effect on or off. */
type RowDef =
  | { kind: 'slider'; key: 'music' | 'sfx'; label: string; hint: string }
  | { kind: 'graphics'; label: string; hint: string }
  | { kind: 'particles'; label: string; hint: string }
  | { kind: 'toggle'; key: Toggle; label: string; hint: string };

interface Row {
  def: RowDef;
  /** The row's plate: x, y (middle), width, height. */
  x: number; y: number; w: number; h: number;
  plate: Phaser.GameObjects.Graphics;
  name: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
  track?: Phaser.GameObjects.Rectangle;
  fill?: Phaser.GameObjects.Rectangle;
  knob?: Phaser.GameObjects.Rectangle;
  /** A toggle's switch. */
  pill?: Phaser.GameObjects.Graphics;
}

const SOUND_ROWS: RowDef[] = [
  { kind: 'slider', key: 'music', label: 'Music', hint: 'Title and arena music.' },
  { kind: 'slider', key: 'sfx', label: 'Sound effects', hint: 'Hits, lasers, footsteps, the narrator.' },
  { kind: 'graphics', label: 'Graphics quality', hint: 'Sets every effect at once, from Low (lightest) to Ultra (all on). Change one effect and it reads Custom.' },
];
const EFFECT_ROWS: RowDef[] = [
  { kind: 'particles', label: 'Particle quality', hint: 'Sparks, debris, motes and the K.O. smoke: how many (Off removes them).' },
  { kind: 'toggle', key: 'shake', label: 'Camera shake', hint: 'The camera shakes on strong hits, hard landings and K.O.s.' },
  { kind: 'toggle', key: 'flashes', label: 'Flash effects', hint: 'A Kubot flashes white when struck. Off is easier on the eyes.' },
  { kind: 'toggle', key: 'distortion', label: 'Distortion', hint: 'Glitch tearing and RGB split on struck Kubotz, bouncing orbs and the title logo.' },
  { kind: 'toggle', key: 'lights', label: 'Dynamic lights', hint: 'Light thrown by hits and explosions, the shine sweeping over menu buttons.' },
  { kind: 'toggle', key: 'postFx', label: 'Post-processing', hint: 'Vignette, contrast and colour grading over the arena; the blurred arena behind the match setup.' },
  { kind: 'toggle', key: 'grain', label: 'Film grain', hint: 'Fine grain and faint scanlines over the whole screen.' },
  { kind: 'toggle', key: 'transitions', label: 'Screen transitions', hint: 'Screen changes like an old TV switching stations, and the menus\' blips of interference.' },
];
const ROWS = [...SOUND_ROWS, ...EFFECT_ROWS];

const PARTICLES = [{ v: 0, label: 'Off' }, { v: 0.35, label: 'Low' }, { v: 0.65, label: 'Medium' }, { v: 1, label: 'High' }];
const GRAPHICS_LABEL: Record<Graphics | 'custom', string> = { low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra', custom: 'Custom' };
const STEP = 0.05;
const TRACK_W = 200;
const BLUE = 0x29abe2;

/**
 * Settings: music and sound effects levels, the graphics preset and each
 * visual effect on or off, saved in the browser and applied live. Opened from
 * the title screen or the pause menu, drawn over the scene it came from
 * (which stays paused until Back).
 */
export class SettingsScene extends Phaser.Scene {
  private rows: Row[] = [];
  private back!: PlateButton;
  private fullscreen!: PlateButton;
  private selected = 0;
  private menu!: MenuInput;
  private resume: string[] = [];
  private dragging?: Row;
  private lastSfxAt = 0;
  /** The selected row's halo. */
  private glow!: Phaser.GameObjects.Graphics;
  /** The selected row's name and what it does, under the sound column. */
  private hintTitle!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  constructor() { super('Settings'); }

  create(data: SettingsData): void {
    this.rows = [];
    this.selected = 0;
    this.dragging = undefined;
    this.resume = data?.resume ?? [];
    const { width, height } = this.scale;
    const cx = width / 2;
    this.add.rectangle(cx, height / 2, width, height, 0x02050c, 0.72).setInteractive(); // eats clicks meant for the scene behind
    const frame = drawPlate(this.add.graphics(), 50, 20, width - 100, height - 40, { cut: 28, alpha: 0.95 });
    drawStrip(frame, 50, 48, 50, height - 20, BLUE, 4);
    heading(this, cx, 70, 'Settings', 52);
    this.glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.glow, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    drawStrip(frame, cx - 200, 112, cx + 200, 112, BLUE, 2);

    // Left: the volumes and the graphics preset, then what the selected line does. Right: each effect.
    const section = (x: number, text: string) => this.add.text(x, 146, text, {
      fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: '15px', color: '#9fe3ff', letterSpacing: 3,
    }).setOrigin(0, 0.5);
    section(96, 'AUDIO AND GRAPHICS');
    section(656, 'EFFECTS');
    SOUND_ROWS.forEach((def, i) => this.addRow(def, 90, 202 + i * 88, 520, 76));
    EFFECT_ROWS.forEach((def, i) => this.addRow(def, 650, 190 + i * 46, 540, 40));

    const hintPlate = this.add.graphics();
    drawPlate(hintPlate, 90, 450, 520, 128, { cut: 14, alpha: 0.4 });
    this.hintTitle = this.add.text(112, 474, '', { fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: '19px', color: '#bfe9ff' }).setOrigin(0, 0.5);
    this.hint = this.add.text(112, 494, '', {
      fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '16px', color: '#cfe9ff', wordWrap: { width: 476 }, lineSpacing: 4,
    });

    this.back = new PlateButton(this, cx + 130, 650, 220, 48, 'Back', { size: 24 });
    let backDown = false;
    this.back.on('pointerover', () => this.select(ROWS.length));
    this.back.on('pointerdown', () => { backDown = true; });
    this.back.on('pointerup', () => { if (backDown) this.close(); });
    // Fullscreen (also F11, Alt+Enter or a pad's Select anywhere); the label follows the screen.
    this.fullscreen = new PlateButton(this, cx - 130, 650, 220, 48, '', { size: 24 });
    this.fullscreen.on('pointerover', () => this.select(ROWS.length + 1));
    this.fullscreen.on('pointerdown', () => this.toggleFullscreen());
    const label = () => this.fullscreen.label.setText(this.scale.isFullscreen ? 'WINDOWED' : 'FULLSCREEN');
    label();
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, label);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, label);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, label);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, label);
    });
    this.add.text(cx, 708, '↑↓ choose · ←→ change · Enter switch · Esc back · F11 fullscreen   ·   pad: D-pad or stick · A switch · B back · Select fullscreen', {
      fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '15px', color: '#cfe9ff',
    }).setOrigin(0.5);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.dragging && p.isDown) this.setFromPointer(this.dragging, p.x); });
    this.input.on('pointerup', () => { this.dragging = undefined; });
    this.input.on('gameout', () => { this.dragging = undefined; });

    this.menu = new MenuInput({
      move: (dx, dy) => {
        // The rows (sound and graphics, then the effects), then the button row: Fullscreen and Back side by side.
        if (dy) {
          const i = this.selected >= ROWS.length ? (dy > 0 ? 0 : ROWS.length - 1) : this.selected + dy;
          this.select(i < 0 ? ROWS.length : i);
        }
        else if (dx && this.rows[this.selected]) this.change(this.rows[this.selected], dx);
        else if (dx) this.select(dx < 0 ? ROWS.length + 1 : ROWS.length);
      },
      confirm: () => {
        const row = this.rows[this.selected];
        if (row) { if (row.def.kind !== 'slider') this.change(row, 1, true); }
        else if (this.selected === ROWS.length + 1) this.toggleFullscreen();
        else this.close();
      },
      back: () => this.close(),
    }, true);
    this.refresh();
    this.select(0);
    // The match's grain and scanlines over the panel too (F stays with the scene behind).
    menuScreenFx(this, { keys: false });
  }

  update(time: number): void {
    this.menu.update(time);
  }

  private addRow(def: RowDef, x: number, y: number, w: number, h: number): void {
    const i = this.rows.length;
    const plate = this.add.graphics();
    const big = def.kind === 'slider' || def.kind === 'graphics';
    const name = this.add.text(x + 22, y, def.label, {
      fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: big ? '24px' : '19px', color: '#ffffff',
    }).setOrigin(0, 0.5);
    const value = this.add.text(x + w - 22, y, '', {
      fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: big ? '22px' : '18px', color: '#ffffff',
    }).setOrigin(1, 0.5);
    const row: Row = { def, x, y, w, h, plate, name, value };
    if (def.kind === 'slider') {
      const tx = x + w - 300;
      row.track = this.add.rectangle(tx, y, TRACK_W, 8, 0x0b121c).setOrigin(0, 0.5).setStrokeStyle(1, 0x4a6584);
      row.fill = this.add.rectangle(tx, y, 0, 8, BLUE).setOrigin(0, 0.5);
      row.knob = this.add.rectangle(tx, y, 14, 28, 0xe9f6ff).setStrokeStyle(2, BLUE);
    }
    if (def.kind === 'toggle') {
      row.pill = this.add.graphics();
      value.setX(x + w - 92).setOrigin(0.5, 0.5);
    }
    // The whole plate answers the pointer: sliders drag, the rest switch or step on a click.
    const hit = this.add.rectangle(x, y, w, h, 0, 0).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.select(i);
      if (def.kind === 'slider') { this.dragging = row; this.setFromPointer(row, p.x); }
      else this.change(row, 1, true);
    });
    hit.on('pointerover', () => { if (!this.dragging) this.select(i); });
    this.rows.push(row);
  }

  private select(i: number): void {
    if (i !== this.selected && i < ROWS.length) uiSound(this, 'move');
    this.selected = i;
    this.glow.clear();
    this.rows.forEach((r, j) => {
      // Each row on its own plate; the selected one lit like a menu button.
      const g = r.plate.clear();
      const top = r.y - r.h / 2;
      drawPlate(g, r.x, top, r.w, r.h, { cut: r.h > 50 ? 14 : 10, alpha: j === i ? 0.9 : 0.5, edge: j === i ? BLUE : undefined });
      if (j === i) {
        drawStrip(g, r.x, top + r.h * 0.18, r.x, top + r.h, BLUE, 3);
        drawGlow(this.glow, r.x, top, r.w, r.h, { color: BLUE });
      }
      r.name.setColor(j === i ? '#bfe9ff' : '#ffffff');
      r.knob?.setScale(j === i ? 1.15 : 1);
    });
    const def = this.rows[i]?.def;
    this.hintTitle.setText(def ? def.label : i === ROWS.length ? 'Back' : 'Fullscreen');
    this.hint.setText(def ? def.hint : i === ROWS.length ? 'Close the settings. Everything is already saved.' : 'Fill the whole screen (also F11, Alt+Enter, or a pad\'s Select anywhere).');
    this.back.setSelected(i === ROWS.length);
    this.fullscreen.setSelected(i === ROWS.length + 1);
  }

  private setFromPointer(row: Row, x: number): void {
    if (row.def.kind === 'slider' && row.track) this.setVolume(row.def.key, (x - row.track.x) / TRACK_W);
  }

  /** A step left (-1) or right (1) on a row; `wrap` (a click or A) goes round from the last choice to the first. */
  private change(row: Row, dir: number, wrap = false): void {
    const def = row.def;
    const s = settings();
    if (def.kind === 'slider') { this.setVolume(def.key, s[def.key] + dir * STEP); return; }
    const step = <T>(list: T[], at: number): T | undefined => {
      const n = at + dir;
      return wrap ? list[(n + list.length) % list.length] : list[n];
    };
    let next: Effects | undefined;
    if (def.kind === 'graphics') {
      const at = GRAPHICS_LEVELS.indexOf(graphicsOf(s.fx) as Graphics);
      // From Custom: right goes to Ultra, left to Low.
      const g = at < 0 ? (dir > 0 ? 'ultra' : 'low') : step(GRAPHICS_LEVELS, at);
      if (g) next = { ...GRAPHICS[g] };
    } else if (def.kind === 'particles') {
      const at = PARTICLES.reduce((best, p, j) => (Math.abs(p.v - s.fx.particles) < Math.abs(PARTICLES[best].v - s.fx.particles) ? j : best), 0);
      const p = step(PARTICLES, at);
      if (p) next = { ...s.fx, particles: p.v };
    } else {
      // Left turns it off, right on; A or a click switches it.
      const on = wrap ? !s.fx[def.key] : dir > 0;
      next = { ...s.fx, [def.key]: on };
    }
    if (!next || JSON.stringify(next) === JSON.stringify(s.fx)) return;
    updateSettings({ fx: next });
    uiSound(this, 'tick');
    this.refresh();
  }

  private setVolume(key: 'music' | 'sfx', v: number): void {
    const value = Math.round(Phaser.Math.Clamp(v, 0, 1) / STEP) * STEP;
    if (Math.abs(value - settings()[key]) < 1e-6) return;
    updateSettings({ [key]: Number(value.toFixed(2)) }); // music follows at once (addMusic listens)
    this.refresh();
    // A test sound at the new level.
    if (key === 'sfx' && this.time.now - this.lastSfxAt > 110) {
      this.lastSfxAt = this.time.now;
      const k = ['punch', 'orb-pickup'].find((a) => this.cache.audio.exists(a));
      if (k) this.sound.play(k, { volume: sfxVolume(0.5) });
    } else if (key !== 'sfx') uiSound(this, 'tick');
  }

  /** Every row's value from the settings (a preset changes all the effects at once). */
  private refresh(): void {
    const s = settings();
    const e = fx();
    for (const row of this.rows) {
      const def = row.def;
      if (def.kind === 'slider') {
        const v = s[def.key];
        row.fill!.setSize(TRACK_W * v, 12);
        row.knob!.x = row.track!.x + TRACK_W * v;
        row.value.setText(`${Math.round(v * 100)}%`);
      } else if (def.kind === 'graphics') {
        const g = graphicsOf(e);
        row.value.setText(`‹  ${GRAPHICS_LABEL[g]}  ›`).setColor(g === 'custom' ? '#ffd27a' : '#ffffff');
      } else if (def.kind === 'particles') {
        const p = PARTICLES.find((q) => Math.abs(q.v - e.particles) < 0.01);
        row.value.setText(`‹  ${p ? p.label : `${Math.round(e.particles * 100)}%`}  ›`).setColor(e.particles > 0 ? '#ffffff' : '#7f93a8');
      } else {
        const on = e[def.key];
        const g = row.pill!.clear();
        const px = row.x + row.w - 120;
        g.fillStyle(on ? BLUE : 0x0b121c, on ? 0.9 : 1).fillRoundedRect(px, row.y - 13, 56, 26, 13);
        g.lineStyle(1, on ? 0xbfe9ff : 0x4a6584, 1).strokeRoundedRect(px, row.y - 13, 56, 26, 13);
        g.fillStyle(on ? 0xffffff : 0x7f93a8, 1).fillCircle(on ? px + 43 : px + 13, row.y, 9);
        row.value.setText(on ? 'ON' : 'OFF').setColor(on ? '#ffffff' : '#7f93a8').setX(px - 36);
      }
    }
  }

  private toggleFullscreen(): void {
    uiSound(this, 'confirm');
    toggleFullscreen(this.game);
  }

  private close(): void {
    uiSound(this, 'back');
    for (const key of this.resume) this.scene.resume(key);
    this.scene.stop();
  }
}
