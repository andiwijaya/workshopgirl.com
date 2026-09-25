import { expect, type Page } from '@playwright/test';

export function wav(frequencies = [440], amplitude = 0.3, seconds = 1, stereo = false): Buffer {
  const rate = 48000, length = rate * seconds, channels = stereo ? 2 : 1;
  const buffer = Buffer.alloc(44 + length * channels * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * channels * 2, 28); buffer.writeUInt16LE(channels * 2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(length * channels * 2, 40);
  for (let i = 0; i < length; i++) {
    const value = frequencies.reduce((sum, hz) => sum + amplitude * Math.sin(2 * Math.PI * hz * i / rate), 0);
    for (let channel = 0; channel < channels; channel++) buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value * (channel ? -1 : 1))) * 32767), 44 + (i * channels + channel) * 2);
  }
  return buffer;
}
export async function upload(page: Page, buffer = wav(), name = 'tone.wav') {
  await page.locator('#audio-file').setInputFiles({ name, mimeType: 'audio/wav', buffer });
  await expect(page.locator('#analyzer-status')).toContainText('Complete');
}
export async function expectTone(page: Page, hz = 440) {
  await expect.poll(async () => {
    const frequency = parseFloat(await page.locator('#dominant-frequency').innerText());
    const bin = parseFloat(await page.locator('#frequency-resolution').innerText());
    return Math.abs(frequency - hz) <= bin;
  }).toBe(true);
}
export async function syntheticMicrophone(page: Page, delayed = false, frequencies = [440]) {
  await page.addInitScript(({ delayed, frequencies }) => {
    const state = { calls: 0, contexts: [] as AudioContext[], tracks: [] as MediaStreamTrack[], resolve: undefined as (() => void) | undefined };
    Object.assign(window, { audioTest: state });
    const OriginalContext = window.AudioContext;
    window.AudioContext = class extends OriginalContext { constructor(options?: AudioContextOptions) { super(options); state.contexts.push(this); } };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      state.calls++;
      const context = new OriginalContext();
      const gain = context.createGain(), destination = context.createMediaStreamDestination();
      gain.gain.value = 0.3 / frequencies.length; gain.connect(destination);
      const oscillators = frequencies.map(frequency => { const oscillator = context.createOscillator(); oscillator.frequency.value = frequency; oscillator.connect(gain); oscillator.start(); return oscillator; });
      await context.resume();
      const track = destination.stream.getAudioTracks()[0]; state.tracks.push(track);
      const originalStop = track.stop.bind(track);
      track.stop = () => { originalStop(); oscillators.forEach(oscillator => oscillator.stop()); void context.close(); };
      if (delayed) await new Promise<void>(resolve => { state.resolve = resolve; });
      return destination.stream;
    } });
  }, { delayed, frequencies });
}
export const audioState = (page: Page) => page.evaluate(() => {
  const state = (window as unknown as { audioTest: { calls: number; contexts: AudioContext[]; tracks: MediaStreamTrack[] } }).audioTest;
  return { calls: state.calls, contexts: state.contexts.map(c => c.state), tracks: state.tracks.map(t => t.readyState) };
});
