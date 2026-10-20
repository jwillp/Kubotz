import { Config, UNIT } from '../config';
import { Controller, PadState, emptyPad } from './Input';
import type { Kubotz } from './Kubotz';
import type { Link, Nav } from './Nav';

export interface AiWorld {
  enemiesOf(k: Kubotz): Kubotz[];
  powerUpPositions(): { x: number; y: number }[];
  now(): number;
  nav: Nav;
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
  private stuckSince = 0;
  private lastX = 0;
  private orbChaseSince = 0;
  private ignoreOrbsUntil = 0;
  private link: Link | null = null;
  private linkSince = 0;

  constructor(private world: AiWorld, private reactionMs = 140) {}

  read(): PadState {
    const now = this.world.now();
    if (now >= this.nextThink) {
      this.nextThink = now + this.reactionMs;
      this.state = this.think(now);
    } else {
      // actions are one-frame presses
      this.state.attack = this.state.grab = false;
    }
    return { ...this.state };
  }

  private think(now: number): PadState {
    const me = this.agent;
    const pad = emptyPad();
    if (!me || !me.isAlive()) return pad;
    const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) / UNIT;
    const alive = this.world.enemiesOf(me).filter((e) => e.isAlive());
    // Hitting an invincible robot does nothing: fight the others, keep away from it.
    const enemies = alive.filter((e) => !e.invincible);
    const untouchable = alive.filter((e) => e.invincible && manhattan(me, e) < 6);

    let enemy: Kubotz | null = null;
    for (const e of enemies) if (!enemy || manhattan(me, e) < manhattan(me, enemy)) enemy = e;

    let dest: { x: number; y: number; bottom: number } | null = null;
    let wantsAttack = false;

    const danger = untouchable[0] ?? (enemy && me.health <= 25 && manhattan(me, enemy) < 7 ? enemy : null);
    if (danger) {
      if (!this.fleeTarget || manhattan(this.fleeTarget, danger) < 20) {
        this.fleeTarget = { x: danger.x < 26 * UNIT ? 46 * UNIT : 6 * UNIT, y: me.y };
      }
      dest = { ...this.fleeTarget, bottom: me.body.bottom };
    } else {
      this.fleeTarget = null;
      const orbs = now < this.ignoreOrbsUntil ? [] : this.world.powerUpPositions();
      const orb = orbs.sort((a, b) => manhattan(me, a) - manhattan(me, b))[0];
      if (orb && manhattan(me, orb) < 14 && (!enemy || manhattan(me, orb) < manhattan(me, enemy) * 0.6)) {
        dest = { ...orb, bottom: orb.y };
        if (manhattan(me, orb) < 1.6) pad.grab = true;
        // Give up on power-ups it cannot reach and go fight instead.
        if (!this.orbChaseSince) this.orbChaseSince = now;
        else if (now - this.orbChaseSince > 4000) { this.ignoreOrbsUntil = now + 8000; this.orbChaseSince = 0; }
      } else if (enemy) {
        this.orbChaseSince = 0;
        dest = { x: enemy.x, y: enemy.y, bottom: enemy.body.bottom };
        wantsAttack = true;
      }
    }
    if (!dest) return pad;

    const dx = dest.x - me.x;
    const dy = dest.y - me.y; // negative = above
    const close = Math.abs(dx) < 1.2 * UNIT;

    if (wantsAttack && enemy) {
      const facingEnemy = Math.sign(dx) === me.facing || Math.abs(dx) < 4;
      const ranged = me.weapon === 'laserGunMkI' || me.weapon === 'laserGunMkII';
      const reach = me.weapon === 'laserSword' ? 1.8 : 1.3;
      if (ranged && Math.abs(dy) < 0.8 * UNIT && facingEnemy && Math.abs(dx) < 16 * UNIT) pad.attack = true;
      else if (Math.abs(dx) < reach * UNIT && Math.abs(dy) < 1.5 * UNIT) {
        pad.attack = true;
        if (Math.sign(dx) !== me.facing && Math.abs(dx) > 4) pad[dx < 0 ? 'left' : 'right'] = true;
      }
      // Raise the guard against a swing that is about to land, now and then.
      if (enemy.currentAttack() && manhattan(me, enemy) < 2.5 && me.guard > Config.GUARD_MAX * 0.3 && Math.random() < 0.4) {
        pad.guard = true;
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

    if (!close) pad[dx < 0 ? 'left' : 'right'] = true;

    // Stuck against a wall: jump.
    if (Math.abs(me.x - this.lastX) < 2 && !close) {
      if (!this.stuckSince) this.stuckSince = now;
    } else {
      this.stuckSince = 0;
    }
    this.lastX = me.x;
    const stuck = this.stuckSince && now - this.stuckSince > 250;

    if (dy < -1.2 * UNIT || stuck || me.body.wall !== 0) pad.up = true;
    else if (dy > 2 * UNIT && close) pad.down = true;
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
    // (Standing on another robot is not on a surface: carry on as in the air.)
    const mine = grounded ? nav.surfaceAt(me.x, me.body.bottom, UNIT) : null;
    if (mine) {
      const goal = nav.surfaceAt(dest.x, dest.bottom);
      if (!goal || mine.id === goal.id) {
        this.link = null;
        return 'here';
      }
      if (!this.link || this.link.from !== mine.id) {
        const path = nav.path(mine, goal, me.x);
        if (!path) {
          this.link = null;
          return 'unreachable';
        }
        this.link = path[0];
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
      // Brake in time: robots keep their speed in the air and slide on the ground.
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
      // Jumping up through a platform: not right under the robot standing on
      // it, robots bump into each other.
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
}
