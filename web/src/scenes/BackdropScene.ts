import Phaser from 'phaser';

/** Full-screen background behind the arena with a slight parallax (graphics pass). */
export class BackdropScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Image;

  constructor() { super('Backdrop'); }

  create(): void {
    const { width, height } = this.scale;
    this.bg = this.add.image(width / 2, height / 2, 'bg');
    this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height) * 1.15);
    // A dim room, so the lights, lasers and glowing platforms carry the scene.
    this.bg.setTint(0x6878a0, 0x6878a0, 0x26304a, 0x26304a);
  }

  update(): void {
    const cam = this.scene.get('Game').cameras.main;
    const { width, height } = this.scale;
    // Map is about 3300 x 2400 px; drift the backdrop a little with the camera.
    this.bg.setPosition(width / 2 - (cam.midPoint.x / 3328 - 0.5) * 80, height / 2 - (cam.midPoint.y / 2432 - 0.5) * 50);
  }
}
