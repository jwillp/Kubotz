import Phaser from 'phaser';
import { isPhonePad } from '../net/PhonePads';

/**
 * Fullscreen, from anywhere: F11 on the keyboard, Select (the "minus" or
 * "back" button) on a gamepad, or the Settings screen. The browser only
 * allows it right after a key press or click on the page, and an embedding
 * page must allow it too: when it is refused, a note says so.
 */
let note: HTMLDivElement | undefined;

/** Whether the page may go fullscreen itself (an embedding page can forbid it). */
const allowed = (game: Phaser.Game) => game.scale.fullscreen.available && document.fullscreenEnabled !== false;

export function toggleFullscreen(game: Phaser.Game): void {
  if (!allowed(game)) { say('Fullscreen is not allowed here: open the game in its own tab, or use the browser\'s full screen (F11)'); return; }
  game.scale.toggleFullscreen();
}

/**
 * The pads the browser shows, or none when it refuses (an embedding page can
 * forbid the Gamepad API, and some browsers then throw).
 */
export function gamepads(): Gamepad[] {
  try {
    return (navigator.getGamepads?.() ?? []).filter((p): p is Gamepad => !!p);
  } catch {
    return [];
  }
}

/**
 * Fullscreen moves the canvas into a screen-sized element, but the game is
 * still fitted to its parent, which a page may size for the window (a fixed
 * width, a border): while fullscreen the parent takes the screen's size too,
 * and gets its own look back after.
 */
function fillScreen(game: Phaser.Game, on: boolean): void {
  const el = game.scale.parent as HTMLElement | null;
  if (!el) return;
  if (on) {
    el.dataset.windowStyle ??= el.getAttribute('style') ?? '';
    Object.assign(el.style, {
      // Fixed, so a flex or grid layout around it cannot shrink it.
      position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', maxWidth: 'none', maxHeight: 'none', aspectRatio: 'auto',
      margin: '0', border: '0', boxShadow: 'none', background: '#000',
    });
  } else if (el.dataset.windowStyle !== undefined) {
    el.setAttribute('style', el.dataset.windowStyle);
    delete el.dataset.windowStyle;
  }
  // refresh() keeps the parent size it last measured: measure it again first.
  game.scale.getParentBounds();
  game.scale.refresh();
}

/** A short note over the game, gone after a few seconds. */
function say(text: string): void {
  note ??= document.body.appendChild(document.createElement('div'));
  Object.assign(note.style, {
    position: 'fixed', left: '50%', bottom: '64px', transform: 'translateX(-50%)', maxWidth: 'calc(100% - 32px)',
    padding: '10px 18px', background: 'rgba(5, 11, 24, 0.92)', border: '1px solid #29abe2', color: '#cfe9ff',
    font: '600 15px "Exo 2", system-ui, sans-serif', textAlign: 'center', pointerEvents: 'none', zIndex: '10',
    transition: 'opacity 0.3s', opacity: '1',
  });
  note.textContent = text;
  clearTimeout(Number(note.dataset.timer));
  note.dataset.timer = String(setTimeout(() => { if (note) note.style.opacity = '0'; }, 3500));
}

const SELECT = 8;

export function installFullscreen(game: Phaser.Game): void {
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F11' || e.repeat) return;
    // Where the page may not go fullscreen itself, F11 stays the browser's own full screen.
    if (!allowed(game)) return;
    e.preventDefault(); // the game's own fullscreen rather than the browser's
    toggleFullscreen(game);
  });
  // Alt+Enter too, as in PC games. Caught before the menus and the game see the key, so the Enter does not also select.
  window.addEventListener('keydown', (e) => {
    if (!e.altKey || (e.code !== 'Enter' && e.code !== 'NumpadEnter')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) toggleFullscreen(game);
  }, { capture: true });
  game.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, () => fillScreen(game, true));
  game.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, () => fillScreen(game, false));
  game.scale.on(Phaser.Scale.Events.FULLSCREEN_FAILED, () => say('The browser refused fullscreen: press F11 or click the game, then try again'));
  game.scale.on(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, () => say('Fullscreen is not supported here'));

  // Select on any pad, read straight from the browser (a scene's gamepad
  // plugin only runs while that scene does). In the pause Select quits to
  // the title instead (GameScene). Not from a phone pad: the browser refuses
  // fullscreen without a real press on this page.
  let wasDown = false;
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    const down = gamepads().some((p) => !isPhonePad(p) && p.buttons[SELECT]?.pressed);
    if (down && !wasDown) {
      const match = game.scene.getScene('Game') as Phaser.Scene & { paused?: boolean } | null;
      if (!(match && game.scene.isActive('Game') && match.paused)) toggleFullscreen(game);
    }
    wasDown = down;
  });
}
