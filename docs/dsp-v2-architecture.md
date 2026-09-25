# DSP Engine V2 / Engine Sound Analyzer V1

## Boundaries

The [V1 architecture](dsp-architecture.md) remains the mathematical baseline. Pure DSP in `src/lib/dsp/` accepts PCM/spectra without engine rules or browser APIs. Generic harmonic analysis, peak tracking and spectral comparison extend this layer. `src/lib/domains/engine/` supplies explicit RPM/cylinder/cycle references, observations and contextual comparisons. `src/lib/audio/` owns acquisition. The engine UI extends the shared controller through `AnalyzerExtension`; it does not copy the FFT, offline STFT, recorder or charts.

Routes: `/tools/sound-analyzer/` preserves General V1; `/tools/engine-sound-analyzer/` adds Engine V1. The Tools index, cross-links and sitemap expose both. No deployment configuration changes or runtime dependencies are needed.

## Live acquisition and resource ownership

General V1 retains its sampled AnalyserNode PCM workflow. Engine V1 uses:

`MediaStream → AudioWorklet PCM framer → bounded transfer → DSP Worker → generic Spectrum → engine observations → throttled Canvas/HTML`

The worklet assembles N samples with N/2 hop, using actual render-block lengths and `currentFrame` as the start-frame clock. It does not assume a permanent 128-sample quantum. It holds one N-sample ring. Frame copies are allocated only with available credits; at most two frames are unacknowledged across the worklet/main/worker path. An acknowledgement follows each completed worker result. Overload drops new windows rather than retaining a growing queue; sequence and cumulative dropped-frame counters expose these gaps. Discontinuous frame clocks reset overlap and increment a counter. The worklet writes silence to its output; a zero-gain connection to the destination keeps it pulled without microphone monitoring.

One shared DspEngine FFT runs per accepted window in the worker. A result includes a waveform envelope, spectrum, sequence, frame start, center timestamp and a UUID identifying this acquisition clock. Engine harmonics and bounded tracking consume the result on the main thread. There is no second engine FFT there. Worklet timestamps are `(frameStart + N/2) / actualSampleRate`; they are audio-context time, not wall-clock or OBD time. Device/input latency is not calibrated.

Unavailable APIs, rejected modules, worker startup failures (5-second limit), processor/worker errors or a stalled response stream (2-second watchdog, checked every 500 ms) fall back to AnalyserNode PCM sampled every 100 ms. Fallback uses the same DSP math and reports its mode explicitly. Its timestamp approximates the latest window center using context time; it is not precise continuous capture. Main-thread fallback cost is bounded by the selected FFT size.

`Microphone` owns stream, source, analyser and AudioContext. `LiveCapture` owns worklet, silent output connection, message port, worker and timer. Stop cancels pending setup, disconnects nodes, closes ports, terminates the worker, stops tracks, closes the context and cancels rendering. Generation checks discard late permission/module/decode results; worklet callbacks also verify the current node identity. Hidden tabs stop microphone capture. Navigation cleanup covers normal `pagehide` and Astro `before-swap`. In-memory last measurements and A/B snapshots remain available until cleared or the page is discarded.

## History, display and memory bounds

- Engine default N=8192; available settings 2048/4096/8192. General default stays 4096.
- At 48 kHz with N=8192, the window spans 170.67 ms and the hop is 85.33 ms. Bin spacing is 5.859375 Hz; finer interpolated figures do not imply laboratory accuracy.
- Worklet ring: 32,768 bytes at N=8192. In-flight PCM: at most 65,536 bytes. FFT arrays, current result/envelope and two snapshots add fixed-size storage.
- Live spectrogram: at most 180 `Float32Array(N/2+1)` columns, 2,949,840 bytes at N=8192. At this default and 48 kHz, 180 consecutive hops cover about 15.36 seconds. Sample timestamps position columns; skipped frames leave proportionate blank time rather than compressing the missing interval. Mode changes restart the history.
- Live charts repaint at most 10 Hz (4 Hz for reduced motion); numerical/engine readouts update at most 2 Hz. Capture controls update on state/config changes and the first measurement, not every audio frame. User actions and resize may trigger additional draws.
- Tracker: 12 internal tracks, at most six visible. Snapshots: two. No raw live PCM recording/history is retained by analysis.
- Existing file limits remain 20 MiB compressed, 60 seconds decoded, mono/stereo, rate at most 96 kHz, 400 display columns. Optional recording retains the V1 55-second/approximately 16 MiB limits. Native decoding can allocate before post-decode limits are checked; this pre-existing risk remains documented.

These are deterministic retained-data bounds, not an assertion that browser heaps or native audio buffers have an exact size.

## Harmonic conventions

`analyzeHarmonics(spectrum, f0)` matches orders 1–5 within ±one FFT bin of their expected frequency. It reuses V1 local-maximum, median-noise and relative-level thresholds while allowing more candidates than the six displayed general peaks. Each candidate can match only one harmonic. References below four effective window bins are marked unresolved; `windowSamples` distinguishes actual Hann support from zero padding. Harmonics at/above Nyquist are unavailable. Silence, no reference and absent matches have explicit states.

Frequency and tonal amplitude use the V1 interpolated peak estimate. Relative levels use the strongest matched harmonic as 0 dB. Three bins around each matched peak contribute to matched-band power; its percentage uses all non-DC spectral power. This is not THD, a fundamental estimator, calibrated SPL, source identification or a fault probability. Off-bin leakage and noise affect these heuristic matches.

Engine reference precedence is manual Hz → firing reference → shaft reference → strongest detected peak → no reference. The strongest peak is labeled as such and is not asserted to be the fundamental. A missing 1× component remains absent when the supplied reference supports detected higher harmonics.

## Engine context and future RPM

Shaft Hz = RPM/60. Markers are 0.5×, 1×, 2×, 3× and 4× shaft frequency. Conventional evenly firing four-stroke frequency is shaft Hz × cylinders/2; two-stroke frequency is shaft Hz × cylinders. Unspecified configuration creates no firing marker; zero RPM creates no positive-frequency reference. Uneven firing, deactivation and unusual operating modes are explicitly outside that simple reference model.

`RpmSource.subscribe` provides `RpmSample { rpm, timestampSeconds, clockId, uncertaintySeconds }` and an unsubscribe function. The validator checks finite nonnegative values and a nonblank clock identity. Future consumers must reject stale/out-of-order samples and establish a measured mapping between external and capture clocks, including uncertainty/drift/latency. No subscriber, transport, OBD integration, website coupling, clock mapping or angle-domain resampling is implemented. Manual RPM is not synchronized order tracking.

## Persistent peaks

`PeakTracker` associates peaks within `max(1.5 bins, min(3 bins, 1% frequency))`, with a level jump under 15 dB and a −80 dBFS minimum. One peak can update a track once per frame. A visible component needs at least four observations over 0.4 seconds. Tracks expire after 0.25 seconds without observation; gaps over 0.5 seconds reset the set. UI resets tracking on capture drops, discontinuities and mode changes. Visibility additionally requires a recent observation. Movement is frequency minus the initial matched frequency; persistence is elapsed observation time, not confidence. Neighboring tones can still cross/merge; this is not physical source tracking. File averages have no trajectory and therefore no persistence result.

## Snapshots and comparisons

An engine snapshot deep-copies the generic spectrum (actual rate, FFT, RMS, peaks, power, bands), wall-clock capture timestamp, engine inputs, calculated references, harmonic structure, persistent peaks and acquisition metadata. Snapshots work during live analysis with no recorder.

The shared comparison retains RMS dB change, strongest-peak shift, band percentage-point changes and physical-Hz overlays. Engine context adds harmonic level/power deltas and persistent-component tables. RPM differences exceeding `max(25 RPM, 3% of the larger RPM)` trigger a material-condition warning. Missing RPM, different cylinder/cycle, source kind, rate, FFT, acquisition mode, dropped frames, discontinuities or harmonic reference also produce explicit cautions.

Generic `spectralDifference` subtracts tonal dB only on equal sample-rate/FFT/bin grids and only where both values are at least −90 dBFS; a validity mask distinguishes missing data from zero change. This subtraction is a logarithmic amplitude ratio. Different grids receive no fabricated subtraction/interpolation; overlaid spectra map their own bins to Hz. Harmonic deltas additionally require the same exact reference/source and compatible generic context. No automatic speed, distance, load or microphone-gain correction occurs. Different settings do not imply a repair result.

## Validation and extension guidance

Run `npm test`, `npm run test:dsp`, `npm run lint`, `npm run check`, `npm run build`, `npm run test:browser`, and `npm run benchmark:dsp`. Node tests exercise the actual worklet class with a stub port plus the pure math. Chromium browser tests run the actual built worklet/worker and oscillator-backed MediaStreams, including recording-disabled live A/B. Failure fixtures explicitly reject module loading, throw inside a real AudioWorklet processor and stall worker delivery. Windows Playwright WebKit has no AudioContext; audio cases skip, while layout/navigation/unsupported cases run. No physical iOS/Android coverage is claimed.

Future machine tools should add domain modules and UI extensions while preserving FFT/amplitude/power conventions. HVAC, compressors, motors, fans and pumps can reuse generic harmonics and tracking with explicit speed/blade/pole context. Bearing work needs separately validated envelope analysis, geometry and acquisition bandwidth. Speaker work needs separate distortion/calibration conventions; current matched-band percentages must not be relabeled THD.

API references consulted: [AudioWorklet process and variable render blocks](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process), [audio sample clock](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope/currentFrame), [processor errors](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/processorerror_event).
