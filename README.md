# WorkshopGirl.com

WorkshopGirl.com: a static Astro site with workshop tutorials, projects, diary entries and a growing digital workbench.

## Stack

- Astro + TypeScript
- Static output for Cloudflare Pages
- Minimal JavaScript; optional GA4 loaded only in production when configured

## Local development

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` and set `PUBLIC_GA_MEASUREMENT_ID` to a value such as `G-XXXXXXXXXX` when a GA4 property is available.

## Production build

```bash
npm ci
npm run lint
npm run check
npm run build
```

## Cloudflare Pages

Build command: `npm run build`  
Output directory: `dist`  
Production branch: `main`

## Project structure

- `src/pages/` — public routes and generated sitemap endpoints
- `public/images/workshop-girl/` — canonical Workshop Girl imagery
- `public/` — static SEO and favicon assets

Future Diary, Tutorials, Projects, Gallery, About, and Toolbox content should be added as structured Astro content collections. Tutorial schemas should support category, difficulty, safety notes, tools, materials, and steps.

## Analytics

GA4 is prepared through `PUBLIC_GA_MEASUREMENT_ID`; no credentials are committed. If empty, analytics does not load and the site remains fully functional.

## Sound Analyzer / DSP Engine V1

Open `/tools/sound-analyzer/` for local microphone/file analysis, waveform, spectrum, spectrogram, recording/playback and A/B snapshots. The tool page includes no analytics and sends no audio to a server. All level measurements are digital dBFS, not calibrated dB SPL.

- Pure DSP core: `src/lib/dsp/`
- Browser audio adapters and offline worker: `src/lib/audio/`
- UI/controller/charts: `src/components/sound-analyzer/`
- Mathematical conventions, ownership, limits and extension guidance: [DSP architecture](docs/dsp-architecture.md)
- Implementation/verification handoff: [V1 report](docs/dsp-v1-implementation-report.md)

Use Node 24 (tested with 24.12.0). No DSP or charting runtime dependency was added. Playwright and Node types are development-only dependencies.

```bash
npm test
npm run test:dsp
npm run lint
npm run check
npm run build
npx playwright install chromium webkit
npm run test:browser
```

Browser tests use the production build and manage a preview server on localhost port 4379. Chromium tests cover audio with deterministic synthetic MediaStreams. Windows Playwright WebKit lacks Web Audio, so audio scenarios are explicitly skipped there; its layout, navigation and unsupported-API paths are still tested. Physical iOS/Android microphone and recording checks remain necessary before claiming device certification.
