import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { SpriterData } from '../spriter/Spriter';
import { TmxMap, MapObject } from '../map/TmxMap';
import { HumanController, PLAYER_1_KEYS, PLAYER_2_KEYS, Controller } from '../game/Input';
import { CpuController } from '../game/Ai';
import { Kubotz, Damageable, ArenaHooks, Launch, P1_COLOR, P2_COLOR, CPU_COLORS } from '../game/Kubotz';
import { PowerUpOrb, randomPowerUp, POWER_UPS } from '../game/PowerUps';
import { Bullet } from '../game/Combat';
import type { MatchSetup } from './TitleScene';
import type { ParticleName } from './BootScene';
import { EffectDef, ParticleFx } from '../fx/ParticleEffect';
import { GradePipeline } from '../fx/Grade';
import { lit, normalMapFor } from '../fx/NormalMaps';
import { ImpactFx } from '../fx/Impact';
import { PhysicsWorld } from '../physics/Physics';
import { Nav, NavBlock } from '../game/Nav';
import { DebrisField } from '../game/Debris';
import { ARENAS, buildArenaMap } from '../map/Arenas';
import { Rig } from '../anim/Rig';
import type { DebugState } from './DebugScene';

/** The arena: InGameScreen + the gameplay systems that work across entities. */
/** Fixed blue lights over the platforms (main.ts maxLights must cover these + 2 + the pool). */
const PLATFORM_LIGHTS = 20;

export class GameScene extends Phaser.Scene implements ArenaHooks {
  fighters: Kubotz[] = [];
  private map!: TmxMap;
  physicsWorld!: PhysicsWorld;
  /** Debug mode and its time controls (F3, see DebugScene). */
  readonly debugState: DebugState = { on: false, timeScale: 1, frozen: false, steps: 0, nav: true };
  private glows: Phaser.GameObjects.Image[] = [];
  /** Light2D: a key light and a rim light that follow the camera, and a pool for lasers, hits and pick-ups. */
  private keyLight: Phaser.GameObjects.Light | null = null;
  private rimLight: Phaser.GameObjects.Light | null = null;
  private pointLights: Phaser.GameObjects.Light[] = [];
  private solids: Phaser.Geom.Rectangle[] = [];
  private blocks: NavBlock[] = [];
  private nav!: Nav;
  private debris!: DebrisField;
  private playerSpawns: Phaser.Math.Vector2[] = [];
  private bonusSpawns: Phaser.Math.Vector2[] = [];
  private warpZones: Phaser.Geom.Rectangle[] = [];
  private orbs: PowerUpOrb[] = [];
  private bullets: Bullet[] = [];
  private nextBonusAt = 0;
  private particles!: ParticleFx;
  private impact!: ImpactFx;
  private effects!: Record<ParticleName, EffectDef>;
  private nextSmokeAt = 0;
  private pickupFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private camTarget = new Phaser.Math.Vector2();
  private camVisibleWidth = 30;
  winner: Kubotz | null | undefined; // undefined while the match runs
  /** Match clock in ms: only advances while the game is not paused. */
  clock = 0;
  /** When the fight starts (after the 3-2-1 countdown), on the match clock. */
  startedAt: number = Config.COUNTDOWN;
  private countdownStep = -1;
  paused = false;
  private music?: Phaser.Sound.BaseSound;

  constructor() { super('Game'); }

  init(): void {
    this.fighters = [];
    this.orbs = [];
    this.bullets = [];
    this.playerSpawns = [];
    this.bonusSpawns = [];
    this.warpZones = [];
    this.solids = [];
    this.blocks = [];
    this.winner = undefined;
    this.paused = false;
    this.clock = 0;
    this.countdownStep = -1;
  }

  create(setup: MatchSetup): void {
    const original: TmxMap = this.registry.get('map');
    const arena = ARENAS[setup.arena ?? 0];
    this.map = arena ? buildArenaMap(arena, original) : original;
    const spriter: SpriterData = this.registry.get('spriter');
    const rig = new Rig(spriter);
    this.physicsWorld = new PhysicsWorld();
    const mapW = this.map.width * this.map.tileWidth;

    this.scene.launch('Backdrop');
    this.scene.sendToBack('Backdrop');
    this.buildMap();
    this.debris = new DebrisField(this, this.physicsWorld);
    this.createEffects();

    const humans = { P1: 0, P2: 0 };
    let cpus = 0;
    setup.slots.forEach((slot, i) => {
      let controller: Controller;
      let color: number;
      if (slot === 'CPU') {
        color = CPU_COLORS[cpus++ % CPU_COLORS.length];
        controller = new CpuController({
          enemiesOf: (k) => this.fighters.filter((f) => f !== k && !f.eliminated),
          powerUpPositions: () => this.orbs.map((o) => ({ x: o.x, y: o.y })),
          now: () => this.clock,
          nav: this.nav,
        });
      } else {
        color = slot === 'P1' ? P1_COLOR : P2_COLOR;
        controller = new HumanController(this, slot === 'P1' ? PLAYER_1_KEYS : PLAYER_2_KEYS, slot, humans.P1 + humans.P2);
        humans[slot]++;
      }
      const spawn = this.playerSpawns[i % this.playerSpawns.length];
      const k = new Kubotz(this, i, controller, color, rig, spawn.x, spawn.y, this, this.physicsWorld);
      if (controller instanceof CpuController) controller.agent = k;
      k.facing = spawn.x < mapW / 2 ? 1 : -1;
      this.fighters.push(k);
    });

    const cam = this.cameras.main;
    const c = this.centerOfFighters();
    this.camTarget.copy(c);
    cam.centerOn(c.x, c.y);
    this.applyZoom();
    this.nextBonusAt = Config.COUNTDOWN + Phaser.Math.Between(Config.MIN_DELAY_BONUS_SPAWN, Config.MAX_DELAY_BONUS_SPAWN);

    this.sound.stopByKey('music-title');
    this.music = this.sound.add('music-game', { loop: true, volume: 0.45 });
    this.music.play();

    this.scene.launch('Hud');
    this.scene.bringToTop('Hud');

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-F', () => {
      const on = this.toggleBloom();
      this.floatText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, on ? 'Effects on' : 'Effects off', 0xffffff);
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
    this.setupBloom();
    this.setupLights();
    kb.on('keydown-ENTER', () => { if (this.winner !== undefined) this.backToTitle(); });
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 9) this.togglePause(); // Start
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.music?.destroy();
      this.scene.stop('Hud');
      this.scene.stop('Debug');
      this.scene.stop('Backdrop');
      this.debris.destroy();
      for (const k of this.fighters) k.destroy();
    });
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
    const art = this.textures.createCanvas('arena', mapW, mapH)!;
    const normals = document.createElement('canvas');
    normals.width = mapW; normals.height = mapH;
    const nctx = normals.getContext('2d')!;
    nctx.fillStyle = 'rgb(128,128,255)';
    nctx.fillRect(0, 0, mapW, mapH);
    const actx = art.getContext();
    for (const layer of m.layers) {
      layer.gids.forEach((gid, i) => {
        const img = m.tileImages.get(gid);
        if (!img) return;
        const source = this.textures.get(`tile:${img.source}`).getSourceImage() as HTMLImageElement;
        // Tiled anchors image tiles at the cell's bottom-left corner.
        const x = (i % m.width) * m.tileWidth;
        const y = (Math.floor(i / m.width) + 1) * m.tileHeight - source.height;
        actx.drawImage(source, x, y);
        nctx.drawImage(normalMapFor(`tile:${img.source}`, source, { bevel: 3, detail: 0.3, strength: 1 }), x, y);
      });
    }
    art.refresh();
    if (this.sys.renderer.type === Phaser.WEBGL) art.setDataSource(normals);
    lit(this.add.image(0, 0, 'arena').setOrigin(0, 0).setDepth(2));
    // The tiles' blue light strips glow on their own, whatever the lights do.
    this.buildArenaGlow(actx.canvas, mapW, mapH);

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
    // A lit edge along the top of every block, like the 3D version's glowing rims.
    const rims = this.add.graphics().setDepth(2.6).setBlendMode(Phaser.BlendModes.ADD);
    for (const b of this.blocks) {
      rims.lineStyle(7, 0x29abe2, 0.18).lineBetween(b.x, b.y + 1, b.x + b.width, b.y + 1);
      rims.lineStyle(2, 0x9fe6ff, 0.75).lineBetween(b.x, b.y + 1, b.x + b.width, b.y + 1);
    }
    this.nav = new Nav(this.blocks);
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
   * The emissive layer: the saturated blue pixels of the arena art, sharp and
   * blurred twice, drawn additively over the lit arena and breathing slowly,
   * like the 3D version's glowing platforms.
   */
  private buildArenaGlow(art: HTMLCanvasElement, w: number, h: number): void {
    const mask = document.createElement('canvas');
    mask.width = w; mask.height = h;
    const mctx = mask.getContext('2d')!;
    const src = art.getContext('2d')!.getImageData(0, 0, w, h);
    const d = src.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const blue = b - Math.max(r, g * 0.55);
      if (d[i + 3] < 40 || b < 120 || blue < 50) { d[i + 3] = 0; continue; }
      const k = Math.min(1, (blue - 50) / 90);
      d[i] = Math.min(255, r * 0.6 + 40 * k); d[i + 1] = Math.min(255, g + 40 * k); d[i + 2] = 255; d[i + 3] = 255 * k;
    }
    mctx.putImageData(src, 0, 0);
    if (this.textures.exists('arena-glow')) this.textures.remove('arena-glow');
    const glow = this.textures.createCanvas('arena-glow', w, h)!;
    const g = glow.getContext();
    g.filter = 'blur(18px)';
    g.drawImage(mask, 0, 0);
    g.drawImage(mask, 0, 0);
    g.filter = 'blur(5px)';
    g.drawImage(mask, 0, 0);
    g.filter = 'none';
    g.globalAlpha = 0.8;
    g.drawImage(mask, 0, 0);
    glow.refresh();
    const layer = this.add.image(0, 0, 'arena-glow').setOrigin(0, 0).setDepth(2.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
    this.tweens.add({ targets: layer, alpha: 0.6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private spawnPoint(o: MapObject): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(o.x + o.width / 2, o.y + o.height - (Config.KUBOTZ_HEIGHT * UNIT) / 2);
  }

  private createEffects(): void {
    // The original LibGDX particle effects (.pe files), as the full-on-scripting branch plays them.
    this.particles = new ParticleFx(this, 'pe:');
    this.impact = new ImpactFx(this);
    this.effects = this.registry.get('effects');
    // Small sparkles for portals and power-ups appearing.
    this.pickupFx = this.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 220 }, lifespan: 500, scale: { start: 0.8, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(15);
  }

  private fx(name: ParticleName, x: number, y: number, tint?: number): void {
    this.particles.play(this.effects[name], x, y, tint);
  }

  // -------------------------------------------------------------- ArenaHooks
  now(): number {
    return this.clock;
  }

  playSfx(key: string, volume = 0.5): void {
    if (key === 'guard-break') { this.cameras.main.shake(160, 0.006); key = 'punch'; }
    if (key === 'dodge') key = 'step';
    this.sound.play(key, { volume });
  }

  dust(x: number, y: number): void {
    this.fx('landingDust', x, y);
  }

  runDust(x: number, y: number, dir: number): void {
    this.impact.runDust(x, y, dir);
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

  tryGrab(kubotz: Kubotz, area: Phaser.Geom.Circle): void {
    for (const orb of [...this.orbs]) {
      if (!Phaser.Geom.Intersects.CircleToRectangle(area, orb.sprite.getBounds())) continue;
      kubotz.givePowerUp(orb.type, this.clock);
      this.fx('pickUp', orb.x, orb.y);
      this.floatText(kubotz.x, kubotz.body.top - 40, POWER_UPS[orb.type].label, POWER_UPS[orb.type].color);
      orb.destroy();
      this.orbs = this.orbs.filter((o) => o !== orb);
    }
  }

  // ------------------------------------------------------------------ update
  update(_time: number, deltaMs: number): void {
    if (this.paused) return;
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
    this.updateCountdown(now);
    const fighting = now >= this.startedAt;

    for (const k of this.fighters) {
      if (!k.isAlive() && !k.eliminated && this.winner === undefined && now >= k.respawnAt) this.respawn(k);
      k.update(now, dt, fighting);
    }
    this.physicsWorld.step(dt);
    this.resolveMelee();
    this.debris.update(now, this.fighters, (victim, x, y) => {
      this.playSfx('punch', 0.3);
      this.impact.hit(x, y, Math.sign(victim.x - x) || 1, 0xffb060, 0.6);
    });
    this.updateBullets(now, dt);
    this.updateOrbs(now);
    this.checkBoundsAndWarps(now);
    this.checkDeaths(now);
    this.updateBonusSpawns(now);
    for (const k of this.fighters) {
      k.render(now, dtMs);
      // A trail behind the striking fist, foot or blade tip.
      this.impact.swing(k, k.isAlive() ? k.swingArc() : null, k.look.color);
    }
    this.particles.update(dtMs);
    this.impact.update(now, dtMs);
    this.updateCamera(dt);
    this.drawGlows();
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
      ...this.debris.lights(this.clock),
      ...this.impact.lights(),
    ];
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

  // -------------------------------------------------------------- bloom
  private bloom: Phaser.FX.Bloom | null = null;

  /** A soft bloom on the whole view (WebGL only); off with ?lowfx, toggled with F. */
  private setupBloom(): void {
    if (new URLSearchParams(location.search).has('lowfx')) return;
    this.toggleBloom();
  }

  /** Bloom then the grade pass; both on or both off. */
  private toggleBloom(): boolean {
    const cam = this.cameras.main;
    if (this.bloom) {
      cam.postFX.remove(this.bloom);
      cam.removePostPipeline('Grade');
      this.bloom = null;
      return false;
    }
    if (!cam.postFX || this.sys.renderer.type !== Phaser.WEBGL) return false;
    const pipelines = (this.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
    if (!pipelines.postPipelineClasses.has('Grade')) pipelines.addPostPipeline('Grade', GradePipeline);
    this.bloom = cam.postFX.addBloom(0xffffff, 1, 1, 0.9, 0.9, 4);
    cam.setPostPipeline(GradePipeline);
    return true;
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
    this.lights.enable().setAmbientColor(0x64709a);
    this.keyLight = this.lights.addLight(0, 0, 100, 0xffe8cc, 3.2);
    this.rimLight = this.lights.addLight(0, 0, 100, 0x3aa8ff, 2.0);
    for (let i = 0; i < 12; i++) this.pointLights.push(this.lights.addLight(0, 0, UNIT * 4, 0xffffff, 0).setVisible(false));
    // Blue light rising off the top of every block (wide ones get several).
    let fixed = 0;
    for (const b of this.blocks) {
      const n = Math.max(1, Math.round(b.width / (UNIT * 9)));
      for (let i = 0; i < n && fixed < PLATFORM_LIGHTS; i++, fixed++) {
        const x = b.x + (b.width * (i + 0.5)) / n;
        this.lights.addLight(x, b.y - UNIT * 1.2, Math.max(UNIT * 6, (b.width / n) * 0.9), 0x29abe2, 2.4);
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
    const step = Math.min(3, Math.floor(now / 1000));
    if (step === this.countdownStep) return;
    this.countdownStep = step;
    const word = ['3', '2', '1', 'fight'][step];
    this.sound.play(`narrator-${word}`, { volume: 0.8 });
    this.events.emit('countdown', word === 'fight' ? 'FIGHT!' : word);
  }

  private damageablesFor(attacker: Kubotz): Damageable[] {
    return this.fighters.filter((f) => f !== attacker && f.isAlive() && !f.intangible);
  }

  /** MeleeSystem / LaserSwordSystem hitboxes + DamageSystem (with clashes). */
  private resolveMelee(): void {
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
    }
  }

  private hit(target: Damageable, attacker: Kubotz, damage: number, launch: Launch, dirX: 1 | -1, x: number, y: number): void {
    target.takeDamage(damage, attacker, launch, dirX);
    const pushX = dirX * launch.knockback;
    const blocked = target instanceof Kubotz && (target.guarding || target.shield > 0);
    this.playSfx('punch', blocked ? 0.2 : 0.45);
    this.impact.hit(x, y, Math.sign(pushX) || 1, blocked ? 0x9fdcff : attacker.look.color, (damage / 4) * (blocked ? 0.5 : 1));
    if (damage >= 5) this.cameras.main.shake(90, 0.004);
  }

  private popBullet(b: Bullet): void {
    if (b.dead) return;
    this.impact.pop(b.x, b.y, b.shooter.look.color);
    b.destroy();
  }

  private updateBullets(now: number, dt: number): void {
    const smoke = now >= this.nextSmokeAt; // BulletGraphicsScript: a trail of laser smoke
    if (smoke) this.nextSmokeAt = now + 60;
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.update(dt);
      if (smoke) this.fx('laserSmoke', b.x, b.y, b.shooter.look.color);
      if (now >= b.expiresAt) { b.destroy(); continue; }
      const box = b.hitbox();
      if (this.solids.some((r) => Phaser.Geom.Intersects.RectangleToRectangle(box, r))) { this.popBullet(b); continue; }
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
      if (now >= o.expiresAt || o.y > this.map.height * UNIT + 10 * UNIT) o.destroy();
      else o.update(now);
    }
    this.orbs = this.orbs.filter((o) => o.sprite.active);
  }

  /** PowerUpsSystem.updateSpawns: every 5-10 s, at most 5 on the map. */
  private updateBonusSpawns(now: number): void {
    if (now < this.nextBonusAt || this.winner !== undefined) return;
    this.nextBonusAt = now + Phaser.Math.Between(Config.MIN_DELAY_BONUS_SPAWN, Config.MAX_DELAY_BONUS_SPAWN);
    if (this.orbs.length >= Config.MAX_NB_BONUS || this.bonusSpawns.length === 0) return;
    const p = Phaser.Utils.Array.GetRandom(this.bonusSpawns);
    const orb = new PowerUpOrb(this, this.physicsWorld, p.x + Phaser.Math.Between(-6, 6), p.y, randomPowerUp(), now);
    this.pickupFx.explode(12, orb.x, orb.y);
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
      this.warp(k.x, k.y, k.body.vx, (x, y) => k.teleport(x, y));
    }
    for (const b of this.bullets) {
      if (!b.dead) this.warp(b.x, b.y, b.vx, (x, y) => b.teleport(x, y));
    }
  }

  private warp(x: number, y: number, vx: number, teleport: (x: number, y: number) => void): void {
    if (this.warpZones.length !== 2) return;
    const [a, b] = this.warpZones[0].x < this.warpZones[1].x ? this.warpZones : [this.warpZones[1], this.warpZones[0]];
    // "Past the zone's inner edge" rather than "inside it", so fast bullets
    // cannot skip over a 1-unit-wide portal between two frames.
    const inLane = (z: Phaser.Geom.Rectangle) => y >= z.top && y <= z.bottom;
    if (vx < 0 && x < a.right && inLane(a)) {
      teleport(b.x - UNIT, y);
      this.pickupFx.explode(10, b.x, y);
    } else if (vx > 0 && x > b.x && inLane(b)) {
      teleport(a.right + UNIT, y);
      this.pickupFx.explode(10, a.right, y);
    }
  }

  /** RespawnSystem + LifeBasedFreeForAll. */
  private checkDeaths(now: number): void {
    for (const k of this.fighters) {
      if (!k.isAlive() || k.health > 0) continue;
      this.fx('deathDust', k.x, k.body.bottom);
      this.cameras.main.shake(220, 0.01);
      const killer = k.lastAttacker && now - k.lastAttacker.at < 6000 ? k.lastAttacker.by : null;
      if (killer && killer !== k) killer.kills++;
      this.debris.explode(k, now);
      if (this.cache.audio.exists('boom')) this.playSfx('boom', 0.7);
      k.kill(now);
      this.floatText(k.x, k.y - UNIT, k.eliminated ? `${k.name} ELIMINATED` : 'K.O.', k.look.color);
    }
    if (this.winner === undefined) {
      const alive = this.fighters.filter((f) => !f.eliminated);
      if (alive.length <= 1) {
        this.winner = alive[0] ?? null;
        this.events.emit('match-over', this.winner);
      }
    }
  }

  private respawn(k: Kubotz): void {
    // Prefer the spawn point farthest from the other robots.
    const others = this.fighters.filter((f) => f !== k && f.isAlive());
    const spawn = [...this.playerSpawns].sort((p, q) => {
      const d = (v: Phaser.Math.Vector2) => Math.min(...others.map((o) => Phaser.Math.Distance.Between(v.x, v.y, o.x, o.y)), 1e9);
      return d(q) - d(p);
    })[0];
    k.respawn(spawn.x + Phaser.Math.Between(-6, 6), spawn.y);
    this.fx('stars', spawn.x, spawn.y);
  }

  // ------------------------------------------------------------------ camera
  /** What the camera keeps in view: the robots still fighting, and the power-ups on offer. */
  private focusPoints(): { x: number; y: number }[] {
    const alive = this.fighters.filter((f) => f.isAlive());
    return alive.length === 0 ? [] : [...alive, ...this.orbs];
  }

  private centerOfFighters(): Phaser.Math.Vector2 {
    const pts = this.focusPoints();
    if (pts.length === 0) return this.camTarget.clone();
    const xs = pts.map((f) => f.x);
    const ys = pts.map((f) => f.y);
    return new Phaser.Math.Vector2((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  }

  /** CameraSystem: lerp to the centre of all robots and power-ups, zoom to fit them. */
  private updateCamera(dt: number): void {
    const pts = this.focusPoints();
    if (pts.length > 0) {
      const xs = pts.map((f) => f.x);
      const ys = pts.map((f) => f.y);
      const spanX = (Math.max(...xs) - Math.min(...xs)) / UNIT;
      const spanY = (Math.max(...ys) - Math.min(...ys)) / UNIT;
      const aspect = this.scale.width / this.scale.height;
      const wanted = Phaser.Math.Clamp(Math.max(spanX + 14, (spanY + 10) * aspect), 24, 58);
      this.camVisibleWidth = Phaser.Math.Linear(this.camVisibleWidth, wanted, Math.min(1, Config.CAMERA_ZOOM_SPEED * 0.25 * dt));
      this.camTarget.copy(this.centerOfFighters());
    }
    const cam = this.cameras.main;
    const t = Math.min(1, Config.CAMERA_SPEED * 0.5 * dt);
    const cx = Phaser.Math.Linear(cam.midPoint.x, this.camTarget.x, t);
    const cy = Phaser.Math.Linear(cam.midPoint.y, this.camTarget.y - UNIT, t);
    this.applyZoom();
    cam.centerOn(cx, cy);
    this.placeFixedLights();
  }

  private applyZoom(): void {
    this.cameras.main.setZoom(this.scale.width / (this.camVisibleWidth * UNIT));
  }

  // ---------------------------------------------------------------- helpers
  floatText(x: number, y: number, text: string, color: number): void {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '26px',
      color: '#' + color.toString(16).padStart(6, '0'), stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1200, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  togglePause(): void {
    if (this.winner !== undefined) return;
    this.paused = !this.paused;
    if (this.paused) this.tweens.pauseAll(); else this.tweens.resumeAll(); // physics only steps in update()
    this.events.emit('pause', this.paused);
  }

  backToTitle(): void {
    this.scene.start('Title');
  }
}
