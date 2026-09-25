import type { AnalysisResult, Spectrum } from '../dsp/types.ts';

export interface CaptureMetadata {
  mode: 'worklet' | 'sampled' | 'file';
  timeSeconds: number;
  clock: 'audio-context' | 'file';
  clockId: string;
  frameStart: number | null;
  sequence: number;
  droppedFrames: number;
  discontinuities: number;
  durationSeconds?: number;
  browserEvidence?: { audioWorkletAvailable: boolean; processing: { autoGainControl: boolean | null; noiseSuppression: boolean | null; echoCancellation: boolean | null }; outputBaseLatencySeconds: number | null };
}
export interface PcmFrame { samples: Float32Array; frameStart: number; sequence: number; droppedFrames: number; discontinuities: number }
export interface LiveMeasurement { spectrum: Spectrum; waveform: AnalysisResult['waveform']; metadata: CaptureMetadata }
export type LiveWorkerRequest = { type: 'init'; sampleRate: number; fftSize: number; clockId: string } | { type: 'frame'; frame: PcmFrame };
export type LiveWorkerResponse = { type: 'ready' } | { type: 'measurement'; measurement: LiveMeasurement } | { type: 'error'; message: string };
