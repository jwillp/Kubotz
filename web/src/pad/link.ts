/**
 * The phone pad's link to the game: the pad state (a bit per standard button,
 * the left and right sticks), sent through the dev server's relay
 * (tools/phone-pads.ts) on every change and twice a second; the game sees it
 * as one more browser gamepad (src/net/PhonePads.ts).
 *
 * Several parts of a layout press buttons at once (a button row, a gesture
 * pad, the top bar), so each one sets its own bits under a name and the pad
 * sends them all OR-ed together, plus short presses (pulse) for taps and swipes.
 */

/** Standard gamepad button indices (game/Input.ts BTN). */
export const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, UP: 12 } as const;

/** What the game tells a phone about its Kubot (GameScene.sendPhoneInfo), for the one-hand layout. */
export interface PadInfo {
  /** Health percentage left (100 full), lives left, guard (0..1), the Kubot's colour as #rrggbb. */
  health: number; lives: number; guard: number; color: string;
  weapon: string; powerUps: string[]; kills: number;
  /** Health lost to the last hit, and a counter that changes on each hit. */
  hit: number; hits: number;
  alive: boolean;
}

const ID_KEY = 'kubotz.phonePad.id';
const id = (() => {
  try {
    const kept = localStorage.getItem(ID_KEY);
    if (kept) return kept;
    const made = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(ID_KEY, made);
    return made;
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
})();

const held = new Map<string, number>();
const sticks = new Map<string, [number, number]>();
const pulses: { bits: number; until: number }[] = [];
let cstick: { x: number; y: number; until: number } | null = null;
let buttons = 0;
let sent = '';
let ws: WebSocket | null = null;
let quiet = false;

type Status = { on: boolean; title: string; text: string };
let status: Status = { on: false, title: 'Connecting', text: 'looking for the game' };
const statusListeners: ((s: Status) => void)[] = [];
const infoListeners: ((i: PadInfo) => void)[] = [];
const buzzListeners: ((ms: number) => void)[] = [];

export function onStatus(f: (s: Status) => void): void { statusListeners.push(f); f(status); }
export function onInfo(f: (i: PadInfo) => void): () => void {
  infoListeners.push(f);
  return () => infoListeners.splice(infoListeners.indexOf(f), 1);
}
export function onBuzz(f: (ms: number) => void): () => void {
  buzzListeners.push(f);
  return () => buzzListeners.splice(buzzListeners.indexOf(f), 1);
}

function setStatus(on: boolean, title: string, text: string): void {
  status = { on, title, text };
  for (const f of statusListeners) f(status);
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/** Sends the state if it changed (or always, for the heartbeat). */
export function send(force = false): void {
  if (quiet) return;
  const now = performance.now();
  for (let i = pulses.length - 1; i >= 0; i--) if (pulses[i].until <= now) pulses.splice(i, 1);
  if (cstick && cstick.until <= now) cstick = null;
  let bits = 0;
  for (const b of held.values()) bits |= b;
  for (const p of pulses) bits |= p.bits;
  let x = 0;
  let y = 0;
  for (const [sx, sy] of sticks.values()) { x += sx; y += sy; }
  if (bits & ~buttons) navigator.vibrate?.(8);
  buttons = bits;
  const msg = JSON.stringify({ t: 's', b: bits, x: +clamp1(x).toFixed(3), y: +clamp1(y).toFixed(3), rx: cstick?.x ?? 0, ry: cstick?.y ?? 0 });
  if (!force && msg === sent) return;
  sent = msg;
  if (ws?.readyState === WebSocket.OPEN) ws.send(msg);
}

/** The buttons a part of the layout holds (bits of B), replacing what it held before. */
export function hold(part: string, bits: number): void {
  held.set(part, bits);
  send();
}

/** A part of the layout's stick push (the pushes add up, clamped to -1..1). */
export function stick(part: string, x: number, y: number): void {
  sticks.set(part, [x, y]);
  send();
}

/** A button pressed for a moment: a tap. Long enough for the game to see it at any frame rate. */
export function pulse(btn: number, ms = 70): void {
  pulses.push({ bits: 1 << btn, until: performance.now() + ms });
  send();
  setTimeout(() => send(), ms + 5);
}

/** The right stick pushed for a moment: a smash on the ground, an aerial in the air. */
export function smash(x: number, y: number, ms = 80): void {
  const len = Math.hypot(x, y) || 1;
  cstick = { x: x / len, y: y / len, until: performance.now() + ms };
  send();
  setTimeout(() => send(), ms + 5);
}

/** Several changes sent as one (so the game never sees the state halfway). */
export function together(f: () => void): void {
  quiet = true;
  try { f(); } finally { quiet = false; }
  send();
}

/** Lets go of everything (switching layouts). */
export function releaseAll(): void {
  held.clear();
  sticks.clear();
  pulses.length = 0;
  cstick = null;
  send();
}

function connect(): void {
  setStatus(false, 'Connecting', `looking for the game at ${location.host}`);
  const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/__pads?role=phone`);
  sock.onopen = () => {
    ws = sock;
    sock.send(JSON.stringify({ t: 'hi', id, name: navigator.userAgent }));
    send(true);
    setStatus(true, 'Connected', 'press A in the game to join');
  };
  sock.onmessage = (e) => {
    const msg = JSON.parse(String(e.data)) as { t: string; text?: string; ms?: number } & Partial<PadInfo>;
    if (msg.t === 'slot') setStatus(true, msg.text ?? 'Connected', 'press A in the game to join');
    if (msg.t === 'buzz') {
      navigator.vibrate?.(msg.ms ?? 30);
      for (const f of buzzListeners) f(msg.ms ?? 30);
    }
    if (msg.t === 'info') for (const f of infoListeners) f(msg as PadInfo);
  };
  sock.onclose = () => {
    if (ws === sock) ws = null;
    setStatus(false, 'Disconnected', 'trying again…');
    setTimeout(connect, 1500);
  };
}

/** Connects to the relay, with a heartbeat so a dropped message never leaves a button stuck. */
export function startLink(): void {
  setInterval(() => send(true), 500);
  connect();
}
