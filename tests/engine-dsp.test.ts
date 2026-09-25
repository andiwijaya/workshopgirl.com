import assert from 'node:assert/strict';
import test from 'node:test';
import { DspEngine } from '../src/lib/dsp/engine.ts';
import { analyzeAudio } from '../src/lib/dsp/offline.ts';
import { analyzeHarmonics } from '../src/lib/dsp/harmonics.ts';
import { PeakTracker } from '../src/lib/dsp/peak-tracker.ts';
import { spectralDifference } from '../src/lib/dsp/spectral-comparison.ts';
import { shaftFrequency, firingFrequency, engineReferences, emptyEngineConfiguration } from '../src/lib/domains/engine/references.ts';
import { analyzeEngine, captureEngineSnapshot } from '../src/lib/domains/engine/analysis.ts';
import { compareEngineSnapshots } from '../src/lib/domains/engine/comparison.ts';
import { validRpmSample } from '../src/lib/domains/rpm-stream.ts';
import type { CaptureMetadata } from '../src/lib/audio/live-types.ts';

const signal = (rate: number, tones: [number, number][], length = 8192) => Float32Array.from({ length }, (_, i) => tones.reduce((sum, [frequency, amplitude]) => sum + amplitude * Math.sin(2 * Math.PI * frequency * i / rate), 0));
const spectrum = (tones: [number, number][], rate = 48000) => new DspEngine(rate, 8192).analyze(signal(rate, tones));
const near = (actual: number, expected: number, tolerance: number) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}`);
const metadata: CaptureMetadata = { mode: 'worklet', clock: 'audio-context', clockId: 'test-clock', frameStart: 4096, timeSeconds: 8192 / 48000, sequence: 1, droppedFrames: 0, discontinuities: 0 };
const snapshot = (rpm = 1800, amplitude = 0.2) => {
  const s = spectrum([[100, amplitude], [200, amplitude / 2], [300, amplitude / 4]]);
  return captureEngineSnapshot({ label: 'Engine', source: 'live frame', capturedAt: '2026-09-25T13:00:00Z', spectrum: s }, analyzeEngine(s, { rpm, cylinders: 4, cycle: 4, harmonicHz: 100 }), metadata);
};

test('RPM references: 1800 RPM is 30 Hz; fractional shaft orders are correct', () => {
  assert.equal(shaftFrequency(1800), 30); assert.equal(shaftFrequency(0), 0);
  assert.deepEqual(engineReferences({ ...emptyEngineConfiguration(), rpm: 1800 }).map(r => r.frequency), [15, 30, 60, 90, 120]);
  assert.deepEqual(engineReferences(emptyEngineConfiguration()), []);
});
test('Conventional four-stroke firing reference', () => { assert.equal(firingFrequency(1800, 4, 4), 60); assert.equal(firingFrequency(800, 6, 4), 40); });
test('Conventional two-stroke firing reference', () => { assert.equal(firingFrequency(1800, 4, 2), 120); assert.equal(firingFrequency(6000, 1, 2), 100); });
test('Invalid engine inputs are rejected rather than silently interpreted', () => {
  for (const rpm of [-1, Infinity, NaN]) assert.throws(() => shaftFrequency(rpm));
  assert.throws(() => firingFrequency(1800, 2.5, 4));
  assert.throws(() => engineReferences({ ...emptyEngineConfiguration(), rpm: 30001 }));
});
for (const rate of [44100, 48000, 96000]) {
  test(`100/200/300/400 Hz harmonic structure and amplitudes at ${rate}`, t => {
    const s = spectrum([[100, 0.4], [200, 0.2], [300, 0.1], [400, 0.05]], rate);
    const result = analyzeHarmonics(s, 100);
    assert.equal(result.matchedCount, 4); assert.equal(result.harmonics[4].state, 'absent');
    result.harmonics.slice(0, 4).forEach((h, index) => { near(h.detectedHz!, (index + 1) * 100, s.resolution); near(h.dbFS!, 20 * Math.log10(0.4 / 2 ** index), 0.5); near(h.relativeDb!, -6.0206 * index, 0.5); });
    assert.ok(result.powerPercent > 95 && result.powerPercent <= 100);
    t.diagnostic(result.harmonics.slice(0, 4).map(h => `${h.detectedHz!.toFixed(3)} Hz / ${h.dbFS!.toFixed(3)} dBFS`).join('; '));
  });
}
test('Missing fundamental is reported absent without inventing its level', () => {
  const result = analyzeHarmonics(spectrum([[200, 0.3], [300, 0.2], [400, 0.1]]), 100);
  assert.equal(result.harmonics[0].state, 'absent'); assert.equal(result.harmonics[0].dbFS, null); assert.equal(result.matchedCount, 3);
});
test('Stronger higher harmonic does not replace the supplied 100 Hz reference', () => {
  const result = analyzeHarmonics(spectrum([[100, 0.05], [200, 0.4], [300, 0.1]]), 100);
  assert.equal(result.referenceHz, 100); near(result.harmonics[1].relativeDb!, 0, 1e-8); assert.ok(result.harmonics[0].relativeDb! < -17);
});
test('Unrelated tones are not matched to the harmonic lattice', () => {
  assert.equal(analyzeHarmonics(spectrum([[137, 0.3], [257, 0.2], [371, 0.1]]), 100).matchedCount, 0);
});
test('Seeded noise plus harmonics preserves meaningful matches', () => {
  const samples = signal(48000, [[100, 0.3], [200, 0.2], [300, 0.1], [400, 0.08]]); let seed = 17;
  for (let i = 0; i < samples.length; i++) { seed = (1664525 * seed + 1013904223) >>> 0; samples[i] += (seed / 2 ** 32 - 0.5) * 0.12; }
  const result = analyzeHarmonics(new DspEngine(48000, 8192).analyze(samples), 100);
  assert.equal(result.matchedCount, 4);
});
test('Seeded broadband noise alone does not manufacture harmonic structure', () => {
  let seed = 26;
  const samples = Float32Array.from({ length: 8192 }, () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed / 2 ** 32 - 0.5) * 0.2; });
  assert.equal(analyzeHarmonics(new DspEngine(48000, 8192).analyze(samples), 100).matchedCount, 0);
});
test('Silence and near silence have no harmonic matches', () => {
  for (const amplitude of [0, 1e-8]) { const result = analyzeHarmonics(spectrum([[100, amplitude], [200, amplitude]]), 100); assert.equal(result.status, 'quiet'); assert.equal(result.matchedCount, 0); assert.equal(result.powerPercent, 0); }
});
test('Low references and short padded windows are unresolved, not falsely precise', () => {
  assert.equal(analyzeHarmonics(spectrum([[10, 0.3]]), 10).status, 'unresolved');
  const short = analyzeAudio(signal(48000, [[100, 0.3]], 480), 48000, 8192).spectrum;
  assert.equal(analyzeHarmonics(short, 100).status, 'unresolved');
  assert.equal(analyzeHarmonics(spectrum([[100, 0.3]]), null).status, 'no-reference');
  assert.throws(() => analyzeHarmonics(spectrum([[100, 0.3]]), NaN));
});
test('Harmonics above Nyquist are explicitly unavailable', () => {
  const result = analyzeHarmonics(spectrum([[10000, 0.2]]), 10000);
  assert.equal(result.harmonics[2].state, 'above-nyquist');
});
test('Engine references have explicit precedence without automatic fundamental inference', () => {
  const s = spectrum([[200, 0.3]]);
  assert.equal(analyzeEngine(s, emptyEngineConfiguration()).harmonicSource, 'strongest peak reference');
  assert.equal(analyzeEngine(s, { ...emptyEngineConfiguration(), rpm: 1800 }).harmonics.referenceHz, 30);
  assert.equal(analyzeEngine(s, { ...emptyEngineConfiguration(), rpm: 1800, cylinders: 4, cycle: 4 }).harmonics.referenceHz, 60);
});
test('Snapshots preserve deep copied spectrum, harmonics, references and acquisition context', () => {
  const s = spectrum([[100, 0.2]]), config = { rpm: 1800, cylinders: 4, cycle: 4 as const, harmonicHz: 100 };
  const observation = analyzeEngine(s, config);
  const saved = captureEngineSnapshot({ label: 'Before', source: 'live frame', capturedAt: '2026-09-25', spectrum: s }, observation, metadata);
  config.rpm = 900; s.db.fill(0); observation.harmonics.harmonics[0].dbFS = 0;
  assert.equal(saved.engine.configuration.rpm, 1800); assert.ok(saved.spectrum.db[1] < 0); assert.ok(saved.engine.harmonics.harmonics[0].dbFS! < -10);
  assert.equal(saved.acquisition.frameStart, 4096); assert.equal(saved.engine.references.at(-1)!.frequency, 60); assert.equal(saved.capturedAt, '2026-09-25');
  assert.equal(saved.acquisition.clockId, 'test-clock');
});
test('Compatible comparison gives known RMS, spectral and harmonic differences', () => {
  const comparison = compareEngineSnapshots(snapshot(1800, 0.2), snapshot(1800, 0.4));
  assert.equal(comparison.conditionsComparable, true); near(comparison.levelDelta!, 6.0206, 0.001);
  for (const h of comparison.harmonicDelta!.slice(0, 3)) near(h.dbDelta!, 6.0206, 0.001);
  near(comparison.harmonicPowerDeltaDb!, 6.0206, 0.001);
  assert.ok(comparison.spectral);
});
test('800 vs 1500 RPM and changed configuration warn explicitly', () => {
  const a = snapshot(800), b = snapshot(1500); b.engine.configuration.cycle = 2;
  const comparison = compareEngineSnapshots(a, b);
  assert.ok(comparison.warnings.some(w => w.includes('800') && w.includes('1500'))); assert.ok(comparison.warnings.some(w => w.includes('configurations'))); assert.equal(comparison.conditionsComparable, false);
});
test('Missing RPM, different source/FFT/rate and reference changes are not silently equivalent', () => {
  const a = snapshot(), b = snapshot(); b.engine.configuration.rpm = null; b.source = 'file average'; b.spectrum.sampleRate = 44100; b.spectrum.fftSize = 4096; b.engine.harmonics.referenceHz = 200;
  const result = compareEngineSnapshots(a, b);
  assert.ok(result.warnings.length >= 5); assert.equal(result.spectral, null); assert.equal(result.harmonicDelta, null);
});
test('Spectral subtraction only operates on equal grids and excludes values below the floor', () => {
  const a = spectrum([[100, 0.2]]), b = spectrum([[100, 0.4]]);
  const delta = spectralDifference(a, b)!;
  near(delta.dbDelta[a.peaks[0].bin], 6.0206, 0.001); assert.equal(delta.valid[3000], 0);
  assert.equal(spectralDifference(a, spectrum([[100, 0.2]], 44100)), null);
});
test('Capture gaps and acquisition-mode differences remain visible in snapshot comparisons', () => {
  const a = snapshot(), b = snapshot(); b.acquisition.mode = 'sampled'; b.acquisition.droppedFrames = 3; b.acquisition.discontinuities = 1;
  const comparison = compareEngineSnapshots(a, b);
  assert.equal(comparison.conditionsComparable, false);
  for (const term of ['Acquisition modes', 'skipped frames', 'discontinuities']) assert.ok(comparison.warnings.some(w => w.includes(term)));
});
test('Peak tracking confirms repeated components, measures movement, expires silence and resets gaps', () => {
  const tracker = new PeakTracker(); let tracks = tracker.update([], 0, 6);
  for (let i = 0; i < 8; i++) tracks = tracker.update([{ frequency: 100 + i, dbFS: -20, bin: 17 }], i * 0.1 + 0.01, 6);
  assert.equal(tracks.length, 1); near(tracks[0].movementHz, 7, 1e-8); assert.ok(tracks[0].persistenceSeconds >= 0.6);
  assert.deepEqual(tracker.update([], 1.1, 6), []);
  assert.deepEqual(tracker.update([{ frequency: 100, dbFS: -20, bin: 17 }], 5, 6), []);
});
test('Peak tracker rejects isolated/noise-level peaks, bounds tracks and ignores duplicate timestamps', () => {
  const tracker = new PeakTracker();
  for (let i = 0; i < 200; i++) assert.deepEqual(tracker.update([{ frequency: 100 + i * 40, dbFS: -20, bin: i }], i * 0.1, 6), []);
  tracker.reset();
  for (let i = 0; i < 10; i++) assert.deepEqual(tracker.update([{ frequency: 100, dbFS: -95, bin: 17 }], i * 0.1, 6), []);
  tracker.reset();
  const many = Array.from({ length: 50 }, (_, i) => ({ frequency: 100 + i * 50, dbFS: -20, bin: i * 10 }));
  let result = tracker.update(many, 0, 6);
  for (let i = 1; i < 10; i++) result = tracker.update(many, i * 0.1, 6);
  assert.ok(result.length <= 6); assert.equal(tracker.update(many, 0.9, 6)[0].observations, result[0].observations);
});
test('External RPM interface requires an explicit clock and finite timing uncertainty', () => {
  assert.ok(validRpmSample({ rpm: 1800, timestampSeconds: 2, clockId: 'device-clock', uncertaintySeconds: 0.02 }));
  assert.equal(validRpmSample({ rpm: NaN, timestampSeconds: 2, clockId: '', uncertaintySeconds: -1 }), false);
});
