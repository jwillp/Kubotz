import type Phaser from 'phaser';
import { Store } from './Store';

/**
 * Where the editor runs: on its own page (editor.html), or inside the game
 * (dev builds: the title's Editor entry and the in-match dev HUD, see
 * DevTools.ts), drawn over the game's canvas.
 */
export const host: {
  inGame: boolean;
  /** The running game, inside the game. */
  game?: Phaser.Game;
  /** The game's container: the editor is drawn in it, over the canvas (so it stays on screen in fullscreen). */
  gameEl?: HTMLElement;
  /** Inside the game: leaves the editor (back to the editor menu). */
  close?: () => void;
  /** The editor menu's Arena: a new arena, a match there, the dev HUD in edit mode (DevHud.ts). */
  newArenaMatch?: () => void;
} = { inGame: false };

/** The documents being edited, shared by the editor and the in-match dev HUD (one undo history, one Save). */
export const store = new Store();
