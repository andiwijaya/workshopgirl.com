import { DspEngine } from '../../lib/dsp/engine.ts';
import { waveformEnvelope } from '../../lib/dsp/offline.ts';
import type { AnalysisResult, Snapshot, Spectrum, WorkerResponse } from '../../lib/dsp/types.ts';
import { Microphone, microphoneError } from '../../lib/audio/microphone.ts';
import { decodeAudio, validateFile } from '../../lib/audio/decode.ts';
import { AudioRecorder } from '../../lib/audio/recording.ts';
import { drawWaveform, drawSpectrum, drawSpectrogram } from './charts.ts';
import { updateMeasurements, updateComparison } from './readouts.ts';
import { LiveCapture } from '../../lib/audio/live-capture.ts';
import type { AnalyzerExtension } from './extension.ts';

export function mountAnalyzer<T extends Snapshot = Snapshot>(root: HTMLElement, extension: AnalyzerExtension<T> = {}): { refresh: () => void } {
  const el = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const start = el<HTMLButtonElement>('start-mic'), stop = el<HTMLButtonElement>('stop-analysis');
  const file = el<HTMLInputElement>('audio-file'), settings = el<HTMLSelectElement>('fft-size');
  const record = el<HTMLButtonElement>('record-audio'), playback = el<HTMLAudioElement>('audio-playback');
  const waveformCanvas = el<HTMLCanvasElement>('waveform-chart'), spectrumCanvas = el<HTMLCanvasElement>('spectrum-chart');
  const spectrogramCanvas = el<HTMLCanvasElement>('spectrogram-chart'), comparisonCanvas = el<HTMLCanvasElement>('comparison-chart');
  const microphone = new Microphone(), recorder = new AudioRecorder(), events = new AbortController();
  const liveCapture = new LiveCapture();
  let phase: 'idle' | 'requesting' | 'live' | 'loading' = 'idle';
  let spectrum: Spectrum | undefined, result: AnalysisResult | undefined;
  let waveform: AnalysisResult['waveform'] | undefined, duration = 0;
  let columns: Float32Array[] = [], times: number[] = [];
  let columnSeconds: number | undefined;
  let worker: Worker | undefined, generation = 0, raf = 0, disposed = false, objectUrl: string | undefined;
  let decodeAbort: AbortController | undefined;
  let label = '', source: Snapshot['source'] = 'live frame', a: T | undefined, b: T | undefined;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const status = (text: string) => { el('analyzer-status').textContent = text; };
  const error = (text = '') => { el('analyzer-error').textContent = text; el('analyzer-error').hidden = !text; };
  const listen = (target: EventTarget, type: string, handler: EventListener) => target.addEventListener(type, handler, { signal: events.signal });

  function syncControls() {
    const busy = phase !== 'idle';
    start.disabled = busy; file.disabled = busy; settings.disabled = busy || !!result;
    stop.disabled = !busy; record.disabled = phase !== 'live' || !globalThis.MediaRecorder;
    record.textContent = recorder.active ? 'Finish recording' : 'Record clip';
    const captureDisabled = !spectrum || (busy && !(phase === 'live' && extension.liveSnapshots)) || extension.canCapture?.() === false;
    el<HTMLButtonElement>('save-a').disabled = captureDisabled;
    el<HTMLButtonElement>('save-b').disabled = captureDisabled;
    el<HTMLButtonElement>('clear-comparison').disabled = !a && !b;
    el<HTMLButtonElement>('clear-audio').disabled = busy;
  }

  function draw() {
    drawWaveform(waveformCanvas, waveform, duration);
    drawSpectrum(spectrumCanvas, spectrum ? [spectrum] : [], extension.markers?.(), extension.minimumFrequency);
    drawSpectrogram(spectrogramCanvas, columns, times, spectrum?.sampleRate, spectrum?.fftSize, extension.minimumFrequency, columnSeconds);
    if (a && b) drawSpectrum(comparisonCanvas, [a.spectrum, b.spectrum], [], extension.minimumFrequency);
  }

  function clearClip() {
    playback.pause(); playback.removeAttribute('src'); playback.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = undefined;
    el('playback-panel').hidden = true;
    el<HTMLAnchorElement>('download-audio').removeAttribute('href');
  }

  function resetMeasurement() {
    extension.reset?.();
    spectrum = undefined; result = undefined; waveform = undefined; duration = 0; columns = []; times = []; columnSeconds = undefined;
    el('dominant-frequency').textContent = '—'; el('rms-level').textContent = '—'; el('frequency-resolution').textContent = '—';
    el('sample-details').textContent = 'Actual decoded / device sample rate';
    el('peak-list').replaceChildren(); el('band-list').replaceChildren(); el('measurement-note').textContent = 'Waiting for audio.';
    el('source-label').textContent = 'No source'; draw();
  }

  function stopActivity(message = 'Stopped. Your microphone is off. The last measurement is retained.') {
    const wasLive = phase === 'live';
    generation++; cancelAnimationFrame(raf); worker?.terminate(); worker = undefined;
    liveCapture.stop();
    decodeAbort?.abort(); decodeAbort = undefined;
    recorder.stop(); microphone.stop(); phase = 'idle'; syncControls(); status(message);
    if (wasLive) extension.stopped?.(message);
  }

  async function importClip(blob: Blob, name: string) {
    try { validateFile(blob); } catch (issue) { error(microphoneError(issue)); return; }
    recorder.dispose();
    stopActivity(); clearClip(); resetMeasurement(); error();
    const token = ++generation; phase = 'loading'; label = name; source = 'file average'; syncControls();
    status('Decoding audio locally…');
    const decoder = new AbortController(); decodeAbort = decoder;
    try {
      const decoded = await decodeAudio(blob, decoder.signal);
      if (decodeAbort === decoder) decodeAbort = undefined;
      if (token !== generation || disposed) return;
      objectUrl = URL.createObjectURL(blob); playback.src = objectUrl;
      el('playback-panel').hidden = false;
      const download = el<HTMLAnchorElement>('download-audio'); download.href = objectUrl;
      download.download = name;
      el('source-label').textContent = name;
      worker = new Worker(new URL('../../lib/audio/analysis.worker.ts', import.meta.url), { type: 'module' });
      const fail = (message: string) => {
        if (token !== generation || disposed) return;
        worker?.terminate(); worker = undefined; phase = 'idle'; syncControls(); error(message); status('Analysis failed. Choose another clip to retry. Your microphone is off.');
      };
      worker.onerror = () => fail('The analysis worker could not run. Try reloading this page in a current browser.');
      worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (token !== generation || disposed) return;
        if (data.type === 'error') { fail(data.message); return; }
        if (data.type === 'progress') { status(`Analyzing locally… ${Math.round(data.progress * 100)}%`); return; }
        result = data.result; spectrum = result.spectrum; waveform = result.waveform; duration = result.duration;
        extension.measurement?.(spectrum, { mode: 'file', clock: 'file', clockId: crypto.randomUUID(), timeSeconds: duration, durationSeconds: duration, frameStart: null, sequence: 0, droppedFrames: 0, discontinuities: 0 }); extension.render?.();
        columns = result.spectrogram.columns; times = result.spectrogram.times;
        worker?.terminate(); worker = undefined; phase = 'idle';
        updateMeasurements(root, spectrum); syncControls(); draw();
        el('waveform-caption').textContent = 'Whole clip · digital amplitude / time';
        status(`Complete · ${duration.toFixed(2)} s · ${result.frameCount} frames · ${decoded.channels === 2 ? 'stereo, channel 1 analyzed' : 'mono'} · whole-clip power-averaged spectrum. Your microphone is off.`);
      };
      worker.postMessage({ type: 'analyze', samples: decoded.samples, sampleRate: decoded.sampleRate, fftSize: Number(settings.value) }, [decoded.samples.buffer]);
    } catch (issue) {
      if (decodeAbort === decoder) decodeAbort = undefined;
      if (token !== generation || disposed) return;
      phase = 'idle'; worker?.terminate(); worker = undefined; syncControls(); error(microphoneError(issue)); status('Could not analyze this clip. Choose another file to retry. Your microphone is off.');
    }
  }

  async function startLive() {
    recorder.dispose();
    clearClip(); resetMeasurement(); error(); phase = 'requesting'; syncControls();
    status('Waiting for microphone permission. Use Stop to cancel.');
    const token = ++generation;
    try {
      await microphone.start(Number(settings.value), () => stopActivity('Microphone input ended or was suspended. Start again to reconnect.'));
      if (token !== generation || disposed || !microphone.analyser || !microphone.context) return;
      const analyser = microphone.analyser, context = microphone.context;
      phase = 'live'; source = 'live frame'; label = 'Microphone frame'; syncControls(); el('source-label').textContent = 'Live microphone';
      const trackSettings = microphone.stream?.getAudioTracks()[0]?.getSettings();
      const processing = trackSettings?.echoCancellation || trackSettings?.noiseSuppression || trackSettings?.autoGainControl;
      status(`Live · microphone on. ${processing ? 'Device signal processing is active and can alter measurements.' : 'Unprocessed input requested; hardware processing may still apply.'}`);
      el('waveform-caption').textContent = 'Latest frame · digital amplitude / time';
      if (extension.continuous) {
        let lastText = -Infinity, lastDraw = -Infinity, changed = false;
        await liveCapture.start(microphone, analyser.fftSize, measurement => {
          if (token !== generation || phase !== 'live') return;
          const firstMeasurement = !spectrum;
          spectrum = measurement.spectrum; waveform = measurement.waveform; duration = spectrum.fftSize / spectrum.sampleRate;
          columnSeconds = measurement.metadata.mode === 'worklet' ? duration / 2 : 0.1;
          columns.push(spectrum.db); times.push(measurement.metadata.timeSeconds);
          while (columns.length > 180) { columns.shift(); times.shift(); }
          extension.measurement?.(spectrum, measurement.metadata); changed = true; if (firstMeasurement) syncControls();
        }, (mode, reason) => {
          if (token !== generation) return;
          columns = []; times = [];
          status(`Live · microphone on · ${mode === 'worklet' ? 'sample-clock capture' : 'sampled fallback'}. ${reason ?? ''} ${processing ? 'Device signal processing is active.' : 'Unprocessed input requested; hardware processing may still apply.'}`);
        });
        const render = (now: number) => {
          if (token !== generation || phase !== 'live') return;
          if (changed && now - lastDraw >= (reducedMotion.matches ? 250 : 100)) { draw(); lastDraw = now; changed = false; }
          if (spectrum && now - lastText >= 500) { updateMeasurements(root, spectrum); extension.render?.(); lastText = now; }
          raf = requestAnimationFrame(render);
        };
        if (token === generation && phase === 'live') raf = requestAnimationFrame(render);
        return;
      }
      const engine = new DspEngine(context.sampleRate, analyser.fftSize), samples = new Float32Array(analyser.fftSize);
      let lastFrame = -Infinity, lastText = -Infinity; const began = performance.now();
      function tick(now: number) {
        if (phase !== 'live' || token !== generation) return;
        const interval = reducedMotion.matches ? 250 : 100;
        if (now - lastFrame >= interval) {
          analyser.getFloatTimeDomainData(samples);
          spectrum = engine.analyze(samples); waveform = waveformEnvelope(samples); duration = samples.length / context.sampleRate;
          columns.push(spectrum.db); times.push((now - began) / 1000);
          if (columns.length > 180) { columns.shift(); times.shift(); }
          lastFrame = now;
          if (now - lastText >= 500) { updateMeasurements(root, spectrum); lastText = now; }
          draw();
        }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    } catch (issue) {
      if (token !== generation || disposed) return;
      stopActivity('Could not start live analysis. Your microphone is off.'); error(microphoneError(issue));
    }
  }

  listen(start, 'click', () => { void startLive(); });
  listen(stop, 'click', () => { stopActivity(); if (spectrum) updateMeasurements(root, spectrum); });
  listen(file, 'change', () => { const selected = file.files?.[0]; file.value = ''; if (selected) void importClip(selected, selected.name); });
  listen(record, 'click', () => {
    if (recorder.active) { recorder.stop(); record.disabled = true; return; }
    if (!microphone.stream) return;
    error();
    try {
      recorder.start(microphone.stream, blob => {
        if (disposed) return;
        el('recording-status').textContent = 'Recording finished. Clip available below.';
        const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        void importClip(blob, `workshopgirl-recording.${extension}`);
      }, message => { error(message); el('recording-status').textContent = 'Recording failed.'; syncControls(); });
      el('recording-status').textContent = '● Recording · finishes automatically after 55 seconds'; syncControls();
    } catch (issue) { error(microphoneError(issue)); }
  });
  listen(el('clear-audio'), 'click', () => { clearClip(); resetMeasurement(); syncControls(); status('Clip cleared. Your microphone is off.'); });
  for (const slot of ['a', 'b'] as const) {
    listen(el(`save-${slot}`), 'click', () => {
      if (!spectrum || (phase !== 'idle' && !(phase === 'live' && extension.liveSnapshots)) || extension.canCapture?.() === false) return;
      const base: Snapshot = { label, source, capturedAt: new Date().toISOString(), spectrum: structuredClone(spectrum) };
      const snapshot = extension.capture ? extension.capture(base) : base as T;
      if (slot === 'a') a = snapshot; else b = snapshot;
      updateComparison(root, a, b); extension.compare?.(a, b); syncControls(); draw();
    });
  }
  listen(el('clear-comparison'), 'click', () => { a = undefined; b = undefined; updateComparison(root); extension.compare?.(); syncControls(); });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) {
      playback.pause();
      if (phase === 'live' || phase === 'requesting') stopActivity('Microphone stopped because the tab was hidden. Start again when ready.');
    }
  });
  listen(window, 'pagehide', () => { stopActivity(); recorder.dispose(); clearClip(); });
  // Astro currently performs full navigation. This also supports a future client router.
  listen(document, 'astro:before-swap', () => {
    disposed = true; stopActivity(); recorder.dispose(); clearClip(); observer.disconnect(); events.abort();
  });
  const observer = new ResizeObserver(() => draw()); observer.observe(root);
  if (!globalThis.MediaRecorder) el('recording-status').textContent = 'Recording is unsupported here. Live analysis and file import are still available.';
  draw(); syncControls();
  return { refresh: () => { extension.render?.(); syncControls(); draw(); } };
}
