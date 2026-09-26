import test from 'node:test';
import assert from 'node:assert/strict';
import { DspEngine } from '../src/lib/dsp/engine.ts';
import { speakerBand, speakerScores, classifySpeaker, relativeEnergy, SpeakerSession, type Scores } from '../src/lib/domains/speaker/profile.ts';
import type { CaptureMetadata } from '../src/lib/audio/live-types.ts';

const near = (a: number, b: number, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance, `${a} versus ${b}`);
function tone(frequency = 100, amplitude = 0.2, rate = 48000) { return new DspEngine(rate, 8192).analyze(Float32Array.from({ length: 8192 }, (_, i) => amplitude * Math.sin(2 * Math.PI * frequency * i / rate))); }
function metadata(timeSeconds: number, changes: Partial<CaptureMetadata> = {}): CaptureMetadata { return { clockId: 'test', clock: 'audio-context', mode: 'worklet', timeSeconds, sequence: Math.round(timeSeconds * 10), frameStart: 0, droppedFrames: 0, discontinuities: 0, ...changes }; }
function feed(session: SpeakerSession, s = tone(), start = 0, end = 10) { for (let i = Math.round(start * 10); i <= Math.round(end * 10); i++) session.observe(s, metadata(i / 10)); }

test('Speaker boundaries are 20/250/4000/20000 Hz with deterministic upper-band ownership', () => {
  for (const [frequency, band] of [[19.99, -1], [20, 0], [249.99, 0], [250, 1], [3999.99, 1], [4000, 2], [20000, 2], [20000.01, -1]]) assert.equal(speakerBand(frequency), band);
  assert.equal(speakerBand(12001, 12000), -1); assert.equal(speakerBand(NaN), -1);
  const s = tone(100, 0.2, 32768); s.power.fill(0);
  for (const [frequency, expected] of [[20, 0], [4000, 2], [1000, 1]]) { s.power.fill(0); s.power[frequency / 4] = 1; assert.equal(speakerScores(s)!.scores.findIndex(v => v > 0), expected); }
  const exact = tone(100, 0.2, 16384); exact.power.fill(0); exact.power[125] = 1; assert.equal(speakerScores(exact)!.scores.findIndex(v => v > 0), 1);
});
test('Log-frequency mean density prevents wider flat-spectrum bands from winning by bin count', () => {
  for (const rate of [44100, 48000, 96000]) {
    const s = tone(100, 0.2, rate), density = 1e-8; s.power.fill(density * s.resolution);
    const values = speakerScores(s)!;
    values.scores.forEach(v => near(v, density, 1e-18)); assert.equal(classifySpeaker(values.scores), 'Balanced');
    const raw = [0, 0, 0]; s.power.forEach((v, k) => { const b = speakerBand(k * s.resolution, rate / 2); if (b >= 0) raw[b] += v; });
    assert.ok(raw[2] > raw[0] * 50); // A raw-bin sum would systematically favor Treble.
  }
});
test('Octave-aware quadrature matches an independent weighted two-bin example', () => {
  const s = tone(100, 0.2, 32768); s.power.fill(0); s.power[25] = 4; s.power[50] = 8;
  let width = 0; for (let f = 20; f < 250; f += 4) width += Math.log2(Math.min(250, f + 2) / Math.max(20, f - 2));
  near(speakerScores(s)!.scores[0], (Math.log2(102 / 98) + 2 * Math.log2(202 / 198)) / width);
});
test('Speaker scores consume existing real DSP tones without mutating spectra', () => {
  for (const [frequency, profile] of [[100, 'Bass Dominant'], [1000, 'Mid Dominant'], [8000, 'Treble Dominant']] as const) {
    const s = tone(frequency), saved = s.power.slice(); assert.equal(classifySpeaker(speakerScores(s)!.scores), profile); assert.deepEqual(s.power, saved);
  }
});
test('Nyquist truncation uses only available frequencies and missing Treble cannot produce a profile', () => {
  const partial = tone(1000, 0.2, 24000); partial.power.fill(partial.resolution * 1e-8);
  assert.equal(speakerScores(partial)!.upperHz, 12000); speakerScores(partial)!.scores.forEach(v => near(v, 1e-8));
  const limited = tone(1000, 0.2, 8000), session = new SpeakerSession(); feed(session, limited, 0, 20);
  assert.deepEqual(speakerScores(limited)!.available, [true, true, false]); assert.equal(session.validSeconds, 0); assert.equal(session.profile, null);
});
test('Exactly 3 dB above the second band is dominant; any smaller lead is Balanced', () => {
  const ratio = 10 ** (3 / 10);
  for (let i = 0; i < 3; i++) {
    const s: Scores = [1, 1, 1]; s[i] = ratio; assert.equal(classifySpeaker(s), ['Bass Dominant', 'Mid Dominant', 'Treble Dominant'][i]);
    s[i] = ratio * (1 - 1e-9); assert.equal(classifySpeaker(s), 'Balanced');
    s[i] = ratio * (1 + 1e-9); assert.equal(classifySpeaker(s), ['Bass Dominant', 'Mid Dominant', 'Treble Dominant'][i]);
  }
  assert.equal(classifySpeaker([100, 99, 0.01]), 'Balanced'); assert.equal(classifySpeaker([0, 0, 0]), null); assert.equal(classifySpeaker([NaN, 1, 1]), null);
});
test('Relative captured energy is gain invariant and whole percentages total 100', () => {
  for (const s of [[1, 1, 1], [1, 2, 3], [100, 1, 1], [0.1, 0.9, 0.7]] as Scores[]) {
    const p = relativeEnergy(s); assert.equal(p.reduce((a, b) => a + b, 0), 100); assert.deepEqual(p, relativeEnergy(s.map(v => v * 4) as Scores));
  }
  assert.deepEqual(relativeEnergy([0, 0, 0]), [0, 0, 0]);
});
test('Profile waits for ten valid seconds, not the first frame or overlap-counted window lengths', () => {
  const session = new SpeakerSession(); feed(session, tone(), 0, 9.9); near(session.validSeconds, 9.9); assert.equal(session.profile, null);
  session.observe(tone(), metadata(10)); near(session.validSeconds, 10); assert.equal(session.profile, 'Bass Dominant');
});
test('Session uses accumulated linear power, not the most recent FFT or average percentages', () => {
  const session = new SpeakerSession(), bass = tone(), treble = tone(8000); feed(session, bass, 0, 12);
  const before = session.scores.slice(); session.observe(treble, metadata(12.1));
  assert.equal(session.profile, 'Bass Dominant'); const next = speakerScores(treble)!.scores;
  session.scores.forEach((v, i) => near(v, (before[i] * 12 + next[i] * 0.1) / 12.1));
});
test('Silence, weak signal, clipping, malformed powers and nonfinite input add no active time', () => {
  for (const s of [tone(100, 0), tone(100, 1e-6), tone(100, 1.2)]) { const session = new SpeakerSession(); feed(session, s, 0, 20); assert.equal(session.validSeconds, 0); assert.equal(session.profile, null); }
  for (const bad of [NaN, Infinity, -1]) { const s = tone(); s.power[20] = bad; assert.equal(speakerScores(s), null); }
  const s = tone(); s.power = new Float64Array(4); assert.equal(speakerScores(s), null);
});
test('Gaps, drop counters, discontinuities, duplicate times and clock/mode changes cannot create time', () => {
  const session = new SpeakerSession(), s = tone(); feed(session, s, 0, 2); const time = session.validSeconds;
  for (const m of [metadata(2), metadata(1), metadata(50), metadata(50.1, { droppedFrames: 1 }), metadata(50.2, { discontinuities: 1 }), metadata(50.3, { clockId: 'new' }), metadata(50.4, { mode: 'sampled' })]) session.observe(s, m);
  near(session.validSeconds, time); assert.equal(session.profile, null);
});
test('Restart clears session and invalid intervals need two valid endpoints before counting resumes', () => {
  const session = new SpeakerSession(), s = tone(); feed(session, s); assert.ok(session.profile); session.reset(); assert.equal(session.profile, null); assert.equal(session.validSeconds, 0);
  session.observe(s, metadata(0)); session.observe(tone(100, 0), metadata(0.1)); session.observe(s, metadata(0.2)); assert.equal(session.validSeconds, 0);
  session.observe(s, metadata(0.3)); near(session.validSeconds, 0.1);
});
test('Sampled fallback counts at most a single actual window per observation', () => {
  const session = new SpeakerSession(), s = tone(); for (let i = 0; i < 100; i++) session.observe(s, metadata(i * 0.2, { mode: 'sampled' }));
  near(session.validSeconds, 99 * 8192 / 48000); assert.ok(session.validSeconds < 19.8);
});
