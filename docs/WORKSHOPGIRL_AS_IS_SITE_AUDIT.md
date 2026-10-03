# WorkshopGirl.com — AS-IS sitemap, menu and content inventory

Audit date: **3 October 2026 (Asia/Jakarta)**. Repository: `C:\WorkShopGirl`, branch `main`, commit `3bc271260bc2f191db403ea3f57fa2acbe256b7f` (`Promote WorkshopGirl tools on homepage`). Git remotes `github` and `origin` both identify [andiwijaya/workshopgirl.com](https://github.com/andiwijaya/workshopgirl.com).

This report describes the implementation at that commit. Source code is the authority; public HTTP responses and a browser inspection corroborate routing and navigation. It is an inventory, not a redesign, roadmap, deployment, or statement that every feature has passed operational testing.

**Snapshot: 41 HTML pages; 13 tools (4 diagnostics + 9 workshop operations); 18 tutorial-section articles; 3 story/project/lifestyle articles; 5 section indexes; 7 main-menu items.** There are no dedicated product-review, affiliate, glossary, or legal pages. Two tutorial pages compare tool types; four provide reference-style explanations. These overlap the tutorial count rather than adding pages.

## 1. Scope, method and current implementation

### Evidence and verification

- Enumerated all 41 `.astro` page files in `src/pages`, the two XML route handlers, navigation components, data arrays, article bodies, tool controllers, domain libraries, styles, and relevant public resources.
- Compared the source route inventory with the hand-authored sitemap: **41 source HTML routes, 41 source sitemap entries, 41 live sitemap entries**, with no source HTML page omitted.
- Requested every sitemap page URL from `https://workshopgirl.com`: all 41 finished with HTTP 200 and page-specific titles/canonicals. Two requests first redirect; see section 2.
- Examined rendered internal anchors and fragment targets across those pages. No internal page link pointed to a route missing from the source inventory; no referenced fragment was missing. The additional linked `/tutorials/types-of-clamps-explained/` slash variant also returned HTTP 200. Download anchors without an `href` before an audio result are controls, not dead page links.
- Traversed the rendered link graph from the homepage: all 41 HTML pages were reachable. This establishes reachability, not equal prominence.
- Inspected the live homepage at **1280 × 720** and **390 × 844**, opened the mobile hamburger, and verified the seven links. The temporary viewport override was reset after inspection.
- Read tool implementation to distinguish implemented calculations/storage from page copy or documentation. No microphone permission was requested, customer/job data entered, invoice issued, payment recorded, purchase order created, or production configuration changed.

The HTTP evidence was collected around 06:48 Jakarta time on 3 October (23:48 UTC on 2 October). No production build or functional test suite was run for this documentation-only audit. Mobile ratings below describe implemented responsive UI, not certification on physical Android/iOS devices. Third-party article reference links and every asset were not exhaustively tested.

### Framework, content and routing

| Area | Actual implementation |
|---|---|
| Framework | Astro with TypeScript; `astro.config.mjs` sets `output: 'static'` and the production site URL. |
| Routes | Explicit `.astro` files under `src/pages`; no bracketed dynamic routes, API application routes, or application server in this source. |
| Content | Full article markup in individual `.astro` files. Typed summary arrays in `src/data/tutorials.ts`, `diary.ts`, `projects.ts`, `sport.ts`, and a separate homepage feed in `home-feed.ts`. |
| CMS / content collections | No implemented CMS, MD/MDX article collection, or content-collection configuration found. README discussion of possible future collections is not current functionality. |
| Navigation | Shared `SiteHeader.astro` and `SiteFooter.astro`; article contextual links are authored in individual pages. Workshop tools share `WorkshopLayout.astro`. |
| Browser tools | Client TypeScript, Web Audio, workers/worklet, Canvas 2D, browser file APIs, and localStorage. No tool-processing backend found. |
| Hosting evidence | README describes Cloudflare Pages producing `dist`; public responses and `_redirects` confirm current routing behavior. No hosting change was made. |
| Discovery | Hand-authored XML endpoints plus `robots.txt`. No automatic route-to-sitemap generation. |
| Metadata | Page titles, descriptions, canonical links and Open Graph metadata. Article JSON-LD appears on 11 tutorial pages; the climbing article also has Article and BreadcrumbList schemas. This is not a uniform shared article layout/schema system. |
| Images | Local PNG/WebP illustrations of the recurring Workshop Girl character, article diagrams and hero images in `public/images`; favicon SVG. |
| Analytics / external requests | Homepage conditionally includes GA4 when `PUBLIC_GA_MEASUREMENT_ID` is configured. Some editorial pages load Google Fonts. Tool source does not upload audio or workshop records. Local processing does not mean that loading site assets requires no network. |

## 2. Hierarchical sitemap and route resources

URLs below are relative to `https://workshopgirl.com`. Slashless tutorial routes reproduce the authored sitemap/canonical URLs. The two named Tools groups are **sections of `/tools/`**, not additional pages. The `workshop` path segment has no standalone index page.

```text
WorkshopGirl.com
├── Home /
├── Tutorials /tutorials/
│   ├── How to Use a Jigsaw /tutorials/how-to-use-a-jigsaw/
│   ├── How to Use a Circular Saw /tutorials/how-to-use-a-circular-saw
│   ├── Angle Grinder Basics /tutorials/angle-grinder-basics
│   ├── How to Use a Multimeter /tutorials/how-to-use-a-multimeter
│   ├── How to Solder Wires /tutorials/how-to-solder-wires
│   ├── Types of Clamps Explained /tutorials/types-of-clamps-explained
│   ├── Jigsaw vs Circular Saw /tutorials/jigsaw-vs-circular-saw
│   ├── Socket & Ratchet Sizes Explained /tutorials/socket-ratchet-sizes-explained
│   ├── Drill Bit Types Explained /tutorials/drill-bit-types-explained
│   ├── Cordless Drill vs Impact Driver /tutorials/cordless-drill-vs-impact-driver
│   ├── How to Use a Cordless Drill /tutorials/how-to-use-a-cordless-drill/
│   ├── How to Use a Torque Wrench /tutorials/how-to-use-a-torque-wrench/
│   ├── How to Change Spark Plugs /tutorials/how-to-change-spark-plugs/
│   ├── How to Replace a Car Battery /tutorials/how-to-replace-a-car-battery/
│   ├── Inspect, Clean or Replace an Engine Air Filter /tutorials/engine-air-filter/
│   ├── How to Replace Brake Pads /tutorials/how-to-replace-brake-pads/
│   ├── How to Change a Flat Tire /tutorials/how-to-change-a-flat-tire/
│   └── How to Change Engine Oil /tutorials/how-to-change-engine-oil/
├── Tools /tools/
│   ├── Diagnostics [on-page group: /tools/#diagnostics]
│   │   ├── Sound Analyzer /tools/sound-analyzer/
│   │   ├── Engine Sound Analyzer /tools/engine-sound-analyzer/
│   │   ├── Speaker Sound Analyzer /tools/speaker-sound-analyzer/
│   │   └── DSP Validation Workbench /tools/dsp-validation/
│   └── Workshop Operations [on-page group: /tools/#workshop-operations]
│       ├── Vehicle Intake /tools/workshop/vehicle-intake/
│       ├── Inspection & Estimate /tools/workshop/inspection-estimate/
│       ├── Work Order /tools/workshop/work-order/
│       ├── QC & Handover /tools/workshop/qc-handover/
│       ├── Queue / Job Status /tools/workshop/queue/
│       ├── Parts Inventory /tools/workshop/parts-inventory/
│       ├── Service History & Warranty /tools/workshop/service-history/
│       ├── Billing /tools/workshop/billing/
│       └── Procurement /tools/workshop/procurement/
├── Diary /diary/
│   └── The First Bolt I Couldn't Remove /diary/the-first-bolt-i-couldnt-remove/
├── Projects /projects/
│   └── Bringing an Old Motorcycle Back to Life
│       /projects/bringing-an-old-motorcycle-back-to-life/
├── Sport /sport/
│   └── Workshop Girl Tries Indoor Rock Climbing /sport/indoor-rock-climbing/
└── About /about/
```

### Non-HTML resources

| Resource | Role / observed status | Count treatment |
|---|---|---|
| `/sitemap-index.xml` | HTTP 200; names one child sitemap, `/sitemap-0.xml`. | XML endpoint, excluded from HTML page count. |
| `/sitemap-0.xml` | HTTP 200; enumerates all 41 HTML pages. No `lastmod`, `priority`, or `changefreq` fields. | XML endpoint, excluded. |
| `/sitemap.xml` | HTTP 301 to `/sitemap-index.xml`. | Alias, not a unique page. |
| `/robots.txt` | HTTP 200; `User-agent: *`, `Allow: /`, sitemap-index URL. | Text resource, excluded. |
| `/schemas/measurement-v1.schema.json` | Public schema referenced by engine measurement JSON export. | Data resource, excluded. |
| `/favicon.svg`, `/images/*`, generated JS/CSS | Branding/content/runtime assets. | Assets, excluded. |
| `docs/*.md`, tests and benchmark scripts | Repository documentation and engineering utilities; no page routes import these as published articles. | Not website pages. |

There are **43 source route files** when the 41 HTML pages and two XML handlers are counted together. Redirects, asset URLs, anchors and local query states do not increase that number. No explicit custom 404, legal, account, search-result, tag archive, or glossary page was found in `src/pages`.

### Redirects, rewrites and URL conventions

`public/_redirects` contains:

```text
https://www.workshopgirl.com/* → https://workshopgirl.com/:splat    301
/tutorials/cordless-drill-vs-impact-driver → same path with /      200
/tutorials/drill-bit-types-explained → same path with /            200
/tutorials/socket-ratchet-sizes-explained → same path with /       200
/tutorials/jigsaw-vs-circular-saw → same path with /                200
/tutorials/types-of-clamps-explained → same path with /            200
/tutorials/how-to-use-a-multimeter → same path with /              200
/tutorials/angle-grinder-basics → same path with /                 200
/sitemap.xml → /sitemap-index.xml                                 301
```

The seven `200` rules are internal rewrites, not client redirects. These tutorial canonical and sitemap URLs are slashless. Other routes conventionally use a trailing slash.

Live requests to **`/tutorials/how-to-use-a-circular-saw`** and **`/tutorials/how-to-solder-wires`** returned **308** to their trailing-slash versions; each final page still declares the slashless canonical from source. Neither has an explicit `200` rewrite in `_redirects`. Thus the live final URL and authored canonical differ on these two pages. This is an observed inconsistency, not a dead page or an extra article. The `www` rule is documented from source; its live redirect was not separately exercised.

Workshop routes can carry `?job=<local-id>`; Queue has client-side filter state, and Service History uses local vehicle selection. These refer to browser-local data, not dynamic/server-generated pages or publicly retrievable customer records.

## 3. Actual menu and contextual navigation

```text
MAIN NAVIGATION — desktop and expanded mobile, identical order
1. Home       /
2. Tutorials  /tutorials/
3. Tools      /tools/
4. Diary      /diary/
5. Projects   /projects/
6. Sport      /sport/
7. About      /about/

No main-menu submenus or dropdown categories.

FOOTER NAVIGATION
Home → Tutorials → Tools → Diary → Projects → About
Sport is absent.
```

At widths up to **760px**, the header shows a three-line icon and “Menu” button. One shared navigation element is collapsed until toggled, rather than a separately maintained mobile tree. The script updates `aria-expanded`, closes on link activation, and closes on Escape. Above 760px the links appear inline. The brand links to Home. Live browser inspection matched this implementation; no code/live menu discrepancy was found.

| Context | Actual links / behavior |
|---|---|
| Homepage workbench cards | “Explore Diagnostics” → `/tools/#diagnostics`; “Explore Workshop Operations” → `/tools/#workshop-operations`. |
| Tools index | Four diagnostic cards followed by nine operation cards. “Workshop tutorials” links to the generic Tutorials index. The two groups are not header submenus. |
| Diagnostic pages | Back/eyebrow link to Tools, explanatory on-page sections, and selected sibling analyzer links. General Sound links to Engine; Engine links to General Sound and DSP Validation; Speaker links to General Sound; DSP Validation links to Engine and General Sound. |
| Workshop pages | Shared nine-link “Workshop job pages” navigation, same order as the workshop group in the sitemap; current page uses `aria-current='step'`. The first four represent the core job workflow; the rest are auxiliary views. |
| Workflow continuation | Saving intake/inspection/work order reveals a next-step link carrying `?job=...`. Saved-job pickers, Queue cards and history links also select local records. |
| Workshop page tabs | The shared nine tabs contain plain route URLs. No controller rewrites `data-step-link` URLs to preserve the selected job. Switching via these tabs can require choosing the job again, unlike the explicit continuation links. |
| Tutorials | One flat index of 18 cards. Article back links to Tutorials, plus authored related/inline links. Category strings are display text, not clickable filters or nested category archives. |
| Diary / Projects / Sport | Each index has one entry. Individual stories return to their section or use the shared menu. Diary and motorcycle project link to maintenance tutorials. Climbing has no related detail-page links. |
| About | Body CTAs to Tutorials, Diary and Projects; a specific diary link. Its “Tools & Machines” body card has “Follow the work” text instead of a link to the implemented digital tools. |
| In-page article navigation | Some tutorials include section/TOC anchors; these do not create extra routes. |
| `ToolCategories.astro` | Despite its name, this is an engine-air-filter guide equipment list, not site category navigation. It explicitly describes general equipment categories and future product links. |

## 4. Complete HTML page inventory

“Navigation” distinguishes a **direct header/footer link**, an **index/card link**, and a **contextual link**. A page need not be in the header to be accessible. Every row is in the source and live sitemap, and every listed page returned successfully during the audit. Titles are readable page labels; some browser SEO titles differ slightly.

| Page | URL | Type | Parent/Menu | Linked From Navigation? | Notes |
|---|---|---|---|---|---|
| Home | `/` | Homepage | Home | Header + footer + brand | Character hero; tool-family promotions; featured articles. |
| Tutorials | `/tutorials/` | Category / article index | Tutorials | Header + footer | Flat list of all 18 tutorial-section articles. |
| How to Use a Jigsaw: A Beginner’s Guide | `/tutorials/how-to-use-a-jigsaw/` | Tutorial | Tutorials | Index + homepage + related links | Curved cuts, blades, setup and safety. |
| How to Use a Circular Saw: A Beginner’s Guide | `/tutorials/how-to-use-a-circular-saw` | Tutorial | Tutorials | Index + homepage + related links | Straight cuts; live 308 to slash version. |
| Angle Grinder Basics: Cutting Disc vs Grinding Wheel vs Flap Disc | `/tutorials/angle-grinder-basics` | Tutorial / reference | Tutorials | Index + related links | Accessory types and safety; not a model review. |
| How to Use a Multimeter: Voltage, Resistance & Continuity for Beginners | `/tutorials/how-to-use-a-multimeter` | Tutorial | Tutorials | Index + related links | Basic low-voltage measurements; battery/fuse examples. |
| How to Solder Wires: A Beginner’s Guide | `/tutorials/how-to-solder-wires` | Tutorial | Tutorials | Index + multimeter link | Low-voltage wiring; live 308 to slash version. |
| Types of Clamps Explained: Which Clamp Should You Use? | `/tutorials/types-of-clamps-explained` | Tutorial / reference | Tutorials | Index + saw/grinder related links | Clamp types, workholding and selection. |
| Jigsaw vs Circular Saw: Which One Should a Beginner Use? | `/tutorials/jigsaw-vs-circular-saw` | Article / tool-type comparison | Tutorials | Index + saw-related links | Generic selection guidance; no reviewed product models. |
| Socket & Ratchet Sizes Explained: 1/4, 3/8 & 1/2-Inch Drive | `/tutorials/socket-ratchet-sizes-explained` | Tutorial / reference | Tutorials | Index + maintenance related links | Drive sizes, sockets and compatibility. |
| Drill Bit Types Explained: Which Bit Should You Use? | `/tutorials/drill-bit-types-explained` | Tutorial / reference | Tutorials | Index + drill/saw/clamp links | Bit/material/hole selection. |
| Cordless Drill vs Impact Driver: What’s the Difference? | `/tutorials/cordless-drill-vs-impact-driver` | Article / tool-type comparison | Tutorials | Index + drill/related links | Mechanisms and task fit; not affiliate review content. |
| How to Use a Cordless Drill: A Beginner’s Guide | `/tutorials/how-to-use-a-cordless-drill/` | Tutorial | Tutorials | Index + related links | Drill controls, pilot holes, clutch and battery care. |
| How to Use a Torque Wrench: A Beginner’s Guide | `/tutorials/how-to-use-a-torque-wrench/` | Tutorial | Tutorials | Index + automotive/fastener links | Click-type use and torque principles. |
| How to Change Spark Plugs: A Beginner’s Step-by-Step Guide | `/tutorials/how-to-change-spark-plugs/` | Tutorial | Tutorials | Index + related links | Vehicle-specific specifications and careful installation. |
| How to Replace a Car Battery: A Beginner’s Step-by-Step Guide | `/tutorials/how-to-replace-a-car-battery/` | Tutorial | Tutorials | Index + related links | Conventional 12V battery replacement. |
| How to Inspect, Clean or Replace Your Engine Air Filter | `/tutorials/engine-air-filter/` | Tutorial | Tutorials | Index + project/maintenance links | Distinguishes approved reusable filters; equipment list. |
| How to Replace Brake Pads — A Beginner’s Guide | `/tutorials/how-to-replace-brake-pads/` | Tutorial | Tutorials | Index + diary/project/related links | Conventional front disc brake pads and verification. |
| How to Change a Flat Tire — A Beginner’s Guide | `/tutorials/how-to-change-a-flat-tire/` | Tutorial | Tutorials | Index + diary/project/related links | Roadside preparation, spare and finishing checks. |
| How to Change Engine Oil — A Beginner’s Guide | `/tutorials/how-to-change-engine-oil/` | Tutorial | Tutorials | Index + diary/project/related links | Preparation, draining, filter and level checks. |
| Digital Workbench | `/tools/` | Tool Index | Tools | Header + footer + homepage CTAs | Lists all 13 tools in two on-page groups. |
| Sound Analyzer | `/tools/sound-analyzer/` | Tool | Tools / Diagnostics | Tools card + sibling links | General live/file sound measurement and A/B. |
| Engine Sound Analyzer | `/tools/engine-sound-analyzer/` | Tool | Tools / Diagnostics | Tools card + sibling links | Continuous capture, references, comparisons and export. |
| Speaker Sound Analyzer | `/tools/speaker-sound-analyzer/` | Tool | Tools / Diagnostics | Tools card | Live listening balance; no audio file input or recording. |
| DSP Validation Workbench | `/tools/dsp-validation/` | Tool / engineering validation | Tools / Diagnostics | Tools card + Engine panel | Deterministic generated-signal checks; not an orphan. |
| Vehicle Intake | `/tools/workshop/vehicle-intake/` | Tool | Tools / Workshop Operations | Tools card + workshop tabs + workflow links | Start/resume browser-local jobs, customers and vehicles. |
| Inspection & Estimate | `/tools/workshop/inspection-estimate/` | Tool | Tools / Workshop Operations | Tools card + tabs + next-step/Queue links | Vehicle checklist, findings, estimate and approval. |
| Work Order | `/tools/workshop/work-order/` | Tool | Tools / Workshop Operations | Tools card + tabs + next-step/Queue links | Actual tasks, technician, materials and completion. |
| QC & Handover | `/tools/workshop/qc-handover/` | Tool | Tools / Workshop Operations | Tools card + tabs + next-step/Queue links | QC gate, road test, deferrals and handover. |
| Queue / Job Status | `/tools/workshop/queue/` | Tool / local dashboard | Tools / Workshop Operations | Tools card + workshop tabs | Derived job status, filters and next-step links. |
| Parts Inventory | `/tools/workshop/parts-inventory/` | Tool | Tools / Workshop Operations | Tools card + tabs + job context | Parts catalog, stock ledger and job issues/returns. |
| Service History & Warranty | `/tools/workshop/service-history/` | Tool | Tools / Workshop Operations | Tools card + tabs + completed-job links | Completed history, explicit warranty and next service. |
| Billing | `/tools/workshop/billing/` | Tool | Tools / Workshop Operations | Tools card + tabs + operational context | Local invoice/payment/receipt records; IDR. |
| Procurement | `/tools/workshop/procurement/` | Tool | Tools / Workshop Operations | Tools card + tabs + parts/job context | Purchase needs, suppliers, POs and receiving. |
| Diary | `/diary/` | Category / story index | Diary | Header + footer | One entry. |
| The First Bolt I Couldn't Remove | `/diary/the-first-bolt-i-couldnt-remove/` | Story / Lifestyle | Diary | Index + homepage + About | Workshop learning story with three maintenance links. |
| Projects | `/projects/` | Category / project index | Projects | Header + footer | One project. |
| Bringing an Old Motorcycle Back to Life | `/projects/bringing-an-old-motorcycle-back-to-life/` | Story / project article | Projects | Index + homepage + drill comparison | Completed motorcycle repair narrative; four maintenance links. |
| Sport | `/sport/` | Category / lifestyle index | Sport | Header only | One climbing activity; missing from footer. |
| Workshop Girl Tries Indoor Rock Climbing | `/sport/indoor-rock-climbing/` | Story / Lifestyle | Sport | Index + homepage | Article and breadcrumb schema; no detail-level onward recommendations. |
| About WorkshopGirl | `/about/` | Static | About | Header + footer | Fictional/virtual host, values and editorial purpose. |

## 5. Tool inventory — implemented behavior

“Local” means the tool’s audio, calculations or workshop record processing occurs in the browser. **Responsive** means corresponding mobile styles exist; it does not claim that microphone capture, long sessions, printing or all complex forms were exercised on physical devices during this audit.

| Tool | URL | Purpose | Main Technology | Input | Output | Browser/Local Processing | Mobile Friendly |
|---|---|---|---|---|---|---|---|
| Sound Analyzer | `/tools/sound-analyzer/` | Inspect frequencies and compare sounds | Web Audio PCM tap; custom TS FFT/DSP; offline module Worker; Canvas 2D; optional MediaRecorder | Live microphone, browser-decodable local audio, FFT size; A/B selection | Waveform, spectrum, spectrogram, dominant/separated peaks, RMS dBFS, band shares, A/B overlay/table; optional playable/downloadable clip | Local; snapshots in tab memory; no audio upload. General live display samples frames rather than using the engine’s continuous extension | Responsive chart/control layout; mic/codecs depend on browser |
| Engine Sound Analyzer | `/tools/engine-sound-analyzer/` | Observe engine sound with supplied operating references | Shared analyzer/DSP; AudioWorklet + live Worker, labeled sampled fallback; Canvas; measurement/domain modules | Mic/file; optional manual RPM, cylinders, cycle, harmonic Hz; labels/notes/repeats/manual validation log | Base charts, RPM/firing markers, harmonics, persistent peaks, capture quality, A/B and repeatability, measurement JSON; optional clip | Local; live A/B without recording; in-memory results and local downloads | Responsive plus compact live toolbar; physical compatibility unverified here |
| Speaker Sound Analyzer | `/tools/speaker-sound-analyzer/` | Describe captured music/sound balance | Shared mic and LiveCapture; TS log-frequency power-density scoring; Canvas 2D | Live microphone only; nearby externally played sound | Live spectrum, Bass/Mid/Treble meters; session profile after ≥10 seconds valid active sound | Local, no recording/upload/file-import; session memory cleared on restart | Responsive visual/meter layout; mic/browser-dependent |
| DSP Validation Workbench | `/tools/dsp-validation/` | Check shared DSP against known digital inputs | Deterministic TS PCM generator; module Worker and shared offline DSP; local JSON download | Seven reference cases; generated sample rates 44.1/48/96 kHz | Target-versus-measured checks, elapsed processing time and validation JSON | Local; no mic, playback or physical-device validation | Responsive shared tool styles; requires Worker support |
| Vehicle Intake | `/tools/workshop/vehicle-intake/` | Start a car/motorcycle service visit | TS forms, shared job model/store, localStorage, browser print | Customer/contact/address; new or explicitly selected vehicle; plate/type/odometer; complaint, received items and arrival | Stable customer/vehicle/job records; intake document; continuation to inspection | Local persistent records in shared store; no automatic plate/customer merge | Responsive stacked forms and touch-sized controls |
| Inspection & Estimate | `/tools/workshop/inspection-estimate/` | Document checks and price proposed work | Vehicle-specific checklist/rules; TS estimate calculation; localStorage; print | Saved job, inspection states, findings, priorities, parts, fixed/hourly labor, extras/discount/tax and approval identity | Itemized estimate, approval/revision metadata and Work Order continuation | Local; scope/price changes invalidate previous approval | Responsive checklist and editable rows |
| Work Order | `/tools/workshop/work-order/` | Track approved and actually performed repairs | TS job transitions, task/material rows; localStorage; print | Saved inspected job; tasks/status/technician/times; inventory or free-text materials; changes and sign-off | Saved work order, duration, repair result and QC continuation | Local; finished/cancelled job restrictions and explicit inspection-only completion | Responsive form/row layout |
| QC & Handover | `/tools/workshop/qc-handover/` | Verify repair and close handover | TS QC/completion rules; localStorage; print | Job/work order, checks, road-test/odometer state, unresolved issues and deferrals, returned items, handover identity/date/time | QC sheet, readiness state and gated completed job; Service History link | Local; completion needs valid work and QC/handover fields | Responsive checks/forms |
| Queue / Job Status | `/tools/workshop/queue/` | Resume and monitor saved jobs | TS derived state, DOM filtering/sorting, timestamps; localStorage | Existing local jobs; search/status filters and sort; waiting-parts actions | Counts, job cards, elapsed time, status history, shortages/billing context and next-step links | Local; same job records, not a separate queue database | Responsive cards and filter layout |
| Parts Inventory | `/tools/workshop/parts-inventory/` | Track actual parts stock and job consumption | TS catalog + movement ledger; localStorage | Catalog/SKU/unit/location/minimum/barcode text; stock-in, issue, return, adjustment and job reference | Derived balances/low-stock states, movement history, job shortages and procurement links | Local; guards against insufficient stock/excess returns; barcode is a text field, not camera scanning | Responsive catalog/forms; no scanner API |
| Service History & Warranty | `/tools/workshop/service-history/` | Review completed visits and recorded coverage/follow-up | TS projections, date/odometer rules; localStorage; vehicle-history print | Selected saved vehicle/completed job; explicit covered work/parts and expiry; claim; next-service details | Timeline of actual completed work/consumption, warranty/claim states, due status and printable history | Local; no automatic warranty creation or outgoing service reminders | Responsive timeline/forms |
| Billing | `/tools/workshop/billing/` | Review charges and keep invoice/payment records | TS operational projections; integer IDR arithmetic using BigInt intermediates; localStorage; print | Eligible job, actual work/net issued parts/materials, confirmed selling prices, manual lines/discount/tax, payment method/amount/reversal reason | Draft/Issued/Void invoices with snapshots; balances/partial payment states; numbered printable invoices/receipts | Local bookkeeping; payment-method labels do not connect a gateway or transfer funds | Responsive list/detail/forms and 44px controls |
| Procurement | `/tools/workshop/procurement/` | Record confirmed demand, supplier orders and deliveries | TS need/PO/receipt allocations, IDR arithmetic and stock integration; localStorage; PO print | Shortage/replenishment/manual needs; supplier; quantities/costs; accepted/rejected partial receipt; variance confirmation | Purchase-need progress, numbered POs and goods receipts; accepted stock-in ledger movements and provenance | Local records; issuing a PO sends nothing to a supplier; receipt does not automatically issue/reserve stock to a job | Responsive forms/actions and wrapping cards |

### Audio and measurement boundaries

- Sound/Engine file input accepts formats supported by the browser decoder, bounded to **20 MiB, 60 seconds, mono/stereo, decoded rate ≤96 kHz**. Analysis uses channel 1; playback retains the original clip channels. File-extension acceptance alone does not guarantee codec support.
- Optional Sound/Engine recording uses MediaRecorder, with a UI limit of **55 seconds** and browser-selected recording format. Speaker has no recording, playback, upload or file-opening workflow.
- UI FFT sizes are 2048/4096/8192. The custom radix-2 transform removes DC, applies a periodic Hann window, normalizes tonal amplitude and one-sided power, computes AC RMS/dBFS and separates peaks. General/Engine band boundaries are 20–250–2000–20000 Hz; Speaker deliberately uses 20–250–4000–20000 Hz and a different normalization.
- Engine and Speaker live capture prefer AudioWorklet PCM frames with a live DSP Worker. Startup/error/stall handling can switch to an explicitly labeled sampled path. Audio-clock metadata, dropped-frame/discontinuity counters and cleanup are implemented.
- Engine’s supplied RPM calculates reference markers and conventional firing frequencies; it does **not** measure RPM or implement OBD, Bluetooth/serial transport, synchronized order tracking, or a fault diagnosis. `rpm-stream.ts` is an interface/validation contract only.
- Engine can collect 2–6 repeat snapshots, assess quality/context and spectral-shape overlap, and export `workshopgirl.measurement/1` JSON. The export includes numerical spectra/context and manually supplied validation notes, not raw audio or hidden device identifiers. No measurement-import UI was found.
- Speaker’s profile classifies Bass Dominant, Mid Dominant, Treble Dominant or Balanced after sufficient valid capture; silence/clipping/gaps do not build valid duration. The 3 dB dominance rule is a heuristic for captured sound, not a speaker rating or frequency-response calibration.
- DSP Validation offers 100 Hz, 440 Hz, 1000 Hz, multi-tone, harmonic series, amplitude ×2 and noise + tone. Its generated one-second PCM validates software conventions only. The page’s physical-device protocol and engine log are instructions/manual evidence fields, not proof that devices have already been tested.
- All audio levels are digital dBFS, not calibrated acoustic SPL. Analyzer output contains observations and comparison limits rather than actionable fault identification.

### Workshop persistence and output boundaries

All nine operations use the versioned store key **`workshopgirl.workshop.operations.v1`**. The store contains customers, vehicles, jobs, parts/movements, warranties/claims/next-services, invoices/payments, suppliers, purchase needs/orders and goods receipts. Data lives in localStorage for the current origin/browser profile. It is persistent local data, unlike audio snapshots held only in memory.

Load/save shape validation, backwards-compatible defaults and storage-error feedback exist. There is no server database, sign-in/role system, shared multi-user store, cross-device sync, or visible workshop JSON/CSV backup/import/export UI. Printing produces browser print/PDF output, not a downloadable machine-readable store backup. A local job link opened in another browser cannot retrieve the record from the server. Tool-share buttons send the canonical tool URL, excluding job IDs and customer details.

The core four workflow pages have a wired “Print / Save as PDF” action. Service History, Billing and Procurement implement their own record-specific history/invoice/receipt/PO print actions. However, **the shared layout also displays a generic `[data-print]` button on Queue, Parts Inventory, Service History, Billing and Procurement; the page dispatcher returns before attaching its handler on those five pages.** This is a source-confirmed unwired shared control, not a claim that their record-specific printing is absent. No print dialog was opened during this audit.

## 6. Content inventory by strategic pillar

Pillars describe roles, so the same article can contribute to more than one. The physical page inventory remains 41.

| Existing Page/Section | Pillar | Strength/Amount | Notes |
|---|---|---|---|
| Four analyzer/validation pages | Tools | 4 substantial diagnostic/engineering tools | Shared audio/DSP foundation; General, Engine, Speaker and generated-signal validation. |
| Nine Workshop Operations pages | Tools | 9 connected local workflow tools | Intake through completion; Queue, stock, service follow-up, billing and procurement reuse shared records. |
| Digital Workbench | Tools / Index | 1 tool index | Both tool families exposed by cards and homepage group CTAs. |
| Cordless Drill vs Impact Driver; Jigsaw vs Circular Saw | Product Reviews / Affiliate (comparison overlap) | 2 generic comparisons; 0 dedicated product reviews | Tool-type decision guidance inside Tutorials. No product-model testing/rankings, affiliate purchase links, shop or dedicated reviews section found. |
| Other tutorial equipment/selection content | Product Reviews / Affiliate (limited adjacent content) | General tool lists and selection advice | Air-filter “Tools Used” list explicitly disclaims endorsements; promised future verified links are not implemented. Reference/selection content is not counted as a product review. |
| Tutorials index and details | Tutorials / How-to | 18 detail pages + 1 index; largest editorial section | 12 procedure/use guides, 4 reference-style explainers and 2 comparisons under one Tutorials menu. |
| Diary | Story / Lifestyle | 1 entry + 1 index | Stubborn-bolt workshop experience. |
| Projects | Story / Lifestyle | 1 completed project + 1 index | Motorcycle repair narrative rather than a project-management tool. |
| Sport | Story / Lifestyle | 1 activity + 1 index | Indoor climbing; only existing sport detail. |
| About | Story / brand context | 1 static page | Fictional host, practical learning principles and values. |
| Drill Bit Types, Socket & Ratchet Sizes, Types of Clamps, Angle Grinder Basics | Reference / Index / Glossary | 4 reference-style tutorial articles | Structured distinctions/tables/equipment explanations; no separate reference menu, glossary route or specifications database. |
| Section indexes and tool help | Reference / Index / Glossary | 5 index pages; embedded measurement explanations | Indexes aid discovery; embedded analyzer definitions are help content, not separate reference articles. |

### Editorial taxonomy as actually stored

There are **four editorial section indexes** (Tutorials, Diary, Projects, Sport) and **one Tools index**. This report calls those five navigable section/category indexes. Separately, Tools has two anchor groups and Tutorials has **15 distinct category display strings**, shown below. There are no corresponding 15 category URLs or taxonomy filters.

| Exact tutorial category display string | Article count |
|---|---:|
| Tools / Woodworking / Power Tools | 3 |
| Tools / Metalworking | 1 |
| Electrical / Tools | 1 |
| Electrical / Electronics / Tools | 1 |
| Tools / Woodworking / Clamps | 1 |
| Tools / Sockets / Fasteners | 1 |
| Tools / Drilling / Materials | 1 |
| Tools / Drilling / Fastening | 1 |
| Tools / Drilling / Woodworking | 1 |
| Tools / Torque / Maintenance | 1 |
| Cars / Engine / Maintenance | 2 |
| Cars / Electrical / Maintenance | 1 |
| Cars / Brakes / Maintenance | 1 |
| Cars / Basic Maintenance | 1 |
| Engines | 1 |
| **Total** | **18** |

For subject coverage, six guides concern vehicle maintenance (oil, flat tire, brakes, air filter, battery, spark plugs). The other twelve cover tools, woodworking, metalworking and electrical skills. These subject descriptions are analysis of the existing articles, not additional implemented sections. Cars/Engine/Engines, Tools and Maintenance naming varies across labels. A physical-tool article category named “Tools” is distinct from the digital `/tools/` section.

All tutorial summaries are dated 21–23 September 2026. Homepage “latest” tutorials are `tutorials.slice(0, 2)`, not a date-sorted query. Diary and project promotions use the first record of their respective arrays. The separate homepage activity feed contains only climbing; its `OUTDOOR` type option does not establish an Outdoor page or menu.

## 7. Existing user journeys and their endpoints

| Existing journey | Actual steps / transitions | Where it stops or depends on the user |
|---|---|---|
| Learn a practical skill | Home featured tutorial or Tutorials menu → index/article → related tutorial → back to index/share | Reading and real-world action; no built-in progress tracking or direct article-to-tool launch. |
| Choose and use a saw | Jigsaw vs Circular Saw → Circular Saw or Jigsaw guide → Clamps and other related guides | Generic tool selection and procedure; no model recommendation, purchase or digital calculation. |
| Choose drilling equipment | Cordless Drill guide ↔ Drill vs Impact Driver ↔ Drill Bit Types; additional torque/project links | Selection/use explanation. No affiliate checkout or shop. |
| Solve a low-voltage learning task | Multimeter ↔ Soldering; Multimeter → Battery/Spark Plug guides | Article guidance and physical checking; no imported electrical measurement/session workflow. |
| Story into workshop learning | Home/Diary → stubborn-bolt story → brake/flat-tire/oil guides; Home/Projects → motorcycle story → oil/filter/tire/brake guides | Related educational reading. Story does not open a saved workshop job or analyzer session. |
| Sport/lifestyle exploration | Home activity card or Sport menu → climbing story → Sport/back/global navigation/share | No second sport article or detail-level related journey exists. |
| General sound observation | Home Diagnostics CTA → Tools group → Sound Analyzer → mic/file → charts/peaks → stopped/file A/B → clip download or Engine link | Measurements and comparisons; no fault diagnosis or result-specific maintenance tutorial. Generic Tutorials link exists. |
| Engine measurement | Tools/General Sound → Engine → live/file → optional references → live A/B/repeats/quality → JSON export | Observation and local evidence; no automated fault action, measured RPM input, result import or attachment to workshop job. |
| Speaker listening | Tools → Speaker → play sound externally → Start Listening → ≥10s valid capture → profile/meters → stop or General Sound | Captured balance remains in session memory; no downloadable speaker result, calibration or product recommendation. |
| Software validation | Tools or Engine advanced panel → DSP Validation → choose signal/rate → run → checks → JSON export → Engine/manual device log | Generated-input software checks. Physical measurements must be performed and logged separately by the user. |
| Core workshop service | Tools Operations → Intake → save job → Inspection/Estimate → record approval → Work Order → actual repair status → QC/readiness → handover → complete → History or new Intake | A completed local job. Actual repair, customer approval and handover are entered by the operator; no online customer approval/signature flow. |
| Resume work / waiting parts | Queue → search/filter saved jobs → derived next workflow link; waiting-parts state/reason and history | Continues the same local job. Empty browser has no jobs until Intake is used. Plain workshop tabs can lose selected context. |
| Stock shortage / procurement | Work Order/Parts/Queue context → Procurement suggestion → explicitly create need → select supplier/PO → issue locally → partial delivery/accepted stock-in → Parts → manually issue to job / clear waiting state | Receipt increases stock and updates need progress; it does not automatically reserve or issue it, clear the waiting overlay, contact suppliers or pay them. |
| Completed job into financial record | Ready-for-Pickup/completed job → Billing draft from actual work/net consumption → confirm selling prices → issue snapshot → record partial/full payments → print invoice/receipt | Local records of external transactions. Payment status is separate from handover, not a payment gateway or accounting-service sync. |
| Return visit / warranty / next service | Completed job → History → explicit warranty coverage/expiry → claim/status; next-service date/odometer/recommendation → existing-customer/vehicle Intake | Local follow-up history/due display. No background scheduler, customer notification or auto-created return job. Stable vehicle/customer identity must be selected explicitly. |

No tutorial detail page has an authored direct link to a specific diagnostic or Workshop Operations tool. Header Tools links provide generic discoverability, not problem-specific transitions. Tool help explains signals and limitations; it does not turn a detected peak/profile into a repair recommendation. The workshop job model also has no analyzer measurement attachment/integration.

## 8. Orphans, exposure, overlaps and structural gaps

### Orphans and discoverability

**No strict orphan HTML page was found.** All 41 pages are in the sitemap and reachable from Home through shared navigation and section cards. DSP Validation is explicitly listed in Tools and linked by Engine, so it must not be described as hidden/unlinked. There is no implemented page behind a main-menu destination missing from the source.

Underexposure is relative:

- No individual tool is a direct homepage body link. The two tool-family CTAs lead to index anchors, then the user chooses a card. Three analyzers and five operations are named as examples, but some tools have only group-level exposure.
- DSP Validation, Queue, Inspection & Estimate and QC & Handover are not named individually in the homepage cards. Service History is mentioned in the operations description; it is not an individual homepage CTA.
- Sixteen of 18 tutorial articles are absent from the homepage’s two featured tutorial slots. All remain in the flat Tutorials index and most have article cross-links.
- Sport is directly promoted by the climbing card and header, but lacks a footer link. Its article has no further detail-level content journey.
- About’s body “Tools & Machines” card has no digital-tools link, although its shared header/footer do.
- Related tutorial networks offer several maintenance/woodworking/electrical pathways, but no contextual links into the implemented digital tools.

### Overlap and terminology

| Observation | Current consequence |
|---|---|
| Physical-tool Tutorials labels and digital Tools menu share “Tools” wording | The same word describes subject matter in one place and executable browser utilities in another; no physical-equipment Tools archive exists. |
| Sound and Engine both have waveform/spectrum/spectrogram/A/B | Deliberate shared foundation; Engine adds continuous capture, references, quality and export. They are distinct routes, not duplicate copies of one capability. |
| Speaker versus general band display | Both discuss frequency balance, but use different boundaries and normalization; their percentages are not the same metric. |
| Four reference explainers and two comparisons sit under Tutorials | Tutorials is a mixed editorial container; dedicated Reference/Reviews menus are absent. |
| Diary, Projects and Sport each hold one article | Three distinct main-menu slots cover three detail pages; Tutorials holds 18 and Tools holds 13. |
| Workflow and support tools all share numbered job-page tabs | Intake through QC are sequential; Queue uses an arrow while other support pages inherit position-based numbers. The nine tabs are not nine mandatory service stages. |
| Tools index metadata description remains focused on Sound Analyzer | Body contains two families and 13 tools; description is narrower than current content. |
| Homepage “opening soon” message | Hero status coexists with a functioning content library and digital workbench. |

### Dead links, inconsistent navigation and functional boundaries

- **Dead internal page/fragment navigation found: 0** in rendered anchors checked. Header/footer links were consistent with live page structure, except the already-described footer omission of Sport relative to the header.
- Two live 308/slashless canonical mismatches are listed in section 2; existing article links also mix slash conventions. Clamps has a linked slash variant that resolves successfully.
- Shared workshop tabs drop the selected `?job` context. Job-specific continuation/Queue links carry it, so the two navigation mechanisms differ.
- Generic shared printing is unwired on five auxiliary pages; specific Billing/History/Procurement print controls exist separately (section 5). This was established by dispatcher/handler inspection, not by creating live records.
- “Private local workshop workflow” refers to browser-local storage, not authenticated access control. Records are not encrypted or protected by application sign-in in the inspected implementation.
- No standalone Privacy/Terms/Affiliate Disclosure/Contact page or corresponding footer link was found. This is a content inventory observation, not a legal compliance assessment.
- No global search, pagination, tag filtering, glossary lookup, cloud storage, automatic reminders, payment gateway or supplier messaging flow was found. Queue/Parts/History/Billing do have searches over local records, which is different from searching website content.

## 9. Homepage representation and exposure

Source: `src/pages/index.astro`, shared header/footer, `src/data/*`. Live desktop/mobile observations agreed with the section structure and links.

### Current sequence

1. **Header:** WorkshopGirl™ brand and seven main-menu links; mobile uses Menu.
2. **Hero:** “The workshop is opening soon”; “Hi, I'm Workshop Girl”; practical fix/build/break introduction; engines/electrical/woodworking/adventures line. Large character image holding wrench/toolbox, pink accent, workshop scene and “Real machines. Real skills.” note. There is no tool-launch button in this hero.
3. **The digital workbench:** two substantial cards immediately after the hero. Diagnostics names Sound/Engine/Speaker and links to the Diagnostics anchor. Workshop Operations names intake/work orders/parts/billing/procurement and links to its anchor.
4. **Latest tutorials:** Jigsaw and Circular Saw beginner guides, both dated 23 September, with images, category labels and Read tutorial CTAs. View all tutorials links to the index.
5. **Latest from Workshop Girl:** one climbing activity card and “See the activity” link.
6. **Stories behind the work:** the stubborn-bolt diary entry, dated 22 September, and Read the diary.
7. **Latest project:** the motorcycle project, marked Completed, and View project.
8. **Footer:** brand/tagline and six links.

### Above the fold

At **1280 × 720**, the header and character-led hero occupy the initial viewport; the tool-promotion section begins roughly **812px** below the document top. At **390 × 844**, the header/hamburger, hero text/status and upper part of the image are visible; tool promotion begins roughly **1076px** down. Thus the tools are the first major content section after the hero, but were below the fold in both inspected viewport sizes. Exact fold position depends on viewport/font rendering; these are measured examples, not a universal claim.

The immediate visual emphasis is character/brand and practical workshop identity. Below that, the first discovery emphasis is two families of browser tools, followed by a mixture of learning and character stories.

| What exists | What the homepage exposes |
|---|---|
| 13 individual tools | 2 family cards/anchor CTAs; 0 direct individual tool URLs in homepage body. Tool names are examples, not individual links. |
| 18 tutorial-section articles | 2 directly featured tutorials (Jigsaw/Circular Saw); all others via Tutorials menu/View all. |
| 2 tool-type comparisons | Not featured directly; reachable through Tutorials/related reading. |
| 4 reference-style explainers | Not directly featured; one flat tutorial collection. |
| 1 Diary story | Direct featured card. |
| 1 Project article | Direct featured card with Completed status. |
| 1 Sport article | Direct featured activity card. |
| About | Header/footer links, no dedicated About body feature. |
| Engine quality/repeatability/export and software validation | Family description mentions DSP; no individual capability card or launch link. |
| Connected workflow, stock, warranty, invoice and procurement records | Broad operations description and examples; detailed stages/features are exposed after Tools/operation pages. |
| Reviews/affiliate/glossary/legal pages | None implemented or promoted. |

## 10. Implemented technical capability map

```text
Static publishing and discovery
├── Astro static HTML routes and TypeScript bundling
├── Shared header/footer, responsive hamburger, section cards
├── Typed editorial summary arrays and separate homepage feed
├── Page metadata; selected Article/BreadcrumbList JSON-LD
└── Authored sitemap XML, robots.txt and Cloudflare rewrite/redirect file

Browser audio acquisition and file handling
├── Secure-context microphone access and explicit start/stop
├── AudioContext / stream / PCM analyser tap
├── AudioWorklet framing + live module Worker
│   ├── Audio-clock/sequence evidence, backpressure and frame-loss counters
│   └── Startup/error/stall handling with labeled sampled fallback
├── Local file validation and decodeAudioData
├── Optional MediaRecorder, playback and local clip downloads
└── Page-hide/visibility cleanup, cancellation and object-URL lifecycle

Shared numerical DSP
├── Custom radix-2 FFT, reusable buffers and typed arrays
├── DC removal, periodic Hann, tonal/power normalization
├── AC RMS/dBFS, clipping observation and frequency resolution
├── Interpolated separated peaks and frequency-band power
├── Offline overlapping-window analysis and whole-clip summaries
└── A/B spectral comparison and bounded display history

Rendering
├── Canvas 2D waveform, log-frequency spectrum and spectrogram
├── Comparison overlays, reference markers and numerical tables
└── Speaker spectrum, accessible meters and progress/status text

Measurement and domain layers
├── Capture quality, context comparison and repeatability
├── Normalized spectral-shape similarity and schema-validated JSON export
├── Engine shaft/firing reference calculations, harmonic matching, peak tracking
├── Speaker log-frequency normalization and valid-time session classifier
└── Deterministic known-signal generation and Worker validation reports

Workshop operations
├── Shared typed customers, vehicles, jobs and stable local IDs
├── Versioned localStorage, validation/defaults and storage error feedback
├── Car/motorcycle checklists and parts/labor estimate calculations
├── Approval revisions, work/inspection-only completion and QC/handover gates
├── Derived Queue state, waiting-parts overlay, history, search/filter/sort
├── Part catalog, append-only movements, balances and net job consumption
├── Completed-service projections, explicit warranties/claims and due status
├── IDR invoices, confirmed selling prices, snapshots, payments and reversals
└── Supplier/need/PO/receipt allocations and accepted-stock provenance

Local output and sharing
├── JSON Blob downloads for measurements and validation
├── Optional recorded audio download
├── Browser print/PDF sheets for core jobs and selected operation documents
└── Web Share API / clipboard fallback for canonical page/tool links
```

### Reuse boundaries and evidence

| Capability | Existing source boundary | Practical limit of what exists |
|---|---|---|
| DSP core | `src/lib/dsp/{engine,fft,spectrum,offline,comparison}.ts` | Pure TS/typed arrays; neither WASM nor GPU compute. |
| Acquisition | `src/lib/audio/{microphone,live-capture,pcm-capture.worklet,live-analysis.worker,decode,recording}.ts` | Browser permissions/hardware/decoder support; no physical calibration. |
| Analyzer extension | `src/components/sound-analyzer/extension.ts`, engine controller/domain modules | Engine extends a shared analyzer via capture/render/comparison hooks; Speaker reuses lower-level acquisition/DSP with its own UI. |
| Measurement evidence | `src/lib/measurement/*`, Engine MeasurementPanel/measurement-tools | In-memory measurements; explicit serialized exports. Manual device log is not automatic certification. |
| Speaker domain | `src/lib/domains/speaker/profile.ts` | Tool-specific normalization, distinct from generic summed band shares. |
| Known signals | `src/lib/validation/{reference,reference.worker}.ts` | Digital software validation only. |
| Workshop business rules | `src/lib/workshop/{model,store,rules,queue,parts,history,billing,procurement}.ts` | Shared local entities/rules; no backend transactions or concurrent multi-user coordination. |
| Workshop UI/printing | `WorkshopLayout.astro`, `src/components/workshop/*.ts`, `workshop-operations.css` | Shared presentation/persistence; generic print handler coverage differs from record-specific output. |
| Public sharing | `ShareButton.astro`, `ToolShare.astro` | Canonical URLs, not results or customer records. |

No implemented **WASM, WebGL, WebGPU, camera/image-analysis pipeline, device barcode scanner, OBD transport, database server or cloud DSP service** was found. Canvas raster rendering is present, but it is visualization rather than image analysis. The RPM stream interface is a source contract, not a usable connected-device feature.

The repository contains Node tests for DSP/acquisition/measurement/speaker and workshop domains, Playwright browser suites, and DSP/speaker benchmark scripts. These are existing engineering assets; their existence is not a claim that they were executed or passed during this audit.

## 11. WORKSHOPGIRL.COM — CURRENT STATE

| Measure | Current value / definition |
|---|---|
| Total pages | **41 unique HTML pages**; excludes 2 XML endpoints, redirects, anchors, query states and assets. |
| Total tools | **13**: 4 Diagnostics, 9 Workshop Operations. Tools index excluded from tool count. |
| Total articles/tutorials | **21 editorial detail pages**: 18 in Tutorials + 1 Diary + 1 Project + 1 Sport. About excluded. |
| Tutorial section detail breakdown | 12 procedural/use guides + 4 reference-style explainers + 2 generic tool-type comparisons = 18. |
| Total product/review pages | **0 dedicated product-model review/affiliate pages**; 2 comparison articles overlap Tutorials. |
| Total categories | **5 navigable section indexes**: Tutorials, Tools, Diary, Projects, Sport. Of these, 4 are editorial. Also 2 tool anchor groups and 15 tutorial display-label strings; 0 separate tag/category archives. |
| Total main-menu items | **7**; no submenus. Footer has 6. |
| Static brand pages | Home + About = 2. |
| Legal pages | 0. |
| Sitemap coverage | 41/41 source HTML pages; all listed live. |
| Strict orphan pages | 0 found. |
| Dead internal page/fragment links | 0 found in rendered navigation checked. |
| Most developed editorial section | Tutorials: 18 articles plus index, compared with one detail each in Diary/Projects/Sport. |
| Most developed interactive section | Tools: 13 pages; Workshop Operations has 9 connected views, while Engine has the deepest audio measurement/context/export UI. This is a source-based assessment, not a performance ranking. |
| Least developed existing editorial sections | Diary, Projects and Sport, tied at 1 detail each. Reviews/affiliate and standalone glossary/reference have no dedicated sections. |

Count reconciliation: **1 Home + 1 About + 5 indexes + 13 tools + 18 tutorial details + 3 story/project/sport details = 41**.

Advanced capabilities already implemented include Web Audio microphone/file decoding, optional local recording, AudioWorklet and module Workers, custom FFT/DSP, Canvas signal visualization, repeatability and numerical JSON exports, deterministic validation, shared local workshop records, approval/QC gates, stock and procurement ledgers, IDR invoicing/payment records, and browser print/share output.

The strongest structural observations are the uneven size of top-level sections, the mixed tutorial/reference/comparison container, the absence of contextual article-to-tool transitions, and the two distinct data lifetimes (audio session memory versus persistent workshop records). Important capabilities such as validation, repeatability, Queue and QC sit below tool-family discovery. Header/footer Sport coverage, URL/canonical conventions, job-context tabs, and shared print-button wiring are the observed navigation/control inconsistencies.

## Evidence index

All source paths below are relative to `C:\WorkShopGirl` and were inspected at the commit recorded above.

| Finding family | Primary sources |
|---|---|
| Framework/build/content structure | `astro.config.mjs`, `package.json`, `README.md`, `src/pages/**`, `src/data/*.ts` |
| Menus and sharing | `src/components/SiteHeader.astro`, `SiteFooter.astro`, `ShareButton.astro`, `ToolShare.astro` |
| Home/index exposure | `src/pages/index.astro`, `src/pages/tools/index.astro`, `src/pages/tutorials/index.astro`, Diary/Projects/Sport indexes, `src/data/home-feed.ts` |
| Article inventory/relationships | All `src/pages/tutorials/*.astro` and nested tutorial `index.astro` files; Diary/Project/Sport detail files; `ToolCategories.astro`; About |
| Discovery/aliases | `src/pages/sitemap-0.xml.ts`, `sitemap-index.xml.ts`, `public/_redirects`, `public/robots.txt` |
| Diagnostic tools | `src/pages/tools/{sound-analyzer,engine-sound-analyzer,speaker-sound-analyzer,dsp-validation}/index.astro`; corresponding components; `src/lib/audio`, `dsp`, `measurement`, `domains`, `validation` |
| Local operational tools | Nine `src/pages/tools/workshop/*/index.astro` files; `src/components/workshop/*`; `src/lib/workshop/*`; `src/styles/workshop-operations.css` |
| Responsive behavior | Shared header/footer CSS, `src/styles/sound-analyzer.css`, `speaker-analyzer.css`, `workshop-operations.css`, and Billing/Procurement page styles |
| Engineering assets | `tests/*.test.ts`, `tests/*browser.spec.ts`, `scripts/benchmark-*.ts`, existing DSP/device-validation documentation |

Public verification entry points: [Home](https://workshopgirl.com/), [Tools](https://workshopgirl.com/tools/), [Tutorials](https://workshopgirl.com/tutorials/), [live sitemap](https://workshopgirl.com/sitemap-0.xml), and [robots](https://workshopgirl.com/robots.txt). HTTP/link evidence was retained as ignored audit scratch data under `test-results/as-is-audit/`; it is not published content or a second report deliverable.

# INPUT FOR NEXT DEVELOPMENT DISCUSSION

These are factual inputs only. No next feature or priority is selected here.

### A. Architecture observations

- The site is a static Astro publication with explicit page files and browser-side tools; there is no application backend in the inspected implementation.
- Navigation offers five section indexes plus Home/About; detail-page volume is concentrated in Tutorials and Tools.
- Sitemap maintenance is separate from route files and content arrays, although all 41 pages currently match.
- Category strings are display labels, and two tool families are anchors. Neither forms a dedicated archive hierarchy.
- The header has Sport while the footer does not. Two article redirects end at a different slash convention from their authored canonical.
- Editorial schemas/styles are authored per page, while Workshop Operations has a shared layout and business-domain modules.

### B. Content observations

- Tutorials holds 18 articles: 12 procedure/use guides, four reference explainers and two generic comparisons.
- Diary, Projects and Sport each have one detail article; all three are directly promoted on Home.
- There are no dedicated product-model reviews, affiliate purchase links, glossary, legal or contact pages in the source inventory.
- Tutorial category wording spans vehicle maintenance, physical tools, woodworking, metalworking and electrical skills, with 15 display strings and no filter UI.
- Homepage feature selection is array-position based; it shows two tutorial details and no individual tool link.
- About’s Tools & Machines body card and the homepage’s opening-soon copy remain present alongside the active digital tools.

### C. Tool/capability observations

- Four diagnostic tools already share audio/DSP capabilities; nine operational tools already share browser-local workshop entities.
- Audio tools are observational: no calibrated SPL, measured RPM, fault diagnosis or certified speaker response is implemented.
- Engine has live snapshots, repeatability/context checks and numerical export; Speaker intentionally has a simpler mic-only session.
- Workshop operations already cover job approval/completion, Queue, stock consumption, service follow-up, invoices/payments and purchase receiving.
- Local payment/PO status changes are records of external actions, not integrations that execute them.
- Audio results are ephemeral except explicit downloads; operational records persist locally without a visible store backup/import or cross-device synchronization workflow.
- The shared generic print action is not wired on five auxiliary pages; record-specific print actions exist in three of those pages.

### D. User-journey observations

- Tutorials form related-reading clusters, and Diary/Projects lead into maintenance learning; Sport has no second detail destination.
- No tutorial detail links directly to a specific digital tool, and no analyzer result leads to a result-specific repair/tutorial action.
- Analyzer measurements are not attached to workshop job records.
- Explicit workflow continuations preserve job context; the shared nine page tabs do not.
- Completion produces local service history. Warranty/claims and next-service records require explicit entry; no outgoing reminders or automatic return job exists.
- Receipt of stock does not automatically issue it to a job or clear waiting-parts state. Financial payment state and vehicle handover state remain separate.

### E. Technical reuse opportunities

- Shared typed-array DSP, file decoding, acquisition lifecycle and Canvas charts already serve multiple tools through clear source boundaries.
- Analyzer extension hooks, engine/speaker domain functions, quality/similarity/repeatability and explicit JSON serialization are implemented building blocks.
- Deterministic signal generators, worker paths, domain tests and benchmark scripts already exist for engineering verification.
- The workshop model/store and pure domain rules already express stable identities, approvals, status derivation, stock movements, completed services, billing and purchase allocations.
- Shared responsive WorkshopLayout, form styles, canonical-only sharing and document-print infrastructure already exist, with the handler-coverage limitation noted above.
- The RPM stream interface defines a contract only; no connected transport may be counted as an implemented reusable integration.

**Audit complete. No website code, pages, menu items, features or deployments were changed.**
