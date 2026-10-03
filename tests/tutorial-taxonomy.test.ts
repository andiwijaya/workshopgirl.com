import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tutorials } from '../src/data/tutorials.ts';
import { tutorialCategory, tutorialSubjects, tutorialTaxonomy, subjectsForTutorial } from '../src/data/tutorial-taxonomy.ts';
import { learnCategories } from '../src/data/learn.ts';
import { journeyForPath, journeyLinks } from '../src/data/journeys.ts';

test('all legacy tutorials have shared subjects and the same display/schema taxonomy, without fake review entries', async () => {
  assert.equal(Object.keys(tutorialTaxonomy).length, tutorials.length);
  for (const guide of tutorials) {
    const subjects = subjectsForTutorial(guide.slug);
    assert.ok(subjects.length > 0 && subjects.length <= 3);
    assert.equal(guide.category, tutorialCategory(guide.slug));
    for (const id of subjects) assert.ok(learnCategories.some(c => c.id === tutorialSubjects[id].anchor));
    const directory = new URL('../src/pages' + guide.slug, import.meta.url);
    const file = guide.slug.endsWith('/') ? new URL('index.astro', directory) : new URL(directory.href + '.astro');
    const source = await fs.readFile(file, 'utf8');
    assert.ok(source.includes('<TutorialTopics />'), guide.slug);
    assert.ok(source.includes('content={tutorialCategory(canonical)}'), guide.slug);
    assert.doesNotMatch(source, /articleSection:\s*'/);
  }
  assert.deepEqual(subjectsForTutorial('/unknown/'), []);
  assert.equal(tutorialCategory('/tutorials/how-to-change-engine-oil/?job=private'), 'Automotive & Maintenance');
});

test('contextual journeys cover photo-related learning, electrical checks and actual story topics with bounded destinations', () => {
  for (const route of ['/tutorials/types-of-clamps-explained/', '/tutorials/drill-bit-types-explained', '/tutorials/how-to-use-a-jigsaw/']) {
    const id = journeyForPath(route)!;
    assert.ok(id);
    assert.ok(journeyLinks(id, route).some(link => link.href === '/tools/photo-measurement/' && link.kind === 'Measure'));
  }
  assert.equal(journeyForPath('/sport/indoor-rock-climbing/'), undefined);
  assert.equal(journeyForPath('/tutorials/how-to-solder-wires/'), 'electricalChecks');
  assert.equal(journeyForPath('/diary/the-first-bolt-i-couldnt-remove/'), 'stubbornFastener');
});
