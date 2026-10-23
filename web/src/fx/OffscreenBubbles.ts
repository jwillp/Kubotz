import Phaser from 'phaser';
import { UNIT } from '../config';

/** A Kubot (or anything) the match camera should show a bubble for when it is out of view. */
export interface BubbleSubject { x: number; y: number; color: number }

/** Where a bubble is drawn on screen (px), for the HUD's ring and pointer. */
export interface BubbleMark { x: number; y: number; r: number; color: number; angle: number }

/** Bubble radius on screen (px), close to the edge and far from it. */
const R_NEAR = 40;
const R_FAR = 26;
/** Units past the screen's edge at which the bubble is at its smallest. */
const FAR = 24;
/** How much of the arena a bubble shows across (units). */
const SHOWN = 4.2;

/** Cuts a bubble camera's square to its circle, with a soft edge (a stencil mask would hide the Kubotz' own post passes). */
const CUT = /* glsl */ `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec3 uCircle;
uniform float uHeight;
varying vec2 outTexCoord;
void main () {
  vec2 p = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y);
  float inside = smoothstep(uCircle.z, uCircle.z - 1.5, distance(p, uCircle.xy));
  gl_FragColor = texture2D(uMainSampler, outTexCoord) * inside;
}`;

class BubbleCutPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  static readonly key = 'BubbleCut';
  /** Centre and radius on screen (px). */
  circle = { x: 0, y: 0, r: 0 };
  constructor(game: Phaser.Game) { super({ game, name: BubbleCutPipeline.key, fragShader: CUT }); }
  onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    this.set3f('uCircle', this.circle.x, this.circle.y, this.circle.r);
    this.set1f('uHeight', this.renderer.height);
    this.bindAndDraw(target);
  }
}

/**
 * Super Smash Bros.' magnifiers: a Kubot out of view shows in a round window
 * on the screen's edge, in its direction, live and smaller the farther it is.
 * Each bubble is a little camera of the Game scene, cut to a circle; the
 * HUD draws the ring and the pointer around it (`marks`).
 */
export class OffscreenBubbles {
  readonly marks: BubbleMark[] = [];
  private cams: { cam: Phaser.Cameras.Scene2D.Camera; cut?: BubbleCutPipeline }[] = [];

  constructor(private scene: Phaser.Scene) {
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /**
   * One bubble per subject outside the band between `top` and `bottom` px of
   * the screen (the HUD covers the rest); none when `on` is false.
   */
  update(subjects: BubbleSubject[], top: number, bottom: number, on = true): void {
    const main = this.scene.cameras.main;
    const { width, height } = this.scene.scale;
    const view = main.worldView;
    this.marks.length = 0;
    let used = 0;
    if (on) for (const s of subjects) {
      const sx = (s.x - view.x) * main.zoom;
      const sy = (s.y - view.y) * main.zoom;
      // Out of view: its body's centre is past an edge (or under the HUD).
      const out = Math.max(-sx, sx - width, top - sy, sy - (height - bottom));
      if (out <= 0) continue;
      const r = Phaser.Math.Linear(R_NEAR, R_FAR, Math.min(1, out / main.zoom / UNIT / FAR));
      const pad = 10;
      const x = Phaser.Math.Clamp(sx, r + pad, width - r - pad);
      const y = Phaser.Math.Clamp(sy, top + r + pad, height - bottom - r - pad);
      const b = this.cams[used] ?? this.make();
      used++;
      b.cam.setVisible(true).setViewport(x - r, y - r, r * 2, r * 2)
        .setZoom((r * 2) / (SHOWN * UNIT)).centerOn(s.x, s.y - 0.3 * UNIT);
      if (b.cut) b.cut.circle = { x, y, r: r - 1 };
      this.marks.push({ x, y, r, color: s.color, angle: Math.atan2(sy - y, sx - x) });
    }
    for (let i = used; i < this.cams.length; i++) this.cams[i].cam.setVisible(false);
  }

  private make(): { cam: Phaser.Cameras.Scene2D.Camera; cut?: BubbleCutPipeline } {
    const cam = this.scene.cameras.add(0, 0, 2, 2).setBackgroundColor(0x0d1520).setRoundPixels(false);
    let cut: BubbleCutPipeline | undefined;
    // (Canvas: square bubbles.)
    if (this.scene.sys.renderer.type === Phaser.WEBGL) {
      const pipelines = (this.scene.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
      if (!pipelines.postPipelineClasses.has(BubbleCutPipeline.key)) pipelines.addPostPipeline(BubbleCutPipeline.key, BubbleCutPipeline);
      cam.setPostPipeline(BubbleCutPipeline);
      cut = cam.getPostPipeline(BubbleCutPipeline) as BubbleCutPipeline;
    }
    const b = { cam, cut };
    this.cams.push(b);
    return b;
  }

  private destroy(): void {
    for (const b of this.cams) this.scene.cameras.remove(b.cam);
    this.cams = [];
    this.marks.length = 0;
  }
}
