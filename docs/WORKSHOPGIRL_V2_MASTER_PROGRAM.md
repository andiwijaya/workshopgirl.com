# WORKSHOPGIRL.COM — MASTER EXECUTION PROGRAM

## Mission

Transform the existing WorkshopGirl.com from a collection of articles and browser tools into a cohesive:

# **WorkshopGirl — Digital Workshop Companion**

The product should help users move through three connected modes:

1. **LEARN** — “How do I do this?”
2. **ANALYZE / MEASURE** — “What is happening here?”
3. **OPERATE** — “How do I manage the actual work?”

This is an end-to-end implementation program.

You, **Dot**, are the engineering orchestrator.

You may and should split this program into multiple sequential Codex coding tasks.

However:

> **DO NOT stop after planning, task decomposition, partial implementation, local testing, or producing reports.**

Continue orchestrating tasks until:

- all approved scope is implemented,
- regressions are resolved,
- tests pass,
- desktop/mobile UX is validated,
- production build passes,
- changes are merged appropriately,
- deployment succeeds,
- production is verified,
- repository is clean,
- final implementation report is produced.

---

# SOURCE OF TRUTH

Before modifying anything, read:
```
docs/WORKSHOPGIRL_AS_IS_SITE_AUDIT.md
```

Treat the current repository and this audit as the implementation baseline.

Do not blindly follow stale assumptions.

Inspect the current code before every major change.

Current audit baseline:

- 41 HTML pages
- 13 browser tools
- 18 tutorial-section articles
- 3 story/project/lifestyle articles
- 4 diagnostic tools
- 9 Workshop Operations tools
- Astro static site
- TypeScript browser applications
- Web Audio / Workers / Canvas DSP stack
- localStorage-based Workshop Operations domain
- no backend
- no cloud database

Preserve the site's local-first philosophy unless a requirement below explicitly changes it.

---

# PRODUCT PRINCIPLE

Use this principle throughout the implementation:

> **We organize messy human problems into structured journeys.**

Do not optimize only for page count.

Do not build disconnected features.

A user should increasingly be able to move through:
```
Problem
→ Understand
→ Analyze / Inspect
→ Decide
→ Act
→ Document
→ Follow up
```

---

# IMPORTANT ARCHITECTURAL RULE

WorkshopGirl must remain primarily:

- browser-first
- privacy-friendly
- local-processing oriented
- usable without account creation
- no database required for the work in this program

Do not introduce a backend simply to make implementation easier.

Do not introduce login/authentication.

Do not introduce unnecessary frameworks.

Reuse existing architecture wherever sensible.

---

# EXECUTION MODEL FOR DOT

Create a master task plan and execute it sequentially.

Recommended phases:
```
Phase 0 — Baseline verification
Phase 1 — Structural fixes
Phase 2 — Information Architecture V2
Phase 3 — Homepage V2
Phase 4 — Journey Layer
Phase 5 — Workshop Operations cohesion
Phase 6 — Analyzer ↔ Workshop integration
Phase 7 — Photo Measurement Lab
Phase 8 — Content/navigation polish
Phase 9 — Full regression + performance hardening
Phase 10 — Production deployment
Phase 11 — Post-deployment production validation
```

You may subdivide these further.

After each phase:

1. execute implementation,
2. run relevant tests,
3. review against this PRD,
4. write/update a progress report,
5. commit a clean checkpoint,
6. continue automatically to the next phase.

Do NOT wait for the Product Owner between phases unless implementation is genuinely impossible without missing external credentials or unavailable infrastructure.

Use reasonable engineering judgment for minor UX and technical decisions.

---

# PHASE 0 — BASELINE VERIFICATION

Before modifications:

- verify repository
- verify branch
- verify current HEAD
- verify clean/dirty working tree
- inspect package scripts
- inspect deployment configuration
- inspect existing test suites
- inspect Lighthouse/performance tooling if present
- inspect Astro routing
- inspect current navigation components
- inspect current homepage
- inspect current Tool pages
- inspect Workshop Operations shared model/store
- inspect diagnostic architecture
- inspect all current responsive breakpoints

Run an initial:

- lint
- typecheck/check
- unit tests
- browser tests where practical
- production build

Record the baseline.

Create:
```
docs/WORKSHOPGIRL_V2_EXECUTION_REPORT.md
```

Use it as the running execution log for the entire program.

---

# PHASE 1 — STRUCTURAL FIXES

Fix known structural inconsistencies before redesign.

## 1.1 Preserve Workshop Job Context

Current Workshop Operations navigation may lose the selected:
```
?job=<id>
```

when navigating through the shared page tabs.

Fix the shared Workshop Operations navigation so that when a user is working on a valid selected job:
```
Vehicle Intake
→ Inspection
→ Work Order
→ QC
→ Queue
→ Parts
→ History
→ Billing
→ Procurement
```

relevant navigation preserves the current job context where appropriate.

Do not attach a job ID to destinations where doing so would be semantically wrong.

Handle:

- missing job
- deleted job
- malformed job ID
- intentionally changing jobs
- navigating back to neutral list states

Gracefully.

---

## 1.2 Repair Generic Print Controls

Audit the shared `[data-print]` control.

Fix pages where the shared print button is currently visible but not wired.

Ensure either:

A. the button works correctly,

or

B. the generic button is not shown when the page uses a more appropriate record-specific print action.

Do not leave dead controls in the UI.

---

## 1.3 Navigation Consistency

Fix:

- Footer missing Sport
- obvious header/footer inconsistencies
- active/current-state accessibility where needed

Keep navigation accessible on mobile and desktop.

---

## 1.4 URL / Canonical Consistency

Inspect existing slashless/trailing-slash inconsistencies.

Resolve canonical/redirect behavior safely.

Requirements:

- avoid redirect loops
- avoid duplicate canonical URLs
- preserve existing external URLs
- do not unnecessarily break indexed pages
- update internal links consistently
- preserve SEO equity

---

## 1.5 Tools Metadata

Update `/tools/` metadata so it accurately reflects the current Digital Workbench rather than being disproportionately Sound Analyzer focused.

---

## 1.6 Remove Obsolete “Opening Soon”

WorkshopGirl is already a functional platform.

Remove or rewrite:
```
The workshop is opening soon
```

Do not make the website look unfinished.

---

# PHASE 2 — INFORMATION ARCHITECTURE V2

Reorganize how users discover content.

DO NOT unnecessarily change existing URLs.

Navigation changes should primarily be an information-architecture layer.

Target high-level navigation:
```
Home
Learn
Tools
Workshop
Stories
About
```

Design appropriate desktop navigation and mobile navigation.

---

# LEARN

Organize existing learning material into useful subject groups.

Suggested groupings:
```
Learn
├── Automotive & Maintenance
├── Woodworking
├── Electrical & Electronics
├── Tools & Machines
└── Reference
```

Use actual existing content.

Do not create empty fake categories merely to match this hierarchy.

Categories should only appear if they contain useful content.

Existing tutorial URLs should remain valid.

---

# TOOLS

Tools should represent digital analysis / measurement tools.

Initial structure:
```
Tools
├── Diagnose & Analyze
│   ├── Sound Analyzer
│   ├── Engine Sound Analyzer
│   ├── Speaker Sound Analyzer
│   └── DSP Validation Workbench
│
└── Measure & Build
    └── Photo Measurement Lab
```

Do not place Workshop Operations in this Tools group anymore as the primary conceptual home.

They belong under **Workshop**.

Existing tool URLs should continue working.

---

# WORKSHOP

Treat the nine Workshop Operations pages as parts of one application.

Present them as a coherent workflow rather than nine unrelated tools.

Conceptual structure:
```
Workshop
├── Start / Resume Job
│   └── Vehicle Intake
│
├── Service Workflow
│   ├── Inspection & Estimate
│   ├── Work Order
│   └── QC & Handover
│
└── Operations
    ├── Queue / Job Status
    ├── Parts Inventory
    ├── Procurement
    ├── Billing
    └── Service History & Warranty
```

Do not delete existing `/tools/workshop/...` URLs merely for aesthetics.

Prefer preserving routes and changing discovery/navigation.

---

# STORIES

Combine the discovery of:

- Diary
- Projects
- Sport

under one Stories navigation concept.

Existing individual sections and URLs may remain for SEO/content continuity.

The user should not see three equally weighted top-level menu items when each contains only one article.

---

# ABOUT

Keep About accessible and clear.

---

# NAVIGATION DESIGN REQUIREMENTS

Desktop:

- clear
- uncluttered
- keyboard accessible
- hover/focus states
- avoid giant mega-menu unless actually useful

Mobile:

- touch friendly
- no overflow
- obvious hierarchy
- accessible expand/collapse
- Escape/focus behavior where applicable

Test at least:
```
390px
430px
768px
1024px
1280px
1440px+
```

---

# PHASE 3 — HOMEPAGE V2

The homepage must move from:
```
“Here is Workshop Girl”
```

toward:
```
“What do you need to do today?”
```

while keeping Workshop Girl's visual personality.

Do NOT remove the recurring Workshop Girl character.

---

## HERO

Keep:

- Workshop Girl visual identity
- practical workshop atmosphere
- human/editorial personality

Add meaningful actions.

Example intent:
```
What do you want to do?

[ Diagnose Something ]
[ Learn / Fix Something ]
[ Run a Workshop Job ]
```

Do not mechanically use those exact labels if better copy fits the existing design.

---

## HOMEPAGE ENTRY JOURNEYS

Homepage should provide three strong entry paths.

### Diagnose / Analyze

Directly expose important diagnostic tools.

At minimum:

- Engine Sound Analyzer
- Sound Analyzer
- Speaker Sound Analyzer

Do not force users through two index pages before reaching the tool.

---

### Learn / Fix

Expose relevant practical learning categories and recent/high-value tutorials.

Do not show every tutorial.

Use card-based discovery.

---

### Run a Workshop Job

Make the Workshop application visible as one connected product.

Primary action should allow users to:
```
Start a Workshop Job
```

Secondary actions can include:

- Resume Queue
- Parts
- Billing
- Service History

depending on responsive layout.

---

## LATEST CONTENT

Retain latest/recent content discovery but do not let it overpower the core product journeys.

Where current content arrays are not actually sorted by date, improve this safely.

Avoid fragile `slice(0, 2)` semantics if proper metadata can provide reliable sorting.

---

## MOBILE

Homepage must be excellent on mobile.

No giant desktop layout squeezed into a phone.

Prioritize:

- readable typography
- stacked CTA structure
- good image crop
- touch targets
- no horizontal scrolling
- reasonable initial page weight

---

# PHASE 4 — JOURNEY LAYER

Create a reusable journey system linking:
```
Content
↔ Tools
↔ Workshop Operations
```

Do not hard-code random CTAs independently into every page when a maintainable reusable model can be used.

Prefer a typed data/configuration model.

Example conceptual structure:
```
journeys = {
  engineSound: {
    learn: [...],
    tools: [...],
    workshop: [...]
  }
}
```

Actual design is your engineering decision.

---

# JOURNEY A — ENGINE SOUNDS UNUSUAL

Create a responsible journey around the existing Engine Sound Analyzer.

Important:

The analyzer is observational.

It does NOT automatically diagnose mechanical faults.

Never imply that spectral output proves a specific fault.

Possible flow:
```
Engine sounds unusual
→ Engine Sound Analyzer
→ collect observation
→ explain observations and limitations
→ relevant maintenance learning
→ Spark Plug
→ Air Filter
→ Engine Oil
→ optional Start Inspection
```

Use language such as:

- inspect
- compare
- observe
- check
- investigate

Avoid unsupported:

- diagnosed
- detected failure
- confirmed fault

unless an actual deterministic capability supports it.

---

# JOURNEY B — VEHICLE MAINTENANCE ARTICLE → WORKSHOP JOB

Connect relevant tutorials into Workshop Operations.

Examples:

Brake pad article:
```
Read guide
→ related Torque Wrench guide
→ Start Vehicle Inspection
→ Estimate
→ Work Order
→ QC
→ Service History
```

Oil:
```
Oil tutorial
→ Start maintenance job
→ Work Order
→ QC
→ Service History
```

Spark plug:
```
Spark plug tutorial
→ related Engine Sound Analyzer
→ optional Start Inspection
```

Do not make every page display excessive CTA spam.

Use contextual, relevant journey cards.

---

# JOURNEY C — WORKSHOP OPERATOR

Make the existing operations workflow feel continuous.
```
Vehicle arrives
→ Intake
→ Inspection
→ Estimate
→ Approval
→ Work Order
→ Parts/Procurement if needed
→ QC
→ Billing
→ Handover
→ Service History
```

Clearly differentiate:

### Sequential job stages

from:

### Supporting operational modules

Do not visually imply all nine pages are mandatory sequential stages.

---

# PHASE 5 — WORKSHOP OPERATIONS COHESION

Treat Workshop Operations as a local application.

Improve orientation without changing its privacy/local-first architecture.

---

## Workshop Dashboard / Entry

Enhance `/tools/` or create an appropriate Workshop entry experience without breaking existing routes.

The Workshop section should clearly show:

- Start new job
- Resume jobs
- Jobs waiting
- Parts requiring attention
- Billing state
- Service history

Use only locally available data.

No fake cloud statistics.

---

## Workflow Progress

When a user is inside a job, provide an understandable progress representation:
```
Intake
→ Inspection
→ Work
→ QC / Handover
```

Supporting modules should remain accessible separately.

---

## Empty States

Every operational page should have useful empty states.

Examples:

- No jobs yet → Start Intake
- No parts yet → Add Part
- No invoices yet → complete relevant job steps
- No service history → completed jobs appear here

Avoid dead blank screens.

---

## Local Data Clarity

Clearly communicate where relevant that operational data is stored locally in the browser.

Do not imply:

- account sync
- server backup
- multi-user collaboration

because those do not exist.

---

# PHASE 6 — ANALYZER ↔ WORKSHOP JOB INTEGRATION

This is an important bridge.

Allow useful analyzer observations to be attached to a Workshop Job locally.

Start with Engine Sound Analyzer.

---

## Measurement Attachment

User should be able to:
```
Engine Sound Analyzer
→ capture result
→ Save / Attach to Workshop Job
→ choose an existing local job
OR
→ Start a new job
```

Store an appropriate structured measurement summary in the local Workshop domain.

Do NOT automatically attach:

- raw microphone audio
- unnecessary large binary blobs
- personal data

unless clearly required and intentionally designed.

Prefer structured measurement evidence.

Examples:

- timestamp
- capture context
- RPM reference if manually supplied
- dominant peaks
- quality indicators
- repeatability summary
- user notes
- measurement schema/version
- source tool

Reuse existing measurement serialization concepts.

---

## Workshop Job View

Attached measurements should be visible from an appropriate inspection/work-order context.

Use them as:
```
Observation evidence
```

not automatic diagnosis.

The operator may write their own finding based on inspection.

---

## Data Migration

Existing localStorage users must continue working.

If storage schema changes:

- version it
- migrate safely
- preserve existing records
- handle malformed old data gracefully

Do not silently wipe existing workshop records.

---

# PHASE 7 — BUILD FLAGSHIP TOOL

# WORKSHOP PHOTO MEASUREMENT LAB

Build a new technically meaningful browser tool.

Suggested route:
```
/tools/photo-measurement/
```

Final route name may follow project conventions, but keep it clear and SEO-friendly.

This tool must process images locally in the browser.

No server upload.

---

# PRODUCT PURPOSE

Allow workshop users to measure and annotate objects from a photograph when a known reference dimension is available.

Use cases:

- woodworking
- fabrication
- mechanical parts
- automotive inspection
- home repair
- hobby projects
- workshop documentation

---

# CORE USER JOURNEY
```
Upload / Open Image
→ Define Reference Scale
→ Correct Perspective if needed
→ Measure
→ Annotate
→ Export
```

---

# 7.1 IMAGE INPUT

Support common browser-readable images.

At minimum:

- JPEG
- PNG
- WebP when browser supported

Provide:

- drag & drop
- file picker
- mobile photo library compatibility

Camera capture may be supported if straightforward and reliable, but must not block release.

Enforce reasonable limits.

Handle:

- extremely large images
- invalid files
- corrupted images
- unsupported formats
- EXIF orientation if relevant

---

# 7.2 REFERENCE CALIBRATION

Measurement requires scale.

Allow the user to define:
```
Point A
Point B
Known real-world distance
Unit
```

Example:
```
distance between points = 100 mm
```

Supported display units should include sensible workshop options:

- mm
- cm
- m
- inch

Store internal calculations consistently.

Show users that measurement accuracy depends on:

- reference accuracy
- camera angle
- perspective
- image resolution
- point placement

Do not claim metrology-grade accuracy.

---

# 7.3 PERSPECTIVE CORRECTION

Provide an optional perspective correction / rectification mode.

User selects four corners of a known planar surface.

Apply transformation locally.

Potential implementation:

- OpenCV WASM

or another reliable local browser implementation.

Do not introduce heavy dependencies blindly.

Evaluate bundle cost and lazy-load advanced image processing when practical.

---

# 7.4 MEASUREMENT TOOLS

At minimum implement:

### Distance

Point A → Point B

Result:
```
X mm
```

---

### Angle

Three-point or two-line angle measurement.

Result:
```
XX.X°
```

---

### Polyline / Multi-segment

Useful for irregular paths.

Show total length.

---

### Area

Polygon selection.

Calculate planar area based on calibrated scale.

---

### Diameter / Radius

Provide a useful circle measurement mechanism where reliable.

This can be user-defined circle fitting rather than automatic object recognition.

---

# 7.5 ANNOTATIONS

Allow users to add:

- measurement labels
- arrows/lines
- simple text notes
- dimension values

Keep interaction usable on touchscreens.

Implement:

- select
- move
- delete
- undo
- redo

where practical.

---

# 7.6 ZOOM / PAN

Implement smooth:

- zoom
- pan
- reset view

Support:

- mouse wheel / pointer
- touch/pinch where practical

Measurement coordinates must remain correct regardless of zoom level.

---

# 7.7 EXPORT

Support at minimum:

### Annotated Image

Export locally as PNG or another suitable raster format.

### Measurement Report

Export machine-readable JSON.

Example structure:
```json
{
  "schema": "...",
  "image": {
    "width": 0,
    "height": 0
  },
  "calibration": {},
  "measurements": [],
  "notes": []
}
```

If browser printing/PDF can be integrated cleanly, allow printable report output.

---

# 7.8 PRIVACY

Clearly communicate:
```
Image processing happens locally in your browser.
```

Do not upload workshop images.

---

# 7.9 PERFORMANCE

Large-image processing must not freeze the interface unnecessarily.

Consider:

- image downsampling for interaction
- preserving correct coordinate mapping
- Web Worker
- WASM
- lazy loading
- memory cleanup
- object URL cleanup

Avoid memory leaks.

---

# 7.10 MOBILE

This tool MUST be designed for both:

- desktop
- mobile

Do not treat mobile as an afterthought.

Critical mobile interactions:

- selecting calibration points
- dragging handles
- zoom/pan
- reading measurements
- undo
- export

Touch targets must be usable.

---

# 7.11 ACCESSIBILITY

Provide:

- accessible controls
- clear labels
- keyboard support where meaningful
- focus indicators
- sufficient contrast
- explanatory text for visual-only operations

Some canvas interactions inherently rely on visual input, but surrounding controls must remain accessible.

---

# 7.12 TOOL DOCUMENTATION

Create useful built-in guidance explaining:

- what it does
- calibration
- perspective limitations
- expected accuracy
- local privacy
- best practices

Do not overpromise precision.

---

# 7.13 JOURNEY CONNECTIONS

Connect Photo Measurement Lab to suitable existing learning content.

Examples may include:

- woodworking
- clamps
- drilling
- project content

Only use contextual links that genuinely fit.

---

# PHASE 8 — CONTENT & DISCOVERY POLISH

Now that navigation has changed, review all relevant pages.

---

## Related Journeys

Add tasteful reusable sections such as:
```
Continue in WorkshopGirl
```

or a better copy style aligned with the site.

Possible destinations:

- Learn
- Analyze
- Workshop

Do not show irrelevant recommendations.

---

## Tutorial Taxonomy

Normalize inconsistent category naming where possible.

Do not break routes.

Create reusable category metadata rather than uncontrolled display-string proliferation.

Examples:
```
Automotive
Woodworking
Electrical
Power Tools
Hand Tools
Reference
```

Use thoughtful mapping of existing articles.

---

## References

Existing reference-style articles can be surfaced inside Learn → Reference.

Do not duplicate pages unnecessarily.

---

# PRODUCT REVIEWS / AFFILIATE — IMPORTANT

Do NOT fabricate product reviews.

Do NOT claim WorkshopGirl personally tested a product unless evidence exists.

Do NOT produce fake affiliate recommendations merely to fill a missing pillar.

For this program:

- prepare the IA so future verified product reviews can fit cleanly
- optionally create reusable review components/templates internally if genuinely useful
- DO NOT publish invented reviews
- DO NOT add fake affiliate links

Product Review / Affiliate expansion is a later editorial/commercial program.

---

# PHASE 9 — QUALITY, PERFORMANCE & HARDENING

Perform a comprehensive regression.

---

# STATIC QUALITY

Run:

- lint
- TypeScript/Astro checks
- unit tests
- build
- dependency/audit checks where available

Resolve new warnings/errors attributable to this program.

Do not ignore failures.

---

# DOMAIN TESTS

Add/update tests for:

- navigation config
- journey mappings
- localStorage migration
- measurement attachments
- photo calibration math
- coordinate transforms
- angle calculations
- area calculations
- unit conversion
- perspective mapping if deterministic components are testable
- export schema
- undo/redo state if implemented

Measurement math should be deterministic and strongly tested.

---

# BROWSER TESTS

Use Playwright or existing equivalent.

At minimum verify:

### Homepage

- desktop navigation
- mobile navigation
- hero CTAs
- direct tool entry
- Workshop entry

### Learn

- category discovery
- tutorial journeys

### Diagnostic tools

- existing tools still load
- no regression to Sound/Engine/Speaker/DSP flows

### Workshop Operations

- create local job
- move through workflow
- preserve job context
- attach measurement
- retrieve attachment
- billing/history still work

### Photo Measurement

- open known test image
- calibrate known scale
- create distance
- verify expected result
- angle
- area
- export
- reload/reset behavior

---

# KNOWN FIXTURE FOR PHOTO MEASUREMENT TESTING

Create deterministic test images programmatically if practical.

Example:
```
1000 × 1000 px test grid
reference:
100 px = 10 mm
```

Expected measurements can then be mathematically verified.

Do not depend only on manual screenshots for measurement correctness.

---

# RESPONSIVE TESTING

Validate at least:
```
390 × 844
430 × 932
768 × 1024
1024 × 768
1280 × 720
1440 × 900
```

Check:

- header
- menus
- cards
- tool layouts
- modal/panel overflow
- tables
- forms
- Canvas
- photo measurement controls

No horizontal overflow except intentionally scrollable technical areas.

---

# PERFORMANCE

Check:

- homepage load
- tool index
- analyzer startup
- Photo Measurement initial load
- large-image interaction

Avoid loading OpenCV/WASM or similarly heavy assets on pages that do not need them.

Prefer code splitting/lazy loading.

Check bundle impact.

---

# PRIVACY / SECURITY

Verify:

- uploaded images remain local
- microphone audio remains local
- workshop records remain local
- no accidental job/customer information enters share URLs
- no analyzer measurement automatically leaks into canonical sharing
- no production secrets enter source

---

# PHASE 10 — DEPLOYMENT

After all local checks pass:

1. inspect Git diff carefully
2. ensure no temporary audit files/test output are unintentionally committed
3. commit logical checkpoints if not already done
4. merge/integrate using the repository's normal safe workflow
5. push normally
6. allow existing production deployment mechanism to deploy WorkshopGirl.com
7. verify deployed commit matches intended HEAD

Do NOT force push.

Do NOT rewrite remote history.

Do NOT bypass existing deployment protections.

---

# PHASE 11 — PRODUCTION VERIFICATION

Deployment success alone is NOT completion.

Test production.

Verify:

### HTTP / routing

- Home
- Learn destination
- Tools
- Workshop
- Stories/navigation destinations
- Photo Measurement
- existing tutorials
- existing analyzer routes
- existing Workshop Operations routes
- sitemap
- robots
- canonical URLs

---

### Production browser verification

Test:

- desktop
- mobile

At minimum verify:

- menu
- homepage CTA
- tool cards
- Engine Sound Analyzer UI initialization
- Workshop local workflow smoke test
- Photo Measurement test image/calibration/measurement/export

Do not submit real customer information.

Use synthetic test records only.

Clear synthetic localStorage afterwards where appropriate.

---

# SEO / DISCOVERY

After restructuring:

- ensure all important existing pages remain discoverable
- update sitemap if new route added
- ensure new Photo Measurement route included
- ensure canonical URLs correct
- ensure metadata correct
- ensure no accidental noindex
- verify internal links

Do not delete existing SEO-accessible URLs merely because the menu changed.

---

# DESIGN PRINCIPLES

WorkshopGirl visual identity should remain recognizable.

Maintain:

- recurring Workshop Girl character
- approachable workshop personality
- practical rather than corporate tone
- clean cards
- good whitespace
- strong mobile responsiveness

Do NOT turn it into generic SaaS blue-dashboard design.

Workshop Operations can be more functional, but still visually belong to WorkshopGirl.

---

# COPY PRINCIPLES

Use practical language.

Prefer:
```
Analyze
Measure
Inspect
Compare
Learn
Start a Job
Continue Work
```

Avoid unsupported medical/mechanical certainty such as:
```
Your engine has...
We diagnosed...
This proves...
```

when the tool provides observation only.

---

# NO FAKE CAPABILITY RULE

Do not claim:

- backend synchronization
- cloud backup
- AI fault diagnosis
- OBD connection
- calibrated SPL
- certified dimensional metrology
- automatic supplier ordering
- payment processing
- automatic warranty messaging

unless such functionality is actually implemented and tested.

---

# DEFINITION OF DONE

This program is complete only when ALL applicable items below are satisfied:

## Structure

- known structural inconsistencies fixed
- Workshop job context behaves correctly
- dead generic print controls resolved
- canonical/navigation inconsistencies resolved

## IA

- Home / Learn / Tools / Workshop / Stories / About works
- responsive navigation works
- existing URLs preserved where practical

## Homepage

- problem/action-first homepage implemented
- direct diagnostic tool entry
- direct Workshop entry
- mobile UX verified

## Journey Layer

- tutorials connect contextually to relevant tools
- tools connect to learning/workshop where appropriate
- no unsupported diagnostic claims

## Workshop Operations

- presented as one coherent local application
- sequential stages clearly differentiated from support modules
- job context preserved
- empty states useful

## Analyzer Integration

- Engine measurement can attach to local job
- existing job data remains compatible
- migration tested
- observation remains clearly non-diagnostic

## Photo Measurement Lab

- local image import
- reference calibration
- distance measurement
- angle measurement
- polyline measurement
- area measurement
- circle/diameter measurement if within chosen stable implementation
- annotations
- zoom/pan
- undo/redo
- annotated-image export
- JSON measurement export
- perspective correction
- desktop UX
- mobile UX
- privacy messaging
- deterministic measurement tests

## Quality

- lint passes
- typecheck/check passes
- unit/domain tests pass
- browser tests pass
- production build passes
- no known critical regression
- performance reviewed

## Deployment

- commits pushed
- production deployment successful
- deployed commit confirmed
- production HTTP checks pass
- production desktop smoke test passes
- production mobile smoke test passes

---

# REPORTING

Maintain:
```
docs/WORKSHOPGIRL_V2_EXECUTION_REPORT.md
```

For each phase record:
```
Objective
Files changed
Architecture decisions
Implementation completed
Tests executed
Results
Problems found
Problems fixed
Commit
Deployment state
```

At completion include:

# FINAL SUMMARY

Report:

- starting commit
- final commit
- total files changed
- routes added
- routes preserved
- final main navigation
- journey system architecture
- Workshop integration changes
- Photo Measurement architecture
- WASM/worker strategy used
- tests added
- total test results
- performance observations
- mobile validation results
- production deployment ID/URL if available
- production verification results
- known limitations
- remaining non-blocking future ideas

---

# AUTONOMOUS EXECUTION RULE

Dot:

You are explicitly authorized to split this program into as many Codex implementation tasks as necessary.

For example:
```
Task 01 — baseline + structural cleanup
Task 02 — navigation/IA
Task 03 — homepage
Task 04 — journey data model
Task 05 — editorial integration
Task 06 — workshop UX
Task 07 — measurement attachment model
Task 08 — analyzer integration
Task 09 — Photo Measurement foundation
Task 10 — calibration/math
Task 11 — perspective/WASM
Task 12 — annotations/export
Task 13 — mobile UX
Task 14 — regression
Task 15 — hardening
Task 16 — deployment
Task 17 — production verification
```

This is an example only.

You decide the technically safest decomposition.

### Critical:

Do NOT merely create these tasks and stop.

Execute each task sequentially.

Review Codex output after every task.

If Codex finds defects:

- create the necessary corrective task,
- execute it,
- retest,
- continue.

If implementation reveals architectural problems:

- resolve them,
- document the decision,
- continue.

If tests fail:

- fix them,
- rerun them,
- continue.

If deployment fails:

- diagnose,
- repair,
- redeploy,
- reverify.

The target state is not:
```
“implementation mostly complete”
```

The target state is:
```
WORKSHOPGIRL V2 IMPLEMENTED
+
TESTED
+
DEPLOYED
+
PRODUCTION VERIFIED
```

Only then stop.

---

# FINAL PRODUCT INTENT

At the end of this program, WorkshopGirl should feel like one product:
```
                   WORKSHOPGIRL

                       │
           ┌───────────┼───────────┐
           │           │           │
         LEARN      ANALYZE     WORKSHOP
           │           │           │
       tutorials     audio      actual jobs
       reference   measurement    queue
       stories       photo        parts
           │           │          billing
           └───────────┼───────────┘
                       │
                 USER JOURNEY
                       │
        Understand → Inspect → Act
                       │
               Document → Follow up
```

Users should no longer experience:
```
13 unrelated tools
+
21 unrelated articles
```

They should experience:

# **one Digital Workshop Companion.**
