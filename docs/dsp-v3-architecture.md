# DSP Engine V3 — Measurement and validation foundation

## Boundaries and preserved semantics

Read the [V1 mathematical baseline](dsp-architecture.md) and [V2 capture architecture](dsp-v2-architecture.md) first. V3 does not change FFT normalization, Hann support, RMS, bands, PCM framing, backpressure, peak/harmonic matching or recording. V1/V2 regression tests remain unchanged.

`src/lib/measurement/` owns browser-independent quality, normalized spectral-shape overlap, repeatability and export construction. It consumes Spectrum and serializable CaptureMetadata; it calls no DOM or microphone API. `src/lib/domains/engine/repeatability.ts` adds RPM, engine configuration, microphone-processing context and harmonic-feature comparison. `MeasurementTools` adapts these to the existing Engine Analyzer without adding another FFT or animation loop. General Sound Analyzer retains its V1 workflow.

## Quality evidence and observation scope

`QualityTracker` retains at most three seconds / 512 scalar observations (timestamp, RMS, strongest-peak frequency, flatness), plus fixed-size session counters. It retains no PCM or spectrum history. UUID clock changes reset the session; acquisition-mode changes reset the recent window and preserve a session caution. Nonincreasing timestamps do not count as additional observations. No confidence/health score is calculated.

| Observation | Evidence / policy |
| --- | --- |
| Possible clipping | Raw sample peak ≥ 0.999 in any observation this session. It is possible clipping, not proof of hardware saturation. |
| Low signal | Current AC RMS below −70 dBFS. This conservative digital threshold is not an acoustic noise-floor/SNR estimate. |
| Broadband-like content | Current spectral flatness > 0.35 over bin centers from 20 Hz to min(20 kHz, Nyquist). This cannot identify noise or its source. |
| Dropped frames/discontinuities | Cumulative counters supplied by capture. |
| Observation gaps | Timestamp jump > max(0.25 s, 1.5 window durations). Session caution is retained. |
| Insufficient recent duration | Fewer than eight observations or less than two seconds between retained first/last centers. |
| Level changing | Finite recent RMS range > 3 dB, or both zero and nonzero signal occurred in the recent window. |
| Strongest component changing | Peak-frequency range > max(two FFT bins, 5% of current strongest frequency). Equal-strength tones can exchange rank without a physical speed change. |
| Context changing | Engine UI reports changed manual/reference settings within the last three observed seconds. Generic tracker accepts only an event, not automotive formulas. |
| Resolution limitation | Engine adapter reports the existing unresolved-harmonic state; effective bin scale is sampleRate / actual windowSamples. |
| Processing active | The browser explicitly reports AGC, noise suppression or echo cancellation enabled. Unknown is not treated as disabled. |
| Sampled fallback/mode change | Continuous coverage is unavailable or the session changed capture paths. |
| File average | Within-file temporal stability was not measured. No trajectory is inferred from a whole-file average. |

Flatness is the geometric mean divided by arithmetic mean of the V1 one-sided bin-power values, with a 1e-20 numerical floor. Silence returns null. Broad/colored noise, harmonics and microphone filtering can defeat any simple threshold; the UI describes evidence rather than declaring an excessive-noise diagnosis.

`sessionSpanSeconds` is the difference between first and latest live frame-center timestamps, not wall-clock time since clicking Start. `recentSpanSeconds` describes retained observation centers. A live snapshot's `durationSeconds` is its actual window support / sample rate; a file snapshot's duration is the decoded clip duration. These must not be conflated. `coverageSeconds` sums the union of observed worklet windows, avoiding overlap double-counting; it is null for sampled fallback/files or mixed-mode sessions. It is not a continuous-recording claim. `frameCount` counts delivered analysis observations (one whole-file result is one observation).

Clipping, dropped frames and discontinuities persist as session cautions. Recent ranges expire with the bounded observation window. `stabilityAvailable` means enough temporal observations exist, not that the signal passed quality checks. Finite RMS range excludes negative-infinity silence; a separate observation flags a mix of silence and nonzero signal. Stop/background reasons are retained in the current result; immutable snapshots retain the evidence available at capture time.

## Spectral-shape overlap: exact mathematics

For compatible spectra, use physical bin centers from 20 Hz through min(20 kHz, Nyquist). Require equal actual sample rates, FFT sizes, power-array lengths, bin spacing and actual Hann window support. V1's one-sided, window-energy-normalized `power[k]` is used, never arbitrary correlation of dB values.

For each spectrum independently, set the retained power to zero below `max(1e-12, maximumInBandPower × 1e-6)`. This is a numerical/relative tail gate, not a measured ambient-noise estimate. Values equal to the gate are retained. Normalize each remaining nonnegative power vector to unit sum: p[k] and q[k]. Then:

`overlap = Σ sqrt(p[k] × q[k])`

This is the Bhattacharyya coefficient, equivalently the inner product of square-root probability vectors. Their Euclidean norms are one, so Cauchy–Schwarz bounds overlap to [0, 1]; a final floating-point clamp enforces the bound. One means identical retained normalized power distributions; zero means disjoint retained support. Intermediate values quantify distributional overlap, not diagnostic confidence or percentage of machine similarity.

Constant gain cancels in normalization when the same bins survive the absolute floor. RMS dB difference is therefore reported separately and remains part of repeatability assessment. Close to the absolute floor, gain can change which bins survive; do not assume gain invariance there. Silence, AC RMS < 1e-5, retained band power ≤ 1e-10, invalid powers or incompatible grids return unavailable, never a perfect silence match. Phase, temporal order, frequencies outside the band, acoustic source identity and microphone transfer-function correction are absent. No grid interpolation or frequency alignment is performed.

## Repeatability policy

`assessRepeatability` accepts two through six snapshots and compares all pairs (at most 15). It preserves signed RMS and strongest-peak changes, normalized spectral overlap, maximum band-share change and optional domain-provided harmonic/context differences. Duplicate IDs or overlapping intervals from the same acquisition clock are insufficient data. Recent quality windows may overlap; they are context for each frame, not claims of statistically independent trials.

Heuristic agreement limits: RMS difference ≤ 1.5 dB; shape overlap ≥ 0.95; maximum band-share difference ≤ 5 percentage points; strongest-peak difference ≤ max(two bins, 2% of the larger peak frequency); relative harmonic-level difference ≤ 3 dB when comparable. These are transparent screening thresholds awaiting physical validation, not empirically certified acceptance limits.

Assessment precedence is CONDITIONS DIFFER → LOW SIGNAL → INSUFFICIENT DATA → REVIEW QUALITY → SIGNALS DIFFER → CONTEXT UNVERIFIED → GOOD MATCH. All pair reasons remain available even when another condition determines the headline. Good match requires distinct source intervals, usable quality evidence and agreement on all evaluated features. It cannot verify position, distance, physical microphone identity, load, wind or hidden hardware gain.

Engine context uses V2's RPM threshold (difference > max(25 RPM, 3% of larger RPM)), cylinder/cycle/manual-Hz inputs and browser processing settings. Unspecified RPM/processing is explicitly unverified. Harmonic comparisons require the same reference source and references within one bin; changing matched harmonic structure is a signal-feature difference, not proof of changed operating conditions. None of these rules enter generic DSP mathematics.

## Metadata and privacy

LiveCapture adds an explicit allowlist: AudioWorklet API availability, reported AGC/noise-suppression/echo-cancellation booleans (or null when unreported), and AudioContext base latency labeled **output base latency**. No device label, deviceId, groupId, user-agent, enumeration, serial number or hardware fingerprint is collected. Hardware can still process audio despite browser settings. Base latency is not microphone input or end-to-end display latency.

A snapshot retains wall-clock capture-action timestamp, acquisition clock identity/time/frame, mode, counters, actual rate/FFT/window, notes/label, quality and domain context. Labels are limited to 80 characters, notes 1000, manual device observations 2000. Notes are user-entered, not automatically inferred facts. The device/browser family is a manual coarse selection. Sessions, repeat collections and logs stay in tab memory until explicit download; there is no persistent browser storage or upload.

API references: [getSettings](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getSettings) supplies reported track settings; [baseLatency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency) describes output processing latency.

## Versioned local export

Measurement documents use `schemaVersion: workshopgirl.measurement/1`, `engineVersion: 3` and the JSON Schema at `public/schemas/measurement-v1.schema.json` (Draft 7). Export includes up to nine records: current, A/B and six repeats. No raw audio or hidden browser/device properties are included. Domain-specific fields are namespaced under `domain.name`.

Spectra contain ordinary arrays for bin power and tonal dBFS; frequency for index k is k × sampleRate / fftSize. Peaks, bands, RMS, actual support, metadata, quality policies, pairwise assessments and device checklist results are included. Null RMS dBFS means exactly zero RMS / negative infinity; other non-finite values are errors rather than silently becoming null. Generated-document validation checks version, bounds, numeric arrays, grid-dependent lengths, identifiers and metadata. The published JSON Schema independently describes document structure. This is not an untrusted-import parser; no import feature is provided.

The serializer is explicit, and browser evidence is allowlisted again during export. A LocalDownload instance owns at most one blob URL, revoking it on replacement, after one second or on navigation. JSON construction is bounded and only runs on a user export action. Exports can be inspected/reproduced externally; input PCM, phase and lost events cannot be reconstructed from spectral summaries.

Known-signal results have their own `workshopgirl.reference-validation/1` version, generated parameters, expected/actual checks, software elapsed time and an explicit software-only scope. This is not a captured microphone measurement.

## Known-signal and device validation

`/tools/dsp-validation/` generates one second of deterministic PCM for 100/440/1000 Hz, a multi-tone mixture, a 100–400 Hz harmonic series, amplitude doubling and seeded noise plus tone. Rates: 44.1/48/96 kHz; FFT: 8192. Shared offline analysis runs in a dedicated worker. Peak frequency tolerance is one FFT bin; amplitude tolerance 0.75 dB; analytic RMS tolerance 0.15 dB. Gain doubling is additionally checked against +6.0206 dB ± 0.01 dB; harmonic series expects four matches. Seeded noise uses LCG seed 17 and expected uniform-noise variance 0.12²/12.

Worker completion/error/cancel/navigation releases the worker; generation checks reject stale responses and a 15-second watchdog bounds a stalled run. No microphone, AudioContext or speaker output is created. This validates the pure DSP path, not AudioWorklet capture, permissions, analog microphones, codecs or physical latency.

The page provides a physical-device protocol and links to the Engine Analyzer's manual device log. Every checklist item defaults to Not tested. Android Chrome, iOS Safari, desktop Chromium and other-browser records are user selections, not claimed coverage. See [device validation protocol](device-validation.md). No physical-device validation was conducted in this implementation.

## Performance and extension guidance

V2 history/worker limits remain. V3 adds 512 scalar observations, six repeat snapshots, up to 15 pair results, bounded text fields and one temporary export blob. Nine maximum-FFT spectrum records require 737,460 bytes of spectrum arrays (power/amplitude/db), excluding small objects/metadata and the existing spectrogram. Repeatability runs only on capture/clear/compare/export, not on every live frame. Quality updates use existing spectra and render with the existing 2 Hz readout cadence.

Run `npm test`, `npm run test:dsp`, `npm run lint`, `npm run check`, `npm run build`, `npm run test:browser` and `npm run benchmark:v3`. Benchmarks are local CPU timings, not phone thermal/performance certification. Original browser tests are preserved. Windows WebKit audio still skips, but the generated-PCM validation worker runs there without Web Audio.

Other machine domains can reuse quality, similarity, repeatability, reference generation and export without importing engine rules. Supply a PairContext adapter for relevant operating conditions. Calibrated acoustics, bearing envelopes, speaker THD, OBD synchronization and diagnosis require separately validated methods. Do not relabel overlap, flatness, harmonic power or good-match status as a machine-health metric.
