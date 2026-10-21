import Phaser from 'phaser';

/**
 * A light film grain, stronger in the shadows, and faint scanlines every 3
 * pixels drifting slowly: a slightly digital screen. Seeded by the screen
 * pixel and the time, so every layer that runs it gets the same grain and
 * lines, and they line up where the layers overlap. High precision where the
 * GPU has it: the hash falls apart at medium precision.
 */
const GRAIN = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform float uTime;
varying vec2 outTexCoord;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 grain(vec3 rgb, float l) {
  float n = hash(floor(gl_FragCoord.xy) + fract(uTime * 0.37) * 517.0) - 0.5;
  rgb += n * mix(0.05, 0.02, l);
  float line = 0.5 + 0.5 * sin((gl_FragCoord.y + uTime * 18.0) * 2.0944);
  return rgb * (1.0 - 0.06 * line);
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

/** The grain alone, for the backdrop behind the arena (it has its own look). */
const GRAIN_ONLY = GRAIN + /* glsl */ `
void main () {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  c.rgb = grain(c.rgb, dot(c.rgb, vec3(0.299, 0.587, 0.114)));
  gl_FragColor = c;
}
`;

class TimedPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  onPreRender(): void {
    this.set1f('uTime', (this.game.loop.time / 1000) % 1000);
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
