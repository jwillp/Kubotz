// Kubeball team play: how a team's CPUs share the work, around the human players.

import { UNIT } from '../config';
import type { Objective } from './Ai';
import type { GameBall } from './Ball';
import type { Kubotz } from './Kubotz';

/**
 * A team's strategy:
 *  - 'twoTwo' (Two-Two, a futsal box): a goalie and a back stay home, two
 *    strikers go forward; when one has the ball the other escorts it. With
 *    the ball in the other half, the back's zone grows, but no one gets past it.
 *  - 'total' (Total Football, after the Dutch): everyone attacks and
 *    defends; the two nearest go for the ball, the others hold the line
 *    between the ball and their goal.
 *  - 'spearhead' (Spearhead, a rugby maul): one striker, the rest pack
 *    round it and pass it the ball whenever they can.
 */
export type Tactic = 'twoTwo' | 'total' | 'spearhead';
export const TACTICS: Record<Tactic, string> = { twoTwo: 'Two-Two', total: 'Total Football', spearhead: 'Spearhead' };
export const TACTIC_ORDER: Tactic[] = ['twoTwo', 'total', 'spearhead'];

/** A Kubot's job in its team's strategy. */
export type Play = 'goalie' | 'back' | 'striker' | 'support' | 'free';

/** What the plays need to know about the pitch. */
export interface Pitch {
  ball: GameBall;
  /** The centre of a team's own goal, and of the goal it attacks. */
  ownGoal(team: number): { x: number; y: number };
  enemyGoal(team: number): { x: number; y: number };
  /** The pitch's width (pixels). */
  width: number;
  /** The top of the ground under a point (so CPUs run along the floor to a ball in the air instead of hopping at it). */
  ground(x: number, y: number): number;
}

/** How far a Kubot is up the pitch, from its own goal (0) to the other (1). */
export function progress(k: { x: number; team: number }, p: Pitch): number {
  const a = p.ownGoal(k.team).x; const b = p.enemyGoal(k.team).x;
  return Math.min(1, Math.max(0, (k.x - a) / (b - a)));
}

/**
 * Hands out a team's plays. The human players play where they are: deep in
 * the other half they count as strikers, at home as defence, and the CPUs
 * take what is left, the ones nearest home defending.
 */
export function assignPlays(team: Kubotz[], tactic: Tactic, p: Pitch): Map<Kubotz, Play> {
  const plays = new Map<Kubotz, Play>();
  const humans = team.filter((k) => k.controller.label !== 'CPU');
  const cpus = team.filter((k) => k.controller.label === 'CPU').sort((a, b) => progress(a, p) - progress(b, p));
  if (tactic === 'total') { for (const k of team) plays.set(k, 'free'); return plays; }
  if (tactic === 'spearhead') {
    // The spear: the most forward human, if forward; else the CPU nearest the ball.
    const fwd = [...humans].sort((a, b) => progress(b, p) - progress(a, p))[0];
    const near = [...cpus].sort((a, b) => Math.hypot(a.x - p.ball.x, a.y - p.ball.y) - Math.hypot(b.x - p.ball.x, b.y - p.ball.y))[0];
    const spear = fwd && progress(fwd, p) > 0.45 ? fwd : near ?? fwd;
    for (const k of team) plays.set(k, k === spear ? 'striker' : 'support');
    return plays;
  }
  // Two-Two: the slots for this many, defence first.
  const slots: Play[] = team.length >= 4 ? ['goalie', 'back', 'striker', 'striker'] : team.length === 3 ? ['goalie', 'striker', 'striker']
    : team.length === 2 ? ['back', 'striker'] : ['striker'];
  const take = (play: Play) => { const i = slots.indexOf(play); if (i >= 0) { slots.splice(i, 1); return true; } return false; };
  for (const h of [...humans].sort((a, b) => progress(b, p) - progress(a, p))) {
    const forward = progress(h, p) > 0.5;
    const got = forward ? (take('striker') && 'striker') : (take('back') && 'back') || (take('goalie') && 'goalie');
    plays.set(h, got || slots.shift() || 'striker');
  }
  // CPUs nearest home defend.
  const defence = slots.filter((s) => s === 'goalie' || s === 'back'); // goalie first
  const attack = slots.filter((s) => s === 'striker');
  for (const k of cpus) plays.set(k, defence.shift() ?? attack.shift() ?? 'striker');
  return plays;
}

/** A CPU's objective in Kubeball, by its play. */
export function playObjective(k: Kubotz, play: Play, team: Kubotz[], plays: Map<Kubotz, Play>, p: Pitch): Objective {
  const ball = p.ball;
  const dir = Math.sign(p.enemyGoal(k.team).x - p.ownGoal(k.team).x) || 1;
  const own = p.ownGoal(k.team);
  const dist = (q: { x: number; y: number }) => Math.hypot(q.x - k.x, q.y - k.y);
  const onGround = (x: number, y: number) => ({ x, y: p.ground(x, y) });
  const ballSpot = onGround(ball.x, ball.y);
  const getBall: Objective = { goal: ballSpot, fightWithin: 1.2, grab: dist(ball) < 1.7 * UNIT };
  const carrier = ball.carrier;
  const enemyCarrier = carrier && carrier.team !== k.team ? carrier : null;
  const inHalf = (x: number) => (x - p.width / 2) * dir < 0; // in this team's own half

  // With the ball: a Spearhead support passes to its striker when it is ahead and in reach; else to the goal.
  if (k.ball) {
    const goal = p.enemyGoal(k.team);
    const spear = play === 'support' ? team.find((t) => plays.get(t) === 'striker' && t !== k && t.isAlive()) : null;
    if (spear && (spear.x - k.x) * dir > 1.5 * UNIT && Math.abs(spear.x - k.x) < 11 * UNIT && Math.abs(spear.y - k.y) < 3 * UNIT) {
      return { goal: { x: spear.x, y: spear.body.bottom }, fightWithin: 0.5, grab: Math.sign(spear.x - k.x) === k.facing };
    }
    // Under the goal (on the platform below it), then up and in.
    const under = onGround(goal.x - dir * 4 * UNIT, goal.y + 2 * UNIT);
    const close = Math.abs(k.x - goal.x) < 9 * UNIT && Math.abs(k.y - goal.y) < 9 * UNIT;
    return { goal: close ? goal : under, fightWithin: 1, grab: close }; // a CPU's throw aims itself
  }

  switch (play) {
    case 'goalie': {
      // Home, under the goal; anything coming close gets dealt with.
      const post = onGround(own.x + dir * 4 * UNIT, own.y + 2 * UNIT);
      if (enemyCarrier && Math.hypot(enemyCarrier.x - own.x, enemyCarrier.y - own.y) < 14 * UNIT) return { target: enemyCarrier };
      if (!carrier && Math.hypot(ball.x - own.x, ball.y - own.y) < 12 * UNIT) return getBall;
      return { leash: { x: post.x, y: post.y - UNIT, r: 6 } };
    }
    case 'back': {
      // The own third; further up while the ball is in the other half; no carrier gets past.
      const deep = inHalf(ball.x) ? 0.25 : 0.38;
      const centre = onGround(own.x + dir * p.width * deep, own.y + 20 * UNIT);
      if (enemyCarrier && inHalf(enemyCarrier.x)) return { target: enemyCarrier };
      if (!carrier && Math.abs(ball.x - centre.x) < (inHalf(ball.x) ? 10 : 15) * UNIT) return getBall;
      return { leash: { x: centre.x, y: centre.y - UNIT, r: inHalf(ball.x) ? 10 : 15 } };
    }
    case 'striker': {
      const mate = carrier && carrier.team === k.team ? carrier : null;
      if (mate) return { goal: onGround(mate.x + dir * 2 * UNIT, mate.y), fightWithin: 4 }; // escort: clear the way
      if (enemyCarrier) return { target: enemyCarrier };
      return getBall;
    }
    case 'support': {
      const spear = team.find((t) => plays.get(t) === 'striker' && t.isAlive());
      if (enemyCarrier && dist(enemyCarrier) < 9 * UNIT) return { target: enemyCarrier };
      if (!carrier && spear && dist(ball) < Math.hypot(spear.x - ball.x, spear.y - ball.y) - 2 * UNIT) return getBall;
      if (spear) return { goal: onGround(spear.x - dir * 2.5 * UNIT * (team.indexOf(k) % 2 ? 1 : -0.6), spear.y), fightWithin: 3 };
      return getBall;
    }
    default: {
      // Total Football: the two nearest to the ball go for it (or its carrier), the rest hold the line between it and the goal.
      const nearest = [...team].filter((t) => t.isAlive()).sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y));
      const chase = nearest.indexOf(k) < 2;
      if (carrier && carrier.team === k.team) return { goal: onGround(carrier.x + dir * 2 * UNIT, carrier.y), fightWithin: 4 };
      if (chase) return enemyCarrier ? { target: enemyCarrier } : getBall;
      return { goal: onGround((ball.x + own.x) / 2, ball.y), fightWithin: 2.5 };
    }
  }
}
