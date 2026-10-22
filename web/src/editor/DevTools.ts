import Phaser from 'phaser';
import { host, store } from './Host';
import { installDevHud } from './DevHud';

/**
 * The game's dev tools (dev builds only, see main.ts):
 *  - the title's Editor entry opens the Animation and Particles editor over
 *    the game (EditorUI.ts), outside any match;
 *  - in a match, the dev HUD (F2 or the DEV button, DevHud.ts) shows time
 *    controls, debug views and the arena tools over the running match.
 * Both are drawn inside the game's container, so they stay on screen in
 * fullscreen.
 */
export function installDevTools(game: Phaser.Game): void {
  host.inGame = true;
  host.game = game;
  host.gameEl = document.getElementById('game')!;
  game.registry.set('store', store);
  game.scene.add('EditorMenu', EditorMenuScene, false);
  installDevHud(game);
  showErrors(host.gameEl);
}

/**
 * Dev builds: any error the page throws shows in a red box over the game
 * (inside its container, so in fullscreen too), with its first stack lines,
 * selectable to copy into a bug report. Click × to hide it.
 */
function showErrors(root: HTMLElement): void {
  const box = Object.assign(document.createElement('div'), { className: 'dev-errors' });
  box.hidden = true;
  const list = document.createElement('pre');
  const close = Object.assign(document.createElement('button'), { textContent: '×', title: 'Hide' });
  close.onclick = () => { box.hidden = true; list.textContent = ''; };
  box.append(close, list);
  root.append(box);
  const add = (what: string) => {
    box.hidden = false;
    list.textContent = `${what}\n\n${list.textContent ?? ''}`.slice(0, 4000);
  };
  window.addEventListener('error', (e) => add(`${e.message}\n${(e.error as Error | undefined)?.stack?.split('\n').slice(1, 6).join('\n') ?? `${e.filename}:${e.lineno}`}`));
  window.addEventListener('unhandledrejection', (e) => add(`Unhandled: ${(e.reason as Error | undefined)?.stack?.split('\n').slice(0, 6).join('\n') ?? String(e.reason)}`));
}

let ui: typeof import('./EditorUI') | null = null;

/** The title's Editor entry: opens the editor; its Back button returns to the title. */
class EditorMenuScene extends Phaser.Scene {
  constructor() { super('EditorMenu'); }

  async create(): Promise<void> {
    const game = this.game;
    ui ??= await import('./EditorUI');
    host.close = () => {
      ui!.editorShown(false);
      game.scene.stop('EditorMenu');
      game.scene.start('Title');
    };
    ui.editorShown(true);
  }
}
