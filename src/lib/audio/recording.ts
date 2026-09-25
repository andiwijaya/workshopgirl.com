export class AudioRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private bytes = 0;
  private discard = false;
  get active(): boolean { return this.recorder?.state === 'recording'; }

  start(stream: MediaStream, onComplete: (blob: Blob) => void, onError: (message: string) => void): void {
    if (this.recorder) throw new Error('The previous recording is still finishing. Try again in a moment.');
    if (!globalThis.MediaRecorder) throw new Error('Recording is unavailable in this browser. Live analysis still works.');
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    this.recorder = recorder; this.chunks = []; this.bytes = 0; this.discard = false;
    recorder.ondataavailable = ({ data }) => {
      if (!this.discard && data.size) { this.chunks.push(data); this.bytes += data.size; }
      if (this.bytes >= 16 * 1024 * 1024) this.stop();
    };
    recorder.onerror = () => { this.discard = true; this.stop(); onError('Recording failed. Live analysis is still available.'); };
    recorder.onstop = () => {
      clearTimeout(this.timer);
      const blob = new Blob(this.chunks, { type: recorder.mimeType });
      this.chunks = []; this.recorder = null;
      if (!this.discard && blob.size) onComplete(blob);
    };
    recorder.start(500);
    // Leave room for recorder chunk/container timing under the 60-second import limit.
    this.timer = setTimeout(() => this.stop(), 55000);
  }

  stop(): void { clearTimeout(this.timer); if (this.recorder?.state === 'recording') this.recorder.stop(); }
  dispose(): void { this.discard = true; this.chunks = []; this.stop(); }
}
