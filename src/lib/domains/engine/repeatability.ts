import type { EngineSnapshot } from './analysis.ts';
import { assessRepeatability, type MeasuredSnapshot } from '../../measurement/repeatability.ts';

export type MeasuredEngineSnapshot = EngineSnapshot & MeasuredSnapshot;
export function assessEngineRepeatability(snapshots: MeasuredEngineSnapshot[]) {
  return assessRepeatability(snapshots, (left, right) => {
    const a = left as MeasuredEngineSnapshot, b = right as MeasuredEngineSnapshot;
    const ac = a.engine.configuration, bc = b.engine.configuration;
    const differences: string[] = [], unknowns: string[] = [], featureDifferences: string[] = [];
    if (ac.rpm === null || bc.rpm === null) unknowns.push('RPM is unspecified; operating speed cannot be verified.');
    else if (Math.abs(ac.rpm - bc.rpm) > Math.max(25, Math.max(ac.rpm, bc.rpm) * 0.03)) differences.push(`RPM differs materially: A ${ac.rpm}, B ${bc.rpm}.`);
    if (ac.cycle !== bc.cycle || ac.cylinders !== bc.cylinders || ac.harmonicHz !== bc.harmonicHz) differences.push('Engine or manual harmonic reference settings differ.');
    const ap = a.acquisition.browserEvidence?.processing, bp = b.acquisition.browserEvidence?.processing;
    if (ap && bp && JSON.stringify(ap) !== JSON.stringify(bp)) differences.push('Browser-reported microphone processing settings differ.');
    if (a.source === 'live frame' && (!ap || !bp || Object.values(ap).some(v => v === null) || Object.values(bp).some(v => v === null))) unknowns.push('Some microphone processing settings are unreported.');
    const ah = a.engine.harmonics, bh = b.engine.harmonics;
    let harmonicMaxDeltaDb: number | null = null;
    if (a.engine.harmonicSource === b.engine.harmonicSource && ah.referenceHz !== null && bh.referenceHz !== null && Math.abs(ah.referenceHz - bh.referenceHz) <= Math.max(a.spectrum.resolution, b.spectrum.resolution)) {
      const deltas = ah.harmonics.flatMap((h, i) => h.relativeDb !== null && bh.harmonics[i]?.relativeDb !== null && bh.harmonics[i]?.relativeDb !== undefined ? [Math.abs(h.relativeDb - bh.harmonics[i].relativeDb!)] : []);
      if (deltas.length) harmonicMaxDeltaDb = Math.max(...deltas);
      if (ah.harmonics.some((h, i) => h.state !== bh.harmonics[i]?.state)) featureDifferences.push('Matched harmonic structure differs.');
    } else unknowns.push('Harmonic references are not comparable.');
    return { differences, unknowns, featureDifferences, harmonicMaxDeltaDb };
  });
}
