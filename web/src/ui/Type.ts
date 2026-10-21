import Phaser from 'phaser';
import '@fontsource/exo-2/500.css';
import '@fontsource/exo-2/700.css';
import '@fontsource/exo-2/800.css';

/**
 * The game's type pairing: Okuba Cloud (the bitmap font of the Kubotz logo,
 * a Hiero/BMFont file from the original game) for titles and headings, and
 * Exo 2 for everything people read (menus, values, stats, help).
 */
export const HEADING_FONT = 'okuba';
export const BODY_FAMILY = '"Exo 2", "Segoe UI", Arial, sans-serif';

/** The original font files, kept as they are: a text .fnt and its four 512x512 pages. */
const FNT = 'fonts/okubacloud.fnt';
const PAGES = ['okubacloud1.png', 'okubacloud2.png', 'okubacloud3.png', 'okubacloud4.png'];
const PAGE_SIZE = 512;

/** Glow colour of the logo's neon outline. */
export const NEON = 0x29abe2;

/** Loads the Okuba Cloud files; call from a preload. */
export function loadHeadingFont(scene: Phaser.Scene): void {
  scene.load.text('okuba-fnt', FNT);
  PAGES.forEach((p, i) => scene.load.image(`okuba-page${i}`, `fonts/${p}`));
}

/** Waits until Exo 2 is ready, so canvas texts don't first render in the fallback. */
export async function loadBodyFont(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all(['500', '700', '800'].map((w) => document.fonts.load(`${w} 20px "Exo 2"`).catch(() => undefined)));
}

/**
 * Builds the heading bitmap font once its files are loaded. Phaser's BMFont
 * parser reads XML with a single page, so the four pages go side by side on one
 * 2x2 canvas and the text .fnt becomes XML with each glyph moved onto its page.
 */
export function buildHeadingFont(scene: Phaser.Scene): void {
  const atlas = scene.textures.createCanvas(HEADING_FONT, PAGE_SIZE * 2, PAGE_SIZE * 2)!;
  const ctx = atlas.getContext();
  PAGES.forEach((_, i) => {
    ctx.drawImage(scene.textures.get(`okuba-page${i}`).getSourceImage() as HTMLImageElement,
      (i % 2) * PAGE_SIZE, Math.floor(i / 2) * PAGE_SIZE);
  });
  atlas.refresh();

  const attrs = (line: string) => Object.fromEntries([...line.matchAll(/(\w+)=("[^"]*"|\S+)/g)].map((m) => [m[1], m[2].replace(/"/g, '')]));
  const doc = document.implementation.createDocument(null, 'font');
  for (const line of (scene.cache.text.get('okuba-fnt') as string).split(/\r?\n/)) {
    const tag = line.split(' ')[0];
    if (!['info', 'common', 'char'].includes(tag)) continue;
    const a = attrs(line);
    if (tag === 'char') {
      const page = parseInt(a.page, 10);
      a.x = String(parseInt(a.x, 10) + (page % 2) * PAGE_SIZE);
      a.y = String(parseInt(a.y, 10) + Math.floor(page / 2) * PAGE_SIZE);
      a.page = '0';
    }
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(a)) el.setAttribute(k, v);
    doc.documentElement.appendChild(el);
  }
  const texture = scene.textures.get(HEADING_FONT);
  // The fifth argument (in Phaser's source, not its typings) adds a frame per glyph.
  const parse = Phaser.GameObjects.BitmapText.ParseXMLBitmapFont as unknown as
    (xml: XMLDocument, frame: Phaser.Textures.Frame, xs: number, ys: number, texture: Phaser.Textures.Texture) => Phaser.Types.GameObjects.BitmapText.BitmapFontData;
  const data = parse(doc, texture.get(), 0, 0, texture);
  scene.cache.bitmapFont.add(HEADING_FONT, { data, texture: HEADING_FONT, frame: null });
}

/** A glyph as Phaser's BMFont parser stores it (its typings leave out xAdvance). */
type Glyph = Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData & { xAdvance: number };

export interface HeadingOptions {
  /** Fill colour of the letters. */
  tint?: number;
  /** Neon glow around the letters, like the logo; null for none. */
  glow?: number | null;
}

/** Lays out `text` in the heading font at `size` px: glyphs with their place on a line starting at (0, 0). */
function layout(scene: Phaser.Scene, text: string, size: number) {
  const font = scene.cache.bitmapFont.get(HEADING_FONT).data as Phaser.Types.GameObjects.BitmapText.BitmapFontData;
  const scale = size / font.size;
  const glyphs: { g: Glyph; x: number; y: number }[] = [];
  let pen = 0;
  let right = 0;
  for (const c of text) {
    const g = font.chars[c.charCodeAt(0)] as Glyph | undefined;
    if (!g) continue;
    glyphs.push({ g, x: pen + g.xOffset * scale, y: g.yOffset * scale });
    right = pen + (g.xOffset + g.width) * scale;
    pen += g.xAdvance * scale;
  }
  // The capitals start 10px below the line top and are 120px tall (at size 150).
  return { glyphs, scale, width: Math.max(1, right), top: 10 * scale, height: 120 * scale };
}

/** Draws laid-out glyphs (white, as in the font) onto `ctx`, shifted by (dx, dy). */
function drawGlyphs(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>, dx: number, dy: number): void {
  const src = scene.textures.get(HEADING_FONT).getSourceImage() as HTMLCanvasElement;
  for (const { g, x, y } of l.glyphs) {
    ctx.drawImage(src, g.x, g.y, g.width, g.height, dx + x, dy + y, g.width * l.scale, g.height * l.scale);
  }
}

/**
 * A title or heading in Okuba Cloud. The letters and their neon glow are
 * drawn once onto a canvas texture (again only when the text or glow
 * changes), so a heading costs no more than an image to render.
 */
export class HeadingText extends Phaser.GameObjects.Image {
  private static count = 0;
  private readonly key = `heading:${HeadingText.count++}`;
  private content = '';

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, readonly size: number,
    private tint_ = 0xffffff, private glow: number | null = NEON) {
    super(scene, x, y, '__DEFAULT');
    this.setOrigin(0.5);
    this.redraw(text);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.textures.remove(this.key));
  }

  get text(): string { return this.content; }

  setText(text: string): this {
    if (headingText(text) !== this.content) this.redraw(text);
    return this;
  }

  /** The glow colour, or null for none. */
  setGlow(glow: number | null): this {
    if (glow !== this.glow) { this.glow = glow; this.redraw(this.content); }
    return this;
  }

  /** The letters' colour. */
  setFill(tint: number): this {
    if (tint !== this.tint_) { this.tint_ = tint; this.redraw(this.content); }
    return this;
  }

  private redraw(text: string): void {
    this.content = headingText(text);
    const l = layout(this.scene, this.content, this.size);
    const blur = Math.max(4, this.size * 0.16);
    const pad = Math.ceil(blur * 1.6);
    const w = Math.ceil(l.width + pad * 2);
    const h = Math.ceil(l.height + pad * 2);
    const textures = this.scene.textures;
    const tex = (textures.exists(this.key) ? textures.get(this.key) : textures.createCanvas(this.key, w, h)) as Phaser.Textures.CanvasTexture;
    tex.setSize(w, h);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, w, h);

    // The letters in their fill colour...
    const letters = document.createElement('canvas');
    letters.width = w; letters.height = h;
    const lc = letters.getContext('2d')!;
    drawGlyphs(this.scene, lc, l, pad, pad - l.top);
    lc.globalCompositeOperation = 'source-in';
    lc.fillStyle = Phaser.Display.Color.IntegerToColor(this.tint_).rgba;
    lc.fillRect(0, 0, w, h);

    // ...over a glow: their shadow, blurred, in the glow colour (twice, for a brighter halo).
    if (this.glow !== null && this.content) {
      ctx.save();
      ctx.shadowColor = Phaser.Display.Color.IntegerToColor(this.glow).rgba;
      ctx.shadowBlur = blur;
      ctx.drawImage(letters, 0, 0);
      ctx.shadowBlur = blur * 0.45;
      ctx.drawImage(letters, 0, 0);
      ctx.restore();
    }
    ctx.drawImage(letters, 0, 0);
    tex.refresh();
    this.setTexture(this.key);
  }
}

/** A heading centred on (x, y); see HeadingText. */
export function heading(scene: Phaser.Scene, x: number, y: number, text: string, size: number,
  { tint = 0xffffff, glow = NEON }: HeadingOptions = {}): HeadingText {
  return scene.add.existing(new HeadingText(scene, x, y, text, size, tint, glow));
}

/** Keeps the characters the heading font has. */
export function headingText(text: string): string {
  return text.replace(/[^A-Za-z0-9 \n]/g, '').replace(/ {2,}/g, ' ').trim();
}

/** A text style in the body font. */
export function body(size: number, style: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: BODY_FAMILY, fontStyle: '700', fontSize: `${size}px`, color: '#ffffff', ...style };
}

/**
 * Draws a player tag (P1, P2, CPU...) in the heading font with a pointer
 * underneath, filled with `color` and outlined in a darker shade, as texture `key`.
 */
export function makeTagTexture(scene: Phaser.Scene, key: string, text: string, color: number): void {
  const outline = 6;
  const l = layout(scene, text, 150 * 0.45);
  const arrow = 18;
  /** Space between the letters and the pointer. */
  const gap = 26;
  const w = Math.ceil(l.width + outline * 2 + 4);
  const h = Math.ceil(l.height + gap + arrow + outline * 2 + 4);
  if (scene.textures.exists(key)) scene.textures.remove(key);

  // The letters and pointer as a white mask...
  const mask = document.createElement('canvas');
  mask.width = w; mask.height = h;
  const m = mask.getContext('2d')!;
  drawGlyphs(scene, m, l, outline + 2, outline + 2 - l.top);
  const cx = w / 2;
  const ay = outline + 2 + l.height + gap;
  m.beginPath();
  m.moveTo(cx - arrow * 0.75, ay); m.lineTo(cx + arrow * 0.75, ay); m.lineTo(cx, ay + arrow);
  m.closePath(); m.fillStyle = '#ffffff'; m.fill();

  const tinted = (c: string) => {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const x = cv.getContext('2d')!;
    x.drawImage(mask, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = c; x.fillRect(0, 0, w, h);
    return cv;
  };
  const col = Phaser.Display.Color.IntegerToColor(color);
  const dark = col.clone().darken(45).rgba;

  // ...then a dark outline (the mask stamped around a circle) under the coloured fill.
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  const edge = tinted(dark);
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    ctx.drawImage(edge, Math.cos(t) * outline, Math.sin(t) * outline);
  }
  ctx.drawImage(tinted(col.rgba), 0, 0);
  // A light top edge, like the original label art.
  ctx.globalCompositeOperation = 'source-atop';
  const shine = ctx.createLinearGradient(0, 0, 0, h);
  shine.addColorStop(0, 'rgba(255,255,255,0.28)');
  shine.addColorStop(0.45, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(0, 0, w, h);
  tex.refresh();
}
