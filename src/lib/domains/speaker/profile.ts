import type { Spectrum } from '../../dsp/types.ts';
import type { CaptureMetadata } from '../../audio/live-types.ts';

export const SPEAKER_BANDS = [
  { name: 'Bass', low: 20, high: 250 },
  { name: 'Mid', low: 250, high: 4000 },
  { name: 'Treble', low: 4000, high: 20000 },
] as const;
export type Scores = [number, number, number];
export type SoundProfile = 'Bass Dominant' | 'Mid Dominant' | 'Treble Dominant' | 'Balanced';
export const MINIMUM_SECONDS = 10;
const DOMINANCE_RATIO = 10 ** (3 / 10);

/** Half-open bands, except the inclusive final upper limit. DC/out-of-range bins have no owner. */
export function speakerBand(frequency: number, nyquist = 20000): number {
  if (!Number.isFinite(frequency) || frequency < 20 || frequency > Math.min(20000, nyquist)) return -1;
  return frequency < 250 ? 0 : frequency < 4000 ? 1 : 2;
}

/**
 * Tool-specific log-frequency mean power density; never reuse the core's 2 kHz band boundary.
 * Core power[k] is one-sided, window-energy-normalized bin power. Divide by bin Hz,
 * then weight its constant-density cell by log2(upper/lower). Divide by represented
 * octave width in each consumer band. This is quadrature of mean PSD over log f,
 * equivalent to octave-aware grouping of mean densities, NOT summed band energy.
 * Flat power density gives equal scores regardless of bin count or band width.
 * Bin centers own boundaries (250 -> Mid, 4000 -> Treble); cells are clipped to that
 * band and Nyquist, with normalization by actual represented width. Resolution is
 * still finite. Pink noise need not look balanced; this is not acoustic weighting.
 */
export function speakerScores(s: Spectrum): { scores: Scores; available: boolean[]; upperHz: number } | null {
  const step = s.sampleRate / s.fftSize, upperHz = Math.min(20000, s.sampleRate / 2);
  if (!Number.isFinite(step) || step <= 0 || s.power.length !== s.fftSize / 2 + 1) return null;
  const scores: Scores = [0, 0, 0], widths: Scores = [0, 0, 0];
  for (let k = 0; k < s.power.length; k++) {
    const power = s.power[k];
    if (!Number.isFinite(power) || power < 0) return null;
    const f = k * step, band = speakerBand(f, upperHz);
    if (band < 0) continue;
    const low = Math.max(SPEAKER_BANDS[band].low, f - step / 2);
    const high = Math.min(SPEAKER_BANDS[band].high, upperHz, f + step / 2);
    if (high <= low) continue;
    const octaves = Math.log2(high / low);
    scores[band] += power / step * octaves; widths[band] += octaves;
  }
  return { scores: scores.map((v, i) => widths[i] ? v / widths[i] : 0) as Scores, available: widths.map(v => v > 0), upperHz };
}

export function classifySpeaker(scores: Scores): SoundProfile | null {
  if (scores.some(v => !Number.isFinite(v) || v < 0) || !scores.some(v => v > 0)) return null;
  const ranked = scores.map((value, band) => ({ value, band })).sort((a, b) => b.value - a.value);
  return ranked[0].value >= ranked[1].value * DOMINANCE_RATIO
    ? `${SPEAKER_BANDS[ranked[0].band].name} Dominant` : 'Balanced';
}

/** Largest-remainder rounding keeps displayed whole percentages at exactly 100. */
export function relativeEnergy(scores: Scores): Scores {
  const sum = scores.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return [0, 0, 0];
  const exact = scores.map(v => v / sum * 100), rounded = exact.map(Math.floor);
  const order = exact.map((v, i) => ({ i, remainder: v - rounded[i] })).sort((a, b) => b.remainder - a.remainder);
  const remaining = 100 - rounded.reduce((a, b) => a + b, 0);
  for (let n = 0; n < remaining; n++) rounded[order[n].i]++;
  return rounded as Scores;
}

export class SpeakerSession {
  validSeconds = 0;
  scores: Scores = [0, 0, 0];
  private previous: { capture: CaptureMetadata; valid: boolean } | undefined;
  get profile(): SoundProfile | null { return this.validSeconds >= MINIMUM_SECONDS ? classifySpeaker(this.scores) : null; }
  reset() { this.validSeconds = 0; this.scores = [0, 0, 0]; this.previous = undefined; }
  observe(s: Spectrum, capture: CaptureMetadata) {
    const bands = speakerScores(s);
    let issue = '';
    if (!bands || !Number.isFinite(s.rms) || !(Number.isFinite(s.rmsDbFS) || s.rms === 0 && s.rmsDbFS === -Infinity) || !Number.isFinite(s.samplePeak)) issue = 'Waiting for usable sound.';
    else if (!bands.available.every(Boolean)) issue = 'This capture cannot cover all three bands. A full profile is unavailable.';
    else if (s.clipped || s.samplePeak >= 0.999) issue = 'Sound is too loud. Lower the volume or move a little farther away.';
    else if (s.rmsDbFS < -70 || !bands.scores.some(v => v > 0)) issue = 'Sound is too quiet. Play some audio nearby at a comfortable volume.';
    const valid = !issue && capture.mode !== 'file' && Number.isFinite(capture.timeSeconds);
    const previous = this.previous;
    // Never infer active time across gaps, loss, duplicate timestamps, or changed capture paths.
    // Both endpoints must be usable. Cap elapsed time by one observed window, so overlapping
    // worklet frames and sampled fallback cannot count an unobserved interval twice.
    let seconds = 0;
    if (previous && previous.capture.clockId === capture.clockId && previous.capture.mode === capture.mode) {
      const delta = capture.timeSeconds - previous.capture.timeSeconds;
      if (delta <= 0) return { bands, valid: false, issue: 'Waiting for the next audio frame.', seconds: 0 };
      const support = (s.windowSamples ?? s.fftSize) / s.sampleRate;
      if (valid && previous.valid && delta <= Math.max(0.25, support * 1.5) && capture.droppedFrames === previous.capture.droppedFrames && capture.discontinuities === previous.capture.discontinuities) seconds = Math.min(delta, support);
    }
    this.previous = { capture: { ...capture }, valid };
    if (seconds > 0 && bands) {
      this.validSeconds += seconds;
      // Time-weighted running mean: fixed memory, unsmoothed linear power, no PCM history.
      this.scores = this.scores.map((v, i) => v + (bands.scores[i] - v) * seconds / this.validSeconds) as Scores;
    }
    return { bands, valid, issue, seconds };
  }
}
