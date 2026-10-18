# Persistence, source integration and historical preservation

## Actual browser-local stores

| Key / storage | Owner and contents | Preservation requirement |
| --- | --- | --- |
| `manufacturing-qms-five-s-audits-v1` | Saved Audit setup/sections/answers/scoring/signature/evidence snapshots | Never recompute completed questions/policy from current config; current P0 test loads and compares a persisted completed Audit after config changes/reload |
| Audit number/sequence/fixture markers | `lib/five-s/audit-store.ts`; permanent display numbering and seed normalization | Migrate uniqueness safely; fixture merges are not a production import policy |
| `ops-standard-audit-checklist-v1` | Version 2 organization→standard overrides; legacy flat format maps to ABC | Preserve canonical question IDs; keep unrelated organization edits; corrupt saved config blocks writes |
| `ops-custom-audit-questions-v1` | Organization-tagged custom question records | Delete currently deactivates; snapshots remain independent; preserve ordering/flags/refs |
| `ops-audit-scoring-policies-v1` | Per-organization validated policy | Snapshot values on Audit creation; preserve compliance identity independently of numeric scores |
| `standalone-5s-actions` | Canonical `MyAction[]` including history/source/evidence | One Action store; create/update failure does not publish failed next state; rollback can itself fail and must be reported |
| `five-s-red-tags-v1` | Restored original OPS Red Tag records plus intentional seed | Fresh OPS shape only; reset legacy dummy records under the approved one-time rule; preserve original QR behavior |
| `ops-gemba-v1` | Walk/observation/source/deployment metadata | Do not embed new binary photo payloads; preserve current source links and observation history |
| IndexedDB `ops-local-assets` / `gemba-photos` | Gemba photo Blobs addressed by storageKey | Rehydrate/revoke object URLs; migrate actual Blob bytes and ownership; session URLs are not durable file paths |
| `five-s-continuous-improvements-v1` | CI proposal/owner/team/review/evidence/linked Actions/history | Owner-transfer safety; preserve source/Action distinction and terminal gate |
| `ops-visual-improvements-v1` | Compatibility before/after workflow | Retain historical records; no unsolicited migration into VM |
| `ops-visual-management-v1` | Boards/meetings/topics/decisions/retained escalations | Preserve completed board-name/metric snapshots and explicit linked IDs |
| `ops-visual-management-configuration-v1` | Board/tier/section configuration | Scope current configuration independently from historical meetings |
| `ops-visual-management-kpis-v1` | Reusable metric definitions | Definition vs assignment target/threshold are different entities |
| `ops-visual-management-kpi-execution-v1` | Assignments/actual entries/deviations | Correct reporting-period key, actor, status/target/threshold snapshot and explicit Action/justification |
| `ops-visual-management-meeting-schedules-v1` | Recurrence and occurrence overrides | Define timezone/exception semantics and unique started occurrence |
| `ops_relationships_v1` | Supplementary directed metadata references | No files/base64; deduplicate, validate tenant/source/target, preserve unrelated edges |
| `five-s-administration-users-v1` | Demo directory/status/roles/permissions/memberships | Server principal replaces client trust; duty transfers precede deactivation |
| `ops-organization-configuration-v1` | Plant/Zone/current leader configuration | Preserve stable identity; distinguish current rename vs historical display snapshot |
| `ops-organization-modules-v1` | Per-registered-org entitlements | Shared key; unauthorized store-write gap is open; never clear it for one module |
| Other config/preferences/auth/attention keys | Action configuration, local reminders/escalations/notifications, Profile/UI, demo auth/role | Preserve unrelated user/config data; do not carry demo authentication/passwords into production |

Full declaration index is in Phase 0 `01-MODULE-INVENTORY.md`. These keys are evidence, not authorization to clear storage. LocalStorage/IDB do not synchronize across browsers/users/devices. Reload tests seed only once per disposable context so writes are not overwritten by the fixture on every navigation.

## Actual one-time Red Tag reset

`lib/five-s/red-tag-reset.ts` runs before relevant stores load. It removes only dedicated dummy keys `five-s-red-tags-v1` and `ops-red-tags-5s-v2`; no imported records are migrated. Shared Action records remain, but Red Tag origin metadata is detached and classified Manual. Only edges with Red Tag endpoints and Gemba redTagId/identified obsolete creation activity are removed. Audit/CI/config/user/other Gemba/Action records and unrelated relationship edges are retained. Marker `ops-red-tag-original-reset-v1=done` prevents removal of newly created OPS records on later boots. The intentional original in-memory seed may still appear.

Shared JSON is inspected before writes; malformed shared state aborts reset. Failed writes attempt rollback; quotas can also prevent rollback, so production migrations need transactional storage/backups. Isolated automated tests cover unrelated preservation, idempotency, corruption, rollback/retry and fresh original-model creation. No actual developer browser data was reset by this QA task. This dummy-data operation must never become a general production migration.

## Required cross-module transaction boundaries (proposed)

| Command group | Atomic intent | Failure/retry/concurrency requirement |
| --- | --- | --- |
| Source→Action create/link | Validate source/actor/owner, create Action, set explicit source Action ID, append relationship/event | Single idempotent command; source and Action versions; no duplicate/orphan record; durable reconciliation if non-atomic; notify only after commit via an agreed outbox policy |
| Audit answer→corrective Action | Save finding/evidence/source refs and linked Action identity | Audit completion remains independent; never lose original finding on Action execution/review |
| Red Tag physical completion with linked Action | Read current canonical Action completion plus source readiness; append original disposition event | Do not trust stale client syncedActionStatus; no premature terminal source state |
| CI/VI terminal review with Actions | Read all relevant linked Action states, preserve completion evidence/review identity | Reject incomplete linked work; specify missing/deleted Action handling; no silent closure of source |
| Gemba observation/Blob/deployment | Save file metadata, observation, source refs, recipient projection/event | Stage upload then finalize; cleanup abandoned files; recipient notification failure must not fabricate successful delivery |
| VM topic/deviation follow-up | Set Action/source arrays or CI/Gemba callback link and event | Return explicit durable link status; cancellation must not imply a created target; no duplicate retries |
| Ownership/leader transfer + user deactivation | Reassign open Action/CI/duties, membership and current access | Transaction/optimistic conflicts; preserve historical actor attribution; no partially orphaned responsibilities |
| Config revision and new Audit/Meeting | Commit revision then bind immutable applicable snapshot when entity created | Existing snapshots immutable; race uses an explicit revision/effective-time rule |

The frontend currently uses separate writes. New P0 tests verify Action creation failure, source-link rollback/retry, truthful rollback failure and configuration failure preservation; they do not establish cross-store ACID semantics.

## Evidence/reference handling

Current Audit/Action/Red Tag/CI/VM evidence may use static asset paths or inline data; Gemba new photos use IDB. Reference editor uses Upload Photo/Take Photo/preview/Remove; files go through shared image size/type/resize/compression helper, and saved raster data URLs require JPEG/PNG/WebP signatures and a bounded size. Existing HTTPS references validate scheme/hostname/no credentials; unsafe schemes/non-image/SVG data are rejected. No URL entry box remains in latest UI. Broken previews/execution show unavailable state; Save is blocked during photo processing; storage errors stay visible.

Proposed backend file service must authorize tenant ownership on upload/read/delete, enforce byte/MIME/content limits server-side, validate any remote image fetching against SSRF/private-network/redirect policies, scan according to deployment policy, support signed scoped access and retention, and preserve historical image versions. A frontend HTTPS syntax check is not server-side remote-fetch security. Data URL migration must retain bytes and link integrity without inventing upload availability in the current app.

## QR, reporting and aggregation

QR is client rendering of reusable create target or saved record URL; batch copies share a target by design, allocate no IDs and print natively. Backend needs stable public/app-origin URL policy and authorization on destination, not an automatic per-label entity allocation. Physical scan/print validation is separate from generated payload/unit tests.

Dashboard overview retains gated archived Red Flag branches. No Red Tag entity KPI is implemented. Confirmed performance defect was narrower: Red Tag-origin Actions were filtered by redFlag entitlement and labeled Manual; P0 changes use redTag and preserve Red Tag source labels, including legacy source text. Server aggregations must share canonical Action/source/overdue/score/benefit semantics and approved scope. Do not invent Red Tag health scores or change restored lifecycle to match archived Red Flag fields. Reports are derived views with per-type print/CSV support; Excel currently unsupported.

## Migration and audit-trail requirements

Inventory local records/files/fixture markers and approve import scope; normalize tenant/user/Plant/Zone IDs while retaining display snapshots; reserve numbering and idempotency; migrate files and references; verify old/new snapshots and aggregates; retain an append-only server command event trail with principal/time/organization/reason/source/resource version. Define retention/redaction/deletion/recovery and conflict policies. Do not migrate browser-local auth/password/demo secrets into server identity records.
