# WORKSHOPGIRL DSP ENGINE V2 + ENGINE SOUND ANALYZER V1
# IMPLEMENTATION REPORT

Validation date: 25 September 2026. Workspace: `C:\WorkShopGirl`.

## 1. Executive Summary

Implemented DSP Engine V2 and a dedicated Engine Sound Analyzer at `/tools/engine-sound-analyzer/`. The primary workflow is microphone → live measurements → optional references → live A/B snapshots. Recording is optional. General Sound Analyzer remains separately available at `/tools/sound-analyzer/`.

The implementation adds bounded sample-clock PCM capture, reusable 1×–5× harmonic analysis, conservative persistent-peak tracking, manual RPM/firing references, contextual snapshots and comparison warnings. It reports observations, not diagnoses. Processing remains local. Work is committed locally on `codex/dsp-engine-v2`; no push, deployment or PR was performed.

## 2. V1 Baseline Preserved

Read both requested V1 documents and inspected the implementation before changes. The clean baseline was commit `0f8eaa8` on `codex/dsp-engine-v1`. Baseline validation passed: 26 Node tests, 26 browser cases with 14 explicit WebKit audio skips, lint, Astro check and a 29-page build.

All 26 original DSP tests remain unchanged and pass. All ten original browser scenarios remain; shared fixtures moved to a helper and the Tools selector now identifies the original Sound Analyzer card specifically. General live sampling, file analysis, opposite-phase stereo handling, recording/playback/download, stopped-frame A/B, cancellation and cleanup behavior remain covered. FFT normalization, Hann windowing, DC removal, band power and digital-level conventions are preserved.

## 3. Architecture Changes

Generic DSP → domain analysis → engine observations → engine UI. `src/lib/dsp/` contains no automotive rules. Browser adapters remain in `src/lib/audio/`. Engine configuration/reference formulas and comparisons live in `src/lib/domains/engine/`. `AnalyzerExtension` lets the engine reuse the shared analyzer, charts, recorder and file worker without copying FFT code. No runtime or development dependency was added.

## 4. Files Added

| Area | Files |
| --- | --- |
| Generic DSP | `src/lib/dsp/harmonics.ts`, `peak-tracker.ts`, `spectral-comparison.ts` |
| Continuous acquisition | `src/lib/audio/live-types.ts`, `pcm-framer.ts`, `pcm-capture.worklet.ts`, `live-analysis.worker.ts`, `live-capture.ts` |
| Domain contracts | `src/lib/domains/rpm-stream.ts`; `src/lib/domains/engine/references.ts`, `analysis.ts`, `comparison.ts` |
| UI | `src/components/sound-analyzer/extension.ts`; `src/components/engine-analyzer/EngineAnalyzer.astro`, `controller.ts`, `view.ts` |
| Route | `src/pages/tools/engine-sound-analyzer/index.astro` |
| Tests | `tests/engine-dsp.test.ts`, `acquisition.test.ts`, `engine-browser.spec.ts`, `audio-fixtures.ts` |
| Benchmark | `scripts/benchmark-dsp-v2.ts` |
| Documentation | `docs/dsp-v2-architecture.md`, `docs/dsp-v2-implementation-report.md` |

## 5. Files Modified

`README.md`, `docs/dsp-architecture.md`, `package.json`; shared `src/components/sound-analyzer/Analyzer.astro`, `controller.ts`, `charts.ts`; `src/lib/audio/microphone.ts`; `src/lib/dsp/engine.ts`, `offline.ts`, `spectrum.ts`, `types.ts`; `src/pages/tools/index.astro`, `src/pages/tools/sound-analyzer/index.astro`, `src/pages/sitemap-0.xml.ts`; `src/styles/sound-analyzer.css`; `tests/browser.spec.ts`.

The V1 report, original DSP tests, dependency lockfile, unrelated pages, character artwork, deployment configuration and existing Git remotes were preserved.

## 6. Real-Time Acquisition Architecture

The microphone feeds an AudioWorklet framer. Frames transfer through a two-credit limit to a DSP worker. The worker runs one FFT per accepted window and returns spectrum, envelope and capture metadata. Engine analysis consumes those results; rendering is independent of sample acquisition.

The framer uses one fixed ring, 50% overlap and actual render-block lengths. Start-frame and center timestamps come from the audio sample clock. Sequence, dropped-frame and discontinuity counters expose missing coverage. Each session has a distinct clock ID. Worklet output is silent and additionally passes through zero gain.

Stop, backgrounding and navigation release microphone tracks, AudioContext, worklet connections/port, worker, timer and animation. Generation/node-identity checks prevent stale permission/module/worker results from reviving capture. Startup has a five-second limit; a two-second response-stall watchdog triggers recovery. Failures switch to a clearly labeled 10 Hz sampled PCM fallback.

## 7. Whether AudioWorklet Was Added and Why

Yes. V1's animation-driven PCM snapshots leave unknown gaps and overlap. Sample-clock assembly materially improves coverage, frame timing, persistence and spectrogram meaning, and provides a clean basis for future clock correlation. It does not provide synchronized RPM or professional order tracking. The framer performs no FFT on the audio render thread.

## 8. Engine Analysis Pipeline

Actual-rate PCM → DC removal/AC RMS → periodic Hann → shared FFT → normalized tonal amplitudes/bin powers → peaks/bands → harmonic matches and persistent tracks → optional engine references → throttled readouts/charts → immutable snapshot. Engine FFT defaults to 8192; General keeps 4096. File/recording analysis uses the existing offline worker and whole-file averaging semantics.

## 9. Harmonic Analysis

Reports reference, targets 1×–5×, observed frequency, tonal dBFS, level relative to the strongest matched harmonic, matched count and matched-band power percentage. Matching tolerance is one actual FFT bin. Four effective window bins separate adjacent reference harmonics; short zero-padded windows do not gain false resolving power.

Missing fundamentals remain absent. Strong higher harmonics do not replace an explicit reference. Silence, no reference, unresolved targets and targets above Nyquist are explicit states. Three-bin matched power is not THD or a health score. Reference precedence is manual Hz, firing reference, shaft reference, strongest peak, then unavailable. Strongest-peak reference is explicitly not fundamental inference.

## 10. RPM / Order References

Manual RPM is optional. Shaft frequency is RPM/60; 1800 RPM produces 30 Hz. Markers are 0.5×, 1×, 2×, 3× and 4× shaft frequency. Blank inputs leave general analysis available. Markers are calculated references, not measured RPM or synchronized order tracking. Out-of-range plot markers remain listed in HTML.

## 11. Firing-Frequency References

For conventional evenly firing engines: four-stroke = RPM/60 × cylinders/2; two-stroke = RPM/60 × cylinders. At 1800 RPM and four cylinders these yield 60 Hz and 120 Hz. Both calculations have deterministic tests. The interface explains limitations for uneven firing, cylinder deactivation and unusual operating modes.

## 12. Future External RPM Interface

`RpmSource` supplies a source identity and subscription/unsubscribe contract. `RpmSample` includes RPM, timestamp seconds, clock ID and timing uncertainty. Validation rejects invalid timing/RPM values. Future consumers must reject stale/out-of-order samples and establish clock mapping, drift and latency uncertainty before synchronized analysis. No OBD transport, TorqueGirl integration, website coupling or synchronization is implemented.

## 13. Live Peak Tracking

Tracking retains at most 12 candidates and exposes six persistent components. Association uses bounded frequency tolerance, level continuity and a −80 dBFS minimum. Confirmation needs four observations and 0.4 seconds. Missing tracks expire, long gaps reset state, and capture drops/discontinuities restart persistence. Movement is change from first matched frequency, not a mechanical trajectory or confidence score. File averages do not claim persistence.

## 14. Engine Analyzer Features

Live Start/Stop, waveform, spectrum, time-based spectrogram, significant peaks, band energy, harmonics, persistent peaks, optional RPM/cylinder/cycle/Hz inputs, calculated markers, live snapshots and A/B context tables. Recording, file import, playback and download remain optional. Advanced reference and FFT settings are collapsed initially. Tools discovery, sitemap, canonical/metadata and reciprocal General/Engine links are included. Existing site styling and character identity remain intact.

## 15. Confirmation That Live Analysis Works Without Recording

Confirmed in Chromium desktop and mobile emulation with `MediaRecorder` explicitly removed. Real oscillator-backed microphone streams passed through the built AudioWorklet and DSP worker. Waveforms/spectra/harmonics/persistence populated, A/B snapshots were captured while live, the playback panel stayed hidden, and stopping closed contexts/tracks/ports/workers. The recorder was never required for this workflow.

## 16. Snapshot / A-B Comparison

Snapshots deep-copy timestamp, rate/FFT, RMS, spectrum, peaks, bands, harmonic analysis, manual RPM, configuration, calculated references, persistent components and acquisition metadata. Compare RMS, strongest peaks, spectral overlays, band shares, harmonic levels/power and persistent-component context.

800 versus 1500 RPM produces an explicit warning. The material threshold is greater than max(25 RPM, 3% of the larger RPM). Missing RPM, differing rate/FFT/source/configuration/acquisition, dropped frames/discontinuities and changed harmonic references also warn. Generic bin subtraction operates only on equal grids with both values above the −90 dBFS floor. Different grids receive physical-Hz overlays, with bin subtraction withheld. No resampling or cosmetic subtraction was introduced. Harmonic deltas require an unchanged reference and compatible generic context.

## 17. Mobile UX

A persistent bottom toolbar offers Start/Stop and Capture A/B; buttons are at least 48 pixels high. Graphs and reference fields stack in portrait, advanced fields are collapsed, and numerical tables remain available without hover. Layout assertions cover 320×700, 390×844, 844×390 and 1280×800. Populated live A/B states also receive narrow/landscape overflow checks. Desktop and mobile screenshots were visually inspected; a cramped harmonic-table heading was shortened during review. Device emulation is not physical-phone certification.

## 18. Performance / Benchmarks

Actual local results from Node 24.12.0, Windows x64, 8192 samples, 200 warmup and 1000 measured iterations:

| Actual rate | FFT + engine analysis + tracking + envelope median | P95 | Available hop |
| --- | ---: | ---: | ---: |
| 48 kHz | 0.925 ms | 1.297 ms | 85.33 ms |
| 96 kHz | 0.951 ms | 1.291 ms | 42.67 ms |

Framing/copying 60 synthetic seconds took 23.14 ms at 48 kHz (702 windows) and 41.33 ms at 96 kHz (1405 windows). These are CPU timings, excluding browser rendering, message transfer, device latency and thermal behavior; they are not phone performance claims.

At the maximum UI FFT size, the ring holds 32,768 bytes; at most 65,536 PCM bytes are in flight. Live history holds at most 180 columns, 2,949,840 bytes of spectral values. Two snapshots and fixed transform/envelope arrays add bounded storage. Charts update at most 10 Hz, reduced-motion charts 4 Hz, and readouts 2 Hz. No unbounded raw live recording is retained.

## 19. Privacy

All audio analysis is in the browser. No audio upload, cloud inference, analytics component or persistent snapshot storage was added. The recording-disabled live test observed no non-GET requests. Optional playback/download uses local blob URLs. Site font/static-asset requests still exist; local audio processing does not mean a completely network-free page.

## 20. Safety / Measurement Limitations

The page warns users to keep phones, hands, cables, clothing and other objects clear of moving belts/fans/pulleys and hot exhaust. Repeatability guidance covers position, distance, RPM/load, wind, microphone obstruction and AGC/noise processing. Levels are digital dBFS, not calibrated SPL. The tool makes no engine-health, laboratory amplitude, guaranteed diagnosis or professional vibration claim.

## 21. Actual DSP Validation Results

55 Node tests pass: 26 preserved V1 tests, 25 V2 DSP/domain tests and four acquisition tests. Tests cover RPM formulas, harmonic amplitudes, missing fundamental, stronger higher harmonic, unrelated tones, seeded noise with/without harmonics, silence/near silence, short-window resolution, Nyquist, snapshot deep copies, clock metadata, known +6.0206 dB comparisons, context mismatches, spectral grid/floor checks, bounded tracks, timing gaps, variable render quanta, two-frame backpressure and the actual worklet processor's output/stop behavior.

For the 100/200/300/400 Hz mixture at 48 kHz, detected frequencies were 100.032, 200.060, 300.081 and 400.093 Hz. Reported levels were −7.952, −13.954, −19.943 and −25.920 dBFS for amplitudes 0.4/0.2/0.1/0.05. Tests at 44.1/48/96 kHz passed frequency tolerance of one bin and amplitude tolerance of 0.5 dB. These are synthetic validation results, not measured acoustic accuracy.

## 22. Browser / Responsive Validation

The full suite passed 48 cases with 28 explicit skips, zero failures, across Chromium desktop/Pixel 7 emulation and WebKit desktop/iPhone 13 emulation. All 38 Chromium cases passed. Ten WebKit layout/navigation/unsupported cases passed; 28 WebKit audio cases skipped because this Windows build exposes no AudioContext.

Coverage includes the real production worklet/worker, no-recording live A/B, missing API fallback, module rejection, actual processor exception, stalled worker, cancelled module load, late microphone permission, background cleanup, recording/file analysis, invalid inputs, mismatched RPM/source, route/canonical/sitemap and responsive controls. Browser tests run against local production output on port 4379. Physical Safari/iOS/Android microphone behavior and real permission prompts remain unverified.

## 23. Commands Run and Final Results

| Command | Result |
| --- | --- |
| `npm test` | 55 passed, zero failures |
| `npm run test:dsp` | 55 passed, zero failures |
| `npm run lint` | Passed |
| `npm run check` | 82 files; zero errors/warnings; one pre-existing ShareButton deprecated-copy hint |
| `npm run build` | Passed; 30 pages plus sitemap endpoints |
| `npm run test:browser` | 48 passed, 28 explicit capability skips |
| `npm run benchmark:dsp` | Completed; actual timings in section 18 |
| `git diff --check` | Passed |

After the small table-label adjustment, lint/check/build and affected live/layout browser scenarios were rerun. No dependency installation, production access, deployment command, Git push or PR creation was required.

## 24. Problems Found and Fixed

- Unbounded percentage-based peak association could join unrelated high-frequency components; capped it at three bins and retained deterministic regression coverage.
- Zero padding could overstate harmonic resolving power; carried actual window support into spectra.
- Continuous startup/stop races could create late resources; bounded setup and guarded all late callbacks.
- A silent worker stall could leave the display frozen; added bounded recovery and a lifecycle test.
- Equal-width display columns could conceal missing capture time; live spectrogram columns now use actual timestamps and leave proportional gaps.
- Per-frame control updates and unused main-thread FFT setup were unnecessary; removed them from the continuous path.
- Playwright network routing did not reliably intercept worklet loading, and dispatched synthetic processor errors did not exercise the native error path; fixtures now reject `addModule` directly and throw inside a real processor.
- Narrow-screen table-heading wrapping was corrected after screenshot review.

## 25. Known Limitations

No calibrated microphone response, SPL, fault diagnosis, automatic fundamental inference, synchronized order tracking or external RPM transport. Low references can be unresolved within the maximum 8192-sample window. Sampled fallback can miss events; even continuous frames average over a finite window. Conservative thresholds can miss weak tones or match chance peaks. Tracking can confuse nearby crossing components. Differing spectral grids are not resampled. A/B cannot establish matching physical position/load/gain. Snapshots are tab-memory only. Real phone performance, interruptions and Safari recording require physical validation. Native file decoding retains the V1 allocation-before-validation limitation.

## 26. Technical Debt

Shared controller complexity increased modestly through typed extension hooks; avoid forking it for each domain. Worklet global declarations are local because DOM types omit the render-thread scope. Peak/harmonic selection revisits spectrum thresholds and can be profiled if larger transforms are introduced. Canvas raster creation is bounded but could be cached if real-device profiling identifies it as material. A measured external clock-mapping layer is still required before consuming RPM streams. Keep the pre-existing ShareButton compatibility fallback outside this DSP change.

## 27. Future HVAC / Compressor / Motor / Bearing / Speaker Extensions

HVAC, compressor, fan, pump and motor tools can reuse acquisition, FFT, harmonics, tracking, snapshots and charts while adding explicit blade/pole/speed context in their own domain modules. Bearing analysis requires validated envelope methods, bandwidth and geometry. Speaker analysis needs separate calibration/distortion conventions; current matched-band percentages must never be relabeled THD. None of these future tools is implemented by this task.

## 28. Recommended SINGLE Next Phase

Conduct a controlled physical-device validation phase on real iOS Safari and Android Chrome, using repeatable known signals and stationary machinery measurements at safe distances. Record latency, dropped frames, microphone processing, repeatability, battery/thermal behavior and interruptions before adding diagnostics or synchronized RPM claims.

## 29. Git Branch / Commit / Working Tree Status

Branch: `codex/dsp-engine-v2`, based on V1 commit `0f8eaa8`. Local commit subject: `Build DSP Engine V2 and live Engine Sound Analyzer`. This report is included in that commit; obtain its hash with `git log -1 --oneline`. The final response records the resulting hash and post-commit working-tree status. Existing `origin` and `github` remotes point to `https://github.com/andiwijaya/workshopgirl.com.git`. No push, deployment or PR was performed.

## 30. Handoff Notes for the Next AI/Engineer

Read `docs/dsp-architecture.md`, `docs/dsp-v2-architecture.md` and this report before changing mathematical conventions. Use Node 24, run the validation commands above, and build before browser tests. Preserve window amplitude/power normalization, actual sample-rate handling, frame credits, generation guards and explicit fallback/gap semantics. The test preview owns port 4379 and uses `--ignore-lock`; do not run it against production. Ignored `test-results/` contains local screenshots when browser tests have run. The single recommended next phase is physical-device validation; do not infer authorization to push/deploy or to add OBD/diagnosis from this implementation.
