import Phaser from 'phaser';
import { UNIT } from '../config';
import { CLIPS, sampleClip } from '../anim/Clips';
import { BONES, Rig, type Bone, type Pose } from '../anim/Rig';
import { ART_SCALE, Robot2D } from '../anim/Robot2D';
import { HEADS, HURTBOX, SLOT_COLORS, SWORD_FILE, partTexture, type Move } from '../game/Kubotz';
import { opaqueOutline } from '../scenes/GameScene';
import type { SpriterData } from '../spriter/Spriter';
import { FRAME_MS, type Store } from './Store';
import { EventPlayer } from '../anim/ClipEvents';
import { ParticleFx, effectFromData, type EffectDef, type ParticleHandle } from '../fx/ParticleEffect';

/**
 * The editor's stage: the robot drawn by the game's own renderer at the
 * selected time, with handles to pose its bones, the move's hit circles
 * (draggable on their part), the hurtbox, onion skins of the neighbouring
 * keys and a target dummy that lights up when a hit circle reaches it.
 */

/** Each bone's parent (the skeleton of kubotz.scml). */
export const PARENT: Record<Bone, Bone | null> = {
  body: null, torso: 'body', head: 'torso',
  shoulderF: 'torso', armF: 'shoulderF', handF: 'armF', shoulderB: 'torso', armB: 'shoulderB', handB: 'armB',
  thighF: 'body', legF: 'thighF', footF: 'legF', thighB: 'body', legB: 'thighB', footB: 'legB',
};
const descendants = (b: Bone): Bone[] => BONES.filter((c) => { for (let p = PARENT[c]; p; p = PARENT[p]) if (p === b) return true; return false; });

/** Clips played with the laser sword in hand. */
const SWORD_CLIPS = /^(slash\d|s(ftilt|dtilt|usmash|fsmash|dsmash|nair|bair|uair|dair))$/;
const COLOR = SLOT_COLORS[0];
const DUMMY_COLOR = SLOT_COLORS[1];
const HANDLE = 0xffb547;
const HIT = 0xff4d4d;
const HURT = 0x4aa3ff;
const EVENT = 0xb18cff;

export interface StageView { onion: boolean; dummy: boolean; handles: boolean; dummyX: number; helmet: number }

interface Joint { bone: Bone; ox: number; oy: number; tx: number; ty: number; dir: number }
type Drag =
  | { kind: 'bone'; bone: Bone; alone: boolean; off: number }
  | { kind: 'root'; sx: number; sy: number; x0: number; y0: number }
  | { kind: 'point'; set: string; index: number; file: string }
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'dummy' }
  | { kind: 'event'; index: number }
  | { kind: 'pinch'; dist: number; zoom: number; wx: number; wy: number };

export class StageScene extends Phaser.Scene {
  view: StageView = { onion: true, dummy: true, handles: true, dummyX: 2.6, helmet: 0 };
  private store!: Store;
  private rig!: Rig;
  private robot!: Robot2D;
  private dummy!: Robot2D;
  private onions: Robot2D[] = [];
  /** The clip's particle effects, played as the time passes their frames. */
  private particles!: ParticleFx;
  private clipEvents!: EventPlayer;
  private effectCache = new Map<string, { text: string; def: EffectDef }>();
  private lastT = 0;
  /** Event points on the stage (this frame's events), for dragging. */
  private eventPoints: { x: number; y: number; index: number }[] = [];
  /** Where the pointer went down, until it has moved far enough to count as a drag. */
  private pressAt: { x: number; y: number } | null = null;
  /** Holds the move as if its smash were charging, to see the charge effects. */
  charging = false;
  /** What the stage shows: the robot and its clip, or one particle effect playing over and over (Particles tab). */
  mode: 'anim' | 'particles' = 'anim';
  /** Particles tab: the effect mirrored (as a robot facing left plays it), and a robot beside it for scale. */
  preview = { flip: false, robot: true };
  private previewing: { name: string; text: string; handle: ParticleHandle; again: number } | null = null;
  private grid!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private joints: Joint[] = [];
  private circles: { x: number; y: number; r: number; set: string; index: number; file: string }[] = [];
  private drag: Drag | null = null;
  private hover: string | null = null;
  playing = false;
  rate = 1;

  constructor() { super('Editor'); }

  create(): void {
    this.store = this.registry.get('store') as Store;
    const spriter = this.registry.get('spriter') as SpriterData;
    this.rig = new Rig(spriter);
    for (const file of ['feet/foot.png', 'feet/foot-sha.png']) this.rig.setOutline(file, opaqueOutline(this, `kubotz:${file}`));
    this.grid = this.add.graphics().setDepth(0);
    for (let i = 0; i < 2; i++) {
      const o = new Robot2D(this, this.rig, (file) => partTexture(this.textures, file, COLOR));
      o.view.setDepth(8);
      this.onions.push(o);
    }
    this.dummy = new Robot2D(this, this.rig, (file) => partTexture(this.textures, file, DUMMY_COLOR));
    this.dummy.view.setDepth(9);
    this.robot = new Robot2D(this, this.rig, (file) => partTexture(this.textures, file, COLOR));
    this.over = this.add.graphics().setDepth(20);
    this.particles = new ParticleFx(this, 'pe:', 16);
    this.clipEvents = new EventPlayer((name, x, y) => {
      const def = this.effect(name);
      return def ? this.particles.play(def, x, y) : null;
    });
    this.lights.enable().setAmbientColor(0x8a94b4);
    this.lights.addLight(0, -4 * UNIT, 14 * UNIT, 0xffe8cc, 2.4);
    this.lights.addLight(0, -UNIT, 10 * UNIT, 0x3aa8ff, 1.2);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#0d1015').setZoom(1.6).centerOn(0.6 * UNIT, -1.3 * UNIT);
    this.scale.on('resize', () => this.drawGrid());
    this.drawGrid();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.moveTo(p));
    this.input.on('pointerup', () => this.up());
    this.input.on('pointerupoutside', () => this.up());
    // Two fingers on a touch screen pinch to zoom and move to pan.
    this.input.addPointer(1);
    // Wheel and touchpad: a mouse wheel zooms; a touchpad pinch (ctrl + wheel) zooms, two-finger scrolling pans.
    this.game.canvas.addEventListener('wheel', (e) => {
      if (!this.sys.isActive()) return;
      e.preventDefault();
      const r = this.game.canvas.getBoundingClientRect();
      const sx = e.clientX - r.left; const sy = e.clientY - r.top;
      const lines = e.deltaMode === 1 ? 16 : 1;
      const dx = e.deltaX * lines; const dy = e.deltaY * lines;
      const mouseWheel = !e.ctrlKey && e.deltaX === 0 && (e.deltaMode !== 0 || (Number.isInteger(dy) && Math.abs(dy) >= 50));
      if (e.ctrlKey) this.zoomAt(sx, sy, Math.exp(-dy * 0.01));
      else if (mouseWheel) this.zoomAt(sx, sy, dy > 0 ? 0.9 : 1.1);
      else { cam.scrollX += dx / cam.zoom; cam.scrollY += dy / cam.zoom; this.drawGrid(); }
    }, { passive: false });
    this.input.mouse?.disableContextMenu();
  }

  /** Zooms by a factor, keeping the stage point under a screen point (canvas pixels) in place. */
  zoomAt(sx: number, sy: number, factor: number): void {
    const cam = this.cameras.main;
    const before = cam.getWorldPoint(sx, sy);
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, 0.4, 6));
    cam.preRender();
    const after = cam.getWorldPoint(sx, sy);
    cam.scrollX += before.x - after.x; cam.scrollY += before.y - after.y;
    this.drawGrid();
  }

  /** Frames the robot again (after a resize or on request). */
  recentre(): void {
    this.cameras.main.setZoom(1.6).centerOn(0.6 * UNIT, -1.3 * UNIT);
    this.drawGrid();
  }

  private drawGrid(): void {
    const cam = this.cameras.main;
    const w = cam.width / cam.zoom; const h = cam.height / cam.zoom;
    const x0 = cam.midPoint.x - w; const x1 = cam.midPoint.x + w;
    const y0 = cam.midPoint.y - h; const y1 = cam.midPoint.y + h;
    const g = this.grid.clear();
    const step = UNIT / 4;
    g.lineStyle(1 / cam.zoom, 0x1b212a, 1);
    for (let x = Math.floor(x0 / step) * step; x < x1; x += step) g.lineBetween(x, y0, x, y1);
    for (let y = Math.floor(y0 / step) * step; y < y1; y += step) g.lineBetween(x0, y, x1, y);
    g.lineStyle(1 / cam.zoom, 0x2a3240, 1);
    for (let x = Math.floor(x0 / UNIT) * UNIT; x < x1; x += UNIT) g.lineBetween(x, y0, x, y1);
    for (let y = Math.floor(y0 / UNIT) * UNIT; y < y1; y += UNIT) g.lineBetween(x0, y, x1, y);
    g.fillStyle(0x161b23, 1).fillRect(x0, 0, x1 - x0, y1);
    g.lineStyle(2 / cam.zoom, 0x4a5568, 1).lineBetween(x0, 0, x1, 0);
  }

  /** The pose drawn at a time (0..1): the clip's own, planted on the ground like the game does. */
  poseAt(t: number): Pose {
    const clip = this.store.clip;
    let p = sampleClip(clip, t);
    if (clip.planted) p = { ...p, y: (p.y ?? 0) + this.rig.groundLift(p) };
    return p;
  }

  update(_time: number, dt: number): void {
    const s = this.store;
    if (this.mode === 'particles') { this.drawPreview(dt); return; }
    if (this.previewing) { this.particles.clear(); this.previewing = null; }
    if (this.playing) {
      s.sel.t = (s.sel.t + (dt * this.rate) / s.playMs) % 1;
      s.emit();
    }
    this.draw();
    // Effects fire as the time passes their frames (playing or stepping forwards); scrubbing back does not replay them.
    if (!this.playing && s.sel.t < this.lastT) this.clipEvents.seek(s.sel.clip, s.sel.t);
    this.lastT = s.sel.t;
    const bx = s.clip.rootMotion ? (this.poseAt(s.sel.t).x ?? 0) * ART_SCALE : 0;
    this.clipEvents.update(s.sel.clip, s.sel.t, this.robot, { x: bx, y: 0 }, this.charging);
    this.particles.update(dt * (this.playing ? this.rate : 1));
  }

  /** Particles tab: the selected effect from a point above the floor, started again a moment after it ends or whenever it is edited. */
  private drawPreview(dt: number): void {
    const s = this.store;
    const name = s.sel.effect;
    const text = JSON.stringify(s.docs.particles[name] ?? null);
    const p = this.previewing;
    if (p && (p.name !== name || p.text !== text)) { this.particles.clear(); this.previewing = null; }
    const at = { x: 0, y: -1.2 * UNIT };
    if (!this.previewing || (this.previewing.handle.done && (this.previewing.again -= dt) <= 0)) {
      const def = this.effect(name);
      if (def) this.previewing = { name, text, handle: this.particles.play(def, at.x, at.y, undefined, this.preview.flip), again: 350 };
    }
    this.particles.update(dt * (this.rate || 1));
    // The robot for scale, standing to the side; nothing else of the animation stage.
    this.robot.visible = this.preview.robot;
    for (const o of this.onions) o.visible = false;
    this.dummy.visible = false;
    if (this.preview.robot) {
      const idle = sampleClip(CLIPS.idle, 0);
      this.robot.update({ ...idle, y: (idle.y ?? 0) + this.rig.groundLift(idle) }, this.maps(null), -1.6 * UNIT, 0, 0, { lean: 0, squash: 1, alpha: 0.35, flash: false, dtMs: dt, snap: true });
    }
    const z = this.cameras.main.zoom;
    this.over.clear().lineStyle(1.5 / z, EVENT, 0.9)
      .lineBetween(at.x - 8 / z, at.y, at.x + 8 / z, at.y).lineBetween(at.x, at.y - 8 / z, at.x, at.y + 8 / z);
  }

  /** A particle effect from the editor's data (rebuilt when it changes). */
  private effect(name: string): EffectDef | null {
    const data = this.store.docs.particles[name];
    if (!data) return null;
    const text = JSON.stringify(data);
    let c = this.effectCache.get(name);
    if (!c || c.text !== text) { c = { text, def: effectFromData(data) }; this.effectCache.set(name, c); }
    return c.def;
  }

  /** Clears the effects on screen (switching clips). */
  clearEffects(): void { this.particles.clear(); }

  private maps(move: Move | null): string[] {
    const out: string[] = [];
    const head = HEADS[this.view.helmet];
    if (head) out.push(head);
    const sword = move ? move.points[0]?.file === SWORD_FILE : SWORD_CLIPS.test(this.store.sel.clip);
    if (sword) out.push('weapon_laserSword');
    else if (this.store.sel.clip === 'shoot') out.push('weapon_laserGunMkI');
    if (move?.maps && !sword) out.push(...move.maps);
    return out;
  }

  /** The move being tuned, as the game holds it (points resolved). */
  private liveMove(): Move | null {
    const ref = this.store.sel.move;
    if (!ref) return null;
    const m = this.store.move(ref);
    if (!m) return null;
    return { ...m, points: this.store.docs.moves.pointSets[m.points] ?? [] } as Move;
  }

  private draw(): void {
    const s = this.store;
    const t = s.sel.t;
    const move = this.liveMove();
    const maps = this.maps(move);
    const pose = this.poseAt(t);
    const fx = { lean: 0, squash: 1, alpha: 1, flash: false, dtMs: 16, snap: true };
    // The body travels by the clip's x (the game turns it into root motion).
    this.robot.visible = true;
    this.robot.update(pose, maps, 0, 0, pose.yaw ?? 0, fx);

    // Onion skins: the keys either side of the current time.
    const keys = s.clipData.keys;
    const prev = [...keys].reverse().find((k) => k.t < t - 1e-4);
    const next = keys.find((k) => k.t > t + 1e-4);
    [prev, next].forEach((k, i) => {
      const o = this.onions[i];
      o.visible = this.view.onion && !!k;
      if (k) o.update(this.poseAt(k.t), maps, 0, 0, 0, { ...fx, alpha: 0.16, flash: true });
    });

    const g = this.over.clear();
    const z = this.cameras.main.zoom;
    const line = (w: number) => w / z;

    // The hurtbox, centred on the body and on its feet (a root-motion clip carries the body along).
    const hw = HURTBOX.width * UNIT; const hh = HURTBOX.height * UNIT;
    const bx = s.clip.rootMotion ? (pose.x ?? 0) * ART_SCALE : 0;
    g.lineStyle(line(1.5), HURT, 0.9).strokeRect(bx - hw / 2, -hh, hw, hh);

    // Hit circles, placed the way Kubotz.currentAttack() does.
    this.circles = [];
    let active = false;
    if (move) {
      active = t >= move.active[0] && t <= move.active[1];
      const sword = move.points[0]?.file === SWORD_FILE;
      const r = (move.radius ?? (sword ? 0.3 : 0.35)) * UNIT;
      const striker = !sword && !move.all;
      const dir = move.behind ? -1 : 1;
      const setName = s.move()!.points;
      const at = move.points.map((p, index) => this.robot.pointsOn(p.file, p.x, p.y).map((q) => ({ ...q, index, file: p.file })));
      const placed = striker ? [at.flat().sort((u, v) => dir * (v.x - u.x))[0]] : move.all ? at.flat() : at.map((l) => l[0]);
      const chosen = new Set(placed.filter(Boolean));
      for (const q of at.flat()) {
        const on = chosen.has(q);
        this.circles.push({ x: q.x, y: q.y, r, set: setName, index: q.index, file: q.file });
        const hot = this.hover === `p${q.index}`;
        if (on && active) g.fillStyle(HIT, 0.28).fillCircle(q.x, q.y, r);
        g.lineStyle(line(on ? 2 : 1), HIT, on ? (active ? 1 : 0.45) : 0.3).strokeCircle(q.x, q.y, r);
        g.fillStyle(hot ? 0xffffff : HIT, 1).fillCircle(q.x, q.y, line(3.5));
      }
      // The launch direction from the striking circle.
      const c = placed.find(Boolean);
      if (c) {
        const a = Phaser.Math.DegToRad(move.launch.angle);
        const len = (0.4 + move.launch.knockback / 20) * UNIT;
        const ex = c.x + Math.cos(a) * len * (move.behind ? -1 : 1); const ey = c.y - Math.sin(a) * len;
        g.lineStyle(line(2), HIT, active ? 1 : 0.35).lineBetween(c.x, c.y, ex, ey);
        if (move.both) g.lineBetween(c.x, c.y, c.x - (ex - c.x), ey);
        g.fillStyle(HIT, active ? 1 : 0.35).fillCircle(ex, ey, line(4));
      }
    }

    // The dummy, flashing when an active circle overlaps its hurtbox.
    this.dummy.visible = this.view.dummy;
    if (this.view.dummy) {
      const dx = this.view.dummyX * UNIT;
      const box = new Phaser.Geom.Rectangle(dx - hw / 2, -hh, hw, hh);
      const hit = active && this.circles.some((c) => Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(c.x, c.y, c.r), box));
      const idle = sampleClip(CLIPS.idle, 0);
      this.dummy.update({ ...idle, y: (idle.y ?? 0) + this.rig.groundLift(idle) }, [], dx, 0, 180, { ...fx, flash: hit, alpha: 0.85 });
      g.lineStyle(line(1), hit ? HIT : HURT, hit ? 1 : 0.5).strokeRect(box.x, box.y, box.width, box.height);
    }

    // This frame's particle events: a purple diamond where each starts (drag to move it on its part).
    this.eventPoints = [];
    const tol = FRAME_MS / 2 / s.playMs;
    (s.clipData.events ?? []).forEach((e, index) => {
      if (Math.abs(e.t - t) > tol && !(e.charge && this.charging)) return;
      const bx = s.clip.rootMotion ? (pose.x ?? 0) * ART_SCALE : 0;
      const at = EventPlayer.where(e, this.robot, { x: bx, y: 0 });
      this.eventPoints.push({ ...at, index });
      const r = line(this.hover === `e${index}` ? 8 : 6);
      g.fillStyle(EVENT, 1).fillPoints([{ x: at.x, y: at.y - r }, { x: at.x + r, y: at.y }, { x: at.x, y: at.y + r }, { x: at.x - r, y: at.y }], true);
    });

    // Bone handles: a dot at each joint, a knob at each bone's end to turn it.
    this.joints = this.solveJoints(pose);
    if (this.view.handles) {
      for (const j of this.joints) {
        const sel = s.sel.bone === j.bone; const hot = this.hover === j.bone;
        g.lineStyle(line(sel ? 3 : 1.5), HANDLE, sel || hot ? 1 : 0.55).lineBetween(j.ox, j.oy, j.tx, j.ty);
        g.fillStyle(sel ? 0xffffff : HANDLE, sel || hot ? 1 : 0.8).fillCircle(j.tx, j.ty, line(sel || hot ? 6 : 4.5));
      }
      const root = this.joints.find((j) => j.bone === 'body');
      if (root) {
        g.lineStyle(line(2), 0xffffff, this.hover === 'root' ? 1 : 0.7).strokeRect(root.ox - line(7), root.oy - line(7), line(14), line(14));
      }
    }
  }

  /** Each bone's origin and end on the stage (bones end at their first child; leaves get a short stub). */
  private solveJoints(pose: Pose): Joint[] {
    const { world, names } = this.rig.solveBones(pose);
    const at = (i: number) => ({ x: -ART_SCALE * world[i].x, y: -ART_SCALE * world[i].y });
    const out: Joint[] = [];
    names.forEach((bone, i) => {
      const o = at(i);
      const child = names.findIndex((n) => PARENT[n] === bone);
      let tx: number; let ty: number;
      const dir = pose[bone] ?? 0;
      if (child >= 0 && bone !== 'body' && bone !== 'torso') ({ x: tx, y: ty } = at(child));
      else {
        const len = (bone === 'head' ? 0.42 : bone === 'body' ? 0.3 : bone === 'torso' ? 0.55 : 0.28) * UNIT;
        // Facing right: dir 0 is +x, 90 is up (screen -y).
        const a = Phaser.Math.DegToRad(dir - (pose.tilt ?? 0) - (pose.spin ?? 0));
        tx = o.x + Math.cos(a) * len; ty = o.y - Math.sin(a) * len;
      }
      out.push({ bone, ox: o.x, oy: o.y, tx, ty, dir });
    });
    return out;
  }

  // ------------------------------------------------------------ input
  private pick(x: number, y: number, touch = false): string | null {
    // Fingers get bigger targets.
    const z = this.cameras.main.zoom / (touch ? 2 : 1);
    const near = (px: number, py: number, r: number) => Math.hypot(px - x, py - y) <= r / z;
    if (this.view.handles) {
      const root = this.joints.find((j) => j.bone === 'body');
      if (root && near(root.ox, root.oy, 9)) return 'root';
      let best: string | null = null; let bd = Infinity;
      for (const j of this.joints) {
        const d = Math.hypot(j.tx - x, j.ty - y);
        if (d <= 10 / z && d < bd) { bd = d; best = j.bone; }
      }
      if (best) return best;
    }
    for (const e of this.eventPoints) if (near(e.x, e.y, 9)) return `e${e.index}`;
    for (const c of this.circles) if (near(c.x, c.y, 8)) return `p${c.index}`;
    if (this.view.dummy && Math.abs(x - this.view.dummyX * UNIT) < 0.5 * UNIT && y < 0 && y > -HURTBOX.height * UNIT) return 'dummy';
    return null;
  }

  private down(p: Phaser.Input.Pointer): void {
    const cam = this.cameras.main;
    if (p.rightButtonDown() || p.middleButtonDown()) {
      this.drag = { kind: 'pan', sx: p.x, sy: p.y, cx: cam.midPoint.x, cy: cam.midPoint.y };
      return;
    }
    if (this.startPinch()) return;
    // Outside the Animation tab the robot is only there to look at: the stage just pans.
    const hit = this.mode === 'anim' ? this.pick(p.worldX, p.worldY, p.wasTouch) : null;
    const s = this.store;
    this.pressAt = { x: p.x, y: p.y };
    if (!hit) { this.drag = { kind: 'pan', sx: p.x, sy: p.y, cx: cam.midPoint.x, cy: cam.midPoint.y }; return; }
    this.playing = false;
    if (hit === 'root') {
      const pose = s.keyAt()?.pose ?? sampleClip(s.clip, s.sel.t);
      this.drag = { kind: 'root', sx: p.worldX, sy: p.worldY, x0: pose.x ?? 0, y0: pose.y ?? 0 };
      s.select({ bone: 'body' });
    } else if (hit === 'dummy') {
      this.drag = { kind: 'dummy' };
    } else if (hit.startsWith('e')) {
      this.drag = { kind: 'event', index: Number(hit.slice(1)) };
    } else if (hit.startsWith('p')) {
      const c = this.circles.find((q) => `p${q.index}` === hit)!;
      this.drag = { kind: 'point', set: c.set, index: c.index, file: c.file };
    } else {
      const j = this.joints.find((q) => q.bone === hit)!;
      this.drag = { kind: 'bone', bone: hit as Bone, alone: p.event.shiftKey, off: j.dir - this.dirTo(j, j.tx, j.ty) };
      s.select({ bone: hit });
    }
  }

  private moveTo(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    const s = this.store;
    if (d?.kind === 'pinch') { this.pinch(d); return; }
    if (!d) {
      const h = this.mode === 'anim' ? this.pick(p.worldX, p.worldY, p.wasTouch) : null;
      if (h !== this.hover) { this.hover = h; this.game.canvas.style.cursor = h ? 'grab' : 'default'; }
      return;
    }
    // A drag only edits once it really moves: a tap or a resting finger changes nothing.
    if (d.kind !== 'pan' && this.pressAt && Math.hypot(p.x - this.pressAt.x, p.y - this.pressAt.y) < (p.wasTouch ? 10 : 4)) return;
    this.pressAt = null;
    if (d.kind === 'pan') {
      const cam = this.cameras.main;
      cam.centerOn(d.cx - (p.x - d.sx) / cam.zoom, d.cy - (p.y - d.sy) / cam.zoom);
      this.drawGrid();
      return;
    }
    if (d.kind === 'dummy') { this.view.dummyX = Math.round((p.worldX / UNIT) * 20) / 20; return; }
    if (d.kind === 'event') {
      const e = s.clipData.events?.[d.index];
      const share = e && e.part !== 'ground' ? this.robot.shareOnPart(e.part, p.worldX, p.worldY) : null;
      if (!share) return;
      s.edit('clips', (docs) => {
        const ev = docs.clips[s.sel.clip].events![d.index];
        ev.x = Math.round(share.x * 100) / 100; ev.y = Math.round(share.y * 100) / 100;
      }, true);
      return;
    }
    if (d.kind === 'point') {
      const local = this.robot.pointIn(d.file, p.worldX, p.worldY);
      if (!local) return;
      s.edit('moves', (docs) => {
        const pt = docs.moves.pointSets[d.set][d.index];
        pt.x = Math.round(local.x * 10) / 10; pt.y = Math.round(local.y * 10) / 10;
      }, true);
      return;
    }
    if (d.kind === 'root') {
      const dx = (p.worldX - d.sx) / ART_SCALE; const dy = -(p.worldY - d.sy) / ART_SCALE;
      this.editPose((pose) => { pose.x = Math.round(d.x0 + dx); pose.y = Math.round(d.y0 + dy); });
      return;
    }
    // Turning a bone: point its end at the pointer; its children turn with it unless Shift is held.
    const j = this.joints.find((q) => q.bone === d.bone);
    if (!j) return;
    const want = this.dirTo(j, p.worldX, p.worldY) + d.off;
    this.editPose((pose) => {
      const old = pose[d.bone] ?? 0;
      let delta = Phaser.Math.Angle.WrapDegrees(want - old);
      delta = Math.round(delta);
      pose[d.bone] = old + delta;
      if (!d.alone) for (const c of descendants(d.bone)) pose[c] = (pose[c] ?? 0) + delta;
    });
  }

  /** A bone direction (pose degrees, facing right) from a joint towards a stage point. */
  private dirTo(j: Joint, x: number, y: number): number {
    const pose = this.poseAt(this.store.sel.t);
    return Phaser.Math.RadToDeg(Math.atan2(-(y - j.oy), x - j.ox)) + (pose.tilt ?? 0) + (pose.spin ?? 0);
  }

  private up(): void {
    if (this.drag && this.drag.kind !== 'pan' && this.drag.kind !== 'pinch') this.store.endDrag();
    // Lifting one of two fingers ends the pinch; the other finger does nothing until lifted.
    this.drag = null;
  }

  /** Two fingers down: drop whatever the first one was doing and pinch instead. */
  private startPinch(): boolean {
    const a = this.input.pointer1; const b = this.input.pointer2;
    if (!a.isDown || !b.isDown) return false;
    if (this.drag && this.drag.kind !== 'pan') this.store.endDrag();
    const cam = this.cameras.main;
    const mid = cam.getWorldPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
    this.drag = { kind: 'pinch', dist: Math.max(1, Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y)), zoom: cam.zoom, wx: mid.x, wy: mid.y };
    return true;
  }

  /** Zooms by the fingers' spread and keeps the stage point first under them between them. */
  private pinch(d: Extract<Drag, { kind: 'pinch' }>): void {
    const a = this.input.pointer1; const b = this.input.pointer2;
    if (!a.isDown || !b.isDown) return;
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(d.zoom * Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / d.dist, 0.4, 6));
    cam.preRender();
    const mid = cam.getWorldPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
    cam.scrollX += d.wx - mid.x; cam.scrollY += d.wy - mid.y;
    this.drawGrid();
  }

  /** Edits the pose of the key at the current time, adding a key there first if there is none. */
  editPose(fn: (pose: Pose) => void, drag = true): void {
    const s = this.store;
    s.edit('clips', (docs) => {
      const clip = docs.clips[s.sel.clip];
      const tol = FRAME_MS / 2 / s.playMs;
      let key = clip.keys.find((k) => Math.abs(k.t - s.sel.t) <= tol);
      if (!key) {
        const t = Math.round(s.sel.t * 1000) / 1000;
        key = { t, ease: 'inOut', pose: { ...sampleClip(CLIPS[s.sel.clip], s.sel.t) } };
        for (const b of Object.keys(key.pose) as (keyof Pose)[]) key.pose[b] = Math.round((key.pose[b] ?? 0) * 10) / 10;
        clip.keys.push(key);
        clip.keys.sort((a, b) => a.t - b.t);
      }
      fn(key.pose);
    }, drag);
  }
}
