import type { Customer, Intake, NextService, Vehicle, VehicleType, WarrantyClaim, WorkshopJob, WorkshopStore, WorkshopWarranty } from './model.ts';
import { canCompleteWorkshopJob, canSetWaitingParts, estimateApprovalPending, operationalStatus, transitionReason, validWorkOrder } from './queue.ts';
import { isEngineObservation, MAX_OBSERVATIONS } from './observation-summary.ts';

export const STORAGE_KEY = 'workshopgirl.workshop.operations.v1';
// Retain the original key so existing users migrate in place, only on explicit save.
export const STORE_VERSION = 2 as const;
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface StoreLoad { store: WorkshopStore; recovered: boolean; message: string }
export const emptyStore = (): WorkshopStore => ({ version: STORE_VERSION, customers: [], vehicles: [], jobs: [], parts: [], partMovements: [], warranties: [], warrantyClaims: [], nextServices: [], invoices: [], payments: [], suppliers: [], purchaseNeeds: [], purchaseOrders: [], goodsReceipts: [] });
const origins = new WeakMap<WorkshopStore, { raw: string | null; blocked: boolean; storage: StorageLike }>();

/** A rollback snapshot keeps the original concurrency/read-only guard. */
export function cloneStore(store: WorkshopStore): WorkshopStore {
  const clone = structuredClone(store), origin = origins.get(store);
  if (origin) origins.set(clone, { ...origin });
  return clone;
}

export function makeId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}_${uuid ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`}`;
}

export function loadStore(storage: StorageLike): StoreLoad {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch {
    const store = emptyStore(); origins.set(store, { raw: null, blocked: true, storage });
    return { store, recovered: true, message: 'Browser storage is unavailable. Saving is blocked; no records have been changed.' };
  }
  const result = (store: WorkshopStore, recovered = false, message = ''): StoreLoad => {
    origins.set(store, { raw, blocked: recovered, storage }); return { store, recovered, message };
  };
  const invalid = (message: string) => result(emptyStore(), true, `${message} Saving is blocked to preserve the original browser records. Use the original browser profile to recover the data; do not clear it.`);
  if (raw === null) return result(emptyStore());
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || ![1, STORE_VERSION].includes(Number(value.version)) || typeof value.version !== 'number' || !Array.isArray(value.customers) || !Array.isArray(value.vehicles) || !Array.isArray(value.jobs)) {
      return invalid('Saved workshop data has an unsupported version or shape.');
    }
    // Initialize absent historical modules; reject malformed collections rather than
    // dropping rows. Spread preserves additive/unknown record fields without loss.
    const candidate = { ...emptyStore(), ...value, version: STORE_VERSION };
    const validators: Record<string, (record: unknown) => boolean> = {
      customers: isCustomer, vehicles: isVehicle, jobs: isJob, parts: isPart, partMovements: isPartMovement,
      warranties: isWarranty, warrantyClaims: isWarrantyClaim, nextServices: isNextService,
      invoices: isInvoice, payments: isPayment, suppliers: isSupplier, purchaseNeeds: isPurchaseNeed,
      purchaseOrders: isPurchaseOrder, goodsReceipts: isGoodsReceipt,
    };
    for (const [field, validate] of Object.entries(validators)) {
      const rows = candidate[field as keyof typeof candidate];
      if (!Array.isArray(rows) || !rows.every(validate)) return invalid(`Saved workshop ${field} data has an unsupported shape.`);
      const idField = ({ suppliers: 'supplierId', purchaseNeeds: 'needId', purchaseOrders: 'poId', goodsReceipts: 'receiptId', invoices: 'invoiceId', payments: 'paymentId' } as Record<string, string>)[field] ?? 'id';
      if (new Set(rows.map(row => (row as unknown as Record<string, unknown>)[idField])).size !== rows.length) return invalid(`Saved workshop ${field} data has duplicate identities.`);
    }
    const store = candidate as WorkshopStore;
    const customerIds = new Set(store.customers.map(customer => customer.id)), vehicleIds = new Set(store.vehicles.map(vehicle => vehicle.id));
    if (store.jobs.some(job => !customerIds.has(job.customerId) || !vehicleIds.has(job.vehicleId))) return invalid('Saved jobs have missing customer or vehicle references.');
    for (const job of store.jobs) { ensureOperations(job); job.observations ??= []; }
    return result(store);
  } catch {
    return invalid('Saved workshop data could not be read or migrated.');
  }
}

export function saveStore(store: WorkshopStore, storage: StorageLike, expectedRaw?: string | null): { ok: boolean; message: string } {
  if (store.version !== STORE_VERSION) return { ok: false, message: 'This workshop data version cannot be saved.' };
  const origin = origins.get(store);
  if (origin?.blocked) return { ok: false, message: 'Saving is blocked to preserve unreadable original workshop records. Nothing was saved.' };
  try {
    const current = storage.getItem(STORAGE_KEY);
    const expected = expectedRaw !== undefined ? expectedRaw : origin?.storage === storage ? origin.raw : undefined;
    if (expected !== undefined && current !== expected) return { ok: false, message: 'Workshop records changed in another tab. Reload before saving; nothing was saved.' };
    if (loadStore({ getItem: () => current, setItem: () => {} }).recovered) return { ok: false, message: 'Saving is blocked to preserve unreadable original workshop records. Nothing was saved.' };
    const serialized = JSON.stringify(store);
    if (loadStore({ getItem: () => serialized, setItem: () => {} }).recovered) return { ok: false, message: 'This change contains invalid workshop records. Nothing was saved.' };
    storage.setItem(STORAGE_KEY, serialized);
    origins.set(store, { raw: serialized, blocked: false, storage });
    return { ok: true, message: '' };
  }
  catch { return { ok: false, message: 'Browser storage is full or unavailable. Your latest change was not saved.' }; }
}

export function createJob(store: WorkshopStore, input: {
  customer: Omit<Customer, 'id'>; vehicle: Omit<Vehicle, 'id'>; intake: Intake; existingVehicleId?: string; existingCustomerId?: string;
}, idFactory: (prefix: string) => string = makeId, now = new Date()): WorkshopJob {
  const customer: Customer = (input.existingCustomerId && store.customers.find(x=>x.id===input.existingCustomerId)) || { id: idFactory('customer'), ...input.customer };
  const existing=input.existingVehicleId?store.vehicles.find(x=>x.id===input.existingVehicleId):undefined;
  const vehicle: Vehicle = existing??{ id: idFactory('vehicle'), ...input.vehicle };
  if(existing){const readings=[existing.odometer,input.vehicle.odometer].filter((x):x is number=>x!==null);const latest=readings.length?Math.max(...readings):null;Object.assign(existing,input.vehicle,{id:existing.id,odometer:latest});}
  const job: WorkshopJob = {
    id: idFactory('job'), number: input.intake.number, status: 'intake', customerId: customer.id,
    vehicleId: vehicle.id, intake: structuredClone(input.intake), createdAt: now.toISOString(), updatedAt: now.toISOString(),
    operations: { waitingParts: false, history: [{ status: 'Intake', at: now.toISOString(), reason: 'Job created' }] },
  };
  if(!store.customers.some(x=>x.id===customer.id))store.customers.push(customer); if(!existing)store.vehicles.push(vehicle); store.jobs.push(job);
  return job;
}

export function updateJob(store: WorkshopStore, id: string, patch: Partial<Pick<WorkshopJob, 'status' | 'intake' | 'inspection' | 'workOrder' | 'qc' | 'serviceOdometer'>>, now = new Date()): WorkshopJob | null {
  const job = store.jobs.find(item => item.id === id);
  if (!job) return null;
  if (job.status === 'completed') return null;
  if (job.workOrder?.status === 'Cancelled') return null;
  const candidate = { ...job, ...structuredClone(patch) };
  if (patch.workOrder && !candidate.inspection) return null;
  if (patch.inspection && job.inspection && estimateScope(job.inspection) !== estimateScope(patch.inspection)) {
    candidate.inspection = { ...candidate.inspection!, revision: (job.inspection.revision ?? 1) + 1, approvedRevision: undefined, approvedAt: undefined, approvedBy: undefined,
      recommendedJobs: candidate.inspection!.recommendedJobs.map(item => ({ ...item, approved: false, approvedAt: undefined, approvedBy: undefined })) };
  }
  if (candidate.workOrder?.status === 'Cancelled' && (patch.status === 'qc' || patch.status === 'completed' || patch.qc)) return null;
  if (patch.status === 'completed' && !canCompleteWorkshopJob(candidate)) return null;
  if (patch.workOrder && estimateApprovalPending(candidate)) return null;
  if (patch.workOrder?.status === 'Complete' && !validWorkOrder({ ...candidate, workOrder: patch.workOrder })) return null;
  ensureOperations(job);
  const previousStatus = operationalStatus(job);
  if (patch.status) job.status = patch.status;
  if (patch.intake) job.intake = structuredClone(patch.intake);
  if (patch.inspection) job.inspection = structuredClone(candidate.inspection!);
  if (patch.workOrder) job.workOrder = structuredClone(patch.workOrder);
  if (patch.qc) job.qc = structuredClone(patch.qc);
  if (patch.serviceOdometer !== undefined) job.serviceOdometer = patch.serviceOdometer;
  job.updatedAt = now.toISOString();
  recordTransition(job, previousStatus, operationalStatus(job), now);
  return job;
}

function estimateScope(inspection: NonNullable<WorkshopJob['inspection']>): string {
  return JSON.stringify({ findings: inspection.findings, checklist: inspection.checklist,
    recommendedJobs: inspection.recommendedJobs.map(item => ({ id:item.id,name:item.name,detail:item.detail,priority:item.priority })),
    parts: inspection.parts, labor: inspection.labor, consumables: inspection.consumables,
    additionalCost: inspection.additionalCost, discount: inspection.discount, taxRate: inspection.taxRate });
}

/** Reversible operational overlay; it never changes Phase 1 workflow data or job IDs. */
export function setWaitingParts(store: WorkshopStore, id: string, waiting: boolean, now = new Date(), reason = ''): WorkshopJob | null {
  const job = store.jobs.find(item => item.id === id);
  if (!job || (waiting && !canSetWaitingParts(job)) || job.status === 'completed') return null;
  ensureOperations(job);
  const previousReason=job.operations!.waitingPartsReason??'';
  if (job.operations!.waitingParts === waiting && (!waiting || !reason.trim() || previousReason === reason.trim())) return job;
  if (waiting && !hasPartsShortage(store, job) && !reason.trim()) return null;
  const previousStatus = operationalStatus(job);
  job.operations!.waitingParts = waiting;
  job.operations!.waitingPartsReason = waiting ? reason.trim() || undefined : undefined;
  job.updatedAt = now.toISOString();
  const nextStatus = operationalStatus(job);
  recordTransition(job, previousStatus, nextStatus, now, waiting ? `Waiting for parts${job.operations!.waitingPartsReason ? `: ${job.operations!.waitingPartsReason}` : ''}` : 'Waiting for parts cleared');
  if(previousStatus===nextStatus&&waiting&&previousReason!==reason.trim())job.operations!.history.push({status:nextStatus,at:now.toISOString(),reason:`Waiting Parts reason updated: ${reason.trim()}`});
  return job;
}

function hasPartsShortage(store:WorkshopStore,job:WorkshopJob):boolean {
  const requested=new Map<string,number>();for(const row of job.workOrder?.parts??[])if(row.partId)requested.set(row.partId,(requested.get(row.partId)??0)+row.quantity);
  for(const [partId,quantity]of requested){const issued=store.partMovements.filter(m=>m.partId===partId&&m.jobId===job.id&&m.type==='ISSUE_TO_JOB').reduce((n,m)=>n+m.quantity,0),returned=store.partMovements.filter(m=>m.partId===partId&&m.jobId===job.id&&m.type==='RETURN_FROM_JOB').reduce((n,m)=>n+m.quantity,0),available=store.partMovements.filter(m=>m.partId===partId).reduce((n,m)=>n+(['OPENING','STOCK_IN','RETURN_FROM_JOB','ADJUSTMENT_IN'].includes(m.type)?m.quantity:-m.quantity),0);if(quantity-Math.max(0,issued-returned)>available)return true;}
  return false;
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
function isISODate(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;}
function isCustomer(value: unknown): value is Customer { return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.phone === 'string' && typeof value.address === 'string'; }
function isVehicle(value: unknown): value is Vehicle { return isRecord(value) && typeof value.id === 'string' && (value.type === 'Car' || value.type === 'Motorcycle') && typeof value.plate === 'string' && typeof value.make === 'string' && typeof value.model === 'string' && (value.year === null || typeof value.year === 'number') && typeof value.color === 'string' && (value.odometer === null || typeof value.odometer === 'number'); }
function isRowArray(value: unknown): value is Record<string, unknown>[] { return Array.isArray(value) && value.every(isRecord); }
function isPart(value: unknown): boolean { return isRecord(value) && ['id','sku','name','category','brand','unit','location','supplier','compatibility','createdAt','updatedAt'].every(k => typeof value[k] === 'string') && typeof value.active === 'boolean' && typeof value.minimumStock === 'number' && Number.isFinite(value.minimumStock) && value.minimumStock >= 0 && (value.barcode === undefined || typeof value.barcode === 'string') && (value.defaultSupplierId === undefined || typeof value.defaultSupplierId === 'string'); }
function isPartMovement(value: unknown): boolean { return isRecord(value) && typeof value.id === 'string' && typeof value.partId === 'string' && ['OPENING','STOCK_IN','ISSUE_TO_JOB','RETURN_FROM_JOB','ADJUSTMENT_IN','ADJUSTMENT_OUT'].includes(String(value.type)) && typeof value.quantity === 'number' && Number.isFinite(value.quantity) && value.quantity > 0 && typeof value.at === 'string' && ['unitCost','supplier','reference','note','jobId','partNameSnapshot','partSkuSnapshot','partUnitSnapshot','sourceType','sourceId','poId','poNumber','receiptId','receiptNumber','receiptLineId'].every(k => value[k] === undefined || (k === 'unitCost' ? typeof value[k] === 'number' && Number.isFinite(value[k]) && (value[k] as number) >= 0 : k==='sourceType'?value[k]==='PURCHASE_RECEIPT':typeof value[k] === 'string')) && (value.sourceType===undefined||typeof value.sourceId==='string'&&typeof value.receiptLineId==='string'); }
function isSupplier(value:unknown):boolean{return isRecord(value)&&typeof value.supplierId==='string'&&typeof value.name==='string'&&!!value.name.trim()&&typeof value.active==='boolean'&&typeof value.createdAt==='string'&&typeof value.updatedAt==='string'&&['phone','email','address','contactPerson','notes'].every(k=>value[k]===undefined||typeof value[k]==='string');}
function isAllocations(value:unknown):value is {needId:string;quantity:number}[]{return Array.isArray(value)&&value.every(x=>isRecord(x)&&typeof x.needId==='string'&&typeof x.quantity==='number'&&Number.isFinite(x.quantity)&&x.quantity>0);}
function isPurchaseNeed(value:unknown):boolean{return isRecord(value)&&typeof value.needId==='string'&&['JOB_SHORTAGE','REPLENISHMENT','MANUAL'].includes(String(value.source))&&typeof value.partId==='string'&&typeof value.partNameSnapshot==='string'&&typeof value.skuSnapshot==='string'&&typeof value.unitSnapshot==='string'&&typeof value.requestedQuantity==='number'&&Number.isFinite(value.requestedQuantity)&&value.requestedQuantity>0&&typeof value.createdAt==='string'&&(value.jobId===undefined||typeof value.jobId==='string')&&(value.jobRequestedQuantitySnapshot===undefined||typeof value.jobRequestedQuantitySnapshot==='number'&&Number.isFinite(value.jobRequestedQuantitySnapshot)&&value.jobRequestedQuantitySnapshot>=0)&&(value.requiredBy===undefined||typeof value.requiredBy==='string')&&(value.reason===undefined||typeof value.reason==='string')&&(value.cancelledAt===undefined||typeof value.cancelledAt==='string')&&(value.cancelReason===undefined||typeof value.cancelReason==='string');}
function isPurchaseOrderLine(value:unknown):boolean{return isRecord(value)&&typeof value.lineId==='string'&&typeof value.partId==='string'&&typeof value.partNameSnapshot==='string'&&typeof value.skuSnapshot==='string'&&typeof value.unitSnapshot==='string'&&typeof value.orderedQuantity==='number'&&Number.isFinite(value.orderedQuantity)&&value.orderedQuantity>0&&Number.isSafeInteger(value.agreedUnitCost)&&Number(value.agreedUnitCost)>=0&&isAllocations(value.sourceAllocations)&&Math.abs(value.orderedQuantity-value.sourceAllocations.reduce((n,x)=>n+x.quantity,0))<1e-8;}
function isSupplierSnapshot(value:unknown):boolean{return isRecord(value)&&typeof value.name==='string'&&['phone','email','address','contactPerson'].every(k=>value[k]===undefined||typeof value[k]==='string');}
function isPurchaseOrder(value:unknown):boolean{return isRecord(value)&&typeof value.poId==='string'&&['Draft','Issued','Closed','Cancelled'].includes(String(value.status))&&typeof value.orderDate==='string'&&Array.isArray(value.lines)&&value.lines.every(isPurchaseOrderLine)&&typeof value.createdAt==='string'&&typeof value.updatedAt==='string'&&(value.poNumber===undefined||typeof value.poNumber==='string')&&(value.supplierId===undefined||typeof value.supplierId==='string')&&(value.supplierSnapshot===undefined||isSupplierSnapshot(value.supplierSnapshot))&&(value.status==='Draft'||typeof value.poNumber==='string'&&isSupplierSnapshot(value.supplierSnapshot))&&['expectedDate','notes','issuedAt','closedAt','cancelledAt','cancelReason','closeReason'].every(k=>value[k]===undefined||typeof value[k]==='string');}
function isGoodsReceiptLine(value:unknown):boolean{return isRecord(value)&&typeof value.receiptLineId==='string'&&typeof value.poLineId==='string'&&typeof value.partId==='string'&&typeof value.partNameSnapshot==='string'&&typeof value.skuSnapshot==='string'&&typeof value.unitSnapshot==='string'&&typeof value.deliveredQuantity==='number'&&Number.isFinite(value.deliveredQuantity)&&value.deliveredQuantity>0&&typeof value.acceptedQuantity==='number'&&Number.isFinite(value.acceptedQuantity)&&value.acceptedQuantity>=0&&typeof value.rejectedQuantity==='number'&&Number.isFinite(value.rejectedQuantity)&&value.rejectedQuantity>=0&&Math.abs(value.deliveredQuantity-value.acceptedQuantity-value.rejectedQuantity)<1e-8&&Array.isArray(value.acceptedNeedAllocations)&&isAllocations(value.acceptedNeedAllocations)&&Math.abs(value.acceptedQuantity-value.acceptedNeedAllocations.reduce((n,x)=>n+x.quantity,0))<1e-8&&(value.actualUnitCost===undefined||Number.isSafeInteger(value.actualUnitCost)&&Number(value.actualUnitCost)>=0)&&(value.stockMovementId===undefined||typeof value.stockMovementId==='string')&&(value.rejectionNote===undefined||typeof value.rejectionNote==='string');}
function isGoodsReceipt(value:unknown):boolean{return isRecord(value)&&typeof value.receiptId==='string'&&typeof value.receiptNumber==='string'&&typeof value.poId==='string'&&typeof value.receivedAt==='string'&&typeof value.createdAt==='string'&&Array.isArray(value.lines)&&value.lines.length>0&&value.lines.every(isGoodsReceiptLine)&&['supplierDeliveryNote','supplierInvoiceReference','receivedBy','notes'].every(k=>value[k]===undefined||typeof value[k]==='string');}
function isWarranty(value:unknown):value is WorkshopWarranty{return isRecord(value)&&['id','jobId','vehicleId','terms','createdAt','updatedAt'].every(k=>typeof value[k]==='string')&&isISODate(value.startDate)&&['Labor','Parts','Labor and parts'].includes(String(value.coverageType))&&Array.isArray(value.coveredWork)&&value.coveredWork.every(x=>typeof x==='string')&&Array.isArray(value.coveredPartIds)&&value.coveredPartIds.every(x=>typeof x==='string')&&(value.startOdometer===null||typeof value.startOdometer==='number'&&Number.isFinite(value.startOdometer)&&value.startOdometer>=0)&&(value.expiryDate===null||isISODate(value.expiryDate)&&value.expiryDate>=value.startDate)&&(value.expiryOdometer===null||typeof value.expiryOdometer==='number'&&Number.isFinite(value.expiryOdometer)&&value.expiryOdometer>=0&&(value.startOdometer===null||value.expiryOdometer>=value.startOdometer))&&(value.expiryDate!==null||value.expiryOdometer!==null);}
function isWarrantyClaim(value:unknown):value is WarrantyClaim{return isRecord(value)&&['id','warrantyId','issue','resolution','notes','createdAt','updatedAt'].every(k=>typeof value[k]==='string')&&isISODate(value.date)&&['Open','Resolved','Declined'].includes(String(value.status))&&(value.odometer===null||typeof value.odometer==='number'&&Number.isFinite(value.odometer)&&value.odometer>=0);}
function isNextService(value:unknown):value is NextService{return isRecord(value)&&['id','jobId','vehicleId','recommendation','createdAt','updatedAt'].every(k=>typeof value[k]==='string')&&(value.date===null||isISODate(value.date))&&(value.odometer===null||typeof value.odometer==='number'&&Number.isFinite(value.odometer)&&value.odometer>=0);}
function isInvoice(value:unknown):boolean {
  if(!isRecord(value)||!['invoiceId','jobId','createdAt','updatedAt'].every(k=>typeof value[k]==='string')||!['Draft','Issued','Void'].includes(String(value.status))||value.currency!=='IDR'||!Array.isArray(value.lines))return false;
  if(!['subtotal','discount','taxRateBps','taxAmount','grandTotal'].every(k=>Number.isSafeInteger(value[k])&&(value[k] as number)>=0)||typeof value.noCharge!=='boolean')return false;
  if(value.invoiceNumber!==undefined&&typeof value.invoiceNumber!=='string'||value.issuedAt!==undefined&&typeof value.issuedAt!=='string'||value.voidAt!==undefined&&typeof value.voidAt!=='string'||value.voidReason!==undefined&&typeof value.voidReason!=='string')return false;
  if(value.customerSnapshot!==undefined){const snapshot=value.customerSnapshot;if(!isRecord(snapshot)||!['name','phone','address'].every(k=>typeof snapshot[k]==='string'))return false;}
  if(value.vehicleSnapshot!==undefined){const snapshot=value.vehicleSnapshot;if(!isRecord(snapshot)||!['plate','make','model'].every(k=>typeof snapshot[k]==='string')||!['Car','Motorcycle'].includes(String(snapshot.type))||(snapshot.year!==null&&typeof snapshot.year!=='number'))return false;}
  if(value.status!=='Draft'&&(typeof value.invoiceNumber!=='string'||typeof value.issuedAt!=='string'||!value.customerSnapshot||!value.vehicleSnapshot||typeof value.jobNumberSnapshot!=='string'))return false;
  if(value.status==='Void'&&(typeof value.voidAt!=='string'||typeof value.voidReason!=='string'||!value.voidReason.trim()))return false;
  return value.lines.every(line=>isRecord(line)&&typeof line.lineId==='string'&&['LABOR','INVENTORY_PART','NON_INVENTORY_MATERIAL','MANUAL'].includes(String(line.sourceType))&&typeof line.description==='string'&&Number.isSafeInteger(line.quantityMilli)&&Number(line.quantityMilli)>=0&&typeof line.unit==='string'&&(line.unitSellingPrice===null||Number.isSafeInteger(line.unitSellingPrice)&&Number(line.unitSellingPrice)>=0)&&typeof line.priceConfirmed==='boolean'&&typeof line.included==='boolean'&&Number.isSafeInteger(line.lineTotal)&&Number(line.lineTotal)>=0&&(line.sourceId===undefined||typeof line.sourceId==='string')&&(line.sourceIds===undefined||Array.isArray(line.sourceIds)&&line.sourceIds.every(x=>typeof x==='string')));
}
function isPayment(value:unknown):boolean {
  return isRecord(value)&&['paymentId','invoiceId','paidAt','createdAt'].every(k=>typeof value[k]==='string')&&['Payment','Reversal'].includes(String(value.kind))&&Number.isSafeInteger(value.amount)&&Number(value.amount)>0&&(value.method===undefined||['Cash','Bank Transfer','Card','Digital Payment','Other'].includes(String(value.method)))&&(value.reference===undefined||typeof value.reference==='string')&&(value.note===undefined||typeof value.note==='string')&&(value.reversalOfPaymentId===undefined||typeof value.reversalOfPaymentId==='string')&&(value.reversalReason===undefined||typeof value.reversalReason==='string')&&(value.receiptNumber===undefined||typeof value.receiptNumber==='string')&&(value.kind==='Payment'?typeof value.method==='string'&&typeof value.receiptNumber==='string':typeof value.reversalOfPaymentId==='string'&&typeof value.reversalReason==='string');
}
function isIntake(value: unknown): boolean { return isRecord(value) && typeof value.number === 'string' && typeof value.complaint === 'string' && Array.isArray(value.accessories) && value.accessories.every(x => typeof x === 'string') && typeof value.conditionNotes === 'string' && typeof value.date === 'string' && typeof value.arrivalTime === 'string'; }
const stringFields = (value: Record<string, unknown>, fields: string[]) => fields.every(field => typeof value[field] === 'string');
const numericFields = (value: Record<string, unknown>, fields: string[]) => fields.every(field => typeof value[field] === 'number' && Number.isFinite(value[field]));
function safeInspection(value: unknown): boolean {
  return isRecord(value) && typeof value.findings === 'string' && numericFields(value, ['consumables','additionalCost','discount','taxRate'])
    && Array.isArray(value.checklist) && value.checklist.every(group => isRecord(group) && typeof group.category === 'string' && isRowArray(group.items) && group.items.every(item => stringFields(item,['name','note']) && ['Good','Monitor','Service','Replace','Not checked','Not applicable'].includes(String(item.status))))
    && isRowArray(value.recommendedJobs) && value.recommendedJobs.every(row => stringFields(row,['id','name','detail']) && typeof row.approved === 'boolean' && ['Urgent','Recommended','Can wait'].includes(String(row.priority)))
    && isRowArray(value.parts) && value.parts.every(row => stringFields(row,['id','name','partNumber','unit']) && numericFields(row,['quantity','unitPrice']))
    && isRowArray(value.labor) && value.labor.every(row => stringFields(row,['id','name']) && ['fixed','hourly'].includes(String(row.mode)) && numericFields(row,['hours','rate','fixed']))
    && ['approvedAt','approvedBy'].every(field => value[field] === undefined || typeof value[field] === 'string')
    && ['revision','approvedRevision'].every(field => value[field] === undefined || Number.isSafeInteger(value[field]) && Number(value[field]) >= 0);
}
function safeWorkOrder(value: unknown): boolean {
  const workRows = (rows: unknown) => isRowArray(rows) && rows.every(row => stringFields(row,['id','name','detail','mechanic']) && ['Not started','In progress','Complete','Paused','Cancelled'].includes(String(row.status)));
  return isRecord(value) && stringFields(value,['number','date','mechanic','startTime','endTime','mechanicNotes','result','recommendations','signoff'])
    && ['Not started','In progress','Complete','Paused','Cancelled'].includes(String(value.status)) && workRows(value.approvedWork) && workRows(value.actualWork)
    && isRowArray(value.parts) && value.parts.every(row => stringFields(row,['id','name','partNumber','unit','notes']) && numericFields(row,['quantity']) && (row.partId === undefined || typeof row.partId === 'string'))
    && isRowArray(value.changes) && value.changes.every(row => stringFields(row,['id','work','reason','notes']) && ['Awaiting approval','Approved','Deferred','Declined'].includes(String(row.approval)))
    && (value.noRepairReason === undefined || typeof value.noRepairReason === 'string') && (value.noRepairAcknowledged === undefined || typeof value.noRepairAcknowledged === 'boolean');
}
function safeQC(value: unknown): boolean {
  return isRecord(value) && stringFields(value,['number','date','inspector','mechanic','roadTester','roadTestNotes','readinessNotes','recommendations','customerNotes','handoverRecipient','handoverStaff','handoverDate','handoverTime'])
    && ['In progress','Rework required','Ready for handover'].includes(String(value.finalStatus)) && ['Completed','Not completed','Not required'].includes(String(value.roadTest))
    && isRowArray(value.checks) && value.checks.every(row => stringFields(row,['name','note']) && ['Pass','Needs attention','Not applicable','Not checked'].includes(String(row.result)))
    && isRowArray(value.unresolvedIssues) && value.unresolvedIssues.every(row => stringFields(row,['id','issue','recommendation']) && ['Customer deferred','Needs follow-up'].includes(String(row.status)) && (row.deferralReason === undefined || typeof row.deferralReason === 'string'))
    && Array.isArray(value.returnedItems) && value.returnedItems.every(item => typeof item === 'string')
    && ['odometerBefore','odometerAfter'].every(field => value[field] === null || typeof value[field] === 'number' && Number.isFinite(value[field]));
}
function isJob(value: unknown): value is WorkshopJob {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.customerId !== 'string' || typeof value.vehicleId !== 'string' || typeof value.number !== 'string' || !['intake','inspection','work-order','qc','completed'].includes(String(value.status)) || !isIntake(value.intake) || typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') return false;
  if (!value.id || !Number.isFinite(Date.parse(value.createdAt)) || !Number.isFinite(Date.parse(value.updatedAt))) return false;
  if(value.serviceOdometer!==undefined&&value.serviceOdometer!==null&&(typeof value.serviceOdometer!=='number'||!Number.isFinite(value.serviceOdometer)||value.serviceOdometer<0))return false;
  if (value.observations !== undefined && (!Array.isArray(value.observations) || value.observations.length > MAX_OBSERVATIONS || !value.observations.every(isEngineObservation) || new Set(value.observations.map(item => item.id)).size !== value.observations.length)) return false;
  if (value.inspection != null && !safeInspection(value.inspection)) return false;
  if (value.workOrder != null && !safeWorkOrder(value.workOrder)) return false;
  if (value.qc != null && !safeQC(value.qc)) return false;
  if (value.operations != null && (!isRecord(value.operations) || typeof value.operations.waitingParts !== 'boolean' || (value.operations.waitingPartsReason !== undefined && typeof value.operations.waitingPartsReason !== 'string') || !Array.isArray(value.operations.history) || !value.operations.history.every(entry => isRecord(entry) && typeof entry.status === 'string' && typeof entry.at === 'string' && Number.isFinite(Date.parse(entry.at)) && (entry.reason === undefined || typeof entry.reason === 'string')))) return false;
  return true;
}
