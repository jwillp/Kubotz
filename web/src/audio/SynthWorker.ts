/**
 * Makes the synth sounds (Synth.ts) off the page's thread: the loops over
 * whole buffers take a moment, and the load screen should not wait on them.
 * Each sound comes back as its samples; Sounds.ts wraps them in AudioBuffers.
 */
import type { SoundDef } from './SoundDef';
import { synthSamples } from './Synth';

self.onmessage = (e: MessageEvent<{ rate: number; defs: Record<string, SoundDef> }>) => {
  const { rate, defs } = e.data;
  for (const key of Object.keys(defs)) {
    const data = synthSamples(key, rate, defs);
    (self as unknown as Worker).postMessage({ key, data }, [data.buffer]);
  }
  (self as unknown as Worker).postMessage({ done: true });
};
