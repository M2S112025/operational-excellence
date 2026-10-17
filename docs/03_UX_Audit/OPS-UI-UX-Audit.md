# OPS — UI/UX Audit

Date: 17 October 2026 · Repository: `/Users/rumesh-9634/Projects/Ops` · Mode: **audit only** (no production code, tests, data, commits or git state changed; only the four documents in this folder were created).

## 0. Method and evidence legend

| Tag | Meaning |
|---|---|
| **Browser-observed** | Seen in the in-app browser against the already-running dev server (`localhost:3000`), signed in with the local demo account, at 1440 px and 375 px. Pages were only *viewed* (navigation + screenshots); no form was submitted and no record created or changed. No console errors were seen. |
| **Code-inferred** | Traced from source. Not visually verified. |
| **Estimate** | Interaction counts are code-traced estimates; none of the multi-step journeys was executed (to avoid mutating demo data). |

Baseline read first: `AGENTS.md`/`CLAUDE.md`, `OPS-Current-State-Reconciliation.md`, `OPS-Red-Tag-Replacement-Report.md`, plus routes, `components/ui`, `components/ops`, `components/layout`, `components/navigation`, `lib/modules.ts`, `lib/navigation.ts`.

Not covered: physical camera/scan/print, PDF visual QA, every role/permission permutation, tablet-size screenshots (tablet findings are from class names), Super Admin screens (not opened in browser).

Constraint honoured throughout: the active Red Tag workflow is the restored 5S plan → member execution → leader review/rework workflow. Nothing below changes lifecycle, permissions, fields, statuses or the canonical Action store.

---

## 1. Executive summary

**Overall maturity: 3 / 5 — "solid foundation, uneven finish".** There is a real shared shell (`AppShell`, `PageContainer`, `FiveSPageHeader`, `OpsTabBar`, `OpsPersonSelect`, `OpsCameraCapture`, `CreateLinkedActionDialog`) and the sidebar, header, module landing pages and typography look broadly coherent in the browser. Entitlement-aware navigation is good, the canonical Action architecture is respected, mobile layouts mostly degrade sensibly, and there were no console errors. The weaknesses are not in the shell; they are in the **seams**:

1. **Return paths and context** are the biggest gap. Source → Action works; Action → source works; coming *back* does not (Action Back is hard-wired to `/actions`; filters are in React state, not the URL; `LinkedRecords` exists but nothing renders it).
2. **"What needs my attention?"** is answered well on only one screen (dashboard "Needs Attention"), which is below the fold, role-blind, and omits Red Tag. Module landing pages mostly show counts that are not links.
3. **Legacy/duplicate surfaces** leak: `/5s/*` is a *live duplicate* route family, `/red-flag` is a redirect to Red Tag while dashboard tiles and resolvers still point at it, three Users routes, two Module Access pages, dead Super Admin tabs, a dead global search bar, and stale "Item Disposition" wording on the Red Tag module.
4. **Primitive drift:** 18 files hand-roll `<table>` vs 5 using `ui/table`; native date inputs in 16 files; 88 raw `<button>` in 35 files; ~384 arbitrary `text-[..px]` sizes (≈305 at 10–11 px); three tab implementations; four access-denied variants; three error/validation message styles; three photo-capture UIs.
5. **Long-form entry cost** is concentrated in three places: Visual Management meeting mode (~31+ interactions, lost on exit), Audit execution non-compliance Actions (8–12 per finding), and the Red Tag member submit handoff (double "Submit for Review").

**Nothing in this audit requires changing an approved workflow.** Every recommendation is presentation, navigation, defaults taken from existing context/config, or surfacing existing data.

### Severity totals

| P0 | P1 | P2 | P3 |
|---|---|---|---|
| 0 | 12 | 33 | 7 |

No P0: no blocker was found that stops a role completing its core journey. Items I considered closest to P0 are G-09 (dead Action→Red Flag link) and GM-01 (CI-link failure hidden by navigation) — both rated P1 pending confirmation.

---

## 2. Findings register

Format: **ID · Sev · Screen** — Current → Problem/impact → Proposal → Saving · Shared component · Effort · Risk · Evidence.
Effort S ≤ 0.5 day, M 1–3 days, L > 3 days. Risk = risk to existing workflows.

### 2.1 Global shell, navigation, dashboard, reports

**G-01 · P1 · Header (global)** — `components/navigation/search-bar.tsx` is not imported anywhere (`rg search-bar` → no importers), is uncontrolled, and says "Search 5S…". Header (`header.tsx`) has no search. A user cannot find an Action/Red Tag/Audit by ID globally; "find ACT-123" costs ~3–4 interactions plus guessing the module. → Either delete the dead component or (needs approval, new capability) add a command-style search reading existing stores. Saving ≈2–3 clicks per lookup. Shared: `GlobalSearch`. Effort M (S to delete). Risk low. *Code-inferred.*

**G-02 · P1 · Red Tag module metadata** — `lib/modules.ts:70-82`: description "Evaluate and disposition physical workplace items", `conceptStage: "dispose"`, `stageLabel: "Item Disposition"`. Sidebar subtitle and breadcrumb parent crumb both read "Item Disposition". The restored workflow is plan → execute → review. Module page copy ("Raised items, member execution and Zone Leader review.") contradicts the nav. → Update label text/stage label only (e.g. "Execute"); check tests that assert the old strings. Shared: none. Effort S. Risk low (copy; `ConceptStage` type union may need a value). *Browser-observed + code.*

**G-03 · P2 · Breadcrumbs** — Hidden below `sm` (`header.tsx:14`) so mobile has no location context; the stage/group parent crumb ("Item Disposition >", "Sustain >") has no `href` (dead text); record routes (`/5s/red/create`, `/gemba/new`, `/reports/summary/[type]`, `/visual-management/settings/kpi-configuration`, `/settings/action/*`) fall back to title-cased URL segments; Reports preview pages add their own "Reports / module" eyebrow, duplicating the breadcrumb. → Make parent crumb link to module home; add explicit labels for the unlabeled routes; show a compact back-link on mobile. Effort S. Risk low. *Code-inferred (parent-crumb observed as plain text).*

**G-04 · P1 · Route families** — `/5s/audits`, `/5s/listing`, `/5s/actions(+/[id])`, `/5s/continuous-improvement/*` are **live duplicates** rendering the same components as `/audits`, `/actions`, `/continuous-improvement` (only `/5s` → `/dashboard` redirects). Consequences: (a) `AuditNav` tabs hard-link `/audits`, so a user entering via `/5s/audits` silently changes family on first tab click; (b) `FiveSAuditExecution` navigates to `/5s/audits` and `/5s/audits/{id}/report` after completion while the sidebar points at `/audits`; (c) **there is no `/audits/[id]/report`** — the Audit report is reachable only via the legacy family; (d) `/5s/continuous-improvement` drops `initialTab/initialStage` filters; (e) `/5s/*` layouts gate separately from `ModuleGate`. → Pick `/audits`, `/actions`, `/continuous-improvement` as canonical; add `/audits/[id]/report`; make `/5s/*` thin redirects; update post-completion navigation. Saving: removes a silent context switch; fewer broken deep links. Effort M. Risk **medium** (deep links, tests, bookmarks) — needs the AGENTS.md §42-43 deep-link checklist. *Code-inferred.*

**G-05 · P2 · Dashboard** — One dashboard (compliant: `/5s`→`/dashboard`, `/analytics/dashboards`→`/dashboard?view=performance`). But: "Needs Attention" and "My Work" sit below filter bar, tabs, KPI band and Module Health; "My Work" capped at 4 with no "view all"; same layout for Zone Member and Plant Manager; filters default to All plants/All zones rather than the user's zone; Red Tag (awaiting review, raised-needs-plan) appears nowhere in Needs Attention/Module Health; period filter is not carried into tile hrefs; the lead score tile has no link; role detection is `role.includes("Member")` on a display string. → Move Needs Attention + My Work above Module Health (or first for Member/Leader); add "View all"; default zone filter from `primaryZone` for zone roles; add Red Tag entries. Saving: 1–2 scrolls/clicks per daily session per role. Shared: `AttentionList`. Effort M. Risk low-medium (dashboard metrics must stay canonical). *Code-inferred; layout order browser-observed.*

**G-06 · P2 · Metric consistency (needs verification)** — Dashboard shows Open 14 / Overdue 14; `/actions` KPI strip shows Open 11 / Overdue 11 (both at default filters). Cause not traced (could be period/entitlement scope). Per AGENTS.md §23-24 differences must be explained or fixed. → Trace and either align scope or label it on-tile. Effort S (investigate). Risk none until a cause is found. *Browser-observed discrepancy; cause unverified.*

**G-07 · P3 · Dead code that misleads edits** — `features/five-s/dashboard-page.tsx` (re-exports the ops dashboard at line ~600, then ~135 lines of dead 5S dashboard); `FiveSAuditChecklist.tsx` (2,610 lines, no importers, still has `window.alert`, `<h1>`, `type="date"`); `features/red-flag/*` pages (no live route; still imported by dashboard/analytics/reports data); `LinkedRecords`/`InlineLinkedRecord` (no importers). Not a UX defect itself, but audit-driven changes risk landing in dead copies. → Separate cleanup phase (AGENTS.md §44: confirm unused, in scope, tests pass). Effort M. Risk low if tests referencing them are retargeted. *Code-inferred, importers confirmed with `rg`.*

**G-08 · P2 · Reports** — Two libraries (`/reports`, `/5s/reports`). Library "Export" is a single item that exports *list metadata* CSV only; record reports offer only `window.print()` ("Print / Save PDF"); registry declares `supportsExcel` per report type but `report-export.ts` has CSV only (no Excel path found — verify before relying on the flag). Reports sits under an "Analytics" group header but is the only item in it. → Label honestly ("Export list (.csv)", "Print / Save as PDF"); hide `supportsExcel` UI if present; fold `/5s/reports` into `/reports`. Effort S–M. Risk low. *Code-inferred; library browser-observed (58 reports, Export menu).*

**G-09 · P1 · Red Flag links** — `/red-flag/*` all redirect to Red Tag, but `lib/relationships/route-resolver.ts:48-50` and `lib/actions/action-config.ts:84` still resolve `redFlag` sources to `/red-flag/<id>`; dashboard tiles link `/red-flag?tab=red-flags&…` (tab params are dropped by the redirect). An Action whose source is a `RF-` record therefore lands on the Red Tag list, losing the record (Action→source broken). `features/red-flag/red-flag-new-page.tsx` Cancel also points at `/red-flag`. → Map to the real Red Tag route or hide the link; strip dead query params. Effort S. Risk low. *Code-inferred.*

**G-10 · P3 · Design tokens** — ~384 arbitrary `text-[..]` (174× `10px`, 131× `11px`, 22× `9px`); `Button` `sm` uses `text-[13px]`; hard-coded hex in header/sidebar/drawer (`dark:bg-[#20252d]`); dashboard `TONE_STYLES` duplicates semantic tokens; headings at `text-[15px]`. Operational data at 10–11 px conflicts with AGENTS.md §34. → Introduce 3 caption sizes mapped to tokens; migrate top offenders (FiveSAuditExecution 26, gemba-walk 11, FiveSAuditReport 9, action-report 9). Effort M. Risk low (visual). *Code-inferred (counts via `rg`).*

**G-11 · P3 · i18n coverage** — `useI18n` in only 15 files; shell, dashboard, nav labels and reports library are hard-coded English with `en-IN` formatting. Flag only; no action unless multi-language is a demo requirement.

### 2.2 Actions and Red Tag

**RT-01 · P1 · Red Tag member submit** — After "Submit for Review" the member is routed to the Action editor for category/savings (approved handoff), then "Save & Return" lands back on the tag and the **same "Submit for Review" must be clicked again** with no explanation. Journey ≈10–13 interactions, 2–3 page transitions. → Keep the handoff and draft persistence. On return show a banner "Details saved — submit when ready" and focus/scroll to Submit; optionally (needs approval) a "Save & Submit for Review" that calls the existing `submitRedTagForReview`. Saving 1 click + confusion. Shared: `ReturnBanner`. Effort S/M. Risk low if the same command is used. *Code-inferred (RTM:186, ADP:223-224, store.ts:149).*

**RT-02 · P1 · Return navigation (Action ↔ source)** — Action detail Back arrow is hard-coded to `/actions` (ADP:204) and ignores `returnRedTag`; Red Tag "View canonical Action" (RTM:178) passes no return; Gemba/CI/Audit sources have no `returnTo`; Gemba detail Back goes `/gemba`. Users depend on browser Back. → Standardise a `returnTo` param (internal paths only) honoured by Action detail and shown as "← Back to {source}". Saving 1–3 clicks per source↔Action hop. Shared: `useReturnTo`, `BackLink`. Effort M. Risk low-medium (validate path to avoid open redirects). *Code-inferred.*

**RT-03 · P1 · Red Tag: no attention queue** — Overview counts (Raised, Awaiting Review) are non-clickable; "Awaiting Review" tab has no count (Actions tabs do); no "my tags" view for members; leader's "Raised needs plan" has no entry point. Leader reaches a tag in ≈4–5 clicks (list → status filter → row). → Make the four overview tiles links to pre-filtered lists; add counts to tabs; default member filter to "Responsible = me". Saving ≈2 clicks per review/plan. Shared: `KpiLink`, `TabCountBadge`. Effort S–M. Risk low. *Code-inferred; non-link tiles browser-observed on `/5s/red`.*

**RT-04 · P2 · Red Tag Approve & Close** — Immediate, irreversible, no confirm (RTM:187), while Action "Verify & Close" confirms (ADP:235). → Add the shared confirm dialog (adds 1 click deliberately; consistency + safety). Effort S. Risk low. *Code-inferred.*

**RT-05 · P2 · Leader planning form** — "Required Action" captured at creation is only a placeholder in the plan textarea; priority/due re-entered though due dates can derive from the Action configuration (`getPriorityDueDate`, used by `ManualActionDialog`). → Pre-fill plan from required action (editable) and due date from config for chosen priority. Saving 1–2 fields per tag. No new fields. Effort S. Risk low (must not change what `assignRedTagAction` validates). *Code-inferred.*

**RT-06 · P2 · Filters/context lost** — Red Tag list and Action Center filters are `useState`; URL only seeds initial state. Open a record and return: tab/filters reset (ACP:98-110, RTM:69-70). → Sync filters/tab to URL search params (replace, not push). Saving: 2–4 re-selections per return. Shared: `useUrlFilters`. Effort M. Risk low. *Code-inferred.*

**RT-07 · P2 · Action Center coherence** — (Browser-observed) "My Actions" tab badge **0** while KPI tiles directly above read Open 11/Overdue 11/Critical 2: tiles are role-wide, tab is personal. Clicking Overdue switches data source but leaves "My Actions" highlighted (ACP:115-117). Overdue is reachable via tile, Status select and Due select (3 controls). "Critical" tile sets a value the Priority select can't display (select lists High/Medium/Low + "Legacy: Critical"). → Scope tiles to the active tab or label them "All visible actions"; clear tab highlight when a quick filter overrides it; unify overdue control. Effort M. Risk low. Keep the existing overdue helper (AGENTS.md §48).

**RT-08 · P2 · Two review surfaces (verify)** — A leader can verify/close the canonical Action in Action detail *or* Approve & Close in Red Tag. Adapters reconcile, but the UI doesn't tell the leader which is authoritative. → Banner on Action detail when source is Red Tag: "Review is completed from the Red Tag" with link (do not remove permissions). Effort S. Risk low. *Code-inferred; confirm intended behaviour with product.*

**RT-09 · P2 · Red Tag status vocabulary (verify)** — On `/5s/red` the single listed tag shows status **"Open"**, while KPI tiles read Total 1 / Raised 0 and the status filter lists "Raised". Likely a historical or unmapped record; if so, label as "Historical" or map display status consistently. Effort S. *Browser-observed; cause unverified.*

**RT-10 · P2 · QR entry points** — "Create QR" (bulk, primary styled) and "Record QR" exist only on `/5s/red/overview`, not on the list or tag detail; names don't convey "print blank creation labels" vs "print this tag's label". → Rename ("Bulk creation QR labels" / "This tag's QR"), add Record QR to tag detail. Journey now ≈5–6 / 5–7 interactions; detail-page entry saves ≈2. Approved behaviour (shared creation URL, no allocation) unchanged. Effort S. Risk low.

**RT-11 · P2 · Tablet** — Red Tag list shows `min-w-[1180px]` table from `md` (768) while Action Center switches to cards at `lg`; the 768–1023 range scrolls horizontally on Red Tag. Detail uses `xl:` two-column so QR/Timeline fall below; member's "Zone Member Work" card is ~6th block on phones. → Align breakpoints (card layout to `lg`); on small screens place the role's primary action card first. Effort S–M. Risk low. *Code-inferred.*

**RT-12 · P3 · Misc Red Tag/Action** — `window.alert` for save/evidence errors (ADP:133,182,185,188); unstyled create error `<p role="alert">` (RTM:142); mobile creates two submit buttons (header + bottom); post-create route goes to `/print` (extra transition, Back returns to print step); Red Tag dialogs have no file-picker fallback if camera permission fails; `AfterPhotoCaptureDialog` footer buttons lack `min-h-11`; date filter on list matches creation day only; Red Tag list empty state is a plain div; unconfigured users see misleading "No Red Tags match…". Cost Saving state default `"0"` (ADP:59) vs blank-as-undefined on completion handoff (ADP:131) — verify.

**RT-13 · P2 · Red Tag list filter bar (browser-observed)** — Native `dd/mm/yyyy` date input sits in the filter row beside custom selects (visibly different control); on mobile five stacked controls push results below the first screen. → Shared filter bar with "More filters" (as Action Center) and the shared date control.

### 2.3 Gemba

**GM-01 · P1 · Create CI / Red Tag from observation** — `create-ci-from-observation-dialog.tsx:164-179`: on link failure the error is set but the dialog still closes and `router.push`es to the new CI, so the error is lost; success also leaves the walk with no way back; observation photos are not carried into CI "before evidence" (`[]` at :147). → Do not navigate on failure; offer "Open improvement" as a link after success while staying in the walk; carry evidence reference if the CI model already supports it. Effort S–M. Risk low-medium. *Code-inferred.*

**GM-02 · P2 · Issue → Action path (≈12–16 interactions, estimate)** — Walk setup (≥3), Add Observation (2), form (type, title, photo 2+, Yes, Save ≈6–8), `CreateLinkedActionDialog` (Category, Responsible, Create ≈4–5). Required items stay (issue photo, category, responsible). Savings: "Assign to me" exists; default Responsible to the user only when they are the permitted owner; remember last category per zone (needs approval, no new fields). ≈2 interactions per issue.

**GM-03 · P2 · Corrective-action decision** — An Issue can be saved with neither Yes nor No selected; `resolveGembaCorrectiveActionNeeded` returns undefined and it surfaces later as "outstanding". → Visually mark the question required for Issues and show outstanding count in walk header; do **not** change submit rules without approval (workflow). Effort S.

**GM-04 · P2 · Draft loss** — Observation dialog resets on every open (`key` at gemba-walk-page.tsx:130); photos are cleaned on close; CI and Action dialogs also drop input on dismiss. → Confirm-on-dismiss when dirty (or sessionStorage draft per walk). Effort M. Risk low.

**GM-05 · P2 · Settings stubs** — `/gemba/settings` and `/continuous-improvement/settings` render "coming soon"; Gemba landing shows a **Settings tab** (browser-observed) that leads to the stub. → Hide empty Settings tabs or give them real content. Effort S.

**GM-06 · P2 · Zone Leader deployments** — "Received Deployments" is a sub-tab under Observations (two tabs deep) with only a sub-tab count; Gemba landing has no "needs attention" (Open Observations tile not clickable; Overview shows recent walks only). → Add a Needs-attention strip. Effort M.

**GM-07 · P3 · Dialog hygiene** — CI-from-observation dialog: error box lacks `role="alert"`, no sticky footer, no `inputMode` on numerics, mixed copy ("Create Improvement" / "Continual Improvements"). Gemba lists use raw tables with `text-[10px]` headers; three tab bars (`OpsTabBar`, `GembaTabBar`, `RedFlagTabBar`). Observations table uses `Badge variant="info"` for Action status rather than the shared status component.

**GM-08 · P3 · Walk setup (browser-observed, mobile)** — Zone has a name-search box **and** a select stacked (OpsPersonSelect) for four zones; Plant and Walk Lead are disabled inputs consuming a row each; purpose placeholder truncates. → Plain select when ≤6 options; show read-only context as text.

### 2.4 Audit, Continual Improvement, Visual Improvement

**AU-01 · P1 · Audit completion with open Actions** — `completeFiveSAudit` doesn't block on Actions (approved), and the only surface is a one-line `role="status"` sentence in the signature dialog (FiveSAuditExecution.tsx:2684) — no list, no links; the audit list shows no open-Action indicator. → Show linked Actions (title, owner, due, status, link) in the complete dialog and an "Actions" panel on audit detail/report; add open-Action count column to the list. Does not block completion. Saving: removes 3–5 clicks to answer "what is still open from this audit?" Shared: `LinkedActionsPanel` (reuse the unused `LinkedRecords`). Effort M. Risk low.

**AU-02 · P1 · Audit report route** — see G-04(c).

**AU-03 · P2 · Scheduling** — Schedule path ≈9–10 interactions, then dates are re-entered on `FiveSAuditScheduled`; summary card repeats every field already above it; Review + Complete are two steps before the (required) signature confirmation. → Keep signature confirmation; remove the duplicated summary; make "When" a single optional date. Saving ≈2–4 interactions. Effort S–M.

**AU-04 · P2 · Audit list** — `<table min-w-[900px]>` with no card layout on phones (CI/VI landing do switch to cards). → shared responsive table/card pattern. Effort M.

**AU-05 · P2 · Alerts/demo controls** — `window.confirm("Restore the original 5S demo audits…")` and a "Restore demo data" control on the audit list (FiveSAuditList.tsx:492,528); `window.alert` on completion failure and in execution (:952,1050,1121,1437). → Replace with `AlertDialog`/inline `OpsFeedback`; move demo controls behind Settings or a dev flag. Effort S. Risk low (confirm the demo reset still works for presenters).

**AU-06 · P2 · Execution** — 39 questions; compliant audit ≈39 clicks (+39 if using "Save & Next"); each non-compliant item adds ≈8–12 (Add Action dialog + required evidence at the question + again in the Action). Tablet: action/evidence cards stack below `xl`; "Upload/Take Photo" are `size="sm"` (<44 px); sections locked sequentially. → Preview whether question evidence can be passed to the Action (if canonical evidence rules allow); bump touch targets; "Mark rest compliant" is **not** recommended (changes audit semantics). Effort M. Risk medium (audit integrity).

**AU-07 · P2 · Auditor/Leader queues** — No "my review queue" on Audits; Action review lives under `/actions`; only the report is under `/5s`. A Zone Leader cannot review someone else's Action unless designated (`canReviewAction`) — page does show "Awaiting review by {name}" (good).

**CI-01 · P2 · CI proposal** — Draft needs a second "Submit"; reviewer must click "Review Proposal" (moves submitted→under_review) before Approve/Reject/On Hold; creation ≈12 interactions with before-evidence. The extra reviewer click is a lifecycle command → **do not remove**; rename to "Start review" with helper text. Errors on the new form are one generic sentence listing all fields rather than per-field. Effort S.

**CI-02 · P2 · `/5s/continuous-improvement`** drops URL filters (G-04d).

**VI-01 · P2 · Visual Improvement** — Labelled "Legacy Improvement", entitlement-off by default, parallel to CI with different field names/statuses; "Also create Action" opens a second dialog (context passes automatically). Kept separate per AGENTS.md §17; only fix: consistent label, never presented as a peer of Visual Management, entry from a clearly named place when enabled.

### 2.5 Visual Management

**VM-01 · P1 · Escalations/Topics unreachable (confirm intent)** — `/visual-management/escalations` redirects away; `EscalationsPage`, `LegacyLiveMeeting` (topics, follow-up, Create Action) are unrendered; `createMeetingEscalation` is called only from tests; a test asserts meeting mode must not contain it. Yet meeting summary still shows "Topics" and "Red Flags / CI" counts that cannot be incremented from the UI, and AGENTS.md §17 describes escalations/topics as VM scope. This looks like a **deliberate scope cleanup** — do not restore without product confirmation; instead remove misleading counts/labels or document the decision. Effort S (labels). Risk none.

**VM-02 · P1 · Meeting mode** — Full-screen overlay; KPI actuals live in local `drafts` state, so either exit (icon or button) **loses entries** with no warning; attendance defaults to Absent so N toggles each meeting; a 10-KPI board, 8 attendees, 3 deviations ≈31 interactions (+3–4 to start); success has no confirmation (redirect only). → Confirm-on-exit when dirty or persist draft; add "Mark all present"; success toast on complete. Saving ≈7 interactions/meeting with Mark-all-present. Effort M. Risk low (no rule change; required "What happened?" and owner stay).

**VM-03 · P2 · Scheduling/entry** — Schedule exists only on board detail (not on Meetings); two start routes (Meetings "Start Meeting" skips the confirmation screen; ad-hoc button goes dialog → confirmation → workspace); the Start dialog re-asks the board even when a meeting is due today; `OpsPersonSelect` is used for boards. → Add "Schedule" to Meetings; show "Start today's meeting" card on Overview; unify the confirmation. Saving ≈2–3 interactions. Effort M.

**VM-04 · P2 · Board page (browser-observed)** — Overview has both a "Board Settings" button and a "Settings" tab; metric cards carry up to four buttons each plus a red banner "Corrective action creation is pending…" repeated per card.

### 2.6 Settings, Administration, Super Admin

**ST-01 · P2 · Users has three routes** — `/settings/users` (linked), `/admin/users`, `/administration/users`, all `AdministrationUsersPage`, with different eyebrow/title ("Users" vs "Users & Access"). → Keep `/settings/users`; redirect the others. Effort S. Risk low (check Super Admin/Profile links).

**ST-02 · P2 · Module settings not discoverable from Settings** — Hub lists Organization, Users & Access, Preferences, (Platform admin). Actions, Audit and VM configuration live in each module's Settings tab; hub search can't find them. → Add a "Module settings" group linking to the canonical `/actions/settings`, `/audits/settings`, `/visual-management/settings`. Saving: discoverability. Effort S.

**ST-03 · P2 · Module Access duplicated** — `/settings/module-access` and Super Admin → org → Modules implement the same toggles with different grouping; two dead tabs ("Users", "Configuration") on the org page; `/super-admin/settings?section=support` (footer help link) drops its query. → Choose one canonical home; remove dead tabs; fix help link. Effort S–M.

**ST-04 · P2 · Redirect chains** — `/settings/visual-management/tiers` → `/visual-management/settings/tiers` → `/visual-management/settings` (double hop); `/red-flag/settings` → `/5s/red/settings` → overview; breadcrumb `SETTINGS_CATEGORIES` still uses legacy paths. Effort S.

**ST-05 · P2 · Settings shells** — Actions settings repeats the "Actions" header + `ActionsNav` instead of a "Settings" title; `SettingsDetailBack` sits above `PageContainer`; hub cards vs link-card list vs table+dialog layouts; four access-denied variants with different wording.

**ST-06 · P3 · Forms (Users/Board/Schedule)** — Required markers inconsistent (`*` text vs none); Users editor shows one top error, no focus move; Status before Roles for a new user; Zone Leader replacement `AlertDialog` is appropriate; attendee remove chips have no accessible name; VM settings fake tabs lack `role="tab"`.

---

## 3. Cross-module UX (Actions)

| Question | Today | Gap |
|---|---|---|
| Where did an Action originate? | Origin panel in Action detail + `getActionSourceHref` | Good, central. Dead `redFlag` mapping (G-09). |
| Navigate to source | 1 click | Works for Gemba, CI, Red Tag, Audit, VM |
| Return after editing | Browser Back only; Action Back → `/actions` | RT-02 |
| Owner / next responsible / next step | Status badge + panels | Not summarised in one "Next:" line on Action detail or lists |
| Linked records without duplicate navigation | `LinkedRecords` built, unused | Render it (AU-01, CI related records) |
| Avoid duplicate Actions | Red Tag adapter reuses exact-source Action; Gemba/other dialogs show no "Action already exists" hint | Show existing linked Action in dialog before creating (read-only check) |
| Keep filters/context | State only | RT-06 |

All proposals read the canonical store or call existing lifecycle commands.

## 4. Role-based usability

| Role | Top daily tasks | Hard to find / friction | "Needs my attention / next / where" |
|---|---|---|---|
| **Zone Member** | Do assigned Red Tag/Action work; add evidence; submit | No "my tags"; must pick Responsible filter; Action list opens generic editor, Red Tag execution is a second hop (RT-03); finishing in Action editor may skip the tag's own submit (RT-08); camera has no file fallback | Dashboard is manager-grade; My Work is capped at 4 and below fold |
| **Zone Leader** | Plan Raised tags, review, assign, monitor CI proposals | Raised-needs-plan and Awaiting-Review counts are not links; Received Deployments 2 tabs deep; cannot review Actions unless designated | No leader queue |
| **Auditor** | Schedule/execute/complete audits, review Actions | No review queue; report only under `/5s/audits`; open linked Actions invisible after completion | Audits list has no "my drafts/scheduled" shortcut |
| **Plant Manager** | Risks and pending work across zones | No Plant Manager role in access code; relies on Admin/Viewer scope; no overdue marker on Red Tag list; dashboard doesn't include Red Tag | Needs Attention exists but is below the fold and role-blind |
| **Administrator** | Users, Plants, Zones | Three Users URLs; VM/Action/Audit settings not in hub; boards editor can't add a missing zone inline | — |
| **Super Admin** | Org + module access | Two Module Access pages, dead tabs, ops sidebar still shown on `/settings` | — |

## 5. Forms summary

Good: `OpsPersonSelect` for people/zones, smart defaults (zone from `primaryZone`, lead=current user, due +2 days, schedule defaults), autosave in audit execution, sticky mobile action bars in audit and meeting mode, `aria-pressed` on score/attendance toggles.

Needs work: no shared required/optional marker; validation is submit-banner in Gemba/Users/Schedule, per-field in VM board editor, generic sentence in CI; native date/time inputs in 16 files; no draft preservation outside audit execution (G: GM-04, CI/VI new); toggle groups (When, Ends, type) lack radiogroup/`aria-pressed`; `OpsPersonSelect` renders search+select even for 2–6 options and is used for boards/plants.

## 6. Navigation and IA

Sidebar groups (Overview / Operational Excellence / Execution / Analytics / System) are clear and entitlement-driven; stage subtitles help (except stale Red Tag, G-02). Issues: Analytics group contains only Reports; `/red-flag` vs Red Tag naming; module landing patterns differ (Audits lands on the list with Audits|Settings tabs; Gemba/CI/VM/Red Tag land on Overview; Actions lands on My Actions) — acceptable but should be documented per module; Settings is a hub of cards with no way to reach module settings (ST-02); breadcrumbs absent on mobile (G-03); no global search (G-01).

## 7. Browser inspection notes

Observed at 1440 and 375 px: Dashboard, Gemba, Red Tag (list, create on mobile), Actions, Audits, Continual Improvement, Visual Management, Reports, Settings, `/red-flag` (redirects), Gemba new walk (mobile).
- Dashboard at the default narrow pane width (~800 px): title block squeezed to a narrow column beside the Plant/Zone/Period filters + Create button (heading overlapped its neighbours); KPI labels truncated ("Open A…", "Overdu…"). At 1440 px it was clean.
- Red Tag breadcrumb `Item Disposition › Red Tag`; sidebar subtitle "Item Disposition".
- KPI strips use at least four visual treatments: Gemba (separate cards), Red Tag (single bordered strip), Actions (cards with coloured left rules), CI (strip + extra cards), Dashboard (strip + rail).
- Mobile: tab bars scroll horizontally with the last tab clipped ("Clo…") and no fade affordance; Red Tag create shows Zone/Section selects at content width (narrower than text inputs) and the primary button disabled at the top.
- Console: no errors or warnings.
