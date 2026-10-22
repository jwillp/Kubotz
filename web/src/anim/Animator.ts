import { CLIPS, mixPoses, sampleClip, type Clip } from './Clips';
import type { Pose, Rig } from './Rig';

/**
 * Plays the clips of one robot: time, the blend from the previous pose on each
 * switch, keeping the boots on the ground, and the forward travel of strikes
 * (handed to the game as root motion so the body really moves).
 */
export class Animator {
  private clip: Clip = CLIPS.idle;
  private time = 0;
  private speed = 1;
  private from: Pose | null = null;
  private blend = 0;
  private blendMs = 1;
  private last: Pose = {};
  private rootX = 0;
  private rootTravel = 0;
  private frozen: number | null = null;
  /** Set when a non-looping clip reached its end. */
  finished = false;

  constructor(private readonly rig: Rig) {}

  get name(): string { return this.clip.name; }
  /** 0..1 through the clip. */
  get progress(): number { return Math.min(1, this.time / this.clip.ms); }

  /**
   * Switches clip (no-op if it is already playing, unless `restart`).
   * @param ms play it over this long instead of its own length
   * @param fade blend from the current pose (ms)
   */
  play(name: string, opts: { restart?: boolean; ms?: number; fade?: number } = {}): void {
    const clip = CLIPS[name];
    if (!clip || (clip === this.clip && !opts.restart)) return;
    // Blend from the pose drawn last; a full spin ends where it started, so
    // it is not unwound through the blend.
    const wrap = (v: number | undefined) => (((v ?? 0) % 360) + 540) % 360 - 180;
    this.from = Object.keys(this.last).length ? { ...this.last, spin: wrap(this.last.spin), yaw: wrap(this.last.yaw) } : null;
    this.blend = 0;
    this.blendMs = opts.fade ?? 110;
    this.clip = clip;
    this.time = 0;
    this.speed = opts.ms ? clip.ms / opts.ms : 1;
    this.finished = false;
    this.rootX = sampleClip(clip, 0).x ?? 0;
  }

  /** Holds the clip at a point (0..1), e.g. a smash's wind-up while it charges; null lets it run on from there. */
  freeze(at: number | null): void {
    if (at === null) { this.frozen = null; return; }
    this.frozen = at;
  }

  /** Plays the current clip faster or slower (looping clips: run cycle). */
  setRate(rate: number): void { this.speed = rate; }

  tick(dtMs: number): void {
    if (this.frozen !== null) this.time = this.frozen * this.clip.ms;
    else this.time += dtMs * this.speed;
    if (this.time >= this.clip.ms) {
      if (this.clip.loop) this.time %= this.clip.ms;
      else { this.time = this.clip.ms; this.finished = true; }
    }
    this.blend += dtMs;
    if (this.clip.rootMotion) {
      const x = sampleClip(this.clip, this.progress).x ?? 0;
      this.rootTravel += x - this.rootX;
      this.rootX = x;
    }
  }

  /** Forward travel (Spriter pixels) of a root-motion clip since the last call. */
  takeRootMotion(): number {
    const d = this.rootTravel;
    this.rootTravel = 0;
    return d;
  }

  /** The pose to draw now. */
  pose(): Pose {
    let p = sampleClip(this.clip, this.progress);
    if (this.clip.rootMotion) p = { ...p, x: 0 }; // the body travels instead
    if (this.clip.planted) p = { ...p, y: (p.y ?? 0) + this.rig.groundLift(p) };
    if (this.from && this.blend < this.blendMs) {
      const f = this.blend / this.blendMs;
      p = mixPoses(this.from, p, f * f * (3 - 2 * f));
    } else {
      this.from = null;
    }
    this.last = p;
    return p;
  }
}
