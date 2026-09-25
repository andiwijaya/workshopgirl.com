import { QualityTracker } from '../../lib/measurement/quality.ts';
import { assessEngineRepeatability, type MeasuredEngineSnapshot } from '../../lib/domains/engine/repeatability.ts';
import type { EngineSnapshot } from '../../lib/domains/engine/analysis.ts';
import type { Spectrum } from '../../lib/dsp/types.ts';
import type { CaptureMetadata } from '../../lib/audio/live-types.ts';
import { createMeasurementExport } from '../../lib/measurement/export.ts';
import { LocalDownload } from '../../lib/audio/local-download.ts';
import type { RepeatabilityResult } from '../../lib/measurement/repeatability.ts';

export class MeasurementTools {
  private quality = new QualityTracker();
  private repeats: MeasuredEngineSnapshot[] = [];
  private a: MeasuredEngineSnapshot | undefined; private b: MeasuredEngineSnapshot | undefined;
  private spectrum: Spectrum | undefined; private capture: CaptureMetadata | undefined; private unresolved = false;
  private download = new LocalDownload(); private events = new AbortController();
  private root: HTMLElement; private current: () => MeasuredEngineSnapshot | undefined;
  constructor(root: HTMLElement, current: () => MeasuredEngineSnapshot | undefined) {
    this.root = root; this.current = current;
    this.el('capture-repeat').addEventListener('click', () => { const snapshot = this.current(); if (snapshot && this.repeats.length < 6) this.repeats.push(snapshot); this.renderRepeats(); }, { signal: this.events.signal });
    this.el('clear-repeats').addEventListener('click', () => { this.repeats = []; this.renderRepeats(); }, { signal: this.events.signal });
    this.el('export-measurements').addEventListener('click', () => this.export(), { signal: this.events.signal });
    window.addEventListener('pagehide', () => this.download.dispose(), { signal: this.events.signal });
    document.addEventListener('astro:before-swap', () => { this.download.dispose(); this.events.abort(); }, { once: true, signal: this.events.signal });
  }
  private el<T extends HTMLElement = HTMLElement>(id: string): T { return this.root.querySelector<T>(`#${id}`)!; }
  private list(id: string, values: string[]) { this.el(id).replaceChildren(...values.map(value => { const item = document.createElement('li'); item.textContent = value; return item; })); }
  reset() { this.quality.reset(); this.spectrum = undefined; this.capture = undefined; }
  changed() { this.quality.contextChanged(); }
  ended(reason: string) { this.quality.ended(reason); }
  observe(spectrum: Spectrum, capture: CaptureMetadata, unresolved: boolean) { this.spectrum = spectrum; this.capture = capture; this.unresolved = unresolved; this.quality.update(spectrum, capture); }
  decorate(base: EngineSnapshot): MeasuredEngineSnapshot {
    return { ...base, label: this.el<HTMLInputElement>('measurement-label').value.trim().slice(0, 80) || base.label,
      measurement: { id: crypto.randomUUID(), notes: this.el<HTMLTextAreaElement>('measurement-notes').value.slice(0, 1000),
        durationSeconds: base.source === 'file average' ? base.acquisition.durationSeconds ?? base.acquisition.timeSeconds : (base.spectrum.windowSamples ?? base.spectrum.fftSize) / base.spectrum.sampleRate,
        quality: this.quality.report(base.spectrum, base.acquisition, base.engine.harmonics.status === 'unresolved') } };
  }
  compare(a?: MeasuredEngineSnapshot, b?: MeasuredEngineSnapshot) {
    this.a = a; this.b = b;
    this.el('comparison-quality').hidden = !a || !b;
    if (a && b) { const result = assessEngineRepeatability([a, b]); this.el('comparison-quality-status').textContent = `${result.status} · ${result.reasons.join(' ')}`; this.list('comparison-quality-pairs', this.pairText(result, [a, b])); }
    this.renderRepeats();
  }
  private pairText(result: RepeatabilityResult, records: MeasuredEngineSnapshot[]) {
    const name = (id: string) => { const index = records.findIndex(r => r.measurement.id === id); return index < 0 ? id : `${index + 1}. ${records[index].label}`; };
    const number = (value: number | null, unit: string, digits = 1) => value === null ? 'unavailable' : `${value.toFixed(digits)} ${unit}`;
    return result.pairs.map(pair => `${name(pair.a)} ↔ ${name(pair.b)}: shape overlap ${number(pair.similarity, '', 2)}; RMS B − A ${number(pair.rmsDeltaDb, 'dB')}; strongest peak Δ ${number(pair.peakDeltaHz, 'Hz')}; max band-share Δ ${pair.bandMaxDeltaPoints.toFixed(1)} points; max relative harmonic Δ ${number(pair.harmonicMaxDeltaDb, 'dB')}.`);
  }
  private renderRepeats() {
    const result = assessEngineRepeatability(this.repeats);
    this.el('repeatability-status').textContent = `${result.status} · ${this.repeats.length}/6 snapshots. ${result.reasons.join(' ')}`;
    this.list('repeat-snapshots', this.repeats.map(s => `${s.label} · ${s.capturedAt} · ${s.measurement.durationSeconds.toFixed(3)} s source interval`));
    this.list('repeatability-pairs', this.pairText(result, this.repeats));
    this.el<HTMLButtonElement>('clear-repeats').disabled = !this.repeats.length;
    this.el<HTMLButtonElement>('capture-repeat').disabled = this.el<HTMLButtonElement>('save-a').disabled || this.repeats.length >= 6;
    this.el<HTMLButtonElement>('export-measurements').disabled = this.el<HTMLButtonElement>('save-a').disabled && !this.a && !this.b && !this.repeats.length;
  }
  render(valid: boolean, unresolved = this.unresolved) {
    this.unresolved = unresolved;
    if (!this.spectrum || !this.capture) { this.el('measurement-quality-summary').textContent = 'Start analysis to collect quality observations.'; this.list('measurement-quality-issues', []); }
    else {
      const q = this.quality.report(this.spectrum, this.capture, this.unresolved);
      const duration = this.capture.mode === 'file' ? this.capture.durationSeconds ?? this.capture.timeSeconds : (this.spectrum.windowSamples ?? this.spectrum.fftSize) / this.spectrum.sampleRate;
      this.el('measurement-quality-summary').textContent = `${q.issues.length ? 'Review observations' : 'No flagged observations'} · current source interval ${duration.toFixed(3)} s · ${q.sessionSpanSeconds.toFixed(1)} s session span · ${q.recentSpanSeconds.toFixed(1)} s recent window · ${q.frameCount} observations · effective bin scale ${q.effectiveResolutionHz.toFixed(2)} Hz.`;
      this.list('measurement-quality-issues', q.issues.map(issue => issue.message));
      const evidence = this.capture.browserEvidence;
      this.el('browser-evidence').textContent = evidence ? `AudioWorklet API: ${evidence.audioWorkletAvailable ? 'available' : 'unavailable'}; acquisition ${this.capture.mode}; actual rate ${this.spectrum.sampleRate} Hz; AGC ${evidence.processing.autoGainControl ?? 'unreported'}, noise suppression ${evidence.processing.noiseSuppression ?? 'unreported'}, echo cancellation ${evidence.processing.echoCancellation ?? 'unreported'}. Output base latency: ${evidence.outputBaseLatencySeconds === null ? 'unreported' : `${(evidence.outputBaseLatencySeconds * 1000).toFixed(1)} ms`}. Input/display latency is not measured. ${q.droppedFrames} dropped frames; ${q.discontinuities} discontinuities.${q.endedReason ? ` Ended: ${q.endedReason}` : ''}` : 'File analysis has no microphone-device evidence. Within-file temporal stability was not measured.';
    }
    this.el<HTMLButtonElement>('capture-repeat').disabled = !valid || !this.spectrum || this.repeats.length >= 6;
    this.el<HTMLButtonElement>('export-measurements').disabled = (!valid || !this.spectrum) && !this.a && !this.b && !this.repeats.length;
  }
  private export() {
    try {
      const records = [this.current(), this.a, this.b, ...this.repeats].filter((s): s is MeasuredEngineSnapshot => !!s);
      const unique = [...new Map(records.map(record => [record.measurement.id, record])).values()];
      const data = createMeasurementExport(unique, { ab: this.a && this.b ? assessEngineRepeatability([this.a, this.b]) : null, repeatability: assessEngineRepeatability(this.repeats) }, {
        browserFamily: this.el<HTMLSelectElement>('validation-browser').value, observations: this.el<HTMLTextAreaElement>('validation-notes').value,
        checks: Array.from(this.root.querySelectorAll<HTMLSelectElement>('[data-check-name]')).map(select => ({ name: select.dataset.checkName!, result: select.value })),
      }, record => { const engine = (record as MeasuredEngineSnapshot).engine; return { name: 'engine', configuration: engine.configuration, references: engine.references, harmonicSource: engine.harmonicSource, harmonics: engine.harmonics, persistentPeaks: engine.persistentPeaks }; });
      this.download.save(data, 'workshopgirl-measurements-v1.json'); this.el('measurement-export-status').textContent = `Exported ${unique.length} measurement(s) locally using schema workshopgirl.measurement/1. No raw audio included.`;
    } catch (error) { this.el('measurement-export-status').textContent = error instanceof Error ? error.message : 'Export failed.'; }
  }
}
