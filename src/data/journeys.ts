import { tutorials } from './tutorials.ts';
import { workshopPages } from '../lib/workshop/navigation.ts';

export const analysisTools = {
  engine: { title: 'Engine Sound Analyzer', href: '/tools/engine-sound-analyzer/' },
  sound: { title: 'Sound Analyzer', href: '/tools/sound-analyzer/' },
  speaker: { title: 'Speaker Sound Analyzer', href: '/tools/speaker-sound-analyzer/' },
  validation: { title: 'DSP Validation Workbench', href: '/tools/dsp-validation/' },
  photo: { title: 'Photo Measurement Lab', href: '/tools/photo-measurement/' },
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
  cuttingAndDrilling: {
    title: 'Plan the shape, then check it at the bench.',
    intro: 'Estimate a flat workpiece from a photo with a known reference. Verify critical dimensions directly, secure the material and follow your tool instructions before cutting or drilling.',
    learn: ['/tutorials/types-of-clamps-explained', '/tutorials/drill-bit-types-explained'],
    tools: ['photo'], workshop: [],
  },
  electricalChecks: {
    title: 'Check a connection carefully.',
    intro: 'Use the correct meter range and safe low-voltage procedures. A voltage reading alone does not establish battery health or the cause of an electrical problem.',
    learn: ['/tutorials/how-to-use-a-multimeter', '/tutorials/how-to-solder-wires'],
    tools: [], workshop: [],
  },
  batteryService: {
    title: 'Inspect before replacing a battery.',
    intro: 'Use safe meter checks and the exact vehicle service information. Record the concern and agreed work if this becomes a workshop visit.',
    learn: ['/tutorials/how-to-use-a-multimeter'], tools: [],
    workshop: [{ page: 'intake', label: 'Optional: start an electrical inspection job', newJob: true }],
  },
  wheelService: {
    title: 'Finish the wheel work with the right checks.',
    intro: 'Use the specified tightening sequence and torque. Record the inspection and verify the finished work before handover.',
    learn: ['/tutorials/how-to-use-a-torque-wrench/', '/tutorials/how-to-change-a-flat-tire/'], tools: [],
    workshop: [{ page: 'intake', label: 'Optional: start a wheel inspection job', newJob: true }],
  },
  soundComparison: {
    title: 'Choose a useful view of the sound.',
    intro: 'Observe the captured signal and compare under similar conditions. These tools cannot establish a mechanical fault or a calibrated speaker response.',
    learn: [], tools: ['sound', 'engine', 'speaker'], workshop: [],
  },
  signalValidation: {
    title: 'Compare signal processing with known inputs.',
    intro: 'Use deterministic signals to explore DSP behavior, then inspect local recordings. Bench validation does not calibrate a microphone or certify a physical machine.',
    learn: [], tools: ['sound', 'engine', 'speaker'], workshop: [],
  },
  stubbornFastener: {
    title: 'Choose the tool before adding force.',
    intro: 'Check socket fit and use tightening tools as intended. A torque wrench is for controlled tightening, not a breaker bar for a stuck fastener.',
    learn: ['/tutorials/socket-ratchet-sizes-explained', '/tutorials/how-to-use-a-torque-wrench/'], tools: [], workshop: [],
  },
  motorcycleMaintenance: {
    title: 'Turn a project into careful checks.',
    intro: 'Follow the exact motorcycle service information. These guides and sound observations support investigation; they do not establish a fault or replace inspection.',
    learn: ['/tutorials/how-to-change-engine-oil/', '/tutorials/how-to-change-spark-plugs/'], tools: ['engine'], workshop: [],
  },
  photoMeasurement: {
    title: 'From a photo estimate to careful work.',
    intro: 'Check important dimensions directly before cutting or drilling. These guides help you hold a workpiece securely and choose a suitable cutting or drilling approach.',
    learn: ['/tutorials/types-of-clamps-explained', '/tutorials/how-to-use-a-jigsaw/', '/tutorials/drill-bit-types-explained'],
    tools: ['photo'], workshop: [],
  },
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
  '/tutorials/how-to-use-a-jigsaw/': 'cuttingAndDrilling',
  '/tutorials/how-to-use-a-circular-saw': 'cuttingAndDrilling',
  '/tutorials/jigsaw-vs-circular-saw': 'cuttingAndDrilling',
  '/tutorials/how-to-use-a-cordless-drill/': 'cuttingAndDrilling',
  '/tutorials/drill-bit-types-explained': 'cuttingAndDrilling',
  '/tutorials/types-of-clamps-explained': 'cuttingAndDrilling',
  '/tutorials/how-to-use-a-multimeter': 'electricalChecks',
  '/tutorials/how-to-solder-wires': 'electricalChecks',
  '/tutorials/how-to-replace-a-car-battery/': 'batteryService',
  '/tutorials/how-to-change-a-flat-tire/': 'wheelService',
  '/tutorials/how-to-use-a-torque-wrench/': 'wheelService',
  '/tools/sound-analyzer/': 'soundComparison',
  '/tools/speaker-sound-analyzer/': 'soundComparison',
  '/tools/dsp-validation/': 'signalValidation',
  '/diary/the-first-bolt-i-couldnt-remove/': 'stubbornFastener',
  '/projects/bringing-an-old-motorcycle-back-to-life/': 'motorcycleMaintenance',
  '/tools/photo-measurement/': 'photoMeasurement',
  '/tools/engine-sound-analyzer/': 'engineSound',
  '/tutorials/engine-air-filter/': 'engineSound',
  '/tutorials/how-to-replace-brake-pads/': 'brakes',
  '/tutorials/how-to-change-engine-oil/': 'oil',
  '/tutorials/how-to-change-spark-plugs/': 'sparkPlugs',
};

export function journeyForPath(path: string): JourneyId | undefined {
  const normalized = path.replace(/\/$/, '');
  return Object.entries(journeyPages).find(([page]) => page.replace(/\/$/, '') === normalized)?.[1];
}

export interface JourneyLink { title: string; href: string; kind: 'Learn' | 'Analyze' | 'Measure' | 'Workshop'; workshopPage?: WorkshopPageId; newJob?: boolean }
export function journeyLinks(id: JourneyId, currentPath: string): JourneyLink[] {
  const journey: Journey = journeys[id];
  const learn = journey.learn.map(href => {
    const guide = tutorials.find(item => item.slug === href);
    if (!guide) throw new Error('Unknown journey guide: ' + href);
    return { title: guide.title, href, kind: 'Learn' as const };
  });
  const tools = journey.tools.map(tool => ({ ...analysisTools[tool], kind: tool === 'photo' ? 'Measure' as const : 'Analyze' as const }));
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
