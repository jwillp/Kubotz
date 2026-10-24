import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { SetupScene } from './scenes/SetupScene';
import { ModeScene } from './scenes/ModeScene';
import { ModulesScene } from './scenes/ModulesScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { BackdropScene } from './scenes/BackdropScene';
import { DebugScene } from './scenes/DebugScene';
import { SettingsScene } from './scenes/SettingsScene';
import { MoveListScene } from './scenes/MoveListScene';
import { ControlsScene } from './scenes/ControlsScene';
import { ResultsScene } from './scenes/ResultsScene';
import { ShutterScene } from './ui/Plate';
import { installFullscreen } from './ui/Fullscreen';
import { useEditedData, useKeptEdits } from './game/EditedData';

// Gamepads in an embedding page that doesn't allow them (the artifact frame):
// getGamepads() throws "Permissions check failed" on every call, so it answers
// "no pads" instead. And Phaser's gamepad plugin keeps pads by their index, so a
// pad on index 1 leaves a hole at 0 that its shutdown trips on: holes are skipped.
const getPads = navigator.getGamepads?.bind(navigator);
if (getPads) navigator.getGamepads = () => { try { return getPads(); } catch { return []; } };
const padPlugin = Phaser.Input.Gamepad.GamepadPlugin.prototype as unknown as { stopListeners(): void; disconnectAll(): void; gamepads: (Phaser.Input.Gamepad.Gamepad | undefined)[] };
for (const name of ['stopListeners', 'disconnectAll'] as const) {
  const original = padPlugin[name];
  padPlugin[name] = function (this: typeof padPlugin) {
    const pads = this.gamepads;
    this.gamepads = pads.filter(Boolean);
    try { original.call(this); } finally { this.gamepads = pads; }
  };
}

// Dev builds: the edits saved in this browser; opened from the editor's "Test in game": its data.
useKeptEdits();
useEditedData();

// 1280x768 (5:3), the resolution of the original HUD mock-up and close to its 80x48 viewport.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 768,
  backgroundColor: '#05080f',
  // Fullscreen takes the game's container (not a new element round the canvas), so what is drawn over the canvas stays on screen.
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
  input: { gamepad: true },
  render: { antialias: true, maxLights: 48 },
  scene: [BootScene, TitleScene, ModeScene, ModulesScene, SetupScene, BackdropScene, GameScene, HudScene, DebugScene, SettingsScene, ControlsScene, MoveListScene, ResultsScene, ShutterScene],
});

installFullscreen(game);

// The dev tools, in dev builds (and `npm run build:editor`): the title's Editor entry and the in-match dev HUD (F2).
// The production build leaves them out.
if (__EDITOR__) void import('./editor/DevTools').then((m) => m.installDevTools(game));

// Handy for debugging from the browser console.
(window as unknown as { kubotz: Phaser.Game }).kubotz = game;

