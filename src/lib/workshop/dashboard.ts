import type { WorkshopJob, WorkshopStore } from './model.ts';
import { operationalStatus, qcPassed, validWorkOrder, estimateApprovalPending } from './queue.ts';
import { stockState } from './parts.ts';
import { outstanding, eligibleForDraft } from './billing.ts';
import { serviceHistory } from './history.ts';

/** Read-only projections: billing, handover and stock remain separate domain states. */
export function workshopDashboard(store: WorkshopStore) {
  const active = store.jobs.filter(job => !['Completed', 'Cancelled'].includes(operationalStatus(job)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  return {
    active,
    waiting: active.filter(job => ['Waiting Approval', 'Waiting Parts', 'Ready for Pickup'].includes(operationalStatus(job))),
    partsAttention: store.parts.filter(part => part.active && stockState(store, part) !== 'In Stock'),
    drafts: store.invoices.filter(invoice => invoice.status === 'Draft').length,
    unpaid: store.invoices.filter(invoice => invoice.status === 'Issued' && outstanding(store, invoice) > 0).length,
    readyToBill: store.jobs.filter(job => eligibleForDraft(job) && !store.invoices.some(invoice => invoice.jobId === job.id && invoice.status !== 'Void')).length,
    history: serviceHistory(store),
  };
}

export function workshopProgress(job: WorkshopJob) {
  const closed = operationalStatus(job) === 'Completed';
  return [
    { page: 'intake', label: 'Intake', state: 'Recorded' },
    { page: 'inspection', label: 'Inspection', state: !job.inspection ? 'Not recorded' : estimateApprovalPending(job) ? 'Awaiting approval' : job.inspection.checklist.some(group => group.items.some(item => item.status === 'Not checked')) ? 'In progress' : 'Recorded' },
    { page: 'work-order', label: 'Work', state: validWorkOrder(job) ? 'Complete' : job.workOrder?.status ?? 'Not recorded' },
    { page: 'qc', label: 'QC / Handover', state: closed ? 'Handed over' : qcPassed(job) ? 'Ready for pickup' : job.qc ? 'In progress' : 'Not recorded' },
  ];
}
