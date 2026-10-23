import { B, hold, onBuzz, onInfo, pulse, stick, together, type PadInfo } from '../link';
import { bindTouches, FloatingStick, type Finger } from '../touch';
import type { Layout } from './layout';

/** A drag this far (of full tilt) punches that way when the thumb lets go. */
const AIM = 0.35;
/** A touch shorter than this (ms) that barely moved is a tap. */
const TAP_MS = 220;
/** A second tap this soon after the first (ms) is a double tap: legs. */
const DOUBLE_MS = 260;
/** Down this long (ms) without moving: shield. */
const HOLD_MS = 420;

/**
 * Held upright with one thumb, the phone as a second screen: the top shows
 * your own Kubot (health, lives, guard, power-ups, the hits you take), the
 * bottom is one thumb area. Drag to move (all the way up jumps), let go to
 * punch the way you dragged, tap to jab, double tap for legs, hold still to
 * shield, a second finger to grab.
 */
export const onehand: Layout = {
  id: 'onehand',
  name: 'One hand',
  blurb: 'Held upright: your Kubot on top, one thumb plays below.',
  portrait: true,
  mount(root) {
    root.className = 'layout onehand';
    root.innerHTML = `
      <div class="card">
        <div class="who"><span class="swatch"></span><strong class="name">Waiting for a match</strong><span class="kills"></span></div>
        <div class="health"><span class="pct">--</span><span class="unit">%</span><span class="hit"></span></div>
        <div class="lives"></div>
        <div class="meter guard"><i></i><span>Guard</span></div>
        <div class="extras"></div>
      </div>
      <div class="thumb">
        <div class="base"><div class="knob"></div></div>
        <div class="hint">Drag to move · let go to punch<br>Tap jab · double tap legs · hold shield<br>Push all the way up to jump · 2nd finger grab</div>
        <div class="flash"></div>
      </div>`;
    const zone = root.querySelector<HTMLElement>('.thumb')!;
    const flashEl = root.querySelector<HTMLElement>('.flash')!;
    const card = root.querySelector<HTMLElement>('.card')!;
    const stickPad = new FloatingStick(zone, root.querySelector<HTMLElement>('.base')!, 'onehand.stick', 0.32);

    let flashTimer = 0;
    const flash = (t: string) => {
      flashEl.textContent = t;
      flashEl.className = 'flash show';
      clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => { flashEl.className = 'flash'; }, 260);
    };

    // The thumb: one finger drives, a second one grabs.
    let thumb: { id: number; at: number; far: number; shield: boolean; timer: number } | null = null;
    let lastTap = -1e9;
    let punchTimer = 0;
    const start = (f: Finger) => {
      if (thumb) { pulse(B.RB); flash('GRAB'); return; }
      if (!stickPad.start(f)) return;
      const t = { id: f.id, at: performance.now(), far: 0, shield: false, timer: 0 };
      t.timer = window.setTimeout(() => {
        if (thumb !== t || t.far > 0.2) return;
        t.shield = true;
        hold('onehand.shield', 1 << B.LT);
        flashEl.textContent = 'SHIELD';
        flashEl.className = 'flash show held';
      }, HOLD_MS);
      thumb = t;
    };
    const move = (f: Finger) => {
      if (!thumb || f.id !== thumb.id) return;
      stickPad.move(f);
      thumb.far = Math.max(thumb.far, Math.hypot(stickPad.x, stickPad.y));
    };
    const end = (f: Finger) => {
      if (!thumb || f.id !== thumb.id) return;
      const t = thumb;
      thumb = null;
      clearTimeout(t.timer);
      const { x, y } = stickPad;
      const now = performance.now();
      if (t.shield) {
        stickPad.end(f);
        hold('onehand.shield', 0);
        flashEl.className = 'flash';
      } else if (Math.hypot(x, y) >= AIM) {
        // Let go after a drag: punch that way (the stick stays pushed for the press).
        together(() => { stickPad.end(f); stick('onehand.punch', x, y); });
        pulse(B.A, 80);
        clearTimeout(punchTimer);
        punchTimer = window.setTimeout(() => stick('onehand.punch', 0, 0), 90);
        flash(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'PUNCH ▶' : '◀ PUNCH') : (y < 0 ? 'PUNCH ▲' : 'PUNCH ▼'));
      } else {
        stickPad.end(f);
        if (now - t.at < TAP_MS && t.far < AIM) {
          if (now - lastTap < DOUBLE_MS) { pulse(B.X); flash('LEGS'); lastTap = -1e9; }
          else { pulse(B.A); flash('JAB'); lastTap = now; }
        }
      }
    };

    // The card: what the game says about this phone's Kubot.
    const $ = <T extends HTMLElement>(s: string) => card.querySelector<T>(s)!;
    let lastHits = -1;
    let hitTimer = 0;
    const show = (i: PadInfo) => {
      card.classList.add('live');
      card.classList.toggle('down', !i.alive);
      card.style.setProperty('--me', i.color);
      $('.name').textContent = i.alive ? 'Your Kubot' : 'K.O.';
      $('.kills').textContent = i.kills ? `${i.kills} K.O.` : '';
      $('.pct').textContent = String(Math.max(0, Math.round(i.health)));
      card.classList.toggle('low', i.health <= 30);
      $('.lives').innerHTML = Array.from({ length: Math.max(0, i.lives) }, () => '<i></i>').join('');
      $<HTMLElement>('.guard i').style.width = `${Math.round(i.guard * 100)}%`;
      $('.extras').textContent = [i.weapon, ...i.powerUps].filter(Boolean).join(' · ');
      if (lastHits >= 0 && i.hits !== lastHits && i.hit > 0) {
        const hit = $('.hit');
        hit.textContent = `−${Math.round(i.hit)}`;
        hit.classList.remove('show');
        void hit.offsetWidth;
        hit.classList.add('show');
        clearTimeout(hitTimer);
        hitTimer = window.setTimeout(() => hit.classList.remove('show'), 700);
      }
      lastHits = i.hits;
    };
    const offInfo = onInfo(show);
    const offBuzz = onBuzz(() => { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); });

    const unbind = bindTouches(zone, { start, move, end });
    return () => {
      unbind();
      offInfo();
      offBuzz();
      if (thumb) clearTimeout(thumb.timer);
      clearTimeout(flashTimer);
      clearTimeout(punchTimer);
      clearTimeout(hitTimer);
      stick('onehand.punch', 0, 0);
    };
  },
};
