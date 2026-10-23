import Phaser from 'phaser';
import { UNIT } from '../config';

/** A Kubot (or anything) the match camera should show a bubble for when it is out of view. */
export interface BubbleSubject { x: number; y: number; color: number }

/** Where a bubble is drawn on screen (px), for the HUD's frame and pointer: its centre, radius (centre to a corner) and direction. */
export interface BubbleMark { x: number; y: number; r: number; color: number; angle: number }

/** Bubble radius on screen (px, centre to a corner), close to the edge and far from it. */
const R_NEAR = 62;
const R_FAR = 44;
/** Units past the screen's edge at which the bubble is at its smallest. */
const FAR = 24;
/** How much of the arena a bubble shows, top to bottom (units). */
const SHOWN = 5;
/** Half width over radius of a hexagon with a corner on top. */
export const HEX_W = Math.sqrt(3) / 2;

/**
 * The shield's hexagon (particles/hexa.png: a corner on top) for a bubble
 * camera: cuts its square to the hexagon and lets a few rows slip now and
 * then, with the odd bright tear, like what shows through a raised shield.
 * The HUD lays the shield art over it. (A stencil mask would hide the
 * Kubotz' own post passes.)
 */
const HEX = /* glsl */ `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec3 uHex;
uniform vec2 uRes;
uniform float uTime;
varying vec2 outTexCoord;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main () {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uHex.xy;
  vec2 q = abs(p);
  // Distance inside the edge (px): flat sides, then the four slanted ones.
  float edge = min(uHex.z * 0.866 - q.x, uHex.z * 0.866 - (q.x * 0.5 + q.y * 0.866));
  float inside = smoothstep(0.0, 1.5, edge);
  float row = floor((p.y + uHex.z) / 4.0);
  float t = floor(uTime * 12.0);
  float slip = step(0.92, hash(row * 7.1 + t)) * (hash(row + t * 3.3) - 0.5) * 12.0 / uRes.x;
  vec4 c = texture2D(uMainSampler, outTexCoord + vec2(slip, 0.0));
  float tear = step(0.975, hash(floor((p.y + uHex.z) / 2.0) * 3.7 + t * 1.3));
  // (Premultiplied: the see-through background stays see-through.)
  gl_FragColor = vec4(c.rgb + tear * 0.45, max(c.a, tear * 0.45)) * inside;
}`;

class BubbleHexPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  static readonly key = 'BubbleHex';
  /** Centre and radius on screen (px). */
  hex = { x: 0, y: 0, r: 0 };
  constructor(game: Phaser.Game) { super({ game, name: BubbleHexPipeline.key, fragShader: HEX }); }
  onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    this.set3f('uHex', this.hex.x, this.hex.y, this.hex.r);
    this.set2f('uRes', this.renderer.width, this.renderer.height);
    this.set1f('uTime', (this.game.loop.time / 1000) % 1000);
    this.bindAndDraw(target);
  }
}

/**
 * Super Smash Bros.' magnifiers, in the shield's hexagon: a Kubot off the
 * screen shows in a window on the screen's edge, in its direction, live and
 * smaller the farther it is. Each bubble is a little camera of the Game
 * scene, cut to the hexagon; the HUD lays the shield art and the pointer
 * over it (`marks`).
 */
export class OffscreenBubbles {
  readonly marks: BubbleMark[] = [];
  private cams: { cam: Phaser.Cameras.Scene2D.Camera; cut?: BubbleHexPipeline }[] = [];

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
      const x = Phaser.Math.Clamp(sx, r * HEX_W + pad, width - r * HEX_W - pad);
      const y = Phaser.Math.Clamp(sy, top + r + pad, height - bottom - r - pad);
      const b = this.cams[used] ?? this.make();
      used++;
      b.cam.setVisible(true).setViewport(x - r, y - r, r * 2, r * 2)
        .setZoom((r * 2) / (SHOWN * UNIT)).centerOn(s.x, s.y - 0.3 * UNIT);
      if (b.cut) b.cut.hex = { x, y, r: r - 1 };
      this.marks.push({ x, y, r, color: s.color, angle: Math.atan2(sy - y, sx - x) });
    }
    for (let i = used; i < this.cams.length; i++) this.cams[i].cam.setVisible(false);
  }

  private make(): { cam: Phaser.Cameras.Scene2D.Camera; cut?: BubbleHexPipeline } {
    // The HUD plates' steel, see-through like the shield: the fight behind shows faintly.
    const cam = this.scene.cameras.add(0, 0, 2, 2).setBackgroundColor('rgba(13, 21, 32, 0.5)').setRoundPixels(false);
    let cut: BubbleHexPipeline | undefined;
    // (Canvas: square bubbles.)
    if (this.scene.sys.renderer.type === Phaser.WEBGL) {
      const pipelines = (this.scene.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
      if (!pipelines.postPipelineClasses.has(BubbleHexPipeline.key)) pipelines.addPostPipeline(BubbleHexPipeline.key, BubbleHexPipeline);
      cam.setPostPipeline(BubbleHexPipeline);
      cut = cam.getPostPipeline(BubbleHexPipeline) as BubbleHexPipeline;
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
