import type { Snapshot } from '../dsp/types.ts';
import type { CaptureMetadata } from '../audio/live-types.ts';
import type { MeasurementQuality } from './quality.ts';
import { spectralSimilarity } from './similarity.ts';

export interface MeasuredSnapshot extends Snapshot {
  measurement: { id: string; notes: string; durationSeconds: number; quality: MeasurementQuality };
  acquisition: CaptureMetadata;
}
export interface PairContext { differences: string[]; unknowns: string[]; featureDifferences?: string[]; harmonicMaxDeltaDb?: number | null }
export interface RepeatabilityPair { a: string; b: string; similarity: number | null; rmsDeltaDb: number | null; peakDeltaHz: number | null; bandMaxDeltaPoints: number; harmonicMaxDeltaDb: number | null; reasons: string[] }
export interface RepeatabilityResult { policy: 'repeatability-v1'; status: 'GOOD MATCH' | 'CONDITIONS DIFFER' | 'LOW SIGNAL' | 'INSUFFICIENT DATA' | 'REVIEW QUALITY' | 'SIGNALS DIFFER' | 'CONTEXT UNVERIFIED'; reasons: string[]; pairs: RepeatabilityPair[] }
export function assessRepeatability(snapshots: MeasuredSnapshot[], context: (a: MeasuredSnapshot, b: MeasuredSnapshot) => PairContext = () => ({ differences: [], unknowns: [] })): RepeatabilityResult {
  if (snapshots.length > 6) throw new RangeError('Repeatability is limited to six snapshots.');
  const result: RepeatabilityResult = { policy: 'repeatability-v1', status: 'INSUFFICIENT DATA', reasons: [], pairs: [] };
  if (snapshots.length < 2) return { ...result, reasons: ['Capture at least two separate measurements of the same operating condition.'] };
  let differing = false, low = false, insufficient = false, caution = false, changed = false, unknown = false;
  for (let i = 0; i < snapshots.length; i++) for (let j = i + 1; j < snapshots.length; j++) {
    const a = snapshots[i], b = snapshots[j], reasons: string[] = [], details = context(a, b);
    const sim = spectralSimilarity(a.spectrum, b.spectrum);
    const delta = Number.isFinite(a.spectrum.rmsDbFS) && Number.isFinite(b.spectrum.rmsDbFS) ? b.spectrum.rmsDbFS - a.spectrum.rmsDbFS : null;
    const peak = a.spectrum.peaks[0] && b.spectrum.peaks[0] ? b.spectrum.peaks[0].frequency - a.spectrum.peaks[0].frequency : null;
    const band = Math.max(...a.spectrum.bands.map((value, k) => Math.abs(value.percent - b.spectrum.bands[k].percent)));
    if (a.source !== b.source || a.acquisition.mode !== b.acquisition.mode || a.spectrum.sampleRate !== b.spectrum.sampleRate || a.spectrum.fftSize !== b.spectrum.fftSize || (a.spectrum.windowSamples ?? a.spectrum.fftSize) !== (b.spectrum.windowSamples ?? b.spectrum.fftSize)) { differing = true; reasons.push('Source, acquisition mode or frequency/window grid differs.'); }
    if (details.differences.length) { differing = true; reasons.push(...details.differences); }
    if (details.unknowns.length) { unknown = true; reasons.push(...details.unknowns); }
    if (details.featureDifferences?.length) { changed = true; reasons.push(...details.featureDifferences); }
    if (a.spectrum.rmsDbFS < -70 || b.spectrum.rmsDbFS < -70) { low = true; reasons.push('Low digital signal limits comparison.'); }
    if (a.measurement.id === b.measurement.id || (a.acquisition.clockId === b.acquisition.clockId && Math.abs(a.acquisition.timeSeconds - b.acquisition.timeSeconds) < Math.max(a.measurement.durationSeconds, b.measurement.durationSeconds))) { insufficient = true; reasons.push('Snapshots duplicate or overlap the same source interval.'); }
    for (const snapshot of [a, b]) {
      if (!snapshot.measurement.quality.stabilityAvailable) { insufficient = true; reasons.push('Recent temporal stability is not established.'); }
      if (snapshot.measurement.quality.issues.some(issue => !['insufficient-duration', 'temporal-unavailable', 'low-signal'].includes(issue.code))) { caution = true; reasons.push('Review measurement-quality observations.'); }
    }
    if (sim.value === null) { insufficient = true; reasons.push(sim.reason!); }
    if ((delta !== null && Math.abs(delta) > 1.5) || (sim.value !== null && sim.value < 0.95) || band > 5 || (peak !== null && Math.abs(peak) > Math.max(a.spectrum.resolution * 2, Math.max(a.spectrum.peaks[0]?.frequency ?? 0, b.spectrum.peaks[0]?.frequency ?? 0) * 0.02)) || (details.harmonicMaxDeltaDb !== null && details.harmonicMaxDeltaDb !== undefined && details.harmonicMaxDeltaDb > 3)) { changed = true; reasons.push('Signal differences exceed the documented repeatability thresholds.'); }
    result.pairs.push({ a: a.measurement.id, b: b.measurement.id, similarity: sim.value, rmsDeltaDb: delta, peakDeltaHz: peak, bandMaxDeltaPoints: band, harmonicMaxDeltaDb: details.harmonicMaxDeltaDb ?? null, reasons: [...new Set(reasons)] });
  }
  result.status = differing ? 'CONDITIONS DIFFER' : low ? 'LOW SIGNAL' : insufficient ? 'INSUFFICIENT DATA' : caution ? 'REVIEW QUALITY' : changed ? 'SIGNALS DIFFER' : unknown ? 'CONTEXT UNVERIFIED' : 'GOOD MATCH';
  result.reasons = [...new Set(result.pairs.flatMap(pair => pair.reasons))];
  if (!result.reasons.length) result.reasons.push('Measured features agree within heuristic tolerances. Physical position, load and gain still need to match; this is not machine health.');
  return result;
}
