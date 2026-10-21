import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { pointOnPart, type PosedPart, type Pose, type Rig } from './Rig';

/** Spriter pixels to world pixels. */
export const ART_SCALE = Config.SPRITER_SCALE * UNIT;

/**
 * One robot drawn in 2D: an image per body part, placed from the rig's pose,
 * in a container at the robot's feet. Turning round squeezes it through its
 * edge; hits flash it white.
 */
export class Robot2D {
  readonly view: Phaser.GameObjects.Container;
  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private parts: PosedPart[] = [];
  private flipX = 1; // container x scale sign and squeeze

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rig: Rig,
    /** Texture key for a part image (recoloured helmets and blades per player). */
    private readonly textureFor: (file: string) => string,
  ) {
    this.view = scene.add.container(0, 0).setDepth(10);
  }

  /**
   * @param face eased facing, -1 (left) .. 1 (right)
   * @param fx extra motion: lean (radians), squash (y scale), alpha, white flash
   */
  update(pose: Pose, maps: string[], x: number, bottom: number, face: number, fx: { lean: number; squash: number; alpha: number; flash: boolean }): void {
    this.parts = this.rig.solve(pose, maps);
    // The art faces left: facing right mirrors it.
    this.flipX = -Math.sign(face || 1) * Math.max(0.12, Math.abs(face));
    this.view.setPosition(x, bottom).setScale(this.flipX * ART_SCALE, fx.squash * ART_SCALE).setRotation(fx.lean).setAlpha(fx.alpha);
    for (const img of this.images.values()) img.setVisible(false);
    this.parts.forEach((p, depth) => {
      const key = this.textureFor(p.file.name);
      let img = this.images.get(p.name);
      if (!img) {
        img = this.scene.add.image(0, 0, key);
        this.images.set(p.name, img);
        this.view.add(img);
      } else if (img.texture.key !== key) {
        img.setTexture(key);
      }
      img.setVisible(true)
        .setOrigin(p.file.pivotX, 1 - p.file.pivotY)
        .setPosition(p.tr.x, -p.tr.y)
        .setAngle(-p.tr.angle)
        .setScale(p.tr.scaleX, p.tr.scaleY);
      if (fx.flash) img.setTintFill(0xffffff); else img.clearTint();
      this.view.moveTo(img, depth);
    });
  }

  /** A point of a part image (pixels from its bottom-left) in world pixels, on every part showing that image. */
  pointsOn(file: string, px: number, py: number): { x: number; y: number }[] {
    const m = this.view.getWorldTransformMatrix();
    return this.parts.filter((p) => p.file.name === file).map((p) => {
      const s = pointOnPart(p, px, py);
      return { x: m.getX(s.x, -s.y), y: m.getY(s.x, -s.y) };
    });
  }

  pointOn(file: string, px: number, py: number): { x: number; y: number } | null {
    return this.pointsOn(file, px, py)[0] ?? null;
  }

  /** The visible parts as they are now (texture, world position, angle, scale), for the K.O. explosion. */
  pieces(): { key: string; x: number; y: number; angle: number; scaleX: number; scaleY: number; originX: number; originY: number; size: number }[] {
    const m = this.view.getWorldTransformMatrix();
    return this.parts.map((p) => {
      const img = this.images.get(p.name)!;
      return {
        key: img.texture.key,
        x: m.getX(p.tr.x, -p.tr.y),
        y: m.getY(p.tr.x, -p.tr.y),
        angle: Phaser.Math.RadToDeg(m.rotationNormalized) + (this.flipX < 0 ? p.tr.angle : -p.tr.angle),
        scaleX: p.tr.scaleX * ART_SCALE * Math.sign(this.flipX),
        scaleY: p.tr.scaleY * ART_SCALE,
        originX: p.file.pivotX,
        originY: 1 - p.file.pivotY,
        size: Math.max(p.file.width * Math.abs(p.tr.scaleX), p.file.height * Math.abs(p.tr.scaleY)) * ART_SCALE,
      };
    });
  }

  set visible(v: boolean) { this.view.setVisible(v); }

  destroy(): void { this.view.destroy(); }
}
