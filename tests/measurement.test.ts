import test from 'node:test';
import assert from 'node:assert/strict';
import { DspEngine } from '../src/lib/dsp/engine.ts';
import { analyzeAudio } from '../src/lib/dsp/offline.ts';
import { QualityTracker } from '../src/lib/measurement/quality.ts';
import { spectralSimilarity, spectralFlatness } from '../src/lib/measurement/similarity.ts';
import { assessRepeatability, type MeasuredSnapshot } from '../src/lib/measurement/repeatability.ts';
import { assessEngineRepeatability, type MeasuredEngineSnapshot } from '../src/lib/domains/engine/repeatability.ts';
import { captureEngineSnapshot, analyzeEngine } from '../src/lib/domains/engine/analysis.ts';
import { createMeasurementExport, validateMeasurementExport } from '../src/lib/measurement/export.ts';
import { referenceSignal, validateReference, REFERENCE_CASES } from '../src/lib/validation/reference.ts';
import type { CaptureMetadata } from '../src/lib/audio/live-types.ts';
import type { Spectrum } from '../src/lib/dsp/types.ts';

const tone = (hz = 440, amplitude = 0.2, rate = 48000) => new DspEngine(rate, 8192).analyze(Float32Array.from({ length: 8192 }, (_, i) => amplitude * Math.sin(2 * Math.PI * hz * i / rate)));
const metadata = (time = 3, overrides: Partial<CaptureMetadata> = {}): CaptureMetadata => ({ mode: 'worklet', clock: 'audio-context', clockId: 'clock-a', frameStart: Math.round(time * 48000 - 4096), timeSeconds: time, sequence: Math.round(time * 10), droppedFrames: 0, discontinuities: 0, ...overrides });
const history = (spectrum: Spectrum, tracker = new QualityTracker()) => { for (let i = 0; i <= 30; i++) tracker.update(spectrum, metadata(i / 10)); return tracker; };
let next = 0;
function measured(spectrum = tone(), overrides: Partial<CaptureMetadata> = {}): MeasuredSnapshot {
  const capture = metadata(3, { clockId: `clock-${next++}`, ...overrides });
  const tracker = new QualityTracker(); for (let i = 0; i <= 30; i++) tracker.update(spectrum, { ...capture, timeSeconds: i / 10 });
  return { label: 'Test', capturedAt: '2026-09-25T10:00:00.000Z', source: 'live frame', spectrum, acquisition: capture,
    measurement: { id: `snapshot-${next++}`, notes: '', durationSeconds: spectrum.fftSize / spectrum.sampleRate, quality: tracker.report(spectrum, capture) } };
}
const near = (a: number, b: number, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≈ ${b}`);
test('Quality identifies possible clipping using actual raw sample peak', () => {
  const s = tone(440, 1), q = history(s).report(s, metadata());
  assert.ok(q.clippedFrames > 0); assert.ok(q.issues.some(i => i.code === 'clipping'));
});
test('Low signal and silence never imply good signal quality or similarity', () => {
  for (const amplitude of [0, 1e-8, 1e-4]) {
    const s = tone(440, amplitude), q = history(s).report(s, metadata());
    assert.ok(q.issues.some(i => i.code === 'low-signal')); assert.equal(assessRepeatability([measured(s), measured(s)]).status, 'LOW SIGNAL');
  }
  assert.equal(spectralSimilarity(tone(440, 0), tone(440, 0)).value, null);
});
test('Seeded broadband noise flags spectral broadness without calling it a fault', () => {
  let seed = 19;
  const s = new DspEngine(48000, 8192).analyze(Float32Array.from({ length: 8192 }, () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed / 2 ** 32 - 0.5) * 0.2; }));
  assert.ok(spectralFlatness(s)! > 0.35); assert.ok(history(s).report(s, metadata()).issues.some(i => i.code === 'broadband'));
  assert.ok(spectralFlatness(tone())! < 0.01);
});
test('Dropped/discontinuous capture remains visible and prevents good-match assessment', () => {
  const s = tone(), tracker = history(s); tracker.update(s, metadata(3.1, { droppedFrames: 2, discontinuities: 1 }));
  const q = tracker.report(s, metadata(3.1));
  assert.ok(q.issues.some(i => i.code === 'dropped-frames')); assert.ok(q.issues.some(i => i.code === 'discontinuities'));
  const a = measured(s); a.measurement.quality = q; assert.equal(assessRepeatability([a, measured(s)]).status, 'REVIEW QUALITY');
});
test('Insufficient duration, changed level and strongest frequency are explicit evidence', () => {
  const s = tone(), tracker = new QualityTracker(); tracker.update(s, metadata(0));
  assert.ok(tracker.report(s, metadata(0)).issues.some(i => i.code === 'insufficient-duration'));
  history(s, tracker); const changed = tone(1000, 0.4); tracker.update(changed, metadata(3.1));
  const codes = tracker.report(changed, metadata(3.1)).issues.map(i => i.code);
  assert.ok(codes.includes('level-changing')); assert.ok(codes.includes('peak-changing'));
});
test('Quality history stays bounded and clock restart clears accumulated flags', () => {
  const s = tone(), tracker = new QualityTracker();
  for (let i = 0; i < 4000; i++) tracker.update(s, metadata(i / 1000, { droppedFrames: 1 }));
  const q = tracker.report(s, metadata(4)); assert.ok(q.recentFrameCount <= 512); assert.equal(q.frameCount, 4000);
  tracker.update(s, metadata(0, { clockId: 'new' })); assert.equal(tracker.report(s, metadata(0, { clockId: 'new' })).droppedFrames, 0);
});
test('Overlapping frames do not double-count observed coverage', () => {
  const s = tone(), tracker = new QualityTracker(), duration = 8192 / 48000;
  for (let i = 0; i < 20; i++) tracker.update(s, metadata(i * duration / 2));
  near(tracker.report(s, metadata()).coverageSeconds!, duration + 19 * duration / 2);
});
test('Fallback and whole-file average never claim continuous temporal validation', () => {
  const s = tone(), tracker = history(s); tracker.update(s, metadata(3.1, { mode: 'sampled' }));
  const q = tracker.report(s, metadata(3.1, { mode: 'sampled' })); assert.equal(q.coverageSeconds, null); assert.ok(q.issues.some(i => i.code === 'mode-changed'));
  tracker.reset(); const file = metadata(5, { mode: 'file', durationSeconds: 5 }); tracker.update(s, file);
  const fq = tracker.report(s, file); assert.equal(fq.sessionSpanSeconds, 5); assert.equal(fq.stabilityAvailable, false); assert.ok(fq.issues.some(i => i.code === 'temporal-unavailable'));
});
test('Reference changes and unresolved window limitations are quality observations', () => {
  const s = tone(), tracker = history(s); tracker.contextChanged();
  const q = tracker.report(s, metadata(), true); assert.ok(q.issues.some(i => i.code === 'context-changing')); assert.ok(q.issues.some(i => i.code === 'resolution'));
});
test('Silent intervals, timestamp gaps and active microphone processing cannot appear stable', () => {
  const s = tone(), tracker = history(s); tracker.update(tone(440, 0), metadata(3.1)); tracker.update(s, metadata(3.2));
  assert.ok(tracker.report(s, metadata(3.2)).issues.some(i => i.code === 'level-changing'));
  const capture = metadata(4, { browserEvidence: { audioWorkletAvailable: true, outputBaseLatencySeconds: 0.01, processing: { autoGainControl: true, noiseSuppression: false, echoCancellation: false } } });
  tracker.update(s, capture); const q = tracker.report(s, capture);
  assert.ok(q.issues.some(i => i.code === 'observation-gaps')); assert.ok(q.issues.some(i => i.code === 'processing-active'));
});
test('Spectral overlap agrees with a hand-calculated normalized-power example', () => {
  const a = tone(), b = tone(); a.power.fill(0); b.power.fill(0); a.power[20] = 0.09; b.power[20] = 0.03; b.power[40] = 0.01;
  near(spectralSimilarity(a, b).value!, Math.sqrt(0.75));
});
test('Identical spectra overlap at one, gain changes preserve shape but not RMS', () => {
  near(spectralSimilarity(tone(), tone()).value!, 1); near(spectralSimilarity(tone(440, 0.2), tone(440, 0.4)).value!, 1);
  const report = assessRepeatability([measured(), measured(tone(440, 0.4))]); assert.equal(report.status, 'SIGNALS DIFFER'); near(report.pairs[0].rmsDeltaDb!, 6.0205999, 1e-5);
});
test('Disjoint tone content has near-zero overlap and fails repeatability', () => {
  assert.ok(spectralSimilarity(tone(100), tone(1000)).value! < 0.01);
  assert.equal(assessRepeatability([measured(tone(100)), measured(tone(1000))]).status, 'SIGNALS DIFFER');
});
test('Noise floors suppress irrelevant tails and coefficient is symmetric/bounded', () => {
  const a = tone(), b = tone(); b.power[2000] = 1e-15;
  near(spectralSimilarity(a, b).value!, 1);
  for (const hz of [100, 430, 440, 442, 450, 1000]) { const s = tone(hz), ab = spectralSimilarity(a, s).value!; assert.ok(ab >= 0 && ab <= 1); near(ab, spectralSimilarity(s, a).value!); }
});
test('Mismatched sample rates, FFTs and actual window supports are rejected', () => {
  assert.equal(spectralSimilarity(tone(), tone(440, 0.2, 44100)).value, null);
  const short = tone(); short.windowSamples = 1024; assert.equal(spectralSimilarity(tone(), short).value, null);
  const small = new DspEngine(48000, 4096).analyze(new Float32Array(4096)); assert.equal(spectralSimilarity(tone(), small).value, null);
});
test('Repeatability compares all pairs, requires distinct source intervals and is bounded', () => {
  const records = [measured(), measured(), measured()]; const r = assessRepeatability(records); assert.equal(r.status, 'GOOD MATCH'); assert.equal(r.pairs.length, 3);
  assert.equal(assessRepeatability([records[0], records[0]]).status, 'INSUFFICIENT DATA');
  assert.equal(assessRepeatability([]).status, 'INSUFFICIENT DATA'); assert.throws(() => assessRepeatability(Array.from({ length: 7 }, () => measured())));
});
test('Matching spectral shape does not override RPM or unknown-context cautions', () => {
  const engine = (rpm: number | null): MeasuredEngineSnapshot => { const s = measured(); return { ...captureEngineSnapshot(s, analyzeEngine(s.spectrum, { rpm, cylinders: 4, cycle: 4, harmonicHz: 440 }), s.acquisition), measurement: s.measurement }; };
  assert.equal(assessEngineRepeatability([engine(800), engine(1500)]).status, 'CONDITIONS DIFFER');
  assert.equal(assessEngineRepeatability([engine(null), engine(null)]).status, 'CONTEXT UNVERIFIED');
  const harmonic = (amplitude: number): MeasuredEngineSnapshot => {
    const samples = Float32Array.from({ length: 8192 }, (_, i) => 0.4 * Math.sin(2 * Math.PI * 100 * i / 48000) + amplitude * Math.sin(2 * Math.PI * 200 * i / 48000));
    const s = measured(new DspEngine(48000, 8192).analyze(samples));
    return { ...captureEngineSnapshot(s, analyzeEngine(s.spectrum, { rpm: 1800, cylinders: 4, cycle: 4, harmonicHz: 100 }), s.acquisition), measurement: s.measurement };
  };
  const changed = assessEngineRepeatability([harmonic(0.02), harmonic(0.005)]);
  assert.ok(changed.pairs[0].similarity! > 0.99); assert.ok(changed.pairs[0].harmonicMaxDeltaDb! > 10); assert.equal(changed.status, 'SIGNALS DIFFER');
});
for (const rate of [44100, 48000, 96000]) test(`All known reference cases validate at ${rate} Hz`, () => {
  for (const name of REFERENCE_CASES) { const reference = referenceSignal(name, rate); const result = validateReference(name, analyzeAudio(reference.samples, rate, 8192)); assert.ok(result.passed, JSON.stringify(result)); }
});
test('Reference noise is deterministic and incorrect results fail validation', () => {
  assert.deepEqual(referenceSignal('Noise + tone').samples, referenceSignal('Noise + tone').samples);
  assert.equal(validateReference('440 Hz', analyzeAudio(referenceSignal('1000 Hz').samples, 48000, 8192)).passed, false);
  assert.throws(() => referenceSignal('440 Hz', 1));
});
test('Export round-trips plain spectrum arrays and schema version without PCM or device identifiers', () => {
  const s = measured(); s.measurement.notes = 'same position';
  s.acquisition.browserEvidence = { audioWorkletAvailable: true, outputBaseLatencySeconds: 0.01, processing: { autoGainControl: false, noiseSuppression: false, echoCancellation: false } };
  Object.assign(s.acquisition.browserEvidence, { deviceId: 'must-not-export' });
  const doc = createMeasurementExport([s], { ab: null, repeatability: assessRepeatability([s]) }, { browserFamily: 'Not tested', observations: '', checks: [] });
  const plain = JSON.parse(JSON.stringify(doc)); assert.deepEqual(validateMeasurementExport(plain), []); assert.equal(plain.schemaVersion, 'workshopgirl.measurement/1');
  assert.equal(plain.measurements[0].spectrum.power.length, 4097); assert.deepEqual(plain.measurements[0].spectrum.power, Array.from(s.spectrum.power));
  for (const key of ['samples', 'deviceId', 'groupId', 'userAgent']) assert.ok(!JSON.stringify(plain).includes(`"${key}"`));
});
test('Export represents negative-infinity silence explicitly and rejects malformed generated records', () => {
  const s = measured(tone(440, 0)), comparisons = { ab: null, repeatability: assessRepeatability([s]) };
  const doc = createMeasurementExport([s], comparisons, { browserFamily: '', observations: '', checks: [] }); assert.equal(doc.measurements[0].spectrum.rmsDbFS, null);
  for (const mutate of [(x: typeof doc) => { x.schemaVersion = 'future'; }, (x: typeof doc) => { x.measurements[0].spectrum.power = []; }, (x: typeof doc) => { x.measurements[0].spectrum.power[0] = -1; }, (x: typeof doc) => { x.measurements[0].acquisition.droppedFrames = -1; }]) {
    const bad = structuredClone(doc); mutate(bad); assert.ok(validateMeasurementExport(bad).length);
  }
  s.spectrum.power[0] = NaN; assert.throws(() => createMeasurementExport([s], comparisons, { browserFamily: '', observations: '', checks: [] }));
  const invalid = measured(); invalid.spectrum.rmsDbFS = NaN;
  assert.throws(() => createMeasurementExport([invalid], comparisons, { browserFamily: '', observations: '', checks: [] }));
});
