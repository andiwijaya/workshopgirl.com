export class Microphone {
  context: AudioContext | null = null;
  stream: MediaStream | null = null;
  analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private generation = 0;

  async start(fftSize: number, onEnded: () => void): Promise<void> {
    const generation = ++this.generation;
    if (!globalThis.isSecureContext) throw new Error('Microphone access requires HTTPS or localhost. You can still open an audio file.');
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.AudioContext) throw new Error('This browser does not support microphone analysis. Try a current browser or open an audio file.');
    // Create/resume in the click gesture, before the permission dialog resolves (mobile Safari).
    const context = new AudioContext(); this.context = context;
    const resumed = context.resume().catch(() => undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      await resumed;
      if (generation !== this.generation) return;
      if (context.state !== 'running') throw new Error('Audio was suspended. Stop and start again with this tab visible.');
      this.source = context.createMediaStreamSource(stream);
      this.analyser = context.createAnalyser(); this.analyser.fftSize = fftSize;
      this.analyser.smoothingTimeConstant = 0;
      // Analyser is only a PCM tap. Its Blackman-windowed frequency output is never used.
      // No connection to speakers: avoid monitoring feedback near a machine.
      this.source.connect(this.analyser);
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', onEnded, { once: true }));
      context.onstatechange = () => { if (context.state !== 'running' && this.context === context) onEnded(); };
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw error;
    }
  }

  stop(): void {
    this.generation++;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    this.source?.disconnect(); this.source = null; this.analyser?.disconnect(); this.analyser = null;
    if (this.context) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => undefined); this.context = null;
    }
  }
}

export function microphoneError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Microphone permission was denied. Allow access in your browser settings, then try again, or open an audio file.';
    if (error.name === 'NotFoundError') return 'No microphone was found. Connect one and try again, or open an audio file.';
    if (error.name === 'NotReadableError') return 'The microphone is unavailable or being used by another app. Release it and try again.';
  }
  return error instanceof Error ? error.message : 'Could not start the microphone. Please try again.';
}
