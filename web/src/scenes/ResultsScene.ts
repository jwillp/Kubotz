import Phaser from 'phaser';
import { UNIT } from '../config';
import { SpriterData } from '../spriter/Spriter';
import { Rig } from '../anim/Rig';
import { Robot2D } from '../anim/Robot2D';
import { mixPoses } from '../anim/Clips';
import { hex, partTexture } from '../game/Kubotz';
import { ImpactFx } from '../fx/Impact';
import { GradePipeline } from '../fx/Grade';
import type { FighterStats, KoReplay, MatchResult, ReplayFrame, RobotFrame } from '../game/Match';
import { BODY_FAMILY, heading } from '../ui/Type';
import { sfxVolume } from '../game/Settings';

/** Light2D pool for the recorded lights (the match uses up to 36). */
const LIGHT_POOL = 36;

/** The stats table's columns; `good` ones light up their best value. */
const COLUMNS: { label: string; good: boolean; get: (s: FighterStats) => number }[] = [
  { label: 'K.O.s', good: true, get: (s) => s.kos },
  { label: 'FALLS', good: false, get: (s) => s.falls },
  { label: 'DAMAGE DEALT', good: true, get: (s) => Math.round(s.damageDealt) },
  { label: 'DAMAGE TAKEN', good: false, get: (s) => Math.round(s.damageTaken) },
  { label: 'HITS', good: true, get: (s) => s.hits },
  { label: 'BEST COMBO', good: true, get: (s) => s.longestCombo },
];

/**
 * Replay speed around the blow (`d` = replay time minus the blow, ms): the
 * run-up fast, easing into slow motion just before the blow, holding it
 * through the hit, then back to normal speed for the flight and the K.O.
 */
export function replayRate(d: number): number {
  const ease = (a: number, b: number, from: number, to: number) => {
    const f = Phaser.Math.Clamp((d - from) / (to - from), 0, 1);
    return a + (b - a) * f * f * (3 - 2 * f);
  };
  if (d < -200) return ease(FAST, SLOW, -1000, -200);
  if (d < 350) return SLOW;
  return ease(SLOW, 1, 350, 900);
}
const FAST = 2.4;
const SLOW = 0.2;

const FONT = BODY_FAMILY;
const css = (c: number) => '#' + hex(c);

interface Piece { img: Phaser.GameObjects.Image; vx: number; vy: number; spin: number; age: number }

/**
 * After the match (phase 11 D): every robot's numbers in its colour, then
 * each K.O. replayed in order over the arena art, the frames before it fast,
 * slowing to slow motion at the blow. Continue goes back to the title.
 *
 * Three cameras: the backdrop, the arena (the replay camera, as recorded)
 * and the screen texts over both.
 */
export class ResultsScene extends Phaser.Scene {
  private result!: MatchResult;
  private worldCam!: Phaser.Cameras.Scene2D.Camera;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private backCam!: Phaser.Cameras.Scene2D.Camera;
  private robots: Robot2D[] = [];
  private tags: Phaser.GameObjects.Text[] = [];
  private statsPanel!: Phaser.GameObjects.Container;
  private replayUi!: Phaser.GameObjects.Container;
  private replayTitle!: Phaser.GameObjects.Text;
  private replaySpeed!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;
  private lightPool: Phaser.GameObjects.Light[] = [];
  private impact!: ImpactFx;
  /** The last frame whose sounds and effects went off. */
  private fired = -1;
  private flash!: Phaser.GameObjects.Graphics;
  private pieces: Piece[] = [];
  /** Which replay plays (-1: the stats are up), its clock, its frame cursor, and whether its K.O. burst went off. */
  private current = -1;
  private tau = 0;
  private cursor = 0;
  private burst = false;
  private holdUntil = 0;
  private seenReplays = false;
  private autoReplayAt = 0;
  /** Presses on the stats count from then (a mashed button does not skip the screen). */
  private statsReadyAt = 0;

  constructor() { super('Results'); }

  init(result: MatchResult): void {
    this.result = result;
    this.robots = [];
    this.tags = [];
    this.pieces = [];
    this.current = -1;
    this.seenReplays = result.replays.length === 0;
    this.lightPool = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const r = this.result;
    this.backCam = this.cameras.main;
    this.worldCam = this.cameras.add(0, 0, width, height);
    this.uiCam = this.cameras.add(0, 0, width, height);

    // Backdrop: the blurred room, dimmed like the match's.
    const bgKey = this.textures.exists('bg-blur') ? 'bg-blur' : 'bg';
    const bg = this.add.image(width / 2, height / 2, bgKey);
    bg.setScale(Math.max(width / bg.width, height / bg.height) * 1.1).setTint(0x6878a0, 0x6878a0, 0x26304a, 0x26304a);
    this.only(this.backCam, bg);

    // The arena as the match drew it (its textures stay until the next match builds its own).
    // Lit like the match: its ambient, and every light it had on, frame by frame (key, rim, platforms, lasers, hits).
    if (this.sys.renderer.type === Phaser.WEBGL) {
      this.lights.enable().setAmbientColor(0x64709a);
      for (let i = 0; i < LIGHT_POOL; i++) this.lightPool.push(this.lights.addLight(0, 0, UNIT, 0xffffff, 0).setVisible(false));
      // The match's grade pass (vignette, split tone, grain, scanlines) on the replay.
      if (!new URLSearchParams(location.search).has('lowfx')) {
        const pipelines = (this.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
        if (!pipelines.postPipelineClasses.has('Grade')) pipelines.addPostPipeline('Grade', GradePipeline);
        this.worldCam.setPostPipeline(GradePipeline);
      }
    }
    const lit = <T extends Phaser.GameObjects.Image>(o: T) => (this.sys.renderer.type === Phaser.WEBGL ? o.setPipeline('Light2D') : o);
    if (r.hull && this.textures.exists('arena-hull')) this.only(this.worldCam, lit(this.add.image(-12 * UNIT, -12 * UNIT, 'arena-hull').setOrigin(0, 0).setScale(2).setDepth(1.9)));
    if (this.textures.exists('arena')) this.only(this.worldCam, lit(this.add.image(0, 0, 'arena').setOrigin(0, 0).setDepth(2)));
    if (this.textures.exists('arena-glow')) this.only(this.worldCam, this.add.image(0, 0, 'arena-glow').setOrigin(0, 0).setDepth(2.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7));

    const rig = new Rig(this.registry.get('spriter') as SpriterData);
    r.colors.forEach((color, i) => {
      const robot = new Robot2D(this, rig, (file) => partTexture(this.textures, file, color));
      robot.visible = false;
      this.only(this.worldCam, robot.view);
      this.robots.push(robot);
      const tag = this.add.text(0, 0, r.names[i], { fontFamily: FONT, fontStyle: '800', fontSize: '20px', color: css(color), stroke: '#000000', strokeThickness: 5 })
        .setOrigin(0.5, 1).setDepth(21).setVisible(false);
      this.only(this.worldCam, tag);
      this.tags.push(tag);
    });
    this.flash = this.add.graphics().setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    this.only(this.worldCam, this.flash);
    // Hit sparks, rings and dust replayed from the match's calls.
    const before = new Set(this.children.list);
    this.impact = new ImpactFx(this);
    for (const o of this.children.list) if (!before.has(o)) this.only(this.worldCam, o);

    this.buildStats();
    this.buildReplayUi();

    const kb = this.input.keyboard!;
    for (const key of ['ENTER', 'SPACE', 'O', 'J', 'COMMA', 'NUMPAD_ONE']) kb.on(`keydown-${key}`, () => this.press());
    kb.on('keydown-ESC', () => { if (this.current >= 0) this.showStats(); });
    kb.on('keydown-R', () => { if (this.current < 0 && this.result.replays.length > 0) this.startReplay(0); });
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0 || button.index === 1 || button.index === 9) this.press();
    });
    this.showStats();
    this.autoReplayAt = 0; // timed from the first update
  }

  /** Shows an object on one camera only. */
  private only(cam: Phaser.Cameras.Scene2D.Camera, obj: Phaser.GameObjects.GameObject): void {
    for (const c of [this.backCam, this.worldCam, this.uiCam]) if (c !== cam) c.ignore(obj);
  }

  // ------------------------------------------------------------------ stats
  private buildStats(): void {
    const { width, height } = this.scale;
    const r = this.result;
    const c = this.statsPanel = this.add.container(0, 0).setDepth(50);
    this.only(this.uiCam, c);
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x050b18, 0.82));
    const winners = r.winnerTeam === null ? [] : r.fighters.map((f, i) => (f.team === r.winnerTeam ? i : -1)).filter((i) => i >= 0);
    const winColor = winners.length ? r.colors[winners[0]] : 0x29abe2;
    const title = winners.length ? `${winners.map((i) => r.names[i]).join(' & ')} ${winners.length > 1 ? 'WIN' : 'WINS'}!` : 'DRAW';
    c.add(heading(this, width / 2, 70, title.replace(/&/g, 'and'), 72, { glow: winColor }));
    const secs = Math.round(r.duration / 1000);
    c.add(this.add.text(width / 2, 130, `Match time ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}  ·  ${r.replays.length} K.O.${r.replays.length === 1 ? '' : 's'}`, {
      fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '20px', color: '#9fe3ff',
    }).setOrigin(0.5));

    // One row per robot, the numbers in its colour; the best of each column is lit.
    const x0 = 120; const nameW = 260; const colW = (width - 2 * x0 - nameW) / COLUMNS.length;
    const top = 200;
    const rowH = Math.min(84, 380 / Math.max(1, r.names.length));
    COLUMNS.forEach((col, j) => c.add(this.add.text(x0 + nameW + colW * (j + 0.5), top, col.label, {
      fontFamily: FONT, fontStyle: '800', fontSize: '15px', color: '#8fb4d8',
    }).setOrigin(0.5)));
    const best = COLUMNS.map((col) => Math.max(...r.stats.map((s) => col.get(s))));
    r.names.forEach((name, i) => {
      const y = top + 50 + i * rowH;
      const color = r.colors[i];
      const row = this.add.container(0, y);
      const won = winners.includes(i);
      row.add(this.add.rectangle(width / 2, 0, width - 2 * x0 + 40, rowH - 10, color, won ? 0.28 : 0.14).setStrokeStyle(2, color, won ? 0.9 : 0.4));
      const label = r.tags?.[i] ?? `label-${r.fighters[i].input}:${hex(color)}`;
      if (this.textures.exists(label)) row.add(this.add.image(x0 + 22, 0, label).setScale(0.34));
      row.add(this.add.text(x0 + 52, 0, name, { fontFamily: FONT, fontStyle: '800', fontSize: '28px', color: css(color), stroke: '#000000', strokeThickness: 5 }).setOrigin(0, 0.5));
      if (won) row.add(this.add.text(x0 + 52 + 12 + name.length * 19, 0, 'WINNER', { fontFamily: FONT, fontStyle: '800', fontSize: '13px', color: '#ffe066' }).setOrigin(0, 0.5));
      COLUMNS.forEach((col, j) => {
        const v = col.get(r.stats[i]);
        const top1 = col.good && v > 0 && v === best[j];
        row.add(this.add.text(x0 + nameW + colW * (j + 0.5), 0, String(v), {
          fontFamily: FONT, fontStyle: '800', fontSize: top1 ? '30px' : '26px', color: top1 ? '#ffffff' : '#c8d8ea', stroke: css(color), strokeThickness: top1 ? 4 : 0,
        }).setOrigin(0.5));
      });
      row.setAlpha(0).setX(-60);
      this.tweens.add({ targets: row, x: 0, alpha: 1, duration: 380, delay: 250 + i * 140, ease: 'Cubic.out' });
      c.add(row);
    });
    this.footer = this.add.text(width / 2, height - 70, '', { fontFamily: FONT, fontStyle: '800', fontSize: '26px', color: '#ffffff', stroke: '#29abe2', strokeThickness: 6 })
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.press());
    this.tweens.add({ targets: this.footer, scale: 1.05, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    c.add(this.footer);
  }

  private showStats(): void {
    if (this.current >= 0) this.seenReplays = true;
    this.current = -1;
    for (const k of this.robots) k.visible = false;
    for (const t of this.tags) t.setVisible(false);
    this.clearPieces();
    this.replayUi.setVisible(false);
    this.statsPanel.setVisible(true);
    this.statsReadyAt = Infinity; // set on the next update: the press that brought the stats up is ignored
    this.footer.setText(this.seenReplays
      ? `CONTINUE${this.result.replays.length ? '   ·   R: watch the K.O.s again' : ''}`
      : 'Attack / Enter: watch the K.O.s');
  }

  private press(): void {
    if (this.current >= 0) { this.nextReplay(); return; }
    if (this.time.now < this.statsReadyAt) return;
    if (!this.seenReplays) { this.startReplay(0); return; }
    this.scene.start('Title');
  }

  // ---------------------------------------------------------------- replays
  private buildReplayUi(): void {
    const { width, height } = this.scale;
    const c = this.replayUi = this.add.container(0, 0).setDepth(40).setVisible(false);
    this.only(this.uiCam, c);
    // Letterbox bars, the K.O. line and a REPLAY mark.
    c.add(this.add.rectangle(width / 2, 34, width, 68, 0x000000, 0.72));
    c.add(this.add.rectangle(width / 2, height - 26, width, 52, 0x000000, 0.72));
    this.replayTitle = this.add.text(width / 2, 34, '', { fontFamily: FONT, fontStyle: '800', fontSize: '30px', color: '#ffffff', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5);
    const rec = this.add.text(28, height - 26, '● REPLAY', { fontFamily: FONT, fontStyle: '800', fontSize: '20px', color: '#ff5252' }).setOrigin(0, 0.5);
    this.tweens.add({ targets: rec, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
    this.replaySpeed = this.add.text(width - 28, height - 26, '', { fontFamily: FONT, fontStyle: '800', fontSize: '20px', color: '#9fe3ff' }).setOrigin(1, 0.5);
    const skip = this.add.text(width / 2, height - 26, 'Attack / Enter: next  ·  Esc: back to the stats', { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '17px', color: '#cfe9ff' }).setOrigin(0.5);
    c.add([this.replayTitle, rec, this.replaySpeed, skip]);
  }

  private startReplay(i: number): void {
    const ko = this.result.replays[i];
    if (!ko) { this.showStats(); return; }
    this.current = i;
    this.tau = ko.frames[0].t;
    this.cursor = 0;
    this.fired = -1;
    this.burst = false;
    this.holdUntil = 0;
    this.clearPieces();
    this.statsPanel.setVisible(false);
    this.replayUi.setVisible(true);
    const r = this.result;
    const line = ko.killer !== null ? `${r.names[ko.killer]} K.O.'d ${r.names[ko.victim]}` : `${r.names[ko.victim]} fell`;
    this.replayTitle.setText(`K.O. ${i + 1}/${r.replays.length}   ${line}`)
      .setStroke(css(ko.killer !== null ? r.colors[ko.killer] : r.colors[ko.victim]), 6);
  }

  private nextReplay(): void {
    if (this.current + 1 < this.result.replays.length) this.startReplay(this.current + 1);
    else this.showStats();
  }

  update(time: number, delta: number): void {
    if (this.current < 0) {
      if (this.statsReadyAt === Infinity) this.statsReadyAt = time + 600;
      if (this.autoReplayAt === 0) this.autoReplayAt = time + 4500;
      if (!this.seenReplays && time >= this.autoReplayAt) this.startReplay(0);
      return;
    }
    const ko = this.result.replays[this.current];
    const frames = ko.frames;
    const last = frames[frames.length - 1].t;
    const rate = replayRate(this.tau - ko.blow);
    const step = Math.min(delta, 50) * rate;
    if (this.tau >= last) {
      if (this.holdUntil === 0) this.holdUntil = time + 700;
      if (time >= this.holdUntil) { this.nextReplay(); return; }
    } else this.tau = Math.min(last, this.tau + step);
    this.replaySpeed.setText(rate < 0.99 || rate > 1.01 ? `${rate >= 1 ? rate.toFixed(1) : rate.toFixed(2)}x` : '1x');

    while (this.cursor < frames.length - 2 && frames[this.cursor + 1].t <= this.tau) this.cursor++;
    // Sounds and effects of every frame passed, sounds pitched with the replay speed.
    const upTo = this.tau >= last ? frames.length - 1 : this.cursor;
    while (this.fired < upTo) this.fire(frames[++this.fired], rate);
    this.impact.update(this.tau, step);
    const a = frames[this.cursor];
    const b = frames[Math.min(frames.length - 1, this.cursor + 1)];
    const f = b.t > a.t ? Phaser.Math.Clamp((this.tau - a.t) / (b.t - a.t), 0, 1) : 0;
    const L = Phaser.Math.Linear;
    const cam = this.worldCam;
    cam.setZoom(L(a.zoom, b.zoom, f)).setRotation(L(a.rotation, b.rotation, f));
    cam.centerOn(L(a.camX, b.camX, f), L(a.camY, b.camY, f));
    this.setLights(a);
    // The K.O.: the victim bursts apart (before it disappears from the frames).
    if (!this.burst && this.tau >= ko.at) {
      this.burst = true;
      this.explode(ko);
    }
    a.robots.forEach((ra, i) => this.drawRobot(i, ra, b.robots[i], f, step, cam.zoom));
    this.updatePieces(step);
  }

  private fire(frame: ReplayFrame, rate: number): void {
    for (const e of frame.events ?? []) {
      if (e.kind === 'sfx') {
        if (this.cache.audio.exists(e.key)) this.sound.play(e.key, { volume: sfxVolume(e.volume), detune: e.detune, rate: Phaser.Math.Clamp(rate, 0.45, 1.3) });
      } else {
        const fx = (this.impact as unknown as Record<string, (...a: number[]) => void>)[e.method];
        fx?.apply(this.impact, e.args);
      }
    }
  }

  private setLights(frame: ReplayFrame): void {
    const l = frame.lights ?? [];
    this.lightPool.forEach((light, i) => {
      const o = i * 5;
      if (o >= l.length) { light.setVisible(false); return; }
      light.setVisible(true).setPosition(l[o], l[o + 1]).setRadius(l[o + 2]).setColor(l[o + 3]).setIntensity(l[o + 4]);
    });
  }

  private drawRobot(i: number, ra: RobotFrame, rb: RobotFrame, f: number, dtMs: number, zoom: number): void {
    const robot = this.robots[i];
    const tag = this.tags[i];
    if (!ra.visible) { robot.visible = false; tag.setVisible(false); return; }
    const both = rb.visible;
    const L = (x: number, y: number) => (both ? x + (y - x) * f : x);
    const pose = both ? mixPoses(ra.pose, rb.pose, f) : ra.pose;
    robot.visible = true;
    const bottom = L(ra.bottom, rb.bottom);
    robot.update(pose, ra.maps, L(ra.x, rb.x), bottom, L(ra.yaw, rb.yaw), {
      dtMs, lean: L(ra.lean, rb.lean), squash: L(ra.squash, rb.squash), alpha: ra.alpha, flash: ra.flash,
    });
    tag.setVisible(true).setPosition(L(ra.x, rb.x), bottom - 2.9 * UNIT).setScale(1 / zoom);
  }

  private explode(ko: KoReplay): void {
    const robot = this.robots[ko.victim];
    const color = this.result.colors[ko.victim];
    const lit = (o: Phaser.GameObjects.Image) => (this.sys.renderer.type === Phaser.WEBGL ? o.setPipeline('Light2D') : o);
    let cx = 0; let cy = 0;
    const parts = robot.view.visible ? robot.pieces() : [];
    for (const p of parts) { cx += p.x / parts.length; cy += p.y / parts.length; }
    for (const p of parts) {
      const img = lit(this.add.image(p.x, p.y, p.key)).setOrigin(p.originX, p.originY).setScale(p.scaleX, p.scaleY).setAngle(p.angle).setDepth(11);
      this.only(this.worldCam, img);
      let dx = p.x - cx + Phaser.Math.FloatBetween(-8, 8);
      let dy = p.y - cy - 18 + Phaser.Math.FloatBetween(-8, 8);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const speed = Phaser.Math.FloatBetween(11, 21) * UNIT;
      this.pieces.push({ img, vx: dx * speed, vy: dy * speed - 6 * UNIT, spin: Phaser.Math.FloatBetween(-600, 600), age: 0 });
    }
    if (parts.length) {
      this.flash.clear().fillStyle(color, 0.55).fillCircle(cx, cy, 2.4 * UNIT).fillStyle(0xffffff, 0.8).fillCircle(cx, cy, 1.1 * UNIT);
      this.flash.setAlpha(1);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 900 });
    }
    if (this.cache.audio.exists('boom')) this.sound.play('boom', { volume: sfxVolume(0.5), rate: 0.6 });
  }

  private updatePieces(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const p of this.pieces) {
      p.age += dtMs;
      p.vy += 30 * UNIT * dt;
      p.img.setPosition(p.img.x + p.vx * dt, p.img.y + p.vy * dt).setAngle(p.img.angle + p.spin * dt).setAlpha(Math.max(0, 1 - p.age / 2500));
    }
  }

  private clearPieces(): void {
    for (const p of this.pieces) p.img.destroy();
    this.pieces = [];
    this.flash?.clear();
  }
}
