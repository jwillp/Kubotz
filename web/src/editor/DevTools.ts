import Phaser from 'phaser';
import { host, store } from './Host';
import { installDevHud } from './DevHud';
import { kubeBackdrop, PlateButton, shutter } from '../ui/Plate';
import { heading } from '../ui/Type';
import { MenuInput } from '../scenes/MenuInput';

/**
 * The game's dev tools (dev builds only, see main.ts):
 *  - the title's Editor entry opens a menu: Animations and Particles open
 *    the editor over the game (EditorUI.ts), outside any match; Arena makes
 *    a new map and starts a match there with the dev HUD in edit mode;
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

/** The title's Editor entry: a menu of the editors (Animations, Particles, Sounds, Arena) and Back to the title. */
class EditorMenuScene extends Phaser.Scene {
  private items: PlateButton[] = [];
  private selected = 0;
  private menu!: MenuInput;

  constructor() { super('EditorMenu'); }

  create(): void {
    const game = this.game;
    const { width } = this.scale;
    this.items = [];
    kubeBackdrop(this);
    heading(this, width / 2, 150, 'EDITOR', 64);
    const entries: [string, () => void][] = [
      ['Animations', () => void this.openEditor('anim')],
      ['Particles', () => void this.openEditor('particles')],
      ['Sounds', () => void this.openEditor('sound')],
      // A new map from scratch, straight into a match there with the dev HUD in edit mode.
      ['Arena', () => { this.scene.stop(); host.newArenaMatch?.(); }],
      ['Back', () => shutter(this, () => this.scene.start('Title'), 'back')],
    ];
    entries.forEach(([label, go], i) => {
      const b = new PlateButton(this, width / 2, 290 + i * 76, 360, 58, label, { size: 34 });
      b.on('pointerover', () => this.select(i));
      b.on('pointerdown', go);
      this.items.push(b);
    });
    this.select(0);
    this.menu = new MenuInput({
      move: (_dx, dy) => { if (dy) this.select((this.selected + dy + entries.length) % entries.length); },
      confirm: () => entries[this.selected][1](),
      back: () => entries[entries.length - 1][1](),
    });
    // Back from an editor: the menu again.
    host.close = () => {
      ui?.editorShown(false);
      game.scene.resume('EditorMenu');
      this.menu.reset();
    };
  }

  update(time: number): void { this.menu.update(time); }

  private select(i: number): void {
    this.selected = i;
    this.items.forEach((t, j) => t.setSelected(j === i));
  }

  /** Opens the editor on a tab; the menu waits (paused, so its keys do nothing) until Back. */
  private async openEditor(which: 'anim' | 'particles' | 'sound'): Promise<void> {
    ui ??= await import('./EditorUI');
    this.scene.pause();
    ui.editorShown(true, which);
  }
}
