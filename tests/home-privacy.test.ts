import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

test('optional homepage analytics strips query/fragment from location and referrer before configuring GA', async () => {
  const source = await fs.readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const script = source.match(/<script is:inline define:vars=\{\{ gaId \}\}>([\s\S]*?)<\/script>/)![1];
  for (const referrer of ['https://workshopgirl.com/tools/workshop/inspection-estimate/?job=PRIVATE#PRIVATE', 'https://outside.example/?customer=PRIVATE', '']) {
    const context: Record<string, unknown> = { gaId: 'G-SYNTHETIC', URL, Date, document: { referrer }, dataLayer: [] };
    context.window = context; vm.runInNewContext(script, context);
    const calls = context.dataLayer as { [index: number]: unknown }[];
    assert.equal(calls.length, 2);
    const config = calls[1][2] as Record<string, unknown>;
    assert.equal(config.page_location, 'https://workshopgirl.com/');
    assert.doesNotMatch(String(config.page_referrer), /PRIVATE|[?#]/);
    assert.equal(config.allow_google_signals, false);
    assert.equal(config.allow_ad_personalization_signals, false);
  }
});
