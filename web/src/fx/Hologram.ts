import Phaser from 'phaser';
import { UNIT } from '../config';

/**
 * Spawn holograms: at the match start and on every respawn a projector
 * floats in under the spawn point and beams light upward; the robot is drawn
 * out of scan lines from the feet up as a cyan hologram (flicker, sliding
 * rows, a bright line where the beam is drawing it), solidifies into the
 * normal lit robot, then the beam recedes and the robot drops to the ground
 * while the projector powers down. On a K.O. the debris dissolves the same
 * way, each piece on its own, scanned away from the top.
 *
 * Everything drawn here is a function of the time since the spawn started
 * (`spawnLook`, `drawSpawn`), so the kill replays redraw it from the age
 * kept in their frames.
 */

/** The hologram's light, the Kube's cyan strips. */
export const HOLO_COLOR = 0x3ec8ff;
const HOLO_CORE = 0xc8f6ff;

/** The spawn sequence (ms from its start). */
export const SPAWN_MS = 2300;
/** The robot is let go (physics, controls) and drops. */
export const RELEASE_AT = 1750;
/** How far above its spawn point the robot hangs in the beam. */
export const HOVER = 1.1 * UNIT;
/** A debris piece's scan-out (ms). */
export const DISSOLVE_MS = 650;

const smooth = (a: number, b: number, t: number): number => {
  const u = Phaser.Math.Clamp((t - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

/** Where the spawn sequence is at `age` ms, every part 0..1. */
export function spawnLook(age: number): {
  /** The projector flying in (to 1) and powering down (back to 0). */
  projector: number;
  /** The beam's height. */
  beam: number;
  /** The scan line drawing the robot from the feet (0) to the head (1). */
  reveal: number;
  /** How much of a hologram the robot still is (1 cyan, 0 solid). */
  holo: number;
  /** The faint scan-line outline ahead of the drawing line. */
  ghost: number;
} {
  return {
    projector: smooth(0, 300, age) * (1 - smooth(1900, SPAWN_MS, age)),
    beam: smooth(200, 520, age) * (1 - smooth(1600, 1900, age)),
    reveal: smooth(420, 1300, age),
    holo: 1 - smooth(1300, 1720, age),
    ghost: smooth(250, 600, age) * (1 - smooth(1100, 1350, age)),
  };
}

// ------------------------------------------------------------------ shader

const FRAGMENT = /* glsl */ `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uRes;
uniform float uTime;
uniform float uLine;
uniform float uHolo;
uniform float uGhost;
uniform float uEdge;
uniform float uSeed;
uniform vec3 uColor;
varying vec2 outTexCoord;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main () {
  vec2 uv = outTexCoord;
  float y = (1.0 - uv.y) * uRes.y; // screen pixels from the top
  float row = floor(y / 3.0);
  // A few rows slide sideways for a moment, while it is a hologram.
  float slip = step(0.94, hash(vec2(row, floor(uTime * 22.0) + uSeed)));
  uv.x += slip * uHolo * (hash(vec2(row + 7.0, uSeed)) - 0.5) * 14.0 / uRes.x;
  vec4 c = texture2D(uMainSampler, uv);
  if (c.a < 0.004) { gl_FragColor = vec4(0.0); return; }
  vec3 base = c.rgb / c.a;
  float l = dot(base, vec3(0.299, 0.587, 0.114));
  // Scan lines (every 3 pixels, drifting up) and a flicker.
  float scan = step(1.0, mod(y + uTime * 45.0, 3.0));
  float flick = 0.8 + 0.2 * hash(vec2(floor(uTime * 28.0), uSeed));
  vec3 holo = uColor * (0.75 + 1.9 * l) + vec3(0.3) * l;
  vec3 rgb = mix(base, holo, uHolo);
  float a = c.a * mix(1.0, (0.55 + 0.4 * scan) * flick, uHolo);
  // Drawn below the line; ahead of it only a faint outline of scan lines.
  float d = y - uLine;
  float shown = step(0.0, d);
  float edge = shown * (1.0 - smoothstep(0.0, uEdge, d));
  rgb += vec3(0.75, 1.0, 1.0) * edge * 2.5;
  a = max(a, c.a * edge);
  float ghost = (1.0 - shown) * uGhost * scan * step(0.5, hash(vec2(row, floor(uTime * 12.0)))) * 0.6;
  rgb = mix(rgb, uColor * 1.2, (1.0 - shown));
  a = a * shown + c.a * ghost;
  gl_FragColor = vec4(rgb * a, a);
}
`;

/**
 * The hologram look on one game object (a robot's container, a debris piece):
 * a post pass with its own line, drawn below a horizontal line on screen.
 * The line is given in world y (`line`), or as a 0..1 sweep down the
 * object's own bounds (`sweep`, debris pieces).
 */
export class HologramPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  line = -1e9;
  sweep = -1;
  holo = 1;
  ghost = 0;
  edge = 6;
  seed = Math.random() * 100;
  color = HOLO_COLOR;
  /** The camera it is seen through (else the scene's main camera). */
  camera: Phaser.Cameras.Scene2D.Camera | null = null;

  constructor(game: Phaser.Game) {
    super({ game, name: 'Hologram', fragShader: FRAGMENT });
  }

  onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    const obj = this.gameObject as Phaser.GameObjects.Image | Phaser.GameObjects.Container | undefined;
    const cam = this.camera ?? obj?.scene?.cameras.main;
    let worldY = this.line;
    if (this.sweep >= 0 && obj) {
      const b = obj.getBounds();
      worldY = b.top + (b.height + 4) * this.sweep - 2;
    }
    const screenY = cam ? (worldY - cam.midPoint.y) * cam.zoom + cam.height / 2 : worldY;
    const c = Phaser.Display.Color.IntegerToColor(this.color);
    this.set2f('uRes', target.width, target.height);
    this.set1f('uTime', (this.game.loop.time / 1000) % 1000);
    this.set1f('uLine', screenY * (target.height / (cam?.height || target.height)));
    this.set1f('uHolo', this.holo);
    this.set1f('uGhost', this.ghost);
    this.set1f('uEdge', this.edge * (cam?.zoom ?? 1));
    this.set1f('uSeed', this.seed);
    this.set3f('uColor', c.redGL, c.greenGL, c.blueGL);
    this.bindAndDraw(target);
  }
}

const webgl = (scene: Phaser.Scene) => scene.sys.renderer.type === Phaser.WEBGL;

/** The hologram pass of an object, added on first use (null without WebGL). */
export function holoOf(obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container, camera?: Phaser.Cameras.Scene2D.Camera): HologramPipeline | null {
  if (!webgl(obj.scene)) return null;
  const pipelines = (obj.scene.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (!pipelines.postPipelineClasses.has('Hologram')) pipelines.addPostPipeline('Hologram', HologramPipeline);
  let p = obj.getPostPipeline(HologramPipeline) as HologramPipeline | HologramPipeline[];
  if (Array.isArray(p)) p = p[0];
  if (!p) {
    obj.setPostPipeline(HologramPipeline);
    p = obj.getPostPipeline(HologramPipeline) as HologramPipeline;
  }
  if (p && camera) p.camera = camera;
  return p ?? null;
}

export function clearHolo(obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container): void {
  if (webgl(obj.scene) && obj.postPipelines.length > 0) obj.removePostPipeline('Hologram');
}

/**
 * A robot's look `age` ms into its spawn: hidden above the scan line, a
 * hologram that solidifies. `feet` / `head` are the world y the line sweeps
 * between. Without WebGL it simply fades in.
 */
export function holoRobot(view: Phaser.GameObjects.Container, age: number, feet: number, head: number, camera?: Phaser.Cameras.Scene2D.Camera): void {
  const look = spawnLook(age);
  if (look.holo <= 0) { clearHolo(view); return; }
  const p = holoOf(view, camera);
  if (!p) { view.setAlpha(view.alpha * look.reveal); return; }
  p.line = look.reveal >= 1 ? -1e9 : feet + (head - feet) * look.reveal;
  p.holo = look.holo;
  p.ghost = look.ghost;
  p.edge = look.reveal >= 1 ? 0.001 : 8;
}

/**
 * A debris piece `t` (0..1) into its scan-out: the line sweeps down from its
 * top, the piece turning to a cyan hologram as it goes.
 */
export function holoPiece(img: Phaser.GameObjects.Image, t: number, camera?: Phaser.Cameras.Scene2D.Camera): void {
  const p = holoOf(img, camera);
  if (!p) { img.setAlpha(1 - t); return; }
  p.sweep = 0.05 + t * 0.95;
  p.holo = Math.min(1, t * 4);
  p.ghost = 0.6 * (1 - t);
  p.edge = 4;
}

// --------------------------------------------------------------- projector

/**
 * The projector, the beam and the robot's glow `age` ms into a spawn,
 * with the robot's feet at (x, feet) (the projector floats just below).
 * `g` is drawn normally, `add` additively.
 */
export function drawSpawn(g: Phaser.GameObjects.Graphics, add: Phaser.GameObjects.Graphics, x: number, feet: number, age: number, time: number): void {
  if (age < 0 || age >= SPAWN_MS) return;
  const look = spawnLook(age);
  const s = look.projector;
  if (s <= 0.001) return;
  const t = time / 1000;
  // Once the robot is let go it flies off to one side and up, out of its way.
  const away = smooth(RELEASE_AT - 80, SPAWN_MS, age);
  x += (Math.floor(x / 7) % 2 === 0 ? 1 : -1) * away * 1.6 * UNIT;
  // Floating: a slow bob, and it flies in from a little lower.
  const py = feet + 0.32 * UNIT + Math.sin(t * 4.2) * 2.5 + (1 - s) * 0.6 * UNIT * (1 - away) - away * 0.9 * UNIT;
  const w = 1.5 * UNIT * (0.35 + 0.65 * s);
  const h = 0.3 * UNIT;

  // The beam: a cone widening upwards to past the head, layered soft bands, scan lines rising through it.
  const top = feet - 2.4 * UNIT;
  const bh = (py - top) * look.beam;
  if (bh > 1) {
    const y0 = py - h * 0.35;
    const y1 = y0 - bh;
    const cone = (k: number, alpha: number) => {
      const wb = w * 0.42 * k;
      const wt = w * 0.62 * k + 0.25 * UNIT;
      add.fillStyle(HOLO_COLOR, alpha * look.beam)
        .fillPoints([{ x: x - wb, y: y0 }, { x: x + wb, y: y0 }, { x: x + wt, y: y1 }, { x: x - wt, y: y1 }], true);
    };
    cone(1.3, 0.07);
    cone(1, 0.11);
    cone(0.62, 0.14);
    cone(0.28, 0.2);
    for (let i = 0; i < 9; i++) {
      const f = ((t * 0.9 + i / 9) % 1); // 0 at the projector, 1 at the top
      const yy = y0 - bh * f;
      const half = w * 0.42 + (w * 0.2 + 0.25 * UNIT) * f;
      add.lineStyle(2, HOLO_CORE, 0.35 * (1 - f) * look.beam).lineBetween(x - half, yy, x + half, yy);
    }
    // A hot core at the lens.
    add.fillStyle(HOLO_CORE, 0.5 * look.beam).fillEllipse(x, y0, w * 0.8, h * 0.5);
  }

  // Under it: the antigravity glow, flickering.
  const hum = 0.7 + 0.3 * Math.sin(t * 37) * Math.sin(t * 13);
  add.fillStyle(HOLO_COLOR, 0.22 * s * hum).fillEllipse(x, py + h * 0.95, w * 0.9, h * 1.1);
  add.fillStyle(HOLO_CORE, 0.35 * s * hum).fillEllipse(x, py + h * 0.75, w * 0.45, h * 0.35);

  // The body: a brushed metal disc seen from the side, darker below, with a rim highlight.
  g.fillStyle(0x23272f, s).fillEllipse(x, py + h * 0.28, w * 0.82, h * 0.9);
  g.fillStyle(0x4a515d, s).fillRect(x - w / 2, py - h * 0.3, w, h * 0.55);
  g.fillStyle(0x6c7482, s).fillEllipse(x, py - h * 0.3, w, h * 0.62);
  g.fillStyle(0x9aa3b1, s).fillEllipse(x, py - h * 0.36, w * 0.86, h * 0.36);
  g.fillStyle(0x2b3039, s).fillEllipse(x, py - h * 0.36, w * 0.5, h * 0.24);
  g.lineStyle(1, 0xcfd6df, 0.8 * s).lineBetween(x - w * 0.44, py - h * 0.12, x + w * 0.44, py - h * 0.12);
  // The light strip round its side, and the lens on top (the Kube's cyan).
  const lit = 0.55 + 0.45 * look.beam;
  g.fillStyle(HOLO_COLOR, s * lit).fillRect(x - w * 0.46, py + h * 0.05, w * 0.92, 2.5);
  add.fillStyle(HOLO_COLOR, 0.5 * s * lit).fillRect(x - w * 0.48, py + h * 0.05 - 2, w * 0.96, 6.5);
  g.fillStyle(HOLO_CORE, s * lit).fillEllipse(x, py - h * 0.36, w * 0.32, h * 0.16);
  for (const side of [-1, 1]) g.fillStyle(0xbfefff, s * lit).fillCircle(x + side * w * 0.36, py + h * 0.1, 1.8);
}

/** The light the spawn throws on the robot and round it (x, the beam's middle). */
export function spawnLight(x: number, feet: number, age: number): { x: number; y: number; color: number; intensity: number } | null {
  if (age < 0 || age >= SPAWN_MS) return null;
  const look = spawnLook(age);
  const i = 2.6 * look.beam + 1.2 * look.projector * (1 - look.beam) + 1.5 * look.holo * look.reveal;
  return i > 0.02 ? { x, y: feet - UNIT * 0.8, color: HOLO_COLOR, intensity: i } : null;
}

// ------------------------------------------------------------------ in game

interface Spawning { at: number; x: number; feet: number }

/** Something that spawns (a Kubotz): its drawing, its feet, and the hold before it drops. */
export interface Spawner {
  readonly model: { view: Phaser.GameObjects.Container };
  readonly x: number;
  readonly body: { bottom: number };
  materializeUntil: number;
}

/**
 * The spawn holograms of a match: starts one for a robot (lifting it into
 * the beam and holding it there), draws the projectors, and lights them.
 */
export class HoloSpawns {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly add: Phaser.GameObjects.Graphics;
  private readonly active = new Map<Spawner, Spawning>();

  constructor(private readonly scene: Phaser.Scene) {
    // The beam over the robot, the projector in front of its feet.
    this.add = scene.add.graphics().setDepth(10.4).setBlendMode(Phaser.BlendModes.ADD);
    this.g = scene.add.graphics().setDepth(10.5);
  }

  /** Starts a robot's spawn now: it is raised by HOVER and held until RELEASE_AT. */
  start(k: Spawner, now: number, lift: (x: number, y: number) => void, y: number): void {
    lift(k.x, y - HOVER);
    k.materializeUntil = now + RELEASE_AT;
    this.active.set(k, { at: now, x: k.x, feet: k.body.bottom });
  }

  /** How far into its spawn a robot is, and where its projector is (for the replays). */
  state(k: Spawner, now: number): [number, number, number] | undefined {
    const s = this.active.get(k);
    return s && now - s.at < SPAWN_MS ? [now - s.at, s.x, s.feet] : undefined;
  }

  /** After the robots are drawn: their hologram look, and the projectors. */
  update(now: number): void {
    this.g.clear();
    this.add.clear();
    for (const [k, s] of this.active) {
      const age = now - s.at;
      if (age >= SPAWN_MS) { this.active.delete(k); clearHolo(k.model.view); continue; }
      holoRobot(k.model.view, age, s.feet, s.feet - 2.15 * UNIT);
      drawSpawn(this.g, this.add, s.x, s.feet, age, this.scene.time.now);
    }
  }

  /** A robot left (K.O. during its spawn, the match ending). */
  cancel(k: Spawner): void {
    if (this.active.delete(k)) clearHolo(k.model.view);
  }

  lights(now: number): { x: number; y: number; color: number; intensity: number }[] {
    const out = [];
    for (const s of this.active.values()) {
      const l = spawnLight(s.x, s.feet, now - s.at);
      if (l) out.push(l);
    }
    return out;
  }

  destroy(): void {
    this.g.destroy();
    this.add.destroy();
    this.active.clear();
  }
}
