# WorkshopGirl V2 execution report

Status: Phases 0-4 complete and tested. Phases 5-11 remain pending for the parent orchestrator.
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
| 5 Workshop | Pending | One local application dashboard; Start/Resume/waiting/parts/billing/history; four-stage progress; useful empty states/local clarity | Existing lib/workshop queue/parts/billing/history projections, new hub controller, WorkshopLayout and all nine existing views |
| 6 Measurement bridge | Pending | Existing/new job attachment, structured observations only, visible inspection/work evidence; safe versioned migration and tests | model/store plus dedicated observation domain; MeasurementTools capture/export reuse; bounded summary, no audio/binaries/customer data in share URLs |
| 7 Photo Lab | Pending | Local JPEG/PNG/WebP, calibration mm/cm/m/inch, optional four-corner perspective, distance/angle/polyline/area/circle, annotations/select/move/delete, undo/redo, zoom/pan, PNG/JSON, touch/a11y/help/privacy/math tests | New /tools/photo-measurement/ with pure geometry/state/export modules, Canvas UI and lazy module worker; no backend/framework |
| 8 Content | Pending | Contextual journeys, reusable taxonomy/reference discovery, metadata/link polish; no invented reviews/affiliate claims | Existing 18 tutorial routes and real metadata; existing Diary/Project/Sport destinations; reuse journey component |
| 9 Quality | Pending | Lint/check/unit/browser/build/audit, full diagnostics/operations/attachments/photo regressions, six viewports, performance/privacy/security/bundle review | Existing Node/Playwright suites and benchmark scripts; new deterministic image fixture and math/worker/export/migration tests |
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

Phases 2-4 are now complete. Reuse siteNavigation, learnCategories, newestFirst, journeys/JourneyCards and workshopFlow in the remaining work. Phase 5 still needs live local projections, useful empty states and actual selected-job progress; the four-stage/support navigation separation is already implemented.

1. Phase 5: local Workshop hub projections, separate Intake/Inspection/Work/QC progress from support navigation, useful empty states and local data copy across every operations module.
2. Phase 6a: observation attachment model/schema and migration. Inspect every store validator before changes; version attachments, bound numeric summaries, retain existing valid entities. Unsupported/malformed data must be preserved and must not be silently wiped on a migration/save. Add load/save/version/backward-compatibility tests.
3. Phase 6b: Engine captured result attachment to existing job or deliberate new intake, timestamp/context/manual RPM/peaks/quality/repeatability/notes/source/version. Render evidence in inspection/work views; no raw audio or automatic fault findings. Test attach/retrieve/reload and share privacy.
4. Phase 7a: Photo input and deterministic geometry core. Consistent internal mm, image-coordinate transforms, reference scale; distance/angle/polyline/polygon/circle math and bounds. Generated 1000px grid with 100px=10mm fixtures.
5. Phase 7b: Canvas editor, accessible labeled controls/help, touch handles, wheel and pointer/pinch zoom/pan, selection/text/arrow/labels, bounded immutable undo/redo with image buffers excluded from history.
6. Phase 7c: perspective rectification with known planar rectangle/aspect inputs and four checked nondegenerate corners, tested homography/inverse mapping, lazy worker for expensive raster work. Prefer pure TS worker implementation if stable and adequate; only choose OpenCV/WASM after bundle/performance evaluation. Calibration resets/revalidates after coordinate-space change.
7. Phase 7d: annotated PNG + versioned JSON, image decode/type/size/corruption/orientation handling, bounded interaction resolution with correct mappings, worker cancellation, URL/bitmap cleanup. Optional printable report if clean. Connect to actual clamps/drilling/woodworking content. Exercise all six viewports and all measurement/export gestures.
8. Phase 8: reusable category IDs/display metadata, reference discovery and contextual related journeys; preserve all routes and editorial truth. Future review IA may be prepared but publish no fake reviews/testing/affiliate links.
9. Phase 9: full quality/privacy/link regression, existing DSP/speaker benchmarks and startup/large-image/bundle metrics, dependency audit where available. Resolve attributable failures; physical-phone certification is not implied by browser emulation.
10. Phase 10: inspect remote head and normal branch/deployment protection, review all changes, integrate safely, normal push and observe existing deployment. Original main has the user audit untracked while this branch now tracks the preserved copy; if Git blocks overwrite during integration, preserve/verify it in an ignored backup before the normal merge. Do not reset/discard it. If truly missing credentials/infrastructure, report exact operation/target/error while completing independent work.
11. Phase 11: intended commit/deployment identity, every important route/alias/canonical/sitemap/robots/noindex, isolated desktop/mobile synthetic workflow and Photo fixture/calibration/export, remove synthetic browser data, clean checkout, final metrics/report.

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

## Phase entry template (required for phases 5-11)

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
Final deployed commit, total changed files, routes added/preserved, final six-item navigation, journey architecture, Workshop attachments/migration, Photo math/editor/worker/WASM strategy, tests/results, performance, six-viewport mobile evidence, deployment ID/URL and exact commit, production HTTP/browser results, known limitations and future ideas: PENDING PHASES 5-11.
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
