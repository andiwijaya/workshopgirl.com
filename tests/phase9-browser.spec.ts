import { test, expect } from '@playwright/test';
import { tutorials } from '../src/data/tutorials';
import { journeyForPath } from '../src/data/journeys';
import { syntheticWorkshop, syntheticObservation } from './observation-fixtures';
import { pngFixture } from './photo-fixtures';
import { upload, wav } from './audio-fixtures';

const key = 'workshopgirl.workshop.operations.v1';
const sizes = [[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]];

test('Every tutorial uses shared subjects and contextual journeys; Reference exposes the four existing explainers', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/tutorials/#reference');
  await expect(page.locator('#reference article')).toHaveCount(4);
  for (const guide of tutorials) {
    await page.goto(guide.slug);
    await expect(page.locator('meta[property="article:section"]')).toHaveAttribute('content', guide.category);
    const topics = page.getByRole('navigation', { name: 'Tutorial subjects' });
    await expect(topics).toContainText('Learn');
    for (const href of await topics.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))) expect(href).toMatch(/^\/tutorials\/(#(automotive|woodworking|electrical|tools-machines|reference))?$/);
    await expect(page.locator('[data-journey]')).toHaveCount(journeyForPath(guide.slug) ? 1 : 0);
  }
  await page.goto('/tutorials/types-of-clamps-explained/');
  await page.locator('[data-journey] a[href="/tools/photo-measurement/"]').click();
  await expect(page.locator('#photo-lab')).toBeVisible();
});

test('Existing character images keep natural proportions and layouts fit all six viewports', async ({ page }, info) => {
  test.setTimeout(180_000);
  const routes = ['/', '/tutorials/', '/stories/', '/about/', '/tutorials/how-to-use-a-jigsaw/', '/tutorials/socket-ratchet-sizes-explained', '/tools/', '/tools/workshop/parts-inventory/', '/tools/workshop/procurement/', '/tools/workshop/billing/'];
  for (const [width,height] of sizes) {
    await page.setViewportSize({ width,height });
    for (const route of routes) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' at ' + width).toBe(true);
      const distorted = await page.locator('main img').evaluateAll(nodes => nodes.filter(node => {
        const img = node as HTMLImageElement, style = getComputedStyle(img), box = img.getBoundingClientRect();
        return img.complete && img.naturalWidth > 0 && style.objectFit === 'fill' && Math.abs(box.width/box.height - img.naturalWidth/img.naturalHeight) > .01;
      }).map(node => (node as HTMLImageElement).src));
      expect(distorted, route).toEqual([]);
      if (route === '/') {
        // Scroll naturally to trigger lazy cards before reviewing a full-page image.
        for (const img of await page.locator('main img').all()) { await img.scrollIntoViewIfNeeded(); await expect.poll(() => img.evaluate(node => { const image=node as HTMLImageElement;return image.complete&&image.naturalWidth>0; })).toBe(true); }
        await page.evaluate(() => scrollTo(0,0));
        const portrait = page.locator('.portrait img');
        await expect(portrait).toHaveCSS('object-fit', 'contain');
        expect(await portrait.evaluate(node => { const img = node as HTMLImageElement, box = img.getBoundingClientRect(); return Math.abs(box.width / box.height - img.naturalWidth / img.naturalHeight); })).toBeLessThan(.001);
        await page.locator('.portrait').screenshot({ path: info.outputPath('character-' + width + '.png') });
        if (width === 390 || width === 1280) await page.screenshot({ path: info.outputPath('home-' + width + '.png'), fullPage: true });
      }
    }
  }
});

test('Workshop controls stay inert while modules load, then restore old records before accepting input', async ({ page }) => {
  const { store } = syntheticWorkshop();
  const raw = JSON.stringify({ ...store, version: 1 });
  await page.goto('/workshop/'); await page.evaluate(({ key,raw }) => localStorage.setItem(key,raw), { key,raw });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_astro/*.js', async route => { await gate; await route.continue(); });
  try {
    await page.goto('/tools/workshop/vehicle-intake/#job=' + store.jobs[0].id, { waitUntil: 'commit' });
    await expect(page.locator('[data-workshop-controls]')).toHaveAttribute('inert', '');
    await expect(page.locator('#workshop-loading')).toBeVisible();
    expect(await page.getByLabel('Name *').evaluate(node => { (node as HTMLElement).focus(); return document.activeElement === node; })).toBe(false);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  } finally { release(); }
  await expect(page.locator('#main')).toHaveAttribute('data-workshop-mounted', 'true');
  await expect(page.locator('[data-workshop-controls]')).not.toHaveAttribute('inert');
  await expect(page.getByLabel('Name *')).toHaveValue('Synthetic Observation QA');
  await expect(page.locator('#workshop-loading')).toBeHidden();
});

test('Repeated quota failures retain intake and inventory inputs, original records and one successful retry', async ({ page }) => {
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { quotaBlocked: true });
    Storage.prototype.setItem = function(k,v) { if (k === key && Reflect.get(window, 'quotaBlocked')) throw new DOMException('Synthetic quota', 'QuotaExceededError'); return original.call(this,k,v); };
  }, key);
  await page.goto('/tools/workshop/vehicle-intake/');
  await page.getByLabel('Name *').fill('Synthetic Quota Retry'); await page.getByLabel('License plate *').fill('QA-RETRY');
  for (let i=0;i<3;i++) {
    await page.getByRole('button', { name: 'Save intake', exact: true }).click();
    await expect(page.locator('#workshop-status')).toContainText('not saved');
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
    await expect(page.getByLabel('Name *')).toHaveValue('Synthetic Quota Retry');
  }
  await page.evaluate(() => Reflect.set(window, 'quotaBlocked', false));
  await page.getByRole('button', { name: 'Save intake', exact: true }).click();
  await expect(page.locator('#next-inspection')).toBeVisible();
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  expect(JSON.parse(before!).jobs).toHaveLength(1);
  await page.evaluate(() => Reflect.set(window, 'quotaBlocked', true));
  await page.getByLabel('Name *').fill('Synthetic Updated Retry');
  await page.getByRole('button', { name: 'Save intake', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  await page.evaluate(() => Reflect.set(window, 'quotaBlocked', false));
  await page.getByRole('button', { name: 'Save intake', exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).jobs.length, key)).toBe(1);
  await page.goto('/tools/workshop/parts-inventory/');
  await page.getByLabel('Part name', { exact: true }).fill('Synthetic Retained Part'); await page.getByLabel('Opening balance').fill('2');
  const old = await page.evaluate(key => localStorage.getItem(key), key);
  for (let i=0;i<2;i++) { await page.getByRole('button', { name: 'Save part', exact: true }).click(); await expect(page.locator('#parts-feedback')).toContainText('not saved'); await expect(page.getByLabel('Part name', { exact: true })).toHaveValue('Synthetic Retained Part'); expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(old); }
  await page.evaluate(() => Reflect.set(window, 'quotaBlocked', false)); await page.getByRole('button', { name: 'Save part', exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).parts.length, key)).toBe(1);
  await page.locator('#movement-form [name="quantity"]').fill('3'); await page.evaluate(() => Reflect.set(window, 'quotaBlocked', true));
  await page.getByRole('button', { name: 'Record movement', exact: true }).click(); await expect(page.locator('#parts-feedback')).toContainText('not saved'); await expect(page.locator('#movement-form [name="quantity"]')).toHaveValue('3');
  await page.evaluate(() => Reflect.set(window, 'quotaBlocked', false)); await page.getByRole('button', { name: 'Record movement', exact: true }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(saved.partMovements).toHaveLength(2); await expect(page.locator('#parts-list')).toContainText('5 each on hand');
});

test('Private synthetic records, observations, image and audio names/notes never reach requests or canonical shares', async ({ page }) => {
  test.setTimeout(90_000);
  const sentinel = 'QA_PRIVATE_NO_TRANSPORT', { store,job } = syntheticWorkshop();
  store.customers[0].name = sentinel; store.customers[0].phone = sentinel; store.vehicles[0].plate = sentinel;
  job.intake.complaint = sentinel; const observation = syntheticObservation(); observation.notes = sentinel; job.observations = [observation];
  await page.goto('/workshop/'); await page.evaluate(({ key,store }) => localStorage.setItem(key,JSON.stringify(store)), { key,store });
  const leaks: string[] = [], nonGets: string[] = [];
  page.on('request', request => { const data = request.url() + JSON.stringify(request.headers()) + (request.postData() ?? ''); if (data.includes(sentinel)) leaks.push(data); if (request.method() !== 'GET') nonGets.push(request.url()); });
  await page.addInitScript(() => { Object.defineProperty(navigator,'share',{configurable:true,value:async (data:ShareData) => Reflect.set(window,'privateShare',data)}); });
  for (const route of ['/tools/workshop/inspection-estimate/#job=' + job.id, '/tools/workshop/work-order/#job=' + job.id, '/tools/engine-sound-analyzer/', '/tools/sound-analyzer/', '/tools/speaker-sound-analyzer/', '/tools/photo-measurement/']) {
    await page.goto(route);
    const button = page.getByRole('button', { name: 'Share tool', exact: true });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await button.click();
    const share = await page.evaluate(() => Reflect.get(window,'privateShare'));
    expect(share.url).toBe('https://workshopgirl.com' + route.split(/[?#]/)[0]); expect(JSON.stringify(share)).not.toContain(sentinel);
    expect(await page.locator('script[src*="googletagmanager"],script[src*="analytics"]').count()).toBe(0);
    if (route === '/tools/photo-measurement/') {
      await page.locator('#photo-file').setInputFiles({ name: sentinel + '.png', mimeType: 'image/png', buffer: pngFixture() }); await expect(page.locator('#photo-status')).toContainText('Image opened locally');
      await page.locator('#photo-notes').fill(sentinel); const download = page.waitForEvent('download'); await page.locator('#photo-json').click(); await download; await page.locator('#photo-clear').click();
    }
    if (route === '/tools/engine-sound-analyzer/' && await page.evaluate(() => !!window.AudioContext)) await upload(page,wav(),sentinel + '.wav');
  }
  await page.goto('/');
  expect(leaks).toEqual([]); expect(nonGets).toEqual([]);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).customers[0].name, key)).toBe(sentinel);
});
