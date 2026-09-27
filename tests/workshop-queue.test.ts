import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyInspection } from '../src/lib/workshop/rules.ts';
import { canSetWaitingParts, elapsedTime, nextWorkflowRoute, operationalStatus, qcPassed, workflowStatus } from '../src/lib/workshop/queue.ts';
import { createJob, emptyStore, loadStore, setWaitingParts, updateJob } from '../src/lib/workshop/store.ts';

const now = new Date('2026-09-27T12:00:00.000Z');
const customer = { name: 'Queue Customer', phone: '555', address: '' };
const vehicle = { type: 'Motorcycle' as const, plate: 'WG-QUEUE-1', make: 'Honda', model: 'CB500', year: 2020, color: '', odometer: 1200 };
const intake = { number: 'WI-QUEUE-1', complaint: 'Brake noise', accessories: [], conditionNotes: '', date: '2026-09-27', arrivalTime: '10:00' };
function passingQC() { return { number: 'QC-1', date: '2026-09-27', inspector: '', mechanic: '', finalStatus: 'Ready for handover' as const,
  checks: [{ name: 'Brakes', result: 'Pass' as const, note: '' }], unresolvedIssues: [], returnedItems: [], roadTest: 'Not required' as const,
  roadTester: '', odometerBefore: null, odometerAfter: null, roadTestNotes: '', readinessNotes: '', recommendations: '', customerNotes: '',
  handoverRecipient: '', handoverStaff: '', handoverDate: '', handoverTime: '' }; }

test('status derives from Phase 1 intake, inspection completeness, work order, QC and completion', () => {
  const store = emptyStore(), job = createJob(store, { customer, vehicle, intake }, p => p, now);
  assert.equal(operationalStatus(job), 'Intake');
  const inspection = emptyInspection(vehicle.type); job.status = 'inspection'; job.inspection = inspection;
  assert.equal(workflowStatus(job), 'Inspection');
  for (const group of inspection.checklist) for (const item of group.items) item.status = 'Good';
  assert.equal(workflowStatus(job), 'Waiting Approval');
  job.workOrder = { number: 'WO-1', date: '', status: 'Not started', mechanic: '', approvedWork: [], actualWork: [], parts: [], changes: [], startTime: '', endTime: '', mechanicNotes: '', result: '', recommendations: '', signoff: '' };
  assert.equal(workflowStatus(job), 'Waiting Approval');
  job.workOrder.status = 'In progress'; assert.equal(workflowStatus(job), 'Work In Progress');
  job.workOrder.status = 'Complete'; assert.equal(workflowStatus(job), 'QC');
  job.status = 'qc'; job.qc = { ...passingQC(), finalStatus: 'In progress', checks: [{ name: 'Brakes', result: 'Needs attention', note: '' }] };
  assert.equal(workflowStatus(job), 'QC'); assert.equal(qcPassed(job), false);
  job.qc = passingQC(); assert.equal(workflowStatus(job), 'Ready for Pickup');
  assert.ok(updateJob(store, job.id, { status: 'completed' }, now)); assert.equal(operationalStatus(job), 'Completed');
});

test('incomplete or failed QC cannot be marked ready/completed and a completed job cannot regress', () => {
  const store = emptyStore(), job = createJob(store, { customer, vehicle, intake }, p => p, now);
  job.status = 'qc'; job.qc = { ...passingQC(), checks: [{ name: 'Brakes', result: 'Needs attention', note: '' }] };
  assert.equal(operationalStatus(job), 'QC'); assert.equal(updateJob(store, job.id, { status: 'completed' }, now), null); assert.notEqual(job.status, 'completed');
  job.qc = { ...passingQC(), unresolvedIssues: [{ id: 'issue', issue: 'Leak', status: 'Needs follow-up', recommendation: '' }] };
  assert.equal(operationalStatus(job), 'QC'); assert.equal(updateJob(store, job.id, { status: 'completed' }, now), null);
  job.qc = passingQC(); assert.ok(updateJob(store, job.id, { status: 'completed' }, now));
  assert.equal(updateJob(store, job.id, { status: 'intake' }, now), null); assert.equal(job.status, 'completed'); assert.equal(operationalStatus(job), 'Completed');
});

test('Waiting Parts is reversible, records transitions and preserves the derived workflow state', () => {
  const store = emptyStore(), job = createJob(store, { customer, vehicle, intake }, p => p, now);
  job.status = 'work-order'; job.workOrder = { number: 'WO-1', date: '', status: 'In progress', mechanic: '', approvedWork: [], actualWork: [], parts: [], changes: [], startTime: '', endTime: '', mechanicNotes: '', result: '', recommendations: '', signoff: '' };
  assert.equal(workflowStatus(job), 'Work In Progress'); assert.equal(canSetWaitingParts(job), true);
  assert.ok(setWaitingParts(store, job.id, true, new Date(now.getTime() + 1000)));
  assert.equal(operationalStatus(job), 'Waiting Parts'); assert.equal(workflowStatus(job), 'Work In Progress');
  assert.equal(setWaitingParts(store, job.id, true), job);
  assert.ok(setWaitingParts(store, job.id, false, new Date(now.getTime() + 2000)));
  assert.equal(operationalStatus(job), 'Work In Progress');
  assert.deepEqual(job.operations?.history.map(item => item.status), ['Intake', 'Waiting Parts', 'Work In Progress']);
  assert.deepEqual(job.operations?.history.map(item => item.at), [now.toISOString(), new Date(now.getTime() + 1000).toISOString(), new Date(now.getTime() + 2000).toISOString()]);
  job.qc = passingQC(); job.status = 'qc'; assert.equal(canSetWaitingParts(job), false); assert.equal(setWaitingParts(store, job.id, true), null);
  job.status = 'completed'; assert.equal(setWaitingParts(store, job.id, false), null);
});

test('Cancelled Work Orders override Waiting Parts, remain terminal, persist, and record a transition', () => {
  const store=emptyStore(), job=createJob(store,{customer,vehicle,intake},p=>p,now);
  job.status='work-order';job.workOrder={number:'WO-CANCEL',date:'',status:'In progress',mechanic:'',approvedWork:[],actualWork:[],parts:[],changes:[],startTime:'',endTime:'',mechanicNotes:'',result:'',recommendations:'',signoff:''};
  setWaitingParts(store,job.id,true,new Date(now.getTime()+1000));
  const cancelled={...job.workOrder,status:'Cancelled' as const};
  assert.ok(updateJob(store,job.id,{workOrder:cancelled},new Date(now.getTime()+2000)));
  assert.equal(workflowStatus(job),'Cancelled');assert.equal(operationalStatus(job),'Cancelled');assert.equal(canSetWaitingParts(job),false);
  assert.equal(nextWorkflowRoute(job),'/tools/workshop/work-order/');
  assert.equal(setWaitingParts(store,job.id,true),null);
  assert.ok(setWaitingParts(store,job.id,false,new Date(now.getTime()+3000)));
  assert.equal(operationalStatus(job),'Cancelled');
  assert.equal(updateJob(store,job.id,{status:'qc',qc:passingQC()}),null);
  assert.equal(updateJob(store,job.id,{status:'completed'}),null);
  assert.equal(updateJob(store,job.id,{workOrder:{...cancelled,status:'In progress'}}),null);
  assert.deepEqual(job.operations?.history.map(x=>x.status),['Intake','Waiting Parts','Cancelled']);
  assert.equal(job.operations?.history.at(-1)?.at,new Date(now.getTime()+2000).toISOString());
  assert.equal(job.operations?.history.at(-1)?.reason,'Work Order cancelled');
  const raw=JSON.stringify(store),loaded=loadStore({getItem:()=>raw,setItem:()=>{}}).store.jobs[0]!;
  assert.equal(operationalStatus(loaded),'Cancelled');assert.equal(loaded.workOrder?.status,'Cancelled');
  assert.deepEqual(loaded.operations?.history.map(x=>x.status),['Intake','Waiting Parts','Cancelled']);
  assert.equal(loaded.intake.complaint,intake.complaint);
});

test('a cancellation update cannot also advance the Phase 1 job into QC or completion', () => {
  const store=emptyStore(),job=createJob(store,{customer,vehicle,intake},p=>p,now);
  job.status='work-order';job.workOrder={number:'WO-CANCEL',date:'',status:'In progress',mechanic:'',approvedWork:[],actualWork:[],parts:[],changes:[],startTime:'',endTime:'',mechanicNotes:'',result:'',recommendations:'',signoff:''};job.qc=passingQC();
  assert.equal(updateJob(store,job.id,{workOrder:{...job.workOrder,status:'Cancelled'},status:'completed'},now),null);
  assert.equal(updateJob(store,job.id,{workOrder:{...job.workOrder,status:'Cancelled'},status:'qc',qc:passingQC()},now),null);
  assert.equal(job.workOrder.status,'In progress');assert.equal(job.status,'work-order');
});

test('automatic timeline records each derived state transition once with reasons and timestamps', () => {
  const store = emptyStore(), job = createJob(store, { customer, vehicle, intake }, p => p, now);
  const inspection = emptyInspection(vehicle.type); inspection.checklist.forEach(group => group.items.forEach(item => item.status = 'Good'));
  updateJob(store, job.id, { status: 'inspection', inspection }, new Date(now.getTime() + 1000));
  job.workOrder = { number: 'WO-1', date: '', status: 'Not started', mechanic: '', approvedWork: [], actualWork: [], parts: [], changes: [], startTime: '', endTime: '', mechanicNotes: '', result: '', recommendations: '', signoff: '' };
  updateJob(store, job.id, { workOrder: job.workOrder }, new Date(now.getTime() + 2000));
  updateJob(store, job.id, { workOrder: { ...job.workOrder, status: 'In progress' } }, new Date(now.getTime() + 3000));
  updateJob(store, job.id, { workOrder: { ...job.workOrder, status: 'Complete' } }, new Date(now.getTime() + 4000));
  updateJob(store, job.id, { status: 'qc', qc: passingQC() }, new Date(now.getTime() + 5000));
  updateJob(store, job.id, { status: 'completed' }, new Date(now.getTime() + 6000));
  assert.deepEqual(job.operations?.history.map(item => item.status), ['Intake','Waiting Approval','Work In Progress','QC','Ready for Pickup','Completed']);
  assert.deepEqual(job.operations?.history.slice(1).map(item => item.reason), ['Inspection checklist completed','Work Order started','Quality check started','QC passed','Handover completed']);
  assert.equal(new Set(job.operations?.history.map(item => item.at)).size, 6);
});

test('Phase 1 v1 jobs without Queue metadata load in place and get a safe local timeline baseline', () => {
  const store=emptyStore(), job=createJob(store,{customer,vehicle,intake},p=>`${p}_old`,now); job.status='inspection'; job.inspection=emptyInspection(vehicle.type);
  const legacy=structuredClone(store); delete legacy.jobs[0]!.operations;
  let raw=JSON.stringify(legacy); const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};
  const loaded=loadStore(storage);
  assert.equal(loaded.recovered,false); assert.equal(loaded.store.version,1); assert.equal(loaded.store.jobs[0]?.id,job.id);
  assert.equal(loaded.store.jobs[0]?.inspection?.checklist.length,job.inspection.checklist.length);
  assert.deepEqual(loaded.store.jobs[0]?.operations?.history.map(entry=>entry.status),['Inspection']);
  assert.equal(JSON.parse(raw).jobs[0].operations,undefined,'load must not silently rewrite existing local storage');
});

test('elapsed time is readable and invalid timestamps are harmless', () => {
  const ref=new Date('2026-09-27T12:00:00Z');
  assert.equal(elapsedTime('2026-09-27T11:35:00Z',ref),'25 min');
  assert.equal(elapsedTime('2026-09-27T09:45:00Z',ref),'2 h 15 min');
  assert.equal(elapsedTime('2026-09-26T10:00:00Z',ref),'1 day 2 h');
  assert.equal(elapsedTime('invalid',ref),'Time unavailable');
});

test('continue-job route respects derived status and returns to estimate approval when required', () => {
  const store=emptyStore(), job=createJob(store,{customer,vehicle,intake},p=>p,now);
  assert.equal(nextWorkflowRoute(job),'/tools/workshop/inspection-estimate/');
  const inspection=emptyInspection(vehicle.type);inspection.checklist.forEach(group=>group.items.forEach(item=>item.status='Good'));
  inspection.recommendedJobs=[{id:'rec',name:'Replace pads',detail:'',priority:'Recommended',approved:false}];job.inspection=inspection;job.status='inspection';
  assert.equal(nextWorkflowRoute(job),'/tools/workshop/inspection-estimate/');
  inspection.recommendedJobs[0]!.approved=true;
  assert.equal(nextWorkflowRoute(job),'/tools/workshop/work-order/');
  job.workOrder={number:'WO',date:'',status:'In progress',mechanic:'',approvedWork:[],actualWork:[],parts:[],changes:[],startTime:'',endTime:'',mechanicNotes:'',result:'',recommendations:'',signoff:''};
  assert.equal(nextWorkflowRoute(job),'/tools/workshop/work-order/');
  job.qc=passingQC();job.status='qc';assert.equal(nextWorkflowRoute(job),'/tools/workshop/qc-handover/');
  job.status='completed';assert.equal(nextWorkflowRoute(job),'/tools/workshop/qc-handover/');
});
