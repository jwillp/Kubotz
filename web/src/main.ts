import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { SetupScene } from './scenes/SetupScene';
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
import { useEditedData } from './game/EditedData';

// Opened from the editor's "Test in game": its clips and moves instead of the saved ones.
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
  render: { antialias: true, maxLights: 36 },
  scene: [BootScene, TitleScene, SetupScene, BackdropScene, GameScene, HudScene, DebugScene, SettingsScene, ControlsScene, MoveListScene, ResultsScene, ShutterScene],
});

installFullscreen(game);

// The dev tools, in dev builds (and `npm run build:editor`): the title's Editor entry and the in-match dev HUD (F2).
// The production build leaves them out.
if (__EDITOR__) void import('./editor/DevTools').then((m) => m.installDevTools(game));

// Handy for debugging from the browser console.
(window as unknown as { kubotz: Phaser.Game }).kubotz = game;

