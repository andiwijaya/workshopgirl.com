import test from 'node:test';
import assert from 'node:assert/strict';
import { siteNavigation, siteSection, normalizeSection } from '../src/data/navigation.ts';
import { tutorials } from '../src/data/tutorials.ts';
import { learnCategories, availableLearnCategories, tutorialsForCategory } from '../src/data/learn.ts';
import { newestFirst } from '../src/data/content-order.ts';
import { stories, storySections } from '../src/data/stories.ts';
import { featuredLearning, latestContent } from '../src/data/home-feed.ts';

test('six navigation destinations classify legacy routes without treating operations as analysis tools', () => {
  assert.deepEqual(siteNavigation.map(item => item.label), ['Home', 'Learn', 'Tools', 'Workshop', 'Stories', 'About']);
  assert.equal(new Set(siteNavigation.map(item => item.href)).size, 6);
  for (const item of siteNavigation) assert.equal(siteSection(item.href), item.id);
  for (const tutorial of tutorials) assert.equal(siteSection(tutorial.slug), 'learn');
  for (const section of storySections) for (const item of section.items) assert.equal(siteSection(item.slug), 'stories');
  assert.equal(siteSection('/tools/workshop/queue/?job=private'), 'workshop');
  assert.equal(siteSection('/tools/engine-sound-analyzer/'), 'tools');
  assert.equal(siteSection('/toolshed/'), undefined);
  assert.equal(normalizeSection('tutorials'), 'learn');
  assert.equal(normalizeSection('sport'), 'stories');
});

test('Learn categories are nonempty, contain only real guides and cover all 18 legacy tutorials', () => {
  const categories = availableLearnCategories();
  assert.equal(categories.length, learnCategories.length);
  assert.equal(new Set(categories.map(category => category.id)).size, categories.length);
  assert.equal(new Set(categories.flatMap(category => category.tutorials.map(item => item.slug))).size, 18);
  for (const category of categories) {
    assert.ok(category.tutorials.length > 0);
    assert.equal(category.tutorials.length, category.slugs.length);
    for (const item of category.tutorials) assert.ok(tutorials.includes(item));
  }
  assert.deepEqual(tutorialsForCategory('empty'), []);
  assert.ok(tutorialsForCategory('automotive').some(item => item.slug.includes('engine-oil')));
  assert.equal(tutorialsForCategory('reference').length, 4);
});

test('content date ordering is deterministic, immutable and independent of authored array order', () => {
  const input = [{ slug: '/b', publishedAt: '2026-09-22' }, { slug: '/z', publishedAt: '2026-09-23' }, { slug: '/a', publishedAt: '2026-09-23' }, { slug: '/invalid', publishedAt: 'unknown' }];
  assert.deepEqual(newestFirst(input).map(item => item.slug), ['/a', '/z', '/b', '/invalid']);
  assert.equal(input[0].slug, '/b');
  assert.deepEqual(newestFirst([...tutorials].reverse()), newestFirst(tutorials));
  for (const item of [...tutorials, ...stories]) assert.match(item.publishedAt, /^2026-09-2[123]$/);
  assert.equal(stories.length, 3);
  assert.equal(stories[0].kind, 'Sport');
});

test('home has a limited practical selection and a recent feed sorted from shared publication metadata', () => {
  assert.equal(featuredLearning.length, 3);
  assert.ok(featuredLearning.every(item => tutorials.includes(item)));
  assert.ok(featuredLearning.some(item => item.slug.includes('brake')));
  assert.ok(featuredLearning.some(item => item.slug.includes('multimeter')));
  assert.equal(latestContent.length, 3);
  assert.deepEqual(latestContent, newestFirst(latestContent));
  assert.equal(latestContent[0].slug, '/sport/indoor-rock-climbing/');
});
