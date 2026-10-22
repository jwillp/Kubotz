import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { SpriterData } from '../spriter/Spriter';
import { TmxMap, MapObject } from '../map/TmxMap';
import { HumanController, PLAYER_1_KEYS, PLAYER_2_KEYS, Controller } from '../game/Input';
import { CpuController } from '../game/Ai';
import { FEEL_ORDER, setFeel } from '../game/Feel';
import { Kubotz, Damageable, ArenaHooks, Launch, Ledge, SLOT_COLORS } from '../game/Kubotz';
import { PowerUpOrb, randomPowerUp, POWER_UPS } from '../game/PowerUps';
import { Bullet } from '../game/Combat';
import { BONUS_RATES, canHurt, cpuReactionMs, defaultSetup, teamsLeft, type FighterSpec, type MatchResult, type MatchSetup, type RobotFrame } from '../game/Match';
import type { ParticleName } from './BootScene';
import { EffectDef, ParticleFx } from '../fx/ParticleEffect';
import { GradePipeline, pureAdd, screenFxOn, setPass, wantScreenFx } from '../fx/Grade';
import { lit, normalMapFor } from '../fx/NormalMaps';
import { surface } from '../fx/Surface';
import { backdropOf, tintArt } from '../fx/Backdrops';
import { neon, setNeon } from '../fx/Neon';
import { ImpactFx, LASER_SMOKE_MODES, drawBlade, laserSmoke } from '../fx/Impact';
import { PortalFx } from '../fx/Portals';
import { HOLO_COLOR, HoloSpawns } from '../fx/Hologram';
import { PhysicsWorld } from '../physics/Physics';
import { Nav, NavBlock } from '../game/Nav';
import { DebrisField } from '../game/Debris';
import { arenaMap, eachTile } from '../map/ArenaArt';
import { ArenaPerspective, look25 } from '../map/Perspective';
import { Rig } from '../anim/Rig';
import type { DebugState } from './DebugScene';
import type { BackdropScene } from './BackdropScene';
import { addMusic, duckMusic, fx, onSettingsChange, particleCount, sfxVolume } from '../game/Settings';
import { ReplayRecorder, propOf } from '../game/Replay';
import { body } from '../ui/Type';
import { shutter } from '../ui/Plate';
import { uiSound } from '../audio/Sounds';
import { MenuInput } from './MenuInput';

/** The arena: InGameScreen + the gameplay systems that work across entities. */
/** The top and bottom opaque pixel of every other column of an image (pixels from its bottom-left). */
export function opaqueOutline(scene: Phaser.Scene, key: string): number[][] {
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const { data, width: w, height: h } = ctx.getImageData(0, 0, src.width, src.height);
  const pts: number[][] = [];
  for (let x = 0; x < w; x += 2) {
    let top = -1; let bottom = -1;
    for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > 100) { if (top < 0) top = y; bottom = y; }
    if (top >= 0) pts.push([x, h - top], [x, h - 1 - bottom]);
  }
  return pts;
}

/** Fixed blue lights over the platforms (main.ts maxLights must cover these + 2 + the pool). */
const PLATFORM_LIGHTS = 20;

export class GameScene extends Phaser.Scene implements ArenaHooks {
  fighters: Kubotz[] = [];
  private map!: TmxMap;
  physicsWorld!: PhysicsWorld;
  /** Debug mode and its time controls (F3, see DebugScene). */
  readonly debugState: DebugState = { on: false, timeScale: 1, frozen: false, steps: 0, nav: true };
  private glows: Phaser.GameObjects.Image[] = [];
  /** Lightsaber blades: a white-hot core in a coloured glow, drawn over the blade art. */
  private sabers!: Phaser.GameObjects.Graphics;
  /** Light2D: a key light and a rim light that follow the camera, and a pool for lasers, hits and pick-ups. */
  private keyLight: Phaser.GameObjects.Light | null = null;
  private rimLight: Phaser.GameObjects.Light | null = null;
  private pointLights: Phaser.GameObjects.Light[] = [];
  private solids: Phaser.Geom.Rectangle[] = [];
  private blocks: NavBlock[] = [];
  /** 2.5D exploration: the arena's art layers and its perspective blocks (V toggles them). */
  private arenaLayers: Phaser.GameObjects.Image[] = [];
  /** How finely the arena is baked: 1 in a match, less for the setup screen's preview (shown small and blurred) so switching arenas does not stall. */
  private bakeScale = 1;
  private perspective: ArenaPerspective | null = null;
  /** Ledges robots can hang from (top corners of solid blocks). */
  ledges: Ledge[] = [];
  private nav!: Nav;
  private debris!: DebrisField;
  private playerSpawns: Phaser.Math.Vector2[] = [];
  private bonusSpawns: Phaser.Math.Vector2[] = [];
  private warpZones: Phaser.Geom.Rectangle[] = [];
  private portals!: PortalFx;
  /** The spawn holograms (match start, respawns). */
  private holo!: HoloSpawns;
  private orbs: PowerUpOrb[] = [];
  private bullets: Bullet[] = [];
  private nextBonusAt = 0;
  /** The title screen's power-up setting. */
  private bonusRate = BONUS_RATES.normal;
  /** The camera's centre before shake, and the shake's trauma (0..1). */
  private camMid = new Phaser.Math.Vector2();
  private trauma = 0;
  private particles!: ParticleFx;
  private impact!: ImpactFx;
  private effects!: Record<ParticleName, EffectDef>;
  private pickupFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private camTarget = new Phaser.Math.Vector2();
  private camVisibleWidth = 30;
  /** The arena being played (index into ARENA_INFO). */
  private arena = 0;
  /** The robots' specs from the setup screen, by fighter index. */
  specs: FighterSpec[] = [];
  /** The winning team, null for a draw; undefined while the match runs. */
  winnerTeam: number | null | undefined;
  /** Match clock in ms: only advances while the game is not paused. */
  clock = 0;
  /** When the fight starts (after the 3-2-1 countdown), on the match clock. */
  startedAt: number = Config.COUNTDOWN;
  /** Lives each robot starts with, and the match length in ms (0: no limit). */
  stocks: number = Config.NB_LIVES;
  timeLimit = 0;
  private countdownStep = -1;
  /** Match intro: when the 3-2-1 countdown starts, on the match clock (after every robot's spawn is shown). */
  private countdownAt = 0;
  /** Match intro: when each robot starts its spawn, by fighter index; the spawn sound plays on each. */
  private introAt: number[] = [];
  private introSounded = 0;
  paused = false;
  private quitting = false;
  /** The frame the pause last toggled on. */
  private toggledFrame = -1;
  /** Pause, quit and continue, from the keyboard or any pad. */
  private commands?: MenuInput;
  private music?: Phaser.Sound.BaseSound;
  /** Post-match (phase 11 D): kill replays, when the match ended, humans' attack last frame (a fresh press continues). */
  private recorder = new ReplayRecorder();
  private overAt = 0;
  private promptShown = false;
  private attackWasDown = new Set<Kubotz>();

  constructor() { super('Game'); }

  /** The match as started, for Y to restart it in the other look. */
  private setup?: MatchSetup;

  init(): void {
    this.fighters = [];
    this.orbs = [];
    this.bullets = [];
    this.playerSpawns = [];
    this.bonusSpawns = [];
    this.warpZones = [];
    this.solids = [];
    this.blocks = [];
    this.winnerTeam = undefined;
    this.paused = false;
    this.quitting = false;
    this.commands = undefined;
    this.clock = 0;
    this.countdownStep = -1;
    this.introAt = [];
    this.introSounded = 0;
    this.recorder = new ReplayRecorder();
    this.promptShown = false;
    this.attackWasDown.clear();
  }

  create(data?: Partial<MatchSetup>): void {
    const setup: MatchSetup = { ...defaultSetup(), ...data };
    this.setup = setup;
    this.specs = setup.fighters.slice(0, 4);
    this.stocks = setup.stocks ?? Config.NB_LIVES;
    this.timeLimit = (setup.minutes ?? 0) * 60000;
    this.map = arenaMap(setup.arena, this.registry.get('map'));
    this.arenaLayers = [];
    const spriter: SpriterData = this.registry.get('spriter');
    const rig = new Rig(spriter);
    for (const file of ['feet/foot.png', 'feet/foot-sha.png']) rig.setOutline(file, opaqueOutline(this, `kubotz:${file}`));
    this.physicsWorld = new PhysicsWorld();
    const mapW = this.map.width * this.map.tileWidth;

    this.arena = setup.arena;
    this.bakeScale = setup.preview ? PREVIEW_BAKE : 1;
    this.scene.launch('Backdrop', { arena: setup.arena });
    this.scene.sendToBack('Backdrop');
    this.buildMap();
    this.recorder.setArena(this.map.width * UNIT, this.map.height * UNIT);
    this.debris = new DebrisField(this, this.physicsWorld);
    this.createEffects();
    this.portals = new PortalFx(this, this.warpZones);
    this.recorder.watch(this.portals, ['burst'], 'portals');
    this.holo = new HoloSpawns(this);

    if (setup.preview) { this.createPreview(setup.preview); return; }
    // A real match: the title picks a new room behind it when it comes back.
    this.registry.remove('menuArena');

    let humans = 0;
    // Each robot forms as a hologram while the camera is on it and waits; once
    // all are shown the countdown starts, and they materialize together during
    // it, let go on "Fight".
    this.countdownAt = this.specs.length * INTRO_FOCUS_MS;
    this.specs.forEach((spec, i) => {
      let controller: Controller;
      const color = SLOT_COLORS[spec.team % SLOT_COLORS.length];
      if (spec.input === 'CPU') {
        controller = new CpuController({
          // Teammates are friends: a CPU only goes after the other teams.
          enemiesOf: (k) => this.fighters.filter((f) => canHurt(k, f) && !f.eliminated),
          powerUpPositions: () => this.orbs.map((o) => ({ x: o.x, y: o.y })),
          now: () => this.clock,
          nav: this.nav,
        }, cpuReactionMs(spec.cpuLevel));
      } else {
        // Joined with a gamepad: that pad only; with a keyboard set: those keys only.
        humans++;
        const keys = spec.input === 'P1' ? PLAYER_1_KEYS : PLAYER_2_KEYS;
        controller = spec.pad !== undefined
          ? new HumanController(this, null, spec.input, spec.pad, `P${humans}`)
          : new HumanController(this, keys, spec.input, -1, `P${humans}`);
      }
      const spawn = this.playerSpawns[i % this.playerSpawns.length];
      const k = new Kubotz(this, i, controller, color, rig, spawn.x, spawn.y, this, this.physicsWorld, { team: spec.team, helmet: spec.helmet });
      if (controller instanceof CpuController) controller.agent = k;
      k.lives = this.stocks;
      k.facing = spawn.x < mapW / 2 ? 1 : -1;
      this.fighters.push(k);
      // The intro: one spawn after the other, each hidden until its turn.
      const at = i * INTRO_FOCUS_MS;
      this.introAt.push(at);
      k.appearAt = at;
      this.holo.start(k, at, (x, y) => k.teleport(x, y), spawn.y, this.countdownAt);
    });
    this.startedAt = this.countdownAt + Config.COUNTDOWN;

    // The camera starts on the first robot's spawn (updateCamera follows the intro).
    const cam = this.cameras.main;
    const first = this.introFocus() ?? this.centerOfFighters();
    this.camTarget.set(first.x, first.y);
    this.camVisibleWidth = INTRO_VIEW_WIDTH;
    cam.centerOn(first.x, first.y - UNIT);
    this.camMid.set(first.x, first.y - UNIT);
    this.trauma = 0;
    this.applyZoom();
    this.bonusRate = BONUS_RATES[setup.bonuses] ?? BONUS_RATES.normal;
    this.nextBonusAt = this.bonusRate.most === 0 ? Infinity : this.startedAt + Phaser.Math.Between(this.bonusRate.min, this.bonusRate.max);

    this.sound.stopByKey('music-title');
    this.music = addMusic(this, 'music-game', 0.28);
    this.music.play();

    this.scene.launch('Hud');
    this.scene.bringToTop('Hud');

    const kb = this.input.keyboard!;
    // Pause, quit and continue: one input layer for the keyboard and every pad (MenuInput).
    this.commands = new MenuInput({
      pause: () => this.togglePause(), // Esc, pad Start (not P: it is P1's special)
      quit: () => { if (this.paused) this.backToTitle(); }, // from the pause: Q, pad Select
      confirm: () => this.continueAfterMatch(), // after the match: Enter, Space, pad A, B or Start
    }, false, { confirm: ['A', 'B', 9] });
    // Back from the settings or controls (drawn over the paused match): the Esc or Start that closed them must not unpause too.
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.commands?.reset());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.RESUME));
    kb.on('keydown-V', () => {
      look25.on = !look25.on;
      this.floatText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, look25.on ? '2.5D on' : '2.5D off', 0xffffff);
    });
    kb.on('keydown-F', () => {
      const on = this.toggleScreenFx();
      this.floatText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, on ? 'Effects on' : 'Effects off', 0xffffff);
    });
    // Movement feel presets (game/Feel.ts): 1 Kubot, 2 Fox, 3 Falco, 4 Captain Falcon, 5 Samus, 6 the classic Kubot.
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((key, i) => kb.on(`keydown-${key}`, () => {
      const f = setFeel(FEEL_ORDER[i]);
      this.floatText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, `Feel: ${f.name}`, 0xffffff);
    }));
    kb.on('keydown-L', () => {
      laserSmoke.mode = LASER_SMOKE_MODES[(LASER_SMOKE_MODES.indexOf(laserSmoke.mode) + 1) % LASER_SMOKE_MODES.length];
      this.floatText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, `Laser smoke: ${laserSmoke.mode}`, 0xffffff);
    });
    // Debug mode (F3): K knocks out the nearest robot that isn't P1, to see the K.O. smoke.
    kb.on('keydown-K', () => {
      if (!this.debugState.on) return;
      const p1 = this.fighters[0];
      const target = this.fighters.filter((k) => k !== p1 && k.isAlive())
        .sort((a, b) => Math.hypot(a.x - p1.x, a.y - p1.y) - Math.hypot(b.x - p1.x, b.y - p1.y))[0];
      if (target) target.health = 0;
    });
    // Y: the neon look or the classic one (fx/Neon.ts); the arena is rebuilt in it.
    kb.on('keydown-Y', () => {
      setNeon(!neon.on);
      this.scene.restart(this.setup);
    });
    kb.on('keydown-G', () => {
      surface.worn = !surface.worn;
      this.floatText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, surface.worn ? 'Worn robots' : 'Clean robots', 0xffffff);
    });
    // Debug mode; the function keys are kept from the browser while the game has the keyboard.
    kb.addCapture([Phaser.Input.Keyboard.KeyCodes.F3, Phaser.Input.Keyboard.KeyCodes.F4, Phaser.Input.Keyboard.KeyCodes.F6,
      Phaser.Input.Keyboard.KeyCodes.F7, Phaser.Input.Keyboard.KeyCodes.F8]);
    const d = this.debugState;
    const toggleDebug = () => {
      d.on = !d.on;
      if (d.on) { this.scene.launch('Debug'); this.scene.bringToTop('Debug'); } else { this.scene.stop('Debug'); d.timeScale = 1; d.frozen = false; }
    };
    kb.on('keydown-F3', toggleDebug);
    kb.on('keydown-BACKTICK', toggleDebug);
    kb.on('keydown-F4', () => { if (d.on) d.timeScale = d.timeScale === 1 ? 0.5 : d.timeScale === 0.5 ? 0.25 : 1; });
    kb.on('keydown-F6', () => { if (d.on) d.frozen = !d.frozen; });
    kb.on('keydown-F7', () => { if (d.on) { d.frozen = true; d.steps++; } });
    kb.on('keydown-F8', () => { if (d.on) d.nav = !d.nav; });
    this.setupScreenFx();
    this.setupLights();
    // The settings screen (opened from the pause) applies its effects live.
    const offSettings = onSettingsChange(() => this.setScreenFx(wantScreenFx()));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.perspective?.destroy();
      this.perspective = null;
      offSettings();
      this.scene.stop('Settings');
      this.scene.stop('Controls');
      this.music?.destroy();
      this.scene.stop('Hud');
      this.scene.stop('Debug');
      this.scene.stop('Backdrop');
      this.registry.set('pauseFx', 0);
      this.debris.destroy();
      this.portals.destroy();
      this.holo.destroy();
      for (const k of this.fighters) k.destroy();
    });
  }

  // ------------------------------------------------------------ arena preview
  /** Set while the scene only shows the arena for the setup screen (MatchSetup.preview). */
  private preview = false;

  /** The arena alone, fitted into `rect`: lights, glow, portals and screen grade, nothing else. */
  private createPreview(rect: NonNullable<MatchSetup['preview']>): void {
    this.preview = true;
    const cam = this.cameras.main;
    const mapW = this.map.width * this.map.tileWidth;
    const mapH = this.map.height * this.map.tileHeight;
    cam.setViewport(rect.x, rect.y, rect.width, rect.height);
    const fit = (r: { width: number; height: number }) => Math.min(r.width / mapW, r.height / mapH);
    if (rect.inset) {
      // The arena behind the whole menu, filling it and soft, and whole again in the inset.
      cam.setZoom(Math.max(rect.width / mapW, rect.height / mapH) * 1.08).centerOn(mapW / 2, mapH / 2);
      if (fx().postFx) cam.postFX?.addBlur(0, 1, 1, 0.8);
      const r = rect.inset;
      this.cameras.add(r.x, r.y, r.width, r.height).setZoom(fit(r)).centerOn(mapW / 2, mapH / 2);
    } else {
      cam.setZoom(fit(rect)).centerOn(mapW / 2, mapH / 2);
    }
    this.setupScreenFx();
    this.setupLights();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.preview = false;
      this.debris.destroy();
      this.portals.destroy();
      // The next start (a match, another preview) gets a plain camera again.
      cam.postFX?.clear();
      for (const c of [...this.cameras.cameras]) if (c !== cam) this.cameras.remove(c);
      cam.setViewport(0, 0, this.scale.width, this.scale.height);
    });
  }

  private updatePreview(deltaMs: number): void {
    const now = this.clock += deltaMs;
    this.particles.update(deltaMs);
    this.impact.update(now, deltaMs);
    this.portals.update(now, deltaMs);
    this.drawGlows();
  }

  // ---------------------------------------------------------------------- map
  private buildMap(): void {
    const m = this.map;
    // The original kept the Tiled art layers hidden behind its debug shapes; the
    // port draws them. Everything static is baked into one render texture.
    const mapW = m.width * m.tileWidth;
    const mapH = m.height * m.tileHeight;
    // Colour and normal map canvases of the whole arena, lit like everything else.
    for (const key of ['arena', 'arena-normals']) if (this.textures.exists(key)) this.textures.remove(key);
    const s = this.bakeScale;
    const bw = Math.ceil(mapW * s);
    const bh = Math.ceil(mapH * s);
    const art = this.textures.addCanvas('arena', cpuCanvas(bw, bh))!;
    const normals = document.createElement('canvas');
    normals.width = bw; normals.height = bh;
    const nctx = normals.getContext('2d', { willReadFrequently: true })!;
    nctx.fillStyle = 'rgb(128,128,255)';
    nctx.fillRect(0, 0, bw, bh);
    const actx = art.getContext();
    actx.setTransform(s, 0, 0, s, 0, 0);
    nctx.setTransform(s, 0, 0, s, 0, 0);
    eachTile(this.textures, m, (source, key, x, y) => {
      actx.drawImage(source, x, y);
      nctx.drawImage(normalMapFor(key, source, { bevel: 3, detail: 0.3, strength: 1 }), x, y);
    });
    actx.setTransform(1, 0, 0, 1, 0, 0);
    art.refresh();
    if (this.sys.renderer.type === Phaser.WEBGL) art.setDataSource(normals);
    this.arenaLayers.push(lit(this.add.image(0, 0, 'arena').setOrigin(0, 0).setScale(1 / s).setDepth(2)));
    // The tiles' blue light strips glow on their own, whatever the lights do.
    this.buildArenaGlow(actx.canvas, bw, bh);
    // Then the tiles take the arena's palette (fx/Backdrops.ts).
    const tiles = backdropOf(this.arena).tiles;
    if (tiles) { tintArt(actx, bw, bh, tiles); art.refresh(); }

    for (const o of m.objects) {
      switch (o.type) {
        case 'PLAYER_SPAWN':
          this.playerSpawns.push(this.spawnPoint(o));
          break;
        case 'BONUS_SPAWN':
          this.bonusSpawns.push(new Phaser.Math.Vector2(o.x + o.width / 2, o.y + o.height / 2));
          break;
        case 'WARP_ZONE':
          this.warpZones.push(new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height));
          break;
        default: { // WALL, STATIC_PLATFORM: BlockFactory
          this.physicsWorld.addBlock(o.x, o.y, o.width, o.height, o.type === 'STATIC_PLATFORM');
          this.solids.push(new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height));
          this.blocks.push({ x: o.x, y: o.y, width: o.width, height: o.height, soft: o.type === 'STATIC_PLATFORM' });
        }
      }
    }
    if (this.warpZones.length > 0) this.buildHull(actx.canvas, mapW, mapH);
    // A lit edge along the top of every block, like the 3D version's glowing rims.
    const mood = backdropOf(this.arena);
    const rims = this.add.graphics().setDepth(2.6).setBlendMode(Phaser.BlendModes.ADD);
    for (const b of this.blocks) {
      rims.lineStyle(7, mood.glow, 0.18).lineBetween(b.x, b.y + 1, b.x + b.width, b.y + 1);
      rims.lineStyle(2, mood.rimLine, 0.75).lineBetween(b.x, b.y + 1, b.x + b.width, b.y + 1);
    }
    this.perspective = new ArenaPerspective(this, this.blocks, this.arenaLayers, rims);
    this.nav = new Nav(this.blocks);
    this.ledges = findLedges(this.blocks);
    // The original map has a single PLAYER_SPAWN (the second robot was hard-coded
    // at (8, 7)): add mirrored and central spawns so up to four robots start apart.
    if (this.playerSpawns.length >= 4) { this.nav = new Nav(this.blocks); return; }
    const first = this.playerSpawns[0] ?? new Phaser.Math.Vector2(8 * UNIT, 30 * UNIT);
    this.playerSpawns.push(
      new Phaser.Math.Vector2(mapW - first.x, first.y),
      new Phaser.Math.Vector2(mapW / 2 - 3 * UNIT, 21.5 * UNIT),
      new Phaser.Math.Vector2(mapW / 2 + 3 * UNIT, 21.5 * UNIT),
    );
  }

  /**
   * The cube's outer hull: dark plating that carries on past the frame into the
   * non-playable area and fades out, so the walls do not stop short. Cells
   * outside the play space are the ones a flood fill from the spawns cannot
   * reach (portals stop it); the fade follows each cell's distance to the frame.
   * Half resolution and blurred, under the arena art.
   */
  private buildHull(mapArt: HTMLCanvasElement, mapW: number, mapH: number): void {
    const M = 12; // margin around the map, in units
    const gw = mapW / UNIT + 2 * M;
    const gh = mapH / UNIT + 2 * M;
    const solid = new Uint8Array(gw * gh);
    const cellsOf = (r: { x: number; y: number; width: number; height: number }, mark: (i: number) => void) => {
      for (let y = Math.round(r.y / UNIT); y < Math.round((r.y + r.height) / UNIT); y++)
        for (let x = Math.round(r.x / UNIT); x < Math.round((r.x + r.width) / UNIT); x++) mark((y + M) * gw + x + M);
    };
    for (const b of this.blocks) if (!b.soft) cellsOf(b, (i) => { solid[i] = 1; });
    // Cells the map's own art already covers (the frame and its dark fades) count as frame too.
    const cover = document.createElement('canvas');
    cover.width = mapW / UNIT; cover.height = mapH / UNIT;
    const cctx = cover.getContext('2d', { willReadFrequently: true })!;
    cctx.drawImage(mapArt, 0, 0, cover.width, cover.height);
    const cd = cctx.getImageData(0, 0, cover.width, cover.height).data;
    const covered = new Uint8Array(gw * gh);
    for (let y = 0; y < cover.height; y++) for (let x = 0; x < cover.width; x++) {
      if (cd[(y * cover.width + x) * 4 + 3] > 215) covered[(y + M) * gw + x + M] = 1;
    }
    // The play space: flood from the spawns inside the frame's bounding box.
    const frame = this.blocks.filter((b) => !b.soft);
    const x0 = Math.min(...frame.map((b) => b.x)) / UNIT + M;
    const x1 = Math.max(...frame.map((b) => b.x + b.width)) / UNIT + M;
    const y0 = Math.min(...frame.map((b) => b.y)) / UNIT + M;
    const y1 = Math.max(...frame.map((b) => b.y + b.height)) / UNIT + M;
    const inside = new Uint8Array(gw * gh);
    for (const z of this.warpZones) cellsOf(z, (i) => { inside[i] = 2; }); // portals: stop the flood
    const queue: number[] = [];
    for (const p of this.playerSpawns) {
      const i = (Math.floor(p.y / UNIT - 0.5) + M) * gw + Math.floor(p.x / UNIT) + M;
      if (!solid[i] && !inside[i]) { inside[i] = 1; queue.push(i); }
    }
    while (queue.length > 0) {
      const i = queue.pop()!;
      const x = i % gw; const y = (i - x) / gw;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
        const n = ny * gw + nx;
        if (solid[n] || inside[n]) continue;
        inside[n] = 1; queue.push(n);
      }
    }
    // Distance (in cells) from each outside cell to the frame.
    const dist = new Float32Array(gw * gh).fill(1e9);
    const bfs: number[] = [];
    for (let i = 0; i < solid.length; i++) if (solid[i] || (covered[i] && inside[i] !== 1)) { dist[i] = 0; bfs.push(i); }
    for (let h = 0; h < bfs.length; h++) {
      const i = bfs[h];
      const x = i % gw; const y = (i - x) / gw;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue;
        const n = ny * gw + nx;
        if (inside[n] === 1 || dist[n] <= dist[i] + 1) continue;
        dist[n] = dist[i] + 1; bfs.push(n);
      }
    }
    const S = (UNIT / 2) * this.bakeScale; // half resolution (in a match)
    const art = document.createElement('canvas');
    art.width = gw * S; art.height = gh * S;
    const ctx = art.getContext('2d', { willReadFrequently: true })!;
    // Plating: the tiles' dark panels, with now and then a side panel's circuitry.
    // Each tile shrunk once to the cell size: scaling the big tile images down for every cell was most of the hull's cost.
    const tile = (name: string) => {
      const c = document.createElement('canvas');
      c.width = c.height = Math.max(1, Math.round(2 * S));
      c.getContext('2d', { willReadFrequently: true })!.drawImage(this.textures.get(`tile:${name}`).getSourceImage() as HTMLImageElement, 0, 0, c.width, c.height);
      return c;
    };
    const plain = tile('blank.png'); const lines = [tile('side02.png'), tile('corner-top-left.png'), tile('corner-bottom-left.png')];
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 0; y < gh; y += 2) for (let x = 0; x < gw; x += 2) {
      const r = rnd();
      ctx.drawImage(r < 0.12 ? lines[Math.floor(r / 0.12 * 3)] : plain, x * S, y * S, 2 * S, 2 * S);
    }
    // Alpha: solid near the frame, gone some 9 cells out; never over the play space.
    const mask = document.createElement('canvas');
    mask.width = gw; mask.height = gh;
    const mctx = mask.getContext('2d', { willReadFrequently: true })!;
    const md = mctx.createImageData(gw, gh);
    for (let i = 0; i < dist.length; i++) {
      const a = inside[i] === 1 ? 0 : Math.max(0, Math.min(1, 1.15 - (dist[i] - 1) / 8));
      md.data[i * 4 + 3] = 255 * a * a;
    }
    mctx.putImageData(md, 0, 0);
    const soft = document.createElement('canvas');
    soft.width = art.width; soft.height = art.height;
    const sctx = soft.getContext('2d', { willReadFrequently: true })!;
    sctx.filter = `blur(${S * 1.2}px)`;
    sctx.drawImage(mask, 0, 0, soft.width, soft.height);
    const tiles = backdropOf(this.arena).tiles;
    if (tiles) tintArt(ctx, art.width, art.height, tiles);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(soft, 0, 0);
    if (this.textures.exists('arena-hull')) this.textures.remove('arena-hull');
    this.textures.addCanvas('arena-hull', art);
    this.arenaLayers.push(lit(this.add.image(-M * UNIT, -M * UNIT, 'arena-hull').setOrigin(0, 0).setScale(UNIT / S).setDepth(1.9)));
  }

  /**
   * The emissive layer: the saturated blue pixels of the arena art, sharp and
   * blurred twice, drawn additively over the lit arena and breathing slowly,
   * like the 3D version's glowing platforms.
   */
  private buildArenaGlow(art: HTMLCanvasElement, w: number, h: number): void {
    const mask = document.createElement('canvas');
    mask.width = w; mask.height = h;
    const mctx = mask.getContext('2d', { willReadFrequently: true })!;
    const src = art.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h);
    const d = src.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const blue = b - Math.max(r, g * 0.55);
      if (d[i + 3] < 40 || b < 120 || blue < 50) { d[i + 3] = 0; continue; }
      const k = Math.min(1, (blue - 50) / 90);
      d[i] = Math.min(255, r * 0.6 + 40 * k); d[i + 1] = Math.min(255, g + 40 * k); d[i + 2] = 255; d[i + 3] = 255 * k;
    }
    mctx.putImageData(src, 0, 0);
    const tiles = backdropOf(this.arena).tiles;
    if (tiles) tintArt(mctx, w, h, tiles);
    if (this.textures.exists('arena-glow')) this.textures.remove('arena-glow');
    const glow = this.textures.addCanvas('arena-glow', cpuCanvas(w, h))!;
    const g = glow.getContext();
    const s = this.bakeScale;
    g.filter = `blur(${18 * s}px)`;
    g.drawImage(mask, 0, 0);
    g.drawImage(mask, 0, 0);
    g.filter = `blur(${5 * s}px)`;
    g.drawImage(mask, 0, 0);
    g.filter = 'none';
    g.globalAlpha = 0.8;
    g.drawImage(mask, 0, 0);
    glow.refresh();
    const layer = this.add.image(0, 0, 'arena-glow').setOrigin(0, 0).setScale(1 / s).setDepth(2.5).setBlendMode(pureAdd(this)).setAlpha(0.85);
    this.arenaLayers.push(layer);
    this.tweens.add({ targets: layer, alpha: 0.6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private spawnPoint(o: MapObject): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(o.x + o.width / 2, o.y + o.height - (Config.KUBOTZ_HEIGHT * UNIT) / 2);
  }

  private createEffects(): void {
    // The original LibGDX particle effects (.pe files), as the full-on-scripting branch plays them.
    this.particles = new ParticleFx(this, 'pe:');
    this.impact = new ImpactFx(this);
    this.impact.solids = this.solids; // the K.O. smoke stops at walls and platforms
    this.recorder.watch(this.impact, ['hit', 'clash', 'pop', 'airJump', 'runDust', 'laserTrail', 'koSmoke', 'charge', 'motes']);
    this.effects = this.registry.get('effects');
    // Small sparkles for portals and power-ups appearing.
    this.pickupFx = this.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 220 }, lifespan: 500, scale: { start: 0.8, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(15);
  }

  private fx(name: ParticleName, x: number, y: number, tint?: number): void {
    this.particles.play(this.effects[name], x, y, tint);
    this.recorder.particles(name, x, y, tint);
  }

  // -------------------------------------------------------------- ArenaHooks
  now(): number {
    return this.clock;
  }

  playSfx(key: string, volume = 0.5, detune = 0): void {
    if (key === 'guard-break') { this.shake(0.35); key = 'punch'; }
    if (key === 'dodge') key = 'step'; // the old step sample, as a quick shuffle
    else if (key === 'step' && this.cache.audio.exists('step-0')) {
      // Footsteps: one of the soft metal boot steps, pitch varied a little.
      key = `step-${Phaser.Math.Between(0, 2)}`;
      detune += Phaser.Math.Between(-80, 80);
    }
    if (!this.cache.audio.exists(key)) return;
    this.sound.play(key, { volume: sfxVolume(volume), detune });
    this.recorder.sfx(key, volume, detune);
  }

  dust(x: number, y: number): void {
    this.fx('landingDust', x, y);
  }

  /** Jumping off and landing: the subtle run dust, kicked out to both sides. */
  footDust(x: number, y: number): void {
    this.impact.runDust(x, y, -1);
    this.impact.runDust(x, y, 1);
  }

  runDust(x: number, y: number, dir: number): void {
    this.impact.runDust(x, y, dir);
  }

  landed(victim: Kubotz, attacker: Kubotz, damage: number, chained: boolean, healthBefore: number, speed: number, angle: number): void {
    this.recorder.hit(victim, attacker, damage, chained, this.clock, healthBefore, speed, angle);
  }

  airJump(x: number, y: number, color: number): void {
    this.impact.airJump(x, y, color);
  }

  fireBullet(shooter: Kubotz, damage: number, speed: number, size = 1, power = 1): void {
    const { x, y } = shooter.muzzle();
    const b = new Bullet(this, shooter, x, y, shooter.facing * speed, 0, damage, this.clock, size, power);
    this.playSfx('shot', 0.3 * Math.min(2, size));
    if (size > 1.2) this.impact.hit(x, y, shooter.facing, shooter.look.color, size * 0.6); // muzzle burst
    this.bullets.push(b);
  }

  tryGrab(kubotz: Kubotz, area: Phaser.Geom.Circle): boolean {
    let took = false;
    for (const orb of [...this.orbs]) {
      if (!Phaser.Geom.Intersects.CircleToRectangle(area, orb.sprite.getBounds())) continue;
      const hp = kubotz.health;
      kubotz.givePowerUp(orb.type, this.clock);
      const def = POWER_UPS[orb.type];
      if (orb.type === 'health') {
        // Repair: its own sound, a longer twirl and the health regained.
        this.playSfx('orb-heal', 0.55);
        this.impact.twirl(kubotz, orb.color, 2100);
        this.recorder.twirl(kubotz.index, orb.color, 2100);
        this.floatText(kubotz.x, kubotz.body.top - 40, `+${Math.round(kubotz.health - hp)}% HP`, def.color);
      } else {
        this.playSfx('orb-pickup', 0.5);
        this.impact.twirl(kubotz, orb.color, 1500);
        this.recorder.twirl(kubotz.index, orb.color, 1500);
        this.floatText(kubotz.x, kubotz.body.top - 40, def.label, def.color);
      }
      orb.destroy();
      this.orbs = this.orbs.filter((o) => o !== orb);
      took = true;
    }
    return took;
  }

  /** Melee grab reach: an opponent just in front, level with the grabber, that can be caught. */
  grabTarget(k: Kubotz): Kubotz | null {
    let best: Kubotz | null = null;
    let bestD = Infinity;
    for (const o of this.fighters) {
      if (!canHurt(k, o) || !o.isAlive() || o.intangible || o.invincible || o.heldBy || o.grabbing || o.onLedge || o.guarding) continue; // a raised shield can't be grabbed
      const ahead = (o.x - k.x) * k.facing;
      if (ahead < 0.3 * UNIT || ahead > 1.7 * UNIT || Math.abs(o.y - k.y) > 1.2 * UNIT) continue;
      if (ahead < bestD) { bestD = ahead; best = o; }
    }
    if (best) this.playSfx('punch', 0.25, -600);
    return best;
  }

  /** A free ledge whose top is level with the robot's hands, on the side the robot is (edge hogging: one robot per ledge). */
  ledgeNear(k: Kubotz): Ledge | null {
    for (const l of this.ledges) {
      const out = (k.x - l.x) * l.dir;
      const below = l.y - k.body.top;
      if (out < 0.1 * UNIT || out > 1.0 * UNIT || below < -0.45 * UNIT || below > 0.85 * UNIT) continue;
      if (this.fighters.some((o) => o !== k && o.ledgeHeld === l)) continue;
      return l;
    }
    return null;
  }

  grabFx(x: number, y: number, color: number, power: number): void {
    this.impact.hit(x, y, 0, color, power);
    this.playSfx('punch', 0.2 + 0.25 * power, power >= 1 ? -300 : 200);
  }

  // ------------------------------------------------------------------ update
  update(time: number, deltaMs: number): void {
    if (!this.preview) this.commands?.update(time);
    if (this.paused) return;
    if (this.preview) { this.updatePreview(deltaMs); return; }
    // Debug time controls: slow motion, or frozen and stepped frame by frame.
    const d = this.debugState;
    let dtMs = Math.min(deltaMs, 50) * d.timeScale;
    if (d.frozen) {
      if (d.steps <= 0) return;
      d.steps--;
      dtMs = 1000 / 60;
    }
    const dt = dtMs / 1000;
    // One clock for everything (cooldowns, power-ups, respawns, the HUD timers):
    // it stops while the game is paused.
    const now = this.clock += dtMs;
    while (this.introSounded < this.introAt.length && now >= this.introAt[this.introSounded]) {
      this.introSounded++;
      this.playSfx('holo-spawn', 0.45);
    }
    this.updateCountdown(now);
    const fighting = now >= this.startedAt;

    for (const k of this.fighters) {
      if (!k.isAlive() && !k.eliminated && this.winnerTeam === undefined && now >= k.respawnAt) this.respawn(k);
      k.update(now, dt, fighting);
    }
    this.physicsWorld.step(dt);
    this.resolveMelee(now);
    this.kickOrbs(now);
    this.debris.update(now, this.fighters, (victim, x, y) => {
      this.playSfx('punch', 0.3);
      this.impact.hit(x, y, Math.sign(victim.x - x) || 1, 0xffb060, 0.6);
    });
    this.updateBullets(now, dt);
    this.updateOrbs(now);
    this.checkBoundsAndWarps(now);
    this.checkDeaths(now);
    this.checkTime(now);
    this.updateBonusSpawns(now);
    const drawn = new Map<Kubotz, Partial<RobotFrame>>();
    for (const k of this.fighters) {
      k.render(now, dtMs);
      // A trail behind the striking fist or foot, and behind the laser blade
      // whenever it swings fast (not only during strikes).
      const arc = k.isAlive() ? this.bladeArc(k, dtMs) ?? k.swingArc() : null;
      this.impact.swing(k, arc, k.look.color);
      // Invincibility and shield: the orb's motes keep circling the robot while they last.
      const auras: string[] = [];
      if (k.isAlive() && k.invincible) auras.push('invincibility');
      if (k.isAlive() && k.shield > 0) auras.push('shield');
      for (const key of auras) this.impact.aura(k, key, POWER_UPS[key as 'shield'].color);
      // What the replays draw with the robot.
      const b = k.isAlive() ? k.blade() : null;
      drawn.set(k, {
        ...(b ? { blade: [b.x1, b.y1, b.x2, b.y2] as [number, number, number, number] } : {}),
        ...(arc ? { swing: [arc.ox, arc.oy, arc.ix, arc.iy] as [number, number, number, number] } : {}),
        ...(auras.length ? { auras } : {}),
      });
      // Materializing: the same motes swirl round it in the hologram's cyan.
      if (k.isAlive() && (this.holo.state(k, now)?.[0] ?? -1) >= 0) this.impact.aura(k, 'hologram', HOLO_COLOR);
      // A charging gun draws sparks into its barrel.
      if (k.isAlive() && k.charge > 0 && k.weapon.startsWith('laserGun')) {
        const m = k.muzzle();
        this.impact.charge(m.x, m.y, k.look.color, k.charge);
      }
    }
    this.holo.update(now);
    this.particles.update(dtMs);
    this.impact.update(now, dtMs);
    this.portals.update(now, dtMs);
    this.updateCamera(dt);
    this.drawGlows();
    this.drawSabers(now);
    const amb = this.lights.ambientColor;
    this.recorder.record(now, this.fighters, this.cameras.main, this.lights, (k) => this.holo.state(k, now), {
      robot: (k) => drawn.get(k) ?? {},
      props: [
        ...this.debris.props(now),
        ...this.orbs.flatMap((o) => o.props()),
        ...this.bullets.filter((b) => !b.dead).map((b) => propOf(b.sprite)),
        ...this.glows.filter((g) => g.visible).map((g) => propOf(g)),
      ],
      ambient: Phaser.Display.Color.GetColor(amb.r * 255, amb.g * 255, amb.b * 255),
    });
    this.updateAfterMatch(now);
  }

  // -------------------------------------------------------------- post-match (phase 11 D)
  /** The winners dance; after a beat any human's fresh attack press (or Enter, Space, pad A / B / Start) continues. */
  private updateAfterMatch(now: number): void {
    if (this.winnerTeam === undefined) return;
    const ready = now >= this.overAt + CONTINUE_DELAY;
    if (ready && !this.promptShown) { this.promptShown = true; this.events.emit('continue-prompt'); }
    for (const k of this.fighters) {
      if (k.controller.label === 'CPU') continue;
      const down = k.controller.read().attack;
      if (ready && down && !this.attackWasDown.has(k)) { this.continueAfterMatch(); return; }
      if (down) this.attackWasDown.add(k); else this.attackWasDown.delete(k);
    }
  }

  private continueAfterMatch(): void {
    if (this.winnerTeam === undefined || !this.promptShown || !this.scene.isActive()) return;
    const result: MatchResult = {
      ...this.result(),
      highlights: this.recorder.flush(),
    };
    this.scene.start('Results', result);
  }

  private lastTips = new Map<Kubotz, { x: number; y: number }>();

  /** The blade's arc while its tip moves fast (6 units/s or more), else null. */
  private bladeArc(k: Kubotz, dtMs: number): { ox: number; oy: number; ix: number; iy: number } | null {
    const b = k.blade();
    const last = this.lastTips.get(k);
    if (!b) { this.lastTips.delete(k); return null; }
    this.lastTips.set(k, { x: b.x2, y: b.y2 });
    if (!last || dtMs <= 0) return null;
    const speed = Math.hypot(b.x2 - last.x, b.y2 - last.y) / (dtMs / 1000) / UNIT;
    return speed >= 6 ? { ox: b.x2, oy: b.y2, ix: b.x1, iy: b.y1 } : null;
  }

  private drawSabers(now: number): void {
    if (!this.sabers) this.sabers = this.add.graphics().setDepth(10.5).setBlendMode(Phaser.BlendModes.ADD);
    const g = this.sabers.clear();
    for (const k of this.fighters) {
      const b = k.blade();
      if (b) drawBlade(g, b.x1, b.y1, b.x2, b.y2, k.look.color, 0.9 + 0.1 * Math.sin(now * 0.09 + k.x));
    }
  }

  /** Soft additive glow and a Light2D point light around lasers, blades, pick-ups, explosions and hits. */
  private drawGlows(): void {
    const lights = [
      ...this.bullets.filter((b) => !b.dead).map((b) => ({ x: b.x, y: b.y, color: b.shooter.look.color, intensity: 4 * b.size })),
      ...this.fighters.filter((k) => k.isAlive() && k.charge > 0).map((k) => ({ ...(k.weapon.startsWith('laserGun') ? k.muzzle() : { x: k.x, y: k.y }), color: k.look.color, intensity: 1 + 5 * k.charge })),
      ...this.fighters.filter((k) => k.isAlive() && k.weapon === 'laserSword').map((k) => {
        const p = k.bladeMiddle();
        return { x: p.x, y: p.y, color: k.look.color, intensity: 2.5 };
      }),
      ...this.orbs.map((o) => ({ x: o.x, y: o.y, color: o.color, intensity: 1.5 })),
      // Explosion and hit flashes: off with dynamic lights.
      ...this.holo.lights(this.clock),
      ...[...this.debris.lights(this.clock), ...this.impact.lights()].map((l) => ({ ...l, intensity: fx().lights ? l.intensity : 0 })),
    ].filter((l) => l.intensity > 0);
    // The brightest first, so the pool keeps the hits and lasers when there are many.
    lights.sort((a, b) => b.intensity - a.intensity);
    this.pointLights.forEach((light, i) => {
      const l = lights[i];
      if (!l) { light.setVisible(false); return; }
      light.setVisible(true).setPosition(l.x, l.y).setColor(l.color)
        .setIntensity(Math.min(2.2, 0.5 + l.intensity * 0.35)).setRadius(UNIT * (4 + Math.sqrt(l.intensity) * 2.5));
    });
    while (this.glows.length < lights.length) {
      this.glows.push(this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(13));
    }
    this.glows.forEach((img, i) => {
      const l = lights[i];
      if (!l) { img.setVisible(false); return; }
      const size = UNIT * (1.2 + Math.min(6, Math.sqrt(l.intensity) * 0.9));
      img.setVisible(true).setPosition(l.x, l.y).setTint(l.color).setDisplaySize(size, size).setAlpha(Math.min(0.85, 0.25 + l.intensity * 0.05));
    });
  }

  // -------------------------------------------------------------- screen effects
  private gradeOn = false;

  /**
   * The grade pass (vignette, split tone, grain, scanlines) on the arena and
   * the same grain and scanlines on the backdrop behind it, so they cover the
   * whole view (WebGL only); off with ?lowfx or both post-processing and film grain off,
   * toggled with F (here or in the menus). No bloom: the owner preferred the
   * crisper look without it.
   */
  private setupScreenFx(): void {
    this.gradeOn = false;
    this.setScreenFx(screenFxOn(this.game));
  }

  private toggleScreenFx(): boolean {
    return this.setScreenFx(!this.gradeOn);
  }

  private setScreenFx(on: boolean): boolean {
    this.gradeOn = setPass(this, this.cameras.main, GradePipeline, on);
    // The backdrop reads this when it starts; once it runs, set its pass here.
    this.registry.set('screenFx', this.gradeOn);
    const backdrop = this.scene.get('Backdrop');
    if (backdrop.sys.isActive()) (backdrop as BackdropScene).setScreenFx(this.gradeOn);
    return this.gradeOn;
  }

  // -------------------------------------------------------------- lights
  /**
   * Light2D over the arena and robots (their normal maps are generated at
   * boot): a warm key light from the upper front, a cool rim light from
   * behind, both following the camera, and a pool of coloured point lights.
   */
  private setupLights(): void {
    if (this.sys.renderer.type !== Phaser.WEBGL) return;
    // A dim room: the key light shapes, the rim light outlines, and the
    // glowing platforms, lasers and blades light what is near them.
    // Each arena's backdrop sets the mood of the light (fx/Backdrops.ts).
    const mood = backdropOf(this.arena);
    this.lights.enable().setAmbientColor(mood.ambient);
    this.keyLight = this.lights.addLight(0, 0, 100, mood.key, 3.2);
    this.rimLight = this.lights.addLight(0, 0, 100, mood.rim, 2.0);
    for (let i = 0; i < 12; i++) this.pointLights.push(this.lights.addLight(0, 0, UNIT * 4, 0xffffff, 0).setVisible(false));
    // Light in the arena's glow colour rising off the top of every block (wide ones get several).
    let fixed = 0;
    for (const b of this.blocks) {
      const n = Math.max(1, Math.round(b.width / (UNIT * 9)));
      for (let i = 0; i < n && fixed < PLATFORM_LIGHTS; i++, fixed++) {
        const x = b.x + (b.width * (i + 0.5)) / n;
        this.lights.addLight(x, b.y - UNIT * 1.2, Math.max(UNIT * 6, (b.width / n) * 0.9), mood.glow, 2.4);
      }
    }
    this.placeFixedLights();
  }

  private placeFixedLights(): void {
    if (!this.keyLight || !this.rimLight) return;
    const view = this.cameras.main.worldView;
    const span = Math.max(view.width, view.height);
    this.keyLight.setPosition(view.x + view.width * 0.3, view.y - view.height * 0.15).setRadius(span * 1.8);
    this.rimLight.setPosition(view.right + view.width * 0.1, view.bottom + view.height * 0.1).setRadius(span * 1.6);
  }

  // -------------------------------------------------------------- debug view
  get warpZoneRects(): Phaser.Geom.Rectangle[] { return this.warpZones; }
  get navGraph(): Nav { return this.nav; }
  get bulletCount(): number { return this.bullets.length; }
  get orbCount(): number { return this.orbs.length; }
  debrisCircles(): Phaser.Geom.Circle[] { return this.debris.circles(); }

  /** Narrator "3, 2, 1, Fight!" (InGameScreen countdown); inputs are off until "Fight". */
  private updateCountdown(now: number): void {
    if (now < this.countdownAt) return; // the intro is still showing the robots
    const step = Math.min(3, Math.floor((now - this.countdownAt) / 1000));
    if (step === this.countdownStep) return;
    this.countdownStep = step;
    const word = ['3', '2', '1', 'fight'][step];
    this.sound.play(`narrator-${word}`, { volume: sfxVolume(0.8) });
    this.events.emit('countdown', word === 'fight' ? 'FIGHT!' : word);
  }

  /** What the attacker's hits and bolts can land on: robots of the other teams (teammates are passed through). */
  private damageablesFor(attacker: Kubotz): Damageable[] {
    return this.fighters.filter((f) => canHurt(attacker, f) && f.isAlive() && !f.intangible);
  }

  /** MeleeSystem / LaserSwordSystem hitboxes + DamageSystem (with clashes). */
  private resolveMelee(now: number): void {
    for (const attacker of this.fighters) {
      const box = attacker.isAlive() ? attacker.currentAttack() : null;
      if (!box) continue;
      for (const target of this.damageablesFor(attacker)) {
        if (box.hit.has(target)) continue;
        const hurt = target.hurtbox();
        const at = box.circles.find((c) => Phaser.Geom.Intersects.CircleToRectangle(c, hurt));
        if (!at) continue;
        box.hit.add(target);
        // Clash: two attacks of similar strength meeting cancel out (CLASH_THRESHOLD = 5).
        const other = target instanceof Kubotz ? target.currentAttack() : null;
        const meet = other?.circles.find((c) => Phaser.Geom.Intersects.CircleToCircle(at, c));
        if (other && meet && Math.abs(other.damage - box.damage) <= 5) {
          other.hit.add(attacker);
          this.impact.clash((at.x + meet.x) / 2, at.y);
          continue;
        }
        this.hit(target, attacker, box.damage, box.launch, box.both ? (target.hurtbox().centerX < attacker.x ? -1 : 1) : box.behind ? (attacker.facing === 1 ? -1 : 1) : attacker.facing, at.x, at.y);
      }
      // Strikes knock the power-up balls away along the move's launch angle.
      for (const orb of this.orbs) {
        if (now < orb.kickedUntil) continue;
        const ball = new Phaser.Geom.Circle(orb.x, orb.y, orb.radius);
        if (!box.circles.some((c) => Phaser.Geom.Intersects.CircleToCircle(c, ball))) continue;
        const dir = box.both ? (orb.x < attacker.x ? -1 : 1) : box.behind ? -attacker.facing : attacker.facing;
        const ang = Phaser.Math.DegToRad(Math.max(20, box.launch.angle));
        const speed = (6 + box.launch.knockback * 0.9) * UNIT;
        orb.body.push(dir * Math.cos(ang) * speed, -Math.sin(ang) * speed);
        orb.kickedUntil = now + 250;
        this.impact.pop(orb.x, orb.y, orb.color);
      }
    }
  }

  /** Robots running into a power-up ball kick it along. */
  private kickOrbs(now: number): void {
    for (const orb of this.orbs) {
      if (now < orb.kickedUntil) continue;
      const ball = new Phaser.Geom.Circle(orb.x, orb.y, orb.radius);
      for (const k of this.fighters) {
        if (!k.isAlive() || !Phaser.Geom.Intersects.CircleToRectangle(ball, k.hurtbox())) continue;
        const away = orb.x < k.x ? -1 : 1;
        const vx = k.body.vx;
        // Faster when running into it; a nudge out of the way when standing.
        const kick = Math.sign(vx) === away ? Math.abs(vx) * 1.1 + 2 * UNIT : 3 * UNIT;
        if (orb.body.vx * away < kick) orb.body.vx = away * kick;
        orb.body.vy = Math.min(orb.body.vy, -(1.5 + (Math.abs(vx) / UNIT) * 0.12) * UNIT);
        orb.kickedUntil = now + 180;
        break;
      }
    }
  }

  private hit(target: Damageable, attacker: Kubotz, damage: number, launch: Launch, dirX: 1 | -1, x: number, y: number): void {
    target.takeDamage(damage, attacker, launch, dirX);
    const pushX = dirX * launch.knockback;
    const blocked = target instanceof Kubotz && (target.guarding || target.shield > 0);
    this.playSfx('punch', blocked ? 0.2 : 0.45);
    this.impact.hit(x, y, Math.sign(pushX) || 1, blocked ? 0x9fdcff : attacker.look.color, (damage / 4) * (blocked ? 0.5 : 1));
  }

  private popBullet(b: Bullet): void {
    if (b.dead) return;
    this.impact.pop(b.x, b.y, b.shooter.look.color);
    b.destroy();
  }

  private updateBullets(now: number, dt: number): void {
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.update(dt);
      this.impact.laserTrail(b.x, b.y, Math.sign(b.pushX) || 1, b.shooter.look.color, b.size);
      if (now >= b.expiresAt) { b.destroy(); continue; }
      const box = b.hitbox();
      if (this.solids.some((r) => Phaser.Geom.Intersects.RectangleToRectangle(box, r))) { this.popBullet(b); continue; }
      // A laser bolt knocks a power-up ball away.
      const orb = this.orbs.find((o) => Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(o.x, o.y, o.radius), box));
      if (orb) {
        orb.body.push(Math.sign(b.pushX) * (8 + Math.abs(b.pushX) * 0.6) * UNIT, -4 * UNIT);
        this.popBullet(b);
        continue;
      }
      for (const target of this.damageablesFor(b.shooter)) {
        if (!Phaser.Geom.Intersects.RectangleToRectangle(box, target.hurtbox())) continue;
        this.hit(target, b.shooter, b.damage, { knockback: Math.abs(b.pushX), angle: 20 }, b.pushX < 0 ? -1 : 1, b.x, b.y);
        this.popBullet(b);
        break;
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  private updateOrbs(now: number): void {
    for (const o of this.orbs) {
      // A crystal tink when it bounces (a sudden change of velocity), louder the harder.
      const dv = Math.hypot(o.body.vx - o.lastVx, o.body.vy - o.lastVy) / UNIT;
      if (dv > 3.5 && now - o.lastTinkAt > 70) {
        o.lastTinkAt = now;
        this.playSfx('orb-bounce', Math.min(0.55, 0.1 + dv * 0.025), Phaser.Math.Between(-250, 350));
        if (fx().distortion) o.glitch(now, dv / 14);
      }
      o.lastVx = o.body.vx; o.lastVy = o.body.vy;
      this.impact.motes(o.x, o.y, o.color, o.radius, 16);
      if (now >= o.expiresAt || o.y > this.map.height * UNIT + 10 * UNIT) o.destroy();
      else o.update(now);
    }
    this.orbs = this.orbs.filter((o) => o.sprite.active);
  }

  /** PowerUpsSystem.updateSpawns: every 5-10 s, at most 5 on the map. */
  private updateBonusSpawns(now: number): void {
    if (now < this.nextBonusAt || this.winnerTeam !== undefined) return;
    this.nextBonusAt = now + Phaser.Math.Between(this.bonusRate.min, this.bonusRate.max);
    if (this.orbs.length >= this.bonusRate.most || this.bonusSpawns.length === 0) return;
    // Never on top of a ball already there.
    const free = this.bonusSpawns.filter((q) => !this.orbs.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < 2 * UNIT));
    if (free.length === 0) return;
    const p = Phaser.Utils.Array.GetRandom(free);
    const orb = new PowerUpOrb(this, this.physicsWorld, p.x + Phaser.Math.Between(-6, 6), p.y, randomPowerUp(), now);
    this.pickupFx.explode(particleCount(12), orb.x, orb.y);
    this.orbs.push(orb);
  }

  /**
   * WARP_ZONE objects (unused in the original) wrap robots and laser bullets
   * across the arena, so a shot fired into a portal comes back from the other
   * side. Falling out of the arena kills.
   */
  private checkBoundsAndWarps(_now: number): void {
    const mapW = this.map.width * UNIT;
    const mapH = this.map.height * UNIT;
    for (const k of this.fighters) {
      if (!k.isAlive()) continue;
      if (k.y > mapH + 6 * UNIT || k.y < -20 * UNIT || k.x < -6 * UNIT || k.x > mapW + 6 * UNIT) {
        k.health = 0;
        continue;
      }
      // A robot going through makes the rift's whoosh (in replays too: playSfx records it).
      this.warp(k.x, k.y, k.body.vx, (x, y) => { k.teleport(x, y); this.playSfx('portal-warp', 0.5, Phaser.Math.Between(-60, 60)); });
    }
    // Everything else that moves goes through the portals too: laser bolts,
    // power-up balls and debris (anything with a position, a velocity and a move).
    const movers: { x: number; y: number; vx: number; teleport: (x: number, y: number) => void }[] = [
      ...this.bullets.filter((b) => !b.dead),
      ...this.orbs.map((o) => ({ x: o.x, y: o.y, vx: o.body.vx, teleport: (x: number, y: number) => o.body.setPosition(x, y) })),
      ...this.debris.bodies.map((d) => ({ x: d.x, y: d.y, vx: d.vx, teleport: (x: number, y: number) => d.setPosition(x, y) })),
    ];
    for (const m of movers) this.warp(m.x, m.y, m.vx, (x, y) => m.teleport(x, y));
  }

  private warp(x: number, y: number, vx: number, teleport: (x: number, y: number) => void): void {
    if (this.warpZones.length !== 2) return;
    const [a, b] = this.warpZones[0].x < this.warpZones[1].x ? this.warpZones : [this.warpZones[1], this.warpZones[0]];
    // "Past the zone's inner edge" rather than "inside it", so fast bullets
    // cannot skip over a 1-unit-wide portal between two frames.
    const inLane = (z: Phaser.Geom.Rectangle) => y >= z.top && y <= z.bottom;
    if (vx < 0 && x < a.right && inLane(a)) {
      teleport(b.x - UNIT, y);
      this.portals.burst(b.centerX, y, this.clock);
    } else if (vx > 0 && x > b.x && inLane(b)) {
      teleport(a.right + UNIT, y);
      this.portals.burst(a.centerX, y, this.clock);
    }
  }

  /** RespawnSystem + LifeBasedFreeForAll. */
  private checkDeaths(now: number): void {
    for (const k of this.fighters) {
      if (!k.isAlive() || k.health > 0) continue;
      // A big explosion of smoke in the team colour (replayed in the kill replays).
      this.impact.koSmoke(k.x, k.y, k.look.color);
      this.shake(0.7);
      const killer = k.lastAttacker && now - k.lastAttacker.at < 6000 ? k.lastAttacker.by : null;
      if (killer && killer !== k) { killer.kills++; killer.stats.kos++; }
      k.stats.falls++;
      // The match point: this K.O. leaves one team (or nobody) standing.
      const final = this.winnerTeam === undefined && k.lives <= 1 && teamsLeft(this.fighters.filter((f) => f !== k || f.lives > 1)).length <= 1;
      this.recorder.ko(k.index, killer && killer !== k ? killer.index : null, now, final);
      this.debris.explode(k, now);
      this.holo.cancel(k);
      if (this.cache.audio.exists('boom')) this.playSfx('boom', 0.7);
      k.kill(now);
      this.floatText(k.x, k.y - UNIT, k.eliminated ? `${k.name} ELIMINATED` : 'K.O.', k.look.color);
    }
    // Last team standing: the match ends when one team (or nobody) is left.
    if (this.winnerTeam === undefined) {
      const left = teamsLeft(this.fighters);
      if (left.length <= 1) this.endMatch(left[0] ?? null, now);
    }
  }

  /** Time up: the team with the most lives left wins (then the most health); a tie is a draw. */
  private checkTime(now: number): void {
    if (!this.timeLimit || this.winnerTeam !== undefined || now - this.startedAt < this.timeLimit) return;
    const score = (team: number) => this.teamOf(team).reduce((s, k) => s + (k.eliminated ? 0 : k.lives * 1000 + Math.max(0, k.health)), 0);
    const ranked = teamsLeft(this.fighters).map((t) => ({ t, s: score(t) })).sort((a, b) => b.s - a.s);
    this.endMatch(ranked.length && (ranked.length === 1 || ranked[0].s > ranked[1].s) ? ranked[0].t : null, now);
  }

  private endMatch(winner: number | null, now: number): void {
    this.winnerTeam = winner;
    this.events.emit('match-over', this.winnerTeam);
    this.overAt = now;
    for (const f of this.fighters) if (!f.eliminated && f.team === winner) f.celebrating = true;
  }

  /** The robots of a team. */
  teamOf(team: number): Kubotz[] {
    return this.fighters.filter((f) => f.team === team);
  }

  /** The match as it ended, for the post-match screens (the K.O. replays are added when it is handed over). */
  result(): MatchResult {
    return {
      fighters: this.specs,
      stats: this.fighters.map((k) => ({ ...k.stats })),
      winnerTeam: this.winnerTeam ?? null,
      duration: Math.max(0, (this.winnerTeam === undefined ? this.clock : this.overAt) - this.startedAt),
      names: this.fighters.map((k) => k.name),
      colors: this.fighters.map((k) => k.look.color),
      tags: this.fighters.map((k) => k.tagKey),
      highlights: [],
      hull: this.warpZones.length > 0,
      blocks: this.blocks.map(({ x, y, width, height }) => ({ x, y, width, height })),
      arena: this.arena,
      warpZones: this.warpZones.map(({ x, y, width, height }) => ({ x, y, width, height })),
    };
  }

  private respawn(k: Kubotz): void {
    // Prefer the spawn point farthest from the other robots.
    const others = this.fighters.filter((f) => f !== k && f.isAlive());
    const spawn = [...this.playerSpawns].sort((p, q) => {
      const d = (v: Phaser.Math.Vector2) => Math.min(...others.map((o) => Phaser.Math.Distance.Between(v.x, v.y, o.x, o.y)), 1e9);
      return d(q) - d(p);
    })[0];
    k.respawn(spawn.x + Phaser.Math.Between(-6, 6), spawn.y);
    // It materializes in a hologram over the spawn point, then drops.
    this.holo.start(k, this.clock, (x, y) => k.teleport(x, y), spawn.y);
    this.playSfx('holo-spawn', 0.45);
  }

  // ------------------------------------------------------------------ camera
  /** What the camera keeps in view: the robots still fighting, and the power-ups on offer. */
  private focusPoints(): { x: number; y: number }[] {
    const alive = this.fighters.filter((f) => f.isAlive());
    // A new power-up ball is shown for its first 2 seconds, then the camera keeps to the robots.
    const fresh = this.orbs.filter((o) => this.clock < o.expiresAt - Config.POWERUP_LIFETIME + ORB_FOCUS_MS);
    return alive.length === 0 ? [] : [...alive, ...fresh];
  }

  private centerOfFighters(): Phaser.Math.Vector2 {
    const pts = this.focusPoints();
    if (pts.length === 0) return this.camTarget.clone();
    const xs = pts.map((f) => f.x);
    const ys = pts.map((f) => f.y);
    return new Phaser.Math.Vector2((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  }

  /** Match intro: the robot whose spawn the camera is showing (its spawn point), or null once all are shown. */
  private introFocus(): { x: number; y: number } | null {
    const i = Math.floor(this.clock / INTRO_FOCUS_MS);
    const k = this.fighters[i];
    // A little low, so the projector under the robot shows above the HUD cards.
    return this.clock < this.fighters.length * INTRO_FOCUS_MS && k ? { x: k.x, y: k.y + 0.9 * UNIT } : null;
  }

  /** CameraSystem: lerp to the centre of all robots (and new power-ups), zoom to fit them. */
  private updateCamera(dt: number): void {
    const pts = this.focusPoints();
    // The intro moves faster: close on each spawn in turn, then back out to the fight.
    const intro = this.winnerTeam === undefined && this.clock < this.countdownAt + INTRO_RETURN_MS ? INTRO_CAMERA_PACE : 1;
    const focus = this.winnerTeam === undefined ? this.introFocus() : null;
    if (focus) {
      this.camVisibleWidth = Phaser.Math.Linear(this.camVisibleWidth, INTRO_VIEW_WIDTH, Math.min(1, Config.CAMERA_ZOOM_SPEED * intro * dt));
      this.camTarget.set(focus.x, focus.y);
    } else if (pts.length > 0) {
      const xs = pts.map((f) => f.x);
      const ys = pts.map((f) => f.y);
      const spanX = (Math.max(...xs) - Math.min(...xs)) / UNIT;
      const spanY = (Math.max(...ys) - Math.min(...ys)) / UNIT;
      const aspect = this.scale.width / this.scale.height;
      // After the match the camera closes in on the dancing winner.
      const wanted = this.winnerTeam !== undefined ? 15 : Phaser.Math.Clamp(Math.max(spanX + 14, (spanY + 10) * aspect), 24, 58);
      this.camVisibleWidth = Phaser.Math.Linear(this.camVisibleWidth, wanted, Math.min(1, Config.CAMERA_ZOOM_SPEED * 0.25 * intro * dt));
      this.camTarget.copy(this.centerOfFighters());
    }
    const cam = this.cameras.main;
    const t = Math.min(1, Config.CAMERA_SPEED * 0.5 * intro * dt);
    const mid = this.camMid;
    mid.set(Phaser.Math.Linear(mid.x, this.camTarget.x, t), Phaser.Math.Linear(mid.y, this.camTarget.y - UNIT, t));
    this.applyZoom();
    // Shake: trauma squared drives a smooth wobble of position and roll, and wears off.
    const s = this.trauma * this.trauma;
    const k = this.clock / 1000;
    const wob = (f: number, p: number) => Math.sin(k * f + p) * 0.6 + Math.sin(k * f * 2.3 + p * 1.7) * 0.4;
    cam.centerOn(mid.x + SHAKE_MAX * s * wob(47, 0), mid.y + SHAKE_MAX * s * wob(53, 2));
    cam.setRotation(0.012 * s * wob(31, 4));
    this.trauma = Math.max(0, this.trauma - SHAKE_DECAY * dt);
    this.perspective?.update(mid);
    this.placeFixedLights();
  }

  /** Adds camera shake (0..1 of trauma): strong hits, hard landings, K.O.s. */
  shake(amount: number): void {
    if (fx().shake) this.trauma = Math.min(1, this.trauma + amount);
  }

  private applyZoom(): void {
    this.cameras.main.setZoom(this.scale.width / (this.camVisibleWidth * UNIT));
  }

  // ---------------------------------------------------------------- helpers
  floatText(x: number, y: number, text: string, color: number): void {
    const t = this.add.text(x, y, text, body(26, {
      fontStyle: '800', color: '#' + color.toString(16).padStart(6, '0'), stroke: '#000000', strokeThickness: 5,
    })).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1200, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  togglePause(): void {
    if (this.winnerTeam !== undefined) return;
    // Esc both pauses (here) and goes back in the pause menu (Hud): once a frame.
    if (this.toggledFrame === this.game.loop.frame) return;
    this.toggledFrame = this.game.loop.frame;
    this.paused = !this.paused;
    uiSound(this, this.paused ? 'confirm' : 'back');
    if (this.paused) this.tweens.pauseAll(); else this.tweens.resumeAll(); // physics only steps in update()
    duckMusic(this.music, this.paused ? PAUSE_MUSIC : 1);
    this.events.emit('pause', this.paused);
  }

  /** From the pause menu: the settings or controls screen over the paused match; back to the pause after. */
  openOverlay(key: 'Settings' | 'Controls'): void {
    if (!this.paused) return;
    uiSound(this, 'confirm');
    this.scene.pause('Hud');
    this.scene.pause();
    this.scene.launch(key, { resume: ['Game', 'Hud'] });
    this.scene.bringToTop(key);
  }

  backToTitle(): void {
    if (this.quitting) return;
    this.quitting = true;
    shutter(this, () => this.scene.start('Title'), 'back');
  }
}

/**
 * A canvas kept in memory rather than on the GPU: the arena bakes read their
 * pixels back several times, and each read of a GPU canvas stalls the frame.
 */
function cpuCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d', { willReadFrequently: true });
  return c;
}

/** The setup screen's arena preview is baked at this fraction of the match's resolution (a sixteenth of the work at 0.25). */
const PREVIEW_BAKE = 0.3;

/** The match is over: how long the winners dance before "press to continue" (ms). */
const CONTINUE_DELAY = 1600;

/** Camera shake: the largest offset (world px) and how fast trauma wears off (per second). */
const SHAKE_MAX = 0.45 * UNIT;
const SHAKE_DECAY = 1.8;

/** The pause lowers the match music to this much of its level. */
const PAUSE_MUSIC = 0.3;

/**
 * Match intro: the robots appear as holograms one after the other, the
 * camera on each for INTRO_FOCUS_MS, then the 3-2-1 countdown starts while
 * the camera takes INTRO_RETURN_MS back out to the fight view; the robots
 * materialize during the countdown (fx/Hologram.ts). INTRO_VIEW_WIDTH is how
 * much of the arena (units) shows round a spawn; INTRO_CAMERA_PACE how much faster than in
 * the fight the camera moves meanwhile.
 */
const INTRO_FOCUS_MS = 750;
const INTRO_RETURN_MS = 600;
const INTRO_VIEW_WIDTH = 14;
const INTRO_CAMERA_PACE = 3;

/** How long the camera keeps a newly spawned power-up ball in view. */
const ORB_FOCUS_MS = 2000;

/**
 * Ledges, Melee-style: the top corners of solid blocks with room to stand on
 * just inside the corner and room to hang just outside it. Soft platforms
 * have none.
 */
export function findLedges(blocks: NavBlock[]): Ledge[] {
  const solid = blocks.filter((b) => !b.soft);
  const free = (x1: number, y1: number, x2: number, y2: number) =>
    !solid.some((o) => o.x < Math.max(x1, x2) - 1 && o.x + o.width > Math.min(x1, x2) + 1 && o.y < Math.max(y1, y2) - 1 && o.y + o.height > Math.min(y1, y2) + 1);
  const out: Ledge[] = [];
  for (const b of solid) {
    for (const dir of [-1, 1] as const) {
      const x = dir < 0 ? b.x : b.x + b.width;
      const y = b.y;
      if (free(x, y - 2 * UNIT, x - dir * UNIT, y) && free(x, y - 0.5 * UNIT, x + dir * 1.2 * UNIT, y + 2.2 * UNIT)) out.push({ x, y, dir });
    }
  }
  return out;
}
