import { bindTouches, FloatingStick, SlideButtons } from '../touch';
import type { Layout } from './layout';

/**
 * The owner's Xbox-style pad: A fists, X legs, B / Y jump, LB / RB grab,
 * LT / RT shield, a taunt, and a floating stick on the left half.
 */
export const classic: Layout = {
  id: 'classic',
  name: 'Gamepad',
  blurb: 'Your Xbox-style pad: stick, four face buttons, shoulders.',
  mount(root) {
    root.className = 'layout classic';
    root.innerHTML = `
      <div class="stickZone"><div class="base"><div class="knob"></div></div><div class="hint">Move</div></div>
      <div class="btn shoulder lt" data-btn="6"><span><b>LT</b><small>Shield</small></span></div>
      <div class="btn shoulder lb" data-btn="4"><span><b>LB</b><small>Grab</small></span></div>
      <div class="btn shoulder rb" data-btn="5"><span><b>RB</b><small>Grab</small></span></div>
      <div class="btn shoulder rt" data-btn="7"><span><b>RT</b><small>Shield</small></span></div>
      <div class="btn pill taunt" data-btn="12"><b>TAUNT</b></div>
      <div class="faces">
        <div class="btn face y" data-btn="3"><b>Y</b><small>Jump</small></div>
        <div class="btn face x" data-btn="2"><b>X</b><small>Legs</small></div>
        <div class="btn face b" data-btn="1"><b>B</b><small>Jump</small></div>
        <div class="btn face a" data-btn="0"><b>A</b><small>Fists</small></div>
      </div>`;
    const zone = root.querySelector<HTMLElement>('.stickZone')!;
    const stick = new FloatingStick(zone, root.querySelector<HTMLElement>('.base')!, 'classic.stick');
    const buttons = new SlideButtons(root, 'classic.buttons');
    return bindTouches(root, {
      start: (f) => { if (!(zone.contains(f.target) && stick.start(f))) buttons.start(f); },
      move: (f) => { stick.move(f); buttons.move(f); },
      end: (f) => { stick.end(f); buttons.end(f); },
    });
  },
};
