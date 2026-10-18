# Action evidence quota fix

Validated 19 October 2026. Working tree changes only; no commit, deployment or real-user data reset.

## Cause and behavior

Action uploads previously embedded base64 file bodies in `standalone-5s-actions`. Submission revisions repeated those bodies, exhausting localStorage even though file validation succeeded.

New Action uploads store image/document Blobs in the existing `ops-local-assets` IndexedDB database and its existing `gemba-photos` object store. Action records retain the established `storageKey` reference. Images use the existing optimization pipeline; documents retain their original bytes. No new database, localStorage key or workflow status was introduced.

On the next Action upload or submission for review, existing embedded Action evidence is copied into the asset store first. Only after committed binary writes are its references replaced in the same Action key. This covers completion, progress, issue and submission-revision evidence. Repeated bodies share a content-addressed asset. IDs, actors, timestamps, notes, history and workflow state remain intact. Concurrent Action changes are retained when applying the prepared references.

A failed asset transaction leaves existing records untouched. A failed metadata write restores the original in-memory records and leaves the original persisted records intact. New unattached uploads are removed after a failed save; migrated legacy assets remain available for safe retry. The shared IndexedDB helper now resolves writes on transaction completion, rather than request success.

Existing direct URLs and malformed legacy data URLs are preserved. Old inline records continue to render. Action previews, revision image viewers/document downloads, Action reports, before/after summaries and linked Red Tag completion evidence resolve asset references.

## Data protection

- `standalone-5s-actions` remains the canonical Action key; only attachment representation is compacted before upload or submission.
- No existing localStorage key was cleared or reset, and no Action, Audit, Gemba, CI or Red Tag record was deleted.
- Existing Gemba binary keys and Gemba structured data remain intact. New Action keys use distinct `action-evidence-` / `action-legacy-` prefixes.
- Linked Red Tag evidence retains references rather than copying large file bodies. Historical Red Tag inline evidence remains supported.
- Browser checks used fresh synthetic contexts. Actual user browser data was not accessed or modified by QA.

## Verification

- Full Vitest: 1,131 passed, two pre-existing authorization acceptance failures, 1,133 total. The unchanged failures are `P0-AUTH-ENT` and `P0-AUTH-ACT`; none were skipped or weakened.
- Focused Action, Red Tag and Gemba storage suites: 205/205 passed, including the report compatibility case.
- Chromium: three Action accordion/upload/validation journeys at 320, 768 and 1440px; two quota-recovery cases at 320/1440px; two linked Red Tag/Action regression journeys at 320px and 1366px. All seven unique cases passed.
- Quota checks actually reproduced `QuotaExceededError` using the old inline representation, then successfully saved a large PDF using the fixed upload path. Existing and new documents downloaded byte-for-byte after reload. Synthetic unrelated module data remained identical.
- A real IndexedDB abort was injected and metadata remained unchanged. The final 320/1440px retry also passed with the abort injected after the write request succeeds, before transaction completion. No dangling evidence reference was saved.
- TypeScript passed. Lint passed with zero errors and 13 existing warnings.
- Isolated production Webpack build passed.

Artifacts: `test-results/action-evidence-quota/`, `test-results/action-evidence-quota-final/`, `test-results/action-evidence-quota-commit-abort/`, `test-results/action-evidence-quota-red-tag/`. Full unit results: `/tmp/ops-evidence-quota-full-final.json`. Build log: `/tmp/ops-evidence-quota-build-final.log`.

## Scope and limits

This remains browser-local persistence, not backend file storage or cross-device synchronization. If IndexedDB or the browser's overall storage budget is unavailable, the upload reports a failure and preserves existing records. Migration runs during an Action upload or submission; QA did not migrate the user's live browser session. Earlier user-approved accordion UI was reflected in one stale tabs assertion; authorization assertions were unchanged.

## Submission follow-up — 19 October 2026

The first fix compacted only when uploading. Submitting an existing legacy record without a new upload still copied inline binaries into a revision and could exceed localStorage quota. The Action detail page now uses `submitActionForReviewWithEvidenceStorage`: it checks existing owner/content permissions and required inputs, awaits durable compaction, then invokes the established synchronous submission command, which rechecks current permissions/status. No alternate workflow, status or persistence key was added.

Submission failures now show actionable inline feedback. A synchronous component lock prevents repeat clicks during compaction; uploads and submission cannot overlap. Concurrent store submissions are also revalidated before writing, allowing only one revision/history event. A failed binary migration leaves the old record unchanged. If compaction succeeds but the final submission write fails, the compacted draft remains available, with no submitted status, revision or notification added.

Additional changes: `lib/actions/action-store.ts`, `features/five-s/action-detail-page.tsx`, `tests/action-evidence-quota.test.ts`, `e2e/action-evidence-quota.spec.ts`, and this report. All prior working-tree changes were preserved.

Current validation:

- Evidence quota unit suite: 11/11 passed, including four new submission tests covering quota recovery without upload, concurrent duplicate rejection, unknown actors, binary failure and final workflow-write failure.
- Full Vitest: 1,135 passed; the same two known authorization acceptance failures (`P0-AUTH-ENT`, `P0-AUTH-ACT`) remain visible; 1,137 total, zero skipped.
- TypeScript passed; lint passed with zero errors and 13 existing warnings.
- Chromium: 7/7 passed. Action accordion regressions ran at 320/768/1440px; upload quota recovery and direct legacy-evidence submission each ran at 320/1440px. The direct cases reproduced the exact old revision-copy quota failure, injected a committed-request/before-commit abort, verified unchanged records and visible feedback, retried successfully, and downloaded the original PDF byte-for-byte after reload. Unrelated synthetic module data stayed identical.
- No production build rerun for this focused follow-up; the earlier build result above applies to the preceding upload fix.

Follow-up logs: `/tmp/ops-submit-quota-full.json`, `/tmp/ops-submit-quota-unit.log`, `/tmp/ops-submit-quota-tsc.log`, `/tmp/ops-submit-quota-lint.log`. Browser artifact directory: `test-results/action-submit-quota/`.
