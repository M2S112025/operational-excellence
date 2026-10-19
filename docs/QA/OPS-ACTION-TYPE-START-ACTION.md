# Action Type selection at Start Action

Date: 20 October 2026. Repository: M2S112025/operational-excellence. Branch: `feat/audit-admin-question-management`. Verified baseline HEAD: `93a8947411b7cd56c961b8cd644f9c95cc10fa80`. This report describes local uncommitted work. No commit, push, merge or deployment performed.

## 1. Existing implementation reused

Finished the retained `MyActionType`, selection dialog, canonical start command, revision metadata and mixed Action Plan/Type tests. Reused the existing Dialog, Button, native labelled radio inputs, Action store, evidence, workflow and report components; no shared Radio component exists in this repository. Reconciled four independent pushed fixes absent from the retained local tree: nested Gemba evidence-dialog ownership, Audit quota-test navigation readiness, clearing inherited Audit scores in the cross-module fixture, and a fixed clock in report-rendering tests.

All original changed/untracked files, tests and experimental code were saved before reconciliation, with a patch and SHA256 manifest, in ignored `test-results/action-type-original-work-2026-10-20.tar.gz`. The existing unrelated local change to `AUDIT-EVIDENCE-QUOTA-AND-REASSIGNMENT-HINTS.md` remains untouched.

## 2. Files changed

Runtime: `features/five-s/types/my-actions.ts`, `lib/actions/action-config.ts`, `lib/actions/action-store.ts`, `lib/actions/action-creation-access.ts`, `features/five-s/action-detail-page.tsx`, `features/actions/action-submission-history.tsx`, `features/five-s/action-report-page.tsx`, `features/reports/canonical-action-report-page.tsx`.

Verification: `tests/action-plan-execution-types.test.ts`, existing Action Plan creation/start/undo, evidence-quota, store and assignment characterization tests, `tests/red-tag-phase2.test.ts`; `e2e/action-plan-execution-types.spec.ts`, existing accordion/start/undo and Red Tag Phase 2 browser tests. Existing P0 authorization tests were not changed. Existing lifecycle assertions remain; start callers now supply an explicit type and authenticated positive fixtures represent actual selectable demo users.

Documentation: this report and `OPS-ACTION-PLAN-AND-EXECUTION-TYPES.md`.

## 3. Final model

`MyActionType` has exactly `immediate` (Immediate Action) and `corrective` (Corrective Action). Optional `actionType` is persisted on the canonical Action, start/undo activity events and submission revision snapshots. A single label helper supplies display labels and the neutral `Not recorded` fallback. No new IDs, storage keys, source models or statuses.

Existing `Assigned` and legacy `Open` states represent work that has not started; the product has no `Not Started` status. New Actions remain untyped. Creation and generic updates cannot inject the type. Existing rework can restart through the same explicit selection.

## 4. Start Action interaction

Start Action opens the existing modal with two mutually exclusive labelled radio options and no selection. Confirm & Start stays disabled until selection. Cancel closes without mutation. Keyboard radio navigation and focus/geometry are covered in Chromium. Confirmation guards duplicate clicks, checks the state displayed at modal opening, and invokes the canonical command. Errors keep the dialog open for permission, missing/changed Action, invalid lifecycle or failed storage; refresh/retry guidance is visible.

The selected type is read-only in Action Summary and Review Package. Start History records the typed start and undo events. Both Action report implementations display the saved type; submission revisions show the type captured for that revision.

## 5. Persistence and authorization

Start binds the caller ID to the authenticated demo session and active directory user. Caller-supplied names/roles are not trusted. It checks existing Action work permissions, organization scope when present, Actions/source entitlements, and allowed lifecycle/type. Legacy records without organization metadata remain supported in the existing single demo organization.

The command re-reads durable storage before validation, compares the modal state token when supplied, and writes type, In Progress status and start activity together through the existing persistence command. Failed writes leave the previous Action intact. It does not change source, owner, reviewer, due date, evidence, notes or category. Duplicate starts are rejected by the lifecycle check. No second Action is created.

## 6. Undo and restart

Undo uses the existing permitted starter/owner path and prior-state restoration, with a fresh authenticated storage read. It clears the current type while retaining typed start/undo events, drafts, evidence and immutable submission revisions. Every subsequent Start Action opens with neither choice selected. Existing Open, Assigned and Rework Required prior states are preserved.

## 7. Historical compatibility

Untyped existing records remain readable and show Not recorded. Already-running untyped historical Actions can continue their existing submission/review/completion flow without inventing a type. Untyped historical events and revisions stay untyped. Records are not migrated or renamed; no historical timestamps, evidence or relationships are reconstructed.

## 8. Cross-module behavior

The shared command accepts either type for canonical Actions with Red Tag, Audit, Gemba, Continuous Improvement, Visual Improvement, Visual Management and Manual origins. Unit and Chromium matrices cover all seven sources with both explicit choices, saved type after reload, and unchanged source/owner/reviewer/due date. These matrix cases use synthetic stored canonical Actions; they do not claim fourteen full source-creation workflows.

Real Audit and Red Tag shared creation UI journeys are exercised at 320 and 1440 pixels. Existing Red Tag linked-Action, rework, Keep and direct-disposition regression and existing cross-module integration tests protect closure dependencies and reverse links. Audit independent closure rules are unchanged. Reassignment retains type; source never selects type automatically.

## 9. Explicit exclusions

The retained prototype's conditional category, optional-cost and type-specific submission experiments are excluded from active runtime and backed up locally. Both types retain the validated required resolution category, notes, completion evidence and supplied finite nonnegative cost. UI cost retains its existing zero default. Submission/review/rework/closure validations and report calculations stay unchanged. No root-cause form, automatic completion, approval, status, Action creation or new review delegation was added.

## 10. Validation results

- TypeScript: `npx tsc --noEmit` passed.
- ESLint: `npm run lint` passed; zero errors and 10 existing warnings.
- Webpack production build: `npm run build -- --webpack` passed in an isolated source copy linked to the installed dependencies.
- Full Vitest: 128 files, 1,255 tests passed, zero failed/skipped.
- Original P0 authorization tests: all three independently passed, unchanged; also included in full Vitest.
- Chromium: all 105 distinct selected checks passed across final applicable runs: 85 unchanged regression checks from the full run, plus all 20 Action Type acceptance checks rerun after correcting the stale-state test setup. The initial full run had 103 passes and two new-test failures because the test changed array index zero after the existing loader prepended demo Actions. The corrected test locates the target Action by ID and retains stale-error/no-mutation assertions. No runtime change was needed; the complete 20-test affected suite passed (1.2 minutes). No skipped tests.
- `git diff --check`: passed, including final documentation. Index remains empty; HEAD remains unchanged.

Browser setup: established Playwright configuration, external loopback-only production server on 127.0.0.1:4179, installed Chromium executable and separate synthetic contexts. Coverage includes new selection/authentication/stale/quota/undo journeys; Action accordion/start/undo, Red Tag Phase 2, cross-module integration, P0, security, cross-Zone, Action/Audit evidence quota, reassignment and Gemba preview suites. Action Type geometry covers 320×900, 911×512, 1024×600 and 1440×900. Logs/build/source copy are under `/private/tmp/ops-action-type-xjrs90qz`; browser evidence under its `verify/test-results/action-type-final` and `verify/test-results/action-type-final-rerun` directories. Phone and desktop modal screenshots were visually inspected; choices, labels and buttons remain readable and contained. All runtime/test/config files were compared against the built/browser-tested copy; only QA documentation differs. No generated evidence is staged.

## 11. Known limitations

Authorization remains browser-local demo enforcement, not server security. LocalStorage does not synchronize users/devices or provide a transactional backend lock. Fresh reads, state comparison and synchronous single-record writes reject the tested stale/duplicate cases, but do not guarantee cross-tab or cross-device mutual exclusion. No new backend or cross-record transaction is claimed. Physical camera capture and manual real-user UAT were not exercised; synthetic image uploads are covered. Existing lint warnings remain. The original incomplete category/cost experiments are retained only in the local backup, not enabled.

## 12. Manual UAT checklist

- [ ] As the assigned owner/eligible Zone Leader, open an unstarted Action: no saved type.
- [ ] Click Start Action: neither choice selected; Confirm & Start disabled; Cancel leaves it unchanged.
- [ ] Use keyboard Tab/Space/arrows to choose Immediate Action; start; inspect Summary and reload.
- [ ] Repeat with Corrective Action on a different Action.
- [ ] Try rapid double confirmation: one start event.
- [ ] Undo; inspect typed Start History; restart requires a fresh choice.
- [ ] Reassign a started Action and confirm the type and review ownership remain correct.
- [ ] For both types, verify category, notes, completion evidence and cost validations match existing behavior.
- [ ] Submit, send back for rework, restart with explicit selection, resubmit and close; inspect immutable revision types and both reports.
- [ ] Open an untyped historical Action/report: Not recorded; no invented default.
- [ ] Exercise Red Tag linked-Action closure dependency and independent Audit closure; verify reciprocal navigation.
- [ ] Check a stale/changed owner or session denies start with an actionable message.
- [ ] Check the modal at small phone, 911×512, 1024×600 and desktop sizes, including scroll, focus, Cancel and Confirm reachability.
