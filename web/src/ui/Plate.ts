import Phaser from 'phaser';
import { onSettingsChange, vfx } from '../game/Settings';
import { BACKDROPS } from '../fx/Backdrops';
import { GrainPipeline, screenFxOn, setPass, wantScreenFx } from '../fx/Grade';
import type { BackdropScene } from '../scenes/BackdropScene';
import { body, heading, HeadingText, NEON } from './Type';
import { uiSound } from '../audio/Sounds';
import { screenScan } from '../fx/ScreenScan';

/**
 * The "Kube plate": the panel every HUD element and menu is built from.
 * Hard-edged gunmetal like the Kube's walls, two opposite corners cut at 45°
 * like the robots' helmets, lit by cyan strips like the arenas' block edges.
 */
export const METAL_TOP = 0x2a3a50;
export const METAL = 0x0d1520;
export const METAL_EDGE = 0x4a6584;
export const BEVEL = 0x9cc4e8;
/** Height of one band of the top-to-bottom shading, at most. */
const BAND = 8;

export interface PlateStyle {
  /** Size of the cut corners (top left and bottom right). */
  cut?: number;
  alpha?: number;
  /** Outline colour (the selected button's is cyan). */
  edge?: number;
}

/** The plate's outline, starting top left after the cut, clockwise. */
function outline(x: number, y: number, w: number, h: number, cut: number): Phaser.Math.Vector2[] {
  const V = Phaser.Math.Vector2;
  return [new V(x + cut, y), new V(x + w, y), new V(x + w, y + h - cut), new V(x + w - cut, y + h), new V(x, y + h), new V(x, y + cut)];
}

/** Draws a plate at (x, y), w × h, onto `g`. */
export function drawPlate(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  { cut = 14, alpha = 0.92, edge = METAL_EDGE }: PlateStyle = {}): Phaser.GameObjects.Graphics {
  // Brushed metal lit from above: bands from METAL_TOP down to METAL (Graphics has no gradient fill for polygons).
  const top = Phaser.Display.Color.IntegerToColor(METAL_TOP);
  const bottom = Phaser.Display.Color.IntegerToColor(METAL);
  const left = (yy: number) => x + Math.max(0, cut - (yy - y));
  const right = (yy: number) => x + w - Math.max(0, yy - (y + h - cut));
  const bands = Math.max(6, Math.ceil(h / BAND));
  for (let i = 0; i < bands; i++) {
    const ya = y + (h * i) / bands;
    const yb = y + (h * (i + 1)) / bands;
    const ys = [...new Set([ya, y + cut, y + h - cut, yb])].filter((v) => v >= ya && v <= yb).sort((a, b) => a - b);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), alpha).fillPoints([
      ...ys.map((v) => new Phaser.Math.Vector2(left(v), v)),
      ...ys.reverse().map((v) => new Phaser.Math.Vector2(right(v), v)),
    ], true);
  }
  g.lineStyle(1, edge, 0.9).strokePoints(outline(x, y, w, h, cut), true);
  g.lineStyle(1, BEVEL, 0.45).lineBetween(x + cut, y + 1, x + w - 1, y + 1);
  return g;
}

/**
 * A soft neon halo around a plate's outline, on `g` (drawn additive): the
 * selected item's glow. `grow` widens it, for a pulse.
 */
export function drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  { cut = 14, color = NEON, grow = 0 }: { cut?: number; color?: number; grow?: number } = {}): Phaser.GameObjects.Graphics {
  for (const [pad, width, alpha] of [[13, 16, 0.07], [9, 11, 0.12], [5.5, 7, 0.2], [2.5, 3.5, 0.4], [1, 1.5, 0.7]] as const) {
    const p = pad + grow;
    g.lineStyle(width + grow, color, alpha).strokePoints(outline(x - p, y - p, w + 2 * p, h + 2 * p, cut + p * 0.41), true);
  }
  return g;
}

/** A lit strip from (x1, y1) to (x2, y2): a bright core in a soft halo. */
export function drawStrip(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number,
  color = NEON, width = 3): Phaser.GameObjects.Graphics {
  g.lineStyle(width * 4, color, 0.12).lineBetween(x1, y1, x2, y2);
  g.lineStyle(width * 2, color, 0.25).lineBetween(x1, y1, x2, y2);
  g.lineStyle(width, color, 1).lineBetween(x1, y1, x2, y2);
  g.lineStyle(Math.max(1, width / 3), 0xffffff, 0.7).lineBetween(x1, y1, x2, y2);
  return g;
}

/**
 * A menu button: a plate with a label (Okuba Cloud heading, or Exo 2 when
 * `bodyLabel`), centred on (x, y). Selected, its cyan strip lights up, a
 * neon halo breathes around it and it slides in a little, with a light
 * sweeping across it as it takes the selection.
 */
export class PlateButton extends Phaser.GameObjects.Container {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly sweep: Phaser.GameObjects.Graphics;
  readonly label: HeadingText | Phaser.GameObjects.Text;
  private selected_ = false;
  private readonly home: number;
  /** The frame it was made on: the first selection, as the menu opens, is silent. */
  private readonly born: number;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly w: number, readonly h: number, text: string,
    { size = 32, bodyLabel = false }: { size?: number; bodyLabel?: boolean } = {}) {
    super(scene, x, y);
    this.home = x;
    this.glow = drawGlow(scene.add.graphics(), -w / 2, -h / 2, w, h, { cut: 16 }).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.born = scene.game.loop.frame;
    this.g = scene.add.graphics();
    // A bright bar that runs across the plate when it is selected, clipped to the plate by its own geometry.
    this.sweep = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.label = bodyLabel
      ? scene.add.text(0, 0, text, body(size, { fontStyle: '800' })).setOrigin(0.5)
      : heading(scene, 0, 2, text, size, { glow: null });
    this.add([this.glow, this.g, this.sweep, this.label]);
    this.setSize(w, h).setInteractive({ useHandCursor: true });
    scene.add.existing(this);
    this.draw();
  }

  get selected(): boolean { return this.selected_; }

  setSelected(on: boolean): this {
    if (on === this.selected_) return this;
    this.selected_ = on;
    this.draw();
    const tweens = this.scene.tweens;
    tweens.killTweensOf([this, this.glow, this.sweep]);
    tweens.add({ targets: this, x: this.home + (on ? 10 : 0), duration: 120, ease: 'Quad.out' });
    this.sweep.setVisible(false);
    if (!on) { this.glow.setAlpha(0); return this; }
    if (this.scene.game.loop.frame > this.born) uiSound(this.scene, 'move');
    // The halo flares as the button takes the selection, then breathes.
    this.glow.setAlpha(1).setScale(1.04);
    tweens.add({ targets: this.glow, scale: 1, duration: 220, ease: 'Quad.out' });
    tweens.add({ targets: this.glow, alpha: 0.55, duration: 900, delay: 220, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (vfx() > 0) {
      const { w, h } = this;
      const g = this.sweep.clear().setVisible(true).setAlpha(1);
      g.fillStyle(0xbfe9ff, 0.22).fillPoints([new Phaser.Math.Vector2(-14, -h / 2), new Phaser.Math.Vector2(10, -h / 2),
        new Phaser.Math.Vector2(-10, h / 2), new Phaser.Math.Vector2(-34, h / 2)], true);
      g.x = -w / 2 + 20;
      tweens.add({ targets: g, x: w / 2 - 4, alpha: 0, duration: 320, ease: 'Quad.in', onComplete: () => g.setVisible(false) });
    }
    return this;
  }

  private draw(): void {
    const { w, h } = this;
    const on = this.selected_;
    const g = this.g.clear();
    drawPlate(g, -w / 2, -h / 2, w, h, { cut: 16, alpha: on ? 0.95 : 0.78, edge: on ? NEON : METAL_EDGE });
    if (on) {
      // Lit from inside: a cyan wash over the metal.
      g.fillStyle(NEON, 0.14).fillPoints(outline(-w / 2, -h / 2, w, h, 16), true);
      drawStrip(g, -w / 2 + 1, -h / 2 + 18, -w / 2 + 1, h / 2 - 4, NEON, 4);
      drawStrip(g, w / 2 - 18, h / 2, w / 2 - 2, h / 2, NEON, 2);
    }
    if (this.label instanceof HeadingText) this.label.setGlow(on ? NEON : null);
    else this.label.setColor(on ? '#bfe9ff' : '#ffffff');
  }
}

/**
 * The room behind the menus: one of the arenas' backdrops, picked at random
 * when the game starts and each time the title comes back after a match
 * (never the same twice in a row; a match forgets the pick), then kept
 * through the menus.
 */
export function menuArena(scene: Phaser.Scene): number {
  const reg = scene.registry;
  let n = reg.get('menuArena') as number | undefined;
  if (n === undefined) {
    const last = reg.get('menuArenaLast') as number | undefined;
    const choices = BACKDROPS.map((_, i) => i).filter((i) => i !== last || BACKDROPS.length < 2);
    n = Phaser.Utils.Array.GetRandom(choices);
    reg.set('menuArena', n);
    reg.set('menuArenaLast', n);
  }
  return n;
}

/**
 * An arena's backdrop behind a menu, as in a match (the blurred room, bokeh,
 * light shafts, haze), under a dim of `dim`, with the match's screen effects
 * over it all (menuScreenFx), turning like an old TV changing stations now
 * and then (screenScan). Stops with the scene.
 */
export function kubeBackdrop(scene: Phaser.Scene, dim = 0.15): void {
  const { width, height } = scene.scale;
  scene.scene.launch('Backdrop', { arena: menuArena(scene), menu: true });
  scene.scene.sendToBack('Backdrop');
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scene.stop('Backdrop'));
  scene.add.rectangle(width / 2, height / 2, width, height, 0x050b18, dim);
  menuScreenFx(scene);
  screenScan(scene);
}

/**
 * The match's screen effects on a menu: its grain and scanlines over the
 * menu's own drawing (the room behind takes the whole grade), F toggling
 * them as in a match unless `keys` is false. Follows the VFX setting live.
 */
export function menuScreenFx(scene: Phaser.Scene, { keys = true } = {}): void {
  const apply = () => {
    const on = screenFxOn(scene.game);
    setPass(scene, scene.cameras.main, GrainPipeline, on);
    const backdrop = scene.scene.get('Backdrop') as BackdropScene;
    if (backdrop.sys.isActive()) backdrop.setScreenFx(on);
  };
  apply();
  if (keys) {
    scene.input.keyboard?.on('keydown-F', () => {
      scene.registry.set('screenFx', !screenFxOn(scene.game));
      apply();
    });
  }
  const off = onSettingsChange(() => { scene.registry.set('screenFx', wantScreenFx()); apply(); });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
}

/** A key-hint bar along the bottom edge: a dark band under a cyan line, one or two lines of Exo 2. */
export function footer(scene: Phaser.Scene, lines: string[]): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const h = 18 + lines.length * 22;
  const g = scene.add.graphics();
  g.fillStyle(0x070d16, 0.85).fillRect(0, height - h, width, h);
  drawStrip(g, 0, height - h, width, height - h, NEON, 2);
  const texts = lines.map((l, i) => scene.add.text(width / 2, height - h + 20 + i * 22, l,
    body(i === 0 ? 16 : 14, { fontStyle: '500', color: i === 0 ? '#cfe9ff' : '#8fb6d8' })).setOrigin(0.5));
  return scene.add.container(0, 0, [g, ...texts]);
}

/** A screen title in the shared frame: Okuba Cloud top left, a cyan rule under it. */
export function frameTitle(scene: Phaser.Scene, text: string, y = 56): HeadingText {
  const t = heading(scene, 0, y, text, 56).setOrigin(0, 0.5);
  t.x = 48;
  const g = scene.add.graphics();
  drawStrip(g, 48, y + 38, 48 + Math.max(240, t.displayWidth + 40), y + 38, NEON, 2);
  return t;
}

/**
 * The menu transition: two plates close from the sides onto a cyan seam,
 * `swap` runs while the screen is covered, then they open. With visual
 * effects off, `swap` runs at once. It plays the confirm (or back) menu sound.
 */
export function shutter(scene: Phaser.Scene, swap: () => void, sound: 'confirm' | 'back' = 'confirm'): void {
  uiSound(scene, sound);
  if (vfx() <= 0) { swap(); return; }
  // ShutterScene is in the game's scene list (main.ts): adding it here would return null when
  // called from a scene's update (the scene manager defers adds made while it steps the scenes).
  scene.game.scene.run('Shutter', { swap });
  scene.game.scene.bringToTop('Shutter');
}

/** Draws the shutter over every scene (its own scene, so it survives the scene swap). */
export class ShutterScene extends Phaser.Scene {
  constructor() { super('Shutter'); }

  create({ swap }: { swap: () => void }): void {
    const { width, height } = this.scale;
    const half = width / 2;
    const leaf = (side: -1 | 1) => {
      const g = this.add.graphics();
      drawPlate(g, side < 0 ? -half : 0, -4, half, height + 8, { cut: 0, alpha: 1 });
      drawStrip(g, side < 0 ? -2 : 2, 0, side < 0 ? -2 : 2, height, NEON, 3);
      g.setPosition(side < 0 ? -half : width + half, 0);
      return g;
    };
    const left = leaf(-1);
    const right = leaf(1);
    this.tweens.add({
      targets: left, x: half, duration: 170, ease: 'Quad.in',
    });
    this.tweens.add({
      targets: right, x: half, duration: 170, ease: 'Quad.in',
      onComplete: () => {
        swap();
        this.scene.bringToTop();
        this.tweens.add({ targets: left, x: -half, delay: 60, duration: 190, ease: 'Quad.out' });
        this.tweens.add({ targets: right, x: width + half, delay: 60, duration: 190, ease: 'Quad.out', onComplete: () => this.scene.stop() });
      },
    });
  }
}
