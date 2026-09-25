import type { BandEnergy, Peak, Spectrum } from './types.ts';

export const amplitudeDb = (value: number): number => value > 0 ? 20 * Math.log10(value) : -Infinity;
export const BANDS = [
  { label: 'Low', low: 20, high: 250 },
  { label: 'Mid', low: 250, high: 2000 },
  { label: 'High', low: 2000, high: 20000 },
] as const;

export function findPeaks(db: Float32Array, sampleRate: number, fftSize: number, rms: number): Peak[] {
  if (rms < 1e-5) return [];
  const sorted = Array.from(db.subarray(1)).sort((a, b) => a - b);
  const threshold = Math.max(-90, sorted[Math.floor(sorted.length / 2)] + 12, sorted[sorted.length - 1] - 50);
  const candidates: Peak[] = [];
  for (let k = 1; k < db.length - 1; k++) {
    if (db[k] < threshold || db[k] <= db[k - 1] || db[k] <= db[k + 1]) continue;
    // Log-magnitude parabola reduces off-bin bias, but does not improve true resolving power.
    const denominator = db[k - 1] - 2 * db[k] + db[k + 1];
    const offset = denominator === 0 ? 0 : Math.max(-0.5, Math.min(0.5, 0.5 * (db[k - 1] - db[k + 1]) / denominator));
    candidates.push({ frequency: (k + offset) * sampleRate / fftSize, dbFS: db[k] - 0.25 * (db[k - 1] - db[k + 1]) * offset, bin: k });
  }
  return candidates.sort((a, b) => b.dbFS - a.dbFS)
    .filter((peak, index, all) => !all.slice(0, index).some(other => Math.abs(other.bin - peak.bin) < 3)).slice(0, 6);
}

export function bandEnergy(power: Float64Array, sampleRate: number, fftSize: number): BandEnergy[] {
  const bands = BANDS.map(band => ({ ...band, high: Math.min(band.high, sampleRate / 2), power: 0, percent: 0 }));
  let total = 0;
  for (let k = 1; k < power.length; k++) {
    total += power[k];
    const frequency = k * sampleRate / fftSize;
    const band = bands.find(b => frequency >= b.low && (frequency < b.high || (frequency === sampleRate / 2 && frequency === b.high)));
    if (band) band.power += power[k];
  }
  for (const band of bands) band.percent = total > 1e-10 ? 100 * band.power / total : 0;
  return bands;
}

export function summarize(amplitude: Float64Array, power: Float64Array, sampleRate: number, fftSize: number, rms: number, samplePeak: number): Spectrum {
  const db = Float32Array.from(amplitude, value => Math.max(-160, amplitudeDb(value)));
  return { sampleRate, fftSize, resolution: sampleRate / fftSize, amplitude, power, db,
    peaks: findPeaks(db, sampleRate, fftSize, rms), bands: bandEnergy(power, sampleRate, fftSize),
    rms, rmsDbFS: amplitudeDb(rms), samplePeak, clipped: samplePeak >= 0.999 };
}
