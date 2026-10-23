import { hold, stick } from './link';

/** One finger (or the mouse, id -1, so layouts can be tried on a PC). */
export interface Finger { id: number; x: number; y: number; target: Element | null }

export interface TouchHandlers {
  start(f: Finger): void;
  move(f: Finger): void;
  end(f: Finger): void;
}

/**
 * Calls the handlers for every finger that lands on `el` (and its moves and
 * lift, wherever they go), and for the mouse. Returns the unbind.
 */
export function bindTouches(el: HTMLElement, h: TouchHandlers): () => void {
  // Real buttons and links (a layout's settings) keep their clicks.
  const own = (e: Event) => (e.target as Element | null)?.closest?.('button, a');
  const fingers = (e: TouchEvent, f: (t: Finger) => void) => {
    if (e.type === 'touchstart' && own(e)) return;
    e.preventDefault();
    for (const t of e.changedTouches) f({ id: t.identifier, x: t.clientX, y: t.clientY, target: t.target as Element });
  };
  const ts = (e: TouchEvent) => fingers(e, h.start);
  const tm = (e: TouchEvent) => fingers(e, h.move);
  const te = (e: TouchEvent) => fingers(e, h.end);
  let mouse = false;
  const mouseAt = (e: MouseEvent): Finger => ({ id: -1, x: e.clientX, y: e.clientY, target: e.target as Element });
  const md = (e: MouseEvent) => { if (own(e)) return; mouse = true; h.start(mouseAt(e)); };
  const mm = (e: MouseEvent) => { if (mouse) h.move(mouseAt(e)); };
  const mu = (e: MouseEvent) => { if (mouse) { mouse = false; h.end(mouseAt(e)); } };
  el.addEventListener('touchstart', ts, { passive: false });
  el.addEventListener('touchmove', tm, { passive: false });
  el.addEventListener('touchend', te, { passive: false });
  el.addEventListener('touchcancel', te, { passive: false });
  el.addEventListener('mousedown', md);
  document.addEventListener('mousemove', mm);
  document.addEventListener('mouseup', mu);
  return () => {
    el.removeEventListener('touchstart', ts);
    el.removeEventListener('touchmove', tm);
    el.removeEventListener('touchend', te);
    el.removeEventListener('touchcancel', te);
    el.removeEventListener('mousedown', md);
    document.removeEventListener('mousemove', mm);
    document.removeEventListener('mouseup', mu);
  };
}

/**
 * Buttons under the fingers: elements with data-btn (a standard button index)
 * or data-axis ("x,y", a stick push while held). A finger slides from one
 * button to the next.
 */
export class SlideButtons {
  private readonly under = new Map<number, HTMLElement | null>();
  private readonly els: HTMLElement[];

  constructor(private readonly root: HTMLElement, private readonly part: string) {
    this.els = [...root.querySelectorAll<HTMLElement>('[data-btn],[data-axis]')];
  }

  /** The button under a point (inside this root), if any. */
  at(x: number, y: number): HTMLElement | null {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-btn],[data-axis]') ?? null;
    return el && this.root.contains(el) ? el : null;
  }

  start(f: Finger): void { this.under.set(f.id, this.at(f.x, f.y)); this.refresh(); }
  move(f: Finger): void { if (this.under.has(f.id)) { this.under.set(f.id, this.at(f.x, f.y)); this.refresh(); } }
  end(f: Finger): void { if (this.under.delete(f.id)) this.refresh(); }
  has(id: number): boolean { return this.under.has(id); }

  private refresh(): void {
    let bits = 0;
    let ax = 0;
    let ay = 0;
    const on = new Set(this.under.values());
    for (const el of on) {
      if (!el) continue;
      if (el.dataset.btn) bits |= 1 << Number(el.dataset.btn);
      if (el.dataset.axis) { const [x, y] = el.dataset.axis.split(',').map(Number); ax += x; ay += y; }
    }
    for (const el of this.els) el.classList.toggle('on', on.has(el));
    hold(this.part, bits);
    stick(this.part, ax, ay);
  }
}

/**
 * A floating stick: it centres wherever the thumb lands in its zone, full tilt
 * at `reach` of the base's size. `base` holds a `.knob` child.
 */
export class FloatingStick {
  private finger: number | null = null;
  private ox = 0;
  private oy = 0;
  /** The current push (-1..1, y down) and when the thumb landed. */
  x = 0;
  y = 0;
  since = 0;

  constructor(private readonly zone: HTMLElement, private readonly base: HTMLElement, private readonly part: string, private readonly reach = 0.38) {}

  get active(): boolean { return this.finger !== null; }
  owns(id: number): boolean { return this.finger === id; }

  start(f: Finger): boolean {
    if (this.finger !== null) return false;
    this.finger = f.id;
    this.ox = f.x; this.oy = f.y;
    this.since = performance.now();
    const r = this.zone.getBoundingClientRect();
    this.base.style.left = `${f.x - r.left}px`;
    this.base.style.top = `${f.y - r.top}px`;
    this.base.classList.add('on');
    this.zone.classList.add('touched');
    this.move(f);
    return true;
  }

  move(f: Finger): void {
    if (f.id !== this.finger) return;
    const R = this.base.offsetWidth * this.reach;
    let dx = (f.x - this.ox) / R;
    let dy = (f.y - this.oy) / R;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    this.x = dx; this.y = dy;
    const knob = this.base.querySelector<HTMLElement>('.knob');
    if (knob) knob.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
    stick(this.part, dx, dy);
  }

  end(f: Finger): void {
    if (f.id !== this.finger) return;
    this.release();
  }

  release(): void {
    this.finger = null;
    this.x = this.y = 0;
    const knob = this.base.querySelector<HTMLElement>('.knob');
    if (knob) knob.style.transform = '';
    this.base.classList.remove('on');
    stick(this.part, 0, 0);
  }
}
