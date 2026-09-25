import type { EngineObservation, EngineSnapshot } from '../../lib/domains/engine/analysis.ts';
import { compareEngineSnapshots } from '../../lib/domains/engine/comparison.ts';
import type { CaptureMetadata } from '../../lib/audio/live-types.ts';

const hz = (value: number) => `${value.toFixed(1)} Hz`;
const text = (root: HTMLElement, id: string, value: string) => { root.querySelector<HTMLElement>(`#${id}`)!.textContent = value; };
function rows(root: HTMLElement, id: string, values: string[][]) {
  root.querySelector(`#${id}`)!.replaceChildren(...values.map(row => {
    const tr = document.createElement('tr');
    row.forEach((value, i) => { const cell = document.createElement(i === 0 ? 'th' : 'td'); if (i === 0) cell.setAttribute('scope', 'row'); cell.textContent = value; tr.append(cell); });
    return tr;
  }));
}
function list(root: HTMLElement, id: string, values: string[]) {
  root.querySelector(`#${id}`)!.replaceChildren(...values.map(value => { const item = document.createElement('li'); item.textContent = value; return item; }));
}
export function renderEngine(root: HTMLElement, observation?: EngineObservation, metadata?: CaptureMetadata) {
  if (!observation) {
    text(root, 'harmonic-summary', 'Start analysis to inspect harmonics.'); rows(root, 'harmonic-table', []);
    list(root, 'persistent-peaks', ['Waiting for live measurements.']); text(root, 'capture-quality', 'No active measurement. Recording is optional.'); return;
  }
  const { harmonics, persistentPeaks } = observation;
  const description = harmonics.status === 'unresolved' ? 'Reference harmonics are too close for this window. Increase FFT size before the next measurement.'
    : harmonics.status === 'quiet' ? 'Silence or near silence; no harmonic matches.'
      : harmonics.status === 'no-reference' ? 'No clear reference is available.'
        : `${harmonics.matchedCount} of 5 reference harmonics matched; ${harmonics.powerPercent.toFixed(1)}% of AC spectral power in matched three-bin bands.`;
  text(root, 'harmonic-summary', `${harmonics.referenceHz === null ? '' : `${hz(harmonics.referenceHz)} · ${observation.harmonicSource}. `}${description} Match tolerance ±${harmonics.toleranceHz.toFixed(2)} Hz.`);
  rows(root, 'harmonic-table', harmonics.harmonics.map(h => [`${h.order}× · ${hz(h.expectedHz)}`, h.detectedHz === null ? h.state.replaceAll('-', ' ') : hz(h.detectedHz), h.dbFS === null ? '—' : `${h.dbFS.toFixed(1)} dBFS / ${h.relativeDb!.toFixed(1)} dB`]));
  list(root, 'persistent-peaks', metadata?.mode === 'file' ? ['Persistence is available for live input only; a file average has no peak trajectory.'] : persistentPeaks.length ? persistentPeaks.map(p => `${hz(p.frequency)} · ${p.dbFS.toFixed(1)} dBFS · seen for ${p.persistenceSeconds.toFixed(1)} s · movement ${p.movementHz >= 0 ? '+' : ''}${p.movementHz.toFixed(1)} Hz`) : ['No persistent components yet. Brief or unstable peaks are omitted.']);
  if (metadata) text(root, 'capture-quality', `${metadata.mode === 'worklet' ? 'Sample-clock capture · 50% overlapping frames' : metadata.mode === 'sampled' ? 'Sampled fallback · gaps are possible; not continuous capture' : 'Whole-file analysis'} · ${metadata.droppedFrames} skipped frames · ${metadata.discontinuities} input discontinuities. No synchronized order tracking.`);
}
export function renderEngineReferences(root: HTMLElement, observation: Pick<EngineObservation, 'configuration' | 'references'>) {
  const rpm = observation.configuration.rpm;
  text(root, 'rpm-reference-summary', rpm === null ? 'No RPM reference. General frequency analysis remains available.' : `${rpm} RPM → shaft ${(rpm / 60).toFixed(2)} Hz. Manual reference; not synchronized order tracking.`);
  list(root, 'engine-markers', observation.references.map(r => `${r.label}: ${hz(r.frequency)}`));
}
export function renderEngineComparison(root: HTMLElement, a?: EngineSnapshot, b?: EngineSnapshot) {
  root.querySelector<HTMLElement>('#engine-comparison')!.hidden = !a || !b;
  if (!a || !b) return;
  const comparison = compareEngineSnapshots(a, b);
  text(root, 'engine-comparison-warning', comparison.warnings.length ? comparison.warnings.join(' ') : 'Recorded settings agree. Phone position, load, gain and wind still need to match.');
  text(root, 'engine-comparison-summary', `${comparison.spectral ? 'Spectra share the same frequency-bin grid.' : 'Different frequency grids: overlay only; bin differences are withheld.'} ${comparison.harmonicPowerDeltaDb === null ? 'Matched-harmonic power change is unavailable.' : `Matched-harmonic band power B − A: ${comparison.harmonicPowerDeltaDb.toFixed(1)} dB.`} Observations do not establish engine condition.`);
  const context = (snapshot: EngineSnapshot) => snapshot.engine.configuration;
  const harmonicText = (snapshot: EngineSnapshot, order: number) => {
    const h = snapshot.engine.harmonics.harmonics[order - 1];
    return h?.dbFS === null || !h ? 'Not matched' : `${h.dbFS.toFixed(1)} dBFS`;
  };
  rows(root, 'engine-comparison-table', [
    ['Captured', a.capturedAt, b.capturedAt], ['RPM (manual)', String(context(a).rpm ?? 'Unspecified'), String(context(b).rpm ?? 'Unspecified')],
    ['Cylinders / cycle', `${context(a).cylinders ?? '?'} / ${context(a).cycle ?? '?'} stroke`, `${context(b).cylinders ?? '?'} / ${context(b).cycle ?? '?'} stroke`],
    ['Acquisition', a.acquisition.mode, b.acquisition.mode],
    ['Reference', `${a.engine.harmonics.referenceHz ?? '—'} Hz (${a.engine.harmonicSource})`, `${b.engine.harmonics.referenceHz ?? '—'} Hz (${b.engine.harmonicSource})`],
    ['Persistent components', ...[a, b].map(snapshot => snapshot.engine.persistentPeaks.map(p => `${hz(p.frequency)} / ${p.dbFS.toFixed(1)} dBFS / ${p.persistenceSeconds.toFixed(1)} s`).join('; ') || 'None')],
    ...[1, 2, 3, 4, 5].map(order => {
      const delta = comparison.harmonicDelta?.[order - 1]?.dbDelta;
      return [`${order}× harmonic`, harmonicText(a, order), `${harmonicText(b, order)}${delta === null || delta === undefined ? '' : ` / Δ ${delta.toFixed(1)} dB`}`];
    }),
  ]);
}
