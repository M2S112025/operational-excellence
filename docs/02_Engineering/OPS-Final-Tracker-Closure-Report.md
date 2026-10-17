# OPS Final Tracker Closure Report

Date: 17 October 2026 (Asia/Kolkata). Repository: `/Users/rumesh-9634/Projects/Ops`.

## A. Overall summary

All **73 original complaints** were reviewed: **58 Overall issues + 15 Overall issues_Lakshman**. The unique identifier is worksheet + physical Excel row; repeated/blank issue numbers remain intact. Header/spacer/date-separator rows are excluded. Complaint text below is exact, including spelling; newlines are represented by `<br>`. Original status whitespace is trimmed for display; blank statuses are not inferred. Formula/image indicators are auxiliary workbook cells, not additional complaints. Original workbook and historical reports were not edited.

Two remaining independently actionable tracker issues were corrected in this batch: **Overall issues row 54** and **Overall issues_Lakshman row 4**. Other outstanding requirements need product decisions, references or infrastructure. There are **zero remaining independently actionable confirmed Open defects with defined approved behavior**. This does not mean all 73 requirements are fully delivered or browser-certified.

| Classification | Overall issues | Overall issues_Lakshman | Total |
|---|---:|---:|---:|
| Already Fixed | 31 | 5 | 36 |
| Already Working | 15 | 4 | 19 |
| Partially Fixed | 3 | 1 | 4 |
| Needs Product Decision | 3 | 3 | 6 |
| Enhancement | 2 | 1 | 3 |
| Cannot Verify | 2 | 1 | 3 |
| Not Applicable | 2 | 0 | 2 |
| Still Open | 0 | 0 | 0 |
| **Total** | **58** | **15** | **73** |

“Already Fixed” is the requested row classification; the summary Fixed total includes defects fixed in this batch and prior approved work. “Already Working” means the requested behavior already existed. Row classifications describe current code, with browser acceptance separately deferred.

### Previously completed work retained

- Fix 01 closes CI-owner deactivation gap (Lakshman row 3; old finding F1).
- Fix 02 enforces canonical Action content/evidence authorization (old finding F2, not an extra tracker row).
- Fix 03 resolves post-creation Manual source clarity (Overall row 60, also supports row 59).
- Fix 04 resolves Gemba Action terminology and preserves dialog width (Overall row 11).
- Important Fix 01 allows otherwise-valid Audit completion with open/unassigned linked Actions (Overall row 49). Required Audit responses, evidence, signatures and permissions remain. CI/Visual Improvement dependencies are unchanged.
- Fix 05 retains automatic same-Plant broadcast, source-leader inclusion, Received Deployments, read-only access, revocation, safe links and local notification deduplication. Overall row 8 remains **Partially Fixed — Recipient Access Code Validated; Real Email Pending**.

## B. Implemented changes

### Overall issues — row 54, issue 10

**Exact complaint:** “Before evidence - can be rephrassed as Intial evidence (Gap)”. Original status: blank. No textual remarks.

**Root cause:** creation wording had already become Identification Photo, but completed disposition detail and both Keep/physical report branches still used Before/Before Evidence.

**Before → after:** the initial-image comparison label is now **Initial Evidence (Gap)**, from one shared display constant. The report contains one initial evidence source per branch, and the physical disposition completion evidence remains After Evidence. Identification Photo remains the capture-field label. Action report terminology is outside this Red Tag complaint and unchanged.

**Files:** `features/five-s/red-tag/types.ts`, `red-tag-module.tsx`, `red-tag-report-page.tsx`; `tests/red-tag-before-after-evidence.characterization.test.ts`; new `tests/tracker-closure-red-tag-evidence.test.ts`.

**Regression coverage:** real server rendering of Keep and physical report branches, exactly one initial label, completion-image preservation, explicit missing initial evidence and no mutation of fixture records. Existing closure/evidence/QR tests retained. Stored `imageUrl`, `afterEvidence`, dispositions, links, calculations and lifecycle are unchanged.

**Result:** Fixed in code; browser acceptance deferred.

### Overall issues_Lakshman — row 4, blank issue number

**Exact complaint:** “Mostly in all the fields especially where we seach and chose a person/something, it is better to keep search option for future purposes”. Original status: Open. No textual remarks beyond formula indicator.

**Root cause:** searchable owner/reassignment/Zone Leader controls existed, but other live forms still rendered growing user/entity lists as unsearchable Select controls.

**Before → after:** reused `OpsPersonSelect` for **24 additional controls**: CI create/edit/Gemba-linked owners; Red Tag responsibility/Zone; Plant manager/Plant; VM Board owner/Zone, meeting lead/topic owner/KPI exception owner and start-meeting Board; Manual Action Zone; Gemba Zone; user Plant/Zone; Red Flag and Visual Improvement Plant/Zone and Visual Improvement owner; Audit Zone.

The component now accepts disabled states/options, validation descriptions/focus refs, optional clearing, entity-specific labels and secondary option text. Every form still supplies its original eligible list and writes its original IDs. CI permission/Plant/Zone filters, active-only lists, Audit own-Zone disabled choices, Zone-change owner/member resets, VM Assign to me ordering, and Red Tag invalid-field focus behavior remain.

Small fixed status, priority, category, severity, duration and recurrence controls were not converted. Existing list text searches and participant/attendance search experiences remain. The unused legacy FiveSAuditChecklist hardcoded assignee control was not promoted into the live canonical workflow. This closure covers the concrete current entity-selection usability defect, not a promise of search on every fixed-option control.

**Regression coverage:** selected ID/name retained when search hides its option, case/whitespace search, empty results without clearing, allowed-ID validation, disabled options/form-saving state, No Zone sentinel, validation attributes, canonical CI eligibility and live-form wiring. Existing B1/D/CI/VM/Audit/Red Tag coverage remains. Old inline-selector source assertions were updated to assert the shared selector, same controlled IDs and eligible options; no behavior tests were deleted.

**Result:** Fixed in code; keyboard/browser acceptance deferred. The underlying accessible Select component is retained.

## C. Outstanding product decisions

Efforts below are indicative implementation/testing days after approval; backend foundations are separately scoped.

| Worksheet / row | Missing requirement | Recommended option | Alternative | Architecture impact / effort |
|---|---|---|---|---|
| Overall issues / 21 | Whether Quantity/Estimated Value belong in new V2 capture; requiredness, units/currency, validation and display contract. Workbook is a suggested field list, not a complete approved input contract. | Retain current simplified capture until optional-field contract is approved; preserve legacy values. | Approve optional inputs using existing properties, with defined validation and report treatment. | Existing optional model properties can be reused; no verification stage restoration. 1–2 days after decisions. |
| Overall issues / 31 | Exact information-tooltip wording and severity meaning. | Approve tooltip using existing response-target information only; retain High/Medium/Low. | Approve more detailed severity descriptions separately. | Display-only if existing targets reused; no scoring/SLA changes. 0.5–1 day. |
| Overall issues / 47 | Remove Action Title, derive it, or retain it? | Retain required title. | Define deterministic derived title and compatibility/validation rules. | Shared creation, list/search/report/source contracts affected. 1–3 days if changed. |
| Overall issues / 53 | Authenticated vs guest QR access, data disclosure and cross-device record availability. | Retain authenticated access and approve shared backend scope before promising phone-to-record access. | Limited read-only public QR projection after explicit disclosure policy. | Authentication/server authorization/shared persistence needed; separately estimate foundations, then 2–4 days for QR integration. |
| Overall issues / 55 | Exact Red Tag/Action ID, Manoj reviewer assignment, actor role/Plant/Zone and intended authority. | Supply fixture and validate current configured authority; retain existing restrictions. | Explicitly approve a scoped reviewer-role change if current policy is unsuitable. | No blanket permission grant. 0.5–1 day investigation; implementation estimate depends on confirmed policy. |
| Overall issues_Lakshman / 22 | Which report evidence should be hidden and whether exclusion applies to screen, print or export. | Retain evidence and approve an explicit visibility/export policy. | Optional evidence-free report variant after approval. | Preserve binary/source data and report integrity. 0.5–2 days. |
| Overall issues_Lakshman / 24 | Education / Training removal and historical record/configuration handling. | Preserve historical category; approve whether to hide it from new selection. | Retain category, or explicitly migrate historical values. | Shared category configuration and completion validation affected; no silent migration. 0.5–1.5 days. |
| Overall issues_Lakshman / 25 | Dedicated Action Impact/Benefit field: optional/required, length, edit authority, lifecycle validation, report/history/backward compatibility. | Specify an optional standalone field preserving existing notes; do not reuse CI expectedBenefit. | Keep existing Action Taken notes without a new field. | Canonical Action data/commands/UI/reports need deliberate approved change. 1–3 days. |
| Overall issues_Lakshman / 28 | Own-Zone Red Tag creation prohibition, applicable roles/exceptions and cross-Zone scope. | Retain configured permissions until exact restriction is approved. | Explicit scoped own-Zone prohibition with Admin/exception policy. | Canonical creation checks and UI must agree; existing records retained. 1–2 days. |

### Enhancements, not implemented

- **Overall issues / 10:** VM recording. Needs audio/video choice, storage/retention, privacy and access decisions. Recommend separate scope; alternatives are linked external recordings or native capture. Infrastructure/file impact; estimate after format/retention decision (roughly 3–5 days with an established storage backend).
- **Overall issues / 52:** multiple initial Red Tag photos. Recommend explicit model/UX approval, with legacy single-image compatibility; alternative retain one identification photo plus multiple completion photos. Affects source creation, evidence model, detail/report/print/QR views. Roughly 2–4 days after approval.
- **Overall issues_Lakshman / 26:** savings layout next to Impact/Benefit depends on row 25. Recommend decide field first; alternative retain existing layout. Display/layout work roughly 0.5 day after field exists.

### Cannot Verify references required

- **Overall issues / 14:** provide the agreed Manoj-app report reference/template and required parity list. Existing report is functional; exact parity cannot be inferred.
- **Overall issues / 15:** provide the exact title/screen showing “d”. A compact CI age helper is not sufficient evidence for the Gemba-labelled complaint.
- **Overall issues_Lakshman / 31:** identify the exact report/screenshot containing “IQ”; current Red Tag report has no such label.

## D. Infrastructure dependencies and boundaries

**Overall issues / 8:** real Horizontal Deployment email remains absent. Approve provider, send events/audience, content, authenticated destination, failure/retry/idempotency and delivery-history requirements in a separate infrastructure phase. In-app notifications are browser-local and are not email or cross-device delivery.

**Overall issues / 53 and QR-related rows 22/Lakshman 32:** reliable scans from a different browser/device require shared record/evidence persistence and server authentication/authorization. QR generation/routing itself is working; no guest access or backend was added.

Shared backend/cross-device persistence remains an architectural limitation, not 73 separate defects. No other confirmed infrastructure blocker is asserted from the tracker. VM recording and plural initial photos may need storage decisions if later approved. Hardware camera compatibility and real print/download behavior remain acceptance work, not evidence of an implemented email transport.

## E. Validation

Starting baseline confirmed: **837 passing tests across 92 files**. Added **11 tests across two new files** (8 searchable-selector tests and 3 rendered-evidence tests). Existing source characterizations were updated for approved shared labels/selectors without removing lifecycle, evidence, permission or relationship coverage.

| Check | Final result |
|---|---|
| Focused closure + Fix 01–05 + Audit closure regressions | 174 passed across 13 files; final full suite also includes these tests |
| Full `npm test` | **848 passed across 94 files; zero failures** |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed: zero errors, 14 existing warnings; no new warnings |
| `npx next build --webpack` | Passed; optimized production build and page generation completed |
| `git diff --check` | Passed |
| Browser acceptance | Not run, explicitly deferred |

The first full-suite pass exposed stale inline-selector source assertions in VM; these were migrated to the shared selector's controlled value/options. Behavioral permission/lifecycle tests were retained. The final full-suite count above is the successful rerun. Eligible-result counts exclude disabled options.

No browser automation, Playwright, screenshots, browser fixtures, persistent demo records or normal demo-data changes. Browser acceptance remains deferred to the consolidated final run. No commit, push, reset, clean, stash or discard.

## F. Full row-by-row reconciliation

Each original complaint occurs exactly once below. Source paths and test references are relative to repository root; named tests are `tests/<name>.test.ts`. Passing tests include behavioral, server-render and source-characterization coverage. Source assertions do not establish browser/device acceptance. Historical browser observations were not rerun or used to claim fresh verification.

| Worksheet | Excel row | Original issue | Exact complaint | Original status | Original remarks / auxiliary note | Historical classification | Current classification | Current finding / source and test evidence |
|---|---:|---|---|---|---|---|---|---|
| Overall issues | 2 | 1 | Rename Zone A- Office, Zone B- Production, Zone C- Warehouse Zone D- Utility | Closed | OK | Already Working | Already Working | Canonical Zone labels map to Office/Production/Warehouse/Utility. Source: features/gemba/gemba-zone-labels.ts. Test: gemba-phase1.characterization. |
| Overall issues | 3 | 2 | Option to add outside zone members who joins the walk. It should be trigger from employee db in the settings. | Closed | Multiple selection feature to be added | Already Working | Already Working | Active directory participants support multiple outside-Zone selections and home-Zone context. Source: features/gemba/gemba-new-page.tsx. Test: gemba-phase1.characterization. |
| Overall issues | 4 | 3 | It is good to have scheduling process before start an Gemba & Audit | Closed | OK | Already Working | Already Working | Gemba scheduling and Audit Scheduled/Start Now flows exist. Source: features/gemba/gemba-store.ts; lib/five-s/audit-store.ts. Test: audit-scheduling.characterization. |
| Overall issues | 5 | 4 | In Progress audit could not able to edit | Closed | Ok | Already Working | Already Working | Authorized in-progress observation edits remain available; completed records remain protected. Original tracker module says Gemba although complaint says audit. Source: features/gemba/gemba-store.ts; lib/five-s/audit-store.ts. Test: batch-b21-module-permissions. |
| Overall issues | 6 | 5 | Gallery- not capturing live photo | Closed | Ok | Fixed | Already Fixed | Live capture and upload are separate; shared component releases camera streams. Hardware acceptance is deferred. Source: components/ops/ops-camera-capture.tsx. Test: evidence-capture-consistency.characterization. |
| Overall issues | 7 | 6 | Image preview not available | Open | Preview photo should have zoom in/out option | Fixed | Already Fixed | Stored-image resolver and shared zoom viewer support photo previews. Source: features/gemba/gemba-components.tsx. Test: batch-a-evidence-zoom. |
| Overall issues | 8 | 7 | A Checkbox option to be introduced. 'Deployment Opportunity at other Zones'. If they enable the check box, email trigger to be sent to all zone leaders for Horizontal Deployment' | Open | Shared horizontal deployment is not available in respective zone bucket | Partially Fixed | Partially Fixed | Fix 05: same-Plant broadcast including source leader, Received Deployments, read-only projection, current-leader revocation and durable local notifications. Real email absent. Partially Fixed — Recipient Access Code Validated; Real Email Pending. Source: features/gemba/gemba-deployment.ts; features/gemba/gemba-access.ts; features/gemba/shared-observation-page.tsx. Test: fix05-horizontal-deployment. |
| Overall issues | 9 | 8 | Preview shall be having more information including images and description of actions | Open | Remains same, missing all information | Fixed | Already Fixed | Ordinary authorized observation preview contains evidence and linked canonical Action details. Recipient-only deployment preview intentionally excludes restricted linked details. Source: features/gemba/gemba-components.tsx. Test: batch-a-functional-fixes. |
| Overall issues | 10 | 9 | Dude, recording options to be available in the VM module as well | Open | None | Enhancement / Batch E | Enhancement | VM voice/video recording is not implemented; new recording/retention/access behavior is an enhancement. Source: features/visual-management/types.ts. Test: visual-management.characterization. |
| Overall issues | 11 | 10 | Popup screen's looks so compact, could be wider | Closed | Rename 'Corrective action to Action' | Partially Fixed | Already Fixed | Fix 04: preview, linked record and report use Action; wide dialog remains. The separate Corrective Action Needed? decision prompt is intentional row 28 wording. Source: features/gemba/gemba-components.tsx; features/gemba/gemba-report-page.tsx. Test: fix04-gemba-action-terminology. |
| Overall issues | 12 | 11 | When we create an action plan for opportunity, the priority should be hidden and default low due date can be considered | Closed | None | Already Working | Already Working | Opportunity follow-up hides/defaults priority Low using existing due-date configuration. Source: features/actions/create-linked-action-dialog.tsx. Test: priority-severity-standardization.characterization. |
| Overall issues | 13 | 12 | After action plan created, when we view the created action, no details and showing 'why no action' free text. | Closed | None | Fixed | Already Fixed | Canonical linked Action details take precedence over legacy no-Action text. Source: features/gemba/gemba-components.tsx. Test: batch-a-functional-fixes. |
| Overall issues | 14 | 13 | Report, details to be similar like we have it 5S manoj app, including images etc | Open | None | Cannot Verify | Cannot Verify | Gemba report includes observations, photos and linked Action context; the separate Manoj app reference needed to establish exact parity is unavailable. Source: features/gemba/gemba-report-page.tsx. Test: gemba-report-feedback13.characterization. |
| Overall issues | 15 | 14 | Remove 'd', in the title add 'days' | Open | None | Cannot Verify | Cannot Verify | The exact title is unidentified. CI has a compact age helper using d, but the complaint is recorded under Gemba; that does not establish the intended target. Source: features/five-s/continuous-improvement/components.tsx. Test: gemba-report-feedback13.characterization. |
| Overall issues | 16 | 15 | Live Photo option to be added | Closed | None | Fixed | Already Fixed | Same live camera correction as row 6; separate upload retained. Source: components/ops/ops-camera-capture.tsx. Test: system-wide-ux-camera.characterization. |
| Overall issues | 17 | 16 | We have to revisit the Red tag workflow since that was made for Manoj as per his wish | Closed | None | Fixed | Already Fixed | Approved V2 review/decision/disposition/Keep lifecycle remains active. Source: features/five-s/red-tag/store.ts. Test: red-tag-simplification.characterization. |
| Overall issues | 18 | 17 | Also, one important thing what we should consider is, we have to provide cross link the module between each other. That would be great and avoid duplication. For example Gemba and Red Tag. During Gemba, if we identified Item level issue, there should be an option to raise it as Red tag. | Closed | None | Already Working | Already Working | Gemba observation can create/link one Red Tag with explicit source identity and duplicate protection. Source: features/gemba/components/create-red-tag-dialog.tsx. Test: gemba-red-tag-phase5a.characterization. |
| Overall issues | 19 | 18 | Gemba Finding<br>↓<br>“Unnecessary material identified”<br>↓<br>Create Red Tag<br>↓<br>Red Tag Evaluation<br>↓<br>Disposition<br>↓<br>Action if required<br>↓<br>Verification / Closure | Closed | None | Not Applicable | Not Applicable | Core path exists; separate verification step is superseded by the approved simplified Red Tag lifecycle. Source: features/five-s/red-tag/types.ts. Test: red-tag-simplification.characterization. |
| Overall issues | 20 | 19 | Difference between Red tag and Action plan is, Red tag is specific to item and before we make a changes we should evaluate /review it. | Closed | None | Already Working | Already Working | Physical item review/decision precedes disposition; canonical Action is optional execution. Source: features/five-s/red-tag/store.ts. Test: red-tag-v2-disposition-closure.characterization. |
| Overall issues | 21 | 20 | What we can consider while capturing<br><br>When someone creates a Red Tag, the app could capture:<br><br>*Red Tag Details*<br><br>Tag ID — e.g. RT-2026-00125<br>Photo<br>Item name/description<br>Quantity<br>Location<br>Department<br>Date identified<br>Identified by<br>Reason for tagging<br>Estimated value, if relevant<br>Category<br><br>*Review*<br><br>Reviewer<br>Review date<br>Decision<br>Comments<br><br>*Disposition*<br><br>Disposition type<br>Responsible person<br>Target date<br>Actual completion date<br>Evidence/photo<br>Approval, where required<br><br>*Closure*<br>Verification<br>Closure date<br>Closed by<br>Before/after evidence<br><br>@Suresh feel free to add your comments | Closed | None | Partially Fixed | Partially Fixed | Core identification/review/disposition/closure data exists. Quantity/estimatedValue remain readable legacy fields, but new V2 capture omits them. No approved input/validation contract; separate verification remains superseded. Source: features/five-s/red-tag/types.ts; features/five-s/red-tag/red-tag-module.tsx. Test: red-tag-v2-create-review-decision.characterization. |
| Overall issues | 22 | 21 | *QR-based Red Tag identification.*<br>Physical item → QR code → Scan → Digital Red Tag record → Status / decision / history. | Closed | None | Already Working | Already Working | Stable record ID QR and canonical detail/print route exist; physical cross-device scan is not certified. Source: features/five-s/red-tag/red-tag-module.tsx. Test: red-tag-v2-qr-print.characterization. |
| Overall issues | 23 | 22 | Simalar there is should be an link betwen Gemba and Continous improvement | Closed | None | Already Working | Already Working | Gemba Opportunity links to CI and retains reverse source relationship. Source: features/gemba/components/create-ci-from-observation-dialog.tsx. Test: gemba-ci-phase5b.characterization. |
| Overall issues | 24 | 23 | When we select Opportunity (Gemba), CI link to should be there similarly when they select issues (Gemba), Red tag link should be there. | Closed | None | Already Working | Already Working | Opportunity/Issue branching exposes applicable CI/Red Tag creation and duplicate guards. Source: features/gemba/gemba-walk-page.tsx. Test: gemba-ci-phase5b.characterization. |
| Overall issues | 25 | 24 | Full Screen Missing | Closed | None | Already Working | Already Working | Gemba fullscreen controls and evidence viewer layout remain present. Source: features/gemba/gemba-walk-page.tsx. Test: gemba-evidence-ux.characterization. |
| Overall issues | 26 | 25 | No change in the due dates proposed for severity - Critical & High; due dates are changing for Medium & Low; Can we have only 3 classifications - High medium Low | Open | None | Already Working | Already Working | High/Medium/Low active priorities preserved; legacy Critical excluded. Existing SLA/date meanings unchanged. Source: lib/five-s/configuration.ts. Test: priority-severity-standardization.characterization. |
| Overall issues | 27 | 26 | Create action from Red tag, no field to define action | Closed | None | Already Working | Already Working | Red Tag uses canonical linked Action title/description/owner form. Source: features/actions/create-linked-action-dialog.tsx. Test: red-tag-v2-disposition-closure.characterization. |
| Overall issues | 28 | 27 | Under Corrective action, rename as 'Corrective Action Needed' | Open | None | Already Working | Already Working | Matching Gemba decision prompt remains Corrective Action Needed? with Yes/No; tracker module naming is inconsistent. Source: features/gemba/gemba-walk-page.tsx. Test: gemba-corrective-action-needed.characterization. |
| Overall issues | 29 | 28 | View action -> Actual due date can be displayed; Currently both due date and Attention shows "due tomorrow" | Open | None | Fixed | Already Fixed | Actual due date and relative attention are separate displays. Source: features/five-s/action-detail-page.tsx. Test: batch-a-functional-fixes. |
| Overall issues | 30 | 29 | when you click open actions, overdue, critical, awaiting review, the respective actions are not getting listed below - shows "no overdue actions for all | Closed | None | Fixed | Already Fixed | Action KPI drill-downs use canonical scoped status/date filters. Source: features/actions/action-center-data.ts. Test: batch-b-kpi-drilldown.characterization. |
| Overall issues | 31 | 30 | Can we have only 3 severity - High medium low and eye bubble with explaination; even chatgpt recommends only 3 classifications | Open | None | Partially Fixed | Partially Fixed | Exactly High/Medium/Low are selectable; response-target helper exists. Workbook provides no explanatory tooltip wording or severity definitions. Source: features/red-flag/red-flag-new-page.tsx. Test: priority-severity-standardization.characterization. |
| Overall issues | 32 | 31 | Why owner refers same name by default; Both proposed by owner name is same; is it supposed to change as per Zone which is not happening | Open | None | Fixed | Already Fixed | Owner options are canonical active ci.implement users scoped to Plant/Zone; creator and owner are distinct. Search now reuses the same options. Source: features/five-s/continuous-improvement/owner.ts. Test: continuous-improvement-owner.characterization. |
| Overall issues | 33 | 32 | As earlier referred, even we press camera, it is directing to Gallery; We can make it uniform like Take photo or Camera throughout the application | Open | None | Fixed | Already Fixed | CI evidence picker uses shared live capture plus separate Upload Photo. Source: features/five-s/continuous-improvement/components.tsx. Test: evidence-capture-consistency.characterization. |
| Overall issues | 34 | 33 | Can we mandate before & after Photo for closed Red tag cases; | Open | None | Fixed | Already Fixed | Non-Keep closure still requires initial/completion photos and completion checks. Approved Keep exception retained; this batch changes labels only. Source: features/five-s/red-tag/store.ts. Test: red-tag-before-after-evidence.characterization. |
| Overall issues | 35 | 34 | Camera button directs to Gallery in Audit Module | Open | None | Fixed | Already Fixed | Audit uses shared live capture and separate upload. Hardware/browser verification remains deferred in this batch. Source: features/five-s/components/FiveSAuditExecution.tsx. Test: evidence-capture-consistency.characterization. |
| Overall issues | 36 | 35 | Reg Tag & Red Flag two modules. Keep it Red Flag | Open | None | Not Applicable | Not Applicable | Merge request is superseded by approved independent Red Tag/Red Flag modules. Source: lib/modules.ts. Test: red-tag-module-promotion.characterization. |
| Overall issues | 37 | 36 | We can establish connect in continual improvement module which can be related to Gemba/Red Tag/Audit module S.No. (Optional)  | Open | None | Fixed | Already Fixed | Optional CI operational links to Gemba/Red Tag/Audit exist with duplicate protection. Source: features/five-s/continuous-improvement/related-operational-records.tsx. Test: batch-c-ci-operational-relationships.characterization. |
| Overall issues | 38 | 37 | Continuous improvement – Title can be change it to “Continual Improvement” as per the standards term. @Lakshman, your comments | Open | None | Fixed | Already Fixed | Visible module wording is Continual Improvement; internal identifiers remain compatible. Source: lib/modules.ts. Test: continual-improvement-terminology-completion.characterization. |
| Overall issues | 39 | 38 | If we press Proposal, under review, in-progress status in the dashboard, can it list the contents below for immediate reference | Open | None | Fixed | Already Fixed | Grouped Proposals label and predicates include Draft/Submitted consistently. Source: features/five-s/continuous-improvement/landing-page.tsx. Test: batch-a-final-stabilization. |
| Overall issues | 40 | 39 | If we click in open, overdue, button in the dashboard, can it list the action items for immediate reference | Open | None | Fixed | Already Fixed | Global scoped Action drill-downs preserve Plant/Zone and correct result predicates. Source: features/ops-dashboard/ops-dashboard-page.tsx. Test: batch-c-data-consistency. |
| Overall issues | 41 | 40 | In continous improvement report, instead of capturing estimated days, actual completion date can be captured | Open | None | Fixed | Already Fixed | Report uses real Actual Completion Date, with explicit missing-date fallback. Source: features/five-s/continuous-improvement/report-page.tsx. Test: five-s-reports-integrity.characterization. |
| Overall issues | 45 | 1 | Audit module front page -  "Timing" title to be changed as date | Blank | None | Fixed | Already Fixed | Audit front-page column is Date. Source: features/five-s/components/FiveSAuditList.tsx. Test: batch-d-usability. |
| Overall issues | 46 | 2 | Any controls exist to resist deletion of records - access rights; I could just like that deleter records | Blank | None | Fixed | Already Fixed | Deletion requires active authorized actor, confirmation, Draft/Scheduled and no linked Actions. Source: lib/five-s/audit-store.ts. Test: batch-b2-governance. |
| Overall issues | 47 | 3 | Do we really need action title; Just action description should be enough ringh. @Lakshman - Please comment | Blank | None | Needs Product Decision | Needs Product Decision | Title remains required by canonical creation and source relationships. No approved replacement contract. Source: features/actions/create-linked-action-dialog.tsx. Test: action-integration-hardening. |
| Overall issues | 48 | 4 | In the action window, comment - can we just say action mandatory instead of corrective action mandagtory | Blank | None | Fixed | Already Fixed | Audit mandatory warning uses Action wording and retains its trigger. Source: features/five-s/components/FiveSAuditExecution.tsx. Test: batch-d-usability. |
| Overall issues | 49 | 5 | Looks like i will not be able to complete the audit unless the actions are assigned for hte reported findings  | Blank | None | Not Applicable | Already Fixed | Important Fix 01 supersedes old classification: otherwise valid Audit can complete while linked Actions remain unassigned/open. Required responses/evidence/signatures and authorization remain. CI/VI dependencies unchanged. Source: lib/five-s/audit-store.ts. Test: audit-independent-action-closure. |
| Overall issues | 50 | 6 | Can we have the category as "arrangement" instead of organisation | Blank | None | Fixed | Already Fixed | Stored Organization reason category displays Arrangement. Source: features/five-s/red-tag/types.ts. Test: batch-d-usability. |
| Overall issues | 51 | 7 | Instead of mentioning capturing before image, can we make it capure the image | Blank | None | Fixed | Already Fixed | Creation field is Identification Photo with neutral capture wording. Source: features/five-s/red-tag/red-tag-module.tsx. Test: batch-d-usability. |
| Overall issues | 52 | 8 | Able to save only one picture - either upload / camera; onely one Phot0 | Blank | None | Enhancement / Batch E | Enhancement | Initial imageUrl is singular; completion evidence can be plural. Multiple initial photos require approved model/UX changes. Source: features/five-s/red-tag/types.ts. Test: red-tag-before-after-evidence.characterization. |
| Overall issues | 53 | 9 | Review stage, when QR code scanned in mobile, asking for user name & password | Blank | None | Needs Product Decision | Needs Product Decision | QR uses authenticated application route and browser-local data. No guest/public cross-device contract or shared persistence. Source: features/five-s/red-tag/red-tag-module.tsx. Test: red-tag-v2-qr-print.characterization. |
| Overall issues | 54 | 10 | Before evidence - can be rephrassed as Intial evidence (Gap) | Blank | None | Partially Fixed | Already Fixed | This batch: shared Initial Evidence (Gap) label in both report branches and closed disposition detail. Completion label/data unchanged. Source: features/five-s/red-tag/red-tag-report-page.tsx; features/five-s/red-tag/red-tag-module.tsx. Test: tracker-closure-red-tag-evidence. |
| Overall issues | 55 | 11 | Logged in Manoj Guru ID to review & decide the action, but not able to make any changes | Blank | None | Needs Product Decision | Needs Product Decision | Existing active scoped management/reviewer checks remain. Original record/reviewer assignment is unspecified; a named actor alone does not establish a permission defect. Source: features/five-s/red-tag/access.ts. Test: batch-b21-module-permissions. |
| Overall issues | 56 | 12 | Before evidence - can be re-worded as initial evidence | Blank | None | Fixed | Already Fixed | Action execution uses Observation Evidence, consistent with later row 59. Action report Before/After comparison is intentionally outside Red Tag row 54. Source: features/five-s/action-detail-page.tsx. Test: batch-d-usability. |
| Overall issues | 57 | 13 | Create Action -> Are we going to have this action module as a re-usable component for other modules, if yes, this looks like so specific to 5S only; @Lakshman - can you comment;  | Blank | None | Already Working | Already Working | Shared canonical Action creation/store/routes serve all five source integrations. Source: features/actions/create-linked-action-dialog.tsx; lib/actions/action-store.ts. Test: action-integration-hardening. |
| Overall issues | 58 | 14 | Same screen shot -> Do we need the description below the create Manual action -> "Create Manual action that did not originate from the another OPS module. This source will be recorded as Manual"  | Blank | None | Fixed | Already Fixed | Create Action title and concise helper replace the earlier verbose Manual explanation. Source: features/actions/action-center-page.tsx. Test: batch-d-usability. |
| Overall issues | 59 | 15 | Inteand of saying Before evidence, we can say observation evidence; Also what do we mean by Source (Manual)  | Blank | None | Fixed | Already Fixed | Manual creation uses Observation Evidence and Manual · Created in Actions without changing provenance. Source: features/actions/action-center-page.tsx. Test: fix03-manual-source-label. |
| Overall issues | 60 | 16 | After Action creation, the screen shows, source - Manual (Not able to understand) | Blank | None | Still Open | Already Fixed | Fix 03: post-creation Manual source labels explain Created in Actions; stored source remains manual. Source: lib/actions/action-config.ts. Test: fix03-manual-source-label. |
| Overall issues | 61 | 17 | Not able to understand from the dashboard -> Proposed and proposed in the pipeline row | Blank | None | Fixed | Already Fixed | Proposals grouped label/filter restored consistently across dashboard/list. Source: features/five-s/continuous-improvement/landing-page.tsx. Test: batch-a-final-stabilization. |
| Overall issues | 62 | 18 | If we click the CI dashboard status, when approved button is clicked, not able to see the approved improvements;  | Blank | None | Fixed | Already Fixed | Approved status count and result filter agree. Source: features/five-s/continuous-improvement/landing-page.tsx. Test: batch-a-functional-fixes. |
| Overall issues_Lakshman | 2 | 1 | The user screen could be bigger/ seperate screen could be fine | Open | #VALUE! | Already Working | Already Working | Dedicated Users page and wider user dialog remain. Source: features/five-s/administration/users-page.tsx. Test: settings-administration.characterization. |
| Overall issues_Lakshman | 3 | Blank | There is no options to delete a users and shift the outstanding actions to another person | Open | #VALUE! | Partially Fixed | Already Fixed | Fix 01: nonterminal CI ownership and canonical Actions block deactivation until transferred. Transfer preserves IDs/history; soft deactivation is intentional. Source: features/five-s/administration/store.ts. Test: fix01-ci-deactivation. |
| Overall issues_Lakshman | 4 | Blank | Mostly in all the fields especially where we seach and chose a person/something, it is better to keep search option for future purposes | Open | #VALUE! | Partially Fixed | Already Fixed | This batch: 24 additional searchable live entity form selectors, retaining original option calculations, IDs, disabled options and callbacks. Existing list text searches and small fixed controls retained. Source: components/ops/ops-person-select.tsx. Test: tracker-closure-searchable-select. |
| Overall issues_Lakshman | 21 | Blank | Start with Audit details | Open | #VALUE! | Already Working | Already Working | Audit report begins with Audit metadata. Source: features/five-s/components/FiveSAuditReport.tsx. Test: audit-template.characterization. |
| Overall issues_Lakshman | 22 | Blank | Remove Evidence in the report | Open | #VALUE! | Needs Product Decision | Needs Product Decision | Evidence retained under explicit preservation requirements; removing it needs an export/visibility decision. Source: features/five-s/components/FiveSAuditReport.tsx. Test: batch-c-report-rendering. |
| Overall issues_Lakshman | 23 | Blank | Action plan to be reassign to another member during his absence, also, Zone leader can close the action on behalf of Zone member | Open | No Image | Fixed | Already Fixed | Canonical reassignment and eligible Zone Leader delegated review/closure remain, after owner submission/readiness; self/cross-Zone/inactive review and Audit reviewer restrictions preserved. Source: lib/actions/action-store.ts. Test: batch-b2-final-hardening. |
| Overall issues_Lakshman | 24 | Blank | Corrective Action Category- Education/ & Training (Remove this option from the list) | Open | No Image | Needs Product Decision | Needs Product Decision | Education / Training remains configured; removal and historical-category behavior are undefined. Source: lib/five-s/configuration.ts. Test: action-configuration.characterization. |
| Overall issues_Lakshman | 25 | Blank | 1. Rename- Corrective action taken<br>2. New field= After Corrective Action Category, 'Impact/Benefit of Correction Action' - Free text | Open | #VALUE! | Partially Fixed | Partially Fixed | Action Taken / Responsible Notes label is implemented. Canonical Action model has no dedicated Impact/Benefit field; CI expectedBenefit is a separate entity and cannot be repurposed. Source: features/five-s/action-detail-page.tsx; features/five-s/types/my-actions.ts. Test: batch-d-usability. |
| Overall issues_Lakshman | 26 | Blank | Move the cost saving field next to the Impact/Benefit CA' (New Field) | Open | #VALUE! | Enhancement / Batch E | Enhancement | Savings relocation depends on undecided Impact/Benefit field. Existing saving validations/calculations retained. Source: features/five-s/action-detail-page.tsx. Test: action-step-persistence-assignment.characterization. |
| Overall issues_Lakshman | 27 | Blank | Upload Photo option is missing | Open | #VALUE! | Fixed | Already Fixed | Action photo/document upload and persisted binary content are supported. Legacy missing binary content may need re-upload; real download acceptance deferred. Source: features/five-s/action-detail-page.tsx. Test: batch-c-evidence-lifecycle. |
| Overall issues_Lakshman | 28 | Blank | Own Zone leader/Member should not have an access to raise the red tag. | Open | #VALUE! | Needs Product Decision | Needs Product Decision | Existing create permission/Plant checks preserved; own-Zone prohibition has not been approved. Source: features/five-s/red-tag/access.ts. Test: batch-b21-module-permissions. |
| Overall issues_Lakshman | 29 | Blank | Red Tag Action plan should similar like 5S action plan. It should goes to Zone leader, then he has to assign to the member. Same concept. In simple way, action plan to be common for both Audit & Red Tag | Open | No Image | Already Working | Already Working | Audit and Red Tag share canonical Action assignment and source navigation. Source: lib/actions/action-store.ts. Test: action-integration-hardening. |
| Overall issues_Lakshman | 30 | Blank | In an action plan, Target date can be changed by Zone leader during assigning an member | Open | No Image | Fixed | Already Fixed | Scoped authorized due-date changes require reason/date validation; generic updater cannot bypass controls and priority preserves override. Source: lib/actions/action-store.ts. Test: batch-b2-final-hardening. |
| Overall issues_Lakshman | 31 | Blank | Remove IQ in the report | Open | #VALUE! | Cannot Verify | Cannot Verify | No IQ label found in current Red Tag report. Exact old screenshot/target unavailable. Source: features/five-s/red-tag/red-tag-report-page.tsx. Test: red-tag-v2-qr-print.characterization. |
| Overall issues_Lakshman | 32 | Blank | QR Code generation, As discussed | Open | #VALUE! | Already Working | Already Working | Stable QR generation and canonical record links remain; duplicate requirement of Overall row 22. Source: features/five-s/red-tag/red-tag-module.tsx. Test: red-tag-v2-qr-print.characterization. |

## G. Files changed in this batch

These are batch-local edits layered on existing uncommitted work; they are not the entire repository diff.

- `components/ops/ops-person-select.tsx`
- `docs/02_Engineering/OPS-Final-Tracker-Closure-Report.md`
- `features/actions/action-center-page.tsx`
- `features/five-s/administration/users-page.tsx`
- `features/five-s/components/FiveSAuditCreate.tsx`
- `features/five-s/continuous-improvement/edit-page.tsx`
- `features/five-s/continuous-improvement/new-page.tsx`
- `features/five-s/red-tag/red-tag-module.tsx`
- `features/five-s/red-tag/red-tag-report-page.tsx`
- `features/five-s/red-tag/types.ts`
- `features/gemba/components/create-ci-from-observation-dialog.tsx`
- `features/gemba/gemba-new-page.tsx`
- `features/red-flag/red-flag-new-page.tsx`
- `features/settings/organization-settings-pages.tsx`
- `features/settings/visual-management-settings-pages.tsx`
- `features/visual-improvement/visual-improvement-new-page.tsx`
- `features/visual-management/daily-management-meeting-workspace.tsx`
- `features/visual-management/meeting-mode-page.tsx`
- `features/visual-management/visual-management-components.tsx`
- `tests/red-tag-before-after-evidence.characterization.test.ts`
- `tests/tracker-closure-red-tag-evidence.test.ts`
- `tests/tracker-closure-searchable-select.test.ts`
- `tests/visual-management-daily-v1.test.ts`

## H. Next step

Review the nine explicit decision items and obtain references for the three Cannot Verify entries. Keep email/backend-dependent claims out of acceptance scope until separately implemented. Then prepare a consolidated acceptance matrix for existing approved workflows, including keyboard search selection, Red Tag initial/completion evidence, Fix 01–05 permissions/relationships, Audit closure with open Actions, deployment recipient replacement/revocation and browser reload. No new feature batch was started.
