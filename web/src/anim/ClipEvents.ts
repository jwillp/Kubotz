import { CLIPS } from './Clips';
import type { Robot2D } from './Robot2D';
import type { ParticleHandle } from '../fx/ParticleEffect';

/**
 * Particle effects a clip starts at points of its timeline, like Spriter's
 * events: which effect, at which frame (t, 0..1 through the clip), on which
 * body part (a point of its image, as a share of it), and whether it follows
 * that part or stays where it started. A "charge" event plays instead for as
 * long as a smash attack is held charging on that clip.
 */
export interface ClipEvent {
  t: number;
  effect: string;
  /** A part of kubotz.scml (see PARTS), or "ground" for under the robot's feet. */
  part: string;
  x: number;
  y: number;
  follow?: boolean;
  charge?: boolean;
}

/** Parts an effect can start on, with readable names. */
export const PARTS: Record<string, string> = {
  ground: 'feet (on the ground)',
  torso_0012: 'torso',
  Helmet3_000: 'head',
  hand: 'front fist',
  hand_sha: 'back fist',
  shoulder: 'front upper arm',
  shoulder_sha: 'back upper arm',
  foot: 'front boot',
  foot_sha: 'back boot',
  thigh: 'front thigh',
  thigh_sha: 'back thigh',
};

/** Starts an effect at a world point; `flip` mirrors it for a robot facing left (effects are made facing right). */
export type PlayEffect = (effect: string, x: number, y: number, flip: boolean) => ParticleHandle | null;

/** Plays one robot's clip events as its clips run. */
export class EventPlayer {
  private clip = '';
  private last = -1;
  private following: { event: ClipEvent; handle: ParticleHandle }[] = [];
  private charging = new Map<ClipEvent, ParticleHandle>();

  constructor(private readonly play: PlayEffect) {}

  /** Jumps to a point of a clip without firing the events before it (scrubbing back in the editor). */
  seek(clipName: string, progress: number): void {
    if (clipName !== this.clip) return;
    this.last = progress;
  }

  /** Where an event's effect starts now. */
  static where(e: ClipEvent, robot: Robot2D, feet: { x: number; y: number }): { x: number; y: number } {
    return e.part === 'ground' ? feet : robot.pointOnPart(e.part, e.x, e.y) ?? feet;
  }

  /**
   * After the robot is drawn: fires the events passed since the last call
   * (a loop or a restart fires them again), moves the ones that follow, and
   * keeps the charge events going while `charging`.
   */
  update(clipName: string, progress: number, robot: Robot2D, feet: { x: number; y: number }, charging: boolean, flip = false): void {
    if (clipName !== this.clip) { this.clip = clipName; this.last = -1; this.following = []; this.stopCharge(); }
    const events = CLIPS[clipName]?.events ?? [];
    const wrapped = progress < this.last;
    for (const e of events) {
      if (e.charge) continue;
      const passed = wrapped ? e.t > this.last || e.t <= progress : e.t > this.last && e.t <= progress;
      if (!passed) continue;
      const at = EventPlayer.where(e, robot, feet);
      const handle = this.play(e.effect, at.x, at.y, flip);
      if (handle && e.follow) this.following.push({ event: e, handle });
    }
    this.last = progress;
    this.following = this.following.filter(({ event, handle }) => {
      if (handle.done) return false;
      const at = EventPlayer.where(event, robot, feet);
      handle.moveTo(at.x, at.y);
      return true;
    });
    if (!charging) { this.stopCharge(); return; }
    for (const e of events) {
      if (!e.charge) continue;
      const at = EventPlayer.where(e, robot, feet);
      let h = this.charging.get(e);
      if (!h || h.done) { h = this.play(e.effect, at.x, at.y, flip) ?? undefined; if (h) this.charging.set(e, h); }
      h?.moveTo(at.x, at.y);
    }
  }

  private stopCharge(): void {
    for (const h of this.charging.values()) h.stop();
    this.charging.clear();
  }
}
