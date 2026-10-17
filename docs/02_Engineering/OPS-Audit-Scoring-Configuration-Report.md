# OPS Audit Scoring Configuration — Implementation Report

## Scope and compatibility decision

Implemented an editable, permission-controlled Scoring Configuration page at `/audits/settings/scoring`, with guidelines, three numeric inputs, live validation, saved values, unsaved-change status, Save, Discard Changes and Reset to Default.

**Only 0 / 1 / 2 is currently supported.** This limitation is intentional, not an additional grading policy. Execution classifies 0 and 1 as gaps, requires applicable evidence and linked Actions for those values, and treats 2 as fully compliant. Report classifications, score colors and question maxima also depend on these meanings. Ordered alternatives 0 / 2 / 4, 0 / 1 / 5 and 1 / 2 / 3 are rejected rather than changing approved business logic to accommodate them.

`validateAuditScoringPolicy` is the single validator for numeric validity, non-negative values, positive Fully Compliance, strict ordering and current application compatibility. Guidelines examples derive their supported/rejected status and reasons from this validator. No custom combination is presented as supported.

Normal invalid input disables Save. A stale or programmatic invalid submission rejects persistence and restores editor defaults with an explanatory message. Direct store calls reject the same input. Storage/authorization failures preserve the draft and do not report success. Reset does not save; Discard restores the current persisted values.

## Persistence and historical protection

- New key: `ops-audit-scoring-policies-v1`; map keyed by existing organization ID.
- Policy representation: version 1, organization ID, Non/Partial/Fully Compliance values.
- Unsaved organizations default to 0 / 1 / 2; saved policies persist across reloads.
- Normal Audit creation captures the policy for the existing demo-organization workspace. New snapshots are frozen and typed read-only.
- Generic Audit updates preserve the captured policy and cannot add current-policy metadata to a legacy record.
- Existing active/completed Audits are never rewritten when settings are saved.
- Legacy records without snapshots use original scoring behavior without receiving fabricated policy metadata.
- Section totals retain saved question maxima and existing NA behavior. Reports, lists, analytics and dashboard percentage helpers use stored Audit totals, not current organization settings; historical scores and denominators are not normalized or recalculated.
- Existing audit/evidence/custom-question storage keys are unchanged.

## Authorization and evidence preservation

The scoring mutation resolves the current identity and configured account, requires active status, and reuses `administration.manage_configuration` plus organization authority checks. Active platform Super Admin authority is preserved for registered organizations. Inactive/missing accounts, unauthorized users and ordinary Admin cross-organization saves are rejected. Caller-supplied policy metadata cannot change target scope or policy version.

The previously hardened Custom Question mutation boundaries were inspected and retained. They enforce active identity, configuration authority, target organization, immutable organization ownership and editable-field validation, including the evidence-required toggle. The current directory has no per-user organization ID; ordinary Admin authority therefore remains limited to the existing demo-scoped directory. This task adds no new authentication or organization-membership model.

Audit Settings now has three cards: Standard Checklist, Custom Questions and Scoring Configuration. The Scoring action is Configure. Both `/audits/settings/evidence-rules` and `/settings/audit/evidence-rules` redirect to `/audits/settings`. Evidence capture, persistence, completion validation and canonical Action requirements remain intact. Standard checklist editor access remains Super Admin-only.

## Files created

- `lib/five-s/scoring-policy.ts`
- `features/settings/audit-scoring/store.ts`
- `features/settings/audit-scoring/editor-state.ts`
- `features/settings/audit-scoring/page.tsx`
- `tests/audit-scoring-policy.test.ts`
- `tests/audit-scoring-editor.test.ts`
- This implementation report.

## Files modified

- `app/(app)/audits/settings/scoring/page.tsx`
- `app/(app)/audits/settings/evidence-rules/page.tsx`
- `app/(app)/settings/audit/evidence-rules/page.tsx`
- `features/settings/audit-configuration-page.tsx`
- `features/settings/settings-reference-pages.tsx`
- `features/five-s/types/five-s.ts`
- `lib/five-s/audit-store.ts`
- `features/five-s/components/FiveSAuditExecution.tsx`
- `features/five-s/components/FiveSAuditList.tsx`
- `features/five-s/components/FiveSAuditReport.tsx`
- `features/five-s/dashboard-page.tsx`
- `features/five-s/reports-page.tsx`
- `features/five-s/reports-data.ts`
- `features/analytics/analytics-data.ts`
- `features/ops-dashboard/ops-dashboard-data.ts`
- `tests/audit-settings-reference-access.test.ts`

## Automated validation

- Verified starting baseline: 986 tests across 114 files, all passing.
- Focused scoring/editor/access/custom-question/lifecycle/metrics: 86 tests across 6 files, all passing.
- Complete suite: 1,014 tests across 116 files, all passing; 28 new tests.
- TypeScript: passed.
- ESLint: zero errors; 11 pre-existing warnings.
- Production build: `npx next build --webpack`, passed.
- `git diff --check`: passed.

Tests cover default/unsupported examples, numeric and ordering failures, actual editor event handlers without browser automation, reset/discard, invalid-save fallback, persistence/reload, storage failure, organization separation and permissions, captured/legacy/historical policies, stored totals and NA handling, evidence-required completion, independent Audit closure with open Actions, and legacy route redirects. Existing report/dashboard and canonical Action regressions also pass in the full suite.

## Limitations and delivery

Additional scoring combinations require a separately approved change to response classification and related Action/evidence/report semantics. They are not enabled by this task. The editor operates in the current demo-organization workspace; the store preserves existing platform authority and separate registered-organization policies. Browser-local persistence provides neither cross-device synchronization nor server-enforced authorization.

Browser testing: **Not performed, as requested.** No browser, local acceptance server, browser fixtures or screenshots were used for this task. Visual acceptance remains unverified.

Git commit: **Not performed.**

Git push: **Not performed.**

Existing uncommitted work and historical reports were preserved. The original 5S project and Excel tracker were not modified.
