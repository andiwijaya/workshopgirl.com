import { analyzeHarmonics, type HarmonicAnalysis } from '../../dsp/harmonics.ts';
import type { PeakTrack } from '../../dsp/peak-tracker.ts';
import type { Snapshot, Spectrum } from '../../dsp/types.ts';
import type { CaptureMetadata } from '../../audio/live-types.ts';
import { engineReferences, type EngineConfiguration, type EngineReference } from './references.ts';

export interface EngineObservation {
  configuration: EngineConfiguration;
  references: EngineReference[];
  harmonicSource: 'manual Hz' | 'firing reference' | 'shaft reference' | 'strongest peak reference' | 'none';
  harmonics: HarmonicAnalysis;
  persistentPeaks: PeakTrack[];
}
export interface EngineSnapshot extends Snapshot {
  engine: EngineObservation;
  acquisition: CaptureMetadata;
}
export function analyzeEngine(spectrum: Spectrum, configuration: EngineConfiguration, persistentPeaks: PeakTrack[] = []): EngineObservation {
  const references = engineReferences(configuration);
  const firing = references.find(r => r.kind === 'firing');
  const shaft = references.find(r => r.order === 1);
  const referenceHz = configuration.harmonicHz ?? firing?.frequency ?? shaft?.frequency ?? spectrum.peaks[0]?.frequency ?? null;
  const harmonicSource = configuration.harmonicHz !== null ? 'manual Hz' : firing ? 'firing reference' : shaft ? 'shaft reference' : referenceHz !== null ? 'strongest peak reference' : 'none';
  return { configuration: { ...configuration }, references, harmonicSource, harmonics: analyzeHarmonics(spectrum, referenceHz), persistentPeaks: persistentPeaks.map(p => ({ ...p })) };
}
export function captureEngineSnapshot(base: Snapshot, observation: EngineObservation, acquisition: CaptureMetadata): EngineSnapshot {
  return structuredClone({ ...base, engine: observation, acquisition });
}
