# Audit evidence quota recovery and Action reassignment hints

Validated on feature branch `feat/audit-admin-question-management`, with existing uncommitted work preserved. No commit, push, deployment or production-data mutation.

## Audit quota error

The shared creation dialog embedded initial-evidence data URLs in both the canonical Action and the Audit question. Large existing evidence collections could exceed the localStorage quota at `linkAuditQuestionAction`.

New Audit uploads now save binary data in the existing `ops-local-assets` IndexedDB database and `gemba-photos` object store. The existing Audit localStorage key is retained. `FiveSEvidence.storageKey` is optional; historical `dataUrl` evidence remains readable. Audit execution, previews, existing Action views and reports resolve either representation through the existing evidence URL hook.

Before Audit Action creation, existing embedded Audit and Action evidence is compacted. Each distinct Audit payload is saved durably before its metadata is replaced with a reference. Original bytes, filenames, identities, timestamps, scoring and question text are preserved. Known durable mappings prevent an older mounted Audit form from re-embedding migrated data. Source-link failures retain the existing Action rollback behavior. Creating the Action cannot be dismissed while the async save is in progress, and duplicate submission is guarded.

Failed IndexedDB writes leave existing Audit metadata unchanged and create no Action. Failed metadata writes retain the old source record and binary data for safe retry. Malformed legacy payloads and remote URLs are preserved. No record clearing or asset deletion was introduced; assets may be shared by historical/source/Action records.

## Reassignment hints

Action details use the latest existing `reassignmentHistory` entry. A compact Re-assigned badge in the page header shows a tooltip on hover, keyboard focus or tap, naming the previous owner, new owner, reassignment actor and date. Initial assignments do not show the badge. Hints persist after reload without adding statuses, fields, permissions or writes to the business record.

## Validation

- Full unit suite: 127 files, 1,222 tests passed. Seven new Audit quota tests cover durable migration/reload, stale-form saves, failed asset and metadata writes, concurrent in-memory edits, shared Action/Audit references and malformed legacy evidence.
- Audit browser recovery: passed at 320px and 1440px. Synthetic source evidence deliberately exceeds the remaining localStorage capacity when copied. Tests inject an IndexedDB transaction abort, retry, double-submit, reopen the existing Action view, upload additional evidence, reload, verify original byte count and render source/Action/report thumbnails.
- Shared Action creation/execution regression: four browser journeys passed at 320px and 1440px.
- Reassignment header badge: two Chromium tests passed at 320px and 1440px, covering absence before reassignment, hover, keyboard focus/ring, click activation, Escape dismissal, tooltip boundaries, reload and unchanged business records. Latest focused browser results total eight passing scenarios.
- TypeScript passed; lint has zero errors and 10 existing warnings; isolated Webpack production build passed; `git diff --check` passed.

Evidence and logs remain under ignored `test-results/audit-quota-verified/`, `test-results/action-reassignment-badge/`, `test-results/reassignment-badge-action-regression/` and `/tmp/ops-audit-quota-*.log`.

## Limits

Persistence remains local to the browser. IndexedDB availability and available disk space still govern durable asset writes; failures are reported rather than falling back to unsafe embedded copies. Text-heavy metadata can still exhaust localStorage. Cross-record source linking uses existing compensation, not a backend transaction. No asset garbage collector or cross-device synchronization was introduced. The previously identified Audit status fixture assertions were not altered or skipped.
