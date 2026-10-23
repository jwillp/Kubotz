/** Whether the neon look (fx/Neon.ts) is on: kept apart so the backdrops can read it without the image code. */
const STYLE_KEY = 'kubotz.neon';

/** ?neon=1 / ?neon=0, else the last choice, off by default. */
function startStyle(): boolean {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('neon');
  if (q) return q !== '0';
  try { const v = localStorage.getItem(STYLE_KEY); return v === null ? false : v === '1'; } catch { return false; }
}

export const neon = { on: startStyle() };

export function setNeon(on: boolean): void {
  neon.on = on;
  try { localStorage.setItem(STYLE_KEY, on ? '1' : '0'); } catch { /* private window */ }
}
