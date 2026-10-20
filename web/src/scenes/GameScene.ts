import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { SpriterData } from '../spriter/Spriter';
import { TmxMap, MapObject } from '../map/TmxMap';
import { HumanController, PLAYER_1_KEYS, PLAYER_2_KEYS, Controller } from '../game/Input';
import { CpuController } from '../game/Ai';
import { Kubotz, Damageable, ArenaHooks, P1_COLOR, P2_COLOR, CPU_COLORS } from '../game/Kubotz';
import { PowerUpOrb, randomPowerUp, POWER_UPS } from '../game/PowerUps';
import { Bullet } from '../game/Combat';
import type { MatchSetup } from './TitleScene';
import type { ParticleName } from './BootScene';
import { EffectDef, ParticleFx } from '../fx/ParticleEffect';
import { PhysicsWorld } from '../physics/Physics';
import { Nav, NavBlock } from '../game/Nav';
import type { World3D } from '../three/World3D';

/** The arena: InGameScreen + the gameplay systems that work across entities. */
export class GameScene extends Phaser.Scene implements ArenaHooks {
  fighters: Kubotz[] = [];
  private map!: TmxMap;
  private physicsWorld!: PhysicsWorld;
  private world3d!: World3D;
  private solids: Phaser.Geom.Rectangle[] = [];
  private blocks: NavBlock[] = [];
  private nav!: Nav;
  private playerSpawns: Phaser.Math.Vector2[] = [];
  private bonusSpawns: Phaser.Math.Vector2[] = [];
  private warpZones: Phaser.Geom.Rectangle[] = [];
  private orbs: PowerUpOrb[] = [];
  private bullets: Bullet[] = [];
  private nextBonusAt = 0;
  private particles!: ParticleFx;
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
    this.map = this.registry.get('map');
    const spriter: SpriterData = this.registry.get('spriter');
    this.physicsWorld = new PhysicsWorld();
    const mapW = this.map.width * this.map.tileWidth;

    this.world3d = this.registry.get('world3d');
    this.buildMap();
    this.world3d.buildArena(
      this.map, this.solids,
      (source) => (this.textures.exists(`tile:${source}`) ? this.textures.get(`tile:${source}`).getSourceImage() as HTMLImageElement : null),
      this.textures.get('bg').getSourceImage() as HTMLImageElement,
    );
    this.world3d.visible = true;
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
      const k = new Kubotz(this, i, controller, color, spriter, spawn.x, spawn.y, this, this.physicsWorld, this.world3d);
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
      const on = this.world3d.toggleEffects();
      this.floatText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, on ? 'Effects on' : 'Effects off', 0xffffff);
    });
    kb.on('keydown-ENTER', () => { if (this.winner !== undefined) this.backToTitle(); });
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 9) this.togglePause(); // Start
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.music?.destroy();
      this.scene.stop('Hud');
      this.world3d.visible = false;
      for (const k of this.fighters) k.destroy();
    });
  }

  // ---------------------------------------------------------------------- map
  private buildMap(): void {
    const m = this.map;
    // The original kept the Tiled art layers hidden behind its debug shapes; the
    // port draws them in 3D (World3D.buildArena): blocks are extruded boxes with
    // the tile art on their faces.
    const mapW = m.width * m.tileWidth;

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
    this.nav = new Nav(this.blocks);
    // The map has a single PLAYER_SPAWN (the second robot was hard-coded at (8, 7)):
    // add mirrored and central spawns so up to four robots start apart.
    const first = this.playerSpawns[0] ?? new Phaser.Math.Vector2(8 * UNIT, 30 * UNIT);
    this.playerSpawns.push(
      new Phaser.Math.Vector2(mapW - first.x, first.y),
      new Phaser.Math.Vector2(mapW / 2 - 3 * UNIT, 21.5 * UNIT),
      new Phaser.Math.Vector2(mapW / 2 + 3 * UNIT, 21.5 * UNIT),
    );
  }

  private spawnPoint(o: MapObject): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(o.x + o.width / 2, o.y + o.height - (Config.KUBOTZ_HEIGHT * UNIT) / 2);
  }

  private createEffects(): void {
    // The original LibGDX particle effects (.pe files), as the full-on-scripting branch plays them.
    this.particles = new ParticleFx(this, 'pe:');
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

  fireBullet(shooter: Kubotz, damage: number, speed: number): void {
    const { x, y } = shooter.muzzle();
    const b = new Bullet(this, shooter, x, y, shooter.facing * speed, 0, damage, this.clock);
    this.playSfx('shot', 0.3);
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
    const dtMs = Math.min(deltaMs, 50);
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
    this.updateBullets(now, dt);
    this.updateOrbs(now);
    this.checkBoundsAndWarps(now);
    this.checkDeaths(now);
    this.updateBonusSpawns(now);
    for (const k of this.fighters) k.render(now, dtMs);
    this.particles.update(dtMs);
    this.updateCamera(dt);
    this.render3d(dtMs);
  }

  /** Lights for lasers and power-ups, then the 3D frame under Phaser's. */
  private render3d(dtMs: number): void {
    const lights = [
      ...this.bullets.filter((b) => !b.dead).map((b) => ({ x: b.x, y: b.y, color: b.shooter.look.color, intensity: 6 })),
      ...this.orbs.map((o) => ({ x: o.x, y: o.y, color: POWER_UPS[o.type].color, intensity: 2.5 })),
    ];
    this.world3d.setLights(lights);
    this.world3d.render(this.cameras.main, this.game.canvas, dtMs);
  }

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
          this.fx('hitStars', (at.x + meet.x) / 2, at.y);
          continue;
        }
        this.hit(target, attacker, box.damage, attacker.facing * box.knockback, at.x, at.y);
      }
    }
  }

  private hit(target: Damageable, attacker: Kubotz, damage: number, pushX: number, x: number, y: number): void {
    target.takeDamage(damage, attacker, pushX);
    this.playSfx('punch', target instanceof Kubotz && target.guarding ? 0.2 : 0.45);
    this.fx('hitStars', x, y);
    if (damage >= 5) this.cameras.main.shake(90, 0.004);
  }

  private popBullet(b: Bullet): void {
    if (b.dead) return;
    this.fx('hitStars', b.x, b.y);
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
        this.hit(target, b.shooter, b.damage, b.pushX, b.x, b.y);
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
