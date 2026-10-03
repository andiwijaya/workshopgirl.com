import type { WorkshopJob, WorkshopStore } from './model.ts';

export const workshopPages = [
  { id: 'intake', label: 'Vehicle Intake', href: '/tools/workshop/vehicle-intake/', print: 'job' },
  { id: 'inspection', label: 'Inspection & Estimate', href: '/tools/workshop/inspection-estimate/', print: 'job' },
  { id: 'work-order', label: 'Work Order', href: '/tools/workshop/work-order/', print: 'job' },
  { id: 'qc', label: 'QC & Handover', href: '/tools/workshop/qc-handover/', print: 'job' },
  { id: 'queue', label: 'Queue / Job Status', href: '/tools/workshop/queue/', print: 'queue' },
  { id: 'parts-inventory', label: 'Parts Inventory', href: '/tools/workshop/parts-inventory/', print: 'parts' },
  { id: 'service-history', label: 'Service History & Warranty', href: '/tools/workshop/service-history/', print: 'record' },
  { id: 'billing', label: 'Billing', href: '/tools/workshop/billing/', print: 'record' },
  { id: 'procurement', label: 'Procurement', href: '/tools/workshop/procurement/', print: 'record' },
] as const;

export function selectedWorkshopJob(store: WorkshopStore, params: URLSearchParams): WorkshopJob | null {
  const ids = params.getAll('job');
  // Only a single exact ID in the validated local store is a navigation context.
  // Do not infer jobs from customer names, plates, partial IDs or another origin.
  return ids.length === 1 ? store.jobs.find(job => job.id === ids[0]) ?? null : null;
}

export function workshopPageHref(pageId: string, job: WorkshopJob | null): string | null {
  const page = workshopPages.find(page => page.id === pageId);
  return page ? localJobHref(page.href, job?.id) : null;
}

// Fragments stay in browser history and survive reload/new tabs, but are never
// part of HTTP request targets or Referer headers. No global "last job" fallback:
// an unqualified route always means neutral context.
export function localJobHref(path: string, id?: string | null): string {
  return path + (id ? `#job=${encodeURIComponent(id)}` : '');
}

export function workshopJobParams(url: URL): URLSearchParams {
  // Legacy queries take precedence, including invalid/repeated IDs. The early
  // head bootstrap moves them into the fragment before loading page resources.
  return url.searchParams.has('job') ? url.searchParams : new URLSearchParams(url.hash.slice(1));
}
