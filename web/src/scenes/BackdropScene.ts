import Phaser from 'phaser';

interface Bokeh { img: Phaser.GameObjects.Image; x: number; y: number; depth: number; phase: number; drift: number; base: number; }

/**
 * Full-screen background behind the arena, shot like a film plate: the room
 * art softened by a lens blur (made once into its own texture), out-of-focus
 * lights drifting as bokeh discs on three depths, slow light shafts and a
 * haze towards the floor. Everything drifts a little with the camera.
 */
export class BackdropScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Image;
  private bokeh: Bokeh[] = [];
  private shafts: Phaser.GameObjects.Image[] = [];

  constructor() { super('Backdrop'); }

  create(): void {
    const { width, height } = this.scale;
    this.makeTextures();
    this.bg = this.add.image(width / 2, height / 2, this.textures.exists('bg-blur') ? 'bg-blur' : 'bg');
    this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height) * 1.15);
    // A dim room, so the lights, lasers and glowing platforms carry the scene.
    this.bg.setTint(0x6878a0, 0x6878a0, 0x26304a, 0x26304a);

    // Light shafts from high windows, slowly swaying.
    this.shafts = [0.18, 0.46, 0.77].map((fx, i) => this.add.image(width * fx, -height * 0.1, 'shaft')
      .setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setTint(i === 1 ? 0x7fc8ff : 0x4f8fd8)
      .setAlpha(0.07).setAngle(18).setDisplaySize(width * 0.16, height * 1.5));

    // Bokeh: soft discs of out-of-focus lights; the far ones small and faint, the near ones big.
    this.bokeh = [];
    // Mostly the arena's blues, with some teal, violet, magenta, amber and pale lights mixed in.
    const blues = [0x3ab8ff, 0x29abe2, 0x7fdcff, 0x3a6dff];
    const accents = [0x2ee6c8, 0x8a6bff, 0xd46bff, 0xffb46b, 0xff7fae, 0xcfe8ff];
    for (let i = 0; i < 34; i++) {
      const depth = i < 16 ? 0.25 : i < 28 ? 0.5 : 0.85;
      const size = (depth === 0.25 ? 16 : depth === 0.5 ? 35 : 74) * Phaser.Math.FloatBetween(0.7, 1.4);
      const color = Math.random() < 0.4 ? Phaser.Utils.Array.GetRandom(accents) : Phaser.Utils.Array.GetRandom(blues);
      const img = this.add.image(0, 0, 'bokeh').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDisplaySize(size, size);
      this.bokeh.push({
        img, depth, x: Math.random() * width * 1.3 - width * 0.15, y: Math.random() * height * 1.2 - height * 0.1,
        phase: Math.random() * Math.PI * 2, drift: Phaser.Math.FloatBetween(4, 12) * (Math.random() < 0.5 ? -1 : 1),
        base: depth === 0.85 ? 0.12 : depth === 0.5 ? 0.2 : 0.28,
      });
    }

    // Haze settling towards the floor.
    this.add.image(width / 2, height, 'haze').setOrigin(0.5, 1).setDisplaySize(width, height * 0.6).setAlpha(0.55);
  }

  update(time: number, delta: number): void {
    const cam = this.scene.get('Game').cameras.main;
    const { width, height } = this.scale;
    // Map is about 3300 x 2400 px; drift the backdrop a little with the camera.
    const px = cam.midPoint.x / 3328 - 0.5;
    const py = cam.midPoint.y / 2432 - 0.5;
    this.bg.setPosition(width / 2 - px * 80, height / 2 - py * 50);
    const t = time / 1000;
    this.shafts.forEach((s, i) => s.setAngle(18 + Math.sin(t * 0.17 + i * 2) * 4).setAlpha(0.06 + 0.025 * Math.sin(t * 0.3 + i)));
    for (const b of this.bokeh) {
      b.x += (b.drift * delta) / 1000;
      if (b.x < -width * 0.2) b.x += width * 1.4;
      if (b.x > width * 1.2) b.x -= width * 1.4;
      // Nearer discs slide further with the camera (parallax), and all twinkle slowly.
      const x = b.x - px * 220 * b.depth;
      const y = b.y - py * 140 * b.depth + Math.sin(t * 0.4 + b.phase) * 6;
      b.img.setPosition(x, y).setAlpha(b.base * (0.6 + 0.4 * Math.sin(t * 0.8 + b.phase)));
    }
  }

  /** The blurred backdrop (a lens blur, once), a bokeh disc, a light shaft and the floor haze. */
  private makeTextures(): void {
    const tex = this.textures;
    if (!tex.exists('bg-blur')) {
      const src = tex.get('bg').getSourceImage() as HTMLImageElement;
      const w = src.width;
      const h = src.height;
      const canvas = tex.createCanvas('bg-blur', w, h);
      const ctx = canvas?.getContext();
      if (ctx && 'filter' in ctx) {
        // Drawn a little larger so the blur doesn't darken the edges.
        ctx.filter = `blur(${Math.round(Math.max(w, h) / 260)}px)`;
        ctx.drawImage(src, -w * 0.02, -h * 0.02, w * 1.04, h * 1.04);
        canvas!.refresh();
      } else if (canvas) {
        tex.remove('bg-blur');
      }
    }
    if (!tex.exists('bokeh')) {
      const c = tex.createCanvas('bokeh', 128, 128)!;
      const ctx = c.getContext();
      // A lens's out-of-focus highlight: an even disc with a faint rim and a wide, soft edge.
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 63);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.62)');
      g.addColorStop(0.72, 'rgba(255,255,255,0.68)');
      g.addColorStop(0.86, 'rgba(255,255,255,0.32)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      c.refresh();
    }
    if (!tex.exists('shaft')) {
      const c = tex.createCanvas('shaft', 64, 256)!;
      const ctx = c.getContext();
      const across = ctx.createLinearGradient(0, 0, 64, 0);
      across.addColorStop(0, 'rgba(255,255,255,0)');
      across.addColorStop(0.5, 'rgba(255,255,255,1)');
      across.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = across;
      ctx.fillRect(0, 0, 64, 256);
      // Fading out further down.
      ctx.globalCompositeOperation = 'destination-in';
      const down = ctx.createLinearGradient(0, 0, 0, 256);
      down.addColorStop(0, 'rgba(0,0,0,1)');
      down.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = down;
      ctx.fillRect(0, 0, 64, 256);
      c.refresh();
    }
    if (!tex.exists('haze')) {
      const c = tex.createCanvas('haze', 4, 128)!;
      const ctx = c.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, 'rgba(10,20,40,0)');
      g.addColorStop(1, 'rgba(10,20,40,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 128);
      c.refresh();
    }
  }
}
