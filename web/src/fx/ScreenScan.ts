import Phaser from 'phaser';
import { vfx } from '../game/Settings';
import { scanSound } from '../audio/Sounds';

/** Quiet time between two bursts (ms), at random in this range. */
const GAP: [number, number] = [4500, 10000];

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
uniform float uRoll;
varying vec2 outTexCoord;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main () {
  float k = uAmount;
  float zoom = uRes.y / 768.0;
  vec2 uv = outTexCoord;
  // The picture loses its vertical hold and rolls, and the rows wobble sideways.
  uv.y = fract(uv.y + uRoll);
  float y = (1.0 - uv.y) * uRes.y;
  uv.x += k * (0.006 * sin(y * 0.035 + uTime * 40.0) + 0.002 * sin(y * 0.4 - uTime * 90.0));
  // Colour bleeding sideways, red one way and blue the other.
  float bleed = k * 5.0 * zoom / uRes.x;
  vec4 c = texture2D(uMainSampler, uv);
  float r = texture2D(uMainSampler, uv + vec2(bleed, 0.0)).r;
  float b = texture2D(uMainSampler, uv - vec2(bleed, 0.0)).b;
  vec3 rgb = vec3(r, c.g, b);
  float a = c.a;
  // Oversaturated, contrasty colour, as the set struggles for the signal.
  float l = dot(rgb, vec3(0.299, 0.587, 0.114));
  rgb = mix(vec3(l), rgb, 1.0 + 1.6 * k);
  rgb = (rgb - 0.5 * a) * (1.0 + 0.35 * k) + 0.5 * a;
  // Thick round scanlines, the tube's own (every 4 screen pixels at 768 high).
  float line = 0.5 + 0.5 * cos(6.2832 * (1.0 - outTexCoord.y) * uRes.y / (4.0 * zoom));
  rgb *= mix(1.0, 0.3 + 0.95 * line, k);
  // Snow, blue and black (the Kube's cyan, not a real TV's white), and a flicker of the whole picture.
  float snow = hash(floor(gl_FragCoord.xy / zoom) + floor(uTime * 60.0));
  rgb += vec3(0.16, 0.62, 1.0) * snow * 0.45 * k * k * a;
  rgb *= 1.0 + 0.12 * k * (step(0.5, fract(uTime * 17.0)) - 0.5);
  gl_FragColor = vec4(max(rgb, 0.0), a);
}
`;

/** The cameras of every running scene but the screen change's own. */
export function liveCameras(game: Phaser.Game): Phaser.Cameras.Scene2D.Camera[] {
  return game.scene.getScenes(true).filter((s) => s.scene.key !== 'Shutter').flatMap((s) => s.cameras.cameras);
}

/** The scanline pass on a camera. */
export class ScanPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  static readonly key: string = 'ScreenScan';
  /** 0..1: how strong the lines are now. */
  amount = 0;
  /** How far the picture has rolled, in screen heights. */
  roll = 0;

  constructor(game: Phaser.Game, name = ScanPipeline.key) {
    super({ game, name, fragShader: FRAGMENT });
  }

  onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    this.set2f('uRes', target.width, target.height);
    this.set1f('uTime', (this.game.loop.time / 1000) % 1000);
    this.set1f('uAmount', this.amount);
    this.set1f('uRoll', this.roll);
    this.bindAndDraw(target);
  }
}

/**
 * Now and then the menu screen catches a blip of interference, like an
 * old 70s/80s TV: for a split second thick scanlines, oversaturated
 * bleeding colour, snow, the rows wobbling and the picture jumping (the
 * screen changes use the full look, ShutterScene). The pass sits on every camera on screen, driven together; its strength follows the visual effects setting (none at 0).
 */
export function screenScan(scene: Phaser.Scene): void {
  if (scene.sys.renderer.type !== Phaser.WEBGL) return;
  const pipelines = (scene.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (!pipelines.postPipelineClasses.has(ScanPipeline.key)) pipelines.addPostPipeline(ScanPipeline.key, ScanPipeline);

  const passes = new Map<Phaser.Cameras.Scene2D.Camera, ScanPipeline>();
  const passOf = (cam: Phaser.Cameras.Scene2D.Camera): ScanPipeline => {
    let p = passes.get(cam);
    if (!p) {
      cam.setPostPipeline(ScanPipeline.key);
      p = cam.getPostPipeline(ScanPipeline.key) as ScanPipeline;
      passes.set(cam, p);
    }
    return p;
  };
  const drop = (cam: Phaser.Cameras.Scene2D.Camera) => {
    try { cam.removePostPipeline(ScanPipeline.key); } catch { /* its scene is gone */ }
    passes.delete(cam);
  };
  const clear = () => { for (const [cam] of passes) drop(cam); };

  let next = scene.time.now + Phaser.Math.Between(1500, 4000);
  let burst: { at: number; ms: number; strength: number; roll: number } | null = null;
  const onUpdate = (now: number) => {
    if (!burst && now >= next) {
      // Just a blip of interference: far shorter and softer than a screen change.
      burst = { at: now, ms: Phaser.Math.Between(120, 220), strength: Phaser.Math.FloatBetween(0.4, 0.6), roll: Math.random() < 0.5 ? 1 : -1 };
      next = now + burst.ms + Phaser.Math.Between(...GAP);
      if (vfx() > 0) scanSound(scene, burst.strength * 0.5, 2.6);
    }
    const u = burst ? (now - burst.at) / burst.ms : 1;
    if (u >= 1) burst = null;
    // Quick in, quick out.
    const amount = u < 1 ? (burst?.strength ?? 0) * Math.min(1, u / 0.2, (1 - u) / 0.5) * vfx() : 0;
    if (amount <= 0) { if (passes.size) clear(); return; }
    // Every camera on screen: the menu's, the room behind and an arena previewed in it.
    const live = liveCameras(scene.game);
    for (const [cam] of passes) if (!live.includes(cam)) drop(cam);
    for (const cam of live) {
      const p = passOf(cam);
      p.amount = amount;
      // A roll that slips away and snaps back as the set locks on.
      p.roll = (burst?.roll ?? 0) * 0.04 * Math.sin(Math.PI * u);
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  // Paused (Settings over the title) or gone: the screen settles.
  scene.events.on(Phaser.Scenes.Events.PAUSE, () => { burst = null; clear(); });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    clear();
  });
}

/** The same look for the screen change (ui/Plate.ts ShutterScene), as its own pass so it never fights the menu's. */
export class TvCutPipeline extends ScanPipeline {
  static readonly key = 'TvCut';
  constructor(game: Phaser.Game) { super(game, TvCutPipeline.key); }
}

/** Puts the screen-change TV look on a camera at `amount` (0 takes it off), rolled by `roll` screen heights. */
export function tvCut(cam: Phaser.Cameras.Scene2D.Camera, amount: number, roll: number): void {
  const renderer = cam.scene?.sys.renderer;
  if (!renderer || renderer.type !== Phaser.WEBGL) return;
  if (amount <= 0) { cam.removePostPipeline(TvCutPipeline.key); return; }
  const pipelines = (renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (!pipelines.postPipelineClasses.has(TvCutPipeline.key)) pipelines.addPostPipeline(TvCutPipeline.key, TvCutPipeline);
  let p = cam.getPostPipeline(TvCutPipeline.key) as TvCutPipeline | TvCutPipeline[] | undefined;
  if (Array.isArray(p)) p = p[0];
  if (!p) {
    cam.setPostPipeline(TvCutPipeline.key);
    p = cam.getPostPipeline(TvCutPipeline.key) as TvCutPipeline;
  }
  p.amount = amount;
  p.roll = roll;
}
