import type { Spectrum } from '../dsp/types.ts';
import type { CaptureMetadata } from '../audio/live-types.ts';
import { spectralFlatness } from './similarity.ts';

export interface QualityIssue { code: string; message: string }
export interface MeasurementQuality {
  policy: 'quality-v1'; sessionSpanSeconds: number; recentSpanSeconds: number; coverageSeconds: number | null;
  frameCount: number; recentFrameCount: number; clippedFrames: number; lowSignalFrames: number;
  droppedFrames: number; discontinuities: number; rmsRangeDb: number | null; dominantRangeHz: number | null;
  flatness: number | null; effectiveResolutionHz: number; stabilityAvailable: boolean;
  issues: QualityIssue[]; endedReason: string | null;
}
interface Observation { time: number; rms: number; peak: number | null; flatness: number | null }
/** Three seconds / at most 512 scalar observations, no PCM or spectra retained here. */
export class QualityTracker {
  private recent: Observation[] = [];
  private clock = ''; private mode = ''; private start = 0; private last = -Infinity;
  private frames = 0; private clips = 0; private weak = 0; private covered = 0;
  private drops = 0; private gaps = 0; private modeChanged = false; private changedAt = -Infinity;
  private end: string | null = null;
  private timeGaps = 0;
  reset(): void { this.recent = []; this.clock = ''; this.mode = ''; this.frames = 0; this.clips = 0; this.weak = 0; this.covered = 0; this.drops = 0; this.gaps = 0; this.modeChanged = false; this.changedAt = -Infinity; this.last = -Infinity; this.end = null; this.timeGaps = 0; }
  contextChanged(): void { if (this.frames) this.changedAt = this.last; }
  ended(reason: string): void { this.end = reason.slice(0, 200); }
  update(spectrum: Spectrum, capture: CaptureMetadata): void {
    if (this.clock !== capture.clockId) { this.reset(); this.clock = capture.clockId; this.start = capture.timeSeconds; }
    if (!Number.isFinite(capture.timeSeconds) || capture.timeSeconds <= this.last) return;
    if (this.mode && this.mode !== capture.mode) { this.recent = []; this.modeChanged = true; }
    const duration = (spectrum.windowSamples ?? spectrum.fftSize) / spectrum.sampleRate;
    if (this.frames && capture.mode !== 'file' && capture.timeSeconds - this.last > Math.max(0.25, duration * 1.5)) this.timeGaps++;
    this.covered += this.frames ? Math.min(duration, capture.timeSeconds - this.last) : duration;
    this.mode = capture.mode; this.last = capture.timeSeconds; this.frames++;
    if (spectrum.clipped) this.clips++;
    if (spectrum.rmsDbFS < -70) this.weak++;
    this.drops = Math.max(this.drops, capture.droppedFrames); this.gaps = Math.max(this.gaps, capture.discontinuities);
    this.recent.push({ time: capture.timeSeconds, rms: spectrum.rmsDbFS, peak: spectrum.peaks[0]?.frequency ?? null, flatness: spectralFlatness(spectrum) });
    while (this.recent.length > 512 || this.recent[0].time < capture.timeSeconds - 3) this.recent.shift();
  }
  report(spectrum: Spectrum, capture: CaptureMetadata, unresolved = false): MeasurementQuality {
    const file = capture.mode === 'file';
    const span = file ? capture.durationSeconds ?? capture.timeSeconds : Math.max(0, this.last - this.start);
    const recentSpan = file ? 0 : Math.max(0, this.last - (this.recent[0]?.time ?? this.last));
    const levels = this.recent.map(r => r.rms).filter(Number.isFinite), peaks = this.recent.flatMap(r => r.peak === null ? [] : [r.peak]);
    const range = (values: number[]) => values.length >= 2 ? Math.max(...values) - Math.min(...values) : null;
    const rmsRange = range(levels), peakRange = range(peaks), flatness = this.recent.at(-1)?.flatness ?? null;
    const issues: QualityIssue[] = [], add = (code: string, message: string) => issues.push({ code, message });
    if (this.clips) add('clipping', 'Possible clipping detected during this session (sample peak ≥ 0.999).');
    if (spectrum.rmsDbFS < -70) add('low-signal', 'Signal level is very low (below −70 dBFS RMS).');
    if (flatness !== null && flatness > 0.35) add('broadband', 'Broadband-like spectrum. Noise may mask tones; the sound source is not identified.');
    if (this.drops) add('dropped-frames', 'Capture contained dropped frames.');
    if (this.gaps) add('discontinuities', 'Capture contained input discontinuities.');
    if (this.timeGaps) add('observation-gaps', 'Observation timestamps contained gaps during this session.');
    if (capture.mode === 'sampled') add('sampled', 'Sampled fallback: continuous coverage cannot be verified.');
    if (this.modeChanged) add('mode-changed', 'Acquisition mode changed during this session.');
    if (file) add('temporal-unavailable', 'Whole-file average: within-file stability was not measured.');
    else if (recentSpan < 2 || this.recent.length < 8) add('insufficient-duration', 'Collect at least two seconds and eight frames to assess recent stability.');
    if (!file && rmsRange !== null && rmsRange > 3) add('level-changing', 'Signal level changed by more than 3 dB within the recent observation window.');
    else if (!file && levels.length > 0 && levels.length < this.recent.length) add('level-changing', 'The recent observation window includes both silence and nonzero signal.');
    if (!file && peakRange !== null && peakRange > Math.max(2 * spectrum.resolution, (spectrum.peaks[0]?.frequency ?? 0) * 0.05)) add('peak-changing', 'The strongest spectral component changed within the recent observation window.');
    if (this.last - this.changedAt <= 3) add('context-changing', 'Reference settings changed within the recent observation window.');
    if (unresolved) add('resolution', 'Reference components are too close for the actual window resolution.');
    if (capture.browserEvidence && Object.values(capture.browserEvidence.processing).some(value => value === true)) add('processing-active', 'Browser-reported microphone processing is active and may change levels or spectral shape.');
    return { policy: 'quality-v1', sessionSpanSeconds: span, recentSpanSeconds: recentSpan, coverageSeconds: capture.mode === 'worklet' && !this.modeChanged ? this.covered : null,
      frameCount: this.frames, recentFrameCount: this.recent.length, clippedFrames: this.clips, lowSignalFrames: this.weak,
      droppedFrames: this.drops, discontinuities: this.gaps, rmsRangeDb: rmsRange, dominantRangeHz: peakRange, flatness,
      effectiveResolutionHz: spectrum.sampleRate / (spectrum.windowSamples ?? spectrum.fftSize), stabilityAvailable: !file && recentSpan >= 2 && this.recent.length >= 8, issues, endedReason: this.end };
  }
}
