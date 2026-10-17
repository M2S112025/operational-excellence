# OPS — UX Improvement Roadmap (proposal for approval)

Date: 17 October 2026 · **Nothing here is approved or implemented.** IDs refer to `OPS-UI-UX-Audit.md`; journey numbers to `OPS-Workflow-Click-Reduction.md`; component numbers to `OPS-UI-Unification-Matrix.md`.

Guardrails for every phase: no new fields, statuses, lifecycle or permission changes; canonical Action store and lifecycle commands only; Red Tag stays the restored 5S workflow; no backend/migration; run `npx tsc --noEmit`, `npm run lint`, `npm test` (872 tests baseline), and browser-verify touched screens; AGENTS.md §42–43 deep-link checklist for any route change.

## Phase 0 — Decisions needed from product (before Phase 1)

| # | Question | Why |
|---|---|---|
| D1 | Escalations/Topics in Visual Management: confirmed removed? (VM-01) | Determines whether to delete leftovers/labels or restore |
| D2 | Global search: implement or delete dead `SearchBar`? (G-01) | New capability vs cleanup |
| D3 | Canonical route family: confirm `/audits`, `/actions`, `/continuous-improvement` (G-04) | Drives redirects and the new audit report route |
| D4 | Single home for Module Access: Super Admin or Settings? (ST-03) | |
| D5 | Dashboard vs Actions count gap (G-06) and Red Tag "Open" vs "Raised" (RT-09): intended? | Verify before labelling |
| D7 | Legacy Red Flag records (RF-…) still feed dashboard counts but have no viewable page: restore read-only view, retire, or treat as historical? (G-09) | No correct link target exists today |
| D8 | New Red Tag stage/label wording to replace "Item Disposition" (G-02); 3 characterization tests assert the old label and must be updated | Wording is a product call |
| D6 | Approve "Save & Submit for Review" and remembered defaults (RT-01, GM-02) | Slight behaviour change, same commands |

## Phase 1 — Quick Wins

Low-risk labels, copy, placement, link targets and navigation clarity.

| Item | Findings | Effort |
|---|---|---|
| Fix stale Red Tag nav text/stage label ("Item Disposition") | G-02 | S |
| Resolve legacy Red Flag records/links per decision D7 (not a link remap) | G-09 | S–M |
| Make Red Tag Overview tiles links; add count to Awaiting Review tab; QR button renaming; add Record QR to tag detail | RT-03, RT-10 | S |
| Parent breadcrumb crumbs link to module home; label unlabelled routes; mobile back-link | G-03 | S |
| Hide empty Gemba/CI Settings tabs; remove dead Super Admin tabs; fix `?section=support`; collapse double redirects | GM-05, ST-03, ST-04 | S |
| Add "Module settings" group to Settings hub | ST-02 | S |
| Redirect `/admin/users`, `/administration/users` → `/settings/users` | ST-01 | S |
| Replace `window.confirm/alert` with `AlertDialog`/inline feedback; move demo "Restore" control behind a non-production affordance | AU-05, RT-12 | S |
| Move dashboard Needs Attention + My Work up; "View all"; add Red Tag entries | G-05 | S–M |
| Mark Issue "Corrective action needed?" as required visually; show outstanding count | GM-03 | S |
| Honest report/export labels | G-08 | S |
| Approve & Close confirm; pre-submit hint; return banner | RT-04, RT-01 | S |

**Benefit:** removes visibly stale/misleading UI before partner demos; fixes broken links; discoverability. **Dependencies:** D1, D2, D4, D5. **Regression risk:** Low (copy/links; check tests asserting old strings, e.g. label tests).

## Phase 2 — Component Unification

Shared primitives from the Matrix, introduced behind existing screens one module at a time.

Order: **(a)** `ConfirmDialog`, `FormField`, `ReturnBanner/BackLink + useReturnTo`; **(b)** `FilterBar` + URL sync, `TabBar` count badge/overflow fade; **(c)** `DataTable` (responsive card fallback at `lg`) — migrate Red Tag, Actions, Audit list first, then Gemba/CI/VI/Users; **(d)** `KpiStrip`, status tone map, `DateField`, `SettingsShell`, `PhotoCapture` with file fallback.

Include: URL-persisted Action Center / Red Tag filters (RT-06), Action Center tile scoping (RT-07), tablet breakpoint alignment (RT-11), `LinkedRecordsPanel` revival (AU-01 groundwork).

**Benefit:** consistency across 18+ tables, 16 date inputs, 6 tab bars; reduced future drift. **Effort:** L overall (M per component). **Dependencies:** Phase 1 wording; Matrix priority order; design tokens. **Regression risk:** Medium — many screens; mitigate by migrating one module per PR, keeping props compatible, running the existing 872-test suite plus browser checks (desktop 1440 / tablet 768 / mobile 375).

## Phase 3 — Workflow Optimization

Contextual actions and reduced navigation; each item uses existing commands.

| Item | Journey | Effort | Risk |
|---|---|---|---|
| `returnTo` across Action ↔ Red Tag / Gemba / CI / Audit; Action detail "Next:" line | 5 | M | Low–Med (validate paths) |
| Audit: linked Actions in completion dialog + audit detail + list column; `/audits/[id]/report`; canonical route redirects | 6, G-04 | M | Med (deep links) |
| Red Tag leader/member queues (My tags default filter; plan prefill; due default from config) | 1–3 | M | Low |
| Gemba: stay-in-walk after CI/Red Tag creation; no navigation on failure; dirty-dismiss protection; Needs-attention strip | 7, 8 | M | Low–Med |
| VM: Mark all present, exit protection, completion confirmation, Schedule on Meetings, "Start today's meeting" | 4 | M | Low |
| Audit scheduled-page de-duplication; per-finding evidence reuse (only if canonical evidence rules allow) | 10, 11 | M | **Med** (audit integrity) |
| Dashboard per-role ordering and zone default | G-05 | M | Low |
| "Action already exists" hint in linked-Action dialogs | Cross-module | S–M | Low |

**Benefit:** the bulk of interaction savings (≈2–9 per occurrence on daily journeys). **Dependencies:** Phase 2 (a)(b); D3, D6. **Regression risk:** Medium; each item needs cross-module checks (Source→Action, Action→Source, dashboard/report consistency, filters, deep links, entitlements) per AGENTS.md §73.

## Phase 4 — Visual Polish

| Item | Findings | Effort |
|---|---|---|
| Replace arbitrary `text-[9–11px]` with token caption size ≥12 px; fix `Button sm` 13 px; remove hard-coded hex from shell | G-10 | M |
| Responsive refinement: dashboard header at ~800 px, KPI label truncation, mobile tab overflow fade, filter stacks, Red Tag detail card order on phones, touch targets ≥44 px in audit/Red Tag camera dialogs | observed items, RT-11, AU-06 | M |
| Interaction states: focus rings on raw buttons (after conversion), `aria-pressed`/radiogroup for toggle groups, `role="tab"` on fake tabs, accessible names on chips | ST-06, forms | S–M |
| Empty/loading states adopted across lists; per-field validation styling | Matrix #9, #13 | M |
| Microinteractions: success toasts (meeting complete, evidence saved), remove artificial 220–240 ms delays | VM-02, RT-12 | S |
| Remove dead code (dead dashboard tail, `FiveSAuditChecklist.tsx`, orphaned `features/red-flag` UI, `SearchBar` if D2=delete) | G-07 | M |

**Benefit:** professional finish, accessibility, floor readability. **Dependencies:** Phase 2 primitives. **Regression risk:** Low–Medium (visual/snapshot tests; dead-code removal must satisfy AGENTS.md §44).

## Recommended order and sizing

1. Phase 0 decisions → 2. Phase 1 (≈3–5 dev-days) → 3. Phase 2 (a)(b) → Phase 3 items that depend only on them (returnTo, Red Tag queues, VM meeting) in parallel with Phase 2 (c) → 4. Phase 3 audit/Gemba items → 5. Phase 2 (d) → 6. Phase 4.

## Not to be changed

Red Tag restored 5S workflow (plan → execute → review/rework → close, member-entered category/savings, Action-editor handoff, rework comment, self-approval/readiness checks, historical read-only records, reusable-URL bulk QR with no allocation); canonical Action store/lifecycle commands and generic-update guards; Audit completion not blocked by open Actions, sequential sections and signature confirmation; CI proposal/completion review steps; VM deviation note + owner requirements and auto-created corrective Actions; Visual Management ≠ Visual Improvement; module entitlements/ModuleGate; Gemba issue photo requirement; Zone-Leader-only horizontal deployment; Profile (out of scope); Notification Center (postponed).
