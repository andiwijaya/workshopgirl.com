import type { Spectrum } from './types.ts';

/** Only subtract like-for-like bin grids. Different grids still support physical-Hz overlays. */
export function spectralDifference(a: Spectrum, b: Spectrum): { dbDelta: Float32Array; valid: Uint8Array; largestChangeHz: number | null } | null {
  if (a.fftSize !== b.fftSize || a.sampleRate !== b.sampleRate || a.db.length !== b.db.length) return null;
  const dbDelta = new Float32Array(a.db.length), valid = new Uint8Array(a.db.length);
  let largest = 0, largestChangeHz: number | null = null;
  for (let k = 1; k < a.db.length; k++) {
    // Values under the measurement floor cannot support a meaningful dB ratio.
    if (a.db[k] < -90 || b.db[k] < -90) continue;
    valid[k] = 1; dbDelta[k] = b.db[k] - a.db[k];
    if (Math.abs(dbDelta[k]) > largest) { largest = Math.abs(dbDelta[k]); largestChangeHz = k * a.resolution; }
  }
  return { dbDelta, valid, largestChangeHz };
}
