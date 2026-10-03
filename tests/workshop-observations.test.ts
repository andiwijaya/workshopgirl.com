import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticObservation, syntheticSnapshot, syntheticWorkshop } from './observation-fixtures.ts';
import { loadStore, saveStore, STORAGE_KEY, emptyStore, type StorageLike } from '../src/lib/workshop/store.ts';
import { attachEngineObservation } from '../src/lib/workshop/observations.ts';
import { isEngineObservation, summarizeEngineObservation, MAX_OBSERVATIONS } from '../src/lib/workshop/observation-summary.ts';
import { emptyInspection } from '../src/lib/workshop/rules.ts';

function memory(raw: string | null = null) { let value = raw; return { getItem: () => value, setItem: (_key: string, next: string) => { value = next; }, get value() { return value; } }; }

test('bounded observation reuses actual serialization, keeps manual context and excludes arrays/audio/identifiers', () => {
  const snapshot = syntheticSnapshot(), observation = summarizeEngineObservation(snapshot), raw = JSON.stringify(observation);
  assert.equal(isEngineObservation(observation), true); assert.equal(observation.context.manualRpm, 800);
  assert.ok(Math.abs(observation.peaks[0].frequency - 440) < 6); assert.equal(observation.repeatability.status, 'INSUFFICIENT DATA');
  assert.doesNotMatch(raw, /clockId|frameStart|power|tonalDbFS|audioWorkletAvailable|deviceId|customer|vehicle|filename|PCM/);
  assert.ok(raw.length < 16000); assert.ok(observation.peaks.length <= 6);
  snapshot.spectrum.peaks[0].frequency = 100; assert.notEqual(observation.peaks[0].frequency, 100);
});
test('observation validation rejects hidden fields, malformed timestamps, nonfinite peaks and excessive data', () => {
  const observation = syntheticObservation();
  for (const invalid of [{ ...observation, audio: [1] }, { ...observation, capturedAt: 'bad' }, { ...observation, notes: 'x'.repeat(1001) }, { ...observation, peaks: [{ frequency: Infinity, dbFS: -10 }] }, { ...observation, context: { ...observation.context, manualRpm: -1 } }, { ...observation, repeatability: { ...observation.repeatability, snapshotCount: 7 } }]) assert.equal(isEngineObservation(invalid), false);
  const bad = syntheticSnapshot(); bad.spectrum.peaks[0].frequency = NaN; assert.throws(() => summarizeEngineObservation(bad));
});
test('old v1 collection fixture migrates losslessly in memory and commits only on successful explicit save', () => {
  const { store, job } = syntheticWorkshop(); delete job.operations;
  const old = { ...store, version: 1, customMetadata: { preserved: true }, jobs: [{ ...job, customJobField: 'preserve' }] };
  const raw = JSON.stringify(old), disk = memory(raw), loaded = loadStore(disk);
  assert.equal(loaded.recovered, false); assert.equal(loaded.store.version, 2); assert.equal(disk.value, raw);
  assert.equal(loaded.store.jobs[0].id, job.id); assert.deepEqual(loaded.store.jobs[0].observations, []);
  assert.equal(saveStore(loaded.store, disk).ok, true);
  const reloaded = JSON.parse(disk.value!); assert.equal(reloaded.customMetadata.preserved, true); assert.equal(reloaded.jobs[0].customJobField, 'preserve');
  for (const field of ['customers','vehicles','parts','partMovements','warranties','warrantyClaims','nextServices','invoices','payments','suppliers','purchaseNeeds','purchaseOrders','goodsReceipts']) assert.deepEqual(reloaded[field], old[field as keyof typeof old]);
});
test('earliest v1 fixture without later modules retains identities and initializes absent arrays', () => {
  const { store, job } = syntheticWorkshop(); delete job.operations;
  const raw = JSON.stringify({ version: 1, customers: store.customers, vehicles: store.vehicles, jobs: store.jobs });
  const disk = memory(raw), loaded = loadStore(disk);
  assert.equal(loaded.recovered, false); assert.equal(disk.value, raw);
  assert.equal(loaded.store.jobs[0].id, job.id); assert.deepEqual(loaded.store.purchaseOrders, []); assert.deepEqual(loaded.store.payments, []);
});
test('malformed/unsupported/duplicate/orphan storage is read-only and cannot be silently overwritten by any save', () => {
  const { store } = syntheticWorkshop();
  const invalid = ['{bad', JSON.stringify({ ...store, version: 9 }), JSON.stringify({ ...store, customers: [] }), JSON.stringify({ ...store, jobs: [...store.jobs, ...store.jobs] }), JSON.stringify({ ...store, jobs: [{ ...store.jobs[0], observations: [{ rawAudio: 'bad' }] }] }), ...['customers','vehicles','parts','partMovements','warranties','warrantyClaims','nextServices','invoices','payments','suppliers','purchaseNeeds','purchaseOrders','goodsReceipts'].map(field => JSON.stringify({ ...store, [field]: [{ broken: true }] }))];
  for (const raw of invalid) {
    const disk = memory(raw), loaded = loadStore(disk); assert.equal(loaded.recovered, true, raw);
    assert.match(loaded.message, /Saving is blocked/); assert.equal(saveStore(loaded.store, disk).ok, false);
    assert.equal(saveStore(emptyStore(), disk).ok, false); assert.equal(attachEngineObservation(disk, syntheticObservation(), { jobId: store.jobs[0].id }).ok, false);
    assert.equal(disk.value, raw);
  }
});
test('explicit attachment to v1 job migrates, retrieves and leaves domain state/customer/ledger untouched', () => {
  const { store, job } = syntheticWorkshop(), old = { ...store, version: 1 }, disk = memory(JSON.stringify(old));
  const result = attachEngineObservation(disk, syntheticObservation(), { jobId: job.id }); assert.equal(result.ok, true);
  const loaded = loadStore(disk).store; assert.equal(loaded.version, 2); assert.equal(loaded.jobs[0].status, 'intake');
  assert.deepEqual(loaded.jobs[0].observations, [syntheticObservation()]); assert.deepEqual(loaded.customers, store.customers); assert.deepEqual(loaded.partMovements, []);
  assert.equal(job.observations, undefined);
});
test('new job and observation commit together; invalid intake produces no record', () => {
  const disk = memory();
  assert.equal(attachEngineObservation(disk, syntheticObservation(), { newJob: { name: '', plate: '', type: 'Motorcycle', complaint: '' } }).ok, false); assert.equal(disk.value, null);
  const result = attachEngineObservation(disk, syntheticObservation(), { newJob: { name: 'Synthetic New', plate: 'QA-NEW', type: 'Motorcycle', complaint: 'Compare then inspect' } });
  assert.equal(result.ok, true); const loaded = loadStore(disk).store;
  assert.equal(loaded.jobs.length, 1); assert.equal(loaded.jobs[0].observations?.length, 1); assert.equal(loaded.vehicles[0].type, 'Motorcycle'); assert.equal(loaded.jobs[0].status, 'intake');
});
test('quota failure preserves original raw v1 records, annotations and domain state for existing or new jobs', () => {
  const { store, job } = syntheticWorkshop(), raw = JSON.stringify({ ...store, version: 1 });
  const disk = { getItem: () => raw, setItem: () => { throw new DOMException('Quota', 'QuotaExceededError'); } };
  const loaded = loadStore(disk), before = JSON.stringify(loaded.store);
  for (const target of [{ jobId: job.id }, { newJob: { name: 'Synthetic New', plate: 'QA-NEW', type: 'Car' as const, complaint: '' } }]) {
    const result = attachEngineObservation(disk, syntheticObservation(), target); assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /not saved|Nothing was attached/);
    assert.equal(disk.getItem(), raw); assert.equal(JSON.stringify(loaded.store), before);
  }
  assert.equal(saveStore(loaded.store, disk).ok, false); assert.equal(disk.getItem(), raw);
});
test('unavailable storage blocks load/save/attach without pretending persistence succeeded', () => {
  const disk: StorageLike = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  const loaded = loadStore(disk); assert.equal(loaded.recovered, true); assert.equal(saveStore(loaded.store, disk).ok, false); assert.equal(attachEngineObservation(disk, syntheticObservation(), { jobId: 'job' }).ok, false);
});
test('stale tab save and changed snapshot attachment refuse to replace another tab records', () => {
  const { store, job } = syntheticWorkshop(), raw = JSON.stringify(store), disk = memory(raw), loaded = loadStore(disk);
  const newer = JSON.stringify({ ...store, customMetadata: 'another tab' }); disk.setItem(STORAGE_KEY, newer);
  assert.equal(saveStore(loaded.store, disk).ok, false); assert.equal(disk.value, newer);
  let reads = 0, writes = 0; const raced = { getItem: () => ++reads === 1 ? raw : newer, setItem: () => { writes++; } };
  const result = attachEngineObservation(raced, syntheticObservation(), { jobId: job.id }); assert.equal(result.ok, false); assert.equal(writes, 0);
  if (!result.ok) assert.match(result.message, /another tab/);
});
test('duplicate, bound, missing/deleted and closed targets do not change stored data', () => {
  const { store, job } = syntheticWorkshop(); job.observations = [syntheticObservation()];
  const disk = memory(JSON.stringify(store)), before = disk.value;
  for (const id of [job.id, 'missing']) { assert.equal(attachEngineObservation(disk, syntheticObservation(), { jobId: id }).ok, false); assert.equal(disk.value, before); }
  job.observations = Array.from({ length: MAX_OBSERVATIONS }, (_, index) => syntheticObservation(`qa-${index}`));
  disk.setItem(STORAGE_KEY, JSON.stringify(store)); const bounded = disk.value;
  assert.equal(attachEngineObservation(disk, syntheticObservation('extra'), { jobId: job.id }).ok, false); assert.equal(disk.value, bounded);
  job.status = 'completed'; job.observations = []; disk.setItem(STORAGE_KEY, JSON.stringify(store)); const closed = disk.value;
  assert.equal(attachEngineObservation(disk, syntheticObservation(), { jobId: job.id }).ok, false); assert.equal(disk.value, closed);
});

test('malformed nested legacy workflow cannot reach unsafe projections or overwrite original records', () => {
  const { store, job } = syntheticWorkshop(); job.inspection = emptyInspection('Motorcycle');
  job.inspection.checklist[0].items[0].note = null as unknown as string;
  const raw = JSON.stringify({ ...store, version: 1 }), disk = memory(raw), loaded = loadStore(disk);
  assert.equal(loaded.recovered, true); assert.equal(loaded.store.jobs.length, 0); assert.equal(saveStore(loaded.store, disk).ok, false); assert.equal(disk.value, raw);
  job.inspection = emptyInspection('Motorcycle'); job.operations!.history[0].at = 'invalid timestamp';
  const malformedTime = JSON.stringify({ ...store, version: 1 }); const timeDisk = memory(malformedTime);
  assert.equal(loadStore(timeDisk).recovered, true); assert.equal(saveStore(emptyStore(), timeDisk).ok, false); assert.equal(timeDisk.value, malformedTime);
});
test('invalid candidate summary cannot overwrite valid stored records on a normal save', () => {
  const { store } = syntheticWorkshop(), disk = memory(JSON.stringify(store)), loaded = loadStore(disk), raw = disk.value;
  const invalid = syntheticObservation(); invalid.peaks[0].frequency = NaN; loaded.store.jobs[0].observations = [invalid];
  assert.equal(saveStore(loaded.store, disk).ok, false); assert.equal(disk.value, raw);
});
test('observation serializers and controllers use no network dispatch or automatic persistence hooks', async () => {
  const fs = await import('node:fs/promises');
  for (const path of ['../src/lib/workshop/observations.ts','../src/lib/workshop/observation-summary.ts','../src/components/engine-analyzer/observation-attachment.ts','../src/components/workshop/observation-view.ts','../src/components/workshop/dashboard.ts']) {
    const source = await fs.readFile(new URL(path,import.meta.url),'utf8'); assert.doesNotMatch(source,/fetch\s*\(|sendBeacon|XMLHttpRequest|gtag\s*\(|analytics\.track/);
  }
});
