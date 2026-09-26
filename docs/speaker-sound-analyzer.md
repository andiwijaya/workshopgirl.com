# Speaker Sound Analyzer V1

Production-intended route: `/tools/speaker-sound-analyzer/`.
Development branch: `codex/speaker-sound-analyzer-v1`, based on clean main
`bd41992880bc736fc3fe189c11781006488ff3fb`.
This development task does not push, merge or deploy.

## Product and integration

“Play music. See its balance.” A microphone-only consumer view with a live spectrum,
three Relative Captured Energy meters, and a cumulative Captured Sound Profile.
The only classifications are Bass Dominant, Mid Dominant, Treble Dominant and Balanced.
Permission is requested by Start Listening. Stop keeps the summary; Start clears it.
Quiet, overloaded and unsupported input have plain-language guidance.
Results describe the microphone and environment, not speaker quality, calibration,
original song content, or a laboratory frequency response.

Uses existing SiteHeader, SiteFooter, typography, colors, button styles and ToolShare.
Adds one Tools index card, canonical/social metadata and the existing static sitemap entry.
No dependency added. No unrelated page redesign.

## Calculation

The tool consumes `Spectrum.power` from the unchanged DSP V3 pipeline at FFT size 8192.
Those values are one-sided, Hann-window-energy-normalized **linear bin power**.
It does not square the existing power or average dB values.

Consumer bands are Bass [20,250), Mid [250,4000), Treble [4000,20000] Hz.
The final limit is min(20000, sampleRate/2). Exact 250 Hz and 4000 Hz bin centers
belong to the upper band. DC and out-of-range centers are excluded.

For bin spacing Δf = sampleRate/fftSize, bin k has center f = kΔf and density
P[k]/Δf. Its cell [f−Δf/2,f+Δf/2] is clipped to its owning band and Nyquist.
Its log-frequency weight is w[k] = log2(cellUpper/cellLower).
The band score is Σ(P[k]/Δf × w[k]) / Σw[k], including zero-power cells in
the denominator. This is a quadrature approximation of **mean power density over
log frequency**, equivalent to octave-aware averaging of power densities. Band
width alone confers no advantage: flat density produces equal scores even though
the raw treble bin sum exceeds bass by over 50 times.

This is a product heuristic, not acoustic weighting or total integrated band energy.
Pink noise need not classify Balanced. Finite FFT resolution and bin-center ownership
affect narrow features near boundaries; clipping cells leaves small boundary gaps,
and normalization uses the actual represented log width. No interpolated resolution
or frequencies beyond Nyquist are invented. A partial treble band is labeled with
its actual upper limit. If any band has no represented width, no full profile forms.

Session scores are time-weighted running means of these **unsmoothed linear scores**.
The largest band is dominant iff strongest ≥ secondStrongest × 10^(3/10)
(about 1.9952623). Otherwise the profile is Balanced. Zero/invalid scores cannot
produce a classification. Display percentages normalize the three scores and use
largest-remainder rounding to total 100; they are not confidence percentages.

## Active time and lifecycle

At least 10 seconds of valid observed audio are required. First frame adds no time.
Both adjacent observations must be usable: finite spectrum and level data, all bands
available, RMS ≥ −70 dBFS, nonzero band power, no DSP clipping flag and sample peak
<0.999. These are tool-local usability gates; existing analyzer thresholds are unchanged.

Only positive timestamp increments on the same capture clock/mode count, with no
change in dropped-frame or discontinuity counters. Increments above
max(0.25 seconds, 1.5 × actual window duration) are treated as gaps. Credited time is
min(increment, actual window duration), preventing overlap or unobserved fallback
intervals from inflating the clock. Invalid intervals need two usable endpoints to
resume counting. Sampled capture describes observed windows, not continuous certainty.
The first valid window is deliberately undercounted, and sub-window silence cannot
be distinguished from the existing frame measurements. The clock is not a claim of
sample-accurate sound onset detection.

Accumulation continues after classification. No history grows with session length:
three means, previous capture metadata and presentation arrays remain in memory.
No recording is created. Existing bounded worklet/worker transport is reused unchanged.
Stop, tab hide, navigation and interruption release capture. Stale permission grants
are stopped by the existing Microphone adapter. Cached-page restoration mounts a fresh
session without automatically requesting permission.

Visual-only smoothing has a 0.35-second exponential time constant. The spectrum uses
48 logarithmic display buckets from existing dB output; meters use smoothed normalized
scores. Canvas draws at most 10 times/second (4 with reduced motion), text twice/second.
No animation runs after Stop. Semantic buttons, native meters/progress, status regions,
visible existing focus styles and text labels keep information available without color.

## Sharing and privacy

Unmodified `ToolShare.astro`: Web Share API, clipboard canonical-link fallback,
accessible “Link copied” feedback. Exactly this static Web Share object is passed:

```json
{
  "title": "Speaker Sound Analyzer | WorkshopGirl",
  "text": "Play music. See its frequency balance. Explore bass, mid and treble in sound captured by your microphone, locally in your browser.",
  "url": "https://workshopgirl.com/tools/speaker-sound-analyzer/"
}
```

Sharing reads no controller/session state. Audio, FFT, percentages, classification,
duration, capture range and device details never enter the payload or URL. No fetch,
upload, telemetry, recording API, persistent storage or analytics code was added.
Existing static assets and Google Fonts still make requests; local processing does
not imply an offline page. Browser tests intercept only the share/clipboard calls and
microphone source; the real worklet, worker and DSP execute locally.

Read-only inspection of the Cloudflare dashboard on 2026-09-26 confirmed the **Active**
rule “Keep DSP tools free of browser analytics”, action **Disable RUM**, matching
workshopgirl.com/www.workshopgirl.com and `/tools` or paths starting `/tools/`.
The new route is covered. No external configuration was edited.

Release checks: after a separately authorized deployment, verify the new route's actual
HTML/network has no injected RUM or measurement traffic and smoke-test real Android and
iOS microphones. Windows Playwright WebKit cannot verify physical Safari audio.

## Files

- `src/lib/domains/speaker/profile.ts`: isolated interpretation/session helpers.
- `src/components/speaker-analyzer/controller.ts`: consumer microphone UI and lifecycle.
- `src/pages/tools/speaker-sound-analyzer/index.astro`: new page and static share props.
- `src/styles/speaker-analyzer.css`: new page's responsive styles.
- `src/pages/tools/index.astro`, `src/pages/sitemap-0.xml.ts`: minimal discovery additions.
- `tests/speaker.test.ts`, `tests/speaker-browser.spec.ts`: focused math/lifecycle/UI/privacy coverage.
- `scripts/benchmark-speaker.ts`, `package.json`: incremental benchmark and test commands.
- `docs/speaker-sound-analyzer.md`: this implementation/release record.

DSP core files changed: **NO**. DSP algorithms changed: **NO**.
Microphone, AudioWorklet, worker, existing analyzers, Capture A/B, validation and ToolShare
files remain unchanged. Existing tests are preserved.

## Verification results — 2026-09-26

| Command | Result |
| --- | --- |
| `npm test` | 91 passed, 0 failed, including 13 new speaker tests |
| `npm run test:dsp` | 91 passed, 0 failed |
| `npm run lint` | Passed |
| `npm run check` | 104 files; 0 errors, 0 warnings, 2 pre-existing execCommand deprecation hints |
| `npm run build` | Passed; 32 pages |
| `npm run test:browser` | 84 passed, 48 skipped, 0 failed; 132 cases, 3.6 minutes |
| `npm run benchmark:dsp` | Completed, timings below |
| `npm run benchmark:v3` | Completed, timings below |
| `npm run benchmark:speaker` | Completed, timings below |
| `git diff --cached --check` | Passed |

Baseline before editing: 78 Node tests and 62 browser passes / 34 skips. All those
existing cases remain intact. New speaker coverage contributes 13 Node tests and
22 browser passes / 14 skips. All 48 full-suite skips are the established Windows
WebKit AudioContext limitation; no failing tests were disabled. Chromium desktop and
Pixel 7 emulation exercise actual local AudioWorklet/worker/DSP with synthetic sources.
Both WebKit configurations exercise the speaker layout, sharing and unsupported-API UI.

Responsive browser assertions and manually reviewed screenshots cover 320 px, 390 px
and 1280 px in initial, active and classified states; landscape 844×390 is also checked.
No document overflow, clipped labels, overlapping controls or fixed-content obstruction
was found. Start buttons satisfy the 44 px minimum. Browser coverage includes all four
classifications, no immediate profile, cumulative valid duration, retained results on
Stop, reset on Start, silence, fallback, denied/unavailable input, late permissions,
worker/track cleanup, tab hiding, navigation and cached-page lifecycle restoration.
Cached-page lifecycle events are simulated; this is not a claim about physical device
cache eligibility. Static share payload equality is checked before and after results,
including a page opened with a private query parameter; clipboard copies the canonical
URL only. Recording API is disabled during live speaker tests. No non-GET requests or
page errors occurred in the four profile scenarios.

Synthetic CPU benchmarks, Node v24.12.0 / Windows x64, FFT 8192. Median / p95 in ms:

| Operation | Median | p95 |
| --- | ---: | ---: |
| Existing V2 frame pipeline, 48 kHz | 0.936 | 1.485 |
| Existing V2 frame pipeline, 96 kHz | 0.938 | 1.286 |
| Existing V3 quality update + report | 0.026 | 0.034 |
| Existing spectral comparison | 0.020 | 0.021 |
| Existing complete V3 frame pipeline | 0.964 | 1.428 |
| Existing six-snapshot repeatability | 0.355 | 0.415 |
| Existing nine-measurement export | 19.867 | 28.637 |
| New speaker interpretation + accumulation + classification + percentages | 0.053 | 0.065 |

Speaker benchmark: 100 warmups and 1000 measured iterations, 4097 input bins; retains
three session scores after 93.781 valid seconds. Existing V2 hop budgets are 85.33 ms
at 48 kHz and 42.67 ms at 96 kHz. Timings exclude device input, browser rendering and
transport and are observations, not device performance guarantees.

Final scope audit against the baseline confirms no changes in DSP/audio/measurement/
validation libraries, existing analyzer controllers/pages, or ToolShare. Only the
11 files listed above are included. No main merge, push, deployment or external
Cloudflare configuration change was performed.
