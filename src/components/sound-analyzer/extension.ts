import type { Snapshot, Spectrum } from '../../lib/dsp/types.ts';
import type { CaptureMetadata } from '../../lib/audio/live-types.ts';
import type { SpectrumMarker } from './charts.ts';

/** UI extension boundary: domain modules consume shared results without changing generic FFT code. */
export interface AnalyzerExtension<T extends Snapshot = Snapshot> {
  continuous?: boolean;
  liveSnapshots?: boolean;
  minimumFrequency?: number;
  measurement?: (spectrum: Spectrum, metadata: CaptureMetadata) => void;
  render?: () => void;
  reset?: () => void;
  stopped?: (reason: string) => void;
  capture?: (base: Snapshot) => T;
  compare?: (a?: T, b?: T) => void;
  canCapture?: () => boolean;
  markers?: () => SpectrumMarker[];
}
