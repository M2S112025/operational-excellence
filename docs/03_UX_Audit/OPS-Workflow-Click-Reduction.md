# OPS — Workflow Click-Reduction Analysis

Date: 17 October 2026 · Audit only.

## Counting rules and evidence

- An **interaction** = click/tap, select open+choose (counted as 2 unless noted "1–2"), required typed field (1), dialog open/close, page transition, confirmation. Optional fields, scrolling and OS camera/print dialogs are excluded.
- **Directly observed:** only that the listed landing screens load and which controls they show (no journey executed — running them would mutate demo data). Observed items are marked 👁.
- **All numbers below are code-traced estimates** (ranges where defaults vary).
- Steps required by approved workflow, permissions, legal/operational review or confirmation are marked 🔒 and are **kept** in every proposed journey.
- "Saved" = expected interactions saved per occurrence; "frequency" guides priority.

## Summary table (priority-ordered)

| # | Journey | Freq. | Current (est.) | Proposed | Saved | Prio | Risk |
|---|---|---|---|---|---|---|---|
| 1 | Red Tag member: evidence → submit (with Action-editor handoff) | High | 10–13 | 8–10 | 2–3 | P1 | Low |
| 2 | Leader finds & plans a Raised Red Tag | High | 6–8 + 4–5 to find | 5–6 + 1–2 to find | 4–6 | P1 | Low |
| 3 | Leader reviews / approves Red Tag | High | 3–4 (+4–5 to find) | 3–4 (+1–2 to find) (+1 confirm 🔒) | 3 | P1 | Low |
| 4 | Visual Management meeting (10 KPIs, 8 attendees, 3 deviations) | Daily | ≈31 + 3–4 start | ≈24 + 1–2 start | ≈9 | P1 | Low |
| 5 | Return from Action to source / list context | Very high | 2–4 (browser Back + re-filter) | 1 | 1–3 each hop | P1 | Low-Med |
| 6 | Close an Audit — see open linked Actions | Med | 3–5 (leave audit, filter Actions) | 0–1 | 3–4 | P1 | Low |
| 7 | Gemba Issue + linked Action | High (floor) | 12–16 | 10–13 | 2–3 | P2 | Low |
| 8 | Gemba Opportunity → CI | Med | 5–6 and navigates away | 5–6, stay in walk | return = 1–2 | P2 | Low |
| 9 | Find an overdue Action | High | Dashboard 1–2; Action Center 2–3 | 1 (correct tab/scope) | ≤1 | P2 | Low |
| 10 | Audit execution — per non-compliant item | High | 8–12 | 6–9 | 2–3 | P2 | **Med** |
| 11 | Schedule → start an Audit | Med | 9–10 + 4 | 6–7 + 1 | 5–6 | P2 | Low |
| 12 | Assign an Action to a Zone Member (recovery path) | Low | 5–6 | 3–4 | 2 | P3 | Low |
| 13 | Submit Action evidence & request review (Action editor) | High | 10–14 | 9–12 | 1–2 | P3 | Low |
| 14 | Generate Red Tag QR (record / bulk) | Low–Med | 5–7 / 5–6 | 3–4 / 5–6 | 2 | P3 | Low |
| 15 | View & export a report | Med | 3–4 (+PDF print dialog) | 3 | ≈1 | P3 | Low |
| 16 | CI proposal create → approve | Med | create ≈12; review +1 | create ≈10; review unchanged 🔒 | 2 | P3 | Low |
| 17 | Create a Visual Improvement | Low | ≈12+ | ≈10 | 2 | P3 | Low |
| 18 | Admin creates a user with Plant/Zone | Low | 11–12 | 9–10 | 2 | P3 | Low |
| 19 | Super Admin toggles module access | Low | 5–6 | 5–6 (single home) | 0 (clarity) | P3 | Low |
| 20 | Find module settings | Low | 2–4 + guessing | 2 | 1–2 | P3 | Low |

---

## Detailed journeys

### 1. Red Tag member — evidence → submit for review
**Current (RTM:166-172,186; store.ts:119-149; ADP:54,137-140,223-224):** find tag (list + Responsible filter, ≈3) → open (1) → *Add Closure Evidence* dialog: open (1), capture (1), Use Photo (1) → type comment (1; autosaved per keystroke) → *Submit for Review* (1) → app detects missing category/savings → page transition to `/actions/{id}?returnRedTag=…` (1) → category select (1–2) + savings (1) → *Save & Return to Red Tag* (1) → page transition back → **Submit for Review again** (1). ≈10–13 interactions, 2–3 transitions, 1 dialog.
**Friction:** the second Submit is unexplained; member is not told beforehand that category/savings will be asked; the handoff screen shows the full Action stepper for two fields; Action Back arrow ignores `returnRedTag`; no "my tags" view.
**Proposed:** default member list filter to "Responsible = me" (−2); pre-submit hint under the Submit button when category/savings are missing ("Next you'll confirm category and savings"); on return, banner + focus on Submit, or approved "Save & Submit for Review" invoking the same `submitRedTagForReview` (−1). Handoff stays 🔒; completion data still member-entered 🔒; submission still via Red Tag command 🔒.
**Saved:** 2–3.

### 2. Leader finds and plans a Raised Red Tag
**Current (RTM:151-193):** list → Status filter (2) → row (1) → plan textarea (retype required action; placeholder only) → member select (1–2) → date (1) → priority (1–2) → Assign Action (1). ≈6–8 + 4–5 to find.
**Friction:** no entry point from Overview "Raised" tile; due/priority not defaulted from Action configuration.
**Proposed:** Overview tiles link to pre-filtered lists (−3); plan prefilled from the required action (−1, editable); due date prefilled from the priority config (−1). Leader planning stays 🔒; same `assignRedTagAction` validation.
**Saved:** 4–6.

### 3. Leader reviews / approves
**Current:** Awaiting Review tab or Overview (not a link) → open (1) → read evidence → *Approve & Close* (1, immediate) or *Return for Rework* (dialog + required comment ≈3).
**Friction:** tab has no count; approve has no confirmation (unlike Action close).
**Proposed:** count badge on tab; Overview tile link; add confirm to Approve & Close (+1, deliberate; consistent with ADP:235). Required rework comment, real-leader attribution, self-approval controls all 🔒.
**Saved:** ≈3 on discovery, −1 on safety (net still positive).

### 4. Visual Management meeting
**Current (schedule-meeting-dialog.tsx, daily-management-meeting-workspace.tsx):** start via Meetings *Start Meeting* (1, skips confirmation) or ad-hoc (button, board select, confirmation, start ≈3–4) → attendance defaults **Absent**: 8 toggles → each KPI: actual (1); amber/red adds note (required), owner search + select (≈4) → *Complete Meeting* (1). ≈31 + 3–4. Exiting loses entered values (local state).
**Friction:** attendance defaults, exit data-loss, no success confirmation, board re-selected though a meeting is scheduled today.
**Proposed:** "Mark all present" (−7), warn/persist on exit, completion toast, "Start today's meeting" card (−2). "What happened?" and owner remain required 🔒. Auto-created corrective Actions unchanged 🔒.
**Saved:** ≈9. *(Topic/escalation capture is not reachable today — see Audit VM-01; no journey count possible.)*

### 5. Return from an Action to its source or list
**Current:** Action detail Back → `/actions` (default tab, filters reset); Red Tag "View canonical Action" passes no return; Gemba Back → `/gemba`. Users press browser Back (history may include `/print`, redirects) then re-apply filters (2–4).
**Proposed:** `returnTo` (internal path validated) honoured by Action detail; URL-persisted filters/tabs (RT-06). **Saved:** 1–3 per hop, the most frequent saving in the product.

### 6. Close an Audit and see open Actions
**Current:** `completeFiveSAudit` does not block on Actions 🔒 (approved); dialog shows only "This Audit has N outstanding Action(s)…" (FiveSAuditExecution.tsx:2684). To see them: leave audit, Actions → filter by source (≈3–5).
**Proposed:** list the linked Actions with links in the dialog and on audit detail; open-Action count column in audit list. Completion not blocked. **Saved:** 3–4.

### 7. Gemba Issue → Action
**Current:** Start Walk (≥3) → Add Observation (2) → type, title, photo (2+; required 🔒), corrective Yes, Save (≈6–8) → Action dialog: category, responsible ("Assign to me"), Create (≈4–5). ≈12–16 across two dialogs.
**Proposed:** remember last category per zone (needs approval; no new field), default Responsible for self-assign roles, don't reset observation dialog on accidental dismiss. Required photo/category/owner 🔒. **Saved:** 2–3 per issue (multiplied per walk).

### 8. Gemba Opportunity → CI
**Current:** open dialog → proposed improvement, expected benefit, benefit type, time (≈5–6) → on success `router.push` leaves the walk; on **failure** the error is set but the dialog still closes/navigates (GM-01). Evidence not carried.
**Proposed:** stay on success with "Open improvement" link; never close on failure. **Saved:** ≈2 to get back, plus avoids data-loss confusion.

### 9. Find an overdue Action
**Current:** Dashboard Overdue tile → `/actions?status=overdue` (1) → row (1); or Action Center → Overdue tile (1) → row (1). 2–3. Tile ignores the active tab and shows role-wide data under "My Actions" (👁 My Actions badge 0 vs tiles 11/11).
**Proposed:** scope tiles to tab or label them "All visible"; single overdue control. **Saved:** ≤1, but removes the "why is my list empty?" detour.

### 10. Audit execution — non-compliant item
**Current:** score 0/1 (1) → Add Action dialog (1) → title/description/evidence (3–5)/category/priority (2) → Save (1); question evidence also required (2–4). 8–12 per finding; compliant audit ≈39 clicks (+39 with Save & Next).
**Proposed:** reuse question evidence in the Action if canonical evidence rules allow (verify); larger touch targets; keep sequential section lock and signature 🔒. **Saved:** 2–3 per finding. **Risk Medium** — audit integrity; verify before approval.

### 11. Schedule → start an Audit
**Current:** Start Audit (1) → zone (2) → Schedule toggle + date + time (+3–4) → submit (1) ≈9–10; later open row (1), re-enter/confirm dates and Save (≈3), Start (1).
**Proposed:** remove duplicate date re-entry on the scheduled page; drop the summary card repeating fields. **Saved:** 5–6.

### 12–20. Lower-frequency journeys

- **12 Assign Action:** "Awaiting Assignment" is created only by the Red Tag adapter and assigned immediately in the same call, so this panel is a recovery path; add a "Needs assignment" tile only if ever non-empty. −2.
- **13 Action editor submit:** three forced sections (Overview → Evidence → Review). "Save Progress" and "Next" both on step 1 (confusing, Next also saves). Collapse to one scrollable form with a sticky submit for owners (−1–2); keep Verify & Close dialog 🔒.
- **14 QR:** add *Record QR* to tag detail (5–7 → 3–4); rename the two buttons; bulk flow unchanged (reusable Plant creation URL, no allocation 🔒).
- **15 Reports:** Reports (1) → View (1) → Export CSV/Print (1) = 3; label honestly (list-metadata CSV vs record CSV vs print PDF); fold `/5s/reports`.
- **16 CI:** draft needs second submit (−1 by "Save & submit" choice); reviewer "Review Proposal" click is a lifecycle command 🔒 — rename only.
- **17 Visual Improvement:** field names mirror CI; same Action-from-record dialog repeat; keep separate.
- **18 User admin:** drop Status-before-Roles ordering; inline "Add zone" when missing; −2.
- **19 Module access:** two equivalent pages; choose one; no click change.
- **20 Module settings:** add "Module settings" group in the hub (ST-02).

## Prioritisation logic

Order = frequency × saving ÷ risk. Journeys 1–6 are repeated daily by floor roles or leaders, touch no lifecycle rule, and share three enablers (URL-persisted filters, `returnTo`, linked-records panel). Journeys 10 and 7 have the largest absolute counts but need product confirmation (evidence reuse, defaults) before commitment.

## Steps that must not be removed

Issue photo (Gemba, Red Tag); Red Tag leader planning before execution; member evidence + comment + category + non-negative savings entered by the member; handoff to the Action editor; rework comment; real-leader Approve & Close with readiness checks; Audit signature confirmation; sequential audit sections; CI "Review Proposal" and completion review; VM "What happened?" and owner on deviations; Action verify/close confirmation; module-disable confirmation.
