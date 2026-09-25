# Physical-device validation protocol — not yet executed

Use a real Android phone with Chrome, a real iPhone with Safari, and desktop Chromium. Add other browsers/devices where relevant. Browser automation/emulation does not complete this protocol. Record actual outcomes in Engine Analyzer → Measurement notes, repeatability & export → Physical-device validation log.

## Preparation

- Use HTTPS or localhost, a safe stationary position and a known repeatable sound source. Keep the phone/cables/hands clear of moving and hot machinery.
- Record a non-identifying run label, browser/version where useful, microphone setup, position/distance, load/RPM, wind and room conditions. Avoid names, device serials and other personal information.
- Run `/tools/dsp-validation/` and export known-signal results. A software PASS does not validate the microphone path.

## Execute and record

| Check | Action | Evidence to retain |
| --- | --- | --- |
| Consent and startup | Start live; grant/deny/cancel permission in separate runs | Actual behavior, visible microphone indicator, recovery |
| Capture | Observe live acquisition for at least ten seconds | Mode, actual rate/FFT, dropped frames/discontinuities, processing booleans or unreported |
| Stop and interruptions | Stop; hide/restore tab; lock/unlock device where appropriate; navigate away/back | Indicator releases, restart behavior, interruption messages. Background capture is intentionally stopped. |
| Repeatability | Three or more nonoverlapping snapshots from a fixed position at similar RPM/load | RMS differences, shape overlap, band/peak/harmonic changes, quality/context cautions |
| Position sensitivity | Deliberately change distance/position in a separately labeled run | Expected differences; never mix with the same-condition baseline |
| Processing effects | Record reported AGC/noise/echo settings; compare an external reference if available | Unknown settings remain unknown; stable reported settings do not certify absent hardware processing |
| Sustained use | Ten-minute foreground run; inspect at 0/2/5/10 minutes | Actual tested duration, counters, responsiveness, heat, battery observations. Export each interval before clearing/restarting if history is needed. |
| Latency | Only if an external timing reference is available | Describe microphone-to-display measurement method, uncertainty and repeat count. Output base latency/software worker time is not this measurement. |
| Recording optionality | Analyze and capture with no recording; separately exercise supported recording | Live success independent of recording, codec/playback behavior |
| Export | Export measurement JSON and inspect | Version, labels/notes, contexts, quality, spectra and pair results; no raw audio/device identifiers |

Leave unfinished items Not tested. Use Issue observed for failures and describe reproduction steps. A current snapshot contains one live FFT window plus recent/session quality evidence; it is not a ten-minute waveform recording. Download interval snapshots/logs if a chronological test record is required. No import or persistent browser storage is implemented.

## Acceptance review

Compare repeats using the explicit V3 thresholds as provisional engineering screens. Do not tune thresholds solely to make a device pass. Investigate clipping, gaps, processing changes and different RPM/position before interpreting A/B differences. File averages cannot establish within-file stability. No outcome certifies engine health, calibrated SPL or professional vibration accuracy.

Retain local measurement exports and reference-validation exports together with manually recorded physical observations. Device qualification and threshold validation remain the recommended next phase.
