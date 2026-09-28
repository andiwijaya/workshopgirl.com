import test from 'node:test';
import assert from 'node:assert/strict';
import { actualConsumption, addManualLine, calculateInvoice, createDraft, createReplacementDraft, draftNeedsRefresh, formatQuantity, issueInvoice, invoiceDiscrepancies, lineAmount, netPaid, outstanding, parseQuantityMilli, paymentStatus, QUANTITY_SCALE, recordPayment, refreshDraft, reversePayment, voidInvoice } from '../src/lib/workshop/billing.ts';
import { createJob, emptyStore, loadStore, saveStore } from '../src/lib/workshop/store.ts';
import { issueToJob, returnFromJob } from '../src/lib/workshop/parts.ts';
import { workflowStatus } from '../src/lib/workshop/queue.ts';
import type { WorkshopInvoice, WorkshopPart } from '../src/lib/workshop/model.ts';

const now=new Date('2026-09-28T10:00:00.000Z'),date='2026-09-28';
const intake={number:'WI-BILL-1',complaint:'Noise',accessories:[],conditionNotes:'',date,arrivalTime:'10:00'};
function readyFixture(){
  const store=emptyStore(),job=createJob(store,{customer:{name:'Billing Customer',phone:'123',address:'Street'},vehicle:{type:'Motorcycle',plate:'BILL-1',make:'Maker',model:'Model',year:2022,color:'Blue',odometer:1000},intake},p=>`${p}_billing`,now);
  job.inspection={findings:'',checklist:[],recommendedJobs:[],parts:[],labor:[],consumables:0,additionalCost:0,discount:0,taxRate:0};
  job.workOrder={number:'WO-1',date,status:'Complete',mechanic:'Tech',approvedWork:[],actualWork:[{id:'actual-1',name:'Replace brake pads',detail:'Front',status:'Complete',mechanic:'Tech'}],parts:[],changes:[],startTime:'09:00',endTime:'10:00',mechanicNotes:'',result:'Complete',recommendations:'',signoff:'Tech'};
  job.qc={number:'QC-1',date,inspector:'Inspector',mechanic:'Tech',finalStatus:'Ready for handover',checks:[{name:'Brakes',result:'Pass',note:''}],unresolvedIssues:[],returnedItems:[],roadTest:'Not required',roadTester:'',odometerBefore:1000,odometerAfter:1000,roadTestNotes:'',readinessNotes:'',recommendations:'',customerNotes:'',handoverRecipient:'',handoverStaff:'',handoverDate:'',handoverTime:''};job.status='qc';
  return {store,job};
}
function addPart(store:ReturnType<typeof emptyStore>){const part:WorkshopPart={id:'part-1',sku:'BP-1',name:'Brake pad set',category:'',brand:'',unit:'set',location:'',supplier:'',minimumStock:0,compatibility:'',active:true,createdAt:now.toISOString(),updatedAt:now.toISOString()};store.parts.push(part);store.partMovements.push({id:'opening-1',partId:part.id,type:'OPENING',quantity:10,at:now.toISOString(),partNameSnapshot:'Old brake pads',partSkuSnapshot:part.sku,partUnitSnapshot:'set'});return part;}
function issueDraft(store:ReturnType<typeof emptyStore>,job:ReturnType<typeof readyFixture>['job'],invoice:ReturnType<typeof createDraft>){for(const line of invoice.lines){line.unitSellingPrice=line.sourceType==='INVENTORY_PART'?500000:750000;line.priceConfirmed=true;}return issueInvoice(store,job,invoice,now);}
function memory(raw:string|null=null){let value=raw;return{getItem:()=>value,setItem:(_key:string,next:string)=>{value=next;},get value(){return value;}};}

test('integer rupiah and scaled quantity math are deterministic with half-up rounding',()=>{
  assert.equal(QUANTITY_SCALE,1000);assert.equal(parseQuantityMilli('0.5'),500);assert.equal(parseQuantityMilli('4.250'),4250);assert.equal(parseQuantityMilli('0.0004'),null);assert.equal(formatQuantity(1250),'1.25');assert.equal(lineAmount(500,101),51);assert.equal(lineAmount(4250,1001),4254);assert.equal(lineAmount(500,-1),null);
  const invoice={invoiceId:'i',jobId:'j',status:'Draft' as const,lines:[{lineId:'l',sourceType:'MANUAL' as const,description:'x',quantityMilli:1500,unit:'job',unitSellingPrice:1001,priceConfirmed:true,included:true,lineTotal:0}],subtotal:0,discount:100,taxRateBps:1100,taxAmount:0,grandTotal:0,currency:'IDR' as const,noCharge:false,createdAt:'',updatedAt:''};
  assert.deepEqual(calculateInvoice(invoice),{...invoice,subtotal:1502,lines:[{...invoice.lines[0],lineTotal:1502}],taxAmount:154,grandTotal:1556});
  assert.equal(calculateInvoice({...invoice,discount:1503}),null);assert.equal(calculateInvoice({...invoice,taxRateBps:10001}),null);assert.equal(calculateInvoice({...invoice,lines:[{...invoice.lines[0],quantityMilli:-1}]}),null);assert.equal(calculateInvoice({...invoice,noCharge:true})?.grandTotal,0);
});

test('Draft eligibility uses derived Ready/Completed status and allows exceptional cancellation only with reason',()=>{
  const {store,job}=readyFixture();assert.equal(workflowStatus(job),'Ready for Pickup');assert.equal(createDraft(store,job,now).status,'Draft');
  const later=readyFixture();later.job.status='completed';later.job.qc!.handoverRecipient='Customer';later.job.qc!.handoverStaff='Advisor';later.job.qc!.handoverDate=date;later.job.qc!.handoverTime='12:00';assert.equal(workflowStatus(later.job),'Completed');assert.equal(createDraft(later.store,later.job,now).status,'Draft');
  const cancelled=readyFixture();cancelled.job.workOrder!.status='Cancelled';assert.throws(()=>createDraft(cancelled.store,cancelled.job,now),/reason/);const draft=createDraft(cancelled.store,cancelled.job,now,'Approved cancellation diagnostic fee');assert.equal(draft.lines.length,0);assert.equal(draft.cancelledBillingReason,'Approved cancellation diagnostic fee');
});

test('one active Invoice per job, stable issue numbering, frozen identity and Void replacement traceability',()=>{
  const {store,job}=readyFixture(),part=addPart(store);issueToJob(store,part.id,job.id,2);const first=createDraft(store,job,now);assert.throws(()=>createDraft(store,job,now),/already has an active/);const issued=issueDraft(store,job,first);const number=issued.invoiceNumber,identity=structuredClone({customer:issued.customerSnapshot,vehicle:issued.vehicleSnapshot,job:issued.jobNumberSnapshot,lines:issued.lines,subtotal:issued.subtotal,discount:issued.discount,taxRateBps:issued.taxRateBps,taxAmount:issued.taxAmount,total:issued.grandTotal});assert.match(number??'',/^INV-20260928-\d{4}$/);assert.equal(issued.customerSnapshot?.name,'Billing Customer');assert.equal(issued.vehicleSnapshot?.plate,'BILL-1');
  store.customers[0]!.name='Renamed';store.vehicles[0]!.plate='CHANGED';store.parts[0]!.name='Changed part master';job.workOrder!.actualWork[0]!.name='Changed work';job.inspection!.recommendedJobs.push({id:'new-estimate',name:'New estimate',detail:'',priority:'Recommended',approved:true});returnFromJob(store,part.id,job.id,1);assert.deepEqual({customer:issued.customerSnapshot,vehicle:issued.vehicleSnapshot,job:issued.jobNumberSnapshot,lines:issued.lines,subtotal:issued.subtotal,discount:issued.discount,taxRateBps:issued.taxRateBps,taxAmount:issued.taxAmount,total:issued.grandTotal},identity);assert.equal(issued.lines.find(line=>line.sourceType==='INVENTORY_PART')?.description,'Brake pad set');assert.equal(issued.lines.find(line=>line.sourceType==='INVENTORY_PART')?.quantityMilli,2000);assert.equal(issued.invoiceNumber,number);
  const payment=recordPayment(store,issued,{amount:1,method:'Cash'},now);assert.throws(()=>voidInvoice(issued,store,'wrong path',now),/Reverse/);reversePayment(store,payment,'Mistaken entry',now);voidInvoice(issued,store,'Duplicate draft issued',now);const replacement=createReplacementDraft(store,job,issued,now);assert.equal(replacement.replacesInvoiceId,issued.invoiceId);assert.equal(issued.replacedByInvoiceId,replacement.invoiceId);assert.equal(replacement.status,'Draft');
});

test('actual Labor suggestions exclude estimate-only work and require confirmed selling prices',()=>{
  const {store,job}=readyFixture();job.inspection!.recommendedJobs=[{id:'recommendation',name:'Estimate only repair',detail:'',priority:'Recommended',approved:true}];const draft=createDraft(store,job,now);assert.deepEqual(draft.lines.map(x=>x.description),['Replace brake pads']);assert.equal(draft.lines[0]?.unitSellingPrice,null);assert.equal(draft.lines[0]?.priceConfirmed,false);assert.throws(()=>issueInvoice(store,job,draft,now),/selling price/);draft.lines[0]!.unitSellingPrice=0;assert.throws(()=>issueInvoice(store,job,draft,now),/confirmed selling price/);draft.lines[0]!.priceConfirmed=true;assert.equal(issueInvoice(store,job,draft,now).status,'Issued');
});

test('actual Inventory Parts use issue minus return, snapshots, and never unit cost or unrelated movements',()=>{
  const {store,job}=readyFixture(),part=addPart(store);store.partMovements.push({id:'stock',partId:part.id,type:'STOCK_IN',quantity:6,at:now.toISOString(),unitCost:100});store.partMovements.push({id:'other-job',partId:part.id,type:'ISSUE_TO_JOB',quantity:4,at:now.toISOString(),jobId:'other'});assert.equal(issueToJob(store,part.id,job.id,3).ok,true);assert.equal(returnFromJob(store,part.id,job.id,1).ok,true);assert.equal(actualConsumption(store,job.id,part.id).quantity,2);
  const draft=createDraft(store,job,now),line=draft.lines.find(x=>x.sourceType==='INVENTORY_PART')!;assert.equal(line.quantityMilli,2000);assert.equal(line.description,'Brake pad set');assert.equal(line.unitSellingPrice,null);assert.equal(lineAmount(line.quantityMilli,500),1000);assert.equal(draft.lines.some(x=>x.sourceType==='INVENTORY_PART'&&x.unitSellingPrice===100),false);
  store.parts[0]!.name='New master name';const issued=issueDraft(store,job,draft);assert.equal(issued.lines.find(x=>x.sourceType==='INVENTORY_PART')?.description,'Brake pad set');
});

test('Draft refresh updates actual quantities while preserving confirmed prices, manual lines, and stale source history',()=>{
  const {store,job}=readyFixture(),part=addPart(store);issueToJob(store,part.id,job.id,2);const draft=createDraft(store,job,now),labor=draft.lines.find(x=>x.sourceType==='LABOR')!;labor.unitSellingPrice=800000;labor.priceConfirmed=true;const manual=addManualLine(draft,{description:'Approved diagnostic fee',quantityMilli:1000,unit:'job',unitSellingPrice:250000,priceConfirmed:true});assert.equal(returnFromJob(store,part.id,job.id,1).ok,true);assert.equal(draftNeedsRefresh(store,job,draft),true);const result=refreshDraft(store,job,draft,now);assert.equal(result.removed,0);assert.equal(draft.lines.find(x=>x.sourceType==='INVENTORY_PART')?.quantityMilli,1000);assert.equal(draft.lines.find(x=>x.sourceType==='LABOR')?.unitSellingPrice,800000);assert.ok(draft.lines.some(x=>x.lineId===manual.lineId));
  job.workOrder!.actualWork=[];assert.equal(refreshDraft(store,job,draft,now).removed,1);assert.equal(draft.lines.some(x=>x.sourceId==='actual-1'&&!x.included),true);
});

test('non-inventory materials are candidates only and require quantity and price confirmation',()=>{
  const {store,job}=readyFixture();job.workOrder!.parts=[{id:'wo-material',name:'Cleaner',partNumber:'',quantity:.5,unit:'bottle',notes:''}];const draft=createDraft(store,job,now),material=draft.lines.find(x=>x.sourceType==='NON_INVENTORY_MATERIAL')!;assert.equal(material.included,false);material.included=true;material.unitSellingPrice=15000;material.priceConfirmed=true;draft.lines.find(x=>x.sourceType==='LABOR')!.unitSellingPrice=0;draft.lines.find(x=>x.sourceType==='LABOR')!.priceConfirmed=true;assert.equal(issueInvoice(store,job,draft,now).lines.find(x=>x.lineId===material.lineId)?.quantityMilli,500);
});

test('Payments support partial settlement, block overpayment, immutable reversal, and protect Void',()=>{
  const {store,job}=readyFixture(),draft=createDraft(store,job,now);draft.lines[0]!.unitSellingPrice=5000000;draft.lines[0]!.priceConfirmed=true;const invoice=issueInvoice(store,job,draft,now);
  const p1=recordPayment(store,invoice,{amount:2000000,method:'Cash'},now);assert.equal(paymentStatus(store,invoice),'Partially Paid');assert.equal(outstanding(store,invoice),3000000);assert.throws(()=>recordPayment(store,invoice,{amount:3000001,method:'Cash'},now),/exceed/);const p2=recordPayment(store,invoice,{amount:3000000,method:'Bank Transfer'},now);assert.equal(paymentStatus(store,invoice),'Paid');assert.equal(netPaid(store,invoice.invoiceId),5000000);assert.throws(()=>voidInvoice(invoice,store,'Cancel',now),/Reverse/i);
  const reversal=reversePayment(store,p2,'Duplicate transfer entry',now);assert.equal(reversal.reversalOfPaymentId,p2.paymentId);assert.equal(netPaid(store,invoice.invoiceId),2000000);assert.equal(outstanding(store,invoice),3000000);assert.equal(store.payments.includes(p2),true);assert.throws(()=>reversePayment(store,p2,'Again',now),/already been reversed/);reversePayment(store,p1,'Entry error',now);voidInvoice(invoice,store,'Invoice correction',now);assert.equal(invoice.status,'Void');assert.throws(()=>recordPayment(store,invoice,{amount:1,method:'Cash'},now),/Issued Invoice/);
});

test('Zero-charge invoices issue only after explicit no-charge intent and create no payment due',()=>{
  const {store,job}=readyFixture(),draft=createDraft(store,job,now);assert.throws(()=>issueInvoice(store,job,draft,now),/selling price/);draft.noCharge=true;const invoice=issueInvoice(store,job,draft,now);assert.equal(invoice.grandTotal,0);assert.equal(paymentStatus(store,invoice),'No Payment Due');assert.throws(()=>recordPayment(store,invoice,{amount:1,method:'Cash'},now),/exceed/);
});

test('late return before Issue requires reconcile; late return after Issue is a visible discrepancy without mutation',()=>{
  const {store,job}=readyFixture(),part=addPart(store);issueToJob(store,part.id,job.id,2);const draft=createDraft(store,job,now);assert.equal(returnFromJob(store,part.id,job.id,1).ok,true);assert.equal(draftNeedsRefresh(store,job,draft),true);assert.throws(()=>issueDraft(store,job,draft),/Refresh/);refreshDraft(store,job,draft,now);assert.equal(draft.lines.find(x=>x.sourceType==='INVENTORY_PART')?.quantityMilli,1000);const issued=issueDraft(store,job,draft),billed=issued.lines.find(x=>x.sourceType==='INVENTORY_PART')!.quantityMilli;assert.equal(returnFromJob(store,part.id,job.id,1).ok,true);assert.equal(issued.lines.find(x=>x.sourceType==='INVENTORY_PART')?.quantityMilli,billed);assert.match(invoiceDiscrepancies(store,job,issued).join(' '),/invoice 1 vs operational 0/);
});

test('store loads old production data without Billing arrays and persists new collections additively',()=>{
  const old=emptyStore();delete (old as Partial<typeof old>).invoices;delete (old as Partial<typeof old>).payments;const legacy={...old};const disk=memory(JSON.stringify(legacy));const loaded=loadStore(disk);assert.equal(loaded.recovered,false);assert.deepEqual(loaded.store.invoices,[]);assert.deepEqual(loaded.store.payments,[]);(loaded.store.invoices as WorkshopInvoice[]).push({invoiceId:'i',jobId:'j',status:'Draft',lines:[],subtotal:0,discount:0,taxRateBps:0,taxAmount:0,grandTotal:0,currency:'IDR',noCharge:false,createdAt:'',updatedAt:''});assert.equal(saveStore(loaded.store,disk).ok,true);const reloaded=loadStore(disk);assert.equal(reloaded.store.invoices.length,1);
});

test('invoice and receipt document numbers collision-check and are not random three-digit identifiers',()=>{
  const {store,job}=readyFixture(),draft=createDraft(store,job,now);store.invoices.push({...draft,invoiceId:'void-old',status:'Void',invoiceNumber:'INV-20260928-0001'});const invoice=issueDraft(store,job,draft);assert.equal(invoice.invoiceNumber,'INV-20260928-0002');const payment=recordPayment(store,invoice,{amount:1,method:'Cash'},now);assert.match(payment.receiptNumber??'',/^RCP-20260928-0001$/);
});
