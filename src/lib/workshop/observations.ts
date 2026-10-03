import type { WorkshopJob } from './model.ts';
import { isEngineObservation, MAX_OBSERVATIONS, type EngineObservationSummary } from './observation-summary.ts';
import { createJob, loadStore, saveStore, STORAGE_KEY, type StorageLike } from './store.ts';
import { validateIntake } from './rules.ts';
import { operationalStatus } from './queue.ts';

export type ObservationTarget = { jobId: string } | { newJob: { name: string; plate: string; type: 'Car' | 'Motorcycle'; complaint: string } };
export type AttachResult = { ok: true; job: WorkshopJob } | { ok: false; message: string };
/** Fresh read + cloned candidate + one atomic localStorage write. No partial job creation. */
export function attachEngineObservation(storage: StorageLike, observation: EngineObservationSummary, target: ObservationTarget, now = new Date()): AttachResult {
  if (!isEngineObservation(observation)) return { ok: false, message: 'Invalid observation. Nothing was attached.' };
  try {
    const raw = storage.getItem(STORAGE_KEY), loaded = loadStore({ getItem: () => raw, setItem: () => {} });
    if (loaded.recovered) return { ok: false, message: loaded.message };
    const candidate = structuredClone(loaded.store);
    let job: WorkshopJob | undefined;
    if ('jobId' in target) job = candidate.jobs.find(item => item.id === target.jobId);
    else {
      const { name, plate, complaint } = target.newJob;
      if (validateIntake({ name, plate, year: '', odometer: '' }).length || name.length > 120 || plate.length > 40 || complaint.length > 1000) return { ok: false, message: 'Enter a customer name and license plate for the new local intake. Nothing was saved.' };
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      job = createJob(candidate, { customer: { name: name.trim(), phone: '', address: '' },
        vehicle: { type: target.newJob.type, plate: plate.trim(), make: '', model: '', year: null, color: '', odometer: null },
        intake: { number: `WI-${date.replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`, complaint: complaint.trim(), accessories: [], conditionNotes: '', date, arrivalTime: '' } });
    }
    if (!job) return { ok: false, message: 'That local job no longer exists. Choose another job; nothing was attached.' };
    if (['Completed','Cancelled'].includes(operationalStatus(job)) || job.status === 'completed') return { ok: false, message: 'Completed or cancelled jobs are read-only. Choose an active job or start a new intake.' };
    const observations = job.observations ?? [];
    if (observations.some(item => item.id === observation.id)) return { ok: false, message: 'This captured observation is already attached to this job.' };
    if (observations.length >= MAX_OBSERVATIONS) return { ok: false, message: `This job already has ${MAX_OBSERVATIONS} observations. Nothing was attached.` };
    job.observations = [...observations, structuredClone(observation)]; job.updatedAt = now.toISOString();
    const saved = saveStore(candidate, storage, raw);
    return saved.ok ? { ok: true, job } : { ok: false, message: saved.message };
  } catch { return { ok: false, message: 'Browser storage is full or unavailable. Nothing was attached or created.' }; }
}
