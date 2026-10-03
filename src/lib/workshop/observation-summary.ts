import { createMeasurementExport, EXPORT_VERSION } from '../measurement/export.ts';
import { assessEngineRepeatability, type MeasuredEngineSnapshot } from '../domains/engine/repeatability.ts';
import { validateEngineConfiguration } from '../domains/engine/references.ts';

export const OBSERVATION_SCHEMA = 'workshopgirl.engine-observation/1' as const;
export const MAX_OBSERVATIONS = 24;
export interface EngineObservationSummary {
  schemaVersion: typeof OBSERVATION_SCHEMA; measurementSchema: typeof EXPORT_VERSION;
  sourceTool: 'engine-sound-analyzer'; engineVersion: '3'; id: string; capturedAt: string;
  label: string; notes: string; source: 'live frame' | 'file average'; durationSeconds: number;
  context: { mode: 'worklet' | 'sampled' | 'file'; sampleRate: number; fftSize: number; windowSamples: number; manualRpm: number | null; cylinders: number | null; cycle: 2 | 4 | null; harmonicHz: number | null };
  peaks: { frequency: number; dbFS: number }[];
  quality: { policy: 'quality-v1'; stabilityAvailable: boolean; sessionSpanSeconds: number; recentSpanSeconds: number; frameCount: number; droppedFrames: number; discontinuities: number; effectiveResolutionHz: number; issues: { code: string; message: string }[] };
  repeatability: { policy: 'repeatability-v1'; status: string; snapshotCount: number; pairCount: number; reasons: string[] };
}

/** Reuse the validated measurement serializer; persist only a bounded, explicit projection. */
export function summarizeEngineObservation(snapshot: MeasuredEngineSnapshot, repeats: MeasuredEngineSnapshot[] = []): EngineObservationSummary {
  validateEngineConfiguration(snapshot.engine.configuration);
  const repeatability = assessEngineRepeatability(repeats);
  const exported = createMeasurementExport([snapshot], { ab: null, repeatability }, { browserFamily: '', observations: '', checks: [] });
  const item = exported.measurements[0], configuration = snapshot.engine.configuration;
  const result: EngineObservationSummary = {
    schemaVersion: OBSERVATION_SCHEMA, measurementSchema: EXPORT_VERSION, sourceTool: 'engine-sound-analyzer', engineVersion: '3',
    id: item.id, capturedAt: item.capturedAt, label: item.label, notes: item.notes, source: item.source,
    durationSeconds: item.durationSeconds,
    context: { mode: item.acquisition.mode, sampleRate: item.spectrum.sampleRate, fftSize: item.spectrum.fftSize, windowSamples: item.spectrum.windowSamples,
      manualRpm: configuration.rpm, cylinders: configuration.cylinders, cycle: configuration.cycle, harmonicHz: configuration.harmonicHz },
    peaks: item.spectrum.peaks.slice(0, 6).map(peak => ({ frequency: peak.frequency, dbFS: peak.dbFS })),
    quality: { policy: 'quality-v1', stabilityAvailable: item.quality.stabilityAvailable, sessionSpanSeconds: item.quality.sessionSpanSeconds,
      recentSpanSeconds: item.quality.recentSpanSeconds, frameCount: item.quality.frameCount, droppedFrames: item.quality.droppedFrames,
      discontinuities: item.quality.discontinuities, effectiveResolutionHz: item.quality.effectiveResolutionHz,
      issues: item.quality.issues.slice(0, 16).map(issue => ({ code: issue.code.slice(0, 80), message: issue.message.slice(0, 300) })) },
    repeatability: { policy: repeatability.policy, status: repeatability.status, snapshotCount: repeats.length, pairCount: repeatability.pairs.length,
      reasons: repeatability.reasons.slice(0, 12).map(reason => reason.slice(0, 300)) },
  };
  if (!isEngineObservation(result)) throw new Error('This observation summary is invalid or too large. Nothing was attached.');
  return result;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const boundedText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0;
const counter = (value: unknown): value is number => nonnegative(value) && Number.isSafeInteger(value);
const keys = (value: Record<string, unknown>, fields: string[]) => Object.keys(value).length === fields.length && Object.keys(value).every(key => fields.includes(key));

/** Reject arbitrary fields/binary payloads, nonfinite values and unbounded imported storage. */
export function isEngineObservation(value: unknown): value is EngineObservationSummary {
  if (!object(value) || !keys(value, ['schemaVersion','measurementSchema','sourceTool','engineVersion','id','capturedAt','label','notes','source','durationSeconds','context','peaks','quality','repeatability'])
    || value.schemaVersion !== OBSERVATION_SCHEMA || value.measurementSchema !== EXPORT_VERSION || value.sourceTool !== 'engine-sound-analyzer' || value.engineVersion !== '3'
    || !boundedText(value.id, 100) || !value.id || !boundedText(value.capturedAt, 40) || !Number.isFinite(Date.parse(value.capturedAt))
    || !boundedText(value.label, 80) || !boundedText(value.notes, 1000) || !['live frame','file average'].includes(String(value.source))
    || !finite(value.durationSeconds) || value.durationSeconds <= 0 || value.durationSeconds > 60) return false;
  const context = value.context, quality = value.quality, repeat = value.repeatability;
  if (!object(context) || !keys(context, ['mode','sampleRate','fftSize','windowSamples','manualRpm','cylinders','cycle','harmonicHz'])
    || !['worklet','sampled','file'].includes(String(context.mode)) || !finite(context.sampleRate) || context.sampleRate < 8000 || context.sampleRate > 384000
    || !counter(context.fftSize) || context.fftSize < 256 || context.fftSize > 32768 || (context.fftSize & (context.fftSize - 1))
    || !counter(context.windowSamples) || context.windowSamples < 2 || context.windowSamples > context.fftSize
    || (context.manualRpm !== null && (!nonnegative(context.manualRpm) || context.manualRpm > 30000))
    || (context.cylinders !== null && (!counter(context.cylinders) || context.cylinders < 1 || context.cylinders > 64))
    || ![null,2,4].includes(context.cycle as number | null)
    || (context.harmonicHz !== null && (!finite(context.harmonicHz) || context.harmonicHz < 1 || context.harmonicHz > 20000))) return false;
  const nyquist = context.sampleRate / 2;
  if (!Array.isArray(value.peaks) || value.peaks.length > 6 || !value.peaks.every(peak => object(peak) && keys(peak, ['frequency','dbFS']) && nonnegative(peak.frequency) && peak.frequency <= nyquist && finite(peak.dbFS))) return false;
  if (!object(quality) || !keys(quality, ['policy','stabilityAvailable','sessionSpanSeconds','recentSpanSeconds','frameCount','droppedFrames','discontinuities','effectiveResolutionHz','issues'])
    || quality.policy !== 'quality-v1' || typeof quality.stabilityAvailable !== 'boolean'
    || !['sessionSpanSeconds','recentSpanSeconds','effectiveResolutionHz'].every(key => nonnegative(quality[key]))
    || !['frameCount','droppedFrames','discontinuities'].every(key => counter(quality[key]))
    || !Array.isArray(quality.issues) || quality.issues.length > 16 || !quality.issues.every(issue => object(issue) && keys(issue, ['code','message']) && boundedText(issue.code, 80) && boundedText(issue.message, 300))) return false;
  if (!object(repeat) || !keys(repeat, ['policy','status','snapshotCount','pairCount','reasons']) || repeat.policy !== 'repeatability-v1'
    || !['GOOD MATCH','CONDITIONS DIFFER','LOW SIGNAL','INSUFFICIENT DATA','REVIEW QUALITY','SIGNALS DIFFER','CONTEXT UNVERIFIED'].includes(String(repeat.status))
    || !counter(repeat.snapshotCount) || repeat.snapshotCount > 6 || !counter(repeat.pairCount) || repeat.pairCount > 15
    || repeat.pairCount !== repeat.snapshotCount * (repeat.snapshotCount - 1) / 2
    || !Array.isArray(repeat.reasons) || repeat.reasons.length > 12 || !repeat.reasons.every(reason => boundedText(reason, 300))) return false;
  return JSON.stringify(value).length <= 16000;
}
