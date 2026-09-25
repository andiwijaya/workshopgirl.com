import { DspEngine } from './engine.ts';
import { summarize } from './spectrum.ts';
import type { AnalysisResult } from './types.ts';

export function waveformEnvelope(samples: Float32Array, count = 1000): AnalysisResult['waveform'] {
  const length = Math.min(count, samples.length);
  const min = new Float32Array(length), max = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let low = Infinity, high = -Infinity;
    for (let j = Math.floor(i * samples.length / length); j < Math.floor((i + 1) * samples.length / length); j++) {
      low = Math.min(low, samples[j]); high = Math.max(high, samples[j]);
    }
    min[i] = low; max[i] = high;
  }
  return { min, max };
}

/** All overlapping frames are analyzed; only display columns are reduced (power averaged). */
export function analyzeAudio(samples: Float32Array, sampleRate: number, fftSize = 4096, progress?: (value: number) => void): AnalysisResult {
  if (samples.length < 2) throw new RangeError('Audio is empty.');
  const engine = new DspEngine(sampleRate, fftSize), hop = fftSize / 2;
  const frames = Math.max(1, Math.ceil((samples.length - fftSize) / hop) + 1);
  const columnsCount = Math.min(400, frames), bins = fftSize / 2 + 1;
  const columns = Array.from({ length: columnsCount }, () => new Float64Array(bins));
  const counts = new Uint32Array(columnsCount), times = new Array<number>(columnsCount).fill(0);
  const amplitudeSquared = new Float64Array(bins), power = new Float64Array(bins);
  for (let i = 0; i < frames; i++) {
    // Last full frame ends exactly at the file boundary; no silence is appended to long files.
    const start = Math.min(i * hop, Math.max(0, samples.length - fftSize));
    const spectrum = engine.analyze(samples.subarray(start, start + fftSize));
    const column = Math.min(columnsCount - 1, Math.floor(i * columnsCount / frames));
    counts[column]++; times[column] += (start + Math.min(fftSize, samples.length) / 2) / sampleRate;
    for (let k = 0; k < bins; k++) {
      amplitudeSquared[k] += spectrum.amplitude[k] ** 2 / frames;
      power[k] += spectrum.power[k] / frames;
      columns[column][k] += spectrum.amplitude[k] ** 2;
    }
    if (i % 32 === 0) progress?.(i / frames);
  }
  let mean = 0, peak = 0, squares = 0;
  for (const value of samples) { mean += value; peak = Math.max(peak, Math.abs(value)); }
  mean /= samples.length;
  for (const value of samples) squares += (value - mean) ** 2;
  return {
    spectrum: { ...summarize(Float64Array.from(amplitudeSquared, Math.sqrt), power, sampleRate, fftSize, Math.sqrt(squares / samples.length), peak), windowSamples: Math.min(samples.length, fftSize) },
    duration: samples.length / sampleRate, frameCount: frames, waveform: waveformEnvelope(samples),
    spectrogram: { times: times.map((time, i) => time / counts[i]), columns: columns.map((column, i) => Float32Array.from(column, value => Math.max(-160, 10 * Math.log10(Math.max(1e-16, value / counts[i]))))) },
  };
}
