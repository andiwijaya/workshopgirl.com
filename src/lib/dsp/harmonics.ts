import { findPeaks } from './spectrum.ts';
import type { Spectrum } from './types.ts';

export interface Harmonic {
  order: number; expectedHz: number; detectedHz: number | null;
  dbFS: number | null; relativeDb: number | null; power: number;
  state: 'matched' | 'absent' | 'unresolved' | 'above-nyquist';
}
export interface HarmonicAnalysis {
  referenceHz: number | null;
  toleranceHz: number;
  status: 'ready' | 'no-reference' | 'unresolved' | 'quiet';
  harmonics: Harmonic[];
  matchedCount: number;
  matchedPower: number;
  powerPercent: number;
}

/** A supplied reference is NOT a fundamental-frequency estimate or a fault classifier. */
export function analyzeHarmonics(spectrum: Spectrum, referenceHz: number | null): HarmonicAnalysis {
  if (referenceHz !== null && (!Number.isFinite(referenceHz) || referenceHz <= 0)) throw new RangeError('Harmonic reference must be a positive finite frequency.');
  const supportResolution = spectrum.sampleRate / (spectrum.windowSamples ?? spectrum.fftSize);
  const result: HarmonicAnalysis = { referenceHz, toleranceHz: spectrum.resolution, status: 'no-reference', harmonics: [], matchedCount: 0, matchedPower: 0, powerPercent: 0 };
  if (referenceHz === null) return result;
  // Four bins keep adjacent Hann main lobes separate; zero padding must not masquerade as resolution.
  result.status = referenceHz < 4 * supportResolution ? 'unresolved' : spectrum.rms < 1e-5 ? 'quiet' : 'ready';
  const candidates = result.status === 'ready' ? findPeaks(spectrum.db, spectrum.sampleRate, spectrum.fftSize, spectrum.rms, spectrum.db.length) : [];
  const used = new Set<number>();
  for (let order = 1; order <= 5; order++) {
    const expectedHz = referenceHz * order;
    const state = expectedHz >= spectrum.sampleRate / 2 ? 'above-nyquist' : result.status === 'unresolved' ? 'unresolved' : 'absent';
    const harmonic: Harmonic = { order, expectedHz, detectedHz: null, dbFS: null, relativeDb: null, power: 0, state };
    if (state === 'absent') {
      const peak = candidates.filter(p => !used.has(p.bin) && Math.abs(p.frequency - expectedHz) <= result.toleranceHz)
        .sort((a, b) => Math.abs(a.frequency - expectedHz) - Math.abs(b.frequency - expectedHz))[0];
      if (peak) {
        used.add(peak.bin); harmonic.state = 'matched'; harmonic.detectedHz = peak.frequency; harmonic.dbFS = peak.dbFS;
        // Three bins capture a bin-centered Hann lobe exactly. This is matched-band power, not THD.
        for (let k = Math.max(1, peak.bin - 1); k <= Math.min(spectrum.power.length - 1, peak.bin + 1); k++) harmonic.power += spectrum.power[k];
        result.matchedPower += harmonic.power; result.matchedCount++;
      }
    }
    result.harmonics.push(harmonic);
  }
  const strongest = Math.max(...result.harmonics.map(h => h.dbFS ?? -Infinity));
  for (const harmonic of result.harmonics) if (harmonic.dbFS !== null) harmonic.relativeDb = harmonic.dbFS - strongest;
  const total = spectrum.power.subarray(1).reduce((sum, power) => sum + power, 0);
  result.powerPercent = total > 1e-10 ? Math.min(100, result.matchedPower / total * 100) : 0;
  return result;
}
