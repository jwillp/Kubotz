import '@fontsource/exo-2/600.css';
import '@fontsource/exo-2/700.css';
import './pad.css';
import { B, onStatus, releaseAll, startLink } from './link';
import { bindTouches, SlideButtons } from './touch';
import type { Layout } from './layouts/layout';
import { classic } from './layouts/classic';
import { swipe } from './layouts/swipe';
import { zones } from './layouts/zones';
import { lean } from './layouts/lean';
import { onehand } from './layouts/onehand';

/**
 * The phone pad (pad.html): sends its buttons and sticks to the game through
 * the dev server's relay (see link.ts), where it is one more browser gamepad.
 * Several layouts to compare how each one plays, picked on the layout screen
 * (kept on the phone; ?layout= picks one too). The top bar is the same in all
 * of them: Quit (Select), the connection, Start, and the layout screen.
 */

const LAYOUTS: Layout[] = [classic, swipe, zones, lean, onehand];
const LAYOUT_KEY = 'kubotz.phonePad.layout';

const stage = document.getElementById('stage')!;
const chooser = document.getElementById('chooser')!;
const bar = document.getElementById('bar')!;

onStatus((s) => {
  bar.classList.toggle('off', !s.on);
  bar.querySelector('strong')!.textContent = s.title;
  bar.querySelector('.detail')!.textContent = s.text;
  chooser.querySelector('.conn')!.textContent = `${s.title} · ${s.text}`;
});

// The top bar: Quit and Start slide like any button; Layouts opens the layout screen.
bar.querySelector<HTMLElement>('.quit')!.dataset.btn = String(B.SELECT);
bar.querySelector<HTMLElement>('.start')!.dataset.btn = String(B.START);
const barButtons = new SlideButtons(bar, 'bar');
bindTouches(bar, { start: (f) => barButtons.start(f), move: (f) => barButtons.move(f), end: (f) => barButtons.end(f) });
bar.querySelector('.layouts')!.addEventListener('click', () => showChooser(true));
document.querySelector('#turn .other')!.addEventListener('click', () => showChooser(true));

let current: Layout | null = null;
let teardown: (() => void) | null = null;

function use(layout: Layout): void {
  teardown?.();
  releaseAll();
  stage.replaceChildren();
  const root = document.createElement('div');
  stage.append(root);
  teardown = layout.mount(root);
  current = layout;
  document.body.classList.toggle('portrait', !!layout.portrait);
  bar.querySelector('.layouts b')!.textContent = layout.name;
  try { localStorage.setItem(LAYOUT_KEY, layout.id); } catch { /* private mode */ }
  for (const el of chooser.querySelectorAll<HTMLElement>('[data-layout]')) el.classList.toggle('current', el.dataset.layout === layout.id);
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  if (document.fullscreenElement) void orientation.lock?.(layout.portrait ? 'portrait' : 'landscape').catch(() => {});
}

function showChooser(on: boolean): void {
  if (on) releaseAll();
  chooser.classList.toggle('show', on);
}

chooser.querySelector('.list')!.innerHTML = LAYOUTS.map((l, i) => `
  <button data-layout="${l.id}"><span class="n">${i + 1}</span><span class="t"><strong>${l.name}</strong>${l.blurb}</span>${l.portrait ? '<em>upright</em>' : ''}</button>`).join('');
for (const el of chooser.querySelectorAll<HTMLButtonElement>('[data-layout]')) {
  el.addEventListener('click', () => {
    wakeUp();
    use(LAYOUTS.find((l) => l.id === el.dataset.layout)!);
    showChooser(false);
  });
}
chooser.querySelector('.close')!.addEventListener('click', () => showChooser(false));

// On the first touch: full screen, the layout's orientation, and keep the screen awake (each where the phone allows it).
let awake = false;
function wakeUp(): void {
  if (awake) return;
  awake = true;
  void document.documentElement.requestFullscreen?.().catch(() => {}).then(() =>
    (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.(current?.portrait ? 'portrait' : 'landscape').catch(() => {}));
  void (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<unknown> } }).wakeLock?.request('screen').catch(() => {});
}
document.addEventListener('touchstart', wakeUp, { passive: true });

const asked = new URLSearchParams(location.search).get('layout');
const kept = (() => { try { return localStorage.getItem(LAYOUT_KEY); } catch { return null; } })();
const first = LAYOUTS.find((l) => l.id === asked) ?? LAYOUTS.find((l) => l.id === kept);
use(first ?? classic);
// First visit: start on the layout screen so every layout gets a try.
if (!first) showChooser(true);
startLink();
