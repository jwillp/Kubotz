import Phaser from 'phaser';

/**
 * Minimal Spriter (SCML) runtime: bones + sprite objects, linear tweening,
 * spin, character maps. Enough to play animations/kubotz.scml, which the
 * LibGDX version played through the brashmonkey Java runtime.
 */

interface SpriterFile { name: string; width: number; height: number; pivotX: number; pivotY: number; }

interface TimelineKey {
  time: number;
  spin: number;
  x: number; y: number; angle: number;
  scaleX: number; scaleY: number;
  alpha: number;
  folder: number; file: number;
  pivotX?: number; pivotY?: number;
}

interface Timeline { id: number; name: string; isBone: boolean; keys: TimelineKey[]; }

interface Ref { id: number; parent: number; timeline: number; key: number; z: number; }

interface MainlineKey { time: number; bones: Ref[]; objects: Ref[]; }

export interface SpriterAnimation {
  name: string;
  length: number;
  looping: boolean;
  mainline: MainlineKey[];
  timelines: Map<number, Timeline>;
}

/** A character map swaps (folder,file) pairs for others, or hides them. */
type CharacterMap = Map<string, { folder: number; file: number } | null>;

export class SpriterData {
  readonly folders: SpriterFile[][] = [];
  readonly animations = new Map<string, SpriterAnimation>();
  readonly characterMaps = new Map<string, CharacterMap>();

  constructor(xmlText: string, entityName: string) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const num = (el: Element, attr: string, def = 0) => {
      const v = el.getAttribute(attr);
      return v === null ? def : parseFloat(v);
    };

    for (const folderEl of Array.from(doc.querySelectorAll('spriter_data > folder'))) {
      const files: SpriterFile[] = [];
      for (const f of Array.from(folderEl.querySelectorAll('file'))) {
        files[num(f, 'id')] = {
          name: f.getAttribute('name')!,
          width: num(f, 'width'),
          height: num(f, 'height'),
          pivotX: num(f, 'pivot_x', 0),
          pivotY: num(f, 'pivot_y', 1),
        };
      }
      this.folders[num(folderEl, 'id')] = files;
    }

    const entity = Array.from(doc.querySelectorAll('spriter_data > entity'))
      .find((e) => e.getAttribute('name') === entityName);
    if (!entity) throw new Error(`Spriter entity ${entityName} not found`);

    for (const cm of Array.from(entity.querySelectorAll(':scope > character_map'))) {
      const map: CharacterMap = new Map();
      for (const m of Array.from(cm.querySelectorAll('map'))) {
        const key = `${m.getAttribute('folder')}/${m.getAttribute('file')}`;
        map.set(key, m.hasAttribute('target_file')
          ? { folder: num(m, 'target_folder'), file: num(m, 'target_file') }
          : null);
      }
      this.characterMaps.set(cm.getAttribute('name')!, map);
    }

    for (const animEl of Array.from(entity.querySelectorAll(':scope > animation'))) {
      const mainline: MainlineKey[] = [];
      for (const k of Array.from(animEl.querySelectorAll(':scope > mainline > key'))) {
        const ref = (r: Element): Ref => ({
          id: num(r, 'id'),
          parent: num(r, 'parent', -1),
          timeline: num(r, 'timeline'),
          key: num(r, 'key'),
          z: num(r, 'z_index'),
        });
        mainline.push({
          time: num(k, 'time'),
          bones: Array.from(k.querySelectorAll('bone_ref')).map(ref),
          objects: Array.from(k.querySelectorAll('object_ref')).map(ref).sort((a, b) => a.z - b.z),
        });
      }
      const timelines = new Map<number, Timeline>();
      for (const tl of Array.from(animEl.querySelectorAll(':scope > timeline'))) {
        const keys: TimelineKey[] = [];
        for (const k of Array.from(tl.querySelectorAll(':scope > key'))) {
          const o = k.firstElementChild!;
          keys[num(k, 'id')] = {
            time: num(k, 'time'),
            spin: num(k, 'spin', 1),
            x: num(o, 'x'), y: num(o, 'y'), angle: num(o, 'angle'),
            scaleX: num(o, 'scale_x', 1), scaleY: num(o, 'scale_y', 1),
            alpha: num(o, 'a', 1),
            folder: num(o, 'folder'), file: num(o, 'file'),
            pivotX: o.hasAttribute('pivot_x') ? num(o, 'pivot_x') : undefined,
            pivotY: o.hasAttribute('pivot_y') ? num(o, 'pivot_y') : undefined,
          };
        }
        timelines.set(num(tl, 'id'), {
          id: num(tl, 'id'),
          name: tl.getAttribute('name') ?? '',
          isBone: tl.getAttribute('object_type') === 'bone',
          keys,
        });
      }
      this.animations.set(animEl.getAttribute('name')!, {
        name: animEl.getAttribute('name')!,
        length: num(animEl, 'length'),
        looping: animEl.getAttribute('looping') !== 'false',
        mainline,
        timelines,
      });
    }
  }

  /** Every image path referenced by the file, for preloading. */
  allFiles(): string[] {
    return this.folders.flat().filter(Boolean).map((f) => f.name);
  }
}

interface Transform { x: number; y: number; angle: number; scaleX: number; scaleY: number; alpha: number; }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpAngle(a: number, b: number, t: number, spin: number): number {
  if (spin === 0) return a;
  if (spin > 0 && b < a) b += 360;
  if (spin < 0 && b > a) b -= 360;
  return lerp(a, b, t);
}

function applyParent(parent: Transform, child: Transform): Transform {
  const flip = parent.scaleX * parent.scaleY < 0;
  const angle = flip ? 360 - child.angle : child.angle;
  const px = child.x * parent.scaleX;
  const py = child.y * parent.scaleY;
  const rad = Phaser.Math.DegToRad(parent.angle);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: px * cos - py * sin + parent.x,
    y: px * sin + py * cos + parent.y,
    angle: parent.angle + angle,
    scaleX: child.scaleX * parent.scaleX,
    scaleY: child.scaleY * parent.scaleY,
    alpha: child.alpha * parent.alpha,
  };
}

/**
 * Plays one SpriterData inside a Phaser container. Spriter is y-up with
 * counter-clockwise angles; the container converts to Phaser's y-down space.
 */
export class SpriterPlayer extends Phaser.GameObjects.Container {
  private anim!: SpriterAnimation;
  private time = 0;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private charMaps: CharacterMap[] = [];
  speed = 1;
  /** Set when a non-looping animation reached its end. */
  finished = false;

  constructor(scene: Phaser.Scene, private spriter: SpriterData, private textureKeyPrefix: string, initial: string) {
    super(scene);
    this.play(initial, true);
  }

  get animationName(): string { return this.anim.name; }

  play(name: string, restart = false): void {
    if (!restart && this.anim?.name === name) return;
    const anim = this.spriter.animations.get(name);
    if (!anim) return;
    this.anim = anim;
    this.time = 0;
    this.finished = false;
  }

  setCharacterMaps(names: string[]): void {
    this.charMaps = names.map((n) => this.spriter.characterMaps.get(n)).filter((m): m is CharacterMap => !!m);
  }

  setFlipped(flipped: boolean): void {
    this.scaleX = Math.abs(this.scaleX) * (flipped ? -1 : 1);
  }

  /** Advance by dt milliseconds and redraw. */
  tick(dtMs: number): void {
    const a = this.anim;
    this.time += dtMs * this.speed;
    if (this.time >= a.length) {
      if (a.looping) this.time %= a.length;
      else { this.time = a.length; this.finished = true; }
    }
    this.draw();
  }

  private keyTransform(tl: Timeline, keyIndex: number): { tr: Transform; key: TimelineKey } {
    const a = this.anim;
    const k1 = tl.keys[keyIndex];
    let k2 = tl.keys[keyIndex + 1];
    let t2 = k2?.time;
    if (!k2) {
      if (!a.looping || tl.keys.length === 1) return { tr: { ...k1 }, key: k1 };
      k2 = tl.keys[0];
      t2 = a.length;
    }
    const span = t2! - k1.time;
    const t = span > 0 ? Phaser.Math.Clamp((this.time - k1.time) / span, 0, 1) : 0;
    return {
      key: k1,
      tr: {
        x: lerp(k1.x, k2.x, t),
        y: lerp(k1.y, k2.y, t),
        angle: lerpAngle(k1.angle, k2.angle, t, k1.spin),
        scaleX: lerp(k1.scaleX, k2.scaleX, t),
        scaleY: lerp(k1.scaleY, k2.scaleY, t),
        alpha: lerp(k1.alpha, k2.alpha, t),
      },
    };
  }

  private draw(): void {
    const a = this.anim;
    let main = a.mainline[0];
    for (const k of a.mainline) if (k.time <= this.time) main = k;

    const root: Transform = { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1 };
    const bones: Transform[] = [];
    for (const ref of main.bones) {
      const { tr } = this.keyTransform(a.timelines.get(ref.timeline)!, ref.key);
      bones[ref.id] = applyParent(ref.parent >= 0 ? bones[ref.parent] : root, tr);
    }

    for (const s of this.sprites.values()) s.setVisible(false);
    let depth = 0;
    for (const ref of main.objects) {
      const { tr: local, key } = this.keyTransform(a.timelines.get(ref.timeline)!, ref.key);
      const tr = applyParent(ref.parent >= 0 ? bones[ref.parent] : root, local);

      let folder = key.folder;
      let file = key.file;
      let hidden = false;
      for (const map of this.charMaps) {
        const swap = map.get(`${folder}/${file}`);
        if (swap === null) hidden = true;
        else if (swap) { folder = swap.folder; file = swap.file; }
      }
      if (hidden) continue;
      const info = this.spriter.folders[folder]?.[file];
      if (!info) continue;

      let img = this.sprites.get(ref.timeline);
      const textureKey = this.textureKeyPrefix + info.name;
      if (!img) {
        img = this.scene.add.image(0, 0, textureKey);
        this.sprites.set(ref.timeline, img);
        this.add(img);
      } else if (img.texture.key !== textureKey) {
        img.setTexture(textureKey);
      }
      const pivotX = key.pivotX ?? info.pivotX;
      const pivotY = key.pivotY ?? info.pivotY;
      img.setVisible(true)
        .setOrigin(pivotX, 1 - pivotY)
        .setPosition(tr.x, -tr.y)
        .setAngle(-tr.angle)
        .setScale(tr.scaleX, tr.scaleY)
        .setAlpha(tr.alpha);
      this.moveTo(img, depth++);
    }
  }
}
