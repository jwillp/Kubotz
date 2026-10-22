import Phaser from 'phaser';
import { loadRecordedSounds, makeSynthSounds } from '../audio/Sounds';
import { SpriterData } from '../spriter/Spriter';
import { parseTmx, TmxMap } from '../map/TmxMap';
import { EffectDef, parseEffect } from '../fx/ParticleEffect';
import { addNormalMap } from '../fx/NormalMaps';
import { WORN, weather } from '../fx/Surface';
import { TvIdent } from '../fx/TvIdent';
import { shutter } from '../ui/Plate';
import { buildHeadingFont, loadBodyFont, loadHeadingFont, makeTagTexture } from '../ui/Type';
import { GUN_FILE, HEAD_FILES, PART_TIPS, SLOT_COLORS, SWORD_FILE, hex } from '../game/Kubotz';

export const KUBOTZ_SCML = 'animations/kubotz.scml';
export const MAIN_MAP = 'maps/debug-map.tmx';
/** The logo's texture is this many times the original's 298 x 134. */
export const LOGO_RES = 3;

/** Particle effects by name: the files the full-on-scripting branch plays. */
export const PARTICLE_FILES = {
  landingDust: 'landing-dust.pe', // Constants.PARTICLES_LANDING_DUST
  hitStars: 'eclat-rouille.pe', // Constants.PARTICLES_HIT_STARS
  laserSmoke: 'laser-smoke.pe', // Constants.PARTICLES_LASER_SMOKE
  deathDust: 'death-dust.pe', // Constants.DEATH_DUST
  pickUp: 'power-up-pick-up',
  stars: 'stars.pe',
} as const;
export type ParticleName = keyof typeof PARTICLE_FILES;

/** Where each part of the boot ends on the load bar: first files, robot parts and tiles, then the made textures. */
const PHASES = [0.45, 0.75] as const;
/** The longest the boot work holds the page before it lets the load screen draw a frame (ms). */
const PACE_MS = 12;

/** Loads the original assets: Spriter file + its images, TMX map + tiles, HUD. */
export class BootScene extends Phaser.Scene {
  private ident?: TvIdent;
  /** 0 while the first files load, 1 for the robot parts and tiles. */
  private loadPhase = 0;

  constructor() { super('Boot'); }

  preload(): void {
    // Every asset URL carries the assets' version: a cached copy of a file
    // that changed since (the rig with new helmets, a redrawn part) is never reused.
    this.load.on(Phaser.Loader.Events.ADD, (_key: string, _type: string, _loader: Phaser.Loader.LoaderPlugin, file: Phaser.Loader.File) => {
      if (typeof file.url === 'string' && !file.url.startsWith('data:')) file.url += `${file.url.includes('?') ? '&' : '?'}v=${__ASSETS_VERSION__}`;
    });
    this.drawLoadingBar();
    // The original logo (logo_SD.png, gh-pages 2015) redrawn as vectors (tools/logo), rasterised sharp at 3x.
    this.load.svg('logo', 'logo.svg', { width: 298 * LOGO_RES, height: 134 * LOGO_RES });
    this.load.text('scml', KUBOTZ_SCML);
    this.load.text('tmx', MAIN_MAP);
    this.load.image('bg', 'maps/background.jpg');
    this.load.image('hud-badge', 'hud-multi-badge.png');
    this.load.image('hud-bars', 'hud-multi-bars.png');
    this.load.image('hud-timer', 'hud-multi-timer.png');
    loadHeadingFont(this);
    this.load.image('dash-orb', 'dash-orb.png');
    this.load.image('p-star', 'particles/star.png');
    this.load.image('p-star2', 'particles/star2.png');
    this.load.image('p-dust', 'particles/particle001.png');
    this.load.image('p-hexa', 'particles/hexa.png');
    this.load.image('p-flame', 'particles/flameche.png');
    for (const b of ['gun', 'health', 'jump', 'laser-sword', 'shield', 'speed']) this.load.image(`bonus-${b}`, `entities/bonus-${b}.png`);
    this.load.image('bullet', 'entities/bullet.png');
    // LibGDX particle effects (full-on-scripting branch) and their images.
    for (const [key, file] of Object.entries(PARTICLE_FILES)) this.load.text(`pe-file:${key}`, `particles/${file}`);
    for (const img of ['pre-particle.png', 'piou.png', 'star.png', 'star2.png', 'hexa.png', 'flameche.png']) this.load.image(`pe:${img}`, `particles/${img}`);
    // Original music and sounds (audio/Sounds.ts lists every sound).
    loadRecordedSounds(this.load);
  }

  async create(): Promise<void> {
    buildHeadingFont(this);
    const bodyFont = loadBodyFont();
    const spriter = new SpriterData(this.cache.text.get('scml'), 'Kubotz');
    const map: TmxMap = await parseTmx(this.cache.text.get('tmx'));
    this.registry.set('spriter', spriter);
    this.registry.set('map', map);
    const effects: Record<string, EffectDef> = {};
    for (const key of Object.keys(PARTICLE_FILES)) effects[key] = parseEffect(this.cache.text.get(`pe-file:${key}`));
    this.registry.set('effects', effects);

    for (const file of spriter.allFiles()) this.load.image(`kubotz:${file}`, `animations/${file}`);
    for (const tile of map.tileImages.values()) this.load.image(`tile:${tile.source}`, `maps/${tile.source}`);
    this.loadPhase = 1;
    this.load.once(Phaser.Loader.Events.COMPLETE, async () => {
      // The sounds are made in a worker meanwhile.
      const sounds = makeSynthSounds(this, () => this.pace(1));
      await this.makeTextures();
      await sounds;
      this.ident?.setProgress(1);
      // From the load screen's snow to the title, as any screen change.
      void bodyFont.then(() => shutter(this, () => this.scene.start('Title'), null));
    });
    this.load.start();
  }

  private lastPause = 0;

  /**
   * Called between two pieces of boot work: sets the bar to `progress` and,
   * once the work has held the page for more than a few ms, waits for the
   * next frame so the load screen goes on moving.
   */
  private async pace(progress: number): Promise<void> {
    this.ident?.setProgress(progress);
    if (performance.now() - this.lastPause < PACE_MS) return;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    this.lastPause = performance.now();
  }

  /**
   * Player-coloured helmets and CPU labels, and a small spark texture.
   */
  private async makeTextures(): Promise<void> {
    // Steps of the work, for the bar; between items it hands a frame back to the
    // load screen whenever it has run for a while (pace), so the screen never stalls.
    let step = 0;
    const steps = 4;
    const pace = (within = 0) => this.pace(PHASES[1] + (1 - PHASES[1]) * Math.min(1, (step + within) / steps));
    // Normal maps so the lights shade the art: robot parts and bonus chips as
    // rounded metal shells, the arena tiles with a flatter bevel.
    const spriter = this.registry.get('spriter') as SpriterData;
    const map = this.registry.get('map') as TmxMap;
    for (const file of spriter.allFiles()) { addNormalMap(this.textures, `kubotz:${file}`, { bevel: 5, detail: 0.4, strength: 1.5 }); await pace(); }
    for (const tile of map.tileImages.values()) { addNormalMap(this.textures, `tile:${tile.source}`, { bevel: 3, detail: 0.3, strength: 1 }); await pace(); }
    for (const b of ['gun', 'health', 'jump', 'laser-sword', 'shield', 'speed']) { addNormalMap(this.textures, `bonus-${b}`, { bevel: 4, detail: 0.3 }); await pace(); }
    step = 1;
    for (const [c, color] of SLOT_COLORS.entries()) {
      for (const file of HEAD_FILES) {
        this.recolor(`kubotz:${file}`, `head:${hex(color)}:${file}`, color, false);
        addNormalMap(this.textures, `head:${hex(color)}:${file}`, {}, `kubotz:${file}`);
        await pace(c / SLOT_COLORS.length);
      }
      // P1 / P2 / CPU tags in each robot colour, drawn in the heading font.
      for (const who of ['CPU', 'P1', 'P2']) makeTagTexture(this, `label-${who}:${hex(color)}`, who, color);
      this.recolor('bullet', `bullet:${hex(color)}`, color, false);
      this.recolor(`kubotz:${SWORD_FILE}`, `sword:${hex(color)}`, color, false);
      addNormalMap(this.textures, `sword:${hex(color)}`, {}, `kubotz:${SWORD_FILE}`);
      await pace((c + 1) / SLOT_COLORS.length);
    }
    step = 2;
    // Worn copies of every robot part, helmets and blades in every colour
    // (fx/Surface.ts): the look in play, G switches back to the clean art.
    const parts: [string, string][] = spriter.allFiles().map((f) => [`kubotz:${f}`, f]);
    for (const color of SLOT_COLORS) {
      for (const file of HEAD_FILES) parts.push([`head:${hex(color)}:${file}`, file]);
      parts.push([`sword:${hex(color)}`, SWORD_FILE]);
    }
    for (const [i, [key, file]] of parts.entries()) {
      this.textures.addCanvas(WORN + key, weather(this.textures.get(key).getSourceImage() as HTMLImageElement, file));
      addNormalMap(this.textures, WORN + key, key.startsWith('kubotz:') ? { bevel: 5, detail: 0.4, strength: 1.5 } : {});
      await pace((i + 1) / parts.length);
    }
    step = 3;
    this.measureWeapons();
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
    g.destroy();
    // A soft round light for glows (additive).
    const glow = this.textures.createCanvas('glow', 128, 128)!;
    const ctx = glow.getContext();
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    glow.refresh();
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
    // fore-arm.png pivot (0.0725, 0.111), y up
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
      // Only what is actually coloured takes the player's hue (the eyes, stripes
      // and domes): whites, greys and blacks are the helmet's own base.
      if (s >= 0.35) s = Math.max(s, 0.6);
      else if (paintGreys && v > 0.3) { s = 0.7; v = Math.min(1, v * 1.15); }
      else continue;
      const rgb = Phaser.Display.Color.HSVToRGB(target.h, s, v) as Phaser.Types.Display.ColorObject;
      p[i] = rgb.r; p[i + 1] = rgb.g; p[i + 2] = rgb.b;
    }
    ctx.putImageData(data, 0, 0);
    canvas.refresh();
  }

  /**
   * The load screen: the logo tuning in on a snowy old-TV signal over a
   * tuning bar (fx/TvIdent), from the moment the logo is in (the first file
   * in the queue) until the title takes over. The scene does not update
   * while it loads, so the ident runs off the game's step.
   */
  private drawLoadingBar(): void {
    let progress = 0;
    const step = (_t: number, delta: number) => this.ident?.update(delta);
    this.load.once('filecomplete-svg-logo', () => {
      this.ident = new TvIdent(this, 'logo');
      this.ident.setProgress(progress);
      this.game.events.on(Phaser.Core.Events.STEP, step);
    });
    // The bar is the whole boot: the first files, then the robot parts and tiles, then the textures made from them.
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      progress = this.loadPhase === 0 ? PHASES[0] * p : PHASES[0] + (PHASES[1] - PHASES[0]) * p;
      this.ident?.setProgress(progress);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.STEP, step);
      this.ident?.destroy();
      this.ident = undefined;
    });
  }
}
