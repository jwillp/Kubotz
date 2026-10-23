import Phaser from 'phaser';
import { boxBlur } from './NormalMaps';

/**
 * The cel look (exploration), after Zelda: The Wind Waker's toon shading:
 * each Kubot part in two flat tones only, lit and shadow, split by one crisp
 * edge that follows the part's rounded volume under a sun from above (and the
 * art's own shading, so its plates and folds keep their shadows). Lit tones
 * are clean and saturated, shadows cooler and bluer rather
 * than just darker; big glossy parts (helmets, visors) catch a small hard
 * white shine. No texture, no gradients, no outlines. The arena lights reach
 * them in toon steps (ToonLightPipeline below).
 * Picked with ?style=cel / ?style=classic, else the last choice (Y in a
 * match), cel by default.
 */
export const CEL = 'cel:';

const STYLE_KEY = 'kubotz.style';

function startStyle(): boolean {
  const q = new URLSearchParams(location.search).get('style');
  if (q) return q !== 'classic';
  try { return localStorage.getItem(STYLE_KEY) !== 'classic'; } catch { return true; }
}

export const cel = { on: startStyle() };

export function setCel(on: boolean): void {
  cel.on = on;
  try { localStorage.setItem(STYLE_KEY, on ? 'cel' : 'classic'); } catch { /* private window */ }
}

type Rgb = [number, number, number];

function hsv(r: number, g: number, b: number): Rgb {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, max ? d / max : 0, max];
}

function rgb(h: number, s: number, v: number): Rgb {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  return ([[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]] as Rgb[])[i % 6];
}

/** Turns a hue a little towards blue-violet (shadows) by `k` of the way. */
function towardBlue(h: number, k: number): number {
  let d = 0.68 - h;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return h + d * k;
}

/**
 * The lit and shadow tones of a pixel's colour. Coloured pixels: lit at full
 * saturation and bright, shadow bluer and darker. Greys as painted metal:
 * their value in a few flat steps, lit a clean cool white, shadow a cool
 * blue-grey; black parts a deep navy whose shadow is darker still.
 */
function tones(r: number, g: number, b: number): [Rgb, Rgb] {
  const [h, s, v] = hsv(r, g, b);
  if (s >= 0.3 && v > 0.2) {
    const lit = rgb(h, Math.min(1, s * 1.1 + 0.08), Math.min(1, v * 1.08 + 0.08));
    return [lit, rgb(towardBlue(h, 0.12), Math.min(1, s * 1.05 + 0.12), Math.min(1, v * 1.08 + 0.08) * 0.66)];
  }
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  if (l <= 0.2) return [[0.15, 0.17, 0.28], [0.06, 0.06, 0.13]];
  const step = Math.min(1, Math.round(l * 5) / 5 + 0.16);
  const lit: Rgb = [step * 0.98, step, Math.min(1, step * 1.03 + 0.02)];
  const shadow: Rgb = [step * 0.52 + 0.02, step * 0.56 + 0.03, step * 0.74 + 0.08];
  return [lit, shadow];
}

/** A cel copy of a part image (from its clean art: wear would only break up the flat fills). */
export function celPart(source: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width, h = source.height;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  // The art's colours with its soft gradients flattened, so each plate reads as one fill.
  ctx.filter = 'blur(2px)';
  ctx.drawImage(source, 0, 0);
  ctx.filter = 'none';
  const soft = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const alpha = new Float32Array(w * h);
  const luma = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    alpha[i] = p[i * 4 + 3] / 255;
    luma[i] = (0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2]) / 255;
  }
  // The part's rounded volume: its blurred silhouette as a height, twice for a smooth dome.
  const r = Math.max(3, Math.round(Math.min(w, h) * 0.14));
  const height = boxBlur(boxBlur(alpha, w, h, r), w, h, r);
  // The art's own shading, smoothed so its shadow shapes come out as clean blobs.
  const shading = boxBlur(luma, w, h, 3);
  const big = Math.min(w, h) > 90;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      if (p[o + 3] === 0) continue;
      const sa = soft[o + 3] / 255 || 1;
      const cr = soft[o] / 255 / sa, cg = soft[o + 1] / 255 / sa, cb = soft[o + 2] / 255 / sa;
      const [lit, shadow] = tones(Math.min(1, cr), Math.min(1, cg), Math.min(1, cb));
      // Facing the sun (straight above, a touch towards the front): the height's slope upwards,
      // plus a little of its dome so the middle of a part stays lit.
      const gy = height[i + (y < h - 1 ? w : 0)] - height[i - (y > 0 ? w : 0)];
      const gx = height[i + (x < w - 1 ? 1 : 0)] - height[i - (x > 0 ? 1 : 0)];
      const facing = gy * r * 1.6 + (height[i] - 0.5) * 0.5;
      // Against the flattened colour, how much darker the art paints this spot.
      const own = shading[i] - (0.299 * cr + 0.587 * cg + 0.114 * cb);
      const n = facing + own * 1.6;
      let c = n > -0.26 ? lit : shadow;
      // A small hard shine on the top of big glossy (coloured or light) parts.
      if (big && n > 0.5 && Math.abs(gx) * r < 0.25 && (cr + cg + cb) / 3 > 0.35) c = [Math.min(1, lit[0] * 0.3 + 0.75), Math.min(1, lit[1] * 0.3 + 0.75), Math.min(1, lit[2] * 0.3 + 0.75)];
      p[o] = Math.min(255, c[0] * 255); p[o + 1] = Math.min(255, c[1] * 255); p[o + 2] = Math.min(255, c[2] * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/**
 * Phaser's Light2D shader with toon steps: each light's reach on a part is
 * cut into flat bands (none, half, full) with hard edges, so the arena lights
 * still play over the cel Kubotz, through their normal maps, without shading
 * them back into gradients. A floor under the arena's ambient light keeps the
 * flat tones readable in the dark arenas.
 */
function toonFrag(lightFrag: string): string {
  return lightFrag
    .replace('#define SHADER_NAME PHASER_LIGHT_FS', '#define SHADER_NAME KUBOTZ_TOON_LIGHT_FS')
    .replace('vec3 diffuse = light.color * diffuseFactor;', 'float lit = attenuation * diffuseFactor; float band = step(0.12, lit) * 0.5 + step(0.45, lit) * 0.5;')
    .replace('finalColor += (attenuation * diffuse) * light.intensity;', 'finalColor += light.color * band * light.intensity * 0.3;')
    .replace('vec4 colorOutput = vec4(uAmbientLightColor + finalColor, 1.0);', 'vec4 colorOutput = vec4(max(uAmbientLightColor, vec3(0.5)) + finalColor, 1.0);');
}

class ToonLightPipeline extends Phaser.Renderer.WebGL.Pipelines.LightPipeline {
  constructor(game: Phaser.Game, lightFrag: string) {
    super({ game, fragShader: toonFrag(lightFrag) } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }
}

/** Draws a cel part through the toon lights (WebGL only). */
export function toonLit<T extends Phaser.GameObjects.Components.Pipeline & Phaser.GameObjects.GameObject>(obj: T): T {
  const renderer = obj.scene.sys.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return obj;
  if (!renderer.pipelines.has('ToonLight')) {
    // Phaser's own light shader (as built, light count filled in), with the toon steps.
    const light = renderer.pipelines.get('Light2D') as Phaser.Renderer.WebGL.WebGLPipeline;
    renderer.pipelines.add('ToonLight', new ToonLightPipeline(obj.scene.game, light.shaders[0].fragSrc));
  }
  return obj.setPipeline('ToonLight');
}
