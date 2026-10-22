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
