import { fft } from './fft.ts';
import { summarize } from './spectrum.ts';
import type { Spectrum } from './types.ts';

/** Shared live/offline transform. RMS is AC (DC removed), referenced to sample amplitude 1. */
export class DspEngine {
  readonly fftSize: number;
  readonly sampleRate: number;
  private readonly real: Float64Array;
  private readonly imaginary: Float64Array;
  private readonly window: Float64Array;
  private windowLength = 0;
  private windowSum = 0;
  private windowEnergy = 0;

  constructor(sampleRate: number, fftSize = 4096) {
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 384000) throw new RangeError('Unsupported sample rate.');
    if (!Number.isInteger(fftSize) || fftSize < 256 || fftSize > 32768 || (fftSize & (fftSize - 1)) !== 0) throw new RangeError('FFT size must be a power of two from 256 to 32768.');
    this.sampleRate = sampleRate; this.fftSize = fftSize;
    this.real = new Float64Array(fftSize); this.imaginary = new Float64Array(fftSize); this.window = new Float64Array(fftSize);
  }

  analyze(samples: Float32Array): Spectrum {
    const n = samples.length;
    if (n < 2 || n > this.fftSize) throw new RangeError('Frame must contain 2 to FFT-size samples.');
    if (this.windowLength !== n) {
      this.windowLength = n; this.windowSum = 0; this.windowEnergy = 0;
      for (let i = 0; i < n; i++) {
        // Periodic Hann; coherent gain corrects tonal amplitude, energy gain corrects band power.
        const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
        this.window[i] = w; this.windowSum += w; this.windowEnergy += w * w;
      }
    }
    let mean = 0, samplePeak = 0;
    for (const value of samples) {
      if (!Number.isFinite(value)) throw new RangeError('Audio contains non-finite samples.');
      mean += value; samplePeak = Math.max(samplePeak, Math.abs(value));
    }
    mean /= n;
    let squares = 0;
    this.real.fill(0); this.imaginary.fill(0);
    for (let i = 0; i < n; i++) {
      const value = samples[i] - mean;
      squares += value * value; this.real[i] = value * this.window[i];
    }
    fft(this.real, this.imaginary);
    const amplitude = new Float64Array(this.fftSize / 2 + 1), power = new Float64Array(amplitude.length);
    for (let k = 0; k < amplitude.length; k++) {
      const magnitudeSquared = this.real[k] ** 2 + this.imaginary[k] ** 2;
      const factor = k === 0 || k === this.fftSize / 2 ? 1 : 2;
      amplitude[k] = factor * Math.sqrt(magnitudeSquared) / this.windowSum;
      power[k] = factor * magnitudeSquared / (this.fftSize * this.windowEnergy);
    }
    return summarize(amplitude, power, this.sampleRate, this.fftSize, Math.sqrt(squares / n), samplePeak);
  }
}
