import Phaser from 'phaser';
import { explosionBuffer } from '../game/Debris';
import { loadModels } from '../three/Models';
import { SpriterData } from '../spriter/Spriter';
import { parseTmx, TmxMap } from '../map/TmxMap';
import { EffectDef, parseEffect } from '../fx/ParticleEffect';
import { CPU_COLORS, GUN_FILE, HEAD_FILES, P1_COLOR, P2_COLOR, PART_TIPS, SWORD_FILE, hex } from '../game/Kubotz';

export const KUBOTZ_SCML = 'animations/kubotz.scml';
export const MAIN_MAP = 'maps/DebugMap.tmx';

/** Particle effects by name: the files the full-on-scripting branch plays. */
export const PARTICLE_FILES = {
  landingDust: 'landingDust.pe', // Constants.PARTICLES_LANDING_DUST
  hitStars: 'eclatRouille.pe', // Constants.PARTICLES_HIT_STARS
  laserSmoke: 'laserSmoke.pe', // Constants.PARTICLES_LASER_SMOKE
  deathDust: 'deathDust.pe', // Constants.DEATH_DUST
  pickUp: 'powerUpPickUp',
  stars: 'stars.pe',
} as const;
export type ParticleName = keyof typeof PARTICLE_FILES;

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
    for (const b of ['gun', 'health', 'jump', 'laserSword', 'shield', 'speed']) this.load.image(`bonus_${b}`, `entities/bonus_${b}.png`);
    this.load.image('bullet', 'entities/bullet.png');
    // LibGDX particle effects (full-on-scripting branch) and their images.
    for (const [key, file] of Object.entries(PARTICLE_FILES)) this.load.text(`pe-file:${key}`, `particles/${file}`);
    for (const img of ['pre_particle.png', 'piou.png', 'star.png', 'star2.png', 'hexa.png', 'flameche.png']) this.load.image(`pe:${img}`, `particles/${img}`);
    // Original music and sounds (release v0.1-alpha), converted to mp3.
    this.load.audio('music-title', 'audio/dashboard.mp3');
    this.load.audio('music-game', 'audio/TechnoTheme.mp3');
    this.load.audio('shot', 'audio/layzer.mp3');
    this.load.audio('punch', 'audio/HeavyPunch2.mp3');
    this.load.audio('step', 'audio/step.mp3');
    for (const n of ['1', '2', '3', 'fight']) this.load.audio(`narrator-${n}`, `audio/narrator_${n}.mp3`);
  }

  async create(): Promise<void> {
    const spriter = new SpriterData(this.cache.text.get('scml'), 'Kubotz');
    const map: TmxMap = await parseTmx(this.cache.text.get('tmx'));
    // The Blender models (robot, bonus chips, tiles); without them the game
    // builds its 3D from the sprites as before.
    await loadModels().catch((e) => console.warn('3D models not loaded, using the sprite-built ones', e));
    this.registry.set('spriter', spriter);
    this.registry.set('map', map);
    const effects: Record<string, EffectDef> = {};
    for (const key of Object.keys(PARTICLE_FILES)) effects[key] = parseEffect(this.cache.text.get(`pe-file:${key}`));
    this.registry.set('effects', effects);

    for (const file of spriter.allFiles()) this.load.image(`kubotz:${file}`, `animations/${file}`);
    for (const tile of map.tileImages.values()) this.load.image(`tile:${tile.source}`, `maps/${tile.source}`);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.makeTextures();
      if (this.sound instanceof Phaser.Sound.WebAudioSoundManager) this.cache.audio.add('boom', explosionBuffer(this.sound.context));
      this.scene.start('Title');
    });
    this.load.start();
  }

  /** Player-coloured helmets and CPU labels, and a small spark texture. */
  private makeTextures(): void {
    for (const color of [P1_COLOR, P2_COLOR, ...CPU_COLORS]) {
      for (const file of HEAD_FILES) this.recolor(`kubotz:${file}`, `head:${hex(color)}:${file}`, color);
      this.recolor('label-CPU', `label-CPU:${hex(color)}`, color, false);
      this.recolor('bullet', `bullet:${hex(color)}`, color, false);
      this.recolor(`kubotz:${SWORD_FILE}`, `sword:${hex(color)}`, color, false);
    }
    this.measureWeapons();
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
    g.destroy();
  }

  /**
   * Finds the sword's blade (hilt to tip) and the gun's muzzle on their images,
   * measured from the forearm pivot they share, for hitboxes and bullets.
   */
  private measureWeapons(): void {
    const pixels = (key: string) => {
      const img = this.textures.get(key).getSourceImage() as HTMLImageElement;
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      return { d: ctx.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height };
    };
    // fore_arm.png pivot (0.0725, 0.111), y up
    const sword = pixels(`kubotz:${SWORD_FILE}`);
    const px = 0.0725 * sword.w;
    const py = 0.111 * sword.h;
    let tip = { x: 0, y: 0, d: -1 };
    let base = { x: 0, y: 0, d: 1e9 };
    for (let y = 0; y < sword.h; y += 2) for (let x = 0; x < sword.w; x += 2) {
      const i = (y * sword.w + x) * 4;
      const [r, g, b, a] = [sword.d[i], sword.d[i + 1], sword.d[i + 2], sword.d[i + 3]];
      const max = Math.max(r, g, b);
      const glowing = a > 150 && max > 180 && (max - Math.min(r, g, b)) / max > 0.4;
      if (!glowing) continue;
      const yy = sword.h - y;
      const d = Math.hypot(x - px, yy - py);
      if (d > tip.d) tip = { x, y: yy, d };
      if (d < base.d && d > 60) base = { x, y: yy, d }; // skip the gem on the hilt
    }
    if (tip.d > 0) { PART_TIPS.sword = { x: tip.x, y: tip.y }; PART_TIPS.swordBase = { x: base.x, y: base.y }; }
    const gun = pixels(`kubotz:${GUN_FILE}`);
    let far = { x: 0, y: 0, d: -1 };
    for (let y = 0; y < gun.h; y += 2) for (let x = 0; x < gun.w; x += 2) {
      if (gun.d[(y * gun.w + x) * 4 + 3] < 150) continue;
      const yy = gun.h - y;
      const d = Math.hypot(x - 0.0725 * gun.w, yy - 0.111 * gun.h);
      if (d > far.d) far = { x, y: yy, d };
    }
    if (far.d > 0) PART_TIPS.gun = { x: far.x, y: far.y };
  }

  /** Copies a texture painted in the hue of `color` (coloured and grey parts; blacks stay). */
  private recolor(src: string, dst: string, color: number, paintGreys = true): void {
    const img = this.textures.get(src).getSourceImage() as HTMLImageElement;
    const canvas = this.textures.createCanvas(dst, img.width, img.height)!;
    const ctx = canvas.getContext();
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    const target = Phaser.Display.Color.IntegerToColor(color);
    const p = data.data;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] === 0) continue;
      const c = Phaser.Display.Color.RGBToHSV(p[i], p[i + 1], p[i + 2]);
      let { s, v } = c;
      if (s >= 0.35) s = Math.max(s, 0.8); // coloured parts take the new hue
      else if (paintGreys && v > 0.3) { s = 0.7; v = Math.min(1, v * 1.15); } // grey shells get painted too
      else continue; // black outlines and shadows stay
      const rgb = Phaser.Display.Color.HSVToRGB(target.h, s, v) as Phaser.Types.Display.ColorObject;
      p[i] = rgb.r; p[i + 1] = rgb.g; p[i + 2] = rgb.b;
    }
    ctx.putImageData(data, 0, 0);
    canvas.refresh();
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
