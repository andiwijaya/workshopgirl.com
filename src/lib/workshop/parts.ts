import type { PartMovement, PartMovementType, WorkshopJob, WorkshopPart, WorkshopStore } from './model.ts';
import { makeId, setWaitingParts } from './store.ts';
import { workflowStatus } from './queue.ts';

export type PartResult = { ok: true; movement?: PartMovement; part?: WorkshopPart } | { ok: false; message: string };
const fail = (message: string): PartResult => ({ ok: false, message });
const validQty = (n: number) => Number.isFinite(n) && n > 0;
export function partBalance(store: WorkshopStore, partId: string): number {
  const signed = store.partMovements.filter(m => m.partId === partId).reduce((n, m) => n + ((m.type === 'OPENING' || m.type === 'STOCK_IN' || m.type === 'RETURN_FROM_JOB' || m.type === 'ADJUSTMENT_IN') ? m.quantity : -m.quantity), 0);
  return Math.round((signed + Number.EPSILON) * 1e6) / 1e6;
}
export function stockState(store: WorkshopStore, part: WorkshopPart): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  const n = partBalance(store, part.id); return n <= 0 ? 'Out of Stock' : n <= part.minimumStock ? 'Low Stock' : 'In Stock';
}
export function createPart(store: WorkshopStore, input: Omit<WorkshopPart,'id'|'createdAt'|'updatedAt'>, opening = 0, now = new Date()): PartResult {
  if (!input.name.trim() || !input.unit.trim()) return fail('Part name and unit are required.');
  if (!Number.isFinite(input.minimumStock) || input.minimumStock < 0 || !Number.isFinite(opening) || opening < 0) return fail('Stock quantities must be zero or greater.');
  if (input.sku.trim() && store.parts.some(p => p.active && p.sku.trim().toLocaleLowerCase() === input.sku.trim().toLocaleLowerCase())) return fail('That SKU is already used by an active part.');
  const at = now.toISOString(), part: WorkshopPart = { ...input, id: makeId('part'), sku: input.sku.trim(), name: input.name.trim(), createdAt: at, updatedAt: at };
  store.parts.push(part);
  if (opening > 0) store.partMovements.push({ id: makeId('movement'), partId: part.id, type: 'OPENING', quantity: opening, at, note: 'Opening balance' });
  return { ok: true, part };
}
export function updatePart(store: WorkshopStore, id: string, patch: Partial<Omit<WorkshopPart,'id'|'createdAt'>>): PartResult {
  const part = store.parts.find(p => p.id === id); if (!part) return fail('Part was not found.');
  const candidate = { ...part, ...patch };
  if (!candidate.name.trim() || !candidate.unit.trim() || !Number.isFinite(candidate.minimumStock) || candidate.minimumStock < 0) return fail('Part name, unit, and a valid minimum stock are required.');
  if (candidate.active && candidate.sku.trim() && store.parts.some(p => p.id !== id && p.active && p.sku.trim().toLocaleLowerCase() === candidate.sku.trim().toLocaleLowerCase())) return fail('That SKU is already used by an active part.');
  Object.assign(part, candidate, { sku: candidate.sku.trim(), updatedAt: new Date().toISOString() }); return { ok: true, part };
}
export function deactivatePart(store: WorkshopStore, id: string): PartResult { return updatePart(store, id, { active: false }); }
function record(store: WorkshopStore, partId: string, type: PartMovementType, quantity: number, extra: Partial<PartMovement> = {}, now = new Date()): PartMovement {
  const at = now.toISOString(), part=store.parts.find(x=>x.id===partId);if(part)part.updatedAt=at;
  const m: PartMovement = { id: makeId('movement'), partId, type, quantity, at, ...extra }; store.partMovements.push(m); return m;
}
export function stockIn(store: WorkshopStore, partId: string, quantity: number, extra: Pick<PartMovement,'unitCost'|'supplier'|'reference'|'note'> = {}, now = new Date()): PartResult {
  const p = store.parts.find(x => x.id === partId); if (!p || !p.active) return fail('Choose an active part.'); if (!validQty(quantity)) return fail('Enter a quantity greater than zero.'); if (extra.unitCost !== undefined && (!Number.isFinite(extra.unitCost) || extra.unitCost < 0)) return fail('Unit cost must be zero or greater.');
  return { ok: true, movement: record(store, partId, 'STOCK_IN', quantity, extra, now) };
}
export function issueToJob(store: WorkshopStore, partId: string, jobId: string, quantity: number, extra: Pick<PartMovement,'reference'|'note'> = {}, now = new Date()): PartResult {
  const p = store.parts.find(x => x.id === partId), job = store.jobs.find(x => x.id === jobId);
  if (!p || !p.active) return fail('Choose an active part.'); if (!job) return fail('Choose an existing workshop job.');
  if (workflowStatus(job) === 'Cancelled' || workflowStatus(job) === 'Completed') return fail('Parts cannot be issued to a cancelled or completed job.');
  if (!validQty(quantity)) return fail('Enter a quantity greater than zero.'); if (quantity > partBalance(store, partId)) return fail(`Insufficient stock. Available: ${partBalance(store, partId)} ${p.unit}.`);
  return { ok: true, movement: record(store, partId, 'ISSUE_TO_JOB', quantity, { ...extra, jobId }, now) };
}
export function returnFromJob(store: WorkshopStore, partId: string, jobId: string, quantity: number, extra: Pick<PartMovement,'reference'|'note'> = {}, now = new Date()): PartResult {
  if (!store.parts.some(x => x.id === partId) || !store.jobs.some(x => x.id === jobId)) return fail('Choose an existing part and job.'); if (!validQty(quantity)) return fail('Enter a quantity greater than zero.');
  const issued = store.partMovements.filter(m => m.partId === partId && m.jobId === jobId && m.type === 'ISSUE_TO_JOB').reduce((n,m)=>n+m.quantity,0);
  const returned = store.partMovements.filter(m => m.partId === partId && m.jobId === jobId && m.type === 'RETURN_FROM_JOB').reduce((n,m)=>n+m.quantity,0);
  if (quantity > issued - returned) return fail(`Return exceeds outstanding issue quantity (${Math.max(0, issued-returned)}).`);
  return { ok: true, movement: record(store, partId, 'RETURN_FROM_JOB', quantity, { ...extra, jobId }, now) };
}
export function adjustStock(store: WorkshopStore, partId: string, direction: 'in'|'out', quantity: number, note: string, now = new Date()): PartResult {
  const p = store.parts.find(x => x.id === partId); if (!p || !p.active) return fail('Choose an active part.'); if (!validQty(quantity)) return fail('Enter a quantity greater than zero.'); if (!note.trim()) return fail('Add a note explaining this adjustment.');
  if (direction === 'out' && quantity > partBalance(store, partId)) return fail('Adjustment cannot make stock negative.');
  return { ok: true, movement: record(store, partId, direction === 'in' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', quantity, { note: note.trim() }, now) };
}
export function movementsForJob(store: WorkshopStore, jobId: string): PartMovement[] { return store.partMovements.filter(m => m.jobId === jobId).sort((a,b)=>a.at.localeCompare(b.at)); }
export function outstandingForJobPart(store: WorkshopStore, partId: string, jobId: string): number {
  return store.partMovements.filter(m=>m.partId===partId&&m.jobId===jobId).reduce((n,m)=>n+(m.type==='ISSUE_TO_JOB'?m.quantity:m.type==='RETURN_FROM_JOB'?-m.quantity:0),0);
}
export interface JobPartSummary { part: WorkshopPart; requested: number; issued: number; returned: number; available: number; shortage: number }
export function jobPartSummary(store: WorkshopStore, job: WorkshopJob): JobPartSummary[] {
  const requested = new Map<string,number>(); for (const row of job.workOrder?.parts ?? []) if(row.partId) requested.set(row.partId,(requested.get(row.partId)??0)+row.quantity);
  return [...requested].flatMap(([partId,qty])=>{const part=store.parts.find(p=>p.id===partId);if(!part)return[];const issued=store.partMovements.filter(m=>m.partId===partId&&m.jobId===job.id&&m.type==='ISSUE_TO_JOB').reduce((n,m)=>n+m.quantity,0),returned=store.partMovements.filter(m=>m.partId===partId&&m.jobId===job.id&&m.type==='RETURN_FROM_JOB').reduce((n,m)=>n+m.quantity,0),net=Math.max(0,issued-returned),available=partBalance(store,partId),need=Math.max(0,qty-net);return [{part,requested:qty,issued:net,returned,available,shortage:part.active?Math.max(0,need-available):need}];});
}
export function jobShortage(store: WorkshopStore, job: WorkshopJob): number { return jobPartSummary(store,job).reduce((n,x)=>n+x.shortage,0); }
export function markWaitingForParts(store: WorkshopStore, jobId: string): boolean { return !!setWaitingParts(store,jobId,true); }
export function clearWaitingForParts(store: WorkshopStore, jobId: string): boolean { const job=store.jobs.find(x=>x.id===jobId);return !!job&&jobShortage(store,job)===0&&!!setWaitingParts(store,jobId,false); }
