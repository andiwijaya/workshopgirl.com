import { mountAnalyzer } from '../sound-analyzer/controller.ts';
import { PeakTracker } from '../../lib/dsp/peak-tracker.ts';
import { analyzeEngine, captureEngineSnapshot, type EngineObservation } from '../../lib/domains/engine/analysis.ts';
import type { MeasuredEngineSnapshot } from '../../lib/domains/engine/repeatability.ts';
import { MeasurementTools } from './measurement-tools.ts';
import { emptyEngineConfiguration, engineReferences, validateEngineConfiguration, type EngineConfiguration } from '../../lib/domains/engine/references.ts';
import type { Spectrum } from '../../lib/dsp/types.ts';
import type { CaptureMetadata } from '../../lib/audio/live-types.ts';
import { renderEngine, renderEngineReferences, renderEngineComparison } from './view.ts';

export function mountEngineAnalyzer(root: HTMLElement): void {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const tracker = new PeakTracker(), events = new AbortController();
  let config = emptyEngineConfiguration(), observation: EngineObservation | undefined, spectrum: Spectrum | undefined, metadata: CaptureMetadata | undefined, valid = true;
  let lastMode: CaptureMetadata['mode'] | undefined, dropped = 0, discontinuities = 0;
  const measurement: MeasurementTools = new MeasurementTools(root, (): MeasuredEngineSnapshot | undefined => valid && spectrum && observation && metadata ? measurement.decorate(captureEngineSnapshot({ label: metadata.mode === 'file' ? 'File average' : 'Microphone frame', source: metadata.mode === 'file' ? 'file average' : 'live frame', capturedAt: new Date().toISOString(), spectrum }, observation, metadata)) : undefined);
  const syncToolbar = () => {
    get<HTMLButtonElement>('engine-live-toggle').textContent = get<HTMLButtonElement>('stop-analysis').disabled ? 'Start live' : 'Stop';
    get<HTMLButtonElement>('engine-capture-a').disabled = get<HTMLButtonElement>('save-a').disabled;
    get<HTMLButtonElement>('engine-capture-b').disabled = get<HTMLButtonElement>('save-b').disabled;
  };
  const handle = mountAnalyzer<MeasuredEngineSnapshot>(root, {
    continuous: true, liveSnapshots: true, minimumFrequency: 5,
    measurement: (next, capture) => {
      spectrum = next; metadata = capture;
      if (lastMode !== capture.mode || dropped !== capture.droppedFrames || discontinuities !== capture.discontinuities) tracker.reset();
      lastMode = capture.mode; dropped = capture.droppedFrames; discontinuities = capture.discontinuities;
      const tracks = capture.mode === 'file' ? [] : tracker.update(next.peaks, capture.timeSeconds, next.resolution);
      observation = analyzeEngine(next, config, tracks);
      measurement.observe(next, capture, observation.harmonics.status === 'unresolved');
    },
    render: () => { renderEngine(root, observation, metadata); measurement.render(valid, observation?.harmonics.status === 'unresolved'); syncToolbar(); },
    reset: () => { tracker.reset(); spectrum = undefined; metadata = undefined; observation = undefined; lastMode = undefined; measurement.reset(); measurement.render(valid); renderEngine(root); },
    stopped: reason => { measurement.ended(reason); measurement.render(valid); },
    capture: base => measurement.decorate(captureEngineSnapshot(base, observation!, metadata!)),
    compare: (a, b) => { renderEngineComparison(root, a, b); measurement.compare(a, b); },
    canCapture: () => valid && !!observation,
    markers: () => engineReferences(config).map(reference => ({ frequency: reference.frequency, label: reference.kind === 'firing' ? 'Firing' : `${reference.order}×`, color: reference.kind === 'firing' ? '#6ad6ef' : '#e9bb6d' })),
  });
  const read = () => {
    const previous = JSON.stringify(config);
    const number = (id: string) => { const field = get<HTMLInputElement>(id); if (field.validity.badInput) throw new Error('Enter a valid number or leave the field blank.'); return field.value.trim() === '' ? null : Number(field.value); };
    try {
      const next: EngineConfiguration = { rpm: number('engine-rpm'), cylinders: number('engine-cylinders'), cycle: (get<HTMLSelectElement>('engine-cycle').value ? Number(get<HTMLSelectElement>('engine-cycle').value) : null) as 2 | 4 | null, harmonicHz: number('harmonic-hz') };
      validateEngineConfiguration(next); config = next; valid = true; get('engine-input-error').hidden = true;
    } catch (error) { config = emptyEngineConfiguration(); valid = false; get('engine-input-error').hidden = false; get('engine-input-error').textContent = error instanceof Error ? error.message : 'Check reference settings.'; }
    for (const id of ['engine-rpm', 'engine-cylinders', 'engine-cycle', 'harmonic-hz']) get(id).setAttribute('aria-invalid', String(!valid));
    if (JSON.stringify(config) !== previous) measurement.changed();
    if (spectrum) observation = analyzeEngine(spectrum, config, observation?.persistentPeaks);
    renderEngineReferences(root, { configuration: config, references: engineReferences(config) }); handle.refresh(); syncToolbar();
  };
  for (const id of ['engine-rpm', 'engine-cylinders', 'engine-cycle', 'harmonic-hz']) get(id).addEventListener('input', read, { signal: events.signal });
  get('engine-live-toggle').addEventListener('click', () => { get<HTMLButtonElement>(get<HTMLButtonElement>('stop-analysis').disabled ? 'start-mic' : 'stop-analysis').click(); syncToolbar(); }, { signal: events.signal });
  for (const slot of ['a', 'b']) get(`engine-capture-${slot}`).addEventListener('click', () => get<HTMLButtonElement>(`save-${slot}`).click(), { signal: events.signal });
  // Also reflect asynchronous permission/worker changes without a polling timer.
  const observer = new MutationObserver(syncToolbar);
  for (const id of ['start-mic', 'stop-analysis', 'save-a', 'save-b']) observer.observe(get(id), { attributes: true, attributeFilter: ['disabled'] });
  document.addEventListener('astro:before-swap', () => { observer.disconnect(); events.abort(); }, { once: true, signal: events.signal });
  read();
}
