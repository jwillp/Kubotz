import Phaser from 'phaser';
import type { Kubotz } from './Kubotz';
import type { KoReplay, ReplayFrame, RobotFrame } from './Match';

/** How much of the match is kept (ms): enough for a launch that flies a while before the K.O. */
const KEEP_MS = 6000;
/** A replay starts this long before the blow and ends this long after the K.O. */
export const REPLAY_BEFORE = 2600;
export const REPLAY_AFTER = 600;

const HIDDEN: RobotFrame = {
  visible: false, pose: {}, maps: [], x: 0, bottom: 0, yaw: 0, lean: 0, squash: 1, alpha: 1, flash: false,
};

/**
 * Kill replays (phase 11 D): a rolling buffer of the last seconds of the
 * match as drawn (every robot's pose and place, the arena camera), cheap
 * enough to keep every frame: the poses are the ones the robots were drawn
 * with, kept by reference. On a K.O. the buffer is cut out once the frames
 * just after it are in.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private pending: { ko: KoReplay; until: number }[] = [];
  readonly done: KoReplay[] = [];

  record(now: number, fighters: readonly Kubotz[], cam: Phaser.Cameras.Scene2D.Camera): void {
    const robots = fighters.map((k): RobotFrame => {
      const d = k.model.lastDraw;
      return k.isAlive() && d ? { visible: true, ...d } : HIDDEN;
    });
    this.frames.push({
      t: now,
      camX: cam.scrollX + cam.width / 2, camY: cam.scrollY + cam.height / 2, zoom: cam.zoom, rotation: (cam as unknown as { rotation: number }).rotation, // untyped getter
      robots,
    });
    let drop = 0;
    while (drop < this.frames.length && this.frames[drop].t < now - KEEP_MS) drop++;
    if (drop > 0) this.frames.splice(0, drop);
    while (this.pending.length > 0 && now >= this.pending[0].until) this.cut(this.pending.shift()!.ko);
  }

  /** A K.O. at `now`; `blow` is when the victim was last hit (if lately), else the K.O. */
  ko(victim: number, killer: number | null, now: number, blow: number): void {
    this.pending.push({ ko: { victim, killer, at: now, blow, frames: [] }, until: now + REPLAY_AFTER });
  }

  /** Cuts out the K.O.s still waiting for their last frames (the match is leaving). */
  flush(): KoReplay[] {
    for (const p of this.pending) this.cut(p.ko);
    this.pending = [];
    return this.done;
  }

  private cut(ko: KoReplay): void {
    const from = ko.blow - REPLAY_BEFORE;
    ko.frames = this.frames.filter((f) => f.t >= from && f.t <= ko.at + REPLAY_AFTER);
    if (ko.frames.length > 1) this.done.push(ko);
  }
}
