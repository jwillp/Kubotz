import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { lit } from '../fx/NormalMaps';
import { type PosedPart, type Pose, type Rig } from './Rig';
import { look25, partViews, REST_YAW, VIEW_STEP } from './Volume';

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
  const back = file.includes('_sha');
  const leg = file.startsWith('legs/') || file.startsWith('feet/');
  return { z: back ? -46 : 46, round: leg ? 0.45 : 0.38, follow: leg ? 30 : 48 };
}

/** The arguments of one Robot2D.update (poses and map lists are never mutated, so they are kept by reference). */
export interface DrawState {
  pose: Pose; maps: string[]; x: number; bottom: number; yaw: number;
  lean: number; squash: number; alpha: number; flash: boolean;
}

interface Ghost { view: Phaser.GameObjects.Container; born: number; life: number }

/**
 * One robot drawn in 2D: an image per body part, placed from the rig's pose,
 * in a container at the robot's feet. The parts are layered in depth, so the
 * robot turns round the vertical axis like a puppet with volume: each part
 * narrows, swings round by its depth and mirrors past 90°, the head first and
 * the legs last. Spin moves use the same yaw. Hits flash it white; fast moves
 * leave afterimages.
 */
export class Robot2D {
  readonly view: Phaser.GameObjects.Container;
  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private readonly yaws = new Map<string, number>();
  private readonly ghosts: Ghost[] = [];
  private parts: PosedPart[] = [];
  /** Columns each volumetric view adds on each side of its part image, by part. */
  private readonly pads = new Map<string, number>();
  /** What update() drew last, for the kill replays (game/Replay.ts). */
  lastDraw: DrawState | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rig: Rig,
    /** Texture key for a part image (recoloured helmets and blades per player). */
    private readonly textureFor: (file: string) => string,
    /** Draw the parts as turned volumes (the 2.5D exploration) instead of flat images. */
    private readonly volume = false,
  ) {
    this.view = scene.add.container(0, 0).setDepth(10);
  }

  /**
   * @param yaw degrees round the vertical axis: 0 faces right, 180 left (the
   *   turn, plus the clip's own yaw for spins)
   * @param fx extra motion: lean (radians), squash (y scale), alpha, white flash, frame time
   */
  update(pose: Pose, maps: string[], x: number, bottom: number, yaw: number,
    fx: { lean: number; squash: number; alpha: number; flash: boolean; dtMs: number; snap?: boolean }): void {
    this.lastDraw = { pose, maps, x, bottom, yaw, lean: fx.lean, squash: fx.squash, alpha: fx.alpha, flash: fx.flash };
    this.parts = this.rig.solve(pose, maps);
    // The art faces left: the container mirrors it, and yaw 180 mirrors it back.
    this.view.setPosition(x, bottom).setScale(-ART_SCALE, fx.squash * ART_SCALE).setRotation(fx.lean).setAlpha(fx.alpha);
    for (const img of this.images.values()) img.setVisible(false);
    const dt = fx.dtMs / 1000;
    const vol = this.volume && look25.on;
    // Volumetric robots stand a little turned towards the viewer, like a 3/4 view.
    if (vol) yaw += REST_YAW * Math.cos((yaw * Math.PI) / 180);
    this.parts.forEach((p, depth) => {
      const flat = this.textureFor(p.file.name);
      let key = flat;
      // Each part follows the yaw at its own pace.
      const d = depthOf(p.file.name);
      let py = this.yaws.get(p.name);
      if (py === undefined || fx.snap) py = yaw;
      else py += (yaw - py) * Math.min(1, d.follow * dt);
      this.yaws.set(p.name, py);
      const rad = (py * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      let pad = 0;
      if (vol) {
        // The view nearest the part's yaw, folded into 0..90 (past 90 the mirror shows it).
        const views = partViews(this.scene.textures, flat);
        const deg = (Math.acos(Math.min(1, Math.abs(c))) * 180) / Math.PI;
        key = views.keys[Math.round(deg / VIEW_STEP)];
        pad = views.pad;
      }
      this.pads.set(p.name, pad);
      let img = this.images.get(p.name);
      if (!img) {
        img = lit(this.scene.add.image(0, 0, key));
        this.images.set(p.name, img);
        this.view.add(img);
      } else if (img.texture.key !== key) {
        img.setTexture(key);
      }
      // Width as seen: round parts keep some of it edge-on; the sign mirrors.
      // A volumetric view is already turned: it only mirrors.
      const w = (c < 0 ? -1 : 1) * (vol ? 1 : Math.max(Math.abs(c), d.round * (1 - Math.abs(c)) + Math.abs(c) * Math.abs(c)));
      // The part's main axis, squeezed across the view; its thickness keeps the area.
      const a = (p.tr.angle * Math.PI) / 180;
      const ux = Math.cos(a) * w;
      const uy = Math.sin(a);
      const len = Math.hypot(ux, uy) || 1e-3;
      img.setVisible(true)
        .setOrigin((pad + p.pivotX * p.file.width) / (p.file.width + 2 * pad), 1 - p.pivotY)
        .setPosition(p.tr.x * c + d.z * s, -p.tr.y)
        .setAngle(-(Math.atan2(uy, ux) * 180) / Math.PI)
        .setScale(p.tr.scaleX * len, p.tr.scaleY * (Math.abs(w) / len) * Math.sign(w));
      if (fx.flash) img.setTintFill(0xffffff); else img.clearTint();
      this.view.moveTo(img, depth);
    });
    this.updateGhosts();
  }

  /** A fading copy of the robot as drawn now, in a colour (afterimages of fast moves). */
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
    while (v.list.length < list.length) v.add(this.scene.add.image(0, 0, '__DEFAULT').setBlendMode(Phaser.BlendModes.ADD));
    (v.list as Phaser.GameObjects.Image[]).forEach((copy, i) => {
      const src = list[i];
      if (!src || !src.visible) { copy.setVisible(false); return; }
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
      const lx = px + (this.pads.get(p.name) ?? 0) - img.originX * img.width;
      const ly = (img.height - py) - img.originY * img.height;
      out.push({ x: m.getX(lx, ly), y: m.getY(lx, ly) });
    }
    return out;
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
