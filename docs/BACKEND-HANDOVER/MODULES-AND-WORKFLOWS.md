# Actual modules and workflows

Evidence: canonical stores/types listed in DATA-MODELS and the existing Phase 0 module/route catalog. No new workflows are introduced here.

| Module / source | Actual transitions / commands | Required readiness and authority | Related records |
| --- | --- | --- | --- |
| Audit | Draft compatibility; Scheduled → In Progress → Completed; scheduled setup/start, answer draft save, complete and limited deletion | Signature and all required answers ready; finite consistent snapshot scoring; non/partial compliance notes + Action + required evidence; configured Admin/named Auditor completion authority | Question corrective Actions; checklist/custom/scoring snapshots; report |
| Standard/custom Audit config | Standard wording/guidance/reference overrides; custom create/update/reorder/status; Delete deactivates, Reactivate supported | Verified platform Super Admin on registered org; active own-org Admin + config permission; IDs/section/order/scoring of standard definitions fixed | New Audit snapshots only; existing completed/in-progress audits not rewritten |
| Actions | Awaiting Assignment → Assigned/Open → In Progress → Pending Auditor Review → Completed; send back → Rework Required → resubmit; persisted historical aliases include other review statuses/Overdue | Owner work permission/membership; designated or eligible delegated reviewer, no owner self-review; notes/category/nonnegative savings/resolution evidence; date/owner changes need reason/authority | Canonical sourceModule/sourceId/sourceObservationId; evidence/history; source reverse links |
| Original OPS Red Tag | Open → Under Review → Decision Made → Disposition In Progress → Closed; creation UI submits for review; Keep confirm closes; further_evaluation must be revised | Categorized item/reason/description/Before image; reviewer match; physical owner/date/notes/After evidence/completion notes/responsible confirmation; linked Action must be Completed. Direct actor authorization remains incomplete | Gemba observation; canonical Action; metadata edges; report/record QR |
| Gemba | Scheduled → In Progress → Completed; legacy Draft normalizes; setup editable only while Scheduled | Active same-Plant Admin/Auditor conducts; participant/zone scoped viewing; Issue photo and corrective decision enforced in UI; store actor/state checks are stronger than some field checks | Observations/evidence/voice; optional Action/Red Tag/CI; deployment recipient projections |
| Continual Improvement | draft → submitted → under_review → approved/rejected/on_hold; hold→resume; approved→in_progress→awaiting_completion_review→completed; return→in_progress | Eligible explicit owner/team; proposal/time; remark for hold/reject/return; process/action taken/actual benefit/After evidence; incomplete linked Actions block terminal completion | Action IDs; Gemba/VM source/context; optional operational relationships; savings report |
| Visual Improvement | Legacy Draft→Planned→In Progress→Awaiting Review→Completed or Returned/resubmit | Before/After description/evidence; linked Action complete before approval; UI role helpers exist, direct store commands lack equivalent checks | Compatibility routes/report/Action; keep separate from VM |
| Visual Management | Board Active/Inactive/Paused; meeting In Progress→Completed; schedule single/future/series changes; KPI actual/no-production/deviation flows | Active board/current operator/config authority; valid thresholds/periods/attendees; one in-progress meeting per board; completed snapshots frozen | Topic/KPI deviation→Action; topic→CI/Gemba callbacks; legacy escalation store |
| Admin/Super Admin | Users Active/Inactive; Plant/Zone configuration/leadership; module-entitlement toggles | Cannot remove own admin access/deactivate self; outstanding Action/CI/leader responsibilities require transfer; module access UI platform-only, store gap remains | Users/zone duties; current ownership; org entitlements; historical actor names |
| Dashboard/Reports | Read/filter/print/supported CSV; single primary Dashboard with performance views | Read/export/entitlement/source scope; canonical due/scoring/benefit calculations; no second record database | All supported canonical sources/snapshots |

## Completion rules must remain distinct

- Ready Audit completion does not require linked Actions closed; Action execution/review can continue afterward.
- Gemba walks and VM meetings can complete with open follow-up Actions. This is implemented behavior, not a missing universal gate.
- CI completion review, VI approval and linked Red Tag physical closure require relevant linked Actions completed.
- Red Tag physical closure still needs original Before and resulting After evidence/physical confirmation even after canonical Action closure. Original statuses must not be replaced by imported 5S planning/member/rework semantics.
- Completed audits/meetings preserve their snapshot wording/policy/reference/metric/board-name history; later configuration changes affect new snapshots.

## Source integration and transaction needs

Audit question→Action; Gemba observation→Action/Red Tag/CI; Red Tag→Action; CI→Actions; VI→Action; VM topic/KPI deviation→Action and topic→CI/Gemba are supported. `OpsRelationship` is metadata-only and supplementary to explicit record fields. Some legacy reverse links use route/prefix heuristics; the backend should return stable resource references, not derive identity from display labels.

Failed source linkage can trigger rollback of a just-created Action; rollback itself can fail. CI/Gemba relationship metadata failures may occur after a source/target has already saved. Backend commands need explicit atomic/idempotent semantics and recovery projections rather than pretending current browser writes are transactional.

## Exposed versus compatibility/inactive

Eight active product modules/capabilities: Audit, Red Tag, Actions, Gemba, CI, VM, Dashboard, Reports; Visual Improvement is retained compatibility. Red Flag creation/detail/report pages are archived/redirected; its persisted data/Action history remain. VM escalations and older AI KPI wizard code are retained but public routes redirect/unlink them. Active VM settings exposes boards and reusable metrics, not every old wizard. Notification Center expansion is postponed.

## QR workflow

Quantity selection 1–100/default 1; invalid direct quantity falls back to 1. Reusable Plant-specific `/5s/red/create?plant=…` target is intentionally identical across labels. Rendering/printing allocates no record IDs or Actions. Record QR points to a saved tag. Printing uses native browser print/Save as PDF; no server-side unique-label allocation system is implemented or proposed as restoration.
