import { B, hold, pulse, smash } from '../link';
import { bindTouches, FloatingStick, SlideButtons, type Finger } from '../touch';
import type { Layout } from './layout';

/** A finger moved this far (px) is a swipe, not a tap. */
const SWIPE_PX = 28;
/** Down this long (ms) without moving: shield. */
const HOLD_MS = 230;
/** A second finger this soon after the first (ms): legs. */
const TWO_FINGER_MS = 140;

interface PadFinger { x: number; y: number; at: number; done: boolean; shield: boolean; timer: number }

/**
 * The stick on the left, and the right side one big attack pad instead of
 * four buttons: tap for fists, swipe a direction to smash that way (the right
 * stick: an aerial in the air), two fingers for legs, hold to shield. Jump is a
 * flick up on the stick (tap jump), and grab a small button on the pad's edge.
 */
export const swipe: Layout = {
  id: 'swipe',
  name: 'Swipe pad',
  blurb: 'Tap to punch, swipe to smash, two fingers for legs, hold to shield.',
  mount(root) {
    root.className = 'layout swipe';
    root.innerHTML = `
      <div class="stickZone"><div class="base"><div class="knob"></div></div><div class="hint">Move · flick up to jump</div></div>
      <div class="attack">
        <div class="arrows"><i class="up">▲</i><i class="right">▶</i><i class="down">▼</i><i class="left">◀</i></div>
        <div class="legend"><b>Tap</b> fists · <b>Swipe</b> smash<br><b>2 fingers</b> legs · <b>Hold</b> shield</div>
        <div class="flash"></div>
        <div class="btn pill grab" data-btn="${B.RB}"><b>GRAB</b></div>
      </div>`;
    const zone = root.querySelector<HTMLElement>('.stickZone')!;
    const pad = root.querySelector<HTMLElement>('.attack')!;
    const flashEl = root.querySelector<HTMLElement>('.flash')!;
    const stick = new FloatingStick(zone, root.querySelector<HTMLElement>('.base')!, 'swipe.stick');
    const buttons = new SlideButtons(root, 'swipe.buttons');
    const fingers = new Map<number, PadFinger>();

    let flashTimer = 0;
    const flash = (text: string, cls: string) => {
      flashEl.textContent = text;
      flashEl.className = `flash show ${cls}`;
      clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => { flashEl.className = 'flash'; }, 260);
    };
    const shields = () => hold('swipe.shield', [...fingers.values()].some((p) => p.shield) ? 1 << B.LT : 0);

    const padStart = (f: Finger) => {
      const now = performance.now();
      // A second finger right after the first, neither one moved: legs.
      const other = [...fingers.values()].find((p) => !p.done && !p.shield && now - p.at < TWO_FINGER_MS);
      const p: PadFinger = { x: f.x, y: f.y, at: now, done: false, shield: false, timer: 0 };
      fingers.set(f.id, p);
      if (other) {
        other.done = p.done = true;
        clearTimeout(other.timer);
        pulse(B.X);
        flash('LEGS', 'legs');
        return;
      }
      p.timer = window.setTimeout(() => {
        if (p.done) return;
        p.shield = p.done = true;
        shields();
        flashEl.textContent = 'SHIELD';
        flashEl.className = 'flash show held shield';
      }, HOLD_MS);
    };
    const padMove = (f: Finger) => {
      const p = fingers.get(f.id);
      if (!p || p.done) return;
      const dx = f.x - p.x;
      const dy = f.y - p.y;
      if (Math.hypot(dx, dy) < SWIPE_PX) return;
      p.done = true;
      clearTimeout(p.timer);
      // Snap to the four directions, as the right stick does in the game.
      const [sx, sy] = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      smash(sx, sy);
      flash(`SMASH ${sx > 0 ? '▶' : sx < 0 ? '◀' : sy < 0 ? '▲' : '▼'}`, 'smash');
    };
    const padEnd = (f: Finger) => {
      const p = fingers.get(f.id);
      if (!p) return;
      fingers.delete(f.id);
      clearTimeout(p.timer);
      if (p.shield) { shields(); flashEl.className = 'flash'; return; }
      if (!p.done) { pulse(B.A); flash('FISTS', 'fists'); }
    };

    const unbind = bindTouches(root, {
      start: (f) => {
        if (zone.contains(f.target) && stick.start(f)) return;
        if (buttons.at(f.x, f.y)) buttons.start(f);
        else if (pad.contains(f.target)) padStart(f);
      },
      move: (f) => { stick.move(f); buttons.move(f); padMove(f); },
      end: (f) => { stick.end(f); buttons.end(f); padEnd(f); },
    });
    return () => {
      unbind();
      for (const p of fingers.values()) clearTimeout(p.timer);
      clearTimeout(flashTimer);
    };
  },
};
