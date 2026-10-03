import { tutorials, type TutorialSummary } from './tutorials.ts';

// Explicit editorial membership: legacy category display strings are preserved.
export const learnCategories = [
  { id: 'automotive', label: 'Automotive & Maintenance', description: 'Careful checks and service for your vehicle.', slugs: ['engine-air-filter', 'how-to-change-engine-oil', 'how-to-change-a-flat-tire', 'how-to-replace-brake-pads', 'how-to-change-spark-plugs', 'how-to-replace-a-car-battery', 'how-to-use-a-torque-wrench'] },
  { id: 'woodworking', label: 'Woodworking', description: 'Cut, drill and hold a workpiece securely.', slugs: ['how-to-use-a-jigsaw', 'how-to-use-a-circular-saw', 'jigsaw-vs-circular-saw', 'types-of-clamps-explained', 'how-to-use-a-cordless-drill'] },
  { id: 'electrical', label: 'Electrical & Electronics', description: 'Low-voltage measurement and wire connections.', slugs: ['how-to-use-a-multimeter', 'how-to-solder-wires', 'how-to-replace-a-car-battery'] },
  { id: 'tools-machines', label: 'Tools & Machines', description: 'Choose the right tool and learn its controls.', slugs: ['how-to-use-a-jigsaw', 'how-to-use-a-circular-saw', 'angle-grinder-basics', 'how-to-use-a-cordless-drill', 'how-to-use-a-torque-wrench', 'cordless-drill-vs-impact-driver', 'jigsaw-vs-circular-saw', 'socket-ratchet-sizes-explained', 'drill-bit-types-explained', 'types-of-clamps-explained'] },
  { id: 'reference', label: 'Reference', description: 'Compare sizes, accessories and materials before starting.', slugs: ['angle-grinder-basics', 'types-of-clamps-explained', 'socket-ratchet-sizes-explained', 'drill-bit-types-explained'] },
] as const;

export function tutorialsForCategory(id: string): TutorialSummary[] {
  const category = learnCategories.find(category => category.id === id);
  return category ? tutorials.filter(tutorial => (category.slugs as readonly string[]).includes(tutorial.slug.replace(/\/$/, '').split('/').pop()!)) : [];
}

export function availableLearnCategories() {
  return learnCategories.map(category => ({ ...category, tutorials: tutorialsForCategory(category.id) })).filter(category => category.tutorials.length > 0);
}
