/** Audio-clock frame assembly independent of browser APIs; one fixed-size ring, 50% overlap. */
export class PcmFramer {
  readonly size: number;
  readonly hop: number;
  readonly buffer: Float32Array;
  discontinuities = 0;
  private write = 0;
  private remaining: number;
  private expectedStart: number | null = null;
  constructor(size: number) {
    if (!Number.isInteger(size) || size < 256 || size > 32768 || (size & (size - 1))) throw new RangeError('Invalid PCM frame size.');
    this.size = size; this.hop = size / 2; this.buffer = new Float32Array(size); this.remaining = size;
  }
  push(block: Float32Array, startFrame: number, emit: (frameStart: number) => void): void {
    if (this.expectedStart !== null && startFrame !== this.expectedStart) {
      this.write = 0; this.remaining = this.size; this.discontinuities++;
    }
    this.expectedStart = startFrame + block.length;
    for (let i = 0; i < block.length; i++) {
      this.buffer[this.write] = block[i]; this.write = (this.write + 1) % this.size;
      if (--this.remaining === 0) { emit(startFrame + i + 1 - this.size); this.remaining = this.hop; }
    }
  }
  copyFrame(): Float32Array {
    const frame = new Float32Array(this.size);
    frame.set(this.buffer.subarray(this.write)); frame.set(this.buffer.subarray(0, this.write), this.size - this.write);
    return frame;
  }
}

/** Limits messages that may wait on the main thread/worker. No queued PCM history. */
export class FrameCredits {
  private available = 2;
  dropped = 0;
  take(): boolean { if (this.available === 0) { this.dropped++; return false; } this.available--; return true; }
  acknowledge(): void { this.available = Math.min(2, this.available + 1); }
}
