import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { World3D } from './three/World3D';

// 1280x768 (5:3), the resolution of the original HUD mock-up and close to its 80x48 viewport.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 768,
  transparent: true, // the 3D arena is drawn on a canvas behind this one
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  render: { antialias: true },
  scene: [BootScene, TitleScene, GameScene, HudScene],
});

game.registry.set('world3d', new World3D(document.getElementById('game')!));
// Phaser's canvas (HUD, labels, lasers, particles) stays above the 3D one.
game.events.once(Phaser.Core.Events.READY, () => {
  game.canvas.style.position = 'relative';
  game.canvas.style.zIndex = '1';
});

// Handy for debugging from the browser console.
(window as unknown as { kubotz: Phaser.Game }).kubotz = game;

