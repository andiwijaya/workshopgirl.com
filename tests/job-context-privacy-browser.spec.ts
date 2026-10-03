import { test, expect, type Page } from '@playwright/test';
import { syntheticWorkshop } from './observation-fixtures.ts';
import { localJobHref, workshopPages } from '../src/lib/workshop/navigation.ts';

const key = 'workshopgirl.workshop.operations.v1';
const marker = 'QA_PRIVATE_JOB_TRANSPORT_2026';
async function seed(page: Page) {
  const { store, job } = syntheticWorkshop();
  job.id = marker;
  store.jobs.push({ ...structuredClone(job), id: marker + '_SECOND', number: 'QA-SECOND', intake: { ...job.intake, number: 'QA-SECOND' } });
  await page.goto('/workshop/');
  const raw = JSON.stringify(store);
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
  await page.reload();
  return { store, job, raw };
}
function trace(page: Page) {
  const requests: { url: string; headers: Record<string, string>; body: string; method: string }[] = [];
  const pending: Promise<void>[] = [];
  page.on('request', request => {
    pending.push(request.allHeaders().then(headers => { requests.push({ url: request.url(), headers, body: request.postData() ?? '', method: request.method() }); }));
  });
  return { requests, finish: () => Promise.all(pending) };
}

test('Generated job navigation across every operations module has no HTTP/referrer/share/print marker', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const { job, raw } = await seed(page), observed = trace(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => Reflect.set(window, 'qaShare', data) });
    window.print = () => Reflect.set(window, 'qaPrint', location.href);
  });
  await page.locator('#resume-jobs a').first().click();
  for (const destination of workshopPages) {
    const link = page.locator(`[data-step-link="${destination.id}"]`);
    await expect(link).toHaveAttribute('href', localJobHref(destination.href, job.id));
    await link.click();
    await expect(page.locator('#main')).toHaveAttribute('data-selected-job', marker);
    await expect(page.locator('#main')).toHaveAttribute('data-workshop-mounted', 'true');
    expect(new URL(page.url()).searchParams.has('job')).toBe(false);
    for (const width of [390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${destination.id} at ${width}`).toBe(true);
    }
    const hrefs = await page.locator('a[href]').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
    for (const href of hrefs) expect(new URL(href).search).not.toContain(marker);
    await page.getByRole('button', { name: 'Share tool', exact: true }).click();
    expect(await page.evaluate(() => Reflect.get(window, 'qaShare').url)).toBe('https://workshopgirl.com' + destination.href);
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://workshopgirl.com' + destination.href);
    expect(await page.locator('script[src*="analytics"],script[src*="googletagmanager"]').count()).toBe(0);
    if (await page.locator('[data-print]').count()) {
      await page.locator('[data-print]').click();
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    }
  }
  await page.goto('/'); // Actual outgoing Home navigation/referrer also checked.
  await observed.finish();
  expect(observed.requests.filter(request => JSON.stringify(request).includes(marker))).toEqual([]);
  expect(observed.requests.filter(request => request.method !== 'GET')).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await testInfo.attach('generated-context-network.json', { body: JSON.stringify(observed.requests, null, 2), contentType: 'application/json' });
});

test('Local fragments survive real new-tab links, reload, history, picker switching and neutral routes', async ({ page, context }) => {
  const { job } = await seed(page);
  await page.goto(localJobHref('/tools/workshop/inspection-estimate/', job.id));
  await page.reload();
  await expect(page.locator('#main')).toHaveAttribute('data-selected-job', marker);
  const link = page.locator('[data-step-link="parts-inventory"]');
  await link.evaluate(link => { (link as HTMLAnchorElement).target = '_blank'; });
  const newTab = context.waitForEvent('page'); await link.click(); const other = await newTab;
  await expect(other.locator('#main')).toHaveAttribute('data-selected-job', marker);
  await other.reload(); await expect(other.locator('#movement-form [name="jobId"]')).toHaveValue(marker);
  await other.locator('#movement-form [name="jobId"]').selectOption(marker + '_SECOND');
  await expect(other.locator('#main')).toHaveAttribute('data-selected-job', marker + '_SECOND');
  await other.reload(); await expect(other.locator('#movement-form [name="jobId"]')).toHaveValue(marker + '_SECOND');
  await other.close();
  await page.locator('[data-step-link="queue"]').click();
  await page.goBack(); await expect(page.locator('#main')).toHaveAttribute('data-workshop-step', 'inspection');
  await expect(page.locator('#main')).toHaveAttribute('data-selected-job', marker);
  await page.goForward(); await expect(page.locator('#main')).toHaveAttribute('data-workshop-step', 'queue');
  await page.getByRole('link', { name: 'Clear job context', exact: true }).click();
  await expect(page.locator('#workshop-job-context')).toBeHidden();
  await page.goto('/tools/workshop/inspection-estimate/');
  await page.locator('#workshop-job-picker a').first().click();
  await expect(page.locator('#main')).toHaveAttribute('data-selected-job', marker);
  await page.getByRole('link', { name: 'Skip to workshop tool' }).evaluate(link => (link as HTMLAnchorElement).click());
  await expect(page.locator('#main')).toHaveAttribute('data-selected-job', marker);
  await page.getByRole('link', { name: 'Start a new job', exact: true }).click();
  await expect(page.getByLabel('Name *')).toHaveValue('');
  expect(new URL(page.url()).hash).toBe('');
});

test('Legacy query entry sends only its unavoidable document request then sanitizes resources and future navigation', async ({ page }, testInfo) => {
  const { raw } = await seed(page), observed = trace(page);
  await page.goto('/tools/workshop/inspection-estimate/?keep=public&job=' + marker);
  await expect(page.locator('#main')).toHaveAttribute('data-selected-job', marker);
  expect(new URL(page.url()).search).toBe('?keep=public');
  expect(new URL(page.url()).hash).toBe('#job=' + marker);
  await page.locator('[data-step-link="work-order"]').click();
  await expect(page.locator('#main')).toHaveAttribute('data-selected-job', marker);
  await page.reload(); await page.goto('/workshop/');
  await observed.finish();
  const leaks = observed.requests.filter(request => JSON.stringify(request).includes(marker));
  expect(leaks).toHaveLength(1);
  expect(leaks[0].url).toContain('/inspection-estimate/?keep=public&job=' + marker);
  expect(JSON.stringify(leaks[0].headers)).not.toContain(marker);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await testInfo.attach('legacy-context-network.json', { body: JSON.stringify(observed.requests, null, 2), contentType: 'application/json' });
});

test('Invalid/repeated/deleted local contexts stay neutral and do not propagate or write records', async ({ page, context }) => {
  const { raw } = await seed(page);
  for (const suffix of ['#job=missing', '#job=%3Cscript%3E', '#job=' + marker + '&job=' + marker, '?job=' + marker + '&job=missing']) {
    await page.goto('/tools/workshop/inspection-estimate/' + suffix);
    await expect(page.locator('#main')).toHaveAttribute('data-workshop-mounted', 'true');
    await expect(page.locator('#workshop-job-context')).toBeHidden();
    await expect(page.locator('#inspection-form')).toBeHidden();
    expect(new URL(page.url()).hash).toBe('');
    for (const destination of workshopPages) await expect(page.locator(`[data-step-link="${destination.id}"]`)).toHaveAttribute('href', destination.href);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  }
  await page.goto('/tools/workshop/inspection-estimate/#job=' + marker);
  const other = await context.newPage(); await other.goto('/workshop/');
  await other.evaluate(key => { const store = JSON.parse(localStorage.getItem(key)!); store.jobs = []; localStorage.setItem(key, JSON.stringify(store)); }, key);
  await expect(page.locator('#workshop-job-context')).toBeHidden();
  expect(new URL(page.url()).hash).toBe('');
  await page.locator('[data-step-link="work-order"]').click();
  await expect(page.locator('#work-order-form')).toBeHidden(); await other.close();
});

test('Every analyzer/Photo tool strips fragment context from native sharing, clipboard fallback and outgoing requests', async ({ page }) => {
  await seed(page); const observed = trace(page);
  for (const slug of ['sound-analyzer', 'engine-sound-analyzer', 'speaker-sound-analyzer', 'photo-measurement']) {
    await page.goto(`/tools/${slug}/#job=${marker}`);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => Reflect.set(window, 'qaShare', data) });
    });
    await page.getByRole('button', { name: 'Share tool', exact: true }).click();
    expect(await page.evaluate(() => Reflect.get(window, 'qaShare').url)).toBe(`https://workshopgirl.com/tools/${slug}/`);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => Reflect.set(window, 'qaCopied', text) } });
    });
    await page.getByRole('button', { name: 'Share tool', exact: true }).click();
    expect(await page.evaluate(() => Reflect.get(window, 'qaCopied'))).toBe(`https://workshopgirl.com/tools/${slug}/`);
    await page.getByRole('link', { name: 'Workshop', exact: true }).first().click();
  }
  await page.goto(`/tools/dsp-validation/#job=${marker}`); await page.goto('/');
  await observed.finish();
  expect(observed.requests.filter(request => JSON.stringify(request).includes(marker))).toEqual([]);
});
