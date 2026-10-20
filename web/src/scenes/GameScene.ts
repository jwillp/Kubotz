import Phaser from 'phaser';
import { Config, UNIT } from '../config';
import { SpriterData } from '../spriter/Spriter';
import { TmxMap, MapObject } from '../map/TmxMap';
import { HumanController, PLAYER_1_KEYS, PLAYER_2_KEYS, Controller } from '../game/Input';
import { CpuController } from '../game/Ai';
import { Kubotz, Damageable, ArenaHooks } from '../game/Kubotz';
import { PowerUpOrb, randomPowerUp, POWER_UPS } from '../game/PowerUps';
import { Bullet, Drone } from '../game/Combat';
import type { MatchSetup } from './TitleScene';

/** The arena: InGameScreen + the gameplay systems that work across entities. */
export class GameScene extends Phaser.Scene implements ArenaHooks {
  fighters: Kubotz[] = [];
  private map!: TmxMap;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private playerSpawns: Phaser.Math.Vector2[] = [];
  private bonusSpawns: Phaser.Math.Vector2[] = [];
  private warpZones: Phaser.Geom.Rectangle[] = [];
  private orbs: PowerUpOrb[] = [];
  private bullets: Bullet[] = [];
  private drones: Drone[] = [];
  private nextBonusAt = 0;
  private dustFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hitFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private boomFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pickupFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private camTarget = new Phaser.Math.Vector2();
  private camVisibleWidth = 30;
  winner: Kubotz | null | undefined; // undefined while the match runs
  startedAt = -1;
  private warmup = 1;
  paused = false;

  constructor() { super('Game'); }

  init(): void {
    this.fighters = [];
    this.orbs = [];
    this.bullets = [];
    this.drones = [];
    this.playerSpawns = [];
    this.bonusSpawns = [];
    this.warpZones = [];
    this.winner = undefined;
    this.paused = false;
  }

  create(setup: MatchSetup): void {
    this.map = this.registry.get('map');
    const spriter: SpriterData = this.registry.get('spriter');
    this.physics.world.gravity.y = Config.GRAVITY * UNIT;
    const mapW = this.map.width * this.map.tileWidth;
    const mapH = this.map.height * this.map.tileHeight;
    this.physics.world.setBounds(-20 * UNIT, -40 * UNIT, mapW + 40 * UNIT, mapH + 60 * UNIT);

    this.scene.launch('Backdrop');
    this.scene.sendToBack('Backdrop');
    this.buildMap();
    this.createEffects();

    const humans = { P1: 0, P2: 0 };
    setup.slots.forEach((slot, i) => {
      let controller: Controller;
      if (slot === 'CPU') {
        controller = new CpuController({
          enemiesOf: (k) => this.fighters.filter((f) => f !== k && !f.eliminated),
          powerUpPositions: () => this.orbs.map((o) => ({ x: o.x, y: o.y })),
          now: () => this.time.now,
        });
      } else {
        controller = new HumanController(this, slot === 'P1' ? PLAYER_1_KEYS : PLAYER_2_KEYS, slot, humans.P1 + humans.P2);
        humans[slot]++;
      }
      const spawn = this.playerSpawns[i % this.playerSpawns.length];
      const k = new Kubotz(this, i, controller, spriter, spawn.x, spawn.y, this);
      if (controller instanceof CpuController) controller.agent = k;
      k.facing = spawn.x < mapW / 2 ? 1 : -1;
      this.physics.add.collider(k.body.gameObject, this.solids);
      this.fighters.push(k);
    });

    const cam = this.cameras.main;
    const c = this.centerOfFighters();
    this.camTarget.copy(c);
    cam.centerOn(c.x, c.y);
    this.applyZoom();
    this.warmup = 1;
    this.startedAt = -1; // set on the first update, once the scene clock is running

    this.scene.launch('Hud');
    this.scene.bringToTop('Hud');

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-ENTER', () => { if (this.winner !== undefined) this.backToTitle(); });
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 9) this.togglePause(); // Start
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('Hud');
      this.scene.stop('Backdrop');
    });
  }

  // ---------------------------------------------------------------------- map
  private buildMap(): void {
    const m = this.map;
    // The original rendered Box2D debug shapes and kept these Tiled layers hidden;
    // the port draws them so the arena actually looks like its art. Everything
    // static is baked into one render texture: one quad instead of ~350 sprites.
    const mapW = m.width * m.tileWidth;
    const art = this.add.renderTexture(0, 0, mapW, m.height * m.tileHeight).setOrigin(0, 0).setDepth(2);
    const stamp = this.make.image({ x: 0, y: 0, key: '__DEFAULT' }, false).setOrigin(0, 1);
    for (const layer of m.layers) {
      layer.gids.forEach((gid, i) => {
        const img = m.tileImages.get(gid);
        if (!img) return;
        // Tiled anchors image tiles at the cell's bottom-left corner.
        stamp.setTexture(`tile:${img.source}`).setOrigin(0, 1);
        art.draw(stamp, (i % m.width) * m.tileWidth, (Math.floor(i / m.width) + 1) * m.tileHeight);
      });
    }
    stamp.destroy();

    this.solids = this.physics.add.staticGroup();
    const solidArt = this.make.graphics({}, false);
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
          const zone = this.add.zone(o.x + o.width / 2, o.y + o.height / 2, o.width, o.height);
          this.solids.add(zone);
          this.drawBlock(solidArt, o);
        }
      }
    }
    art.draw(solidArt);
    solidArt.destroy();
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

  /** Neon-edged blocks, in the style of the map tiles. */
  private drawBlock(g: Phaser.GameObjects.Graphics, o: MapObject): void {
    g.fillStyle(0x0d2a45, 0.55).fillRect(o.x, o.y, o.width, o.height);
    g.lineStyle(3, 0x29abe2, 0.9).strokeRect(o.x + 1.5, o.y + 1.5, o.width - 3, o.height - 3);
    g.lineStyle(6, 0x9fe3ff, 0.9).lineBetween(o.x, o.y + 3, o.x + o.width, o.y + 3);
  }

  private createEffects(): void {
    this.dustFx = this.add.particles(0, 0, 'spark', {
      speed: { min: 20, max: 90 }, angle: { min: 200, max: 340 }, lifespan: { min: 250, max: 500 },
      scale: { start: 0.7, end: 0 }, alpha: { start: 0.5, end: 0 }, tint: 0xbfe6ff, emitting: false,
    }).setDepth(9);
    this.hitFx = this.add.particles(0, 0, 'p-star', {
      speed: { min: 150, max: 380 }, lifespan: 380, scale: { start: 0.6, end: 0 },
      rotate: { min: 0, max: 360 }, blendMode: 'ADD', emitting: false,
    }).setDepth(15);
    this.boomFx = this.add.particles(0, 0, 'p-hexa', {
      speed: { min: 120, max: 520 }, lifespan: { min: 400, max: 900 }, scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 }, blendMode: 'ADD', emitting: false,
    }).setDepth(15);
    this.pickupFx = this.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 220 }, lifespan: 500, scale: { start: 0.8, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(15);
  }

  // -------------------------------------------------------------- ArenaHooks
  dust(x: number, y: number): void {
    this.dustFx.explode(8, x, y);
  }

  fireBullet(shooter: Kubotz, damage: number, speed: number): void {
    const x = shooter.x + shooter.facing * UNIT * 1.1;
    const y = shooter.y - UNIT * 0.15;
    const b = new Bullet(this, shooter, x, y, shooter.facing * speed, 0, damage, this.time.now);
    this.physics.add.overlap(b.sprite, this.solids, () => this.popBullet(b));
    this.bullets.push(b);
  }

  private droneShoot = (d: Drone, target: Kubotz): void => {
    const s = Config.DRONE_SHOT;
    const dir = new Phaser.Math.Vector2(target.x - d.sprite.x, target.y - d.sprite.y).normalize();
    const b = new Bullet(this, d.owner, d.sprite.x, d.sprite.y, dir.x * s.speed, dir.y * s.speed, s.damage, this.time.now, true);
    this.physics.add.overlap(b.sprite, this.solids, () => this.popBullet(b));
    this.bullets.push(b);
  };

  spawnDrone(master: Kubotz): void {
    // At most two drones per robot: the oldest one is recalled.
    const mine = this.drones.filter((d) => d.owner === master && d.isAlive());
    if (mine.length >= 2) mine[0].health = 0;
    const d = new Drone(this, master, this.time.now);
    this.drones.push(d);
    this.pickupFx.explode(10, d.sprite.x, d.sprite.y);
  }

  tryGrab(kubotz: Kubotz, area: Phaser.Geom.Circle): void {
    for (const orb of [...this.orbs]) {
      if (!Phaser.Geom.Intersects.CircleToRectangle(area, orb.sprite.getBounds())) continue;
      kubotz.givePowerUp(orb.type, this.time.now);
      this.pickupFx.explode(18, orb.x, orb.y);
      this.floatText(kubotz.x, kubotz.body.top - 40, POWER_UPS[orb.type].label, POWER_UPS[orb.type].color);
      orb.destroy();
      this.orbs = this.orbs.filter((o) => o !== orb);
    }
  }

  // ------------------------------------------------------------------ update
  update(_time: number, deltaMs: number): void {
    if (this.paused) return;
    // One clock for everything: the scene clock (cooldowns are stamped with it too).
    const now = this.time.now;
    // The scene clock reports a stale time on the very first frame: wait one frame.
    if (this.warmup-- > 0) return;
    if (this.startedAt < 0) {
      this.startedAt = now;
      this.nextBonusAt = now + Phaser.Math.Between(Config.MIN_DELAY_BONUS_SPAWN, Config.MAX_DELAY_BONUS_SPAWN);
    }
    const dtMs = Math.min(deltaMs, 50);
    const dt = dtMs / 1000;

    for (const k of this.fighters) {
      if (!k.isAlive() && !k.eliminated && this.winner === undefined && now >= k.respawnAt) this.respawn(k);
      k.update(now, dt);
    }
    this.resolveMelee();
    this.updateBullets(now);
    this.updateDrones(now);
    this.updateOrbs(now);
    this.checkBoundsAndWarps(now);
    this.checkDeaths(now);
    this.updateBonusSpawns(now);
    for (const k of this.fighters) k.render(now, dtMs);
    this.updateCamera(dt);
  }

  private damageablesFor(attacker: Kubotz): Damageable[] {
    const targets: Damageable[] = this.fighters.filter((f) => f !== attacker && f.isAlive());
    for (const d of this.drones) if (d.owner !== attacker && d.isAlive()) targets.push(d);
    return targets;
  }

  /** MeleeSystem / LaserSwordSystem hitboxes + DamageSystem (with clashes). */
  private resolveMelee(): void {
    for (const attacker of this.fighters) {
      const box = attacker.isAlive() ? attacker.currentAttack() : null;
      if (!box) continue;
      for (const target of this.damageablesFor(attacker)) {
        if (box.hit.has(target)) continue;
        if (!Phaser.Geom.Intersects.CircleToRectangle(box.circle, target.hurtbox())) continue;
        box.hit.add(target);
        // Clash: two attacks of similar strength meeting cancel out (CLASH_THRESHOLD = 5).
        const other = target instanceof Kubotz ? target.currentAttack() : null;
        if (other && Phaser.Geom.Intersects.CircleToCircle(box.circle, other.circle)
          && Math.abs(other.damage - box.damage) <= 5) {
          other.hit.add(attacker);
          this.hitFx.explode(6, (box.circle.x + other.circle.x) / 2, box.circle.y);
          continue;
        }
        this.hit(target, attacker, box.damage, attacker.facing * box.knockback, box.circle.x, box.circle.y);
      }
    }
  }

  private hit(target: Damageable, attacker: Kubotz, damage: number, pushX: number, x: number, y: number): void {
    target.takeDamage(damage, attacker, pushX);
    this.hitFx.explode(Math.min(4 + damage, 14), x, y);
    if (damage >= 5) this.cameras.main.shake(90, 0.004);
  }

  private popBullet(b: Bullet): void {
    if (b.dead) return;
    this.hitFx.explode(4, b.sprite.x, b.sprite.y);
    b.destroy();
  }

  private updateBullets(now: number): void {
    for (const b of this.bullets) {
      if (b.dead) continue;
      if (now >= b.expiresAt) { b.destroy(); continue; }
      const box = b.hitbox();
      for (const target of this.damageablesFor(b.shooter)) {
        if (!Phaser.Geom.Intersects.RectangleToRectangle(box, target.hurtbox())) continue;
        this.hit(target, b.shooter, b.damage, b.pushX, b.sprite.x, b.sprite.y);
        this.popBullet(b);
        break;
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  private updateDrones(now: number): void {
    for (const d of this.drones) {
      if (d.isAlive() && now < d.expiresAt && d.owner.isAlive()) {
        const enemies = this.fighters.filter((f) => f !== d.owner && f.isAlive());
        d.update(now, enemies, this.droneShoot);
      } else {
        this.boomFx.explode(10, d.sprite.x, d.sprite.y);
        d.destroy();
      }
    }
    this.drones = this.drones.filter((d) => d.sprite.active);
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
    const orb = new PowerUpOrb(this, p.x + Phaser.Math.Between(-6, 6), p.y, randomPowerUp(), now);
    this.physics.add.collider(orb.sprite, this.solids);
    this.pickupFx.explode(12, orb.x, orb.y);
    this.orbs.push(orb);
  }

  /** WARP_ZONE objects (unused in the original) wrap robots across the arena; falling out kills. */
  private checkBoundsAndWarps(now: number): void {
    const mapW = this.map.width * UNIT;
    const mapH = this.map.height * UNIT;
    for (const k of this.fighters) {
      if (!k.isAlive()) continue;
      if (k.y > mapH + 6 * UNIT || k.y < -20 * UNIT || k.x < -6 * UNIT || k.x > mapW + 6 * UNIT) {
        k.health = 0;
        continue;
      }
      if (this.warpZones.length === 2) {
        const [a, b] = this.warpZones[0].x < this.warpZones[1].x ? this.warpZones : [this.warpZones[1], this.warpZones[0]];
        const vx = k.body.velocity.x;
        if (vx < 0 && a.contains(k.x, k.y)) {
          k.teleport(b.x - UNIT, k.y);
          this.pickupFx.explode(10, b.x, k.y);
        } else if (vx > 0 && b.contains(k.x, k.y)) {
          k.teleport(a.right + UNIT, k.y);
          this.pickupFx.explode(10, a.right, k.y);
        }
      }
    }
    void now;
  }

  /** RespawnSystem + LifeBasedFreeForAll. */
  private checkDeaths(now: number): void {
    for (const k of this.fighters) {
      if (!k.isAlive() || k.health > 0) continue;
      this.boomFx.explode(30, k.x, k.y);
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
    this.pickupFx.explode(20, spawn.x, spawn.y);
  }

  // ------------------------------------------------------------------ camera
  private centerOfFighters(): Phaser.Math.Vector2 {
    const alive = this.fighters.filter((f) => f.isAlive());
    if (alive.length === 0) return this.camTarget.clone();
    const xs = alive.map((f) => f.x);
    const ys = alive.map((f) => f.y);
    return new Phaser.Math.Vector2((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  }

  /** CameraSystem: lerp to the centre of all robots, zoom to fit them. */
  private updateCamera(dt: number): void {
    const alive = this.fighters.filter((f) => f.isAlive());
    if (alive.length > 0) {
      const xs = alive.map((f) => f.x);
      const ys = alive.map((f) => f.y);
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
    if (this.paused) { this.physics.pause(); this.time.paused = true; } else { this.physics.resume(); this.time.paused = false; }
    this.events.emit('pause', this.paused);
  }

  backToTitle(): void {
    this.scene.start('Title');
  }
}
