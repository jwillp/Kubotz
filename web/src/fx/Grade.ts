import Phaser from 'phaser';

/**
 * The mood pass over the whole view (after the bloom): a vignette, a touch of
 * contrast and a cool shadows / warm highlights split tone, like the 3D
 * version's grade. Then a light film grain and faint scanlines, a slightly
 * digital screen.
 */
const FRAGMENT = /* glsl */ `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
varying vec2 outTexCoord;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
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
  // Grain, stronger in the shadows; scanlines every 3 pixels, drifting slowly.
  float n = hash(floor(gl_FragCoord.xy) + fract(uTime * 0.37) * 517.0) - 0.5;
  c.rgb += n * mix(0.05, 0.02, l);
  float line = 0.5 + 0.5 * sin((gl_FragCoord.y + uTime * 18.0) * 2.0944);
  c.rgb *= 1.0 - 0.06 * line;
  gl_FragColor = c;
}
`;

export class GradePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'Grade', fragShader: FRAGMENT });
  }

  onPreRender(): void {
    this.set1f('uTime', (this.game.loop.time / 1000) % 1000);
  }
}
