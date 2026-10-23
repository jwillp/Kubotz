import { B, stick } from '../link';
import { bindTouches, SlideButtons } from '../touch';
import type { Layout } from './layout';

/** Tilt (degrees from where it was centred) that starts a walk, and the one that runs. */
const DEAD_DEG = 4;
const FULL_DEG = 28;
/** Port of the dev server's HTTPS door (tools/phone-pads.ts): phones only share motion with secure pages. */
const HTTPS_PORT = 5181;
const FLIP_KEY = 'kubotz.phonePad.leanFlip';

/**
 * Tilt the phone like a steering wheel to walk, run and dash (a quick tilt is
 * a flick), which frees both thumbs for a few big buttons: up / down and
 * shield / grab on the left, jump, fists and legs on the right.
 *
 * The tilt is the gravity's angle in the screen's plane, measured from where
 * it was when centred, so it works held upright or leaning back, either way
 * round, and on phones that report gravity with the opposite sign.
 */
export const lean: Layout = {
  id: 'lean',
  name: 'Lean to move',
  blurb: 'Tilt the phone like a wheel to move. Both thumbs on big buttons.',
  mount(root) {
    root.className = 'layout lean';
    const secureUrl = `https://${location.hostname}:${HTTPS_PORT}${location.pathname}?layout=lean`;
    root.innerHTML = `
      <div class="left">
        <div class="btn dir up" data-axis="0,-1"><b>▲</b><small>Up</small></div>
        <div class="btn dir down" data-axis="0,1"><b>▼</b><small>Down</small></div>
        <div class="btn act shield" data-btn="${B.LT}"><b>SHIELD</b></div>
        <div class="btn act grab" data-btn="${B.RB}"><b>GRAB</b></div>
      </div>
      <div class="wheel">
        <div class="horizon"><div class="needle"></div></div>
        <div class="tiltText">Not started</div>
        <div class="row"><button class="go">Start tilt</button><button class="flip" title="Swap left and right">⇄</button></div>
        <div class="insecure">Tilt needs the secure address:<br><a href="${secureUrl}">${secureUrl.replace(/^https:\/\//, '')}</a><br><small>Accept the certificate warning once.</small></div>
      </div>
      <div class="right">
        <div class="btn big jump" data-btn="${B.Y}"><b>JUMP</b></div>
        <div class="btn big fists" data-btn="${B.A}"><b>FISTS</b></div>
        <div class="btn big legs" data-btn="${B.X}"><b>LEGS</b></div>
      </div>`;
    const buttons = new SlideButtons(root, 'lean.buttons');
    const horizon = root.querySelector<HTMLElement>('.horizon')!;
    const text = root.querySelector<HTMLElement>('.tiltText')!;
    const go = root.querySelector<HTMLButtonElement>('.go')!;
    const flipBtn = root.querySelector<HTMLButtonElement>('.flip')!;
    root.classList.toggle('secure', window.isSecureContext);

    let flip = (() => { try { return localStorage.getItem(FLIP_KEY) === '1'; } catch { return false; } })();
    let neutral: number | null = null;
    let angle = 0;
    let listening = false;

    const onMotion = (e: DeviceMotionEvent) => {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x === null || g.y === null) return;
      const a = Math.atan2(g.y, g.x) * 180 / Math.PI;
      if (neutral === null) neutral = a;
      let d = a - neutral;
      d = ((d + 540) % 360) - 180;
      angle = angle * 0.4 + d * 0.6;
      const tilt = flip ? -angle : angle;
      const mag = Math.min(1, Math.max(0, (Math.abs(tilt) - DEAD_DEG) / (FULL_DEG - DEAD_DEG)));
      const x = Math.sign(tilt) * mag;
      stick('lean.tilt', x, 0);
      horizon.style.transform = `rotate(${-tilt}deg)`;
      horizon.classList.toggle('run', mag >= 1);
      text.textContent = mag === 0 ? 'Centred' : `${mag >= 1 ? 'Run' : 'Walk'} ${x > 0 ? 'right ▶' : '◀ left'}`;
    };

    const start = async () => {
      const ask = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
      if (ask && (await ask().catch(() => 'denied')) !== 'granted') { text.textContent = 'Motion not allowed'; return; }
      neutral = null;
      if (!listening) { window.addEventListener('devicemotion', onMotion); listening = true; }
      go.textContent = 'Re-centre';
      text.textContent = 'Centred';
      setTimeout(() => { if (neutral === null) text.textContent = 'No motion sensor here'; }, 1500);
    };
    go.addEventListener('click', () => void start());
    flipBtn.addEventListener('click', () => {
      flip = !flip;
      try { localStorage.setItem(FLIP_KEY, flip ? '1' : '0'); } catch { /* private mode */ }
    });

    const wheel = root.querySelector<HTMLElement>('.wheel')!;
    const unbind = bindTouches(root, {
      start: (f) => { if (!wheel.contains(f.target)) buttons.start(f); },
      move: (f) => buttons.move(f),
      end: (f) => buttons.end(f),
    });
    return () => {
      unbind();
      window.removeEventListener('devicemotion', onMotion);
      stick('lean.tilt', 0, 0);
    };
  },
};
