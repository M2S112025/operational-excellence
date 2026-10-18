# P0 QA results and open issues

Execution date: 18 October 2026 (IST). Deadline 15:30 IST. Baseline `feat/audit-admin-question-management` / `e5e9950121bf7a89d2c1700a748b5534f28dd3c3`; final QA validates that commit plus uncommitted changes listed below. Audit Settings merge into main was not assumed. No production/browser-user data was modified, and no commit/push/merge/deploy was performed.

## Functional results

| Executed check | Result | Scope / evidence |
| --- | --- | --- |
| Baseline `npm run test` | PASS | 113 files / 1,045 tests passed; before P0 changes |
| Dashboard regression, before fix | FAIL reproduced | 4 failing cases: explicit/legacy Red Tag source, correct/incorrect entitlement combination |
| Dashboard regression, after fix | PASS | 4 cases verify source scope, current counts and Red Tag chart label |
| Focused critical command | PASS | 14 relevant test files / 148 tests passed, covering Audit Settings, Actions, Red Tag lifecycle/QR/Gemba/reset, module access and new integrity/dashboard regressions |
| New `p0-data-integrity.test.ts` | PASS | 5 tests: Action create write failure, source-link rollback/retry, failed rollback retention, standard/custom config storage failure, real persisted completed-Audit reload after configuration changes |
| New `p0-authorization-gaps.test.ts` | FAIL, 3 known defects | Unknown actor Red Tag creation; ordinary member organization entitlement writes; member direct canonical Action creation |
| Full `npm run test` after P0 tests/fix | FAIL acceptance gate | 116 files: 115 passed / 1 failed; 1,054 tests passed / 3 failed (1,057 total). Failures are the explicit unresolved authorization acceptance tests, not skipped/inverted/expected-failure assertions. |
| `npx tsc --noEmit` | PASS | No diagnostics after browser/test/config additions |
| `npm run lint` | PASS with warnings | 0 errors, 13 existing warnings; generated browser artifacts excluded from lint |
| Standard `npm run build` | BLOCKED by environment | Restricted attempt failed font downloads; network-enabled Turbopack attempt hit environment port-binding EPERM |
| Production `npm run build -- --webpack` | PASS | Supported Next webpack fallback with network access compiled/prerendered successfully (exit 0); no compiler/default build config changed |

Existing executed coverage includes Admin/Super Admin standard/custom editing, organization isolation, standard IDs, image references/validation/removal, historical snapshots/scoring, linked Actions/completion restrictions, original Red Tag lifecycle/disposition/QR payloads, Gemba relationships/reset/unrelated-data preservation and entitlement/configuration tests. Unit/SSR/string assertions are not substitutes for browser checks.

## Confirmed bug fixed

**P0-DASH-01: Red Tag source Actions incorrectly used Red Flag entitlement and label.** `features/analytics/analytics-data.ts` filtered `redTag` using `access.redFlag`; the normal shell forces Red Flag inactive. Canonical Red Tag Actions disappeared from performance Action metrics while legacy `source='Red Tag'` could be treated as Manual. Source chart also labeled explicit Red Tag sources Manual. The low-risk fix maps both explicit and legacy source to redTag, checks `access.redTag` and labels the group Red Tag. Regression tests failed before and pass after.

Other archived Red Flag metric branches are guarded by inactive Red Flag access and are compatibility references, not justification to import Red Flag data into Red Tag. No standalone Red Tag entity KPI was added: its metric specification remains a product decision. No broader Dashboard redesign/source-model migration was made.

## Unresolved critical issues

| Issue | Reproduction/evidence | Impact / disposition |
| --- | --- | --- |
| P0-AUTH-RT | Direct `createRedTagV2` accepts unknown caller-supplied actor; failing acceptance test | Mutation authorization incomplete; retain original lifecycle and add configured active actor/role/scope checks in a separately reviewed fix |
| P0-AUTH-ENT | Ordinary member directly calls `saveOrganizationAccess` for XYZ successfully; failing acceptance test | UI-only platform protection can be bypassed within browser-local app; server tenant/platform authority required |
| P0-AUTH-ACT | Member lacking creation permission calls actorless `createAction`; failing acceptance test | Creation authority/source/owner validation needs canonical mutation boundary/server principal |
| B-AUTH/TENANT | Demo session/role/localStorage/module gates; most operational entities lack tenant FK | Blocks production authorization/multi-user claims, not receipt of backend requirements package |
| B-TRANSACTION/FILES | Separate source/Action/relationship writes, local/inline/IDB evidence | Requires server transactions/idempotency/file ACL/migration policy; current failure/retry tests are not ACID proof |
| BUILD-ENV | Default Turbopack build blocked by font networking/worker port restriction; webpack fallback passed | Default compiler reproducibility remains an environment gap; production webpack build result is separately recorded |

Legacy VI direct permission checks, Audit create/update boundaries and some Gemba field validation also remain Phase 0-documented gaps; they were not silently fixed or certified by this P0 scope. `npm install` reported 22 dependency advisories (4 moderate/16 high/2 critical); no differential vulnerability attribution or remediation was performed. Treat as an untriaged dependency review item, not proof Playwright introduced those advisories.

## Browser execution: PASS in the stated scope

Final Chromium run: **15 passed, 0 failed, 0 skipped, 0 flaky** in 39.4 seconds. Playwright 1.64.1; isolated downloaded Chrome for Testing 156.0.8078.4; task-owned Next development server at `http://127.0.0.1:4179`; fresh synthetic contexts and one-time fixture seeding. This is development-server browser validation, not a claim that default Turbopack production build passed.

**All five requested widths actually executed:** 320, 375, 768, 1024 and 1440 CSS pixels. Each visited all 11 routes below, totaling **55 route/viewport checks**:

`/dashboard`, `/audits`, `/actions`, `/5s/red`, `/5s/red/create`, `/5s/red/overview`, `/gemba`, `/continuous-improvement`, `/audits/settings/standard-checklist`, `/audits/settings/custom-questions`, `/settings/users`.

Actual assertions: HTTP 200/app heading/shell; document horizontal overflow; visible desktop sidebar or mobile drawer; local overflowing table scrollability; mobile drawer navigation/close and desktop sidebar toggle/workspace offset; modal upload/camera controls; Save action bounds/reachability; reference preview/footer non-overlap; textarea horizontal bounds; custom dropdown viewport bounds; Cancel/Escape behavior. Route checks captured **0 page errors and 0 console warning/error messages**. Standard dialog and custom dropdown screenshots at 320px were also visually inspected. These assertions do not certify every pair of elements or every text label in the entire application.

Four functional browser cases additionally passed at Playwright's default 1280×720 viewport: Admin persisted standard edit; Super Admin XYZ-only override with Admin ABC isolation/member read-only; real reference photo upload/compression/reload/removal; disabled Actions direct route and ordinary-role Super Admin denial (`/super-admin/organizations`). Auth sessions were fixture-seeded; no real login/password acceptance claim is made.

The original bulk QR route `/5s/red/create-qr/print?plant=PLANT-EGM&quantity=100` was also executed: **100 rendered labels**, one reusable Plant creation target, Chromium PDF generation (26 pages), unchanged Red Tag/Action storage. SVG title/payload consistency was checked; the PDF was not independently raster-decoded for QR scanning or visually certified page by page. Physical scan/printer/camera/microphone checks are **NOT RUN**. Full original lifecycle remains covered by the executed Node tests, not by a complete browser lifecycle journey.

No blocking layout failure was found in this scoped matrix, and no product layout changes were made. Initial Brave launch was an **environment failure before page load**, not a page failure or visual pass; its trace/error context/log are retained in [evidence/browser-launch](evidence/browser-launch/). Downloaded Chromium succeeded; the unneeded separate headless-shell download was canceled after the full Chrome runtime was available and used.

Evidence: [machine-readable execution summary](evidence/execution-summary.json), [final browser log](evidence/browser-final.log), six representative PNG screenshots in `evidence/`, [100-label PDF](evidence/red-tag-100-labels.pdf), critical/full Vitest, TypeScript/lint and webpack-build logs. The complete 65-PNG route/dialog set and HTML/JSON runner report remain under ignored `test-results/p0` and `playwright-report`. Failure screenshots/traces are configured; final page tests had no failures, so no final-page failure trace is invented. Only the failed initial browser launch trace exists.

## Files and reproducibility

New tests: `tests/p0-dashboard-red-tag.test.ts`, `tests/p0-data-integrity.test.ts`, `tests/p0-authorization-gaps.test.ts`; browser `e2e/p0-critical.spec.ts`, `playwright.config.ts`. Source fix only `features/analytics/analytics-data.ts`. Infrastructure: package.json/lockfile, `.gitignore`, generated-artifact exclusions in eslint.config.mjs. Existing Phase 0 docs preserved; seven backend docs created.

Commands: `npm run test` (will remain nonzero until three authorization defects are fixed), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test:e2e`. For the task-owned running dev server set `OPS_QA_EXTERNAL_SERVER=1`; otherwise Playwright starts an isolated server and refuses reuse. Browser binary may be selected with `OPS_QA_BROWSER_EXECUTABLE` or installed via Playwright; use only synthetic contexts and the fixed loopback origin.

Temporary logs: `/tmp/ops-p0-*.log`. Browser artifacts: `test-results/p0`, JSON report `test-results/p0-results.json`, HTML `playwright-report`; these generated paths are ignored by Git and ESLint. Durable summary/manifest belongs with this handover package. Do not publish auth state or sensitive data. No production release “PASS” is implied by complete documentation.
