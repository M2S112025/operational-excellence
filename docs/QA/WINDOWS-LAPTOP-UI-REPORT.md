# OPS small laptop UI stabilization

## Baseline and scope

Feature branch `feat/audit-admin-question-management`, HEAD `e5e9950121bf7a89d2c1700a748b5534f28dd3c3`, including preserved uncommitted Batches 1/2, backend handover, QA automation, Dashboard Red Tag source correction and latest seven-decision Red Tag forms/atomic Keep closure. No commits, pushes, merges or deployments. No production data or real user profiles/sessions.

Four confirmed UI defects are recorded in [WINDOWS-LAPTOP-ISSUES.md](WINDOWS-LAPTOP-ISSUES.md): searchable menus exceed short viewports because their search row sits outside the list’s height budget, the Audit Exit button is partly clipped on narrow screens, and sticky print controls can place the focused Board button beneath the application header, and narrow desktop print sheets clip their KPI tables. The product patch is limited to `components/ops/ops-searchable-select.tsx` one responsive margin class in `features/five-s/components/FiveSAuditExecution.tsx`, and the control positioning and preview scrolling in `features/visual-management/print/visual-management-print.module.css`; the latter keeps the Exit control’s hit/focus area within its narrow header. No store, status transition, authorization rule, QR behavior, data model, storage format/key, scoring or backend contract changed.

## Exact viewport coverage

| CSS width | CSS height | Purpose |
| --- | --- | --- |
| 1366 | 768 | Common laptop viewport |
| 1280 | 720 | Common laptop viewport |
| 1280 | 600 | Short laptop viewport |
| 1024 | 600 | Short workspace with expanded desktop navigation |
| 1024 | 768 | Narrow desktop workspace |
| 1440 | 900 | Desktop regression baseline |
| 1093 | 614 | Approximate effective viewport at 125% scaling |
| 911 | 512 | Approximate effective viewport at 150% scaling |
| 768 | 512 | Additional short-height Audit/Action/navigation checks only |
| 600 | 512 | Additional short-height Audit/Action/navigation checks only |

The scaling examples approximate CSS viewport effects. **Chromium on macOS does not certify Windows-native font rendering, Microsoft Edge, physical Windows OS scaling, or real Windows hardware behavior.** No Safari/Firefox, physical printer or camera hardware certification is claimed.

## Browser coverage and assertions

Initial route inventory combines existing Batch 1 and Batch 2 inventories: **120 requested route/state entries × eight laptop dimensions = 960 combinations**. Aliases, redirects, query selections and guarded historical records are identified separately from business workflow execution. The route inventory and final coverage JSON retain exact URLs, role, headings, geometry and viewport.

Interaction coverage includes:

- Global navigation/header and expanded/collapsed sidebar; smaller-width navigation keyboard Escape/focus restoration; Dashboard Performance and Modules views.
- Audit create/schedule/zone dropdown, actual synthetic execution, reports and Audit Settings long standard-question editor/custom-question validation and dropdown.
- Red Tag create validation, QR quantity validation, detail/report/print initial routes, all seven decision forms, physical disposition setup/completion validation, After image upload and existing Closed outcome.
- Action creation and nested zone popup; detail due-date validation; initial listing/detail/report routes; canonical linked Action dialogs from Gemba.
- Gemba scheduling/participant search, observation/evidence validation, evidence preview and completion review.
- CI create/long proposal, related-record picker, proposal review remarks and completion validation/review.
- VM boards/settings, actual synthetic meeting, KPI deviation, guest dialog, metric editor/nested category picker and print workspace/control reachability.
- Reports filters/empty search, export menu, CSV download, summary/record routes and print-media layout.
- Admin user/Zone validation and editors, permission matrix, preferences dropdown and Super Admin module-disable confirmation canceled without changing entitlements.

DOM checks include document/control horizontal bounds, ancestor clipping, popup top/bottom bounds, intentional table/tab scrolling, dialog last-field/footer reachability, keyboard focus and center hit-testing after normal scrolling, and sidebar/content separation. An element below the fold is acceptable when normal scrolling makes it reachable. Failure screenshots complement geometry; screenshots alone are not used as pass evidence.

## Mandatory Red Tag decision regression

Exact sizes: **1280×600, 1024×600, 911×512 and 1440×900**. The existing seven-decision scenario is reused with short-height control hit-testing. It checks the full selector, correct form, Back without status/history/storage changes, per-decision draft isolation/reselection, visible selected choice on return, no Back after submission, double submission prevention and unchanged post-submission outcomes for all seven choices. Keep additionally checks empty justification rejection, direct Closed outcome, canonical actor/date metadata and reload persistence. The existing atomic Keep store command and permissions are unchanged.

## Execution results

| Check | Actual final result |
| --- | --- |
| Complete laptop Playwright suite | 54 passed, 0 failed, 0 skipped |
| Affected report/print retests after final preview fix | 8 passed, 0 failed; all eight laptop sizes, A3/A4 print media |
| Existing Batch 1 Chromium suite | 38 passed, 0 failed |
| Existing Batch 2 Chromium suite | 63 passed, 0 failed |
| Existing P0 Chromium suite, rerun after all fixes | 15 passed, 0 failed |
| Relevant unit regression | 156 passed across 15 files |
| Preserved P0 authorization acceptance | 3 failed; unchanged known gaps |
| TypeScript (`npx tsc --noEmit`) | Passed |
| Lint (`npm run lint`) | 0 errors; 13 existing warnings |
| Isolated production build (`npm run build -- --webpack`) | Passed with matching product source and no environment files |

The 54-scenario laptop suite and eight affected print retests comprise **62 passing browser executions**; together with Batches 1/2 and P0 there are **178 final passing browser executions**. The late preview fix was followed by all eight affected report/print retests, including the new full-table geometry assertions and A3/A4 print-media checks. Earlier interrupted runs and test-probe failures are retained as intermediate evidence, not counted as final passes.

Recorded evidence includes **1,562 DOM state captures and 368 focused-control reachability/hit tests**. Print checks add **120 sheet-content measurements** across 24 screen/A3/A4 contexts.

The complete laptop route sweep covers **960 route/viewport combinations** (120 requested route/state entries, 116 distinct requested pathnames). Red Tag checks passed all seven decisions at all four mandatory dimensions: **28 decision workflows**, plus physical disposition completion at all eight laptop sizes. Existing Batches 1/2 retain their nine widths: 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px.

**Four confirmed issues fixed; no remaining confirmed P0/P1 UI issues in the executed coverage. READY WITH GAPS** for a UI stabilization checkpoint, with the three existing authorization failures and Windows-native/hardware certification gaps explicitly open. This is not production authorization sign-off.

Hash verification confirms **739 baseline files unchanged** outside the three intended UI files; existing QA tests, backend handover documents, Dashboard correction and Red Tag workflow work remain intact. Git is still on the stated branch/commit with existing changes plus this task’s UI/tests/docs uncommitted. See [working-tree status](windows-laptop-evidence/git-status.txt) and [execution summary](windows-laptop-evidence/execution-summary.json).


## Evidence and files

Before screenshots and confirmed failure traces are retained under `windows-laptop-evidence/before/`; after screenshots and representative evidence are under `windows-laptop-evidence/after/`. Runner logs, exact route/state geometry and machine-readable execution summary provide the final evidence trail. Passing initial route screenshots are limited to representative views; every confirmed failure has before/after evidence.

Product: `components/ops/ops-searchable-select.tsx`, `features/five-s/components/FiveSAuditExecution.tsx`, and `features/visual-management/print/visual-management-print.module.css`. Automation: `playwright.windows.config.ts`, `e2e/windows-helpers.ts`, `e2e/windows-laptop-routes.json` and six `windows-*.spec.ts` files. These two reports and evidence are new. Existing QA suites and handover documents remain preserved.

Known limitations: this is an automated geometry/focus/scroll regression, not a full screen-reader audit or pixel-perfect visual approval. Existing guarded/missing-share and locked historical editor states are not presented as executed workflows. Camera and physical printing are not certified. Initial hot-reload/network-idle environment artifacts are retained separately from final passes. One preliminary build was stopped after starting in the workspace; its generated `next-env.d.ts` was restored from a hash-verified baseline copy. The final build runs in a separate `/tmp` source copy without environment files. Production-server navigation checks are not claimed as passed; the separately executed webpack build and isolated dev-browser checks are reported independently.

The three existing authorization acceptance failures remain visible and unchanged: `P0-AUTH-RT` (unknown actor can call Red Tag creation directly), `P0-AUTH-ENT` (ordinary member can call organization entitlement mutation directly), and `P0-AUTH-ACT` (direct canonical Action creation lacks the required permission boundary). These are outside this UI patch; browser-local guards are not production security. Final readiness and working-tree preservation are recorded in the execution summary.

## Before/after evidence

| Issue | Before | After |
| --- | --- | --- |
| WIN-001, KPI picker | [911×512](windows-laptop-evidence/before/kpi-menu-911x512.png), [1024×600](windows-laptop-evidence/before/kpi-menu-1024x600.png) | [911×512](windows-laptop-evidence/after/kpi-menu-911x512.png), [1024×600](windows-laptop-evidence/after/kpi-menu-1024x600.png), [1440×900](windows-laptop-evidence/after/kpi-menu-1440x900.png) |
| WIN-002, Audit Exit | [600×512](windows-laptop-evidence/before/audit-exit-600x512.png) | [600×512](windows-laptop-evidence/after/audit-exit-600x512.png), [1440×900](windows-laptop-evidence/after/audit-exit-1440x900.png) |
| WIN-003, print Board focus | [1024×600](windows-laptop-evidence/before/vm-print-back-1024x600.png), [1440×900](windows-laptop-evidence/before/vm-print-back-1440x900.png) | [1024×600](windows-laptop-evidence/after/vm-print-back-1024x600.png), [1440×900](windows-laptop-evidence/after/vm-print-back-1440x900.png) |
| WIN-004, clipped KPI preview | [1024×600](windows-laptop-evidence/before/vm-print-clipped-table-1024x600.png), [failing geometry](windows-laptop-evidence/before/print-content-results.json) | [1024×600](windows-laptop-evidence/after/vm-print-back-1024x600.png), [complete table/print geometry](windows-laptop-evidence/print-sheet-geometry.json) |

Additional representative Red Tag forms: [Keep 911×512](windows-laptop-evidence/after/keep-confirmation-911x512.png), [Keep 1440×900](windows-laptop-evidence/after/keep-confirmation-1440x900.png). Exact routes and measured states: [route coverage](windows-laptop-evidence/route-coverage.json), [popup bounds](windows-laptop-evidence/popup-height-geometry.json), [control reachability](windows-laptop-evidence/control-reachability.json). Failure traces are retained in the `before/` folder.
