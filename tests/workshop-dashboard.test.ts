import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyStore, createJob } from '../src/lib/workshop/store.ts';
import { workshopDashboard, workshopProgress } from '../src/lib/workshop/dashboard.ts';
import { emptyInspection } from '../src/lib/workshop/rules.ts';
import { createPart } from '../src/lib/workshop/parts.ts';

test('dashboard projects empty local data without fabricating jobs, billing or history', () => {
  const store = emptyStore(), before = JSON.stringify(store), view = workshopDashboard(store);
  assert.deepEqual(view, { active: [], waiting: [], partsAttention: [], drafts: 0, unpaid: 0, readyToBill: 0, history: [] });
  assert.equal(JSON.stringify(store), before);
});
test('dashboard derives waiting and stock attention from real local rules without mutation', () => {
  const store = emptyStore();
  const job = createJob(store, { customer: { name: 'Synthetic', phone: '', address: '' }, vehicle: { type: 'Car', plate: 'QA', make: '', model: '', year: null, color: '', odometer: null }, intake: { number: 'QA-1', complaint: '', accessories: [], conditionNotes: '', date: '2026-10-03', arrivalTime: '' } });
  job.operations!.waitingParts = true;
  createPart(store, { sku: 'QA', name: 'Synthetic filter', category: '', brand: '', unit: 'each', location: '', supplier: '', compatibility: '', active: true, minimumStock: 1 });
  const before = JSON.stringify(store), view = workshopDashboard(store);
  assert.equal(view.active.length, 1); assert.equal(view.waiting.length, 1); assert.equal(view.partsAttention.length, 1);
  assert.equal(view.drafts, 0); assert.equal(view.history.length, 0); assert.equal(JSON.stringify(store), before);
  assert.deepEqual(workshopProgress(job).map(stage => stage.state), ['Recorded', 'Not recorded', 'Not recorded', 'Not recorded']);
  job.inspection = emptyInspection('Car'); assert.equal(workshopProgress(job)[1].state, 'In progress');
  for (const group of job.inspection.checklist) for (const item of group.items) item.status = 'Good';
  job.inspection.recommendedJobs[0].name = 'Inspect noise'; assert.equal(workshopProgress(job)[1].state, 'Awaiting approval');
});
