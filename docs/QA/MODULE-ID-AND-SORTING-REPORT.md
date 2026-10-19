# Module IDs and creation-order sorting

Implementation date: 19 October 2026. Baseline: `feat/audit-admin-question-management` / `d6dcc9d4b447c1d57db5183dd09c38d3bc2fde36`. The working tree was clean before this task. No commit, push, merge, deployment or real-user data reset was performed.

## Architecture inventory and final prefix mapping

The inventory covered canonical types, creation commands, persisted arrays, list components, routes, source relationships and QR helpers before implementation. There is no transactional business-record backend. The application runs in the fixed `abc-manufacturing` demo organization; organization administration can configure other organizations, but business stores/routes do not implement tenant switching or composite tenant/record identities.

| Module | Actual record types changed | Previous generator | New prefix | Canonical storage |
| --- | --- | --- | --- | --- |
| Audit | `FiveSAudit.id` and generated `title` | Timestamp internal ID plus plant/Zone title counter | `AUD` | `manufacturing-qms-five-s-audits-v1` |
| Red Tag | `RedTag.id` / `tagNumber`, including create-and-submit | `RT-EGM-Zx-nnn`, maximum in Zone | `RT` | `five-s-red-tags-v1` |
| Continuous Improvement | `ContinuousImprovement.id` | `CI-year-nnn`, maximum in current year | `CI` | `five-s-continuous-improvements-v1` |
| Visual Improvement | `VisualImprovement.id` | `VI-year-nnn`, maximum in current year | `VI` | `ops-visual-improvements-v1` |
| Visual Management | New boards, meetings, meeting schedules, split successor schedules and escalations | Zone board IDs / UUIDs / `VMM-year-nnn` / technical schedule IDs | `VM` | Existing configuration, runtime and meeting-schedule keys |
| Gemba | `GembaWalk.id` | `GEM-year-nnn`, maximum in current year | `GW` | `ops-gemba-v1` |
| Actions | Canonical `MyAction.id`, including manual, Audit and linked creation | Timestamp/random suffix | `ACT` | `standalone-5s-actions` |
| Red Flag compatibility module | `RedFlag.id` | `RF-year-nnn` | `RF` | `ops-red-flags-v1` |

`lib/records/module-records.ts` is the centralized prefix registry and reservation boundary. No prefix conflict or external integration requiring the previous new-record format was found. All existing identifiers are retained. The Visual Management business record types share one VM sequence, so a new board, its meeting and a new schedule consume distinct numbers rather than introducing colliding subtype sequences.

Template/checklist questions, Audit section IDs, KPI definitions/assignments/snapshots, Gemba child observation keys, VM agenda topic/decision keys, evidence IDs, relationship IDs, notifications, user/plant/Zone identities and event/revision IDs retain their established conventions. These identify configuration, child records or technical relationships rather than independent module record allocations. Rendered report references remain derived report identifiers; no second business-record store was introduced.

## Sequence allocation

- Durable counter per `(organizationId, module)` under `ops-record-sequence-v1:<encoded-organization-id>:<module>`. All current UI creation commands use the application's actual active demo organization. The allocator accepts an explicit organization scope and unit tests verify independent ABC/other-organization counters; this does not add a multi-tenant business-record UI.
- IDs use `PREFIX-` and at least six zero-padded digits. Numbers grow beyond six digits rather than wrapping. Zone/year do not participate.
- Each reservation reads current storage and scans matching canonical IDs for the highest known value. It never uses list length, list order, the displayed first record, legacy Zone/year suffixes or `updatedAt`.
- The high-water reservation is persisted before returning the ID. Failed record writes burn their reservation; deleting a record does not remove its reservation. Sequence gaps are intentional. Existing per-Zone Audit sequence keys are left intact for compatibility and are no longer used for new allocations.
- Malformed/unsafe/exhausted counters, missing organization identity and failed durable counter writes fail closed. Previews never reserve numbers. Counter corruption is not silently reset.
- Browser creation uses `withBusinessRecordCreation`, which acquires the same-origin exclusive Web Lock `ops-business-record-creation-v1`. After the lock is acquired, registered business stores reload storage before the existing synchronous creation command runs. Counter reservation and that command's synchronous record write occur inside the lock. Queued stale tabs therefore read earlier creations before writing their new arrays.
- Direct browser allocation outside this creation scope is rejected. Browsers without Web Locks are rejected rather than falling back to an unsafe counter race. Command unit tests use synthetic non-DOM storage; this is not a browser fallback or an authorization bypass.
- Existing store permission checks remain in place. The lock/allocator is concurrency coordination, not authentication or server authorization.

### Guarantees and limits

This provides serialized **creation** within the same browser profile/origin using the supported UI/creation wrapper. It does not claim cross-browser or cross-device uniqueness. Independent browser profiles can both reserve `ACT-000001`. A backend transaction with a unique `(organization_id, module, number)` constraint, durable high-water/tombstone retention and idempotent commands is required for production allocation.

Business stores are still browser-local arrays with global ID routes. Repeating the same formatted ID across organizations is valid only with an organization namespace; adding multi-tenant business storage/routes is a separate backend/tenancy change. This implementation does not mix another organization's business records into those arrays or invent a tenant selector.

Existing non-creation mutations do not all acquire this new creation lock; arbitrary external/localStorage writers, old tabs running pre-change code, concurrent edits, IndexedDB migrations and cross-module link writes are not one transactional unit. The allocator cannot make those existing writes transactional. Cross-module source/Action transactions and general optimistic concurrency still require backend handling. QA verifies two stale **current-code creation forms** preserve both records; it is not a guarantee for every concurrent workflow mutation.

Deleting/clearing browser storage or manually removing the ledger is outside durable-counter guarantees. Restore the ledger with application backups; records alone cannot reconstruct reservations for already deleted records. No reset/cleanup command was added and none of the new counter keys is cleared by module record deletion.

## Legacy compatibility and metadata

No record ID, title, QR target, Action source ID, audit snapshot, historical event or revision was migrated. All old Zone/year/timestamp/UUID routes remain valid. Existing QR target helpers and canonical Action reverse-link helpers are unchanged. New record IDs flow through those same helpers.

New Actions now persist full ISO creation timestamps rather than date-only strings. New Audits and VM meetings persist `createdAt`; it is optional in their types because legacy records never captured it. Audit generic editing preserves the original creation timestamp, including an absent legacy value. Board edits preserve the stored creation timestamp. Existing Action mutation guards already reject creation-date edits.

## Sorting behavior

`lib/records/record-order.ts` compares parsed persisted creation times, newest first, with a deterministic descending natural-ID tie-breaker. It sorts a copy and never rewrites the stored array. Missing/invalid creation dates sort last, with the same deterministic ID fallback; no date is fabricated from update time, record number or current time. Explicit Oldest options also tolerate missing legacy dates.

Applied to Audit lists/legacy landing views; Red Tag lists and overview attention records; Action Center filtered/searched tabs; Gemba walk and observation lists/recent walks; CI default list/review queue/recent completed cards; VI default list/recent cards and Dashboard transformation records; VM boards/settings board lists, meeting lists/recent meetings and escalation lists; related Red Tag Action selectors; and the CI operational-record picker (Gemba observations, Red Tags and Audits).

Existing CI/VI user-selected sorts (Oldest, saving, Longest Open, Recently Completed) remain available. Default ordering is applied before recent-widget limits. Current module lists render their complete filtered result rather than implementing page-based pagination; unit checks additionally verify sorting before a page slice. Filtering/search retain the chosen order.

VM legacy meetings use their **persisted `startedAt`**, the original meeting-creation event, only when `createdAt` is absent. Red Flag uses its native persisted `raisedAt` creation event. Legacy Audits without a creation event sort last; scheduled/due/start/edit dates are not substituted. Red Tag missing dates display “Not recorded” and date filtering excludes unknown dates.

Dashboard priority/overdue attention queues, operational metrics/trend buckets, chronological Audit/Action/Red Tag history, meeting agenda/history events, revisions and calendar occurrences keep their business ordering. Reports keep report-generation/completion-date sorting and existing user sort options; report artifacts are not newly created module entities.

## Verification

### Automated checks

| Check | Actual result |
| --- | --- |
| New allocator/order unit file | 12 passed |
| Full Vitest suite | 1,147 passed; 2 failed; 0 skipped (1,149 total) |
| TypeScript `npx tsc --noEmit` | Passed |
| `npm run lint` | 0 errors; 13 existing warnings |
| Isolated `next build --webpack` | Passed; environment files excluded from the build copy |
| `git diff --check` | Passed |

The two unchanged unit failures are `P0-AUTH-ENT` (ordinary member organization-entitlement mutation) and `P0-AUTH-ACT` (direct canonical Action creation without actor authorization). `tests/p0-authorization-gaps.test.ts` remains unchanged. No acceptance test was skipped or weakened.

The new unit tests cover every module's first/subsequent allocation, module/organization separation, shared sequences across Zones, highest canonical-number scanning, deletion/reload, failed-write reservation retention, malformed/unsafe counters, preview behavior, unsupported/direct browser calls, queued stale snapshots, real Action persistence failures, immutable creation metadata, timestamp offsets, deterministic ties, missing dates and filtering/page slicing.

### Actual Chromium execution

All browser execution used isolated synthetic contexts against a local production build on port 4179. The existing development server and real user storage were untouched.

- Broad production regression: **59 tests executed, 54 passed and 5 failed**, zero skipped. This covered the existing P0 browser suite (15/15), Action accordion and quota/revision history, Red Tag seven-decision/edit/Phase 2 regressions, new module tests and laptop Audit/Actions/VM/operational/report suites.
- Three failures were report test readiness timeouts: the report was rendered and returned HTTP 200, but background requests prevented `networkidle`. The report navigation now waits for DOM readiness, exact report heading and enabled Export CSV. Download, DOM geometry and print assertions remain intact.
- Final affected regression on the final production build: **15/15 passed**, including all three previously timed-out reports and expanded module assertions. This retested new module coverage, Audit/Actions, VM and operational/report workflows at **1024×600, 911×512 and 1440×900**.
- Across the 59 unique cases, the latest results are **57 passed and 2 pre-existing failures**. This combines the broad run with the final affected rerun; it is not a claim that all 59 cases were rerun together on the final build.
- The two remaining cases are existing Keep UI tests at 320px/1440px: while Keep is selected but not submitted, the empty Optional Execution Action section remains visible. The same assertions failed **2/2 against unchanged HEAD** in a separate isolated baseline browser run on port 4180. These tests remain visible and unchanged. Other existing Phase 2 Keep closure tests passed.

The new suite visits ten routes at each requested size (**30 route/viewport combinations**): Dashboard, Audit, Red Tag, CI, Gemba, VM boards, VM meetings, Actions, Reports and VI. It uses actual DOM geometry and visible mobile/desktop list assertions. It opens two stale Action forms in different Zones, verifies a durable-counter failure displays feedback without losing form input, concurrently creates distinct sequential Actions without lost records, checks creation order/filter/reload, deletes only synthetic data, and verifies the next ID is not reused. It also exercises the CI related-record picker and Red Tag date filtering with missing legacy timestamps. Existing regressions exercise legacy QR/report/source navigation and linked Actions; their historical fixture IDs were retained.

Creation failures now use each affected form's existing feedback channel and release its submitting state. This covers new allocator rejection without silently losing drafts or leaving controls busy.

### Evidence and remaining limitations

Local generated evidence is intentionally ignored by Git:

- `test-results/module-ids-production-regression/`: broad-run screenshots/traces and failure context.
- `test-results/module-ids-affected-final/`: final affected-run artifacts.
- `/tmp/ops-records-browser-production.json` and `/tmp/ops-records-browser-affected-final.json`: machine-readable browser results.
- `/tmp/ops-records-baseline-keep-results/` and `/tmp/ops-records-baseline-keep.log`: unchanged-HEAD Keep reproduction.
- `/tmp/ops-records-tests-final.json`: full unit results.
- `/tmp/ops-records-tsc-final.log`, `/tmp/ops-records-lint-final.log` and `/tmp/ops-records-final-build.log`: static/build output.

Remaining issues are the two existing authorization acceptance gaps, the independently reproduced Keep UI visibility defect, and the browser-local/tenant/concurrency limits described above. No cross-device allocator or backend transaction guarantee is claimed. Current lists have no page-based pagination UI; sort-before-pagination is verified at utility level. No production data was used, no historical records were rewritten, and no Git commit/push was performed.
