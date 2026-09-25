import type { Snapshot } from './types.ts';

/** Comparisons retain acquisition metadata. No resampling or invented calibration. */
export function compareSnapshots(a: Snapshot, b: Snapshot) {
  const finiteLevels = Number.isFinite(a.spectrum.rmsDbFS) && Number.isFinite(b.spectrum.rmsDbFS);
  return {
    levelDelta: finiteLevels ? b.spectrum.rmsDbFS - a.spectrum.rmsDbFS : null,
    peakDelta: a.spectrum.peaks[0] && b.spectrum.peaks[0] ? b.spectrum.peaks[0].frequency - a.spectrum.peaks[0].frequency : null,
    comparable: a.source === b.source && a.spectrum.fftSize === b.spectrum.fftSize && a.spectrum.sampleRate === b.spectrum.sampleRate,
    bands: a.spectrum.bands.map((band, i) => ({ label: band.label, delta: b.spectrum.bands[i].percent - band.percent })),
  };
}
