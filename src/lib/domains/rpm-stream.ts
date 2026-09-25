/** Future source contract only. No OBD transport or clock synchronization is implemented. */
export interface RpmSample {
  rpm: number;
  timestampSeconds: number;
  clockId: string;
  uncertaintySeconds: number;
}
export interface RpmSource {
  readonly sourceId: string;
  /** Returns an unsubscribe function; consumers must reject stale/out-of-order samples. */
  subscribe(listener: (sample: RpmSample) => void): () => void;
}
/** Equal timestamps from different clocks are NOT synchronized observations. */
export function validRpmSample(sample: RpmSample): boolean {
  return Number.isFinite(sample.rpm) && sample.rpm >= 0 && Number.isFinite(sample.timestampSeconds) && sample.timestampSeconds >= 0 && sample.clockId.trim().length > 0 && Number.isFinite(sample.uncertaintySeconds) && sample.uncertaintySeconds >= 0;
}
