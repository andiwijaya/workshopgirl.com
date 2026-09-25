/** Serializable, UI-independent contracts for this and future domain analyzers. */
export interface Peak { frequency: number; dbFS: number; bin: number }
export interface BandEnergy { label: string; low: number; high: number; power: number; percent: number }
export interface Spectrum {
  sampleRate: number;
  fftSize: number;
  resolution: number;
  /** Actual Hann support; may be smaller than fftSize for a zero-padded short clip. */
  windowSamples?: number;
  amplitude: Float64Array;
  power: Float64Array;
  db: Float32Array;
  peaks: Peak[];
  bands: BandEnergy[];
  rms: number;
  rmsDbFS: number;
  samplePeak: number;
  clipped: boolean;
}
export interface AnalysisResult {
  spectrum: Spectrum;
  duration: number;
  frameCount: number;
  waveform: { min: Float32Array; max: Float32Array };
  spectrogram: { columns: Float32Array[]; times: number[] };
}
export interface Snapshot {
  label: string;
  source: 'live frame' | 'file average';
  capturedAt: string;
  spectrum: Spectrum;
}
export type WorkerRequest = { type: 'analyze'; samples: Float32Array; sampleRate: number; fftSize: number };
export type WorkerResponse = { type: 'result'; result: AnalysisResult } | { type: 'progress'; progress: number } | { type: 'error'; message: string };
