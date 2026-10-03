import { test, expect } from '@playwright/test';

const sizes = [[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]];
const labels = ['Home', 'Learn', 'Tools', 'Workshop', 'Stories', 'About'];

test('Discovery navigation, keyboard disclosure and current sections work at six viewport sizes', async ({ page, browserName }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const [route, current] of [['/', 'Home'], ['/tutorials/', 'Learn'], ['/tools/', 'Tools'], ['/workshop/', 'Workshop'], ['/stories/', 'Stories'], ['/sport/indoor-rock-climbing/', 'Stories'], ['/tools/workshop/queue/', 'Workshop']]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' at ' + width).toBe(true);
      const nav = page.locator('#site-navigation');
      expect(await nav.getByRole('link', { includeHidden: true }).allTextContents()).toEqual(labels);
      await expect(nav.locator('[aria-current="page"]')).toHaveText(current);
      await expect(page.getByRole('navigation', { name: 'Footer navigation' }).locator('[aria-current="page"]')).toHaveText(current);
      if (width <= 760) {
        const toggle = page.getByRole('button', { name: 'Menu', exact: true });
        await expect(nav).toBeHidden();
        await toggle.focus(); await page.keyboard.press('Enter');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        if (browserName === 'webkit') await nav.getByRole('link', { name: 'Home', exact: true }).focus();
        else await page.keyboard.press('Tab');
        await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
        await nav.getByRole('link', { name: 'About', exact: true }).focus();
        await page.keyboard.press('Escape'); await expect(toggle).toBeFocused(); await expect(nav).toBeHidden();
        await page.keyboard.press('Space'); await expect(nav).toBeVisible();
        const link = nav.getByRole('link', { name: 'Learn', exact: true });
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await page.locator('main').click({ position: { x: 5, y: 5 } }); await expect(nav).toBeHidden();
        await toggle.click(); await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'About' }).focus(); await expect(nav).toBeHidden();
      } else {
        await expect(nav).toBeVisible();
        await nav.getByRole('link', { name: 'Learn', exact: true }).focus();
        expect(await nav.getByRole('link', { name: 'Learn', exact: true }).evaluate(node => getComputedStyle(node).outlineStyle)).toBe('solid');
      }
      if (info.project.name === 'chromium-desktop' && ['/', '/tutorials/', '/workshop/', '/stories/'].includes(route)) await page.screenshot({ path: info.outputPath('discovery-' + width + '-' + (route === '/' ? 'home' : route.split('/')[1]) + '.png'), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test('Learn and Stories expose real legacy pages; Tools links to the separate Workshop entry', async ({ page }) => {
  await page.goto('/tutorials/');
  const subjects = page.getByRole('navigation', { name: 'Learning subjects' });
  await expect(subjects.getByRole('link')).toHaveCount(5);
  await subjects.getByRole('link', { name: /Automotive/ }).click();
  await expect(page).toHaveURL(/#automotive$/);
  await page.locator('#automotive a').filter({ hasText: 'Read the tutorial' }).first().click();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/tutorials\//);
  await page.goto('/stories/');
  await expect(page.getByRole('navigation', { name: 'Story sections' }).getByRole('link')).toHaveCount(3);
  await expect(page.locator('article')).toHaveCount(3);
  await page.getByRole('navigation', { name: 'Story sections' }).getByRole('link', { name: 'Sport' }).click(); await expect(page).toHaveURL(/\/sport\/$/);
  await page.goto('/tools/#workshop-operations');
  await page.getByRole('link', { name: 'Open Workshop', exact: true }).click(); await expect(page).toHaveURL(/\/workshop\/$/);
  await page.getByRole('link', { name: 'Start a Workshop Job', exact: true }).click(); await expect(page).toHaveURL(/\/vehicle-intake\/$/);
});
