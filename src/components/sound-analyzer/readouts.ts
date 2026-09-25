import { compareSnapshots } from '../../lib/dsp/comparison.ts';
import type { Snapshot, Spectrum } from '../../lib/dsp/types.ts';

export const formatLevel = (value: number): string => Number.isFinite(value) ? value.toFixed(1) : '−∞';
export const formatPeak = (spectrum: Spectrum): string => spectrum.peaks[0] ? `${spectrum.peaks[0].frequency.toFixed(1)} Hz` : 'No clear peak';

export function updateMeasurements(root: HTMLElement, spectrum: Spectrum): void {
  const set = (id: string, value: string) => { root.querySelector<HTMLElement>(`#${id}`)!.textContent = value; };
  set('dominant-frequency', formatPeak(spectrum)); set('rms-level', `${formatLevel(spectrum.rmsDbFS)} dBFS`);
  set('frequency-resolution', `${spectrum.resolution.toFixed(2)} Hz`);
  set('sample-details', `${spectrum.sampleRate.toLocaleString()} Hz · Nyquist ${(spectrum.sampleRate / 2).toLocaleString()} Hz`);
  set('measurement-note', `${spectrum.clipped ? 'Near full scale / possible clipping. Reduce input gain or move farther away. ' : ''}${spectrum.rms < 1e-5 ? 'Silence or very low digital level. No reliable tone detected.' : 'Digital levels are uncalibrated. Peak frequency estimates do not identify machine faults.'}`);
  const list = (id: string, items: string[]) => {
    root.querySelector(`#${id}`)!.replaceChildren(...items.map(item => { const li = document.createElement('li'); li.textContent = item; return li; }));
  };
  list('peak-list', spectrum.peaks.length ? spectrum.peaks.map(peak => `${peak.frequency.toFixed(1)} Hz · ${peak.dbFS.toFixed(1)} tonal dBFS`) : ['No significant tonal peaks.']);
  list('band-list', spectrum.bands.map(band => `${band.label} · ${band.low}–${band.high.toLocaleString()} Hz: ${band.percent.toFixed(1)}%`));
}

export function updateComparison(root: HTMLElement, a?: Snapshot, b?: Snapshot): void {
  const summary = root.querySelector<HTMLElement>('#comparison-summary')!;
  root.querySelector<HTMLElement>('#comparison-results')!.hidden = !a || !b;
  if (!a || !b) { summary.textContent = a || b ? `${a ? 'A' : 'B'} saved: ${(a ?? b)!.label}. Capture the other result to compare.` : 'No snapshots saved. Snapshots stay in this tab and are lost on reload.'; return; }
  const comparison = compareSnapshots(a, b);
  summary.textContent = `${comparison.comparable ? '' : 'Different source types or analysis settings: interpret differences cautiously. ' }B − A: RMS ${comparison.levelDelta === null ? 'not comparable at silence' : `${comparison.levelDelta.toFixed(1)} dB`}; strongest peak ${comparison.peakDelta === null ? 'not available' : `${comparison.peakDelta.toFixed(1)} Hz`}. This is a signal comparison, not a health score.`;
  const rows: string[][] = [
    ['Source', a.label, b.label], ['Analysis', a.source, b.source],
    ['Sample rate / FFT', `${a.spectrum.sampleRate} Hz / ${a.spectrum.fftSize}`, `${b.spectrum.sampleRate} Hz / ${b.spectrum.fftSize}`],
    ['RMS (dBFS)', formatLevel(a.spectrum.rmsDbFS), formatLevel(b.spectrum.rmsDbFS)],
    ['Strongest peak', formatPeak(a.spectrum), formatPeak(b.spectrum)],
    ...a.spectrum.bands.map((band, i) => [`${band.label} energy`, `${band.percent.toFixed(1)}%`, `${b.spectrum.bands[i].percent.toFixed(1)}%`]),
  ];
  root.querySelector('#comparison-table')!.replaceChildren(...rows.map(row => {
    const tr = document.createElement('tr');
    row.forEach((value, index) => { const cell = document.createElement(index ? 'td' : 'th'); if (!index) cell.setAttribute('scope', 'row'); cell.textContent = value; tr.append(cell); });
    return tr;
  }));
}
