import Phaser from 'phaser';
import { pureAdd } from '../fx/Grade';
import { Config, UNIT } from '../config';
import { GLITCH_MS, hitGlitch } from '../fx/HitGlitch';
import { lit } from '../fx/NormalMaps';
import { CEL, toonLit } from '../fx/Cel';
import { type PosedPart, type Pose, type Rig } from './Rig';
import { BASE_BUILD, buildScale, type Build } from '../game/Modules';

/** Spriter pixels to world pixels. */
export const ART_SCALE = Config.SPRITER_SCALE * UNIT;

/**
 * How each part sits in depth, for turning round the vertical axis (yaw):
 * z (Spriter pixels towards the viewer when facing right), how round it is
 * (a sphere keeps its width seen from the front, a flat plate does not), and
 * how fast it follows a turn (the head leads, the hips and legs follow).
 */
interface Depth { z: number; round: number; follow: number }

function depthOf(file: string): Depth {
  if (file.startsWith('head/')) return { z: 4, round: 0.78, follow: 60 };
  if (file.startsWith('torso/')) return { z: 0, round: 0.62, follow: 42 };
  const back = file.includes('-sha');
  const leg = file.startsWith('legs/') || file.startsWith('feet/');
  return { z: back ? -46 : 46, round: leg ? 0.45 : 0.38, follow: leg ? 30 : 48 };
}

/** The arguments of one Kubot2D.update (poses and map lists are never mutated, so they are kept by reference). */
export interface DrawState {
  pose: Pose; maps: string[]; x: number; bottom: number; yaw: number;
  lean: number; squash: number; alpha: number; flash: boolean;
  /** Struck this frame (the white flash of a hit, not a charge blink): it glitches. */
  glitch?: boolean;
  /** A raised guard: the shield hexagon over the Kubot. */
  shield?: Shield;
}

/** The guard's shield: half height of the hexagon and its centre above the feet (px), and the team colour. */
export interface Shield { r: number; above: number; color: number }

/** How hard the Kubot glitches where it shows through a raised shield. */
const SHIELD_GLITCH = 0.42;

interface Ghost { view: Phaser.GameObjects.Container; born: number; life: number }

/**
 * One Kubot drawn in 2D: an image per body part, placed from the rig's pose,
 * in a container at the Kubot's feet. The parts are layered in depth, so the
 * Kubot turns round the vertical axis like a puppet with volume: each part
 * narrows, swings round by its depth and mirrors past 90°, the head first and
 * the legs last. Spin moves use the same yaw. Hits flash it white and glitch
 * it (fx/HitGlitch.ts); fast moves leave afterimages.
 */
export class Kubot2D {
  readonly view: Phaser.GameObjects.Container;
  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private readonly yaws = new Map<string, number>();
  private readonly ghosts: Ghost[] = [];
  private parts: PosedPart[] = [];
  /** How long since the last hit glitch started (ms of frame time, so slow motion slows it), and whether the hit is still on. */
  private glitchAge = Infinity;
  private glitching = false;
  /** The guard's shield hexagon: a team-coloured fill and a lighter sheen from the art's gradient. */
  private hex?: { fill: Phaser.GameObjects.Image; sheen: Phaser.GameObjects.Image };
  /** The camera the Kubot is seen through, when not the scene's main one. */
  camera?: Phaser.Cameras.Scene2D.Camera;
  /** Its body module's proportions: torso size, arm and leg thickness (game/Modules.ts). */
  build: Build = BASE_BUILD;
  /** What update() drew last, for the kill replays (game/Replay.ts). */
  lastDraw: DrawState | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rig: Rig,
    /** Texture key for a part image (recoloured helmets and blades per player). */
    private readonly textureFor: (file: string) => string,
  ) {
    this.view = scene.add.container(0, 0).setDepth(10);
  }

  /** Parts take the arena lights; cel-shaded ones (fx/Cel.ts) in toon steps, so the lights don't shade them back into gradients. */
  private light(img: Phaser.GameObjects.Image): Phaser.GameObjects.Image {
    if (img.texture.key.includes(CEL)) toonLit(img);
    else lit(img);
    return img;
  }

  /**
   * @param yaw degrees round the vertical axis: 0 faces right, 180 left (the
   *   turn, plus the clip's own yaw for spins)
   * @param fx extra motion: lean (radians), squash (y scale), alpha, white flash, hit glitch, frame time, a shade multiplied over the parts (replays: Kubotz out of the moment)
   */
  update(pose: Pose, maps: string[], x: number, bottom: number, yaw: number,
    fx: { lean: number; squash: number; alpha: number; flash: boolean; glitch?: boolean; shield?: Shield; dtMs: number; snap?: boolean; shade?: number }): void {
    this.lastDraw = { pose, maps, x, bottom, yaw, lean: fx.lean, squash: fx.squash, alpha: fx.alpha, flash: fx.flash, glitch: fx.glitch, shield: fx.shield };
    this.parts = this.rig.solve(pose, maps);
    // The art faces left: the container mirrors it, and yaw 180 mirrors it back.
    this.view.setPosition(x, bottom).setScale(-ART_SCALE, fx.squash * ART_SCALE).setRotation(fx.lean).setAlpha(fx.alpha);
    for (const img of this.images.values()) img.setVisible(false);
    const dt = fx.dtMs / 1000;
    this.parts.forEach((p, depth) => {
      const key = this.textureFor(p.file.name);
      let img = this.images.get(p.name);
      if (!img) {
        img = this.light(this.scene.add.image(0, 0, key));
        this.images.set(p.name, img);
        this.view.add(img);
      } else if (img.texture.key !== key) {
        this.light(img.setTexture(key));
      }
      // Each part follows the yaw at its own pace.
      const d = depthOf(p.file.name);
      let py = this.yaws.get(p.name);
      if (py === undefined || fx.snap) py = yaw;
      else py += (yaw - py) * Math.min(1, d.follow * dt);
      this.yaws.set(p.name, py);
      const rad = (py * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      // Width as seen: round parts keep some of it edge-on; the sign mirrors.
      const w = (c < 0 ? -1 : 1) * Math.max(Math.abs(c), d.round * (1 - Math.abs(c)) + Math.abs(c) * Math.abs(c));
      // The part's main axis, squeezed across the view; its thickness keeps the area.
      const a = (p.tr.angle * Math.PI) / 180;
      const ux = Math.cos(a) * w;
      const uy = Math.sin(a);
      const len = Math.hypot(ux, uy) || 1e-3;
      const [along, across] = buildScale(p.file.name, this.build);
      img.setVisible(true)
        .setOrigin(p.pivotX, 1 - p.pivotY)
        .setPosition(p.tr.x * c + d.z * s, -p.tr.y)
        .setAngle(-(Math.atan2(uy, ux) * 180) / Math.PI)
        .setScale(p.tr.scaleX * len * along, p.tr.scaleY * (Math.abs(w) / len) * Math.sign(w) * across);
      if (fx.flash) img.setTintFill(0xffffff); else if (fx.shade !== undefined) img.setTint(fx.shade); else img.clearTint();
      this.view.moveTo(img, depth);
    });
    this.drawShield(fx.shield, fx.squash);
    this.updateGlitch(!!fx.glitch, fx.dtMs, fx.shield);
    this.updateGhosts();
  }

  /**
   * The guard's shield: the hexagon art (particles/hexa.png) in the team
   * colour, over the Kubot and inside its container so it tears with it.
   */
  private drawShield(shield: Shield | undefined, squash: number): void {
    if (!shield) { if (this.hex) { this.hex.fill.setVisible(false); this.hex.sheen.setVisible(false); } return; }
    if (!this.hex) {
      this.hex = {
        fill: this.scene.add.image(0, 0, 'p-hexa'),
        sheen: this.scene.add.image(0, 0, 'p-hexa').setBlendMode(pureAdd(this.scene)),
      };
      this.view.add([this.hex.fill, this.hex.sheen]);
    }
    const { fill, sheen } = this.hex;
    // Container space: mirrored and scaled by ART_SCALE, squashed with the Kubot.
    const sy = (2 * shield.r) / fill.height / ART_SCALE;
    const ly = -shield.above / (ART_SCALE * squash);
    // A signal that is not quite steady: the hexagon flickers a little.
    const flicker = Math.random() < 0.12 ? 0.55 : 1;
    for (const img of [fill, sheen]) img.setVisible(true).setPosition(0, ly).setScale(sy, sy / squash);
    fill.setTintFill(shield.color).setAlpha(0.3 * flicker);
    sheen.setTint(0xffffff).setAlpha(0.3 * flicker);
    this.view.bringToTop(fill);
    this.view.bringToTop(sheen);
  }

  /** Each new hit restarts the glitch, which settles over GLITCH_MS; a raised shield keeps what shows through it glitching. */
  private updateGlitch(hit: boolean, dtMs: number, shield?: Shield): void {
    this.glitchAge = hit && !this.glitching ? 0 : this.glitchAge + dtMs;
    this.glitching = hit;
    const f = this.glitchAge / GLITCH_MS;
    const hex = shield ? { x: this.view.x, y: this.view.y - shield.above, r: shield.r, amount: SHIELD_GLITCH } : null;
    hitGlitch(this.view, f < 1 ? (1 - f) * (1 - f) * 0.6 + 0.4 * (1 - f) : 0, this.camera, hex);
  }

  /**
   * Cuts a part's image short at `x` (pixels of the image from its left; null
   * shows it whole): a plasma blade ending where it enters a wall.
   */
  cutImage(file: string, x: number | null): void {
    for (const p of this.parts) {
      if (p.file.name !== file) continue;
      const img = this.images.get(p.name);
      if (!img) continue;
      if (x === null) { if (img.isCropped) img.setCrop(); continue; }
      const f = img.frame;
      img.setCrop(0, 0, Math.max(0, (x / p.file.width) * f.width), f.height);
    }
  }

  /** A fading copy of the Kubot as drawn now, in a colour (afterimages of fast moves). */
  ghost(color: number, life = 200, alpha = 0.5): void {
    let g = this.ghosts.find((q) => !q.view.visible);
    if (!g) {
      if (this.ghosts.length >= 8) g = this.ghosts.reduce((o, q) => (q.born < o.born ? q : o));
      else {
        g = { view: this.scene.add.container(0, 0).setDepth(9), born: 0, life };
        this.ghosts.push(g);
      }
    }
    const v = g.view;
    v.setVisible(true).setPosition(this.view.x, this.view.y).setScale(this.view.scaleX, this.view.scaleY).setRotation(this.view.rotation);
    const list = this.view.list as Phaser.GameObjects.Image[];
    while (v.list.length < list.length) v.add(this.scene.add.image(0, 0, '__DEFAULT').setBlendMode(pureAdd(this.scene)));
    (v.list as Phaser.GameObjects.Image[]).forEach((copy, i) => {
      const src = list[i];
      // (Not the plasma blade: a flat tinted copy of it reads as a stray light; its swing smear shows its motion.)
      if (!src || !src.visible || src === this.hex?.fill || src === this.hex?.sheen || src.texture.key.includes('blade:')) { copy.setVisible(false); return; }
      copy.setVisible(true).setTexture(src.texture.key).setOrigin(src.originX, src.originY)
        .setPosition(src.x, src.y).setAngle(src.angle).setScale(src.scaleX, src.scaleY).setTintFill(color);
    });
    v.setAlpha(alpha);
    g.born = this.scene.time.now;
    g.life = life;
  }

  private updateGhosts(): void {
    const now = this.scene.time.now;
    for (const g of this.ghosts) {
      if (!g.view.visible) continue;
      const f = (now - g.born) / g.life;
      if (f >= 1) g.view.setVisible(false);
      else g.view.setAlpha(0.5 * (1 - f) * (1 - f));
    }
  }

  /** A point of a part image (pixels from its bottom-left) in world pixels, on every part showing that image. */
  pointsOn(file: string, px: number, py: number): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (const p of this.parts) {
      if (p.file.name !== file) continue;
      const img = this.images.get(p.name);
      if (!img) continue;
      const m = img.getWorldTransformMatrix();
      const lx = px - img.originX * img.width;
      const ly = (img.height - py) - img.originY * img.height;
      out.push({ x: m.getX(lx, ly), y: m.getY(lx, ly) });
    }
    return out;
  }

  /** A point of a part (by its name in kubotz.scml) as a share of its image (0..1 from the bottom-left), in world pixels; whatever image the part shows. */
  pointOnPart(part: string, fx: number, fy: number): { x: number; y: number } | null {
    const img = this.images.get(part);
    if (!img || !img.visible) return null;
    const m = img.getWorldTransformMatrix();
    const lx = (fx - img.originX) * img.width;
    const ly = (1 - fy - img.originY) * img.height;
    return { x: m.getX(lx, ly), y: m.getY(lx, ly) };
  }

  /** The other way round: a world point as a share of a part's image. */
  shareOnPart(part: string, wx: number, wy: number): { x: number; y: number } | null {
    const img = this.images.get(part);
    if (!img) return null;
    const l = img.getWorldTransformMatrix().applyInverse(wx, wy);
    return { x: l.x / img.width + img.originX, y: 1 - (l.y / img.height + img.originY) };
  }

  /** The other way round: a world point on the first part showing an image, in that image's pixels (from its bottom-left). */
  pointIn(file: string, wx: number, wy: number): { x: number; y: number } | null {
    const p = this.parts.find((q) => q.file.name === file);
    const img = p && this.images.get(p.name);
    if (!img) return null;
    const l = img.getWorldTransformMatrix().applyInverse(wx, wy);
    return { x: l.x + img.originX * img.width, y: img.height - (l.y + img.originY * img.height) };
  }

  pointOn(file: string, px: number, py: number): { x: number; y: number } | null {
    return this.pointsOn(file, px, py)[0] ?? null;
  }

  /** The visible parts as they are now (texture, world position, angle, scale), for the K.O. explosion. */
  pieces(): { key: string; x: number; y: number; angle: number; scaleX: number; scaleY: number; originX: number; originY: number; size: number }[] {
    return this.parts.map((p) => {
      const img = this.images.get(p.name)!;
      const d = img.getWorldTransformMatrix().decomposeMatrix();
      return {
        key: img.texture.key,
        x: d.translateX,
        y: d.translateY,
        angle: Phaser.Math.RadToDeg(d.rotation),
        scaleX: d.scaleX,
        scaleY: d.scaleY,
        originX: img.originX,
        originY: img.originY,
        size: Math.max(p.file.width * Math.abs(p.tr.scaleX), p.file.height * Math.abs(p.tr.scaleY)) * ART_SCALE,
      };
    });
  }

  set visible(v: boolean) {
    this.view.setVisible(v);
    if (!v) for (const g of this.ghosts) g.view.setVisible(false);
  }

  destroy(): void {
    this.view.destroy();
    for (const g of this.ghosts) g.view.destroy();
  }
}
