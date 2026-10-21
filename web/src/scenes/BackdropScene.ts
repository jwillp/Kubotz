import Phaser from 'phaser';
import { GrainPipeline, setPass } from '../fx/Grade';
import { BACKDROPS, ROOM_H, ROOM_W, backdropOf, paintBolt, seeded, type BackdropTheme, type Room } from '../fx/Backdrops';

interface Bokeh { img: Phaser.GameObjects.Image; x: number; y: number; depth: number; phase: number; drift: number; base: number; }
interface Pulse { img: Phaser.GameObjects.Image; axis: 'x' | 'y'; line: number; pos: number; speed: number; len: number; }
interface Mote { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; depth: number; phase: number; life: number; age: number; }

/**
 * Full-screen background behind the arena, shot like a film plate, in the
 * arena's palette (fx/Backdrops.ts): the room art softened by a lens blur
 * (made once into its own texture), out-of-focus lights drifting as bokeh
 * discs on three depths, slow light shafts, embers or motes, flashes deep in
 * the blur, and a haze towards the floor. Everything drifts a little with the
 * camera.
 */
export class BackdropScene extends Phaser.Scene {
  private theme: BackdropTheme = BACKDROPS[0];
  private bg!: Phaser.GameObjects.Image;
  /** The silhouettes of a painted room, a little nearer than its wall. */
  private front?: Phaser.GameObjects.Image;
  private room?: Room;
  private pulses: Pulse[] = [];
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
    const th = this.theme = backdropOf(data?.arena);
    this.rand = seeded(1 + (data?.arena ?? 0) * 97);
    this.makeTextures();
    this.motes = [];
    this.bolt = this.flashRect = undefined;
    this.flash = 0;
    // The Kube's own picture, or a room painted in its language (fx/Backdrops.ts).
    this.front = undefined;
    this.room = undefined;
    this.pulses = [];
    const n = BACKDROPS.indexOf(th);
    if (th.paint) {
      if (!this.textures.exists(`room-${n}`)) {
        const wall = document.createElement('canvas');
        const front = document.createElement('canvas');
        wall.width = front.width = ROOM_W; wall.height = front.height = ROOM_H;
        const room = th.paint(wall.getContext('2d')!, front.getContext('2d')!, ROOM_W, ROOM_H, seeded(31 + n * 1013));
        this.registry.set(`room-${n}`, room);
        // Softened by the same lens blur as the picture, the silhouettes a little less (nearer).
        for (const [key, src, blur] of [[`room-${n}`, wall, 7], [`room-${n}-front`, front, 5]] as const) {
          const c = this.textures.createCanvas(key, ROOM_W, ROOM_H)!;
          const ctx = c.getContext();
          ctx.filter = `blur(${blur}px)`;
          ctx.drawImage(src, -ROOM_W * 0.02, -ROOM_H * 0.02, ROOM_W * 1.04, ROOM_H * 1.04);
          c.refresh();
        }
      }
      this.room = this.registry.get(`room-${n}`) as Room;
    }
    const key = th.paint ? `room-${n}` : this.textures.exists('bg-blur') ? 'bg-blur' : 'bg';
    this.bg = this.add.image(width / 2, height / 2, key);
    this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height) * 1.15);
    // A dim room, so the lights, lasers and glowing platforms carry the scene.
    this.bg.setTint(th.room[0], th.room[0], th.room[1], th.room[1]);
    if (th.paint) {
      // Light running along the panel seams.
      const room = this.room!;
      for (let i = 0; i < 14; i++) {
        const axis = i % 3 === 0 ? 'y' : 'x';
        const img = this.add.image(0, 0, 'pulse').setBlendMode(Phaser.BlendModes.ADD).setTint(th.rimLine).setAlpha(0.5);
        this.pulses.push(this.newPulse({ img, axis, line: 0, pos: 0, speed: 0, len: 0 }, room, true));
      }
      this.front = this.add.image(width / 2, height / 2, `room-${n}-front`).setScale(this.bg.scaleX);
      this.front.setTint(th.room[0], th.room[0], th.room[1], th.room[1]);
    }
    if (th.lightning) {
      // Flashes far back, behind the shafts and bokeh.
      this.bolt = this.add.image(width / 2, 0, '__DEFAULT').setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.nextStrike = this.time.now + 1500;
    }

    // Light shafts from high windows, slowly swaying.
    this.shafts = [0.18, 0.46, 0.77].map((fx, i) => this.add.image(width * fx, -height * 0.1, 'shaft')
      .setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setTint(th.shafts[i === 1 ? 1 : 0])
      .setAlpha(0.07).setAngle(18).setDisplaySize(width * 0.16, height * 1.5));

    // Bokeh: soft discs of out-of-focus lights; the far ones small and faint, the near ones big.
    // Mostly the palette's main colours, with its accents mixed in.
    this.bokeh = [];
    for (let i = 0; i < 34; i++) {
      const depth = i < 16 ? 0.25 : i < 28 ? 0.5 : 0.85;
      const size = (depth === 0.25 ? 16 : depth === 0.5 ? 35 : 74) * Phaser.Math.FloatBetween(0.7, 1.4);
      const color = Phaser.Utils.Array.GetRandom(Math.random() < 0.4 ? th.bokeh.accents : th.bokeh.main);
      const img = this.add.image(0, 0, 'bokeh').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDisplaySize(size, size);
      this.bokeh.push({
        img, depth, x: Math.random() * width * 1.3 - width * 0.15, y: Math.random() * height * 1.2 - height * 0.1,
        phase: Math.random() * Math.PI * 2, drift: Phaser.Math.FloatBetween(4, 12) * (Math.random() < 0.5 ? -1 : 1),
        base: depth === 0.85 ? 0.12 : depth === 0.5 ? 0.2 : 0.28,
      });
    }

    // Embers drifting up, or small motes of light hanging in the air.
    const count = th.particles === 'embers' ? 60 : th.particles === 'motes' ? 36 : 0;
    for (let i = 0; i < count; i++) {
      const img = this.add.image(0, 0, 'bokeh').setBlendMode(Phaser.BlendModes.ADD);
      const m: Mote = { img, x: 0, y: 0, vx: 0, vy: 0, depth: 0.2 + Math.random() * 0.8, phase: Math.random() * 6.3, life: 1, age: 0 };
      this.spawnMote(m, true);
      this.motes.push(m);
    }

    // Haze settling towards the floor.
    this.add.image(width / 2, height, this.hazeTexture(th)).setOrigin(0.5, 1).setDisplaySize(width, height * 0.6).setAlpha(0.55);
    if (th.lightning) this.flashRect = this.add.rectangle(width / 2, height / 2, width, height, th.rimLine, 0).setBlendMode(Phaser.BlendModes.ADD);

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
    this.bg.setPosition(width / 2 - px * 80, height / 2 - py * 50);
    this.front?.setPosition(width / 2 - px * 130, height / 2 - py * 80);
    if (this.room) this.updatePulses(dt);
    this.shafts.forEach((s, i) => s.setAngle(18 + Math.sin(t * 0.17 + i * 2) * 4).setAlpha(0.06 + 0.025 * Math.sin(t * 0.3 + i)));
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
      const a = this.theme.particles === 'embers' ? 0.9 * fade * (0.6 + 0.4 * Math.sin(t * 9 + m.phase)) : 0.4 * fade;
      m.img.setPosition(m.x - px * 260 * m.depth, m.y - py * 150 * m.depth).setAlpha(a);
    }
    if (this.theme.lightning) this.updateLightning(time, dt);
  }

  /** A pulse on a random seam: the Foundry's run up and across, the Pit's fall, Sky Deck's rise. */
  private newPulse(p: Pulse, room: Room, anywhere: boolean): Pulse {
    const down = this.theme.particles === 'motes' && this.theme.lightning;
    const dir = Math.random() < 0.5 ? -1 : 1;
    p.len = 90 + Math.random() * 160;
    p.speed = (120 + Math.random() * 180);
    if (p.axis === 'x') {
      p.line = Phaser.Utils.Array.GetRandom(room.rows);
      p.speed *= dir;
      p.pos = anywhere ? Math.random() * ROOM_W : dir > 0 ? -p.len : ROOM_W + p.len;
    } else {
      p.line = Phaser.Utils.Array.GetRandom(room.cols);
      p.speed *= down ? 1 : -1;
      p.pos = anywhere ? Math.random() * ROOM_H : down ? -p.len : ROOM_H + p.len;
    }
    p.img.setAngle(p.axis === 'x' ? 0 : 90).setDisplaySize(p.len, 10);
    return p;
  }

  private updatePulses(dt: number): void {
    const room = this.room!;
    const s = this.bg.scaleX;
    for (const p of this.pulses) {
      p.pos += p.speed * dt;
      const span = p.axis === 'x' ? ROOM_W : ROOM_H;
      if (p.pos < -p.len - 10 || p.pos > span + p.len + 10) this.newPulse(p, room, false);
      // Picture pixels to screen, following the wall.
      const x = p.axis === 'x' ? p.pos : p.line;
      const y = p.axis === 'x' ? p.line : p.pos;
      p.img.setPosition(this.bg.x + (x - ROOM_W / 2) * s, this.bg.y + (y - ROOM_H / 2) * s).setScale(p.len * s / 128, 10 * s / 16);
    }
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
    } else {
      m.y = Math.random() * height;
      m.vx = Phaser.Math.FloatBetween(-8, 8);
      m.vy = Phaser.Math.FloatBetween(-6, 6);
      m.life = Phaser.Math.FloatBetween(6, 12);
      m.img.setTint(Phaser.Utils.Array.GetRandom(this.theme.bokeh.main)).setDisplaySize(3 + s * 5, 3 + s * 5);
    }
    if (anywhere) m.age = Math.random() * m.life * 0.8;
  }

  /** Now and then a flash far back in the blur: the screen flickers and the arena lights up with it. */
  private updateLightning(time: number, dt: number): void {
    const { width, height } = this.scale;
    if (time >= this.nextStrike) {
      this.nextStrike = time + Phaser.Math.Between(3500, 9000);
      const key = 'bolt';
      if (this.textures.exists(key)) this.textures.remove(key);
      const c = this.textures.createCanvas(key, Math.ceil(width * 0.6), Math.ceil(height * 0.7))!;
      paintBolt(c.getContext(), c.width, c.height, this.rand, `#${this.theme.rimLine.toString(16).padStart(6, '0')}`);
      c.refresh();
      this.bolt?.setTexture(key).setX(width * (0.2 + this.rand() * 0.6)).setVisible(true);
      this.flash = 1;
    }
    if (this.flash <= 0) return;
    // A double flicker as it fades.
    this.flash = Math.max(0, this.flash - dt * 2.6);
    const f = this.flash * (this.flash > 0.55 && this.flash < 0.7 ? 0.3 : 1);
    this.bolt?.setAlpha(f).setVisible(f > 0.02);
    this.flashRect?.setFillStyle(this.theme.rimLine, f * 0.18);
    this.setGameAmbient(f);
  }

  /** Lifts the match's ambient light towards the lightning's cold white. */
  private setGameAmbient(f: number): void {
    const game = this.scene.get('Game');
    if (!game?.sys.isActive() || !game.lights?.active) return;
    const a = Phaser.Display.Color.IntegerToColor(this.theme.ambient);
    const to = Phaser.Display.Color.IntegerToColor(this.theme.rimLine);
    const mix = (c: number, t: number) => Math.round(c + (t - c) * f * 0.7);
    game.lights.setAmbientColor(Phaser.Display.Color.GetColor(mix(a.red, to.red), mix(a.green, to.green), mix(a.blue, to.blue)));
  }

  private hazeTexture(th: BackdropTheme): string {
    if (th === BACKDROPS[0]) return 'haze';
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
    if (!tex.exists('pulse')) {
      // A soft bar of light, bright in the middle, for the seam pulses.
      const c = tex.createCanvas('pulse', 128, 16)!;
      const ctx = c.getContext();
      const along = ctx.createLinearGradient(0, 0, 128, 0);
      along.addColorStop(0, 'rgba(255,255,255,0)');
      along.addColorStop(0.5, 'rgba(255,255,255,1)');
      along.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = along;
      ctx.fillRect(0, 0, 128, 16);
      ctx.globalCompositeOperation = 'destination-in';
      const across = ctx.createLinearGradient(0, 0, 0, 16);
      across.addColorStop(0, 'rgba(0,0,0,0)');
      across.addColorStop(0.5, 'rgba(0,0,0,1)');
      across.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = across;
      ctx.fillRect(0, 0, 128, 16);
      c.refresh();
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
