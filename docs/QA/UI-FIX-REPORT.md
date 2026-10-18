# OPS UI fixes and responsive verification

## Scope and baseline

Batch 1 implementation and retest. Batch 2 results are recorded separately below. The final combined Chromium run passed all **38 tests**, with zero skipped, failed or flaky cases.

Branch: `feat/audit-admin-question-management`. Baseline HEAD: `e5e9950121bf7a89d2c1700a748b5534f28dd3c3`. Validation includes uncommitted P0 work and this UI patch. Audit Settings is present on this feature branch; no main merge is assumed. Existing QA baseline documents, backend handover documents, Dashboard mapping fix and P0 authorization acceptance tests were preserved.

No backend contracts, workflow transitions, authorization rules, scoring/snapshots, entitlements, persistence formats or QR quantity/target logic changed. Tests use fresh synthetic browser contexts at `http://127.0.0.1:4179`; ordinary browser profiles and production data are untouched. No commits, pushes, merges or deployments.

## Issues and fixes

11 confirmed issues fixed: 9 P1 and 2 P2; no P0 UI defect found in this scope. Detailed reproduction, viewport, cause, before/after evidence and regression are in [UI-ISSUE-REGISTER.md](UI-ISSUE-REGISTER.md). All 11 fixes passed their final browser regressions; no confirmed Batch 1 UI issue remains.

- Audit report and creation header remain within the workspace instead of producing page-wide overflow.
- Audit creation toolbar sits below global navigation when scrolled, using a shared header-height token.
- Red Tag report controls wrap on mobile; long item identifiers wrap in shared headers, linked Action context, reports and labels.
- Action filters use two columns beside the expanded sidebar at 1024px and retain the full desktop layout at larger widths.
- Tooltip width fits narrow viewports, has tooltip semantics, and its assignment explanation is linked to the trigger. Click keeps the explanation open when hover has already opened it.
- Red Tag icon-only Back buttons have accessible names.

The existing OPS visual language, status badges, typography scale, buttons, navigation architecture and module terms are retained. Shared fixes are limited to header text wrapping, header height and tooltip sizing/semantics. No general overflow-hiding workaround, dependency, z-index escalation or redesign was added.

## Browser coverage

Real Chrome for Testing 156.0.8078.4, Playwright 1.64.1, macOS ARM64. Widths: **320, 375, 390, 430, 768, 1024, 1280, 1440, 1920** CSS pixels. Main suite uses height 844 below 768px and 900 otherwise. No WebKit/Firefox or real-device/touch certification is claimed.

Initial route matrix: **25 distinct URL paths**, plus the completed Audit query selection state: **26 entries × 9 widths = 234 combinations**. Dynamic routes use actual seed IDs, not empty not-found stand-ins.

| Area | Executed route entries |
| --- | --- |
| Dashboard | `/dashboard` |
| Audit | `/audits`; `/audits?audit=5S-EGM-ZA-006`; `/5s/audits/5S-EGM-ZA-006/report` |
| Audit Settings | `/audits/settings`; `/audits/settings/standard-checklist`; `/audits/settings/custom-questions`; `/audits/settings/scoring` |
| Red Tag | `/5s/red`; `/5s/red/overview`; `/5s/red/create`; `/5s/red/awaiting-closure`; `/5s/red/closed`; `/5s/red/settings`; `/5s/red/RT-EGM-ZA-001`; corresponding `/report` and `/print`; `/5s/red/create-qr/print?plant=PLANT-EGM&quantity=3` |
| Actions | `/actions`; `/actions/ACT-VM-001`; `/actions/ACT-VM-001/report`; `/actions/settings`; categories, priority-due-dates, reminder-rules and escalation-rules under `/actions/settings/` |

Additional states run at every width: Audit creation/scheduling/zone popup and a new in-progress execution; standard long-question editor; custom validation/dropdown; manual Action creation/zone popup; linked Action source/validation/info/last-field-footer clearance; QR quantity validation/record QR; missing Action/Red Tag fallback; mobile navigation keyboard Escape/focus restoration/route selection or desktop sidebar collapse; Dashboard Performance/Modules; expanded Action filters and empty search; due-date validation; invalid photo upload; simulated camera loading/denial and nested modal close; long Red Tag detail/report/label; empty Closed Red Tags; populated Action cards/table row actions; scrolled Audit toolbar/global header separation.

Assertions use document/control bounds, intentional local table scrolling, popup and SVG bounds, text scrollWidth/clientWidth, source dialog containment, primary/Cancel pointer trial reachability, known sibling/footer nonintersection, accessible-name scans, tooltip description linkage, keyboard focus visibility and focus restoration. Finite entrance animations settle before geometry. Screenshots complement these assertions; screenshots are not independently approved pixel baselines. Layout comparisons are scoped to known related elements, not arbitrary DOM intersections.

Camera loading/denial is explicitly simulated through an isolated browser media stub. It demonstrates the real UI error/loading branches, not hardware capture. Reference upload tests include actual image upload in the preserved P0 suite and an invalid image in the UI suite.

## Files changed in this UI task

Product UI only:

- `app/globals.css`, `components/navigation/header.tsx`: shared header height and sticky inset.
- `components/ui/tooltip.tsx`: viewport sizing and tooltip role.
- `features/actions/action-center-page.tsx`: responsive filter grid.
- `features/actions/create-linked-action-dialog.tsx`: source context sizing/wrapping and explanation linkage.
- `features/five-s/components/FiveSAuditCreate.tsx`, `FiveSAuditReport.tsx`, `FiveSPageHeader.tsx`: contained headers/report and long text.
- `features/five-s/red-tag/red-tag-module.tsx`, `red-tag-report-page.tsx`: label/report wrapping, toolbar and Back names.

Automation/docs:

- `playwright.ui.config.ts`: separate UI evidence/report locations, all Batch 1 test files, bounded action timeouts; preserves P0 output.
- `e2e/ui-batch1.spec.ts`, `ui-batch1-sticky.spec.ts`, `ui-batch1-populated.spec.ts`: 38 new browser tests (several loop across nine widths).
- `e2e/p0-critical.spec.ts`: QR test waits for normal Action attention initialization before taking its baseline; the original exact storage-equality assertion remains.
- This report, issue register and focused evidence under `docs/QA/ui-evidence/`.

Existing package/lockfile, ESLint/ignore changes, P0 unit tests and analytics mapping change were already present at the start of this task. No new dependency was added in this task.

## Validation and evidence

| Executed check | Result |
| --- | --- |
| Combined Batch 1 Chromium suite | **38 passed**, 0 failed/skipped/flaky; 413.6s |
| Initial route matrix | **234 combinations**: 26 entries × nine widths |
| Additional interaction geometry | **270 checks**, plus nine sticky-header and nine populated-table/card checks |
| Total final DOM geometry captures | **522**, accompanied by 531 PNG screenshots |
| Preserved P0 Chromium suite | **15 passed** after fixture-readiness correction |
| Focused unit selection | **10 files / 110 tests passed** |
| Full unit suite | **1,054 passed / 3 failed**; all three are existing P0 authorization acceptance failures |
| TypeScript | **PASS**, no diagnostics |
| Lint | **0 errors / 13 existing warnings** |
| Git whitespace check | **PASS** |

The additional query, missing-record and long-record fixture variants cover 33 concrete URLs at nine widths (297 URL/viewport variants); these are not 33 distinct route implementations. The initial implemented-path census remains 25. All additional geometry counts include interaction states and do not inflate the route count.

[Machine-readable execution summary and file hashes](ui-evidence/batch1-execution-summary.json) · [browser log](ui-evidence/browser-complete.log) · [unit log](ui-evidence/unit-final.log) · [P0 rerun](ui-evidence/p0-browser-final.log).

Reproduce with the existing local browser executable via `OPS_QA_EXTERNAL_SERVER=1 OPS_QA_BROWSER_EXECUTABLE='<Chrome for Testing executable>' OPS_UI_PHASE=verified npx playwright test -c playwright.ui.config.ts` against the task-owned loopback server. Without `OPS_QA_EXTERNAL_SERVER`, the configuration starts its own isolated server and refuses to reuse an existing one. P0 Chromium rerun passed all 15 cases after the QR readiness correction, including 100 reusable QR labels and unchanged record storage. This is development-server validation; no new production build or physical printer/QR scan is claimed.

Original `test-results/p0-results.json` is byte-identical to the preserved pre-task copy. The backend handover was not rewritten. Failure traces and representative before/after images are retained in `ui-evidence/`; bulk screenshots and HTML/JSON reports are under ignored `test-results/` and `playwright-report/`.

Preliminary harness failures were investigated instead of being treated as product defects: full-page modal screenshot/background scrolling interference, entrance-transition geometry, and expecting keyboard focus rings after pointer cancellation. The final tests exercise keyboard cancellation and settled geometry. The preliminary mixed run was interrupted and is superseded by the definitive combined run; no interrupted/skipped scenario is counted as passed.

A scrolled linked-dialog tooltip capture appeared cropped. Standalone Chromium measurements and hit-testing kept the title and footer inside the 844px viewport and proved Close/Cancel reachable; [diagnostic evidence](ui-evidence/dialog-frame-hit-test.log) records the discrepancy. That image is not a certified visual baseline.

## Remaining work and limitations

Batch 2 is pending: Gemba, Continuous Improvement, Visual Management, Reports, Admin/Super Admin, Profile/preferences and accessible compatibility routes. Deferred redirects/placeholders are identified in the original application inventory; Batch 1 is not a claim that all application routes have been certified.

No physical camera, microphone, physical printer/QR scan, real touch device, screen reader, contrast audit, 200% zoom, landscape/short-height matrix, full workflow completion/authorization certification or production build was performed in this UI batch. Existing security acceptance failures remain visible and unresolved: unauthorized direct Red Tag creation, entitlement mutation and Action creation. No rule or test was weakened to conceal them.

## Batch 2 — remaining modules

Batch 2 adds four confirmed UI fixes: **two P1 and two P2**, with no P0 UI defect found. All four were reproduced in real Chromium before editing. The issue register contains each route, viewport, cause and before/after screenshot. Fixes affect four product files only:

- `features/gemba/gemba-page.tsx`: observation filters wrap into columns that fit beside the sidebar.
- `features/five-s/continuous-improvement/detail-page.tsx`: proposal sidebar can shrink; decision title/status wrap.
- `features/settings/roles-permissions-page.tsx`: table scroller becomes the containing block for offscreen screen-reader labels and is keyboard-focusable/named.
- `features/visual-management/print/visual-management-print.module.css`: print workspace stays within shell margins; narrow grid track can shrink. Existing paper-preview scroller remains usable.

No branding, terminology, navigation architecture, shared design tokens or working screen design changed. No business model/store, workflow transition, entitlement/authorization rule, backend proposal or persistence format changed. No production/browser-profile data was touched. The test contexts create and discard synthetic observations/meetings only.

### Batch 2 coverage

The Phase 0 catalog supplied **84 remaining route patterns: 50 render wrappers and 34 redirect/compatibility wrappers**. Ten additional query/summary states make **94 initial entries × nine widths = 846 route/state combinations**, covering 91 distinct requested pathnames. Redirect destinations and rendered headings are recorded rather than counting an alias as a new business workflow. Batch 1's 25 route patterns remain separately reported above.

Widths: **320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px**. Initial route tests use height 844 below 768px and 900 otherwise; interaction tests use height 900. Chromium is the same real Chrome for Testing 156.0.8078.4 / Playwright 1.64.1 used in Batch 1.

| Area | Actual browser coverage |
| --- | --- |
| Gemba | Overview, walks, observations, populated/empty search, schedule/validation, outside-member picker, execution, manual observation/type/evidence validation, actual image upload, long saved observation, evidence viewer, linked Action and Red Tag dialogs, completion validation/review, mobile navigation, populated shared-observation recipient view. |
| Continuous Improvement | Overview, list/table/pipeline/completed/review queue routes; create validation and long proposal; related-record picker; proposal review remarks/rejection availability; implementation/completion validation; completion-review package; actual evidence upload/preview/removal; proposal sidebar; report and existing lifecycle state fixtures. |
| Visual Management | Overview, boards, meetings/history, detail, print workspace, settings; create/edit board dialogs, inline metric editor and nested popup; reusable KPI library/editor; actual active meeting start, editable KPI deviation/owner UI, guest dialog and completion validation. |
| Reports | Main filters and empty search; actual active summary endpoints and record reports; CSV download event/filename; print media geometry at every width; one real Chromium PDF export at 1440px. |
| Admin / Super Admin | Users populated table/cards, create validation and edit/select popup; plant editor and Zone validation; roles matrix local scrolling; organization detail/modules; disable-module confirmation canceled with enabled state retained; other accessible settings initial renders. |
| Profile / shared settings | Profile, preferences, notifications, security; preference popup and keyboard focus ring; invalid-password validation; accessible settings and compatibility redirects. |
| Legacy | All remaining catalog aliases/redirects rendered; Visual Improvement create/detail/report, locked historical editor and an actual editable `VI-2026-013` editor. |

Initial shared-observation URL has no share and correctly renders its unavailable guard. A separate test creates a share through the existing UI, switches to the eligible synthetic recipient and asserts the populated shared heading. Initial legacy `VI-2026-014/edit` is correctly locked while awaiting review; separate tests verify the editable `VI-2026-013/edit`. `?tab=completion` is unsupported and falls back to Proposal; completion review is tested through the implemented `?tab=review` tab. These fallback states are not represented as successful execution of unsupported workflows.

The active VM screen is `DailyManagementMeetingWorkspace`. Older topic/guest/completion-modal controls in another component are not exposed there. Current topic and meeting history pages are rendered; no unsupported topic-creation workflow is claimed. Seeded KPI actuals are intentionally read-only. Editable deviation testing fixes synthetic time to **27 October 2026**, beyond the seeded days 1–26; no business date or fixture logic was changed.

Geometry assertions check document width, viewport bounds of visible controls/headings, ancestor clipping, local horizontal table/tab scrolling, shared-header breadcrumb bounds and unnamed native buttons. Interaction checks add hit-testing/scroll reachability of important controls, nested popups, keyboard Escape/focus restoration, visible keyboard focus, validation and supported upload/download behavior. Initial route tests also assert zero uncaught page errors. Screenshots complement these assertions and are not treated as sufficient evidence of a pass.

### Batch 2 execution results

Final validation results and machine-readable evidence are recorded in [execution-summary.json](ui-batch2-evidence/execution-summary.json). Final results are assembled from separate route, forms, meetings, evidence, settings and compatibility jobs; intermediate failures remain separately documented.

| Executed check | Batch 2 result |
| --- | --- |
| Batch 2 Chromium suite, final selected runs | **63 passed / 0 failed / 0 skipped** (9 route, 18 forms/reports, 9 VM, 9 upload/long content, 9 settings, 9 compatibility) |
| Initial route/state matrix | **846 combinations**: 94 entries × nine widths |
| Additional interaction geometry | **517 captures**; **1,363 total** including initial routes |
| Preserved Batch 1 Chromium suite | **38 passed / 0 failed / 0 skipped** |
| Preserved P0 Chromium suite | **15 passed / 0 failed / 0 skipped** |
| Full unit suite | **1,054 passed / 3 known authorization failures**, 116 files |
| TypeScript | **PASS**, no diagnostics |
| Lint | **0 errors / 13 existing warnings** |
| Production build | Default Turbopack: **environment failure**, worker port binding `EPERM`; `npm run build -- --webpack`: **PASS**, compiled/prerendered 85/85 static pages |
| Git whitespace / preservation | **PASS**; 89 protected baseline files unchanged, excluding the two intentionally updated UI reports |

The initial full-width route job began before the final role-matrix containing-block fix: eight widths passed and 320px failed. Its separate final 320px rerun passed all 94 entries. The final selected route matrix combines those eight passing widths with this successful rerun; the earlier failure remains visible in the runner log and execution summary. Final forms and VM jobs were rerun cleanly after harness corrections. No failing authorization tests were skipped, deleted or weakened.

### Batch 2 evidence and limitations

Before/after pairs are linked in [UI-ISSUE-REGISTER.md](UI-ISSUE-REGISTER.md). Eleven representative/before/after PNGs and one report PDF are retained. Complete original failure traces are retained under `ui-batch2-evidence/before/`. Representative passing screenshots and the rendered report PDF are retained under `ui-batch2-evidence/after/`; the full route/interaction geometry is retained in [route-coverage.json](ui-batch2-evidence/route-coverage.json) and [interaction-coverage.json](ui-batch2-evidence/interaction-coverage.json). Passing Batch 2 states do not produce hundreds of screenshots. The unchanged Batch 1 suite retains its existing screenshot behavior and uses a separate regression output directory.

Known limitations: Chromium on macOS only, no real-device/touch or Safari/Firefox certification; no real camera hardware test; no physical printer certification or pixel-perfect PDF pagination approval; no exhaustive screen-reader audit or arbitrary pairwise overlap detection. Loading/backend-network failure simulations are limited by the current local synchronous persistence implementation; supported validation, empty and evidence-error states are covered. No invented server workflows, Excel export or inaccessible placeholder features are reported as tested.

The three existing P0 authorization acceptance failures remain open and unchanged: `P0-AUTH-RT` (unknown actor Red Tag creation), `P0-AUTH-ENT` (ordinary-member entitlement mutation), and `P0-AUTH-ACT` (unauthorized canonical Action creation). They are not UI fixes and continue to make the full unit command nonzero. No new functional regression was observed in the executed browser/unit checks. UI stabilization checkpoint readiness is **READY WITH GAPS**: confirmed Batch 2 UI defects are fixed; production authorization readiness remains outside this UI task. Default Turbopack reproducibility is an environment gap; the webpack production build passed.

Batch 2 automation additions: `playwright.batch2.config.ts`, `e2e/ui-batch2-helpers.ts`, `e2e/ui-batch2-routes.json` and six `ui-batch2-*.spec.ts` files. The two QA reports are updated; prior QA baseline, backend handover, Dashboard fix, P0 tests and all Batch 1 code/tests/evidence remain preserved. No dependency was added. Branch and HEAD remain `feat/audit-admin-question-management` / `e5e9950121bf7a89d2c1700a748b5534f28dd3c3`, with existing and new changes uncommitted. No commit, push, merge or deployment was performed.
