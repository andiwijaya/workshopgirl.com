import { performance } from 'node:perf_hooks';
import { DspEngine } from '../src/lib/dsp/engine.ts';
import { waveformEnvelope } from '../src/lib/dsp/offline.ts';
import { analyzeEngine } from '../src/lib/domains/engine/analysis.ts';
import { PeakTracker } from '../src/lib/dsp/peak-tracker.ts';
import { PcmFramer } from '../src/lib/audio/pcm-framer.ts';

console.log(`Node ${process.version} / ${process.platform} ${process.arch}. Synthetic CPU timing; excludes browser rendering, transfers and physical input.`);
for (const rate of [48000, 96000]) {
  const size = 8192, engine = new DspEngine(rate, size), tracker = new PeakTracker();
  const samples = Float32Array.from({ length: size }, (_, i) => [100, 200, 300, 400].reduce((sum, hz, j) => sum + 0.4 / 2 ** j * Math.sin(2 * Math.PI * hz * i / rate), 0));
  const run = (i: number) => {
    const spectrum = engine.analyze(samples);
    const peaks = tracker.update(spectrum.peaks, i * size / (2 * rate), spectrum.resolution);
    analyzeEngine(spectrum, { rpm: 1500, cylinders: 4, cycle: 4, harmonicHz: 100 }, peaks);
    waveformEnvelope(samples);
  };
  for (let i = 0; i < 200; i++) run(i);
  const timings: number[] = [];
  for (let i = 200; i < 1200; i++) { const start = performance.now(); run(i); timings.push(performance.now() - start); }
  timings.sort((a, b) => a - b);
  console.log(JSON.stringify({ sampleRate: rate, fftSize: size, iterations: timings.length, framePipelineMedianMs: +timings[500].toFixed(3), framePipelineP95Ms: +timings[950].toFixed(3), availableHopMs: size / (2 * rate) * 1000 }));
  const framer = new PcmFramer(size), block = samples.subarray(0, 128);
  let windows = 0;
  const start = performance.now();
  for (let frame = 0; frame < rate * 60; frame += block.length) framer.push(block, frame, () => { framer.copyFrame(); windows++; });
  console.log(JSON.stringify({ pcmSeconds: 60, framingMs: +(performance.now() - start).toFixed(2), windows, ringBytes: framer.buffer.byteLength, maxInFlightPcmBytes: 2 * size * 4, maxLiveSpectrogramBytes: 180 * (size / 2 + 1) * 4 }));
}
