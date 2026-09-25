import type { Spectrum } from '../dsp/types.ts';

export interface Similarity { value: number | null; reason: string | null; lowHz: number; highHz: number; method: 'normalized-power-overlap-v1' }
/** Bhattacharyya coefficient of thresholded, normalized non-DC bin power. Not health similarity. */
export function spectralSimilarity(a: Spectrum, b: Spectrum): Similarity {
  const result: Similarity = { value: null, reason: null, lowHz: 20, highHz: Math.min(20000, a.sampleRate / 2), method: 'normalized-power-overlap-v1' };
  if (a.sampleRate !== b.sampleRate || a.fftSize !== b.fftSize || (a.windowSamples ?? a.fftSize) !== (b.windowSamples ?? b.fftSize) || a.power.length !== b.power.length || a.power.length !== a.fftSize / 2 + 1 || a.resolution !== a.sampleRate / a.fftSize || b.resolution !== b.sampleRate / b.fftSize) return { ...result, reason: 'Incompatible frequency grids or window support.' };
  if (!Number.isFinite(a.rms) || !Number.isFinite(b.rms) || a.rms < 1e-5 || b.rms < 1e-5) return { ...result, reason: 'Insufficient signal above the digital floor.' };
  const first = Math.max(1, Math.ceil(result.lowHz / a.resolution)), last = Math.min(a.power.length - 1, Math.floor(result.highHz / a.resolution));
  let maxA = 0, maxB = 0;
  for (let k = first; k <= last; k++) {
    if (!Number.isFinite(a.power[k]) || !Number.isFinite(b.power[k]) || a.power[k] < 0 || b.power[k] < 0) return { ...result, reason: 'Invalid bin power.' };
    maxA = Math.max(maxA, a.power[k]); maxB = Math.max(maxB, b.power[k]);
  }
  const floorA = Math.max(1e-12, maxA * 1e-6), floorB = Math.max(1e-12, maxB * 1e-6);
  let sumA = 0, sumB = 0, overlap = 0;
  for (let k = first; k <= last; k++) {
    const p = a.power[k] >= floorA ? a.power[k] : 0, q = b.power[k] >= floorB ? b.power[k] : 0;
    sumA += p; sumB += q; overlap += Math.sqrt(p * q);
  }
  if (sumA <= 1e-10 || sumB <= 1e-10) return { ...result, reason: 'Insufficient retained power in the comparison band.' };
  return { ...result, value: Math.max(0, Math.min(1, overlap / Math.sqrt(sumA * sumB))) };
}

/** Geometric/arithmetic mean of power, 20 Hz–20 kHz or Nyquist. Broadness, not source/noise identification. */
export function spectralFlatness(spectrum: Spectrum): number | null {
  if (spectrum.rms < 1e-5) return null;
  const first = Math.max(1, Math.ceil(20 / spectrum.resolution)), last = Math.min(spectrum.power.length - 1, Math.floor(20000 / spectrum.resolution));
  let sum = 0, logs = 0;
  for (let k = first; k <= last; k++) { const p = Math.max(1e-20, spectrum.power[k]); sum += p; logs += Math.log(p); }
  const count = last - first + 1;
  return count > 0 && sum > 1e-10 ? Math.max(0, Math.min(1, Math.exp(logs / count) / (sum / count))) : null;
}
