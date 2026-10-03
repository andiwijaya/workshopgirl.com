import type { WorkshopJob } from '../../lib/workshop/model.ts';
import type { EngineObservationSummary } from '../../lib/workshop/observation-summary.ts';

export function observationDescription(item: EngineObservationSummary): string[] {
  return [
    `${item.label || 'Engine observation'} · ${item.capturedAt} · ${item.source} · ${item.durationSeconds.toFixed(3)} s source interval`,
    `Capture: ${item.context.mode}, ${item.context.sampleRate} Hz, FFT ${item.context.fftSize}, window ${item.context.windowSamples}. Manual RPM: ${item.context.manualRpm ?? 'unspecified'} (reference only). Cylinders: ${item.context.cylinders ?? 'unspecified'}; cycle: ${item.context.cycle ?? 'unspecified'}; harmonic reference: ${item.context.harmonicHz ?? 'unspecified'} Hz.`,
    `Dominant peaks: ${item.peaks.length ? item.peaks.map(peak => `${peak.frequency.toFixed(1)} Hz (${peak.dbFS.toFixed(1)} dBFS)`).join(', ') : 'none retained'}. Digital levels are not calibrated SPL.`,
    `Quality (${item.quality.policy}): recent stability ${item.quality.stabilityAvailable ? 'available' : 'not established'}; ${item.quality.frameCount} observations over ${item.quality.sessionSpanSeconds.toFixed(1)} s, recent window ${item.quality.recentSpanSeconds.toFixed(1)} s; ${item.quality.droppedFrames} dropped frames, ${item.quality.discontinuities} discontinuities; effective bin scale ${item.quality.effectiveResolutionHz.toFixed(2)} Hz. ${item.quality.issues.map(issue => issue.message).join(' ') || 'No flagged observations.'}`,
    `Repeatability (${item.repeatability.policy}): ${item.repeatability.status} · ${item.repeatability.snapshotCount} snapshots, ${item.repeatability.pairCount} comparisons. ${item.repeatability.reasons.join(' ')}`,
    `Notes: ${item.notes || 'None supplied.'}`,
    `Source: Engine Sound Analyzer · ${item.schemaVersion} · ${item.measurementSchema} · engine ${item.engineVersion}.`,
  ];
}

export function renderJobObservations(root: HTMLElement, job: WorkshopJob | null) {
  const host = root.querySelector<HTMLElement>('#job-observations'); if (!host) return;
  host.replaceChildren(); host.hidden = !job;
  if (!job) return;
  const heading = document.createElement('h2'); heading.textContent = 'Observation evidence';
  const intro = document.createElement('p'); intro.textContent = 'Observe and compare under matching conditions, then inspect. Spectral peaks and repeatability do not diagnose a mechanical fault. Record your own inspection findings separately.';
  host.append(heading, intro);
  if (!job.observations?.length) { const empty = document.createElement('p'); empty.textContent = 'No analyzer observations attached to this job. Capture a bounded summary in Engine Sound Analyzer, then explicitly choose this local job.'; host.append(empty); }
  for (const item of job.observations ?? []) {
    const details = document.createElement('details'), summary = document.createElement('summary');
    summary.textContent = `${item.label || 'Engine observation'} · ${item.capturedAt}`; details.append(summary);
    for (const text of observationDescription(item)) { const p = document.createElement('p'); p.textContent = text; details.append(p); }
    host.append(details);
  }
  const link = document.createElement('a'); link.className = 'button-link button-secondary'; link.href = '/tools/engine-sound-analyzer/'; link.textContent = 'Open Engine Sound Analyzer'; host.append(link);
}
