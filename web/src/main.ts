import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { SetupScene } from './scenes/SetupScene';
import { ModeScene } from './scenes/ModeScene';
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

// 1280x768 (5:3), the resolution of the original HUD mock-up and close to its 80x48 viewport.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 768,
  backgroundColor: '#05080f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  render: { antialias: true, maxLights: 36 },
  scene: [BootScene, TitleScene, ModeScene, SetupScene, BackdropScene, GameScene, HudScene, DebugScene, SettingsScene, ControlsScene, MoveListScene, ResultsScene, ShutterScene],
});

installFullscreen(game);

// Handy for debugging from the browser console.
(window as unknown as { kubotz: Phaser.Game }).kubotz = game;

