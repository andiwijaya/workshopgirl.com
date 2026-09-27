import { test, expect } from '@playwright/test';

test('Workshop Operations connects intake, inspection, work order and QC on one local job', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tools/workshop/vehicle-intake/');
  await expect(page).toHaveTitle(/Vehicle Intake/);
  await page.getByLabel('Name *').fill('Local Test Customer');await page.getByLabel('Phone').fill('555-0100');await page.getByLabel('License plate *').fill('WG-TEST-01');await page.getByLabel('Make').fill('Honda');await page.getByLabel('Model').fill('CB500');await page.getByLabel('Complaint / reason for visit').fill('Front brake noise');
  await page.getByRole('button',{name:'Save intake'}).click();await expect(page.locator('#next-inspection')).toBeVisible();
  const jobUrl=await page.locator('#continue-inspection').getAttribute('href');expect(jobUrl).toContain('?job=');
  const jobId=new URL(jobUrl!,'http://local').searchParams.get('job')!;await page.goto(`/tools/workshop/vehicle-intake/?job=${encodeURIComponent(jobId)}`);await expect(page.locator('[name="customerName"]')).toHaveValue('Local Test Customer');await expect(page.locator('[name="plate"]')).toHaveValue('WG-TEST-01');await page.getByRole('button',{name:'Save intake'}).click();await page.locator('#continue-inspection').click();await expect(page.locator('#workshop-job-context')).toContainText('WG-TEST-01');await expect(page.locator('#inspection-context')).toContainText('Front brake noise');
  await page.locator('[name="findings"]').fill('Brake pads worn');await page.locator('#recommended-rows input[name="name"]').first().fill('Replace front pads');await page.locator('#recommended-rows input[type="checkbox"]').check();await page.locator('#estimate-parts input[name="name"]').first().fill('Brake pad set');await page.locator('#estimate-parts input[name="unitPrice"]').first().fill('45');await expect(page.locator('#estimate-summary')).toContainText(/Total Rp\s*45/);
  await page.getByRole('button',{name:/Save inspection/}).click();await expect(page.locator('#next-work-order')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('workshopgirl.workshop.operations.v1')!).jobs[0].inspection.recommendedJobs[0])).toMatchObject({name:'Replace front pads',approved:true});await page.locator('#continue-work-order').click();await expect(page.locator('#work-order-context')).toContainText('Front brake noise');await expect(page.locator('#approved-work input[name="name"]').first()).toHaveValue('Replace front pads');
  await page.getByRole('button',{name:'Add actual work'}).click();await page.locator('#actual-work input[name="name"]').first().fill('Replaced front brake pads');await page.locator('[name="result"]').fill('Brakes operate normally');await page.getByRole('button',{name:'Save Work Order'}).click();await expect(page.locator('#next-qc')).toBeVisible();await page.locator('#continue-qc').click();await expect(page.locator('#qc-context')).toContainText('Brakes operate normally');
  await page.locator('select[name^="qccheck:"]').evaluateAll(nodes=>nodes.forEach(n=>(n as HTMLSelectElement).value='Pass'));
  await page.locator('select[name="finalStatus"]').selectOption('Ready for handover');
  await page.locator('select[name="qccheck:0"]').selectOption('Needs attention');await page.getByRole('button',{name:'Complete job'}).click();await expect(page.locator('#qc-error')).toContainText('Complete all QC checks');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('workshopgirl.workshop.operations.v1')!).jobs[0].status)).not.toBe('completed');await page.locator('select[name="qccheck:0"]').selectOption('Pass');
  await page.getByRole('button',{name:'Complete job'}).click();await expect(page.locator('#job-completed')).toBeVisible();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('workshopgirl.workshop.operations.v1')!));expect(stored.jobs).toHaveLength(1);expect(stored.jobs[0].status).toBe('completed');expect(stored.jobs[0].vehicleId).toBeTruthy();
  await page.reload();await expect(page.locator('#workshop-job-context')).toContainText('WG-TEST-01');await expect(page.locator('#job-completed')).toBeVisible();expect(errors).toEqual([]);
});

test('Workshop pages handle validation, invalid job links, share, print and narrow viewports',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/tools/workshop/vehicle-intake/');
  await page.getByRole('button',{name:'Save intake'}).click();await expect(page.locator('#intake-error')).toContainText('Customer name is required');
  await page.goto('/tools/workshop/inspection-estimate/?job=missing');await expect(page.locator('#workshop-status')).toContainText(/Choose a saved local job/);await expect(page.locator('#inspection-form')).toBeHidden();
  await page.goto('/tools/workshop/vehicle-intake/');await page.getByLabel('Name *').fill('Print Test');await page.getByLabel('License plate *').fill('PRINT-1');await page.getByRole('button',{name:'Save intake'}).click();const url=await page.locator('#continue-inspection').getAttribute('href');await page.goto(url!);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('[data-print]').click();await expect(page.locator('#print-sheet')).toBeVisible();await expect(page.locator('#print-content')).toContainText('Print Test');
  const jobId=new URL(url!, 'http://local').searchParams.get('job')!;const widths=[320,375,390,768,1440];
  for(const route of ['/tools/workshop/vehicle-intake/','/tools/workshop/inspection-estimate/','/tools/workshop/work-order/','/tools/workshop/qc-handover/'])for(const width of widths){await page.setViewportSize({width,height:900});await page.goto(`${route}?job=${encodeURIComponent(jobId)}`);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${route} horizontal overflow at ${width}px`).toBeTruthy();}
  await page.goto('/tools/');await expect(page.getByRole('heading',{name:'Workshop Operations'})).toBeVisible();await expect(page.locator('a[href="/tools/dsp-validation/"]')).toBeVisible();
  for(const width of widths){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`tools index horizontal overflow at ${width}px`).toBeTruthy();}
  expect(errors).toEqual([]);
});

for(const route of ['/tools/workshop/vehicle-intake/','/tools/workshop/inspection-estimate/','/tools/workshop/work-order/','/tools/workshop/qc-handover/'])test(`direct load ${route}`,async({page})=>{await page.goto(route);await expect(page).toHaveTitle(/Workshop Operations/);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://workshopgirl.com${route}`);await expect(page.locator('body')).not.toContainText('bisnis.cc');});
