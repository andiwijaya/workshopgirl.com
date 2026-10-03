# WorkshopGirl V2 execution report

Status: Phases 0-9 implementation and local regression are complete. Dependency audit and strict job-ID transport exceptions remain for parent disposition; Phases 10-11 remain pending.
This is a sequential implementation checkpoint for the parent orchestrator, not completion of the master program.

Authoritative scope: [complete master program](WORKSHOPGIRL_V2_MASTER_PROGRAM.md).
Baseline source: [user-supplied AS-IS audit](WORKSHOPGIRL_AS_IS_SITE_AUDIT.md).
The master-program transcription retains all requirements; example code fences use plain syntax highlighting.

## Repository and environment

- Verification date: 2026-10-03 UTC. Baseline commands executed approximately 00:17–00:27 UTC.
- Starting branch/commit: main / 3bc271260bc2f191db403ea3f57fa2acbe256b7f.
- Both origin and github: https://github.com/andiwijaya/workshopgirl.com.git (fetch/push).
- Original checkout: C:\\WorkShopGirl. Its only initial untracked file was the user-supplied audit; preserved.
- Isolated branch: codex/workshopgirl-v2.
- Working checkout: C:\\WorkShopGirl\\test-results\\v2-runtime\\repo. Parent checkout stays on main.
- Node 24.12.0; npm 11.6.2. Existing dependencies reused through a node_modules junction; no install or lockfile change.
- No applicable AGENTS.md found in the original root/ancestors or inspected source/docs/tests. No .agents directory.
- rg is unavailable. PowerShell file enumeration/Select-String and Node filesystem tools used.
- The sandbox denied Git ref writes and writes to the Git-created worktree. Explicit tool escalations were approved for the authorized worktree, edits and checks. No ACL, security configuration or permissions were changed; no auto-review rejection.
- Generated builds, browser traces, logs, screenshots and implementation helper scripts are ignored runtime artifacts. None should be committed.
- No fetch/sync/reset, force push, remote-history rewrite, merge, push or deployment in this turn.
- Final read-only recheck: original main still 3bc271260bc2f191db403ea3f57fa2acbe256b7f with only the original untracked audit. Its SHA256 and the isolated copy both equal 4BD2BAE97ED0062E2A879C75D4E21EF8AEAA7ECC3DD15C9C8F08D489D1CC8A9C. Git ownership validation for this root read was handled by an approved escalation, without changing safe.directory.

## Master phase plan and Definition of Done mapping

| Phase | State | Objective / required gates | Codebase-specific implementation boundary |
|---|---|---|---|
| 0 Baseline | Complete | Repository, routing, architecture, initial checks and evidence | Audit, explicit Astro pages/XML, package/config, shared components, local store and diagnostic libraries |
| 1 Structure | Complete | Job context, valid/invalid/neutral states, print, Sport/current-state, canonicals, tools metadata, opening-soon | Typed workshop navigation + shared client context; existing controllers; header/footer; exact Cloudflare proxies |
| 2 IA | Complete | Home/Learn/Tools/Workshop/Stories/About; nonempty real categories; preserve existing routes; desktop/mobile keyboard menus | Shared navigation config; label /tutorials/ as Learn; new /workshop/ and /stories/ discovery hubs; retain old sections and /tools/workshop/* |
| 3 Homepage | Complete | Three action journeys, direct Engine/Sound/Speaker links, Start Job, useful recent learning, sorted dates, character/mobile performance | src/pages/index.astro, typed content arrays and existing character artwork; sort by ISO date with stable ties |
| 4 Journeys | Complete | Engine observation → learning → optional inspection; maintenance → workflow; distinguish stages/support | src/data/journeys.ts and reusable JourneyCards.astro with validated route IDs and bounded contextual CTAs |
| 5 Workshop | Complete | One local application dashboard; Start/Resume/waiting/parts/billing/history; four-stage progress; useful empty states/local clarity | Existing lib/workshop queue/parts/billing/history projections, new hub controller, WorkshopLayout and all nine existing views |
| 6 Measurement bridge | Complete | Existing/new job attachment, structured observations only, visible inspection/work evidence; safe versioned migration and tests | model/store plus dedicated observation domain; MeasurementTools capture/export reuse; bounded summary, no audio/binaries/customer data in share URLs |
| 7 Photo Lab | Complete | Local JPEG/PNG/WebP, calibration mm/cm/m/inch, optional four-corner perspective, distance/angle/polyline/area/circle, annotations/select/move/delete, undo/redo, zoom/pan, PNG/JSON, touch/a11y/help/privacy/math tests | New /tools/photo-measurement/ with pure geometry/state/export modules, Canvas UI and lazy module worker; no backend/framework |
| 8 Content | Complete | Contextual journeys, reusable taxonomy/reference discovery, metadata/link polish; no invented reviews/affiliate claims | Existing 18 tutorial routes and real metadata; existing Diary/Project/Sport destinations; reuse journey component |
| 9 Quality | Complete; audit exception open | Lint/check/unit/browser/build/audit, full diagnostics/operations/attachments/photo regressions, six viewports, performance/privacy/security/bundle review | Existing Node/Playwright suites and benchmark scripts; new deterministic image fixture and math/worker/export/migration tests |
| 10 Production | Pending | Review diff, logical commits, integrate normally, push without force, existing deployment, exact commit confirmation | Inspect live repository protection/hosting and credentials before normal integration; README Cloudflare Pages main/dist is baseline, not proof of connected deployment |
| 11 Live verification | Pending | HTTP/sitemap/robots/canonicals/legacy URLs; desktop/mobile menu, analyzers, synthetic local job, Photo calibration/export; clean synthetic data; final report | Production isolated browser contexts and HTTP checks against intended deployed commit, no real customer data |

All applicable DoD items in the master program remain mandatory. This table does not replace their detailed acceptance criteria.
The parent must continue automatically through the pending phases after reviewing this checkpoint.

## Architecture verified before edits

- Astro 7 static output, site URL https://workshopgirl.com; 41 explicit HTML page routes plus two XML route handlers. No dynamic route/backend/database.
- Existing sitemap is hand-authored; 41 unique entries. robots.txt advertises sitemap-index.xml. Preserve every baseline HTML route and the sitemap.xml alias.
- Header: seven links, one shared mobile nav, 760px breakpoint, Escape close. Footer: six links before this work, missing Sport.
- Home: character hero and opening-soon copy, two family cards, recent tutorials chosen with slice, then activity/diary/project promotions.
- Tools: four diagnostics and nine operations under two anchor groups; description disproportionately focused on Sound Analyzer.
- Workshop: shared WorkshopLayout, operations dispatcher, typed model/store and pure queue/parts/history/billing/procurement domains. Store key workshopgirl.workshop.operations.v1, version 1. Customers/vehicles/jobs plus stock/follow-up/invoices/payments/purchasing; defaults for older records and validation. No analyzer attachments.
- Core controllers preserve job IDs on explicit continuations; shared tabs did not. Dispatcher returned before wiring generic print for five supporting views. Three have record-specific printing.
- Diagnostics: shared TS FFT/DSP, Web Audio acquisition/decode, AudioWorklet and module Workers, Canvas rendering, engine extension hooks, MeasurementTools/quality/repeatability/export. Speaker has separate frequency normalization. No WASM/GPU/OBD/calibrated SPL/fault diagnosis.
- ToolShare sends canonical URLs, excluding job queries; maintained.
- Responsive widths found across source: 350/360/420/500/520/700/760/800/850/900px, plus max-height 520px landscape, print and reduced-motion rules. Operations 760/520; header 760; footer 700; general/engine 700/360; speaker 760/420; billing/procurement 760/520. Existing page-specific breakpoints retained.
- package scripts: lint, check, test, test:dsp, test:browser, build, benchmark:dsp, benchmark:v3, benchmark:speaker.
- No Lighthouse config/script/dependency or CI workflow found. Benchmarks exist; full performance/audit execution belongs to Phase 9.
- Playwright uses production build and port 4379 preview with ignore-lock, two workers and Chromium/WebKit desktop/mobile projects. Windows WebKit lacks Web Audio; explicit audio skips are expected.
- README describes Cloudflare Pages (main, npm run build, dist); public/_redirects is consistent. .openai/hosting.json also has a static dist project reference. No deployment connection/protection/credentials were asserted or changed.

## Remaining sequential implementation tasks

Phases 0-9 implementation and local regression are complete; dependency/privacy transport exceptions require parent disposition before release. The Phase 7-9 decomposition below is retained as historical planning context; the later checkpoint entries record its implementation. The parent resumes Phases 10-11 after the pre-release evidence review.

1. Phase 7a: Photo input and deterministic geometry core. Consistent internal mm, image-coordinate transforms, reference scale; distance/angle/polyline/polygon/circle math and bounds. Generated 1000px grid with 100px=10mm fixtures.
2. Phase 7b: Canvas editor, accessible labeled controls/help, touch handles, wheel and pointer/pinch zoom/pan, selection/text/arrow/labels, bounded immutable undo/redo with image buffers excluded from history.
3. Phase 7c: perspective rectification with known planar rectangle/aspect inputs and four checked nondegenerate corners, tested homography/inverse mapping, lazy worker for expensive raster work. Prefer pure TS worker implementation if stable and adequate; only choose OpenCV/WASM after bundle/performance evaluation. Calibration resets/revalidates after coordinate-space change.
4. Phase 7d: annotated PNG + versioned JSON, image decode/type/size/corruption/orientation handling, bounded interaction resolution with correct mappings, worker cancellation, URL/bitmap cleanup. Optional printable report if clean. Connect to actual clamps/drilling/woodworking content. Exercise all six viewports and all measurement/export gestures.
5. Phase 8: reusable category IDs/display metadata, reference discovery and contextual related journeys; preserve all routes and editorial truth. Future review IA may be prepared but publish no fake reviews/testing/affiliate links.
6. Phase 9: full quality/privacy/link regression, existing DSP/speaker benchmarks and startup/large-image/bundle metrics, dependency audit where available. Resolve attributable failures; physical-phone certification is not implied by browser emulation.
7. Phase 10: inspect remote head and normal branch/deployment protection, review all changes, integrate safely, normal push and observe existing deployment. Original main has the user audit untracked while this branch now tracks the preserved copy; if Git blocks overwrite during integration, preserve/verify it in an ignored backup before the normal merge. Do not reset/discard it. If truly missing credentials/infrastructure, report exact operation/target/error while completing independent work.
8. Phase 11: intended commit/deployment identity, every important route/alias/canonical/sitemap/robots/noindex, isolated desktop/mobile synthetic workflow and Photo fixture/calibration/export, remove synthetic browser data, clean checkout, final metrics/report.

## Phase 0 — baseline verification

Objective: establish the source/working/deployment/test baseline before modifications.
Files changed: docs/WORKSHOPGIRL_V2_MASTER_PROGRAM.md, this report; preserved user audit copied unchanged into the isolated checkout.
Architecture decisions: isolate work on codex/workshopgirl-v2, reuse installed dependencies, retain static/local-first boundaries and baseline indexed URLs.
Implementation completed: full audit read in sections; repository/main/HEAD/remotes/worktree status and architecture inspected; complete PRD preserved.
Tests executed (baseline before source edits):

| Command | Result | Evidence |
|---|---|---|
| npm run lint | PASS, exit 0 | test-results/v2-baseline/lint.log |
| npm run check | PASS, exit 0; 137 files, 0 errors, 0 warnings, 2 pre-existing deprecation hints | test-results/v2-baseline/check.log |
| npm test | PASS, exit 0; 186/186, 0 skipped | test-results/v2-baseline/unit.log |
| npm run build | PASS, exit 0; 41 HTML pages, 2.00s reported build time | test-results/v2-baseline/build.log |
| npm run test:browser -- --output=test-results/v2-browser-baseline --reporter=line | PASS, exit 0; 176 passed, 48 explicitly skipped, 224 total, 7.8m | test-results/v2-baseline/browser.log |

Results: no baseline failing checks. Existing ShareButton/ToolShare execCommand fallback deprecation hints remain unchanged; Astro summary classifies them as hints.
Problems found: confirmed missing context in shared tabs, dead generic print controls, footer Sport omission, narrow tools metadata, opening-soon copy, missing two exact slashless proxies and one internal clamps slash variant.
Problems fixed in Phase 0: environment preparation only; no security/ACL changes, no installs, no application feature edits in the baseline build.
Commit: d41bb74f1b65cacf408f4a36db7912f3eeed5c64 — Document WorkshopGirl V2 program and verified baseline.
Deployment state: not attempted; authorized for later Phase 10 after all program gates.

## Phase 1 — structural fixes

Objective: resolve baseline inconsistencies before IA/redesign.
Files changed:
- src/lib/workshop/navigation.ts, src/components/workshop/navigation.ts (new shared metadata and context helpers)
- src/components/workshop/WorkshopLayout.astro, operations.ts, parts-inventory.ts, service-history.ts, billing.ts
- src/components/SiteHeader.astro, SiteFooter.astro
- src/styles/workshop-operations.css
- src/pages/index.astro, src/pages/tools/index.astro, src/pages/tutorials/angle-grinder-basics.astro
- public/_redirects
- tests/workshop-navigation.test.ts, tests/structural-browser.spec.ts; updated existing workshop-browser.spec.ts and workshop-billing-browser.spec.ts
- this execution report

Architecture decisions:
- A job context is one exact ID present in the validated browser store; ambiguous repeated query fields are neutral. IDs never come from inferred plates/names.
- All nine tabs can carry selected job orientation. Queue highlights it; Parts shows its stock context and selects its movement job; History uses its vehicle for completed-service discovery; Billing resumes its existing active invoice when present. Procurement is a global supplier/order workspace: the context banner carries orientation only, never pre-assigns a PO/need/receipt or filters out other jobs.
- Explicit Start a new job, All jobs, Clear job context links are neutral. Parts job changes, invoice selection and History vehicle/search/reset changes update or clear context, rather than carrying a stale job.
- Revalidate links from localStorage on click/pointer/keyboard and cross-tab storage changes; deleted jobs no longer travel in tabs. No store schema change in Phase 1.
- Intake save immediately updates current context/URL and print target; repeated save edits the same job and retains its intake number instead of creating duplicates. Identity pickers close/disable after first save, matching the existing-job form.
- Core printing registers afterprint before opening the dialog, so synchronous browser close events clean up the sheet correctly; browser regression explicitly exercises this ordering.
- WebKit selected option text overflow at 320px was reproduced with scroll measurements: document width 375px despite 320px viewport, traced to the job select. Scoped Parts select appearance/ellipsis and a visible CSS arrow keep native interaction/semantics while bounding painting; reproduction returned exactly 320px. No document overflow masking.
- Core print retained. Queue and Parts now print clearly labeled all-local-record summaries, including useful empty-state output. History/Billing/Procurement omit the dead generic action and retain their own record-specific controls.
- Current Workshop tab uses aria-current=page. Footer matches all seven header destinations and active sections. Mobile Escape returns focus; outside clicks and breakpoint transitions close the menu.
- Keep nine already indexed slashless tutorial canonicals. Complete existing exact 200 proxies for circular saw and soldering; normalize the clamps internal link. No reverse redirect/broad slash rewrite or canonical change. Both variants render the same unique canonical. Cloudflare proxy behavior must be verified live in Phase 11; Astro preview does not execute _redirects. Official reference: [Cloudflare Pages redirects and proxying](https://developers.cloudflare.com/pages/configuration/redirects/).
- Tools metadata includes diagnostics, validation and local operations; home status now says Your digital workshop companion, retaining character/layout.

Implementation completed: structural edits plus four pure domain tests and seven browser scenarios (four projects = 28 additional browser cases).
Tests executed: final production verification 2026-10-03, approximately 00:45–00:52 UTC. All commands used the isolated branch and production build.

| Command | Final result | Evidence |
|---|---|---|
| npm run lint | PASS, exit 0 | test-results/v2-release/lint.log |
| npm run check | PASS, exit 0 on corrected rerun; 141 files, 0 errors, 0 warnings, 2 unchanged hints | test-results/v2-release/check.log |
| npm test | PASS, exit 0; 190/190, none skipped | test-results/v2-release/unit.log |
| npm run build | PASS, exit 0; 41 HTML pages, 1.36s reported build time | test-results/v2-release/build.log |
| npm run test:browser -- --output=test-results/v2-browser-release --reporter=line | PASS, exit 0; 204 passed, 48 explicit WebKit Web Audio skips, 252 total, 6.4m | test-results/v2-release/browser.log |

Results:
- Four new domain cases and seven new browser scenarios; 28 new browser cases across Chromium/WebKit desktop/mobile. Existing Billing and complete Workshop workflow tests strengthened for changed job selection and History.
- Baseline analyzers, generated-signal validation, local job workflow, approval/QC, Queue, inventory, warranties/history, Billing/payments/receipts and Procurement/receiving regression suites passed.
- Homepage/tools/selected Inspection automated responsive and menu checks passed at 390×844, 430×932, 768×1024, 1024×768, 1280×720, 1440×900 in all four projects. Existing operation tests also cover 320/375px; Parts selection now explicitly checks 320/390/430px.
- Eighteen Chromium desktop profile screenshots (six viewports × three pages) captured under test-results/v2-browser-release/structural-browser-Header--0066d-at-every-requested-viewport-chromium-desktop/. Human visual inspection covered 390px Workshop, 1280px Workshop and 430px Home. Character/palette/forms/footer were preserved. Long mobile checklists remain a Phase 5 orientation/UX concern, not a newly squeezed desktop form.
- Canonical aliases tested locally both slash variants for all nine legacy slashless tutorials; domain checks confirm 41 unique sitemap entries and no reciprocal redirect cycles. Cloudflare platform proxy behavior remains a deliberate Phase 11 live gate.
- No runtime dependency or heavy asset added. Build timing is an observed run, not a performance benchmark. Largest existing operations JS bundle remains approximately 167KB uncompressed; full startup/load/benchmark/bundle hardening is Phase 9.
- Tool sharing with a selected job still sends only the canonical page URL, with no job or customer payload.

Problems found and fixed:
- Initial nullable-job narrowing error: capture selected ID before lookup; final static checks pass.
- First full changed browser run: 198 passed, 48 skipped, six failures. Four were outdated neutral Billing URL assertions; changed to require the selected synthetic job ID and matching continuation tab. Two were real WebKit 320px Parts select overflow; measured and fixed as described above.
- Review found intake number/identity pickers needed to match the now-selected saved job and afterprint needed registration before print; fixed and covered.
- A moved ignored diagnostic .ts script was included by the existing broad tsconfig scan and caused two unresolved-relative-import check errors. Renamed the scratch source to .txt, then reran check and lint successfully. No tsconfig/security setting change. One intermediate browser run was explicitly interrupted before completion to avoid proceeding with the known overflow; it is not counted as passed.
- Final full browser run: zero failures. The final release runner initially printed check exit=1 before scratch cleanup; the subsequent independent check rerun returned exit=0 and the evidence log above is that successful final check. Application sources were unchanged by scratch cleanup.
- No new backend, schema change, analytics, diagnosis claim, raw audio attachment or customer-data sharing.

Commit: structural checkpoint containing this report, subject “Fix WorkshopGirl job context, printing and navigation structure”; resolve its exact hash with git log -1 --format=%H on codex/workshopgirl-v2. The parent handoff includes that hash.
Deployment state: not attempted in this first checkpoint.

## Phase entry template (required for remaining phases 7-11)

For each pending phase, replace its plan state and append:
- Objective
- Files changed
- Architecture decisions
- Implementation completed
- Tests executed (exact commands, timestamps and evidence)
- Results (passed/failed/skipped/not run)
- Problems found
- Problems fixed
- Commit
- Deployment state

## Final summary — reserved for completion of the entire program

Starting commit: 3bc271260bc2f191db403ea3f57fa2acbe256b7f.
Final deployed commit, total changed files, routes added/preserved, final six-item navigation, journey architecture, Workshop attachments/migration, Photo math/editor/worker/WASM strategy, tests/results, performance, six-viewport mobile evidence, deployment ID/URL and exact commit, production HTTP/browser results, known limitations and future ideas: FINAL DELIVERY PENDING PHASES 7-11; Phases 5-6 are recorded below.
Do not describe this Phases 2-4 checkpoint as the entire WorkshopGirl V2 implemented/deployed/verified.

## Phase 2 - information architecture

Objective: six clear destinations with real learning subjects and separate Workshop discovery, preserving every existing route.
Files changed: SiteHeader/SiteFooter, shared DiscoveryLayout/discovery.css; navigation/learn/content-order/stories and editorial date metadata; Learn/Tools indexes, new /stories/ and /workshop/; sitemap; WorkshopLayout current section; discovery domain/browser tests and updated structural/sitemap expectations.
Architecture decisions: a single typed header/footer registry maps legacy tutorial/story routes and /tools/workshop/* to their conceptual section. No mega menu; the existing mobile disclosure gets 44px links, Escape return, focus-out and resize handling. Learn groups are explicit many-to-many memberships over existing guide URLs (all five groups are nonempty). Tools keeps the old #workshop-operations anchor as a Workshop bridge, not nine primary tool cards. Photo Measure & Build discovery waits for the actual Phase 7 tool. Existing URLs, canonical values and local job context logic remain intact. New hubs extend the sitemap from 41 to 43 pages. ISO date fields derive from existing publication metadata; the project date is verified against its existing article:published_time 2026-09-22.
Implementation completed: Home/Learn/Tools/Workshop/Stories/About; Learn has 18 unique guides, Stories unifies all three existing sections, Workshop offers start/resume and separates four service stages from five support modules.
Tests executed 2026-10-03 around 01:19-01:24 UTC:
- npm run check: PASS, 150 files, zero errors/warnings, two unchanged execCommand hints; test-results/v2-phase2/check.log.
- npm run lint: PASS; test-results/v2-phase2/lint.log.
- npm test: PASS 193/193, zero skips; test-results/v2-phase2/unit.log.
- npm run build: PASS, 43 HTML pages, reported 1.84s; test-results/v2-phase2/build.log.
- npm run test:browser -- tests/discovery-browser.spec.ts --output=test-results/v2-phase2-browser-pass --reporter=line: PASS 8/8, no skips, 1.2m; test-results/v2-phase2/browser-pass.log. All six requested viewport sizes across Chromium/WebKit desktop/mobile, hidden/open menu, Enter/Space, focus/Tab (explicit focus for Windows WebKit system link-tab behavior), Escape, outside click/focus, current states, overflow, real Learn/Stories links and Workshop start.
Results: zero final failures, all 41 baseline routes retained; discovery screenshots saved beneath v2-phase2-browser-pass for Chromium desktop at all six sizes.
Problems found/fixed: sandbox denied generated Astro/file writes; authorized escalation used without ACL changes. Initial browser test used a role locator that omitted the collapsed mobile nav; corrected to its stable ID and reran all eight cases successfully. No application failure on that initial run. Existing legacy homepage expectations will be updated with the Phase 3 design and retested.
Commit: IA checkpoint, subject Organize WorkshopGirl discovery into Learn, Tools, Workshop and Stories; exact hash recorded by following phase.
Deployment state: not attempted; Phase 10 remains pending.

## Phase 3 - action-first homepage

Objective: useful next actions while retaining Workshop Girl's practical character and editorial identity.
Files changed: src/pages/index.astro, src/data/home-feed.ts, DiscoveryLayout social metadata, two responsive hero WebP assets, tests/browser.spec.ts and discovery.test.ts, this report.
Architecture decisions: keep the existing illustration/PNG/social image; derive 480px and 800px WebP variants locally with existing Sharp (no dependency change). Hero actions link straight to Engine, Learn and Intake. Three analyzer cards link directly to Engine/Sound/Speaker; three deliberately selected practical guides cover maintenance/drilling/electrical; Workshop start, Queue and support links follow. Latest content uses shared ISO dates across tutorials and all story types, stable canonical-slug ties, then an explicit three-card presentation limit. No duplicated activity-feed facts or array-position latest selection. Existing conditional GA configuration is retained; no tool bundle is loaded on Home.
Implementation completed: responsive action-first hero, direct tool entry, limited learning categories/cards, connected Start/Resume operations entry and date-sorted recent discovery.
Tests executed 2026-10-03 around 01:26-01:33 UTC:
- npm run lint: PASS; test-results/v2-phase3/lint.log.
- npm run check: PASS, 150 files, zero errors/warnings, two existing hints; test-results/v2-phase3/check.log.
- npm test: PASS 194/194, zero skips; test-results/v2-phase3/unit.log.
- npm run build: PASS; final crop build produced 43 pages in reported 1.35s; test-results/v2-phase3/build-final.log.
- npm run test:browser -- tests/browser.spec.ts tests/discovery-browser.spec.ts --grep="Homepage promotes|Discovery navigation" --output=test-results/v2-phase3-browser-final --reporter=line: PASS 8/8, no skips, 1.1m; test-results/v2-phase3/browser-final.log. Six required viewports in four browser projects; direct Engine/Intake transitions, bounded cards, focus, navigation/current states and no horizontal overflow. Additional home checks cover 320/375px.
Results: six final Home screenshots and discovery hub screenshots in test-results/v2-phase3-browser-final. Visual inspection of 390px and 1280px layouts plus corrected 390px crop. Hero source reduced from 2,638,000 bytes PNG to 81,742 bytes (480px) / 170,282 bytes (800px) WebP; srcset/sizes allows native browser choice. Other editorial images load lazily. These are asset observations, not Lighthouse/physical-phone certification; Phase 9 measures full startup/performance.
Problems found/fixed: initial mobile object-position cropped the face; moved to 8% vertical positioning, rebuilt and reran all eight selected browser cases. Legacy two-family homepage assertions replaced with the implemented direct-action behavior and retained index anchors.
Commit: homepage checkpoint, subject Make WorkshopGirl home action-first with direct tools and local jobs. Phase 2 commit is fed85286a03fb774b7376ad0478e5e5bf5f157d8.
Deployment state: not attempted; Phase 10 remains pending.

## Phase 4 - reusable contextual journeys

Objective: connect relevant learning, observations and local work without implying automatic mechanical diagnosis or nine mandatory service stages.
Files changed:
- src/data/journeys.ts and src/components/JourneyCards.astro (new typed registry, contextual mapping and reusable presentation).
- Engine Sound Analyzer; engine-air-filter, brake-pad, oil and spark-plug tutorial pages (one shared component per page).
- WorkshopLayout.astro, /workshop/ entry and workshop-operations.css (four stages and five support modules from the same typed workflow).
- tests/journeys.test.ts and journeys-browser.spec.ts; existing structural-browser.spec.ts and workshop-browser.spec.ts expectations for Stories/Workshop discovery.
- This execution report.

Architecture decisions:
- Tools use typed IDs, workshop actions use existing page IDs, learning references resolve real tutorial metadata. The registry is rendered at build time; no extra journey runtime, database, framework or storage migration is introduced.
- Engine explains comparable conditions, observation limits and that the maintenance guides are not analyzer repair recommendations. It offers Spark Plug, Air Filter and Oil learning plus optional intake for an inspection job. Spark Plug offers the analyzer, torque learning and optional inspection. Brake links torque learning and an inspection job; Oil offers a maintenance job. Existing-job workflow links are behind a native keyboard-accessible disclosure, with instructions to choose a local job or resume Queue. No implicit job is created or selected by a learning link.
- Visible contextual recommendations are bounded to four and omit the current page. Unsupported fault claims and irrelevant tool CTAs are absent. Start inspection/maintenance deliberately begins at the existing Intake form, so records and vehicle identity can be created before the actual Inspection page.
- workshopFlow has four explicit service stages; estimate/approval remain inside Inspection, QC/handover inside their real form. Queue/Parts/Procurement/Billing/History are separate unnumbered support navigation. All nine data-step-link IDs remain available within the shared navigation event boundary; Phase 1 validation, neutral links, selected-job context and canonical-only sharing remain unchanged.

Implementation completed: all Phase 4 engine/brake/oil/spark/operator paths and reusable components. The static Workshop hub is ready for Phase 5 local projections and actual job progress; analyzer attachments remain Phase 6.

Final tests executed 2026-10-03, approximately 01:36-01:50 UTC. Astro logs display host UTC+7; UTC timestamps here were checked against file LastWriteTimeUtc and Get-Date -AsUTC. Phase 2/3 timestamps above are corrected to UTC.

| Command | Final result | Evidence |
|---|---|---|
| npm run lint | PASS, exit 0 after legacy assertion updates | test-results/v2-phase4/lint-release.log |
| npm run check | PASS, exit 0; 154 files, zero errors/warnings, two unchanged hints | test-results/v2-phase4/check-release.log |
| npm test | PASS, exit 0; 199/199, zero skips | test-results/v2-phase4/unit-release.log |
| npm run build | PASS, exit 0; all 43 HTML pages, reported 1.39s | test-results/v2-phase4/build-release.log |
| npm run test:browser -- --output=test-results/v2-phase4-browser-release --reporter=line | PASS, exit 0; 220 passed, 48 existing WebKit Web Audio skips, 268 total, 7.5m; finished 01:48:36 UTC | test-results/v2-phase4/browser-release.log |

Results:
- Nine additional domain cases across Phases 2-4 (190 to 199). Four new browser scenarios across four projects add 16 passing cases (204 to 220); no new skips.
- Full legacy diagnostic regression (Sound/Engine/Speaker/DSP, PCM/worker cleanup, quality/repeatability/export) and workshop intake/approval/work/QC, Queue, context validation/deletion/change, printing/sharing, inventory, billing/payment/reversal, history/warranty and procurement/receiving passed.
- Required 390x844, 430x932, 768x1024, 1024x768, 1280x720 and 1440x900 layouts, menu Enter/Space/Tab/focus/Escape, current sections, no horizontal overflow, real taxonomy links and operator context passed in Chromium/WebKit desktop/mobile. Existing suites retain additional 320/375px checks.
- Final discovery/Home and selected Inspection screenshots are beneath test-results/v2-phase4-browser-release/discovery-browser-* and structural-browser-*. Six operator screenshots are beneath journeys-browser-operator-*; 390px/1280px visual inspection confirms separated navigation. Isolated engine-390.png and brakes-1280.png under test-results/v2-phase4 were visually reviewed for readable copy, bounded CTAs and disclosure layout. All evidence is ignored, not committed.
- Home build HTML is 17,905 bytes with one 911-byte inline menu module, no external analyzer/operations JS. Responsive hero assets remain 81,742/170,282 bytes; no dependency/lockfile changes or heavy processing assets. Full runtime/performance benchmarking remains Phase 9.
- Rechecked original C:\WorkShopGirl: main still 3bc271260bc2f191db403ea3f57fa2acbe256b7f, only original user audit untracked. Original/preserved audit SHA256 remains 4BD2BAE97ED0062E2A879C75D4E21EF8AEAA7ECC3DD15C9C8F08D489D1CC8A9C. No cleanup targets the parent test-results directory or worktree.

Problems found/fixed: first full run encountered three stale navigation expectations (top-level Sport and support cards on Tools). It was interrupted, the assertions were changed to Stories and the actual Tools-to-Workshop bridge, and the entire 268-case suite was rerun successfully. Application source was unchanged by those assertion corrections. Final lint/check/unit/build were rerun after the corrections. Visual crop correction is recorded in Phase 3. No unresolved new regression or blocker.

Commits:
- Phase 2: fed85286a03fb774b7376ad0478e5e5bf5f157d8.
- Phase 3: a3e2afdd4ea4e6add575e5d89944818d0be3db54.
- Phase 4: checkpoint containing this report, subject Connect WorkshopGirl maintenance journeys and separate service stages; exact hash is supplied in the parent handoff and can be resolved with git log -1 --format=%H at this checkpoint.

Deployment state: no push, integration or deployment in this task. Stop here for the parent review as explicitly delegated; parent continues Phases 5-11 autonomously. Remaining gates include Workshop local dashboard/empty states/progress, measurement attachments/migration, Photo Measurement Lab, wider editorial polish, performance/privacy hardening, deployment and live verification. Existing Windows WebKit audio limitations, two deprecated clipboard fallback hints, physical-device certification and live Cloudflare rewrite verification remain separately documented limitations/gates, not claims of completed V2 production delivery.

## Phase 5 - local Workshop application cohesion

Objective: make the existing Workshop hub and nine operations pages one understandable browser-local workflow.
Files changed: lib/workshop/dashboard.ts; components/workshop/dashboard.ts, navigation.ts, operations.ts, WorkshopLayout.astro; pages/workshop/index.astro; workshop-operations.css; playwright.config.ts; workshop-dashboard.test.ts; workshop-cohesion-browser.spec.ts; this report.
Architecture decisions: read-only dashboard projections reuse operationalStatus/nextWorkflowRoute, stockState, eligibleForDraft/outstanding and serviceHistory. Resume shows six most recently updated active jobs, with all jobs and waiting reasons in Queue. Cancelled and completed jobs are excluded from active counts; billing state remains independent of handover. Saved progress reports four actual stages, including incomplete checks and pending approval; supporting modules remain unnumbered. Clear/start/list links remain neutral. Browser profile/device-only storage and clearing-data consequences are visible throughout operations. Empty states give actionable next steps without invented records or cloud capabilities. Playwright default output is explicitly scoped to this checkout's test-results/playwright so cleanup cannot target the parent worktree.
Implementation completed: Start/Resume, active/waiting/stock-attention/draft/unpaid/ready-to-bill/history counts, stage progress, eight context-appropriate empty states plus existing Intake creation form, local storage notices. No domain status/approval/QC/payment rules changed.
Tests executed 2026-10-03 approximately 02:00-02:07 UTC:
- npm run lint: PASS; test-results/v2-phase5/lint.log.
- npm run check: PASS, 158 files, zero errors/warnings, two existing deprecated clipboard hints; test-results/v2-phase5/check.log.
- npm test: PASS 201/201, zero skips; test-results/v2-phase5/unit.log.
- npm run build: PASS 43 pages; test-results/v2-phase5/build.log.
- npm run test:browser -- tests/workshop-cohesion-browser.spec.ts tests/journeys-browser.spec.ts tests/structural-browser.spec.ts --output=test-results/v2-phase5-browser-pass --reporter=line: PASS 40/40, zero skips, 1.5m; test-results/v2-phase5/browser-pass.log. Four Chromium/WebKit desktop/mobile projects; six requested viewports, real synthetic Intake/resume, Enter navigation, neutral context, every empty view, legacy context/deleted IDs, print, sharing and menu accessibility. Full diagnostic/operations regression follows in Phase 6.
Results/evidence: six workshop screenshots beneath test-results/v2-phase5-browser-pass/workshop-cohesion-browser-*/. Visual review of 390px and 1280px confirms readable stacked/grid layout and no horizontal overflow. Only isolated synthetic browser profiles used.
Problems found/fixed: first 40-case run had four failures on duplicate empty-state links in Billing (36 passed). Source inspection found layout plus Billing both mounted operations; an idempotent mount guard prevents duplicate controls and event handlers. Rebuilt and reran all 40 successfully, then static/unit checks. Initial non-escalated Astro generation/evidence writes were denied by filesystem sandbox; authorized tool escalation succeeded without changing ACLs. No auto-review rejection.
Commit: dde0e79573f07d8ea305350d4024f248214ced15 (Unify local Workshop dashboard, progress and empty states).
Deployment state: no push or deploy. Phases 6-11 remain open.

## Phase 6 - Engine observation evidence and protected storage migration

Objective: explicitly capture and attach Engine Sound Analyzer observations to an existing active local job, or atomically start a new intake, with evidence available for inspection and work documentation.
Files changed:
- src/lib/workshop/model.ts, store.ts, observation-summary.ts and observations.ts.
- src/components/engine-analyzer/ObservationAttachment.astro, observation-attachment.ts, MeasurementPanel.astro and measurement-tools.ts.
- src/components/workshop/observation-view.ts, navigation.ts, operations.ts and WorkshopLayout.astro; sound-analyzer.css.
- tests/observation-fixtures.ts, workshop-observations.test.ts and workshop-observations-browser.spec.ts; existing workshop, queue, billing, procurement and complete workflow/browser fixtures and assertions.
- This execution report.

Architecture decisions and implementation completed:
- Capture freezes the actual current MeasuredEngineSnapshot and separate repeat summary for review. Only Save persists; repeated Cancel, selecting destinations, capture, changing reference controls, analysis and navigation do not attach records. Existing choices are active local jobs only; closed/cancelled jobs remain read-only. New intake requires deliberate customer name, plate and vehicle type; complaint is editable. Job plus observation are committed together, with no temporary persisted draft. Review Intake/Open Inspection links preserve only an encoded exact local job ID.
- summarizeEngineObservation calls the existing createMeasurementExport validator and assessEngineRepeatability. The explicit projection retains capture timestamp/source interval, source tool, engine/measurement/summary schema versions, user label/notes, acquisition mode/sample rate/FFT/window, manually supplied RPM/cylinders/cycle/harmonic reference, up to six peaks, bounded quality indicators/issues and bounded repeatability status/counts/reasons. It excludes PCM/raw audio/recordings, full spectrum/typed arrays, filenames, clock/device identifiers, browser-validation logs and automatic customer/vehicle details. Notes are user-entered and capped at 1,000 characters. Summaries must validate every scalar/list/allowed field, be at most 16,000 JSON characters and at most 24 per job. Excess records fail visibly; none are evicted.
- Evidence in Inspection and Work Order uses textContent and native disclosure controls, with explicit observe/compare/inspect limitations. It never writes a finding, recommendation, approval, workflow advance or fault diagnosis. Cleared, repeated, missing and deleted context hides evidence; raw note markup remains text. Other operations save the observation list unchanged, including full QC/handover/history and Billing/payment paths.
- Store schema becomes version 2 while retaining workshopgirl.workshop.operations.v1 as the storage key. Valid v1 records migrate in memory only; absent historical collections and observation lists initialize additively, stable IDs/links/ledger/financial/history records remain, and unknown additive fields are retained. No read automatically rewrites storage. Original v1 content remains until an explicit successful write.
- Damaged/unsupported/duplicate/orphan/nested-invalid records now block saving rather than silently filtering and later overwriting original records. Corrupt Procurement no longer disappears when an unrelated change is saved. A visible recovery notice accompanies an empty safe projection; raw records remain untouched. Valid legacy historical completion semantics remain unchanged.
- Attach rereads the latest local records, constructs a cloned candidate, validates it, checks the expected raw storage immediately before one atomic setItem, and returns success only after that call succeeds. Quota/access/migration/validation/deleted-target/duplicate/bound/conflict failures preserve original stored bytes, produce no partly created job, and retain the frozen review for retry/cancel. Known stale loaded-store saves are also rejected. Picker values are prefixed independently of the new-job action so a historical job ID such as __new__ cannot select the wrong action.
- No backend, login, cloud synchronization/backup, collaboration, dependency, lockfile, public route or audio acquisition change was added. Canonical sharing remains unchanged and excludes job/measurement/customer payloads. The existing URL context carries opaque encoded local IDs; record bodies and measurement summaries are never dispatched over the network.

Tests and evidence (2026-10-03 UTC):
- npm run lint: PASS, exit 0; test-results/v2-phase6/lint.log.
- npm run check: PASS, exit 0, 166 files, zero errors/warnings, two unchanged deprecated clipboard hints; test-results/v2-phase6/check.log.
- npm test: PASS, exit 0, 215/215, zero skips; test-results/v2-phase6/unit.log. Sixteen added domain cases across Phases 5-6 (199 to 215), with explicit old v1 intake/queue/inventory/history/billing/procurement fixtures, nonempty/unknown-field preservation, invalid collections/nested records/timestamps, unsupported versions, quota/access failures, stale snapshots, atomic new/existing attach, duplicate/bound/closed/deleted targets, deep-copy/privacy and nonfinite/large candidate rejection.
- npm run build: PASS, exit 0, all 43 HTML pages, reported 1.55s; test-results/v2-phase6/build.log. This is an observed build duration, not a performance benchmark. Current largest JS chunks include operations 118,214 bytes and shared store 40,774 bytes uncompressed; full startup/load/bundle hardening remains Phase 9.
- npm run test:browser -- tests/workshop-observations-browser.spec.ts tests/workshop-cohesion-browser.spec.ts --output=test-results/v2-phase6-browser-affected --reporter=line: PASS 24/24, zero skips, 48.9s, before the additional live scenario; test-results/v2-phase6/browser-affected.log.
- Final npm run test:browser -- --output=test-results/v2-phase6-browser-release-pass --reporter=line: PASS, exit 0; 248 passed, 48 existing WebKit Web Audio skips, 296 total, zero failures, 8.1m; finished 2026-10-03 02:46:40 UTC; test-results/v2-phase6/browser-release-pass.log. Four Chromium/WebKit desktop/mobile projects; 296 cases. Actual synthetic WAV and live microphone/worker flows exercise attachment in Chromium. WebKit cases explicitly verify unsupported-audio startup/disabled capture, stored evidence and damaged-storage workflows; they do not certify audio. The 48 existing WebKit Web Audio skips remain separately disclosed.
- Required viewports: 390x844, 430x932, 768x1024, 1024x768, 1280x720, 1440x900. Dashboard and stored evidence sweeps run in all four projects; actual capture UI sweeps run where AudioContext is available. Existing 320/375px operations checks remain. Native keyboard form selection, Enter/cancel/focus return, repeated cancel/navigation, shared menu Escape/current states, exact/neutral/deleted/repeated job context, safe raw-note display, persistence/reload, new intake, billing/history retention, no record dispatch and audio shutdown are covered.
- Final screenshots: test-results/v2-phase6-browser-release-pass/workshop-cohesion-browser-*/workshop-{390,430,768,1024,1280,1440}.png; workshop-observations-brow-5a997-*/attach-{width}.png and work-order-evidence.png; workshop-observations-brow-95b57-*/evidence-{width}.png; workshop-observations-brow-782e3-*/live-attached.png. Prior visual review covered 390px dashboard/capture/evidence and 1280px dashboard/evidence plus saved live confirmation. Screenshot/log/trace evidence stays ignored, not published.

Problems found and fixed:
- Three initial type errors (unknown-property narrowing in a callback, boolean/discriminated-result return, typed row cast) were corrected. Initial unit run had two obsolete version-1 expectations and one cross-storage snapshot comparison failure; v2 expectations/explicit v1 fixtures and storage-instance-aware origins now pass.
- The additional live browser test initially clicked the intentionally hidden mobile toolbar on desktop (23 passed, one failed); it now uses each viewport's visible start/stop controls. No acquisition change was made.
- Early full regression was intentionally interrupted during review to fix the historical-ID/new-action picker collision; it is not counted as passed. Collision behavior is covered with an actual legacy __new__ job ID.
- First completed full regression: 244 passed, 48 baseline skips, four failures, 8.2m; test-results/v2-phase6/browser-release.log. All failures were the same obsolete unique-link assertion across four projects: the new local history count and the existing support module correctly share a destination. Changed the assertion to the exact accessible Service History & Warranty support link, reran lint/check, then reran the entire suite. Application sources/build were unchanged by that final assertion fix.

Storage guarantees and limits:
- No automatic writes on read/capture/cancel and no silent destructive recovery. Failed migration/quota/access/attach saves leave original serialized records unchanged; attach candidates never mutate the caller's original records. Corrupt/unsupported data requires recovery from the original browser profile rather than automatic repair/replacement; no new recovery/import/backup feature is claimed.
- localStorage setItem is atomic for this record, and V2 rejects known stale snapshots; this is optimistic protection, not a multi-tab locking/collaboration service. Obsolete already-open V1 code cannot inherit V2 guards and should be reloaded. Downgrading the application/store schema is not supported.
- Observations are bounded scalar evidence with heuristic, uncalibrated signal quality/repeatability. No physical microphone/engine fault certification, cross-device synchronization, server backup, external RPM transport or calibrated SPL is claimed. The 48 Windows WebKit audio skips and two clipboard hints remain. Phase 9 covers performance/physical-device follow-up as available; live hosting/rewrite identity remains Phase 11.

Commits: Phase 5 dde0e79573f07d8ea305350d4024f248214ced15. Phase 6 checkpoint containing this entry, subject Attach bounded Engine observations to local jobs with safe migration; exact hash is supplied in the parent handoff and resolves with git log -1 --format=%H at this checkpoint. Phase 4 baseline was e127b2db3c7c6de008eb922b783c6137088b46a5.
Repository preservation: original C:\WorkShopGirl remains main at 3bc271260bc2f191db403ea3f57fa2acbe256b7f with only the original audit untracked. Original and preserved audit SHA256 remain 4BD2BAE97ED0062E2A879C75D4E21EF8AEAA7ECC3DD15C9C8F08D489D1CC8A9C. No user records, personal browser profile, parent test-results cleanup or original source edits were used. All QA uses synthetic isolated contexts. No auto-review rejection or unresolved credential blocker.
Deployment state: no push, merge or deployment, as delegated. Parent reviews this local Phase 6 checkpoint and continues Phases 7-11: Photo Measurement Lab; editorial/navigation polish; final regression/performance/privacy; normal production integration/deployment; live verification and final report.

## Phase 7 - Photo Measurement Lab local checkpoint

Objective: implement `/tools/photo-measurement/` as a useful local photo-calibration, planar-rectification, measurement, annotation and export tool. Baseline was clean `codex/workshopgirl-v2` at `f26a670487d5f602729926d79d427305d595bf1f` (Phases 5-6 complete), with 215 unit passes, 248 browser passes, 48 established Windows WebKit audio skips, two clipboard hints and 43 HTML pages. Earlier phases were preserved.

Files and architecture:
- New `src/lib/photo/{geometry,model,image,warp,processing.worker}.ts` separate finite metric geometry, bounded editing history/source-coordinate export, pre-decode header limits, bilinear projective sampling and local worker tasks.
- New `src/components/photo/{controller,render}.ts`, `src/pages/tools/photo-measurement/index.astro` and `src/styles/photo-measurement.css` supply responsive native controls, Canvas interaction, accessible exact-coordinate editing, clear errors/loading/cancel states and working-image PNG/JSON downloads.
- `src/data/journeys.ts`, `src/pages/tools/index.astro`, `src/pages/sitemap-0.xml.ts` register real Measure & Build discovery and the typed photo journey to clamps, jigsaw and drill-bit content. Existing header/footer route detection already marks Tools correctly. No unused/fake route, review, illustration, backend, account or user-data store was introduced.
- `tests/photo-fixtures.ts`, `photo-measurement.test.ts`, `photo-webp-header.test.ts`, `photo-measurement-browser.spec.ts`, route-count assertions in `journeys.test.ts`/`workshop-navigation.test.ts`, readiness/value guards in `workshop-browser.spec.ts`, the photo-only Firefox project in `playwright.config.ts`, `scripts/benchmark-photo.ts` and `benchmark:photo` in `package.json` supply reproducible evidence. No dependency or lockfile change.
- Detailed architecture, coordinate system, lifecycle, worker/WASM decision, bounds, exports and reproducible QA are in `docs/photo-measurement-lab.md`.

Requirement / DoD matrix:

| Requirement | Implemented behavior | Functional / mathematical evidence |
|---|---|---|
| 7.1 Local import | Picker, drop, mobile library; signature/header validation; JPEG/PNG/WebP; 20 MiB, 32 MP, 12,000 px bounds; 512 KiB header budget; corruption/unsupported/large errors; EXIF orientation | Programmatic grid, header limits, real JPEG colors under all eight orientations, WebP/drop/HTML filename and repeated cancel browser cases |
| 7.2 Calibration | Two endpoints + known distance in mm/cm/m/inch; internal mm; editable reference endpoints recalculate scale; explicit uncalibrated state | 100 px = 10 mm deterministic math and UI; conversion/area unit tests; native mouse/touch reference, coordinate edits and keyboard endpoint edits |
| 7.3 Perspective | Four ordered known-rectangle corners plus real width/height; normalized pivoted homography; inverse-mapped bilinear pixels; convexity/degeneracy checks | True projective-transform/interior/inverse tests, singular/concave/crossing/zero inputs, fractional-aspect metric test; trapezoid UI exports and warped-grid pixel checks in all engines |
| Geometry changes | Success clears old calibration, marks and edit history, keeps notes, initializes supplied rectangle scale; failed/cancelled work preserves completed edits; restore uses original File | UI invalidation, retained notes, disabled old Undo, source-point reversal, restored original and rejected collinear correction |
| 7.4 Measurements | Distance, vertex-second angle, polyline total, simple polygon area, stable center/edge radius and diameter | Independent 3-4-5 lengths, known acute/right/obtuse angles, concave area, path totals, circle radius/diameter, unit powers; actual UI/JSON/PNG values |
| 7.5 Annotation/editing | Labels/values, line/arrow/text, select, point/whole-line movement, label edits, delete, 80-state undo/redo; no image copies in history | Hostile-text display, pointer whole-line translation, touch handle movement, exact selected coordinates, native keyboard, deletion and button/keyboard undo/redo |
| 7.6 View | Anchored wheel/pinch zoom, pointer pan, center-preserving resize and fit/reset; device-pixel-ratio-aware CSS coordinates | View round-trip/anchor math; exported coordinates/values after native wheel, pan and resize; synthetic touch pinch preserves mark data |
| 7.7 Exports | Complete working-image annotated PNG; versioned JSON with both working/original oriented points, inverse geometry, calibration, display/MM values and notes; sanitized filenames | PNG signature/dimensions/annotation/warped pixels; exact source/unit/schema assertions; no image binary or view-crop dependency |
| 7.8 Privacy | Local decode/correction/drawing/export, tab-memory session; no upload or browser persistence; text-only user data rendering | Isolated synthetic contexts, no non-GET dispatch or localStorage writes, hostile filename/label/notes do not create DOM HTML |
| 7.9 Performance/lifecycle | Route-specific lazy worker, bounded downsample, transferred buffers, cancellation/timeout, bitmap/worker/Canvas/URL cleanup, serialized PNG exports | 24 MP large-image mapping/worker/URL/JS-heap benchmark; repeated cancellation/close/reload; empty-page startup assets |
| 7.10 Desktop/mobile | Responsive side panel/stacked controls, 44 px controls, native photo input, usable virtual handles | 390×844, 430×932, 768×1024, 1024×768, 1280×720, 1440×900 in Chromium desktop/mobile, Firefox and WebKit desktop/mobile; native emulated touch selection plus shared pinch/drag path |
| 7.11 Accessibility | Native labels/details/buttons, focus outlines, live status/errors, keyboard view/editing, text item list and exact-coordinate alternative; explained visual interpretation limits | Tab modality/focus, arrows, Enter/Escape/Delete, Ctrl/Shift-Z, native selects and point/label control tests; overflow checks and screenshots |
| 7.12 Guidance | How-to, accuracy/perspective/depth/lens/resolution/reference/point-placement limits and local privacy; critical dimensions checked physically | Built-in guidance, explicit same-plane/known-rectangle assumptions and no certified-metrology/recognition claim |
| 7.13 Journey/SEO | Actual Tools section/card, trailing-slash canonical and sitemap, Tools current state, bounded existing learning links | 44-route sitemap tests and legacy HTTP route sweep; native Tools-to-lab navigation, canonical/current-state and three journey links |

Worker/WASM decision: no OpenCV/WASM dependency. A small mathematical implementation is sufficient for a single known rectangular plane, is unit-testable and adds only route-specific assets. Decode and pixel sampling run in a new module worker on demand, with no worker on empty startup. Chromium/Firefox transfer a bitmap to worker OffscreenCanvas. Actual Windows WebKit does not expose OffscreenCanvas in its worker; its compatible path snapshots a bounded working Canvas, transfers its RGBA buffer to the same worker for projective sampling, receives a transferred buffer and constructs the result bitmap on the main thread. The fallback's bounded Canvas snapshot/bitmap conversion costs are disclosed and measured, rather than claiming all work is off-thread.

Limits: working image at most 4 MP / 2,400 px per edge; corrected rectangle at most 2,000 px per edge, aspect 1:20–20:1. One correction per original avoids chained resampling. Up to 200 marks, 200 points per path, 2,000 points total, 120-character labels and 2,000-character notes bound state/history. The oriented original dimensions and exact downsample ratios are preserved; export reverses rectification then downsampling. PNG intentionally uses the working raster and JSON preserves original oriented point coordinates. Original/full-resolution raster export, session JSON import/persistence, print/PDF, automatic detection/fitting, lens/depth correction, certified metrology, physical Android/iOS devices and measured native/GPU/process peak memory are not claimed.

Problems found and fixed during validation:
- Initial lint found one unused conditional expression; initial unit runs found old 43-route count/uniqueness assertions, now 44. New geometry tests passed; existing route assertions were updated without weakening canonical/legacy coverage.
- First photo run was interrupted to fix an exact-coordinate test helper toggling an already-open native details element. The second completed photo run was 11 pass / 9 fail: it exposed WebKit's absent worker OffscreenCanvas, native pointer quantization, mobile WebKit wheel automation limitations and Chromium mobile wheel delta scaling. Added the worker pixel-transfer fallback; tests now use an explicit two-CSS-pixel coordinate tolerance for native placement and use actual delivered wheel delta. Exact-coordinate/mathematical assertions remain strict. The third run was 19 pass / 1 fail on the old mobile wheel expectation; the fourth completed run passed 20/20 in 3.6 minutes, with all six layouts in all five projects and stronger orientation/warped-pixel assertions.
- Additional annotation-editing cases passed 5/5. Reference-focus tests initially incorrectly expected `:focus-visible` after pointer-modality programmatic focus (5 failures); explicit Tab keyboard modality now passes 5/5, including native emulated touch, reference-coordinate/handle edits and focus/arrow checks.
- Visual review corrected low-contrast export/selected button hover and overlapping dimension labels at shared endpoints. Label layout now uses CSS/backing-size-aware bounds, positions angles at their vertex and separates nearby labels without changing measurement geometry. Early full-regression attempts were interrupted to include this final renderer fix and its overflow guard; interrupted attempts are not counted as completed passes. The final aggregate is run against a rebuilt artifact newer than all application source changes.
- Initial benchmark preview failed because the Astro preview lock was active; its isolated preview now uses the existing project's `--ignore-lock` convention, reports startup errors and cleans its process. The benchmark was refined to run repeated close/open cycles in one document and report per-cycle post-GC JS heap, so reload cannot hide retained session objects.
- First completed full regression (`browser-checkpoint.log`): 271 passed, 48 baseline audio skips, 2 failures in existing WebKit-mobile Queue/Cancelled Work Order tests, 11.9 minutes. Reproduction traces show the tests selecting a static status while `data-workshop-mounted` was absent; module initialization then replaced Cancelled with the actual saved In progress value. A later handover input exhibited the same pre-mount interaction. Tests now wait for the existing mounted marker and verify actual selected values before proceeding, including the five handover sequences. Domain/controller/storage source is unchanged and exact approval/status/timeline/cancellation/completion assertions remain. This is synchronization with actual initialization, not retrying a save or loosening expected workflow state. Pre-initialization interaction hardening of the existing Workshop forms can be revisited by the parent in Phase 9.
- WebP coverage was strengthened with a locally generated metadata-free real VP8 fixture in every engine, independently of whether Canvas can encode WebP. A separate bounded VP8L-header test covers lossless dimensions before allocation. Keyboard Enter path finish and Delete/Undo of text annotations are also exercised explicitly.

Final validation (2026-10-03 UTC, rebuilt final application):
- `npm run lint`: PASS, exit 0; `test-results/v2-phase7/lint-final.log`.
- `npm run check`: PASS, exit 0, 183 files, zero errors/warnings and two unchanged deprecated clipboard hints; `test-results/v2-phase7/check-final.log`. A diagnostic trace's extracted incomplete TypeScript copies were initially included in Astro's scan; only that ignored trace's verified `src` child was removed, preserving the trace archive and worktree, then all checks restarted successfully.
- `npm test`: PASS, exit 0, 232/232, zero skips, including 17 new deterministic photo cases; `test-results/v2-phase7/unit-final.log`. Existing DSP, Engine, measurement, speaker, Workshop, storage and route tests remain green.
- `npm run build`: PASS, exit 0, 44 HTML pages, observed 1.84 seconds; `test-results/v2-phase7/build-final.log`.
- `npm run test:browser -- --output=test-results/v2-phase7-browser-final --reporter=line`: PASS, exit 0, 273 passed / 48 established WebKit Web Audio skips / 321 total / zero failures, 12.7 minutes, finished 04:21:38 UTC; `test-results/v2-phase7/browser-final.log`. This includes all 25 photo cases across Chromium desktop/mobile, Firefox and WebKit desktop/mobile and all prior relevant regressions. Two legacy timing scenarios also passed six targeted repeated runs after readiness fixes, `legacy-ready-final.log`.
- Six required viewport screenshots in every photo project: `test-results/v2-phase7-browser-final/photo-measurement-browser--f5436-*/photo-{390,430,768,1024,1280,1440}.png`. Rectified UI/PNG/grid evidence: `photo-measurement-browser--1229c-*/rectified-{ui,grid}.png` and `rectified.png`. Export files and cancellation/orientation screenshots are retained with their test evidence. Visual review covered 390px WebKit mobile, final-build 1280px Firefox and Chromium rectification; controls, guidance, labels and navigation remain readable without page overflow. Evidence is ignored local QA, not public content.

Isolated final benchmark (`npm run benchmark:photo`, exit 0, timestamp 2026-10-03T04:25:40Z): `test-results/v2-phase7/benchmark.json` and `benchmark-final.log`. Three sequential open/calibrate/measure/export/correct/export/close trials per engine in one document, using a synthetic uniform 6,000x4,000 PNG (24 MP, 79,868 encoded bytes), downsampled to 2,400x1,600. Export checks confirm 100 mm and the expected original x=3,000 coordinate. No competing browser regression ran during this measurement.

| Engine/version | Open ms, range | Correct ms, range | PNG ms, range | Maximum 16 ms timer gap, range |
|---|---:|---:|---:|---:|
| Chromium 153.0.8010.12 | 209.8-227.3 | 234.3-253.1 | 40.1-61.6 | 28.5-32.8 |
| Firefox 155.0 | 211.2-346.2 | 880.0-914.1 | 49.8-77.4 | 133-177 |
| WebKit 26.6 | 322.0-338.3 | 454.9-458.7 | 166.6-175.7 | 39-49 |

Metric definitions: open/correction/PNG are Node wall time from the triggering native control to visible success/download, including automation polling, local worker startup and scheduling. The heartbeat spans opening, control setup and correction, not an isolated pixel-loop frame measurement. Firefox's observed foreground gaps remain disclosed. A uniform compressed fixture does not represent every camera photo or physical mobile device.

Cleanup: zero live workers and zero tracked object URLs after each of all nine close cycles; no worker on empty lab startup, no route script/worker requested on Home, no worker fetched until processing. Chromium forced-GC JS heap was 1,376,876 bytes before the first image, then 2,327,092 / 2,360,144 / 2,397,868 bytes after the three close cycles (final separate GC 2,397,852; +1,020,976 versus empty baseline). Locator instrumentation is initialized before baseline; remaining first-use/JIT/cache/automation overhead is included. This is a three-cycle JS-heap observation, not proof of a long-term plateau or a native-memory peak. No zero-heap-growth claim is made. Native worker/browser/decoder/GPU/process memory is excluded; full 24 MP decoding may transiently require about 96 MB RGBA, with a 15.36 MB working bitmap and additional bounded correction buffers/bitmap. This is an estimated raster budget, not measured RSS.

Bundle/startup: lab route script `index.astro_astro_type_script_index_0_lang.DRfT9A9t.js` is 28,262 raw / 11,007 gzip bytes; lazy `processing.worker-ik2GDe1k.js` is 4,357 raw / 2,089 gzip bytes. Neither is referenced/requested by Home. Shared SiteHeader CSS is unchanged at 4,451 raw / 1,004 gzip bytes. Photo HTML is 21,646 bytes; Home remains 17,905 bytes. No dependency, WASM payload or global imaging bundle was added. Benchmarks were repeated to distinguish first locator-instrumentation initialization from application retention; application sources remained unchanged after the successful full regression.

Phase 7 status: required capabilities implemented and mathematically/functionally verified at this local checkpoint. No unresolved Phase 7 blocker. Known physical-device, planar/accuracy, working-raster and native-memory limitations are explicit above and in the lab documentation. Checkpoint commit subject: `Add local Photo Measurement Lab with calibrated geometry and perspective correction`; exact hash is supplied in the delegated handoff and resolves with `git log -1 --format=%H` at this checkpoint.

Repository preservation: original `C:\WorkShopGirl` remains `main` at `3bc271260bc2f191db403ea3f57fa2acbe256b7f`, with only the original user audit untracked. Original and preserved audit SHA256 remain `4BD2BAE97ED0062E2A879C75D4E21EF8AEAA7ECC3DD15C9C8F08D489D1CC8A9C`. Playwright outputs are explicit children of this checkout's `test-results`; no cleanup targets its parent or this worktree. All data/images used for QA are synthetic isolated profiles. No push, merge or deployment in this delegated task; parent reviews Phase 7 and continues Phases 8–11.

## Phase 8 - Content, taxonomy, journeys and original-image polish

Baseline: clean `codex/workshopgirl-v2` at `0bdd0dc5b5e297b73bffb58fa0d2a5de278e1e7f`. Full master program and as-is audit were reread; no applicable AGENTS.md exists in the checkout/source/docs/tests or ancestors. No skill is needed for this repository-native Astro/TypeScript work or the reuse/inspection of existing artwork. No subagents, generated character, Library deliverable, backend or third-party publishing workflow was introduced.

Implemented:
- `src/data/tutorial-taxonomy.ts` gives all 18 existing tutorials stable subjects (Automotive & Maintenance, Woodworking, Electrical & Electronics, Power Tools, Hand Tools, Reference). `learn.ts` derives membership from that one mapping; five populated discovery sections and the four real reference explainers remain. `tutorials.ts`, all article section metadata/available Article schemas, and reusable `TutorialTopics.astro` share labels. Subject links lead to the existing Learn anchors. Existing slashless/slash canonicals and editorial content remain intact; no duplicate article routes.
- `journeys.ts`/`JourneyCards.astro` normalize route lookup for both aliases and extend bounded recommendations to cutting/drilling, meter/solder checks, battery/wheel visits, audio comparisons, DSP validation, the stuck-fastener diary and motorcycle project. The photo destination is labelled Measure. All destinations are real, exclude the current page, and stay at four recommendations or fewer. The climbing article receives no unrelated workshop CTA. Existing Engine/brakes/oil/spark workflows and observation-only language remain.
- The Photo Lab now uses the shared ToolShare control, sending only its static canonical/title/description. Optional homepage GA configuration uses a fixed canonical location and referrer origin/path, excluding queries/fragments and disabling Google signals/ad personalization. Tools/Workshop have no GA initialization. The optional GA guard is executed under synthetic query/referrer inputs by `tests/home-privacy.test.ts`.
- Original hero WebP pixels (800x1200) and the existing multimeter artwork (1672x941) were inspected directly. No image file was changed or generated. Hero sizing now preserves the 2:3 full-body composition on mobile/desktop; discovery cards contain rather than crop the existing editorial images. Existing face, body, workwear and workshop imagery remain. Rendered Chromium-mobile 390px character and Firefox-desktop 1280px Home were inspected. Full-page screenshots initially showed unloaded below-fold lazy cards; final QA now scrolls through Home images and verifies real decode before capturing them, without changing production lazy loading.
- No invented reviews, tested-product claims, affiliate links or empty review archive was published. Future verified reviews can extend the typed taxonomy/journey model when actual editorial content exists; no speculative template was needed.

Files: taxonomy/learning/tutorial metadata and component; journeys and shared journey component; all 18 existing tutorial pages; Sound/Speaker/DSP/Photo pages; bolt diary/motorcycle project; Home/discovery styles; `tutorial-taxonomy.test.ts` and `home-privacy.test.ts`. No public image, route, dependency or lockfile change.

Validation at this content checkpoint: lint PASS; Astro/TS PASS (186 files, zero errors/warnings, two established clipboard hints); unit/domain PASS 236/236 including taxonomy coverage, alias lookup, privacy and rollback tests; static production build PASS (44 HTML pages, 1.42s reported final rebuild); site audit PASS (44 unique canonicals/sitemap entries, 1,087 local links, 202 asset references, no missing targets/anchors/assets/duplicate IDs/noindex). Evidence under `test-results/v2-phase9/{lint-final,check-final,unit-final,build-final,site-audit}.log` and `site-audit.json`.

Scope clarification: those checks measured the combined working tree while Phase 9 hardening was already underway, including its additional rollback case. Phase 8 itself adds three unit cases to 232; the combined final checkpoint adds the fourth. No isolated clean-Phase-8-only 236-case run is claimed. Final combined source is rechecked and committed under Phase 9 below.

Focused browser run: 25 passed / 10 failed, 6.3m. All five-engine taxonomy, six-viewport natural-character/overflow, delayed initialization and quota-retention cases passed. Failures were five new privacy tests expecting a nonexistent Photo share control and five PO print-layout failures caused by a new initialization wrapper. The Photo control was added and the wrapper removed while retaining native inert gating on main; recheck `browser-fixes.log` passed 10/10 in 42.6s. These initial failures are disclosed and not counted as a passing full regression. Complete 420-test cross-engine regression is running at the Phase 8 checkpoint; Phase 9 below will record its final result and performance/security conclusions.

Preservation: original root main remains `3bc271260bc2f191db403ea3f57fa2acbe256b7f` with only the user audit untracked. Both audit copies remain SHA256 `4BD2BAE97ED0062E2A879C75D4E21EF8AEAA7ECC3DD15C9C8F08D489D1CC8A9C`. All browser profiles/data are isolated/synthetic. QA output paths are explicit children of this checkout; no cleanup targets its parent. Permission escalation was used for authorized worktree writes/check evidence because sandbox directory creation was denied; automatic review approved it, with no rejection or ACL/config change. No push, merge or deployment. Phase 8 commit subject: `Normalize learning taxonomy and extend contextual journeys`; its exact SHA is recorded in the Phase 9 handoff entry.

## Phase 9 - final acceptance audit and pre-release hardening

Objective: check every mandatory Phase 0-8 requirement against actual source, deterministic tests and rendered output; close gaps and hand the parent a tested local checkpoint for Phases 10-11. Delegated starting HEAD was clean `0bdd0dc5b5e297b73bffb58fa0d2a5de278e1e7f`, with 232 unit passes, 273 browser passes, 48 established Windows WebKit audio skips and 44 pages. This entry supersedes earlier pending statements about Phases 7-9; it does not claim production delivery.

Files changed in Phase 9:
- `WorkshopLayout.astro`, `operations.ts`, `parts-inventory.ts`, `billing.ts`, `service-history.ts`, `procurement.ts`, `lib/workshop/store.ts` and shared `ToolShare.astro`.
- Full Firefox project in `playwright.config.ts`; generated-output exclusions in `tsconfig.json`; actual pending-permission readiness in `audio-fixtures.ts` and the Sound/Engine/Speaker cancellation cases.
- New `phase9-browser.spec.ts`, clone-origin domain case in `workshop-observations.test.ts`, stronger PO print assertion in `workshop-procurement-browser.spec.ts`.
- New `scripts/audit-site.ts`, `scripts/benchmark-release.ts`, configurable repetitions/evidence directory in `scripts/benchmark-photo.ts`, corresponding npm scripts, Photo documentation and this report. Dependencies and lockfile unchanged.

Architecture decisions and defects fixed:
- Workshop main remains inert and busy until its local modules, old records, forms and handlers are initialized. Existing main/print DOM hierarchy is retained. The initialization marker is set only on completion, with the existing idempotent guard; no early edit can be overwritten by arriving initialization. Slow-module browser tests check focus/input exclusion and lossless v1 loading.
- Generic workflow saves restore customers/vehicles/jobs in place from the last successful snapshot on quota/access/validation/conflict failure, preserving object identities held by form callbacks. Failed new intake is removed from the in-memory candidate; repeated retry creates exactly one job and retains entered fields. Parts restore the candidate on failure and clear part/movement forms only after success; retries produce one part and one movement, with the correct balance.
- `cloneStore` carries the original storage-instance/raw-snapshot/read-only metadata through rollback clones. Billing/history retries therefore keep stale-tab and corrupt-record guards. This is optimistic concurrency protection, not locking or multi-user synchronization.
- PO print content and print class are enabled before `window.print()`, then cleared by `afterprint`. A one-second timer no longer hides a document while the dialog is open. The test verifies visibility at actual invocation and print CSS; it does not certify a physical printer or OS PDF dialog.
- All shared Share tool buttons have a 44 px minimum height, contrast and visible keyboard focus. Photo uses the same fixed canonical sharing as other tools.
- Firefox now executes the entire suite, rather than Photo only. The expanded suite exposed a synthetic-microphone fixture race: a call count advanced before asynchronous source setup supplied its resolver. Tests now wait for the actual new resolver and track; resolver state resets per request. Cancellation/resource assertions remain intact, and no application audio behavior or skip policy was weakened.

### Mandatory Phase 0-7 acceptance matrix

PASS below means implemented and verified within the stated local/synthetic scope. The dependency audit exception, physical-device limits and production gates are listed separately; they are not silently converted to passes. Existing detailed Phase 7 math/pixel matrix above remains applicable.

| PRD requirement | Audited implementation | Evidence / disposition |
|---|---|---|
| 0 Repository, branch, HEAD, cleanliness, scripts, deployment, existing tests/performance/routing/navigation/home/store/diagnostics/breakpoints | Isolated worktree and unchanged root; static Astro; explicit routes/XML; typed local store; Workers/Web Audio/Canvas; all relevant responsive rules and hosting configurations inspected | Baseline entries above; final lint/check/unit/build/browser and root/audit recheck; no production connection inferred from config. PASS |
| 1.1 Exact valid job context across nine views, missing/deleted/malformed/repeated IDs, switching and neutral links | `lib/workshop/navigation.ts`, shared client navigation, explicit stage/support continuations | `workshop-navigation.test.ts`, `structural-browser.spec.ts`, `journeys-browser.spec.ts`, observation deletion/context tests. PASS |
| 1.2 Live generic or record-specific print actions | Intake/inspection/work/QC records; queue/parts summaries; history/billing/procurement dedicated actions | Structural print tests, full billing/history/PO flows, invocation-time PO visibility and afterprint checks. PASS within browser print/CSS scope |
| 1.3 Header/footer legacy Sport, active states, keyboard/mobile accessibility | Shared typed six-item main navigation; Sport remains reachable under Stories and footer; current state derived from exact route families | `discovery.test.ts`, six-size structural/discovery browser tests, Escape/focus/Enter/skip-link. PASS |
| 1.4 Existing URL/slash aliases/canonical behavior | Legacy URLs retained; intentional original slashless canonicals retained; exact Cloudflare proxy rules avoid broad looping redirects | Structural legacy alias HTTP tests and 44-page canonical/link audit. PASS locally; live hosting rules require Phase 11 |
| 1.5 Tools metadata; 1.6 obsolete opening-soon | Digital Workbench metadata and working product copy | Structural copy/metadata assertions; generated HTML inspection. PASS |
| 2 Six main sections and real nonempty Learn groups | `siteNavigation`, typed learning groups, real Reference articles; /tutorials/ labelled Learn | Discovery domain/browser tests; all 18 article subject metadata; no fake category/page. PASS |
| 2 Tools/workflow conceptual separation, original routes, Stories legacy discovery, About | Tools has four diagnostics plus Photo; Workshop hub links all nine existing operations; Stories discovers Diary/Projects/Sport | Tools-to-Workshop bridge and exact legacy links; sitemap contains all 41 original pages plus /workshop/, /stories/, Photo. PASS |
| 2 Desktop/mobile touch, hierarchy, focus and six widths | Shared small mobile disclosure, accessible current page, Escape/focus return, no mega-menu | Chromium/Firefox/WebKit desktop and Chromium/WebKit mobile projects; six viewport sweeps and intentionally scrollable technical areas. PASS for emulation |
| 3 Action-first hero, consistent character, direct diagnostic/Workshop entry | Existing hero assets retained; Analyze/Learn/Start Job actions; direct Engine/Sound/Speaker links and Start/Queue/Parts/Billing/History | `discovery.test.ts`, discovery/browser/Phase9 checks; actual source pixels and Home renders inspected. PASS |
| 3 Useful limited learning/latest sorted by date, mobile weight/typography/cards | `home-feed.ts` derives three chosen learning guides and stable date-sorted latest content; stacked actions and natural image ratios | Date/tie domain tests; six-size overflow/character tests; local startup/resource measurements below. PASS with existing image-weight limitation disclosed |
| 4 Typed reusable contextual journeys, responsible Engine flow | `journeys.ts`, `JourneyCards.astro`, route IDs/aliases; bounded Learn/Analyze/Measure/Workshop links and observational copy | Journey domain/browser tests; no self-link, missing route or more than four CTAs; actual 18-article metadata sweep. PASS |
| 4 Brake/oil/spark maintenance and operator workflow | Relevant guides lead to torque/Engine/optional intake; intake -> inspection/approval -> work -> QC; support modules unnumbered | Journey browser tests and full operations flow. PASS |
| 5 Local Start/Resume, waiting/parts/billing/history dashboard | `dashboard.ts` projects only local queue/stock/invoice/completed data; real recent jobs and counts | `workshop-dashboard.test.ts`, `workshop-cohesion-browser.spec.ts`. PASS; no fake cloud statistics |
| 5 Actual four-stage progress, separate support, actionable empties, local-storage clarity | Layout/navigation and eight empty views plus Intake form; browser/profile/device and clearing-data notice | Cohesion/browser tests, exact/neutral contexts and six-size screenshots. PASS |
| 6 Explicit Engine capture/review/attach existing or atomically new job | Existing serializer/quality/repeatability summarized; Save only persists; review/cancel never writes | Observation unit/browser cases with synthetic file and live microphone in supported engines, repeated cancel/deleted targets. PASS within supported audio scope |
| 6 Bounded timestamp/context/manual RPM/peaks/quality/repeats/notes/schema/tool, no raw audio/binaries/customer projection | Validated scalar allowlist, 16,000-character maximum summary, 24 observations/job, six peaks; no eviction | `workshop-observations.test.ts` serialization/privacy/bounds cases; UI retrieval in Inspection/Work Order. PASS |
| 6 Evidence remains observational and survives operations/billing/history | Text-only disclosures; no automatic finding/fault/approval/status change | Hostile note display, exact context, full handover/history/billing preservation. PASS |
| 6 Versioned lossless migration, malformed data/read-only, no silent wipe | v2 under original v1 key; read-only in-memory migration; unknown additive fields retained; corrupt/unsupported/duplicate/orphan data blocks writes | Earliest/nonempty v1 fixtures, nested-invalid/financial/procurement data, quota/access/stale/clone-origin tests; byte-identical failed saves. PASS |
| 7.1 Local JPEG/PNG/WebP picker/drop/mobile library, limits/corruption/EXIF | Predecode signature/header limits; 20 MiB, 32 MP, 12,000 px and 512 KiB read bound | Deterministic headers, real WebP, all eight JPEG orientations with color/dimension checks, hostile names, invalid/huge/drop/repeated cancel. PASS |
| 7.2 Two-point known reference, mm/cm/m/inch, accuracy limits | Internal millimetres, editable endpoints recalculate scale; explicit uncalibrated output and common-plane assumptions | Four-unit distance/area conversion tests, 100 px = 10 mm grid, native mouse/emulated touch/keyboard reference. PASS |
| 7.3 Local known-plane correction, valid geometry, bundle decision | Four known-rectangle corners + both dimensions; normalized/invertible homography and bilinear pixels; lazy worker, no OpenCV/WASM | Independent true homography/interior/inverse/fractional aspect tests; degeneracy/concavity/crossing rejection; warped grid pixel/200 mm/90-degree/source-point checks. PASS |
| 7.4 Distance/angle/polyline/area/circle | Independent geometry with second-point angle vertex, simple polygon, center/edge circle | 3-4-5 distance; acute/right/obtuse/180 angles; concave area; polyline; r/diameter; null uncalibrated measurements; actual JSON values. PASS |
| 7.5 Labels/arrows/lines/text/dimensions/select/move/delete/undo/redo | Text rendering, point and whole-line movement, labels, bounded 80-state deep-copy history | UI and exported geometry after pointer/touch/coordinate/keyboard changes; deletion/undo/redo; hostile labels create no HTML. PASS |
| 7.6 Zoom/pan/reset, coordinates independent of view | Anchor zoom, pointer pan, pinch/midpoint translation, centered resize, CSS/DPR mapping | Pure inverse/anchor math; actual exported values after wheel/pan/resize/touch/pinch; native input tolerance accounts for CSS quantization. PASS for emulated interactions |
| 7.7 Local annotated PNG and machine-readable JSON | Full working raster; schema/version/reference/measurement/notes plus inverse-mapped oriented original points; safe download names | PNG dimensions/annotation/rectified pixels and JSON numeric/schema/source assertions. PASS; original-resolution PNG and print/PDF optional and not implemented |
| 7.8 No image upload; local privacy messaging | Tab-memory only, native decode/Canvas/worker/local downloads, no persistence/analytics or imaging service | No non-GET dispatch/localStorage writes; sentinel request URL/header/body/share checks. PASS for image/audio/record content; opaque navigation IDs caveat below |
| 7.9 Bounded large images/downsample/mapping/lazy bundles/cleanup | Working 4 MP/2,400-edge, correction 2,000-edge, transferred buffers, worker task termination, bitmap/canvas/URL cleanup | 30 large-image cycles, inverse-source dimensions and correct scale/exports, zero workers/URLs after each close; supported JS-heap measurement below. PASS for verified resources; native peak/leak certification not claimed |
| 7.10 Desktop/mobile calibration/handles/view/measurement/undo/export/touch sizes | Responsive stacked/sidebar native controls, min44px buttons, 18px handle radius | Six viewport grid/measurement/exports in all five projects, native emulated touch and synthetic pointer/pinch path. PASS locally; physical devices remain unverified |
| 7.11 Accessible labels/focus/keyboard/contrast/explanation | Native controls/details, live status/errors, focus outlines, text mark list, exact-coordinate alternative and canvas explanation | Tab/arrows/Enter/Escape/Delete/Ctrl-Z/Shift-Z and native selectors; rendered mobile/tablet/desktop review. PASS within browser checks; no screen-reader/photo-interpretation certification |
| 7.12 Built-in guidance/local accuracy/best practices | Same plane, known rectangle, reference/lens/depth/resolution/placement and physical critical-dimension check | Page prose plus `docs/photo-measurement-lab.md`; no metrology/automatic detection/fault diagnosis claim. PASS |
| 7.13 Real contextual learning discovery | Photo <-> clamp/jigsaw/drill-bit guides and additional cutting/drilling journeys | Exact journey/link tests, Tools current state, canonical and sitemap audit. PASS |

Phase 8 acceptance: shared typed six-subject taxonomy covers all 18 articles, consistent eyebrow/article:section/available Article JSON-LD articleSection; Learn has five nonempty discovery groups and four existing Reference pages. Contextual tool/article/Diary/Project journeys reuse the same component and stay bounded. Sport has no irrelevant tool recommendation. No review, affiliate link, fabricated test claim, empty future page, URL or image replacement was published. Future verified reviews can be placed under the existing Learn/Reference model when evidence exists; no speculative review template was needed.

### Final verification and evidence

Evidence is ignored under this checkout's `test-results/v2-phase9` and explicitly named browser output directories; no cleanup addresses the enclosing worktree. All records/media are synthetic in isolated profiles.

| Command / gate | Result / supporting evidence |
|---|---|
| `npm run lint` | PASS, exit 0; `lint-final.log` |
| `npm run check` | PASS, 186 files, zero errors/warnings; two established execCommand clipboard deprecation hints; `check-final.log` |
| `npm test` | PASS 236/236, zero skipped/cancelled; `unit-final.log`. Phase 8-9 add four cases over the delegated 232 baseline: two taxonomy, optional-GA privacy and clone-origin protection |
| `npm run build` | PASS, all 44 HTML pages, 1.43 s reported; `build-final.log`. Observed local build duration is not a runtime performance score |
| `npm run audit:site` | PASS: 44 HTML pages/44 unique sitemap canonicals, 1,087 internal links, 202 local image/script/style references; no missing target/anchor/asset, duplicate ID, missing metadata or accidental noindex/nofollow; `site-audit.json` |
| Full browser regression | PASS, exit 0: 372 passed, 48 established WebKit audio skips, 420 total, zero failures/flaky, 16.4 min; started 2026-10-03T05:21:40.842Z; `browser-release.log`, `browser-results.json`, `test-results/v2-phase9-browser-release` |
| Targeted final permission/privacy | PASS 12/12, 23.5 s, Chromium desktop/mobile and Firefox; `permission-verified.log` |
| `npm run benchmark:release` | PASS 36 fresh-context route/engine trials; `startup-benchmark-final.log`, `startup-benchmark.json` |
| `WG_QA_DIR=test-results/v2-phase9`, `WG_PHOTO_TRIALS=10`, `npm run benchmark:photo` | PASS 30 image/correction/export/close trials; `benchmark-photo-final.log`, `benchmark.json`, each engine's ten JSON reports |
| Existing DSP/V3/Speaker benchmarks | All PASS; `benchmark-dsp.log`, `benchmark-v3.log`, `benchmark-speaker.log` |
| `npm audit --json` | FAIL, exit 1: 7 high dependency-tree findings, 0 critical, rooted in two advisories with no patched release; `dependency-audit.json`, explanation below |
| Installed dependency inventory | `npm ls --depth=0` exit 0; existing shared node_modules junction has extraneous root-installed packages. This is not a hermetic npm-ci verification; `dependencies.log` |
| Secret check | 280 tracked/nonignored new files, 214 text files; private-key/AWS/GitHub/live-key pattern scan has zero findings. Existing public assets and lockfiles are unchanged. `.env.example` has an empty GA value; no real credentials added. `secret-scan.json`; scope is a pattern scan, not a formal penetration test |

Domain coverage includes navigation/journeys/discovery, Workshop stock/queue/procurement/billing/warranty/history/QC/duration/odometer, old schema/attachment/atomic quota/access/conflict, acquisition/DSP/engine/speaker/quality/repeatability/export, Photo geometry/calibration/units/transforms/pixels/header/schema/history. Browser coverage retains repeated/interrupted/cancel/reset/error/background/navigation cleanup, permission races, runtime Worklet/Worker fallback, stock/order/payment/history and observation workflows, plus all deterministic Photo tools and exports.

Problems found during Phase 9 verification, with dispositions:
- Initial focused run: 25 passed/10 failed; five PO print failures from an initialization wrapper and five missing Photo-share expectations. Removed wrapper, preserved main inert gating, added fixed Photo share; all ten affected cases passed on rerun. These are not counted as full-regression passes.
- The first 420-case run was intentionally interrupted after discovering the synthetic Firefox permission resolver race and the undersized newly added share control. Evidence `browser-final.log` remains; it is not a passing full run. Final actual-resolver helpers passed all 12 targeted cases before restarting all 420 tests.
- Hard-stopping that runner left its owned preview processes on port 4379. One subsequent targeted command stopped at server bootstrap (`permission-final.log`), executing no tests. Verified exact worktree Astro/npm command lines and PIDs, stopped only those owned processes, then reran successfully. No unrelated/user server was terminated.
- QA trace source copies were being included in AstroTS inspection; exclude generated `dist`, `test-results` and `playwright-report`. One new benchmark Performance API type mismatch was corrected using `window.performance` in the page context. Final check has no errors/warnings.

### Rendered identity, responsive and accessibility review

Inspected actual original hero WebP pixels (800x1,200) and original multimeter article pixels (1,672x941), then rendered Home/Photo/Workshop/observation views. Existing face/body, workshop setting and artwork are retained; no new character generation, facial edit, asset replacement or fake review imagery. Hero is intrinsic 2:3 with contain at all sizes; cards retain natural 1,672:941 framing rather than stretching or cropping the character. Mobile retains the full original body. The original corner radius and caption overlay remain decorative and do not distort proportions.

Six exact sizes: 390x844, 430x932, 768x1024, 1024x768, 1280x720, 1440x900. Full suites use Chromium desktop/mobile, full Firefox desktop, WebKit desktop/mobile; size sweeps occur within each project, including Photo. Additional older 320/375 checks remain. Verified header disclosure/current-state/keyboard/Escape focus, skip links, cards/forms/tables, Workshop context/empties/progress, analyzer attachment panels and Photo reference/handles/measurements/editing/view/export. Technical tables/panels intentionally scroll locally; pages have no horizontal overflow.

Final screenshots are in `test-results/v2-phase9-browser-release`: `phase9-browser-Existing-*/character-{390,430,768,1024,1280,1440}.png` and `home-{390,1280}.png`; `discovery-browser-*/discovery-{width}-{section}.png`; `workshop-cohesion-browser-*/workshop-{width}.png`; `workshop-observations-*/attach-{width}.png`, `evidence-{width}.png`, `work-order-evidence.png` and `live-attached.png` in supported engines; `photo-measurement-browser-*/photo-{width}.png`, `rectified-ui.png`, deterministic PNG/JSON exports; existing Sound/Engine/Speaker images. Home tests scroll/decode each lazy image before full-page capture, avoiding screenshots of unloaded alt text. Actual final Chromium mobile portrait, 1280 Home and 768 Photo renders were visually reviewed, in addition to earlier Firefox desktop and mobile comparisons. These are screenshots of the running built application, not mockups.

### Performance, bundle and memory scope

All final startup trials ran separately from CPU/image benchmarks and browser regression. Local Windows production preview, no CPU/network throttle, desktop 1280x720, three new isolated contexts per route/engine. External Google fonts are live. DCL/FCP/LCP are measured where supported through 500 ms after load; unobserved/unsupported is null. Node load time includes automation and local scheduling. Cross-origin resource transfer zero does not mean no request. This is not Lighthouse, production network latency or phone certification.

| Engine | Home load wall ms | Tools load wall ms | Engine Analyzer load wall ms | Photo load wall ms |
|---|---:|---:|---:|---:|
| Chromium | 238.6-263.8 | 252.2-265.9 | 287.6-321.2 | 320.8-457.4 |
| Firefox | 245.7-516.2 | 266.3-383.9 | 288.8-471.4 | 290.7-467.4 |
| WebKit | 41.3-122.4 | 46.1-55.3 | 143.1-161.9 | 44.5-100.6 |

Observed FCP ranges (ms), Home/Tools/Engine/Photo respectively: Chromium 164-176 / 136-156 / 168-188 / 164-184; Firefox 147-346 / 151-152 / 192-208 / 160-200; WebKit 45-126 / 49-57 / 99-162 / 68-114. Raw DCL/load/LCP/resources/long-task availability and all trials are in `startup-benchmark.json`; do not reinterpret a missing unsupported observer as zero tasks.

Home/Tools request no external application JS chunks (shared header behavior is inline). Engine requests its six relevant analyzer/live/store/rules/download chunks. Photo requests its own script and starts no worker until an image operation. All 36 empty-startup cases have zero workers. Photo script stays 28,262 raw / 11,007 gzip bytes; processing worker 4,357 / 2,089; header CSS 4,451 / 1,004. Photo HTML with sharing is 23,693 bytes; Home 17,898. No global OpenCV/WASM, Photo processor on Home, or new dependency.

Existing Home responsive hero files remain 81,742/170,282 bytes; cards are native lazy images. Chromium's generous lazy-load distance nevertheless requested below-fold cards (including an existing 2,206,238-byte angle-grinder PNG), bringing sampled encoded resource bytes to about 3.49 MB; Firefox/WebKit sampled substantially fewer below-fold images. Thus lazy does not promise a strict byte budget. Converting/resizing existing article artwork into smaller card derivatives is a useful future optimization; no measured mobile network budget or zero-cost imagery claim is made.

Photo large-image fixture: uniform synthetic 6,000x4,000 PNG, 79,868 encoded bytes, 24 MP -> 2,400x1,600 working pixels. Ten cycles per engine in one document, real calibration/inverse source-point checks, metric rectification and PNG/JSON export. Encoded compressibility means it is not representative of every complex photograph.

| Engine | Open ms | Correct ms | PNG ms | Largest foreground 16 ms heartbeat interval ms |
|---|---:|---:|---:|---:|
| Chromium | 212.9-225.4 | 227.2-257.4 | 31.5-53.3 | 26.5-34.0 |
| Firefox | 207.3-356.6 | 882.6-919.7 | 43.3-79.4 | 131-188 |
| WebKit | 320.8-342.7 | 451.7-540.6 | 165.6-180.6 | 36-49 |

Timing is Node action-to-UI/download wall time, including automation polling, decode/worker startup/buffer fallback/scheduling. Heartbeat spans open/setup/correction, not an isolated pixel-loop or animation-frame benchmark. Firefox's longer foreground gaps are disclosed. Rectification pixel loops are in workers; WebKit's bounded snapshot/bitmap fallback has synchronous UI cost. All 30 closes retained zero Worker objects and zero tracked download object URLs.

Chromium post-forced-GC page JS heap: baseline 1,379,808 bytes; after first close 2,330,024; after tenth 2,573,148; final separate GC 2,573,132. Growth over empty baseline is 1,193,324 bytes; about 243 KB accrues after the first cycle. Do not claim a plateau, zero growth or prove its attribution. This includes page/test instrumentation/cache/JIT changes; worker heap, native decode/bitmap/Canvas/GPU and browser/process RSS are excluded. Empty-startup post-GC page JS heaps were Home 692,308, Tools 690,092, Engine 1,580,140, Photo 1,264,696 bytes in this instrumented run. A decoded 24 MP RGBA raster can transiently require 96 MB, working pixels 15.36 MB plus correction buffers/bitmap; these are estimates, not measured native peak. Bounded resources and explicit release are verified; process/native memory leak certification remains unavailable.

Existing CPU benchmarks: 48 kHz/8,192 FFT median 0.954 ms/p95 1.489 versus 85.33 ms hop; 96 kHz median 0.982/p95 1.613 versus 42.67 ms hop. V3 pipeline median 1.261/p95 2.331 ms, all 15 pairs of six repeat snapshots 0.317/0.598 ms, nine exports median 8.303/p95 12.472 ms (1,059,211 JSON bytes in the large case). Speaker interpreter median 0.053/p95 0.060 ms. These measure Node CPU routines, excluding device audio, browser render and real-time scheduling; detailed retained-buffer bounds are in the existing benchmark output.

### Privacy, security and audit exception

No image/audio/customer/vehicle/complaint/observation content, private filename or notes is uploaded. Sentinel tests inspect actual request URLs, headers and bodies through local job/evidence navigation, analyzer file input, Photo input/report/close and Home return; there are no non-GET requests or sentinel leaks. Tools/Workshop contain no analytics integrations. Canonical sharing includes only static title/description/URL and excludes query/hash/job IDs or measurement data. Optional Home GA explicitly strips query/hash from location/referrer and disables Google signals/ad personalization; its emitted configuration is executed/tested with private synthetic referrers. Built QA has no GA ID, so it cannot certify an external account's live analytics configuration.

Required `?job=<opaque-local-id>` navigation necessarily sends that opaque ID in same-origin document requests (and normal same-origin referrers). This is existing explicit Phase 1.1 context behavior, not a transport of the job record body; it is never included in canonical shares or Home GA configuration. Therefore a literal claim that *no job identifier whatsoever* reaches any network request would be false. Eliminating even this identifier requires a separately agreed client-only context transport while preserving legacy query compatibility. External font/CDN requests still occur for public site assets; local-first describes private processing/records, not a fully offline site.

Security source review: image signature/size/geometry budgets before decode; worker timeout/cancel/late-result disposal; text-only labels/filenames/observation rendering; bounded summaries/history; stale/corrupt local-storage protection; static share URLs; no backend/auth/payment/supplier dispatch. Pattern secret scan has zero findings within its documented scope. No personal browser profiles, real customer records, production writes or secrets were used. No dependency/lockfile changes or remote history operations.

`npm audit` remains nonzero: seven high tree findings propagate from two underlying vulnerabilities, with zero critical. Installed/latest `braces` 3.0.3 is affected by [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), through micromatch/fast-glob/Astro lint parsing. Installed/latest `http-cache-semantics` 4.2.0 is affected by [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp), through Astro. Registry versions and advisory pages checked on 2026-10-03 have no patched release. npm proposes major downgrades (Astro 2.10.9 / eslint-plugin-astro 1.5.0), not a tested patch; blindly downgrading modern Astro was rejected and shared root dependencies were preserved.

Exposure assessment: this application deploys static HTML/assets and no Node authenticated server/cache. Astro's cache-policy import is in its build-time remote-image helper; current code uses local native image assets, no remote transform input. Lint/glob patterns come from trusted checked-in config, not user uploads; those packages are not client bundles. Consequently the identified authenticated-cache/glob input paths are not exercised by this static browser product. This is a scoped engineering assessment, not a clean audit result or blanket immunity. The parent must review/record acceptance of that build-tool dependency risk, or adopt tested patched/replacement dependencies before a zero-high-finding release gate can pass. There is no available safe in-place patched version in this environment.

### Commit and parent handoff

- Phase 7 baseline: `0bdd0dc5b5e297b73bffb58fa0d2a5de278e1e7f`.
- Phase 8 checkpoint: `a6fa1b99c32117584a66ced3055ca5811067ebe4` (`Normalize learning taxonomy and extend contextual journeys`).
- Phase 9 checkpoint subject: `Harden Workshop persistence and complete V2 pre-release regression`; it contains this final entry. Exact SHA is supplied in the parent handoff after committing and saved with test evidence in `test-results/v2-phase9/checkpoint.json`. No self-referential hash is embedded in the commit that it identifies.
- Routes: no new route in Phases 8-9; all original 41 pages retained, V2 total 44 with Workshop/Stories/Photo additions from earlier phases. Main navigation Home / Learn / Tools / Workshop / Stories / About. Typed taxonomy and bounded reusable journeys connect real pages; operations remain browser-local; Photo uses pure tested geometry/Canvas and a lazy module worker, with no WASM/backend/login.
- File scope: 57 distinct files changed in this Phases 8-9 task; 120 across V2 against the original `3bc271260bc2f191db403ea3f57fa2acbe256b7f` main baseline. Generated test/build files and evidence are excluded.
- Remaining release gates: dependency-risk disposition above; actual production integration/deployment/commit identity/HTTP/rewrite and desktop/mobile synthetic smoke checks in Phases 10-11. A literal zero-job-identifier-in-network requirement is not met by the required query context; its transport scope needs parent disposition as explained above. No push/merge/deploy in this review task.
- Remaining validation limits: 48 established Windows WebKit Web Audio skips; physical Android/iOS/real Safari/microphone/engine validation was unavailable, so it is not certified by emulation. Native/GPU/process peak-memory and physical print/PDF output are unmeasured. Photo assumes one known rectangular plane/common scale, exports working-resolution PNG plus original-oriented point coordinates in JSON; no depth/lens correction/certified metrology, original-resolution raster/session import/print-PDF capability is claimed. Camera capture/print-PDF were optional PRD extensions, not silently missing mandatory tools.
- Non-blocking future work: smaller card derivatives of existing artwork, extended physical-device/native-memory profiling, deliberate session import/persistence/full-resolution raster options if product scope warrants them, and verified evidence-backed product reviews. None was fabricated to satisfy this checkpoint.

Final browser project counts: chromium-desktop 84 passed/0 skipped/0 other; chromium-mobile 84 passed/0 skipped/0 other; firefox-desktop 84 passed/0 skipped/0 other; webkit-desktop 60 passed/24 skipped/0 other; webkit-mobile 60 passed/24 skipped/0 other. No additional skips were introduced. WebKit unsupported-audio cases that pass validate errors/disabled capture/stored evidence, not audio processing.

Final preservation recheck: root main remains `3bc271260bc2f191db403ea3f57fa2acbe256b7f`, only the original audit untracked, both audit SHA256 `4BD2BAE97ED0062E2A879C75D4E21EF8AEAA7ECC3DD15C9C8F08D489D1CC8A9C`. Secret-pattern scan: 280 tracked/new files, 214 text files, zero findings; no existing public assets or lockfiles changed. No remote write/deployment. The final commit will contain only the 23 reviewed Phase 9 source/test/document files, with all QA evidence ignored.
