import Phaser from 'phaser';
import { vfx } from '../game/Settings';

/**
 * A light film grain, stronger in the shadows, and faint scanlines every 3
 * pixels drifting slowly: a slightly digital screen. Seeded by the screen
 * pixel and the time, so every layer that runs it gets the same grain and
 * lines, and they line up where the layers overlap. High precision where the
 * GPU has it: the hash falls apart at medium precision. While the match is
 * paused (uPause up to 1) the lines get harder and darker and the colours a
 * little richer, like a frozen frame on an old screen.
 */
const GRAIN = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uPause;
varying vec2 outTexCoord;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 grain(vec3 rgb, float l) {
  rgb = max(mix(vec3(l), rgb, 1.0 + 0.3 * uPause), 0.0);
  float n = hash(floor(gl_FragCoord.xy) + fract(uTime * 0.37) * 517.0) - 0.5;
  rgb += n * mix(0.05, 0.02, l);
  float soft = 0.5 + 0.5 * sin((gl_FragCoord.y + uTime * 18.0) * 2.0944);
  float hard = step(2.0, mod(floor(gl_FragCoord.y + uTime * 18.0), 3.0));
  float line = mix(soft, hard, uPause);
  return rgb * (1.0 - mix(0.06, 0.4, uPause) * line);
}
`;

/**
 * The mood pass over the arena (no bloom): a vignette, a touch of contrast and
 * a cool shadows / warm highlights split tone, like the 3D version's grade,
 * then the grain.
 */
const GRADE = GRAIN + /* glsl */ `
void main () {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 shadowTint = vec3(0.88, 0.95, 1.12);
  vec3 lightTint = vec3(1.06, 1.0, 0.94);
  c.rgb *= mix(shadowTint, lightTint, smoothstep(0.2, 0.8, l));
  c.rgb = (c.rgb - 0.5) * 1.1 + 0.5;
  vec2 d = outTexCoord - 0.5;
  float v = 1.0 - smoothstep(0.3, 1.0, length(d) * 1.3);
  c.rgb *= mix(0.7, 1.0, v);
  c.rgb = grain(c.rgb, l);
  gl_FragColor = c;
}
`;

/**
 * The grain alone, for the backdrop behind the arena (it has its own look)
 * and over the menus. Only where the layer has paint, so a menu's clear
 * background adds nothing over the room behind it.
 */
const GRAIN_ONLY = GRAIN + /* glsl */ `
void main () {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  c.rgb = mix(c.rgb, grain(c.rgb, dot(c.rgb, vec3(0.299, 0.587, 0.114))), c.a);
  gl_FragColor = c;
}
`;

class TimedPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  onPreRender(): void {
    this.set1f('uTime', (this.game.loop.time / 1000) % 1000);
    this.set1f('uPause', (this.game.registry.get('pauseFx') as number | undefined) ?? 0);
  }
}

export class GradePipeline extends TimedPipeline {
  static readonly key = 'Grade';
  constructor(game: Phaser.Game) {
    super({ game, name: GradePipeline.key, fragShader: GRADE });
  }
}

export class GrainPipeline extends TimedPipeline {
  static readonly key = 'Grain';
  constructor(game: Phaser.Game) {
    super({ game, name: GrainPipeline.key, fragShader: GRAIN_ONLY });
  }
}

/**
 * Puts one pass on a camera or takes it off (WebGL only). Removes the
 * instances themselves, so turning it on again never stacks a second pass.
 */
let pureAddMode: number | undefined;

/**
 * Plain additive blending (ONE, ONE). Phaser's ADD scales what is below by
 * its alpha, which lifts translucent layers under a full-arena glow (the
 * outer hull showed the glow's rectangle).
 */
export function pureAdd(scene: Phaser.Scene): number {
  const r = scene.sys.renderer;
  if (!(r instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return Phaser.BlendModes.ADD;
  const gl = r.gl;
  return (pureAddMode ??= r.addBlendMode([gl.ONE, gl.ONE], gl.FUNC_ADD));
}

export function setPass(
  scene: Phaser.Scene, cam: Phaser.Cameras.Scene2D.Camera,
  pass: typeof GradePipeline | typeof GrainPipeline, on: boolean,
): boolean {
  if (scene.sys.renderer.type !== Phaser.WEBGL) return false;
  for (const p of cam.postPipelines.filter((q) => q instanceof pass)) cam.removePostPipeline(p as Phaser.Renderer.WebGL.Pipelines.PostFXPipeline);
  if (on) {
    const pipelines = (scene.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
    if (!pipelines.postPipelineClasses.has(pass.key)) pipelines.addPostPipeline(pass.key, pass);
    cam.setPostPipeline(pass);
  }
  return on;
}

/**
 * The screen effects the player wants: off with ?lowfx or a VFX setting
 * under half.
 */
export function wantScreenFx(): boolean {
  return vfx() >= 0.5 && !new URLSearchParams(location.search).has('lowfx');
}

/**
 * Whether the screen effects are on now: what F last set, in a match or a
 * menu, else what the player wants.
 */
export function screenFxOn(game: Phaser.Game): boolean {
  const on = game.registry.get('screenFx');
  return typeof on === 'boolean' ? on : wantScreenFx();
}
