# Red Tag Enhancement Phase 2

Validation date: 18 October 2026 (IST). Working tree implementation; no commit, push, merge or deployment.

Branch: `feat/audit-admin-question-management`
Base commit: `e5e9950121bf7a89d2c1700a748b5534f28dd3c3`

## Requirement status

The final Phase 2 Chromium matrix passes 16/16. Batch 1 passes 38/38, Batch 2 passes 63/63 and the existing 320/1440px seven-decision regression passes 2/2. P0 passes 15/15. Windows initially completed 52 passed / 2 development-runtime failures. The final user-requested retry passes both affected route matrices (2/2), with all 120 routes tested at each affected size. Earlier failures remain documented below. Implementation is complete with the known authorization and verification gaps listed here.

| Step | Status | Implementation and limits |
| --- | --- | --- |
| 1. Architecture inspection | COMPLETE | Original Red Tag store/types/UI/report, canonical Action store/lifecycle, current session, Admin users, organization zones, shared inputs and QA fixtures inspected. |
| 2. Creation permissions | PARTIAL | Frontend store checks current known active session, creator permissions/approved roles, plant/zone access and module entitlement. No backend authentication or tenant enforcement exists. |
| 3. Creation form | PARTIAL | Department dropdown derives active organization zone departments; physical item Category removed from new creation and validation; historical fields retained. There is no independent department master; no new settings system was introduced. |
| 4. Timeline | COMPLETE | Saved creation/review/decision/disposition/Keep/closure events determine completion. Canonical Actions remain independently counted. Legacy execution cannot advance a new tag past pending review. |
| 5. Handle Directly | COMPLETE | New choice removed; historical direct records and execution commands retained. No automatic Action creation. |
| 6. Assign to Me | COMPLETE | Current eligible user toggles self-assignment. Approved Zone Leader exception allows execution of their own assigned-zone Actions. Self-review remains forbidden; leader-owned Actions require an explicitly selected eligible independent reviewer. |
| 7. Multiple Actions | COMPLETE | Optional ID array supplements existing first Action ID; canonical source relationship retained; duplicates, missing/foreign links rejected. No Action object copies in Red Tag storage. |
| 8. Action accordions | COMPLETE | Native keyboard-operable details/summary with ID, title, status, owner, due date, work/review links and preserved submissions. |
| 9. Due date | COMPLETE | Existing native date input is editable; local-today minimum and command-level calendar/past-date validation. Existing overdue Actions unchanged. Native operating-system date popup sizing is outside DOM geometry coverage. |
| 10. Zone Leader review | COMPLETE | Active unique configured same-plant leader plus recorded reviewer identity required. Missing/conflicting/stale assignments block; no fallback. All seven decision forms and atomic Keep closure preserved. |
| 11. Tag History | COMPLETE | Bottom, collapsed native accordion; full saved history sorted chronologically, with existing actor/date metadata. |
| 12. Action hyperlinks | COMPLETE | Canonical `/actions/[id]` ID links; redundant generic View Action button removed. Permission-specific work/review links remain. |
| 13. Rework revisions | COMPLETE | Canonical Action submission snapshots and review events persist together with lifecycle changes. Tag rework is derived from canonical events; no new Tag rework command/status. Older lost submissions cannot be reconstructed. |
| 14. Regression protection | PARTIAL | Existing browser suites executed; Windows runtime failures retained below. QR and unrelated module logic unchanged. Historical direct workflow has an explicit compatibility fixture. |
| 15. Automated tests | COMPLETE | New focused unit tests and synthetic browser journeys added; final aggregate results recorded below. Original authorization acceptance file unchanged. |
| 16. Windows browser QA | PARTIAL | All six requested full multi-Action/rework journeys and Keep closure cases pass, plus leader execution and actual snapshot image preview at 320/1440px, and long-text reports. Real local Chromium, synthetic isolated contexts; native operating-system calendar popup geometry remains unverified. |
| 17. Final verification | COMPLETE | TypeScript, lint and isolated Webpack build pass; all browser suites executed with failures recorded below. Existing entitlement and generic Action creation authorization gaps remain. |
| 18. Report | COMPLETE | Runner results, preservation evidence and remaining limitations are recorded below. |

## Models, persistence and compatibility

- `RedTag.actionIds?: string[]` stores canonical IDs only. Existing `actionId` stays the first link and remains readable. Normalization deduplicates legacy/new IDs without discarding historical category, department, review, disposition or closure metadata.
- Source matching also discovers existing canonical `sourceModule: redTag` / `sourceId` relationships. New explicit links validate source, plant, zone and current actor; links to unrelated Actions are rejected.
- All linked canonical Actions must be present and Completed before physical disposition closure. Completing one Action cannot complete another. Missing historical references remain visible and block unsafe closure.
- Existing Closed records remain Closed. Legacy safe single-Action disposition normalization is retained; multi-Action records require the full completion guard.
- `MyAction.submissionRevisions?` stores immutable submitted notes, category, cost/currency, evidence/progress references, actor, timestamp and associated review event ID. Snapshots are appended in the same canonical durable write as submission; sent-back/verified events attach to the relevant snapshot in their lifecycle write.
- Existing latest legacy submissions can be captured at an actual review with explicit `legacyCapturedAt` provenance; unknown submitter stays unknown. Earlier lost packages are never fabricated. Existing activity/review history remains intact.
- Snapshot evidence uses the existing evidence URL resolver and viewer. No second evidence store or Action database was created.
- Existing persistence keys remain `five-s-red-tags-v1` and `standalone-5s-actions`. No new storage key, application reset or migration is introduced. The existing one-time reset implementation and marker `ops-red-tag-original-reset-v1` are unchanged.
- No real browser or production storage was cleared. Only isolated synthetic browser fixtures were written. Unrelated records/configuration remain protected by targeted writes and failure tests.

## Authorization and unresolved cases

These are browser-local demo controls, not production security. Red Tag creation/review/Keep and linked creation resolve the current demo session against active Admin records rather than trusting arbitrary actor names or IDs. Existing Action lifecycle authorization is reused; owner/reviewer metadata is resolved from known users. Direct generic Action creation and entitlement mutation still have the documented acceptance failures and require a backend authorization boundary.

The Zone Leader self-work exception is restricted to the responsible user, active configured same-plant leadership, assigned zone and existing editable work statuses. It does not allow working on another person's Action or reviewing one's own submission. An explicit independent reviewer uses existing canonical reviewer fields and the canonical review predicate; no automatic reviewer is selected.

A pending historical tag assigned to someone who is no longer its unique current Zone Leader remains blocked. Historical reviewer metadata is preserved; no silent reassignment/migration was introduced. Missing or conflicting leadership requires configuration repair. The organization model currently supplies plant/zone scoping rather than server-enforced tenant isolation. Product “Leader” and “User” map to the existing Zone Leader and Zone Member roles; no new role or permission identifier was introduced.

Proposed backend follow-up, not implemented here: enforce authenticated tenant-scoped commands and server actor/timestamps; persist decision/Keep/closure and Action submission/review revisions transactionally; retain durable evidence versions and multiple source links. Existing backend API proposals remain unchanged.

## Confirmed defects and evidence

1. Unbroken Red Tag item descriptions expanded the detail grid beyond the viewport. Fixed the grid children's minimum width and text wrapping. Before: `evidence/red-tag-phase2/long-description-before-1440.png`.
2. Unbroken Action source/description text expanded Action metadata. Fixed the metadata flex text child and inherited wrapping. Before: `evidence/red-tag-phase2/action-source-overflow-before-1440.png`.
3. Completing an Action before review incorrectly invoked legacy Tag synchronization. Restricted the fallback to legacy execution records with no review metadata. Before: `evidence/red-tag-phase2/unreviewed-action-completion-before-320.png`.
4. Imported After evidence remained absent from an already-mounted disposition form because it held a stale empty local draft. The form now derives saved evidence until explicitly edited; physical completion validation remains unchanged. Failure runner log: `evidence/red-tag-phase2/stale-disposition-evidence-failure.log`; after: `evidence/red-tag-phase2/imported-evidence-after-1440.png`.
5. Report descriptions expanded the report on narrow screens. Added intrinsic-size-safe wrapping to the existing report article. Before: `evidence/red-tag-phase2/report-description-before-320.png`.
6. Review after an Action had already completed did not refresh disposition because reconciliation watched only Action changes. It now also watches the saved decision type. Before: `evidence/red-tag-phase2/completed-action-before-review-before-320.png`.
7. The surrounding Responsible label overrode the Assign to me button's accessible name. Added its explicit accessible label.

The browser geometry helper now uses actual visibility when inspecting descendants of collapsed native accordions. Hidden accordion content is not an interactive visible control; visible geometry, focus and hit-test checks remain enforced. Historical direct-disposition browser coverage seeds its explicit historical mode because the new Handle Directly choice is intentionally removed.

## Verification results

| Check | Result |
| --- | --- |
| New Phase 2 unit tests | 26/26 pass |
| Focused Red Tag / Action / failed-write / dashboard regression | 174/174 pass |
| Full Vitest suite | 1,109 pass; 2 known authorization failures; 1,111 total |
| Phase 2 Chromium matrix | 16/16 pass |
| Existing Batch 1 Chromium | 38/38 pass |
| Existing Batch 2 Chromium | 63/63 pass |
| Existing Windows laptop Chromium | Initial: 52 pass / 2 development-runtime failures; final affected-matrix retry: 2/2 pass |
| Existing P0 Chromium | 15/15 pass |
| Existing seven-decision / Back Chromium regression, 320/1440px | 2/2 pass |
| TypeScript (`npx tsc --noEmit`) | Pass, exit 0 |
| Lint (`npm run lint`) | Pass, exit 0; 0 errors, 13 existing warnings |
| Webpack production build (`npm run build -- --webpack`) | Pass, exit 0; isolated temporary copy |
| `git diff --check` | Pass |

The 26 new unit/integration cases cover authorized role creation, current-session/plant/zone rejection, department/category compatibility, leadership conflicts, source/link validation, multiple independent Actions, self-assignment, local date rules, saved timeline progress, three submission revisions/two rework cycles, immutable revisions during editable rework, independent rework histories, failed durable writes, legacy snapshot provenance, Closed Keep stability and reload persistence. Browser cases cover the actual form, navigation, accordions, image preview, closure and report UI.

All three original authorization acceptance tests execute unchanged. `P0-AUTH-ENT` and `P0-AUTH-ACT` still fail. `P0-AUTH-RT` now passes through the new session/creation guard; independent new tests use valid configured departments to verify unknown/impersonated actor rejection. No acceptance test was skipped, inverted or weakened.

Final Phase 2 coverage: multi-Action creation, self-assignment toggling, past-date rejection, editable future dates, unique Zone Leader decision, rework, revision/evidence replacement, independent Action completion, saved timeline, collapsed/keyboard history, physical completion and reports at 1366×768, 1280×720, 1280×600, 1024×600, 911×512 and 1440×900. Keep closes atomically at all six sizes. Leader-owned Action execution, independent review, review after Action completion, actual snapshot image preview and Escape close execute at 320px and 1440px. Long unbroken report content is checked at 320px and 1440px.

The full final matrix uses real Chromium and the warmed isolated Webpack development server on `127.0.0.1:4179`, with synthetic fresh contexts. It checks DOM geometry, clipping, hit testing, focus, native accordion keyboard operation, popup bounds and persistence rather than relying on screenshots. The final 16/16 rerun also explicitly asserts timeline label bounds/non-overlap and native date-input local-today minimum; output is `test-results/red-tag-phase2-geometry-results.json`.

The first broad production-build attempt encountered Audit report `networkidle` timeouts despite rendered content and quick loopback responses; traces showed route-prefetch activity. It was interrupted and is not counted as a pass. The existing development baseline was restored and all 123 inventory/fixture routes warmed (HTTP 200) before final regression. Application sources match the separately successful production build.

The full Windows run completed all 120 routes at all eight sizes: 960 route/viewport combinations, zero recorded geometry failures. The 1093×614 and 911×512 cases failed their unchanged page-error assertions with 9 and 20 instances respectively of `Performance.measure: Page cannot have a negative time stamp`. Their recorded stacks are in Next's compiled React RSC development `flushComponentPerformance` / `flushInitialRenderPerformance`, with no OPS workflow frame. This identifies the observed throwing code; the exact timing cause is not established. No errors were filtered, caught or silenced and no dependency was patched. The fresh-server retest failed both cases at `/visual-management/meetings/VMM-2026-013` with `net::ERR_NETWORK_IO_SUSPENDED`. Its screenshots and traces remain under `test-results/windows-red-tag-phase2-fresh-rerun/`. The further user-requested retry passed 2/2 (4.2 minutes) without changing the application or assertions: `test-results/windows-red-tag-phase2-retry-now-results.json`. Both sizes completed all 120 routes; the unchanged geometry and page-error assertions passed. Earlier failures remain retained and are not relabeled as passes. See `evidence/red-tag-phase2/windows-runtime-errors.json` and the retained original traces.

Machine-readable summary: `evidence/red-tag-phase2/verification-results.json`.

Commands used include `npx vitest run`, the focused `tests/red-tag*.test.ts tests/action*.test.ts tests/p0-data-integrity.test.ts tests/p0-dashboard-red-tag.test.ts` run, `npx playwright test --config=playwright.red-tag-phase2.config.ts`, existing `playwright.ui.config.ts`, `playwright.batch2.config.ts`, `playwright.windows.config.ts`, and `e2e/p0-critical.spec.ts` / `e2e/red-tag-decisions.spec.ts`. Browser commands use `OPS_QA_EXTERNAL_SERVER=1`, the cached Chromium executable and separate result directories.

## Files and preservation

A SHA-256 baseline comparison covers 651 existing source/test/configuration/document files: 629 remain byte-for-byte unchanged, with 22 focused existing files edited. All pre-existing documentation, backend handover files, dashboard sources, QR implementation, package files and previous Windows shared component fixes remain unchanged. The authorization acceptance file matches its original hash. See `evidence/red-tag-phase2/preservation.json`. No secrets or environment files were included in isolated QA/build copies.

### Application files

- `features/actions/action-submission-history.tsx`
- `features/actions/create-linked-action-dialog.tsx`
- `features/five-s/action-detail-page.tsx`
- `features/five-s/red-tag/access.ts`
- `features/five-s/red-tag/red-tag-module.tsx`
- `features/five-s/red-tag/red-tag-report-page.tsx`
- `features/five-s/red-tag/store.ts`
- `features/five-s/red-tag/types.ts`
- `features/five-s/red-tag/workflow.ts`
- `features/five-s/types/my-actions.ts`
- `lib/actions/action-store.ts`

### Tests and configuration

- `e2e/red-tag-phase2.spec.ts`
- `e2e/ui-batch2-helpers.ts`
- `e2e/windows-disposition.spec.ts`
- `playwright.red-tag-phase2.config.ts`
- `tests/action-step-persistence-assignment.characterization.test.ts`
- `tests/gemba-dialog-layout-polish.characterization.test.ts`
- `tests/p0-data-integrity.test.ts`
- `tests/red-tag-before-after-evidence.characterization.test.ts`
- `tests/red-tag-keep-confirmation.test.ts`
- `tests/red-tag-phase2.test.ts`
- `tests/red-tag-reset.test.ts`
- `tests/red-tag-simplification.characterization.test.ts`
- `tests/red-tag-v2-create-review-decision.characterization.test.ts`
- `tests/red-tag-v2-disposition-closure.characterization.test.ts`
- `tests/red-tag-v2-foundation.characterization.test.ts`
- `tests/red-tag.characterization.test.ts`

### Report and evidence

- `docs/QA/RED-TAG-PHASE2-IMPLEMENTATION.md`
- `docs/QA/evidence/red-tag-phase2/` contains representative before/after screenshots and machine-readable verification/preservation summaries.

Fixture adjustments replace nonexistent linked IDs with real canonical Actions, use configured departments and the actual same-zone reviewer, and explicitly set demo session identity. Existing behavioral assertions remain; intentionally changed UI expectations now assert editable due dates and removal of the new direct-handling choice.

## Known verification limits

- Chromium on this host with requested CSS viewport sizes; no physical Windows hardware or native Windows date-popup validation.
- No real users, production data, backend tenant security or cross-device synchronization tested.
- Earlier missing legacy revision packages cannot be recovered.
- Pilot runs uncovered real defects and selector/environment issues. Final browser results use the isolated development server; the production build was checked separately. Interrupted attempts are not counted as passes.

## Completion status

READY WITH GAPS. Phase 2 implementation and requested verification are complete. The final affected Windows route retry passes; the two existing unit authorization acceptance failures and native operating-system calendar popup verification remain open. No storage key was reset in this phase, and no commit, push, merge or deployment was performed.
