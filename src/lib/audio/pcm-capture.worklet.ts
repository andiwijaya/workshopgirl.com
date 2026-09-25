import { FrameCredits, PcmFramer } from './pcm-framer.ts';

// The DOM lib does not describe AudioWorkletGlobalScope; keep these declarations local.
declare const currentFrame: number;
declare class AudioWorkletProcessor { readonly port: MessagePort; }
declare function registerProcessor(name: string, processor: typeof PcmCapture): void;

class PcmCapture extends AudioWorkletProcessor {
  private readonly framer: PcmFramer;
  private readonly credits = new FrameCredits();
  private active = true;
  private sequence = 0;
  constructor(options: { processorOptions: { fftSize: number } }) {
    super(); this.framer = new PcmFramer(options.processorOptions.fftSize);
    this.port.onmessage = ({ data }) => {
      if (data === 'ack') this.credits.acknowledge();
      if (data === 'stop') { this.active = false; this.port.onmessage = null; this.port.close(); }
    };
  }
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    // Explicit silence output + downstream zero gain prevents microphone monitoring/feedback.
    for (const output of outputs) for (const channel of output) channel.fill(0);
    if (!this.active) return false;
    const channel = inputs[0]?.[0];
    if (channel?.length) this.framer.push(channel, currentFrame, frameStart => {
      const sequence = this.sequence++;
      if (!this.credits.take()) return;
      const samples = this.framer.copyFrame();
      this.port.postMessage({ samples, frameStart, sequence, droppedFrames: this.credits.dropped, discontinuities: this.framer.discontinuities }, [samples.buffer]);
    });
    return true;
  }
}
registerProcessor('workshopgirl-pcm', PcmCapture);
