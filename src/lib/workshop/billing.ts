import type { PartMovement, WorkshopInvoice, WorkshopInvoiceLine, WorkshopJob, WorkshopPayment, WorkshopPaymentMethod, WorkshopStore } from './model.ts';
import { workflowStatus } from './queue.ts';

export const BILLING_ROUTE = '/tools/workshop/billing/';
export const QUANTITY_SCALE = 1000;
const id = (prefix:string) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,12)}`}`;
const iso = (now:Date) => now.toISOString();
const safeInteger = (value:number) => Number.isSafeInteger(value) && value >= 0;

export function parseQuantityMilli(value:string|number):number|null {
  const n=typeof value==='number'?value:Number(value);
  if(!Number.isFinite(n)||n<=0||n>Number.MAX_SAFE_INTEGER/QUANTITY_SCALE)return null;
  const scaled=Math.round(n*QUANTITY_SCALE);
  return scaled>0&&Number.isSafeInteger(scaled)&&Math.abs(n*QUANTITY_SCALE-scaled)<1e-8?scaled:null;
}
export function formatQuantity(milli:number):string { return (milli/QUANTITY_SCALE).toFixed(3).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1'); }
export function lineAmount(quantityMilli:number,unitSellingPrice:number):number|null {
  if(!Number.isSafeInteger(quantityMilli)||quantityMilli<0||!safeInteger(unitSellingPrice))return null;
  const numerator=BigInt(quantityMilli)*BigInt(unitSellingPrice), amount=(numerator+500n)/1000n;
  return amount<=BigInt(Number.MAX_SAFE_INTEGER)?Number(amount):null;
}
export function calculateInvoice(invoice:WorkshopInvoice):WorkshopInvoice|null {
  if(!Number.isSafeInteger(invoice.discount)||invoice.discount<0||!Number.isSafeInteger(invoice.taxRateBps)||invoice.taxRateBps<0||invoice.taxRateBps>10000)return null;
  let subtotal=0;
  const lines=invoice.lines.map(line=>{
    if(!Number.isSafeInteger(line.quantityMilli)||line.quantityMilli<0||line.unitSellingPrice!==null&&!safeInteger(line.unitSellingPrice))return null;
    const amount=line.included&&!invoice.noCharge&&line.unitSellingPrice!==null?lineAmount(line.quantityMilli,line.unitSellingPrice):0;
    if(amount===null||!Number.isSafeInteger(subtotal+amount))return null;
    subtotal+=amount;
    return {...line,lineTotal:amount};
  });
  if(lines.some(line=>line===null))return null;
  if(invoice.noCharge)return {...invoice,lines:lines as WorkshopInvoiceLine[],subtotal:0,discount:0,taxAmount:0,grandTotal:0,currency:'IDR'};
  if(invoice.discount>subtotal)return null;
  const taxable=subtotal-invoice.discount;
  const taxBig=(BigInt(taxable)*BigInt(invoice.taxRateBps)+5000n)/10000n;
  if(taxBig>BigInt(Number.MAX_SAFE_INTEGER))return null;
  const grand=taxable+Number(taxBig);
  if(!Number.isSafeInteger(grand))return null;
  return {...invoice,lines:lines as WorkshopInvoiceLine[],subtotal,taxAmount:Number(taxBig),grandTotal:grand,currency:'IDR'};
}

export function eligibleForDraft(job:WorkshopJob):boolean {
  const status=workflowStatus(job);
  return status==='Ready for Pickup'||status==='Completed';
}
export function eligibleForIssue(job:WorkshopJob,invoice:WorkshopInvoice):boolean {
  return invoice.status==='Draft'&&(eligibleForDraft(job)||Boolean(invoice.cancelledBillingReason?.trim())&&workflowStatus(job)==='Cancelled');
}
function activeInvoice(store:WorkshopStore,jobId:string):WorkshopInvoice|undefined { return store.invoices.find(i=>i.jobId===jobId&&i.status!=='Void'); }
function actualLines(job:WorkshopJob):WorkshopInvoiceLine[] {
  return (job.workOrder?.actualWork??[]).filter(row=>row.status==='Complete'&&row.name.trim()).map(row=>({lineId:id('line'),sourceType:'LABOR',sourceId:row.id,description:row.name.trim(),quantityMilli:QUANTITY_SCALE,unit:'job',unitSellingPrice:null,priceConfirmed:false,included:true,lineTotal:0}));
}
function partMovementGroups(store:WorkshopStore,jobId:string):Map<string,{quantity:number;ids:string[];name:string;unit:string}> {
  const groups=new Map<string,{quantity:number;ids:string[];name:string;unit:string}>();
  const movements=store.partMovements.filter(m=>m.jobId===jobId&&(m.type==='ISSUE_TO_JOB'||m.type==='RETURN_FROM_JOB')).sort((a,b)=>a.at.localeCompare(b.at));
  for(const movement of movements){
    const group=groups.get(movement.partId)??{quantity:0,ids:[],name:'',unit:''};
    group.quantity+=(movement.type==='ISSUE_TO_JOB'?1:-1)*movement.quantity;group.ids.push(movement.id);
    if(movement.type==='ISSUE_TO_JOB'&&!group.name){const part=store.parts.find(p=>p.id===movement.partId);group.name=movement.partNameSnapshot||part?.name||'Inventory part';group.unit=movement.partUnitSnapshot||part?.unit||'unit';}
    groups.set(movement.partId,group);
  }
  return groups;
}
function inventoryLines(store:WorkshopStore,jobId:string):WorkshopInvoiceLine[] {
  return [...partMovementGroups(store,jobId)].flatMap(([partId,group])=>{
    const q=parseQuantityMilli(Math.max(0,group.quantity));
    return q? [{lineId:id('line'),sourceType:'INVENTORY_PART' as const,sourceId:partId,sourceIds:group.ids,description:group.name,quantityMilli:q,unit:group.unit,unitSellingPrice:null,priceConfirmed:false,included:true,lineTotal:0}]:[];
  });
}
function materialLines(job:WorkshopJob):WorkshopInvoiceLine[] {
  return (job.workOrder?.parts??[]).filter(row=>!row.partId&&row.name.trim()).map(row=>({lineId:id('line'),sourceType:'NON_INVENTORY_MATERIAL',sourceId:row.id,description:row.name.trim(),quantityMilli:parseQuantityMilli(row.quantity)??0,unit:row.unit.trim()||'unit',unitSellingPrice:null,priceConfirmed:false,included:false,lineTotal:0}));
}
function sourceKey(line:WorkshopInvoiceLine):string { return `${line.sourceType}:${line.sourceId??''}`; }
export function createDraft(store:WorkshopStore,job:WorkshopJob,now=new Date(),cancelledReason=''):WorkshopInvoice {
  if(activeInvoice(store,job.id))throw new Error('This job already has an active Invoice. Void it before creating a replacement.');
  const status=workflowStatus(job), cancelled=status==='Cancelled';
  if(cancelled&&!cancelledReason.trim())throw new Error('A clear reason is required for exceptional cancelled-job billing.');
  if(!cancelled&&!eligibleForDraft(job))throw new Error('Create an Invoice Draft only when the job is Ready for Pickup or Completed.');
  const invoice:WorkshopInvoice={invoiceId:id('invoice'),jobId:job.id,status:'Draft',lines:cancelled?[]:[...actualLines(job),...inventoryLines(store,job.id),...materialLines(job)],subtotal:0,discount:0,taxRateBps:0,taxAmount:0,grandTotal:0,currency:'IDR',noCharge:false,...(cancelled?{cancelledBillingReason:cancelledReason.trim()}:{}),createdAt:iso(now),updatedAt:iso(now)};
  store.invoices.push(invoice);return invoice;
}
export function refreshDraft(store:WorkshopStore,job:WorkshopJob,invoice:WorkshopInvoice,now=new Date()):{invoice:WorkshopInvoice;removed:number} {
  if(invoice.status!=='Draft'||invoice.jobId!==job.id)throw new Error('Only this job’s Invoice Draft can be refreshed.');
  if(invoice.cancelledBillingReason){throw new Error('Cancelled-job billing is manual only and cannot be refreshed from operational work.');}
  const suggestions=[...actualLines(job),...inventoryLines(store,job.id),...materialLines(job)];
  const existing=new Map(invoice.lines.filter(x=>x.sourceType!=='MANUAL').map(x=>[sourceKey(x),x]));
  const merged=suggestions.map(suggestion=>{
    const old=existing.get(sourceKey(suggestion));if(!old)return suggestion;
    existing.delete(sourceKey(suggestion));
    const keepPrice=old.unitSellingPrice!==null&&old.priceConfirmed;
    return {...suggestion,lineId:old.lineId,unitSellingPrice:keepPrice?old.unitSellingPrice:null,priceConfirmed:keepPrice,included:suggestion.sourceType==='NON_INVENTORY_MATERIAL'?old.included:true};
  });
  const stale=[...existing.values()].map(line=>({...line,included:false}));
  invoice.lines=[...merged,...stale,...invoice.lines.filter(x=>x.sourceType==='MANUAL')];invoice.updatedAt=iso(now);
  return {invoice:recalculate(invoice),removed:stale.length};
}
export function recalculate(invoice:WorkshopInvoice):WorkshopInvoice {
  const result=calculateInvoice(invoice);if(!result)throw new Error('Invoice calculation is invalid. Check quantity, price, discount, and tax.');
  Object.assign(invoice,result);return invoice;
}
export function addManualLine(invoice:WorkshopInvoice,line:{description:string;quantityMilli:number;unit:string;unitSellingPrice:number;priceConfirmed:boolean},now=new Date()):WorkshopInvoiceLine {
  if(invoice.status!=='Draft'||!line.description.trim()||!line.unit.trim()||!Number.isSafeInteger(line.quantityMilli)||line.quantityMilli<=0||!safeInteger(line.unitSellingPrice))throw new Error('Enter a clear description, valid quantity, unit, and non-negative selling price.');
  const created:WorkshopInvoiceLine={lineId:id('line'),sourceType:'MANUAL',description:line.description.trim(),quantityMilli:line.quantityMilli,unit:line.unit.trim(),unitSellingPrice:line.unitSellingPrice,priceConfirmed:line.priceConfirmed,included:true,lineTotal:0};invoice.lines.push(created);invoice.updatedAt=iso(now);recalculate(invoice);return created;
}
export function updateDraftLine(invoice:WorkshopInvoice,lineId:string,patch:Partial<Pick<WorkshopInvoiceLine,'description'|'quantityMilli'|'unit'|'unitSellingPrice'|'priceConfirmed'|'included'>>,now=new Date()):void {
  if(invoice.status!=='Draft')throw new Error('Issued and Void Invoices cannot be edited.');
  const line=invoice.lines.find(x=>x.lineId===lineId);if(!line)throw new Error('Invoice line not found.');
  if(patch.quantityMilli!==undefined&&(!Number.isSafeInteger(patch.quantityMilli)||patch.quantityMilli<0)||patch.unitSellingPrice!==undefined&&patch.unitSellingPrice!==null&&!safeInteger(patch.unitSellingPrice))throw new Error('Enter a valid non-negative quantity and price.');
  if(patch.description!==undefined)line.description=patch.description;if(patch.quantityMilli!==undefined)line.quantityMilli=patch.quantityMilli;if(patch.unit!==undefined)line.unit=patch.unit;if(patch.unitSellingPrice!==undefined)line.unitSellingPrice=patch.unitSellingPrice;if(patch.priceConfirmed!==undefined)line.priceConfirmed=patch.priceConfirmed;if(patch.included!==undefined)line.included=patch.included;
  invoice.updatedAt=iso(now);recalculate(invoice);
}
export function issueInvoice(store:WorkshopStore,job:WorkshopJob,invoice:WorkshopInvoice,now=new Date()):WorkshopInvoice {
  if(!store.invoices.some(candidate=>candidate.invoiceId===invoice.invoiceId))throw new Error('Save this Draft in the local Billing store before issuing it.');
  if(!eligibleForIssue(job,invoice))throw new Error('This Invoice or Workshop Job is not eligible for issue.');
  if(draftNeedsRefresh(store,job,invoice))throw new Error('Operational data changed. Refresh / reconcile this Draft before issuing it.');
  const draft=recalculate(invoice),selected=draft.lines.filter(line=>line.included);
  if(!selected.length&&!draft.noCharge)throw new Error('Add a reviewed billable line or explicitly confirm No Charge.');
  if(selected.some(line=>!line.description.trim()||line.quantityMilli<=0))throw new Error('Every included line needs a description and a valid quantity.');
  if(!draft.noCharge&&selected.some(line=>line.unitSellingPrice===null||!line.priceConfirmed))throw new Error('Every billable line needs an explicitly confirmed selling price.');
  if(draft.noCharge&&selected.some(line=>line.unitSellingPrice!==null&&line.unitSellingPrice!==0))throw new Error('No Charge cannot override a line with a non-zero selling price. Clear or exclude that price first.');
  if(draft.discount>draft.subtotal)throw new Error('Discount cannot exceed the invoice subtotal.');
  const at=iso(now);draft.invoiceNumber=nextDocumentNumber(store.invoices.map(i=>i.invoiceNumber).filter((x):x is string=>Boolean(x)),'INV',now);draft.status='Issued';draft.customerSnapshot=structuredClone(store.customers.find(x=>x.id===job.customerId)??{name:'',phone:'',address:''});const vehicle=store.vehicles.find(x=>x.id===job.vehicleId);draft.vehicleSnapshot=vehicle?{type:vehicle.type,plate:vehicle.plate,make:vehicle.make,model:vehicle.model,year:vehicle.year}:{type:'Motorcycle',plate:'',make:'',model:'',year:null};draft.jobNumberSnapshot=job.number;draft.issuedAt=at;draft.updatedAt=at;
  return draft;
}
export function draftNeedsRefresh(store:WorkshopStore,job:WorkshopJob,invoice:WorkshopInvoice):boolean {
  if(invoice.status!=='Draft'||invoice.cancelledBillingReason)return false;
  const current=[...actualLines(job),...inventoryLines(store,job.id),...materialLines(job)],draft=invoice.lines.filter(line=>line.sourceType!=='MANUAL');
  if(current.length!==draft.length)return true;
  return current.some(source=>{const line=draft.find(x=>sourceKey(x)===sourceKey(source));return !line||line.quantityMilli!==source.quantityMilli||line.description!==source.description||line.unit!==source.unit||(source.sourceType==='INVENTORY_PART'&&JSON.stringify(line.sourceIds??[])!==JSON.stringify(source.sourceIds??[]));});
}
function nextDocumentNumber(used:string[],prefix:string,now:Date):string {
  const day=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;const usedSet=new Set(used);for(let n=1;n<=999999;n++){const candidate=`${prefix}-${day}-${String(n).padStart(4,'0')}`;if(!usedSet.has(candidate))return candidate;}throw new Error(`No ${prefix} number is available for this date.`);
}
export function voidInvoice(invoice:WorkshopInvoice,store:WorkshopStore,reason:string,now=new Date()):void {
  if(invoice.status!=='Issued'||!store.invoices.some(candidate=>candidate.invoiceId===invoice.invoiceId))throw new Error('Only a saved Issued Invoice can be voided.');if(!reason.trim())throw new Error('A reason is required to void an Invoice.');
  if(netPaid(store,invoice.invoiceId)!==0)throw new Error('Reverse all active Payments before voiding this Invoice.');
  const at=iso(now);invoice.status='Void';invoice.voidAt=at;invoice.voidReason=reason.trim();invoice.updatedAt=at;
}
export function createReplacementDraft(store:WorkshopStore,job:WorkshopJob,voided:WorkshopInvoice,now=new Date()):WorkshopInvoice {
  if(voided.status!=='Void'||voided.jobId!==job.id)throw new Error('Choose a Void Invoice for this job.');
  const replacement=createDraft(store,job,now,voided.cancelledBillingReason??'');replacement.replacesInvoiceId=voided.invoiceId;voided.replacedByInvoiceId=replacement.invoiceId;return replacement;
}
function normalPayments(store:WorkshopStore,invoiceId:string):WorkshopPayment[] { return store.payments.filter(p=>p.invoiceId===invoiceId&&p.kind==='Payment'); }
export function isPaymentReversed(store:WorkshopStore,payment:WorkshopPayment):boolean { return store.payments.some(p=>p.kind==='Reversal'&&p.reversalOfPaymentId===payment.paymentId); }
export function netPaid(store:WorkshopStore,invoiceId:string):number {
  let total=0;for(const payment of normalPayments(store,invoiceId))if(!isPaymentReversed(store,payment))total+=payment.amount;
  return total;
}
export function outstanding(store:WorkshopStore,invoice:WorkshopInvoice):number { return invoice.status==='Void'?0:Math.max(0,invoice.grandTotal-netPaid(store,invoice.invoiceId)); }
export function paymentStatus(store:WorkshopStore,invoice:WorkshopInvoice):'Unpaid'|'Partially Paid'|'Paid'|'No Payment Due' {
  if(invoice.grandTotal===0)return 'No Payment Due';const paid=netPaid(store,invoice.invoiceId);return paid===0?'Unpaid':paid<invoice.grandTotal?'Partially Paid':'Paid';
}
export function recordPayment(store:WorkshopStore,invoice:WorkshopInvoice,input:{amount:number;method:WorkshopPaymentMethod;reference?:string;note?:string;paidAt?:string},now=new Date()):WorkshopPayment {
  if(invoice.status!=='Issued'||!store.invoices.some(candidate=>candidate.invoiceId===invoice.invoiceId))throw new Error('Payments can only be recorded for a saved Issued Invoice.');
  if(!safeInteger(input.amount)||input.amount<=0)throw new Error('Payment must be a positive whole rupiah amount.');if(input.amount>outstanding(store,invoice))throw new Error('Payment cannot exceed the outstanding balance.');
  const paidAt=input.paidAt||iso(now);if(!Number.isFinite(Date.parse(paidAt)))throw new Error('Enter a valid payment date.');
  const payment:WorkshopPayment={paymentId:id('payment'),invoiceId:invoice.invoiceId,kind:'Payment',amount:input.amount,method:input.method,reference:input.reference?.trim()||undefined,note:input.note?.trim()||undefined,paidAt,createdAt:iso(now),receiptNumber:nextDocumentNumber(store.payments.map(p=>p.receiptNumber).filter((x):x is string=>Boolean(x)),'RCP',now)};store.payments.push(payment);return payment;
}
export function reversePayment(store:WorkshopStore,payment:WorkshopPayment,reason:string,now=new Date()):WorkshopPayment {
  const invoice=store.invoices.find(i=>i.invoiceId===payment.invoiceId);if(payment.kind!=='Payment'||!invoice||invoice.status!=='Issued')throw new Error('Choose an active Payment on an Issued Invoice.');if(!reason.trim())throw new Error('A reason is required to reverse a Payment.');if(isPaymentReversed(store,payment))throw new Error('This Payment has already been reversed.');
  const reversal:WorkshopPayment={paymentId:id('payment'),invoiceId:payment.invoiceId,kind:'Reversal',amount:payment.amount,paidAt:iso(now),createdAt:iso(now),reversalOfPaymentId:payment.paymentId,reversalReason:reason.trim()};store.payments.push(reversal);return reversal;
}
export function billingSummary(store:WorkshopStore,invoice:WorkshopInvoice):{status:string;paid:number;outstanding:number} { return {status:paymentStatus(store,invoice),paid:netPaid(store,invoice.invoiceId),outstanding:outstanding(store,invoice)}; }
export function actualConsumption(store:WorkshopStore,jobId:string,partId:string):{quantity:number;movements:PartMovement[]} {
  const movements=store.partMovements.filter(m=>m.jobId===jobId&&m.partId===partId&&(m.type==='ISSUE_TO_JOB'||m.type==='RETURN_FROM_JOB')).sort((a,b)=>a.at.localeCompare(b.at));
  const quantity=movements.reduce((n,m)=>n+(m.type==='ISSUE_TO_JOB'?m.quantity:-m.quantity),0);return {quantity:Math.max(0,quantity),movements};
}
export function invoiceDiscrepancies(store:WorkshopStore,job:WorkshopJob,invoice:WorkshopInvoice):string[] {
  if(invoice.status!=='Issued')return [];
  const messages:string[]=[];
  const billedParts=new Map<string,number>();for(const line of invoice.lines)if(line.included&&line.sourceType==='INVENTORY_PART'&&line.sourceId)billedParts.set(line.sourceId,(billedParts.get(line.sourceId)??0)+line.quantityMilli);
  const partIds=new Set([...billedParts.keys(),...partMovementGroups(store,job.id).keys()]);
  for(const partId of partIds){const current=parseQuantityMilli(actualConsumption(store,job.id,partId).quantity)??0,previous=billedParts.get(partId)??0;if(current!==previous)messages.push(`Part ${store.parts.find(p=>p.id===partId)?.name??partId}: invoice ${formatQuantity(previous)} vs operational ${formatQuantity(current)}.`);}
  const currentWork=new Map((job.workOrder?.actualWork??[]).filter(x=>x.status==='Complete'&&x.name.trim()).map(x=>[x.id,x.name.trim()]));
  for(const line of invoice.lines)if(line.included&&line.sourceType==='LABOR'&&line.sourceId&&currentWork.get(line.sourceId)!==line.description)messages.push(`Actual work changed after issue: ${line.description}.`);
  for(const work of currentWork)if(!invoice.lines.some(line=>line.included&&line.sourceType==='LABOR'&&line.sourceId===work[0]))messages.push(`New actual work after issue: ${work[1]}.`);
  return messages;
}
export function allPaymentsForInvoice(store:WorkshopStore,invoiceId:string):WorkshopPayment[] { return store.payments.filter(p=>p.invoiceId===invoiceId).sort((a,b)=>a.paidAt.localeCompare(b.paidAt)); }
export function paymentBalanceAfter(store:WorkshopStore,payment:WorkshopPayment):number {
  const invoice=store.invoices.find(x=>x.invoiceId===payment.invoiceId);if(!invoice)return 0;
  const events=store.payments.filter(p=>p.invoiceId===payment.invoiceId).sort((a,b)=>a.paidAt.localeCompare(b.paidAt)||a.createdAt.localeCompare(b.createdAt));let paid=0;
  for(const event of events){paid+=event.kind==='Payment'?event.amount:-event.amount;if(event.paymentId===payment.paymentId)break;}
  return Math.max(0,invoice.grandTotal-paid);
}
