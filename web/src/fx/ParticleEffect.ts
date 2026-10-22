import Phaser from 'phaser';
import { UNIT } from '../config';
import { fx, particleCount } from '../game/Settings';

/**
 * A small runtime for LibGDX ParticleEditor files (`public/particles/*.pe`),
 * as used by the full-on-scripting branch (landing dust, hit stars, laser smoke,
 * death dust). It follows com.badlogic.gdx.graphics.g2d.ParticleEmitter:
 * values are in world units (1 unit = 1 tile), times in ms, angles in degrees,
 * y pointing up. Attached and continuous emitters are not supported (no file
 * uses them).
 */

type Section = Record<string, string>;

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

  constructor(s: Section | undefined, alwaysActive = false) {
    s ??= {};
    const n = (k: string) => parseFloat(s![k] ?? '0');
    this.active = alwaysActive || s.active !== 'false';
    this.lowMin = n('lowMin'); this.lowMax = n('lowMax');
    this.highMin = n('highMin'); this.highMax = n('highMax');
    this.relative = s.relative === 'true';
    for (let i = 0; i < n('scalingCount'); i++) this.scaling.push(n(`scaling${i}`));
    for (let i = 0; i < n('timelineCount'); i++) this.timeline.push(n(`timeline${i}`));
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

/** Parses a .pe text file into emitter definitions. */
export function parseEffect(text: string): EffectDef {
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
  return {
    emitters: blocks.map(({ name, sections: s, image }) => {
      const tint = s.Tint ?? {};
      const colors: number[][] = [];
      const timeline: number[] = [];
      for (let i = 0; i < parseInt(tint.timelineCount ?? '0', 10); i++) {
        timeline.push(parseFloat(tint[`timeline${i}`]));
        colors.push([0, 1, 2].map((c) => parseFloat(tint[`colors${i * 3 + c}`] ?? '1')));
      }
      const opt = s.Options ?? {};
      return {
        name, image,
        delay: new Value(s.Delay), duration: new Value(s.Duration, true),
        countMin: parseInt(s.Count?.min ?? '0', 10), countMax: parseInt(s.Count?.max ?? '100', 10),
        emission: new Value(s.Emission, true), life: new Value(s.Life, true),
        lifeOffset: new Value(s['Life Offset']), xOffset: new Value(s['X Offset']), yOffset: new Value(s['Y Offset']),
        shape: s['Spawn Shape']?.shape ?? 'point', edges: s['Spawn Shape']?.edges === 'true',
        spawnWidth: new Value(s['Spawn Width'], true), spawnHeight: new Value(s['Spawn Height'], true),
        scale: new Value(s.Scale, true), velocity: new Value(s.Velocity), angle: new Value(s.Angle),
        rotation: new Value(s.Rotation), wind: new Value(s.Wind), gravity: new Value(s.Gravity),
        colors: colors.length ? colors : [[1, 1, 1]], colorTimeline: timeline.length ? timeline : [0],
        transparency: new Value(s.Transparency, true),
        aligned: opt.aligned === 'true', additive: opt.additive === 'true',
      };
    }),
  };
}

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
  /** The file's particle counts and emission, scaled by the particle quality. */
  private readonly countMin: number;
  private readonly countMax: number;
  private readonly amount = fx().particles;
  readonly particles: Particle[] = [];

  private stopped = false;
  private readonly tint?: number;

  constructor(private def: EmitterDef, private fx: ParticleFx, private x: number, private y: number, private opts: PlayOptions = {}) {
    this.tint = opts.tint;
    [this.emissionLow, this.emissionDiff] = def.emission.pair();
    [this.lifeLow, this.lifeDiff] = def.life.pair();
    this.emissionLow *= opts.rate ?? 1; this.emissionDiff *= opts.rate ?? 1;
    this.lifeLow *= opts.life ?? 1; this.lifeDiff *= opts.life ?? 1;
    this.duration = def.duration.newLow();
    this.delay = def.delay.active ? def.delay.newLow() : 0;
    this.countMin = particleCount(def.countMin);
    this.countMax = Math.ceil(def.countMax * this.amount);
    if (this.delay === 0) this.add(this.countMin);
  }

  get done(): boolean { return (this.stopped || this.time >= this.delay + this.duration) && this.particles.length === 0; }

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
      const life = this.lifeLow + this.lifeDiff * d.life.scale(percent);
      const p: Particle = {
        img, life, age: d.lifeOffset.active ? d.lifeOffset.newLow() : 0, wx: 0, wy: 0,
        scale: d.scale.pair(), velocity: d.velocity.pair(), angle: d.angle.pair(),
        rotation: d.rotation.pair(), wind: d.wind.pair(), gravity: d.gravity.pair(), alpha: d.transparency.pair(),
      };
      let x = this.x + (d.xOffset.active ? d.xOffset.newLow() : 0);
      let y = this.y + (d.yOffset.active ? d.yOffset.newLow() : 0);
      const [wl, wd] = d.spawnWidth.pair();
      const [hl, hd] = d.spawnHeight.pair();
      const w = wl + wd * d.spawnWidth.scale(percent);
      const h = hl + hd * d.spawnHeight.scale(percent);
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
    const angle = d.angle.active ? at(d.angle, p.angle) : 0;
    if (d.velocity.active) {
      const v = at(d.velocity, p.velocity) * dt;
      const speed = this.opts.speed ?? 1;
      x += v * speed * Math.cos(Phaser.Math.DegToRad(angle));
      y += v * speed * Math.sin(Phaser.Math.DegToRad(angle));
    }
    if (d.wind.active) x += at(d.wind, p.wind) * dt;
    if (d.gravity.active) y += at(d.gravity, p.gravity) * dt;
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

    let rotation = d.rotation.active ? at(d.rotation, p.rotation) : 0;
    if (d.aligned) rotation += angle;
    const size = at(d.scale, p.scale) * UNIT * (this.opts.size ?? 1); // particle width in world units
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

  /** Starts the effect at a world position in pixels (y down); a number is a tint. */
  play(def: EffectDef, x: number, y: number, opts?: number | PlayOptions): void {
    const o = typeof opts === 'number' ? { tint: opts } : opts;
    for (const e of def.emitters) this.running.push(new RunningEmitter(e, this, x / UNIT, -y / UNIT, o));
  }

  get live(): boolean { return this.running.length > 0; }

  /** Every live particle: position (world pixels), width (px), opacity and colour. */
  each(fn: (x: number, y: number, size: number, alpha: number, tint: number) => void): void {
    for (const e of this.running) for (const p of e.particles) fn(p.img.x, p.img.y, p.img.displayWidth, p.img.alpha, p.img.tintTopLeft);
  }

  /** Stops every effect at once (a replay starting over). */
  clear(): void {
    for (const e of this.running) for (const p of e.particles) this.release(p.img);
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
