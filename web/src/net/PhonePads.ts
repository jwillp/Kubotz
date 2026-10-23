/**
 * Phones as gamepads. A phone on the same network opens /pad.html (served by
 * the dev server, see tools/phone-pads.ts), which sends its buttons and stick
 * through a small WebSocket relay; here each phone becomes one more pad in
 * navigator.getGamepads(), with the standard mapping. So the whole game sees
 * it as a real gamepad: menus, joining a slot with A, the match's
 * HumanController, Start / Select, all unchanged.
 *
 * Phone pads take the indices from FIRST_INDEX up, after the browser's own
 * four, and keep their index while the phone reconnects (same phone id).
 */
import Phaser from 'phaser';

/** The browser lists four pads (Chrome, Firefox): phones come after them. */
const FIRST_INDEX = 4;
const BUTTONS = 17;
const PHONE_PAD_ID = 'Kubotz phone pad';

interface VirtualButton { pressed: boolean; touched: boolean; value: number }
interface VirtualPad {
  id: string; index: number; connected: boolean; mapping: GamepadMappingType; timestamp: number;
  buttons: VirtualButton[]; axes: number[]; vibrationActuator: null; hapticActuators: [];
}

type Msg =
  | { t: 'hi'; id: string; name?: string }
  | { t: 's'; id: string; b: number; x: number; y: number; rx?: number; ry?: number }
  | { t: 'bye'; id: string };

/** Phone id -> its pad; a pad object stays the same for good (Phaser keeps the first one it saw). */
const pads = new Map<string, VirtualPad>();
let socket: WebSocket | null = null;

/** 'Phone 1', 'Phone 2'... for the pad at this index, if it is a phone. */
export function phoneName(index: number): string | null {
  for (const p of pads.values()) if (p.index === index) return `Phone ${index - FIRST_INDEX + 1}`;
  return null;
}

/** Rumble on a phone pad (Android phones buzz; iPhones can't). */
export function buzzPhone(index: number, ms: number): void {
  for (const [id, p] of pads) if (p.index === index && p.connected) socket?.send(JSON.stringify({ t: 'buzz', id, ms }));
}

function padFor(id: string): VirtualPad {
  let p = pads.get(id);
  if (!p) {
    const used = new Set([...pads.values()].map((q) => q.index));
    let index = FIRST_INDEX;
    while (used.has(index)) index++;
    p = {
      id: `${PHONE_PAD_ID} ${index - FIRST_INDEX + 1} (STANDARD GAMEPAD)`, index, connected: false, mapping: 'standard', timestamp: 0,
      buttons: Array.from({ length: BUTTONS }, () => ({ pressed: false, touched: false, value: 0 })),
      axes: [0, 0, 0, 0], vibrationActuator: null, hapticActuators: [],
    };
    pads.set(id, p);
  }
  return p;
}

function onMessage(msg: Msg): void {
  const p = padFor(msg.id);
  p.timestamp = performance.now();
  if (msg.t === 'hi') {
    p.connected = true;
    socket?.send(JSON.stringify({ t: 'slot', id: msg.id, text: phoneName(p.index) }));
  } else if (msg.t === 'bye') {
    p.connected = false;
    p.buttons.forEach((b) => { b.pressed = b.touched = false; b.value = 0; });
    p.axes.fill(0);
  } else if (msg.t === 's') {
    p.connected = true;
    for (let i = 0; i < BUTTONS; i++) {
      const on = (msg.b & (1 << i)) !== 0;
      p.buttons[i].pressed = p.buttons[i].touched = on;
      p.buttons[i].value = on ? 1 : 0;
    }
    p.axes[0] = msg.x; p.axes[1] = msg.y; p.axes[2] = msg.rx ?? 0; p.axes[3] = msg.ry ?? 0;
  }
}

/** Adds the phones to navigator.getGamepads() and connects to the relay (quietly does nothing where there is none). */
export function installPhonePads(): void {
  const real = navigator.getGamepads?.bind(navigator);
  if (!real) return;
  // Phaser keeps pads by index, so a phone at 4 leaves holes at 0-3, and two of its loops
  // don't skip holes (a scene stopping would throw): give them the pads only.
  const plugin = Phaser.Input.Gamepad.GamepadPlugin.prototype as unknown as Record<string, (this: { gamepads: unknown[] }) => void>;
  for (const name of ['stopListeners', 'disconnectAll']) {
    const original = plugin[name];
    plugin[name] = function () {
      const all = this.gamepads;
      this.gamepads = all.filter(Boolean);
      try { original.call(this); } finally { this.gamepads = all; }
    };
  }
  navigator.getGamepads = () => {
    const list: (Gamepad | null)[] = [...real()];
    for (const p of pads.values()) {
      if (!p.connected) continue;
      while (list.length <= p.index) list.push(null);
      list[p.index] = p as unknown as Gamepad;
    }
    return list;
  };
  if (!/^https?:$/.test(location.protocol)) return;
  let tries = 0;
  const connect = () => {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/__pads?role=game`);
    ws.onopen = () => { socket = ws; tries = 0; };
    ws.onmessage = (e) => { try { onMessage(JSON.parse(String(e.data)) as Msg); } catch { /* not ours */ } };
    ws.onclose = () => {
      // Lost the relay (the dev server restarted): phones come back with it. No relay at all (a static build): stop asking.
      const was = socket === ws;
      if (was) socket = null;
      for (const p of pads.values()) p.connected = false;
      if (was || ++tries < 2) setTimeout(connect, 2000);
    };
  };
  connect();
}
