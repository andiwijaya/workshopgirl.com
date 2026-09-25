import type { validateReference, ReferenceCase } from '../../lib/validation/reference.ts';
import { LocalDownload } from '../../lib/audio/local-download.ts';
type Result = ReturnType<typeof validateReference>;
export function mountReferenceValidation(root: HTMLElement) {
  const el = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const run = el<HTMLButtonElement>('run-reference'), cancel = el<HTMLButtonElement>('cancel-reference'), save = el<HTMLButtonElement>('export-reference');
  const status = el('reference-status'), list = el('reference-results');
  const events = new AbortController(), download = new LocalDownload();
  let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, generation = 0;
  let report: { schemaVersion: string; engineVersion: string; createdAt: string; scope: string; validation: Result; elapsedMs: number } | undefined;
  function stop() { generation++; worker?.terminate(); worker = undefined; clearTimeout(timer); run.disabled = false; cancel.disabled = true; }
  run.addEventListener('click', () => {
    stop(); report = undefined; save.disabled = true; list.replaceChildren();
    if (!globalThis.Worker) { status.textContent = 'This browser does not support the validation worker.'; return; }
    const token = generation;
    try {
      worker = new Worker(new URL('../../lib/validation/reference.worker.ts', import.meta.url), { type: 'module' });
      run.disabled = true; cancel.disabled = false; status.textContent = 'Running known digital input locally…';
      const fail = (message: string) => { if (token !== generation) return; stop(); status.textContent = message; };
      timer = setTimeout(() => fail('Validation timed out. Worker released; retry when ready.'), 15000);
      worker.onerror = () => fail('Validation worker failed. No microphone or audio output was started.');
      worker.onmessage = ({ data }: MessageEvent<{ type: string; validation: Result; elapsedMs: number; message: string }>) => {
        if (token !== generation) return;
        if (data.type === 'error') { fail(data.message); return; }
        report = { schemaVersion: 'workshopgirl.reference-validation/1', engineVersion: '3', createdAt: new Date().toISOString(), scope: 'Generated digital PCM only. No microphone, AudioWorklet capture, physical device or end-to-end latency validation.', validation: data.validation, elapsedMs: data.elapsedMs };
        stop(); save.disabled = false;
        status.textContent = `${data.validation.passed ? 'PASS' : 'CHECK FAILED'} · ${data.validation.case} · ${data.validation.sampleRate} Hz · ${data.elapsedMs.toFixed(1)} ms software processing. Physical capture was not tested.`;
        list.replaceChildren(...data.validation.checks.map(check => { const li = document.createElement('li'); li.textContent = `${check.passed ? 'PASS' : 'FAIL'} · ${check.name}: expected ${check.expected}; measured ${check.actual}.`; return li; }));
      };
      worker.postMessage({ name: el<HTMLSelectElement>('reference-case').value as ReferenceCase, sampleRate: Number(el<HTMLSelectElement>('reference-rate').value) });
    } catch { stop(); status.textContent = 'Could not start validation worker.'; }
  }, { signal: events.signal });
  cancel.addEventListener('click', () => { stop(); status.textContent = 'Cancelled. Validation worker released.'; }, { signal: events.signal });
  save.addEventListener('click', () => { if (report) download.save(report, 'workshopgirl-reference-validation-v1.json'); }, { signal: events.signal });
  window.addEventListener('pagehide', () => { stop(); download.dispose(); }, { signal: events.signal });
  document.addEventListener('astro:before-swap', () => { stop(); download.dispose(); events.abort(); }, { once: true, signal: events.signal });
}
