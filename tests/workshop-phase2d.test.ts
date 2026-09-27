import test from 'node:test';
import assert from 'node:assert/strict';
import { createJob, emptyStore, setWaitingParts, updateJob } from '../src/lib/workshop/store.ts';
import { canCompleteWorkshopJob, estimateApprovalPending, operationalStatus, workflowStatus } from '../src/lib/workshop/queue.ts';
import { completedService } from '../src/lib/workshop/history.ts';
import { issueToJob, returnFromJob } from '../src/lib/workshop/parts.ts';

const date='2026-09-27', now=new Date(`${date}T12:00:00Z`);
const base={customer:{name:'Customer A',phone:'111',address:''},vehicle:{type:'Motorcycle' as const,plate:'WG-2D',make:'Honda',model:'CB',year:2022,color:'',odometer:1000},intake:{number:'WI-2D',complaint:'Noise',accessories:[],conditionNotes:'',date,arrivalTime:'10:00'}};
const inspection=()=>({findings:'',checklist:[{category:'Safety',items:[{name:'Brakes',status:'Good' as const,note:''}]}],recommendedJobs:[],parts:[],labor:[],consumables:0,additionalCost:0,discount:0,taxRate:0});
const workOrder=(status:'Complete'|'Cancelled'='Complete')=>({number:'WO-2D',date,status,mechanic:'Primary Tech',approvedWork:[],actualWork:[{id:'actual-1',name:'Repair brakes',detail:'Front',status:'Complete' as const,mechanic:'Tech A'}],parts:[],changes:[],startTime:'10:00',endTime:'11:00',mechanicNotes:'',result:'Fixed',recommendations:'',signoff:'Tech A'});
const qc=(overrides:Record<string,unknown>={})=>({number:'QC-2D',date,inspector:'Inspector',mechanic:'Primary Tech',finalStatus:'Ready for handover' as const,checks:[{name:'Brake check',result:'Pass' as const,note:''}],unresolvedIssues:[],returnedItems:[],roadTest:'Not required' as const,roadTester:'',odometerBefore:1000,odometerAfter:1000,roadTestNotes:'',readinessNotes:'',recommendations:'',customerNotes:'',handoverRecipient:'Customer A',handoverStaff:'Advisor',handoverDate:date,handoverTime:'12:00',...overrides});
function jobFixture(){const store=emptyStore(),job=createJob(store,base,p=>`${p}_stable`,now);job.inspection=inspection();return {store,job};}
function operationalJob(){const ctx=jobFixture();ctx.job.workOrder=workOrder();ctx.job.qc=qc();ctx.job.status='qc';return ctx;}

test('completion gate rejects missing or cancelled Work Orders and does not accept unfinished work rows',()=>{
 const {store,job}=jobFixture();job.qc=qc();job.status='qc';assert.equal(updateJob(store,job.id,{status:'completed'},now),null);
 job.workOrder=workOrder('Cancelled');assert.equal(canCompleteWorkshopJob(job),false);assert.equal(updateJob(store,job.id,{status:'completed'},now),null);
 job.workOrder={...workOrder(),actualWork:[{id:'unfinished',name:'Repair brakes',detail:'',status:'In progress',mechanic:'Tech'}]};assert.equal(canCompleteWorkshopJob(job),false);
 assert.equal(updateJob(store,job.id,{workOrder:job.workOrder},now),null);
});

test('Ready for Pickup is distinct from Completed; completion needs handover evidence and a resolved road test',()=>{
 const {store,job}=operationalJob();assert.equal(operationalStatus(job),'Ready for Pickup');job.qc=qc({handoverRecipient:'',handoverStaff:'',handoverDate:'',handoverTime:''});assert.equal(updateJob(store,job.id,{status:'completed'},now),null);
 job.qc=qc({handoverRecipient:'',handoverStaff:'',handoverDate:'',handoverTime:'',roadTest:'Completed'});assert.equal(canCompleteWorkshopJob(job),false);
 job.qc=qc({roadTest:'Not completed'});assert.equal(canCompleteWorkshopJob(job),false);
 job.qc=qc({roadTest:'Completed'});assert.equal(canCompleteWorkshopJob(job),true);assert.ok(updateJob(store,job.id,{status:'completed'},now));assert.ok(completedService(job,store));
});

test('inspection-only completion is explicit and never invents performed work',()=>{
 const {store,job}=operationalJob();job.workOrder={...workOrder(),actualWork:[],noRepairAcknowledged:true,noRepairReason:'Inspection found no repair needed'};
 assert.equal(canCompleteWorkshopJob(job),true);assert.ok(updateJob(store,job.id,{status:'completed'},now));assert.deepEqual(completedService(job,store)?.actualWork,[]);
 job.workOrder={...job.workOrder,noRepairReason:''};assert.equal(canCompleteWorkshopJob(job),false);
});

test('QC failure and blocking follow-up stop completion; documented Customer Deferred stays in history',()=>{
 const {store,job}=operationalJob();job.qc=qc({checks:[{name:'Brake check',result:'Needs attention',note:''}]});assert.equal(canCompleteWorkshopJob(job),false);
 job.qc=qc({unresolvedIssues:[{id:'block',issue:'Fluid leak',status:'Needs follow-up',recommendation:'Repair'}]});assert.equal(canCompleteWorkshopJob(job),false);
 job.qc=qc({unresolvedIssues:[{id:'defer',issue:'Replace tire soon',status:'Customer deferred',recommendation:'Customer declined today',deferralReason:'Customer declined today'}]});assert.equal(canCompleteWorkshopJob(job),true);
 job.status='completed';assert.equal(completedService(job,store)?.deferredIssues[0]?.reason,'Customer declined today');
});

test('estimate approval is revision-bound and stale approval cannot create a Work Order',()=>{
 const {store,job}=jobFixture();const rec={id:'rec-stable',name:'Replace pads',detail:'Front',priority:'Urgent' as const,approved:false};job.inspection!.recommendedJobs=[rec];job.inspection!.revision=1;
 assert.equal(workflowStatus(job),'Waiting Approval');assert.equal(estimateApprovalPending(job),true);
 const approved={...job.inspection!,recommendedJobs:[{...rec,approved:true,approvedAt:now.toISOString(),approvedBy:'Customer A'}],approvedAt:now.toISOString(),approvedBy:'Customer A',approvedRevision:1};
 assert.ok(updateJob(store,job.id,{inspection:approved},now));assert.equal(estimateApprovalPending(job),false);
 assert.ok(updateJob(store,job.id,{workOrder:{...workOrder(),approvedWork:[{id:'approved-work',name:rec.name,detail:rec.detail,status:'Not started',mechanic:'',sourceRecommendationId:rec.id}],status:'Not started'}},now));
 assert.equal(job.workOrder?.approvedWork[0]?.sourceRecommendationId,'rec-stable');
 const changed=structuredClone(job.inspection!);changed.parts=[{id:'estimate-part',name:'Brake pads',partNumber:'BP',quantity:1,unit:'set',unitPrice:200}];
 assert.ok(updateJob(store,job.id,{inspection:changed},now));assert.equal(job.inspection?.revision,2);assert.equal(estimateApprovalPending(job),true);assert.equal(job.inspection?.recommendedJobs[0]?.approved,false);
 assert.equal(updateJob(store,job.id,{workOrder:workOrder()},now),null);
});

test('estimate with no named recommendations does not wait for approval',()=>{const {job}=jobFixture();job.inspection=inspection();job.inspection.checklist[0]!.items[0]!.status='Good';assert.equal(estimateApprovalPending(job),false);assert.equal(workflowStatus(job),'Inspection');});

test('repeat visits explicitly reuse both stable Customer and Vehicle identities without matching names',()=>{
 const store=emptyStore(),first=createJob(store,base,p=>`${p}_first`,now);
 const second=createJob(store,{...base,intake:{...base.intake,number:'WI-2'},existingVehicleId:first.vehicleId,existingCustomerId:first.customerId},p=>`${p}_second`,new Date(now.getTime()+1000));
 assert.equal(second.vehicleId,first.vehicleId);assert.equal(second.customerId,first.customerId);assert.equal(store.customers.length,1);
 const family=createJob(store,{...base,intake:{...base.intake,number:'WI-3'},existingVehicleId:first.vehicleId},p=>`${p}_family`,new Date(now.getTime()+2000));
 assert.equal(family.vehicleId,first.vehicleId);assert.notEqual(family.customerId,first.customerId);assert.equal(store.customers.length,2);
});

test('work history lists distinct actual technicians and keeps QC inspector separate',()=>{
 const {store,job}=operationalJob();job.workOrder!.actualWork.push({id:'a2',name:'Wheel alignment',detail:'',status:'Complete',mechanic:'Tech B'});job.status='completed';
 const projection=completedService(job,store)!;assert.deepEqual(projection.technicians,['Tech A','Tech B']);assert.equal(projection.qcInspector,'Inspector');
});

test('part identity snapshots survive master rename while late return adjusts consumed quantity',()=>{
 const {store,job}=operationalJob();store.parts.push({id:'part-1',sku:'FILTER-A',name:'Oil Filter A',category:'',brand:'',unit:'each',location:'',supplier:'',minimumStock:0,compatibility:'',active:true,createdAt:'',updatedAt:''});
 store.partMovements.push({id:'opening',partId:'part-1',type:'OPENING',quantity:5,at:now.toISOString()});
 assert.equal(issueToJob(store,'part-1',job.id,2).ok,true);store.parts[0]!.name='Oil Filter B';store.parts[0]!.sku='FILTER-B';job.status='completed';
 let item=completedService(job,store)!.consumedParts[0]!;assert.equal(item.name,'Oil Filter A');assert.equal(item.sku,'FILTER-A');assert.equal(item.partId,'part-1');
 assert.equal(returnFromJob(store,'part-1',job.id,1).ok,true);item=completedService(job,store)!.consumedParts[0]!;assert.equal(item.quantity,1);assert.equal(item.name,'Oil Filter A');
 const legacyStore=structuredClone(store);for(const movement of legacyStore.partMovements){delete movement.partNameSnapshot;delete movement.partSkuSnapshot;delete movement.partUnitSnapshot;}item=completedService(job,legacyStore)!.consumedParts[0]!;assert.equal(item.partId,'part-1');assert.equal(item.name,'Oil Filter B');assert.equal(item.quantity,1);
});

test('manual Waiting Parts persists its reason and clearing restores derived workflow',()=>{
 const {store,job}=jobFixture();job.status='work-order';job.workOrder={...workOrder(),'status':'In progress'};
 assert.equal(setWaitingParts(store,job.id,true,now),null);assert.ok(setWaitingParts(store,job.id,true,now,'Customer supplied component'));assert.equal(job.operations?.waitingPartsReason,'Customer supplied component');assert.equal(operationalStatus(job),'Waiting Parts');
 assert.ok(setWaitingParts(store,job.id,false,new Date(now.getTime()+1000)));assert.equal(operationalStatus(job),'Work In Progress');assert.equal(job.operations?.waitingPartsReason,undefined);
 assert.match(job.operations?.history[1]?.reason??'',/Customer supplied component/);
});
