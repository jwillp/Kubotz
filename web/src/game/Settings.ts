// Player settings kept in the browser (phase 11): volumes and visual effects.

export interface Settings {
  /** 0..1 */
  music: number;
  /** Sound effects, 0..1 */
  sfx: number;
  /** Visual effects intensity (particles, shake, flashes, bloom), 0..1 */
  vfx: number;
}

const KEY = 'kubotz.settings';
const DEFAULTS: Settings = { music: 0.8, sfx: 0.8, vfx: 1 };
let current: Settings = load();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* private window or blocked storage: defaults */ }
  return { ...DEFAULTS };
}

export const settings = (): Readonly<Settings> => current;

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* not saved */ }
}
