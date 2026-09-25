export const MAX_AUDIO_SECONDS = 60;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function validateFile(blob: Blob): void {
  if (!blob.size) throw new Error('This file is empty. Choose another audio file.');
  if (blob.size > MAX_FILE_BYTES) throw new Error('Choose an audio file smaller than 20 MB.');
}

/** Browser decoding may resample. Always return the decoded buffer rate, never a guessed source rate. */
export async function decodeAudio(blob: Blob, signal?: AbortSignal): Promise<{ samples: Float32Array; sampleRate: number; channels: number; duration: number }> {
  validateFile(blob);
  signal?.throwIfAborted();
  if (!globalThis.AudioContext) throw new Error('Audio decoding is unavailable in this browser.');
  const context = new AudioContext();
  const close = () => { if (context.state !== 'closed') void context.close().catch(() => undefined); };
  signal?.addEventListener('abort', close, { once: true });
  try {
    const bytes = await blob.arrayBuffer();
    signal?.throwIfAborted();
    const buffer = await context.decodeAudioData(bytes);
    // Native decoding cannot be forcibly interrupted; discard its late result after cancellation.
    signal?.throwIfAborted();
    if (buffer.duration > MAX_AUDIO_SECONDS) throw new Error('Choose a clip of 60 seconds or less. Trim longer recordings first.');
    if (buffer.numberOfChannels > 2 || buffer.sampleRate > 96000) throw new Error('Choose mono or stereo audio at a decoded sample rate of 96 kHz or less.');
    const samples = new Float32Array(buffer.length);
    // Analyze channel 1, not a mono average: opposite-phase stereo must not silently cancel.
    samples.set(buffer.getChannelData(0));
    return { samples, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels, duration: buffer.duration };
  } catch (error) {
    if (error instanceof DOMException) throw new Error('This audio could not be decoded. Try a valid WAV, MP3, M4A, or another format supported by your browser.');
    throw error;
  } finally {
    signal?.removeEventListener('abort', close);
    if (context.state !== 'closed') await context.close().catch(() => undefined);
  }
}
