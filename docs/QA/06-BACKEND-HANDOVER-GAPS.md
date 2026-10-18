# Backend handover inventory and open decisions

This is a requirements/evidence inventory, not final API specifications. The current frontend is a browser-local operational prototype with a small AI-proxy server surface. Do not present stores or client guards as production APIs/authentication. No backend persistence migration is implemented in Phase 0.

## Canonical entities and relationships

| Domain | Source of truth / model | Backend information to preserve |
| --- | --- | --- |
| Audit | `lib/five-s/audit-store.ts`; `FiveSAudit`, `FiveSSection`, `FiveSQuestion`, `FiveSEvidence` | Stable internal ID + permanent scoped display number; setup/schedule; assigned auditor; saved checklist/scoring/reference snapshot; compliance identity/score; answers/evidence/Action IDs; signature; lifecycle/timestamps |
| Standard configuration | `features/settings/standard-audit-checklist/store.ts` + `defaults.ts` | 39 immutable canonical IDs/category/order, organization overrides of wording/guidance/reference; author/time; legacy flat→organization mapping; explicit reference removal |
| Custom configuration | `custom-audit-questions/{types,store,checklist}.ts` | Organization, stable config ID, supported stage/type/order/mandatory/evidence flags; active soft-deletion rule; new-Audit snapshot copy; no retroactive rewrite |
| Scoring policy | `audit-scoring/store.ts`, `lib/five-s/scoring-policy.ts` | Organization policy, validated strictly increasing finite scores; snapshot/version at creation; response identity separate from numbers; legacy default compatibility |
| Action | `features/five-s/types/my-actions.ts`, `lib/actions/action-store.ts` | One canonical record; sourceModule/ID/label/observation; owner/reviewer, priority/deadline/override; finding/progress/resolution evidence; lifecycle/rework/reassignment/due histories; actual completion identity/savings/category |
| Red Tag | `features/five-s/red-tag/{types,store}.ts` | Original OPS review/decision/handling/disposition, Before/After evidence, physical confirmation, linked Action state reconciliation, terminal closure; original ID/QR semantics; no imported 5S migration |
| Gemba | `features/gemba/{types,gemba-store}.ts` | Walk/setup/schedule/participants/observations; explicit corrective decision; source links; photo metadata/Blobs; voice note/transcript; horizontal deployment recipient/current access/history; activity |
| CI | `features/five-s/continuous-improvement/{types,store}.ts` | Proposal distinct from Action; canonical owner/team/zone reviewer; review/hold/resume/implementation/completion review; benefits/savings/evidence; linked Action array; owner-transfer history |
| Visual Improvement | `features/visual-improvement/{types,visual-improvement-store}.ts` | Compatibility lifecycle, before/after, owner/team, benefits, Action link; historical retention without promoting duplicate business module |
| Visual Management | `features/visual-management/{types,visual-management-store}.ts` plus schedule/KPI/config stores | Board/tier/sections/membership; reusable metric definition vs board assignment/target/threshold; actuals/reporting periods/no-production; deviations/Action/no-action justification; meeting recurrence/attendance/topics/decisions; immutable completed name/KPI snapshots; retained legacy escalations |
| Relationship metadata | `lib/relationships/{types,relationship-store,route-resolver}.ts` | Directed module/record/optional child refs, relationship type, source metadata, deduplication, no binary payload; foreign-reference/deletion rules |
| Identity/org/config | `administration/{types,store,permissions}.ts`, `lib/organization-store.ts`, `lib/module-entitlements.ts` | Users/status/roles/permissions/zone duties; stable Plant/Zone IDs vs legacy names; organization/module registry and entitlements; ownership-transfer safeguards |
| Reports/dashboard | `features/ops-dashboard/*`, `features/analytics/*`, `features/reports/*` | Aggregation definitions, scoped filters/overdue calculation/scoring denominator/realized benefit, evidence provenance, report snapshot vs live values, supported print/CSV; Red Tag source discrepancy needs product decision |
| Personal settings/attention | `lib/profile-settings.ts`, preferences provider, Action attention/notification stores | Per-user preferences; current local reminder/escalation and broadcast history. No new Notification Center architecture is implied. |

Business links: Audit question→Action; Gemba observation→Action/Red Tag/CI; Red Tag→Action; CI→Actions and optional operational refs; VI→Action; VM topic/KPI deviation→Action, topic→CI/Gemba through create callbacks. Legacy escalation→Action is compatibility-only. Completion restrictions differ by source; use 03 rather than inventing a global “all Actions closed” gate.

## Production blockers / decisions required

| ID / severity | Confirmed frontend condition | Backend decision / contract needed |
| --- | --- | --- |
| B-01 Critical | AuthGate, demo identity/role selector/password/session and ModuleGate are client-local | Real identity/session lifecycle, credential handling, server authentication, account lifecycle, tenant membership and server authorization. UI guards remain UX only. |
| B-02 Critical | Most operational records are Plant/Zone-scoped strings without explicit organization ID; directory belongs to demo org; Super Admin registry grants registered-org config access | Tenant ID on all persisted entities/files/queries; authorized-org memberships; row/query isolation; immutable stable IDs; explicit Super Admin scope policy. Do not infer tenant from caller-supplied Plant name. |
| B-03 Critical | Red Tag and legacy VI direct commands incompletely verify authority; Action/Audit creation helpers lack a uniform actor boundary | Command-level permissions/ownership/state validation across all writes, including service/direct calls. Review delegation/self-review and inactive-account rules; no generic lifecycle patch bypass. |
| B-04 High | Entity, source link, relationship, notifications and evidence persist separately | Atomic transaction or documented saga; idempotency keys; orphan reconciliation; conflict/version handling; retry semantics per command. Current partial-write behavior is not a server transaction contract. |
| B-05 High | Local counters/Date.now/UUID mix and name-based refs; fixture migrations may merge/replace demo rows | Server ID/display-number reservation per scope; canonical foreign keys; imported/demo seed/version migration policy; unique constraints; no silent fixture overwrite of real data. |
| B-06 Critical | Audit/meeting snapshots are copied browser data, local actor/time/history editable by storage owners | Durable immutable snapshots, policy/config revisions/effective dates; signed audit trail/actor/time provenance, historical redaction/retention policy and backup/restore. Preserve existing completed data. |
| B-07 High | Gemba images in IndexedDB; many other photos/signatures/references are base64/static/HTTPS, voice playback may be ephemeral | File/object storage ownership/tenant ACLs, upload limits/type validation, scanning, signed access and thumbnails; migration of local blobs/base64; retention/deletion/reference integrity; voice consent/privacy/lifetime. |
| B-08 High | Business dates/local timezone handling; client attention/recurrence calculations | Canonical date/time/timezone semantics, scheduled jobs, recurrence exceptions, due-date/overdue policies and clock source. Separate a calendar due date from an instant. |
| B-09 High | AI proxy handlers validate some inputs but lack full server auth/tenant/rate-control boundary | Authorized provider access, quotas/rate limiting, bounded request/response schemas, error/status contracts, safe logging, cancellation/timeout, provider-data privacy. Credentials remain server-side. |
| B-10 High | Dashboard and report derive from client stores; Red Flag/Red Tag vocabulary/source mismatch | Authoritative aggregation/filter definitions and tenancy, pagination/exports, completed vs current snapshots, benefits/overdue semantics; reconcile R-03 before matching API counts to UI. |
| B-11 Medium | Custom Delete deactivates; archived VI/Red Flag retained; reset intentionally removes dummy Red Tag records | Soft/hard delete/retention policy, reverse-link behavior, restoration, audit permissions; dummy reset must not become a production destructive migration. |
| B-12 High | No production business API/OpenAPI, database schema, API integration test suite or CI browser gate | Agree command/query contracts and server error format; concurrency/ETag/idempotency; contract tests; tenant fixture seeding and deployment/release acceptance. |

## Proposed API contract discovery backlog (not invented endpoints)

For each command family below, jointly document authentication principal, organization scope, resource version, preconditions, editable input fields, output projection, state transition, idempotency and error codes before choosing paths/methods:

- Audit create/schedule/edit-start/save-answer/submit-complete/delete-scheduled; checklist and scoring configuration revisions/snapshots.
- Action create/assign/start/update-content/evidence/submit/rework/verify-close/reassign/change-date/priority; source linking and lifecycle event query.
- Red Tag create-review/decision/handling/disposition/Keep/further-evaluation; safe linked Action reconciliation and QR read/print payload.
- Gemba walk schedule/start/observe/evidence/deployment/complete; observation-only authorized projection and follow-up link retry.
- CI draft/submit/review-hold-resume/start/implementation/completion-review; VI compatibility commands only as required.
- VM board/metric/assignment/actual/deviation/follow-up, schedules/occurrences/attendance/topics/meeting completion/history and frozen snapshots.
- Admin directory/ownership transfer/Plant-Zone/org membership/module access; personal preferences; scoped dashboard/report queries and supported exports.

There are only three actual API paths in 01. Do not name proposed CRUD paths as if they already exist. Existing frontend store inputs provide starting DTO evidence but are not automatically safe server contracts.

## Handover package readiness checklist

Available now: route/store/type index, state/permission/validation inventory, current storage keys and snapshot rules, actual automated baseline, source-link and responsive acceptance matrices. Missing before production handover: signed-off tenancy/auth policy, mutation-permission gap remediation decisions, final command/DTO/schema spec, migrations from browser data, file/storage policy, transaction/concurrency strategy, server validation and audit trail, real API contract fixtures, reproducible CI build and browser evidence. Assign each B-ID an owner/date in the approved backend planning phase; no backend implementation is authorized by Phase 0.
