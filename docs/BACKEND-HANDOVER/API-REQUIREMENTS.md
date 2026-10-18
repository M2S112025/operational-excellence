# API requirements and request/response proposals

**Status: proposed business API for backend agreement; no business CRUD endpoints were implemented.** Frontend store functions are evidence of workflows, not safe server endpoints. Existing routes are limited to the AI proxy handlers below. Paths, versioning, pagination and response envelopes in the proposal must be ratified with backend/product owners.

## Existing implemented HTTP handlers

| Actual path | Request | Response/error behavior | Current gap |
| --- | --- | --- | --- |
| POST `/api/gemba/voice/transcribe` | Multipart `audio` Blob, nonempty audio MIME, maximum 15 MiB | Provider transcript or structured error; malformed upload/type 400; oversize 413; absent provider configuration 501; upstream errors mapped | No production session/tenant/rate-limit enforcement |
| POST `/api/gemba/voice/extract` | JSON transcript/context, transcript maximum 4,000 characters | Validated structured suggestion or error; user reviews before record mutation | Server auth/tenant/quota/privacy/timeout contracts needed |
| POST `/api/visual-management/kpi/analyze` | JSON objective/context and analyze/drivers mode; objective maximum 4,000 | Parsed SMART/driver suggestions; unavailable config 503; invalid request 400; invalid/upstream result 502 | Retained AI wizard is currently unlinked; no entity auto-save; server authority/rate limits needed |

Provider credentials remain server environment configuration. Tests use mocked upstream calls; no real client audio/provider secrets belong in fixture artifacts.

## Proposed common contract

- Authenticated session or token determines principal. Validate requested organization membership/server permissions for every command and query, including files and export endpoints. Platform authority is scoped, not a client boolean.
- Suggested base `/api/v1/organizations/{organizationId}`. All paths below are **proposals**, not discovered routes.
- Response proposal: `{ data, version, requestId }`; validation errors `{ error: { code, message, fields? }, requestId }`. Do not send internal stack traces, secrets or tenant-existence information.
- Create/cross-module commands use an `Idempotency-Key`; state-changing commands carry an agreed version/If-Match token. Retry of the same accepted command must not allocate duplicate Action/source IDs or events.
- Lists use bounded cursor pagination and explicit filters; only whitelisted source/status/Plant/Zone/owner/date filters. Server derives scope, never trusts UI filtering.
- Server validates all fields, active memberships, allowed transitions and terminal immutability. Actor/time/approval fields are server-derived. Avoid unrestricted entity PATCH APIs that can bypass lifecycle/ownership/source integrity.

## Proposed command families

| Proposed resource / command | Request input proposal based on actual supported fields | Response / invariants |
| --- | --- | --- |
| `audits` create / schedule / start | Plant/Zone IDs, auditor ID, schedule date/time; new checklist/scoring resolved by authorized organization | Audit plus immutable checklist/scoring snapshot, permanent display number and version; no client-supplied authority |
| `audits/{id}/answers` draft save | Question snapshot ID, compliance identity or text/Yes-No answer, observation, evidence references, linked Action ID, version | Saved question/totals derived from original policy; validate evidence/readiness independently of current config |
| `audits/{id}/complete` | Version and auditor signature reference; answers already saved or transactional answer payload | Completed Audit only if ready/signature/actor valid; open linked Actions do not globally block completion |
| `audit-configuration/standard-questions/{canonicalId}` update | Existing question wording, instruction, reference image attachment/HTTPS reference or explicit removal; no standard ID/category/order/score mutations | Revision/author/time; applies only to new audit snapshots |
| `audit-configuration/custom-questions` create/update/deactivate/reactivate/reorder | Existing stage/response/mandatory/evidence/instruction/reference/active/order fields | Stable question ID/org; Delete uses current soft-deactivation rule unless policy changes; old snapshots unchanged |
| `audit-configuration/scoring` save | nonCompliance, partialCompliance, fullyCompliance | Valid strictly increasing finite nonnegative values; snapshot on future Audit creation |
| `actions` manual/source-linked create | Title/description, explicit source ref, Zone/eligible responsible user, priority/category/due policy, finding evidence | Canonical Action ID, authorized ownership/source link; source + Action link created atomically where requested |
| `actions/{id}/assign`, `/start`, `/submit`, `/return`, `/close` | Version, eligible user/reason where applicable; submission notes/category/nonnegative savings/evidence | Guarded lifecycle transition and audit event; no self-review; actual reviewer identity returned |
| `actions/{id}/reassign`, `/due-date`, `/priority` | Version, replacement/date/priority, mandatory reason for reassignment/date | Current scope validation, due override/history retained; no generic patch bypass |
| `red-tags` create/review/decision/handling/disposition/Keep/evaluation | Original OPS fields/decision and authorized actor; Before/After refs, responsible/date/notes/confirmation | Original OPS state machine; linked Action state queried transactionally; no imported 5S planning model |
| `gemba-walks` create/schedule/start/complete; observations save/link/deploy | Current setup/participants, observation type/context/photos/corrective decision, requested follow-up | Actor/state/field rules server-side; Issue evidence required; explicit source links; projected recipient read endpoint |
| `improvements` draft/submit/review/hold/resume/start/implementation/submit-completion/review-completion | Supported proposal/owner/team/time/benefits/Before/After and remarks | CI state machine; unfinished linked Actions gate terminal review; proposal remains distinct entity |
| Legacy `visual-improvements` commands | Existing compatibility DTOs and versions only | Preserve existing before/after/history; no promotion into a new active module |
| `visual-management` boards/metrics/assignments/actuals/deviations | Existing reusable metric definition vs board-specific target/threshold/owner/period/actual | Validate current board/operator/threshold; no-production distinct from zero; explicit Action or genuine justification |
| `visual-management` schedules/occurrences/meetings/topics | Recurrence/occurrence scope, participants/guest attendance, topics/follow-up | Unique active meeting/occurrence; durable callback/Action links; frozen completed board/KPI snapshots |
| Directory/organization/module access and transfer commands | Active users/roles/zone duties, authorized org entitlements; replacement owner + reason | Verify platform/config/user authority and tenant; transfer duties before deactivation; retain histories |
| Reports/dashboard queries and exports | Bounded scope/date filters and supported report type | Same canonical data/status semantics; scoped evidence access; print/CSV supported per type, no fabricated universal Excel export |

## Example proposals, not executable requests

### Standard question edit

```http
PATCH /api/v1/organizations/org-qa/audit-configuration/standard-questions/Sort%3A0
If-Match: "revision-7"
```

```json
{"question":"Are unused tools removed from the work area?","instruction":"Compare with the approved reference.","referenceImage":{"operation":"replace","fileId":"file-qa-reference-1"}}
```

```json
{"data":{"canonicalId":"Sort:0","question":"Are unused tools removed from the work area?","instruction":"Compare with the approved reference.","referenceImage":{"fileId":"file-qa-reference-1"},"appliesTo":"future-audits"},"version":8,"requestId":"req-qa-1"}
```

The current frontend field is a single `referenceImage?: string` (HTTPS/bundled/raster data URL), not the proposed file-object DTO above. The latest editor has upload/camera/Remove, **no URL entry box**; valid existing HTTPS model references remain accepted. Explicit removal must not trigger a default-image backfill. Proposed backend may support a validated HTTPS alternative if approved; never accept arbitrary unsafe schemes/SVG/data HTML.

### Source-linked Action creation (atomic command proposal)

```http
POST /api/v1/organizations/org-qa/actions
Idempotency-Key: qa-source-follow-up-1
```

```json
{"title":"Remove unused fixture","description":"Review physical disposition","source":{"module":"redTag","recordId":"RT-QA-001"},"zoneId":"zone-qa-a","responsibleUserId":"user-qa-owner","priority":"Medium","actionCategory":"Corrective Action","expectedSourceVersion":3}
```

```json
{"data":{"id":"action-qa-1","sourceModule":"redTag","sourceId":"RT-QA-001","responsiblePersonId":"user-qa-owner","status":"Assigned","sourceLink":{"recordId":"RT-QA-001","actionId":"action-qa-1"}},"version":1,"requestId":"req-qa-2"}
```

The server must authorize both source and destination, enforce eligible owner and deduplicate the same source command. Display labels/dates/actor metadata should be resolved from current configuration and returned as snapshots where required. If atomicity is unavailable, return a durable operation/reconciliation status; do not claim source linkage when only the Action saved.

### Action submission / conflict proposal

```json
{"version":4,"observation":"Fixture removed and area checked.","correctiveActionCategory":"Communication","costSaving":0,"resolutionEvidenceIds":["file-qa-after-1"]}
```

```json
{"data":{"id":"action-qa-1","status":"Pending Auditor Review","submittedByUserId":"authenticated-user","submittedForReviewAt":"2026-10-18T09:00:00Z"},"version":5,"requestId":"req-qa-3"}
```

```json
{"error":{"code":"SOURCE_ACTION_INCOMPLETE","message":"Complete the linked Action before closing this disposition.","fields":{"actionId":"action-qa-1"}},"requestId":"req-qa-4"}
```

## Error/status proposal for agreement

400 invalid request/schema; 401 unauthenticated; 403 denied authority; 404 missing or inaccessible resource according to agreed tenant nondisclosure policy; 409 illegal transition/conflict/idempotency misuse/unfinished source dependency; 412 stale version if If-Match chosen; 413 file size; 422 validated field errors; 429 rate limit; 5xx unavailable/internal/provider failure with safe message. Exact codes and retryable flags are **proposed**, not current general server behavior.

## Unresolved contracts

Final endpoint names/DTO validation/OpenAPI, auth transport, pagination/sort, ETags/idempotency retention, display-number strategy, file protocol, report export schema and retention/deletion policy require backend/product sign-off. Do not introduce a QR allocation endpoint: original creation-target QR is reusable client rendering, not a record reservation API. Server print/PDF generation is optional future work, not existing functionality.
