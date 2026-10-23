import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { fx, particleChance } from '../game/Settings';
import { hitGlitch } from './HitGlitch';
import { EffectDef, ParticleFx } from './ParticleEffect';

/**
 * The original laserSmoke effect (.pe) layered behind the K.O. smoke, drawn
 * as many small puffs cel-shaded like it: 'trails' streams it behind the
 * flying puffs, 'full' also boils a cloud of it out of the core. 'alone' shows
 * full laserSmoke without the main smoke or its glitch. L cycles it in a match;
 * ?laser=full|trails|alone|off.
 */
export type LaserSmokeMode = 'off' | 'trails' | 'full' | 'alone';
export const LASER_SMOKE_MODES: LaserSmokeMode[] = ['alone', 'full', 'trails', 'off'];
export const laserSmoke = { mode: ((): LaserSmokeMode => {
  const q = new URLSearchParams(location.search).get('laser');
  return LASER_SMOKE_MODES.includes(q as LaserSmokeMode) ? q as LaserSmokeMode : 'alone';
})() };
const laserAlone = () => laserSmoke.mode === 'alone';

type Kind = 'spark' | 'ring' | 'flash' | 'puff' | 'bit' | 'beam' | 'mote' | 'smoke' | 'haze';

interface Particle {
  kind: Kind;
  x: number; y: number; vx: number; vy: number;
  age: number; life: number;
  color: number;
  size: number; // width of a spark, radius of the others (px)
  grow: number; // radius gained over the life (px)
  gravity: number; // px/s²
  drag: number; // fraction of speed kept per second
  flat?: boolean; // rings drawn as a flat ellipse (on the ground)
  len?: number; // beams: length behind the point (signed: the bolt's direction)
  lenY?: number; // beams: its vertical part (a bolt batted back at an angle)
  body?: number; // smoke: the bright colour inside its deep rim (`color`)
  collide?: boolean; // stopped by the arena's walls and platforms
}

/** A swing's smear: per sample, the striking point (o) and one nearer the body (i); a plasma blade's from hilt (i) to tip (o). */
interface Trail { points: { ox: number; oy: number; ix: number; iy: number; t: number }[]; color: number; blade: boolean; }

/** A streak of the K.O. smoke whipping out from the core, tapering to a point. */
interface Wisp { x: number; y: number; angle: number; len: number; width: number; bend: number; age: number; life: number; color: number }

interface Flash { x: number; y: number; color: number; intensity: number; at: number; }

/** Orb motes spiralling round a Kubot: once after a pick-up, or lasting while a power-up runs. */
interface Twirl { owner: { x: number; y: number }; key: string; color: number; start: number; end: number; lasting: boolean; }

const KUBOT_H = Config.KUBOTZ_HEIGHT * UNIT;
const TWIRL_FADE = 300;

const TRAIL_MS = 170;
const SINGLE = new Set<Kind>(['ring', 'flash', 'beam']);
const KO_SMOKE = new Set<Kind>(['smoke', 'haze']);
const FLASH_MS = 160;

const mix = (a: number, b: number, f: number) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    ca.red + (cb.red - ca.red) * f, ca.green + (cb.green - ca.green) * f, ca.blue + (cb.blue - ca.blue) * f);
};
const rand = Phaser.Math.FloatBetween;

/**
 * Impact effects drawn over the 3D world: sparks stretched along their motion,
 * flash rings and a brief light where hits land, swing trails behind the
 * striking fist, foot or blade, rings under double jumps and dust kicked up
 * by running. Glowing parts are drawn additively, dust normally.
 */
export class ImpactFx {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly dust: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private readonly trails = new Map<object, Trail>();
  private flashes: Flash[] = [];
  private twirls: Twirl[] = [];
  private readonly behind: Phaser.GameObjects.Graphics;
  private wisps: Wisp[] = [];
  /** The K.O. smoke's streaks, under its puffs, and the puffs. */
  private readonly wispG: Phaser.GameObjects.Graphics;
  private readonly smokeG: Phaser.GameObjects.Graphics;
  /** The arena's walls and platforms (world pixels), which smoke particles do not pass. */
  solids: Phaser.Geom.Rectangle[] = [];
  /** The camera the smoke's glitch is sized for (default: the scene's main camera). */
  camera?: Phaser.Cameras.Scene2D.Camera;
  /** All of the K.O. smoke, glitched and scan-lined as one (fx/HitGlitch.ts). */
  private readonly smokeView: Phaser.GameObjects.Container;
  private lastKoAt = -Infinity;
  private now = 0;
  /** The laserSmoke behind the K.O. smoke's puffs: particles drawn by drawSmoke(), tinted with their rim colour. */
  private readonly laser: ParticleFx;
  private readonly laserDef?: EffectDef;
  /** Rim colour -> body colour of the laserSmoke puffs. */
  private readonly laserBody = new Map<number, number>();
  /** The laserSmoke puffs' flat layers (rims, bodies, highlights): pooled tinted discs, drawn in a few batches. */
  private readonly celLayers: { view: Phaser.GameObjects.Container; pool: Phaser.GameObjects.Image[] }[];

  constructor(scene: Phaser.Scene) {
    // Twirl motes passing behind a Kubot are drawn under it.
    this.behind = scene.add.graphics().setDepth(9.8).setBlendMode(Phaser.BlendModes.ADD);
    this.dust = scene.add.graphics().setDepth(14);
    this.glow = scene.add.graphics().setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
    // The K.O. smoke, glitched as one (made up front: the results scene sorts new objects onto its cameras once).
    this.wispG = scene.add.graphics();
    this.smokeG = scene.add.graphics();
    if (!scene.textures.exists('cel-disc')) {
      const g = scene.make.graphics({}, false);
      g.fillStyle(0xffffff, 1).fillCircle(32, 32, 32).generateTexture('cel-disc', 64, 64);
      g.destroy();
    }
    this.celLayers = [0, 1, 2].map(() => ({ view: scene.make.container({}, false), pool: [] }));
    this.smokeView = scene.add.container(0, 0, [this.wispG, ...this.celLayers.map((l) => l.view), this.smokeG]).setDepth(10.6);
    this.laser = new ParticleFx(scene, 'pe:', 0, undefined, true);
    this.laserDef = (scene.registry.get('effects') as Record<string, EffectDef> | undefined)?.laserSmoke;
  }

  /** A hit: `dir` is the push direction (-1 / 1), `power` about 1 for a punch. */
  hit(x: number, y: number, dir: number, color: number, power: number): void {
    const p = Phaser.Math.Clamp(power, 0.5, 2.2);
    this.add({ kind: 'flash', x, y, color: 0xffffff, size: 0.2 * UNIT * p, grow: -0.15 * UNIT * p, life: 80 });
    this.add({ kind: 'ring', x, y, color: mix(color, 0xffffff, 0.35), size: 0.12 * UNIT, grow: 0.8 * UNIT * p, life: 200 });
    const n = Math.round(7 + 5 * p);
    for (let i = 0; i < n; i++) {
      // Mostly along the push, some splashing back.
      const back = i % 4 === 3;
      const a = (back ? Math.PI : 0) + rand(-1.1, 1.1);
      const speed = rand(7, 20) * p * UNIT;
      this.add({
        kind: 'spark', x, y,
        vx: Math.cos(a) * speed * (dir || 1), vy: Math.sin(a) * speed - rand(2, 6) * UNIT,
        color: i % 3 === 0 ? 0xffffff : mix(color, 0xffffff, rand(0, 0.5)),
        size: rand(2, 3.5), life: rand(180, 380), gravity: 30 * UNIT, drag: 0.08,
      });
    }
    this.flashes.push({ x, y, color, intensity: 5 * p, at: this.now });
  }

  /** Two attacks meeting: white and gold sparks all round. */
  clash(x: number, y: number): void {
    this.add({ kind: 'flash', x, y, color: 0xffffff, size: 0.45 * UNIT, grow: -0.3 * UNIT, life: 110 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rand(-0.2, 0.2);
      const speed = rand(10, 22) * UNIT;
      this.add({
        kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        color: i % 2 ? 0xffe27a : 0xffffff, size: 2.5, life: rand(200, 320), gravity: 20 * UNIT, drag: 0.05,
      });
    }
    this.flashes.push({ x, y, color: 0xffe27a, intensity: 7, at: this.now });
  }

  /** Two resting plasma blades crossed: a few small sparks crackling where they touch, in both colours. */
  bladeSparks(x: number, y: number, a: number, b: number): void {
    this.add({ kind: 'flash', x, y, color: 0xffffff, size: 0.12 * UNIT, grow: -0.08 * UNIT, life: 60 });
    for (let i = 0; i < 4; i++) {
      const ang = rand(0, Math.PI * 2);
      const speed = rand(4, 11) * UNIT;
      this.add({
        kind: 'spark', x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - rand(1, 3) * UNIT,
        color: i === 0 ? 0xffffff : mix(i % 2 ? a : b, 0xffffff, 0.45), size: rand(2, 3.2), life: rand(130, 240), gravity: 24 * UNIT, drag: 0.08,
      });
    }
  }

  /** A plasma blade burning into a wall or floor: a white-hot spot, molten sparks spraying off it, a glow on the wall. */
  bladeBurn(x: number, y: number, color: number): void {
    this.add({ kind: 'flash', x, y, color: 0xffffff, size: 0.14 * UNIT, grow: -0.08 * UNIT, life: 60 });
    this.add({ kind: 'flash', x, y, color: mix(color, 0xffd27a, 0.5), size: 0.24 * UNIT, grow: -0.12 * UNIT, life: 80 });
    for (let i = 0; i < 4; i++) {
      const ang = rand(0, Math.PI * 2);
      const speed = rand(6, 15) * UNIT;
      this.add({
        kind: 'spark', x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - rand(2, 5) * UNIT,
        color: i % 2 ? 0xffd27a : mix(color, 0xffffff, 0.5), size: rand(2, 3.5), life: rand(160, 320), gravity: 30 * UNIT, drag: 0.06,
      });
    }
    this.flashes.push({ x, y, color: mix(color, 0xffd27a, 0.4), intensity: 1.2, at: this.now });
  }

  /** A laser bolt ending on something. */
  pop(x: number, y: number, color: number): void {
    this.add({ kind: 'ring', x, y, color, size: 0.1 * UNIT, grow: 0.6 * UNIT, life: 180 });
    for (let i = 0; i < 7; i++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(5, 13) * UNIT;
      this.add({
        kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        color: mix(color, 0xffffff, 0.4), size: 2, life: rand(150, 260), gravity: 18 * UNIT, drag: 0.05,
      });
    }
  }

  /** A double jump: a flat ring of light under the feet and a few sparks falling. */
  airJump(x: number, y: number, color: number): void {
    this.add({ kind: 'ring', x, y, color, size: 0.25 * UNIT, grow: 0.9 * UNIT, life: 260, flat: true });
    for (let i = 0; i < 6; i++) {
      this.add({
        kind: 'spark', x: x + rand(-0.3, 0.3) * UNIT, y,
        vx: rand(-4, 4) * UNIT, vy: rand(4, 9) * UNIT,
        color: mix(color, 0xffffff, 0.3), size: 2, life: rand(160, 260), gravity: 10 * UNIT, drag: 0.1,
      });
    }
  }

  /**
   * A K.O.: a big, magical explosion of smoke in the Kubot's team colour,
   * cel-shaded like a cartoon effect (deep rim, bright body, cream highlights),
   * with streaks whipping out of the core and glittering motes.
   */
  koSmoke(x: number, y: number, color: number): void {
    if (fx().particles <= 0) return;
    this.lastKoAt = this.now;
    const { deep, bright } = smokeColors(color);
    this.add({ kind: 'flash', x, y, color: 0xffffff, size: 1 * UNIT, grow: 0.8 * UNIT, life: 150 });
    this.add({ kind: 'ring', x, y, color: bright, size: 0.5 * UNIT, grow: 3.6 * UNIT, life: 340 });
    this.flashes.push({ x, y, color: bright, intensity: 10, at: this.now });
    const puffs: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      const core = i < 12; // the first ones stay in the middle, the biggest
      const a = rand(0, Math.PI * 2);
      const speed = (core ? rand(1, 5) : rand(8, 18)) * UNIT * (laserAlone() ? 1.3 : 1); // alone, they carry the laserSmoke a little further
      const puff = this.add({
        kind: 'smoke', collide: true,
        x: x + Math.cos(a) * rand(0, 0.4) * UNIT, y: y + Math.sin(a) * rand(0, 0.5) * UNIT,
        vx: Math.cos(a) * speed * 1.3, vy: Math.sin(a) * speed * 0.8 - rand(1, 4) * UNIT,
        life: core ? rand(1000, 1400) : rand(800, 1500), drag: 0.015, gravity: -2 * UNIT,
        size: (core ? rand(0.8, 1.1) : rand(0.4, 0.7)) * UNIT, grow: (core ? rand(1, 1.5) : rand(0.6, 1.1)) * UNIT,
        color: deep, body: bright,
      });
      if (puff && !core) puffs.push(puff);
    }
    this.laserSmoke(x, y, deep, bright, puffs);
    // Streaks whipping out sideways and up, like the trails of the blast.
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      this.wisps.push({
        x, y, angle: side > 0 ? rand(-0.9, 0.25) : Math.PI - rand(-0.9, 0.25),
        len: rand(2.5, 4.5) * UNIT, width: rand(0.12, 0.28) * UNIT, bend: rand(-0.5, 0.5) * UNIT,
        age: 0, life: rand(450, 750), color: deep,
      });
    }
    // Soft smoke round the cartoon puffs, lingering after them as it rises.
    const haze = mix(deep, bright, 0.4);
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(2, 9) * UNIT;
      this.add({
        kind: 'haze', collide: true, x: x + Math.cos(a) * rand(0, 0.8) * UNIT, y: y + Math.sin(a) * rand(0, 0.6) * UNIT,
        vx: Math.cos(a) * v * 1.3, vy: Math.sin(a) * v * 0.7 - rand(1, 3) * UNIT,
        color: haze, size: rand(0.5, 0.9) * UNIT, grow: rand(1.2, 2.2) * UNIT,
        life: rand(1400, 2200), drag: 0.08, gravity: -1.8 * UNIT,
      });
    }
    // Hit sparks flying out of the blast as far as the Kubot's pieces, stopped by walls.
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(12, 26) * UNIT;
      this.add({
        kind: 'spark', collide: true, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - rand(2, 6) * UNIT,
        color: i % 3 === 0 ? 0xffffff : mix(bright, 0xffffff, rand(0, 0.5)),
        size: rand(2, 3.5), life: rand(700, 1200), gravity: 14 * UNIT, drag: 0.35,
      });
    }
    // Glitter: motes and sparks in the bright colour and white.
    for (let i = 0; i < 18; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(4, 13) * UNIT;
      this.add({
        kind: i % 3 ? 'mote' : 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rand(1, 4) * UNIT,
        color: i % 2 ? 0xffffff : bright, size: rand(1.6, 3), life: rand(500, 1000), drag: 0.12, gravity: -1.5 * UNIT,
      });
    }
  }

  /**
   * The original laserSmoke (a burst of soft, spinning glow) in the team
   * colours: streaming behind the puffs flung out of the blast while they fly,
   * and blooming from the core. It stops at walls and platforms like them.
   */
  private laserSmoke(x: number, y: number, deep: number, bright: number, puffs: Particle[]): void {
    const def = this.laserDef;
    if (!def || laserSmoke.mode === 'off') return;
    const solids = this.solids;
    this.laserBody.set(deep, bright);
    // Tight streams of small puffs behind every flung puff while it flies.
    for (const p of puffs) {
      this.laser.play(def, p.x, p.y, {
        tint: deep, size: 0.75, speed: 0.7, life: 1.2, rate: 0.6, solids,
        follow: () => (p.age < p.life * 0.9 ? p : null),
      });
    }
    if (laserSmoke.mode === 'trails') return;
    // Many small puffs boiling out of the core, in a few bursts.
    for (let i = 0; i < 4; i++) {
      const a = rand(0, Math.PI * 2);
      this.laser.play(def, x + Math.cos(a) * rand(0, 0.6) * UNIT, y + Math.sin(a) * rand(0, 0.5) * UNIT,
        { tint: deep, size: 0.9, speed: 2.6, life: 1.5, rate: 0.8, solids });
    }
  }

  /** Dust kicked up behind a running Kubot (`dir`: away from the run). */
  runDust(x: number, y: number, dir: number): void {
    for (let i = 0; i < 2; i++) {
      this.add({
        kind: 'puff', x: x + dir * rand(0, 0.2) * UNIT, y: y - rand(0, 0.1) * UNIT,
        vx: dir * rand(1.5, 3.5) * UNIT, vy: -rand(0.6, 1.8) * UNIT,
        color: 0xb9c4d0, size: rand(0.08, 0.13) * UNIT, grow: rand(0.15, 0.25) * UNIT,
        life: rand(320, 480), gravity: 0, drag: 0.15,
      });
    }
  }

  /** Laser bolt wake: a fading beam line and flickering square data bits, no smoke. */
  /** @param dir the bolt's direction: -1 / 1 sideways, or with `dirY` a unit vector (a deflected bolt). */
  laserTrail(x: number, y: number, dir: number, color: number, size: number, dirY = 0): void {
    const hot = mix(color, 0xffffff, 0.55);
    this.add({ kind: 'beam', x, y, color: hot, size: 0.05 * UNIT * size, life: 110, len: dir * 0.9 * UNIT, lenY: dirY * 0.9 * UNIT });
    if (Math.random() < 0.7) {
      const back = rand(0, 0.5) * UNIT;
      this.add({
        kind: 'bit', x: x - dir * back, y: y - dirY * back + rand(-0.12, 0.12) * UNIT * size,
        vx: -dir * rand(0.5, 2) * UNIT, vy: -dirY * rand(0.5, 2) * UNIT + rand(-1.5, 1.5) * UNIT,
        color: Math.random() < 0.4 ? 0xffffff : hot, size: rand(1.5, 3) * Math.min(1.6, size), life: rand(140, 280), drag: 0.2,
      });
    }
  }

  /** A gun charging: sparks drawn in from all round into the barrel, more as it fills. */
  charge(x: number, y: number, color: number, c: number): void {
    const n = 1 + Math.floor(c * 3);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(0.55, 1.2) * UNIT * (1 + c * 0.4);
      const life = rand(140, 220);
      this.add({
        kind: 'spark', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
        vx: (-Math.cos(a) * r) / (life / 1000), vy: (-Math.sin(a) * r) / (life / 1000),
        color: Math.random() < 0.3 ? 0xffffff : mix(color, 0xffffff, rand(0.2, 0.6)), size: rand(1.8, 3), life,
      });
    }
    if (Math.random() < 0.5) this.add({ kind: 'flash', x, y, color: mix(color, 0xffffff, 0.5), size: (0.05 + 0.14 * c) * UNIT, grow: -0.03 * UNIT, life: 60 });
  }

  /** Tiny glowing motes rising off a power-up ball (call every frame). */
  motes(x: number, y: number, color: number, radius: number, dtMs: number): void {
    if (Math.random() > dtMs / 70) return;
    const a = rand(0, Math.PI * 2);
    this.add({
      kind: 'mote', x: x + Math.cos(a) * radius * 1.05, y: y + Math.sin(a) * radius * 1.05,
      vx: Math.cos(a) * rand(0.2, 0.7) * UNIT, vy: Math.sin(a) * rand(0.2, 0.7) * UNIT - rand(0.3, 0.8) * UNIT,
      color: Math.random() < 0.35 ? 0xffffff : mix(color, 0xffffff, 0.3), size: rand(1.2, 2.4), life: rand(600, 1100), drag: 0.6,
    });
  }

  /** A power-up taken: the orb's motes spiral up round the Kubot for `ms`. */
  twirl(owner: { x: number; y: number }, color: number, ms: number): void {
    this.twirls.push({ owner, key: 'pickup', color, start: this.now, end: this.now + ms, lasting: false });
  }

  /** Keeps motes circling the Kubot while an effect lasts (call every frame; fades out once not called). */
  aura(owner: { x: number; y: number }, key: string, color: number): void {
    const t = this.twirls.find((w) => w.owner === owner && w.key === key && w.lasting);
    if (t) { t.end = this.now + TWIRL_FADE; t.color = color; return; }
    this.twirls.push({ owner, key, color, start: this.now, end: this.now + TWIRL_FADE, lasting: true });
  }

  /** Stops a Kubot's twirls at once (when it is knocked out). */
  clearTwirls(owner: object): void { this.twirls = this.twirls.filter((w) => w.owner !== owner); }

  /** Follows a swing: call every frame with its arc (striking point and inner point), or null when not swinging. */
  /** @param blade a plasma blade: the smear covers the whole blade, and follows its arc between frames. */
  swing(owner: object, at: { ox: number; oy: number; ix: number; iy: number } | null, color: number, blade = false): void {
    let trail = this.trails.get(owner);
    if (!trail) this.trails.set(owner, trail = { points: [], color, blade });
    trail.color = color;
    trail.blade = blade;
    if (at) {
      const last = trail.points[trail.points.length - 1];
      // A new swing starting far from the last one starts a new smear.
      if (last && Math.hypot(at.ox - last.ox, at.oy - last.oy) > UNIT * 2.5) trail.points = [];
      // A blade turns a long way in a frame: the samples in between follow its arc round the hilt.
      const prev = trail.points[trail.points.length - 1];
      if (blade && prev) {
        const a0 = Math.atan2(prev.oy - prev.iy, prev.ox - prev.ix);
        let d = Math.atan2(at.oy - at.iy, at.ox - at.ix) - a0;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        const l0 = Math.hypot(prev.ox - prev.ix, prev.oy - prev.iy);
        const l1 = Math.hypot(at.ox - at.ix, at.oy - at.iy);
        const steps = Math.min(6, Math.ceil(Math.abs(d) / 0.25));
        for (let n = 1; n < steps; n++) {
          const f = n / steps;
          const ix = prev.ix + (at.ix - prev.ix) * f;
          const iy = prev.iy + (at.iy - prev.iy) * f;
          const ang = a0 + d * f;
          const len = l0 + (l1 - l0) * f;
          trail.points.push({ ix, iy, ox: ix + Math.cos(ang) * len, oy: iy + Math.sin(ang) * len, t: prev.t + (this.now - prev.t) * f });
        }
      }
      trail.points.push({ ...at, t: this.now });
    }
  }

  /** Brief lights where hits landed, for the 3D world. */
  lights(): { x: number; y: number; color: number; intensity: number }[] {
    return this.flashes.map((f) => ({ x: f.x, y: f.y, color: f.color, intensity: f.intensity * (1 - (this.now - f.at) / FLASH_MS) }));
  }

  update(now: number, dtMs: number): void {
    this.now = now;
    const dt = dtMs / 1000;
    this.flashes = this.flashes.filter((f) => now - f.at < FLASH_MS);
    this.twirls = this.twirls.filter((w) => now < w.end);
    this.particles = this.particles.filter((p) => (p.age += dtMs) < p.life);
    for (const p of this.particles) {
      const keep = Math.pow(p.drag, dt);
      p.vx *= keep;
      p.vy = p.vy * keep + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.collide) this.collide(p);
    }
    this.laser.update(dtMs);
    this.updateWisps(dtMs);
    this.draw();
  }

  /** Pushes a particle out of any wall or platform it went into, killing its speed into it. */
  private collide(p: Particle): void {
    for (const r of this.solids) {
      if (p.x <= r.left || p.x >= r.right || p.y <= r.top || p.y >= r.bottom) continue;
      // Out the nearest side.
      const outs = [p.x - r.left, r.right - p.x, p.y - r.top, r.bottom - p.y];
      const side = outs.indexOf(Math.min(...outs));
      if (side === 0) { p.x = r.left; p.vx = Math.min(0, p.vx) * 0.2; }
      else if (side === 1) { p.x = r.right; p.vx = Math.max(0, p.vx) * 0.2; }
      else if (side === 2) { p.y = r.top; p.vy = Math.min(0, p.vy) * 0.2; }
      else { p.y = r.bottom; p.vy = Math.max(0, p.vy) * 0.2; }
    }
  }

  /** The K.O. smoke's streaks, and its glitch. */
  private updateWisps(dtMs: number): void {
    this.wisps = this.wisps.filter((w) => (w.age += dtMs) < w.life);
    const g = this.wispG.clear();
    for (const w of this.wisps) {
      // The tip races out and the tail follows it, thinning to nothing.
      const f = w.age / w.life;
      const tip = w.len * (1 - (1 - f) * (1 - f) * (1 - f));
      const tail = w.len * f * f;
      const ca = Math.cos(w.angle); const sa = Math.sin(w.angle);
      const at = (d: number, side: number, width: number) => {
        const k = (d / w.len) * (d / w.len) * w.bend; // curls more towards the tip
        return { x: w.x + ca * d - sa * (k + side * width), y: w.y + sa * d + ca * (k + side * width) };
      };
      const left: { x: number; y: number }[] = [];
      const right: { x: number; y: number }[] = [];
      for (let i = 0; i <= 6; i++) {
        const d = tail + ((tip - tail) * i) / 6;
        const width = w.width * (1 - f) * (1 - i / 6);
        left.push(at(d, -1, width));
        right.push(at(d, 1, width));
      }
      if (!laserAlone()) g.fillStyle(w.color, 1).fillPoints([...left, ...right.reverse()], true);
    }
    // A broken signal over it all: it tears very hard at the blast (past the hits'
    // 1), and keeps tearing, splitting and scan-lining hard while it lasts.
    const since = this.now - this.lastKoAt;
    const live = this.wisps.length > 0 || this.laser.live || this.particles.some((p) => p.kind === 'smoke' || p.kind === 'haze');
    hitGlitch(this.smokeView, live && !laserAlone() ? Math.max(0.95, 1.35 - since / 900) : 0, this.camera, null, 3, 0.55, 0.86); // a touch see-through
  }

  private draw(): void {
    const g = this.glow.clear();
    const d = this.dust.clear();
    this.behind.clear();
    for (const w of this.twirls) this.drawTwirl(w, g);
    for (const p of this.particles) {
      const f = p.age / p.life;
      const fade = 1 - f;
      switch (p.kind) {
        case 'spark': {
          // A streak as long as the distance covered in ~30 ms, thinning as it dies.
          const len = Math.max(3, Math.hypot(p.vx, p.vy) * 0.03);
          const s = Math.hypot(p.vx, p.vy) || 1;
          const tx = p.x - (p.vx / s) * len;
          const ty = p.y - (p.vy / s) * len;
          g.lineStyle(p.size * (0.4 + 0.6 * fade) * 2.4, p.color, 0.25 * fade).lineBetween(tx, ty, p.x, p.y);
          g.lineStyle(p.size * (0.4 + 0.6 * fade), p.color, fade).lineBetween(tx, ty, p.x, p.y);
          break;
        }
        case 'ring': {
          const r = p.size + p.grow * Math.sqrt(f);
          g.lineStyle(3 * fade + 1, p.color, 0.8 * fade);
          if (p.flat) g.strokeEllipse(p.x, p.y, r * 2, r * 0.5);
          else g.strokeCircle(p.x, p.y, r);
          break;
        }
        case 'flash':
          g.fillStyle(p.color, fade).fillCircle(p.x, p.y, Math.max(1, p.size + p.grow * f));
          g.fillStyle(p.color, 0.18 * fade).fillCircle(p.x, p.y, Math.max(1, (p.size + p.grow * f) * 1.7));
          break;
        case 'beam': {
          const len = (p.len ?? 0) * (0.4 + 0.6 * fade);
          const lenY = (p.lenY ?? 0) * (0.4 + 0.6 * fade);
          g.lineStyle(p.size * 3 * fade, p.color, 0.18 * fade).lineBetween(p.x - len, p.y - lenY, p.x, p.y);
          g.lineStyle(p.size * fade, p.color, 0.8 * fade).lineBetween(p.x - len, p.y - lenY, p.x, p.y);
          break;
        }
        case 'bit': {
          // Square pixels that flicker out.
          if (Math.random() < 0.25 * f) break;
          const sz = p.size * (0.5 + 0.5 * fade);
          g.fillStyle(p.color, fade).fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
          break;
        }
        case 'mote': {
          const tw = 0.6 + 0.4 * Math.sin((p.age / 90) + p.x);
          const a = Math.sin(Math.PI * f) * tw;
          g.fillStyle(p.color, 0.25 * a).fillCircle(p.x, p.y, p.size * 2.6);
          g.fillStyle(p.color, a).fillCircle(p.x, p.y, p.size);
          break;
        }
        case 'puff':
          d.fillStyle(p.color, 0.35 * fade).fillCircle(p.x, p.y, p.size + p.grow * f);
          break;
        case 'smoke':
        case 'haze':
          break; // drawSmoke(), in layers
      }
    }
    this.drawSmoke();
    for (const [owner, trail] of this.trails) {
      trail.points = trail.points.filter((q) => this.now - q.t < TRAIL_MS);
      if (trail.points.length === 0) { this.trails.delete(owner); continue; }
      // A swoosh: a crescent filled between the inner and outer paths, brightest at
      // its leading edge, with a white-hot rim along the striking point's path.
      const pts = trail.points;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        let k = Math.max(0, 1 - (this.now - b.t) / TRAIL_MS); // 1 at the head
        let tail = i / pts.length;
        // A plasma blade's streak stays bright along its sweep, fading late.
        if (trail.blade) { k = Math.sqrt(k); tail = Math.sqrt(tail); }
        // The inner edge sits part-way out, so the smear thins towards the body.
        // (A plasma blade smears along its whole length, in its own light.)
        const inner = trail.blade ? 0.08 : 0.35;
        const inA = { x: a.ix + (a.ox - a.ix) * inner, y: a.iy + (a.oy - a.iy) * inner };
        const inB = { x: b.ix + (b.ox - b.ix) * inner, y: b.iy + (b.oy - b.iy) * inner };
        g.fillStyle(trail.color, (trail.blade ? 0.85 : 0.32) * k * tail);
        g.fillPoints([{ x: a.ox, y: a.oy }, { x: b.ox, y: b.oy }, inB, inA], true);
        g.fillStyle(trail.blade ? mix(trail.color, 0xffffff, 0.6) : 0xffffff, (trail.blade ? 0.55 : 0.12) * k * tail);
        // A blade's hot core runs its whole length, not just near the tip.
        const core = trail.blade ? 0.7 : 0.5;
        const midA = { x: a.ox + (inA.x - a.ox) * core, y: a.oy + (inA.y - a.oy) * core };
        const midB = { x: b.ox + (inB.x - b.ox) * core, y: b.oy + (inB.y - b.oy) * core };
        g.fillPoints([{ x: a.ox, y: a.oy }, { x: b.ox, y: b.oy }, midB, midA], true);
        // The white-hot rim along the striking point's path (faint on a blade, whose whole length streaks).
        g.lineStyle((trail.blade ? 0.04 : 0.1) * UNIT * k, 0xffffff, (trail.blade ? 0.45 : 0.85) * k).lineBetween(a.ox, a.oy, b.ox, b.oy);
      }
    }
  }

  /**
   * The K.O. smoke, cel-shaded in flat layers over all its particles at once:
   * every deep rim, then every bright body (up and to the left in its rim, so
   * the bodies run together inside one outline), then cream highlights. Each
   * swells, turns to rim as its body shrinks away, and collapses.
   */
  private drawSmoke(): void {
    const g = this.smokeG.clear();
    // Soft haze behind the puffs, billowing out round them and lingering.
    for (const p of this.particles) {
      if (p.kind !== 'haze' || laserAlone()) continue;
      const f = p.age / p.life;
      g.fillStyle(p.color, 0.28 * Math.min(1, f / 0.1) * (1 - f)).fillCircle(p.x, p.y, p.size + p.grow * f);
    }
    // The laserSmoke behind the puffs, in the same flat layers but small and many:
    // each swells and shrinks with the file's opacity curve.
    const [rims, bodies, lights] = this.celLayers;
    const used = [0, 0, 0];
    const disc = (layer: number, x: number, y: number, w: number, h: number, color: number) => {
      const l = this.celLayers[layer];
      let img = l.pool[used[layer]];
      if (!img) { img = this.smokeG.scene.make.image({ key: 'cel-disc' }, false); l.pool.push(img); l.view.add(img); }
      used[layer]++;
      img.setVisible(true).setPosition(x, y).setDisplaySize(w, h).setTint(color);
    };
    this.laser.each((x, y, size, alpha, tint) => {
      if (alpha <= 0.05) return;
      const r = (size / 2) * alpha;
      disc(0, x, y, r * 2, r * 2, tint);
      disc(1, x - r * 0.16, y - r * 0.2, r * 1.4, r * 1.4, this.laserBody.get(tint) ?? tint);
      if (r > 0.12 * UNIT) disc(2, x - r * 0.34, y - r * 0.4, r * 0.45, r * 0.27, 0xfffbe6);
    });
    for (const [i, l] of [rims, bodies, lights].entries()) for (let k = used[i]; k < l.pool.length && l.pool[k].visible; k++) l.pool[k].setVisible(false);
    const smoke = laserAlone() ? [] : this.particles.filter((p) => p.kind === 'smoke');
    const smooth = (a: number, b: number, f: number) => { const t = Phaser.Math.Clamp((f - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const radius = (p: Particle) => { const f = p.age / p.life; return (p.size + p.grow * (1 - (1 - f) * (1 - f))) * (1 - smooth(0.6, 1, f)); };
    for (const p of smoke) g.fillStyle(p.color, 1).fillCircle(p.x, p.y, radius(p));
    for (const p of smoke) {
      const r = radius(p);
      const k = 1 - 0.85 * smooth(0.35, 0.8, p.age / p.life);
      g.fillStyle(p.body ?? p.color, 1).fillCircle(p.x - r * 0.16, p.y - r * 0.2, r * 0.74 * k);
    }
    for (const p of smoke) {
      const r = radius(p) * (1 - smooth(0.25, 0.55, p.age / p.life));
      if (r > 0.3 * UNIT) g.fillStyle(0xfffbe6, 1).fillEllipse(p.x - r * 0.34, p.y - r * 0.4, r * 0.5, r * 0.3);
    }
  }

  /**
   * Two strands of motes on a helix round the Kubot, seen in perspective (a
   * flat ellipse): bright and larger in front, dim and under the Kubot behind,
   * each with a short tail along its path. A pick-up rises from the feet to
   * the head; a lasting one keeps climbing round the body.
   */
  private drawTwirl(w: Twirl, front: Phaser.GameObjects.Graphics): void {
    const t = this.now - w.start;
    const fade = Math.min(1, t / 150, (w.end - this.now) / (w.lasting ? TWIRL_FADE : 350));
    const n = w.lasting ? 10 : 14;
    const spin = (Math.PI * 2 * (w.lasting ? 1.1 : 1.7) * t) / 1000;
    const dur = w.end - w.start;
    const { x: cx, y: cy } = w.owner;
    const bottom = cy + KUBOT_H / 2;
    const light = mix(w.color, 0xffffff, 0.35);
    for (let j = 0; j < n; j++) {
      // Height up the body (0 feet, 1 head).
      const hf = w.lasting
        ? (j / n + t / 2200) % 1
        : Phaser.Math.Clamp((t / dur) * 1.5 - (j / n) * 0.5, 0, 1);
      // Fades at the very bottom and top of a lasting helix so motes wrap smoothly.
      const edge = w.lasting ? Math.min(1, hf * 6, (1 - hf) * 6) : 1;
      const r = UNIT * (w.lasting ? 0.8 : 0.95 - 0.35 * hf);
      const base = spin + (j % 2) * Math.PI + j * 0.45;
      const color = j % 3 === 0 ? mix(w.color, 0xffffff, 0.75) : light;
      for (let k = 4; k >= 0; k--) {
        const a = base - k * 0.16;
        const depth = Math.sin(a); // > 0: in front of the Kubot
        const x = cx + Math.cos(a) * r;
        const y = bottom - hf * KUBOT_H + depth * r * 0.28;
        const tail = 1 - k / 5;
        const alpha = fade * edge * tail * (depth > 0 ? 1 : 0.4);
        const size = (k === 0 ? 2.1 : 1.5) * (depth > 0 ? 1.15 : 0.8) * tail;
        const gr = depth > 0 ? front : this.behind;
        if (k === 0) gr.fillStyle(w.color, 0.25 * alpha).fillCircle(x, y, size * 3);
        gr.fillStyle(color, alpha).fillCircle(x, y, Math.max(0.6, size));
      }
    }
    // Now and then a mote breaks off and drifts away.
    if (Math.random() < 0.25 * fade) {
      const a = spin + Math.random() * Math.PI * 2;
      this.add({
        kind: 'mote', x: cx + Math.cos(a) * UNIT * 0.8, y: bottom - Math.random() * KUBOT_H,
        vx: Math.cos(a) * rand(0.3, 0.8) * UNIT, vy: -rand(0.3, 0.9) * UNIT,
        color: light, size: rand(1, 2), life: rand(400, 800), drag: 0.6,
      });
    }
  }

  private add(p: Partial<Particle> & Pick<Particle, 'kind' | 'x' | 'y' | 'color' | 'size' | 'life'>): Particle | undefined {
    // Particle quality: the many small bits thin out with it; single flashes, rings and beams stay until it is off.
    // The K.O. smoke stays whole while there are particles at all.
    if (KO_SMOKE.has(p.kind) || SINGLE.has(p.kind) ? fx().particles <= 0 : !particleChance()) return undefined;
    const particle = { vx: 0, vy: 0, age: 0, grow: 0, gravity: 0, drag: 1, ...p };
    this.particles.push(particle);
    return particle;
  }

  /** Drops every running effect (a replay starting over or skipping to the next). */
  clear(): void {
    this.particles = [];
    this.trails.clear();
    this.flashes = [];
    this.twirls = [];
    this.wisps = [];
    this.lastKoAt = -Infinity;
    this.laser.clear();
  }

  destroy(): void {
    this.smokeView.destroy();
    this.glow.destroy();
    this.dust.destroy();
    this.behind.destroy();
  }
}

/** A plasma blade from hilt to tip (additive): a wide soft halo, the coloured blade, then the white core; `alpha` dims it all. */
export function drawBlade(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, c: number, flicker: number, alpha = 1): void {
  const hot = Phaser.Display.Color.IntegerToColor(c).lighten(35).color;
  const strokes: [number, number, number][] = [[48, c, 0.09], [28, c, 0.2], [14, hot, 0.6 * flicker], [6, 0xffffff, 0.95], [3, 0xffffff, 1]];
  for (const [w, col, a] of strokes) {
    g.lineStyle(w, col, a * alpha).lineBetween(x1, y1, x2, y2);
    g.fillStyle(col, a * alpha).fillCircle(x2, y2, w / 2);
  }
}

/**
 * The K.O. smoke's colours from the team colour, kept saturated: a deep rim
 * and a bright body shifted in hue (blue gives royal blue and teal, red gives
 * crimson and orange), like painted cartoon smoke.
 */
function smokeColors(color: number): { deep: number; bright: number } {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const { h, s } = Phaser.Display.Color.RGBToHSV(c.red, c.green, c.blue) as Phaser.Types.Display.HSVColorObject;
  // A colourless team (the black team) smokes black and dark grey, not in its faint hue made vivid.
  if (s < 0.3) return { deep: 0x101114, bright: 0x3a3e46 };
  // Warm colours brighten towards yellow, cool ones towards cyan; the rim turns the other way.
  const target = h < 0.3 || h > 0.85 ? 0.13 : 0.46;
  let d = target - h;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  const hue = (x: number) => (x + 1) % 1;
  return {
    deep: Phaser.Display.Color.HSVToRGB(hue(h - Math.sign(d) * 0.05), 0.85, 0.82).color,
    bright: Phaser.Display.Color.HSVToRGB(hue(h + d * 0.6), 0.68, 1).color,
  };
}
