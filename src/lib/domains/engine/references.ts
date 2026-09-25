export interface EngineConfiguration { rpm: number | null; cylinders: number | null; cycle: 2 | 4 | null; harmonicHz: number | null }
export interface EngineReference { label: string; frequency: number; kind: 'shaft' | 'firing'; order: number | null }
export const emptyEngineConfiguration = (): EngineConfiguration => ({ rpm: null, cylinders: null, cycle: null, harmonicHz: null });

export function validateEngineConfiguration(config: EngineConfiguration): void {
  if (config.rpm !== null && (!Number.isFinite(config.rpm) || config.rpm < 0 || config.rpm > 30000)) throw new RangeError('RPM must be between 0 and 30,000, or blank.');
  if (config.cylinders !== null && (!Number.isInteger(config.cylinders) || config.cylinders < 1 || config.cylinders > 64)) throw new RangeError('Cylinder count must be an integer from 1 to 64, or blank.');
  if (config.cycle !== null && config.cycle !== 2 && config.cycle !== 4) throw new RangeError('Choose a 2-stroke or 4-stroke cycle, or leave it unspecified.');
  if (config.harmonicHz !== null && (!Number.isFinite(config.harmonicHz) || config.harmonicHz < 1 || config.harmonicHz > 20000)) throw new RangeError('Harmonic reference must be between 1 and 20,000 Hz, or blank.');
}
export function shaftFrequency(rpm: number): number {
  if (!Number.isFinite(rpm) || rpm < 0) throw new RangeError('RPM must be finite and nonnegative.');
  return rpm / 60;
}
export function firingFrequency(rpm: number, cylinders: number, cycle: 2 | 4): number {
  if (!Number.isInteger(cylinders) || cylinders < 1 || (cycle !== 2 && cycle !== 4)) throw new RangeError('Valid cylinder count and engine cycle required.');
  return shaftFrequency(rpm) * cylinders / (cycle === 4 ? 2 : 1);
}
export function engineReferences(config: EngineConfiguration): EngineReference[] {
  validateEngineConfiguration(config);
  if (config.rpm === null || config.rpm === 0) return [];
  const references: EngineReference[] = [0.5, 1, 2, 3, 4].map(order => ({ label: `${order}× RPM`, frequency: shaftFrequency(config.rpm!) * order, kind: 'shaft', order }));
  if (config.cylinders !== null && config.cycle !== null) references.push({ label: 'Firing reference', frequency: firingFrequency(config.rpm, config.cylinders, config.cycle), kind: 'firing', order: null });
  return references;
}
