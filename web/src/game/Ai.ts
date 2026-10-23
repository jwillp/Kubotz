import { feel } from './Feel';
import { Config, UNIT } from '../config';
import { Controller, PadState, emptyPad } from './Input';
import type { Kubotz } from './Kubotz';
import type { Link, Nav, Surface } from './Nav';
import type { DummyMode } from './Modes';

/**
 * A job beyond fighting (Capture the Flag): a place to go (`goal`), an enemy
 * to go after whatever else is near (`target`), and for a guardian a circle
 * it keeps to (`leash`: it only fights enemies inside it, and walks back to
 * its centre when none are). Enemies closer than `fightWithin` units are
 * fought on the way to the goal.
 */
export interface Objective {
  goal?: { x: number; y: number };
  target?: Kubotz | null;
  leash?: { x: number; y: number; r: number };
  fightWithin?: number;
  /** Press grab now (take the ball in reach, throw the one in hand). */
  grab?: boolean;
}

export interface AiWorld {
  enemiesOf(k: Kubotz): Kubotz[];
  powerUpPositions(): { x: number; y: number }[];
  now(): number;
  nav: Nav;
  /** The CPU's job, if it has one beyond fighting (see Objective). */
  objective?(k: Kubotz): Objective | null;
}

/**
 * CPU player, after KubotzBehaviourScript's behaviour tree:
 *  - Defensive (health <= 25): flee when the nearest enemy is closer than
 *    7 units, towards a spot at least 20 units away from it.
 *  - Offensive: chase the nearest enemy and attack it.
 * Like the original, it finds its way with A* (Nav: surfaces linked by jumps,
 * drops and falls) when the destination is on another platform, and it also
 * picks up power-ups.
 */
export class CpuController implements Controller {
  readonly label = 'CPU' as const;
  agent!: Kubotz;
  private state: PadState = emptyPad();
  private nextThink = 0;
  private fleeTarget: { x: number; y: number } | null = null;
  private home: Surface | null = null; // the last surface stood on
  private stuckSince = 0;
  private lastX = 0;
  private orbChaseSince = 0;
  private ignoreOrbsUntil = 0;
  private link: Link | null = null;
  /** What it is doing, where to, and the path planned (for the debug view). */
  readonly debug: { mode: string; dest: { x: number; y: number } | null; path: Link[] } = { mode: '', dest: null, path: [] };
  private linkSince = 0;
  /** Keep the attack held until then: a charged smash or laser bolt. */
  private holdAttackUntil = 0;
  /** Grabs and ledges: when the hold or the hang began, and how long to pummel / wait. */
  private holdSince = 0;
  private pummelFor = 0;
  private ledgeSince = 0;
  private ledgeWait = 0;
  /** Sandbox: the dummy's behaviour ('fight' plays like any CPU), and where it stands. */
  dummy?: DummyMode;
  dummyHome?: { x: number; y: number };

  /** `reactionMs` can change between lives (Horde's Kubotz come back at a new level). */
  constructor(private world: AiWorld, public reactionMs = 140) {}

  read(): PadState {
    const now = this.world.now();
    if (now >= this.nextThink) {
      this.nextThink = now + this.reactionMs;
      this.state = this.think(now);
    } else {
      // actions are one-frame presses, unless charging
      this.state.attack = this.state.attack && now < this.holdAttackUntil;
      this.state.grab = false;
      this.state.smash = false;
      this.state.special = false;
    }
    return { ...this.state };
  }

  private think(now: number): PadState {
    const me = this.agent;
    const pad = emptyPad();
    if (!me || !me.isAlive()) return pad;
    this.debug.dest = null;
    if (me.heldBy) {
      // Mash out: a fresh button press every think, and a stick wiggle now and then.
      this.debug.mode = 'mash';
      pad.attack = true;
      if (Math.random() < 0.5) pad[Math.random() < 0.5 ? 'left' : 'right'] = true;
      return pad;
    }
    if (me.holding) { this.debug.mode = 'throw'; return this.grabbing(pad, now); }
    if (me.ledge) { this.debug.mode = 'ledge'; return this.onLedge(pad, now); }
    this.holdSince = 0;
    this.ledgeSince = 0;
    if (this.recover(pad)) { this.debug.mode = 'recover'; return pad; }
    if (this.dummy && this.dummy !== 'fight') return this.dummyPad(pad, now);
    const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) / UNIT;
    const alive = this.world.enemiesOf(me).filter((e) => e.isAlive());
    // Hitting an invincible Kubot does nothing: fight the others, keep away from it.
    const enemies = alive.filter((e) => !e.invincible);
    const untouchable = alive.filter((e) => e.invincible && manhattan(me, e) < 6);

    let enemy: Kubotz | null = null;
    for (const e of enemies) if (!enemy || manhattan(me, e) < manhattan(me, enemy)) enemy = e;

    // A job (Capture the Flag): a set enemy, a leash round the flag, a place to go.
    const job = this.world.objective?.(me) ?? null;
    let jobDest: { x: number; y: number } | null = null;
    if (job) {
      if (job.target?.isAlive()) enemy = job.target;
      else if (job.leash) {
        const { x, y, r } = job.leash;
        const inside = enemies.filter((e) => Math.hypot(e.x - x, e.y - y) < r * UNIT);
        enemy = inside.sort((a, b) => manhattan(me, a) - manhattan(me, b))[0] ?? null;
        if (!enemy && Math.hypot(me.x - x, me.y - y) > 1.5 * UNIT) jobDest = { x, y };
      }
      if (job.goal && !job.target && !(enemy && manhattan(me, enemy) < (job.fightWithin ?? 3))) jobDest = job.goal;
      if (job.grab) { pad.grab = true; this.debug.mode = 'grab (job)'; return pad; }
      if (!jobDest && job.leash && !enemy) { this.debug.mode = 'guard post'; return pad; }
    }

    let dest: { x: number; y: number; bottom: number } | null = null;
    let wantsAttack = false;

    const danger = untouchable[0] ?? (enemy && !job && me.health <= 25 && manhattan(me, enemy) < 7 ? enemy : null);
    if (danger) {
      // Cornered on the ground: now and then a dodge roll away (or through it).
      if (me.grounded && manhattan(me, danger) < 2.2 && !me.rolling && Math.random() < 0.15) {
        pad.guard = true;
        const away = danger.x < me.x ? 'right' : 'left';
        pad[Math.random() < 0.7 ? away : away === 'left' ? 'right' : 'left'] = true;
        this.debug.mode = 'roll';
        return pad;
      }
      if (!this.fleeTarget || manhattan(this.fleeTarget, danger) < 20) this.fleeTarget = this.refuge(danger);
      dest = { ...this.fleeTarget, bottom: this.fleeTarget.y };
      this.debug.mode = 'flee';
    } else if (jobDest) {
      this.fleeTarget = null;
      dest = { ...jobDest, bottom: jobDest.y };
      this.debug.mode = 'objective';
    } else {
      this.fleeTarget = null;
      const orbs = now < this.ignoreOrbsUntil || job ? [] : this.world.powerUpPositions();
      const orb = orbs.sort((a, b) => manhattan(me, a) - manhattan(me, b))[0];
      if (orb && manhattan(me, orb) < 14 && (!enemy || manhattan(me, orb) < manhattan(me, enemy) * 0.6)) {
        dest = { ...orb, bottom: orb.y };
        this.debug.mode = 'power-up';
        if (manhattan(me, orb) < 1.6) pad.grab = true;
        // Give up on power-ups it cannot reach and go fight instead.
        if (!this.orbChaseSince) this.orbChaseSince = now;
        else if (now - this.orbChaseSince > 4000) { this.ignoreOrbsUntil = now + 8000; this.orbChaseSince = 0; }
      } else if (enemy) {
        this.orbChaseSince = 0;
        dest = { x: enemy.x, y: enemy.y, bottom: enemy.body.bottom };
        wantsAttack = true;
        this.debug.mode = `fight ${enemy.name}`;
      }
    }
    if (!dest) { this.debug.mode = 'idle'; return pad; }
    this.debug.dest = dest;

    const dx = dest.x - me.x;
    const dy = dest.y - me.y; // negative = above
    const close = Math.abs(dx) < 1.2 * UNIT;

    if (wantsAttack && enemy) {
      const facingEnemy = Math.sign(dx) === me.facing || Math.abs(dx) < 4;
      const ranged = me.weapon === 'laserGunMkI' || me.weapon === 'laserGunMkII';
      const reach = me.weapon === 'laserSword' ? 1.8 : 1.3;
      if (ranged && Math.abs(dy) < 0.8 * UNIT && facingEnemy && Math.abs(dx) < 16 * UNIT) {
        pad.attack = true;
        // Mostly quick shots; now and then a charged bolt, more often from afar.
        if (Math.random() < (Math.abs(dx) > 6 * UNIT ? 0.25 : 0.1)) this.holdAttackUntil = now + 400 + Math.random() * 900;
      }
      else if (Math.abs(dx) < reach * UNIT && Math.abs(dy) < 1.5 * UNIT) {
        // A grab now and then to mix things up (a raised guard can't be grabbed).
        if (me.grounded && enemy.grounded && !enemy.guarding && Math.abs(dx) < 1.6 * UNIT && Math.abs(dy) < 0.8 * UNIT && Math.sign(dx) === me.facing
          && Math.random() < 0.12) {
          pad.grab = true;
          return pad;
        }
        pad.attack = true;
        if (!me.grounded) {
          // Aerials by where the enemy is: above, below, behind.
          if (dy < -0.6 * UNIT) pad.up = true;
          else if (dy > 0.6 * UNIT) pad.down = true;
          else if (Math.sign(dx) !== me.facing && Math.abs(dx) > 4) pad[dx > 0 ? 'left' : 'right'] = true; // back air
        } else if (dy < -1.2 * UNIT) {
          pad.up = true; // the up tilt, or now and then the up smash
          if (Math.random() < 0.3) pad.smash = true;
        } else if (Math.random() < 0.06 && Math.sign(dx) === me.facing) {
          // Special moves now and then: the Ion Punch on a Kubot still reeling, else the Plasma Kick.
          pad.attack = false;
          pad.special = true;
          if (!(enemy.tumbling || enemy.health < 30)) pad.down = true;
        } else if (Math.random() < (enemy.health < 40 ? 0.4 : 0.18)) {
          // A smash (forward, or down to hit both sides), finishing off a weak enemy, sometimes charged.
          pad.smash = true;
          if (Math.random() < 0.3) pad.down = true; else pad[dx < 0 ? 'left' : 'right'] = true;
          if (Math.random() < 0.5) this.holdAttackUntil = now + Math.random() * 700;
        } else if (Math.random() < 0.25) {
          pad.down = true; // a low sweep now and then
        }
        if (me.grounded && Math.sign(dx) !== me.facing && Math.abs(dx) > 4) pad[dx < 0 ? 'left' : 'right'] = true;
      } else if (!ranged && Math.abs(dx) > 3 * UNIT && Math.abs(dx) < 6 * UNIT && Math.abs(dy) < UNIT && me.grounded
        && Math.random() < 0.05) {
        // The Raptor Dash closes the gap.
        pad.special = true;
        pad[dx < 0 ? 'left' : 'right'] = true;
        return pad;
      } else if (!ranged && Math.abs(dx) < 3.5 * UNIT && Math.abs(dy) < UNIT && Math.abs(me.body.vx) > 0.6 * feel().run * UNIT && Math.sign(me.body.vx) === Math.sign(dx)) {
        // Running at it: a dash attack.
        pad.attack = true;
        pad[dx < 0 ? 'left' : 'right'] = true;
      }
      // Raise the guard against a swing that is about to land, now and then.
      if (enemy.attacking && manhattan(me, enemy) < 2.5 && me.guard > Config.GUARD_MAX * 0.3 && Math.random() < 0.4) {
        pad.guard = true;
        // Now and then a dodge roll instead: through the attacker (behind it to punish) or away.
        if (me.grounded && Math.random() < 0.3) {
          const through = dx < 0 ? 'left' : 'right';
          pad[Math.random() < 0.65 ? through : through === 'left' ? 'right' : 'left'] = true;
        }
        return pad;
      }
      if (ranged && Math.abs(dx) < 6 * UNIT && Math.abs(dy) < 0.8 * UNIT) return pad; // hold position and shoot
    }

    // On another platform: follow the path (A*) instead of steering straight at it.
    switch (this.navigate(dest, now, pad)) {
      case 'moving': return pad;
      case 'unreachable': // stay under it rather than jumping at it forever
        if (!close) pad[dx < 0 ? 'left' : 'right'] = true;
        return pad;
      default: break;
    }

    // Never run off the edge after a Kubot flying over the void.
    const mine = me.body.grounded ? this.world.nav.surfaceAt(me.x, me.body.bottom, UNIT) : null;
    if (mine && !this.world.nav.surfaceAt(dest.x, dest.bottom)) {
      const safeX = Math.min(mine.x2 - UNIT, Math.max(mine.x1 + UNIT, dest.x));
      if (Math.abs(safeX - me.x) > 0.5 * UNIT) pad[safeX < me.x ? 'left' : 'right'] = true;
      return pad;
    }
    if (!close) pad[dx < 0 ? 'left' : 'right'] = true;

    // Stuck against a wall: jump.
    if (Math.abs(me.x - this.lastX) < 2 && !close) {
      if (!this.stuckSince) this.stuckSince = now;
    } else {
      this.stuckSince = 0;
    }
    this.lastX = me.x;
    // Held up a while (not a teammate brushing past): hop over it.
    const stuck = this.stuckSince && now - this.stuckSince > 600;

    if (dy < -1.2 * UNIT || stuck || me.body.wall !== 0) pad.up = true;
    else if (dy > 2 * UNIT && close) pad.down = true;
    return pad;
  }

  /**
   * Sandbox: the dummy does one thing (stand, walk to and fro, hop, hold its
   * guard, dodge what comes at it), and walks back to its spot when knocked
   * away from it.
   */
  private dummyPad(pad: PadState, now: number): PadState {
    const me = this.agent;
    const home = this.dummyHome ?? { x: me.x, y: me.y };
    const away = home.x - me.x;
    this.debug.mode = `dummy: ${this.dummy}`;
    const back = () => { if (Math.abs(away) > 2.5 * UNIT && me.grounded) pad[away < 0 ? 'left' : 'right'] = true; };
    switch (this.dummy) {
      case 'stand': back(); break;
      case 'walk': {
        // To and fro over 3 units either side of its spot, walking (not running).
        const phase = Math.floor(now / 1600) % 2 === 0 ? 1 : -1;
        const want = home.x + phase * 3 * UNIT;
        if (Math.abs(want - me.x) > 0.4 * UNIT) { pad[want < me.x ? 'left' : 'right'] = true; pad.walk = true; pad.walkAmount = 0.7; }
        break;
      }
      case 'jump': back(); if (me.grounded && now % 1100 < 150) pad.up = true; break;
      case 'guard': back(); pad.guard = true; break;
      case 'dodge': {
        back();
        // Something swinging at it, close: roll through or away, or a spot dodge.
        const foe = this.world.enemiesOf(me).find((e) => e.isAlive() && e.attacking && Math.abs(e.x - me.x) < 2.5 * UNIT && Math.abs(e.y - me.y) < 2 * UNIT);
        if (foe && Math.random() < 0.7) {
          pad.guard = true;
          const r = Math.random();
          if (r < 0.4) pad[foe.x < me.x ? 'right' : 'left'] = true;
          else if (r < 0.8) pad[foe.x < me.x ? 'left' : 'right'] = true;
          else pad.down = true;
        }
        break;
      }
      default: break;
    }
    return pad;
  }

  /**
   * Picks the next move of the path when the destination stands on another
   * surface, and plays it: walk to the take-off point, then jump (again and
   * again until above the target), drop through the platform or run off.
   */
  private navigate(dest: { x: number; bottom: number }, now: number, pad: PadState): 'moving' | 'unreachable' | 'here' {
    const me = this.agent;
    const nav = this.world.nav;
    const grounded = me.body.grounded;
    // (Standing on another Kubot is not on a surface: carry on as in the air.)
    const mine = grounded ? nav.surfaceAt(me.x, me.body.bottom, UNIT) : null;
    if (mine) {
      const goal = nav.surfaceAt(dest.x, dest.bottom);
      if (!goal || mine.id === goal.id) {
        this.link = null;
        this.debug.path = [];
        return 'here';
      }
      if (!this.link || this.link.from !== mine.id) {
        const path = nav.path(mine, goal, me.x);
        if (!path) {
          this.link = null;
          return 'unreachable';
        }
        this.link = path[0];
        this.debug.path = path;
        this.linkSince = now;
      }
    }
    const l = this.link;
    if (!l) return 'here';
    if (now - this.linkSince > 5000) { // something went wrong: plan again
      this.link = null;
      return 'here';
    }
    const steer = (x: number, dead: number) => {
      // Brake in time: Kubotz keep their speed in the air and slide on the ground.
      const dx = x - me.x;
      const v = me.body.vx;
      const stop = (v * v) / (2 * Config.RUN_ACCELERATION * UNIT);
      if (Math.abs(dx) <= dead || (Math.sign(v) === Math.sign(dx) && stop >= Math.abs(dx))) {
        if (Math.abs(v) > 2 * UNIT) pad[v > 0 ? 'left' : 'right'] = true;
      } else {
        pad[dx < 0 ? 'left' : 'right'] = true;
      }
    };
    const target = nav.surfaces[l.to];
    const clampTo = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
    let fromMin = l.fromMin;
    let fromMax = l.fromMax;
    let toX = l.toX;
    if (l.kind === 'jump' && target.soft && fromMax - fromMin > UNIT) {
      // Jumping up through a platform: not right under the Kubot standing on
      // it, Kubotz bump into each other.
      const sides = [dest.x - 2 * UNIT, dest.x + 2 * UNIT].map((x) => clampTo(x, fromMin, fromMax));
      const aim = Math.abs(sides[0] - dest.x) >= Math.abs(sides[1] - dest.x) ? sides[0] : sides[1];
      if (Math.abs(aim - dest.x) > UNIT) {
        fromMin = Math.max(fromMin, aim - 0.6 * UNIT);
        fromMax = Math.min(fromMax, aim + 0.6 * UNIT);
        toX = aim;
      }
    }
    if (mine && mine.id === l.from) {
      // On the start surface: get to the take-off point, then go.
      if (me.x < fromMin || me.x > fromMax) steer(clampTo(me.x, fromMin, fromMax), 0);
      else if (l.kind === 'jump') { pad.up = true; steer(toX, 0.3 * UNIT); }
      else if (l.kind === 'drop') pad.down = true;
      else steer(l.fromX + Math.sign(l.fromX - me.x || l.toX - me.x) * UNIT, 0);
      return 'moving';
    }
    // In the air (or landed somewhere unexpected, which replans next time).
    if (l.kind === 'jump' && me.body.bottom > target.y - 0.3 * UNIT) {
      // Still below the top: keep jumping (each jump comes after the cooldown,
      // near the top of the previous one); keep clear of the side of a solid
      // block (a soft platform is passed through from below).
      steer(target.soft ? toX : l.fromX, 0.3 * UNIT);
      pad.up = true;
    } else {
      steer(toX, 0.3 * UNIT);
      // Falling short of a platform across a gap: jump again.
      const over = me.x >= target.x1 && me.x <= target.x2;
      if (l.kind === 'jump' && !over && me.body.vy > 0) pad.up = true;
    }
    return 'moving';
  }

  /** The surface farthest from a threat that can be reached from here. */
  private refuge(danger: { x: number; y: number }): { x: number; y: number } {
    const me = this.agent;
    const nav = this.world.nav;
    const from = nav.surfaceAt(me.x, me.body.bottom, UNIT) ?? this.home;
    const centre = (s: Surface) => ({ x: (s.x1 + s.x2) / 2, y: s.y });
    const far = [...nav.surfaces].sort((a, b) => {
      const d = (s: Surface) => Math.hypot(centre(s).x - danger.x, centre(s).y - danger.y);
      return d(b) - d(a);
    });
    const best = far.find((s) => !from || nav.path(from, s, me.x) !== null);
    return best ? centre(best) : { x: me.x, y: me.y };
  }

  /**
   * Knocked out over the void: steer back towards the nearest surface and
   * jump when falling below it.
   */
  /** Holding a Kubot: pummel for a moment, then throw it, mostly towards the nearer edge. */
  private grabbing(pad: PadState, now: number): PadState {
    const me = this.agent;
    if (!this.holdSince) { this.holdSince = now; this.pummelFor = Math.random() < 0.4 ? 0 : 300 + Math.random() * 700; }
    if (now - this.holdSince < this.pummelFor) { pad.attack = true; return pad; }
    const victim = me.holding!;
    const r = Math.random();
    if (victim.health < 40 && r < 0.4) pad.up = true; // straight up towards the top blast zone
    else if (r < 0.15) pad.down = true;
    else {
      // Towards the nearer end of the surface stood on (or the map's middle when unknown).
      const s = this.world.nav.surfaceAt(me.x, me.body.bottom, UNIT);
      const mid = s ? (s.x1 + s.x2) / 2 : me.x;
      const edge = me.x < mid ? -1 : 1;
      pad[edge < 0 ? 'left' : 'right'] = true;
    }
    return pad;
  }

  /** Hanging from a ledge: wait a moment, then get up, jump, attack or roll in. */
  private onLedge(pad: PadState, now: number): PadState {
    const me = this.agent;
    const l = me.ledge!;
    if (!this.ledgeSince) { this.ledgeSince = now; this.ledgeWait = 150 + Math.random() * 500; }
    if (now - this.ledgeSince < this.ledgeWait) return pad; // hands off first, so the next press is fresh
    const guarded = this.world.enemiesOf(me).some((e) => e.isAlive() && Math.abs(e.x - l.x) < 2.5 * UNIT && Math.abs(e.body.bottom - l.y) < UNIT);
    const r = Math.random();
    const toward = l.dir === 1 ? 'left' : 'right';
    if (guarded) {
      if (r < 0.5) pad.guard = true; else if (r < 0.8) pad.attack = true; else pad.up = true;
    } else if (r < 0.45) pad[toward] = true;
    else if (r < 0.7) pad.up = true;
    else if (r < 0.85) pad.attack = true;
    else pad.guard = true;
    this.ledgeSince = 0;
    return pad;
  }

  private recover(pad: PadState): boolean {
    const me = this.agent;
    const nav = this.world.nav;
    if (me.body.grounded) {
      this.home = nav.surfaceAt(me.x, me.body.bottom, UNIT) ?? this.home;
      return false;
    }
    if (this.link || nav.surfaceAt(me.x, me.body.bottom)) return false; // on its way, or above ground
    let best: Surface | null = null;
    let bestX = 0;
    for (const s of nav.surfaces) {
      const x = Math.min(s.x2 - UNIT, Math.max(s.x1 + UNIT, me.x));
      const d = Math.abs(x - me.x) + Math.max(0, me.body.bottom - s.y) * 0.5;
      if (!best || d < Math.abs(bestX - me.x) + Math.max(0, me.body.bottom - best.y) * 0.5) { best = s; bestX = x; }
    }
    if (!best) return false;
    pad[bestX < me.x ? 'left' : 'right'] = true;
    if (me.body.vy > 0 && me.body.bottom > best.y - UNIT) {
      // Jumps first; out of jumps, the Shadow Dive (up special), or the Raptor Dash when far to the side.
      if (me.airJumpsLeft > 0) pad.up = true;
      else if (Math.abs(bestX - me.x) > 6 * UNIT && me.canSideSpecial && me.body.bottom < best.y + 2 * UNIT) pad.special = true;
      else if (me.canUpSpecial) { pad.up = true; pad.special = true; }
    }
    return true;
  }
}
