import type { WorkshopJob, WorkshopStore } from '../../lib/workshop/model.ts';
import { selectedWorkshopJob, workshopPageHref } from '../../lib/workshop/navigation.ts';
import { loadStore, getCustomer, getVehicle } from '../../lib/workshop/store.ts';
import { workshopProgress } from '../../lib/workshop/dashboard.ts';
import { operationalStatus } from '../../lib/workshop/queue.ts';
import { renderJobObservations } from './observation-view.ts';

export function setWorkshopJobContext(root: HTMLElement, store: WorkshopStore, job: WorkshopJob | null, updateUrl = false): void {
  const selectedId = job?.id;
  job = selectedId ? store.jobs.find(item => item.id === selectedId) ?? null : null;
  root.dataset.selectedJob = job?.id ?? '';
  renderJobObservations(root, job);
  for (const link of root.querySelectorAll<HTMLAnchorElement>('[data-step-link]')) {
    const href = workshopPageHref(link.dataset.stepLink ?? '', job);
    if (href) link.setAttribute('href', href);
  }
  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.delete('job');
    if (job) url.searchParams.set('job', job.id);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  const node = root.querySelector<HTMLElement>('#workshop-job-context');
  if (!node) return;
  node.replaceChildren();
  node.hidden = !job;
  if (!job) return;
  const customer = getCustomer(store, job), vehicle = getVehicle(store, job);
  const title = document.createElement('strong');
  title.textContent = `Selected job: ${job.number} · ${operationalStatus(job)}`;
  const details = document.createElement('span');
  details.textContent = `${customer?.name ?? 'Customer'} · ${vehicle?.plate ?? 'Vehicle'} · ${[vehicle?.make, vehicle?.model].filter(Boolean).join(' ')}`;
  const actions = document.createElement('div');
  actions.className = 'button-row';
  for (const [label, href] of [
    ['Start a new job', '/tools/workshop/vehicle-intake/'],
    ['All jobs', '/tools/workshop/queue/'],
    ['Clear job context', location.pathname],
  ]) {
    const link = document.createElement('a');
    link.className = 'button-link button-secondary';
    link.textContent = label;
    link.href = href;
    actions.append(link);
  }
  const progress = document.createElement('ol'); progress.className = 'job-progress'; progress.setAttribute('aria-label', 'Saved job progress');
  for (const stage of workshopProgress(job)) {
    const item = document.createElement('li'), link = document.createElement('a');
    link.href = workshopPageHref(stage.page, job)!;
    link.textContent = `${stage.label}: ${stage.state}`;
    if (root.dataset.workshopStep === stage.page) link.setAttribute('aria-current', 'page');
    item.append(link); progress.append(item);
  }
  node.append(title, details, progress, actions);
}

export function mountWorkshopNavigation(root: HTMLElement, store: WorkshopStore): void {
  setWorkshopJobContext(root, store, selectedWorkshopJob(store, new URL(location.href).searchParams));
  root.addEventListener('workshop-job-selected', event => {
    const id = (event as CustomEvent<string | null>).detail;
    setWorkshopJobContext(root, store, id ? store.jobs.find(job => job.id === id) ?? null : null, true);
  });
  // A job removed in another tab must not keep travelling through these tabs.
  // Validate again when following a tab, including middle-click/new-tab navigation.
  const refreshLinks = () => {
    let latest: WorkshopStore;
    try { latest = loadStore(window.localStorage).store; } catch { return; }
    const id = root.dataset.selectedJob;
    const job = latest.jobs.find(item => item.id === id) ?? null;
    setWorkshopJobContext(root, latest, job);
  };
  root.querySelector('.workshop-steps')?.addEventListener('pointerdown', refreshLinks);
  root.querySelector('.workshop-steps')?.addEventListener('click', refreshLinks);
  root.querySelector('.workshop-steps')?.addEventListener('keydown', refreshLinks);
  window.addEventListener('storage', refreshLinks);
}

export function selectWorkshopJob(root: HTMLElement, id: string | null): void {
  root.dispatchEvent(new CustomEvent('workshop-job-selected', { detail: id }));
}
