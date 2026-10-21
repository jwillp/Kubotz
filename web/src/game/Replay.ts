import Phaser from 'phaser';
import type { Kubotz } from './Kubotz';
import type { KoReplay, ReplayEvent, ReplayFrame, RobotFrame } from './Match';

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
  private events: ReplayEvent[] = [];

  /** A sound played this frame. */
  sfx(key: string, volume: number, detune: number): void {
    this.events.push({ kind: 'sfx', key, volume, detune });
  }

  /** Records every call of the named methods of `target` (one-shot effects whose arguments are numbers). */
  watch<T extends object>(target: T, methods: (keyof T & string)[]): void {
    for (const method of methods) {
      const original = (target[method] as unknown as (...a: number[]) => void).bind(target);
      (target as Record<string, unknown>)[method] = (...args: number[]) => {
        this.events.push({ kind: 'fx', method, args });
        original(...args);
      };
    }
  }

  record(now: number, fighters: readonly Kubotz[], cam: Phaser.Cameras.Scene2D.Camera, lights?: Phaser.GameObjects.LightsManager): void {
    const robots = fighters.map((k): RobotFrame => {
      const d = k.model.lastDraw;
      return k.isAlive() && d ? { visible: true, ...d } : HIDDEN;
    });
    this.frames.push({
      t: now,
      camX: cam.scrollX + cam.width / 2, camY: cam.scrollY + cam.height / 2, zoom: cam.zoom, rotation: (cam as unknown as { rotation: number }).rotation, // untyped getter
      robots,
      lights: lights?.active ? litLights(lights) : [],
      events: this.events,
    });
    this.events = [];
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

function litLights(manager: Phaser.GameObjects.LightsManager): number[] {
  const out: number[] = [];
  for (const l of manager.lights) {
    if (!l.visible || l.intensity <= 0) continue;
    out.push(l.x, l.y, l.radius, Phaser.Display.Color.GetColor(l.color.r * 255, l.color.g * 255, l.color.b * 255), l.intensity);
  }
  return out;
}
