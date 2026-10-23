import { describe, expect, it } from 'vitest';
import { renderSound, sweepAt, type SoundDef } from './SoundDef';
import { GAME_SOUNDS, SOUND_FILES, synthSamples } from './Synth';
import { decodeWav, encodeWav, zip } from './Wav';

const peak = (d: Float32Array) => d.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

describe('sound files', () => {
  it('has every sound the game plays', () => {
    for (const k of GAME_SOUNDS) expect(SOUND_FILES[k], k).toBeTruthy();
  });
  it('renders each one audible, finite and below clipping, the same every time', () => {
    for (const key of Object.keys(SOUND_FILES)) {
      const d = synthSamples(key, 44100);
      expect(d.length, key).toBe(Math.floor(44100 * SOUND_FILES[key].length));
      expect(d.every(Number.isFinite), key).toBe(true);
      expect(peak(d), key).toBeGreaterThan(0.01);
      expect(peak(d), key).toBeLessThan(1);
      expect(synthSamples(key, 44100), key).toEqual(d);
    }
  });
});

describe('renderSound', () => {
  const beep: SoundDef = { length: 0.2, layers: [{ type: 'tone', at: 0, dur: 0.05, gain: 0.5, freq: { from: 440 } }] };
  it('sweeps', () => {
    expect(sweepAt({ from: 100, to: 400, curve: 'exp' }, 0.5, 1)).toBeCloseTo(200);
    expect(sweepAt({ from: 100, to: 400 }, 0.25, 1)).toBeCloseTo(175);
    expect(sweepAt({ from: 100, to: 400, time: 0.5 }, 2, 1)).toBe(400);
  });
  it('echoes with a delay', () => {
    const dry = renderSound(beep, 8000);
    const wet = renderSound({ ...beep, delay: { time: 0.1, feedback: 0.3, mix: 0.5 } }, 8000);
    expect(peak(dry.subarray(900))).toBe(0);
    expect(peak(wet.subarray(800, 1200))).toBeGreaterThan(0.1);
  });
  it('mixes another sound in, pitched, and leaves out loops', () => {
    const defs: Record<string, SoundDef> = {
      beep,
      up: { length: 0.2, layers: [{ type: 'sound', at: 0, gain: 1, sound: 'beep', pitch: 12 }] },
      loop: { length: 0.2, layers: [{ type: 'sound', at: 0, gain: 1, sound: 'loop' }, { type: 'sound', at: 0, gain: 1, sound: 'beep' }] },
    };
    const up = synthSamples('up', 8000, defs);
    // An octave up plays twice as fast: the 50 ms beep lasts 25 ms.
    expect(peak(up.subarray(0, 190))).toBeGreaterThan(0.3);
    expect(peak(up.subarray(210))).toBe(0);
    expect(synthSamples('loop', 8000, defs)).toEqual(synthSamples('beep', 8000, defs));
  });
});

describe('Wav', () => {
  it('round-trips samples within 16-bit precision', () => {
    const d = synthSamples('ui-confirm', 22050);
    const wav = encodeWav(d, 22050);
    expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe('RIFF');
    const back = decodeWav(wav);
    expect(back.rate).toBe(22050);
    expect(back.samples.length).toBe(d.length);
    for (let i = 0; i < d.length; i += 97) expect(Math.abs(back.samples[i] - d[i])).toBeLessThan(1e-4);
  });
  it('zips files', () => {
    const z = zip({ 'a.wav': new Uint8Array([1, 2, 3]) });
    expect(new DataView(z.buffer).getUint32(0, true)).toBe(0x04034b50);
    expect(z.length).toBe(30 + 5 + 3 + 46 + 5 + 22);
  });
});
