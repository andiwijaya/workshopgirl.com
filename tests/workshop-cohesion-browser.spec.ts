import { test, expect } from '@playwright/test';

test('Local workshop entry resumes actual jobs and offers useful empty states at six viewports', async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.goto('/workshop/');
  await expect(page.locator('#resume-jobs')).toContainText('No active local jobs');
  await expect(page.locator('[data-local-count="active"]')).toHaveText('0');
  await page.getByRole('link', { name: 'Start a Workshop Job', exact: true }).click();
  await page.getByLabel('Name *').fill('Synthetic Cohesion'); await page.getByLabel('License plate *').fill('QA-COHESION');
  await page.getByRole('button', { name: 'Save intake', exact: true }).click();
  await expect(page.locator('.job-progress')).toContainText('Intake: Recorded');
  await expect(page.locator('.job-progress')).toContainText('Inspection: Not recorded');
  const href = await page.locator('#continue-inspection').getAttribute('href');
  await page.goto('/workshop/');
  await expect(page.locator('[data-local-count="active"]')).toHaveText('1');
  await expect(page.locator('#resume-jobs a')).toHaveAttribute('href', href!);
  for (const [width, height] of [[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (info.project.name === 'chromium-desktop') await page.screenshot({ path: info.outputPath(`workshop-${width}.png`), fullPage: true });
  }
  await page.locator('#resume-jobs a').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#workshop-job-context')).toContainText('QA-COHESION');
  await page.getByRole('link', { name: 'Clear job context', exact: true }).click();
  await expect(page.locator('#workshop-job-context')).toBeHidden();
  await page.evaluate(() => localStorage.clear());
  for (const route of ['inspection-estimate','work-order','qc-handover','queue','parts-inventory','billing','service-history','procurement']) {
    await page.goto(`/tools/workshop/${route}/`);
    await expect(page.locator('#workshop-empty')).toBeVisible();
    await expect(page.locator('.local-storage-note')).toContainText('no server backup');
    await expect(page.locator('#workshop-empty a')).toHaveAttribute('href', '/tools/workshop/vehicle-intake/');
  }
});
