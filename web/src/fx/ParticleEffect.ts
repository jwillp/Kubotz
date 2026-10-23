import Phaser from 'phaser';
import { UNIT } from '../config';
import { vfx, vfxCount } from '../game/Settings';

/**
 * A small runtime for LibGDX ParticleEditor files (`public/particles/*.pe`),
 * as used by the full-on-scripting branch (landing dust, hit stars, laser smoke,
 * death dust). It follows com.badlogic.gdx.graphics.g2d.ParticleEmitter:
 * values are in world units (1 unit = 1 tile), times in ms, angles in degrees,
 * y pointing up. Attached and continuous emitters are not supported (no file
 * uses them).
 */

type Section = Record<string, string>;

/**
 * A value of an emitter as src/data/particles/*.json stores it: a random
 * start (`low`, between its two numbers), a random end (`high`) and a curve
 * of [time 0..1, share 0..1] points from one to the other over a particle's
 * life (or the emitter's duration). Left out = off (for the optional ones).
 */
export interface ValueData { low: [number, number]; high?: [number, number]; relative?: boolean; curve?: [number, number][] }

/** One emitter of an effect, as stored (see ValueData). Distances in units, times in ms, angles in degrees. */
export interface EmitterData {
  name: string;
  /** particles/<image> */
  image: string;
  additive?: boolean;
  /** The particle turns to face where it goes. */
  aligned?: boolean;
  delay?: ValueData;
  duration: ValueData;
  /** Particles alive at once: at least, at most. */
  count: [number, number];
  emission: ValueData;
  life: ValueData;
  lifeOffset?: ValueData;
  xOffset?: ValueData;
  yOffset?: ValueData;
  shape: 'point' | 'square' | 'line' | 'ellipse';
  edges?: boolean;
  spawnWidth: ValueData;
  spawnHeight: ValueData;
  scale: ValueData;
  velocity?: ValueData;
  angle?: ValueData;
  rotation?: ValueData;
  wind?: ValueData;
  gravity?: ValueData;
  /** Colour over life: [time 0..1, r, g, b (0..1)]. */
  colors: [number, number, number, number][];
  transparency: ValueData;
}

export interface EffectData { emitters: EmitterData[] }

/** RangedNumericValue + ScaledNumericValue. */
class Value {
  readonly active: boolean;
  private readonly lowMin: number;
  private readonly lowMax: number;
  private readonly highMin: number;
  private readonly highMax: number;
  readonly relative: boolean;
  private readonly scaling: number[] = [];
  private readonly timeline: number[] = [];

  constructor(d: ValueData | undefined, alwaysActive = false) {
    this.active = alwaysActive || d !== undefined;
    [this.lowMin, this.lowMax] = d?.low ?? [0, 0];
    [this.highMin, this.highMax] = d?.high ?? [0, 0];
    this.relative = !!d?.relative;
    for (const [t, v] of d?.curve ?? []) { this.timeline.push(t); this.scaling.push(v); }
  }

  newLow(): number { return Phaser.Math.FloatBetween(this.lowMin, this.lowMax); }
  newHigh(): number { return Phaser.Math.FloatBetween(this.highMin, this.highMax); }

  /** The scaling curve at percent (0..1), linearly interpolated over the timeline. */
  scale(percent: number): number {
    const t = this.timeline;
    if (t.length === 0) return 1;
    let end = t.findIndex((x) => x > percent);
    if (end === -1) return this.scaling[t.length - 1];
    if (end === 0) return this.scaling[0];
    const start = end - 1;
    const f = (percent - t[start]) / (t[end] - t[start]);
    return this.scaling[start] + (this.scaling[end] - this.scaling[start]) * f;
  }

  /** A particle's (low, diff) pair, so that value(p) = low + diff * scale(p). */
  pair(): [number, number] {
    const low = this.newLow();
    const high = this.newHigh();
    return [low, this.relative ? high : high - low];
  }
}

interface EmitterDef {
  name: string;
  delay: Value; duration: Value; countMin: number; countMax: number;
  emission: Value; life: Value; lifeOffset: Value; xOffset: Value; yOffset: Value;
  shape: string; edges: boolean; spawnWidth: Value; spawnHeight: Value;
  scale: Value; velocity: Value; angle: Value; rotation: Value; wind: Value; gravity: Value;
  colors: number[][]; colorTimeline: number[]; transparency: Value;
  aligned: boolean; additive: boolean; image: string;
}

export interface EffectDef { emitters: EmitterDef[]; }

/** Reads a LibGDX .pe text file (the originals in public/particles) as effect data. */
export function effectData(text: string): EffectData {
  const blocks: { name: string; sections: Record<string, Section>; image: string }[] = [];
  let cur: (typeof blocks)[number] | null = null;
  let section = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const header = /^- (.+?) -$/.exec(line);
    if (header) { section = header[1]; cur!.sections[section] = {}; continue; }
    if (!cur || (section === 'Image Path' && cur.image)) {
      cur = { name: line, sections: {}, image: '' };
      blocks.push(cur);
      section = '';
      continue;
    }
    if (section === 'Image Path') { cur.image = line.split(/[\\/]/).pop()!; continue; }
    const i = line.indexOf(':');
    if (i > 0) cur.sections[section][line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const value = (sec: Section | undefined, always = false): ValueData | undefined => {
    if (!sec || (!always && sec.active === 'false')) return undefined;
    const n = (k: string) => parseFloat(sec[k] ?? '0');
    const v: ValueData = { low: [n('lowMin'), n('lowMax')] };
    if ('highMin' in sec) v.high = [n('highMin'), n('highMax')];
    if (sec.relative === 'true') v.relative = true;
    const count = n('timelineCount');
    if (count) v.curve = Array.from({ length: count }, (_, i) => [n(`timeline${i}`), n(`scaling${i}`)]);
    return v;
  };
  const strip = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== false)) as T;
  return {
    emitters: blocks.map(({ name, sections: s, image }) => {
      const tint = s.Tint ?? {};
      const colors: [number, number, number, number][] = [];
      for (let i = 0; i < parseInt(tint.timelineCount ?? '0', 10); i++) {
        colors.push([parseFloat(tint[`timeline${i}`]), ...[0, 1, 2].map((c) => parseFloat(tint[`colors${i * 3 + c}`] ?? '1'))] as [number, number, number, number]);
      }
      const opt = s.Options ?? {};
      return strip({
        name, image,
        additive: opt.additive === 'true', aligned: opt.aligned === 'true',
        delay: value(s.Delay), duration: value(s.Duration, true)!,
        count: [parseInt(s.Count?.min ?? '0', 10), parseInt(s.Count?.max ?? '100', 10)] as [number, number],
        emission: value(s.Emission, true)!, life: value(s.Life, true)!,
        lifeOffset: value(s['Life Offset']), xOffset: value(s['X Offset']), yOffset: value(s['Y Offset']),
        shape: (s['Spawn Shape']?.shape ?? 'point') as EmitterData['shape'], edges: s['Spawn Shape']?.edges === 'true',
        spawnWidth: value(s['Spawn Width'], true)!, spawnHeight: value(s['Spawn Height'], true)!,
        scale: value(s.Scale, true)!, velocity: value(s.Velocity), angle: value(s.Angle),
        rotation: value(s.Rotation), wind: value(s.Wind), gravity: value(s.Gravity),
        colors: colors.length ? colors : [[0, 1, 1, 1]],
        transparency: value(s.Transparency, true)!,
      });
    }),
  };
}

/** An effect ready to play, from its data. */
export function effectFromData(data: EffectData): EffectDef {
  return {
    emitters: data.emitters.map((d) => ({
      name: d.name, image: d.image,
      delay: new Value(d.delay), duration: new Value(d.duration, true),
      countMin: d.count[0], countMax: d.count[1],
      emission: new Value(d.emission, true), life: new Value(d.life, true),
      lifeOffset: new Value(d.lifeOffset), xOffset: new Value(d.xOffset), yOffset: new Value(d.yOffset),
      shape: d.shape, edges: !!d.edges,
      spawnWidth: new Value(d.spawnWidth, true), spawnHeight: new Value(d.spawnHeight, true),
      scale: new Value(d.scale, true), velocity: new Value(d.velocity), angle: new Value(d.angle),
      rotation: new Value(d.rotation), wind: new Value(d.wind), gravity: new Value(d.gravity),
      colors: d.colors.map(([, r, g, b]) => [r, g, b]), colorTimeline: d.colors.map(([t]) => t),
      transparency: new Value(d.transparency, true),
      aligned: !!d.aligned, additive: !!d.additive,
    })),
  };
}

/** Parses a .pe text file into a playable effect. */
export function parseEffect(text: string): EffectDef { return effectFromData(effectData(text)); }

/** How a play() differs from the file: sizes, speeds and lives scaled, an emitter riding along, collisions. */
export interface PlayOptions {
  /** Replaces the effect's own colours (e.g. a laser in the shooter's colour). */
  tint?: number;
  size?: number;
  speed?: number;
  life?: number;
  /** Emission rate multiplier. */
  rate?: number;
  /** The emitter rides along this point (world pixels); emission stops when it returns null. */
  follow?: () => { x: number; y: number } | null;
  /** Walls and platforms (world pixels) the particles do not pass. */
  solids?: Phaser.Geom.Rectangle[];
  /** Mirrored left-right (made facing right, played by a Kubot facing left). */
  flip?: boolean;
  /** The whole effect bigger or smaller: particle size, speeds and birth area (a map emitter's Size). */
  scale?: number;
  /** Draw depth of its particles, instead of the ParticleFx's own (a map emitter's layer). */
  depth?: number;
}

interface Particle {
  img: Phaser.GameObjects.Image;
  life: number; age: number;
  /** Position in world units (y up). */
  wx: number; wy: number;
  scale: [number, number]; velocity: [number, number]; angle: [number, number];
  rotation: [number, number]; wind: [number, number]; gravity: [number, number]; alpha: [number, number];
}

/** One running emitter of an effect instance. */
class RunningEmitter {
  private time = 0;
  private emissionDelta = 0;
  private emissionLow: number;
  private emissionDiff: number;
  private lifeLow: number;
  private lifeDiff: number;
  private readonly duration: number;
  private readonly delay: number;
  /** The file's particle counts and emission, scaled by the VFX setting. */
  private readonly countMin: number;
  private readonly countMax: number;
  private readonly amount = vfx();
  readonly particles: Particle[] = [];

  private stopped = false;
  private readonly tint?: number;
  private readonly flip: boolean;
  private readonly scale: number;

  constructor(private def: EmitterDef, private fx: ParticleFx, private x: number, private y: number, private opts: PlayOptions = {}) {
    this.tint = opts.tint;
    this.flip = !!opts.flip;
    this.scale = opts.scale ?? 1;
    [this.emissionLow, this.emissionDiff] = def.emission.pair();
    [this.lifeLow, this.lifeDiff] = def.life.pair();
    this.emissionLow *= opts.rate ?? 1; this.emissionDiff *= opts.rate ?? 1;
    this.lifeLow *= opts.life ?? 1; this.lifeDiff *= opts.life ?? 1;
    this.duration = def.duration.newLow();
    this.delay = def.delay.active ? def.delay.newLow() : 0;
    this.countMin = vfxCount(def.countMin);
    this.countMax = Math.ceil(def.countMax * this.amount);
    if (this.delay === 0) this.add(this.countMin);
  }

  get done(): boolean { return (this.stopped || this.time >= this.delay + this.duration) && this.particles.length === 0; }

  /** Where new particles start (units, y up); those already out stay where they are. */
  moveTo(x: number, y: number): void { this.x = x; this.y = y; }

  /** Stops emitting; the particles out live their lives. */
  stop(): void { this.time = Math.max(this.time, this.delay + this.duration); }

  update(dtMs: number): void {
    this.time += dtMs;
    if (this.opts.follow && !this.stopped) {
      const at = this.opts.follow();
      if (at) { this.x = at.x / UNIT; this.y = -at.y / UNIT; } else this.stopped = true;
    }
    const t = this.time - this.delay;
    if (!this.stopped && t >= 0 && t < this.duration) {
      const percent = t / this.duration;
      if (this.particles.length < this.countMin) this.add(this.countMin - this.particles.length);
      const perSecond = (this.emissionLow + this.emissionDiff * this.def.emission.scale(percent)) * this.amount;
      if (perSecond > 0) {
        const every = 1000 / perSecond;
        this.emissionDelta += dtMs;
        if (this.emissionDelta >= every) {
          const n = Math.min(Math.floor(this.emissionDelta / every), this.countMax - this.particles.length);
          this.emissionDelta %= every;
          this.add(n, percent);
        }
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dtMs;
      if (p.age >= p.life) { this.fx.release(p.img); this.particles.splice(i, 1); continue; }
      this.step(p, dtMs / 1000);
    }
  }

  private add(n: number, percent = 0): void {
    const d = this.def;
    for (let i = 0; i < n; i++) {
      const img = this.fx.acquire(d.image, d.additive);
      if (this.opts.depth !== undefined) img.setDepth(this.opts.depth);
      const life = this.lifeLow + this.lifeDiff * d.life.scale(percent);
      const p: Particle = {
        img, life, age: d.lifeOffset.active ? d.lifeOffset.newLow() : 0, wx: 0, wy: 0,
        scale: d.scale.pair(), velocity: d.velocity.pair(), angle: d.angle.pair(),
        rotation: d.rotation.pair(), wind: d.wind.pair(), gravity: d.gravity.pair(), alpha: d.transparency.pair(),
      };
      let x = this.x + (d.xOffset.active ? d.xOffset.newLow() : 0) * (this.flip ? -1 : 1) * this.scale;
      let y = this.y + (d.yOffset.active ? d.yOffset.newLow() : 0) * this.scale;
      const [wl, wd] = d.spawnWidth.pair();
      const [hl, hd] = d.spawnHeight.pair();
      const w = (wl + wd * d.spawnWidth.scale(percent)) * this.scale;
      const h = (hl + hd * d.spawnHeight.scale(percent)) * this.scale;
      if (d.shape === 'square' || d.shape === 'line') {
        x += Math.random() * w - w / 2;
        y += d.shape === 'line' ? 0 : Math.random() * h - h / 2;
      } else if (d.shape === 'ellipse' && w > 0 && h > 0) {
        const a = Math.random() * Math.PI * 2;
        const r = d.edges ? 1 : Math.sqrt(Math.random());
        x += Math.cos(a) * (w / 2) * r;
        y += Math.sin(a) * (h / 2) * r;
      }
      p.wx = x; p.wy = y;
      this.particles.push(p);
      this.step(p, 0);
    }
  }

  private step(p: Particle, dt: number): void {
    const d = this.def;
    const pc = Math.min(1, p.age / p.life);
    const at = (v: Value, pair: [number, number]) => pair[0] + pair[1] * v.scale(pc);
    let x = p.wx;
    let y = p.wy;
    let angle = d.angle.active ? at(d.angle, p.angle) : 0;
    if (this.flip) angle = 180 - angle;
    if (d.velocity.active) {
      const v = at(d.velocity, p.velocity) * dt * this.scale;
      const speed = this.opts.speed ?? 1;
      x += v * speed * Math.cos(Phaser.Math.DegToRad(angle));
      y += v * speed * Math.sin(Phaser.Math.DegToRad(angle));
    }
    if (d.wind.active) x += at(d.wind, p.wind) * dt * (this.flip ? -1 : 1) * this.scale;
    if (d.gravity.active) y += at(d.gravity, p.gravity) * dt * this.scale;
    // Out of any wall or platform by the nearest side (so it slides along it).
    for (const r of this.opts.solids ?? []) {
      const px = x * UNIT; const py = -y * UNIT;
      if (px <= r.left || px >= r.right || py <= r.top || py >= r.bottom) continue;
      const outs = [px - r.left, r.right - px, py - r.top, r.bottom - py];
      const side = outs.indexOf(Math.min(...outs));
      if (side === 0) x = r.left / UNIT; else if (side === 1) x = r.right / UNIT;
      else if (side === 2) y = -r.top / UNIT; else y = -r.bottom / UNIT;
    }
    p.wx = x; p.wy = y;

    let rotation = d.rotation.active ? at(d.rotation, p.rotation) * (this.flip ? -1 : 1) : 0;
    if (d.aligned) rotation += angle;
    const size = at(d.scale, p.scale) * UNIT * this.scale * (this.opts.size ?? 1); // particle width in world units
    const img = p.img;
    img.setPosition(x * UNIT, -y * UNIT).setAngle(-rotation).setScale(size / img.width);
    img.setAlpha(Phaser.Math.Clamp(at(d.transparency, p.alpha), 0, 1));
    img.setTint(this.color(pc));
  }

  private color(pc: number): number {
    if (this.tint !== undefined) return this.tint;
    const { colors, colorTimeline: t } = this.def;
    let i = t.findIndex((x) => x > pc);
    let c: number[];
    if (i === -1) c = colors[colors.length - 1];
    else if (i === 0) c = colors[0];
    else {
      const f = (pc - t[i - 1]) / (t[i] - t[i - 1]);
      c = colors[i - 1].map((v, k) => v + (colors[i][k] - v) * f);
    }
    return Phaser.Display.Color.GetColor(c[0] * 255, c[1] * 255, c[2] * 255);
  }
}

/** A playing effect: move its source (pixels, y down) or stop it emitting. */
export interface ParticleHandle { moveTo(x: number, y: number): void; stop(): void; readonly done: boolean }

/** Owns every running .pe effect of a scene, with a pool of particle images. */
export class ParticleFx {
  private running: RunningEmitter[] = [];
  private pool: Phaser.GameObjects.Image[] = [];

  /**
   * @param texturePrefix the texture key of image `x.png` is `${texturePrefix}x.png`.
   * @param parent particles go in this container (e.g. to be glitched with it) instead of the scene.
   * @param hidden particles are not drawn: the caller draws them its own way from each().
   */
  constructor(private scene: Phaser.Scene, private texturePrefix: string, private depth = 15,
    private parent?: Phaser.GameObjects.Container, private hidden = false) {}

  /**
   * Starts the effect at a world position in pixels (y down); a number is a tint.
   * @returns a handle to move its source (an effect following a fist) or stop it.
   */
  play(def: EffectDef, x: number, y: number, opts?: number | PlayOptions): ParticleHandle {
    const o = typeof opts === 'number' ? { tint: opts } : opts;
    const mine = def.emitters.map((e) => new RunningEmitter(e, this, x / UNIT, -y / UNIT, o));
    this.running.push(...mine);
    return {
      moveTo: (px, py) => { for (const e of mine) e.moveTo(px / UNIT, -py / UNIT); },
      stop: () => { for (const e of mine) e.stop(); },
      get done() { return mine.every((e) => e.done); },
    };
  }

  get live(): boolean { return this.running.length > 0; }

  /** Every live particle: position (world pixels), width (px), opacity and colour. */
  each(fn: (x: number, y: number, size: number, alpha: number, tint: number) => void): void {
    for (const e of this.running) for (const p of e.particles) fn(p.img.x, p.img.y, p.img.displayWidth, p.img.alpha, p.img.tintTopLeft);
  }

  /** Stops and removes every running effect at once (a replay starting over, the editor's preview). */
  clear(): void {
    for (const e of this.running) { e.stop(); for (const p of e.particles) this.release(p.img); e.particles.length = 0; }
    this.running = [];
  }

  update(dtMs: number): void {
    for (const e of this.running) e.update(dtMs);
    this.running = this.running.filter((e) => !e.done);
  }

  acquire(image: string, additive: boolean): Phaser.GameObjects.Image {
    const key = this.texturePrefix + image;
    let img = this.pool.pop();
    if (!img) {
      img = this.parent || this.hidden ? this.scene.make.image({ x: 0, y: 0, key }, false) : this.scene.add.image(0, 0, key);
      this.parent?.add(img);
    }
    return img.setTexture(key).setVisible(true).setDepth(this.depth)
      .setBlendMode(additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
  }

  release(img: Phaser.GameObjects.Image): void {
    img.setVisible(false);
    this.pool.push(img);
  }
}
