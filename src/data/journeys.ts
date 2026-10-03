import { tutorials } from './tutorials.ts';
import { workshopPages } from '../lib/workshop/navigation.ts';

export const analysisTools = {
  engine: { title: 'Engine Sound Analyzer', href: '/tools/engine-sound-analyzer/' },
  sound: { title: 'Sound Analyzer', href: '/tools/sound-analyzer/' },
  speaker: { title: 'Speaker Sound Analyzer', href: '/tools/speaker-sound-analyzer/' },
  validation: { title: 'DSP Validation Workbench', href: '/tools/dsp-validation/' },
} as const;
export type WorkshopPageId = typeof workshopPages[number]['id'];
type ToolId = keyof typeof analysisTools;
type WorkshopAction = { page: WorkshopPageId; label: string; newJob?: boolean };
export interface Journey {
  title: string;
  intro: string;
  learn: readonly string[];
  tools: readonly ToolId[];
  workshop: readonly WorkshopAction[];
  workflow?: readonly WorkshopPageId[];
}

export const journeys = {
  engineSound: {
    title: 'Engine sounds unusual? Observe, then investigate.',
    intro: 'Compare captures under similar conditions and note what changed. Spectral peaks do not prove a specific fault. These maintenance guides explain checks you may choose after inspection; they are not repairs recommended by the analyzer.',
    learn: ['/tutorials/how-to-change-spark-plugs/', '/tutorials/engine-air-filter/', '/tutorials/how-to-change-engine-oil/'],
    tools: ['engine'],
    workshop: [{ page: 'intake', label: 'Optional: start an inspection job', newJob: true }],
  },
  brakes: {
    title: 'From brake inspection to checked work.',
    intro: 'Use the guide and vehicle-specific service information. For a workshop visit, record the inspection, estimate and approval before carrying out work; finish with QC, handover and a service record.',
    learn: ['/tutorials/how-to-use-a-torque-wrench/'], tools: [],
    workshop: [{ page: 'intake', label: 'Start a brake inspection job', newJob: true }],
    workflow: ['inspection', 'work-order', 'qc', 'service-history'],
  },
  oil: {
    title: 'Keep a record of the maintenance.',
    intro: 'Start with intake and inspection to agree the service. Record the actual oil and filter work, verify the final checks, and keep the completed visit in service history.',
    learn: [], tools: [], workshop: [{ page: 'intake', label: 'Start a maintenance job', newJob: true }],
    workflow: ['inspection', 'work-order', 'qc', 'service-history'],
  },
  sparkPlugs: {
    title: 'Check the evidence before choosing the work.',
    intro: 'A sound comparison can document an observation; it cannot establish a spark-plug fault. Follow the exact engine specification and inspect further when the cause is unclear.',
    learn: ['/tutorials/how-to-use-a-torque-wrench/'], tools: ['engine'],
    workshop: [{ page: 'intake', label: 'Optional: start an inspection job', newJob: true }],
  },
} as const satisfies Record<string, Journey>;
export type JourneyId = keyof typeof journeys;

export const journeyPages: Record<string, JourneyId> = {
  '/tools/engine-sound-analyzer/': 'engineSound',
  '/tutorials/engine-air-filter/': 'engineSound',
  '/tutorials/how-to-replace-brake-pads/': 'brakes',
  '/tutorials/how-to-change-engine-oil/': 'oil',
  '/tutorials/how-to-change-spark-plugs/': 'sparkPlugs',
};

export interface JourneyLink { title: string; href: string; kind: 'Learn' | 'Analyze' | 'Workshop'; workshopPage?: WorkshopPageId; newJob?: boolean }
export function journeyLinks(id: JourneyId, currentPath: string): JourneyLink[] {
  const journey: Journey = journeys[id];
  const learn = journey.learn.map(href => {
    const guide = tutorials.find(item => item.slug === href);
    if (!guide) throw new Error('Unknown journey guide: ' + href);
    return { title: guide.title, href, kind: 'Learn' as const };
  });
  const tools = journey.tools.map(tool => ({ ...analysisTools[tool], kind: 'Analyze' as const }));
  const workshop = journey.workshop.map(action => ({ title: action.label, href: workshopPages.find(page => page.id === action.page)!.href, kind: 'Workshop' as const, workshopPage: action.page, newJob: action.newJob }));
  const current = currentPath.replace(/\/$/, '');
  return [...learn, ...tools, ...workshop].filter(link => link.href.replace(/\/$/, '') !== current);
}

// Business actions inside these pages (estimate, approval and handover) stay in
// their actual forms. The five supporting modules are not numbered service steps.
export const workshopFlow = {
  stages: [
    { page: 'intake', label: 'Intake', description: 'Vehicle arrives; record the concern.' },
    { page: 'inspection', label: 'Inspection & Estimate', description: 'Inspect, estimate and record approval.' },
    { page: 'work-order', label: 'Work Order', description: 'Record agreed tasks and actual work.' },
    { page: 'qc', label: 'QC & Handover', description: 'Check the result and return the vehicle.' },
  ],
  support: ['queue', 'parts-inventory', 'procurement', 'billing', 'service-history'],
} as const satisfies { stages: readonly { page: WorkshopPageId; label: string; description: string }[]; support: readonly WorkshopPageId[] };
