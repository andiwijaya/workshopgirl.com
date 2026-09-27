import type { Customer, Intake, Vehicle, VehicleType, WorkshopJob, WorkshopStore } from './model.ts';

export const STORAGE_KEY = 'workshopgirl.workshop.operations.v1';
export const STORE_VERSION = 1 as const;
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface StoreLoad { store: WorkshopStore; recovered: boolean; message: string }
export const emptyStore = (): WorkshopStore => ({ version: STORE_VERSION, customers: [], vehicles: [], jobs: [] });

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
    const customers = value.customers.filter(isCustomer);
    const vehicles = value.vehicles.filter(isVehicle);
    const customerIds = new Set(customers.map(x => x.id));
    const vehicleIds = new Set(vehicles.map(x => x.id));
    const jobs = value.jobs.filter((x): x is WorkshopJob => isJob(x) && customerIds.has(x.customerId) && vehicleIds.has(x.vehicleId));
    if (customers.length !== value.customers.length || vehicles.length !== value.vehicles.length || jobs.length !== value.jobs.length) {
      return { store: { version: STORE_VERSION, customers, vehicles, jobs }, recovered: true, message: 'Some invalid saved records were skipped. The original browser data was not overwritten until you save a change.' };
    }
    return { store: { version: STORE_VERSION, customers, vehicles, jobs }, recovered: false, message: '' };
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
  };
  store.customers.push(customer); store.vehicles.push(vehicle); store.jobs.push(job);
  return job;
}

export function updateJob(store: WorkshopStore, id: string, patch: Partial<Pick<WorkshopJob, 'status' | 'intake' | 'inspection' | 'workOrder' | 'qc'>>, now = new Date()): WorkshopJob | null {
  const job = store.jobs.find(item => item.id === id);
  if (!job) return null;
  if (patch.status) job.status = patch.status;
  if (patch.intake) job.intake = structuredClone(patch.intake);
  if (patch.inspection) job.inspection = structuredClone(patch.inspection);
  if (patch.workOrder) job.workOrder = structuredClone(patch.workOrder);
  if (patch.qc) job.qc = structuredClone(patch.qc);
  job.updatedAt = now.toISOString();
  return job;
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
function isIntake(value: unknown): boolean { return isRecord(value) && typeof value.number === 'string' && typeof value.complaint === 'string' && Array.isArray(value.accessories) && value.accessories.every(x => typeof x === 'string') && typeof value.conditionNotes === 'string' && typeof value.date === 'string' && typeof value.arrivalTime === 'string'; }
function isJob(value: unknown): value is WorkshopJob {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.customerId !== 'string' || typeof value.vehicleId !== 'string' || typeof value.number !== 'string' || !['intake','inspection','work-order','qc','completed'].includes(String(value.status)) || !isIntake(value.intake) || typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') return false;
  if (value.inspection != null && (!isRecord(value.inspection) || !Array.isArray(value.inspection.checklist) || !value.inspection.checklist.every(group => isRecord(group) && typeof group.category === 'string' && isRowArray(group.items)) || !isRowArray(value.inspection.recommendedJobs) || !isRowArray(value.inspection.parts) || !isRowArray(value.inspection.labor))) return false;
  if (value.workOrder != null && (!isRecord(value.workOrder) || !isRowArray(value.workOrder.approvedWork) || !isRowArray(value.workOrder.actualWork) || !isRowArray(value.workOrder.parts) || !isRowArray(value.workOrder.changes))) return false;
  if (value.qc != null && (!isRecord(value.qc) || !isRowArray(value.qc.checks) || !isRowArray(value.qc.unresolvedIssues) || !Array.isArray(value.qc.returnedItems))) return false;
  return true;
}
