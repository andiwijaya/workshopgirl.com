import { DspEngine } from '../dsp/engine.ts';
import { waveformEnvelope } from '../dsp/offline.ts';
import type { LiveWorkerRequest, LiveWorkerResponse } from './live-types.ts';

const scope = globalThis as unknown as { onmessage: (event: MessageEvent<LiveWorkerRequest>) => void; postMessage: (response: LiveWorkerResponse) => void };
let engine: DspEngine | undefined;
let clockId = '';
scope.onmessage = ({ data }) => {
  try {
    if (data.type === 'init') { clockId = data.clockId; engine = new DspEngine(data.sampleRate, data.fftSize); scope.postMessage({ type: 'ready' }); return; }
    if (!engine) throw new Error('Live DSP worker is not initialized.');
    const frame = data.frame;
    scope.postMessage({ type: 'measurement', measurement: {
      spectrum: engine.analyze(frame.samples), waveform: waveformEnvelope(frame.samples),
      metadata: { mode: 'worklet', clock: 'audio-context', clockId, frameStart: frame.frameStart, timeSeconds: (frame.frameStart + engine.fftSize / 2) / engine.sampleRate, sequence: frame.sequence, droppedFrames: frame.droppedFrames, discontinuities: frame.discontinuities },
    } });
  } catch (error) { scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Live analysis failed.' }); }
};
