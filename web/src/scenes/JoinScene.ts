import Phaser from 'phaser';
import { Animator } from '../anim/Animator';
import { Rig } from '../anim/Rig';
import { ART_SCALE, Robot2D } from '../anim/Robot2D';
import { HEADS, SLOT_COLORS, hex, partTexture } from '../game/Kubotz';
import { TEAM_NAMES, type FighterSpec } from '../game/Match';
import type { SpriterData } from '../spriter/Spriter';
import { BODY_FAMILY, heading } from '../ui/Type';
import { drawPlate, drawStrip, footer, kubeBackdrop, shutter } from '../ui/Plate';

/** What drives a seat: keyboard set 1 or 2, a gamepad (its index), or the computer. */
type Device = 'K1' | 'K2' | number | 'CPU';

interface Seat { device: Device; team: number; helmet: number }

/** The join screen's choices, kept in the registry so coming back from the arena select keeps them. */
interface JoinState { humans: Seat[]; cpus: Seat[]; cpuCount: number }

type Action = 'join' | 'leave' | 'up' | 'down' | 'left' | 'right';

const MAX_ROBOTS = 4;
const PANEL_W = 280;
const PANEL_H = 430;
const PANEL_Y = 330;
/** Robot preview size: times the in-game size. */
const PREVIEW_SCALE = 1.05;

/** Keyboard sets: join (attack), leave (special), helmet (up / down), colour (left / right). */
const KEYS: Record<'K1' | 'K2', Record<Action, string[]>> = {
  K1: { join: ['O', 'J'], leave: ['P'], up: ['W'], down: ['S'], left: ['A'], right: ['D'] },
  K2: { join: ['COMMA', 'NUMPAD_ONE'], leave: ['N', 'NUMPAD_FOUR'], up: ['UP'], down: ['DOWN'], left: ['LEFT'], right: ['RIGHT'] },
};
/** Gamepad buttons (standard mapping, Smash layout): A right face, B bottom face, L / R shoulders, Start. */
const PAD = { B: 0, A: 1, L: 4, R: 5, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const;

const font = (size: number, color = '#ffffff') => ({ fontFamily: BODY_FAMILY, fontStyle: '800', fontSize: `${size}px`, color });
const deviceLabel = (d: Device) => (d === 'K1' ? 'Keyboard 1' : d === 'K2' ? 'Keyboard 2' : d === 'CPU' ? 'Computer' : `Gamepad ${d + 1}`);

interface Panel {
  frame: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  device: Phaser.GameObjects.Text;
  team: Phaser.GameObjects.Text;
  helmet: Phaser.GameObjects.Text;
  empty: Phaser.GameObjects.Text;
  arrows: Phaser.GameObjects.Text[];
  robot: Robot2D;
  anim: Animator;
  /** The colour the preview's parts are painted in. */
  color: number;
}

/**
 * The join screen (Smash character select): each human presses attack (A) to
 * join with their keyboard set or gamepad and special (B) to leave; up / down
 * picks the helmet, left / right the colour, and the colour is the faction
 * (same colour = same team). Below, the number of CPUs; each CPU's colour and
 * helmet are set with the mouse or keys 1-4. Enter / Start goes on to the
 * arena select once there are two robots on two teams.
 */
export class JoinScene extends Phaser.Scene {
  private state: JoinState = { humans: [], cpus: [], cpuCount: 1 };
  private panels: Panel[] = [];
  private cpuText!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private fight!: Phaser.GameObjects.Text;
  private padDirs = new Map<number, string>();

  constructor() { super('Join'); }

  create(): void {
    this.panels = [];
    this.padDirs.clear();
    const saved = this.registry.get('join') as JoinState | undefined;
    this.state = saved ? structuredClone(saved) : {
      humans: [],
      cpus: [1, 2, 3].map((t) => ({ device: 'CPU' as const, team: t, helmet: t })),
      cpuCount: 1,
    };
    // Pads that went away since: their players leave.
    this.state.humans = this.state.humans.filter((h) => typeof h.device !== 'number' || this.input.gamepad?.getPad(h.device));

    const { width, height } = this.scale;
    kubeBackdrop(this, 0.3);
    heading(this, width / 2, 46, 'Choose your Kubot', 54);
    this.add.text(width / 2, 92, 'Attack to join (O · , · gamepad A), special to leave (P · N · B)   ·   up / down: helmet   ·   left / right: colour (same colour = same team)', {
      fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '15px', color: '#9fe3ff',
    }).setOrigin(0.5);

    if (this.sys.renderer.type === Phaser.WEBGL) {
      this.lights.enable().setAmbientColor(0x8a94bc);
      this.lights.addLight(width * 0.3, 40, 1400, 0xffe8cc, 2.2);
      this.lights.addLight(width * 0.8, height, 1200, 0x3aa8ff, 1.4);
    }

    const rig = new Rig(this.registry.get('spriter') as SpriterData);
    for (let i = 0; i < MAX_ROBOTS; i++) this.panels.push(this.makePanel(i, rig));

    // CPU count, and the way on.
    const cy = PANEL_Y + PANEL_H / 2 + 50;
    this.add.text(width / 2 - 470, cy, 'CPUs', font(26)).setOrigin(0.5);
    this.button(width / 2 - 400, cy, '◀', () => this.setCpus(this.state.cpuCount - 1), 30);
    this.cpuText = this.add.text(width / 2 - 355, cy, '', font(30)).setOrigin(0.5);
    this.button(width / 2 - 310, cy, '▶', () => this.setCpus(this.state.cpuCount + 1), 30);
    this.add.text(width / 2 - 470, cy + 32, '+ / - · gamepad L / R', { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '13px', color: '#9fe3ff' }).setOrigin(0, 0.5);
    this.status = this.add.text(width / 2 + 40, cy, '', { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '18px', color: '#cfe9ff' }).setOrigin(0.5);
    this.fight = this.button(width / 2 + 440, cy, 'ARENA ▶', () => this.next(), 30);
    footer(this, ['Enter / Start: choose the arena   ·   Esc: back   ·   1-4: change a slot\'s colour']);
    this.button(70, height - 20, '◀ Back', () => this.back(), 20);

    const kb = this.input.keyboard!;
    for (const set of ['K1', 'K2'] as const) {
      for (const [action, keys] of Object.entries(KEYS[set]) as [Action, string[]][]) {
        for (const k of keys) kb.on(`keydown-${k}`, () => this.act(set, action));
      }
    }
    kb.on('keydown-ENTER', () => this.next());
    kb.on('keydown-SPACE', () => this.next());
    kb.on('keydown-ESC', () => this.back());
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') this.setCpus(this.state.cpuCount + 1);
      if (e.key === '-' || e.key === '_') this.setCpus(this.state.cpuCount - 1);
      const n = parseInt(e.key, 10);
      // The number row only: the numpad is keyboard 2's buttons.
      if (e.code.startsWith('Digit') && n >= 1 && n <= MAX_ROBOTS) this.cycleTeam(n - 1, 1);
    });
    this.input.gamepad?.on('down', (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === PAD.A) this.act(pad.index, 'join');
      else if (button.index === PAD.B) this.act(pad.index, 'leave');
      else if (button.index === PAD.START) this.next();
      else if (button.index === PAD.L) this.setCpus(this.state.cpuCount - 1);
      else if (button.index === PAD.R) this.setCpus(this.state.cpuCount + 1);
    });
    this.refresh();
  }

  private button(x: number, y: number, label: string, onClick: () => void, size: number): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, label, font(size, '#29abe2')).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setScale(1.12));
    t.on('pointerout', () => t.setScale(1));
    t.on('pointerdown', onClick);
    return t;
  }

  private panelX(i: number): number { return this.scale.width / 2 + (i - 1.5) * (PANEL_W + 22); }

  private makePanel(i: number, rig: Rig): Panel {
    const x = this.panelX(i);
    const top = PANEL_Y - PANEL_H / 2;
    const frame = this.add.graphics();
    // An empty slot is a button too: a click adds a CPU.
    const zone = this.add.zone(x, PANEL_Y, PANEL_W, PANEL_H).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => { if (i >= this.slots().length) this.setCpus(this.state.cpuCount + 1); });
    const title = this.add.text(x, top + 26, '', { ...font(28), stroke: '#0b1d33', strokeThickness: 5 }).setOrigin(0.5);
    const device = this.add.text(x, top + 56, '', { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '15px', color: '#cfe9ff' }).setOrigin(0.5);
    const helmet = this.add.text(x, top + PANEL_H - 86, '', { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    const team = this.add.text(x, top + PANEL_H - 40, '', { ...font(22), stroke: '#0b1d33', strokeThickness: 4 }).setOrigin(0.5);
    const empty = this.add.text(x, PANEL_Y, '', { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '18px', color: '#9fe3ff', align: 'center', lineSpacing: 10 }).setOrigin(0.5);
    const arrows = [
      this.button(x - PANEL_W / 2 + 26, top + PANEL_H - 86, '▲', () => this.cycleHelmet(i, -1), 20),
      this.button(x + PANEL_W / 2 - 26, top + PANEL_H - 86, '▼', () => this.cycleHelmet(i, 1), 20),
      this.button(x - PANEL_W / 2 + 26, top + PANEL_H - 40, '◀', () => this.cycleTeam(i, -1), 24),
      this.button(x + PANEL_W / 2 - 26, top + PANEL_H - 40, '▶', () => this.cycleTeam(i, 1), 24),
    ];
    for (const t of [title, device]) t.setDepth(20);
    const panel: Panel = { frame, title, device, team, helmet, empty, arrows, robot: null!, anim: new Animator(rig), color: SLOT_COLORS[0] };
    panel.robot = new Robot2D(this, rig, (file) => partTexture(this.textures, file, panel.color));
    panel.anim.play('idle', { restart: true });
    return panel;
  }

  /** The robots, in slot order: the humans who joined, then the CPUs. */
  private slots(): Seat[] {
    return [...this.state.humans, ...this.state.cpus.slice(0, this.state.cpuCount)];
  }

  private act(device: Device, action: Action): void {
    const humans = this.state.humans;
    const i = humans.findIndex((h) => h.device === device);
    if (i < 0) {
      if (action === 'join') this.join(device);
      else if (action === 'leave' && humans.length === 0) this.back();
      return;
    }
    if (action === 'join') this.taunt(i);
    else if (action === 'leave') { humans.splice(i, 1); this.refresh(); }
    else if (action === 'up' || action === 'down') this.cycleHelmet(i, action === 'up' ? -1 : 1);
    else this.cycleTeam(i, action === 'left' ? -1 : 1);
  }

  private join(device: Device): void {
    const s = this.state;
    if (s.humans.length >= MAX_ROBOTS) return;
    // A full screen: a CPU makes room.
    if (s.humans.length + s.cpuCount >= MAX_ROBOTS) s.cpuCount--;
    const used = new Set(s.humans.map((h) => h.team));
    const team = [0, 1, 2, 3].find((t) => !used.has(t)) ?? 0;
    const helmets = new Set(s.humans.map((h) => h.helmet));
    const helmet = [0, 1, 2, 3].find((h) => !helmets.has(h)) ?? 0;
    s.humans.push({ device, team, helmet });
    this.refresh();
    this.taunt(s.humans.length - 1);
  }

  private setCpus(n: number): void {
    this.state.cpuCount = Phaser.Math.Clamp(n, 0, Math.min(3, MAX_ROBOTS - this.state.humans.length));
    this.refresh();
  }

  private cycleTeam(slot: number, d: number): void {
    const seat = this.slots()[slot];
    if (!seat) return;
    seat.team = (seat.team + d + SLOT_COLORS.length) % SLOT_COLORS.length;
    this.refresh();
    this.taunt(slot);
  }

  private cycleHelmet(slot: number, d: number): void {
    const seat = this.slots()[slot];
    if (!seat) return;
    seat.helmet = (seat.helmet + d + HEADS.length) % HEADS.length;
    this.refresh();
  }

  private taunt(slot: number): void {
    const p = this.panels[slot];
    p?.anim.play('taunt', { restart: true, ms: 700, fade: 60 });
  }

  private problem(): string | null {
    const seats = this.slots();
    if (seats.length < 2) return seats.length === 0 ? 'Press attack to join, add CPUs' : 'Add a player or a CPU';
    if (new Set(seats.map((s) => s.team)).size < 2) return 'Everyone is on one team: pick another colour';
    return null;
  }

  private refresh(): void {
    const seats = this.slots();
    let humanNo = 0;
    this.panels.forEach((p, i) => {
      const seat = seats[i];
      const x = this.panelX(i);
      const color = seat ? SLOT_COLORS[seat.team] : 0x3a4a66;
      // A Kube plate per seat, lit along its top in the seat's colour.
      const left = x - PANEL_W / 2;
      const top = PANEL_Y - PANEL_H / 2;
      drawPlate(p.frame.clear(), left, top, PANEL_W, PANEL_H, { cut: 24, alpha: seat ? 0.92 : 0.55, edge: seat ? color : undefined });
      if (seat) {
        drawStrip(p.frame, left + 24, top, left + PANEL_W, top, color, 3);
        p.frame.fillStyle(color, 0.22).fillRect(left + 8, top + PANEL_H - 64, PANEL_W - 16, 48);
        drawStrip(p.frame, left + 8, top + PANEL_H - 16, left + PANEL_W - 30, top + PANEL_H - 16, color, 2);
      }
      const shown = !!seat;
      for (const o of [p.title, p.device, p.team, p.helmet, ...p.arrows]) o.setVisible(shown);
      p.empty.setVisible(!shown);
      p.robot.visible = shown;
      if (!seat) {
        p.empty.setText(i === seats.length ? 'Press attack to join\nO  ·  ,  ·  gamepad A\n\nclick: add a CPU' : 'Press attack to join');
        return;
      }
      const cpu = seat.device === 'CPU';
      p.title.setText(cpu ? `CPU ${i + 1}` : `P${++humanNo}`).setColor('#' + hex(color));
      p.device.setText(deviceLabel(seat.device));
      p.helmet.setText(`Helmet ${seat.helmet + 1} / ${HEADS.length}`);
      p.team.setText(`${TEAM_NAMES[seat.team]} team`.toUpperCase()).setColor('#ffffff');
      p.color = color;
    });
    this.cpuText.setText(String(this.state.cpuCount));
    const problem = this.problem();
    this.status.setText(problem ?? `${seats.length} robots, ${new Set(seats.map((s) => s.team)).size} teams: Enter / Start for the arena`);
    this.status.setColor(problem ? '#ffd27a' : '#9fffa8');
    this.fight.setAlpha(problem ? 0.35 : 1);
    this.registry.set('join', structuredClone(this.state));
  }

  update(_time: number, deltaMs: number): void {
    this.pollPads();
    const seats = this.slots();
    this.panels.forEach((p, i) => {
      if (!seats[i]) return;
      p.anim.tick(deltaMs);
      if (p.anim.finished) p.anim.play('idle', { fade: 150 });
      const head = HEADS[seats[i].helmet];
      // The two left robots face right, the two right ones left: towards the middle.
      p.robot.update(p.anim.pose(), head ? [head] : [], this.panelX(i), PANEL_Y + 88, i < 2 ? 20 : 160,
        { lean: 0, squash: 1, alpha: 1, flash: false, dtMs: deltaMs });
      p.robot.view.setScale(-ART_SCALE * PREVIEW_SCALE, ART_SCALE * PREVIEW_SCALE);
    });
  }

  /** Gamepad directions (D-pad or left stick), one step per push. */
  private pollPads(): void {
    const g = this.input.gamepad;
    if (!g) return;
    for (const pad of g.gamepads) {
      if (!pad) continue;
      const btn = (i: number) => (pad.buttons[i]?.value ?? 0) > 0.5;
      const ax = pad.axes[0]?.getValue() ?? 0;
      const ay = pad.axes[1]?.getValue() ?? 0;
      let dir = '';
      if (btn(PAD.UP) || ay < -0.6) dir = 'up';
      else if (btn(PAD.DOWN) || ay > 0.6) dir = 'down';
      else if (btn(PAD.LEFT) || ax < -0.6) dir = 'left';
      else if (btn(PAD.RIGHT) || ax > 0.6) dir = 'right';
      if (dir && dir !== this.padDirs.get(pad.index)) this.act(pad.index, dir as Action);
      this.padDirs.set(pad.index, dir);
    }
  }

  /** The fighters for the match: humans keep their keyboard set or pad. */
  private fighters(): FighterSpec[] {
    let humans = 0;
    return this.slots().map((s): FighterSpec => {
      if (s.device === 'CPU') return { input: 'CPU', team: s.team, helmet: s.helmet };
      const n = humans++;
      if (s.device === 'K1' || s.device === 'K2') return { input: s.device === 'K1' ? 'P1' : 'P2', team: s.team, helmet: s.helmet };
      return { input: n % 2 === 0 ? 'P1' : 'P2', pad: s.device, team: s.team, helmet: s.helmet };
    });
  }

  private next(): void {
    if (this.problem()) return;
    shutter(this, () => this.scene.start('Arena', { fighters: this.fighters() }));
  }

  private back(): void {
    shutter(this, () => this.scene.start('Title'));
  }
}
