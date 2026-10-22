import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import type { Kubotz } from './Kubotz';
import type { Highlight, HighlightKind, Prop, ReplayEvent, ReplayFrame, KubotFrame } from './Match';

/** How much of the match is kept (ms): enough for a long recovery, or a launch that flies a while before the K.O. */
const KEEP_MS = 9000;
/** A K.O. replay starts this long before the blow and ends this long after the K.O. */
export const REPLAY_BEFORE = 2600;
export const REPLAY_AFTER = 600;
/** A combo replay starts this long before its first hit and ends this long after its last. */
const COMBO_BEFORE = 1200;
const COMBO_AFTER = 900;
/** A recovery replay starts this long before the launch and ends this long after the Kubot is safe. */
const RECOVERY_BEFORE = 1000;
const RECOVERY_AFTER = 800;
/** Longest replay (ms): a long recovery is cut to the seconds around its closest call. */
const LONGEST = 8000;
/** A combo is this many hits or more. */
const COMBO_MIN = 3;
/** A recovery counts once the Kubot came this close to the blast zone (units) and made it back. */
const RECOVERY_MARGIN = 7;
/** A launch this fast (units/s) or more starts watching for a recovery. */
const RECOVERY_LAUNCH = 12;
/** A recovery that takes longer than this (ms) is dropped. */
const RECOVERY_LONGEST = 9000;
/** Candidates kept per kind while the match runs (the best few win at the end). */
const KEEP_CANDIDATES = 6;
/** Highlights shown per kind. */
export const HIGHLIGHTS_PER_KIND = 3;

const HIDDEN: KubotFrame = {
  visible: false, pose: {}, maps: [], x: 0, bottom: 0, yaw: 0, lean: 0, squash: 1, alpha: 1, flash: false,
};

/** The last hit a Kubot took, for scoring the K.O. or recovery it leads to. */
interface Blow { by: number; at: number; healthBefore: number; speed: number; angle: number; comboHits: number }
/** Hits chained on one Kubot by one opponent. */
interface Combo { by: number; first: number; last: number; hits: number; damage: number }
/** A launched Kubot, watched until it is safe again (or K.O.'d). */
interface Watch { blow: Blow; margin: number; closestAt: number; left: boolean; healthLow: number }
/** A highlight waiting for the frames after it. */
interface Pending { h: Highlight; from: number; to: number }

/**
 * Post-match highlights: a rolling buffer of the last seconds of the match as
 * drawn (every Kubot's pose and place, the arena camera, the lights, the sounds
 * and effects that went off), cheap enough to keep every frame: the poses are
 * the ones the Kubotz were drawn with, kept by reference.
 *
 * While the match runs it spots the moments worth showing again (K.O.s,
 * recoveries from near the blast zone, combos) and scores them; each is cut
 * out of the buffer once the frames just after it are in, and only the best
 * few of each kind are kept.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private pending: Pending[] = [];
  private candidates: Record<HighlightKind, Highlight[]> = { ko: [], recovery: [], combo: [] };
  private events: ReplayEvent[] = [];
  private blows = new Map<number, Blow>();
  private combos = new Map<number, Combo>();
  private watches = new Map<number, Watch>();
  /** Where a Kubot is K.O.'d (world pixels): beyond these. */
  private blast = new Phaser.Geom.Rectangle(-6 * UNIT, -20 * UNIT, 0, 0);

  /** The arena's size (world pixels): Kubotz are K.O.'d 6 units past its sides and bottom, 20 above it. */
  setArena(width: number, height: number): void {
    this.blast.setTo(-6 * UNIT, -20 * UNIT, width + 12 * UNIT, height + 26 * UNIT);
  }

  /** A sound played this frame. */
  sfx(key: string, volume: number, detune: number): void {
    this.events.push({ kind: 'sfx', key, volume, detune });
  }

  /** Records every call of the named methods of `target` (one-shot effects whose arguments are numbers); `on` names a target other than the impact effects. */
  watch<T extends object>(target: T, methods: (keyof T & string)[], on?: 'portals'): void {
    for (const method of methods) {
      const original = (target[method] as unknown as (...a: number[]) => void).bind(target);
      (target as Record<string, unknown>)[method] = (...args: number[]) => {
        this.events.push({ kind: 'fx', method, args, ...(on ? { on } : {}) });
        original(...args);
      };
    }
  }

  /** A .pe particle effect started this frame (dust, sparks...). */
  particles(name: string, x: number, y: number, tint?: number): void {
    this.events.push({ kind: 'pe', name, x, y, ...(tint !== undefined ? { tint } : {}) });
  }

  /** Power-up motes spiralling round a Kubot after a pick-up. */
  twirl(kubot: number, color: number, ms: number): void {
    this.events.push({ kind: 'twirl', kubot, color, ms });
  }

  /**
   * A hit that got through (not guarded): `chained` = it landed while the
   * last one still stunned; `speed` its launch speed (units/s, 0 for a light
   * combo hit), `angle` its launch angle (degrees, 90 up).
   */
  hit(victim: Kubotz, by: Kubotz, damage: number, chained: boolean, now: number, healthBefore: number, speed: number, angle: number): void {
    const v = victim.index;
    let combo = this.combos.get(v);
    if (combo && chained && combo.by === by.index) {
      combo.hits++;
      combo.damage += damage;
      combo.last = now;
    } else {
      if (combo) this.endCombo(v, combo, false);
      combo = { by: by.index, first: now, last: now, hits: 1, damage };
      this.combos.set(v, combo);
    }
    const blow: Blow = { by: by.index, at: now, healthBefore, speed, angle, comboHits: combo.hits };
    this.blows.set(v, blow);
    // A hard launch: watch whether it makes it back.
    if (speed >= RECOVERY_LAUNCH) {
      const w = this.watches.get(v);
      if (w) w.blow = blow;
      else this.watches.set(v, { blow, margin: Infinity, closestAt: now, left: false, healthLow: victim.health });
    }
  }

  /**
   * @param spawn a Kubot's spawn hologram, if it is in one (age, projector x, feet y; fx/Hologram.ts)
   * @param extra per Kubot, what else is drawn with it (blade, swing trail, auras); the other images drawn; the ambient light
   */
  record(now: number, fighters: readonly Kubotz[], cam: Phaser.Cameras.Scene2D.Camera, lights?: Phaser.GameObjects.LightsManager,
    spawn?: (k: Kubotz) => [number, number, number] | undefined,
    extra?: { kubot: (k: Kubotz) => Partial<KubotFrame>; props: Prop[]; ambient: number }): void {
    const kubotz = fighters.map((k): KubotFrame => {
      const d = k.model.lastDraw;
      const holo = spawn?.(k);
      return k.isAlive() && d ? { visible: true, ...d, ...(holo ? { holo } : {}), ...extra?.kubot(k) } : HIDDEN;
    });
    this.frames.push({
      t: now,
      camX: cam.scrollX + cam.width / 2, camY: cam.scrollY + cam.height / 2, zoom: cam.zoom, rotation: (cam as unknown as { rotation: number }).rotation, // untyped getter
      kubotz,
      lights: lights?.active ? litLights(lights) : [],
      events: this.events,
      props: extra?.props ?? [],
      ambient: extra?.ambient ?? 0x64709a,
    });
    this.events = [];
    let drop = 0;
    while (drop < this.frames.length && this.frames[drop].t < now - KEEP_MS) drop++;
    if (drop > 0) this.frames.splice(0, drop);
    this.followRecoveries(now, fighters);
    // A combo is over once its Kubot is out of hitstun for a beat.
    for (const [v, c] of this.combos) if (now - c.last > 1500) this.endCombo(v, c, false);
    this.pending = this.pending.filter((p) => {
      if (now < p.to) return true;
      this.cut(p);
      return false;
    });
  }

  /** A K.O. at `now`; `final` when it ends the match. */
  ko(victim: number, killer: number | null, now: number, final: boolean): void {
    const blow = this.blows.get(victim);
    const recent = blow && killer !== null && blow.by === killer && now - blow.at < 3000 ? blow : null;
    const at = recent ? recent.at : now;
    // An early K.O. (the victim still healthy) is the best, then a fast or downward launch, a combo into it, the match point.
    const health = recent ? recent.healthBefore / Config.KUBOTZ_HEALTH : 0;
    const spike = recent && recent.angle < -20 ? 1 : 0;
    let score = 2 * health + (recent ? recent.speed / 20 : 0) + spike + (recent && recent.comboHits >= 2 ? 0.4 * recent.comboHits : 0) + (final ? 1.5 : 0);
    if (killer === null) score *= 0.25;
    this.queue({ kind: 'ko', subject: victim, by: killer, score, focus: at, frames: [], final }, at - REPLAY_BEFORE, now + REPLAY_AFTER);
    const combo = this.combos.get(victim);
    if (combo) this.endCombo(victim, combo, true, now);
    this.watches.delete(victim);
    this.blows.delete(victim);
  }

  /** Cuts out the highlights still waiting for their last frames (the match is leaving) and ranks them. */
  flush(): Highlight[] {
    for (const [v, c] of this.combos) this.endCombo(v, c, false);
    for (const p of this.pending) this.cut(p);
    this.pending = [];
    return pickHighlights(this.candidates);
  }

  private endCombo(victim: number, c: Combo, ko: boolean, koAt = 0): void {
    this.combos.delete(victim);
    if (c.hits < COMBO_MIN) return;
    // Damage first (a long chain of light jabs is not much of a combo), then hits up to a point; one that finishes the Kubot off is the best kind.
    const score = c.damage / 6 + 0.5 * Math.min(c.hits, 8) + (ko ? 3 : 0);
    const to = ko ? koAt + REPLAY_AFTER : c.last + COMBO_AFTER;
    this.queue({ kind: 'combo', subject: victim, by: c.by, score, focus: c.last, frames: [], hits: c.hits, damage: c.damage, ko },
      Math.max(c.first - COMBO_BEFORE, to - LONGEST), to);
  }

  /** Launched Kubotz: how close they come to the blast zone, and whether they make it back. */
  private followRecoveries(now: number, fighters: readonly Kubotz[]): void {
    for (const [v, w] of this.watches) {
      const k = fighters[v];
      if (!k || !k.isAlive() || now - w.blow.at > RECOVERY_LONGEST) { this.watches.delete(v); continue; }
      const b = this.blast;
      const margin = Math.min(k.x - b.left, b.right - k.x, k.y - b.top, b.bottom - k.y) / UNIT;
      if (margin < w.margin) { w.margin = margin; w.closestAt = now; }
      w.healthLow = Math.min(w.healthLow, k.health);
      const safe = k.grounded || k.onLedge;
      if (!safe) { w.left = true; continue; }
      if (!w.left) continue; // not off the ground yet
      this.watches.delete(v);
      if (w.margin > RECOVERY_MARGIN) continue;
      // The closer the call the better, then a long trip back, a hard launch, low health.
      const away = (now - w.blow.at) / 1000;
      const score = 3 * (1 - Math.max(0, w.margin) / RECOVERY_MARGIN) + 0.3 * away + w.blow.speed / 25 + (1 - w.healthLow / Config.KUBOTZ_HEALTH);
      let from = w.blow.at - RECOVERY_BEFORE;
      const to = now + RECOVERY_AFTER;
      if (to - from > LONGEST) from = Math.max(from, Math.min(w.closestAt - LONGEST / 2, to - LONGEST));
      this.queue({ kind: 'recovery', subject: v, by: w.blow.by, score, focus: w.closestAt, frames: [], margin: Math.max(0, w.margin) }, from, to);
    }
  }

  private queue(h: Highlight, from: number, to: number): void {
    const list = this.candidates[h.kind];
    // Not worth the frames if it would not make the cut anyway.
    if (list.length >= KEEP_CANDIDATES && h.score <= list[list.length - 1].score) return;
    this.pending.push({ h, from, to });
  }

  private cut(p: Pending): void {
    p.h.frames = this.frames.filter((f) => f.t >= p.from && f.t <= p.to);
    if (p.h.frames.length < 2) return;
    const list = this.candidates[p.h.kind];
    list.push(p.h);
    list.sort((a, b) => b.score - a.score);
    list.length = Math.min(list.length, KEEP_CANDIDATES);
  }
}

/**
 * The best few of each kind, in the order they are shown: K.O.s, recoveries,
 * combos, each counting down to the best. A moment already shown (the same
 * Kubot, overlapping in time) is not shown again in a later kind.
 */
export function pickHighlights(candidates: Record<HighlightKind, Highlight[]>): Highlight[] {
  const picked: Highlight[] = [];
  const span = (h: Highlight) => [h.frames[0].t, h.frames[h.frames.length - 1].t];
  const shown = (h: Highlight) => picked.some((p) => {
    if (p.subject !== h.subject) return false;
    const [a0, a1] = span(p); const [b0, b1] = span(h);
    return Math.min(a1, b1) - Math.max(a0, b0) > 0.5 * Math.min(a1 - a0, b1 - b0);
  });
  for (const kind of ['ko', 'recovery', 'combo'] as HighlightKind[]) {
    const best = [...candidates[kind]].sort((a, b) => b.score - a.score).filter((h) => !shown(h)).slice(0, HIGHLIGHTS_PER_KIND);
    picked.push(...best.reverse());
  }
  return picked;
}

const ids = new WeakMap<object, number>();
let nextId = 1;

/**
 * An image as drawn this frame (see Prop). `over` replaces what the image
 * itself does not know (a container's place and fade, a debris piece's scan-out).
 */
export function propOf(img: Phaser.GameObjects.Image, over: { x?: number; y?: number; alpha?: number; rotation?: number; holo?: number; depth?: number } = {}): Prop {
  let id = ids.get(img);
  if (id === undefined) ids.set(img, id = nextId++);
  const lit = img.pipeline?.name === 'Light2D' ? 1 : 0;
  return [img.texture.key, img.frame.name, over.x ?? img.x, over.y ?? img.y, img.originX, img.originY, img.scaleX, img.scaleY,
    over.rotation ?? img.rotation, img.tintTopLeft, over.alpha ?? img.alpha, img.blendMode as number, over.depth ?? img.depth,
    lit | (img.flipX ? 2 : 0), over.holo ?? 0, id];
}

function litLights(manager: Phaser.GameObjects.LightsManager): number[] {
  const out: number[] = [];
  for (const l of manager.lights) {
    if (!l.visible || l.intensity <= 0) continue;
    out.push(l.x, l.y, l.radius, Phaser.Display.Color.GetColor(l.color.r * 255, l.color.g * 255, l.color.b * 255), l.intensity);
  }
  return out;
}
