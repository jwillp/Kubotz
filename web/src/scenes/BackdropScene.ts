import Phaser from 'phaser';
import { GrainPipeline, setPass } from '../fx/Grade';
import { BACKDROPS, backdropOf, paintBolt, seeded, type BackdropTheme } from '../fx/Backdrops';

interface Bokeh { img: Phaser.GameObjects.Image; x: number; y: number; depth: number; phase: number; drift: number; base: number; }
interface Mote { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; depth: number; phase: number; life: number; age: number; }

/**
 * Full-screen background behind the arena, shot like a film plate, in the
 * arena's mood (fx/Backdrops.ts): the Kube's room art softened by a lens blur
 * (made once into its own texture), or a sky and painted parallax layers;
 * out-of-focus lights drifting as bokeh discs on three depths, light shafts
 * or searchlights, embers, dust or drips, lightning, and a haze towards the
 * floor. Everything drifts a little with the camera.
 */
export class BackdropScene extends Phaser.Scene {
  private theme: BackdropTheme = BACKDROPS[0];
  private bg?: Phaser.GameObjects.Image;
  private layers: { img: Phaser.GameObjects.Image; depth: number }[] = [];
  private bokeh: Bokeh[] = [];
  private shafts: Phaser.GameObjects.Image[] = [];
  private motes: Mote[] = [];
  private bolt?: Phaser.GameObjects.Image;
  private flashRect?: Phaser.GameObjects.Rectangle;
  /** Lightning: brightness now (0..1), and when the next strike comes (ms). */
  private flash = 0;
  private nextStrike = 0;
  private rand = seeded(1);

  constructor() { super('Backdrop'); }

  create(data?: { arena?: number }): void {
    const { width, height } = this.scale;
    this.theme = backdropOf(data?.arena);
    const th = this.theme;
    this.rand = seeded(1 + (data?.arena ?? 0) * 97);
    this.makeTextures();
    this.layers = [];
    this.motes = [];
    this.bg = undefined;
    this.flash = 0;
    if (th.room) {
      this.bg = this.add.image(width / 2, height / 2, this.textures.exists('bg-blur') ? 'bg-blur' : 'bg');
      this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height) * 1.15);
      // A dim room, so the lights, lasers and glowing platforms carry the scene.
      this.bg.setTint(0x6878a0, 0x6878a0, 0x26304a, 0x26304a);
    } else {
      this.add.image(width / 2, height / 2, this.skyTexture(th)).setDisplaySize(width, height);
      if (th.lightning) {
        // The bolt sits behind the rock, in the sky.
        this.bolt = this.add.image(width / 2, 0, '__DEFAULT').setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
        this.nextStrike = this.time.now + 1500;
      }
      th.layers.forEach((l, i) => {
        const key = `backdrop-${BACKDROPS.indexOf(th)}-${i}`;
        if (!this.textures.exists(key)) {
          const c = this.textures.createCanvas(key, Math.ceil(width * 1.3), Math.ceil(height * 1.15))!;
          l.paint(c.getContext(), c.width, c.height, seeded(11 + i * 31 + BACKDROPS.indexOf(th) * 1013));
          c.refresh();
        }
        this.layers.push({ img: this.add.image(width / 2, height / 2, key), depth: l.depth });
      });
    }

    // Light shafts from high windows slowly swaying, or searchlights sweeping up from the city.
    const sh = th.shafts;
    this.shafts = !sh ? [] : sh.sweep
      ? [0.2, 0.55, 0.85].map((fx) => this.add.image(width * fx, height * 1.05, 'shaft').setOrigin(0.5, 0).setFlipY(true)
        .setBlendMode(Phaser.BlendModes.ADD).setTint(sh.color).setAlpha(sh.alpha).setDisplaySize(width * 0.08, height * 1.4).setOrigin(0.5, 1))
      : [0.18, 0.46, 0.77].map((fx, i) => this.add.image(width * fx, -height * 0.1, 'shaft')
        .setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setTint(th.room && i === 1 ? 0x7fc8ff : sh.color)
        .setAlpha(sh.alpha).setAngle(18).setDisplaySize(width * 0.16, height * 1.5));

    // Bokeh: soft discs of out-of-focus lights; the far ones small and faint, the near ones big.
    this.bokeh = [];
    // The Kube: mostly the arena's blues, with some teal, violet, magenta, amber and pale lights mixed in.
    const blues = [0x3ab8ff, 0x29abe2, 0x7fdcff, 0x3a6dff];
    const accents = [0x2ee6c8, 0x8a6bff, 0xd46bff, 0xffb46b, 0xff7fae, 0xcfe8ff];
    const n = th.bokeh.count;
    for (let i = 0; i < n; i++) {
      const depth = i < n * 0.47 ? 0.25 : i < n * 0.82 ? 0.5 : 0.85;
      const size = (depth === 0.25 ? 16 : depth === 0.5 ? 35 : 74) * Phaser.Math.FloatBetween(0.7, 1.4);
      const color = th.room
        ? (Math.random() < 0.4 ? Phaser.Utils.Array.GetRandom(accents) : Phaser.Utils.Array.GetRandom(blues))
        : Phaser.Utils.Array.GetRandom(th.bokeh.colors);
      const img = this.add.image(0, 0, 'bokeh').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDisplaySize(size, size);
      this.bokeh.push({
        img, depth, x: Math.random() * width * 1.3 - width * 0.15, y: Math.random() * height * 1.2 - height * 0.1,
        phase: Math.random() * Math.PI * 2, drift: Phaser.Math.FloatBetween(4, 12) * (Math.random() < 0.5 ? -1 : 1),
        base: (depth === 0.85 ? 0.12 : depth === 0.5 ? 0.2 : 0.28) * th.bokeh.alpha,
      });
    }

    // Embers rising from the furnaces, dust in the air, or drips falling from the rock.
    const count = th.particles === 'embers' ? 60 : th.particles === 'drips' ? 26 : th.particles === 'motes' ? 30 : 0;
    for (let i = 0; i < count; i++) {
      const img = this.add.image(0, 0, th.particles === 'drips' ? 'drip' : 'bokeh').setBlendMode(Phaser.BlendModes.ADD);
      const m: Mote = { img, x: 0, y: 0, vx: 0, vy: 0, depth: 0.2 + Math.random() * 0.8, phase: Math.random() * 6.3, life: 1, age: 0 };
      this.spawnMote(m, true);
      this.motes.push(m);
    }

    // Haze settling towards the floor.
    this.add.image(width / 2, height, this.hazeTexture(th)).setOrigin(0.5, 1).setDisplaySize(width, height * 0.6).setAlpha(0.55);
    if (th.lightning) this.flashRect = this.add.rectangle(width / 2, height / 2, width, height, 0xcfe8ff, 0).setBlendMode(Phaser.BlendModes.ADD);

    // The match's film grain and scanlines, on or off with its screen effects (F).
    setPass(this, this.cameras.main, GrainPipeline, this.registry.get('screenFx') === true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.setGameAmbient(0));
  }

  update(time: number, delta: number): void {
    const game = this.scene.get('Game');
    const { width, height } = this.scale;
    const t = time / 1000;
    const dt = delta / 1000;
    // Map is about 3300 x 2400 px; drift the backdrop a little with the camera.
    // Without a match (behind the title), a slow idle sway instead.
    const cam = game.sys.isActive() ? game.cameras.main : undefined;
    const px = cam ? cam.midPoint.x / 3328 - 0.5 : Math.sin(t * 0.07) * 0.25;
    const py = cam ? cam.midPoint.y / 2432 - 0.5 : Math.sin(t * 0.05 + 1) * 0.15;
    this.bg?.setPosition(width / 2 - px * 80, height / 2 - py * 50);
    for (const l of this.layers) l.img.setPosition(width / 2 - px * 300 * l.depth, height / 2 - py * 160 * l.depth);
    const sweep = this.theme.shafts?.sweep;
    const shaftAlpha = this.theme.shafts?.alpha ?? 0;
    this.shafts.forEach((s, i) => sweep
      ? s.setAngle(Math.sin(t * 0.21 + i * 2.1) * 28).setAlpha(shaftAlpha * (0.8 + 0.2 * Math.sin(t * 0.5 + i)))
      : s.setAngle(18 + Math.sin(t * 0.17 + i * 2) * 4).setAlpha(shaftAlpha * (0.86 + 0.36 * Math.sin(t * 0.3 + i))));
    for (const b of this.bokeh) {
      b.x += b.drift * dt;
      if (b.x < -width * 0.2) b.x += width * 1.4;
      if (b.x > width * 1.2) b.x -= width * 1.4;
      // Nearer discs slide further with the camera (parallax), and all twinkle slowly.
      const x = b.x - px * 220 * b.depth;
      const y = b.y - py * 140 * b.depth + Math.sin(t * 0.4 + b.phase) * 6;
      b.img.setPosition(x, y).setAlpha(b.base * (0.6 + 0.4 * Math.sin(t * 0.8 + b.phase)));
    }
    for (const m of this.motes) {
      m.age += dt;
      m.x += (m.vx + Math.sin(t * 1.3 + m.phase) * (this.theme.particles === 'embers' ? 14 : 4)) * dt;
      m.y += m.vy * dt;
      const f = m.age / m.life;
      if (f >= 1 || m.y < -40 || m.y > height + 40) { this.spawnMote(m, false); continue; }
      const fade = Math.min(1, f * 6) * (1 - f);
      const a = this.theme.particles === 'embers' ? 0.9 * fade * (0.6 + 0.4 * Math.sin(t * 9 + m.phase))
        : this.theme.particles === 'drips' ? 0.35 * fade : 0.25 * fade;
      m.img.setPosition(m.x - px * 260 * m.depth, m.y - py * 150 * m.depth).setAlpha(a);
    }
    if (this.theme.lightning) this.updateLightning(time, dt);
  }

  private spawnMote(m: Mote, anywhere: boolean): void {
    const { width, height } = this.scale;
    const kind = this.theme.particles;
    m.age = 0;
    m.x = Math.random() * width * 1.3 - width * 0.15;
    m.depth = 0.2 + Math.random() * 0.8;
    const s = m.depth;
    if (kind === 'embers') {
      m.y = anywhere ? Math.random() * height : height + 20;
      m.vx = Phaser.Math.FloatBetween(-10, 10);
      m.vy = -Phaser.Math.FloatBetween(30, 80) * (0.5 + s);
      m.life = Phaser.Math.FloatBetween(4, 9);
      m.img.setTint(Phaser.Utils.Array.GetRandom([0xff8a2a, 0xffb050, 0xff5a1a, 0xffd080])).setDisplaySize(4 + s * 6, 4 + s * 6);
    } else if (kind === 'drips') {
      m.y = anywhere ? Math.random() * height : Phaser.Math.FloatBetween(-20, height * 0.25);
      m.vx = 0;
      m.vy = Phaser.Math.FloatBetween(260, 420) * (0.5 + s);
      m.life = Phaser.Math.FloatBetween(1.2, 3);
      m.img.setTint(0xbff0ff).setDisplaySize(1.5 + s * 1.5, 10 + s * 14);
    } else {
      m.y = Math.random() * height;
      m.vx = Phaser.Math.FloatBetween(-8, 8);
      m.vy = Phaser.Math.FloatBetween(-6, 6);
      m.life = Phaser.Math.FloatBetween(6, 12);
      m.img.setTint(0xe8d8ff).setDisplaySize(3 + s * 5, 3 + s * 5);
    }
    if (anywhere) m.age = Math.random() * m.life * 0.8;
  }

  /** Now and then a bolt in the sky: the screen flickers and the arena lights up with it. */
  private updateLightning(time: number, dt: number): void {
    const { width, height } = this.scale;
    if (time >= this.nextStrike) {
      this.nextStrike = time + Phaser.Math.Between(3500, 9000);
      const key = 'bolt';
      if (this.textures.exists(key)) this.textures.remove(key);
      const c = this.textures.createCanvas(key, Math.ceil(width * 0.6), Math.ceil(height * 0.7))!;
      paintBolt(c.getContext(), c.width, c.height, this.rand);
      c.refresh();
      this.bolt?.setTexture(key).setX(width * (0.2 + this.rand() * 0.6)).setVisible(true);
      this.flash = 1;
    }
    if (this.flash <= 0) return;
    // A double flicker as it fades.
    this.flash = Math.max(0, this.flash - dt * 2.6);
    const f = this.flash * (this.flash > 0.55 && this.flash < 0.7 ? 0.3 : 1);
    this.bolt?.setAlpha(f).setVisible(f > 0.02);
    this.flashRect?.setFillStyle(0xcfe8ff, f * 0.22);
    this.setGameAmbient(f);
  }

  /** Lifts the match's ambient light towards the lightning's cold white. */
  private setGameAmbient(f: number): void {
    const game = this.scene.get('Game');
    if (!game?.sys.isActive() || !game.lights?.active) return;
    const a = Phaser.Display.Color.IntegerToColor(this.theme.ambient);
    const mix = (c: number, to: number) => Math.round(c + (to - c) * f * 0.7);
    game.lights.setAmbientColor(Phaser.Display.Color.GetColor(mix(a.red, 0xe0), mix(a.green, 0xf0), mix(a.blue, 0xff)));
  }

  private skyTexture(th: BackdropTheme): string {
    const key = `sky-${BACKDROPS.indexOf(th)}`;
    if (!this.textures.exists(key)) {
      const c = this.textures.createCanvas(key, 4, 256)!;
      const ctx = c.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, `#${th.sky[0].toString(16).padStart(6, '0')}`);
      g.addColorStop(0.6, `#${th.sky[1].toString(16).padStart(6, '0')}`);
      g.addColorStop(1, `#${th.sky[2].toString(16).padStart(6, '0')}`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 256);
      c.refresh();
    }
    return key;
  }

  private hazeTexture(th: BackdropTheme): string {
    if (th.room) return 'haze';
    const key = `haze-${BACKDROPS.indexOf(th)}`;
    if (!this.textures.exists(key)) {
      const c = this.textures.createCanvas(key, 4, 128)!;
      const ctx = c.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, th.haze.replace(/[\d.]+\)$/, '0)'));
      g.addColorStop(1, th.haze);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 128);
      c.refresh();
    }
    return key;
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
    if (!tex.exists('drip')) {
      const c = tex.createCanvas('drip', 4, 32)!;
      const ctx = c.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, 32);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 32);
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
