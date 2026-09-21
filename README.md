# WorkshopGirl.com

The initial foundation release for WorkshopGirl.com: a fast, responsive Coming Soon homepage for a fictional maker who fixes, builds, experiments, and learns in the workshop.

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
