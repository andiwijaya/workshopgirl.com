import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { journeys, journeyPages, journeyLinks, workshopFlow, type JourneyId, type Journey } from '../src/data/journeys.ts';
import { workshopPages } from '../src/lib/workshop/navigation.ts';
import { GET as sitemap } from '../src/pages/sitemap-0.xml.ts';

test('every journey points to existing canonical pages and excludes the current guide/tool', async () => {
  const xml = await sitemap().text();
  const paths = [...xml.matchAll(/<loc>https:\/\/workshopgirl.com(.*?)<\/loc>/g)].map(match => match[1]);
  for (const [current, id] of Object.entries(journeyPages)) {
    assert.ok(paths.includes(current), current);
    const links = journeyLinks(id, current);
    assert.ok(links.length > 0 && links.length <= 4, 'Bounded recommendations: ' + current);
    assert.equal(new Set(links.map(link => link.href)).size, links.length);
    for (const link of links) {
      assert.ok(paths.includes(link.href), link.href);
      assert.notEqual(link.href.replace(/\/$/, ''), current.replace(/\/$/, ''));
      assert.ok(!/[?#]/.test(link.href), 'No private query or invented page state');
      if (link.newJob) assert.equal(link.href, '/tools/workshop/vehicle-intake/');
    }
    const journey: Journey = journeys[id];
    for (const pageId of journey.workflow ?? []) assert.ok(paths.includes(workshopPages.find(page => page.id === pageId)!.href));
  }
});

test('engine observation and spark-plug paths explain limitations and offer relevant optional inspection', () => {
  const engine = journeys.engineSound;
  assert.match(engine.intro, /do not prove a specific fault/);
  assert.match(engine.intro, /not repairs recommended by the analyzer/);
  assert.deepEqual(engine.learn, ['/tutorials/how-to-change-spark-plugs/', '/tutorials/engine-air-filter/', '/tutorials/how-to-change-engine-oil/']);
  assert.match(engine.workshop[0].label, /Optional/);
  assert.ok(journeyLinks('sparkPlugs', '/tutorials/how-to-change-spark-plugs/').some(link => link.href === '/tools/engine-sound-analyzer/'));
  for (const id of Object.keys(journeys) as JourneyId[]) assert.doesNotMatch(journeys[id].intro, /confirmed fault|detected failure|we diagnosed|proves a fault/i);
});

test('brake and oil journeys lead through inspection/approval, work, QC and completed history', () => {
  assert.deepEqual(journeys.brakes.learn, ['/tutorials/how-to-use-a-torque-wrench/']);
  for (const id of ['brakes', 'oil'] as const) {
    assert.deepEqual(journeys[id].workflow, ['inspection', 'work-order', 'qc', 'service-history']);
    assert.equal(journeys[id].workshop[0].page, 'intake');
    assert.equal(journeys[id].workshop[0].newJob, true);
  }
});

test('four sequential stages and five supporting modules partition the existing nine operations', () => {
  const stages = workshopFlow.stages.map(stage => stage.page);
  assert.deepEqual(stages, ['intake', 'inspection', 'work-order', 'qc']);
  assert.match(workshopFlow.stages[1].description, /approval/);
  assert.match(workshopFlow.stages[3].description, /return/);
  assert.equal(workshopFlow.support.length, 5);
  assert.equal(new Set([...stages, ...workshopFlow.support]).size, 9);
  assert.deepEqual(new Set([...stages, ...workshopFlow.support]), new Set(workshopPages.map(page => page.id)));
});

test('all 43 source HTML routes remain in the sitemap, including legacy section indexes', async () => {
  const xml = await sitemap().text();
  const files = await fs.readdir(new URL('../src/pages/', import.meta.url), { recursive: true });
  const routes = files.filter(file => file.endsWith('.astro')).map(file => '/' + file.replaceAll('\\', '/').replace(/index\.astro$/, '').replace(/\.astro$/, '/'));
  assert.equal(routes.length, 43);
  for (const route of routes) assert.ok(xml.includes('https://workshopgirl.com' + route.replace(/\/$/, '') + '<') || xml.includes('https://workshopgirl.com' + route + '<'), route);
  for (const legacy of ['/diary/', '/projects/', '/sport/', '/tutorials/', ...workshopPages.map(page => page.href)]) assert.ok(xml.includes('https://workshopgirl.com' + legacy + '<'));
});
