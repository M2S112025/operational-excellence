# OPS Red Tag Replacement Report

Updated: 17 October 2026. Target: `/Users/rumesh-9634/Projects/Ops`. Functional source: `/Users/rumesh-9634/Projects/5s`.

## Delivery status

The active OPS V2 Keep/decision/disposition workflow has been replaced by the original 5s creation, leader planning, member execution, evidence, review and rework interfaces. Historical OPS records remain read-only under their original IDs. New records use separate versioned storage. OPS navigation, authentication, entitlements and the canonical Action store remain in place.

**Completion blocker resolved by the subsequent approved decision:** members now use a contextual handoff to the existing canonical Action editor for genuinely entered missing category/savings. Captured evidence and completion drafts persist; Save & Return restores the source submission flow; cancellation/refresh do not advance lifecycle. Authorized canonical commands remain authoritative. No default values or duplicate Red Tag creation fields were added.

The subsequent consolidated acceptance passed fixture-based submission, rework, resubmission, closure and canonical evidence checks; see `OPS-Approved-Decisions-Final-Acceptance-Report.md` for final **853-test** validation, discovered/fixed browser defects and exact acceptance exclusions. Physical camera/scan/print and full PDF visual QA remain unverified.


## Bulk Create QR restoration — completed

Restoration date: 17 October 2026. This is a narrow restoration after the replacement and consolidated acceptance; the prior sections remain evidence of those earlier stages.

### Recovered original implementation

Recovered directly from Git commit **`ffb0c4d`** (`feat: enhance visual management meetings and simplify red tag workflow`), corroborated against the saved pre-replacement working-tree snapshot:

- `features/five-s/red-tag/red-tag-module.tsx`: original `RedTagOverviewPage` quantity dialog and `RedTagCreateQrPrintPage` batch layout.
- `app/(app)/5s/red/create-qr/print/page.tsx`: original query parsing and default/fallback behavior.
- `features/five-s/red-tag/qr.ts`: original `getCreateRedTagPath` / `getCreateRedTagQrTarget` helpers, which already survived the replacement.
- `tests/red-tag-v2-qr-print.characterization.test.ts` at that commit: encoded Plant creation payload and explicit no-record-allocation assertions.

**Exact original behavior:** default quantity 1; whole quantities **1–100**; invalid direct print quantities fall back to 1. Each label is a copy of the same reusable Plant-specific `/5s/red/create?plant={encoded Plant ID}` QR (or generic `/5s/red/create` when no Plant reference is supplied). Batch labels display RED TAG, Scan to create a Red Tag and Plant, with a two-column preview and native `window.print()`.

The original implementation had **no unique per-label identifiers, allocation ledger, sequence reservation, QR assignment or automatic Red Tag creation**. It had no standalone PDF generator/download command: downloading is supported through the browser's **Save as PDF** print destination. The request's unique-generation check is therefore tested as preservation of the recovered identity semantics: copies intentionally share the creation target, and real Red Tag IDs remain unique only when the normal creation command runs. No substitute allocation scheme was invented.

### Restored behavior and compatibility adaptations

- Overview **Create QR** opens the recovered quantity/preview workflow. Existing single-record QR stays available as **Record QR**, retaining its stable IDs, authenticated targets and record-specific remount behavior.
- Restored `/5s/red/create-qr/print?plant=...&quantity=...` renders the requested batch and provides native printing/Save as PDF. It no longer redirects to Overview.
- Existing creation target helpers and their payload format are reused unchanged. No counter or storage writes occur during preview or printing.
- Shared existing `qrcode.react` encoder is extracted to `qr-code.tsx`, used by both bulk and individual symbols, with **four-module quiet zone** and level M. Source pseudo-QR is not restored.
- The source 5s create form remains authoritative. A matching active Plant reference opens that same form with its current Plant context; unknown/inactive/foreign Plant references are rejected rather than bypassing source Plant authorization. No new fields, defaults, permission grants or required-photo bypass are introduced.
- The existing active-actor creation gate and parent Red Tag ModuleGate apply. Authentication is unchanged. Disabled entitlement blocks direct batch routes.
- Dedicated batch print styles preserve multiple pages and avoid inheriting the single-record fixed-position print surface. No changes to record print styles or global CSS were required.
- The migrated store, canonical Action adapter, lifecycle, planning, member execution, evidence, review, read-only history and both storage namespaces are unchanged by this restoration.

### Files reused, restored or modified

- Added `features/five-s/red-tag/bulk-create-qr.tsx`: recovered dialog and batch print presentation, adapted to current shared UI/access context.
- Added `features/five-s/red-tag/qr-code.tsx`: extracted shared encoder, preserving individual QR behavior and four-module margin.
- Modified `features/five-s/red-tag/qr.ts`: centralize only the recovered quantity validation/fallback rules; original payload helpers unchanged.
- Modified `features/five-s/red-tag/red-tag-module.tsx`: Overview placement, single-record QR retained, compatibility export and scanned Plant context validation in the existing creation route.
- Restored `app/(app)/5s/red/create-qr/print/page.tsx`: original query-driven print route.
- Added `tests/red-tag-bulk-qr.test.ts`: **19 tests**, including quantity boundaries, default/fallback, identical reusable payload copies, 100-label rendering, no writes/allocation, inactive/context denial, current source fields and disabled ModuleGate rendering.
- Adapted only affected shared-encoder/Overview expectations in `tests/red-tag-v2-qr-print.characterization.test.ts` and `tests/red-tag-simplification.characterization.test.ts`.
- Updated this report. No production store or Action lifecycle file was modified in this restoration.

### Final validation

| Check | Result |
| --- | --- |
| Focused Red Tag, canonical Action content authorization and integrations | **112 passed, zero failures; 15 files** |
| Complete `npm test` | **872 passed, zero failures; 101 files** |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Zero errors; 11 pre-existing warnings outside this restoration |
| `npx next build --webpack` | Passed |
| `git diff --check` | Passed |
| Original 5s source integrity | Saved SHA-256 comparisons unchanged |

Only focused browser acceptance ran; the earlier consolidated OPS acceptance was not repeated. It used a new task-owned Brave private window and validated production build on isolated **`127.0.0.1:4176`**, without changing normal demo data.

| Focused browser scenario | Observed result |
| --- | --- |
| Authentication | Unauthenticated Overview and direct bulk print URL showed sign-in. Local sign-in succeeded. |
| Quantity input | Default 1; empty and 101 displayed the original 1–100 error and disabled printing; 3 enabled Print 3 QR labels. Other boundaries/fractions covered by focused tests. |
| Batch preview | Quantity 3 rendered three labels, each with the exact same expected Plant creation URL and Plant name. |
| Printing/download | Native Print/Save as PDF completed for quantities **3 and 100**, saved only under `/private/tmp`. |
| Three-label PDF | One page; three complete labels. Rendered PDF visually inspected: no clipped/overlapping labels. |
| Maximum PDF | **25 pages, 100 captions, four labels per page** verified by PDF extraction; final page visually inspected and intact. |
| Independent QR decoding | All three individual symbols cropped from the actual rasterized browser-exported PDF independently decoded with jsQR to **`http://127.0.0.1:4176/5s/red/create?plant=PLANT-EGM`**. Four-module margin retained by the shared encoder. Whole-page multi-symbol decoding was not used as the per-label acceptance criterion. |
| Scan-equivalent navigation | Opening the decoded URL reached the current 5s creation form with Egmore Plant, Quantity, Required Action, mandatory live issue photo, and disabled Create until prerequisites. No record was automatically created. |
| Invalid Plant context | `?plant=UNKNOWN` showed an authorization/context explanation rather than creating under a different Plant. |
| Individual record QR | Record QR still displayed canonical historical `RT-EGM-ZA-001` target and print/download control. |
| No duplicate records | Overview Total Tags remained **1** after the 3/100 batches and navigation; automated tests confirm no tag/Action/counter writes during batch rendering. |
| Disabled entitlement | A disposable local-only disabled-Red-Tag fixture made the direct batch print route show **Module not enabled**; no symbols were exposed. |
| Cleanup | Focused origin localStorage/sessionStorage cleared, direct batch URL again required sign-in, private-window close completed, and only the task-owned port-4176 server was stopped. No Gemba photos, camera captures or IndexedDB assets were created in this run. |

### Remaining limitations

- Physical QR scanning and physical printer output were not performed. Actual exported PDF symbols decoded, and the decoded creation URL was browser-verified.
- Browser print headers/footers follow user print settings; test exports retained Brave's headers/footers. All batch labels remained intact.
- Unique allocated QR IDs would be a new product capability, not restoration of the recovered implementation. None were added or reserved.
- No backend, cross-device record persistence, email infrastructure or server-side authorization was introduced.
- No original source 5s edits, unrelated refactors, commit, push, reset, clean, stash or discard occurred. Existing uncommitted work was preserved.

## Inspection and approved decisions

The source inventory covered `features/five-s/red-tag/{types,data,store,red-tag-module}.ts[x]` and its photo, PDF/report, current-user and Zone configuration dependencies. Target inspection covered the old Red Tag store/UI/types/access/reports/QR/routes and consumers in Gemba, CI relationships, reports, canonical Action source/evidence routing, navigation and entitlements.

| Area | Source behavior and implemented boundary |
| --- | --- |
| Creation | Plant and Zone context; Section; item/equipment; quantity >= 1; flat source reasons; Others explanation; optional remarks; required Action; mandatory live issue photo. No new category/value/disposition inputs. |
| Identity | Source `RT-EGM-{Zone code}-{sequence}` numbering, reserving historical and new identifiers. |
| Lifecycle | Stored `Open` displays Raised for new records; In Progress; Awaiting Review; Rework Required; Closed. Source Assigned compatibility maps to In Progress. Historical statuses display their original values. |
| Planning | Current active configured Zone Leader selects a Zone Member, plan, date, priority and optional instructions. |
| Execution | Responsible member uses source guided After camera, original image reference and completion comment. |
| Review | Current configured Zone Leader returns with a required remark or approves submitted work through canonical review controls. Canonical self-approval and readiness restrictions remain. |
| Historical data | User approved immutable historical access, no automatic migration and no invented source approvals/submissions. |
| Actions | User approved a narrow adapter, with an explicit stop where source requirements conflict with mandatory canonical rules. No second Action store. |
| QR | Overview selects an accessible existing record. Real encoder replaces source pseudo-QR; four-module quiet zone. |
| Presentation | OPS shell, shared controls and tabs retained where they represent source behavior; obsolete settings and reusable blank-form QR print routes redirect to Overview. |

The source pseudo-QR was a deterministic graphic rather than a valid encoded QR, so it was not copied. Source generic direct Action status updates were also not copied. Those are incompatible with the approved OPS platform contracts.

## Storage separation and historical preservation

- Historical key: **`five-s-red-tags-v1`**. The replacement only reads it; no command writes, removes, normalizes or migrates its contents.
- New key: **`ops-red-tags-5s-v2`**, storing only new records marked `workflowVersion: "5s-v2"`.
- Historical DTOs are recursively frozen in memory. Every replacement mutation rejects historical records. Associated Actions remain independent and continue under their existing canonical permissions.
- Historical detail, print and report links retain original IDs, status, original fields, evidence arrays, history and Action links. A read-only raw record view retains fields which have no honest equivalent in the source workflow; embedded data URLs are displayed as images rather than repeated as large JSON text.
- Existing historical fallback seed remains an in-memory read-only fallback when the original key is absent; it is not written to either key. New workflow storage starts empty.
- Historical IDs reserve new numbering. New storage with a colliding historical ID is rejected. Malformed storage blocks writes instead of overwriting records.
- A failed Red Tag write does not publish the failed change in the Red Tag snapshot. Canonical Actions and Red Tags remain separate browser-local writes; there is no cross-store transaction. The adapter saves the link before advancing lifecycle operations, finds an already-created Action on retry, and rejects changed plan/date/priority retries rather than erasing overrides or creating duplicates.
- Tests use isolated in-memory localStorage. No real browser records, photos or storage keys were modified during validation.

## Canonical Action adapter evidence

The adapter lives in the replacement Red Tag store, scoped to new tags and an exact canonical `sourceModule: "redTag"` plus `sourceId` match.

1. Planning creates one canonical Action with stable source identity and original issue evidence, initially Awaiting Assignment. It assigns through **`assignActionToZoneMember`**, using the actual leader identity and eligible current member.
2. Source tag In Progress corresponds initially to canonical Action Assigned. **The leader does not impersonate the member to start work.** On actual member evidence capture, **`startAssignedAction`** runs with the member identity.
3. Completion evidence uses **`addActionEvidence`** with canonical owner/content authorization. Original issue evidence remains separate. Repeating the same saved photo does not duplicate canonical evidence.
4. Source photo/comment-only submission stops if canonical category or genuine non-negative savings are missing. The displayed error explains that no values were fabricated. Existing owner-entered completion data permits **`submitActionForReview`**.
5. Rework uses **`sendActionBack`**. Previous submission evidence/history and responsible ownership remain intact; subsequent submission is recorded as resubmission.
6. Approval uses **`getActionClosureError`** and **`closeReviewedAction`**. Real reviewer identity and closure timestamps come from the canonical result. An already-closed Action attributed to a different reviewer is not silently presented as the source leader's approval.
7. Save errors are exposed to the UI. No generic direct status mutation, due-date bypass, fake completion data or weaker unrelated Action permissions were introduced. `lib/actions/action-store.ts` was not changed by this task.

Canonical authority is enforced in browser-local commands. This is not server-side authorization or shared cross-device persistence.

## Integration and UI changes

- Gemba creates the source fields and live original photo, retains the original observation/evidence, verifies the actual editable walk and links through the existing canonical Gemba command. Failed links can retry the already-created tag rather than creating another. Existing relationship links remain.
- Action Center/source navigation still uses stable `redTag` source metadata and `/actions/{id}` / `/5s/red/{id}` routes.
- CI related-record consumers continue receiving historical and new Red Tags through the existing public read API; no parallel record store or rewritten relationships were added.
- Shared report library retains stable report identity and routes. New closed records identify the actual source reviewer; historical report metadata remains unchanged.
- Tabs: Overview, Red Tags, Awaiting Review, Closed. Existing awaiting-closure URL is retained as compatibility routing, displaying the source review state.
- Overview now supports restored reusable bulk **Create QR** and preserved individual **Record QR**. The restoration section above supersedes the earlier single-record-only placement.
- Source camera dialogs, normalized image capture, mobile/desktop label/report presentation and PDF download/native share behavior are carried into the scoped Red Tag directory. Unsupported sharing offers a download fallback; it does not claim email delivery.
- PDF support adds `html2canvas-pro` and `jspdf` to package metadata/lockfile. These support the source reporting capability, not new infrastructure.

## Files changed for this replacement

Production files:

- `features/five-s/red-tag/{types,store,access,red-tag-module,red-tag-nav,red-tag-report-page}.ts[x]`
- New scoped dependencies: `historical-view.tsx`, `OperationalPhotoCaptureDialog.tsx`, `IssuePhotoCaptureDialog.tsx`, `AfterPhotoCaptureDialog.tsx`, `capture-utils.ts`, `ReportHeader.tsx`, `ReportPdfActions.tsx`, `report-pdf.ts`
- `features/gemba/components/create-red-tag-dialog.tsx`
- `features/gemba/gemba-walk-page.tsx` (recognize the already-persisted canonical link)
- `features/reports/report-data.ts` (source reviewer metadata)
- `app/(app)/5s/red/create-qr/print/page.tsx`, `app/(app)/5s/red/settings/page.tsx` (compatibility redirects)
- `package.json`, `package-lock.json`

Regression files:

- Replaced superseded V2-only contracts in `tests/red-tag.characterization.test.ts`, `red-tag-v2-foundation.characterization.test.ts`, `red-tag-v2-create-review-decision.characterization.test.ts`, `red-tag-before-after-evidence.characterization.test.ts`, `red-tag-v2-disposition-closure.characterization.test.ts`, `red-tag-simplification.characterization.test.ts`, `red-tag-v2-qr-print.characterization.test.ts`.
- Added `tests/helpers/red-tag-replacement.ts`, `red-tag-replacement-resilience.test.ts`, `red-tag-replacement-integrations.test.ts`, `red-tag-replacement-rendering.test.ts`.
- Adapted only affected Red Tag expectations in mixed tests: `batch-b21-module-permissions`, `batch-c-report-rendering`, `batch-d-usability`, `gemba-corrective-action-needed.characterization`, `tracker-closure-red-tag-evidence`, `tracker-closure-searchable-select`, `system-wide-ux-camera.characterization`, `evidence-capture-consistency.characterization`.

Old Keep/direct-disposition/legacy-normalization tests were replaced because those active workflows were explicitly removed. Test count therefore differs from the previous 852-test baseline; the change is not presented as additive coverage. Unrelated module tests and canonical permission regressions remain and pass.

## Validation results

| Validation | Actual result |
| --- | --- |
| Focused Red Tag, B1/B2 permissions, Fix 02 Action content, canonical integrations, relationships, reports, Gemba and evidence checks | **179 passed, zero failures, 21 files** |
| Complete configured `npm test` (`vitest run`) | **844 passed, zero failures, 98 files** |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed: zero errors; 11 warnings in pre-existing files outside replacement changes |
| `npx next build --webpack` | Passed: optimized compile, TypeScript and page generation completed |
| `git diff --check` | Passed |
| Independent QR image decoding | Passed at **116, 176, 220 and 600 pixels** using `jsQR` on rasterized actual `qrcode.react` SVG output; exact canonical record URL decoded and four-module white border checked |
| Original 5s source integrity | Saved SHA-256 comparison passed for all four inspected source Red Tag feature files; source repository was only read |
| Browser / live camera / physical QR / actual print acceptance | **Not run, explicitly deferred** |

Automated coverage includes historical byte preservation and immutable snapshots, absent/corrupt/colliding storage, source field validation, eligible planning, one canonical Action, real actor start, evidence separation/deduplication, mandatory conflict stop, genuine completion submission, canonical review/closure, rework/history retention, unauthorized actors, missing canonical evidence, Critical priority, storage-failure recovery, override preservation, Gemba evidence/IDs, shared report metadata, camera track release/image normalization, PDF share fallback and server-rendered role-specific interfaces.

## Replacement-stage limitations (updated by final completion task)

1. **Action completion contract resolved:** missing information is collected in the existing authorized Action editor with a validated return path. The direct low-level submission guard still correctly rejects missing canonical data; the new UI handoff resolves it without bypasses.
2. Consolidated fixture-based browser acceptance has now run, including authenticated record navigation and PDF/CSV download. Device camera, physical scanning/printing and full PDF visual/pagination QA remain excluded. See the final acceptance report for exact results.
3. Storage remains browser-local and multi-store writes are not transactional. Retry guards protect the supported adapter operations; there is no claim of backend durability, shared cross-device data or server-side access enforcement.
4. Real email delivery and shared backend persistence remain separate infrastructure work. PDF/native share does not implement email delivery.
5. Historical records remain historical, including formerly active states. No automatic migration, fabricated closure, source lifecycle conversion or mutation of linked historical Actions occurred.

All existing uncommitted work was preserved. No commit, push, reset, stash, clean or discard operation was performed.
