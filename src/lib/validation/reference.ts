import { analyzeAudio } from '../dsp/offline.ts';
import { analyzeHarmonics } from '../dsp/harmonics.ts';
import type { AnalysisResult } from '../dsp/types.ts';

export const REFERENCE_CASES = ['100 Hz', '440 Hz', '1000 Hz', 'Multi-tone', 'Harmonic series', 'Amplitude ×2', 'Noise + tone'] as const;
export type ReferenceCase = typeof REFERENCE_CASES[number];
export function referenceSignal(name: ReferenceCase, sampleRate = 48000) {
  if (!REFERENCE_CASES.includes(name) || ![44100, 48000, 96000].includes(sampleRate)) throw new RangeError('Unknown reference case/rate.');
  const tones: [number, number][] = name === 'Multi-tone' ? [[100, 0.2], [440, 0.15], [1000, 0.1]] : name === 'Harmonic series' ? [[100, 0.4], [200, 0.2], [300, 0.1], [400, 0.05]] : [[name === '100 Hz' ? 100 : name === '1000 Hz' ? 1000 : 440, name === 'Amplitude ×2' ? 0.4 : 0.2]];
  let seed = 17;
  const samples = Float32Array.from({ length: sampleRate }, (_, i) => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return tones.reduce((sum, [hz, amplitude]) => sum + amplitude * Math.sin(2 * Math.PI * hz * i / sampleRate), 0) + (name === 'Noise + tone' ? (seed / 2 ** 32 - 0.5) * 0.12 : 0);
  });
  const expectedRms = Math.sqrt(tones.reduce((sum, [, amplitude]) => sum + amplitude ** 2 / 2, 0) + (name === 'Noise + tone' ? 0.12 ** 2 / 12 : 0));
  return { samples, tones, expectedRms, seed: name === 'Noise + tone' ? 17 : null, durationSeconds: 1 };
}
export function validateReference(name: ReferenceCase, result: AnalysisResult) {
  const reference = referenceSignal(name, result.spectrum.sampleRate), spectrum = result.spectrum;
  const checks = reference.tones.map(([hz, amplitude]) => {
    const peak = spectrum.peaks.find(p => Math.abs(p.frequency - hz) <= spectrum.resolution);
    return { name: `${hz} Hz peak and amplitude`, passed: !!peak && Math.abs(peak.dbFS - 20 * Math.log10(amplitude)) <= 0.75, expected: `${hz} Hz ± ${spectrum.resolution.toFixed(2)} Hz; ${ (20 * Math.log10(amplitude)).toFixed(2)} dBFS ± 0.75 dB`, actual: peak ? `${peak.frequency.toFixed(2)} Hz; ${peak.dbFS.toFixed(2)} dBFS` : 'No matching peak' };
  });
  const rmsErrorDb = 20 * Math.log10(spectrum.rms / reference.expectedRms);
  checks.push({ name: 'AC RMS', passed: Math.abs(rmsErrorDb) < 0.15, expected: `${(20 * Math.log10(reference.expectedRms)).toFixed(2)} dBFS ± 0.15 dB`, actual: `${spectrum.rmsDbFS.toFixed(2)} dBFS` });
  if (name === 'Harmonic series') { const h = analyzeHarmonics(spectrum, 100); checks.push({ name: 'Harmonic matches', passed: h.matchedCount === 4, expected: '4 of 5', actual: `${h.matchedCount} of 5` }); }
  if (name === 'Amplitude ×2') {
    const baseline = analyzeAudio(referenceSignal('440 Hz', spectrum.sampleRate).samples, spectrum.sampleRate, spectrum.fftSize);
    const delta = spectrum.rmsDbFS - baseline.spectrum.rmsDbFS;
    checks.push({ name: 'Gain change versus 0.2 amplitude', passed: Math.abs(delta - 6.0206) < 0.01, expected: '+6.0206 dB ± 0.01 dB', actual: `${delta.toFixed(4)} dB` });
  }
  return { case: name, sampleRate: spectrum.sampleRate, fftSize: spectrum.fftSize, durationSeconds: 1, seed: reference.seed, checks, passed: checks.every(check => check.passed) };
}
