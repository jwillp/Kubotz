// Kubeball team play: how a team's CPUs share the work, around the human players.

import { UNIT } from '../config';
import type { Objective } from './Ai';
import type { GameBall } from './Ball';
import type { Kubotz } from './Kubotz';

/**
 * A team's strategy:
 *  - 'twoTwo' (Two-Two, a futsal box): a goalie and a defender stay home,
 *    two attackers go forward; when one has the ball the other escorts it.
 *    With the ball in the other half, the defender's zone grows, but no one
 *    gets past it.
 *  - 'total' (Total Football, after the Dutch): everyone attacks and
 *    defends; the two nearest go for the ball, the others hold the line
 *    between the ball and their goal.
 *  - 'spearhead' (Spearhead, a rugby maul): one attacker, the rest pack
 *    round it and pass it the ball whenever they can.
 */
export type Tactic = 'twoTwo' | 'total' | 'spearhead';
export const TACTICS: Record<Tactic, string> = { twoTwo: 'Two-Two', total: 'Total Football', spearhead: 'Spearhead' };
export const TACTIC_ORDER: Tactic[] = ['twoTwo', 'total', 'spearhead'];

/** A Kubot's job in its team's strategy. */
/** The same four names in every strategy: goalie, defender, attacker, support ('free' is Total Football's, shown as attacker or defender as it plays). */
export type Play = 'goalie' | 'defender' | 'attacker' | 'support' | 'free';

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
  /** The top of a surface over x by height: 0 the floor, 1 the first platform up, 2 the next (the highest there is). */
  perch(x: number, level: number): number;
}

/** How far a Kubot is up the pitch, from its own goal (0) to the other (1). */
export function progress(k: { x: number; team: number }, p: Pitch): number {
  const a = p.ownGoal(k.team).x; const b = p.enemyGoal(k.team).x;
  return Math.min(1, Math.max(0, (k.x - a) / (b - a)));
}

/**
 * Hands out a team's plays. The human players play where they are: deep in
 * the other half they count as attackers, at home as defence, and the CPUs
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
    for (const k of team) plays.set(k, k === spear ? 'attacker' : 'support');
    return plays;
  }
  // Two-Two: the slots for this many, defence first.
  const slots: Play[] = team.length >= 4 ? ['goalie', 'defender', 'attacker', 'attacker'] : team.length === 3 ? ['goalie', 'attacker', 'attacker']
    : team.length === 2 ? ['defender', 'attacker'] : ['attacker'];
  const take = (play: Play) => { const i = slots.indexOf(play); if (i >= 0) { slots.splice(i, 1); return true; } return false; };
  for (const h of [...humans].sort((a, b) => progress(b, p) - progress(a, p))) {
    const forward = progress(h, p) > 0.5;
    const got = forward ? (take('attacker') && 'attacker') : (take('defender') && 'defender') || (take('goalie') && 'goalie');
    plays.set(h, got || slots.shift() || 'attacker');
  }
  // CPUs nearest home defend.
  const defence = slots.filter((s) => s === 'goalie' || s === 'defender'); // goalie first
  const attack = slots.filter((s) => s === 'attacker');
  for (const k of cpus) plays.set(k, defence.shift() ?? attack.shift() ?? 'attacker');
  return plays;
}

/**
 * A CPU's objective in Kubeball, by its play. Like real team sports, only
 * one player per team presses the ball (the nearest, not the goalie unless
 * the ball is at its goal); the others take up positions off it, spread
 * over the pitch and its platforms (an attacker ahead and high to receive a
 * pass, a support behind the ball, a defender between the ball and the
 * goal, marking an attacker in its half), so the teams do not flock onto
 * the ball. Any enemy coming close is fought.
 */
export function playObjective(k: Kubotz, play: Play, team: Kubotz[], plays: Map<Kubotz, Play>, p: Pitch, enemies: Kubotz[]): Objective {
  const ball = p.ball;
  const dir = Math.sign(p.enemyGoal(k.team).x - p.ownGoal(k.team).x) || 1;
  const own = p.ownGoal(k.team);
  const dist = (q: { x: number; y: number }) => Math.hypot(q.x - k.x, q.y - k.y);
  const clampX = (x: number) => Math.min(p.width - 8 * UNIT, Math.max(8 * UNIT, x));
  const carrier = ball.carrier;
  const enemyCarrier = carrier && carrier.team !== k.team ? carrier : null;
  const inHalf = (x: number) => (x - p.width / 2) * dir < 0; // in this team's own half
  const alive = team.filter((t) => t.isAlive());
  const nearOwnGoal = Math.hypot(ball.x - own.x, ball.y - own.y) < 12 * UNIT;

  // With the ball: a Spearhead support passes to its attacker when it is ahead and in reach; else to the goal.
  if (k.ball) {
    const goal = p.enemyGoal(k.team);
    const spear = play === 'support' ? team.find((t) => plays.get(t) === 'attacker' && t !== k && t.isAlive()) : null;
    if (spear && (spear.x - k.x) * dir > 1.5 * UNIT && Math.abs(spear.x - k.x) < 11 * UNIT && Math.abs(spear.y - k.y) < 3 * UNIT) {
      return { goal: { x: spear.x, y: spear.body.bottom }, fightWithin: 0.5, grab: Math.sign(spear.x - k.x) === k.facing };
    }
    // Under the goal (on the platform below it), then up and in.
    const under = { x: goal.x - dir * 4 * UNIT, y: p.ground(goal.x - dir * 4 * UNIT, goal.y + 2 * UNIT) };
    const close = Math.abs(k.x - goal.x) < 9 * UNIT && Math.abs(k.y - goal.y) < 9 * UNIT;
    return { goal: close ? goal : under, fightWithin: 1, grab: close }; // a CPU's throw aims itself
  }

  // The presser: the one teammate nearest the ball (a goalie only when the ball is at its goal).
  const pressers = alive.filter((t) => !t.ball && (plays.get(t) !== 'goalie' || nearOwnGoal));
  const target = enemyCarrier ?? ball;
  const presser = pressers.sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))[0];
  if (k === presser && (!carrier || enemyCarrier)) return enemyCarrier ? { target: enemyCarrier } : { ball: { x: ball.x, y: ball.y } };

  // Everyone else: a position, kept apart from the teammates' (no two within 3 units).
  const spot = (x: number, level: number) => {
    let sx = clampX(x);
    for (const t of alive) if (t !== k && Math.abs(t.x - sx) < 3 * UNIT && Math.abs(t.y - k.y) < 2 * UNIT) sx = clampX(sx + (team.indexOf(k) % 2 ? 4 : -4) * UNIT);
    return { goal: { x: sx, y: p.perch(sx, level) }, fightWithin: 2 };
  };
  const mate = carrier && carrier.team === k.team ? carrier : null;
  const lead = mate ?? ball;
  switch (play) {
    case 'goalie': {
      const post = { x: own.x + dir * 4 * UNIT, y: p.ground(own.x + dir * 4 * UNIT, own.y + 2 * UNIT) };
      if (enemyCarrier && Math.hypot(enemyCarrier.x - own.x, enemyCarrier.y - own.y) < 14 * UNIT) return { target: enemyCarrier };
      return { leash: { x: post.x, y: post.y - UNIT, r: 6 } };
    }
    case 'defender': {
      // Mark the enemy attacker furthest into this half; else between the ball and the goal (further up while the ball is away).
      const threat = enemies.filter((e) => e.isAlive() && inHalf(e.x)).sort((a, b) => (a.x - b.x) * dir)[0];
      if (threat && dist(threat) < 14 * UNIT) return { target: threat };
      return spot(own.x + (lead.x - own.x) * (inHalf(lead.x) ? 0.35 : 0.5), 0);
    }
    case 'attacker':
      // Ahead of the play, high, open for a pass.
      return spot(lead.x + dir * 8 * UNIT, 1);
    case 'support':
      // Behind the ball, on a platform over it: a pass back, a second chance.
      return spot(lead.x - dir * 4 * UNIT, 1 + (team.indexOf(k) % 2));
    default: {
      // Total Football: whoever is not pressing spreads out, one ahead, one behind, alternating heights.
      const i = alive.indexOf(k);
      return spot(lead.x + (i % 2 ? 7 : -5) * dir * UNIT, i % 3 === 0 ? 0 : 1);
    }
  }
}
