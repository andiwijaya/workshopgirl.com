# WorkshopGirl DSP Engine V1

## Boundaries

`src/lib/dsp/` is pure TypeScript with no browser, DOM, Astro or third-party DSP dependencies. It accepts normalized floating-point PCM and the **actual analysis sample rate**. Browser acquisition/decoding/recording lives in `src/lib/audio/`. `src/components/sound-analyzer/` owns UI state, rendering and interactions. Future domain tools should import the DSP contracts and functions, then supply their own workflows and interpretation; they must not fork the FFT.

The public route is `/tools/sound-analyzer/`; `/tools/` provides discovery. Both are ordinary static Astro pages. No server endpoint, audio upload or deployment configuration is required.

## Mathematical conventions (preserve these)

- Forward radix-2 FFT is unnormalized, exponent `-2πik/N`. Bins include DC and Nyquist (`N/2 + 1` values).
- Frequency at bin `k` is `k * sampleRate / N`. FFT size defaults to 4096; the UI offers 2048, 4096 and 8192.
- Remove the unweighted mean from each frame before analysis. AC RMS is computed on the unwindowed, centered samples. Raw absolute sample peak is retained for a possible-clipping indication.
- Apply a periodic Hann window: `w[n] = 0.5 - 0.5 cos(2πn/M)`, where `M` is the number of actual samples. A short clip uses its actual window support and zero padding up to `N`. Padding refines the frequency grid, **not** the resolving power.
- Let `X[k]` be the complex FFT. One-sided tonal amplitude is `c[k] * |X[k]| / sum(w)`, where `c=2` for interior bins and `c=1` for DC and Nyquist. Display `20 log10(amplitude)` as tonal dBFS. A bin-centered amplitude-1 sine gives 0 tonal dBFS.
- One-sided bin power is `c[k] * |X[k]|² / (N * sum(w²))`. Its sum is the window-energy-normalized mean-square value (Parseval). Band energy uses this power array, **not** squared coherent-gain-corrected amplitude. It is not a power spectral density in dB/Hz.
- RMS dBFS is `20 log10(rms)`, relative to digital amplitude 1. A full-scale sine gives −3.0103 dBFS RMS. Zero RMS is negative infinity; display it explicitly, never as fabricated finite loudness.
- Window coherent gain and window energy are deliberately separate. Changing either normalization needs amplitude, power, Parseval and regression tests.
- No spectral smoothing is applied. Peak frequency is refined by a three-bin log-magnitude parabola, clamped to ±0.5 bin. The estimate is not an accuracy guarantee. Interpolated off-bin peak amplitude can have a small Hann interpolation bias.
- Peak selection requires RMS ≥ 1e-5 (−100 dBFS), a local maximum, and a level above the largest of −90 dBFS, median bin level +12 dB, or maximum bin level −50 dB. Retain at most six peaks separated by at least three bins. This threshold is a conservative heuristic, not statistical significance or a calibrated noise-floor estimate. Endpoint DC/Nyquist bins are not reported as interpolated tone peaks.
- Low/mid/high bands are 20–250, 250–2000 and 2000–20000 Hz, clipped at Nyquist. Sum bin powers whose centers fall in a band. Percentages reference all non-DC bin power, so excluded frequencies can make the sum less than 100%. These are coarse bands, not IEC octave filters or acoustic weighting curves.

## Live path

User click → AudioContext resume + getUserMedia → MediaStreamAudioSourceNode → AnalyserNode PCM tap → shared DspEngine → numeric readouts and Canvas.

Only `getFloatTimeDomainData()` is used. AnalyserNode's frequency transform, Blackman window and smoothing do not define our measurements. The audio graph is never connected to speakers. Request mono with echo cancellation, noise suppression and automatic gain disabled; report if the browser says processing remains enabled. Hardware may ignore these requests.

Sample frames at up to 10 Hz, or 4 Hz with reduced motion. Update textual values at most twice per second. Keep at most 180 timestamped live spectrogram columns. These are snapshots with possible gaps/overlap, not a continuous STFT or a recording. The waveform is the latest FFT frame. Stop retains that last measurement for comparison. Hidden tabs stop capture, rather than silently accumulating audio or suggesting continuous measurements.

## File path

File selection / finished recording → validate compressed size → browser decode → first-channel PCM plus decoded sample rate → transfer PCM buffer to module Worker → shared offline STFT → bounded display result → terminate Worker.

The browser may resample during decoding. Use the returned `AudioBuffer.sampleRate`, never infer it from file names, headers or a hard-coded device rate. Stereo channel 1 is analyzed to avoid cancellation in opposite-phase channels. Original stereo playback remains available.

Limits: 20 MiB compressed input, 60 seconds decoded duration, mono/stereo, decoded sample rate at most 96 kHz. Native `decodeAudioData` allocates the decoded buffer before duration/channel checks; compressed size alone cannot guarantee low memory for pathological files. There is no streaming decoder in V1. Abort closes the AudioContext immediately and discards late decoding results; the underlying native decode operation itself has no abort API.

Offline analysis uses 50% overlap. The final full-length window ends exactly at the last sample, so its overlap may exceed 50%; short clips use one padded window. All frames contribute equally to the average bin power and squared tonal amplitude. This is a window-averaged spectrum, not a sample-exact integral over the file. Whole-file AC RMS is calculated separately over every sample.

All frames are analyzed. Up to 400 display columns group adjacent frames by mean squared tonal amplitude, then convert to dB. Each column retains its mean frame-center timestamp. The Canvas renderer takes the maximum bin within each logarithmic frequency pixel band so narrow peaks survive display reduction. Brief events can be attenuated by temporal averaging; there is no event detector or time-region selection in V1. Waveform display uses a 1000-bucket min/max envelope preserving transient extremes.

## Recording and resource ownership

`Microphone` owns its stream, source node, PCM tap and AudioContext. Its generation token releases late permission grants after cancellation. The controller has a separate generation token for the whole workflow, plus an AbortController for the current decoder. Do not remove either token: stale permission and decoder promises can otherwise overwrite a new measurement.

`AudioRecorder` negotiates browser-supported MIME types (Opus WebM, MP4, Ogg, or browser default), stores timed chunks and stops after 55 seconds or approximately 16 MiB. These are guardrails, not exact sample-clock recording limits. On completion, the same decode/worker path analyzes the clip. Recording is separate from live analysis and is optional. The recorder is discarded when superseded or leaving the page so a late completion cannot replace a newer source.

The controller cancels animation frames, stops tracks, disconnects nodes, closes contexts, terminates workers and revokes object URLs on stop/replacement/clear/navigation as appropriate. Stop preserves result arrays for inspection; Clear clip removes them. A/B snapshots deliberately remain in tab memory until cleared or the document is discarded. No localStorage or IndexedDB is used.

## Comparison and domain extension

`Snapshot` holds the label, source kind, capture time and a deep-copied Spectrum. `compareSnapshots` returns RMS dB difference, strongest-peak frequency difference and band percentage-point differences. The UI provides two overlaid spectra and numeric tables; different sample rates/FFT sizes/source kinds trigger a caution. Each overlay maps its own bins into physical Hz. No bin-array subtraction across different grids, alignment, resampling, SPL calibration or automatic condition matching occurs.

New analyzers can import `DspEngine`, `analyzeAudio`, `Spectrum` and `Snapshot`, use the browser adapters, and add domain modules outside the DSP math. A domain module should consume measurements plus explicit context (RPM, pole count, bearing geometry, microphone setup, machine operating condition), and return explainable observations. Harmonic inference, order tracking, envelope spectra, stationarity checks, calibration and fault rules have **not** been implemented. Preserve that distinction in product copy.

## Validation

Use Node 24 (validated on 24.12.0) and `npm ci`.

```sh
npm test
npm run test:dsp
npm run lint
npm run check
npm run build
npx playwright install chromium webkit
npm run test:browser
```

Browser tests serve the production build on port 4379. `--ignore-lock` keeps Astro 7 preview in the foreground under agent environments, so Playwright can manage its lifecycle. Do not point these tests at a production site.

Synthetic microphone tests replace only getUserMedia with an oscillator-backed MediaStream; the actual browser Web Audio graph, PCM tap, engine, MediaRecorder, decoder and worker run normally. This does not validate physical microphones, browser permission prompts, phone hardware, iOS audio interruptions or codec availability on real Safari. Windows Playwright WebKit lacks AudioContext: audio scenarios explicitly skip on that build, while layout/navigation/fallback tests run. The same tests will run on a Web Audio-capable WebKit build.

## API references

- [Web Audio specification](https://www.w3.org/TR/webaudio/) describes the AnalyserNode transform/window and graph behavior.
- [decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) documents decoding and resampling to the context rate.
- [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) documents secure-context access and permission errors.
