import { workshopJobParams } from '../src/lib/workshop/navigation.ts';
import { test, expect, type Page } from '@playwright/test';

const prefix = '/tools/workshop/';
const tabs = [
  ['intake', 'vehicle-intake'], ['inspection', 'inspection-estimate'], ['work-order', 'work-order'],
  ['qc', 'qc-handover'], ['queue', 'queue'], ['parts-inventory', 'parts-inventory'],
  ['service-history', 'service-history'], ['billing', 'billing'], ['procurement', 'procurement'],
];
const storageKey = 'workshopgirl.workshop.operations.v1';

async function intake(page: Page, suffix = 'A'): Promise<string> {
  await page.goto(prefix + 'vehicle-intake/');
  await page.getByLabel('Name *').fill('Synthetic Navigation ' + suffix);
  await page.getByLabel('License plate *').fill('WG-NAV-' + suffix);
  await page.getByRole('button', { name: 'Save intake', exact: true }).click();
  await expect(page.locator('#next-inspection')).toBeVisible();
  return workshopJobParams(new URL((await page.locator('#continue-inspection').getAttribute('href'))!, 'http://local')).get('job')!;
}

test('Workshop tabs carry one validated job through all nine pages and allow neutral navigation', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const id = await intake(page);
  expect(workshopJobParams(new URL(page.url())).get('job')).toBe(id);
  await expect(page.locator('#workshop-job-context')).toContainText('WG-NAV-A');
  await page.getByRole('button', { name: 'Save intake', exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).jobs.length, storageKey)).toBe(1);
  expect(await page.evaluate(key => {const job=JSON.parse(localStorage.getItem(key)!).jobs[0];return job.intake.number===job.number;}, storageKey)).toBe(true);
  await expect(page.locator('[name="existingCustomerId"]')).toBeDisabled();
  await expect(page.locator('[name="existingVehicleId"]')).toBeHidden();
  for (const [tab, slug] of tabs) {
    const link = page.locator('[data-step-link="' + tab + '"]');
    await expect(link).toHaveAttribute('href', prefix + slug + '/#job=' + encodeURIComponent(id));
    await link.click();
    expect(workshopJobParams(new URL(page.url())).get('job')).toBe(id);
    await expect(page.locator('#workshop-job-context')).toContainText('WG-NAV-A');
    await expect(page.locator('[data-step-link="' + tab + '"]')).toHaveAttribute('aria-current', 'page');
  }
  await page.getByRole('link', { name: 'Clear job context', exact: true }).click();
  expect(workshopJobParams(new URL(page.url())).has('job')).toBe(false);
  await expect(page.locator('#workshop-job-context')).toBeHidden();
  for (const [tab, slug] of tabs) await expect(page.locator('[data-step-link="' + tab + '"]')).toHaveAttribute('href', prefix + slug + '/');
  await page.goto(prefix + 'inspection-estimate/#job=' + id);
  await page.getByRole('link', { name: 'All jobs', exact: true }).click();
  expect(workshopJobParams(new URL(page.url())).has('job')).toBe(false);
  await expect(page.locator('#queue-list')).toContainText('WG-NAV-A');
  await page.goto(prefix + 'inspection-estimate/#job=' + id);
  await page.getByRole('link', { name: 'Start a new job', exact: true }).click();
  expect(workshopJobParams(new URL(page.url())).has('job')).toBe(false);
  await expect(page.getByLabel('Name *')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('Missing, malformed, repeated and deleted job IDs never propagate or alter saved records', async ({ page }) => {
  test.setTimeout(60_000);
  const id = await intake(page);
  for (const query of ['', '#job=', '#job=missing', '#job=%3Cscript%3E', '#job=' + id + '&job=missing']) {
    await page.goto(prefix + 'inspection-estimate/' + query);
    await expect(page.locator('#workshop-job-context')).toBeHidden();
    await expect(page.locator('#inspection-form')).toBeHidden();
    for (const [tab, slug] of tabs) await expect(page.locator('[data-step-link="' + tab + '"]')).toHaveAttribute('href', prefix + slug + '/');
  }
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).jobs.length, storageKey)).toBe(1);
  await page.goto(prefix + 'inspection-estimate/#job=' + id);
  const other = await page.context().newPage();
  await other.goto(prefix + 'queue/');
  await other.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)!); data.jobs = []; localStorage.setItem(key, JSON.stringify(data)); }, storageKey);
  await expect(page.locator('#workshop-job-context')).toBeHidden();
  await expect(page.locator('[data-step-link="queue"]')).toHaveAttribute('href', prefix + 'queue/');
  await other.close();
  await page.reload();
  await expect(page.locator('#inspection-form')).toBeHidden();
});

test('Selecting another job via local picker or Parts changes the navigation context', async ({ page }) => {
  const first = await intake(page, 'A'), second = await intake(page, 'B');
  await page.goto(prefix + 'inspection-estimate/');
  await page.locator('#workshop-job-picker a[href$="#job=' + first + '"]').click();
  await expect(page.locator('#workshop-job-context')).toContainText('WG-NAV-A');
  await page.locator('[data-step-link="parts-inventory"]').click();
  await expect(page.locator('#movement-form [name="jobId"]')).toHaveValue(first);
  await page.locator('#movement-form [name="jobId"]').selectOption(second);
  await expect(page.locator('#workshop-job-context')).toContainText('WG-NAV-B');
  await expect(page.locator('[data-step-link="work-order"]')).toHaveAttribute('href', prefix + 'work-order/#job=' + second);
  for(const width of [320,390,430]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'selected Parts job at '+width).toBe(true);}
  await page.locator('#movement-form [name="jobId"]').selectOption('');
  await expect(page.locator('#workshop-job-context')).toBeHidden();
  expect(workshopJobParams(new URL(page.url())).has('job')).toBe(false);
});

test('Generic print actions work for intake, queue and parts; record-specific modules have no dead generic action', async ({ page }) => {
  await intake(page);
  await page.evaluate(() => { window.print = () => { const state = window as Window & { printCalls?: number }; state.printCalls = (state.printCalls ?? 0) + 1; }; });
  await page.locator('[data-print]').click();
  await expect(page.locator('#print-sheet')).toBeVisible();
  await expect(page.locator('#print-content')).toContainText('Synthetic Navigation A');
  expect(await page.evaluate(() => (window as Window & { printCalls?: number }).printCalls)).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#print-sheet')).toBeHidden();
  await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event('afterprint')); });
  await page.locator('[data-print]').click();
  await expect(page.locator('#print-sheet')).toBeHidden();
  for (const slug of ['queue', 'parts-inventory']) {
    await page.goto(prefix + slug + '/');
    await page.evaluate(() => { window.print = () => { (window as Window & { printCalls?: number }).printCalls = 1; }; });
    await page.locator('[data-print]').click();
    await expect(page.locator('#print-sheet')).toBeVisible();
    await expect(page.locator('#print-title')).toContainText(slug === 'queue' ? 'Queue summary' : 'Inventory summary');
    await expect(page.locator('#print-content')).toContainText(slug === 'queue' ? 'WG-NAV-A' : 'No local parts recorded.');
    expect(await page.evaluate(() => (window as Window & { printCalls?: number }).printCalls)).toBe(1);
  }
  for (const slug of ['service-history', 'billing', 'procurement']) {
    await page.goto(prefix + slug + '/');
    await expect(page.locator('[data-print]')).toHaveCount(0);
  }
});

test('Sharing a Workshop page uses the canonical URL and excludes the selected local job', async ({ page }) => {
  const id = await intake(page);
  await page.goto(prefix + 'inspection-estimate/#job=' + id);
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { (window as Window & { sharedUrl?: string }).sharedUrl = data.url; } }); });
  await page.getByRole('button', { name: 'Share tool' }).click();
  await expect(page.locator('.tool-share-status')).toContainText('Share sheet opened');
  expect(await page.evaluate(() => (window as Window & { sharedUrl?: string }).sharedUrl)).toBe('https://workshopgirl.com' + prefix + 'inspection-estimate/');
});

test('Header/footer, mobile Escape focus, copy and structural layouts work at every requested viewport', async ({ page }, info) => {
  test.setTimeout(90_000);
  const sizes = [[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]];
  const id = await intake(page);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const route of ['/', '/tools/', prefix + 'inspection-estimate/#job=' + id]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' at ' + width).toBe(true);
      const footer = page.getByRole('navigation', { name: 'Footer navigation' });
      await expect(footer.getByRole('link', { name: 'Stories', exact: true })).toHaveAttribute('href', '/stories/');
      const current = route === '/' ? 'Home' : route === '/tools/' ? 'Tools' : 'Workshop';
      await expect(footer.getByRole('link', { name: current, exact: true })).toHaveAttribute('aria-current', 'page');
      if (width < 761) {
        const toggle = page.getByRole('button', { name: 'Menu', exact: true });
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const sport = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Stories', exact: true });
        await sport.focus();
        await page.keyboard.press('Escape');
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      }
      if (route === '/') await expect(page.getByText('The workshop is opening soon', { exact: true })).toHaveCount(0);
      if (info.project.name === 'chromium-desktop') await page.screenshot({ path: info.outputPath('phase1-' + width + '-' + (route === '/' ? 'home' : route === '/tools/' ? 'tools' : 'workshop') + '.png'), fullPage: true });
    }
  }
});

test('Every legacy slashless tutorial and its slash alias share the intended canonical', async ({ page }) => {
  test.setTimeout(60_000);
  const slugs = ['cordless-drill-vs-impact-driver','drill-bit-types-explained','socket-ratchet-sizes-explained','jigsaw-vs-circular-saw','types-of-clamps-explained','how-to-use-a-multimeter','angle-grinder-basics','how-to-use-a-circular-saw','how-to-solder-wires'];
  for (const slug of slugs) for (const suffix of ['', '/']) {
    const response = await page.goto('/tutorials/' + slug + suffix);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://workshopgirl.com/tutorials/' + slug);
  }
  await page.goto('/tools/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Digital Workbench.*parts and billing/);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /Digital Workbench.*parts and billing/);
});
