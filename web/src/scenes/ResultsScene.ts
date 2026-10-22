import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { SpriterData } from '../spriter/Spriter';
import { Rig } from '../anim/Rig';
import { Robot2D } from '../anim/Robot2D';
import { ArenaPerspective, look25 } from '../map/Perspective';
import { mixPoses } from '../anim/Clips';
import { hex, partTexture } from '../game/Kubotz';
import { ImpactFx, drawBlade } from '../fx/Impact';
import { EffectDef, ParticleFx } from '../fx/ParticleEffect';
import { PortalFx } from '../fx/Portals';
import { GradePipeline, pureAdd, setPass } from '../fx/Grade';
import { HOLO_COLOR, clearHolo, drawSpawn, holoPiece, holoRobot } from '../fx/Hologram';
import { backdropOf } from '../fx/Backdrops';
import { POWER_UPS, type PowerUpType } from '../game/PowerUps';
import type { FighterStats, HighlightKind, MatchResult, Prop, ReplayFrame, RobotFrame } from '../game/Match';
import { BODY_FAMILY, HeadingText, heading } from '../ui/Type';
import { drawPlate, drawStrip, shutter } from '../ui/Plate';
import { MenuInput } from './MenuInput';
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
 * Replay speed around a highlight's focus (`d` = replay time minus the focus,
 * ms). A K.O.: the run-up fast, easing into slow motion just before the blow,
 * holding it through the hit, then normal speed for the flight. A combo plays
 * its hits at normal speed and slows down for the last one; a recovery slows
 * down around its closest call.
 */
export function replayRate(d: number, kind: HighlightKind = 'ko'): number {
  const ease = (a: number, b: number, from: number, to: number) => {
    const f = Phaser.Math.Clamp((d - from) / (to - from), 0, 1);
    return a + (b - a) * f * f * (3 - 2 * f);
  };
  const [fast, slow, into, hold, out] = kind === 'ko' ? [2.4, 0.2, 800, 350, 550] : kind === 'combo' ? [1, 0.3, 250, 300, 400] : [1.3, 0.35, 500, 300, 500];
  if (d < -200) return ease(fast, slow, -200 - into, -200);
  if (d < hold) return slow;
  return ease(slow, 1, hold, hold + out);
}

/** The highlights' sections, in the order they play. */
const SECTIONS: Record<HighlightKind, { title: string; one: string }> = {
  ko: { title: 'TOP K.O.s', one: 'K.O.' },
  recovery: { title: 'BEST RECOVERIES', one: 'RECOVERY' },
  combo: { title: 'BEST COMBOS', one: 'COMBO' },
};
/** How long a section's title card holds (ms). */
const CARD_MS = 1400;
/** The Kubotz not in a highlight stay in the shadows: their parts darkened, a little see-through, their tags, blades and trails faint. */
const OUT_SHADE = 0x4a5064;
const OUT_ALPHA = 0.7;
const OUT_FAINT = 0.3;

const FONT = BODY_FAMILY;
const css = (c: number) => '#' + hex(c);

/**
 * After the match (phase 11 D): every robot's numbers in its colour, then the
 * match's highlights replayed: the best K.O.s, recoveries and combos, each
 * kind counting down to its best, each slowing to slow motion at its key
 * moment. Continue goes back to the title.
 *
 * The replay is drawn like the match: its backdrop scene behind (the arena's
 * room, drifting with the replay camera), the arena lit by the recorded
 * lights, the robots, and every effect and image the match drew (sparks,
 * smoke, blades, swing trails, bolts, power-up balls, debris, portals, glows).
 * Two cameras: the arena (the replay camera, as recorded) and the screen
 * texts over it.
 */
export class ResultsScene extends Phaser.Scene {
  private result!: MatchResult;
  private worldCam!: Phaser.Cameras.Scene2D.Camera;
  /** The arena's perspective faces (2.5D exploration), following the replay camera. */
  private perspective: ArenaPerspective | null = null;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private robots: Robot2D[] = [];
  private tags: Phaser.GameObjects.Image[] = [];
  private statsPanel!: Phaser.GameObjects.Container;
  private replayUi!: Phaser.GameObjects.Container;
  private replayTitle!: Phaser.GameObjects.Text;
  private replaySpeed!: Phaser.GameObjects.Text;
  /** A section's title card ("TOP K.O.s"), shown before its first highlight. */
  private card!: Phaser.GameObjects.Container;
  private cardTitle!: HeadingText;
  private cardUntil = 0;
  private footer!: Phaser.GameObjects.Text;
  private lightPool: Phaser.GameObjects.Light[] = [];
  private impact!: ImpactFx;
  private particles!: ParticleFx;
  private effects: Record<string, EffectDef> = {};
  private portals: PortalFx | null = null;
  private sabers!: Phaser.GameObjects.Graphics;
  /** The recorded images (debris, bolts, balls, glows), pooled. */
  private props: Phaser.GameObjects.Image[] = [];
  /** The last frame whose sounds and effects went off. */
  private fired = -1;
  private holoG!: Phaser.GameObjects.Graphics;
  private holoAdd!: Phaser.GameObjects.Graphics;
  /** Per robot, the middle of the robot as replayed (where its motes swirl, what its swing trail belongs to). */
  private owners: { x: number; y: number }[] = [];
  /** Which highlight plays (-1: the stats are up), its clock and its frame cursor. */
  private current = -1;
  private tau = 0;
  private cursor = 0;
  private holdUntil = 0;
  /** The robots jump straight to their first pose (no easing in from the last replay's). */
  private snap = true;
  private seenReplays = false;
  private autoReplayAt = 0;
  /** Presses on the stats count from then (a mashed button does not skip the screen). */
  private statsReadyAt = 0;
  private menu?: MenuInput;
  private leaving = false;

  constructor() { super('Results'); }

  /** The camera the backdrop drifts with (BackdropScene). */
  get followCam(): Phaser.Cameras.Scene2D.Camera { return this.worldCam; }

  init(result: MatchResult): void {
    this.result = result;
    this.robots = [];
    this.owners = [];
    this.tags = [];
    this.props = [];
    this.current = -1;
    this.seenReplays = result.highlights.length === 0;
    this.lightPool = [];
    this.perspective = null;
    this.portals = null;
    this.leaving = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const r = this.result;
    // The main camera draws the arena; the match's backdrop scene runs behind it.
    this.worldCam = this.cameras.main;
    this.uiCam = this.cameras.add(0, 0, width, height);
    this.scene.launch('Backdrop', { arena: r.arena, host: 'Results' });
    this.scene.sendToBack('Backdrop');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('Backdrop'));

    // The arena as the match drew it (its textures stay until the next match builds its own).
    // Lit like the match: its ambient, and every light it had on, frame by frame (key, rim, platforms, lasers, hits).
    const mood = backdropOf(r.arena);
    if (this.sys.renderer.type === Phaser.WEBGL) {
      this.lights.enable().setAmbientColor(mood.ambient);
      for (let i = 0; i < LIGHT_POOL; i++) this.lightPool.push(this.lights.addLight(0, 0, UNIT, 0xffffff, 0).setVisible(false));
      // The match's grade on the arena (the backdrop has its own grain).
      if (this.registry.get('screenFx') !== false && !new URLSearchParams(location.search).has('lowfx')) setPass(this, this.worldCam, GradePipeline, true);
    }
    const lit = <T extends Phaser.GameObjects.Image>(o: T) => (this.sys.renderer.type === Phaser.WEBGL ? o.setPipeline('Light2D') : o);
    if (r.hull && this.textures.exists('arena-hull')) lit(this.add.image(-12 * UNIT, -12 * UNIT, 'arena-hull').setOrigin(0, 0).setScale(2).setDepth(1.9));
    if (this.textures.exists('arena')) lit(this.add.image(0, 0, 'arena').setOrigin(0, 0).setDepth(2));
    if (this.textures.exists('arena-glow')) {
      // The emissive layer, breathing like the match's.
      const glow = this.add.image(0, 0, 'arena-glow').setOrigin(0, 0).setDepth(2.5).setBlendMode(pureAdd(this)).setAlpha(0.85);
      this.tweens.add({ targets: glow, alpha: 0.6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    // The blocks' depth faces and lit rims, as the match drew them.
    if (r.blocks?.length) {
      const rims = this.add.graphics().setDepth(2.6).setBlendMode(Phaser.BlendModes.ADD);
      this.perspective = new ArenaPerspective(this, r.blocks, [], rims);
      this.perspective.update(this.worldCam.midPoint);
    }
    if (r.warpZones?.length === 2) this.portals = new PortalFx(this, r.warpZones.map((z) => new Phaser.Geom.Rectangle(z.x, z.y, z.width, z.height)), false);

    const rig = new Rig(this.registry.get('spriter') as SpriterData);
    r.colors.forEach((color, i) => {
      const robot = new Robot2D(this, rig, (file) => partTexture(this.textures, file, color));
      robot.visible = false;
      robot.camera = this.worldCam;
      this.robots.push(robot);
      // The player tag over the robot, as in the match (P1, CPU...).
      const key = r.tags?.[i] ?? `label-${r.fighters[i].input}:${hex(color)}`;
      this.tags.push(this.add.image(0, 0, this.textures.exists(key) ? key : '__DEFAULT').setOrigin(0.5, 1).setDepth(21).setVisible(false));
      this.owners.push({ x: 0, y: 0 });
    });
    // Laser blades, and the spawn holograms (fx/Hologram.ts): the beam over the robot, the projector in front of it.
    this.sabers = this.add.graphics().setDepth(10.5).setBlendMode(Phaser.BlendModes.ADD);
    this.holoAdd = this.add.graphics().setDepth(10.4).setBlendMode(Phaser.BlendModes.ADD);
    this.holoG = this.add.graphics().setDepth(10.5);
    // Hit sparks, rings, dust and smoke replayed from the match's calls.
    this.impact = new ImpactFx(this);
    this.impact.camera = this.worldCam;
    this.impact.solids = (r.blocks ?? []).map((b) => new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height));
    this.particles = new ParticleFx(this, 'pe:');
    this.effects = this.registry.get('effects') ?? {};

    // Everything so far is the arena's; the screen texts go on the other camera.
    for (const o of this.children.list) this.uiCam.ignore(o);
    this.buildStats();
    this.buildReplayUi();
    // Anything made from now on (particles, pooled images, the robots' afterimages) belongs to the arena.
    const onAdd = (o: Phaser.GameObjects.GameObject) => this.uiCam.ignore(o);
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdd);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdd));

    // Keyboard and any pad: A / Enter next or continue, B / Esc back to the stats, Y / R watch again.
    this.menu = new MenuInput({
      confirm: () => this.press(),
      back: () => { if (this.current >= 0) this.showStats(); },
      quit: () => this.rewatch(),
    }, false, { confirm: ['A', 9], back: ['B'], quit: [3] });
    const kb = this.input.keyboard!;
    // The players' attack keys continue too.
    for (const key of ['O', 'J', 'COMMA', 'NUMPAD_ONE']) kb.on(`keydown-${key}`, () => this.press());
    kb.on('keydown-R', () => this.rewatch());
    kb.on('keydown-V', () => { look25.on = !look25.on; this.perspective?.update(this.worldCam.midPoint); });
    this.showStats();
    this.autoReplayAt = 0; // timed from the first update
  }

  // ------------------------------------------------------------------ stats
  private buildStats(): void {
    const { width, height } = this.scale;
    const r = this.result;
    const c = this.statsPanel = this.add.container(0, 0).setDepth(50);
    this.worldCam.ignore(c);
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x050b18, 0.82));
    const winners = r.winnerTeam === null ? [] : r.fighters.map((f, i) => (f.team === r.winnerTeam ? i : -1)).filter((i) => i >= 0);
    const winColor = winners.length ? r.colors[winners[0]] : 0x29abe2;
    const title = winners.length ? `${winners.map((i) => r.names[i]).join(' & ')} ${winners.length > 1 ? 'WIN' : 'WINS'}!` : 'DRAW';
    c.add(heading(this, width / 2, 70, title.replace(/&/g, 'and'), 72, { glow: winColor }));
    const secs = Math.round(r.duration / 1000);
    c.add(this.add.text(width / 2, 130, `Match time ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}  ·  ${r.stats.reduce((n, st) => n + st.falls, 0)} K.O.${r.stats.reduce((n, st) => n + st.falls, 0) === 1 ? '' : 's'}`, {
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
      // A Kube plate per robot, a slab and strip in its colour (lit brighter for the winners).
      const rw = width - 2 * x0 + 40;
      const rh = rowH - 10;
      const plate = drawPlate(this.add.graphics(), width / 2 - rw / 2, -rh / 2, rw, rh, { cut: 14, edge: won ? color : undefined });
      plate.fillStyle(color, won ? 0.3 : 0.16).fillRect(width / 2 - rw / 2, -rh / 2 + 14, 6, rh - 14);
      drawStrip(plate, width / 2 - rw / 2, rh / 2, width / 2 + rw / 2 - 14, rh / 2, color, won ? 3 : 1);
      row.add(plate);
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
    this.clearReplay();
    this.replayUi.setVisible(false);
    this.card.setVisible(false);
    this.statsPanel.setVisible(true);
    this.statsReadyAt = Infinity; // set on the next update: the press that brought the stats up is ignored
    this.footer.setText(this.seenReplays
      ? `CONTINUE${this.result.highlights.length ? '   ·   Y / R: watch the highlights again' : ''}`
      : 'A / Enter: watch the highlights');
  }

  private press(): void {
    if (this.leaving) return;
    if (this.current >= 0) { this.nextReplay(); return; }
    if (this.time.now < this.statsReadyAt) return;
    if (!this.seenReplays) { this.startReplay(0); return; }
    this.leaving = true;
    shutter(this, () => this.scene.start('Title'));
  }

  private rewatch(): void {
    if (this.current < 0 && !this.leaving && this.result.highlights.length > 0) this.startReplay(0);
  }

  // ---------------------------------------------------------------- replays
  private buildReplayUi(): void {
    const { width, height } = this.scale;
    const c = this.replayUi = this.add.container(0, 0).setDepth(40).setVisible(false);
    this.worldCam.ignore(c);
    // Letterbox bars, the highlight's line and a REPLAY mark.
    c.add(this.add.rectangle(width / 2, 34, width, 68, 0x000000, 0.72));
    c.add(this.add.rectangle(width / 2, height - 26, width, 52, 0x000000, 0.72));
    this.replayTitle = this.add.text(width / 2, 34, '', { fontFamily: FONT, fontStyle: '800', fontSize: '30px', color: '#ffffff', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5);
    const rec = this.add.text(28, height - 26, '● REPLAY', { fontFamily: FONT, fontStyle: '800', fontSize: '20px', color: '#ff5252' }).setOrigin(0, 0.5);
    this.tweens.add({ targets: rec, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
    this.replaySpeed = this.add.text(width - 28, height - 26, '', { fontFamily: FONT, fontStyle: '800', fontSize: '20px', color: '#9fe3ff' }).setOrigin(1, 0.5);
    const skip = this.add.text(width / 2, height - 26, 'A / Enter: next  ·  B / Esc: back to the stats', { fontFamily: BODY_FAMILY, fontStyle: '500', fontSize: '17px', color: '#cfe9ff' }).setOrigin(0.5);
    c.add([this.replayTitle, rec, this.replaySpeed, skip]);
    // The section card: a dark band across the middle with the section's name.
    const card = this.card = this.add.container(0, 0).setDepth(45).setVisible(false);
    this.worldCam.ignore(card);
    card.add(this.add.rectangle(width / 2, height / 2, width, height, 0x050b18, 0.55));
    card.add(drawPlate(this.add.graphics(), width / 2 - 420, height / 2 - 70, 840, 140, { cut: 18, edge: 0x29abe2 }));
    this.cardTitle = heading(this, width / 2, height / 2, '', 64, { glow: 0x29abe2 });
    card.add(this.cardTitle);
  }

  private startReplay(i: number): void {
    const all = this.result.highlights;
    const h = all[i];
    if (!h) { this.showStats(); return; }
    const first = i === 0 || all[i - 1].kind !== h.kind;
    this.clearReplay();
    this.current = i;
    this.tau = h.frames[0].t;
    this.cursor = 0;
    this.fired = -1;
    this.holdUntil = 0;
    this.snap = true;
    this.statsPanel.setVisible(false);
    this.replayUi.setVisible(true);
    // Each kind opens with its title card over the clip's first frame.
    this.tweens.killTweensOf(this.card);
    this.cardUntil = first ? this.time.now + CARD_MS : 0;
    this.card.setVisible(first).setAlpha(1).setScale(1);
    if (first) {
      this.cardTitle.setText(SECTIONS[h.kind].title);
      this.card.setScale(1.08);
      this.tweens.add({ targets: this.card, scale: 1, duration: 300, ease: 'Back.out' });
      this.tweens.add({ targets: this.card, alpha: 0, delay: CARD_MS - 250, duration: 250 });
    }
    const r = this.result;
    const kind = all.filter((o) => o.kind === h.kind);
    const rank = kind.length - kind.indexOf(h);
    const who = (n: number | null) => (n === null ? '' : r.names[n]);
    const line = h.kind === 'ko'
      ? (h.by !== null ? `${who(h.by)} K.O.'d ${who(h.subject)}` : `${who(h.subject)} fell`) + (h.final ? '  ·  match point' : '')
      : h.kind === 'combo'
        ? `${who(h.by)} on ${who(h.subject)}  ·  ${h.hits} hits, ${Math.round(h.damage ?? 0)}%${h.ko ? '  ·  K.O.' : ''}`
        : `${who(h.subject)} made it back  ·  ${(h.margin ?? 0).toFixed(1)} from the blast zone`;
    const color = h.kind === 'recovery' || h.by === null ? r.colors[h.subject] : r.colors[h.by];
    this.replayTitle.setText(`#${rank} ${SECTIONS[h.kind].one}   ${line}`).setStroke(css(color), 6);
  }

  private nextReplay(): void {
    if (this.current + 1 < this.result.highlights.length) this.startReplay(this.current + 1);
    else this.showStats();
  }

  /** Nothing of the last replay stays: robots, effects, images, lights. */
  private clearReplay(): void {
    for (const k of this.robots) k.visible = false;
    for (const t of this.tags) t.setVisible(false);
    for (const p of this.props) p.setVisible(false);
    this.impact?.clear();
    this.particles?.clear();
    this.owners.forEach((o) => this.impact?.swing(o, null, 0));
    this.sabers?.clear();
    this.holoG?.clear();
    this.holoAdd?.clear();
    for (const l of this.lightPool) l.setVisible(false);
  }

  update(time: number, delta: number): void {
    this.menu?.update(time);
    if (this.current < 0) {
      if (this.statsReadyAt === Infinity) this.statsReadyAt = time + 600;
      if (this.autoReplayAt === 0) this.autoReplayAt = time + 4500;
      if (!this.seenReplays && time >= this.autoReplayAt) this.startReplay(0);
      return;
    }
    const h = this.result.highlights[this.current];
    const frames = h.frames;
    const last = frames[frames.length - 1].t;
    const rate = replayRate(this.tau - h.focus, h.kind);
    // The title card holds the clip on its first frame.
    const carding = time < this.cardUntil;
    if (!carding) this.card.setVisible(false);
    const step = carding ? 0 : Math.min(delta, 50) * rate;
    if (carding) { /* holding */ } else if (this.tau >= last) {
      if (this.holdUntil === 0) this.holdUntil = time + 700;
      if (time >= this.holdUntil) { this.nextReplay(); return; }
    } else this.tau = Math.min(last, this.tau + step);
    this.replaySpeed.setText(rate < 0.99 || rate > 1.01 ? `${rate >= 1 ? rate.toFixed(1) : rate.toFixed(2)}x` : '1x');

    while (this.cursor < frames.length - 2 && frames[this.cursor + 1].t <= this.tau) this.cursor++;
    // Sounds and effects of every frame passed, sounds pitched with the replay speed (each sound once per drawn frame).
    const upTo = this.tau >= last ? frames.length - 1 : this.cursor;
    const played = new Set<string>();
    while (this.fired < upTo) this.fire(frames[++this.fired], rate, played);
    const a = frames[this.cursor];
    const b = frames[Math.min(frames.length - 1, this.cursor + 1)];
    const f = b.t > a.t ? Phaser.Math.Clamp((this.tau - a.t) / (b.t - a.t), 0, 1) : 0;
    const L = Phaser.Math.Linear;
    const cam = this.worldCam;
    const cx = L(a.camX, b.camX, f);
    const cy = L(a.camY, b.camY, f);
    cam.setZoom(L(a.zoom, b.zoom, f)).setRotation(L(a.rotation, b.rotation, f));
    cam.centerOn(cx, cy);
    this.perspective?.update(new Phaser.Math.Vector2(cx, cy));
    this.setLights(a);
    this.holoG.clear();
    this.holoAdd.clear();
    this.sabers.clear();
    a.robots.forEach((ra, i) => this.drawRobot(i, ra, b.robots[i], f, step, cam.zoom, this.tau - a.t));
    this.snap = false;
    this.drawProps(a, b, f);
    this.particles.update(step);
    this.impact.update(this.tau, step);
    this.portals?.update(this.tau, step);
  }

  private fire(frame: ReplayFrame, rate: number, played: Set<string>): void {
    for (const e of frame.events ?? []) {
      if (e.kind === 'sfx') {
        if (played.has(e.key) || !this.cache.audio.exists(e.key)) continue;
        played.add(e.key);
        this.sound.play(e.key, { volume: sfxVolume(e.volume), detune: e.detune, rate: Phaser.Math.Clamp(rate, 0.45, 1.3) });
      } else if (e.kind === 'pe') {
        const def = this.effects[e.name];
        if (def) this.particles.play(def, e.x, e.y, e.tint);
      } else if (e.kind === 'twirl') {
        const o = this.owners[e.robot];
        if (o) this.impact.twirl(o, e.color, e.ms);
      } else {
        const target = (e.on === 'portals' ? this.portals : this.impact) as unknown as Record<string, (...a: number[]) => void> | null;
        target?.[e.method]?.apply(target, e.args);
      }
    }
  }

  private setLights(frame: ReplayFrame): void {
    if (frame.ambient !== undefined && this.lights.active) this.lights.setAmbientColor(frame.ambient);
    const l = frame.lights ?? [];
    this.lightPool.forEach((light, i) => {
      const o = i * 5;
      if (o >= l.length) { light.setVisible(false); return; }
      light.setVisible(true).setPosition(l[o], l[o + 1]).setRadius(l[o + 2]).setColor(l[o + 3]).setIntensity(l[o + 4]);
    });
  }

  /** @param since ms since frame `ra` was recorded (for the spawn hologram's clock) */
  private drawRobot(i: number, ra: RobotFrame, rb: RobotFrame, f: number, dtMs: number, zoom: number, since: number): void {
    const robot = this.robots[i];
    const tag = this.tags[i];
    const owner = this.owners[i];
    if (!ra.visible) {
      robot.visible = false;
      tag.setVisible(false);
      this.impact.swing(owner, null, 0);
      return;
    }
    const h = this.result.highlights[this.current];
    const out = i !== h.subject && i !== h.by;
    const faint = out ? OUT_FAINT : 1;
    const color = out ? Phaser.Display.Color.IntegerToColor(this.result.colors[i]).darken(45).color : this.result.colors[i];
    const both = rb.visible;
    const L = (x: number, y: number) => (both ? x + (y - x) * f : x);
    const pose = both ? mixPoses(ra.pose, rb.pose, f) : ra.pose;
    robot.visible = true;
    const x = L(ra.x, rb.x);
    const bottom = L(ra.bottom, rb.bottom);
    robot.update(pose, ra.maps, x, bottom, L(ra.yaw, rb.yaw), {
      dtMs, lean: L(ra.lean, rb.lean), squash: L(ra.squash, rb.squash), alpha: ra.alpha * (out ? OUT_ALPHA : 1), flash: ra.flash && !out,
      glitch: ra.glitch, shield: ra.shield, snap: this.snap, shade: out ? OUT_SHADE : undefined,
    });
    // The tag over the head, at the same size on screen whatever the zoom (Kubotz.drawOverlay).
    tag.setVisible(true).setPosition(x, bottom - Config.KUBOTZ_HEIGHT * UNIT - UNIT * 0.75 - 6).setScale(0.42 / zoom).setAlpha(faint);
    owner.x = x;
    owner.y = bottom - UNIT;
    // The laser blade, its swing trail, the power-up motes round it.
    if (ra.blade) {
      const [x1, y1, x2, y2] = ra.blade;
      drawBlade(this.sabers, x1, y1, x2, y2, color, 0.9 + 0.1 * Math.sin(this.tau * 0.09 + x), faint);
    }
    const s = ra.swing;
    this.impact.swing(owner, s ? { ox: s[0], oy: s[1], ix: s[2], iy: s[3] } : null, color);
    for (const key of ra.auras ?? []) this.impact.aura(owner, key, POWER_UPS[key as PowerUpType]?.color ?? 0xffffff);
    if (ra.holo) {
      const [age, hx, feet] = ra.holo;
      holoRobot(robot.view, age + since, feet, feet - 2.15 * UNIT, this.worldCam);
      drawSpawn(this.holoG, this.holoAdd, hx, feet, age + since, this.tau);
      this.impact.aura(owner, 'hologram', HOLO_COLOR);
    } else clearHolo(robot.view);
  }

  /** The recorded images: each on a pooled image, moving smoothly when the next frame has it too. */
  private drawProps(a: ReplayFrame, b: ReplayFrame, f: number): void {
    const list = a.props ?? [];
    const next = new Map<number, Prop>();
    for (const p of b.props ?? []) next.set(p[15], p);
    const lit = this.sys.renderer.type === Phaser.WEBGL;
    list.forEach((p, i) => {
      const img = this.props[i] ??= this.add.image(0, 0, '__DEFAULT');
      const [key, frame, x, y, ox, oy, sx, sy, rot, tint, alpha, blend, depth, flags, holo, id] = p;
      const q = next.get(id);
      const L = (u: number, v: number) => (q ? u + (v - u) * f : u);
      if (img.texture.key !== key || img.frame.name !== frame) img.setTexture(key, frame);
      img.setVisible(true).setPosition(L(x, q?.[2] ?? x), L(y, q?.[3] ?? y)).setOrigin(ox, oy).setScale(sx, sy)
        .setRotation(rot).setTint(tint).setAlpha(alpha).setBlendMode(blend).setDepth(depth).setFlipX((flags & 2) !== 0);
      if (lit) {
        if (flags & 1) { if (img.pipeline?.name !== 'Light2D') img.setPipeline('Light2D'); } else if (img.pipeline?.name === 'Light2D') img.resetPipeline();
      }
      if (holo > 0) holoPiece(img, holo, this.worldCam); else clearHolo(img);
    });
    for (let i = list.length; i < this.props.length; i++) this.props[i].setVisible(false);
  }
}
