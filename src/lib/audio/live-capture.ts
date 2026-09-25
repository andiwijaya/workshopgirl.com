import workletUrl from './pcm-capture.worklet.ts?worker&url';
import { DspEngine } from '../dsp/engine.ts';
import { waveformEnvelope } from '../dsp/offline.ts';
import type { Microphone } from './microphone.ts';
import type { LiveMeasurement, LiveWorkerResponse, PcmFrame } from './live-types.ts';

/** Worklet + worker with two-frame backpressure; explicitly labeled sampled fallback. */
export class LiveCapture {
  private node: AudioWorkletNode | undefined;
  private mute: GainNode | undefined;
  private worker: Worker | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private generation = 0;
  private cancelSetup: (() => void) | undefined;
  private microphone: Microphone | undefined;

  async start(microphone: Microphone, fftSize: number, receive: (measurement: LiveMeasurement) => void, modeChanged: (mode: 'worklet' | 'sampled', reason?: string) => void): Promise<void> {
    this.stop(); this.microphone = microphone;
    const token = this.generation, context = microphone.context!;
    const clockId = crypto.randomUUID();
    const settings = microphone.stream?.getAudioTracks()[0]?.getSettings();
    const browserEvidence = { audioWorkletAvailable: !!context.audioWorklet && !!globalThis.AudioWorkletNode,
      processing: { autoGainControl: settings?.autoGainControl ?? null, noiseSuppression: settings?.noiseSuppression ?? null, echoCancellation: settings?.echoCancellation ?? null },
      outputBaseLatencySeconds: Number.isFinite(context.baseLatency) ? context.baseLatency : null };
    const deliver = (measurement: LiveMeasurement) => receive({ ...measurement, metadata: { ...measurement.metadata, browserEvidence } });
    const current = () => token === this.generation && microphone.context === context;
    const fallback = (reason: string) => {
      if (!current()) return;
      this.releaseProcessors();
      const analyser = microphone.analyser, engine = new DspEngine(context.sampleRate, fftSize), samples = new Float32Array(fftSize);
      if (!analyser) return;
      let sequence = 0;
      this.timer = setInterval(() => {
        if (!current() || context.state !== 'running') return;
        analyser.getFloatTimeDomainData(samples);
        deliver({ spectrum: engine.analyze(samples), waveform: waveformEnvelope(samples), metadata: { mode: 'sampled', clock: 'audio-context', clockId, frameStart: null, timeSeconds: context.currentTime - fftSize / (2 * context.sampleRate), sequence: sequence++, droppedFrames: 0, discontinuities: 0 } });
      }, 100);
      modeChanged('sampled', reason);
    };
    if (!context.audioWorklet || !globalThis.AudioWorkletNode || !globalThis.Worker) { fallback('Continuous capture is unavailable.'); return; }
    try {
      // Race module loading/worker startup against both stop and a bounded startup timeout.
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => finish(new Error('Continuous capture startup timed out.')), 5000);
        const finish = (issue?: Error) => { if (settled) return; settled = true; clearTimeout(timeout); this.cancelSetup = undefined; if (issue) reject(issue); else resolve(); };
        this.cancelSetup = () => finish(new Error('Capture cancelled.'));
        void context.audioWorklet.addModule(workletUrl).then(() => {
          if (settled) return;
          if (!current()) { finish(new Error('Capture cancelled.')); return; }
          this.worker = new Worker(new URL('./live-analysis.worker.ts', import.meta.url), { type: 'module' });
          this.worker.onerror = () => finish(new Error('Live DSP worker could not start.'));
          this.worker.onmessage = ({ data }: MessageEvent<LiveWorkerResponse>) => { if (data.type === 'ready') finish(); else if (data.type === 'error') finish(new Error(data.message)); };
          this.worker.postMessage({ type: 'init', sampleRate: context.sampleRate, fftSize, clockId });
        }).catch(issue => finish(issue instanceof Error ? issue : new Error('Capture module unavailable.')));
      });
      if (!current()) return;
      this.node = new AudioWorkletNode(context, 'workshopgirl-pcm', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 1, channelCountMode: 'explicit', processorOptions: { fftSize } });
      const node = this.node;
      const active = () => current() && this.node === node;
      let lastReceived = performance.now();
      this.mute = context.createGain(); this.mute.gain.value = 0;
      node.connect(this.mute).connect(context.destination); microphone.connectTap(node);
      node.port.onmessage = ({ data }: MessageEvent<PcmFrame>) => { if (active()) this.worker?.postMessage({ type: 'frame', frame: data }, [data.samples.buffer]); };
      node.onprocessorerror = () => { if (active()) fallback('The continuous capture processor stopped.'); };
      this.worker!.onerror = () => { if (active()) fallback('The live DSP worker stopped.'); };
      this.worker!.onmessage = ({ data }: MessageEvent<LiveWorkerResponse>) => {
        if (!active()) return;
        if (data.type === 'error') { fallback(data.message); return; }
        if (data.type === 'measurement') { lastReceived = performance.now(); deliver(data.measurement); node.port.postMessage('ack'); }
      };
      this.timer = setInterval(() => { if (active() && performance.now() - lastReceived > 2000) fallback('Continuous capture stalled.'); }, 500);
      modeChanged('worklet');
    } catch (issue) { if (current()) fallback(issue instanceof Error ? issue.message : 'Continuous capture unavailable.'); }
  }

  private releaseProcessors(): void {
    clearInterval(this.timer); this.timer = undefined;
    if (this.node) { this.microphone?.disconnectTap(this.node); this.node.onprocessorerror = null; this.node.port.postMessage('stop'); this.node.port.onmessage = null; this.node.port.close(); this.node.disconnect(); this.node = undefined; }
    this.mute?.disconnect(); this.mute = undefined;
    this.worker?.terminate(); this.worker = undefined;
  }
  stop(): void { this.generation++; this.cancelSetup?.(); this.cancelSetup = undefined; this.releaseProcessors(); this.microphone = undefined; }
}
