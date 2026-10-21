import Phaser from 'phaser';

/**
 * The hit glitch: when a robot is struck it still flashes white, and on top
 * of that its picture breaks up like a bad digital signal for a moment.
 * Bands of rows tear sideways, the red and blue split apart at the edges,
 * scan lines run through it and a few rows drop out or burn bright. It is
 * strongest on the blow and settles over GLITCH_MS, past the white flash.
 */

/** How long a hit glitches (ms), from the blow. */
export const GLITCH_MS = 240;

const FRAGMENT = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec2 uRes;
uniform float uTime;
uniform float uAmount;
uniform float uSeed;
uniform float uZoom;
varying vec2 outTexCoord;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main () {
  vec2 uv = outTexCoord;
  float k = uAmount;
  float y = (1.0 - uv.y) * uRes.y; // screen pixels from the top
  // The picture jumps a few times while it lasts, not every frame.
  float tick = floor(uTime * 30.0) + uSeed;
  // Bands of rows of uneven height tear sideways, the wider the harder the hit.
  float band = floor(y / (uZoom * mix(3.0, 9.0, hash(vec2(floor(y / (12.0 * uZoom)), tick)))));
  float tear = step(1.0 - 0.45 * k, hash(vec2(band, tick)));
  float shift = tear * (hash(vec2(band + 3.0, tick)) - 0.5) * 2.0 * 18.0 * uZoom * k;
  uv.x += shift / uRes.x;
  // Red and blue pulled apart sideways.
  float split = (2.0 + 4.0 * k) * uZoom * k / uRes.x;
  vec4 c = texture2D(uMainSampler, uv);
  vec4 r = texture2D(uMainSampler, uv + vec2(split, 0.0));
  vec4 b = texture2D(uMainSampler, uv - vec2(split, 0.0));
  float a = max(c.a, max(r.a, b.a) * k);
  if (a < 0.004) { gl_FragColor = vec4(0.0); return; }
  vec3 rgb = vec3(r.r, c.g, b.b);
  // Scan lines every 3 pixels, drifting down.
  float scan = step(1.0, mod(y - uTime * 60.0, 3.0 * uZoom) / uZoom);
  float keep = mix(1.0, 0.45 + 0.55 * scan, k);
  // A row here and there drops out, another burns bright.
  float row = floor(y / (2.0 * uZoom));
  float drop = step(1.0 - 0.12 * k, hash(vec2(row, tick + 11.0)));
  float burn = step(1.0 - 0.08 * k, hash(vec2(row, tick + 23.0)));
  keep *= 1.0 - drop;
  rgb += vec3(0.55, 0.9, 1.0) * burn * a;
  gl_FragColor = vec4(rgb * keep, a * keep);
}
`;

/** The glitch pass on a robot's container. */
export class HitGlitchPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  static readonly key = 'HitGlitch';
  /** 0..1: how hard it glitches now. */
  amount = 0;
  seed = 0;
  /** The camera it is seen through (else the scene's main camera), for the zoom. */
  camera: Phaser.Cameras.Scene2D.Camera | null = null;

  constructor(game: Phaser.Game) {
    super({ game, name: HitGlitchPipeline.key, fragShader: FRAGMENT });
  }

  onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    const obj = this.gameObject as Phaser.GameObjects.Container | undefined;
    const cam = this.camera ?? obj?.scene?.cameras.main;
    // Sizes are in arena pixels, so the glitch keeps its scale as the camera zooms.
    const zoom = (cam?.zoom ?? 1) * (target.height / (cam?.height || target.height));
    this.set2f('uRes', target.width, target.height);
    this.set1f('uTime', (this.game.loop.time / 1000) % 1000);
    this.set1f('uAmount', this.amount);
    this.set1f('uSeed', this.seed);
    this.set1f('uZoom', Math.max(0.5, zoom));
    this.bindAndDraw(target);
  }
}

/**
 * Sets how hard `obj` glitches (0 removes the pass). Without WebGL it does
 * nothing: the white flash alone shows the hit.
 */
export function hitGlitch(obj: Phaser.GameObjects.Container, amount: number, camera?: Phaser.Cameras.Scene2D.Camera): void {
  if (obj.scene.sys.renderer.type !== Phaser.WEBGL) return;
  let p = obj.getPostPipeline(HitGlitchPipeline.key) as HitGlitchPipeline | HitGlitchPipeline[] | undefined;
  if (Array.isArray(p)) p = p[0];
  if (amount <= 0) {
    if (p) obj.removePostPipeline(HitGlitchPipeline.key);
    return;
  }
  if (!p) {
    const pipelines = (obj.scene.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
    if (!pipelines.postPipelineClasses.has(HitGlitchPipeline.key)) pipelines.addPostPipeline(HitGlitchPipeline.key, HitGlitchPipeline);
    obj.setPostPipeline(HitGlitchPipeline.key);
    p = obj.getPostPipeline(HitGlitchPipeline.key) as HitGlitchPipeline;
    p.seed = Math.random() * 100;
  }
  p.amount = amount;
  if (camera) p.camera = camera;
}
