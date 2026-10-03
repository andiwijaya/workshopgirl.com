import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createJob, emptyStore } from '../src/lib/workshop/store.ts';
import { selectedWorkshopJob, workshopPageHref, workshopPages, workshopJobParams } from '../src/lib/workshop/navigation.ts';
import { GET as sitemap } from '../src/pages/sitemap-0.xml.ts';

const makeStore = () => {
  const store = emptyStore();
  const job = createJob(store, {
    customer: { name: 'Synthetic', phone: '', address: '' },
    vehicle: { type: 'Car', plate: 'WG-SYNTHETIC', make: '', model: '', year: null, color: '', odometer: null },
    intake: { number: 'WI-SYNTHETIC', complaint: '', accessories: [], conditionNotes: '', date: '2026-10-03', arrivalTime: '10:00' },
  }, prefix => prefix + '_synthetic');
  return { store, job };
};

test('only a unique exact local job ID is a selected navigation context', () => {
  const { store, job } = makeStore();
  assert.equal(selectedWorkshopJob(store, new URLSearchParams({ job: job.id })), job);
  for (const query of ['', 'job=', 'job=deleted', 'job=%3Cscript%3E', 'job=%20job_synthetic', 'job=job_synthetic&job=job_synthetic', 'job=job_synthetic&job=other']) {
    assert.equal(selectedWorkshopJob(store, new URLSearchParams(query)), null, query);
  }
  store.jobs = [];
  assert.equal(selectedWorkshopJob(store, new URLSearchParams({ job: job.id })), null);
});

test('all Workshop tab destinations preserve a selected local job and have explicit neutral routes', () => {
  const { job } = makeStore();
  assert.equal(workshopPages.length, 9);
  assert.equal(new Set(workshopPages.map(page => page.href)).size, 9);
  for (const page of workshopPages) {
    assert.equal(workshopPageHref(page.id, null), page.href);
    const url = new URL(workshopPageHref(page.id, job)!, 'https://workshopgirl.com');
    assert.equal(url.pathname, page.href);
    assert.deepEqual([...url.searchParams.keys()], []);
    assert.deepEqual([...workshopJobParams(url).keys()], ['job']);
    assert.equal(workshopJobParams(url).get('job'), job.id);
  }
  assert.equal(workshopPageHref('not-a-workshop-page', job), null);
});

test('job IDs are encoded without becoming extra URL fields or fragment parameters', () => {
  const { job } = makeStore();
  const unusualId = 'job_a&customer=private/#x';
  const url = new URL(workshopPageHref('inspection', { ...job, id: unusualId })!, 'https://workshopgirl.com');
  assert.equal(workshopJobParams(url).get('job'), unusualId);
  assert.deepEqual([...url.searchParams.keys()], []);
    assert.deepEqual([...workshopJobParams(url).keys()], ['job']);
  assert.ok(url.hash.startsWith('#job='));
});

test('fragment selection is exact and legacy queries take precedence including invalid duplicates', () => {
  const { store, job } = makeStore();
  for (const suffix of ['#job=' + job.id, '?job=' + job.id + '#job=missing']) {
    assert.equal(selectedWorkshopJob(store, workshopJobParams(new URL('https://workshopgirl.com/' + suffix))), job);
  }
  for (const suffix of ['#job=missing', '#job=' + job.id + '&job=' + job.id, '?job=missing#job=' + job.id, '?job=&job=' + job.id]) {
    assert.equal(selectedWorkshopJob(store, workshopJobParams(new URL('https://workshopgirl.com/' + suffix))), null);
  }
});

test('early legacy bootstrap removes every job query without touching storage or losing other query fields', async () => {
  const source = await fs.readFile(new URL('../src/components/LocalJobContext.astro', import.meta.url), 'utf8');
  const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)![1];
  assert.ok(source.indexOf('name="referrer"') < source.indexOf('<script'));
  for (const query of ['job=job_synthetic', 'job=job_synthetic&job=other', 'job=']) {
    let replaced = '';
    const original = new URL('https://workshopgirl.com/tools/workshop/queue/?keep=public&' + query + '#old');
    const state = { unchanged: true };
    vm.runInNewContext(script, { URL, URLSearchParams, location: { href: original.href }, history: { state, replaceState: (actual: unknown, _: string, path: string) => { assert.equal(actual, state); replaced = path; } } });
    const url = new URL(replaced, original);
    assert.equal(url.search, '?keep=public');
    assert.deepEqual(workshopJobParams(url).getAll('job'), original.searchParams.getAll('job'));
  }
  let called = false;
  vm.runInNewContext(script, { URL, URLSearchParams, location: { href: 'https://workshopgirl.com/workshop/#job=existing' }, history: { replaceState: () => { called = true; } } });
  assert.equal(called, false);
});

test('canonical slashless tutorial URLs have exact internal proxies without redirect cycles', async () => {
  const redirects = (await fs.readFile(new URL('../public/_redirects', import.meta.url), 'utf8'))
    .trim().split(/\r?\n/).filter(line => !line.startsWith('#')).map(line => line.split(/\s+/));
  const xml = await sitemap().text();
  const paths = [...xml.matchAll(/<loc>https:\/\/workshopgirl.com(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(paths.length, 44);
  assert.equal(new Set(paths).size, 44);
  const slashless = paths.filter(path => path.startsWith('/tutorials/') && !path.endsWith('/'));
  assert.equal(slashless.length, 9);
  for (const path of slashless) {
    const rules = redirects.filter(([source]) => source === path);
    assert.deepEqual(rules, [[path, path + '/', '200']], path);
    assert.ok(!redirects.some(([source, target, status]) => source === path + '/' && target === path && status !== '200'), 'No reverse redirect: ' + path);
    const source = await fs.readFile(new URL('../src/pages' + path + '.astro', import.meta.url), 'utf8');
    assert.ok(source.includes("const canonical = 'https://workshopgirl.com" + path + "'"), path);
  }
  assert.ok(redirects.some(([source, target, status]) => source === '/sitemap.xml' && target === '/sitemap-index.xml' && status === '301'));
});
