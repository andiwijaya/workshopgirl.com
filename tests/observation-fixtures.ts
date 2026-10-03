import { DspEngine } from '../src/lib/dsp/engine.ts';
import { analyzeEngine } from '../src/lib/domains/engine/analysis.ts';
import { QualityTracker } from '../src/lib/measurement/quality.ts';
import { summarizeEngineObservation } from '../src/lib/workshop/observation-summary.ts';
import { emptyStore, createJob } from '../src/lib/workshop/store.ts';
import type { MeasuredEngineSnapshot } from '../src/lib/domains/engine/repeatability.ts';

export function syntheticSnapshot(id = 'qa-observation'): MeasuredEngineSnapshot {
  const spectrum = new DspEngine(48000, 8192).analyze(Float32Array.from({ length: 8192 }, (_, i) => .2 * Math.sin(2 * Math.PI * 440 * i / 48000)));
  const acquisition = { mode: 'worklet' as const, clock: 'audio-context' as const, clockId: 'synthetic-clock', frameStart: 136000, timeSeconds: 3, sequence: 30, droppedFrames: 0, discontinuities: 0 };
  const tracker = new QualityTracker(); for (let i = 0; i <= 30; i++) tracker.update(spectrum, { ...acquisition, timeSeconds: i / 10 });
  return { label: 'Synthetic warm idle', source: 'live frame', capturedAt: '2026-10-03T02:00:00.000Z', spectrum, acquisition,
    engine: analyzeEngine(spectrum, { rpm: 800, cylinders: 4, cycle: 4, harmonicHz: null }),
    measurement: { id, notes: 'Synthetic fixture; fixed position.', durationSeconds: 8192 / 48000, quality: tracker.report(spectrum, acquisition) } };
}
export const syntheticObservation = (id = 'qa-observation') => summarizeEngineObservation(syntheticSnapshot(id));
export function syntheticWorkshop() {
  const store = emptyStore();
  const job = createJob(store, { customer: { name: 'Synthetic Observation QA', phone: '', address: '' },
    vehicle: { type: 'Motorcycle', plate: 'QA-OBS-01', make: 'Synthetic', model: 'Fixture', color: '', year: null, odometer: null },
    intake: { number: 'QA-OBS-1', complaint: 'Inspect a synthetic sound', accessories: [], conditionNotes: '', date: '2026-10-03', arrivalTime: '10:00' } }, prefix => `${prefix}_observation-qa`);
  return { store, job };
}
