import Phaser from 'phaser';
import { settings, updateSettings, sfxVolume, type Settings } from '../game/Settings';
import { MenuInput } from './MenuInput';
import { drawPlate, drawStrip, PlateButton } from '../ui/Plate';
import { BODY_FAMILY, heading } from '../ui/Type';

/** What opened the settings: the scenes it paused, resumed when it closes. */
export interface SettingsData { resume?: string[]; }

interface Row {
  key: keyof Settings;
  label: string;
  hint: string;
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  knob: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Graphics;
  value: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
}

const ROWS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'music', label: 'Music', hint: 'Title and arena music' },
  { key: 'sfx', label: 'Sound effects', hint: 'Hits, lasers, footsteps, the narrator' },
  { key: 'vfx', label: 'Visual effects', hint: 'Particles, shake, flashes, glow, grade (0 = minimal)' },
];
const STEP = 0.05;
const TRACK_W = 360;
const BLUE = 0x29abe2;

/**
 * Settings: music, sound effects and visual effects levels, saved in the
 * browser and applied live. Opened from the title screen or the pause menu,
 * drawn over the scene it came from (which stays paused until Back).
 */
export class SettingsScene extends Phaser.Scene {
  private rows: Row[] = [];
  private back!: PlateButton;
  private selected = 0;
  private menu!: MenuInput;
  private resume: string[] = [];
  private dragging?: Row;
  private lastSfxAt = 0;

  constructor() { super('Settings'); }

  create(data: SettingsData): void {
    this.rows = [];
    this.selected = 0;
    this.dragging = undefined;
    this.resume = data?.resume ?? [];
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x02050c, 0.72).setInteractive(); // eats clicks meant for the scene behind
    const frame = drawPlate(this.add.graphics(), width / 2 - 490, height / 2 - 260, 980, 520, { cut: 28, alpha: 0.95 });
    drawStrip(frame, width / 2 - 490, height / 2 - 232, width / 2 - 490, height / 2 + 260, BLUE, 4);
    heading(this, width / 2, height / 2 - 205, 'Settings', 60);
    drawStrip(frame, width / 2 - 200, height / 2 - 162, width / 2 + 200, height / 2 - 162, BLUE, 2);

    ROWS.forEach((r, i) => {
      const y = height / 2 - 110 + i * 105;
      const left = width / 2 - 440;
      const tx = width / 2 - 10;
      const plate = this.add.graphics();
      const name = this.add.text(left, y - 14, r.label, { fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: '26px', color: '#ffffff' }).setOrigin(0, 0.5);
      this.add.text(left, y + 20, r.hint, { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '15px', color: '#9fe3ff' }).setOrigin(0, 0.5);
      const track = this.add.rectangle(tx, y, TRACK_W, 8, 0x0b121c).setOrigin(0, 0.5).setStrokeStyle(1, 0x4a6584);
      const fill = this.add.rectangle(tx, y, 0, 8, BLUE).setOrigin(0, 0.5);
      const knob = this.add.rectangle(tx, y, 14, 28, 0xe9f6ff).setStrokeStyle(2, BLUE).setAngle(0);
      const value = this.add.text(tx + TRACK_W + 22, y, '', { fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: '22px', color: '#ffffff' }).setOrigin(0, 0.5);
      const row: Row = { ...r, track, fill, knob, value, name, plate };
      // A taller hit area than the thin track, so the slider is easy to grab.
      const hit = this.add.rectangle(tx - 16, y, TRACK_W + 32, 44, 0, 0).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (p: Phaser.Input.Pointer) => { this.select(i); this.dragging = row; this.setFromPointer(row, p.x); });
      hit.on('pointerover', () => { if (!this.dragging) this.select(i); });
      this.rows.push(row);
      this.draw(row);
    });

    this.back = new PlateButton(this, width / 2, height / 2 + 196, 220, 48, 'Back', { size: 24, bodyLabel: true });
    let backDown = false;
    this.back.on('pointerover', () => this.select(ROWS.length));
    this.back.on('pointerdown', () => { backDown = true; });
    this.back.on('pointerup', () => { if (backDown) this.close(); });
    this.add.text(width / 2, height / 2 + 240, '↑↓ choose · ←→ adjust · Enter / Esc back   ·   pad: D-pad or stick · A / B back', {
      fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '15px', color: '#cfe9ff',
    }).setOrigin(0.5);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.dragging && p.isDown) this.setFromPointer(this.dragging, p.x); });
    this.input.on('pointerup', () => { this.dragging = undefined; });
    this.input.on('gameout', () => { this.dragging = undefined; });

    this.menu = new MenuInput({
      move: (dx, dy) => {
        if (dy) this.select((this.selected + dy + ROWS.length + 1) % (ROWS.length + 1));
        else if (dx && this.rows[this.selected]) this.set(this.rows[this.selected], settings()[this.rows[this.selected].key] + dx * STEP);
      },
      confirm: () => this.close(),
      back: () => this.close(),
    }, true);
    this.select(0);
  }

  update(time: number): void {
    this.menu.update(time);
  }

  private select(i: number): void {
    this.selected = i;
    this.rows.forEach((r, j) => {
      const { width, height } = this.scale;
      const y = height / 2 - 110 + j * 105;
      // Each row on its own plate; the selected one lit like a menu button.
      const g = r.plate.clear();
      drawPlate(g, width / 2 - 460, y - 44, 920, 88, { cut: 14, alpha: j === i ? 0.9 : 0.5, edge: j === i ? BLUE : undefined });
      if (j === i) drawStrip(g, width / 2 - 460, y - 30, width / 2 - 460, y + 44, BLUE, 3);
      r.name.setColor(j === i ? '#bfe9ff' : '#ffffff');
      r.knob.setScale(j === i ? 1.15 : 1);
    });
    this.back.setSelected(i === ROWS.length);
  }

  private setFromPointer(row: Row, x: number): void {
    this.set(row, (x - row.track.x) / TRACK_W);
  }

  private set(row: Row, v: number): void {
    const value = Math.round(Phaser.Math.Clamp(v, 0, 1) / STEP) * STEP;
    if (Math.abs(value - settings()[row.key]) < 1e-6) return;
    updateSettings({ [row.key]: Number(value.toFixed(2)) }); // music follows at once (addMusic listens)
    this.draw(row);
    // A test sound at the new level.
    if (row.key === 'sfx' && this.time.now - this.lastSfxAt > 110) {
      this.lastSfxAt = this.time.now;
      const key = ['punch', 'orb-pickup'].find((k) => this.cache.audio.exists(k));
      if (key) this.sound.play(key, { volume: sfxVolume(0.5) });
    }
  }

  private draw(row: Row): void {
    const v = settings()[row.key];
    row.fill.setSize(TRACK_W * v, 12);
    row.knob.x = row.track.x + TRACK_W * v;
    row.value.setText(`${Math.round(v * 100)}%`);
  }

  private close(): void {
    for (const key of this.resume) this.scene.resume(key);
    this.scene.stop();
  }
}
