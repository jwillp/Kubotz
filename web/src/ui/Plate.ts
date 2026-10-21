import Phaser from 'phaser';
import { vfx } from '../game/Settings';
import { body, heading, HeadingText, NEON } from './Type';

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
 * `bodyLabel`), centred on (x, y). Selected, its cyan strip lights up and it
 * slides in a little.
 */
export class PlateButton extends Phaser.GameObjects.Container {
  private readonly g: Phaser.GameObjects.Graphics;
  readonly label: HeadingText | Phaser.GameObjects.Text;
  private selected_ = false;
  private readonly home: number;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly w: number, readonly h: number, text: string,
    { size = 32, bodyLabel = false }: { size?: number; bodyLabel?: boolean } = {}) {
    super(scene, x, y);
    this.home = x;
    this.g = scene.add.graphics();
    this.label = bodyLabel
      ? scene.add.text(0, 0, text, body(size, { fontStyle: '800' })).setOrigin(0.5)
      : heading(scene, 0, 2, text, size, { glow: null });
    this.add([this.g, this.label]);
    this.setSize(w, h).setInteractive({ useHandCursor: true });
    scene.add.existing(this);
    this.draw();
  }

  get selected(): boolean { return this.selected_; }

  setSelected(on: boolean): this {
    if (on === this.selected_) return this;
    this.selected_ = on;
    this.draw();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, x: this.home + (on ? 10 : 0), duration: 120, ease: 'Quad.out' });
    return this;
  }

  private draw(): void {
    const { w, h } = this;
    const on = this.selected_;
    const g = this.g.clear();
    drawPlate(g, -w / 2, -h / 2, w, h, { cut: 16, alpha: on ? 0.95 : 0.78, edge: on ? NEON : METAL_EDGE });
    if (on) {
      drawStrip(g, -w / 2 + 1, -h / 2 + 18, -w / 2 + 1, h / 2 - 4, NEON, 4);
      drawStrip(g, w / 2 - 18, h / 2, w / 2 - 2, h / 2, NEON, 2);
    }
    if (this.label instanceof HeadingText) this.label.setGlow(on ? NEON : null);
    else this.label.setColor(on ? '#bfe9ff' : '#ffffff');
  }
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
 * effects off, `swap` runs at once.
 */
export function shutter(scene: Phaser.Scene, swap: () => void): void {
  if (vfx() <= 0) { swap(); return; }
  const game = scene.game;
  const host = game.scene.getScene('Shutter') ?? game.scene.add('Shutter', ShutterScene, false);
  game.scene.run('Shutter', { swap });
  game.scene.bringToTop(host.scene.key);
}

/** Draws the shutter over every scene (its own scene, so it survives the scene swap). */
class ShutterScene extends Phaser.Scene {
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
