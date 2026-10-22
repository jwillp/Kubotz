/**
 * Makes the synth sounds (Synth.ts) off the page's thread: the loops over
 * whole buffers take a moment, and the load screen should not wait on them.
 * Each sound comes back as its samples; Sounds.ts wraps them in AudioBuffers.
 */
import { SYNTH_SOUNDS } from './Synth';

self.onmessage = (e: MessageEvent<{ rate: number }>) => {
  const rate = e.data.rate;
  for (const [key, make] of Object.entries(SYNTH_SOUNDS)) {
    let data = new Float32Array(0);
    // Just enough of an AudioContext for the synth functions: a buffer to write into.
    const ctx = {
      sampleRate: rate,
      createBuffer: (_channels: number, length: number) => {
        data = new Float32Array(length);
        return { getChannelData: () => data };
      },
    } as unknown as BaseAudioContext;
    make(ctx);
    (self as unknown as Worker).postMessage({ key, data }, [data.buffer]);
  }
  (self as unknown as Worker).postMessage({ done: true });
};
