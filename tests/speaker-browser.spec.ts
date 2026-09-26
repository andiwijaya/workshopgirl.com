import { test, expect, type Page } from '@playwright/test';
import { syntheticMicrophone, audioState } from './audio-fixtures';
import { DspEngine } from '../src/lib/dsp/engine.ts';
import { speakerScores } from '../src/lib/domains/speaker/profile.ts';

const route = '/tools/speaker-sound-analyzer/';
const payload = { title: 'Speaker Sound Analyzer | WorkshopGirl', text: 'Play music. See its frequency balance. Explore bass, mid and treble in sound captured by your microphone, locally in your browser.', url: `https://workshopgirl.com${route}` };
const sizes = [320, 390, 1280];
test.beforeEach(async ({ page }, info) => {
  if (!info.title.startsWith('Speaker audio')) return;
  await page.goto(route);
  test.skip(!await page.evaluate(() => !!window.AudioContext), 'Windows WebKit has no AudioContext; physical Safari audio is not tested.');
});
async function shares(page: Page) {
  await page.addInitScript(() => {
    const state: { shared?: ShareData; copied?: string } = {}; Object.assign(window, { speakerShareTest: state });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { state.shared = data; } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { state.copied = text; } } });
  });
}
async function verifyShare(page: Page) {
  await page.getByRole('button', { name: 'Share tool', exact: true }).click();
  await expect(page.locator('.tool-share-status')).toHaveText('Share sheet opened');
  expect(await page.evaluate(() => (window as unknown as { speakerShareTest: { shared: ShareData } }).speakerShareTest.shared)).toEqual(payload);
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Share tool', exact: true }).click(); await expect(page.locator('.tool-share-status')).toHaveText('Link copied');
  expect(await page.evaluate(() => (window as unknown as { speakerShareTest: { copied: string } }).speakerShareTest.copied)).toBe(payload.url);
}
async function layout(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const id of ['speaker-start', 'speaker-stop', 'speaker-profile', 'speaker-spectrum', 'speaker-bass-value', 'speaker-mid-value', 'speaker-treble-value']) {
    const box = await page.locator(`#${id}`).boundingBox(); expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThan(0); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  }
  expect((await page.locator('#speaker-start').boundingBox())!.height).toBeGreaterThanOrEqual(44);
}

test('Speaker initial layout, keyboard, reduced motion, static sharing, discovery and metadata', async ({ page, request }, info) => {
  await shares(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(route + '?result=private-do-not-share');
  await expect(page.locator('#speaker-profile')).toHaveAttribute('data-profile', ''); await expect(page.locator('#speaker-stop')).toBeDisabled();
  for (const width of sizes) { await layout(page, width); await page.screenshot({ path: info.outputPath(`initial-${width}.png`), fullPage: true }); }
  await page.locator('#speaker-start').focus(); await expect(page.locator('#speaker-start')).toBeFocused();
  await verifyShare(page); expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(payload.url);
  expect((await (await request.get('/sitemap-0.xml')).text())).toContain(payload.url);
  await page.goto('/tools/'); await page.locator(`a[href="${route}"]`).click(); await expect(page.locator('#speaker-start')).toBeVisible();
});

const tones = [100, 1000, 8000];
// Fixture only: choose oscillator gains that deliver equal normalized captured band scores.
// Classification itself is independently tested with explicit normalized numbers.
const referenceScores = tones.map((frequency, band) => {
  const spectrum = new DspEngine(48000, 8192).analyze(Float32Array.from({ length: 8192 }, (_, i) => 0.1 * Math.sin(2 * Math.PI * frequency * i / 48000)));
  return speakerScores(spectrum)!.scores[band];
});
const gains = referenceScores.map(score => 0.1 * Math.sqrt(Math.min(...referenceScores) / score));
async function balancedMicrophone(page: Page) {
  await page.addInitScript(({ tones, gains }) => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      const ctx = new AudioContext({ sampleRate: 48000 }), output = ctx.createMediaStreamDestination();
      const oscillators = tones.map((f, i) => { const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.frequency.value = f; gain.gain.value = gains[i]; osc.connect(gain).connect(output); osc.start(); return osc; });
      await ctx.resume(); const track = output.stream.getAudioTracks()[0], stop = track.stop.bind(track);
      track.stop = () => { stop(); oscillators.forEach(o => o.stop()); void ctx.close(); }; return output.stream;
    } });
  }, { tones, gains });
}
for (const [kind, frequency] of [['Bass Dominant', 100], ['Mid Dominant', 1000], ['Treble Dominant', 8000], ['Balanced', 0]] as const) test(`Speaker audio ${kind}: real capture, duration gate, active/result layouts and restart`, async ({ page }, info) => {
  test.setTimeout(45000); await shares(page);
  if (frequency) await syntheticMicrophone(page, false, [frequency]); else await balancedMicrophone(page);
  await page.addInitScript(() => Object.defineProperty(window, 'MediaRecorder', { value: undefined }));
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.method() !== 'GET') requests.push(r.url()); });
  await page.goto(route); await page.locator('#speaker-start').click(); await expect(page.locator('#speaker-status')).toContainText('microphone on');
  await expect(page.locator('#speaker-bass-value')).not.toHaveText('—');
  await expect(page.locator('#speaker-profile')).toHaveAttribute('data-profile', '');
  for (const width of sizes) { await layout(page, width); if (frequency === 100) await page.screenshot({ path: info.outputPath(`active-${width}.png`), fullPage: true }); }
  await expect(page.locator('#speaker-profile')).toHaveText(kind, { timeout: 22000 });
  expect(parseFloat(await page.locator('#speaker-duration').innerText())).toBeGreaterThanOrEqual(10);
  for (const width of sizes) { await layout(page, width); await page.screenshot({ path: info.outputPath(`result-${width}.png`), fullPage: true }); }
  await page.setViewportSize({ width: 844, height: 390 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#speaker-stop').click(); await expect(page.locator('#speaker-status')).toContainText('microphone is off'); await expect(page.locator('#speaker-profile')).toHaveText(kind);
  if (frequency) { const state = await audioState(page); expect(state.tracks.every(t => t === 'ended')).toBe(true); expect(state.contexts.every(c => c === 'closed')).toBe(true); }
  await verifyShare(page); expect(page.url()).not.toContain('?');
  await page.locator('#speaker-start').click(); await expect(page.locator('#speaker-profile')).toHaveAttribute('data-profile', ''); expect(parseFloat(await page.locator('#speaker-duration').innerText())).toBeLessThan(1);
  await page.locator('#speaker-stop').click(); expect(errors).toEqual([]); expect(requests).toEqual([]);
});

test('Speaker permission errors and unavailable APIs recover without requesting on page load', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('denied', 'NotAllowedError'); } }); });
  await page.goto(route); await expect(page.locator('#speaker-status')).toHaveText('Ready. Your microphone is off.'); await page.locator('#speaker-start').click();
  // WebKit reports unsupported Web Audio before calling getUserMedia.
  await expect(page.locator('#speaker-status')).toContainText(/permission was denied|does not support/); await expect(page.locator('#speaker-start')).toBeEnabled();
  await expect(page.locator('#speaker-status')).not.toContainText('audio file'); await layout(page, 320);
  await page.evaluate(() => Object.defineProperty(window, 'AudioContext', { value: undefined })); await page.locator('#speaker-start').click(); await expect(page.locator('#speaker-status')).toContainText('does not support');
});

test('Speaker audio permission cancellation and navigation stop tracks, worker and late input', async ({ page }) => {
  await syntheticMicrophone(page, true, [100]); await page.goto(route); await page.locator('#speaker-start').click();
  await expect.poll(async () => (await audioState(page)).calls).toBe(1); await page.locator('#speaker-stop').click();
  await page.evaluate(() => (window as unknown as { audioTest: { resolve: () => void } }).audioTest.resolve());
  await expect.poll(async () => (await audioState(page)).tracks.every(t => t === 'ended')).toBe(true); await expect(page.locator('#speaker-analyzer')).toHaveAttribute('data-state', 'idle');
  await syntheticMicrophone(page, false, [100]); await page.addInitScript(() => {
    const state = { created: 0, terminated: 0 }; Object.assign(window, { speakerWorkers: state }); const Original = window.Worker;
    window.Worker = class extends Original { constructor(url: string | URL, options?: WorkerOptions) { super(url, options); state.created++; } terminate() { state.terminated++; super.terminate(); } };
  });
  await page.reload(); await page.locator('#speaker-start').click(); await expect(page.locator('#speaker-capture-note')).toContainText('Continuous'); await expect(page.locator('#speaker-bass-value')).not.toHaveText('—');
  await page.evaluate(() => document.dispatchEvent(new Event('astro:before-swap')));
  expect((await audioState(page)).tracks.every(t => t === 'ended')).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { speakerWorkers: { created: number; terminated: number } }).speakerWorkers)).toEqual({ created: 1, terminated: 1 });
});

test('Speaker audio cached-page restoration releases capture and allows a fresh session', async ({ page }) => {
  await syntheticMicrophone(page, false, [100]); await page.goto(route); await page.locator('#speaker-start').click();
  await expect(page.locator('#speaker-bass-value')).not.toHaveText('—');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  expect((await audioState(page)).tracks.every(t => t === 'ended')).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#speaker-status')).toHaveText('Ready. Your microphone is off.');
  await expect(page.locator('#speaker-profile')).toHaveAttribute('data-profile', '');
  await page.locator('#speaker-start').click(); await expect(page.locator('#speaker-bass-value')).not.toHaveText('—');
  expect((await audioState(page)).calls).toBe(2);
  await page.locator('#speaker-stop').click(); expect((await audioState(page)).tracks.every(t => t === 'ended')).toBe(true);
});

test('Speaker audio silence adds no time and sampled fallback remains usable', async ({ page }) => {
  test.setTimeout(35000); await syntheticMicrophone(page, false, [0]); await page.goto(route); await page.locator('#speaker-start').click();
  await expect(page.locator('#speaker-observation')).toContainText('too quiet'); await expect(page.locator('#speaker-duration')).toContainText('0.0 seconds'); await expect(page.locator('#speaker-profile')).toHaveAttribute('data-profile', '');
  await page.locator('#speaker-stop').click(); await syntheticMicrophone(page, false, [100]); await page.addInitScript(() => Object.defineProperty(window, 'AudioWorkletNode', { value: undefined })); await page.reload();
  await page.locator('#speaker-start').click(); await expect(page.locator('#speaker-capture-note')).toContainText('Sampled'); await expect(page.locator('#speaker-profile')).toHaveText('Bass Dominant', { timeout: 22000 });
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#speaker-status')).toContainText('tab was hidden'); expect((await audioState(page)).tracks.every(t => t === 'ended')).toBe(true);
});
