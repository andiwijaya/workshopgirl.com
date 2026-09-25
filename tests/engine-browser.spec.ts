import { test, expect, type Page } from '@playwright/test';
import { syntheticMicrophone, audioState, wav, upload } from './audio-fixtures';

const route = '/tools/engine-sound-analyzer/';
async function startLive(page: Page) {
  const toolbarButton = page.locator('#engine-live-toggle');
  if (await toolbarButton.isVisible()) await toolbarButton.click(); else await page.locator('#start-mic').click();
}
async function stopLive(page: Page) {
  const toolbarButton = page.locator('#engine-live-toggle');
  if (await toolbarButton.isVisible()) await toolbarButton.click(); else await page.locator('#stop-analysis').click();
}
test.beforeEach(async ({ page }, info) => {
  if (/^(Engine layout|Engine unsupported)/.test(info.title)) return;
  await page.goto(route);
  test.skip(!await page.evaluate(() => !!window.AudioContext), 'Windows Playwright WebKit has no Web Audio; physical Safari audio remains unverified.');
});
async function instrumentation(page: Page) {
  await page.addInitScript(() => {
    const state = { workers: 0, terminated: 0, nodes: 0, disconnected: 0, portsClosed: 0 };
    Object.assign(window, { captureTest: state });
    const OriginalWorker = window.Worker, OriginalNode = window.AudioWorkletNode;
    window.Worker = class extends OriginalWorker {
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); state.workers++; }
      terminate() { state.terminated++; super.terminate(); }
    };
    if (OriginalNode) window.AudioWorkletNode = class extends OriginalNode {
      constructor(context: BaseAudioContext, name: string, options?: AudioWorkletNodeOptions) {
        super(context, name, options); state.nodes++; Object.assign(window, { nodeToFail: this });
        const close = this.port.close.bind(this.port); this.port.close = () => { state.portsClosed++; close(); };
        const disconnect = this.disconnect.bind(this); this.disconnect = (() => { state.disconnected++; disconnect(); }) as typeof this.disconnect;
      }
    };
  });
}
const captureState = (page: Page) => page.evaluate(() => (window as unknown as { captureTest: { workers: number; terminated: number; nodes: number; disconnected: number; portsClosed: number } }).captureTest);

test('Live worklet engine analysis and A/B need no recording API', async ({ page }, testInfo) => {
  await syntheticMicrophone(page, false, [100, 200, 300, 400]); await instrumentation(page);
  await page.addInitScript(() => Object.defineProperty(window, 'MediaRecorder', { value: undefined }));
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (request.method() !== 'GET') requests.push(request.url()); });
  await page.goto(route);
  await expect(page.locator('#fft-size')).toHaveValue('8192');
  expect((await audioState(page)).calls).toBe(0);
  await page.locator('.engine-settings > summary').click();
  await page.getByText('Engine & harmonic references', { exact: true }).click();
  await page.locator('#harmonic-hz').fill('100'); await page.locator('#engine-rpm').fill('800');
  await page.locator('#engine-cylinders').fill('4'); await page.locator('#engine-cycle').selectOption('4');
  await page.locator('#engine-live-toggle').click();
  await expect(page.locator('#analyzer-technical-note')).toContainText('sample-clock capture');
  await expect(page.locator('#harmonic-summary')).toContainText('4 of 5');
  await expect(page.locator('#persistent-peaks')).toContainText('seen for');
  await expect(page.locator('#record-audio')).toBeDisabled();
  await page.locator('#engine-capture-a').click(); await expect(page.locator('#comparison-summary')).toContainText('A saved');
  await page.locator('#engine-rpm').fill('1500'); await page.locator('#engine-capture-b').click();
  await expect(page.locator('#engine-comparison-warning')).toContainText('RPM differs materially: A 800, B 1500');
  await expect(page.locator('#analyzer-status')).toContainText('Live');
  await expect(page.locator('#playback-panel')).toBeHidden();
  await page.locator('#engine-rpm').fill('800'); await page.locator('#engine-capture-b').click();
  await expect(page.locator('#engine-comparison-warning')).toContainText('Recorded settings agree');
  await page.screenshot({ path: testInfo.outputPath('engine-live.png'), fullPage: true });
  await page.locator('.engine-observations').screenshot({ path: testInfo.outputPath('engine-observations.png') });
  for (const [width, height] of [[320, 700], [844, 390]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('.engine-analysis-grid').screenshot({ path: testInfo.outputPath('engine-landscape-observations.png') });
  await stopLive(page);
  await expect.poll(async () => (await audioState(page)).contexts.every(s => s === 'closed')).toBe(true);
  await expect.poll(async () => (await audioState(page)).tracks.every(s => s === 'ended')).toBe(true);
  const state = await captureState(page); expect(state.nodes).toBe(1); expect(state.workers).toBe(1); expect(state.terminated).toBe(1); expect(state.disconnected).toBe(1); expect(state.portsClosed).toBe(1);
  expect(errors).toEqual([]); expect(requests).toEqual([]);
});

test('Engine live works with blank references and falls back when AudioWorklet is missing', async ({ page }) => {
  await syntheticMicrophone(page);
  await page.addInitScript(() => Object.defineProperty(window, 'AudioWorkletNode', { value: undefined }));
  await page.goto(route); await startLive(page);
  await expect(page.locator('#analyzer-technical-note')).toContainText('sampled fallback');
  await expect(page.locator('#harmonic-summary')).toContainText('strongest peak reference');
  await expect(page.locator('#save-a')).toBeEnabled(); await page.locator('#save-a').click();
  await stopLive(page);
  await expect.poll(async () => (await audioState(page)).tracks.every(s => s === 'ended')).toBe(true);
});

test('Worklet module failure and runtime processor failure degrade to usable sampled analysis', async ({ page }) => {
  await syntheticMicrophone(page); await instrumentation(page);
  await page.addInitScript(() => {
    const state = { fail: true }; Object.assign(window, { moduleTest: state });
    const addModule = Worklet.prototype.addModule;
    Worklet.prototype.addModule = async function(url, options) {
      if (state.fail) throw new Error('Injected module failure');
      await addModule.call(this, url, options);
      const fixture = URL.createObjectURL(new Blob([`registerProcessor('test-failing-pcm', class extends AudioWorkletProcessor {
        constructor() { super(); this.failed = false; this.port.onmessage = e => { if (e.data === 'test-fail') this.failed = true; }; }
        process() { if (this.failed) throw new Error('Injected runtime processor failure'); return true; }
      });`], { type: 'text/javascript' }));
      try { await addModule.call(this, fixture); } finally { URL.revokeObjectURL(fixture); }
    };
    const Original = window.AudioWorkletNode;
    window.AudioWorkletNode = class extends Original {
      constructor(context: BaseAudioContext, _name: string, options?: AudioWorkletNodeOptions) {
        super(context, 'test-failing-pcm', options); Object.assign(window, { nodeToFail: this });
      }
    };
  });
  await page.goto(route); await startLive(page);
  await expect(page.locator('#analyzer-technical-note')).toContainText('sampled fallback');
  await expect(page.locator('#save-a')).toBeEnabled(); await stopLive(page);
  await page.evaluate(() => { (window as unknown as { moduleTest: { fail: boolean } }).moduleTest.fail = false; });
  await startLive(page);
  await expect(page.locator('#analyzer-technical-note')).toContainText('sample-clock capture');
  await page.evaluate(() => (window as unknown as { nodeToFail: AudioWorkletNode }).nodeToFail.port.postMessage('test-fail'));
  await expect(page.locator('#analyzer-technical-note')).toContainText('sampled fallback');
  await expect(page.locator('#analyzer-technical-note')).toContainText('processor stopped');
  await expect(page.locator('#save-a')).toBeEnabled(); await stopLive(page);
  await expect.poll(async () => (await captureState(page)).workers === (await captureState(page)).terminated).toBe(true);
});

test('Stop during worklet module loading prevents stale node/worker creation', async ({ page }) => {
  await syntheticMicrophone(page); await instrumentation(page);
  await page.addInitScript(() => {
    const addModule = Worklet.prototype.addModule;
    Worklet.prototype.addModule = function(url, options) {
      return new Promise<void>((resolve, reject) => { Object.assign(window, { releaseWorklet: () => { void addModule.call(this, url, options).then(resolve, reject); } }); });
    };
  });
  await page.goto(route); await startLive(page);
  await expect.poll(() => page.evaluate(() => 'releaseWorklet' in window)).toBe(true); await stopLive(page);
  await page.evaluate(() => (window as unknown as { releaseWorklet: () => void }).releaseWorklet());
  await expect(page.locator('#start-mic')).toBeEnabled();
  await expect.poll(async () => (await audioState(page)).contexts.every(s => s === 'closed')).toBe(true);
  expect((await captureState(page)).nodes).toBe(0); expect((await captureState(page)).workers).toBe(0);
});

test('A stalled live worker releases resources and falls back without unbounded messages', async ({ page }) => {
  await syntheticMicrophone(page); await instrumentation(page);
  await page.addInitScript(() => {
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function(message: { type: string }, transfer?: Transferable[] | StructuredSerializeOptions) {
      if (message.type !== 'frame') post.call(this, message, Array.isArray(transfer) ? { transfer } : transfer);
    };
  });
  await page.goto(route); await startLive(page);
  await expect(page.locator('#analyzer-technical-note')).toContainText('Continuous capture stalled.');
  await expect(page.locator('#save-a')).toBeEnabled();
  const state = await captureState(page); expect(state.workers).toBe(1); expect(state.terminated).toBe(1); expect(state.portsClosed).toBe(1);
  await stopLive(page);
  await expect.poll(async () => (await audioState(page)).contexts.every(s => s === 'closed')).toBe(true);
});

test('Engine permission cancellation and background cleanup do not revive stale input', async ({ page }) => {
  await syntheticMicrophone(page, true); await page.goto(route); await startLive(page);
  await expect.poll(async () => (await audioState(page)).calls).toBe(1); await stopLive(page);
  await page.evaluate(() => (window as unknown as { audioTest: { resolve: () => void } }).audioTest.resolve());
  await expect.poll(async () => (await audioState(page)).tracks.every(s => s === 'ended')).toBe(true);
  await startLive(page);
  await expect.poll(async () => (await audioState(page)).calls).toBe(2);
  await page.evaluate(() => (window as unknown as { audioTest: { resolve: () => void } }).audioTest.resolve());
  await expect(page.locator('#analyzer-technical-note')).toContainText('sample-clock capture');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#analyzer-status')).toContainText('tab was hidden');
  await expect.poll(async () => (await audioState(page)).contexts.every(s => s === 'closed')).toBe(true);
});

test('Engine file harmonics, incompatible contexts, invalid references and optional recording', async ({ page }) => {
  await syntheticMicrophone(page, false, [100, 200, 300, 400]); await page.goto(route);
  await page.locator('.engine-settings > summary').click(); await page.getByText('Engine & harmonic references', { exact: true }).click(); await page.locator('#harmonic-hz').fill('100');
  await upload(page, wav([100, 200, 300, 400], 0.15, 1));
  await expect(page.locator('#harmonic-summary')).toContainText('4 of 5'); await page.locator('#save-a').click();
  await page.locator('#engine-rpm').fill('-1'); await expect(page.locator('#engine-input-error')).toBeVisible(); await expect(page.locator('#save-b')).toBeDisabled();
  await page.locator('#engine-rpm').fill('1800'); await startLive(page);
  await expect(page.locator('#harmonic-summary')).toContainText('4 of 5'); await page.locator('#save-b').click();
  await expect(page.locator('#engine-comparison-warning')).toContainText('Source types differ');
  await page.getByText('Optional recording', { exact: true }).click();
  await page.locator('#record-audio').click(); await expect(page.locator('#recording-status')).toContainText('● Recording');
  await page.waitForTimeout(1200); await page.locator('#record-audio').click();
  await expect(page.locator('#analyzer-status')).toContainText('Complete'); await expect(page.locator('#playback-panel')).toBeVisible();
  await expect.poll(async () => (await audioState(page)).tracks.every(s => s === 'ended')).toBe(true);
});

test('Engine layout, references, routes and responsive controls', async ({ page, request }, testInfo) => {
  await page.goto(route); await expect(page).toHaveTitle(/Engine Sound Analyzer/);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://workshopgirl.com${route}`);
  await expect(page.locator('#engine-cylinders')).toBeHidden();
  await page.locator('.engine-settings > summary').click();
  await page.locator('#engine-rpm').fill('1800'); await expect(page.locator('#rpm-reference-summary')).toContainText('30.00 Hz');
  await page.getByText('Engine & harmonic references', { exact: true }).click();
  await page.locator('#engine-cylinders').fill('4'); await page.locator('#engine-cycle').selectOption('4');
  await expect(page.locator('#engine-markers')).toContainText('Firing reference: 60.0 Hz');
  await page.locator('#engine-cycle').selectOption('2'); await expect(page.locator('#engine-markers')).toContainText('Firing reference: 120.0 Hz');
  await page.screenshot({ path: testInfo.outputPath('engine-empty.png'), fullPage: true });
  for (const [width, height] of [[320, 700], [390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 700) {
      const box = await page.locator('#engine-live-toggle').boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator('#start-mic')).toBeHidden(); await expect(page.locator('#engine-capture-a')).toBeHidden();
    } else {
      await expect(page.locator('.engine-toolbar')).toBeHidden(); await expect(page.locator('#start-mic')).toBeVisible();
    }
  }
  const sitemap = await (await request.get('/sitemap-0.xml')).text(); expect(sitemap).toContain(`https://workshopgirl.com${route}`);
  await page.goto('/tools/'); await expect(page.getByRole('heading', { name: 'Engine Sound Analyzer', exact: true })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Sound Analyzer', exact: true })).toBeVisible();
});

test('Engine unsupported audio reports errors and keeps references usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'AudioContext', { value: undefined }));
  await page.goto(route); await startLive(page); await expect(page.locator('#analyzer-error')).toContainText('does not support');
  await page.locator('.engine-settings > summary').click();
  await page.locator('#engine-rpm').fill('1800'); await expect(page.locator('#rpm-reference-summary')).toContainText('30.00 Hz');
});
