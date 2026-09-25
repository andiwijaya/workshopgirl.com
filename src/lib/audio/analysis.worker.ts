import { analyzeAudio } from '../dsp/offline.ts';
import type { WorkerRequest, WorkerResponse } from '../dsp/types.ts';

const scope = globalThis as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => void; postMessage: (response: WorkerResponse) => void };
scope.onmessage = ({ data }) => {
  try {
    const result = analyzeAudio(data.samples, data.sampleRate, data.fftSize, progress => scope.postMessage({ type: 'progress', progress }));
    scope.postMessage({ type: 'result', result });
  } catch (error) {
    scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Analysis failed.' });
  }
};
