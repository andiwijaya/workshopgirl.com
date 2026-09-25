import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { syntheticMicrophone, audioState, upload, wav } from './audio-fixtures';
import { validateMeasurementExport } from '../src/lib/measurement/export';

const engine = '/tools/engine-sound-analyzer/', reference = '/tools/dsp-validation/';
async function audioAvailable(page: Page) { await page.goto(engine); test.skip(!await page.evaluate(() => !!window.AudioContext), 'Windows WebKit has no AudioContext; physical audio remains untested.'); }
async function resourceProbe(page: Page) {
  await page.addInitScript(() => {
    const state = { workers: 0, terminated: 0, created: 0, revoked: 0, hold: false };
    Object.assign(window, { validationResources: state });
    const Original = Worker;
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); state.workers++; }
      terminate() { state.terminated++; super.terminate(); }
      postMessage(message: unknown, options?: Transferable[] | StructuredSerializeOptions) { if (!state.hold) super.postMessage(message, Array.isArray(options) ? { transfer: options } : options); }
    };
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { state.created++; return create(blob); };
    URL.revokeObjectURL = url => { state.revoked++; revoke(url); };
  });
}
const resources = (page: Page) => page.evaluate(() => (window as unknown as { validationResources: { workers: number; terminated: number; created: number; revoked: number; hold: boolean } }).validationResources);

test('V3 live quality, bounded repeats, contextual A/B and local JSON export without recording', async ({ page }, info) => {
  await audioAvailable(page); await syntheticMicrophone(page); await resourceProbe(page);
  await page.addInitScript(() => Object.defineProperty(window, 'MediaRecorder', { value: undefined }));
  const errors: string[] = [], posts: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.method() !== 'GET') posts.push(r.url()); });
  await page.goto(engine); await page.locator('#engine-rpm').fill('1800');
  await page.getByText('Engine & harmonic references', { exact: true }).click(); await page.locator('#harmonic-hz').fill('440');
  await page.getByText('Measurement notes, repeatability & export', { exact: true }).click();
  await page.locator('#measurement-label').fill('Warm idle'); await page.locator('#measurement-notes').fill('Same position <script>test</script>');
  await page.locator('#start-mic').click(); await expect(page.locator('#measurement-quality-summary')).toContainText('No flagged observations', { timeout: 10000 });
  await page.locator('#save-a').click();
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(220); await page.locator('#capture-repeat').click(); }
  await expect(page.locator('#repeatability-status')).toContainText('6/6'); await expect(page.locator('#capture-repeat')).toBeDisabled();
  await expect(page.locator('#repeatability-status')).toContainText(/GOOD MATCH|CONTEXT UNVERIFIED/);
  await expect(page.locator('#repeatability-pairs li')).toHaveCount(15); await expect(page.locator('#repeatability-pairs').locator('li').first()).toContainText('shape overlap 1.00');
  await page.locator('#engine-rpm').fill('1500'); await page.locator('#save-b').click(); await expect(page.locator('#comparison-quality-status')).toContainText('CONDITIONS DIFFER');
  await page.getByText('Physical-device validation log', { exact: true }).click(); await page.locator('#validation-browser').selectOption('Android Chrome'); await page.locator('#device-check-0').selectOption('Passed'); await page.locator('#validation-notes').fill('Emulated browser test only; not a physical phone.');
  await expect(page.locator('#browser-evidence')).toContainText('Input/display latency is not measured');
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-measurements').click(); const download = await downloadPromise;
  await download.saveAs(info.outputPath('measurements.json'));
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(validateMeasurementExport(data)).toEqual([]); expect(data.measurements).toHaveLength(9); expect(data.deviceValidation.checks[0].result).toBe('Passed');
  expect(data.measurements[0].notes).toContain('<script>test</script>'); expect(data.comparisons.ab.status).toBe('CONDITIONS DIFFER');
  for (const key of ['samples', 'deviceId', 'groupId', 'userAgent']) expect(JSON.stringify(data)).not.toContain(`"${key}"`);
  await expect.poll(async () => { const r = await resources(page); return r.created === r.revoked; }).toBe(true);
  for (const [width, height] of [[320, 700], [390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('.measurement-quality').screenshot({ path: info.outputPath('measurement-quality.png') });
  await page.locator('#stop-analysis').click(); await expect.poll(async () => (await audioState(page)).contexts.every(s => s === 'closed')).toBe(true);
  await expect(page.locator('#browser-evidence')).toContainText('Ended:');
  await page.locator('#clear-repeats').click(); await expect(page.locator('#repeatability-status')).toContainText('0/6');
  expect(errors).toEqual([]); expect(posts).toEqual([]);
});

test('V3 silence/file metadata and invalid references remain honest on export', async ({ page }) => {
  await audioAvailable(page); await page.goto(engine); await upload(page, wav([440], 0, 1));
  await expect(page.locator('#measurement-quality-issues')).toContainText('very low'); await expect(page.locator('#measurement-quality-issues')).toContainText('Within-file', { ignoreCase: true });
  await page.getByText('Measurement notes, repeatability & export', { exact: true }).click(); await page.locator('#capture-repeat').click(); await page.locator('#capture-repeat').click();
  await expect(page.locator('#repeatability-status')).toContainText('LOW SIGNAL');
  const pending = page.waitForEvent('download'); await page.locator('#export-measurements').click(); const data = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(data.measurements[0].spectrum.rmsDbFS).toBeNull(); expect(data.measurements[0].durationSeconds).toBe(1); expect(data.measurements[0].quality.stabilityAvailable).toBe(false);
  await page.locator('#engine-rpm').fill('-1'); await expect(page.locator('#capture-repeat')).toBeDisabled();
});

test('Reference validation runs all known cases locally and exports actual checks', async ({ page, request }, info) => {
  await resourceProbe(page);
  await page.addInitScript(() => { Object.defineProperty(window, 'AudioContext', { value: undefined }); });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(reference);
  for (const name of ['100 Hz', '440 Hz', '1000 Hz', 'Multi-tone', 'Harmonic series', 'Amplitude ×2', 'Noise + tone']) {
    await page.locator('#reference-case').selectOption(name); await page.locator('#run-reference').click(); await expect(page.locator('#reference-status')).toContainText(`PASS · ${name}`); await expect(page.locator('#reference-results')).not.toContainText('FAIL');
  }
  const pending = page.waitForEvent('download'); await page.locator('#export-reference').click(); const downloaded = await pending; await downloaded.saveAs(info.outputPath('reference.json')); const doc = JSON.parse(await readFile((await downloaded.path())!, 'utf8'));
  expect(doc.schemaVersion).toBe('workshopgirl.reference-validation/1'); expect(doc.validation.passed).toBe(true); expect(doc.scope).toContain('No microphone');
  await expect.poll(async () => { const r = await resources(page); return r.created === r.revoked; }).toBe(true);
  const r = await resources(page); expect(r.workers).toBe(7); expect(r.terminated).toBe(7);
  for (const [width, height] of [[320, 700], [390, 844], [844, 390]]) { await page.setViewportSize({ width, height }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.locator('.validation-workbench').screenshot({ path: info.outputPath('reference-validation.png') });
  expect((await (await request.get('/sitemap-0.xml')).text())).toContain(reference); expect((await request.get('/schemas/measurement-v1.schema.json')).ok()).toBe(true);
  expect(errors).toEqual([]);
});

test('Reference worker cancellation, navigation cleanup and missing APIs are recoverable', async ({ page }) => {
  await resourceProbe(page); await page.goto(reference);
  await page.evaluate(() => { (window as unknown as { validationResources: { hold: boolean } }).validationResources.hold = true; });
  await page.locator('#run-reference').click(); await page.locator('#cancel-reference').click(); await expect(page.locator('#reference-status')).toContainText('Cancelled');
  expect((await resources(page)).terminated).toBe(1);
  await page.locator('#run-reference').click(); await page.evaluate(() => document.dispatchEvent(new Event('astro:before-swap'))); expect((await resources(page)).terminated).toBe(2);
  await page.reload(); await page.locator('#run-reference').click(); await expect(page.locator('#reference-status')).toContainText('PASS');
  await page.evaluate(() => Object.defineProperty(window, 'Worker', { value: undefined })); await page.locator('#run-reference').click(); await expect(page.locator('#reference-status')).toContainText('does not support');
});
