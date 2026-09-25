# WORKSHOPGIRL DSP ENGINE V1 — IMPLEMENTATION REPORT

## 1. Executive Summary

Implemented a reusable DSP foundation and the WorkshopGirl Sound Analyzer at `/tools/sound-analyzer/`, with discovery at `/tools/`. V1 includes live microphone analysis, local audio import, waveform, FFT spectrum, spectrogram, significant peaks, band energy, optional recording, playback/download, and functional A/B snapshots.

Final verification: **26 DSP tests passed; 26 browser tests passed; 14 browser cases explicitly skipped because Windows Playwright WebKit lacks Web Audio; lint, typecheck and the production build passed.** The build produces 29 pages. All 29 sitemap URLs returned successful responses in browser tests. Physical phone microphones and real Safari audio have not been certified. Changes are local and committed on `codex/dsp-engine-v1`; they were not pushed or deployed.

## 2. Repository Architecture Discovered

- Astro 7.3.3, TypeScript 5.9.3, ESM, static output; Astro file-based routing and Vite client bundling.
- Strict Astro TypeScript configuration; ESLint 9 with TypeScript/Astro rules. Existing commands: dev, lint, check, build. No existing automated test suite.
- Shared SiteHeader/SiteFooter, independent Astro content pages, TypeScript data lists. Articles are not React components or a separate application shell.
- Warm paper backgrounds, pink accents, DM Sans/Space Grotesk, responsive navigation, existing static character imagery. No new character imagery was generated.
- Per-page titles, descriptions, canonical/Open Graph tags; manually maintained sitemap endpoints.
- Optional homepage GA4. New tool pages include no analytics script.
- README specifies Cloudflare Pages (`npm run build`, `dist`, main). Existing `.openai/hosting.json` also points at `dist`; neither deployment configuration was changed.
- Baseline lint/check/build passed; the existing ShareButton deprecated-copy hint was already present.

## 3. Architecture Implemented

Three boundaries keep future tools from duplicating mathematics:

1. `src/lib/dsp/`: browser-independent PCM analysis, FFT, spectral summarization, offline STFT, comparison and typed data contracts.
2. `src/lib/audio/`: browser microphone acquisition, decoding, recording and worker execution.
3. `src/components/sound-analyzer/`: workflow state, semantic UI, textual measurements and Canvas rendering.

Live PCM and offline frames use the **same DspEngine**. Domain-specific tools can consume Spectrum/Snapshot outputs and supply their own workflows or interpretation. No speculative fault-diagnosis implementation or fake domain analyzer was added. Architectural rationale and mathematical conventions are documented in `docs/dsp-architecture.md`.

## 4. Files Added

| File | Purpose |
| --- | --- |
| `src/lib/dsp/types.ts` | Spectrum, peaks, bands, result, snapshot and worker contracts |
| `src/lib/dsp/fft.ts` | In-place radix-2 FFT |
| `src/lib/dsp/engine.ts` | DC removal, Hann window, RMS, FFT and normalization |
| `src/lib/dsp/spectrum.ts` | dB conversion, peak selection and band energy |
| `src/lib/dsp/offline.ts` | Whole-file overlapping analysis and bounded display data |
| `src/lib/dsp/comparison.ts` | Snapshot compatibility and numeric differences |
| `src/lib/audio/microphone.ts` | Microphone graph, permission errors, cancellation and cleanup |
| `src/lib/audio/decode.ts` | Local decoding, channel policy, limits and abort cleanup |
| `src/lib/audio/recording.ts` | MIME negotiation, recording limits and disposal |
| `src/lib/audio/analysis.worker.ts` | Background offline analysis and progress |
| `src/components/sound-analyzer/Analyzer.astro` | Tool markup and controls |
| `src/components/sound-analyzer/controller.ts` | Source lifecycle, workflow state and interactions |
| `src/components/sound-analyzer/charts.ts` | Waveform/spectrum/spectrogram/overlay Canvas rendering |
| `src/components/sound-analyzer/readouts.ts` | Textual measurements and comparison tables |
| `src/styles/sound-analyzer.css` | Responsive WorkshopGirl tool styling |
| `src/pages/tools/index.astro` | Digital workbench listing |
| `src/pages/tools/sound-analyzer/index.astro` | Tool route, metadata and explanatory copy |
| `tests/dsp.test.ts` | 26 deterministic DSP tests |
| `tests/browser.spec.ts` | Ten browser scenarios across four browser/viewport projects |
| `playwright.config.ts` | Production-preview browser test configuration |
| `docs/dsp-architecture.md` | Math, ownership, limits and extension guidance |
| `docs/dsp-v1-implementation-report.md` | This implementation and verification handoff |

## 5. Files Modified

- `src/components/SiteHeader.astro`: Tools navigation and active state.
- `src/components/SiteFooter.astro`: Tools link.
- `src/pages/index.astro`: restrained Sound Analyzer entry using existing homepage styles.
- `src/pages/sitemap-0.xml.ts`: both new routes.
- `package.json`: test scripts; development-only Playwright and Node 24 types.
- `package-lock.json`: corresponding dependency resolution.
- `tsconfig.json`: explicit `.ts` imports for browser bundling and native Node TypeScript tests.
- `eslint.config.mjs`: defer TypeScript identifier checking to TypeScript, avoiding JavaScript no-undef false positives for DOM/Node APIs.
- `.gitignore`: generated Playwright output.
- `README.md`: current project introduction, DSP locations and validation commands.

No article content, character assets, backend, or deployment configuration was rewritten.

## 6. DSP Pipeline

Audio input → actual-rate PCM → frame mean removal → periodic Hann window → radix-2 FFT → one-sided amplitude/power → peaks/bands → timestamped spectrogram → comparison snapshots.

Live acquisition uses AnalyserNode only for raw time-domain PCM. Its built-in frequency transform and smoothing are not used. Browser file decoding returns the actual decoded rate; resampling can occur, so the original file rate is never assumed. Stereo channel 1 is analyzed to avoid phase cancellation; playback preserves the source channels. The browser decoding behavior follows the [decodeAudioData documentation](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData).

Frequency bins use `k × sampleRate / FFT-size`. Default FFT size is 4096, with 2048/8192 options. Nyquist is the actual rate divided by two. DC and Nyquist have one-sided factor 1; interior bins use factor 2.

Tonal amplitude uses the window sum (coherent gain). Bin power uses `N × sum(window²)` (window energy). This distinction is necessary for correct band energies. RMS is calculated before windowing after removing DC; whole-file RMS uses all samples. No SPL calibration or acoustic weighting is claimed.

Peaks are local maxima above conservative absolute/relative thresholds, capped at six and separated by three bins. Log-parabolic interpolation refines their positions but does not improve true frequency resolution. RMS below −100 dBFS suppresses peaks. The peak threshold is a heuristic, not diagnostic confidence.

Offline analysis uses 50% overlap and includes the file tail. Every frame is analyzed; up to 400 spectrogram columns average adjacent-frame power. Whole-file spectrum is a power average. Live history retains 180 timestamped snapshots and explicitly does not claim continuous recording. No smoothing is applied.

## 7. Sound Analyzer Features Completed

- Explicit Start/Stop microphone control with visible state, denial/unavailable-input messages and retry.
- Local audio import with useful errors and cancellation.
- Waveform, logarithmic frequency spectrum and real time-frequency spectrogram.
- Dominant/significant peak estimates, RMS dBFS, actual sample rate, bin spacing, Nyquist and possible-clipping indication.
- Low/mid/high energy shares.
- Optional MediaRecorder capture, original-clip playback and download.
- Whole-clip analysis of finished recordings through the same import path.
- Two saved measurement snapshots, spectral overlay and numeric comparison.
- Advanced FFT setting disclosure, textual readouts, keyboard controls and reduced-motion behavior.

Audio flows were exercised with real browser APIs and oscillator-backed synthetic MediaStreams in Chromium. Physical hardware behavior remains a separately stated limitation.

## 8. A/B Comparison

Save a stopped live frame or completed file average as A/B. Snapshots are deep copies and retain source kind, label, timestamp and spectral metadata. The UI overlays spectra in physical Hz and lists sources, rates, FFT sizes, RMS, strongest peaks and band percentages. It calculates B−A RMS dB and peak-frequency differences; the shared helper also exposes band percentage-point differences.

Different rates, FFT sizes or source types produce a caution. There is no automatic time alignment, calibration, gain normalization, synchronized A/B playback, or claim that different recording conditions are directly comparable. Snapshots live only in tab memory. A known 2× amplitude ratio correctly produced 6.0206 dB in DSP tests and a displayed −6.0 dB after halving amplitude in the browser comparison.

## 9. DSP Validation Results

The primary frequency tests use FFT size 8192 and tolerate at most one bin. Results below are actual deterministic test output, in Hz.

| Sample rate | Bin tolerance | 100 Hz | 440 Hz | Mixed 100 / 440 / 1000 Hz | Noise + 440 Hz |
| --- | --- | --- | --- | --- | --- |
| 44,100 | ±5.3833 | 99.9458 | 439.9148 | 99.9458 / 439.9148 / 999.9176 | 439.9537 |
| 48,000 | ±5.8594 | 100.0315 | 440.0434 | 100.0315 / 440.0434 / 999.9093 | 439.9789 |
| 96,000 | ±11.7188 | 99.9409 | 439.9196 | 99.9412 / 439.9195 / 1000.1813 | 439.9907 |

Silence, amplitude-1e-8 near-silence, and constant DC produced **zero peaks at all three rates**. Additional tests validated:

- FFT complex output against an independently computed direct DFT.
- Bin-centered amplitude-1 sine: 0 tonal dBFS, −3.0103 RMS dBFS, total spectral power 0.5.
- Correct non-doubled Nyquist amplitude/power.
- Hann leakage suppression and all three UI FFT sizes at all three sample rates.
- Spectrogram transition from 440 Hz to 1000 Hz, including the last window.
- Short-window normalization/zero padding, bounded long-file display columns and transient-preserving waveform reduction.
- Comparison gain differences, mismatched settings, silence and invalid-input rejection.

All **26 tests passed**. These synthetic results validate the algorithms, not microphone calibration or sub-hertz physical accuracy.

## 10. Browser / Mobile Considerations

Controls are touch-sized, charts resize with the container, narrow layouts stack naturally, and 320-pixel and landscape viewport checks found no horizontal page overflow. Desktop and mobile screenshots were inspected. No hover-only interaction is required. Reduced motion lowers live graph refresh to four updates per second.

AudioContext is created/resumed in the user gesture before waiting for microphone permission. HTTPS/localhost is required for capture. Browser-controlled input processing can still alter measurements. MediaRecorder format support is detected; missing recording leaves the analyzer usable.

Chromium desktop/Pixel viewport audio flows passed. Windows Playwright WebKit exposes no AudioContext: seven audio scenarios per WebKit project were explicitly skipped, **14 skips total**. Its desktop/iPhone viewport navigation, responsive UI and unsupported-API checks passed. This is not a claim of tested real iPhone/Safari audio, nor a claim about all Safari implementations.

## 11. Performance Decisions

No React loop, chart library or new production dependency. Canvas is capped at 2× pixel density. Live analysis/rendering runs at up to 10 Hz, textual metrics at 2 Hz; reduced motion uses 4 Hz. Waveforms retain up to 1000 min/max buckets. Spectrogram storage is bounded at 180 live or 400 offline columns.

Offline PCM is transferred to a worker, avoiding a second main-thread sample-array copy. Workers terminate after completion/cancellation. File size/duration/channel/rate limits constrain normal workloads. Recording stops at 55 seconds or approximately 16 MiB.

A local Node benchmark analyzed 60 seconds at 96 kHz / FFT 8192: 1,406 frames, 400 output columns, **1,370 ms**, strongest peak 439.9196 Hz. This is a desktop Node measurement, not a phone benchmark. Final minified analyzer JavaScript is approximately 19.6 KB and the worker 4.5 KB before compression.

Generation tokens reject stale microphone/decoder results. Stop/clear/replacement/navigation cancel animation, stop tracks, disconnect nodes, close contexts, terminate workers and revoke audio URLs as applicable. Tests assert closed contexts, ended tracks, rejected late results and revocation of both replaced/cleared clip URLs.

## 12. Privacy

Microphone capture requires a user click. Audio is processed locally using browser APIs and an on-origin worker. No recording upload, audio analytics event, cloud analysis, account or persistent browser storage was added. The tool page includes no analytics script.

Browser file-analysis tests observed no non-GET requests. Source review found no fetch/XHR/beacon/storage/analytics paths in the audio/DSP/UI code. Existing Google Fonts requests still occur; “local audio processing” does not mean the page has no network requests at all.

## 13. UX / WorkshopGirl Integration

The shared header/footer now expose Tools. A restrained homepage entry leads to the analyzer; the existing tutorials, activities, projects and character identity remain intact. New pages use the site's typography, warm surfaces and pink accents, with dark chart surfaces for readable signal contrast. The tool is above the explanation, with numbered choose/measure/compare sections. No decorative artwork competes with the controls.

Numeric peak/band tables supplement Canvas. Semantic controls, visible focus, status/alert messages, a focusable skip target and reduced-motion handling are included. Repeated animated measurements are not announced through a live region on every frame.

## 14. SEO Changes

Unique titles/descriptions, production canonical URLs, heading hierarchy and Open Graph metadata were added to the tool routes. The analyzer references existing WorkshopGirl imagery for social metadata. Both routes are in the manually maintained sitemap and linked internally from navigation, homepage, tool listing and contextual copy. No fabricated diagnostic claims, keyword stuffing or unnecessary structured data were added.

## 15. Tests and Commands Run

| Command / check | Final result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run check` | 0 errors, 0 warnings; one pre-existing ShareButton deprecation hint |
| `npm test` | 26 passed, 0 failed |
| `npm run test:dsp` | 26 passed, 0 failed |
| `npm run build` | Pass, 29 pages |
| `npx playwright install chromium webkit` | Browser runtimes available |
| `npm run test:browser` | 26 passed, 14 explicitly skipped, 0 failed; 40 project/scenario combinations |
| `git diff --check` | Pass |
| Package installation audit | 0 reported vulnerabilities |
| Production sitemap HTTP checks | All 29 listed URLs succeeded |
| Desktop/mobile screenshots | Inspected |
| Maximum supported-duration Node benchmark | 60 s / 96 kHz analyzed in 1,370 ms |

Browser cases cover imports, opposite-phase stereo, playback, comparison, URL cleanup, invalid/empty/oversized/long files, silence, synthetic live PCM, stop/restart, recording, denied permission, delayed permission cancellation, decode cancellation, background capture stop, unsupported APIs, navigation, responsive sizes and keyboard activation.

The initial baseline commands also passed. Intermediate failures were investigated and corrected; they were not reported as final successes. PowerShell calls used separate npm commands; their output/results were inspected individually.

## 16. Problems Found and Fixed

- Shared code now performs its own windowing/normalization instead of mixing browser frequency output with offline FFT semantics.
- Opposite-phase stereo could cancel if averaged: analyze channel 1 explicitly and explain it.
- Late permission/decode completion could revive stale sessions: generation tokens reject stale results; abort closes decode contexts immediately.
- A late recording completion could replace a newer source: superseded recorders are discarded.
- TypeScript DOM globals triggered JavaScript no-undef checks: TypeScript now owns name checking for typed files; Node 24 types added for tests.
- The original preview port was occupied; browser tests use isolated port 4379.
- Astro 7 agent-mode preview started in the background and exited the managed process: `--ignore-lock` keeps test preview in the foreground.
- Initial browser tests incorrectly expected literal 100.0/440.0 text: changed assertions to physically meaningful bin tolerances.
- Windows WebKit lacked Web Audio: added capability-aware explicit skips plus real fallback tests.
- WebKit's Tab preference skips ordinary links: test keyboard activation after focusing the skip link there; Chromium still checks initial Tab traversal.

## 17. Known Limitations

- Physical Android/iOS microphone behavior, permission dialogs and real Safari recording codecs remain unverified.
- Uncalibrated digital levels; hardware gain/response/processing may vary. No accurate SPL, machine diagnosis, RPM or fundamental-frequency guarantee.
- File limit: 20 MiB, 60 seconds, mono/stereo, decoded rate ≤96 kHz. Analysis uses channel 1 only.
- Native decoding allocates before duration validation and cannot be forcibly cancelled; stale results are discarded and its context is closed.
- Live spectrograms sample frames with gaps/overlap; continuous sample-clock analysis requires a future capture path.
- Offline spectrum is a whole-file average. No zoom, time-region selection, synchronized cursor, aligned comparison or persistent saved sessions.
- Codec support varies. Lossy recordings can differ from the live PCM spectrum.
- Short-window padding and interpolated peak digits do not create additional resolving power. Peak thresholds are conservative heuristics; DC/Nyquist endpoints are not interpolated tone peaks.
- Generated `dist` and screenshots are ignored build/test artifacts. No public deployment occurred.

## 18. Technical Debt

The main outstanding engineering debts are a physical-device validation matrix, limited acquisition-condition metadata in comparison snapshots, and whole-file browser decoding before duration validation. A continuous AudioWorklet capture adapter would be needed before sample-accurate time analysis/order tracking. Real-device profiling should precede more sophisticated raster caching or rendering optimizations.

The unrelated ShareButton deprecated-copy fallback remains an existing hint. No essential V1 feature is a TODO stub, and no new production dependency needs migration.

## 19. Future DSP Extension Points

All future tools can reuse PCM acquisition/decoding, FFT, Hann normalization, RMS, spectra, peak candidates, band energy, STFT display data and snapshot comparison. Domain rules should consume typed outputs rather than copy those algorithms.

| Future analyzer | Additional capabilities/context still required |
| --- | --- |
| Engine | RPM reference, firing-order context, harmonics, order tracking and validated operating conditions |
| HVAC / AC | Equipment/mode context, electrical/blade-related features, comparable baseline recordings |
| Compressor | Operating-cycle segmentation, harmonic/sideband features and mode-specific references |
| Electric motor | Pole count, drive frequency, slip/load context, order/sideband analysis |
| Bearing / rotating machine | Shaft speed, bearing geometry, envelope demodulation, synchronous capture and validation |
| Fan / pump | Blade/vane counts, RPM reference, order features and condition-controlled comparisons |
| Power tool | Load-state segmentation, speed changes and repeatable capture workflow |
| Appliance | Appliance/mode context, cycle segmentation and reference data |
| Speaker / audio | Sweep generation/deconvolution, channel selection, response calibration and distortion analysis |
| Before vs after repair | Matched time regions, acquisition metadata, alignment, repeatability and exportable results |

None of these domain-specific capabilities or fault classifiers is implemented. The deliberate extension points are the pure PCM engine, typed Spectrum/AnalysisResult/Snapshot contracts, separate audio adapters, worker boundary and comparison helper.

## 20. Recommended Next Phase

**Real-device validation and measurement repeatability.** This should precede machine diagnosis because microphone/codec/gain behavior can dominate measured differences even when the FFT is correct.

Reuse the current microphone/recording/decoding adapters, DspEngine, offline analyzer and snapshots. Test real iOS Safari and Android Chrome, permission/revocation/interruption flows, clip round trips, repeated captures, codec behavior and memory/CPU on representative phones. Add explicit capture-condition metadata where those tests establish what is reliable.

No new DSP transform is required to start this phase. It needs reference fixtures and error budgets around the existing level/frequency/band measurements. If continuous capture becomes necessary, add an AudioWorklet adapter with sample-count/dropout tests. Add real-device tests for suspended/interrupted contexts, Bluetooth route changes, recording boundaries and long-session cleanup. Do not infer calibration or diagnoses from these checks. This phase has not been implemented here.

## 21. Git / Working Tree Status

- Branch: `codex/dsp-engine-v1`, created from the initially clean, synchronized `main` checkout.
- Scope: **32 intentional files: 22 added and 10 modified**, including this report.
- All task changes are committed locally. Final tracked working tree and untracked-file status are clean; generated build/test output is ignored.
- No unrelated pre-existing modifications were present, destroyed or discarded.
- No push, PR, merge or public deployment was performed. Read the resulting commit ID with `git log -1 --oneline`.

## 22. Handoff Notes for the Next AI/Engineer

Start with `docs/dsp-architecture.md`, then `src/lib/dsp/engine.ts` and `types.ts`. UI lives in `src/components/sound-analyzer/`; routes live in `src/pages/tools/`. The controller owns lifecycle; audio adapters own browser resources; the worker owns offline PCM during analysis; charts consume result data without performing DSP.

Run `npm ci`, then `npm run dev`; open `/tools/sound-analyzer/`. Use Node 24 for native TypeScript tests. Run `npm run test:dsp`, `npm run lint`, `npm run check`, `npm run build`, then install Playwright browsers and run `npm run test:browser`.

Add future analyzers as thin domain routes/controllers importing the shared core. Keep machine rules outside the FFT implementation. Preserve actual-rate frequency mapping, coherent-gain versus energy normalization, finite/near-silence guards, per-source sample-rate metadata, and the dBFS/SPL distinction. Do not remove generation tokens, abort cleanup, object-URL revocation or the no-speaker microphone graph. Do not present sampled live history as continuous acquisition or peak interpolation as laboratory accuracy.

Final critical review covered reuse, sample-rate mapping, synthetic validation, silence, spectrogram meaning, cleanup, bounded buffers, mobile layout, privacy, truthful units/claims, existing routes and the production build. The decode-cancellation cleanup issue found during that review was fixed and the relevant full checks rerun successfully. Physical-device validation is the most important next verification step.
