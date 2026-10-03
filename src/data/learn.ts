import { tutorials, type TutorialSummary } from './tutorials.ts';

import { subjectsForTutorial, tutorialTaxonomy, type TutorialSubject } from './tutorial-taxonomy.ts';

const slugsFor = (...subjects: TutorialSubject[]) => Object.keys(tutorialTaxonomy).filter(slug => subjectsForTutorial(slug).some(id => subjects.includes(id)));
export const learnCategories = [
  { id: 'automotive', label: 'Automotive & Maintenance', description: 'Careful checks and service for your vehicle.', slugs: slugsFor('automotive') },
  { id: 'woodworking', label: 'Woodworking', description: 'Cut, drill and hold a workpiece securely.', slugs: slugsFor('woodworking') },
  { id: 'electrical', label: 'Electrical & Electronics', description: 'Low-voltage measurement and wire connections.', slugs: slugsFor('electrical') },
  { id: 'tools-machines', label: 'Tools & Machines', description: 'Power tools, hand tools and accessories: choose the right tool and learn its controls.', slugs: slugsFor('power-tools', 'hand-tools') },
  { id: 'reference', label: 'Reference', description: 'Compare sizes, accessories and materials before starting.', slugs: slugsFor('reference') },
] as const;

export function tutorialsForCategory(id: string): TutorialSummary[] {
  const category = learnCategories.find(category => category.id === id);
  return category ? tutorials.filter(tutorial => (category.slugs as readonly string[]).includes(tutorial.slug.replace(/\/$/, '').split('/').pop()!)) : [];
}

export function availableLearnCategories() {
  return learnCategories.map(category => ({ ...category, tutorials: tutorialsForCategory(category.id) })).filter(category => category.tutorials.length > 0);
}
