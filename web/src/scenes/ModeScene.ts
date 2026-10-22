import Phaser from 'phaser';
import { Animator } from '../anim/Animator';
import { Rig } from '../anim/Rig';
import { ART_SCALE, Kubot2D } from '../anim/Kubot2D';
import { HEADS, SLOT_COLORS, SWORD_FILE, partTexture } from '../game/Kubotz';
import { flagTexture } from '../fx/Flag';
import { BLACK_COLOR } from '../game/Match';
import { MODE_ORDER, MODES, type MatchMode } from '../game/Modes';
import type { SpriterData } from '../spriter/Spriter';
import { body, heading, HeadingText, NEON } from '../ui/Type';
import { drawPlate, drawStrip, footer, frameTitle, kubeBackdrop, PlateButton, shutter } from '../ui/Plate';
import { MenuInput } from './MenuInput';

/** A Kubot on the mode's stage: its colour, helmet, weapon (rig map) and which way it faces. */
interface Actor { color: number; helmet: number; weapon?: string; face: 1 | -1; /** Holds a flag of this colour (on the sword's map). */ flag?: number }

/** Who stands on the stage for each mode. */
const LINEUPS: Record<MatchMode, Actor[]> = {
  gladiator: [
    { color: SLOT_COLORS[0], helmet: 0, face: 1 },
    { color: SLOT_COLORS[1], helmet: 1, face: -1 },
  ],
  horde: [
    { color: SLOT_COLORS[0], helmet: 0, face: 1 },
    { color: SLOT_COLORS[0], helmet: 2, face: 1 },
    { color: BLACK_COLOR, helmet: 3, face: -1 },
    { color: BLACK_COLOR, helmet: 3, face: -1 },
    { color: BLACK_COLOR, helmet: 3, face: -1 },
  ],
  blasters: [
    { color: SLOT_COLORS[2], helmet: 0, weapon: 'weapon_laserGunMkI', face: 1 },
    { color: SLOT_COLORS[3], helmet: 1, weapon: 'weapon_laserGunMkI', face: -1 },
  ],
  blades: [
    { color: SLOT_COLORS[1], helmet: 2, weapon: 'weapon_laserSword', face: 1 },
    { color: SLOT_COLORS[0], helmet: 0, weapon: 'weapon_laserSword', face: -1 },
  ],
  ctf: [
    { color: SLOT_COLORS[0], helmet: 0, weapon: 'weapon_laserSword', flag: BLACK_COLOR, face: 1 },
    { color: SLOT_COLORS[0], helmet: 2, face: 1 },
    { color: BLACK_COLOR, helmet: 3, face: -1 },
    { color: BLACK_COLOR, helmet: 3, weapon: 'weapon_laserSword', flag: SLOT_COLORS[0], face: -1 },
  ],
  sandbox: [
    { color: SLOT_COLORS[0], helmet: 0, face: 1 },
    { color: SLOT_COLORS[1], helmet: 7, face: -1 },
  ],
  blasterTraining: [
    { color: SLOT_COLORS[0], helmet: 0, weapon: 'weapon_laserGunMkI', face: 1 },
    { color: SLOT_COLORS[1], helmet: 4, face: -1 },
    { color: SLOT_COLORS[2], helmet: 9, weapon: 'weapon_laserSword', face: -1 },
  ],
  bladeTraining: [
    { color: SLOT_COLORS[0], helmet: 0, weapon: 'weapon_laserSword', face: 1 },
    { color: SLOT_COLORS[3], helmet: 5, weapon: 'weapon_laserGunMkI', face: -1 },
    { color: SLOT_COLORS[1], helmet: 6, face: -1 },
  ],
};

const BTN_X = 300;
/** The two lists: battles, then solo training, each under its heading. */
const GROUPS: { group: 'battle' | 'training'; label: string; top: number }[] = [
  { group: 'battle', label: 'B A T T L E', top: 186 },
  { group: 'training', label: 'T R A I N I N G', top: 498 },
];
const BTN_STEP = 56;
/** The panel describing the selected mode, on the right. */
const PANEL = { x: 560, y: 168, w: 672, h: 480 };
const STAGE_Y = 470;

/**
 * The mode screen, between the title's Play and the setup screen: the modes
 * down the left as Kube plates, the selected one described on the right with
 * a few Kubotz showing it. Up / down chooses, A (Enter) picks it, B (Esc)
 * goes back to the title. The choice is kept in the registry ('mode').
 */
export class ModeScene extends Phaser.Scene {
  private selected = 0;
  private items: PlateButton[] = [];
  private leaving = false;
  private menu!: MenuInput;
  private rig!: Rig;
  private title!: HeadingText;
  private tagline!: Phaser.GameObjects.Text;
  private rules!: Phaser.GameObjects.Text;
  private actors: { kubot: Kubot2D; anim: Animator; actor: Actor }[] = [];

  constructor() { super('Modes'); }

  create(): void {
    this.items = [];
    this.actors = [];
    this.leaving = false;
    kubeBackdrop(this);
    frameTitle(this, 'Game mode');
    this.rig = new Rig(this.registry.get('spriter') as SpriterData);
    // The Kubotz' parts are lit (normal maps), as on the setup screen: a key light from the top left, a blue rim from below right.
    if (this.sys.renderer.type === Phaser.WEBGL) {
      this.lights.enable().setAmbientColor(0xb4bcdc);
      this.lights.addLight(PANEL.x + 120, PANEL.y + 40, 1200, 0xffe8cc, 2.6);
      this.lights.addLight(PANEL.x + PANEL.w, PANEL.y + PANEL.h + 100, 1100, 0x3aa8ff, 1.6);
    }

    const p = drawPlate(this.add.graphics(), PANEL.x, PANEL.y, PANEL.w, PANEL.h, { cut: 26, alpha: 0.88 });
    drawStrip(p, PANEL.x, PANEL.y + 26, PANEL.x, PANEL.y + PANEL.h, NEON, 4);
    drawStrip(p, PANEL.x + PANEL.w * 0.45, PANEL.y + PANEL.h, PANEL.x + PANEL.w - 26, PANEL.y + PANEL.h, NEON, 3);
    // The stage's floor: a lit strip the Kubotz stand on.
    drawStrip(p, PANEL.x + 60, STAGE_Y + 2, PANEL.x + PANEL.w - 60, STAGE_Y + 2, NEON, 2);
    const cx = PANEL.x + PANEL.w / 2;
    this.title = heading(this, cx, PANEL.y + 52, '', 54);
    this.tagline = this.add.text(cx, PANEL.y + 102, '', body(20, { fontStyle: '600', color: '#9fe3ff' })).setOrigin(0.5);
    this.rules = this.add.text(PANEL.x + 70, STAGE_Y + 30, '', body(18, { fontStyle: '600', color: '#e9f6ff', lineSpacing: 10 }));

    for (const g of GROUPS) {
      this.add.text(BTN_X - 200, g.top - 40, g.label, body(13, { fontStyle: '700', color: '#9fc4e4' })).setOrigin(0, 0.5);
    }
    MODE_ORDER.forEach((m, i) => {
      const g = GROUPS.find((x) => x.group === MODES[m].group)!;
      const row = MODE_ORDER.filter((o) => MODES[o].group === g.group).indexOf(m);
      const b = new PlateButton(this, BTN_X, g.top + row * BTN_STEP, 400, 48, MODES[m].name, { size: 26 });
      b.on('pointerover', () => this.select(i));
      b.on('pointerdown', () => this.pick(i));
      this.items.push(b);
    });
    const saved = this.registry.get('mode') as MatchMode | undefined;
    this.select(Math.max(0, MODE_ORDER.indexOf(saved ?? 'gladiator')));

    footer(this, ['↑↓ / D-pad / stick choose · A / Enter select · B / Esc back']);
    this.menu = new MenuInput({
      move: (_dx, dy) => { if (dy) this.select((this.selected + dy + MODE_ORDER.length) % MODE_ORDER.length); },
      confirm: () => this.pick(this.selected),
      back: () => this.back(),
    }, false, { confirm: ['A', 9], back: ['B'] });
    const kb = this.input.keyboard!;
    kb.on('keydown-O', () => this.pick(this.selected));
    kb.on('keydown-COMMA', () => this.pick(this.selected));
  }

  update(time: number, deltaMs: number): void {
    if (!this.leaving) this.menu.update(time);
    const lineup = this.actors.length;
    this.actors.forEach(({ kubot, anim, actor }, i) => {
      anim.tick(deltaMs);
      if (anim.finished) anim.play('idle', { fade: 150 });
      // Spread along the stage: the first side facing right, the other facing left.
      const x = PANEL.x + PANEL.w / 2 + (i - (lineup - 1) / 2) * Math.min(130, (PANEL.w - 200) / Math.max(1, lineup - 1));
      const maps = [HEADS[actor.helmet], ...(actor.weapon ? [actor.weapon] : [])].filter((m): m is string => !!m);
      kubot.update(anim.pose(), maps, x, STAGE_Y, 160, { lean: 0, squash: 1, alpha: 1, flash: false, dtMs: deltaMs });
      const s = ART_SCALE * (lineup > 3 ? 0.62 : 0.78);
      kubot.view.setScale(-s * actor.face, s);
    });
  }

  private select(i: number): void {
    const changed = i !== this.selected || this.actors.length === 0;
    this.selected = i;
    this.items.forEach((t, j) => t.setSelected(j === i));
    if (!changed) return;
    const m = MODES[MODE_ORDER[i]];
    this.title.setText(m.name);
    this.tagline.setText(m.tagline);
    this.rules.setText(m.rules.map((r) => `▸  ${r}`).join('\n'));
    // A new cast on the stage, one taunting.
    for (const a of this.actors) a.kubot.destroy();
    this.actors = LINEUPS[MODE_ORDER[i]].map((actor) => {
      const kubot = new Kubot2D(this, this.rig, (file) => (actor.flag !== undefined && file === SWORD_FILE
        ? flagTexture(this, actor.flag) : partTexture(this.textures, file, actor.color)));
      const anim = new Animator(this.rig);
      anim.play('idle', { restart: true });
      return { kubot, anim, actor };
    });
    this.actors[0]?.anim.play('taunt', { restart: true, ms: 700, fade: 60 });
  }

  private pick(i: number): void {
    if (this.leaving) return;
    this.select(i);
    this.leaving = true;
    this.registry.set('mode', MODE_ORDER[i]);
    shutter(this, () => this.scene.start('Setup'));
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    shutter(this, () => this.scene.start('Title'), 'back');
  }
}
