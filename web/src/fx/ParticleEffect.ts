import Phaser from 'phaser';
import { UNIT } from '../config';

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

interface Particle {
  img: Phaser.GameObjects.Image;
  life: number; age: number;
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
  readonly particles: Particle[] = [];

  constructor(private def: EmitterDef, private fx: ParticleFx, private x: number, private y: number, private tint?: number) {
    [this.emissionLow, this.emissionDiff] = def.emission.pair();
    [this.lifeLow, this.lifeDiff] = def.life.pair();
    this.duration = def.duration.newLow();
    this.delay = def.delay.active ? def.delay.newLow() : 0;
    if (this.delay === 0) this.add(def.countMin);
  }

  get done(): boolean { return this.time >= this.delay + this.duration && this.particles.length === 0; }

  update(dtMs: number): void {
    this.time += dtMs;
    const t = this.time - this.delay;
    if (t >= 0 && t < this.duration) {
      const percent = t / this.duration;
      if (this.particles.length < this.def.countMin) this.add(this.def.countMin - this.particles.length);
      const perSecond = this.emissionLow + this.emissionDiff * this.def.emission.scale(percent);
      if (perSecond > 0) {
        const every = 1000 / perSecond;
        this.emissionDelta += dtMs;
        if (this.emissionDelta >= every) {
          const n = Math.min(Math.floor(this.emissionDelta / every), this.def.countMax - this.particles.length);
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
        img, life, age: d.lifeOffset.active ? d.lifeOffset.newLow() : 0,
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
      img.setData('wx', x).setData('wy', y);
      this.particles.push(p);
      this.step(p, 0);
    }
  }

  private step(p: Particle, dt: number): void {
    const d = this.def;
    const pc = Math.min(1, p.age / p.life);
    const at = (v: Value, pair: [number, number]) => pair[0] + pair[1] * v.scale(pc);
    let x = p.img.getData('wx') as number;
    let y = p.img.getData('wy') as number;
    const angle = d.angle.active ? at(d.angle, p.angle) : 0;
    if (d.velocity.active) {
      const v = at(d.velocity, p.velocity) * dt;
      x += v * Math.cos(Phaser.Math.DegToRad(angle));
      y += v * Math.sin(Phaser.Math.DegToRad(angle));
    }
    if (d.wind.active) x += at(d.wind, p.wind) * dt;
    if (d.gravity.active) y += at(d.gravity, p.gravity) * dt;
    p.img.setData('wx', x).setData('wy', y);

    let rotation = d.rotation.active ? at(d.rotation, p.rotation) : 0;
    if (d.aligned) rotation += angle;
    const size = at(d.scale, p.scale) * UNIT; // particle width in world units
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

  /** @param texturePrefix the texture key of image `x.png` is `${texturePrefix}x.png`. */
  constructor(private scene: Phaser.Scene, private texturePrefix: string, private depth = 15) {}

  /** Starts the effect at a world position in pixels (y down). */
  /** @param tint replaces the effect's own colours (e.g. a laser in the shooter's colour). */
  play(def: EffectDef, x: number, y: number, tint?: number): void {
    for (const e of def.emitters) this.running.push(new RunningEmitter(e, this, x / UNIT, -y / UNIT, tint));
  }

  update(dtMs: number): void {
    for (const e of this.running) e.update(dtMs);
    this.running = this.running.filter((e) => !e.done);
  }

  acquire(image: string, additive: boolean): Phaser.GameObjects.Image {
    const key = this.texturePrefix + image;
    const img = this.pool.pop() ?? this.scene.add.image(0, 0, key);
    return img.setTexture(key).setVisible(true).setDepth(this.depth)
      .setBlendMode(additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
  }

  release(img: Phaser.GameObjects.Image): void {
    img.setVisible(false);
    this.pool.push(img);
  }
}
