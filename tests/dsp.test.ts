import assert from 'node:assert/strict';
import test from 'node:test';
import { DspEngine } from '../src/lib/dsp/engine.ts';
import { fft } from '../src/lib/dsp/fft.ts';
import { analyzeAudio, waveformEnvelope } from '../src/lib/dsp/offline.ts';
import { compareSnapshots } from '../src/lib/dsp/comparison.ts';
import type { Snapshot } from '../src/lib/dsp/types.ts';

function signal(rate: number, frequencies: number[], length = 8192, amplitude = 0.2): Float32Array {
  return Float32Array.from({ length }, (_, i) => frequencies.reduce((sum, hz) => sum + amplitude * Math.sin(2 * Math.PI * hz * i / rate), 0));
}
function near(actual: number, expected: number, tolerance: number) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}`);
}

for (const sampleRate of [44100, 48000, 96000]) {
  for (const hz of [100, 440]) {
    test(`${hz} Hz sine at ${sampleRate} Hz`, t => {
      const result = new DspEngine(sampleRate, 8192).analyze(signal(sampleRate, [hz]));
      near(result.peaks[0].frequency, hz, result.resolution);
      t.diagnostic(`detected=${result.peaks[0].frequency.toFixed(4)} Hz; tolerance=one bin (${result.resolution.toFixed(4)} Hz)`);
    });
  }
  test(`100 + 440 + 1000 Hz mixture at ${sampleRate} Hz`, t => {
    const result = new DspEngine(sampleRate, 8192).analyze(signal(sampleRate, [100, 440, 1000]));
    for (const hz of [100, 440, 1000]) assert.ok(result.peaks.some(peak => Math.abs(peak.frequency - hz) <= result.resolution));
    t.diagnostic(result.peaks.map(peak => peak.frequency.toFixed(4)).join(', ') + ' Hz');
  });
  test(`Seeded noise plus 440 Hz at ${sampleRate} Hz`, t => {
    let seed = 7264;
    const samples = signal(sampleRate, [440]);
    for (let i = 0; i < samples.length; i++) { seed = (1664525 * seed + 1013904223) >>> 0; samples[i] += (seed / 2 ** 32 - 0.5) * 0.3; }
    const result = new DspEngine(sampleRate, 8192).analyze(samples);
    near(result.peaks[0].frequency, 440, result.resolution);
    t.diagnostic(`detected=${result.peaks[0].frequency.toFixed(4)} Hz`);
  });
  test(`Silence, near silence and DC at ${sampleRate} Hz`, () => {
    const engine = new DspEngine(sampleRate, 8192);
    assert.equal(engine.analyze(new Float32Array(8192)).peaks.length, 0);
    assert.equal(engine.analyze(signal(sampleRate, [440], 8192, 1e-8)).peaks.length, 0);
    assert.equal(engine.analyze(new Float32Array(8192).fill(0.5)).peaks.length, 0);
  });
}

test('FFT agrees with independent direct DFT including imaginary components', () => {
  const original = Float64Array.from({ length: 32 }, (_, i) => Math.sin(i * 1.31) + i / 50);
  const real = original.slice(), imaginary = new Float64Array(32); fft(real, imaginary);
  for (let k = 0; k < 32; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < 32; i++) { re += original[i] * Math.cos(-2 * Math.PI * k * i / 32); im += original[i] * Math.sin(-2 * Math.PI * k * i / 32); }
    near(real[k], re, 1e-11); near(imaginary[k], im, 1e-11);
  }
});
test('Coherent tonal amplitude, RMS and band energy have distinct correct normalization', () => {
  const rate = 48000, size = 4096, hz = 80 * rate / size;
  const result = new DspEngine(rate, size).analyze(signal(rate, [hz], size, 1));
  near(result.db[80], 0, 1e-5); near(result.rmsDbFS, -3.0102999566, 1e-5);
  near(result.power.reduce((a, b) => a + b, 0), 0.5, 1e-7);
  near(result.bands[1].percent, 100, 1e-5); assert.equal(result.clipped, true);
});
test('Nyquist has no erroneous doubling', () => {
  const result = new DspEngine(48000, 4096).analyze(Float32Array.from({ length: 4096 }, (_, i) => i % 2 ? -0.5 : 0.5));
  near(result.amplitude[2048], 0.5, 1e-10);
  near(result.power.reduce((a, b) => a + b, 0), 0.25, 1e-10);
});
test('Hann suppresses leakage away from an off-bin tone', () => {
  const result = new DspEngine(48000, 4096).analyze(signal(48000, [1000], 4096));
  assert.ok(result.db[150] < result.peaks[0].dbFS - 70);
});
test('Every FFT setting preserves frequencies at supported rates', () => {
  for (const size of [2048, 4096, 8192]) for (const rate of [44100, 48000, 96000]) {
    const result = new DspEngine(rate, size).analyze(signal(rate, [440], size));
    near(result.peaks[0].frequency, 440, rate / size);
  }
});
test('Offline spectrogram tracks a tone change in time and includes the file tail', () => {
  const rate = 48000, samples = new Float32Array(rate * 2);
  samples.set(signal(rate, [440], rate)); samples.set(signal(rate, [1000], rate), rate);
  const result = analyzeAudio(samples, rate);
  const strongest = (column: Float32Array) => column.indexOf(Math.max(...column)) * rate / 4096;
  near(strongest(result.spectrogram.columns[0]), 440, rate / 4096);
  near(strongest(result.spectrogram.columns.at(-1)!), 1000, rate / 4096);
  assert.equal(result.frameCount, Math.ceil((samples.length - 4096) / 2048) + 1);
  near(result.spectrogram.times.at(-1)!, 2 - 4096 / rate / 2, 1e-8);
  for (const hz of [440, 1000]) assert.ok(result.spectrum.peaks.some(p => Math.abs(p.frequency - hz) < result.spectrum.resolution));
});
test('Short clips use their actual Hann window support with zero padding', () => {
  const result = analyzeAudio(signal(48000, [1000], 480), 48000, 4096);
  near(result.spectrum.peaks[0].frequency, 1000, 48000 / 4096);
  near(result.spectrum.peaks[0].dbFS, 20 * Math.log10(0.2), 0.2);
});
test('Long file display memory is bounded while all frames are analyzed', () => {
  const result = analyzeAudio(signal(48000, [440], 48000 * 20), 48000, 2048);
  assert.equal(result.spectrogram.columns.length, 400); assert.ok(result.frameCount > 900);
  assert.equal(result.waveform.min.length, 1000);
});
test('Waveform envelope preserves a one-sample transient', () => {
  const samples = new Float32Array(10000); samples[583] = -0.9;
  near(Math.min(...waveformEnvelope(samples, 100).min), -0.9, 1e-6);
});
test('Comparison reports a known 6.0206 dB gain change and warns on mismatched settings', () => {
  const make = (amplitude: number): Snapshot => ({ label: 'test', source: 'file average', capturedAt: '2026-09-25', spectrum: new DspEngine(48000, 8192).analyze(signal(48000, [440], 8192, amplitude)) });
  const a = make(0.2), b = make(0.4);
  near(compareSnapshots(a, b).levelDelta!, 6.020599913, 1e-6); assert.ok(compareSnapshots(a, b).comparable);
  b.source = 'live frame'; assert.equal(compareSnapshots(a, b).comparable, false);
  b.spectrum.rmsDbFS = -Infinity; assert.equal(compareSnapshots(a, b).levelDelta, null);
});
test('Invalid data and transform configurations fail explicitly', () => {
  assert.throws(() => new DspEngine(0)); assert.throws(() => new DspEngine(48000, 3000));
  assert.throws(() => new DspEngine(48000).analyze(new Float32Array([NaN, 0])));
  assert.throws(() => analyzeAudio(new Float32Array(0), 48000));
});
