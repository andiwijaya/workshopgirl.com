import type { Customer, Intake, Vehicle, VehicleType, WorkshopJob, WorkshopStore } from './model.ts';
import { canSetWaitingParts, operationalStatus, qcPassed, transitionReason } from './queue.ts';

export const STORAGE_KEY = 'workshopgirl.workshop.operations.v1';
export const STORE_VERSION = 1 as const;
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface StoreLoad { store: WorkshopStore; recovered: boolean; message: string }
export const emptyStore = (): WorkshopStore => ({ version: STORE_VERSION, customers: [], vehicles: [], jobs: [], parts: [], partMovements: [] });

export function makeId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}_${uuid ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`}`;
}

export function loadStore(storage: StorageLike): StoreLoad {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch { return { store: emptyStore(), recovered: true, message: 'Browser storage is unavailable. Records will not persist after this page closes.' }; }
  if (raw === null) return { store: emptyStore(), recovered: false, message: '' };
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== STORE_VERSION || !Array.isArray(value.customers) || !Array.isArray(value.vehicles) || !Array.isArray(value.jobs)) {
      return { store: emptyStore(), recovered: true, message: 'Saved workshop data has an unsupported version or shape. It was left untouched; new records can still be created.' };
    }
    const rawParts = value.parts === undefined ? [] : value.parts;
    const rawMovements = value.partMovements === undefined ? [] : value.partMovements;
    if (!Array.isArray(rawParts) || !rawParts.every(isPart) || !Array.isArray(rawMovements) || !rawMovements.every(isPartMovement)) {
      return { store: emptyStore(), recovered: true, message: 'Saved workshop inventory has an unsupported shape. The original browser data was left untouched.' };
    }
    const customers = value.customers.filter(isCustomer);
    const vehicles = value.vehicles.filter(isVehicle);
    const customerIds = new Set(customers.map(x => x.id));
    const vehicleIds = new Set(vehicles.map(x => x.id));
    const jobs = value.jobs.filter((x): x is WorkshopJob => isJob(x) && customerIds.has(x.customerId) && vehicleIds.has(x.vehicleId));
    if (customers.length !== value.customers.length || vehicles.length !== value.vehicles.length || jobs.length !== value.jobs.length) {
      return { store: { version: STORE_VERSION, customers, vehicles, jobs, parts: rawParts, partMovements: rawMovements }, recovered: true, message: 'Some invalid saved records were skipped. The original browser data was not overwritten until you save a change.' };
    }
    // Phase 1 records predate Queue metadata. Add an in-memory starting point and
    // persist it only when the user next saves a normal Workshop Job change.
    for (const job of jobs) ensureOperations(job);
    return { store: { version: STORE_VERSION, customers, vehicles, jobs, parts: rawParts, partMovements: rawMovements }, recovered: false, message: '' };
  } catch {
    return { store: emptyStore(), recovered: true, message: 'Saved workshop data could not be read. The original browser data was left untouched.' };
  }
}

export function saveStore(store: WorkshopStore, storage: StorageLike): { ok: boolean; message: string } {
  if (store.version !== STORE_VERSION) return { ok: false, message: 'This workshop data version cannot be saved.' };
  try { storage.setItem(STORAGE_KEY, JSON.stringify(store)); return { ok: true, message: '' }; }
  catch { return { ok: false, message: 'Browser storage is full or unavailable. Your latest change was not saved.' }; }
}

export function createJob(store: WorkshopStore, input: {
  customer: Omit<Customer, 'id'>; vehicle: Omit<Vehicle, 'id'>; intake: Intake;
}, idFactory: (prefix: string) => string = makeId, now = new Date()): WorkshopJob {
  const customer: Customer = { id: idFactory('customer'), ...input.customer };
  const vehicle: Vehicle = { id: idFactory('vehicle'), ...input.vehicle };
  const job: WorkshopJob = {
    id: idFactory('job'), number: input.intake.number, status: 'intake', customerId: customer.id,
    vehicleId: vehicle.id, intake: structuredClone(input.intake), createdAt: now.toISOString(), updatedAt: now.toISOString(),
    operations: { waitingParts: false, history: [{ status: 'Intake', at: now.toISOString(), reason: 'Job created' }] },
  };
  store.customers.push(customer); store.vehicles.push(vehicle); store.jobs.push(job);
  return job;
}

export function updateJob(store: WorkshopStore, id: string, patch: Partial<Pick<WorkshopJob, 'status' | 'intake' | 'inspection' | 'workOrder' | 'qc'>>, now = new Date()): WorkshopJob | null {
  const job = store.jobs.find(item => item.id === id);
  if (!job) return null;
  if (job.status === 'completed') return null;
  if (job.workOrder?.status === 'Cancelled') return null;
  const candidate = { ...job, ...structuredClone(patch) };
  if (candidate.workOrder?.status === 'Cancelled' && (patch.status === 'qc' || patch.status === 'completed' || patch.qc)) return null;
  if (patch.status === 'completed' && !qcPassed(candidate)) return null;
  ensureOperations(job);
  const previousStatus = operationalStatus(job);
  if (patch.status) job.status = patch.status;
  if (patch.intake) job.intake = structuredClone(patch.intake);
  if (patch.inspection) job.inspection = structuredClone(patch.inspection);
  if (patch.workOrder) job.workOrder = structuredClone(patch.workOrder);
  if (patch.qc) job.qc = structuredClone(patch.qc);
  job.updatedAt = now.toISOString();
  recordTransition(job, previousStatus, operationalStatus(job), now);
  return job;
}

/** Reversible operational overlay; it never changes Phase 1 workflow data or job IDs. */
export function setWaitingParts(store: WorkshopStore, id: string, waiting: boolean, now = new Date()): WorkshopJob | null {
  const job = store.jobs.find(item => item.id === id);
  if (!job || (waiting && !canSetWaitingParts(job)) || job.status === 'completed') return null;
  ensureOperations(job);
  if (job.operations!.waitingParts === waiting) return job;
  const previousStatus = operationalStatus(job);
  job.operations!.waitingParts = waiting;
  job.updatedAt = now.toISOString();
  const nextStatus = operationalStatus(job);
  recordTransition(job, previousStatus, nextStatus, now, waiting ? 'Waiting for parts' : 'Waiting for parts cleared');
  return job;
}

function ensureOperations(job: WorkshopJob): void {
  if (!job.operations || !Array.isArray(job.operations.history)) {
    const status = operationalStatus(job);
    job.operations = { waitingParts: false, history: [{ status, at: job.updatedAt || job.createdAt, reason: 'Phase 1 job loaded' }] };
  }
}

function recordTransition(job: WorkshopJob, previous: string, next: ReturnType<typeof operationalStatus>, now: Date, reason?: string): void {
  if (previous === next) return;
  job.operations!.history.push({ status: next, at: now.toISOString(), reason: reason ?? transitionReason(next) });
}

export function getJob(store: WorkshopStore, id: string | null | undefined): WorkshopJob | null {
  return id ? store.jobs.find(job => job.id === id) ?? null : null;
}
export function getCustomer(store: WorkshopStore, job: WorkshopJob): Customer | null { return store.customers.find(x => x.id === job.customerId) ?? null; }
export function getVehicle(store: WorkshopStore, job: WorkshopJob): Vehicle | null { return store.vehicles.find(x => x.id === job.vehicleId) ?? null; }
export function vehicleType(value: string): VehicleType { return value === 'Car' ? 'Car' : 'Motorcycle'; }

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function isCustomer(value: unknown): value is Customer { return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.phone === 'string' && typeof value.address === 'string'; }
function isVehicle(value: unknown): value is Vehicle { return isRecord(value) && typeof value.id === 'string' && (value.type === 'Car' || value.type === 'Motorcycle') && typeof value.plate === 'string' && typeof value.make === 'string' && typeof value.model === 'string' && (value.year === null || typeof value.year === 'number') && typeof value.color === 'string' && (value.odometer === null || typeof value.odometer === 'number'); }
function isRowArray(value: unknown): value is Record<string, unknown>[] { return Array.isArray(value) && value.every(isRecord); }
function isPart(value: unknown): boolean { return isRecord(value) && ['id','sku','name','category','brand','unit','location','supplier','compatibility','createdAt','updatedAt'].every(k => typeof value[k] === 'string') && typeof value.active === 'boolean' && typeof value.minimumStock === 'number' && Number.isFinite(value.minimumStock) && value.minimumStock >= 0 && (value.barcode === undefined || typeof value.barcode === 'string'); }
function isPartMovement(value: unknown): boolean { return isRecord(value) && typeof value.id === 'string' && typeof value.partId === 'string' && ['OPENING','STOCK_IN','ISSUE_TO_JOB','RETURN_FROM_JOB','ADJUSTMENT_IN','ADJUSTMENT_OUT'].includes(String(value.type)) && typeof value.quantity === 'number' && Number.isFinite(value.quantity) && value.quantity > 0 && typeof value.at === 'string' && ['unitCost','supplier','reference','note','jobId'].every(k => value[k] === undefined || (k === 'unitCost' ? typeof value[k] === 'number' && Number.isFinite(value[k]) && (value[k] as number) >= 0 : typeof value[k] === 'string')); }
function isIntake(value: unknown): boolean { return isRecord(value) && typeof value.number === 'string' && typeof value.complaint === 'string' && Array.isArray(value.accessories) && value.accessories.every(x => typeof x === 'string') && typeof value.conditionNotes === 'string' && typeof value.date === 'string' && typeof value.arrivalTime === 'string'; }
function isJob(value: unknown): value is WorkshopJob {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.customerId !== 'string' || typeof value.vehicleId !== 'string' || typeof value.number !== 'string' || !['intake','inspection','work-order','qc','completed'].includes(String(value.status)) || !isIntake(value.intake) || typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') return false;
  if (value.inspection != null && (!isRecord(value.inspection) || !Array.isArray(value.inspection.checklist) || !value.inspection.checklist.every(group => isRecord(group) && typeof group.category === 'string' && isRowArray(group.items)) || !isRowArray(value.inspection.recommendedJobs) || !isRowArray(value.inspection.parts) || !isRowArray(value.inspection.labor))) return false;
  if (value.workOrder != null && (!isRecord(value.workOrder) || !isRowArray(value.workOrder.approvedWork) || !isRowArray(value.workOrder.actualWork) || !isRowArray(value.workOrder.parts) || !isRowArray(value.workOrder.changes))) return false;
  if (value.qc != null && (!isRecord(value.qc) || !isRowArray(value.qc.checks) || !isRowArray(value.qc.unresolvedIssues) || !Array.isArray(value.qc.returnedItems))) return false;
  if (value.operations != null && (!isRecord(value.operations) || typeof value.operations.waitingParts !== 'boolean' || !Array.isArray(value.operations.history) || !value.operations.history.every(entry => isRecord(entry) && typeof entry.status === 'string' && typeof entry.at === 'string'))) return false;
  return true;
}
