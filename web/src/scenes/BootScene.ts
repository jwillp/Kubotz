import Phaser from 'phaser';
import { SpriterData } from '../spriter/Spriter';
import { parseTmx, TmxMap } from '../map/TmxMap';

export const KUBOTZ_SCML = 'animations/kubotz.scml';
export const MAIN_MAP = 'maps/DebugMap.tmx';

/** Loads the original assets: Spriter file + its images, TMX map + tiles, HUD. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.drawLoadingBar();
    this.load.text('scml', KUBOTZ_SCML);
    this.load.text('tmx', MAIN_MAP);
    this.load.image('bg', 'maps/background.jpg');
    this.load.image('hud-badge', 'hud-multi-badge.png');
    this.load.image('hud-bars', 'hud-multi-bars.png');
    this.load.image('hud-timer', 'hud-multi-timer.png');
    this.load.image('label-P1', 'hud/player1_label.png');
    this.load.image('label-P2', 'hud/player2_label.png');
    this.load.image('label-CPU', 'hud/cpu_label.png');
    this.load.image('dash-orb', 'dashOrb.png');
    this.load.image('p-star', 'particles/star.png');
    this.load.image('p-star2', 'particles/star2.png');
    this.load.image('p-dust', 'particles/particle001.png');
    this.load.image('p-hexa', 'particles/hexa.png');
    this.load.image('p-flame', 'particles/flameche.png');
  }

  async create(): Promise<void> {
    const spriter = new SpriterData(this.cache.text.get('scml'), 'Kubotz');
    const map: TmxMap = await parseTmx(this.cache.text.get('tmx'));
    this.registry.set('spriter', spriter);
    this.registry.set('map', map);

    for (const file of spriter.allFiles()) this.load.image(`kubotz:${file}`, `animations/${file}`);
    for (const tile of map.tileImages.values()) this.load.image(`tile:${tile.source}`, `maps/${tile.source}`);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.makeTextures();
      this.scene.start('Title');
    });
    this.load.start();
  }

  /** Small procedural textures for things the original drew as Box2D debug shapes. */
  private makeTextures(): void {
    const g = this.make.graphics({}, false);
    // power-up orb
    g.clear();
    g.fillStyle(0xffffff, 0.25).fillCircle(32, 32, 32);
    g.fillStyle(0xffffff, 1).fillCircle(32, 32, 24);
    g.lineStyle(4, 0xffffff, 0.9).strokeCircle(32, 32, 29);
    g.generateTexture('orb', 64, 64);
    // laser bolt
    g.clear();
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(0, 0, 64, 16, 8);
    g.fillStyle(0xffffff, 1).fillRoundedRect(6, 5, 52, 6, 3);
    g.generateTexture('laser', 64, 16);
    // drone
    g.clear();
    g.fillStyle(0x223344, 1).fillCircle(32, 32, 26);
    g.lineStyle(5, 0xffffff, 1).strokeCircle(32, 32, 26);
    g.fillStyle(0xffffff, 1).fillCircle(32, 32, 9);
    g.fillStyle(0xffffff, 0.8).fillRect(4, 28, 10, 8).fillRect(50, 28, 10, 8);
    g.generateTexture('drone', 64, 64);
    // spark
    g.clear();
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
    g.destroy();
  }

  private drawLoadingBar(): void {
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    const text = this.add.text(width / 2, height / 2 - 40, 'KUBOTZ', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '48px', color: '#29abe2',
    }).setOrigin(0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      bar.clear().fillStyle(0x29abe2, 1).fillRect(width / 2 - 200, height / 2 + 10, 400 * p, 12);
      bar.lineStyle(2, 0x29abe2, 1).strokeRect(width / 2 - 200, height / 2 + 10, 400, 12);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => { text.setText('KUBOTZ'); });
  }
}
