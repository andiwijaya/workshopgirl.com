import { test, expect, type Page } from '@playwright/test';
import { syntheticObservation, syntheticWorkshop } from './observation-fixtures';
import { wav, upload, syntheticMicrophone, audioState } from './audio-fixtures';

const key = 'workshopgirl.workshop.operations.v1', engine = '/tools/engine-sound-analyzer/';
const viewports = [[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]];
async function seed(page: Page, raw: string) {
  await page.goto('/workshop/'); await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
}
async function captureFile(page: Page) {
  await page.goto(engine);
  if (!await page.evaluate(() => !!window.AudioContext)) {
    await expect(page.locator('#capture-job-observation')).toBeDisabled();
    return false; // Verify unsupported startup; no additional audio skip is reported.
  }
  await page.locator('.engine-settings > summary').click(); await page.locator('#engine-rpm').fill('800');
  await page.locator('.measurement-quality > details > summary').click();
  await page.locator('#measurement-label').fill('Synthetic warm idle'); await page.locator('#measurement-notes').fill('Synthetic fixture at fixed position.');
  await upload(page, wav([100,200,300], .1), 'synthetic-only.wav');
  await page.locator('#capture-job-observation').click(); await expect(page.locator('#observation-attach-form')).toBeVisible();
  await expect(page.locator('#observation-preview')).toContainText('Manual RPM: 800');
  return true;
}

test('Engine actual file observation attaches existing and new jobs only on explicit save at six viewports', async ({ page }, info) => {
  test.setTimeout(90_000);
  const { store, job } = syntheticWorkshop(); job.id = '__new__'; await seed(page, JSON.stringify({ ...store, version: 1 }));
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET' || request.url().includes('QA-OBS') || request.url().includes('Synthetic%20')) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  if (!await captureFile(page)) { expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before); return; }
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  for (const [width,height] of viewports) {
    await page.setViewportSize({ width,height }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (info.project.name === 'chromium-desktop') await page.locator('.observation-attachment').screenshot({ path: info.outputPath(`attach-${width}.png`) });
  }
  await page.locator('#engine-rpm').fill('1500'); // Review is frozen at 800.
  await page.locator('#observation-job').selectOption('job:'+job.id); await page.locator('#save-job-observation').click();
  await expect(page.locator('#observation-attach-status')).toContainText('Observation saved');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(saved.version).toBe(2); expect(saved.jobs[0].observations).toHaveLength(1); expect(saved.jobs[0].observations[0].context.manualRpm).toBe(800);
  expect(JSON.stringify(saved.jobs[0].observations)).not.toMatch(/power|tonalDbFS|PCM|filename|clockId|customerId|vehicleId|synthetic-only/);
  expect(page.url()).not.toContain('?'); await page.locator('#observation-open-inspection').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#job-observations')).toContainText('Synthetic warm idle');
  await page.locator('#job-observations summary').click(); await expect(page.locator('#job-observations')).toContainText('Manual RPM: 800');
  await page.reload(); await expect(page.locator('#job-observations')).toContainText('Synthetic warm idle');
  await page.locator('[data-step-link="work-order"]').click(); await expect(page.locator('#job-observations')).toContainText('Synthetic warm idle');
  if (info.project.name === 'chromium-desktop') await page.locator('#job-observations').screenshot({ path: info.outputPath('work-order-evidence.png') });
  if (!await captureFile(page)) return;
  await page.locator('#observation-job').selectOption('__new__');
  await page.getByLabel('Customer name *', { exact: true }).fill('Synthetic New Observation'); await page.getByLabel('License plate *', { exact: true }).fill('QA-OBS-NEW');
  await page.locator('#observation-vehicle-type').selectOption('Motorcycle'); await page.locator('#save-job-observation').click();
  await expect(page.locator('#observation-attach-status')).toContainText('Observation saved');
  const final = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(final.jobs).toHaveLength(2); expect(final.jobs[1].observations).toHaveLength(1); expect(final.jobs[1].status).toBe('intake');
  expect(final.vehicles[1].type).toBe('Motorcycle');
  await page.locator('#observation-open-intake').click(); await expect(page.getByLabel('License plate *')).toHaveValue('QA-OBS-NEW');
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('Stored evidence is escaped, selected by exact context, neutral on clear and removed with a deleted job', async ({ page }, info) => {
  test.setTimeout(60_000);
  const { store, job } = syntheticWorkshop(); const observation = syntheticObservation();
  observation.notes = '<img src="/leak-personal" onerror="window.observationXss=true">'; job.observations = [observation];
  const raw = JSON.stringify(store); await seed(page, raw);
  const url = `/tools/workshop/inspection-estimate/?job=${encodeURIComponent(job.id)}`;
  await page.goto(url); await page.locator('#job-observations summary').click();
  await expect(page.locator('#job-observations')).toContainText(observation.notes); await expect(page.locator('#job-observations img')).toHaveCount(0);
  for (const [width,height] of viewports) {
    await page.setViewportSize({ width,height }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (info.project.name === 'chromium-desktop') await page.locator('#job-observations').screenshot({ path: info.outputPath(`evidence-${width}.png`) });
  }
  await page.getByRole('link', { name: 'Clear job context', exact: true }).click(); await expect(page.locator('#job-observations')).toBeHidden();
  await page.goto(url + '&job=other'); await expect(page.locator('#job-observations')).toBeHidden();
  await page.goto(url);
  await page.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.jobs = []; localStorage.setItem(key,JSON.stringify(value)); window.dispatchEvent(new StorageEvent('storage',{key})); },key);
  await expect(page.locator('#job-observations')).toBeHidden(); await expect(page.locator('[data-step-link="inspection"]')).toHaveAttribute('href','/tools/workshop/inspection-estimate/');
  expect(await page.evaluate(() => (window as unknown as { observationXss?: boolean }).observationXss)).toBeUndefined();
});

test('Repeated cancel and navigation leave old records untouched and deleted target cannot receive a capture', async ({ page }) => {
  const { store, job } = syntheticWorkshop(); const raw = JSON.stringify({ ...store, version: 1 }); await seed(page, raw);
  if (!await captureFile(page)) { expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw); return; }
  for (let index = 0; index < 3; index++) {
    await page.locator('#observation-job').selectOption('__new__');
    await page.locator('#cancel-job-observation').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#observation-attach-form')).toBeHidden(); await expect(page.locator('#capture-job-observation')).toBeFocused();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
    await page.locator('#capture-job-observation').click();
  }
  await page.locator('#observation-job').selectOption('job:'+job.id);
  const deleted = JSON.stringify({ ...store, version: 1, jobs: [] }); await page.evaluate(({key,raw}) => localStorage.setItem(key,raw), {key,raw:deleted});
  await page.locator('#save-job-observation').click(); await expect(page.locator('#observation-attach-status')).toContainText('no longer exists');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(deleted);
  await page.goto('/workshop/'); await expect(page.locator('[data-local-count="active"]')).toHaveText('0');
});

test('Quota failure never reports attachment success or partly creates a new local job', async ({ page }) => {
  const { store, job } = syntheticWorkshop(); const raw = JSON.stringify({ ...store, version: 1 }); await seed(page,raw);
  if (!await captureFile(page)) { expect(await page.evaluate(key => localStorage.getItem(key),key)).toBe(raw); return; }
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Synthetic quota', 'QuotaExceededError'); }; });
  for (const selected of ['job:'+job.id, '__new__']) {
    await page.locator('#observation-job').selectOption(selected);
    if (selected === '__new__') { await page.locator('#observation-customer').fill('Synthetic Failed'); await page.locator('#observation-plate').fill('QA-FAIL'); }
    await page.locator('#save-job-observation').click(); await expect(page.locator('#observation-attach-status')).toContainText('not saved');
    await expect(page.locator('#observation-attach-form')).toBeVisible(); await expect(page.locator('#observation-saved-links')).toBeHidden();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  }
});

test('Malformed old records visibly block operations saves and analyzer capture without wiping data', async ({ page }) => {
  const { store } = syntheticWorkshop(); const raw = JSON.stringify({ ...store, version: 1, suppliers: [{ invalid:true }] }); await seed(page,raw);
  await page.goto('/tools/workshop/vehicle-intake/'); await expect(page.locator('#workshop-status')).toContainText('Saving is blocked');
  await page.getByLabel('Name *').fill('Synthetic Failed'); await page.getByLabel('License plate *').fill('QA-BLOCKED'); await page.getByRole('button',{name:'Save intake',exact:true}).click();
  await expect(page.locator('#workshop-status')).toContainText('Saving is blocked'); await expect(page.locator('#next-inspection')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key),key)).toBe(raw);
  await page.goto('/workshop/'); await expect(page.locator('#dashboard-status')).toContainText('Saving is blocked');
  await page.goto(engine);
  if (await page.evaluate(() => !!window.AudioContext)) {
    await upload(page); await page.locator('#capture-job-observation').click();
    await expect(page.locator('#observation-attach-status')).toContainText('Saving is blocked'); await expect(page.locator('#observation-attach-form')).toBeHidden();
  } else await expect(page.locator('#capture-job-observation')).toBeDisabled();
  expect(await page.evaluate(key => localStorage.getItem(key),key)).toBe(raw);
});

test('Engine live summary retains actual capture quality and separate repeatability without raw audio or network dispatch', async ({ page }, info) => {
  test.setTimeout(60_000);
  const { store, job } = syntheticWorkshop(); const raw = JSON.stringify({ ...store, version: 1 }); await seed(page,raw);
  await page.goto(engine);
  if (!await page.evaluate(() => !!window.AudioContext)) { await expect(page.locator('#capture-job-observation')).toBeDisabled(); expect(await page.evaluate(key => localStorage.getItem(key),key)).toBe(raw); return; }
  await syntheticMicrophone(page, false, [100,200,300]);
  const requests: string[] = []; page.on('request', request => { if (request.method() !== 'GET') requests.push(request.url()); });
  await page.goto(engine); await page.locator('.measurement-quality > details > summary').click();
  await page.locator('#measurement-notes').fill('Synthetic live observation; position not externally verified.');
  if (await page.locator('#engine-live-toggle').isVisible()) await page.locator('#engine-live-toggle').click(); else await page.locator('#start-mic').click();
  await expect(page.locator('#measurement-quality-summary')).toContainText('observations');
  await expect.poll(async () => parseFloat((await page.locator('#measurement-quality-summary').textContent())?.split('s session span')[0].split('·').at(-1) ?? '0')).toBeGreaterThan(2);
  await page.locator('#capture-repeat').click();
  await expect.poll(async () => (await page.locator('#measurement-quality-summary').textContent())?.includes('3.')).toBeTruthy();
  await page.locator('#capture-repeat').click();
  await page.locator('#capture-job-observation').click(); await page.locator('#observation-job').selectOption('job:'+job.id);
  await page.locator('#save-job-observation').click(); await expect(page.locator('#observation-attach-status')).toContainText('Observation saved');
  const observation = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).jobs[0].observations[0],key);
  expect(observation.source).toBe('live frame'); expect(observation.context.mode).toBe('worklet'); expect(observation.context.manualRpm).toBeNull();
  expect(observation.quality.frameCount).toBeGreaterThan(8); expect(observation.quality.sessionSpanSeconds).toBeGreaterThan(2);
  expect(observation.repeatability.snapshotCount).toBe(2); expect(observation.repeatability.pairCount).toBe(1);
  expect(JSON.stringify(observation)).not.toMatch(/power|tonalDbFS|clockId|frameStart|PCM|blob|deviceId/);
  if (info.project.name === 'chromium-desktop') await page.locator('.observation-attachment').screenshot({ path: info.outputPath('live-attached.png') });
  if (await page.locator('#engine-live-toggle').isVisible()) await page.locator('#engine-live-toggle').click(); else await page.locator('#stop-analysis').click();
  await expect.poll(async () => (await audioState(page)).contexts.every(state => state === 'closed')).toBe(true);
  await expect.poll(async () => (await audioState(page)).tracks.every(state => state === 'ended')).toBe(true); expect(requests).toEqual([]);
});
