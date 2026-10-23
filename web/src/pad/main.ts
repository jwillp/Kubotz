import '@fontsource/exo-2/600.css';
import '@fontsource/exo-2/700.css';

/**
 * The phone pad (pad.html): a gamepad laid out like the owner's Xbox-style
 * pad, sent to the game through the dev server's relay (tools/phone-pads.ts)
 * and seen there as one more browser gamepad (src/net/PhonePads.ts).
 * Buttons use the standard mapping's indices (game/Input.ts BTN); the stick
 * floats: it centres wherever the thumb lands on the left half.
 */

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

const status = document.getElementById('status')!;
const statusTitle = status.querySelector('strong')!;
const detail = document.getElementById('detail')!;
const zone = document.getElementById('stickZone')!;
const base = document.getElementById('base')!;
const knob = document.getElementById('knob')!;
const hint = document.getElementById('hint')!;

// What is held: a bit per standard button, and the stick.
let buttons = 0;
let sx = 0;
let sy = 0;
let sent = '';
let ws: WebSocket | null = null;

function send(force = false): void {
  const msg = JSON.stringify({ t: 's', b: buttons, x: +sx.toFixed(3), y: +sy.toFixed(3) });
  if (!force && msg === sent) return;
  sent = msg;
  if (ws?.readyState === WebSocket.OPEN) ws.send(msg);
}

function setStatus(on: boolean, title: string, text: string): void {
  status.classList.toggle('off', !on);
  statusTitle.textContent = title;
  detail.textContent = text;
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
    const msg = JSON.parse(String(e.data)) as { t: string; text?: string; ms?: number };
    if (msg.t === 'slot') setStatus(true, msg.text ?? 'Connected', 'press A in the game to join');
    if (msg.t === 'buzz') navigator.vibrate?.(msg.ms ?? 30);
  };
  sock.onclose = () => {
    if (ws === sock) ws = null;
    setStatus(false, 'Disconnected', 'trying again…');
    setTimeout(connect, 1500);
  };
}

// Buttons: each touch presses the button under it, and slides from one button to the next.
const buttonEls = [...document.querySelectorAll<HTMLElement>('[data-btn]')];
const touchButton = new Map<number, HTMLElement | null>();

function buttonAt(x: number, y: number): HTMLElement | null {
  return (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-btn]') ?? null;
}

function refreshButtons(): void {
  let held = 0;
  for (const el of touchButton.values()) if (el) held |= 1 << Number(el.dataset.btn);
  const pressedNow = held & ~buttons;
  for (const el of buttonEls) el.classList.toggle('on', (held & (1 << Number(el.dataset.btn))) !== 0);
  if (pressedNow) navigator.vibrate?.(8);
  buttons = held;
  send();
}

// The stick: centred where the thumb lands, full tilt at RADIUS of the base.
let stickTouch: number | null = null;
let ox = 0;
let oy = 0;
const radius = () => base.offsetWidth * 0.38;

function placeBase(x: number, y: number): void {
  const r = zone.getBoundingClientRect();
  base.style.left = `${x - r.left}px`;
  base.style.top = `${y - r.top}px`;
}

function moveStick(x: number, y: number): void {
  const R = radius();
  let dx = (x - ox) / R;
  let dy = (y - oy) / R;
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  sx = dx; sy = dy;
  knob.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
  send();
}

function releaseStick(): void {
  stickTouch = null;
  sx = sy = 0;
  knob.style.transform = '';
  base.classList.remove('on');
  send();
}

function onStart(e: TouchEvent): void {
  e.preventDefault();
  wakeUp();
  for (const t of e.changedTouches) {
    if (stickTouch === null && zone.contains(t.target as Node)) {
      stickTouch = t.identifier;
      ox = t.clientX; oy = t.clientY;
      placeBase(ox, oy);
      base.classList.add('on');
      hint.style.opacity = '0';
      moveStick(ox, oy);
    } else {
      touchButton.set(t.identifier, buttonAt(t.clientX, t.clientY));
    }
  }
  refreshButtons();
}

function onMove(e: TouchEvent): void {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === stickTouch) moveStick(t.clientX, t.clientY);
    else if (touchButton.has(t.identifier)) touchButton.set(t.identifier, buttonAt(t.clientX, t.clientY));
  }
  refreshButtons();
}

function onEnd(e: TouchEvent): void {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === stickTouch) releaseStick();
    touchButton.delete(t.identifier);
  }
  refreshButtons();
}

document.addEventListener('touchstart', onStart, { passive: false });
document.addEventListener('touchmove', onMove, { passive: false });
document.addEventListener('touchend', onEnd, { passive: false });
document.addEventListener('touchcancel', onEnd, { passive: false });

// Mouse too, so the pad can be tried on a PC: one pointer, buttons only, or the stick.
let mouseOn: 'stick' | 'btn' | null = null;
document.addEventListener('mousedown', (e) => {
  if (zone.contains(e.target as Node)) { mouseOn = 'stick'; ox = e.clientX; oy = e.clientY; placeBase(ox, oy); base.classList.add('on'); moveStick(ox, oy); }
  else { mouseOn = 'btn'; touchButton.set(-1, buttonAt(e.clientX, e.clientY)); refreshButtons(); }
});
document.addEventListener('mousemove', (e) => {
  if (mouseOn === 'stick') moveStick(e.clientX, e.clientY);
  else if (mouseOn === 'btn') { touchButton.set(-1, buttonAt(e.clientX, e.clientY)); refreshButtons(); }
});
document.addEventListener('mouseup', () => {
  if (mouseOn === 'stick') releaseStick();
  touchButton.delete(-1);
  refreshButtons();
  mouseOn = null;
});

// On the first touch: full screen, landscape, and keep the screen awake (each where the phone allows it).
let awake = false;
function wakeUp(): void {
  if (awake) return;
  awake = true;
  void document.documentElement.requestFullscreen?.().catch(() => {}).then(() =>
    (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {}));
  void (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<unknown> } }).wakeLock?.request('screen').catch(() => {});
}

// Heartbeat: the latest state again now and then, so a dropped message never leaves a button stuck.
setInterval(() => send(true), 500);
connect();
