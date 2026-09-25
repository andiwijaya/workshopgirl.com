import type { Spectrum, AnalysisResult } from '../../lib/dsp/types.ts';

const INK = '#d7dbdf', GRID = '#343a42', PINK = '#ff79ae', BLUE = '#6ad6ef';
function surface(canvas: HTMLCanvasElement) {
  const width = Math.max(280, canvas.clientWidth), height = canvas.clientHeight || 220;
  const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable in this browser.');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = '#191e25'; context.fillRect(0, 0, width, height);
  context.font = '12px sans-serif'; context.fillStyle = INK; context.lineWidth = 1;
  return { context, width, height, left: 48, right: width - 14, top: 16, bottom: height - 32 };
}
const frequencyLabel = (value: number) => value >= 1000 ? `${+(value / 1000).toFixed(1)}k` : `${Math.round(value)}`;
const frequencyTicks = (max: number) => [20, 100, 1000, 10000].filter(value => value < max * 0.8).concat(max);

export function drawWaveform(canvas: HTMLCanvasElement, waveform?: AnalysisResult['waveform'], duration = 0): void {
  const { context: c, left, right, top, bottom } = surface(canvas);
  const middle = (top + bottom) / 2, scale = (bottom - top) / 2;
  c.strokeStyle = GRID; c.beginPath(); c.moveTo(left, middle); c.lineTo(right, middle); c.stroke();
  c.fillText('+1', 12, top + 9); c.fillText('0', 18, middle + 4); c.fillText('−1', 12, bottom);
  c.fillText('0 s', left, bottom + 23); c.textAlign = 'right'; c.fillText(`${duration.toFixed(3)} s`, right, bottom + 23); c.textAlign = 'left';
  if (!waveform) { c.fillText('Choose a sound to begin', left + 12, middle - 15); return; }
  c.strokeStyle = PINK; c.beginPath();
  for (let i = 0; i < waveform.min.length; i++) {
    const x = left + i / Math.max(1, waveform.min.length - 1) * (right - left);
    c.moveTo(x, middle - Math.max(-1, Math.min(1, waveform.min[i])) * scale);
    c.lineTo(x, middle - Math.max(-1, Math.min(1, waveform.max[i])) * scale);
  }
  c.stroke();
}

export function drawSpectrum(canvas: HTMLCanvasElement, spectra: Spectrum[] = []): void {
  const { context: c, left, right, top, bottom } = surface(canvas);
  const maxFrequency = spectra.length ? Math.max(...spectra.map(s => s.sampleRate / 2)) : 24000;
  const x = (hz: number) => left + Math.log(hz / 20) / Math.log(maxFrequency / 20) * (right - left);
  const y = (db: number) => bottom - Math.max(0, Math.min(100, db + 100)) / 100 * (bottom - top);
  for (const db of [-100, -75, -50, -25, 0]) {
    c.strokeStyle = GRID; c.beginPath(); c.moveTo(left, y(db)); c.lineTo(right, y(db)); c.stroke();
    c.fillStyle = INK; c.fillText(String(db), 7, y(db) + 4);
  }
  for (const hz of frequencyTicks(maxFrequency)) {
    c.textAlign = hz === maxFrequency ? 'right' : 'center'; c.fillText(frequencyLabel(hz), x(hz), bottom + 23);
  }
  c.textAlign = 'left';
  spectra.forEach((spectrum, index) => {
    c.strokeStyle = index === 0 ? PINK : BLUE; c.lineWidth = 1.5; c.beginPath();
    let started = false;
    for (let bin = 1; bin < spectrum.db.length; bin++) {
      const hz = bin * spectrum.resolution;
      if (hz < 20) continue;
      if (!started) { c.moveTo(x(hz), y(spectrum.db[bin])); started = true; }
      else c.lineTo(x(hz), y(spectrum.db[bin]));
    }
    c.stroke();
  });
}

export function drawSpectrogram(canvas: HTMLCanvasElement, columns: Float32Array[] = [], times: number[] = [], sampleRate = 48000, fftSize = 4096): void {
  const { context: c, left, right, top, bottom } = surface(canvas);
  const maxFrequency = sampleRate / 2;
  if (columns.length) {
    const raster = document.createElement('canvas'); raster.width = columns.length; raster.height = 128;
    const rc = raster.getContext('2d')!;
    const pixels = rc.createImageData(raster.width, raster.height);
    for (let row = 0; row < raster.height; row++) {
      const low = 20 * (maxFrequency / 20) ** (1 - (row + 1) / raster.height);
      const high = 20 * (maxFrequency / 20) ** (1 - row / raster.height);
      const first = Math.max(1, Math.floor(low * fftSize / sampleRate));
      const last = Math.min(fftSize / 2, Math.max(first, Math.ceil(high * fftSize / sampleRate)));
      for (let col = 0; col < columns.length; col++) {
        let db = -160;
        for (let k = first; k <= last; k++) db = Math.max(db, columns[col][k]);
        const value = Math.max(0, Math.min(1, (db + 100) / 100));
        const offset = (row * raster.width + col) * 4;
        pixels.data[offset] = Math.round(25 + 230 * value);
        pixels.data[offset + 1] = Math.round(30 + 185 * value ** 2);
        pixels.data[offset + 2] = Math.round(37 + 100 * Math.sin(value * Math.PI));
        pixels.data[offset + 3] = 255;
      }
    }
    rc.putImageData(pixels, 0, 0); c.imageSmoothingEnabled = false;
    c.drawImage(raster, left, top, right - left, bottom - top);
  }
  c.fillStyle = INK;
  for (const hz of [100, 1000, 10000].filter(hz => hz < maxFrequency)) {
    const y = bottom - Math.log(hz / 20) / Math.log(maxFrequency / 20) * (bottom - top);
    c.fillText(frequencyLabel(hz), 5, y + 4);
  }
  c.fillText(`${(times[0] ?? 0).toFixed(1)} s`, left, bottom + 23);
  c.textAlign = 'right'; c.fillText(`${(times.at(-1) ?? 0).toFixed(1)} s`, right, bottom + 23); c.textAlign = 'left';
}
