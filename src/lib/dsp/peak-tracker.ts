import type { Peak } from './types.ts';

export interface PeakTrack { id: number; frequency: number; dbFS: number; persistenceSeconds: number; movementHz: number; observations: number }
interface Track extends PeakTrack { firstTime: number; lastTime: number; initialHz: number }

/** Bounded, conservative peak association. Persistence is elapsed observation time, not confidence. */
export class PeakTracker {
  private tracks: Track[] = [];
  private nextId = 1;
  private lastTime = -Infinity;
  reset(): void { this.tracks = []; this.lastTime = -Infinity; this.nextId = 1; }
  update(peaks: Peak[], timeSeconds: number, resolution: number): PeakTrack[] {
    if (!Number.isFinite(timeSeconds) || !Number.isFinite(resolution) || resolution <= 0) throw new RangeError('Valid timestamp and resolution required.');
    if (timeSeconds <= this.lastTime) return this.visible(timeSeconds);
    // Long gaps cannot establish persistence across an unobserved interval.
    if (timeSeconds - this.lastTime > 0.5) this.tracks = [];
    this.lastTime = timeSeconds;
    this.tracks = this.tracks.filter(track => timeSeconds - track.lastTime <= 0.25);
    const assigned = new Set<number>();
    for (const peak of peaks.filter(p => Number.isFinite(p.frequency) && Number.isFinite(p.dbFS) && p.dbFS >= -80).slice(0, 12)) {
      const track = this.tracks.filter(t => !assigned.has(t.id) && Math.abs(t.frequency - peak.frequency) <= Math.max(resolution * 1.5, Math.min(resolution * 3, t.frequency * 0.01)) && Math.abs(t.dbFS - peak.dbFS) < 15)
        .sort((a, b) => Math.abs(a.frequency - peak.frequency) - Math.abs(b.frequency - peak.frequency))[0];
      if (track) {
        track.frequency = peak.frequency; track.dbFS = peak.dbFS; track.lastTime = timeSeconds;
        track.observations++; track.persistenceSeconds = timeSeconds - track.firstTime; track.movementHz = peak.frequency - track.initialHz; assigned.add(track.id);
      } else if (this.tracks.length < 12) {
        const id = this.nextId++;
        this.tracks.push({ id, frequency: peak.frequency, dbFS: peak.dbFS, firstTime: timeSeconds, lastTime: timeSeconds, initialHz: peak.frequency, observations: 1, persistenceSeconds: 0, movementHz: 0 }); assigned.add(id);
      }
    }
    return this.visible(timeSeconds);
  }
  private visible(time: number): PeakTrack[] {
    return this.tracks.filter(t => t.observations >= 4 && t.persistenceSeconds >= 0.4 && time - t.lastTime <= 0.12)
      .sort((a, b) => b.dbFS - a.dbFS).slice(0, 6).map(({ id, frequency, dbFS, persistenceSeconds, movementHz, observations }) => ({ id, frequency, dbFS, persistenceSeconds, movementHz, observations }));
  }
}
