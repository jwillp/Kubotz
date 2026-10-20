import { Config, UNIT } from '../config';
import { Controller, PadState, emptyPad } from './Input';
import type { Kubotz } from './Kubotz';

export interface AiWorld {
  enemiesOf(k: Kubotz): Kubotz[];
  powerUpPositions(): { x: number; y: number }[];
  now(): number;
}

/**
 * CPU player, after KubotzBehaviourScript's behaviour tree:
 *  - Defensive (health <= 25): flee when the nearest enemy is closer than
 *    7 units, towards a spot at least 20 units away from it.
 *  - Offensive: chase the nearest enemy and attack it.
 * The original used a grid pathfinder over the map; this port steers
 * directly and jumps over obstacles, and it also picks up power-ups.
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
    const enemies = this.world.enemiesOf(me).filter((e) => e.isAlive());
    const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) / UNIT;

    let enemy: Kubotz | null = null;
    for (const e of enemies) if (!enemy || manhattan(me, e) < manhattan(me, enemy)) enemy = e;

    let dest: { x: number; y: number } | null = null;
    let wantsAttack = false;

    if (enemy && me.health <= 25 && manhattan(me, enemy) < 7) {
      if (!this.fleeTarget || manhattan(this.fleeTarget, enemy) < 20) {
        this.fleeTarget = { x: enemy.x < 26 * UNIT ? 46 * UNIT : 6 * UNIT, y: me.y };
      }
      dest = this.fleeTarget;
    } else {
      this.fleeTarget = null;
      const orbs = now < this.ignoreOrbsUntil ? [] : this.world.powerUpPositions();
      const orb = orbs.sort((a, b) => manhattan(me, a) - manhattan(me, b))[0];
      if (orb && manhattan(me, orb) < 14 && (!enemy || manhattan(me, orb) < manhattan(me, enemy) * 0.6)) {
        dest = orb;
        if (manhattan(me, orb) < 1.6) pad.grab = true;
        // Give up on power-ups it cannot reach and go fight instead.
        if (!this.orbChaseSince) this.orbChaseSince = now;
        else if (now - this.orbChaseSince > 4000) { this.ignoreOrbsUntil = now + 8000; this.orbChaseSince = 0; }
      } else if (enemy) {
        this.orbChaseSince = 0;
        dest = { x: enemy.x, y: enemy.y };
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

    if (!close) pad[dx < 0 ? 'left' : 'right'] = true;

    // Stuck against a wall: jump.
    if (Math.abs(me.x - this.lastX) < 2 && !close) {
      if (!this.stuckSince) this.stuckSince = now;
    } else {
      this.stuckSince = 0;
    }
    this.lastX = me.x;
    const stuck = this.stuckSince && now - this.stuckSince > 250;

    if (dy < -1.2 * UNIT || stuck || (me.body.blocked.left || me.body.blocked.right)) pad.up = true;
    else if (dy > 2 * UNIT && close) pad.down = true;
    return pad;
  }
}
