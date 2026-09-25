import type { MeasuredSnapshot, RepeatabilityResult } from './repeatability.ts';

export const EXPORT_VERSION = 'workshopgirl.measurement/1';
export interface DeviceValidationNotes { browserFamily: string; observations: string; checks: { name: string; result: string }[] }
/** Explicit serializer: no raw PCM, device IDs, UA, arbitrary browser settings or hidden storage. */
export function createMeasurementExport(snapshots: MeasuredSnapshot[], comparisons: { ab: RepeatabilityResult | null; repeatability: RepeatabilityResult }, validation: DeviceValidationNotes, domain: (snapshot: MeasuredSnapshot) => unknown = () => null) {
  const document = {
    $schema: 'https://workshopgirl.com/schemas/measurement-v1.schema.json', schemaVersion: EXPORT_VERSION, engineVersion: '3', createdAt: new Date().toISOString(),
    conventions: { snapshot: 'Latest live frame or whole-file average; quality describes preceding observations separately.', spectrum: 'One-sided Hann bin power and tonal dBFS; bin k = k * sampleRate / fftSize. No calibrated SPL.', silence: 'rmsDbFS null denotes negative infinity.', similarity: 'Normalized-power overlap, 20 Hz–20 kHz/Nyquist; gain removed; not machine similarity.' },
    measurements: snapshots.map(s => ({
      id: s.measurement.id, label: s.label.slice(0, 80), notes: s.measurement.notes.slice(0, 1000), source: s.source, capturedAt: s.capturedAt,
      durationSeconds: s.measurement.durationSeconds, quality: structuredClone(s.measurement.quality),
      acquisition: { mode: s.acquisition.mode, clock: s.acquisition.clock, clockId: s.acquisition.clockId, timeSeconds: s.acquisition.timeSeconds, frameStart: s.acquisition.frameStart, sequence: s.acquisition.sequence, droppedFrames: s.acquisition.droppedFrames, discontinuities: s.acquisition.discontinuities, browserEvidence: s.acquisition.browserEvidence ? { audioWorkletAvailable: s.acquisition.browserEvidence.audioWorkletAvailable, outputBaseLatencySeconds: s.acquisition.browserEvidence.outputBaseLatencySeconds, processing: { autoGainControl: s.acquisition.browserEvidence.processing.autoGainControl, noiseSuppression: s.acquisition.browserEvidence.processing.noiseSuppression, echoCancellation: s.acquisition.browserEvidence.processing.echoCancellation } } : null },
      spectrum: { sampleRate: s.spectrum.sampleRate, fftSize: s.spectrum.fftSize, windowSamples: s.spectrum.windowSamples ?? s.spectrum.fftSize,
        rms: s.spectrum.rms, rmsDbFS: s.spectrum.rms === 0 && s.spectrum.rmsDbFS === -Infinity ? null : s.spectrum.rmsDbFS, samplePeak: s.spectrum.samplePeak,
        power: Array.from(s.spectrum.power), tonalDbFS: Array.from(s.spectrum.db), peaks: structuredClone(s.spectrum.peaks), bands: structuredClone(s.spectrum.bands) },
      domain: domain(s),
    })), comparisons, deviceValidation: { browserFamily: validation.browserFamily.slice(0, 80), observations: validation.observations.slice(0, 2000), checks: validation.checks.slice(0, 8) },
  };
  const errors = validateMeasurementExport(document);
  if (errors.length) throw new Error(`Cannot export measurement: ${errors.join(' ')}`);
  return document;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
/** Structural/numeric validation of generated documents. This is not a UI import feature. */
export function validateMeasurementExport(value: unknown): string[] {
  const errors: string[] = [];
  if (!object(value) || value.schemaVersion !== EXPORT_VERSION || value.engineVersion !== '3') return ['Unsupported export schema/version.'];
  if (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) errors.push('Invalid export timestamp.');
  if (!Array.isArray(value.measurements) || value.measurements.length < 1 || value.measurements.length > 9) return [...errors, 'Expected one to nine measurements.'];
  const ids = new Set<string>();
  for (const item of value.measurements) {
    if (!object(item) || !object(item.spectrum) || !object(item.quality) || !object(item.acquisition)) { errors.push('Missing measurement structure.'); continue; }
    if (typeof item.id !== 'string' || !item.id || ids.has(item.id)) errors.push('Measurement IDs must be unique.'); else ids.add(item.id);
    if (typeof item.label !== 'string' || item.label.length > 80 || typeof item.notes !== 'string' || item.notes.length > 1000) errors.push('Invalid annotation.');
    if (!['live frame', 'file average'].includes(String(item.source)) || typeof item.capturedAt !== 'string' || !Number.isFinite(Date.parse(item.capturedAt))) errors.push('Invalid source/timestamp.');
    if (!finite(item.durationSeconds) || item.durationSeconds <= 0 || item.durationSeconds > 60) errors.push('Invalid measurement duration.');
    const s = item.spectrum, n = s.fftSize;
    if (!finite(n) || !Number.isInteger(n) || n < 256 || n > 32768 || (n & (n - 1)) || !finite(s.sampleRate) || s.sampleRate < 8000 || s.sampleRate > 384000) { errors.push('Invalid spectrum grid.'); continue; }
    if (!finite(s.windowSamples) || !Number.isInteger(s.windowSamples) || s.windowSamples < 2 || s.windowSamples > n) errors.push('Invalid window support.');
    for (const field of ['power', 'tonalDbFS']) if (!Array.isArray(s[field]) || s[field].length !== n / 2 + 1 || !s[field].every(v => finite(v) && (field !== 'power' || v >= 0))) errors.push(`Invalid ${field} array.`);
    if (!finite(s.rms) || s.rms < 0 || !finite(s.samplePeak) || s.samplePeak < 0 || (s.rms === 0 ? s.rmsDbFS !== null : !finite(s.rmsDbFS))) errors.push('Invalid levels.');
    if (!Array.isArray(s.peaks) || s.peaks.length > 6 || !Array.isArray(s.bands) || s.bands.length !== 3) errors.push('Invalid peak/band summary.');
    if (item.quality.policy !== 'quality-v1' || !Array.isArray(item.quality.issues) || item.quality.issues.length > 16 || !finite(item.quality.sessionSpanSeconds)) errors.push('Invalid quality summary.');
    if (!['worklet', 'sampled', 'file'].includes(String(item.acquisition.mode)) || typeof item.acquisition.clockId !== 'string' || !finite(item.acquisition.timeSeconds)) errors.push('Invalid capture metadata.');
    for (const field of ['sequence', 'droppedFrames', 'discontinuities']) if (!finite(item.acquisition[field]) || !Number.isInteger(item.acquisition[field]) || item.acquisition[field] < 0) errors.push('Invalid capture counter.');
  }
  if (!object(value.comparisons) || !object(value.deviceValidation)) errors.push('Missing comparison/validation context.');
  // Also prevent silent JSON NaN/Infinity conversion anywhere in the generated structure.
  const finiteTree = (node: unknown): boolean => typeof node === 'number' ? Number.isFinite(node) : Array.isArray(node) ? node.every(finiteTree) : object(node) ? Object.values(node).every(finiteTree) : true;
  if (!finiteTree(value)) errors.push('Non-finite export value.');
  return [...new Set(errors)];
}
