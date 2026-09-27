import type { OperationalStatus, WorkshopJob } from './model.ts';

/** QC readiness includes a valid, finished Work Order and resolved road-test state. */
export function qcPassed(job: WorkshopJob): boolean {
  const qc = job.qc;
  return Boolean(validWorkOrder(job) && qc && qc.roadTest !== 'Not completed' && qc.finalStatus === 'Ready for handover' && qc.checks.length > 0
    && qc.checks.every(check => check.result === 'Pass' || check.result === 'Not applicable')
    && qc.unresolvedIssues.every(issue => issue.status === 'Customer deferred' && issue.issue.trim() && (issue.deferralReason ?? issue.recommendation).trim()));
}

export function validWorkOrder(job: WorkshopJob): boolean {
  const wo = job.workOrder;
  if (!wo || wo.status !== 'Complete') return false;
  const rows = wo.actualWork;
  if (rows.some(row => row.status !== 'Complete' && row.status !== 'Cancelled')) return false;
  if (wo.noRepairAcknowledged) return Boolean(wo.noRepairReason?.trim()) && rows.every(row => row.status === 'Cancelled' || !row.name.trim());
  return rows.some(row => row.status === 'Complete' && row.name.trim());
}

export function estimateApprovalPending(job: WorkshopJob): boolean {
  const inspection=job.inspection;
  if(!inspection)return false;
  const required=inspection.recommendedJobs.filter(item=>item.name.trim());
  if(!required.length)return false;
  const current=(inspection.revision??1)===(inspection.approvedRevision??0)&&Boolean(inspection.approvedAt&&inspection.approvedBy?.trim());
  return !current||required.some(item=>!item.approved||!item.approvedAt||!item.approvedBy?.trim());
}

/** The sole operational completion rule used by persistence, queue and history. */
export function canCompleteWorkshopJob(job: WorkshopJob): boolean {
  const qc = job.qc;
  return Boolean(validWorkOrder(job) && qcPassed(job) && qc
    && qc.handoverRecipient.trim() && qc.handoverStaff.trim() && isCalendarDate(qc.handoverDate) && isClockTime(qc.handoverTime));
}

function isCalendarDate(value:string):boolean{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;}
function isClockTime(value:string):boolean{const match=/^(\d{2}):(\d{2})$/.exec(value);return Boolean(match&&Number(match[1])<24&&Number(match[2])<60);}

/** Derive the workflow state from the Phase 1 job fields, without a second queue record. */
export function workflowStatus(job: WorkshopJob): Exclude<OperationalStatus, 'Waiting Parts'> {
  if (job.workOrder?.status === 'Cancelled') return 'Cancelled';
  if (job.status === 'completed') return canCompleteWorkshopJob({ ...job, status: 'qc' }) || legacyCompletedRecord(job) ? 'Completed' : 'QC';
  if (qcPassed(job)) return 'Ready for Pickup';
  if (job.qc || job.status === 'qc') return 'QC';
  if (job.workOrder) {
    if (job.workOrder.status === 'Complete') return 'QC';
    if (job.workOrder.status !== 'Not started') return 'Work In Progress';
  }
  if (job.inspection) {
    const items = job.inspection.checklist.flatMap(group => group.items);
    const inspectionComplete = items.length > 0 && items.every(item => item.status !== 'Not checked');
    if (!inspectionComplete) return 'Inspection';
    if (estimateApprovalPending(job)) return 'Waiting Approval';
    return 'Inspection';
  }
  return 'Intake';
}

/** Preserve the historical projection of jobs closed before Phase 2D's stricter gate. */
function legacyCompletedRecord(job: WorkshopJob): boolean {
  const qc=job.qc;
  return Boolean(qc&&qc.finalStatus==='Ready for handover'&&qc.checks.length>0
    &&qc.checks.every(check=>check.result==='Pass'||check.result==='Not applicable')&&qc.unresolvedIssues.length===0);
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
  if (status === 'Intake') return '/tools/workshop/inspection-estimate/';
  if (status === 'Inspection') {
    const items=job.inspection?.checklist.flatMap(group=>group.items)??[];
    const complete=items.length>0&&items.every(item=>item.status!=='Not checked');
    if(complete)return '/tools/workshop/work-order/';
    return '/tools/workshop/inspection-estimate/';
  }
  if (status === 'Waiting Approval') {
    const needsApproval = estimateApprovalPending(job);
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
