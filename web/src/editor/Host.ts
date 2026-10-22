import type Phaser from 'phaser';

/**
 * Where the editor runs: on its own page (editor.html), or inside the game
 * (InGame.ts sets this before loading the editor), docked round the match.
 */
export const host: {
  inGame: boolean;
  /** The running game, inside the game. */
  game?: Phaser.Game;
  /** The game's own page container, moved into the editor's stage while it is open. */
  gameEl?: HTMLElement;
  /** Inside the game: closes the editor and plays on. */
  close?: () => void;
  /** Inside the game: lets the match run (true) or freezes it to edit (false). */
  play?: (on: boolean) => void;
  /** Inside the game: plays the open arena (restarting the match there, its edits in). */
  playArena?: (id: string) => void;
} = { inGame: false };
