import { test, expect } from '@playwright/test';
import { wav, upload, expectTone, syntheticMicrophone, audioState } from './audio-fixtures';

test.beforeEach(async ({ page }, info) => {
  if (/^(Site navigation|Responsive|Missing audio)/.test(info.title)) return;
  await page.goto('/tools/sound-analyzer/');
  test.skip(!await page.evaluate(() => !!window.AudioContext), 'This browser build lacks Web Audio (Windows Playwright WebKit). Audio tests require a Web Audio-capable build.');
});

test('File analysis, opposite-phase stereo, playback, A/B and privacy', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const state = { created: [] as string[], revoked: [] as string[] };
    Object.assign(window, { urlTest: state });
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); state.created.push(url); return url; };
    URL.revokeObjectURL = url => { state.revoked.push(url); revoke(url); };
  });
  const errors: string[] = [], uploads: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() !== 'GET') uploads.push(request.url()); });
  await page.goto('/tools/sound-analyzer/');
  await expect(page).toHaveTitle(/Sound Analyzer/);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://workshopgirl.com/tools/sound-analyzer/');
  await upload(page, wav([100, 440, 1000], 0.2, 2, true), 'before.wav');
  const peaks = (await page.locator('#peak-list li').allTextContents()).map(parseFloat);
  const bin = parseFloat(await page.locator('#frequency-resolution').innerText());
  for (const hz of [100, 440, 1000]) expect(peaks.some(peak => Math.abs(peak - hz) <= bin)).toBe(true);
  await expect(page.locator('#analyzer-status')).toContainText('channel 1');
  await page.locator('#save-a').click();
  await upload(page, wav([100, 440, 1000], 0.1, 2), 'after.wav');
  await page.locator('#save-b').click();
  await expect(page.locator('#comparison-summary')).toContainText('− A: RMS -6.0 dB');
  await expect(page.locator('#comparison-table')).toContainText('before.wav');
  await page.locator('#audio-playback').evaluate(async (element: HTMLAudioElement) => { await element.play(); });
  await expect.poll(() => page.locator('#audio-playback').evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('analyzer.png'), fullPage: true });
  await page.locator('#clear-audio').click();
  expect(await page.evaluate(() => {
    const state = (window as unknown as { urlTest: { created: string[]; revoked: string[] } }).urlTest;
    return state.created.length === 2 && state.created.every(url => state.revoked.includes(url));
  })).toBe(true);
  await expect(page.locator('#playback-panel')).toBeHidden();
  await expect(page.locator('#comparison-results')).toBeVisible();
  await page.locator('#clear-comparison').click();
  await expect(page.locator('#comparison-results')).toBeHidden();
  expect(errors).toEqual([]); expect(uploads).toEqual([]);
});

test('Invalid/empty/oversized/long audio recovers and silence has no peak', async ({ page }) => {
  await page.goto('/tools/sound-analyzer/');
  for (const [name, buffer, expected] of [
    ['empty.wav', Buffer.alloc(0), 'empty'], ['broken.wav', Buffer.from('not audio'), 'could not be decoded'],
    ['oversized.wav', Buffer.alloc(20 * 1024 * 1024 + 1), 'smaller than 20 MB'], ['long.wav', wav([440], 0.1, 61), '60 seconds'],
  ] as const) {
    await page.locator('#audio-file').setInputFiles({ name, mimeType: 'audio/wav', buffer });
    await expect(page.locator('#analyzer-error')).toContainText(expected);
    await expect(page.locator('#start-mic')).toBeEnabled();
  }
  await upload(page, wav([], 0), 'silence.wav');
  await expect(page.locator('#dominant-frequency')).toHaveText('No clear peak');
  await expect(page.locator('#rms-level')).toContainText('−∞');
  await expect(page.locator('#analyzer-error')).toBeHidden();
});

test('Live PCM, stop cleanup, restart, recording and recorded-file analysis', async ({ page }) => {
  await syntheticMicrophone(page);
  await page.goto('/tools/sound-analyzer/');
  expect((await audioState(page)).calls).toBe(0);
  await page.locator('#start-mic').click();
  await expect(page.locator('#analyzer-status')).toContainText('Live');
  await expectTone(page);
  await page.locator('#stop-analysis').click();
  await expect.poll(async () => (await audioState(page)).tracks.every(state => state === 'ended')).toBe(true);
  await expect.poll(async () => (await audioState(page)).contexts.every(state => state === 'closed')).toBe(true);
  await page.locator('#save-a').click();
  await page.locator('#start-mic').click();
  await expect(page.locator('#analyzer-status')).toContainText('Live');
  await page.getByText('Optional recording', { exact: true }).click();
  await page.locator('#record-audio').click();
  await expect(page.locator('#recording-status')).toContainText('● Recording');
  await expect.poll(() => page.locator('#spectrogram-chart').evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBeGreaterThan(0);
  // Need actual recorded samples, not just a container header.
  await page.waitForTimeout(1200);
  await page.locator('#record-audio').click();
  await expect(page.locator('#analyzer-status')).toContainText('Complete');
  await expectTone(page);
  await expect(page.locator('#download-audio')).toHaveAttribute('href', /^blob:/);
  await expect.poll(async () => (await audioState(page)).tracks.every(state => state === 'ended')).toBe(true);
  await expect.poll(async () => (await audioState(page)).contexts.every(state => state === 'closed')).toBe(true);
});

test('Denied microphone permission has a useful error and file import still works', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) }));
  await page.goto('/tools/sound-analyzer/');
  await page.locator('#start-mic').click();
  await expect(page.locator('#analyzer-error')).toContainText('permission was denied');
  await expect(page.locator('#start-mic')).toBeEnabled();
  await upload(page);
});

test('Cancelling a decode closes its context and ignores the late result', async ({ page }) => {
  await page.addInitScript(() => {
    const OriginalContext = window.AudioContext;
    const state = { context: undefined as AudioContext | undefined, release: undefined as (() => void) | undefined };
    Object.assign(window, { decodeTest: state });
    window.AudioContext = class extends OriginalContext {
      constructor(options?: AudioContextOptions) { super(options); state.context = this; }
      async decodeAudioData(bytes: ArrayBuffer): Promise<AudioBuffer> {
        const buffer = await super.decodeAudioData(bytes);
        await new Promise<void>(resolve => { state.release = resolve; });
        return buffer;
      }
    };
  });
  await page.goto('/tools/sound-analyzer/');
  await page.locator('#audio-file').setInputFiles({ name: 'cancel.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { decodeTest: { release?: () => void } }).decodeTest.release)).toBe(true);
  await page.locator('#stop-analysis').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { decodeTest: { context: AudioContext } }).decodeTest.context.state)).toBe('closed');
  await page.evaluate(() => (window as unknown as { decodeTest: { release: () => void } }).decodeTest.release());
  await expect(page.locator('#playback-panel')).toBeHidden();
  await expect(page.locator('#dominant-frequency')).toHaveText('—');
  await expect(page.locator('#start-mic')).toBeEnabled();
});

test('Cancel pending permission releases a late stream', async ({ page }) => {
  await syntheticMicrophone(page, true);
  await page.goto('/tools/sound-analyzer/');
  await page.locator('#start-mic').click();
  await expect.poll(async () => (await audioState(page)).calls).toBe(1);
  await page.locator('#stop-analysis').click();
  await page.evaluate(() => (window as unknown as { audioTest: { resolve: () => void } }).audioTest.resolve());
  await expect.poll(async () => (await audioState(page)).tracks.every(state => state === 'ended')).toBe(true);
  await expect.poll(async () => (await audioState(page)).contexts.every(state => state === 'closed')).toBe(true);
  await expect(page.locator('#start-mic')).toBeEnabled();
});

test('Background transition stops input; unavailable recording leaves analysis usable', async ({ page }) => {
  await syntheticMicrophone(page);
  await page.addInitScript(() => Object.defineProperty(window, 'MediaRecorder', { value: undefined }));
  await page.goto('/tools/sound-analyzer/'); await page.locator('#start-mic').click();
  await expectTone(page);
  await expect(page.locator('#record-audio')).toBeDisabled();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#analyzer-status')).toContainText('tab was hidden');
  await expect.poll(async () => (await audioState(page)).tracks.every(state => state === 'ended')).toBe(true);
});

test('Site navigation, mobile menu, articles and sitemap remain available', async ({ page, request, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('#site-navigation').getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/$/);
  await page.locator('.tool-card').filter({ has: page.getByRole('heading', { name: 'Sound Analyzer', exact: true }) }).click(); await expect(page).toHaveURL(/sound-analyzer/);
  const sitemap = await request.get('/sitemap-0.xml'); const xml = await sitemap.text();
  expect(xml).toContain('https://workshopgirl.com/tools/sound-analyzer/');
  for (const match of xml.matchAll(/<loc>https:\/\/workshopgirl.com([^<]*)<\/loc>/g)) {
    const response = await request.get(match[1]); expect(response.ok(), match[1]).toBe(true);
  }
});

test('Responsive empty state, keyboard controls and reduced motion', async ({ page, browserName }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools/sound-analyzer/');
  // WebKit's platform preference skips links during plain Tab navigation.
  if (browserName === 'webkit') await page.getByRole('link', { name: 'Skip to sound analyzer' }).focus();
  else await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to sound analyzer' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await expect(page.getByRole('button', { name: 'Share tool' })).toBeVisible();
  await expect(page.locator('#start-mic')).toBeVisible();
  await expect(page.locator('#stop-analysis')).toBeHidden();
  await page.getByText('Measurement settings & microphone details', { exact: true }).click();
  await expect(page.locator('#fft-size')).toBeVisible();
  await page.locator('#fft-size').selectOption('8192');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('empty-state.png'), fullPage: true });
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Missing audio APIs report a readable error without breaking the page', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'AudioContext', { value: undefined }));
  await page.goto('/tools/sound-analyzer/');
  await page.locator('#start-mic').click();
  await expect(page.locator('#analyzer-error')).toContainText('does not support microphone');
  await page.locator('#audio-file').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.locator('#analyzer-error')).toContainText('decoding is unavailable');
  await expect(page.locator('#start-mic')).toBeEnabled();
});

test('Share tool sends only public page details and falls back to copying the canonical URL', async ({ page }) => {
  await page.addInitScript(() => {
    const state: { shared?: ShareData; copied?: string } = {};
    Object.assign(window, { shareTest: state });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { state.shared = data; } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { state.copied = text; } } });
  });
  await page.goto('/tools/sound-analyzer/');
  await page.getByRole('button', { name: 'Share tool' }).click();
  await expect(page.locator('.tool-share-status')).toHaveText('Share sheet opened');
  expect(await page.evaluate(() => (window as unknown as { shareTest: { shared: ShareData } }).shareTest.shared)).toEqual({
    title: 'WorkshopGirl Sound Analyzer',
    text: 'Analyze live microphone sound or local audio files in your browser. Explore waveforms, frequency peaks, spectrograms and before/after comparisons with WorkshopGirl.',
    url: 'https://workshopgirl.com/tools/sound-analyzer/',
  });

  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Share tool' }).click();
  await expect(page.locator('.tool-share-status')).toHaveText('Link copied');
  expect(await page.evaluate(() => (window as unknown as { shareTest: { copied: string } }).shareTest.copied)).toBe('https://workshopgirl.com/tools/sound-analyzer/');
});
