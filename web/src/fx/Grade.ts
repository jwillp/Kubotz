import Phaser from 'phaser';

/**
 * The mood pass over the whole view (after the bloom): a vignette, a touch of
 * contrast and a cool shadows / warm highlights split tone, like the 3D
 * version's grade.
 */
const FRAGMENT = /* glsl */ `
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
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
  gl_FragColor = c;
}
`;

export class GradePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'Grade', fragShader: FRAGMENT });
  }
}
