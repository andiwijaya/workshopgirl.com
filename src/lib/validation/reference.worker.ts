import { analyzeAudio } from '../dsp/offline.ts';
import { referenceSignal, validateReference, type ReferenceCase } from './reference.ts';
const scope = globalThis as unknown as { onmessage: (event: MessageEvent<{ name: ReferenceCase; sampleRate: number }>) => void; postMessage: (message: unknown) => void };
scope.onmessage = ({ data }) => {
  try {
    const start = performance.now(), reference = referenceSignal(data.name, data.sampleRate);
    const result = analyzeAudio(reference.samples, data.sampleRate, 8192);
    scope.postMessage({ type: 'result', validation: validateReference(data.name, result), elapsedMs: performance.now() - start });
  } catch (error) { scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Validation failed.' }); }
};
