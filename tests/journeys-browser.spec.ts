import { test, expect } from '@playwright/test';

test('engine, brake, oil and spark-plug journeys link relevant learning and deliberate local jobs', async ({ page, request }) => {
  test.setTimeout(60_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for(const route of ['/tools/engine-sound-analyzer/', '/tutorials/how-to-replace-brake-pads/', '/tutorials/how-to-change-engine-oil/', '/tutorials/how-to-change-spark-plugs/', '/tutorials/engine-air-filter/']) {
    await page.goto(route); const journey = page.locator('[data-journey]'); await expect(journey).toHaveCount(1);
    expect(await journey.locator(':scope > ul a').count()).toBeLessThanOrEqual(4);
    if(route.includes('engine-sound')) {
      await expect(journey).toContainText('Spectral peaks do not prove a specific fault');
      for(const slug of ['how-to-change-spark-plugs', 'engine-air-filter', 'how-to-change-engine-oil']) await expect(journey.locator('a[href="/tutorials/'+slug+'/"]')).toBeVisible();
    }
    if(route.includes('brake') || route.includes('engine-oil')) {
      await journey.getByText('Continue an existing job through the workflow', { exact: true }).click();
      for(const slug of ['inspection-estimate','work-order','qc-handover','service-history']) await expect(journey.locator('a[href="/tools/workshop/'+slug+'/"]')).toBeVisible();
    }
    for(const href of await journey.locator('a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')!))) expect((await request.get(href)).ok(),href).toBe(true);
    const start=journey.locator('a[href="/tools/workshop/vehicle-intake/"]'); await start.click(); await expect(page).toHaveURL(/\/vehicle-intake\/$/); await expect(page.getByLabel('Name *')).toHaveValue('');
  }
  expect(errors).toEqual([]);
});

test('operator stage and support navigation preserve a selected job without numbering support as stages', async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.goto('/tools/workshop/vehicle-intake/'); await page.getByLabel('Name *').fill('Synthetic Journey'); await page.getByLabel('License plate *').fill('WG-JOURNEY'); await page.getByRole('button', { name:'Save intake',exact:true }).click();
  const id=new URL(page.url()).searchParams.get('job')!;
  const workflow=page.getByRole('navigation',{name:'Workshop job pages'}), support=page.getByRole('navigation',{name:'Supporting workshop operations'});
  await expect(workflow.locator('[data-step-link]')).toHaveCount(4); await expect(support.locator('[data-step-link]')).toHaveCount(5); await expect(support.locator('a span')).toHaveCount(0);
  for(const [width,height] of [[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]]) {
    await page.setViewportSize({width,height}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const link of await page.locator('[data-step-link]').all()) expect(new URL((await link.getAttribute('href'))!,page.url()).searchParams.get('job')).toBe(id);
    if(info.project.name==='chromium-desktop') await page.screenshot({path:info.outputPath('operator-'+width+'.png'),fullPage:true});
  }
  await page.locator('[data-step-link="inspection"]').click(); await expect(page.locator('#workshop-job-context')).toContainText('WG-JOURNEY');
  await page.locator('[data-step-link="parts-inventory"]').click(); await expect(page.locator('#workshop-job-context')).toContainText('WG-JOURNEY');
  expect(new URL(page.url()).searchParams.get('job')).toBe(id);
});
