import { compareSnapshots } from '../../dsp/comparison.ts';
import { spectralDifference } from '../../dsp/spectral-comparison.ts';
import type { EngineSnapshot } from './analysis.ts';

export function compareEngineSnapshots(a: EngineSnapshot, b: EngineSnapshot) {
  const generic = compareSnapshots(a, b), warnings: string[] = [];
  if (a.source !== b.source) warnings.push('Source types differ.');
  if (a.spectrum.sampleRate !== b.spectrum.sampleRate) warnings.push('Sample rates differ.');
  if (a.spectrum.fftSize !== b.spectrum.fftSize) warnings.push('FFT sizes differ.');
  const ac = a.engine.configuration, bc = b.engine.configuration;
  if (ac.rpm === null || bc.rpm === null) warnings.push('RPM is unspecified in one or both snapshots; operating speed cannot be verified.');
  else if (Math.abs(ac.rpm - bc.rpm) > Math.max(25, Math.max(ac.rpm, bc.rpm) * 0.03)) warnings.push(`RPM differs materially: A ${ac.rpm}, B ${bc.rpm}.`);
  if (ac.cylinders !== bc.cylinders || ac.cycle !== bc.cycle) warnings.push('Engine configurations differ.');
  if (a.acquisition.mode !== b.acquisition.mode) warnings.push('Acquisition modes differ.');
  if (a.acquisition.droppedFrames || b.acquisition.droppedFrames) warnings.push('Capture reported skipped frames; persistence may be interrupted.');
  if (a.acquisition.discontinuities || b.acquisition.discontinuities) warnings.push('Capture reported input discontinuities; persistence may be interrupted.');
  const ah = a.engine.harmonics, bh = b.engine.harmonics;
  const sameReference = ah.referenceHz !== null && ah.referenceHz === bh.referenceHz && a.engine.harmonicSource === b.engine.harmonicSource;
  if (!sameReference) warnings.push('Harmonic reference differs or is unavailable; harmonic deltas are withheld.');
  const harmonicDelta = sameReference && generic.comparable ? ah.harmonics.map((h, i) => {
    const other = bh.harmonics[i];
    return { order: h.order, dbDelta: h.dbFS !== null && other?.dbFS !== null && other?.dbFS !== undefined ? other.dbFS - h.dbFS : null };
  }) : null;
  return { ...generic, warnings, conditionsComparable: warnings.length === 0, harmonicDelta,
    spectral: spectralDifference(a.spectrum, b.spectrum),
    harmonicPowerDeltaDb: sameReference && generic.comparable && ah.matchedPower > 1e-10 && bh.matchedPower > 1e-10 ? 10 * Math.log10(bh.matchedPower / ah.matchedPower) : null };
}
