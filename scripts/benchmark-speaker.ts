import { performance } from 'node:perf_hooks';
import { DspEngine } from '../src/lib/dsp/engine.ts';
import { SpeakerSession, relativeEnergy } from '../src/lib/domains/speaker/profile.ts';
import type { CaptureMetadata } from '../src/lib/audio/live-types.ts';

const spectrum = new DspEngine(48000, 8192).analyze(Float32Array.from({ length: 8192 }, (_, i) => 0.3 * Math.sin(2 * Math.PI * 100 * i / 48000)));
const session = new SpeakerSession();
const metadata: CaptureMetadata = { mode: 'worklet', clock: 'audio-context', clockId: 'speaker-benchmark', timeSeconds: 0, frameStart: 0, sequence: 0, droppedFrames: 0, discontinuities: 0 };
const times: number[] = [];
for (let i = 0; i < 1100; i++) {
  metadata.timeSeconds = i * 4096 / 48000; metadata.sequence = i;
  const start = performance.now(); session.observe(spectrum, metadata); relativeEnergy(session.scores); void session.profile;
  if (i >= 100) times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
console.log(`Node ${process.version} / ${process.platform} ${process.arch}. Speaker interpretation only; excludes unchanged DSP, device capture and rendering.`);
console.log(JSON.stringify({ name: '4097 bins: octave normalization, session accumulation, classification and percentages', iterations: times.length, medianMs: +times[500].toFixed(3), p95Ms: +times[950].toFixed(3), retainedSessionScores: session.scores.length, validSeconds: +session.validSeconds.toFixed(3) }));
