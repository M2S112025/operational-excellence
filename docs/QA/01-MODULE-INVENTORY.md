# Implemented module inventory

Scope/status/count definitions: [00-BASELINE.md](00-BASELINE.md). All behavior below was traced in source; browser behavior was not executed. “Existing coverage” means Node Vitest unless explicitly stated. The complete route catalog below includes aliases/redirects and their actual source files.

## 1. Audit

- **Routes/screens:** `/audits` list, schedule/create dialog, scheduled setup/start, execution with section/question navigation, evidence/reference viewer, Action dialog, signature/completion, completed report `/5s/audits/[auditId]/report`. `/5s/audits` and `/5s/listing` render compatibility lists. Settings: `/audits/settings`, `/standard-checklist`, `/custom-questions`, `/scoring`; evidence-rules route redirects. There is no standalone `/audits/[id]` execution route: selection is workspace state/query.
- **Workflow/state:** Draft compatibility, Scheduled → In Progress → Completed. Create/start-now or schedule; edit scheduled setup; save execution drafts; compliance/Yes-No/text answers; signatures; completion; schedule deletion under existing rules; report/print. Completion is independent of closure of its linked Actions: it validates question readiness/signature rather than requiring all Actions Completed.
- **Fields/validation:** Plant, Zone/area, auditor, dates/schedule, sections/questions; signature required at completion. Compliance uses snapshot policy and response identity, not “score equals zero” alone. Non/partial compliance needs observation and linked Action; standard questions additionally need evidence, custom evidence depends on configuration. Custom optional text/Yes-No can remain unanswered. Scoring values must be finite, nonnegative and strictly increasing, with positive full compliance. Canonical 39 standard IDs/order/section assignment remain fixed; editable wording/guidance/reference. Custom supports stage, response type, mandatory, evidence rule, instruction, reference, active, order. Standard editor has 500-character text limit; custom also validates stage/type/options/order at store.
- **Roles:** permission presets include audits.view/create/execute/complete. `canCompleteFiveSAudit` requires active same-Plant Admin or named Auditor with audits.complete; deletion has separate authority/state checks. Some create/update entrypoints are caller/UI-protected rather than uniformly guarded stores (R-02). Settings mutations require active Admin + configuration permission in own demo organization, or verified platform Super Admin for registered organization; other roles get read-only question UI. Super Admin is not a universal operational executor.
- **Persistence/relations:** `lib/five-s/audit-store.ts`, `FiveSAudit`/`FiveSQuestion` snapshots; `manufacturing-qms-five-s-audits-v1` plus numbering/sequence/fixture keys. Standard overrides: `ops-standard-audit-checklist-v1`, v2 organization envelope with legacy flat edits assigned only to demo org; custom: `ops-custom-audit-questions-v1`; scores: `ops-audit-scoring-policies-v1`. Questions link canonical Actions with audit/question IDs; evidence/reference retained in snapshots; reports/dashboard read same stores.
- **Implemented image behavior:** one reference image per question; Upload Photo/Take Photo/preview/Remove. HTTPS model references still supported but no URL-entry UI. Raster data signatures/size validated; photos compressed through shared helper; failures visible; images render in execution with unavailable state. No object-storage backend.
- **Tests:** `audit-template`, `audit-scheduling`, `audit-independent-action-closure`, `audit-configurable-scoring`, `audit-configured-execution`, `audit-scoring-policy`, `audit-scoring-editor`, `audit-question-management`, `standard-audit-checklist`, `custom-audit-question-authorization`, `custom-audit-questions`, `audit-settings-reference-access`, focus/scroll tests (all `.test.ts` or `.characterization.test.ts` in `tests`).
- **Gaps:** real Save/Cancel/role/org switching, camera permissions/async cancel, quota after photo capture, actual historical reloads, evidence gestures, focus/keyboard, footer overlays, schedule dates/timezones and printed output in browser. No measured branch coverage.

## 2. Red Tag — restored original OPS

- **Routes/screens:** `/5s/red`, `/overview`, `/create`, `/awaiting-closure`, `/closed`, `/[tagId]`, `/[tagId]/print`, `/[tagId]/report`, `/create-qr/print`; settings is coming-soon. Overview quantity QR dialog; item identification camera/upload; review/decision; direct or linked-Action handling; disposition evidence/notes/confirmation; Keep confirmation/further evaluation.
- **Workflow/state:** Open → Under Review → Decision Made → Disposition In Progress → Closed. Creation UI uses `createAndSubmitRedTagV2`, so new record normally proceeds immediately into review. Keep closes via confirmation; further_evaluation must receive a later physical/Keep decision. Decisions: keep, relocate, return, repair, sell_reuse, scrap, further_evaluation. Awaiting Verification/In Progress and legacy verifiers remain compatibility paths, not the imported 5S lifecycle. Linked Actions reconcile evidence/status; incomplete linked Action blocks physical closure. Closed is terminal.
- **Fields/validation:** title/item, Plant/Zone/department, category, categorized reason, required item description/remarks, Before image; Free Text requires explanation. Direct disposition requires active setup fields (responsible ID/name, target date, execution notes), After evidence, completion notes and responsible confirmation; linked closure requires synced Completed Action. Estimated value/quantity exist in type/legacy paths but current create UI does not solicit all historical fields. Review command checks designated reviewer ID. Store permission enforcement is incomplete despite creator/UI permission helper (R-01).
- **Roles/persistence:** `canCreateRedTag` checks active `red_tag.create`; UI management/print permissions and zone/config context must be tested against direct commands. Store `features/five-s/red-tag/store.ts`, types in same directory, key `five-s-red-tags-v1`; original intentional seed `RT-EGM-ZA-001`. Reset `lib/five-s/red-tag-reset.ts` clears dedicated old/new Red Tag keys once, detaches Red Tag origins on retained Actions, removes only Red Tag relationship edges/Gemba references, preserves unrelated records. Marker `ops-red-tag-original-reset-v1` prevents future deletion. No imported record migration.
- **QR:** default 1, whole quantities 1–100, invalid direct print quantity fallback 1. Reusable Plant creation target copied to every label; real encoder, no ID reservation/automatic record allocation. Individual-record QR targets detail. Native printing/Save as PDF; no newly invented unique per-label ledger.
- **Relations/tests:** Gemba observation ↔ Red Tag ↔ canonical Action; relationship metadata and CI optional operational links. Tests `red-tag-reset`, `red-tag-v2-foundation`, `red-tag-v2-create-review-decision`, `red-tag-v2-disposition-closure`, `red-tag-v2-qr-print`, `red-tag-before-after-evidence`, `red-tag-simplification`, `red-tag`, `gemba-red-tag-phase5a`, `relationships-phase4`.
- **Gaps:** direct mutation authorization/inactive actor, real reset first-load/retry/rollback browser ordering, source-write failures, physical decision branches, 100-label print pagination and independently decoded QR output; imported workflow must never return.

## 3. Action Center

- **Routes/screens:** `/actions`, `/actions/[actionId]`, report, configuration categories/priorities/reminders/escalation-rules; `/5s/actions/*` compatibility entries. Center filtering/queues, manual create, shared linked-create dialog, owner assignment/reassignment, due-date change, Overview/Evidence/Review steps, evidence viewer, submit/send-back/verify-close, attention indicators.
- **States:** Awaiting Assignment → Assigned/Open → In Progress → Pending Auditor Review (other review status aliases supported) → Completed; review can Send Back → Rework Required → resubmit. Overdue may be persisted legacy status but active lateness uses canonical due helper. Terminal edits/status forgery blocked by generic-update whitelist.
- **Fields/validation:** sourceModule/ID/title/label/location/observation, Plant/Zone, owner from configured zone members, category/priority/due date; completion notes + corrective category + finite nonnegative savings + resolution evidence. Finding/progress/resolution evidence are separate. Reassignment/due overrides require reason and authority; date validator rejects invalid/past new dates. Assign-to-me unavailable reason is an accessible info tooltip; eligible count hidden for Red Tag source.
- **Roles:** owner with actions.work edits content; scoped Zone Leader assigns; designated/eligible delegated reviewer closes, owner cannot self-review; Audit reviewer restrictions differ from non-Audit delegation. Same-Plant and membership checked for content. `createAction` itself trusts input/no actor argument, while commands for transitions/content are guarded. Configuration uses existing Admin configuration permission.
- **Persistence/relations:** canonical `MyAction` in `features/five-s/types/my-actions.ts`, `lib/actions/action-store.ts`, `standalone-5s-actions`; fixture marker, reminders/escalations/config keys separately. Action Center reads store, does not duplicate data. Reverse links use `lib/actions/action-config.ts`; source evidence resolver handles Red Tag/Gemba; metadata relationships use separate store. No transaction across source/Action/relationship/notifications.
- **Tests:** `action-store`, `action-center`, `action-step-persistence-assignment`, `action-integration-hardening`, `action-guided-navigation-source-evidence`, `action-attention`, `action-configuration`, content-authorization/ownership/due-date tests, completed-person/report wiring.
- **Gaps:** full UI create/assign/execution/rework/close cycle; tooltips/select layering within dialog, readonly/delegation negatives, DST/overdue boundary, retry orphan prevention, download fidelity and browser storage faults.

## 4. Gemba

- **Routes/screens:** list/new; `/gemba/[id]` setup/detail, `/walk` execution, `/report`, `/gemba/observations/[observationId]` whitelisted shared view. New dialog selects start-now/schedule, participants including outside-zone people; add/edit observation, evidence capture, voice review, corrective-action decision, Red Tag/CI dialogs, horizontal deployment, complete.
- **States/fields:** Scheduled → In Progress → Completed; legacy Draft normalizes to Scheduled. Setup edit command exists only while Scheduled, with no current UI caller. Plant/Zone, active lead/participants, purpose; scheduling UI requires future date/time; notes optional. Observation Positive/Opportunity/Issue, title/description/location/people, optional voice note; UI requires photo for Issue and explicit corrective-action/no-action decision. Save store enforces actor/state but some field rules are in UI only. Completing walk does not require linked Actions closed.
- **Roles:** active same-Plant Admin/Auditor conducts/mutates; zone users/participants/lead see scoped walks; current leaders can see projected horizontally shared observations without receiving full walk/Action access; platform Super Admin cannot conduct. Old deployment snapshots do not grant current access.
- **Persistence:** `features/gemba/gemba-store.ts` (`ops-gemba-v1`), photo Blobs in IndexedDB `ops-local-assets/gemba-photos`; metadata uses storageKey. Object URLs must be recreated/revoked; voice playback URL is session-local and may not survive refresh. Same-Plant broadcast records per-recipient delivery status; local notifications are not real external delivery.
- **Relations/tests:** explicit observation actionId/redTagId/improvementId and walk actionIds, shared relationship edges; CI owner selection uses current eligibility. Tests `gemba`, `gemba-phase1`, `gemba-action-workflow`, `gemba-red-tag-phase5a`, `gemba-ci-phase5b`, `gemba-photo-storage`, `gemba-photo-persistence`, voice-provider/capture, horizontal-deployment and shared projection/failure tests.
- **Gaps:** true IndexedDB persistence/objectURL after reload, denied/full storage, microphone permissions/no provider/network, live type changes, canceled source dialogs and duplicate retries, current-recipient authorization changes, responsive long forms.

## 5. Continual Improvement (code: continuous-improvement)

- **Routes/screens:** `/continuous-improvement`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/report`; old `/5s/continuous-improvement/*` aliases; settings redirects. Proposal, explicit owner/team, optional operational records, review/hold/resume, implementation, completion review/return, canonical Action creation.
- **Workflow:** draft → submitted → under_review → approved/rejected/on_hold; hold resumes; approved → in_progress → awaiting_completion_review → completed or return to in_progress. Legacy complete command exists; do not replace proposal workflow with an Action.
- **Fields/validation:** title/problem/estimated time >0 required at store creation; current UI/full proposal update also require proposal/expected benefit, active eligible owner in Plant/Zone, members from eligible zone. Benefit type/time units, proposed savings/before images optional; completion implementation process/action taken/actual benefit/After evidence required; actual savings if entered finite/nonnegative. Rejection/hold/return require remark. Linked unfinished Actions block terminal completion review.
- **Roles/persistence:** active ci.create/implement/review plus owner/team/zone/Admin rules in `access.ts`; Super Admin explicitly excluded from operational CI. Store `five-s-continuous-improvements-v1`, fixture marker; timeline and owner attribution retained. User deactivation needs outstanding owner reassignment. Links to Actions and optional operational record relationships; Gemba/VM creation preserves source context.
- **Tests:** `continuous-improvement`, owner/deactivation, terminology-completion, batch-c-ci-operational-relationships, `gemba-ci-phase5b`, `ux-gemba-ci-failures`, lifecycle/data-consistency.
- **Gaps:** owner/team changes mid-workflow, Cancel/refresh/retry after source save, linked-Action closure gate in real UI, multiple evidence files/full storage, cross-Plant negative flows, persisted report/benefits reconciliation.

## 6. Visual Improvement — compatibility implementation

- **Routes/screens:** `/visual-improvement`, `/new`, `/[id]`, `/edit`, `/report`, inherited `ModuleGate('visualImprovement')`. Retained direct-access surfaces; excluded from active navigation and report registry. Create/edit before-after, plan/start, submit, return/approve, linked Action, report.
- **States/fields:** Draft → Planned → In Progress → Awaiting Review → Completed or Returned/resubmit. Title/Plant/Zone/location/category/owner/participants, Before description/images, expected benefit; After description/evidence/benefits/completion notes at implementation/submission; optional savings/date. Store creation requires title/location/Before description/evidence; linked Action must complete before approval.
- **Roles/persistence:** same legacy CI/action permission family with owner/creator/team/zone scope and review roles in `visual-improvement-access.ts`; Super Admin excluded. `ops-visual-improvements-v1`, seed/fixture migration, activity and Action ID. Keep separate from Visual Management. Mutation functions in the legacy store accept caller-supplied actors without the access-helper checks; current role rules are primarily UI-level and require direct-command negative tests (R-08).
- **Tests/gaps:** `visual-improvement`, `batch-c-evidence-lifecycle`, data-consistency/report tests. Need compatibility route smoke, permission/entitlement negatives, real before/after file reload and linked approval browser cycle. Do not reactivate as a primary module or migrate records without a product decision.

## 7. Visual Management

- **Routes/screens:** `/visual-management` daily overview, boards/list/detail/print, `/boards/[id]/meeting` live meeting, meetings/list/detail, consolidated settings; older settings subroutes and escalations redirect. Active consolidated settings exposes boards/owners/members and reusable metrics; tier/section settings functions and older AI KPI wizard remain in code but their former routes redirect and no active wizard import was found. Reusable metrics, assignment/targets/thresholds, actual entry, no-production/holiday, deviations/Action-or-justification; meeting schedules/recurrence/rescheduling, attendance/guests, topics, follow-ups, decisions, completion/history.
- **States/validation:** Board Active/Inactive/Paused; Meeting In Progress → Completed. Only one active meeting per board; repeated scheduled occurrence cannot start twice. KPI definition active/archived, assignment visibility, reporting period and numeric status calculations; no-production state distinct from zero. Validate targets/amber thresholds/direction, assigned metric, actual finite values, active ownership/current member access. Schedule validates date/time, recurrence/duration/attendees; edit scope single/future/series. Topics require title/description; follow-up Action linking validates context. Meetings can complete with outstanding Actions; completed content is immutable through guarded operations. Legacy escalation statuses remain in store and linked resolution requires Completed Action, but new active escalation screen is absent.
- **Roles:** Admin configuration permission for board/tier/KPI config; active same-Plant Admin, board owner, current zone leader manage/operate; eligible members can operate subject to command distinction. Current active board required. Meetings freeze name/KPI snapshots so subsequent config does not rewrite history.
- **Persistence/relations:** `ops-visual-management-v1`, `ops-visual-management-configuration-v1`, `ops-visual-management-kpis-v1`, `ops-visual-management-kpi-execution-v1`, `ops-visual-management-meeting-schedules-v1`. Action store is canonical. Topic→Action and KPI deviation→Action supported; UI navigation to CI/Gemba carries meeting/topic query, destination callbacks link new record IDs. Information-only topic is supported. Red Flag follow-up type exists but current entitlements/archived routes make it inactive.
- **Tests:** `visual-management`, settings/scope-cleanup/daily-v1, all-meeting-metrics, attendance/scheduling, print, KPI configuration/execution/intelligent-creation/manual-acceptance/presentation, drilldown; cross-module store tests.
- **Gaps:** long live meetings/recurrence timezone exceptions, actual entry/report-period duplicate/correction rules in browser, assignment reconfiguration vs frozen snapshots, canceled cross-module follow-up, concurrent tabs, touch/print/table geometry. The retained AI API/wizard contract must remain advisory and never invent owner/confirmed numeric facts; an active AI-assisted metric-creation UI journey is not currently exposed.

## 8. Dashboard and Reports

- **Routes/screens:** `/dashboard` overview and unified performance views; `/analytics/dashboards` redirects; `/reports`, `/reports/summary/[type]`, `/reports/action/[id]`, `/5s/reports` compatibility, source report routes listed above. Filters/search/status/Plant/Zone/date, record previews, print/native Save PDF, supported CSV summaries.
- **Behavior/fields:** canonical aggregation from audits, Actions, CI, Gemba, VM plus retained Red Flag data; no Dashboard Red Tag hook currently. Filters and computed overdue/score denominators/benefits must agree with underlying records. Reports use record and summary registries; legacy VI/Red Flag definitions retained outside product-facing registry. UI preserves actual owner/reviewer/completion identities and source-before vs resolution evidence. CSV/print support is per report definition, not universal backend exports.
- **Roles/persistence:** dashboard.view/reports.view/export and entitlement/source scope; no second report entity store. Reports consume canonical snapshots/records; presentation controls may store preferences. Primary Dashboard is singular. Time windows/Zone scope are query/filter behavior, not invented API analytics.
- **Tests/gaps:** `ops-dashboard`, `analytics-dashboards`, `audit-metrics`, `reports`, `reports-v2-evidence`, `five-s-reports-integrity`, report-person/route tests. Need real filter navigation, downloaded CSV encoding/formula-risk, long multi-page print, missing/deleted source references, data-refresh after lifecycle changes and Red Tag dashboard product decision (R-03).

## 9. Administration and Super Admin

- **Routes/screens:** `/settings/users` plus `/admin/users` and `/administration/users` aliases; `/settings/roles`, `/settings/organization/plant`, `/zones`, `/module-access`; `/super-admin/organizations`, `/[id]`, `/[id]/modules`, guarded layout; Super Admin index/settings redirect. User create/edit/status, permissions/roles/zone membership, outstanding owner transfers, Plant/Zone rename/status/leader; organization module access controls.
- **Roles/rules:** Admin manage_users controls user commands; cannot deactivate self/remove own Admin permission; duplicate employee ID/email rejected; required name/email/roles. Users with outstanding Action/CI ownership or zone leadership cannot simply deactivate. `assignZoneLeader` transfers memberships/roles with existing ownership constraints. Role presets include Admin/Auditor/Zone Leader/Zone Member/Reviewer plus compatibility Viewer; Super Admin is a special verified identity, not a normal AdminRole value. Platform guard/current configured status checks apply. Entitlements centralize UI visibility; they are not backend authorization.
- **Persistence/relations:** `five-s-administration-users-v1`, `ops-organization-configuration-v1`, `ops-organization-modules-v1`; see generated storage catalog for exact source declarations. Existing directory belongs to demo organization; Plant/Zone references are often names. Organization registry has ABC Manufacturing and XYZ Components; no arbitrary real-tenant membership service.
- **Tests/gaps:** administration/settings-administration/organization-settings/module-entitlements, batch ownership/governance, fix01-ci-deactivation. Need UI deactivation transfer sequence/rollback, alias parity, rename effects on history vs current assignments, forged role/tenant negative cases, no genuine user-login provisioning yet.

## 10. Shared authentication, navigation, settings and Profile

- **Routes/screens:** `/` redirects Dashboard; protected application group has login surface rendered by AuthGate rather than a dedicated `/login` page. `/profile` tabs for personal/preferences/notifications; `/settings` administration index and aliases, Super Admin shell; create menu/breadcrumbs/sidebar/global selectors/dialogs/camera/evidence viewer.
- **Behavior:** demo sign-in/session persistence/sign-out/password change; demo role selection from configured identities; sidebar collapse/expanded at desktop, drawer below lg; profile/password/preferences save, language/theme/format/focus settings and personal notification preferences. Notification store exists (Action attention and Gemba broadcasts) but expansion of Notification Center is intentionally postponed. No production sessions/reset-password/email notification infrastructure.
- **Roles/persistence:** auth key `5s-auth-session`, role `five-s-demo-role`, password override `ops-demo-password-v1`; Profile/UI preferences and personal settings browser keys declared in their providers/stores. Do not include demo credentials or auth state artifacts in published reports. Data attributes `data-app-shell/workspace/main/content` support future responsive assertions. No permission grants inferred solely from sidebar visibility.
- **Tests/gaps:** profile-settings, settings-administration, global-searchable-select, system-wide-ux-camera, ux-return-navigation/shared-presentation, full-width-workspace, navigation/focus/scroll tests. Need true login keyboard/error/reload/logout flows, modal/drawer focus trap and focus restoration, tooltip click/touch, overlay stacking, hydration/console errors, unavailable camera/mic, locale long-text and invalid returnTo handling in browser.

## Retained Red Flag and deferred work

Red Flag code/types/store (`ops-red-flags-v1`) and characterization remain. Public detail/new/report/settings routes redirect to archived `/red-flag` stub; it is not an active creation module. Historical Actions/report metadata retain the source. Test those compatibility behaviors; do not invent Red Tag↔Red Flag equivalence. Red Tag settings are coming-soon; Gemba/CI settings redirect; Notification Center and backend migration remain outside Phase 0.

## Complete route catalog

The render/redirect classification is based on each page wrapper. Inherited AuthGate/ModuleGate and component-level role checks still apply; “render” includes aliases/placeholders and does not imply full feature availability. Dynamic patterns are counted once.

| URL pattern | Wrapper behavior | Source / target |
| --- | --- | --- |
| `/5s/actions/[actionId]` | Render | `@/features/five-s/action-detail-page`; [page.tsx](../../app/(app)/5s/actions/[actionId]/page.tsx) |
| `/5s/actions/[actionId]/report` | Render | `@/features/five-s/action-report-route`; [page.tsx](../../app/(app)/5s/actions/[actionId]/report/page.tsx) |
| `/5s/actions` | Render | `@/features/five-s/actions-page`; [page.tsx](../../app/(app)/5s/actions/page.tsx) |
| `/5s/audits/[auditId]/report` | Render | `@/features/five-s/components/FiveSAuditReport`; [page.tsx](../../app/(app)/5s/audits/[auditId]/report/page.tsx) |
| `/5s/audits` | Render | `@/features/five-s/audit-list-page`; [page.tsx](../../app/(app)/5s/audits/page.tsx) |
| `/5s/continuous-improvement/[improvementId]` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/5s/continuous-improvement/[improvementId]/page.tsx) |
| `/5s/continuous-improvement/[improvementId]/report` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/5s/continuous-improvement/[improvementId]/report/page.tsx) |
| `/5s/continuous-improvement/new` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/5s/continuous-improvement/new/page.tsx) |
| `/5s/continuous-improvement` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/5s/continuous-improvement/page.tsx) |
| `/5s/listing` | Render | `@/features/five-s/audit-list-page`; [page.tsx](../../app/(app)/5s/listing/page.tsx) |
| `/5s` | redirect | `"/dashboard"`; [page.tsx](../../app/(app)/5s/page.tsx) |
| `/5s/red/[tagId]` | Render | `@/features/five-s/red-tag/red-tag-module`; [page.tsx](../../app/(app)/5s/red/[tagId]/page.tsx) |
| `/5s/red/[tagId]/print` | Render | `@/features/five-s/red-tag/red-tag-module`; [page.tsx](../../app/(app)/5s/red/[tagId]/print/page.tsx) |
| `/5s/red/[tagId]/report` | Render | `@/features/five-s/red-tag/red-tag-report-page`; [page.tsx](../../app/(app)/5s/red/[tagId]/report/page.tsx) |
| `/5s/red/awaiting-closure` | Render | `@/features/five-s/red-tag/red-tag-module`; [page.tsx](../../app/(app)/5s/red/awaiting-closure/page.tsx) |
| `/5s/red/closed` | Render | `@/features/five-s/red-tag/red-tag-module`; [page.tsx](../../app/(app)/5s/red/closed/page.tsx) |
| `/5s/red/create` | Render | `@/features/five-s/red-tag/red-tag-module`; [page.tsx](../../app/(app)/5s/red/create/page.tsx) |
| `/5s/red/create-qr/print` | Render | `@/features/five-s/red-tag/red-tag-module`; [page.tsx](../../app/(app)/5s/red/create-qr/print/page.tsx) |
| `/5s/red/overview` | Render | `@/features/five-s/red-tag/red-tag-module`; [page.tsx](../../app/(app)/5s/red/overview/page.tsx) |
| `/5s/red` | Render | `@/features/five-s/red-tag/red-tag-module`; [page.tsx](../../app/(app)/5s/red/page.tsx) |
| `/5s/red/settings` | Render | `@/components/layout/page-container, @/components/ops/ops-empty-state, @/features/five-s/components/FiveSPageHeader, @/features/five-s/red-tag/red-tag-nav`; [page.tsx](../../app/(app)/5s/red/settings/page.tsx) |
| `/5s/reports` | Render | `@/features/five-s/reports-page`; [page.tsx](../../app/(app)/5s/reports/page.tsx) |
| `/actions/[actionId]` | Render | `@/components/modules/module-gate, @/features/five-s/action-detail-page`; [page.tsx](../../app/(app)/actions/[actionId]/page.tsx) |
| `/actions/[actionId]/report` | Render | `@/components/modules/module-gate, @/features/five-s/action-report-route`; [page.tsx](../../app/(app)/actions/[actionId]/report/page.tsx) |
| `/actions` | Render | `@/features/five-s/actions-page, @/components/modules/module-gate`; [page.tsx](../../app/(app)/actions/page.tsx) |
| `/actions/settings/categories` | Render | `@/features/settings/action-categories-page`; [page.tsx](../../app/(app)/actions/settings/categories/page.tsx) |
| `/actions/settings/escalation-rules` | Render | `@/features/settings/action-configuration-pages`; [page.tsx](../../app/(app)/actions/settings/escalation-rules/page.tsx) |
| `/actions/settings` | Render | `@/components/layout/page-container, @/features/five-s/components/FiveSPageHeader, @/features/actions/actions-nav, @/features/settings/settings-access, @/lib/actions/action-configuration-store, @/lib/actions/action-category-store`; [page.tsx](../../app/(app)/actions/settings/page.tsx) |
| `/actions/settings/priority-due-dates` | Render | `@/features/settings/action-configuration-pages`; [page.tsx](../../app/(app)/actions/settings/priority-due-dates/page.tsx) |
| `/actions/settings/reminder-rules` | Render | `@/features/settings/action-configuration-pages`; [page.tsx](../../app/(app)/actions/settings/reminder-rules/page.tsx) |
| `/admin/users` | Render | `@/features/five-s/administration/users-page`; [page.tsx](../../app/(app)/admin/users/page.tsx) |
| `/administration/users` | Render | `@/features/five-s/administration/users-page`; [page.tsx](../../app/(app)/administration/users/page.tsx) |
| `/analytics/dashboards` | redirect | `"/dashboard?view=performance"`; [page.tsx](../../app/(app)/analytics/dashboards/page.tsx) |
| `/audits` | Render | `@/components/modules/module-gate, @/features/five-s/audit-list-page`; [page.tsx](../../app/(app)/audits/page.tsx) |
| `/audits/settings/custom-questions` | Render | `@/features/settings/custom-audit-questions/page`; [page.tsx](../../app/(app)/audits/settings/custom-questions/page.tsx) |
| `/audits/settings/evidence-rules` | redirect | `"/audits/settings"`; [page.tsx](../../app/(app)/audits/settings/evidence-rules/page.tsx) |
| `/audits/settings` | Render | `@/features/settings/audit-configuration-page`; [page.tsx](../../app/(app)/audits/settings/page.tsx) |
| `/audits/settings/scoring` | Render | `@/features/settings/audit-scoring/page`; [page.tsx](../../app/(app)/audits/settings/scoring/page.tsx) |
| `/audits/settings/standard-checklist` | Render | `@/features/settings/standard-audit-checklist/page`; [page.tsx](../../app/(app)/audits/settings/standard-checklist/page.tsx) |
| `/continuous-improvement/[id]/edit` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/continuous-improvement/[id]/edit/page.tsx) |
| `/continuous-improvement/[id]` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/continuous-improvement/[id]/page.tsx) |
| `/continuous-improvement/[id]/report` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/continuous-improvement/[id]/report/page.tsx) |
| `/continuous-improvement/new` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/continuous-improvement/new/page.tsx) |
| `/continuous-improvement` | Render | `@/features/five-s/continuous-improvement/module`; [page.tsx](../../app/(app)/continuous-improvement/page.tsx) |
| `/continuous-improvement/settings` | redirect | `"/continuous-improvement"`; [page.tsx](../../app/(app)/continuous-improvement/settings/page.tsx) |
| `/dashboard` | Render | `@/features/ops-dashboard/ops-dashboard-page, @/features/analytics/analytics-data`; [page.tsx](../../app/(app)/dashboard/page.tsx) |
| `/gemba/[id]` | Render | `@/features/gemba/gemba-detail-page`; [page.tsx](../../app/(app)/gemba/[id]/page.tsx) |
| `/gemba/[id]/report` | Render | `@/features/gemba/gemba-report-page`; [page.tsx](../../app/(app)/gemba/[id]/report/page.tsx) |
| `/gemba/[id]/walk` | Render | `@/features/gemba/gemba-walk-page`; [page.tsx](../../app/(app)/gemba/[id]/walk/page.tsx) |
| `/gemba/new` | Render | `@/features/gemba/gemba-new-page`; [page.tsx](../../app/(app)/gemba/new/page.tsx) |
| `/gemba/observations/[observationId]` | Render | `@/features/gemba/shared-observation-page`; [page.tsx](../../app/(app)/gemba/observations/[observationId]/page.tsx) |
| `/gemba` | Render | `@/features/gemba/gemba-page`; [page.tsx](../../app/(app)/gemba/page.tsx) |
| `/gemba/settings` | redirect | `"/gemba"`; [page.tsx](../../app/(app)/gemba/settings/page.tsx) |
| `/profile` | Render | `@/features/profile/profile-page`; [page.tsx](../../app/(app)/profile/page.tsx) |
| `/red-flag/[id]` | redirect | `"/red-flag"`; [page.tsx](../../app/(app)/red-flag/[id]/page.tsx) |
| `/red-flag/[id]/report` | redirect | `"/red-flag"`; [page.tsx](../../app/(app)/red-flag/[id]/report/page.tsx) |
| `/red-flag/new` | redirect | `"/red-flag"`; [page.tsx](../../app/(app)/red-flag/new/page.tsx) |
| `/red-flag` | Render | `@/components/layout/page-container, @/components/ops/ops-empty-state`; [page.tsx](../../app/(app)/red-flag/page.tsx) |
| `/red-flag/settings` | redirect | `"/red-flag"`; [page.tsx](../../app/(app)/red-flag/settings/page.tsx) |
| `/reports/action/[id]` | Render | `@/components/modules/module-gate, @/features/reports/action-progress-report-page`; [page.tsx](../../app/(app)/reports/action/[id]/page.tsx) |
| `/reports` | Render | `@/components/modules/module-gate, @/features/reports/reports-page`; [page.tsx](../../app/(app)/reports/page.tsx) |
| `/reports/summary/[type]` | Render | `@/components/modules/module-gate, @/features/reports/report-summary-page`; [page.tsx](../../app/(app)/reports/summary/[type]/page.tsx) |
| `/settings/action/categories` | permanentRedirect | `"/actions/settings/categories"`; [page.tsx](../../app/(app)/settings/action/categories/page.tsx) |
| `/settings/action/escalations` | permanentRedirect | `"/actions/settings/escalation-rules"`; [page.tsx](../../app/(app)/settings/action/escalations/page.tsx) |
| `/settings/action/priorities` | permanentRedirect | `"/actions/settings/priority-due-dates"`; [page.tsx](../../app/(app)/settings/action/priorities/page.tsx) |
| `/settings/action/reminders` | permanentRedirect | `"/actions/settings/reminder-rules"`; [page.tsx](../../app/(app)/settings/action/reminders/page.tsx) |
| `/settings/actions/categories` | permanentRedirect | `"/actions/settings/categories"`; [page.tsx](../../app/(app)/settings/actions/categories/page.tsx) |
| `/settings/actions/escalation-rules` | permanentRedirect | `"/actions/settings/escalation-rules"`; [page.tsx](../../app/(app)/settings/actions/escalation-rules/page.tsx) |
| `/settings/actions/priority-due-dates` | permanentRedirect | `"/actions/settings/priority-due-dates"`; [page.tsx](../../app/(app)/settings/actions/priority-due-dates/page.tsx) |
| `/settings/actions/reminder-rules` | permanentRedirect | `"/actions/settings/reminder-rules"`; [page.tsx](../../app/(app)/settings/actions/reminder-rules/page.tsx) |
| `/settings/appearance` | redirect | `"/profile?tab=preferences"`; [page.tsx](../../app/(app)/settings/appearance/page.tsx) |
| `/settings/audit/custom-questions` | permanentRedirect | `"/audits/settings/custom-questions"`; [page.tsx](../../app/(app)/settings/audit/custom-questions/page.tsx) |
| `/settings/audit/evidence-rules` | redirect | `"/audits/settings"`; [page.tsx](../../app/(app)/settings/audit/evidence-rules/page.tsx) |
| `/settings/audit` | permanentRedirect | `"/audits/settings"`; [page.tsx](../../app/(app)/settings/audit/page.tsx) |
| `/settings/audit/scoring` | permanentRedirect | `"/audits/settings/scoring"`; [page.tsx](../../app/(app)/settings/audit/scoring/page.tsx) |
| `/settings/module-access` | Render | `@/features/settings/module-access-page`; [page.tsx](../../app/(app)/settings/module-access/page.tsx) |
| `/settings/notifications` | redirect | `"/profile?tab=notifications"`; [page.tsx](../../app/(app)/settings/notifications/page.tsx) |
| `/settings/organization/plant` | Render | `@/features/settings/organization-settings-pages`; [page.tsx](../../app/(app)/settings/organization/plant/page.tsx) |
| `/settings/organization/zones` | Render | `@/features/settings/organization-settings-pages`; [page.tsx](../../app/(app)/settings/organization/zones/page.tsx) |
| `/settings` | Render | `@/components/layout/page-container, @/components/ui/input, @/features/five-s/components/FiveSPageHeader, @/features/settings/settings-access`; [page.tsx](../../app/(app)/settings/page.tsx) |
| `/settings/roles` | Render | `@/features/settings/roles-permissions-page`; [page.tsx](../../app/(app)/settings/roles/page.tsx) |
| `/settings/users` | Render | `@/features/five-s/administration/users-page`; [page.tsx](../../app/(app)/settings/users/page.tsx) |
| `/settings/visual-management/boards` | permanentRedirect | `"/visual-management/settings/boards"`; [page.tsx](../../app/(app)/settings/visual-management/boards/page.tsx) |
| `/settings/visual-management/kpi-sections` | permanentRedirect | `"/visual-management/settings/kpi-sections"`; [page.tsx](../../app/(app)/settings/visual-management/kpi-sections/page.tsx) |
| `/settings/visual-management/tiers` | permanentRedirect | `"/visual-management/settings/tiers"`; [page.tsx](../../app/(app)/settings/visual-management/tiers/page.tsx) |
| `/super-admin/organizations/[id]/modules` | Render | `@/features/super-admin/super-admin`; [page.tsx](../../app/(app)/super-admin/organizations/[id]/modules/page.tsx) |
| `/super-admin/organizations/[id]` | Render | `@/features/super-admin/super-admin`; [page.tsx](../../app/(app)/super-admin/organizations/[id]/page.tsx) |
| `/super-admin/organizations` | Render | `@/features/super-admin/super-admin`; [page.tsx](../../app/(app)/super-admin/organizations/page.tsx) |
| `/super-admin` | redirect | `"/super-admin/organizations"`; [page.tsx](../../app/(app)/super-admin/page.tsx) |
| `/super-admin/settings` | redirect | `"/super-admin/organizations"`; [page.tsx](../../app/(app)/super-admin/settings/page.tsx) |
| `/visual-improvement/[id]/edit` | Render | `@/features/visual-improvement/visual-improvement-edit-page`; [page.tsx](../../app/(app)/visual-improvement/[id]/edit/page.tsx) |
| `/visual-improvement/[id]` | Render | `@/features/visual-improvement/visual-improvement-detail-page`; [page.tsx](../../app/(app)/visual-improvement/[id]/page.tsx) |
| `/visual-improvement/[id]/report` | Render | `@/features/visual-improvement/visual-improvement-report-page`; [page.tsx](../../app/(app)/visual-improvement/[id]/report/page.tsx) |
| `/visual-improvement/new` | Render | `@/features/visual-improvement/visual-improvement-new-page`; [page.tsx](../../app/(app)/visual-improvement/new/page.tsx) |
| `/visual-improvement` | Render | `@/features/visual-improvement/visual-improvement-page`; [page.tsx](../../app/(app)/visual-improvement/page.tsx) |
| `/visual-management/boards/[id]/meeting` | Render | `@/features/visual-management/meeting-mode-page`; [page.tsx](../../app/(app)/visual-management/boards/[id]/meeting/page.tsx) |
| `/visual-management/boards/[id]` | Render | `@/features/visual-management/board-detail-page`; [page.tsx](../../app/(app)/visual-management/boards/[id]/page.tsx) |
| `/visual-management/boards/[id]/print` | Render | `@/features/visual-management/print/visual-management-print-page`; [page.tsx](../../app/(app)/visual-management/boards/[id]/print/page.tsx) |
| `/visual-management/boards` | Render | `@/features/visual-management/boards-page`; [page.tsx](../../app/(app)/visual-management/boards/page.tsx) |
| `/visual-management/escalations` | permanentRedirect | `"/visual-management"`; [page.tsx](../../app/(app)/visual-management/escalations/page.tsx) |
| `/visual-management/meetings/[id]` | Render | `@/features/visual-management/meeting-detail-page`; [page.tsx](../../app/(app)/visual-management/meetings/[id]/page.tsx) |
| `/visual-management/meetings` | Render | `@/features/visual-management/meetings-page`; [page.tsx](../../app/(app)/visual-management/meetings/page.tsx) |
| `/visual-management` | Render | `@/features/visual-management/daily-management-overview-page`; [page.tsx](../../app/(app)/visual-management/page.tsx) |
| `/visual-management/settings/boards` | redirect | `"/visual-management/settings"`; [page.tsx](../../app/(app)/visual-management/settings/boards/page.tsx) |
| `/visual-management/settings/kpi-configuration` | redirect | `"/visual-management/settings"`; [page.tsx](../../app/(app)/visual-management/settings/kpi-configuration/page.tsx) |
| `/visual-management/settings/kpi-sections` | redirect | `"/visual-management/settings"`; [page.tsx](../../app/(app)/visual-management/settings/kpi-sections/page.tsx) |
| `/visual-management/settings` | Render | `@/features/settings/visual-management-settings-pages`; [page.tsx](../../app/(app)/visual-management/settings/page.tsx) |
| `/visual-management/settings/tiers` | redirect | `"/visual-management/settings"`; [page.tsx](../../app/(app)/visual-management/settings/tiers/page.tsx) |
| `/` | redirect | `"/dashboard"`; [page.tsx](../../app/page.tsx) |

### API handlers (not CRUD)

| Route | Method | Actual behavior and current gap |
| --- | --- | --- |
| `/api/gemba/voice/transcribe` | POST | Multipart audio Blob, size/type checks; provider call; missing provider configuration gives 501. No server session/tenant authorization boundary found. |
| `/api/gemba/voice/extract` | POST | JSON transcript/context, max transcript 4,000; structured extraction/provider error paths. User reviews result before business mutation. |
| `/api/visual-management/kpi/analyze` | POST | Objective/driver suggestions, max objective 4,000; parse/validate provider JSON; unavailable config 503. No automatic owner/fact selection or entity persistence. |

Server-provider credentials are environment configuration. Values were neither read nor reproduced. Future tests must stub upstream providers, not spend tokens/send client data to live services.

## Persistence declaration index

Keys below are extracted from store/provider/storage/reset source. Shared key contents and fixture markers must be reviewed before any future cleanup; this list grants no deletion permission.

| Source | Declared storage keys / markers |
| --- | --- |
| `lib/actions/action-attention-store.ts` | `ops-action-reminders-v1`, `ops-action-escalations-v1` |
| `lib/actions/action-configuration-store.ts` | `ops-action-configuration-v1`, `ops-action-categories-v1` |
| `lib/actions/action-store.ts` | `standalone-5s-actions`, `standalone-5s-action-fixture-version` |
| `lib/current-user.ts` | `five-s-demo-role` |
| `lib/five-s/audit-store.ts` | `manufacturing-qms-five-s-audits-v1`, `manufacturing-qms-five-s-next-audit-number-v1`, `standalone-5s-audit-sequences-v2`, `standalone-5s-audit-fixture-version` |
| `lib/five-s/red-tag-reset.ts` | `ops-red-tag-original-reset-v1` |
| `lib/notifications/notification-store.ts` | `standalone-5s-notifications`, `standalone-5s-notification-fixture-version` |
| `lib/organization-store.ts` | `ops-organization-configuration-v1` |
| `lib/profile-settings.ts` | `ops-personal-profile-settings-v1` |
| `lib/relationships/relationship-store.ts` | `ops_relationships_v1` |
| `features/five-s/administration/store.ts` | `five-s-administration-users-v1` |
| `features/five-s/continuous-improvement/store.ts` | `five-s-continuous-improvements-v1`, `five-s-continuous-improvements-fixture-version` |
| `features/five-s/red-tag/store.ts` | `five-s-red-tags-v1` |
| `features/gemba/gemba-store.ts` | `ops-gemba-v1` |
| `features/red-flag/red-flag-store.ts` | `ops-red-flags-v1`, `ops-red-flags-fixture-version` |
| `features/settings/audit-scoring/store.ts` | `ops-audit-scoring-policies-v1` |
| `features/settings/custom-audit-questions/store.ts` | `ops-custom-audit-questions-v1` |
| `features/settings/standard-audit-checklist/store.ts` | `ops-standard-audit-checklist-v1` |
| `features/visual-improvement/visual-improvement-store.ts` | `ops-visual-improvements-v1`, `ops-visual-improvements-fixture-version` |
| `features/visual-management/kpi-configuration-store.ts` | `ops-visual-management-kpis-v1` |
| `features/visual-management/kpi-execution-store.ts` | `ops-visual-management-kpi-execution-v1` |
| `features/visual-management/meeting-schedule-store.ts` | `ops-visual-management-meeting-schedules-v1` |
| `features/visual-management/visual-management-configuration-store.ts` | `ops-visual-management-configuration-v1` |
| `features/visual-management/visual-management-store.ts` | `ops-visual-management-v1` |
| `components/auth/auth-provider.tsx` | `5s-auth-session`, `ops-demo-password-v1` |

## Report definition catalog

Product-facing registry excludes archived Red Flag and legacy Visual Improvement definitions; all definitions currently declare Excel unsupported. Native print/CSV availability is per definition below.

| Type ID | Label | Module | Kind | Print | CSV |
| --- | --- | --- | --- | --- | --- |
| auditReport | Audit Report | audit | record | true | false |
| nonComplianceSummary | Non-Compliance Summary | audit | summary | true | true |
| beforeAfterSummary | Before & After Summary | audit | summary | true | true |
| actionReport | Action Report | actions | record | true | false |
| completedActionReport | Completed Action Report | actions | record | true | false |
| overdueActionSummary | Overdue Action Summary | actions | summary | true | true |
| improvementReport | Improvement Report | continuousImprovement | record | true | false |
| benefitSavingsSummary | Benefit / Savings Summary | continuousImprovement | summary | true | true |
| redTagReport | Red Tag Report | redTag | record | true | false |
| redFlagReport | Red Flag Report | redFlag | record | true | false |
| redFlagClosureReport | Closure Report | redFlag | record | true | false |
| visualManagementMeetingReport | Visual Management Meeting Report | visualManagement | record | true | false |
| visualBeforeAfterReport | Before & After Improvement Report | visualImprovement | record | true | false |
| visualSavingsSummary | Savings / Benefit Report | visualImprovement | summary | true | true |
| gembaWalkReport | Gemba Walk Report | gemba | record | true | false |
| gembaObservationSummary | Observation Summary | gemba | summary | true | true |
| gembaActionSummary | Gemba Action Summary | gemba | summary | true | true |
