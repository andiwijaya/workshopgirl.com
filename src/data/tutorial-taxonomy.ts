// Stable subjects and editorial roles, independent of article URLs or copy.
export const tutorialSubjects = {
  automotive: { label: 'Automotive & Maintenance', anchor: 'automotive' },
  woodworking: { label: 'Woodworking', anchor: 'woodworking' },
  electrical: { label: 'Electrical & Electronics', anchor: 'electrical' },
  'power-tools': { label: 'Power Tools', anchor: 'tools-machines' },
  'hand-tools': { label: 'Hand Tools', anchor: 'tools-machines' },
  reference: { label: 'Reference', anchor: 'reference' },
} as const;
export type TutorialSubject = keyof typeof tutorialSubjects;
export const tutorialTaxonomy = {
  'how-to-use-a-jigsaw': ['woodworking', 'power-tools'],
  'how-to-use-a-circular-saw': ['woodworking', 'power-tools'],
  'angle-grinder-basics': ['power-tools', 'reference'],
  'how-to-use-a-multimeter': ['electrical', 'hand-tools'],
  'how-to-solder-wires': ['electrical'],
  'types-of-clamps-explained': ['woodworking', 'hand-tools', 'reference'],
  'jigsaw-vs-circular-saw': ['woodworking', 'power-tools'],
  'socket-ratchet-sizes-explained': ['hand-tools', 'reference'],
  'drill-bit-types-explained': ['power-tools', 'reference'],
  'cordless-drill-vs-impact-driver': ['power-tools'],
  'how-to-use-a-cordless-drill': ['woodworking', 'power-tools'],
  'how-to-use-a-torque-wrench': ['automotive', 'hand-tools'],
  'how-to-change-spark-plugs': ['automotive'],
  'how-to-replace-a-car-battery': ['automotive', 'electrical'],
  'engine-air-filter': ['automotive'],
  'how-to-replace-brake-pads': ['automotive'],
  'how-to-change-a-flat-tire': ['automotive'],
  'how-to-change-engine-oil': ['automotive'],
} as const satisfies Record<string, readonly TutorialSubject[]>;
export function subjectsForTutorial(path: string): readonly TutorialSubject[] {
  const slug = path.split(/[?#]/)[0].replace(/\/$/, '').split('/').pop()!;
  return tutorialTaxonomy[slug as keyof typeof tutorialTaxonomy] ?? [];
}
export function tutorialCategory(path: string): string {
  return subjectsForTutorial(path).map(id => tutorialSubjects[id].label).join(' / ');
}
