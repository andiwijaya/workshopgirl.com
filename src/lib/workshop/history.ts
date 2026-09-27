import type { NextService, PartMovement, WorkshopJob, WorkshopStore, WorkshopWarranty, WarrantyClaim, WarrantyCoverageType } from './model.ts';
import { workflowStatus } from './queue.ts';
import { makeId } from './store.ts';

export interface ConsumedPart { partId: string; name: string; sku: string; unit: string; quantity: number }
export interface ServiceProjection {
  jobId: string; vehicleId: string; jobNumber: string; customerName: string;
  serviceDate: string; odometer: number | null; complaint: string; findings: string;
  actualWork: { id: string; name: string; detail: string; mechanic: string }[];
  technician: string; consumedParts: ConsumedPart[]; freeTextMaterials: { name: string; partNumber: string; quantity: number; unit: string; notes: string }[];
  qcResult: string; handoverNotes: string; handoverRecipient: string; status: 'Completed';
}
export type WarrantyStatus = 'Active' | 'Expired' | 'Odometer unknown';
export type NextServiceStatus = 'Upcoming' | 'Due by Date' | 'Due by Odometer' | 'Due' | 'Odometer unknown';
export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const ok=<T>(value:T):Result<T>=>({ok:true,value});
const fail=<T=never>(message:string):Result<T>=>({ok:false,message});
const validDate=(date:string|null|undefined):date is string=>!!date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
export const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const serviceDate=(job:WorkshopJob)=>job.qc?.handoverDate||job.qc?.date||job.intake.date||job.updatedAt.slice(0,10);
const serviceOdometer=(job:WorkshopJob,store:WorkshopStore)=>job.serviceOdometer??job.qc?.odometerAfter??job.qc?.odometerBefore??store.vehicles.find(v=>v.id===job.vehicleId)?.odometer??null;
const movementQty=(movements:PartMovement[],jobId:string,partId:string,type:PartMovement['type'])=>movements.filter(m=>m.jobId===jobId&&m.partId===partId&&m.type===type).reduce((n,m)=>n+m.quantity,0);

export function completedService(job:WorkshopJob,store:WorkshopStore):ServiceProjection|null {
  if(job.status!=='completed'||workflowStatus(job)!=='Completed'||!job.qc)return null;
  const customer=store.customers.find(c=>c.id===job.customerId);
  const actualWork=(job.workOrder?.actualWork??[]).filter(w=>w.status==='Complete'&&w.name.trim()).map(w=>({id:w.id,name:w.name.trim(),detail:w.detail,mechanic:w.mechanic.trim()}));
  const partIds=new Set(store.partMovements.filter(m=>m.jobId===job.id&&(m.type==='ISSUE_TO_JOB'||m.type==='RETURN_FROM_JOB')).map(m=>m.partId));
  const consumedParts=[...partIds].flatMap(partId=>{const quantity=movementQty(store.partMovements,job.id,partId,'ISSUE_TO_JOB')-movementQty(store.partMovements,job.id,partId,'RETURN_FROM_JOB');if(quantity<=0)return[];const part=store.parts.find(p=>p.id===partId);return[{partId,name:part?.name??'Inventory part',sku:part?.sku??'',unit:part?.unit??'each',quantity}];});
  const freeTextMaterials=(job.workOrder?.parts??[]).filter(p=>!p.partId&&p.name.trim()).map(p=>({name:p.name.trim(),partNumber:p.partNumber,quantity:p.quantity,unit:p.unit,notes:p.notes}));
  return {jobId:job.id,vehicleId:job.vehicleId,jobNumber:job.number,customerName:customer?.name??'',serviceDate:serviceDate(job),odometer:serviceOdometer(job,store),complaint:job.intake.complaint,findings:job.inspection?.findings??'',actualWork,technician:actualWork.map(w=>w.mechanic).find(Boolean)||job.workOrder?.mechanic||job.qc.mechanic||'',consumedParts,freeTextMaterials,qcResult:job.qc.finalStatus,handoverNotes:[job.qc.readinessNotes,job.qc.customerNotes,job.qc.recommendations].filter(Boolean).join(' · '),handoverRecipient:job.qc.handoverRecipient,status:'Completed'};
}
export function serviceHistory(store:WorkshopStore,vehicleId?:string):ServiceProjection[]{return store.jobs.map(j=>completedService(j,store)).filter((x):x is ServiceProjection=>!!x&&(!vehicleId||x.vehicleId===vehicleId)).sort((a,b)=>b.serviceDate.localeCompare(a.serviceDate)||b.jobId.localeCompare(a.jobId));}
export function vehicleHistorySearch(store:WorkshopStore,query:string){const q=query.trim().toLocaleLowerCase();return store.vehicles.filter(v=>{const histories=serviceHistory(store,v.id);if(!histories.length)return false;const customer=histories.map(h=>h.customerName).join(' ');return !q||[v.plate,v.make,v.model,customer].some(x=>x.toLocaleLowerCase().includes(q));});}
export function latestKnownOdometer(store:WorkshopStore,vehicleId:string):number|null{const values=[store.vehicles.find(v=>v.id===vehicleId)?.odometer,...serviceHistory(store,vehicleId).flatMap(h=>[h.odometer,store.jobs.find(j=>j.id===h.jobId)?.qc?.odometerAfter])].filter((x):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0);return values.length?Math.max(...values):null;}
export function warrantyStatus(warranty:WorkshopWarranty,odometer:number|null,today=localDate()):WarrantyStatus{
  if(warranty.expiryDate&&validDate(today)&&today>warranty.expiryDate)return'Expired';
  if(warranty.expiryOdometer!==null){if(odometer===null)return'Odometer unknown';if(odometer>warranty.expiryOdometer)return'Expired';}
  return'Active';
}
export function warrantyStatusForVehicle(store:WorkshopStore,warranty:WorkshopWarranty,today=localDate()){return warrantyStatus(warranty,latestKnownOdometer(store,warranty.vehicleId),today);}
export function createWarranty(store:WorkshopStore,input:{jobId:string;coverageType:WarrantyCoverageType;coveredWork:string[];coveredPartIds:string[];startDate?:string;expiryDate?:string|null;expiryOdometer?:number|null;terms?:string},idFactory=(p:string)=>makeId(p),now=new Date()):Result<WorkshopWarranty>{
 const job=store.jobs.find(j=>j.id===input.jobId),projection=job&&completedService(job,store);if(!job||!projection)return fail('Warranty can only be added to a completed Workshop Job.');
 if(store.warranties.some(w=>w.jobId===job.id))return fail('A warranty is already recorded for this completed service.');
 const startDate=input.startDate||projection.serviceDate,expiryDate=input.expiryDate||null,expiryOdometer=input.expiryOdometer??null;
 if(!validDate(startDate))return fail('Enter a valid warranty start date.');if(expiryDate&&!validDate(expiryDate))return fail('Enter a valid warranty expiry date.');if(expiryDate&&expiryDate<startDate)return fail('Warranty expiry date cannot be before its start date.');
 if(expiryOdometer!==null&&(!Number.isFinite(expiryOdometer)||expiryOdometer<0))return fail('Warranty expiry odometer must be zero or greater.');if(expiryOdometer!==null&&projection.odometer!==null&&expiryOdometer<projection.odometer)return fail('Warranty expiry odometer cannot be below the service odometer.');if(!expiryDate&&expiryOdometer===null)return fail('Enter an expiry date or expiry odometer.');
 const coveredWork=[...new Set(input.coveredWork.map(x=>x.trim()).filter(Boolean))],coveredPartIds=[...new Set(input.coveredPartIds)];
 if(coveredWork.some(name=>!projection.actualWork.some(w=>w.name===name)))return fail('Warranty work must match actual completed Work Order rows.');if(coveredPartIds.some(id=>!projection.consumedParts.some(p=>p.partId===id)))return fail('Warranty parts must be parts actually consumed by this completed job.');
 if((input.coverageType==='Labor'||input.coverageType==='Labor and parts')&&!coveredWork.length)return fail('Select at least one actual work item for labor coverage.');if((input.coverageType==='Parts'||input.coverageType==='Labor and parts')&&!coveredPartIds.length)return fail('Select at least one consumed part for parts coverage.');
 const timestamp=now.toISOString(),warranty:WorkshopWarranty={id:idFactory('warranty'),jobId:job.id,vehicleId:job.vehicleId,coverageType:input.coverageType,coveredWork,coveredPartIds,startDate,startOdometer:projection.odometer,expiryDate,expiryOdometer,terms:(input.terms??'').trim(),createdAt:timestamp,updatedAt:timestamp};store.warranties.push(warranty);return ok(warranty);
}
export function createWarrantyClaim(store:WorkshopStore,input:{warrantyId:string;date:string;odometer:number|null;issue:string;resolution?:string;notes?:string;status?:WarrantyClaim['status']},idFactory=(p:string)=>makeId(p),now=new Date()):Result<WarrantyClaim>{
 const warranty=store.warranties.find(x=>x.id===input.warrantyId),job=warranty&&store.jobs.find(j=>j.id===warranty.jobId);if(!warranty||!job||job.vehicleId!==warranty.vehicleId||!completedService(job,store))return fail('Choose a warranty linked to its completed Workshop Job.');if(!validDate(input.date)||input.date<warranty.startDate)return fail('Claim date must be valid and on or after warranty start.');if(!input.issue.trim())return fail('Describe the reported issue.');
 if(input.odometer!==null&&(!Number.isFinite(input.odometer)||input.odometer<0))return fail('Claim odometer must be zero or greater.');if(input.odometer!==null&&warranty.startOdometer!==null&&input.odometer<warranty.startOdometer)return fail('Claim odometer cannot be below the warranty service odometer.');
 const prior=store.warrantyClaims.filter(c=>c.warrantyId===warranty.id&&c.odometer!==null).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);if(input.odometer!==null&&prior?.odometer!==null&&prior?.odometer!==undefined&&input.odometer<prior.odometer)return fail('Claim odometer cannot be lower than the last recorded claim odometer.');
 const status=input.status??'Open',resolution=(input.resolution??'').trim();if(status==='Resolved'&&!resolution)return fail('Enter a resolution before recording the claim as resolved.');const timestamp=now.toISOString(),claim:WarrantyClaim={id:idFactory('claim'),warrantyId:warranty.id,date:input.date,odometer:input.odometer,issue:input.issue.trim(),resolution,notes:(input.notes??'').trim(),status,createdAt:timestamp,updatedAt:timestamp};store.warrantyClaims.push(claim);return ok(claim);
}
export function saveNextService(store:WorkshopStore,input:{jobId:string;date:string|null;odometer:number|null;recommendation:string},idFactory=(p:string)=>makeId(p),now=new Date()):Result<NextService>{
 const job=store.jobs.find(j=>j.id===input.jobId),projection=job&&completedService(job,store);if(!job||!projection)return fail('Next Service can only be recorded for a completed Workshop Job.');
 if(input.date!==null&&!validDate(input.date))return fail('Enter a valid next service date.');if(input.odometer!==null&&(!Number.isFinite(input.odometer)||input.odometer<0))return fail('Next service odometer must be zero or greater.');if(input.odometer!==null&&projection.odometer!==null&&input.odometer<projection.odometer)return fail('Next service odometer cannot be below the service odometer.');if(!input.date&&input.odometer===null&&!input.recommendation.trim())return fail('Enter a date, odometer, or service recommendation.');
 const timestamp=now.toISOString(),existing=store.nextServices.find(x=>x.jobId===job.id);if(existing){Object.assign(existing,{date:input.date,odometer:input.odometer,recommendation:input.recommendation.trim(),updatedAt:timestamp});return ok(existing);}
 const item:NextService={id:idFactory('next-service'),jobId:job.id,vehicleId:job.vehicleId,date:input.date,odometer:input.odometer,recommendation:input.recommendation.trim(),createdAt:timestamp,updatedAt:timestamp};store.nextServices.push(item);return ok(item);
}
export function nextServiceStatus(item:NextService,lastOdometer:number|null,today=localDate()):NextServiceStatus{
 const dateDue=!!item.date&&validDate(today)&&today>=item.date,odoDue=item.odometer!==null&&lastOdometer!==null&&lastOdometer>=item.odometer,odoUnknown=item.odometer!==null&&lastOdometer===null;
 if(dateDue&&odoDue)return'Due';if(dateDue)return'Due by Date';if(odoDue)return'Due by Odometer';if(odoUnknown)return'Odometer unknown';return'Upcoming';
}
export function nextServiceForVehicle(store:WorkshopStore,vehicleId:string){return serviceHistory(store,vehicleId).map(service=>store.nextServices.find(item=>item.jobId===service.jobId)).find((item):item is NextService=>!!item)??null;}
