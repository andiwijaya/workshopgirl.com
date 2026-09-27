import type { Inspection, InspectionGroup, InspectionStatus, QCCheck, VehicleType, WorkshopJob } from './model.ts';

export const INSPECTION_STATUSES: InspectionStatus[] = ['Good', 'Monitor', 'Service', 'Replace', 'Not checked', 'Not applicable'];
const groups = (entries: [string, string[]][]): InspectionGroup[] => entries.map(([category, names]) => ({ category, items: names.map(name => ({ name, status: 'Not checked', note: '' })) }));
export function inspectionChecklist(type: VehicleType): InspectionGroup[] {
  return type === 'Motorcycle' ? groups([
    ['Engine & lubrication', ['Engine oil condition', 'Oil leaks', 'Engine noise / vibration', 'Idle quality', 'Air filter']],
    ['Fuel & cooling', ['Throttle response', 'Fuel hoses / connections', 'Coolant / radiator (if fitted)', 'Cooling fan / leaks (if fitted)']],
    ['Brakes', ['Front brake pads', 'Rear brake pads', 'Disc / drum', 'Brake fluid and response']],
    ['Tires, wheels & suspension', ['Front tire condition / pressure', 'Rear tire condition / pressure', 'Rims and wheel bearings', 'Front / rear suspension', 'Steering / looseness']],
    ['Transmission & electrical', ['Chain / sprocket or CVT', 'Battery and starter', 'Headlight, brake light and indicators', 'Horn and charging']],
    ['Safety & other', ['Mirrors, stand and exhaust', 'Visible leaks / damage', 'Other inspection notes']],
  ]) : groups([
    ['Engine & cooling', ['Engine oil and leaks', 'Engine noise / vibration', 'Idle, belt and air filter', 'Coolant / radiator / reservoir', 'Cooling fan and leaks']],
    ['Transmission & brakes', ['Transmission / drivetrain response', 'Front brake pads', 'Rear brake pads', 'Discs and brake fluid', 'Parking brake and response']],
    ['Tires, steering & suspension', ['Front tires (condition / pressure)', 'Rear tires (condition / pressure)', 'Spare tire and rim', 'Steering / tie rod / ball joint', 'Shocks, bushings and bearings']],
    ['Battery, electrical & fluids', ['Battery, starter and charging', 'Headlight, brake light and indicators', 'Horn and wipers', 'Brake / transmission / washer fluid', 'Other fluid leaks']],
    ['AC & safety', ['AC cooling and blower', 'Windshield, mirrors and wipers', 'Seatbelts and safety lights', 'Leaks / exterior condition', 'Other inspection notes']],
  ]);
}

export const emptyInspection = (type: VehicleType): Inspection => ({
  findings: '', checklist: inspectionChecklist(type),
  recommendedJobs: [{ id: cryptoId('recommendation'), name: '', detail: '', priority: 'Recommended', approved: false }],
  parts: [{ id: cryptoId('estimate-part'), name: '', partNumber: '', quantity: 1, unit: 'each', unitPrice: 0 }],
  labor: [{ id: cryptoId('labor'), name: '', mode: 'fixed', hours: 0, rate: 0, fixed: 0 }],
  consumables: 0, additionalCost: 0, discount: 0, taxRate: 0,
});
function cryptoId(prefix: string): string { return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`; }
const number = (value: unknown) => value === '' || value == null ? 0 : Number.isFinite(Number(value)) ? Number(value) : 0;
export function calculateEstimate(data: Inspection) {
  const parts = data.parts.reduce((sum, row) => sum + number(row.quantity) * number(row.unitPrice), 0);
  const labor = data.labor.reduce((sum, row) => sum + (row.mode === 'hourly' ? number(row.hours) * number(row.rate) : number(row.fixed)), 0);
  const additional = number(data.consumables) + number(data.additionalCost);
  const discount = number(data.discount);
  const taxable = Math.max(0, parts + labor + additional - discount);
  const tax = taxable * number(data.taxRate) / 100;
  return { parts, labor, additional, discount, tax, total: Math.max(0, taxable + tax) };
}
export function validateIntake(input: { name: string; plate: string; year: string | number | null; odometer: string | number | null }, currentYear = new Date().getFullYear()): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Customer name is required.');
  if (!input.plate.trim()) errors.push('License plate is required.');
  if (input.odometer !== '' && input.odometer != null && (!Number.isFinite(Number(input.odometer)) || Number(input.odometer) < 0)) errors.push('Odometer must be zero or greater.');
  if (input.year !== '' && input.year != null && (!Number.isInteger(Number(input.year)) || Number(input.year) < 1886 || Number(input.year) > currentYear + 1)) errors.push(`Vehicle year must be between 1886 and ${currentYear + 1}.`);
  return errors;
}
export function validateInspection(data: Inspection): string[] {
  const errors: string[] = [];
  const money = [['Consumables', data.consumables], ['Additional cost', data.additionalCost], ['Discount', data.discount]] as const;
  for (const [label, value] of money) if (!Number.isFinite(Number(value)) || Number(value) < 0) errors.push(`${label} must be zero or greater.`);
  for (const [i, row] of data.parts.entries()) {
    if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) errors.push(`Part quantity ${i + 1} must be greater than zero.`);
    if (!Number.isFinite(Number(row.unitPrice)) || Number(row.unitPrice) < 0) errors.push(`Part price ${i + 1} must be zero or greater.`);
  }
  for (const [i, row] of data.labor.entries()) {
    const values = row.mode === 'hourly' ? [['Hours', row.hours], ['Rate', row.rate]] as const : [['Labor cost', row.fixed]] as const;
    for (const [label, value] of values) if (!Number.isFinite(Number(value)) || Number(value) < 0) errors.push(`${label} ${i + 1} must be zero or greater.`);
  }
  if (!Number.isFinite(Number(data.taxRate)) || Number(data.taxRate) < 0 || Number(data.taxRate) > 100) errors.push('Tax rate must be between 0 and 100 percent.');
  return errors;
}

export function workDuration(start: string, end: string): string {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return '';
  const [sh, sm] = start.split(':').map(Number), [eh, em] = end.split(':').map(Number);
  let minutes = eh * 60 + em - sh * 60 - sm;
  if (minutes < 0) minutes += 1440;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
export function qcWarning(checks: QCCheck[], ready: boolean): string {
  if (!ready) return '';
  return checks.some(check => check.result === 'Needs attention' || check.result === 'Not checked')
    ? 'This job is marked ready, but one or more required QC checks have not passed. Review the checklist before handover.' : '';
}
export function validateOdometers(before: number | null, after: number | null): string[] {
  const errors: string[] = [];
  for (const [label, value] of [['Odometer before road test', before], ['Odometer after road test', after]] as const) if (value !== null && (!Number.isFinite(value) || value < 0)) errors.push(`${label} must be zero or greater.`);
  if (before !== null && after !== null && after < before) errors.push('Odometer after road test cannot be lower than the starting odometer.');
  return errors;
}
export function advanceStatus(job: WorkshopJob, status: WorkshopJob['status']): WorkshopJob { return { ...job, status, updatedAt: new Date().toISOString() }; }
