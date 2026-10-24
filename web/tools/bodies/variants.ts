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

/**
 * Each body module's torso, drawn whole (not over the original): its own
 * silhouette, still covering the joints where the original sits (neck about
 * x 20-40, front shoulder about (104, 96), hips x 170-205 across y 60-125).
 */
export const VARIANTS: Record<string, Variant> = {
  // Lean and aggressive: a sharp chest tapering to narrow hips, a blade-like plate across the chest.
  striker: {
    hideTorso: true,
    back: '',
    front: black([[14, 34], [64, 6], [130, 22], [196, 48], [206, 70], [200, 116], [150, 124], [70, 140], [18, 116]], 55)
      + steel([[4, 40], [34, 22], [52, 58], [22, 96]], { from: '#6e6f72', to: '#47484c', dir: 30 })
      + steel([[96, 96], [150, 80], [170, 124], [118, 134]], { from: '#7c7d80', to: '#4a4b4f', dir: 70 })
      + steel([[172, 50], [208, 64], [202, 118], [176, 120]], { from: '#76777a', to: '#47484c', dir: 0 }),
  },
  // Compact, with heavy hips for the jumps: a wide skirt plate, a rib across.
  hopper: {
    hideTorso: true,
    back: '',
    front: black([[16, 46], [40, 18], [120, 14], [176, 6], [212, 34], [212, 128], [180, 148], [110, 136], [36, 128], [14, 100]], 60)
      + steel([[6, 52], [30, 30], [48, 62], [20, 98]], { from: '#6e6f72', to: '#47484c', dir: 30 })
      + steel([[76, 14], [94, 12], [102, 136], [84, 136]], { from: '#5e5f63', to: '#3a3b3f', dir: 0 })
      + steel([[146, 4], [182, -4], [216, 30], [216, 134], [184, 154], [150, 144], [162, 110], [160, 40]], { from: '#7a7b7e', to: '#45464a', dir: 90 })
      + bolt(188, 92),
  },
  // A long wedge leaning into the run: flat back with a spine plate, the chest pushed forward.
  sprinter: {
    hideTorso: true,
    back: '',
    front: black([[12, 28], [196, 12], [212, 50], [204, 118], [152, 122], [70, 152], [18, 122]], 70)
      + steel([[20, 26], [196, 12], [200, 24], [110, 32], [24, 42]], { from: '#86878a', to: '#55565a', dir: 0 })
      + steel([[40, 112], [110, 94], [150, 122], [72, 150]], { from: '#7c7d80', to: '#4a4b4f', dir: 70 })
      + steel([[180, 16], [212, 50], [204, 118], [184, 120]], { from: '#6e6f73', to: '#424347', dir: 0 }),
  },
  // Slim and long: a narrow frame between two slanted side panels.
  glider: {
    hideTorso: true,
    back: '',
    front: black([[8, 48], [32, 30], [188, 34], [210, 50], [208, 110], [188, 116], [32, 112], [8, 92]], 60)
      + steel([[34, 30], [150, 33], [140, 46], [40, 44]], { from: '#8a8b8e', to: '#55565a', dir: 0 })
      + steel([[40, 100], [140, 100], [150, 113], [32, 112]], { from: '#8a8b8e', to: '#55565a', dir: 0 })
      + steel([[176, 34], [210, 50], [208, 110], [178, 116]], { from: '#6e6f73', to: '#424347', dir: 0 })
      + bolt(96, 72, 4),
  },
  // Heavy armour all round: a big block, thick plates on the back, the chest and the shoulder.
  bulwark: {
    hideTorso: true,
    back: '',
    front: black([[0, 14], [28, -10], [186, -14], [214, 10], [214, 140], [190, 160], [28, 160], [0, 132]], 60)
      + steel([[28, -10], [186, -14], [214, 10], [150, 18], [40, 16]], { from: '#86878a', to: '#4a4b4f', dir: 90 })
      + steel([[10, 120], [150, 110], [214, 132], [214, 140], [190, 160], [28, 160]], { from: '#808184', to: '#404145', dir: 90 })
      + steel([[0, 30], [40, 14], [58, 80], [10, 112]], { from: '#7a7b7e', to: '#45464a', dir: 30 })
      + bolt(26, 54) + bolt(190, 146) + bolt(60, 146) + bolt(176, 0),
  },
};
