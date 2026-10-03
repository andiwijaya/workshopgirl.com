import type { EngineObservationSummary } from '../../lib/workshop/observation-summary.ts';
import { attachEngineObservation } from '../../lib/workshop/observations.ts';
import { loadStore, getVehicle } from '../../lib/workshop/store.ts';
import { operationalStatus } from '../../lib/workshop/queue.ts';
import { observationDescription } from '../workshop/observation-view.ts';

export class ObservationAttachment {
  private captured: EngineObservationSummary | undefined;
  private events = new AbortController();
  constructor(private root: HTMLElement, capture: () => EngineObservationSummary) {
    const button = this.el<HTMLButtonElement>('capture-job-observation'), form = this.el<HTMLFormElement>('observation-attach-form');
    button.addEventListener('click', () => {
      try {
        const loaded = loadStore(window.localStorage);
        if (loaded.recovered) { this.status(loaded.message); return; }
        this.captured = capture();
        const preview = this.el('observation-preview'); preview.replaceChildren();
        for (const text of observationDescription(this.captured)) { const p = document.createElement('p'); p.textContent = text; preview.append(p); }
        const picker = this.el<HTMLSelectElement>('observation-job');
        picker.replaceChildren(new Option('Choose an active local job', ''), ...loaded.store.jobs.filter(job => job.status !== 'completed' && !['Completed','Cancelled'].includes(operationalStatus(job))).map(job => new Option(`${job.number} · ${getVehicle(loaded.store, job)?.plate ?? 'Vehicle'} · ${operationalStatus(job)}`, `job:${job.id}`)), new Option('Start a new local job', '__new__'));
        this.selectNew(false); form.hidden = false; button.setAttribute('aria-expanded','true'); button.disabled = true;
        this.el('observation-saved-links').hidden = true; this.status('Captured for review. Nothing has been attached.'); picker.focus();
      } catch (error) { this.status(error instanceof Error ? error.message : 'Storage or measurement is unavailable. Nothing was attached.'); }
    }, { signal: this.events.signal });
    this.el<HTMLSelectElement>('observation-job').addEventListener('change', () => this.selectNew(this.el<HTMLSelectElement>('observation-job').value === '__new__'), { signal: this.events.signal });
    this.el('cancel-job-observation').addEventListener('click', () => { this.captured = undefined; form.hidden = true; button.setAttribute('aria-expanded','false'); button.disabled = !this.available; this.status('Attachment cancelled. No workshop records changed.'); button.focus(); }, { signal: this.events.signal });
    form.addEventListener('submit', event => {
      event.preventDefault(); if (!this.captured) return;
      const selected = this.el<HTMLSelectElement>('observation-job').value;
      if (!selected) { this.status('Choose an active local job or start a new intake.'); return; }
      try {
        const result = attachEngineObservation(window.localStorage, this.captured, selected === '__new__' ? { newJob: {
          name: this.el<HTMLInputElement>('observation-customer').value, plate: this.el<HTMLInputElement>('observation-plate').value,
          type: this.el<HTMLSelectElement>('observation-vehicle-type').value === 'Motorcycle' ? 'Motorcycle' : 'Car', complaint: this.el<HTMLTextAreaElement>('observation-complaint').value,
        } } : { jobId: selected.startsWith('job:') ? selected.slice(4) : '' });
        if (!result.ok) { this.status(result.message); return; }
        this.captured = undefined; form.hidden = true; button.setAttribute('aria-expanded','false'); button.disabled = !this.available;
        for (const [id, path] of [['observation-open-intake','vehicle-intake'],['observation-open-inspection','inspection-estimate']]) this.el<HTMLAnchorElement>(id).href = `/tools/workshop/${path}/?job=${encodeURIComponent(result.job.id)}`;
        this.el('observation-saved-links').hidden = false;
        this.status('Observation saved in this browser. Review intake and inspect the evidence; this is not a fault diagnosis.'); this.el('observation-open-inspection').focus();
      } catch { this.status('Browser storage is unavailable. Nothing was attached or created.'); }
    }, { signal: this.events.signal });
    document.addEventListener('astro:before-swap', () => this.events.abort(), { once: true, signal: this.events.signal });
  }
  private available = false;
  setAvailable(value: boolean) { this.available = value; this.el<HTMLButtonElement>('capture-job-observation').disabled = !value || !!this.captured; }
  private el<T extends HTMLElement = HTMLElement>(id: string): T { return this.root.querySelector<T>(`#${id}`)!; }
  private status(text: string) { this.el('observation-attach-status').textContent = text; }
  private selectNew(value: boolean) {
    this.el('observation-new-intake').hidden = !value;
    for (const id of ['observation-customer','observation-plate']) { const field = this.el<HTMLInputElement>(id); field.required = value; field.disabled = !value; }
  }
}
