/**
 * Hover help for the editor: rest the pointer on anything with a
 * data-help (or a title) for a moment, or long-press it on a touch screen,
 * and a short explanation shows next to it.
 */

const DELAY = 550;
const LONG_PRESS = 450;

export function installHelp(root: HTMLElement): void {
  const tip = document.createElement('div');
  tip.className = 'help-tip';
  tip.hidden = true;
  document.body.append(tip);
  let timer = 0;
  let shownFor: HTMLElement | null = null;

  const target = (e: Event): HTMLElement | null => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-help],[title]') ?? null;
    if (el?.title) { el.dataset.help = el.title; el.removeAttribute('title'); }
    return el && root.contains(el) ? el : null;
  };
  const hide = () => { clearTimeout(timer); tip.hidden = true; shownFor = null; };
  const show = (el: HTMLElement, x?: number, y?: number) => {
    const text = el.dataset.help;
    if (!text) return;
    tip.textContent = text;
    tip.hidden = false;
    shownFor = el;
    const r = el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    // Below the element (or the finger), else above; kept inside the window.
    const ax = x ?? r.left + r.width / 2;
    let top = (y ?? r.bottom) + 8;
    if (top + t.height > innerHeight - 8) top = (y ?? r.top) - t.height - 8;
    tip.style.left = `${Math.max(8, Math.min(innerWidth - t.width - 8, ax - t.width / 2))}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  };

  root.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = target(e);
    if (el === shownFor) return;
    hide();
    if (el) timer = window.setTimeout(() => show(el), DELAY);
  });
  root.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'mouse' && !(e.relatedTarget instanceof Node && shownFor?.contains(e.relatedTarget))) hide();
  });
  root.addEventListener('pointerdown', (e) => {
    hide();
    if (e.pointerType === 'mouse') return;
    const el = target(e);
    if (el) timer = window.setTimeout(() => show(el, e.clientX, e.clientY), LONG_PRESS);
  });
  root.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    clearTimeout(timer);
    if (shownFor) timer = window.setTimeout(hide, 2500);
  });
  root.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && !shownFor && (Math.abs(e.movementX) + Math.abs(e.movementY) > 4)) clearTimeout(timer); });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('keydown', hide);
}
