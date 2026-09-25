import { performance } from 'node:perf_hooks';
import { DspEngine } from '../src/lib/dsp/engine.ts';
import { referenceSignal } from '../src/lib/validation/reference.ts';
import { QualityTracker } from '../src/lib/measurement/quality.ts';
import { spectralSimilarity } from '../src/lib/measurement/similarity.ts';
import { assessRepeatability, type MeasuredSnapshot } from '../src/lib/measurement/repeatability.ts';
import { createMeasurementExport } from '../src/lib/measurement/export.ts';
import type { CaptureMetadata } from '../src/lib/audio/live-types.ts';
import { analyzeEngine } from '../src/lib/domains/engine/analysis.ts';
import { PeakTracker } from '../src/lib/dsp/peak-tracker.ts';
import { waveformEnvelope } from '../src/lib/dsp/offline.ts';

function benchmark(name: string, run: (i: number) => void, iterations = 1000) {
  for (let i = 0; i < 100; i++) run(i);
  const times: number[] = [];
  for (let i = 100; i < iterations + 100; i++) { const start = performance.now(); run(i); times.push(performance.now() - start); }
  times.sort((a, b) => a - b);
  console.log(JSON.stringify({ name, iterations, medianMs: +times[Math.floor(times.length / 2)].toFixed(3), p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(3) }));
}
console.log(`Node ${process.version} / ${process.platform} ${process.arch}. V3 incremental CPU costs; excludes browser rendering/device capture.`);
const spectrum = new DspEngine(48000, 8192).analyze(referenceSignal('Harmonic series').samples.subarray(0, 8192));
const tracker = new QualityTracker();
const metadata: CaptureMetadata = { mode: 'worklet', clock: 'audio-context', clockId: 'benchmark', timeSeconds: 0, frameStart: 0, sequence: 0, droppedFrames: 0, discontinuities: 0 };
benchmark('Quality update + report (every frame, more than UI requires)', i => { metadata.timeSeconds = i * 8192 / 96000; tracker.update(spectrum, metadata); tracker.report(spectrum, metadata); });
benchmark('One spectral-shape comparison, 4097 bins', () => { spectralSimilarity(spectrum, spectrum); });
const engine = new DspEngine(48000, 8192), pcm = referenceSignal('Harmonic series').samples.subarray(0, 8192), peaks = new PeakTracker(), quality = new QualityTracker();
benchmark('Complete V3 frame pipeline including quality report', i => {
  const next = engine.analyze(pcm), capture = { ...metadata, timeSeconds: i * 8192 / 96000 };
  analyzeEngine(next, { rpm: 1500, cylinders: 4, cycle: 4, harmonicHz: 100 }, peaks.update(next.peaks, capture.timeSeconds, next.resolution));
  waveformEnvelope(pcm); quality.update(next, capture); quality.report(next, capture);
});
const snapshots: MeasuredSnapshot[] = Array.from({ length: 9 }, (_, i) => ({ spectrum, label: `Repeat ${i}`, source: 'live frame', capturedAt: new Date().toISOString(), acquisition: { ...metadata, timeSeconds: metadata.timeSeconds + i }, measurement: { id: `benchmark-${i}`, durationSeconds: 8192 / 48000, notes: '', quality: tracker.report(spectrum, metadata) } }));
benchmark('Six snapshots / all 15 repeatability pairs', () => { assessRepeatability(snapshots.slice(0, 6)); });
const comparisons = { ab: assessRepeatability(snapshots.slice(0, 2)), repeatability: assessRepeatability(snapshots.slice(0, 6)) };
const create = () => createMeasurementExport(snapshots, comparisons, { browserFamily: 'Unspecified', observations: '', checks: [] });
benchmark('Nine-measurement export: build, validate, stringify', () => { JSON.stringify(create()); }, 100);
console.log(JSON.stringify({ maxSnapshotSpectraBytes: 9 * (8192 / 2 + 1) * (8 + 8 + 4), exportBytes: Buffer.byteLength(JSON.stringify(create())), maxQualityObservations: 512, maxRepeatSnapshots: 6 }));
