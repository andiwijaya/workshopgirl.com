# WORKSHOPGIRL DSP ENGINE V3 — MEASUREMENT & VALIDATION
# IMPLEMENTATION REPORT

Implementation date: 25 September 2026. Scope: local implementation and validation; no push, deployment or pull request. Physical devices were not tested.

## 1. Executive Summary

V3 adds reusable measurement-quality observations, conservative repeatability assessment, mathematically defined spectral-shape overlap, capture metadata, local versioned JSON export and a deterministic reference-signal workbench. The existing Engine Analyzer integrates these through a compact quality panel and collapsed advanced controls. Live analysis remains independent of recording.

Final validation: **78 Node tests passed; 60 browser cases passed; 32 explicitly skipped because this Windows WebKit runtime lacks Web Audio; zero failures.** Lint, Astro/type checking and the 31-page production build passed. No machine-health diagnosis, confidence score or cloud audio processing was added.

## 2. V1/V2 Baseline Preserved

Starting commit: `0ed393e`, with a clean working tree. The initial baseline rerun passed all 55 existing Node tests and 48 browser cases, with 28 WebKit audio skips. Those original test files remain unchanged and continue to pass.

Preserved: General Sound Analyzer, AudioWorklet PCM capture, sample-clock framing, worker backpressure/fallback, FFT and Hann normalization, waveform/spectrum/spectrogram, harmonic analysis, persistent peaks, RPM/order/firing references, A/B snapshots, optional recording, file analysis, lifecycle cleanup and local privacy boundaries. V3 does not rewrite the DSP core.

## 3. Architecture Changes

`src/lib/measurement/` contains pure quality, similarity, repeatability and export modules. It depends on existing spectrum/capture types, without DOM or microphone access. An engine-domain adapter supplies operating-context and harmonic comparisons. UI integration reuses the existing frame observer and readout cadence.

The separate validation page generates deterministic PCM in a dedicated worker and uses the existing offline DSP path. A small download owner manages temporary blob URLs. The architecture and exact policies are documented in [dsp-v3-architecture.md](dsp-v3-architecture.md).

## 4. Files Added/Modified

19 files added:

| File | Purpose |
| --- | --- |
| `src/lib/measurement/quality.ts` | Bounded quality observations and session evidence |
| `src/lib/measurement/similarity.ts` | Normalized power overlap and spectral flatness |
| `src/lib/measurement/repeatability.ts` | Generic all-pairs comparison policy |
| `src/lib/measurement/export.ts` | Explicit serialization and generated-document validation |
| `src/lib/domains/engine/repeatability.ts` | RPM/configuration/processing/harmonic adapter |
| `src/lib/audio/local-download.ts` | Download URL ownership and cleanup |
| `src/lib/validation/reference.ts` | Known signals and expected-output checks |
| `src/lib/validation/reference.worker.ts` | Worker-owned reference execution |
| `src/components/validation/controller.ts` | Run/cancel/export lifecycle |
| `src/pages/tools/dsp-validation/index.astro` | Advanced validation workbench |
| `src/components/engine-analyzer/MeasurementPanel.astro` | Quality and advanced controls |
| `src/components/engine-analyzer/measurement-tools.ts` | Snapshot/repeat/export integration |
| `public/schemas/measurement-v1.schema.json` | Draft 7 measurement schema |
| `tests/measurement.test.ts` | 23 deterministic V3 tests |
| `tests/measurement-browser.spec.ts` | Four scenarios across four browser projects |
| `scripts/benchmark-dsp-v3.ts` | Quality, comparison, pipeline and export costs |
| `docs/device-validation.md` | Physical-device protocol |
| `docs/dsp-v3-architecture.md` | Semantics, mathematics, boundaries and reuse |
| `docs/dsp-v3-implementation-report.md` | This handoff report |

10 files modified: `README.md`, `package.json`, `src/components/engine-analyzer/EngineAnalyzer.astro`, `src/components/engine-analyzer/controller.ts`, `src/components/sound-analyzer/controller.ts`, `src/components/sound-analyzer/extension.ts`, `src/lib/audio/live-capture.ts`, `src/lib/audio/live-types.ts`, `src/pages/sitemap-0.xml.ts`, and `src/styles/sound-analyzer.css`. These add integration hooks, safe metadata, scripts, routing, styles and documentation. Dependencies and lockfile are unchanged.

## 5. Measurement Quality System

Policy `quality-v1` uses measurable evidence:

| Observation | Trigger |
| --- | --- |
| Possible clipping | Raw peak ≥ 0.999 observed during the session |
| Low signal | Current AC RMS below −70 dBFS |
| Broadband-like content | Spectral flatness > 0.35 in the analysis band |
| Capture problems | Dropped/discontinuous frame counters or timestamp gaps |
| Insufficient duration | Fewer than eight observations or less than two seconds of recent evidence |
| Changing level | Recent RMS range > 3 dB, or mixed silent/nonzero observations |
| Changing strongest component | Frequency range > max(two bins, 5% of current strongest frequency) |
| Context/resolution caution | Recent reference edits or unresolved harmonic spacing |
| Processing caution | Browser reports AGC, noise suppression or echo cancellation enabled |

Quality retains at most three seconds / 512 scalar observations, plus fixed counters. Session span, recent span, current FFT support and observed-window coverage have distinct meanings. Overlapping worklet windows are not double-counted. File averages and sampled fallback do not claim continuous temporal validation. Broadband content does not establish unwanted noise, and these observations do not identify machine faults.

## 6. Repeatability Analysis

Two through six snapshots produce all pairs, at most 15. The assessment compares RMS, normalized shape, strongest peak, band shares and available harmonic/context evidence. Duplicate snapshots and overlapping source intervals from the same acquisition clock cannot establish repeatability.

Screening limits are RMS difference ≤ 1.5 dB, overlap ≥ 0.95, band-share difference ≤ 5 percentage points, strongest-peak difference ≤ max(two bins, 2%), and comparable relative-harmonic differences ≤ 3 dB. These are documented heuristics awaiting physical validation.

Headline precedence: CONDITIONS DIFFER → LOW SIGNAL → INSUFFICIENT DATA → REVIEW QUALITY → SIGNALS DIFFER → CONTEXT UNVERIFIED → GOOD MATCH. All reasons are retained. Missing RPM or unreported processing stays unverified. Engine RPM differences use V2's max(25 RPM, 3%) tolerance. Good match is a measurement-consistency result, not a health judgment.

## 7. Spectral Similarity Method + Mathematical Rationale

Use V1's one-sided, window-energy-normalized bin power on matching actual sample rates, FFT grids and window support. Select bin centers from 20 Hz through min(20 kHz, Nyquist). Independently discard powers below max(1e-12, largest in-band power × 1e-6), then normalize retained powers to unit sum, yielding p and q.

**Overlap = Σ √(p[k]q[k]).** This Bhattacharyya coefficient is the inner product of two unit-length square-root vectors; Cauchy–Schwarz bounds it to [0,1]. One means identical retained normalized power distribution, zero disjoint support. Gain normalization explains why RMS is compared separately. The absolute floor can affect gain invariance near silence.

The tail gate is numerical/relative, not an estimated acoustic noise floor. Silence, weak/unusable input and incompatible grids return unavailable. The metric ignores phase, timing, out-of-band content and source identity; it is neither a perceptual-similarity score nor a machine-health probability. Tests include a hand-calculated √0.75 example, symmetry, boundedness, gain scaling and disjoint tones.

## 8. Capture Metadata

Snapshots retain timestamp, actual sample rate, FFT/window size, acquisition mode and clock, frame counters, source duration, quality, label/notes and engine references. Safe browser evidence includes AudioWorklet API availability, reported processing booleans and **output base latency** where available. Output base latency is not measured microphone or end-to-end latency.

Labels are bounded to 80 characters, notes to 1000, device observations to 2000. No device identifiers, device labels, user-agent strings or hardware fingerprints are collected. A file result retains decoded duration but does not invent within-file stability.

## 9. Reference/Validation Mode

`/tools/dsp-validation/` offers one-second 100 Hz, 440 Hz, 1000 Hz, multi-tone, harmonic-series, amplitude-doubling and seeded noise-plus-tone inputs at 44.1/48/96 kHz, with FFT size 8192. Expected frequency, amplitude, RMS and applicable harmonic/gain results are shown alongside actual values.

Generation and analysis run in a worker, without microphone, AudioContext or speaker output. Completion, cancellation, error, navigation and a 15-second timeout release resources. Results export as `workshopgirl.reference-validation/1` with parameters, expected/actual checks and software elapsed time. This validates the pure DSP path; capture hardware is outside its scope.

## 10. Physical-Device Validation Support

[device-validation.md](device-validation.md) provides a practical protocol for Android Chrome, iOS Safari, desktop Chromium and other browsers: actual rate, capture support, microphone processing, fixed-position repeatability, interruptions, ten-minute stability and independently measured latency where equipment permits.

The Engine Analyzer has a manual browser-family selector, five result checks defaulting to Not tested, and observation notes included in exports. **No physical phone, microphone or machine validation occurred during this implementation.** Browser emulation is reported separately.

## 11. Measurement Export / Schema

Explicit local JSON export uses `schemaVersion: workshopgirl.measurement/1` and `engineVersion: 3`. It contains up to nine records (current, A/B, six repeats), plain power/tonal-dBFS arrays, peaks, bands, RMS, acquisition/quality metadata, namespaced engine context/harmonics, comparison results and the manual device log.

The runtime validator checks generated structures, bounds, array lengths, IDs and numeric validity. Silence's negative-infinite RMS dBFS is explicitly null; other invalid nonfinite numbers fail. Both final Chromium desktop/mobile downloads independently passed the published Draft 7 JSON Schema using the existing ESLint dependency's Ajv. No dependency was added for this verification.

No import is implemented. This validator is not advertised as an untrusted-import security boundary. No raw audio is exported by default, and spectra cannot reconstruct original PCM or phase.

## 12. Engine Analyzer Integration

Quality observations and interval/span information sit with the live analyzer. Labels, notes, six-repeat collection, local export and device logs are collapsed under advanced controls. Pair details are separately collapsed and indexed so identical labels remain distinguishable. A/B gains a conservative comparison-quality result without changing V2's analysis.

Recording stays optional. Tests explicitly remove MediaRecorder and exercise live quality, A/B, repeatability and export. Invalid references, silence and file averages remain visibly constrained rather than receiving a reassuring match label.

## 13. Performance / Benchmarks

Isolated local benchmark: Node 24.12.0, Windows x64, 48 kHz, FFT 8192. 100 warmups; 1000 measured iterations except export (100). Values are milliseconds:

| Operation | Median | p95 |
| --- | ---: | ---: |
| Quality update + report every frame | 0.026 | 0.032 |
| One 4097-bin shape comparison | 0.020 | 0.023 |
| Complete FFT/engine/peaks/waveform/quality pipeline | 0.956 | 1.742 |
| Six snapshots / 15 pairs | 0.308 | 0.370 |
| Nine-record export, validation and JSON encoding | 7.650 | 8.950 |

The 48 kHz frame hop is 85.33 ms. Quality rendering reuses the existing 2 Hz readout, and repeat/export calculations occur on user actions. Bounds: 512 scalar observations, six repeats, 15 pairs, nine exported spectra, one temporary download URL. Nine maximum-size spectra account for 737,460 array bytes; the benchmark JSON was 1,059,211 bytes. Object overhead, existing spectrogram storage and browser transfer/rendering are additional.

These CPU results support the bounded design; they do not establish physical-phone thermal, battery or long-session performance. No mobile performance certification is claimed.

## 14. Privacy

Analysis, reference generation and comparison remain in the browser. No audio upload, server DSP, audio analytics or new persistence was introduced. Notes and device logs remain in tab memory until the user downloads JSON. Serialization allowlists browser evidence again, excluding accidental extra identifier fields. Blob URLs are revoked on replacement, timeout and navigation.

## 15. Actual DSP Validation Results

All 78 Node tests passed, comprising the 55 preserved tests and 23 V3 tests. The seven reference cases passed at each of three rates: **21 known-input combinations**. Limits: peak frequency within one bin, tonal amplitude within 0.75 dB, analytic RMS within 0.15 dB, four harmonic matches, and amplitude doubling +6.0206 dB within 0.01 dB. The seeded-noise case is reproducible; substituting the wrong tone fails validation.

Additional verified results: identical normalized spectra overlap at one; doubled amplitude preserves shape but changes RMS by approximately 6.0206 dB and fails the repeatability level threshold; 100 versus 1000 Hz overlap is below 0.01; incompatible grids and silence do not produce a similarity number. Changing a weak harmonic by more than 10 dB is detected even when overall shape overlap exceeds 0.99. Clipping, noise-like content, silent intervals, capture gaps, processing, context changes, bounds and malformed generated exports are covered.

## 16. Browser / Responsive Results

Playwright ran 92 cases across desktop/mobile Chromium and desktop/mobile WebKit: **60 passed, 32 skipped, zero failed**. The V3 increment was 12 passes and four audio-dependent skips. The Windows WebKit runtime lacks AudioContext; those explicit skips are not Safari microphone validation. All seven generated reference cases run successfully in all four browser projects without Web Audio.

Coverage includes live analysis without recording, bounded repeats/all pairs, context-sensitive A/B, labels/notes, nine-record downloads, silence, file metadata, worker cancellation/stale results/missing APIs, navigation cleanup, URL revocation, routes and schema delivery. Responsive overflow checks cover 320, 390, 844 and 1280-pixel layouts. Desktop, mobile portrait and landscape screenshots were visually inspected. Existing V1/V2 permission, worklet/fallback, cleanup, file and navigation coverage remains intact.

## 17. Commands Run + Final Results

| Command/check | Final result |
| --- | --- |
| `npm test` | 78 passed, zero failures |
| `npm run test:dsp` | 78 passed, zero failures |
| `node --test tests/measurement.test.ts` | 23 passed after the final harmonic regression assertion |
| `npm run lint` | Passed |
| `npm run check` | 97 files, zero errors/warnings; one pre-existing ShareButton deprecation hint |
| `npm run build` | Passed, 31 pages |
| `npm run test:browser` | 60 passed, 32 explicit skips |
| `npm run benchmark:v3` | Completed; isolated results above |
| Independent Ajv Draft 7 validation of browser exports | Desktop and mobile documents valid |
| `git diff --check` | Passed |

The production build and complete browser run were repeated after the final runtime fixes. The subsequent test-only harmonic assertion passed its targeted suite, then the full Node suite, lint and type check were rerun. Browser screenshots/downloads are local ignored test artifacts, not committed generated output.

## 18. Problems Found and Fixed

Self-review corrected temporal claims: overlapping frames no longer double-count coverage; file averages/fallback cannot claim continuous validation; gaps and mixed silent/nonzero observations remain visible. Export handling now maps only genuine silence to null and rejects other nonfinite RMS values. Browser evidence is allowlisted at both collection and serialization.

Comparison review made peak tolerance symmetric, distinguished harmonic-feature changes from known operating-condition differences, and added the weak-harmonic regression case. Unknown RPM/processing remains unverified. Large pair lists were collapsed and labels indexed for readability. Implementation type errors were resolved before the final clean checks.

The first independent schema check used an Ajv version without date-time format support. Verification was rerun with the already-installed ESLint Ajv implementation, which supports the published Draft 7 schema; both real browser exports passed. No package change was needed.

## 19. Known Limitations

Physical phones, analog microphones, actual engines, thermal behavior and real latency remain untested. Browser settings do not reveal all hidden microphone processing. Quality thresholds are transparent heuristics, not calibrated acceptance standards. Broadband flatness cannot classify noise, and equal-strength peaks may exchange rank without physical speed changes.

A live snapshot represents one FFT window with recent quality context; it is not a multi-second spectral average or statistically independent trial. File-average temporal stability is unavailable. Shape overlap requires compatible grids and cannot compensate for microphone response, placement or gain effects near the floor. No import, SPL calibration, fault diagnosis or probability score is provided.

## 20. Technical Debt

Physical evidence is needed to tune thresholds, characterize processing/placement sensitivity and quantify phone performance. Independent exported-schema verification currently uses an installed transitive validator through a command; a dedicated schema-validation test dependency may be appropriate if external consumers or import are added. Export import/migrations, calibrated measurements and temporal file-window quality require separately scoped design and tests.

The existing ShareButton deprecation hint and Windows WebKit audio limitation remain. Neither was introduced by V3.

## 21. Reuse for HVAC/Compressor/Motor/Bearing/Speaker

Generic quality, spectral overlap, repeatability, reference generation and export can be reused without engine imports. A domain adapter supplies operating conditions and comparable features: fan/compressor speed and load, motor speed, controlled speaker stimulus, or documented bearing acquisition conditions. Namespaced domain export fields keep those interpretations outside generic DSP.

This foundation does not itself provide bearing envelopes, calibrated speaker distortion, fault detection or machine-health conclusions. Those require appropriate signal processing and independent validation.

## 22. Recommended SINGLE Next Phase

**Physical-device measurement validation campaign.** Execute the provided protocol on real Android Chrome, iOS Safari and desktop Chromium with a reproducible signal source and fixed placement. Gather repeated exports, interruptions and ten-minute sessions; establish microphone-processing effects, measurement variability, latency and mobile resource costs before adjusting policies or beginning diagnosis.

## 23. Git Branch / Commit / Working Tree Status

Branch: `codex/dsp-engine-v3`, based on `0ed393e`. Local implementation commit subject: `Build DSP Engine V3 measurement and validation foundation`. This report belongs to that implementation commit; obtain its identifier with `git log -1 --format=%h` on this branch. The completion response records the verified commit hash and post-commit status.

Only the 29 V3 files listed above are included. No push, deployment or PR is part of this handoff. The working tree is checked after committing; ignored test/build artifacts remain local.

## 24. Handoff Notes

Start with [dsp-v3-architecture.md](dsp-v3-architecture.md), then [device-validation.md](device-validation.md). Use `npm run dev` to visit `/tools/engine-sound-analyzer/` and `/tools/dsp-validation/`; `/tools/sound-analyzer/` retains the general workflow. Run the commands above to reproduce validation.

For repeatability, keep physical position, source and operating settings fixed; inspect quality, capture distinct source intervals and review every pair's reasons. Export JSON before navigating away if retaining notes/results matters. Treat Not tested, unavailable and context-unverified states literally. The new schema/route are local changes until a separately authorized deployment.
