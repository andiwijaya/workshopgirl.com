import assert from 'node:assert/strict';
import test from 'node:test';
import { PcmFramer, FrameCredits } from '../src/lib/audio/pcm-framer.ts';
import type { PcmFrame } from '../src/lib/audio/live-types.ts';

test('PCM assembly preserves every sample across variable render quanta with 50% overlap', () => {
  const framer = new PcmFramer(256), frames: { start: number; samples: Float32Array }[] = [];
  let start = 1000;
  for (const size of [64, 128, 256, 17, 303, 128]) {
    const block = Float32Array.from({ length: size }, (_, i) => start + i);
    framer.push(block, start, frameStart => frames.push({ start: frameStart, samples: framer.copyFrame() })); start += size;
  }
  assert.equal(frames.length, Math.floor((896 - 256) / 128) + 1);
  frames.forEach((frame, index) => { assert.equal(frame.start, 1000 + index * 128); frame.samples.forEach((sample, i) => assert.equal(sample, frame.start + i)); });
  assert.equal(framer.buffer.length, 256);
});
test('Discontinuous sample clocks reset overlap instead of joining unrelated PCM', () => {
  const framer = new PcmFramer(256), output: Float32Array[] = [];
  framer.push(new Float32Array(128).fill(1), 0, () => assert.fail('Too soon'));
  framer.push(new Float32Array(256).fill(2), 500, () => output.push(framer.copyFrame()));
  assert.equal(framer.discontinuities, 1); assert.equal(output.length, 1); assert.ok(output[0].every(value => value === 2));
});
test('Backpressure caps messages at two and counts dropped frames until acknowledged', () => {
  const credits = new FrameCredits(); assert.ok(credits.take()); assert.ok(credits.take());
  for (let i = 0; i < 1000; i++) assert.equal(credits.take(), false);
  assert.equal(credits.dropped, 1000); credits.acknowledge(); assert.ok(credits.take()); assert.equal(credits.take(), false);
});
test('Actual worklet processor emits sample-clock frames, silences output and stops its port', async () => {
  class FakePort {
    onmessage: ((event: { data: string }) => void) | null = null; messages: PcmFrame[] = []; closed = false;
    postMessage(message: PcmFrame) { this.messages.push(message); }
    close() { this.closed = true; }
  }
  class FakeProcessor { port = new FakePort(); }
  let Processor: (new (options: { processorOptions: { fftSize: number } }) => FakeProcessor & { process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean }) | undefined;
  Object.assign(globalThis, { AudioWorkletProcessor: FakeProcessor, currentFrame: 0, registerProcessor: (_name: string, constructor: typeof Processor) => { Processor = constructor; } });
  await import('../src/lib/audio/pcm-capture.worklet.ts');
  const processor = new Processor!({ processorOptions: { fftSize: 256 } });
  const output = new Float32Array(128).fill(1);
  for (let i = 0; i < 8; i++) { Object.assign(globalThis, { currentFrame: i * 128 }); assert.ok(processor.process([[new Float32Array(128).fill(0.3)]], [[output]])); }
  assert.ok(output.every(value => value === 0)); assert.equal(processor.port.messages.length, 2);
  assert.equal(processor.port.messages[0].frameStart, 0); assert.equal(processor.port.messages[1].frameStart, 128);
  processor.port.onmessage!({ data: 'ack' }); Object.assign(globalThis, { currentFrame: 1024 }); processor.process([[new Float32Array(128)]], [[output]]);
  assert.ok(processor.port.messages.at(-1)!.droppedFrames > 0);
  processor.port.onmessage!({ data: 'stop' }); assert.equal(processor.process([], [[output]]), false); assert.ok(processor.port.closed);
});
