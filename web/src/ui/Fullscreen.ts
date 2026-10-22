import Phaser from 'phaser';

/**
 * Fullscreen, from anywhere: F11 on the keyboard, Select (the "minus" or
 * "back" button) on a gamepad, or the Settings screen. The browser only
 * allows it right after a key press or click on the page, and an embedding
 * page must allow it too: when it is refused, a note says so.
 */
let note: HTMLDivElement | undefined;

export function toggleFullscreen(game: Phaser.Game): void {
  if (!game.scale.fullscreen.available || document.fullscreenEnabled === false) { say('Fullscreen is not allowed here: open the game in its own tab, or use the browser\'s full screen (F11)'); return; }
  game.scale.toggleFullscreen();
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
    e.preventDefault(); // the game's own fullscreen rather than the browser's
    toggleFullscreen(game);
  });
  game.scale.on(Phaser.Scale.Events.FULLSCREEN_FAILED, () => say('The browser refused fullscreen: press F11 or click the game, then try again'));
  game.scale.on(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, () => say('Fullscreen is not supported here'));

  // Select on any pad, read straight from the browser (a scene's gamepad
  // plugin only runs while that scene does). In the pause Select quits to
  // the title instead (GameScene).
  let wasDown = false;
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    const down = (navigator.getGamepads?.() ?? []).some((p) => p?.buttons[SELECT]?.pressed);
    if (down && !wasDown) {
      const match = game.scene.getScene('Game') as Phaser.Scene & { paused?: boolean } | null;
      if (!(match && game.scene.isActive('Game') && match.paused)) toggleFullscreen(game);
    }
    wasDown = down;
  });
}
