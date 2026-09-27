import type { OperationalStatus, WorkshopJob } from './model.ts';

/** QC must pass before a job can be offered for pickup or marked complete. */
export function qcPassed(job: WorkshopJob): boolean {
  const qc = job.qc;
  return Boolean(qc && qc.finalStatus === 'Ready for handover' && qc.checks.length > 0
    && qc.checks.every(check => check.result === 'Pass' || check.result === 'Not applicable')
    && qc.unresolvedIssues.length === 0);
}

/** Derive the workflow state from the Phase 1 job fields, without a second queue record. */
export function workflowStatus(job: WorkshopJob): Exclude<OperationalStatus, 'Waiting Parts'> {
  if (job.workOrder?.status === 'Cancelled') return 'Cancelled';
  if (job.status === 'completed') return qcPassed(job) ? 'Completed' : 'QC';
  if (qcPassed(job)) return 'Ready for Pickup';
  if (job.qc || job.status === 'qc') return 'QC';
  if (job.workOrder) {
    if (job.workOrder.status === 'Complete') return 'QC';
    if (job.workOrder.status !== 'Not started') return 'Work In Progress';
  }
  if (job.inspection) {
    const items = job.inspection.checklist.flatMap(group => group.items);
    const inspectionComplete = items.length > 0 && items.every(item => item.status !== 'Not checked');
    return inspectionComplete ? 'Waiting Approval' : 'Inspection';
  }
  return 'Intake';
}

export function operationalStatus(job: WorkshopJob): OperationalStatus {
  const underlying = workflowStatus(job);
  if (job.operations?.waitingParts && underlying !== 'Ready for Pickup' && underlying !== 'Completed' && underlying !== 'Cancelled') return 'Waiting Parts';
  return underlying;
}

export function canSetWaitingParts(job: WorkshopJob): boolean {
  if (job.status === 'completed') return false;
  const status = workflowStatus(job);
  return status !== 'Ready for Pickup' && status !== 'Completed' && status !== 'Cancelled';
}

/** Continue at the existing Phase 1 page that can make progress on this exact job. */
export function nextWorkflowRoute(job: WorkshopJob): string {
  const status = workflowStatus(job);
  if (status === 'Cancelled') return '/tools/workshop/work-order/';
  if (status === 'Intake' || status === 'Inspection') return '/tools/workshop/inspection-estimate/';
  if (status === 'Waiting Approval') {
    const needsApproval = job.inspection?.recommendedJobs.some(item => item.name.trim() && !item.approved);
    if (needsApproval) return '/tools/workshop/inspection-estimate/';
  }
  if (status === 'Waiting Approval' || status === 'Work In Progress') return '/tools/workshop/work-order/';
  return '/tools/workshop/qc-handover/';
}

export function transitionReason(status: OperationalStatus): string {
  switch (status) {
    case 'Intake': return 'Job created';
    case 'Inspection': return 'Inspection started';
    case 'Waiting Approval': return 'Inspection checklist completed';
    case 'Work In Progress': return 'Work Order started';
    case 'Waiting Parts': return 'Waiting for parts';
    case 'QC': return 'Quality check started';
    case 'Ready for Pickup': return 'QC passed';
    case 'Completed': return 'Handover completed';
    case 'Cancelled': return 'Work Order cancelled';
  }
}

export function elapsedTime(start: string, now = new Date()): string {
  const timestamp = new Date(start).getTime();
  if (!Number.isFinite(timestamp)) return 'Time unavailable';
  const minutes = Math.max(0, Math.floor((now.getTime() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}${hours % 24 ? ` ${hours % 24} h` : ''}`;
}
