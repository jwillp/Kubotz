import { B } from '../link';
import { bindTouches, FloatingStick, SlideButtons } from '../touch';
import type { Layout } from './layout';

/**
 * No buttons to aim for: the left half moves (a stick wherever the thumb
 * lands), the right half is three wide bands (jump, fists, legs) the thumb
 * slides between, and shield and grab run along the top edges.
 */
export const zones: Layout = {
  id: 'zones',
  name: 'Big zones',
  blurb: 'Left half moves, right half is three wide bands. No looking down.',
  mount(root) {
    root.className = 'layout zones';
    root.innerHTML = `
      <div class="edge shield btn" data-btn="${B.LT}"><b>SHIELD</b></div>
      <div class="edge grab btn" data-btn="${B.RB}"><b>GRAB</b></div>
      <div class="stickZone"><div class="base ring"><div class="knob"></div></div><div class="hint">Move anywhere here</div></div>
      <div class="bands">
        <div class="band jump btn" data-btn="${B.Y}"><b>JUMP</b></div>
        <div class="band fists btn" data-btn="${B.A}"><b>FISTS</b></div>
        <div class="band legs btn" data-btn="${B.X}"><b>LEGS</b></div>
      </div>`;
    const zone = root.querySelector<HTMLElement>('.stickZone')!;
    const stick = new FloatingStick(zone, root.querySelector<HTMLElement>('.base')!, 'zones.stick', 0.42);
    const buttons = new SlideButtons(root, 'zones.buttons');
    return bindTouches(root, {
      start: (f) => { if (!(zone.contains(f.target) && stick.start(f))) buttons.start(f); },
      move: (f) => { stick.move(f); buttons.move(f); },
      end: (f) => { stick.end(f); buttons.end(f); },
    });
  },
};
