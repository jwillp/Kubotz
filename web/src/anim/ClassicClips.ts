import { CLIPS, type Clip, type ClipData } from './Clips';

/**
 * TEMPORARY (debug comparison): the clips as on dev before the Smash moves,
 * for the move list's Classic / SSB toggle: src/classic/clips holds dev's
 * versions of the clips the Smash moves replaced; every other clip is the
 * live one. Remove once the moves are settled.
 */
const FILES = import.meta.glob('../classic/clips/*.json', { eager: true, import: 'default' }) as Record<string, ClipData>;
const OLD: Record<string, Clip> = Object.fromEntries(Object.entries(FILES).map(([path, c]) => {
  const name = path.split('/').pop()!.replace(/\.json$/, '');
  return [name, { name, ...c }];
}));

export const CLASSIC_CLIPS: Record<string, Clip> = new Proxy({} as Record<string, Clip>, {
  get: (_, k) => (typeof k === 'string' ? OLD[k] ?? CLIPS[k] : undefined),
  has: (_, k) => typeof k === 'string' && (k in OLD || k in CLIPS),
});
