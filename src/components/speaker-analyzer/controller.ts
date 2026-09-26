import { Microphone, microphoneError } from '../../lib/audio/microphone.ts';
import { LiveCapture } from '../../lib/audio/live-capture.ts';
import { SpeakerSession, relativeEnergy, type Scores } from '../../lib/domains/speaker/profile.ts';
import type { LiveMeasurement } from '../../lib/audio/live-types.ts';

export function mountSpeaker(root: HTMLElement) {
  const el = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const start = el<HTMLButtonElement>('speaker-start'), stop = el<HTMLButtonElement>('speaker-stop');
  const canvas = el<HTMLCanvasElement>('speaker-spectrum');
  const microphone = new Microphone(), capture = new LiveCapture(), session = new SpeakerSession();
  const events = new AbortController(), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let generation = 0, disposed = false, phase = 'idle', lastDraw = 0, lastText = 0, lastFrame = 0;
  let latest: ReturnType<SpeakerSession['observe']> | undefined, mode = '', upperHz = 20000;
  let smooth: Scores = [0, 0, 0];
  const bars = new Float32Array(48), targets = new Float32Array(48);
  function controls() { root.dataset.state = phase; start.disabled = phase !== 'idle'; stop.disabled = phase === 'idle'; }
  function draw() {
    const width = canvas.clientWidth, height = canvas.clientHeight, ratio = Math.min(devicePixelRatio || 1, 2);
    if (!width || !height) return;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const context = canvas.getContext('2d'); if (!context) return;
    context.scale(ratio, ratio); context.clearRect(0, 0, width, height);
    context.strokeStyle = '#ffffff16';
    for (const fraction of [0.25, 0.5, 0.75]) { context.beginPath(); context.moveTo(0, height * fraction); context.lineTo(width, height * fraction); context.stroke(); }
    const gap = 3, barWidth = width / bars.length;
    for (let i = 0; i < bars.length; i++) {
      const frequency = 20 * (upperHz / 20) ** ((i + 0.5) / bars.length);
      context.fillStyle = frequency < 250 ? '#f38db3' : frequency < 4000 ? '#f6cb87' : '#8bd1c3';
      const h = Math.max(2, bars[i] * (height - 8));
      context.fillRect(i * barWidth, height - h, Math.max(1, barWidth - gap), h);
    }
  }
  function text() {
    const available = latest?.bands?.available;
    const live = latest?.valid ? relativeEnergy(smooth) : null;
    for (const [i, name] of ['bass', 'mid', 'treble'].entries()) {
      el(`speaker-${name}-value`).textContent = available?.[i] === false ? 'Unavailable' : live ? `${live[i]}%` : '—';
      const meter = el<HTMLMeterElement>(`speaker-${name}-meter`); meter.value = live?.[i] ?? 0;
    }
    const profile = session.profile;
    const profileText = profile ?? (phase === 'idle' ? 'Ready to listen' : 'Building your sound profile…');
    if (el('speaker-profile').textContent !== profileText) el('speaker-profile').textContent = profileText;
    el('speaker-profile').dataset.profile = profile ?? '';
    const summary = session.validSeconds > 0 ? relativeEnergy(session.scores) : null;
    el('speaker-summary').textContent = summary ? `Bass ${summary[0]}% · Mid ${summary[1]}% · Treble ${summary[2]}%` : 'Your session balance will appear here.';
    el('speaker-duration').textContent = `${session.validSeconds.toFixed(1)} seconds of valid active audio${profile ? ' · session average' : ' · at least 10 seconds needed'}`;
    el<HTMLProgressElement>('speaker-progress').value = Math.min(10, session.validSeconds);
    el('speaker-observation').textContent = latest?.issue || (phase === 'live' ? 'Listening. Keep your microphone in the same place.' : 'Play music nearby, then start listening.');
    el('speaker-capture-note').textContent = mode;
    el('speaker-range').textContent = upperHz < 20000 ? `Captured range ends at ${(upperHz / 1000).toFixed(1)} kHz. No frequencies above this limit are included.${upperHz <= 4000 ? ' Treble is unavailable.' : ' Treble covers only the available range.'}` : 'Frequencies captured by your microphone · 20 Hz–20 kHz';
    el('speaker-upper-label').textContent = `${Number((upperHz / 1000).toFixed(1))}k Hz`;
    el('speaker-treble-range').textContent = upperHz <= 4000 ? 'Above capture range' : `4–${Number((upperHz / 1000).toFixed(1))} kHz`;
  }
  function receive(measurement: LiveMeasurement) {
    latest = session.observe(measurement.spectrum, measurement.metadata);
    const now = performance.now(), dt = lastFrame ? Math.min(0.25, (now - lastFrame) / 1000) : 0.1; lastFrame = now;
    const alpha = 1 - Math.exp(-dt / 0.35);
    smooth = smooth.map((v, i) => v + ((latest?.valid ? latest.bands!.scores[i] : 0) - v) * alpha) as Scores;
    upperHz = latest.bands?.upperHz ?? 20000; targets.fill(0);
    if (latest.valid) {
      const s = measurement.spectrum;
      for (let k = 1; k < s.db.length; k++) {
        const f = k * s.sampleRate / s.fftSize;
        if (f < 20 || f > upperHz) continue;
        const bin = Math.min(47, Math.floor(Math.log(f / 20) / Math.log(upperHz / 20) * 48));
        targets[bin] = Math.max(targets[bin], Math.max(0, Math.min(1, (s.db[k] + 90) / 90)));
      }
    }
    for (let i = 0; i < bars.length; i++) bars[i] += (targets[i] - bars[i]) * alpha;
    if (now - lastDraw >= (reducedMotion.matches ? 250 : 100)) { draw(); lastDraw = now; }
    if (now - lastText >= 500) { text(); lastText = now; }
  }
  function end(message = 'Stopped. Your microphone is off. Your session profile stays here until you start again.') {
    generation++; phase = 'idle'; capture.stop(); microphone.stop(); controls(); text();
    // The meters and chart are the retained last frame, never an animated signal after Stop.
    el('speaker-status').textContent = message;
    if (session.validSeconds > 0 && !session.profile) el('speaker-profile').textContent = 'Not enough active audio yet';
  }
  start.addEventListener('click', async () => {
    if (disposed || phase !== 'idle') return;
    const token = ++generation; session.reset(); latest = undefined; smooth = [0, 0, 0]; bars.fill(0); mode = ''; upperHz = 20000; lastFrame = lastText = lastDraw = 0;
    phase = 'requesting'; controls(); text(); draw(); el('speaker-status').textContent = 'Allow microphone access to start listening. No recording is made.';
    try {
      await microphone.start(8192, () => end('Listening interrupted. Your microphone is off. Start again when ready.'));
      if (token !== generation || disposed) return;
      phase = 'live'; controls(); el('speaker-status').textContent = 'Listening · microphone on';
      await capture.start(microphone, 8192, data => { if (token === generation && !disposed) receive(data); }, nextMode => {
        if (token !== generation) return;
        mode = nextMode === 'worklet' ? 'Continuous capture · local processing' : 'Sampled capture · active time counts observed windows only';
      });
    } catch (error) {
      if (token !== generation || disposed) return;
      // This microphone-only tool offers no file import. Keep the shared adapter untouched.
      end(microphoneError(error).replace(/ You can still open an audio file\./, '').replace(/,? or open an audio file\./, '.'));
    }
  }, { signal: events.signal });
  stop.addEventListener('click', () => end(), { signal: events.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden && phase !== 'idle') end('Listening paused because this tab was hidden. Your microphone is off.'); }, { signal: events.signal });
  const observer = new ResizeObserver(draw); observer.observe(canvas);
  function dispose() { if (disposed) return; disposed = true; end('Your microphone is off.'); observer.disconnect(); events.abort(); }
  window.addEventListener('pagehide', event => {
    dispose();
    // A back/forward-cache restore keeps this DOM and does not rerun the page script.
    if (event.persisted) window.addEventListener('pageshow', () => mountSpeaker(root), { once: true });
  }, { signal: events.signal });
  document.addEventListener('astro:before-swap', dispose, { signal: events.signal });
  controls(); text(); draw(); el('speaker-status').textContent = 'Ready. Your microphone is off.';
}
