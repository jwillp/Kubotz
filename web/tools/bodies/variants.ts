/**
 * The body modules' torsos, drawn in SVG over the original torso art in its
 * own image space: x runs from the neck (0) to the hips (209), y from the
 * back (0) to the chest (143). Same palette and finish as the original parts:
 * flat black and steel plates with soft gradients, small bolts, no outlines.
 */
export const TORSO = { w: 209, h: 143, pivotX: 0.872038, pivotY: 0.531034 };
/** Margin round the original for plates that stick out. */
export const PAD = 56;

export interface Variant { back: string; front: string; hideTorso?: boolean }

type Pt = [number, number];
const pts = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(' ');

let gid = 0;
/** A steel plate (the original's greys), lit along `dir` (degrees). */
function steel(p: Pt[], { from = '#7a7b7e', to = '#46474b', dir = 90 } = {}): string {
  const id = `g${gid++}`;
  return `<defs><linearGradient id="${id}" gradientTransform="rotate(${dir} .5 .5)"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`
    + `<polygon points="${pts(p)}" fill="url(#${id})"/>`;
}
/** A black plate, like the torso's own block. */
const black = (p: Pt[], dir = 60) => steel(p, { from: '#2c2e33', to: '#0a0b0e', dir });
/** A bolt: a dark socket with a steel rim (as on the chest plate). */
const bolt = (x: number, y: number, r = 4.5) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#55565a"/><circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="#141518"/>`;

export const VARIANTS: Record<string, Variant> = {
  // Heavy armour: a thick slab down the back, a chest plate and a shoulder guard, bolted on.
  bulwark: {
    back: black([[16, 50], [168, 16], [180, -30], [20, 6]], 80)
      + steel([[24, 4], [176, -26], [180, -14], [26, 16]], { dir: 100 })
      + steel([[30, 26], [170, -2], [172, 6], [32, 34]], { from: '#5c5d61', to: '#3a3b3f', dir: 100 }),
    front: steel([[44, 116], [190, 92], [200, 132], [56, 166]], { from: '#808184', to: '#404145', dir: 80 })
      + black([[60, 146], [188, 122], [192, 134], [64, 158]], 0)
      + bolt(80, 136) + bolt(172, 114) + bolt(120, 128, 3.5)
      + steel([[-6, 54], [26, 22], [42, 66], [8, 104]], { dir: 20 }) + bolt(18, 62, 4),
  },
  // Gliding fins folded along the back, swept towards the hips.
  glider: {
    back: black([[40, 40], [124, 22], [186, -40], [146, -48]], 120)
      + steel([[40, 40], [54, 37], [154, -46], [146, -48]], { from: '#9a9b9e', to: '#5a5b5f', dir: 0 })
      + black([[112, 24], [176, 12], [216, -30], [186, -38]], 120)
      + steel([[112, 24], [126, 21], [194, -36], [186, -38]], { from: '#9a9b9e', to: '#5a5b5f', dir: 0 }),
    front: steel([[118, 112], [164, 104], [166, 113], [120, 121]], { dir: 0 })
      + steel([[116, 98], [162, 90], [164, 99], [118, 107]], { dir: 0 }),
  },
  // Streamlined: a long spoiler along the back, and racing stripes across the chest.
  sprinter: {
    back: black([[26, 42], [168, 16], [226, -22], [204, -32], [30, 16]], 100)
      + steel([[34, 18], [204, -30], [214, -26], [40, 28]], { from: '#9a9b9e', to: '#5a5b5f', dir: 0 }),
    front: steel([[70, 44], [92, 40], [140, 128], [118, 132]], { from: '#7a7b7e', to: '#56575b', dir: 0 })
      + steel([[98, 39], [110, 37], [158, 125], [146, 127]], { from: '#7a7b7e', to: '#56575b', dir: 0 }),
  },
  // A jump pack: two thrusters on the back by the hips.
  hopper: {
    back: black([[96, 26], [184, 10], [190, -42], [100, -24]], 90)
      + steel([[104, -2], [182, -16], [184, -2], [106, 12]], { dir: 90 })
      + steel([[102, -26], [184, -40], [186, -26], [104, -12]], { dir: 90 })
      + black([[184, -44], [212, -50], [216, 6], [188, 12]], 0)
      + steel([[192, -40], [206, -43], [208, 0], [194, 3]], { from: '#a4a5a8', to: '#55565a', dir: 0 }),
    front: bolt(120, 6) + bolt(170, -2) + bolt(120, -18) + bolt(170, -26),
  },
  // Sharp and light: a chevron plate on the chest, a fin at the neck.
  striker: {
    back: steel([[16, 44], [62, 32], [30, -10]], { from: '#86878a', to: '#4a4b4f', dir: 135 }),
    front: steel([[78, 132], [116, 92], [168, 118], [160, 124], [118, 102], [90, 134]], { from: '#86878a', to: '#4c4d51', dir: 70 }),
  },
};
